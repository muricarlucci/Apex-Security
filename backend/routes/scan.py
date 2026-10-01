from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import DBAPIError, TimeoutError as PoolTimeoutError
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
import logging
from database import get_db
from models import Alert, Repository, User
from services.normalizer import normalize
from services.prioritizer import prioritize
from services.anomaly_detector import train_and_score
from services.auth import get_current_user, get_user_by_api_key
from services.discord_notifier import send_discord_alert
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)


class ScanPayload(BaseModel):
    tool: str = Field(min_length=1, max_length=50)
    repository: str = Field(min_length=1, max_length=255)
    raw_json: str
    branch: Optional[str] = "main"
    commit_sha: Optional[str] = None


class AlertResponse(BaseModel):
    id: int
    source_tool: str
    repository: str
    severity: str
    severity_adjusted: Optional[str]
    title: str
    file_path: Optional[str]
    line_number: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/scan", status_code=201)
def receive_scan(
    payload: ScanPayload,
    db: Session = Depends(get_db),
    x_apex_api_key: str = Header(None)
):
    """
    EXCECAO AO JWT: este endpoint e chamado pelo GitHub Actions, que nao consegue
    fazer login. A conta e identificada pela api_key no header X-Apex-Api-Key.
    Sem a chave, os dados entram como legado/demo (user_id=None).
    """
    # Validate before touching the database: malformed scans never create inventory.
    try:
        normalized_alerts = normalize(payload.tool, payload.raw_json, payload.repository)
        prioritized_alerts = [prioritize(alert) for alert in normalized_alerts]
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    notifications = []
    saved_ids = []
    stage = "transaction"
    try:
        # One commit for inventory + every alert. A disconnect aborts the whole scan.
        with db.begin():
            user = get_user_by_api_key(x_apex_api_key, db) if x_apex_api_key else None
            if x_apex_api_key and user is None:
                raise HTTPException(status_code=401, detail="Chave de integracao invalida")
            user_id = user.id if user else None
            account = user.company_name if user else "legado/demo (sem api_key)"
            webhook = user.discord_webhook_url if user else None

            repo = db.query(Repository).filter(Repository.name == payload.repository).first()
            if repo is None:
                # Concurrent scans may discover the same repository. Only the name
                # conflict is ignored; other constraints still raise a real error.
                dialect = db.get_bind().dialect.name
                insert = {"postgresql": pg_insert, "sqlite": sqlite_insert}.get(dialect)
                if insert:
                    db.execute(insert(Repository).values(
                        name=payload.repository, user_id=user_id
                    ).on_conflict_do_nothing(index_elements=[Repository.name]))
                else:
                    db.add(Repository(name=payload.repository, user_id=user_id))
                    db.flush()

            for alert_data in prioritized_alerts:
                alert = Alert(
                    user_id=user_id,
                    **{key: alert_data.get(key) for key in (
                        "source_tool", "repository", "file_path", "line_number",
                        "severity", "severity_adjusted", "title", "description",
                        "cve_id", "iac_internet_exposed", "raw_output",
                    )}
                )
                db.add(alert)
                db.flush()
                saved_ids.append(alert.id)
                if webhook:
                    notifications.append((
                        webhook, alert.title,
                        alert.severity_adjusted or alert.severity, alert.repository
                    ))
            stage = "commit"
    except PoolTimeoutError as exc:
        logger.error("Scan database pool exhausted (stage=%s)", stage)
        raise HTTPException(status_code=503, detail="Banco indisponivel; scan nao confirmado") from exc
    except DBAPIError as exc:
        # Never log the full exception here: SQL parameters can contain scanner secrets.
        code = getattr(exc.orig, "pgcode", None)
        diag = getattr(exc.orig, "diag", None)
        logger.error("Scan database failure (stage=%s, type=%s, code=%s, disconnected=%s, table=%s, column=%s, constraint=%s)",
                     stage, type(exc.orig).__name__, code, exc.connection_invalidated,
                     getattr(diag, "table_name", None), getattr(diag, "column_name", None),
                     getattr(diag, "constraint_name", None))
        if exc.connection_invalidated or (code and (code.startswith("08") or code in ("57P01", "57P02", "57P03"))):
            # Pre-ping cannot repair a transaction already in progress. In particular,
            # a lost commit acknowledgement is ambiguous: do not automatically replay.
            raise HTTPException(status_code=503, detail="Conexao com banco interrompida; scan nao confirmado") from exc
        raise HTTPException(status_code=500, detail="Falha ao persistir scan no banco") from exc

    # Capture scalars before commit; avoid queries on expired ORM objects afterwards.
    # Discord is best effort and runs only after the database commit has succeeded.
    for notification in notifications:
        try:
            send_discord_alert(*notification)
        except Exception as exc:
            logger.warning("Discord notification failed (type=%s)", type(exc).__name__)

    return {
        "message": "Scan normalizado e salvo com sucesso",
        "tool": payload.tool,
        "repository": payload.repository,
        "alerts_saved": len(saved_ids),
        "alert_ids": saved_ids,
        "account": account
    }


@router.get("/alerts", response_model=List[AlertResponse])
def list_alerts(
    severity: Optional[str] = None,
    repository: Optional[str] = None,
    source_tool: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert).filter(Alert.user_id == current_user.id)
    if severity:
        query = query.filter(Alert.severity_adjusted == severity.upper())
    if repository:
        query = query.filter(Alert.repository == repository)
    if source_tool:
        query = query.filter(Alert.source_tool == source_tool)
    return query.order_by(Alert.created_at.desc()).limit(100).all()


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta não encontrado")
    return alert


@router.get("/anomaly-analysis")
def get_anomaly_analysis(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Executa o modelo Isolation Forest sobre os alertas da conta logada
    e retorna quais sao estatisticamente anomalos.
    Este e um sinal CONSULTIVO — nao substitui as regras deterministicas
    do motor de priorizacao, apenas adiciona uma camada de analise estatistica.
    """
    result = train_and_score(db, user_id=current_user.id)
    return result


@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    base = db.query(Alert).filter(Alert.user_id == current_user.id)
    total = base.count()
    critical = base.filter(Alert.severity_adjusted == "CRITICAL").count()
    high = base.filter(Alert.severity_adjusted == "HIGH").count()
    medium = base.filter(Alert.severity_adjusted == "MEDIUM").count()
    low = base.filter(Alert.severity_adjusted == "LOW").count()
    return {
        "total_alerts": total,
        "by_severity": {
            "CRITICAL": critical,
            "HIGH": high,
            "MEDIUM": medium,
            "LOW": low
        }
    }
