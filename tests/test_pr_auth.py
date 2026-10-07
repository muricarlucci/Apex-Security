# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import pytest
from github import GithubException
from services.pr_creator import _raise_github_error, GitHubAuthError, AUTH_ERROR_MESSAGE


def _exc(status):
    return GithubException(status=status, data={"message": "Bad credentials"}, headers={})


class TestGitHubErrorMapping:
    """
    Regressao do bug critico: token invalido/expirado precisa virar GitHubAuthError
    (que a rota mapeia para HTTP 401), e nao um RuntimeError generico -> 502.
    """

    def test_401_vira_auth_error_com_mensagem_clara(self):
        with pytest.raises(GitHubAuthError) as info:
            _raise_github_error(_exc(401), "Erro ao conectar ao GitHub")
        assert str(info.value) == AUTH_ERROR_MESSAGE
        assert "GITHUB_TOKEN" in str(info.value)

    def test_403_vira_auth_error_mencionando_escopos(self):
        with pytest.raises(GitHubAuthError) as info:
            _raise_github_error(_exc(403), "Erro ao criar branch")
        assert "escopos" in str(info.value)

    def test_404_permanece_runtime_error(self):
        with pytest.raises(RuntimeError) as info:
            _raise_github_error(_exc(404), "Erro ao obter branch main")
        assert "Erro ao obter branch main" in str(info.value)

    def test_runtime_error_nao_e_auth_error(self):
        with pytest.raises(RuntimeError) as info:
            _raise_github_error(_exc(500), "Erro ao commitar patch")
        assert not isinstance(info.value, GitHubAuthError)
