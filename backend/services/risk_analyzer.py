from services.model_config import get_model_name
import json
from dotenv import load_dotenv
from services.gemini_client import generate_with_fallback

load_dotenv()

# ESTIMATIVA ANALITICA DE APOIO A DECISAO — nao e valor contabil oficial.
# Segue a mesma filosofia consultiva dos demais modulos avancados: informa,
# nao substitui a priorizacao deterministica nem a governanca human-in-the-loop.

GEMINI_MODEL = get_model_name()

RISK_SYSTEM_PROMPT = """Voce e um analista de risco cibernetico especializado em quantificacao
financeira de vulnerabilidades, seguindo principios do modelo FAIR (Factor Analysis of
Information Risk), legislacao LGPD brasileira, e estimativas de custo de downtime.

Retorne APENAS um JSON valido com este formato exato:
{
  "financial_impact_min": "R$ XX.XXX,XX",
  "financial_impact_max": "R$ XXX.XXX,XX",
  "fair_reasoning": "explicacao clara em portugues de como chegou a essa estimativa",
  "lgpd_fine_estimate": "R$ XX.XXX,XX ou 'Nao aplicavel' se nao envolver dados pessoais",
  "downtime_cost_estimate": "R$ XX.XXX,XX ou 'Nao aplicavel'",
  "blast_radius": {
    "nodes": [
      {"id": "1", "label": "Nome do ativo vulneravel", "type": "entry_point"},
      {"id": "2", "label": "Nome de ativo intermediario", "type": "lateral"},
      {"id": "3", "label": "Nome de ativo critico final", "type": "critical_asset"}
    ],
    "edges": [
      {"from": "1", "to": "2", "label": "descricao curta do movimento"},
      {"from": "2", "to": "3", "label": "descricao curta do movimento"}
    ]
  }
}

Regras:
- Use o Perfil da Empresa fornecido para calibrar a estimativa (setor, faturamento, volume de dados)
- Quanto mais contexto operacional fornecido, mais especifica e justificada deve ser a analise
- O blast radius deve ter entre 3 e 6 nos, representando um caminho plausivel de movimentacao lateral
  a partir da vulnerabilidade ate um ativo critico hipotetico coerente com o setor
- Se o perfil da empresa estiver com valores padrao/genericos, mencione isso no fair_reasoning
  e sugira que a precisao aumenta com mais contexto real preenchido
- Nunca invente numeros sem justificativa — sempre explique o raciocinio no fair_reasoning"""


def analyze_risk(
    alert_title: str,
    alert_description: str,
    alert_severity: str,
    company_profile: dict
) -> dict:
    """
    Chama o Gemini para estimar impacto financeiro e gerar blast radius
    de uma vulnerabilidade especifica, calibrado pelo perfil da empresa.
    """
    prompt = f"""VULNERABILIDADE:
Titulo: {alert_title}
Severidade: {alert_severity}
Descricao: {alert_description or 'Nao fornecida'}

PERFIL DA EMPRESA:
Setor de atuacao: {company_profile.get('sector')}
Faturamento anual: {company_profile.get('annual_revenue')}
Volume de dados sensiveis/PII: {company_profile.get('sensitive_data_volume')}
Regulamentacoes aplicaveis: {company_profile.get('regulations')}
Contexto operacional adicional: {company_profile.get('operational_context') or 'Nao fornecido'}

Gere a analise de risco completa conforme o formato especificado."""

    try:
        response = generate_with_fallback(GEMINI_MODEL, RISK_SYSTEM_PROMPT, prompt)
        raw = response.text.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
        return result
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini retornou resposta invalida: {e}")
    except Exception as e:
        raise RuntimeError(f"Erro na chamada ao Gemini: {e}")


SLA_SYSTEM_PROMPT = """Voce e um especialista em compliance e gestao de prazos de correcao
de vulnerabilidades, com conhecimento de LGPD, ISO 27001 e praticas de mercado.

Retorne APENAS um JSON valido:
{
  "sla_deadline": "prazo em formato claro, ex: '72 horas' ou '15 dias uteis'",
  "sla_reasoning": "explicacao clara em portugues do porque desse prazo, considerando setor e regulamentacoes",
  "compliance_risk_level": "BAIXO, MEDIO, ALTO ou CRITICO"
}

Considere: vulnerabilidades CRITICAL/HIGH em setores regulados (saude, financeiro) ou que exponham dados
pessoais exigem prazos mais curtos. A LGPD nao define prazo tecnico fixo para correcao, mas
o tempo de exposicao afeta diretamente a responsabilidade em caso de incidente."""


def analyze_sla(alert_title: str, alert_severity: str, company_profile: dict) -> dict:
    """
    Estima o prazo de correcao (SLA) e o nivel de risco de compliance.
    Assim como a estimativa financeira, e uma orientacao analitica de apoio
    a decisao — nao um prazo legal oficial.
    """
    prompt = f"""VULNERABILIDADE: {alert_title}
SEVERIDADE: {alert_severity}

PERFIL DA EMPRESA:
Setor: {company_profile.get('sector')}
Regulamentacoes: {company_profile.get('regulations')}
Volume de dados sensiveis: {company_profile.get('sensitive_data_volume')}

Calcule o prazo SLA de correcao."""

    try:
        response = generate_with_fallback(GEMINI_MODEL, SLA_SYSTEM_PROMPT, prompt)
        raw = response.text.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        raise RuntimeError(f"Erro na analise de SLA: {e}")
