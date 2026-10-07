# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
from services.model_config import get_model_name
import json
import re
from dotenv import load_dotenv
from services.dlp import obfuscate, deobfuscate
from services.gemini_client import generate_with_fallback

load_dotenv()

# Modelo centralizado, configuravel por GEMINI_MODEL.
GEMINI_MODEL = get_model_name()

SYSTEM_PROMPT = """Voce e um especialista em seguranca de software da plataforma Apex Security.
Sua tarefa e analisar vulnerabilidades de codigo e gerar correcoes seguras.

REGRAS OBRIGATORIAS — NUNCA VIOLE:
1. Sempre retorne APENAS um objeto JSON valido, sem texto antes ou depois
2. O JSON deve ter EXATAMENTE estas tres chaves: "patch_code", "test_code", "pr_description"
3. "patch_code": o codigo corrigido completo (nao apenas o trecho alterado)
4. "test_code": um arquivo de teste PyTest ou Jest que PROVE que a vulnerabilidade foi corrigida
5. "pr_description": descricao em portugues do que foi corrigido e por que
6. NUNCA omita o "test_code" — ele e obrigatorio em 100% dos casos
7. Se encontrar placeholders no formato __APEX_SECRET_TIPO_HASH__, mantenha-os intactos no codigo
8. Nao adicione comentarios fora do JSON
9. Nao use blocos de codigo markdown (sem ```)

Formato obrigatorio da resposta:
{"patch_code": "...codigo corrigido...", "test_code": "...codigo de teste...", "pr_description": "...descricao..."}"""


def request_remediation(
    alert_title: str,
    alert_description: str,
    alert_severity: str,
    file_path: str,
    code_snippet: str
) -> dict:
    """
    Chama o Gemini para gerar patch + teste para uma vulnerabilidade.
    Aplica DLP antes de enviar e reverte depois de receber.
    Retorna dict com: patch_code, test_code, pr_description, secrets_found
    """
    # Aplicar DLP — ofuscar secrets antes de enviar ao Gemini
    obfuscated_code, secret_mapping = obfuscate(code_snippet)
    secrets_found = len(secret_mapping)

    # Montar prompt do usuário
    user_prompt = f"""Analise e corrija a seguinte vulnerabilidade:

TITULO: {alert_title}
SEVERIDADE: {alert_severity}
ARQUIVO: {file_path}
DESCRICAO: {alert_description or 'Nao fornecida'}

CODIGO VULNERAVEL:
{obfuscated_code}

Gere o JSON com patch_code, test_code e pr_description conforme instruido."""

    # Chamar o Gemini (com fallback automatico entre chaves)
    try:
        response = generate_with_fallback(GEMINI_MODEL, SYSTEM_PROMPT, user_prompt)
        raw_response = response.text.strip()
    except Exception as e:
        raise RuntimeError(f"Erro na chamada ao Gemini: {e}")

    # Limpar resposta — remover markdown se o modelo insistir
    raw_response = re.sub(r'^```json\s*', '', raw_response, flags=re.MULTILINE)
    raw_response = re.sub(r'^```\s*', '', raw_response, flags=re.MULTILINE)
    raw_response = raw_response.strip()

    # Parsear JSON da resposta
    try:
        result = json.loads(raw_response)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini retornou resposta invalida (nao e JSON): {e}\nResposta: {raw_response[:500]}")

    # Validar campos obrigatorios
    required_fields = ["patch_code", "test_code", "pr_description"]
    missing = [f for f in required_fields if f not in result]
    if missing:
        raise ValueError(f"Resposta do Gemini faltando campos obrigatorios: {missing}")
    if any(not isinstance(result[field], str) or not result[field].strip() for field in required_fields):
        raise ValueError("Resposta do Gemini contem campos de remediacao vazios ou invalidos")

    # Reverter DLP — restaurar secrets no patch gerado
    if secret_mapping:
        result["patch_code"] = deobfuscate(result["patch_code"], secret_mapping)
        result["test_code"] = deobfuscate(result["test_code"], secret_mapping)

    result["secrets_found"] = secrets_found
    result["dlp_applied"] = secrets_found > 0

    return result
