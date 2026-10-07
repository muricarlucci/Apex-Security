# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import json
import os
from typing import Optional

# Carregar regras do arquivo JSON
RULES_PATH = os.path.join(os.path.dirname(__file__), "rules.json")


def _load_rules() -> list:
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("rules", [])


def _matches_condition(alert: dict, condition: dict) -> bool:
    """Verifica se um alerta satisfaz as condições de uma regra."""
    # Verificar severidade
    if "severity" in condition:
        if alert.get("severity") not in condition["severity"]:
            return False

    # Verificar ferramenta
    if "source_tool" in condition:
        if alert.get("source_tool") != condition["source_tool"]:
            return False

    # Verificar se title contém alguma das palavras
    if "title_contains" in condition:
        title_lower = (alert.get("title") or "").lower()
        desc_lower = (alert.get("description") or "").lower()
        match = any(
            word in title_lower or word in desc_lower
            for word in condition["title_contains"]
        )
        if not match:
            return False

    # Verificar se file_path contém alguma das palavras
    if "file_path_contains" in condition:
        path_lower = (alert.get("file_path") or "").lower()
        match = any(word in path_lower for word in condition["file_path_contains"])
        if not match:
            return False

    # Verificar exposição à internet via IaC
    if "iac_internet_exposed" in condition:
        expected = condition["iac_internet_exposed"]
        actual = alert.get("iac_internet_exposed")
        # Se não temos info do IaC, não aplicar regras que dependem disso
        if actual is None:
            return False
        if actual != expected:
            return False

    # Verificar presença de CVE
    if "cve_id_present" in condition:
        has_cve = alert.get("cve_id") is not None
        if has_cve != condition["cve_id_present"]:
            return False

    return True


def prioritize(alert: dict) -> dict:
    """
    Aplica as regras de priorização ao alerta e retorna
    o alerta com severity_adjusted preenchido.
    """
    rules = _load_rules()
    result = alert.copy()
    applied_rule = None

    for rule in rules:
        condition = rule.get("condition", {})
        if _matches_condition(alert, condition):
            action = rule.get("action")
            target = rule.get("target_severity")

            if action == "downgrade":
                result["severity_adjusted"] = target
            elif action == "upgrade":
                result["severity_adjusted"] = target
            elif action == "keep":
                result["severity_adjusted"] = alert["severity"]

            applied_rule = rule["id"]
            break  # aplica apenas a primeira regra que bater

    if applied_rule is None:
        # Nenhuma regra aplicada — manter severidade original
        result["severity_adjusted"] = alert["severity"]

    return result
