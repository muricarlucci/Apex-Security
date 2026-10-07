# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import re
import uuid

# Padrões Regex para detectar secrets comuns
SECRET_PATTERNS = [
    # Chaves AWS
    (r'AKIA[0-9A-Z]{16}', 'AWS_ACCESS_KEY'),
    (r'(?i)aws[_\-\s]?secret[_\-\s]?access[_\-\s]?key\s*[=:]\s*["\']?([A-Za-z0-9/+=]{40})["\']?', 'AWS_SECRET_KEY'),
    # Tokens GitHub
    (r'ghp_[a-zA-Z0-9]{36}', 'GITHUB_TOKEN'),
    (r'github_pat_[a-zA-Z0-9_]{82}', 'GITHUB_PAT'),
    (r'ghs_[a-zA-Z0-9]{36}', 'GITHUB_APP_TOKEN'),
    # Tokens Google/Gemini
    (r'AIza[0-9A-Za-z\-_]{35}', 'GOOGLE_API_KEY'),
    # JWT tokens
    (r'eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*', 'JWT_TOKEN'),
    # Senhas hardcoded em variáveis
    (r'(?i)(password|passwd|pwd|secret|api_key|apikey|token|auth_token)\s*[=:]\s*["\']?([^"\'\s]{6,})["\']?', 'HARDCODED_PASSWORD'),
    # Strings genéricas de 32+ chars que parecem hashes/tokens
    (r'(?<![A-Za-z0-9])[A-Za-z0-9]{32,64}(?![A-Za-z0-9])', 'POSSIBLE_TOKEN'),
    # URLs com credenciais
    (r'(?i)(https?|ftp)://[^:@\s]+:[^@\s]+@[^\s]+', 'URL_WITH_CREDENTIALS'),
]


def obfuscate(code: str) -> tuple[str, dict]:
    """
    Detecta e substitui secrets no código por placeholders únicos.
    Retorna:
        - código com secrets substituídos
        - dicionário de mapeamento {placeholder: valor_original}
    """
    mapping = {}
    result = code

    for pattern, secret_type in SECRET_PATTERNS:
        matches = list(re.finditer(pattern, result))
        for match in reversed(matches):  # reversed para não deslocar índices
            original_value = match.group(0)

            # Verificar se já foi substituído (um match que contenha um
            # placeholder não pode ser re-ofuscado, senão a reversão quebra)
            if '__APEX_SECRET_' in original_value:
                continue

            placeholder = f"__APEX_SECRET_{secret_type}_{uuid.uuid4().hex[:8].upper()}__"
            mapping[placeholder] = original_value
            result = result[:match.start()] + placeholder + result[match.end():]

    return result, mapping


def deobfuscate(text: str, mapping: dict) -> str:
    """
    Reverte a substituição de placeholders pelos valores originais.
    Usado para restaurar o código real após processamento pelo LLM.
    """
    result = text
    for placeholder, original in mapping.items():
        result = result.replace(placeholder, original)
    return result


def has_secrets(code: str) -> bool:
    """
    Retorna True se o código contém pelo menos um secret detectável.
    Útil para decidir se o DLP precisa ser aplicado.
    """
    for pattern, _ in SECRET_PATTERNS:
        if re.search(pattern, code):
            return True
    return False


def scan_for_secrets(code: str) -> list[dict]:
    """
    Lista todos os secrets encontrados sem substituir.
    Usado para auditoria e logs.
    """
    findings = []
    for pattern, secret_type in SECRET_PATTERNS:
        matches = re.finditer(pattern, code)
        for match in matches:
            findings.append({
                "type": secret_type,
                "position": match.start(),
                "length": len(match.group(0)),
                "preview": match.group(0)[:6] + "..." if len(match.group(0)) > 6 else match.group(0)
            })
    return findings
