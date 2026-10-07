# Deploy da Apex Security v3.0.0

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
| `GEMINI_MODEL` | `gemini-3.8-flash`, configurável |
| `GITHUB_TOKEN` | PAT da conta atual, usado para criar PRs e disparar DAST |
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

Todos os serviços de IA usam o padrão centralizado `gemini-3.8-flash`. No Render, defina `GEMINI_MODEL=gemini-3.8-flash`; uma variável de ambiente antiga sobrepõe o padrão do código. Salve, espere o reinício e valide Radar, Remediar, Intenção, Risco Real e SLA.

## 8. Habilitar DAST real (v3.0.0)

O workflow novo é [`.github/workflows/apex-dast.yml`](.github/workflows/apex-dast.yml), **Apex DAST Scan**. O dashboard dispara pelo backend, usando o PAT existente no Render. ZAP roda no Actions, não no Render. O workflow estático e seus secrets permanecem iguais.

Siga esta ordem:

1. **Gere um segredo uma única vez no seu computador** e guarde-o em local seguro:

   ```powershell
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

2. No GitHub **muricarlucci/Apex-Security → Settings → Secrets and variables → Actions → New repository secret**, salve `APEX_DAST_SECRET` com o valor gerado. Reaproveite `APEX_API_URL=https://apex-security-xzk4.onrender.com`, sem `/api` e sem barra final. Não use a chave de integração do usuário como segredo DAST.
3. No Render **serviço do backend → Environment**, adicione `DAST_CALLBACK_SECRET` com **o mesmo valor**, salve e aguarde o redeploy. Nunca cole esse segredo em chat, commit ou input do workflow.
4. Confirme deploy **Live**, versão **3.0.0** em `/` ou `/docs` e startup sem erro de migração. A tabela `dast_scans` nasce por `create_all`; cinco colunas nullable de `alerts` entram pelo mecanismo aditivo existente. Não rode DROP nem recrie tabelas. O log verifica 15 colunas aditivas ao todo.
5. Confira `GITHUB_TOKEN` do Render: PAT classic válido, com `repo` e `workflow`, validade escolhida de 90 dias. Confira também `GITHUB_REPO=muricarlucci/Apex-Security`. Mantenha `GEMINI_MODEL=gemini-3.8-flash`, `GEMINI_API_KEY` e `GEMINI_API_KEY_2` como estão; DAST não usa Gemini.
6. Primeiro teste: no dashboard autenticado, **DAST → Laboratório Apex → Passivo rápido → Iniciar análise dinâmica**. Acompanhe **Actions → Apex DAST Scan**. Reserve cerca de 5–10 minutos; quando concluir, abra Alertas/ZAP e **Ver solução**. Esse é um teste real feito pelo operador, não foi executado na validação local desta entrega.
7. Segundo teste: **URL autorizada**, por exemplo `http://testphp.vulnweb.com`, modo **Passivo**, com a caixa de autorização marcada. Confirme antes que o alvo está disponível e que seu uso para treinamento é autorizado.
8. Se o repositório for privado, cada execução consome minutos do plano GitHub Actions. Confira saldo e permissões para Actions e Docker.
9. Se o professor indicar outro host de treino e o modo **Ativo** for necessário, configure `DAST_TRAINING_HOSTS` no Render: hostnames exatos separados por vírgula, sem esquema/path. Inclua também os padrões que quiser manter. Salve e aguarde o serviço reiniciar. Ativo não é liberado automaticamente para qualquer URL.
10. Antes da apresentação, rode uma análise com antecedência e mantenha **Modo Demo** como alternativa imediata. Não dependa da fila global, de sites externos ou do cold start em cima da hora.

### Variáveis opcionais DAST no Render

| Variável | Default no código |
|---|---|
| `DAST_DAILY_LIMIT` | `5` solicitações por conta em 24h |
| `DAST_TRAINING_HOSTS` | `testphp.vulnweb.com,demo.testfire.net,public-firing-range.appspot.com` |
| `DAST_ENABLE_ACTIVE` | `true`; `false` desabilita full inclusive no laboratório |
| `DAST_WORKFLOW_FILE` | `apex-dast.yml` |
| `DAST_WORKFLOW_REF` | `main` |
| `DAST_CALLBACK_TTL_MINUTES` | `45` desde a solicitação |

Não é necessário cadastrar opcionais se os padrões servirem. `render.yaml` recebeu somente comentários GPL; a configuração DAST é feita pelo painel. Alterar o segredo enquanto há análise ativa invalida seu callback. Mais detalhes, códigos de erro e limites em [docs/dast.md](docs/dast.md).
