# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import secrets
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, Boolean
from sqlalchemy.sql import func
from database import Base


class GeminiOperationCache(Base):
    # main.py imports all routers/models BEFORE Base.metadata.create_all.
    # This new additive table is created by the existing startup mechanism.
    __tablename__ = "gemini_operation_cache"

    cache_key = Column(String(64), primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    operation = Column(String(30), nullable=False)
    input_fingerprint = Column(String(64), nullable=False)
    result_json = Column(Text, nullable=False)
    generated_at = Column(DateTime(timezone=True), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)


class User(Base):
    """
    Conta de acesso. Cada usuario ve apenas os proprios dados (multi-tenant).
    A api_key e usada pelo GitHub Actions (header X-Apex-Api-Key) para associar
    os scans a conta correta, ja que o workflow nao consegue fazer login via JWT.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    company_name = Column(String(255))
    api_key = Column(String(64), unique=True, default=lambda: secrets.token_hex(32))
    discord_webhook_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# NOTA MULTI-TENANT: user_id e nullable=True de proposito. Registros criados
# antes da autenticacao ficam com user_id=None e sao tratados como dados
# legados/demo — nunca apagados. Ver CONTEXTO_APEX.md.

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    source_tool = Column(String(50), nullable=False)
    repository = Column(String(255), nullable=False)
    file_path = Column(Text)
    line_number = Column(Integer)
    severity = Column(String(20), nullable=False)
    severity_adjusted = Column(String(20))
    title = Column(String(500), nullable=False)
    description = Column(Text)
    cve_id = Column(String(50))
    iac_internet_exposed = Column(Boolean, default=None)
    raw_output = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Repository(Base):
    """
    Inventario global de repositorios. Nao e exibido diretamente na UI
    (a pagina Repositorios agrupa a partir dos alertas do usuario logado),
    por isso o nome permanece unico globalmente.
    """
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    github_url = Column(String(500))
    registered_at = Column(DateTime(timezone=True), server_default=func.now())


class Remediation(Base):
    __tablename__ = "remediations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    alert_id = Column(Integer, nullable=False)
    patch_code = Column(Text)
    test_code = Column(Text)
    pr_description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CompanyProfile(Base):
    """
    Perfil da empresa usado para calibrar a estimativa de risco financeiro.
    Uma linha POR USUARIO; todos os campos tem default seguro, entao a
    analise nunca quebra por falta de preenchimento.
    """
    __tablename__ = "company_profile"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    sector = Column(String(100), default="Tecnologia / Software")
    annual_revenue = Column(String(50), default="R$ 5.000.000,00")
    sensitive_data_volume = Column(String(100), default="Médio — até 50 mil registros")
    regulations = Column(Text, default="LGPD")
    operational_context = Column(Text, default="")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    alert_id = Column(Integer, nullable=False)
    financial_impact_min = Column(String(50))
    financial_impact_max = Column(String(50))
    financial_impact_currency = Column(String(10), default="BRL")
    fair_reasoning = Column(Text)
    lgpd_fine_estimate = Column(String(50))
    downtime_cost_estimate = Column(String(50))
    blast_radius_json = Column(Text)
    # SLA de Compliance (extensao do Risco Real)
    sla_deadline = Column(String(100))
    sla_reasoning = Column(Text)
    compliance_risk_level = Column(String(20))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PullRequest(Base):
    __tablename__ = "pull_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    alert_id = Column(Integer, nullable=False)
    remediation_id = Column(Integer)
    github_pr_url = Column(String(500))
    github_pr_number = Column(Integer)
    branch_name = Column(String(255))
    status = Column(String(20), default="open")
    approved_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
