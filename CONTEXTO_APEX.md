# CONTEXTO_APEX — memória viva do dashboard e backend

Última atualização: **2026-10-01**. Versão atual: **v2.3.0**. Este repositório é [muricarlucci/Apex-Security](https://github.com/muricarlucci/Apex-Security), na branch `main`. O site de apresentação fica em outro repositório e não deve ser editado aqui. Leia também [README.md](README.md), [DEPLOY.md](DEPLOY.md), [CHANGELOG.md](CHANGELOG.md) e [AGENTS.md](AGENTS.md).

## Estado e transição

Apex Security é uma plataforma ASPM acadêmica do curso de Cibersegurança da FIAP. O desenvolvimento anterior usou Claude Code em outro computador; Murilo assumiu o projeto e passou a trabalhar com Codex (OpenAI). Os repositórios foram transferidos para a conta atual. Banco Neon, backend Render, dashboard Vercel e site Vercel foram recriados em contas de Murilo, assim como chaves e tokens. O usuário confirmou em 2026-10-01 que salvou ambos os secrets `APEX_API_URL` e `APEX_USER_API_KEY` no GitHub Actions; a ingestão autenticada foi validada em produção após o deploy v2.2.1, com HTTP 201 para Semgrep e Trivy na segunda tentativa do Actions 36900747354. CORS do dashboard e do site também foi confirmado.

| Peça | Endereço ou configuração |
| --- | --- |
| Backend FastAPI no Render | https://apex-security-xzk4.onrender.com |
| Saúde e Swagger | https://apex-security-xzk4.onrender.com/health e https://apex-security-xzk4.onrender.com/docs |
| Dashboard React/Vite na Vercel | https://apex-security-kappa.vercel.app |
| Site de apresentação na Vercel | https://apex-security-site-apresentacao.vercel.app |
| PostgreSQL | Neon, conexão privada por `DATABASE_URL` |
| GitHub | https://github.com/muricarlucci/Apex-Security |

Render, Neon e Vercel são usados em planos gratuitos. O Render dorme após cerca de 15 minutos de inatividade; o cold start pode durar 30 a 50 segundos. `VITE_API_URL` é incorporada ao build do dashboard, então mudar seu valor exige Redeploy. O site usa `POST /api/contact` da API; `SITE_URL` no Render libera sua origem no CORS. `FRONTEND_URL` libera a origem do dashboard.

## Objetivo e fluxo real

Segurança deve ser automatizada com pouco atrito e custo operacional próximo de zero. Um push do desenvolvedor aciona `.github/workflows/apex-scan.yml` no repositório cliente. Semgrep e Trivy rodam na CPU do GitHub Actions, geram JSON e fazem `POST {APEX_API_URL}/api/scan` com `X-Apex-Api-Key`. O workflow falha se o envio não receber HTTP 2xx e usa `github.repository` dinamicamente. A cópia em `pipeline/.github/workflows/` é só referência e deve permanecer idêntica à da raiz.

O backend normaliza para ASU, prioriza por regras e salva alertas por `user_id`. O dashboard exibe alertas e permite Remediar, Criar PR, Mapear Risco e Ver SLA. O PR inclui patch e teste gerados, mas o merge exige revisão humana. A severidade oficial é a das regras determinísticas; análises estatísticas e de IA são consultivas.

## Onze módulos

| Nº | Nome | Implementação e limite |
| --- | --- | --- |
| 1 | Pipeline CI/CD | GitHub Actions, Semgrep e Trivy; scanner executa no pipeline cliente |
| 2 | Normalização ASU | `services/normalizer.py`; JSON canônico de qualquer scanner |
| 3 | Priorização IaC | `services/prioritizer.py` e `rules.json`; fonte oficial da severidade |
| 4 | DLP de borda | `services/dlp.py`; ofusca segredos do trecho de código da remediação e reverte depois |
| 5 | Remediação Gemini | `services/remediator.py`; patch e teste unitário obrigatório em JSON |
| 6 | Pull Request | `services/pr_creator.py`; branch, commits e PR via PyGitHub, sem merge automático |
| 7 | Anomalias | Isolation Forest; retreina por chamada e é apenas sinal consultivo |
| 8 | Intenção | Compara mensagem de commit e diff via Gemini; informa, não bloqueia |
| 9 | Risco Real | Perfil da empresa, estimativa FAIR/LGPD/downtime, blast radius em reactflow e sugestão de SLA |
| 10 | Autenticação | JWT com expiração, bcrypt, `user_id` e chave de integração por conta |
| 11 | Radar | Panorama setorial via Gemini; não faz busca ao vivo |

A numeração aparece em README e CONTEXTO, nunca na UI. Anomalias não substituem a priorização; Intenção não bloqueia PR; Risco Real e SLA são estimativas analíticas, não valores contábeis ou prazos legais; Radar é síntese do conhecimento do modelo.

## Recursos de produto

A versão 2.0 adicionou sidebar com Chave de Integração, Conta, Contato e Notificações; fallback entre `GEMINI_API_KEY`, `GEMINI_API_KEY_2` e outras chaves em `services/gemini_client.py`; notificações por webhook do Discord; Modo Demo com dados fictícios; PDF de Alertas e Risco Real via jsPDF; Security Health Score; timestamps nos alertas. Fórmula do score: `100 - 25×críticos - 10×altos - 5×médios`, limitado ao intervalo apropriado; A ≥ 90, B 70–89, F < 70.

A versão 2.1 migrou o contato para a API HTTPS do Resend e adicionou sete idiomas via react-i18next: pt (padrão), en, es, zh, hi, fr, ja. A versão 2.3 completa as traduções da interface com catálogos adicionais `interface.*.json`, mantendo os arquivos originais de tradução e os textos em português intactos. Mensagens de ações já exibidas reagem à troca de idioma. Datas, filtros visuais, gráficos e PDF seguem a seleção; valores enviados à API, código e dados reais permanecem originais. Conteúdos narrativos reais da IA não são traduzidos automaticamente. Não fixe `lng: 'pt'` no `i18n.js`, pois isso anula a preferência salva. O envio de contato usa `RESEND_API_KEY`, `CONTACT_EMAIL_TO` e `RESEND_FROM_ADDRESS`.

Validação v2.3.0: 88 testes do backend, consistência de 331 mensagens nos sete idiomas, 105 combinações de rota/idioma no navegador, português equivalente ao commit `796987e`, persistência da seleção, mensagens reativas, payloads e código preservados, Demo offline, 14 PDFs e build de produção. A suíte de navegador usa Playwright com APIs simuladas e bundles em memória, sem servidor. Nenhuma chamada real ao Gemini foi feita pelos testes. PDFs zh/hi/ja usam imagem do texto renderizado pelo navegador, evitando perda de caracteres; o texto desses PDFs não é pesquisável.

## Código, banco e autenticação

`backend/main.py` registra os routers de auth, contact, scan, remediation, pull requests, intent e risk. Ao importar `main.py`, `Base.metadata.create_all(bind=engine)` cria tabelas faltantes e `run_additive_migrations()` em `database.py` executa alterações aditivas legadas. Não há arquivos de migração Alembic; a existência de alterações aditivas em SQL é uma divergência em relação à descrição simplificada de que não há migrações. Não introduza SQL cru ou migrações novas sem combinar.

As tabelas têm `user_id`. As consultas normais filtram pela conta autenticada. `POST /api/scan` é exceção: o workflow usa `X-Apex-Api-Key`; sem chave, aceita o scan e grava dados legados com `user_id=None`; se uma chave for enviada mas não existir no banco, responde 401 sem gravar. A chave de integração pode ser consultada e regenerada na sidebar. O token JWT dura sete dias; `localStorage` armazena a sessão no frontend.

`APEX_API_URL` não é lida pelo backend: é exclusivamente um secret do GitHub Actions, com `https://apex-security-xzk4.onrender.com` sem `/api` nem barra final. `GITHUB_REPO` é lida por `services/pr_creator.py`, com padrão `muricarlucci/Apex-Security`. `FRONTEND_URL` e `SITE_URL` são lidas pelo CORS; espaços, barra final, valores vazios e duplicados são tratados pela função `get_allowed_origins()`.

Desde v2.2.1, o engine usa `pool_pre_ping=True`, `pool_recycle=300` e `hide_parameters=True`. `/api/scan` valida o JSON antes de tocar no banco e grava repositório + todos os alertas em uma transação. Apenas o conflito do nome único do repositório é tratado com upsert; outros erros não são ignorados. Desconexões durante uma transação retornam 503, erros reais de SQL/constraints retornam 500, sem retry automático. Discord só é chamado após o commit, com valores capturados antes dele. Migração/startup com falha não continua silenciosamente. Não há idempotência: reenvios podem duplicar alertas, especialmente quando a confirmação de commit se perde.

## Regras permanentes

- Python 3.11.x; não usar emojis em arquivos Python por causa do console Windows cp1252.
- Modelo padrão centralizado `gemini-3.8-flash`, configurável por `GEMINI_MODEL`. O usuário confirmou a alteração dessa variável no Render em 2026-10-01. Remediação, Intenção, Radar, Risco Real e SLA usam a mesma configuração; não houve mudança de SDK nem de prompts.
- SQLAlchemy como ORM. Não alterar esquema de forma destrutiva nem introduzir migrações novas sem combinar.
- Nunca versionar `.env`, senhas, tokens ou chaves; nunca embutir token na URL do Git.
- Preservar a identidade visual preto `#0A0A0A`, dourado `#C9A84C` e fontes Cinzel, Raleway, Inter e JetBrains Mono; tokens em `frontend/src/theme.js`.
- Modo Demo deve evitar chamadas reais; há uma exceção atual na página Contato, registrada abaixo.
- Remediação deve aplicar DLP antes do envio do código ao LLM e reverter depois. A cobertura de DLP nos demais serviços ainda é limitada; não declarar proteção total.
- A IA nunca faz merge automaticamente. Os módulos consultivos devem se apresentar como apoio à decisão.
- Toda sessão de desenvolvimento atualiza `VERSION`, `CHANGELOG.md`, versão da API em `backend/main.py`, `README.md` e este arquivo. Patch para correções pontuais, minor para funcionalidade, major para quebra de compatibilidade.
- Ao concluir uma sessão autorizada, executar testes, commit e `git push origin main` a partir da raiz; confirmar `git status` e `git log origin/main..HEAD`. Se o push falhar por rede ou autenticação, pedir ao usuário que rode `git push` no terminal com Git Credential Manager.

## Variáveis e operação

No Render: `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_API_KEY_2` opcional, `GEMINI_MODEL`, `GITHUB_TOKEN`, `GITHUB_REPO`, `JWT_SECRET_KEY`, `RESEND_API_KEY`, `CONTACT_EMAIL_TO`, `RESEND_FROM_ADDRESS`, `FRONTEND_URL=https://apex-security-kappa.vercel.app` e `SITE_URL=https://apex-security-site-apresentacao.vercel.app`. `render.yaml` define `PYTHON_VERSION=3.11.9`. No dashboard Vercel: Root Directory `frontend` e `VITE_API_URL=https://apex-security-xzk4.onrender.com/api`. No GitHub Actions do cliente: `APEX_API_URL` e `APEX_USER_API_KEY`. O PAT classic de `GITHUB_TOKEN` precisa dos escopos `repo` e `workflow` e renovação conforme validade definida (orientação atual: 90 dias).

## Problemas históricos e pendências

Já foram corrigidos: workflow que escondia erro de envio; URL temporária de backend que expirava; token GitHub inválido que produzia 401 no Criar PR; transporte de email bloqueado na hospedagem; CORS do dashboard; URL de API fixa em localhost; Python 3.14 sem dependências compatíveis; workflow colocado apenas em `pipeline/`, onde o GitHub não o executa. O usuário informou que tokens e infraestrutura foram recriados; não pressupor que cada integração foi validada em produção.

Validações confirmadas em 2026-10-01: 79 testes locais passaram; API em v2.2.1, pipeline com conta real (Semgrep e Trivy HTTP 201), rejeição de JSON inválido com 400 e CORS das duas origens. Pendências: envio e recebimento do formulário do site, criação de PR, webhook do Discord e funcionamento do Gemini depois de ajustar o modelo. Não há verificação de e-mail, rate limiting ou 2FA; a chave de API fica em texto no banco; scan sem chave ainda aceita dados legados. `Contact.jsx` chama a API ao enviar o formulário mesmo no Modo Demo. O DLP cobre o trecho de código do remediador, mas `intent_checker.py`, `risk_analyzer.py` e `radar.py` podem enviar campos de usuário ao Gemini sem a mesma ofuscação. Tratar isso como limitação real antes de uso comercial.

Auditoria de 2026-10-01: `pip check` não encontrou dependências incompatíveis, mas isso não equivale a uma auditoria de segurança. `npm audit` encontrou 9 entradas vulneráveis (7 altas, 2 moderadas). OSV apontou avisos para versões fixadas de python-dotenv, pytest, python-jose e python-multipart. Atualização de dependências precisa de avaliação e testes próprios. O print do Radar confirma rejeição de `gemini-2.5-flash-lite` para a conta/projeto atual; configurar `GEMINI_MODEL` no Render para um modelo disponível. Veja [diagnóstico detalhado](docs/DIAGNOSTICO_2026-10-01.md).

## Histórico de versões

- v1.x: seis módulos originais, deploy e módulos consultivos 7–11.
- v2.0.0 (2026-07-24): recursos de produto, Modo Demo, PDF, score e sidebar.
- v2.1.0 (2026-07-26): contato via Resend e sete idiomas.
- v2.2.0 (2026-10-01): transição de responsável e infraestrutura, CORS do site, limpeza de referências antigas e documentação reescrita.

- v2.2.1 (2026-10-01): recuperação do pool, ingestão atômica, tratamento explícito de erros e diagnóstico operacional.
- v2.3.0 (2026-10-01): Gemini 3.8 Flash e cobertura da interface nos sete idiomas, preservando português e contratos de API.

A próxima sessão deve começar por este arquivo, README e CHANGELOG, confirmar o estado real do código e da produção e registrar divergências antes de novas mudanças.
