# Diagnóstico de conexão e integrações — v2.2.1

## Evidência e causa

O traceback do Render mostra psycopg2.OperationalError: SSL connection has been closed unexpectedly durante SELECT em repositories para muricarlucci/Apex-Security. SQLAlchemy propagou OperationalError e o POST /api/scan retornou 500. Um processo novo conectou depois, indicando que o banco ficou acessível naquela ocasião. Isso não prova a origem exata do fechamento (provedor, rede, manutenção ou encerramento de processo).

O engine anterior não verificava conexões ao retirá-las do pool. Uma conexão encerrada enquanto ociosa podia ser reutilizada. O endpoint ainda fazia commit do inventário e de cada alerta separadamente, permitindo persistência parcial. O HTTP 500 do Actions é o resultado dessa falha de API; o deploy verde da Vercel não valida backend nem banco.

## Correção aplicada

- Pool: pool_pre_ping=True, pool_recycle=300 e hide_parameters=True. Reciclagem considera idade e acontece no checkout; não interrompe conexões em uso.
- Uma única transação por scan, inclusive inventário. Validação acontece antes de acessar o banco.
- Somente conflito de nome único do repositório recebe ON CONFLICT DO NOTHING, mantendo falhas reais de outras constraints.
- Desconexão reconhecida/SQLSTATE de conexão ou esgotamento do pool: HTTP 503 e log sanitizado. Outros erros de persistência: HTTP 500, sem sucesso falso.
- Rollback e fechamento de sessão em erro. SQLAlchemy invalida conexões reconhecidas como interrompidas.
- Sem retry automático: pre-ping não recupera transação em andamento e uma confirmação de commit perdida é ambígua. O scan ainda não tem chave de idempotência; reenvios podem duplicar alertas.
- Chave enviada mas inválida: 401. Sem chave: permanece o modo legado, com user_id nulo.
- Notificações Discord só após commit; captura de valores evita consultas por expiração dos objetos ORM depois do commit.
- Migração ou conexão falhando no startup agora interrompe a inicialização.
- Normalização rejeita formatos/tipos/limites incompatíveis com 400, aceita metadados opcionais nulos e preserva listas de CVEs no JSON bruto (a coluna ASU guarda o primeiro).
- Workflow valida configuração, não ignora falha operacional dos scanners, tem timeout de envio de 120 segundos e envia payload por arquivo. Trivy pode ser enviado mesmo se o envio de Semgrep falhar. Pull requests de forks não recebem secrets nem enviam scans autenticados. Branch/repositório/commit usam variáveis de ambiente para não inserir texto de branch em código shell.

Referência técnica: [tratamento de desconexões no SQLAlchemy](https://docs.sqlalchemy.org/en/20/core/pooling.html#disconnect-handling-pessimistic).

## Configuração que o usuário precisa conferir

### GitHub Actions

O usuário confirmou em 2026-10-01 que salvou os dois secrets no repositório.

Em [Settings → Secrets and variables → Actions](https://github.com/muricarlucci/Apex-Security/settings/secrets/actions):

- APEX_API_URL: https://apex-security-xzk4.onrender.com (URL pura, sem colchetes, sem /api).
- APEX_USER_API_KEY: entrar no [dashboard](https://apex-security-kappa.vercel.app), abrir Chave de Integração na sidebar e copiar. É a chave da conta Apex, gerada no cadastro e guardada no banco; não é chave Gemini nem token GitHub. Se regenerar, atualizar todos os repositórios que a usam.

Nenhuma dessas duas variáveis é lida pelo backend no Render. Deixar APEX_API_URL vazia no Render não causou o fechamento SSL. No GitHub, entretanto, ela é necessária para o workflow encontrar a API. Sem APEX_USER_API_KEY no GitHub, o código anterior enviava dados legados que não apareciam na conta.

Depois do Render publicar v2.2.1, usar Actions → Apex Security Scan → Run workflow. Esperar HTTP 201 nos dois envios e conferir alertas na conta certa. Evitar rerodar scans já persistidos sem conferir duplicatas.

### Radar e demais serviços Gemini

O print anterior registra HTTP 404 do Google: gemini-2.5-flash-lite indisponível para novos usuários daquela conta/projeto. O backend converte isso em 502 no Radar. É independente do problema SQLAlchemy e pode afetar Radar, Remediação, Intenção, Risco e SLA.

Atualização v2.3.0: por solicitação explícita do usuário, o padrão centralizado passou para `gemini-3.8-flash` ([documentação oficial](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)). O usuário confirmou que salvou `GEMINI_MODEL=gemini-3.8-flash` no Render. A variável continua prevalecendo sobre o padrão do código. O erro acima registra o modelo usado no momento do print; validar as funcionalidades após o novo deploy continua necessário para confirmar acesso e cota da conta.

O SDK google-generativeai==0.5.4 é antigo; planejar migração para google-genai com testes. Múltiplas chaves do mesmo projeto não ampliam sua quota; o comentário atual do cliente que afirma quota por chave precisa ser revisto.

### Outros serviços

- DATABASE_URL no Render deve continuar sendo a connection string SSL atual do Neon; não desativar SSL para resolver desconexão.
- FRONTEND_URL=https://apex-security-kappa.vercel.app e SITE_URL=https://apex-security-site-apresentacao.vercel.app precisam corresponder às origens reais.
- Dashboard Vercel: VITE_API_URL=https://apex-security-xzk4.onrender.com/api; mudança exige novo build/deploy.
- GITHUB_TOKEN/GITHUB_REPO: validar criação de PR separadamente, com permissões adequadas e revisão humana.
- Resend: conferir chave, remetente autorizado e destino; validar contato do site e dashboard.
- JWT_SECRET_KEY: conferir segredo forte no Render; existe fallback de desenvolvimento no código.

## Auditoria adicional e limitações

- pip check: nenhuma incompatibilidade declarada na instalação local. Não garante ausência de vulnerabilidades.
- npm audit: 9 entradas vulneráveis, sendo 7 altas e 2 moderadas; axios, react-router-dom e dependências transitivas entre as entradas. O registro indicou correções disponíveis. Atualizações precisam de testes próprios; não foi executado npm audit fix.
- [OSV](https://osv.dev): avisos para python-dotenv 1.0.1 (GHSA-mf9w-mj56-hr94), pytest 8.2.0 (GHSA-6w46-j5rx-g56g), python-jose 3.3.0 (incluindo GHSA-6c5p-j8vq-pqhj e GHSA-cjwg-qfpm-7377) e python-multipart 0.0.9 (múltiplos avisos). Estes são avisos de versões; não demonstram exploração neste projeto. A consulta foi às dependências diretas fixadas, não à árvore inteira Python.
- /health ainda responde status estático; 200 ali não prova consulta ao banco. /api/scan é a verificação funcional relevante.
- HEAD / retornando 405 é método não implementado; não é a causa de SSL ou do erro Gemini. Manter Health Check Path=/health.
- Dados de scans antigos sem chave continuam legados e não são reassociados automaticamente à conta.
- Sem idempotência de ingestão, rate limiting, verificação de email ou 2FA. Chaves Apex em texto no banco.
- Contact.jsx ainda faz envio real no Modo Demo. DLP cobre o trecho da remediação, não todos os campos enviados pelos demais serviços de IA.
- Outros endpoints com efeitos externos, como criar PR, requerem avaliação própria de atomicidade/idempotência; a correção do pool beneficia todas as sessões, mas não os torna automaticamente transacionais de ponta a ponta.

## Verificação

Testes do endpoint usam FastAPI TestClient e SQLite temporário, sem iniciar servidor nem chamar Gemini, GitHub, Resend ou Discord real. Cobrem Semgrep/Trivy, chave válida/inválida/ausente, formatos malformados, limites, CVEs, notificações após commit, fechamento real do DBAPI antes da consulta e durante a segunda inserção, rollback, recuperação na próxima chamada, falhas reais e commit ambíguo.

Testes do pool fecham uma conexão ociosa e verificam sua substituição, simulam idade superior a 300 segundos e confirmam que o dialeto psycopg2 reconhece exatamente a mensagem SSL apresentada.

Resultado local: 79 testes passaram; duas advertências de depreciação de dependências, sem falhas. git diff --check passou. A consulta autenticada ao GitHub confirmou os nomes APEX_API_URL e APEX_USER_API_KEY nos secrets, sem expor valores.

Validação de produção em 2026-10-01: a raiz da API confirmou v2.2.1. A [segunda tentativa do Actions](https://github.com/muricarlucci/Apex-Security/actions/runs/36900747354/attempts/2), commit de código 9ddba38, terminou com sucesso; Semgrep e Trivy receberam HTTP 201. Um POST com JSON inválido recebeu 400. Preflights CORS para dashboard e site receberam 200 e a origem permitida correta.

A primeira tentativa foi disparada enquanto o Render publicava a versão: Semgrep recebeu 500 e Trivy recebeu 201. A repetição foi iniciada somente depois de a raiz confirmar 2.2.1. Não há traceback dessa primeira tentativa nesta análise para atribuir com precisão sua causa. A repetição pode duplicar alertas que o Trivy já havia salvo; a aplicação ainda não deduplica reenvios.

Isso confirma ingestão autenticada em produção naquela execução. Os testes de interrupção foram realizados localmente; não foi derrubada uma conexão do Neon de propósito. Gemini, Resend, Discord e criação de PR continuam exigindo validação própria.
