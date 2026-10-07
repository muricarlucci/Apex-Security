# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import hashlib
import hmac
import json
import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, StrictBool
from sqlalchemy.orm import Session

from database import get_db
from models import Alert, DastScan, User
from services.auth import get_current_user
from services.dast_config import get_dast_config, LAB_URL, FINAL_STATUSES
from services.dast_normalizer import normalize_zap
from services.dast_runner import dispatch_dast
from services.dast_validator import validate_target_url, validate_mode
from services.discord_notifier import send_discord_alert

router = APIRouter(prefix="/dast")
logger = logging.getLogger(__name__)
MAX_CALLBACK_BYTES = 8 * 1024 * 1024


def utcnow():
    return datetime.now(timezone.utc)


def aware(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def expire_scans(db, user_id):
    db.query(DastScan).filter(DastScan.user_id == user_id, DastScan.status.in_(("queued", "running")), DastScan.callback_expires_at < utcnow()).update(
        {"status": "timeout", "finished_at": utcnow(), "error": "Tempo limite da analise excedido"}, synchronize_session=False)
    db.commit()


def scan_dict(scan):
    config = get_dast_config()
    return {key: getattr(scan, key) for key in (
        "id", "target_kind", "target_url", "target_label", "mode", "status", "requested_at", "started_at", "finished_at", "alerts_count", "zap_version", "error",
    )} | {"counts": json.loads(scan.counts_json or "{}"), "actions_url": f"https://github.com/{config.github_repo}/actions/workflows/{config.workflow}"}


class ScanRequest(BaseModel):
    target_kind: Literal["lab", "custom"] = "lab"
    target_url: Optional[str] = Field(default=None, max_length=2048)
    mode: Literal["baseline", "full"] = "baseline"
    authorization_ack: StrictBool = False


@router.get("/config")
def configuration(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = get_dast_config()
    used = db.query(DastScan).filter(DastScan.user_id == current_user.id, DastScan.requested_at >= utcnow() - timedelta(hours=24)).count()
    return {"configured": bool(config.secret and config.github_token), "active_enabled": config.active_enabled,
            "training_hosts": config.training_hosts, "daily_limit": config.daily_limit,
            "remaining_today": max(0, config.daily_limit - used)}


@router.post("/scans", status_code=202)
def create_scan(payload: ScanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    config = get_dast_config()
    if not config.secret:
        raise HTTPException(503, "DAST ainda nao configurado")
    if not config.github_token:
        raise HTTPException(503, "GITHUB_TOKEN nao configurado no Render")
    if payload.target_kind == "custom" and not payload.authorization_ack:
        raise HTTPException(400, "Declare autorizacao para testar esta URL")
    try:
        target = LAB_URL if payload.target_kind == "lab" else validate_target_url(payload.target_url)
        validate_mode(payload.mode, payload.target_kind, target, config)
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    now = utcnow()
    # Lock the account row to serialize quota/active checks across API processes.
    db.query(User).filter(User.id == current_user.id).with_for_update().first()
    db.query(DastScan).filter(DastScan.user_id == current_user.id, DastScan.status.in_(("queued", "running")), DastScan.callback_expires_at < now).update(
        {"status": "timeout", "finished_at": now, "error": "Tempo limite da analise excedido"}, synchronize_session=False)
    if db.query(DastScan).filter(DastScan.user_id == current_user.id, DastScan.status.in_(("queued", "running"))).first():
        raise HTTPException(409, "Uma analise DAST ja esta em andamento nesta conta")
    used = db.query(DastScan).filter(DastScan.user_id == current_user.id, DastScan.requested_at >= now - timedelta(hours=24)).count()
    if used >= config.daily_limit:
        raise HTTPException(429, "Limite diario DAST atingido nesta conta")
    scan = DastScan(user_id=current_user.id, target_kind=payload.target_kind, target_url=target,
                    target_label="Laboratorio Apex - OWASP Juice Shop" if payload.target_kind == "lab" else target,
                    mode=payload.mode, status="queued", nonce=secrets.token_hex(32),
                    callback_expires_at=now + timedelta(minutes=config.ttl_minutes),
                    authorization_ack=payload.authorization_ack, authorization_ack_at=now if payload.authorization_ack else None,
                    requested_at=now, alerts_count=0, counts_json="{}")
    db.add(scan)
    db.commit()
    db.refresh(scan)
    try:
        dispatch_dast(scan, config)
    except RuntimeError as error:
        scan.status = "failed"
        scan.error = str(error)[:500]
        scan.finished_at = utcnow()
        db.commit()
        raise HTTPException(502, scan.error) from error
    return scan_dict(scan)


@router.get("/scans")
def list_scans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expire_scans(db, current_user.id)
    return [scan_dict(scan) for scan in db.query(DastScan).filter(DastScan.user_id == current_user.id).order_by(DastScan.requested_at.desc()).limit(20)]


@router.get("/scans/{scan_id}")
def get_scan(scan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expire_scans(db, current_user.id)
    scan = db.query(DastScan).filter(DastScan.id == scan_id, DastScan.user_id == current_user.id).first()
    if not scan:
        raise HTTPException(404, "Analise DAST nao encontrada")
    return scan_dict(scan)


@router.post("/scans/{scan_id}/results")
async def receive_results(scan_id: int, request: Request, db: Session = Depends(get_db)):
    config = get_dast_config()
    if not config.secret:
        raise HTTPException(503, "DAST ainda nao configurado")
    signature = request.headers.get("X-Apex-Dast-Signature", "")
    body = bytearray()
    async for chunk in request.stream():
        body.extend(chunk)
        if len(body) > MAX_CALLBACK_BYTES:
            raise HTTPException(413, "Relatorio excede 8 MB")
    # Lock + save every alert and final scan state in one transaction.
    scan = db.query(DastScan).filter(DastScan.id == scan_id).with_for_update().first()
    if not scan:
        raise HTTPException(404, "Analise DAST nao encontrada")
    expected = hmac.new(config.secret.encode(), f"{scan.id}:{scan.nonce}".encode(), hashlib.sha256).hexdigest()
    if not re.fullmatch(r"[a-f0-9]{64}", signature) or not hmac.compare_digest(expected, signature):
        raise HTTPException(401, "Assinatura DAST invalida")
    if scan.status in FINAL_STATUSES:
        raise HTTPException(409, "Analise DAST ja finalizada")
    if aware(scan.callback_expires_at) <= utcnow():
        scan.status = "timeout"
        scan.finished_at = utcnow()
        db.commit()
        raise HTTPException(410, "Retorno DAST expirado")
    try:
        payload = json.loads(body)
        if not isinstance(payload, dict) or payload.get("status") not in {"running", "completed", "failed"}:
            raise ValueError("Estado invalido")
        if payload.get("mode") is not None and payload["mode"] != scan.mode:
            raise ValueError("Modo divergente")
        normalized = normalize_zap(payload.get("report"), scan.target_url, scan.target_kind) if payload["status"] == "completed" else []
    except (ValueError, TypeError, UnicodeError):
        scan.status = "failed"
        scan.error = "Relatorio ZAP ou retorno invalido"
        scan.finished_at = utcnow()
        db.commit()
        raise HTTPException(400, "Relatorio ZAP ou retorno invalido")
    webhook = None
    if payload["status"] == "running":
        scan.status = "running"
        scan.started_at = scan.started_at or utcnow()
    elif payload["status"] == "failed":
        scan.status = "failed"
        # Do not expose arbitrary workflow/provider content or secrets.
        scan.error = "Falha no workflow DAST; consulte a etapa com erro no GitHub Actions"
        scan.finished_at = utcnow()
    else:
        counts = {severity: 0 for severity in ("HIGH", "MEDIUM", "LOW", "INFO")}
        for alert in normalized:
            db.add(Alert(user_id=scan.user_id, dast_scan_id=scan.id, **alert))
            counts[alert["severity"]] += 1
        scan.status = "completed"
        scan.started_at = scan.started_at or scan.requested_at
        scan.finished_at = utcnow()
        scan.alerts_count = len(normalized)
        scan.counts_json = json.dumps(counts)
        scan.zap_version = str(payload["report"].get("@version", ""))[:50] or None
        user = db.query(User).filter(User.id == scan.user_id).first()
        webhook = user.discord_webhook_url if user else None
    notification = (webhook, f"Analise DAST concluida: {len(normalized)} alertas", "INFO", scan.target_label)
    result = {"id": scan.id, "status": scan.status, "alerts_count": scan.alerts_count}
    db.commit()
    if webhook:
        try:
            send_discord_alert(*notification)
        except Exception as error:
            logger.warning("DAST Discord notification failed (type=%s)", type(error).__name__)
    return result
