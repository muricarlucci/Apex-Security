# CONTEXTO_APEX — dashboard e backend

Atualizado em **2026-10-07**. Versão **3.0.0**. Repositório [muricarlucci/Apex-Security](https://github.com/muricarlucci/Apex-Security), branch `main`, workspace `D:\DASHBOARD APEX\Apex-Security`. Este é o dashboard/backend; o site institucional pertence a outro repositório e não foi editado.

Leia [AGENTS.md](AGENTS.md), [README.md](README.md), [CHANGELOG.md](CHANGELOG.md), [DEPLOY.md](DEPLOY.md), [ASU](docs/asu-schema.md) e [DAST](docs/dast.md) antes de alterar o projeto.

## Estado atual e infraestrutura

| Componente | Endereço / configuração |
|---|---|
| FastAPI / Render | https://apex-security-xzk4.onrender.com |
| Swagger / saúde | `/docs` e `/health` na API |
| React/Vite / Vercel | https://apex-security-kappa.vercel.app |
| Site institucional / Vercel | https://apex-security-site-apresentacao.vercel.app |
| PostgreSQL / Neon | Conexão privada em `DATABASE_URL` |
| Código | https://github.com/muricarlucci/Apex-Security |

Plataforma ASPM acadêmica de Cibersegurança FIAP 2026. Autores/contribuidores: **Murilo Carlucci, Guilherme Catto e Miguel Domingos**. Desenvolvimento anterior e histórico de autoria são preservados; infraestrutura e repositório atuais estão na conta de Murilo.

Render, Neon e Vercel são usados em planos gratuitos. O cold start observado/documentado do Render pode levar 30–50s. Não prometer disponibilidade contínua. `VITE_API_URL` entra no build; alteração exige redeploy Vercel. `FRONTEND_URL` e `SITE_URL` montam o CORS. `/api/contact` atende também o site institucional.

## Entrega v3.0.0

- DAST real com ZAP oficial no Actions, página `/dast`, laboratório Juice Shop e URL pública autorizada.
- Tabela `dast_scans`; cinco colunas opcionais de `alerts`; router novo e ASU ZAP separado.
- Callback HMAC, validade, limites, autorização declarada, validação DNS, transação atômica e resumo Discord.
- Badge de tipo, filtro ZAP, solução expansível e manutenção das ações Risco/SLA; não há patch/PR DAST.
- Demo com cinco achados fictícios, andamento local, sem dispatch/polling da API; novas mensagens nos sete idiomas.
- GPL-3.0-or-later: texto oficial integral, cabeçalhos, autores, avisos de terceiros e verificador.
- README reescrito, documentação DAST/ASU/deploy e versão atualizadas.

Publicação do código **não configura secrets automaticamente**. A validação real DAST depende do operador completar a seção DAST do DEPLOY: `APEX_DAST_SECRET` no GitHub e `DAST_CALLBACK_SECRET` no Render, mesmo valor; PAT válido; deploy Live e migrations sem erro. Nenhum segredo foi gerado/publicado por esta entrega e nenhum scan real foi executado localmente.

## Doze módulos

| Nº | Função | Implementação |
|---|---|---|
| 1 | Pipeline CI/CD estático | Actions com Semgrep/Trivy no repositório cliente |
| 2 | ASU | `services/normalizer.py` |
| 3 | Priorização IaC | `services/prioritizer.py`, `rules.json` |
| 4 | DLP de borda | `services/dlp.py` |
| 5 | Remediação | `services/remediator.py` |
| 6 | Pull Request | `services/pr_creator.py`, sem merge automático |
| 7 | Anomalias | Isolation Forest, consultivo |
| 8 | Intenção | Mensagem de commit versus diff, consultivo |
| 9 | Risco Real / SLA | FAIR/LGPD/downtime/blast radius; duas ações independentes |
| 10 | Autenticação | JWT/bcrypt/conta/chave de integração |
| 11 | Radar | Panorama Gemini, sem busca ao vivo |
| 12 | DAST | ZAP no Actions + `services/dast_*`, `routes/dast.py` |

Numeração somente em documentação. Preto `#0A0A0A`, dourado `#C9A84C`; fontes Cinzel, Raleway, Inter e JetBrains Mono. PDF, Health Score, traduções e ações antigas foram preservados; a inclusão dos dados DAST altera naturalmente os totais de alertas exibidos, sem mudar a fórmula do score.

## Fluxo estático preservado

Push → `.github/workflows/apex-scan.yml` do cliente → Semgrep/Trivy → `POST /api/scan` com `X-Apex-Api-Key` → ASU → regras determinísticas → persistência por usuário. Cópia em `pipeline/.github/workflows/apex-scan.yml` é idêntica e apenas referência.

Secrets do cliente: `APEX_API_URL=https://apex-security-xzk4.onrender.com` e `APEX_USER_API_KEY`, copiada da sidebar da conta. Ambos foram confirmados pelo usuário em 2026-10-01. A ingestão Semgrep/Trivy autenticada recebeu 201 após deploy v2.2.1 (registro histórico Actions 36900747354); isso não é uma validação nova de produção da v3.

Sem chave, o scan mantém o modo legado (`user_id=None`); chave enviada mas inválida retorna 401. Repositório + todos os alertas são gravados em uma transação; apenas conflito do nome único usa upsert. Conexão interrompida/pool indisponível retorna 503; erros reais de SQL/constraints, 500. Sem replay automático e sem idempotência plena; commit com confirmação perdida exige conferir o banco antes de reenviar. Discord após commit.

## Fluxo DAST

Dashboard/JWT → POST `/api/dast/scans` → valida/limita/cria queued → PyGithub workflow_dispatch → `.github/workflows/apex-dast.yml` → `pipeline/dast_job.py` → ZAP Docker → callback HMAC → ASU ZAP → uma transação com estado final e alertas → resumo Discord → polling de 10s.

Laboratório `bkimminich/juice-shop`, loopback3000 no runner; ZAP `ghcr.io/zaproxy/zaproxy:stable`, `--network host`. Baseline passivo padrão; full permite ataques apenas no lab ou hostname exato habilitado. AJAX spider nos dois modos. Processo ZAP tem prazo de 20 minutos; job, 30. Sem resultado JSON válido/código aceitável, falha explícita.

`dast_scans` registra conta, alvo, modo, nonce público, prazo, aceite/instante, status, timestamps, contagem, versão e erro curto. Estados persistidos queued/running/completed/failed/timeout. Processing é só etapa visual. Histórico limitado aos 20 últimos da conta. Pseudo-repositórios `dast:*` ficam fora da página Repositórios.

Controles: URL/DNS IPv4/IPv6 públicos, sem credenciais; aceite booleano obrigatório para custom; cinco solicitações em 24h por conta, uma ativa, lock de usuário em PostgreSQL; concorrência global do Actions. HMAC-SHA256(secret, `scan_id:nonce`), comparação constante, 45 minutos desde a solicitação, rejeição após estado final, corpo máximo de 8 MiB, raw com até 20 instâncias. Nenhum segredo em input ou log. O HMAC não inclui o corpo; HTTPS e administradores do repositório são parte da confiança. Validação DNS não substitui egress contínuo e não elimina rebinding/redirecionamentos.

Normalização: risco 3 → HIGH, 2 → MEDIUM, 1 → LOW, 0 → INFO; sem CRITICAL; um alerta por alerta ZAP, sem linha/CVE, CWE separado e solução sem HTML. **Nunca `prioritize()` para DAST**, evitando rebaixamento por URL contendo `test`. A severidade ajustada é a do ZAP. Callback completed é atômico, replay retorna 409; erro Discord não desfaz resultado.

Concorrência do Actions não é fila durável: pending pode ser substituído. A API expira registros sem retorno quando são lidos. Callbacks running/failed fazem uma tentativa; completed admite até cinco entregas, sem repetir scanner. Se ACK HTTP se perder após commit, o workflow pode falhar com 409 e o dashboard continuar corretamente completed.

## Banco e migrações

`main.py` importa routers/modelos antes de `Base.metadata.create_all(bind=engine)`. Cria tabelas ausentes, inclusive `gemini_operation_cache` e agora `dast_scans`. `database.py` aplica o mecanismo existente `ADD COLUMN IF NOT EXISTS`: 15 colunas verificadas após esta entrega, cinco delas DAST e nullable. Nenhum DROP, recriação ou limpeza de dados. Não há conjunto de migrations Alembic versionadas.

Engine existente: pre-ping, recycle300s, parâmetros SQL ocultos e rollback/close por request. Esses mecanismos não recuperam transação já interrompida. Não alterar banco destrutivamente.

## Gemini — comportamento existente v2.3.2

Remediação, Intenção, Risco, SLA e Radar mantêm `gemini-3.8-flash`. `GEMINI_MODEL` no Render prevalece sobre default; manter exatamente esse valor e **as duas chaves**. Cliente explícito por chave, sem `genai.configure` global; SDK fixado em 0.5.4 preservado; retry interno desligado.

Normal: uma request. 503: retry após 0,5s no principal; segundo 503 → uma contingência `gemini-3.5-flash-lite`. 429 diário explicitamente ligado ao principal permite modelo alternativo; diário compartilhado/temporário ambíguo não troca chaves inutilmente. Falha específica de chave preserva fallback de chave. Máximo três requests no fluxo de 503; nenhum loop/retry do 3.5. RPC de 20s, orçamento de 65s, frontend de 120s; cancelamento evita novas tentativas, RPC enviada pode terminar dentro do prazo.

Cache PostgreSQL por conta/fingerprint de entradas/modelo/prompt/revisão e lock advisory entre processos/abas. Radar por 6h com data original; Intenção/Risco/SLA por 1h; Remediação válida salva conforme fingerprint, sem expiração. Falhas não entram no cache. Cliente, prompts, wrappers e endpoints Gemini **não foram modificados nesta entrega**.

**Efeito aditivo a conhecer:** o wrapper existente usa todas as colunas de Alert no fingerprint. As cinco colunas opcionais novas podem invalidar uma vez caches de Remediação/Risco/SLA de alertas antigos, mesmo quando nulas. Não alteramos o wrapper protegido nem migramos hashes à força; registros salvos não são apagados. Considere esse efeito antes de solicitar nova geração com cota baixa. Radar/Intenção não recebem essas novas colunas como entrada.

## Idiomas, Demo e limites existentes

react-i18next: pt/en/es/zh/hi/fr/ja; 331 mensagens no catálogo interface, além do catálogo estrutural expandido DAST. Português anterior preservado exatamente, preferência persistente. Dados reais, código e narrativa da IA mantêm idioma original. Novos títulos/soluções DAST de Demo têm chaves próprias nos sete idiomas.

Demo evita API nas páginas analíticas, agora inclusive DAST. Exceção existente: envio do formulário Contato é real; não foi alterado nesta sessão. PDFs zh/hi/ja rasterizam texto para preservar caracteres; demais mantêm fluxo jsPDF. Health Score existente: 100 − 25×critical − 10×high − 5×medium, piso 0, A ≥ 90 / B ≥ 70 / F < 70.

Limites: sem verificação de e-mail, 2FA/rate limiting global; chave de integração em texto no banco; DLP do trecho da remediação não cobre todos os diffs/perfis; DAST sem autenticação de sessão, sem correlação com código e sem proteção contínua de egress. Risco/SLA/Radar/Intenção/Anomalias são apoio à decisão.

## Licença e verificação desta entrega

GPL-3.0-or-later, [LICENSE.md](LICENSE.md) oficial integral GNU (35.149 bytes / 674 linhas), [AUTHORS.md](AUTHORS.md), [avisos de terceiros](THIRD_PARTY_NOTICES.md). Código novo exige SPDX; JSON/binários/.env.example não recebem comentário. `scripts/check_license_headers.py` verifica fontes rastreadas pelo Git. Dependências/ferramentas externas mantêm licenças próprias.

Linha de base: build passou; pytest inicialmente bloqueado na coleta pela DLL gRPC do Windows. Com transporte simulado, quatro testes legados Gemini revelaram contrato antigo incompatível com v2.3.2. Apenas testes foram atualizados para erros tipados da API, retry=None, isolamento de chave e contingência vigente. Não houve mudança de produção para fazê-los passar. TestClient precisou de execução fora da sandbox para socketpair interno do asyncio; sem servidor/rede externa.

Verificação final: **181 testes offline passaram**, build e consistência dos sete idiomas passaram; navegador **112 combinações rota/idioma**, 14 PDFs, seleção/persistência, payloads/código, Demo DAST e soluções, zero requisições externas. O warning de chunk grande no build já existia. Validação real ZAP/GitHub/Render/secrets fica para o usuário. Não afirmar produção validada nesta sessão.

## Operação e próximos passos

Render: banco, JWT, duas chaves/modelo Gemini, PAT/repo, Resend/contato, origens CORS e novo `DAST_CALLBACK_SECRET`. Opcionais DAST: limite 5, lista de três hosts padrão, ativo habilitado, workflow `apex-dast.yml`, ref `main`, TTL de 45 minutos. GitHub: `APEX_API_URL` e `APEX_DAST_SECRET`; integração estática usa `APEX_USER_API_KEY`. Variáveis no painel, sem mudanças funcionais em render.yaml.

Seguir as dez etapas manuais do [DEPLOY](DEPLOY.md). Não rodar servidor, ZAP/workflow ou serviços externos em testes. Preservar zonas protegidas. Ao concluir tarefa autorizada, atualizar versão/contexto/changelog, commit e push na main; confirmar árvore limpa e nenhum commit em `origin/main..HEAD`. Não embutir token na URL. Falha de push por rede/autenticação exige terminal do usuário, sem contornar credenciais.
