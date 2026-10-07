# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Alert, Remediation, User
from services.remediator import request_remediation
from services.auth import get_current_user
from services.gemini_operations import gemini_operation, alert_inputs, reuse_saved_result
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()


class RemediationResponse(BaseModel):
    id: int
    alert_id: int
    patch_code: Optional[str]
    test_code: Optional[str]
    pr_description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/remediate/{alert_id}", status_code=201)
@gemini_operation("remediation", alert_inputs, ttl_seconds=None, resource=lambda values: values["alert_id"])
def remediate_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Recebe um alert_id, busca o alerta no banco,
    chama o Gemini para gerar patch + teste e salva o resultado.
    """
    # Buscar o alerta (apenas da conta logada)
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alerta {alert_id} nao encontrado")

    # Verificar se já foi remediado
    existing = db.query(Remediation).filter(
        Remediation.alert_id == alert_id,
        Remediation.user_id == current_user.id
    ).first()
    if existing and reuse_saved_result() and all(
        isinstance(value, str) and value.strip()
        for value in (existing.patch_code, existing.test_code, existing.pr_description)
    ):
        return {
            "message": "Este alerta ja possui remediacao",
            "remediation_id": existing.id,
            "alert_id": alert_id
        }

    # Usar o raw_output como codigo a ser analisado
    code_snippet = alert.raw_output or f"# Vulnerabilidade: {alert.title}\n# Arquivo: {alert.file_path}"

    # Chamar o Gemini via serviço de remediação
    try:
        result = request_remediation(
            alert_title=alert.title,
            alert_description=alert.description,
            alert_severity=alert.severity_adjusted or alert.severity,
            file_path=alert.file_path or "desconhecido",
            code_snippet=code_snippet
        )
    except (RuntimeError, ValueError) as e:
        raise HTTPException(status_code=502, detail=f"Erro na remediacao via LLM: {e}")

    # Salvar no banco
    remediation = existing or Remediation(user_id=current_user.id, alert_id=alert_id)
    remediation.patch_code = result["patch_code"]
    remediation.test_code = result["test_code"]
    remediation.pr_description = result["pr_description"]
    if not existing:
        db.add(remediation)
    db.commit()
    db.refresh(remediation)

    return {
        "message": "Remediacao gerada com sucesso",
        "remediation_id": remediation.id,
        "alert_id": alert_id,
        "dlp_applied": result.get("dlp_applied", False),
        "secrets_found": result.get("secrets_found", 0),
        "patch_preview": result["patch_code"][:200] + "..." if len(result["patch_code"]) > 200 else result["patch_code"]
    }


@router.get("/remediations/{alert_id}", response_model=RemediationResponse)
def get_remediation(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    remediation = db.query(Remediation).filter(
        Remediation.alert_id == alert_id,
        Remediation.user_id == current_user.id
    ).first()
    if not remediation:
        raise HTTPException(status_code=404, detail="Remediacao nao encontrada para este alerta")
    return remediation


@router.get("/remediations", response_model=list[RemediationResponse])
def list_remediations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Remediation).filter(
        Remediation.user_id == current_user.id
    ).order_by(Remediation.created_at.desc()).limit(100).all()
