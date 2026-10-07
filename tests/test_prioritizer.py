# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import pytest
from services.prioritizer import prioritize


def make_alert(severity="HIGH", title="test", source_tool="semgrep",
               file_path="app.py", cve_id=None, iac_exposed=None):
    return {
        "id": "test-uuid",
        "source_tool": source_tool,
        "repository": "test-repo",
        "file_path": file_path,
        "line_number": 1,
        "severity": severity,
        "severity_adjusted": severity,
        "title": title,
        "description": None,
        "cve_id": cve_id,
        "iac_internet_exposed": iac_exposed,
        "raw_output": "{}",
        "timestamp": "2026-01-01T00:00:00+00:00"
    }


class TestPrioritizer:
    def test_alerta_sem_regra_mantem_severidade(self):
        alert = make_alert(severity="MEDIUM", title="generic issue")
        result = prioritize(alert)
        assert result["severity_adjusted"] == "MEDIUM"

    def test_senha_em_arquivo_de_teste_rebaixada_para_low(self):
        alert = make_alert(
            severity="HIGH",
            title="hardcoded password detected",
            file_path="tests/test_auth.py"
        )
        result = prioritize(alert)
        assert result["severity_adjusted"] == "LOW"

    def test_info_permanece_info(self):
        alert = make_alert(severity="INFO", title="informational finding")
        result = prioritize(alert)
        assert result["severity_adjusted"] == "INFO"

    def test_alerta_original_nao_mutado(self):
        alert = make_alert(severity="HIGH", title="hardcoded password", file_path="tests/test_auth.py")
        original_severity = alert["severity"]
        prioritize(alert)
        assert alert["severity"] == original_severity  # original não foi alterado

    def test_retorna_dicionario(self):
        alert = make_alert()
        result = prioritize(alert)
        assert isinstance(result, dict)
        assert "severity_adjusted" in result
