# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import pytest
import json
from unittest.mock import patch, MagicMock
from services.remediator import request_remediation

# Resposta simulada do Gemini para os testes
MOCK_GEMINI_RESPONSE = json.dumps({
    "patch_code": "password = os.environ.get('PASSWORD')",
    "test_code": "def test_no_hardcoded_password():\n    assert 'senha123' not in open('app.py').read()",
    "pr_description": "Removida senha hardcoded. Agora usa variavel de ambiente."
})


def _mock_response(text):
    """generate_with_fallback() devolve o response direto (nao o model)."""
    resp = MagicMock()
    resp.text = text
    return resp


class TestRequestRemediation:
    @patch("services.remediator.generate_with_fallback")
    def test_retorna_tres_campos_obrigatorios(self, mock_gen):
        mock_gen.return_value = _mock_response(MOCK_GEMINI_RESPONSE)

        result = request_remediation(
            alert_title="Senha hardcoded",
            alert_description="Senha em texto claro no codigo",
            alert_severity="HIGH",
            file_path="app.py",
            code_snippet='password = "senha123"'
        )
        assert "patch_code" in result
        assert "test_code" in result
        assert "pr_description" in result

    @patch("services.remediator.generate_with_fallback")
    def test_dlp_aplicado_quando_ha_secrets(self, mock_gen):
        mock_gen.return_value = _mock_response(MOCK_GEMINI_RESPONSE)

        result = request_remediation(
            alert_title="Token exposto",
            alert_description="Token GitHub no codigo",
            alert_severity="CRITICAL",
            file_path="config.py",
            code_snippet='token = "ghp_abcdefghijklmnopqrstuvwxyz123456789012"'
        )
        assert result["dlp_applied"] is True
        assert result["secrets_found"] > 0

    @patch("services.remediator.generate_with_fallback")
    def test_json_invalido_levanta_value_error(self, mock_gen):
        mock_gen.return_value = _mock_response("isso nao e json valido")

        with pytest.raises(ValueError):
            request_remediation(
                alert_title="Teste",
                alert_description="Teste",
                alert_severity="LOW",
                file_path="test.py",
                code_snippet="x = 1"
            )

    @patch("services.remediator.generate_with_fallback")
    def test_campos_faltando_levanta_value_error(self, mock_gen):
        # Resposta sem test_code
        mock_gen.return_value = _mock_response(json.dumps({"patch_code": "x = 2", "pr_description": "desc"}))

        with pytest.raises(ValueError, match="test_code"):
            request_remediation(
                alert_title="Teste",
                alert_description="Teste",
                alert_severity="LOW",
                file_path="test.py",
                code_snippet="x = 1"
            )
