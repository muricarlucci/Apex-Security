# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
from services.model_config import get_model_name
from dotenv import load_dotenv
from services.gemini_client import generate_with_fallback

load_dotenv()

# HONESTIDADE TECNICA: o Gemini, na configuracao atual do projeto, NAO faz busca
# ao vivo na internet. O relatorio e uma sintese do conhecimento ja presente no
# modelo — a interface deixa isso explicito para nao prometer "tempo real".

GEMINI_MODEL = get_model_name()

RADAR_SYSTEM_PROMPT = """Voce e um analista de threat intelligence senior. Com base no seu
conhecimento sobre tendencias de ciberseguranca, gere um panorama executivo para uma empresa
especifica, cobrindo:

1. As 3-5 categorias de ameacas mais relevantes para o SETOR informado
2. Tipos de vulnerabilidades comumente exploradas em empresas com o PERFIL DE DADOS informado
3. Recomendacoes praticas de prevencao, priorizadas

Retorne em texto corrido bem estruturado com subtitulos claros, em portugues, tom executivo
e direto. Nao invente CVEs especificos ou datas — fale em termos de categorias e vetores de
ameaca consistentes com seu conhecimento geral de seguranca da informacao."""


def generate_radar_report(company_profile: dict) -> str:
    prompt = f"""PERFIL DA EMPRESA:
Setor: {company_profile.get('sector')}
Faturamento anual: {company_profile.get('annual_revenue')}
Volume de dados sensiveis: {company_profile.get('sensitive_data_volume')}
Regulamentacoes: {company_profile.get('regulations')}
Contexto operacional: {company_profile.get('operational_context') or 'Nao fornecido'}

Gere o panorama executivo de ameacas para esta empresa."""

    response = generate_with_fallback(GEMINI_MODEL, RADAR_SYSTEM_PROMPT, prompt)
    return response.text.strip()
