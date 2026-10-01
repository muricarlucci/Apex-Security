# Deploy da Apex Security v2.2.1

Este guia documenta o dashboard/backend no repositório [muricarlucci/Apex-Security](https://github.com/muricarlucci/Apex-Security). O site de apresentação fica em outro repositório. URLs atuais: [API](https://apex-security-xzk4.onrender.com/docs), [dashboard](https://apex-security-kappa.vercel.app) e [site](https://apex-security-site-apresentacao.vercel.app). Render, Neon e Vercel usam planos gratuitos; confirme os limites atuais nos respectivos painéis.

Siga esta ordem: **Neon → Render → Vercel dashboard → `FRONTEND_URL` no Render → Vercel site → `SITE_URL` no Render → secrets do GitHub**.

## 1. Neon: PostgreSQL

Crie o projeto na conta atual e copie a connection string para `DATABASE_URL` no Render. Não grave a URL com senha no repositório. O backend usa SQLAlchemy: `Base.metadata.create_all` cria as tabelas ausentes no import de `main.py`. O arquivo `database.py` também executa alterações aditivas legadas para colunas e índices no startup; não há conjunto de arquivos de migração Alembic. Não rode SQL manual nem introduza novas migrações sem combinar.

## 2. Render: backend FastAPI

Crie ou confira o Web Service ligado à branch `main`. Deixe **Root Directory vazio**. Para criação pelo formulário manual, use:

| Campo | Valor |
| --- | --- |
| Build Command | `cd backend && pip install -r requirements.txt` |
| Start Command | `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/health` |
| `PYTHON_VERSION` | `3.11.9`, obrigatório no formulário manual |

O [`render.yaml`](render.yaml) também descreve o serviço. Preencha as variáveis marcadas com `sync: false` no painel do Render, sem salvar segredos em arquivos versionados.

| Variável | Valor ou origem |
| --- | --- |
| `DATABASE_URL` | Connection string do Neon, com SSL |
| `GEMINI_API_KEY` | Chave principal regenerada |
| `GEMINI_API_KEY_2` | Chave opcional de fallback |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite`, configurável |
| `GITHUB_TOKEN` | PAT da conta atual, usado para criar PRs |
| `GITHUB_REPO` | `muricarlucci/Apex-Security` |
| `JWT_SECRET_KEY` | Segredo forte; `render.yaml` usa `generateValue: true` |
| `RESEND_API_KEY` | Chave de envio do contato |
| `CONTACT_EMAIL_TO` | Destinatário do formulário |
| `RESEND_FROM_ADDRESS` | Remetente autorizado no Resend |
| `FRONTEND_URL` | `https://apex-security-kappa.vercel.app` |
| `SITE_URL` | `https://apex-security-site-apresentacao.vercel.app` |

Informe as origens CORS sem espaços e sem barra final. `SITE_URL` e `FRONTEND_URL` alimentam o middleware de CORS; uma variável ausente é ignorada sem impedir o startup. Em produção, o formulário do site chama `POST https://apex-security-xzk4.onrender.com/api/contact`.

Depois do deploy, confira [`/health`](https://apex-security-xzk4.onrender.com/health) e [`/docs`](https://apex-security-xzk4.onrender.com/docs). O Render gratuito pode dormir após 15 minutos sem uso; um cold start pode levar 30 a 50 segundos.

## 3. Vercel: dashboard

Importe este repositório na Vercel e defina **Root Directory = `frontend`**. Defina `VITE_API_URL=https://apex-security-xzk4.onrender.com/api`, com `/api` no final e sem barra depois. Publique e confira [o dashboard](https://apex-security-kappa.vercel.app). Variáveis `VITE_` são incorporadas ao build; qualquer mudança requer **Redeploy**.

## 4. Render: origem do dashboard

No painel do Render, confira `FRONTEND_URL=https://apex-security-kappa.vercel.app` e salve. O backend precisa reiniciar para montar a lista atualizada de origens CORS.

## 5. Vercel: site de apresentação

Confirme o deploy do [site](https://apex-security-site-apresentacao.vercel.app) no repositório separado. Configure o formulário para usar a API no Render. Este guia não altera o código do site.

## 6. Render: origem do site

Confira `SITE_URL=https://apex-security-site-apresentacao.vercel.app`, exatamente, sem barra final. Salve e espere o backend reiniciar. O CORS deve permitir o `POST /api/contact` iniciado no navegador a partir do site.

## 7. GitHub Actions: secrets do repositório cliente

Em **Settings → Secrets and variables → Actions** do repositório que será analisado, crie:

| Secret | Valor |
| --- | --- |
| `APEX_API_URL` | `https://apex-security-xzk4.onrender.com`, sem `/api` e sem barra final |
| `APEX_USER_API_KEY` | Chave exibida em **Chave de Integração** de uma conta do dashboard |

Copie o workflow da raiz [`.github/workflows/apex-scan.yml`](.github/workflows/apex-scan.yml) para o repositório cliente. A cópia em `pipeline/` é referência e deve permanecer idêntica. O workflow acrescenta `/api/scan` à URL base, usa `github.repository` para identificar o repositório e falha visivelmente quando o envio HTTP não é 2xx. `APEX_API_URL` não é variável do backend. `APEX_USER_API_KEY` também fica somente nos secrets do GitHub; a API consulta a chave salva na conta do usuário no banco.

O workflow valida os secrets antes de instalar scanners. Ausência de secrets falha claramente; pull requests de forks rodam scanners sem enviar dados autenticados. Falhas operacionais dos scanners não são ignoradas. Cada envio tem até 120 segundos, sem retry automático. Depois do deploy do backend, abra **Actions → Apex Security Scan → Run workflow** para validar a versão publicada; um push pode disparar o pipeline antes do Render terminar o deploy.

## Renovar o token de GitHub usado pelo backend

O `GITHUB_TOKEN` é um PAT classic da conta atual. Ao gerar ou renovar, escolha validade de **90 dias** e os escopos **`repo`** e **`workflow`**. No Render, abra o Web Service → **Environment**, substitua `GITHUB_TOKEN` e salve; o serviço reinicia. Não coloque o PAT na URL do Git remoto nem no repositório. Valide com um PR de teste em um alerta já remediado, com revisão humana.

## Verificação de ponta a ponta

1. Acesse `/health` e `/docs` do Render; aguarde o cold start se necessário.
2. Abra o dashboard na Vercel, crie ou acesse uma conta e confira a Chave de Integração.
3. Faça push em um repositório cliente com os dois secrets e o workflow; confira os jobs Semgrep e Trivy e o status HTTP de envio.
4. Confirme que os alertas aparecem somente na conta dona da chave.
5. Teste Remediar, Criar PR (sem merge automático), Risco Real e SLA em dados apropriados.
6. Teste o formulário de contato do site no navegador; valide CORS e o recebimento via Resend.
7. Antes de demonstrações, acorde o backend e abra o dashboard com antecedência.

Para testes locais sem iniciar o servidor, execute `pytest tests/ -v` a partir da raiz com o ambiente Python 3.11 do backend ativado. No `frontend/`, execute `npm run build`. Os testes devem usar mocks e não chamar Gemini, GitHub ou Resend.

## Diagnóstico de conexão e integrações

Veja [o relatório de 2026-10-01](docs/DIAGNOSTICO_2026-10-01.md). O pool usa pre-ping e reciclagem de 300 segundos. Isso não recupera uma transação já interrompida: `/api/scan` retorna 503 e não confirma sucesso. Falhas de constraints ou SQL retornam 500. Após falha durante o commit, confira o que foi persistido antes de reenviar, pois a resposta perdida pode ter ocorrido depois do commit.

O Radar ainda exige ajustar `GEMINI_MODEL` no painel do Render para um modelo disponível na conta atual (o print indica `gemini-3.5-flash-lite`). O padrão versionado de `gemini-2.5-flash-lite` permanece conforme a regra atual do AGENTS.md; uma variável do Render sobrepõe esse padrão para todos os serviços de IA. Salve, espere o reinício e teste Radar, Remediar, Intenção, Risco Real e SLA.
