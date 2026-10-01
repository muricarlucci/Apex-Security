import os
from github import Github, GithubException
from dotenv import load_dotenv

load_dotenv()

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_REPO = os.getenv("GITHUB_REPO", "muricarlucci/Apex-Security")

AUTH_ERROR_MESSAGE = (
    "Token do GitHub invalido ou expirado — verifique GITHUB_TOKEN "
    "nas variaveis de ambiente do Render"
)


class GitHubAuthError(Exception):
    """Credencial do GitHub invalida ou expirada (HTTP 401 Bad credentials)."""


def _raise_github_error(e: GithubException, contexto: str):
    """
    Converte uma GithubException em erro tipado.
    401 (Bad credentials) vira GitHubAuthError para que a API possa responder
    401 e o dashboard exibir uma mensagem de configuracao pendente, em vez de
    repassar o JSON cru da excecao.
    """
    status = getattr(e, "status", None)
    if status == 401:
        raise GitHubAuthError(AUTH_ERROR_MESSAGE) from e
    if status == 403:
        raise GitHubAuthError(
            "Token do GitHub sem permissao suficiente — confirme os escopos "
            "'repo' e 'workflow' e atualize GITHUB_TOKEN nas variaveis de ambiente do Render"
        ) from e
    raise RuntimeError(f"{contexto}: {e}")


def create_pull_request(
    alert_id: int,
    remediation_id: int,
    file_path: str,
    patch_code: str,
    test_code: str,
    pr_description: str,
    alert_title: str
) -> dict:
    """
    Cria uma branch com o patch, faz commit do arquivo corrigido
    e do teste, e abre um Pull Request no GitHub.
    Retorna dict com: pr_url, pr_number, branch_name
    """
    if not GITHUB_TOKEN:
        raise EnvironmentError(
            "GITHUB_TOKEN nao encontrado no .env. "
            "Configure o Personal Access Token do GitHub antes de usar este modulo."
        )

    try:
        g = Github(GITHUB_TOKEN)
        repo = g.get_repo(GITHUB_REPO)
    except GithubException as e:
        _raise_github_error(e, "Erro ao conectar ao GitHub")

    # Criar nome da branch
    branch_name = f"apex/fix-alert-{alert_id}"
    safe_title = alert_title[:40].replace(" ", "-").replace("/", "-").lower()
    branch_name = f"apex/fix-{alert_id}-{safe_title}"

    # Obter branch base (main)
    try:
        base_branch = repo.get_branch("main")
        base_sha = base_branch.commit.sha
    except GithubException as e:
        _raise_github_error(e, "Erro ao obter branch main")

    # Criar nova branch
    try:
        repo.create_git_ref(
            ref=f"refs/heads/{branch_name}",
            sha=base_sha
        )
    except GithubException as e:
        if "Reference already exists" in str(e):
            branch_name = f"{branch_name}-{remediation_id}"
            repo.create_git_ref(
                ref=f"refs/heads/{branch_name}",
                sha=base_sha
            )
        else:
            _raise_github_error(e, "Erro ao criar branch")

    # Commit do arquivo corrigido
    try:
        try:
            existing = repo.get_contents(file_path, ref=branch_name)
            repo.update_file(
                path=file_path,
                message=f"fix(apex): corrigir vulnerabilidade no alert #{alert_id}",
                content=patch_code,
                sha=existing.sha,
                branch=branch_name
            )
        except GithubException:
            repo.create_file(
                path=file_path,
                message=f"fix(apex): corrigir vulnerabilidade no alert #{alert_id}",
                content=patch_code,
                branch=branch_name
            )
    except GithubException as e:
        _raise_github_error(e, "Erro ao commitar patch")

    # Commit do arquivo de teste
    test_file_path = f"tests/apex_generated/test_fix_alert_{alert_id}.py"
    try:
        repo.create_file(
            path=test_file_path,
            message=f"test(apex): teste automatico para correcao do alert #{alert_id}",
            content=test_code,
            branch=branch_name
        )
    except GithubException as e:
        _raise_github_error(e, "Erro ao commitar teste")

    # Criar o Pull Request
    pr_body = f"""## Apex Security — Correcao Automatica

**Alert ID:** #{alert_id}
**Remediation ID:** #{remediation_id}
**Arquivo corrigido:** `{file_path}`

---

{pr_description}

---

> **Revisao humana obrigatoria.** Esta correcao foi gerada automaticamente pela Apex Security.
> O teste unitario em `{test_file_path}` valida que a vulnerabilidade foi mitigada.
> **Nao fazer merge sem revisar o patch e executar os testes.**
"""

    try:
        pr = repo.create_pull(
            title=f"[Apex Security] Fix: {alert_title[:60]}",
            body=pr_body,
            head=branch_name,
            base="main"
        )
    except GithubException as e:
        _raise_github_error(e, "Erro ao criar Pull Request")

    return {
        "pr_url": pr.html_url,
        "pr_number": pr.number,
        "branch_name": branch_name,
        "test_file_path": test_file_path
    }
