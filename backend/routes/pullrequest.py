# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Alert, Remediation, PullRequest, User
from services.pr_creator import create_pull_request, GitHubAuthError
from services.auth import get_current_user
from datetime import datetime

router = APIRouter()


@router.post("/pull-request/{alert_id}", status_code=201)
def create_pr(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Busca o alerta e sua remediacao no banco e cria um Pull Request no GitHub.
    Exige que o alert_id ja tenha uma remediacao gerada pelo modulo de remediacao.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alerta {alert_id} nao encontrado")

    remediation = db.query(Remediation).filter(
        Remediation.alert_id == alert_id,
        Remediation.user_id == current_user.id
    ).first()
    if not remediation:
        raise HTTPException(
            status_code=400,
            detail=f"Alerta {alert_id} ainda nao tem remediacao. Chame /api/remediate/{alert_id} primeiro."
        )

    # Verificar se ja tem PR aberto
    existing_pr = db.query(PullRequest).filter(
        PullRequest.alert_id == alert_id,
        PullRequest.user_id == current_user.id
    ).first()
    if existing_pr:
        return {
            "message": "Pull Request ja existe para este alerta",
            "pr_url": existing_pr.github_pr_url,
            "pr_number": existing_pr.github_pr_number
        }

    # Criar o PR via GitHub API
    try:
        pr_result = create_pull_request(
            alert_id=alert_id,
            remediation_id=remediation.id,
            file_path=alert.file_path or "correcao_apex.py",
            patch_code=remediation.patch_code,
            test_code=remediation.test_code,
            pr_description=remediation.pr_description,
            alert_title=alert.title
        )
    except GitHubAuthError as e:
        # 401 dedicado: credencial do GitHub invalida/expirada. O dashboard usa
        # este status para exibir "configuracao pendente" em vez de erro tecnico.
        raise HTTPException(status_code=401, detail=str(e))
    except EnvironmentError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Salvar PR no banco
    pr_record = PullRequest(
        user_id=current_user.id,
        alert_id=alert_id,
        remediation_id=remediation.id,
        github_pr_url=pr_result["pr_url"],
        github_pr_number=pr_result["pr_number"],
        branch_name=pr_result["branch_name"],
        status="open"
    )
    db.add(pr_record)
    db.commit()
    db.refresh(pr_record)

    return {
        "message": "Pull Request criado com sucesso",
        "pr_url": pr_result["pr_url"],
        "pr_number": pr_result["pr_number"],
        "branch_name": pr_result["branch_name"],
        "test_file": pr_result["test_file_path"],
        "aviso": "REVISAO HUMANA OBRIGATORIA antes do merge"
    }


@router.patch("/pull-request/{pr_id}/status")
def update_pr_status(pr_id: int, status: str, approved_by: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Atualiza o status de um PR (open, merged, closed)."""
    pr = db.query(PullRequest).filter(
        PullRequest.id == pr_id,
        PullRequest.user_id == current_user.id
    ).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull Request nao encontrado")

    valid_statuses = ["open", "merged", "closed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status invalido. Use: {valid_statuses}")

    pr.status = status
    if approved_by:
        pr.approved_by = approved_by
    pr.updated_at = datetime.utcnow()
    db.commit()
    return {"message": f"Status atualizado para '{status}'", "pr_id": pr_id}


@router.get("/pull-requests")
def list_prs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prs = db.query(PullRequest).filter(
        PullRequest.user_id == current_user.id
    ).order_by(PullRequest.created_at.desc()).limit(50).all()
    return [
        {
            "id": pr.id,
            "alert_id": pr.alert_id,
            "pr_url": pr.github_pr_url,
            "pr_number": pr.github_pr_number,
            "status": pr.status,
            "branch_name": pr.branch_name,
            "created_at": pr.created_at
        }
        for pr in prs
    ]
