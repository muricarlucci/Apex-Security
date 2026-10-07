# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import pytest
import json
from services.normalizer import normalize, parse_semgrep, parse_trivy, normalize_severity

# Fixtures de output real do Semgrep
SEMGREP_SAMPLE = {
    "results": [
        {
            "check_id": "python.lang.security.audit.hardcoded-password",
            "path": "app.py",
            "start": {"line": 5, "col": 1},
            "extra": {
                "severity": "error",
                "message": "Senha hardcoded detectada na variável 'password'",
                "metadata": {"cve": None}
            }
        }
    ],
    "errors": []
}

# Fixtures de output real do Trivy
TRIVY_SAMPLE = {
    "Results": [
        {
            "Target": "requirements.txt",
            "Vulnerabilities": [
                {
                    "VulnerabilityID": "CVE-2023-1234",
                    "Severity": "HIGH",
                    "Title": "Vulnerabilidade em biblioteca X",
                    "Description": "Descrição da vulnerabilidade"
                }
            ],
            "Misconfigurations": []
        }
    ]
}


class TestNormalizeSeverity:
    def test_semgrep_error_vira_high(self):
        assert normalize_severity("error") == "HIGH"

    def test_semgrep_warning_vira_medium(self):
        assert normalize_severity("warning") == "MEDIUM"

    def test_trivy_critical_permanece_critical(self):
        assert normalize_severity("critical") == "CRITICAL"

    def test_case_insensitive(self):
        assert normalize_severity("ERROR") == "HIGH"
        assert normalize_severity("Warning") == "MEDIUM"

    def test_desconhecido_vira_info(self):
        assert normalize_severity("xyzabc") == "INFO"


class TestParseSemgrep:
    def test_retorna_lista(self):
        result = parse_semgrep(SEMGREP_SAMPLE, "test-repo")
        assert isinstance(result, list)

    def test_um_alerta_gerado(self):
        result = parse_semgrep(SEMGREP_SAMPLE, "test-repo")
        assert len(result) == 1

    def test_campos_obrigatorios_presentes(self):
        result = parse_semgrep(SEMGREP_SAMPLE, "test-repo")
        alert = result[0]
        assert alert["source_tool"] == "semgrep"
        assert alert["repository"] == "test-repo"
        assert alert["severity"] == "HIGH"
        assert alert["file_path"] == "app.py"
        assert alert["line_number"] == 5
        assert "id" in alert
        assert "timestamp" in alert

    def test_resultado_vazio_retorna_lista_vazia(self):
        result = parse_semgrep({"results": []}, "test-repo")
        assert result == []


class TestParseTrivy:
    def test_retorna_lista(self):
        result = parse_trivy(TRIVY_SAMPLE, "test-repo")
        assert isinstance(result, list)

    def test_um_alerta_gerado(self):
        result = parse_trivy(TRIVY_SAMPLE, "test-repo")
        assert len(result) == 1

    def test_cve_extraido_corretamente(self):
        result = parse_trivy(TRIVY_SAMPLE, "test-repo")
        assert result[0]["cve_id"] == "CVE-2023-1234"

    def test_severidade_high_normalizada(self):
        result = parse_trivy(TRIVY_SAMPLE, "test-repo")
        assert result[0]["severity"] == "HIGH"


class TestNormalizeEntryPoint:
    def test_semgrep_completo(self):
        result = normalize("semgrep", json.dumps(SEMGREP_SAMPLE), "test-repo")
        assert len(result) == 1
        assert result[0]["source_tool"] == "semgrep"

    def test_trivy_completo(self):
        result = normalize("trivy", json.dumps(TRIVY_SAMPLE), "test-repo")
        assert len(result) == 1
        assert result[0]["source_tool"] == "trivy"

    def test_json_invalido_levanta_excecao(self):
        with pytest.raises(ValueError):
            normalize("semgrep", "isso nao e json", "test-repo")

    def test_ferramenta_desconhecida_nao_quebra(self):
        result = normalize("ferramenta-x", json.dumps({"data": "test"}), "test-repo")
        assert len(result) == 1
        assert result[0]["source_tool"] == "ferramenta-x"
