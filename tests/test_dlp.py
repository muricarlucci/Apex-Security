# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import pytest
from services.dlp import obfuscate, deobfuscate, has_secrets, scan_for_secrets


class TestObfuscate:
    def test_senha_hardcoded_detectada(self):
        code = 'password = "minha-senha-secreta-123"'
        obfuscated, mapping = obfuscate(code)
        assert "minha-senha-secreta-123" not in obfuscated
        assert len(mapping) > 0

    def test_chave_aws_detectada(self):
        code = "aws_key = 'AKIAIOSFODNN7EXAMPLE'"
        obfuscated, mapping = obfuscate(code)
        assert "AKIAIOSFODNN7EXAMPLE" not in obfuscated

    def test_token_github_detectado(self):
        code = "token = 'ghp_abcdefghijklmnopqrstuvwxyz123456789012'"
        obfuscated, mapping = obfuscate(code)
        assert "ghp_" not in obfuscated

    def test_codigo_sem_secrets_nao_alterado(self):
        code = "def soma(a, b):\n    return a + b"
        obfuscated, mapping = obfuscate(code)
        assert len(mapping) == 0

    def test_placeholder_tem_formato_correto(self):
        code = 'api_key = "chave-super-secreta-aqui"'
        obfuscated, mapping = obfuscate(code)
        for placeholder in mapping.keys():
            assert placeholder.startswith("__APEX_SECRET_")
            assert placeholder.endswith("__")


class TestDeobfuscate:
    def test_reversao_completa(self):
        original_code = 'password = "senha-original-123"'
        obfuscated, mapping = obfuscate(original_code)
        restored = deobfuscate(obfuscated, mapping)
        assert "senha-original-123" in restored

    def test_sem_mapping_retorna_texto_igual(self):
        text = "texto sem secrets"
        result = deobfuscate(text, {})
        assert result == text


class TestHasSecrets:
    def test_detecta_senha(self):
        assert has_secrets('password = "123456"') is True

    def test_codigo_limpo_retorna_false(self):
        assert has_secrets("x = 1 + 2") is False


class TestScanForSecrets:
    def test_retorna_lista(self):
        code = 'api_key = "chave-secreta-aqui"'
        findings = scan_for_secrets(code)
        assert isinstance(findings, list)

    def test_preview_nao_expoe_secret_completo(self):
        code = 'password = "senha-super-longa-aqui"'
        findings = scan_for_secrets(code)
        for f in findings:
            assert len(f["preview"]) <= 10
