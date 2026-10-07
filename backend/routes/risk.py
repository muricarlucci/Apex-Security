# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import CompanyProfile, RiskAssessment, Alert, User
from services.risk_analyzer import analyze_risk, analyze_sla
from services.radar import generate_radar_report
from services.auth import get_current_user
from services.gemini_operations import gemini_operation, alert_inputs
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json

router = APIRouter()


class CompanyProfilePayload(BaseModel):
    sector: Optional[str] = None
    annual_revenue: Optional[str] = None
    sensitive_data_volume: Optional[str] = None
    regulations: Optional[str] = None
    operational_context: Optional[str] = None


def _get_or_create_profile(db: Session, user_id: int) -> CompanyProfile:
    """
    Garante que sempre exista uma linha de perfil PARA A CONTA informada.
    Se nunca foi salvo, cria com os valores padrao do modelo — fallback seguro
    para a analise nunca quebrar por falta de dados.
    """
    profile = db.query(CompanyProfile).filter(CompanyProfile.user_id == user_id).first()
    if not profile:
        profile = CompanyProfile(user_id=user_id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


def _profile_dict(profile: CompanyProfile) -> dict:
    return {
        "sector": profile.sector,
        "annual_revenue": profile.annual_revenue,
        "sensitive_data_volume": profile.sensitive_data_volume,
        "regulations": profile.regulations,
        "operational_context": profile.operational_context,
    }


def _analysis_inputs(values):
    return {
        "alert": alert_inputs(values),
        "profile": _profile_dict(_get_or_create_profile(values["db"], values["current_user"].id)),
    }


@router.get("/company-profile")
def get_company_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = _get_or_create_profile(db, current_user.id)
    return _profile_dict(profile)


@router.post("/company-profile")
def save_company_profile(payload: CompanyProfilePayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = _get_or_create_profile(db, current_user.id)
    if payload.sector is not None:
        profile.sector = payload.sector
    if payload.annual_revenue is not None:
        profile.annual_revenue = payload.annual_revenue
    if payload.sensitive_data_volume is not None:
        profile.sensitive_data_volume = payload.sensitive_data_volume
    if payload.regulations is not None:
        profile.regulations = payload.regulations
    if payload.operational_context is not None:
        profile.operational_context = payload.operational_context
    db.commit()
    return {"message": "Perfil da empresa salvo com sucesso"}


@router.post("/risk-assessment/{alert_id}", status_code=201)
@gemini_operation("risk", _analysis_inputs, resource=lambda values: values["alert_id"])
def create_risk_assessment(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alerta {alert_id} nao encontrado")

    profile = _get_or_create_profile(db, current_user.id)

    try:
        result = analyze_risk(
            alert_title=alert.title,
            alert_description=alert.description,
            alert_severity=alert.severity_adjusted or alert.severity,
            company_profile=_profile_dict(profile)
        )
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=502, detail=f"Erro na analise de risco: {e}")

    assessment = RiskAssessment(
        user_id=current_user.id,
        alert_id=alert_id,
        financial_impact_min=result.get("financial_impact_min"),
        financial_impact_max=result.get("financial_impact_max"),
        fair_reasoning=result.get("fair_reasoning"),
        lgpd_fine_estimate=result.get("lgpd_fine_estimate"),
        downtime_cost_estimate=result.get("downtime_cost_estimate"),
        blast_radius_json=json.dumps(result.get("blast_radius", {}))
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return {
        "id": assessment.id,
        "alert_id": alert_id,
        "financial_impact_min": assessment.financial_impact_min,
        "financial_impact_max": assessment.financial_impact_max,
        "fair_reasoning": assessment.fair_reasoning,
        "lgpd_fine_estimate": assessment.lgpd_fine_estimate,
        "downtime_cost_estimate": assessment.downtime_cost_estimate,
        "blast_radius": json.loads(assessment.blast_radius_json),
    }


@router.post("/sla-assessment/{alert_id}", status_code=201)
@gemini_operation("sla", _analysis_inputs, resource=lambda values: values["alert_id"])
def create_sla_assessment(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Calcula o prazo de correcao (SLA de Compliance) para a vulnerabilidade,
    calibrado pelo setor e regulamentacoes da empresa. Extensao do Risco Real.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta nao encontrado")

    profile = _get_or_create_profile(db, current_user.id)
    profile_dict = {
        "sector": profile.sector,
        "regulations": profile.regulations,
        "sensitive_data_volume": profile.sensitive_data_volume,
    }

    try:
        result = analyze_sla(alert.title, alert.severity_adjusted or alert.severity, profile_dict)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Atualiza a avaliacao de risco mais recente deste alerta, ou cria uma nova so com o SLA
    assessment = db.query(RiskAssessment).filter(
        RiskAssessment.alert_id == alert_id,
        RiskAssessment.user_id == current_user.id
    ).order_by(RiskAssessment.created_at.desc()).first()
    if not assessment:
        assessment = RiskAssessment(alert_id=alert_id, user_id=current_user.id)
        db.add(assessment)

    assessment.sla_deadline = result.get("sla_deadline")
    assessment.sla_reasoning = result.get("sla_reasoning")
    assessment.compliance_risk_level = result.get("compliance_risk_level")
    db.commit()
    db.refresh(assessment)

    return {
        "alert_id": alert_id,
        "sla_deadline": assessment.sla_deadline,
        "sla_reasoning": assessment.sla_reasoning,
        "compliance_risk_level": assessment.compliance_risk_level
    }


def _assessment_dict(a: RiskAssessment) -> dict:
    return {
        "id": a.id,
        "alert_id": a.alert_id,
        "financial_impact_min": a.financial_impact_min,
        "financial_impact_max": a.financial_impact_max,
        "fair_reasoning": a.fair_reasoning,
        "lgpd_fine_estimate": a.lgpd_fine_estimate,
        "downtime_cost_estimate": a.downtime_cost_estimate,
        "blast_radius": json.loads(a.blast_radius_json) if a.blast_radius_json else {},
        "sla_deadline": a.sla_deadline,
        "sla_reasoning": a.sla_reasoning,
        "compliance_risk_level": a.compliance_risk_level,
        "created_at": a.created_at,
    }


@router.get("/risk-assessments")
def list_risk_assessments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assessments = db.query(RiskAssessment).filter(
        RiskAssessment.user_id == current_user.id
    ).order_by(RiskAssessment.created_at.desc()).limit(50).all()
    return [_assessment_dict(a) for a in assessments]


@router.get("/risk-assessment/{alert_id}")
def get_risk_assessment(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assessment = db.query(RiskAssessment).filter(
        RiskAssessment.alert_id == alert_id,
        RiskAssessment.user_id == current_user.id
    ).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Nenhuma avaliacao de risco para este alerta")
    return _assessment_dict(assessment)


@router.get("/radar")
@gemini_operation("radar", lambda values: _profile_dict(_get_or_create_profile(values["db"], values["current_user"].id)), ttl_seconds=21600, resource=lambda values: "profile")
def get_radar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Panorama analitico de ameacas para o setor da empresa.
    NAO e busca ao vivo na internet — e uma sintese do conhecimento do modelo.
    """
    profile = _get_or_create_profile(db, current_user.id)
    try:
        report = generate_radar_report(_profile_dict(profile))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao gerar radar: {str(e)}")
    if not report:
        raise HTTPException(status_code=502, detail="Gemini retornou panorama vazio")
    return {"report": report, "generated_at": datetime.utcnow().isoformat()}
