# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
from github import Github, GithubException
from requests.exceptions import RequestException
from services.pr_creator import GitHubAuthError, _raise_github_error


def dispatch_dast(scan, config):
    if not config.github_token:
        raise RuntimeError("GITHUB_TOKEN nao configurado no Render")
    try:
        with Github(config.github_token, timeout=20, retry=0) as client:
            workflow = client.get_repo(config.github_repo).get_workflow(config.workflow)
            accepted = workflow.create_dispatch(ref=config.ref, inputs={
                "scan_id": str(scan.id), "nonce": scan.nonce,
                "target_kind": scan.target_kind, "target_url": scan.target_url if scan.target_kind == "custom" else "",
                "mode": scan.mode, "training_hosts": ",".join(config.training_hosts),
            })
            if not accepted:
                raise RuntimeError("GitHub nao confirmou o disparo do workflow DAST")
    except GithubException as error:
        if error.status in (401, 403):
            try:
                _raise_github_error(error, "DAST")
            except GitHubAuthError as auth_error:
                raise RuntimeError(str(auth_error)) from error
        if error.status == 404:
            raise RuntimeError("Workflow DAST nao encontrado; publique apex-dast.yml e confira GITHUB_REPO") from error
        raise RuntimeError("Falha ao disparar workflow DAST no GitHub") from error
    except RequestException as error:
        raise RuntimeError("Nao foi possivel conectar ao GitHub; confira o workflow DAST") from error
    return f"https://github.com/{config.github_repo}/actions/workflows/{config.workflow}"
