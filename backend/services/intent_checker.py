from services.model_config import get_model_name
import json
from dotenv import load_dotenv
from services.gemini_client import generate_with_fallback

load_dotenv()

# Versao heuristica SIMPLIFICADA do Intent Engine da arquitetura original.
# Nao integra com Jira/Trello nem usa dataset de ameacas — apenas compara a
# mensagem de commit com o diff real via LLM. O resultado e um alerta
# INFORMATIVO: nunca bloqueia PRs ou merges automaticamente.

GEMINI_MODEL = get_model_name()

INTENT_SYSTEM_PROMPT = """Voce e um auditor de consistencia entre intencao declarada e codigo real.
Compare a mensagem de commit fornecida com o diff de codigo fornecido.
Retorne APENAS um JSON com este formato exato:
{"consistent": true ou false, "confidence": 0 a 100, "explanation": "explicacao curta em portugues"}
Marque consistent=false APENAS se houver uma divergencia clara e objetiva
(ex: commit diz "corrigir typo" mas o diff abre uma porta de rede ou adiciona credenciais).
Na duvida, marque consistent=true — este e um alerta informativo, nao um bloqueio."""


def check_intent_consistency(commit_message: str, code_diff: str) -> dict:
    """
    Compara mensagem de commit com o diff real via Gemini.
    Retorna um alerta INFORMATIVO — nunca bloqueia nada automaticamente.
    """
    prompt = f"""MENSAGEM DO COMMIT:
{commit_message}

DIFF DO CODIGO:
{code_diff[:3000]}

Analise a consistencia."""

    try:
        response = generate_with_fallback(GEMINI_MODEL, INTENT_SYSTEM_PROMPT, prompt)
        raw = response.text.strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
        if (not isinstance(result, dict) or not isinstance(result.get("consistent"), bool)
                or not isinstance(result.get("confidence"), (int, float))
                or not 0 <= result["confidence"] <= 100
                or not isinstance(result.get("explanation"), str) or not result["explanation"].strip()):
            raise ValueError("Gemini retornou analise de intencao invalida")
        return result
    except Exception as e:
        return {
            "consistent": True,
            "confidence": 0,
            "explanation": f"Nao foi possivel analisar: {str(e)}"
        }
