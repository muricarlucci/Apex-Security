# Changelog — Apex Security

## v2.3.0 — 2026-10-01

### Corrigido

- Padrão de IA centralizado em `gemini-3.8-flash` para Remediação, Intenção, Radar, Risco Real e SLA; `GEMINI_MODEL` continua configurável e valores vazios usam o padrão.
- Ambiente de exemplo, blueprint Render e documentação alinhados ao modelo solicitado. Usuário confirmou a variável no Render.
- Textos fixos de todas as 15 telas, mensagens após ações, placeholders, filtros, severidades, gráficos, datas e relatórios seguem o idioma escolhido.
- Preferência de idioma persiste no navegador; português permanece padrão e mantém os textos originais.
- Narrativas de demonstração são traduzidas na apresentação; código, identificadores, valores de API, dados reais e análises já geradas mantêm sua forma original.
- PDF em chinês, hindi e japonês usa renderização do navegador para preservar caracteres e composição de texto. Nesses três idiomas, o texto do PDF é rasterizado; nos demais, permanece a exportação com fontes Latin do jsPDF.

### Verificado

- 88 testes de backend passaram, sem chamadas reais a Gemini, GitHub ou Resend.
- Catálogos dos sete idiomas com 331 mensagens, chaves e parâmetros de interpolação consistentes; português original preservado.
- 105 combinações de rota/idioma no navegador, comparação de português com o commit anterior, troca real na sidebar, persistência, mensagens já exibidas, código e payloads preservados, Demo sem API e 14 exportações PDF.
- Build de produção concluído. Testes de navegador usam bundles em memória e APIs simuladas, sem iniciar servidor.
- Alterações limitadas ao modelo, idiomas, testes e documentação de versão; banco, pipeline e contratos da API preservados. Acesso e cota do Gemini em produção ainda exigem validação com a conta.

## v2.2.1 — 2026-10-01

### Corrigido

- Pool SQLAlchemy com pre-ping, reciclagem de 300 segundos e parâmetros SQL ocultos em erros.
- Ingestão de scan atômica: inventário e alertas em uma transação, com rollback e sem replay automático de commit ambíguo.
- Desconexão e esgotamento do pool retornam 503; erros reais de persistência continuam falhando com 500 e log sanitizado.
- Chave de integração enviada mas inválida retorna 401; ausência de chave preserva o modo legado.
- Normalizador valida formatos, tipos e limites antes de gravar; metadados opcionais nulos e listas de CVEs tratados.
- Falhas de migração ou conexão no startup impedem inicialização aparentemente saudável.
- Workflow valida secrets, não ignora erro operacional de scanners, envia arquivo de payload e aguarda até 120 segundos; nomes de branch passam por variáveis de ambiente.

### Adicionado

- Testes isolados do endpoint, desconexão DBAPI real em SQLite, rollback, recuperação, commit ambíguo e detecção do erro SSL pelo dialeto psycopg2.
- Execução manual do workflow e tentativa independente de envio de Trivy após falha no envio de Semgrep.
- Relatório de diagnóstico e auditoria com pendências de Gemini, dependências e validação em produção.
- Verificação concluída: 79 testes locais passaram; após deploy v2.2.1, Semgrep e Trivy receberam HTTP 201 na segunda tentativa do Actions; JSON inválido retornou 400 e CORS das duas origens foi confirmado.

## v2.2.0 — 2026-10-01

### Alterado

- Projeto assumido por novo responsável; repositórios, Render, Neon e Vercel recriados nas contas atuais.
- Desenvolvimento passa de Claude Code para Codex (OpenAI).
- README, DEPLOY e CONTEXTO_APEX reescritos para a infraestrutura atual.
- Padrão de GITHUB_REPO e exemplos de URLs atualizados para a conta atual.

### Adicionado

- CORS também permite o site de apresentação por SITE_URL, com normalização de origens e testes unitários.
- SITE_URL documentada no Render, exemplo do backend e guias de operação.

### Removido

- Referências operacionais a URLs temporárias, transporte de email antigo e conta anterior.
- APEX_API_URL do exemplo de ambiente do backend; continua somente como secret do GitHub Actions.

## v2.1.0 — 2026-07-26

### Corrigido

- Formulário de contato migrado de SMTP (Gmail) para Resend (API HTTPS) —
  resolve bloqueio de porta SMTP em hospedagem gratuita
- Mensagens de erro do endpoint `/api/contact` agora distinguem serviço não
  configurado (503) de falha no envio (502), com log no servidor

### Adicionado

- Seletor de idiomas com 7 opções: Português (padrão), Inglês, Espanhol,
  Chinês, Hindi, Francês e Japonês, acessível pela sidebar
- Idioma escolhido persiste no navegador entre sessões

### Removido

- Dependência de `CONTACT_GMAIL_ADDRESS` e `CONTACT_GMAIL_APP_PASSWORD`

## v2.0.0 — 2026-07-24

Grande atualização de produto: sidebar de conta, fallback de múltiplas chaves do Gemini,
sistema de contato, notificações via Discord, Modo Demo, relatórios em PDF e
Security Health Score.

### Adicionado

- Sidebar lateral com acesso a Chave de Integração, Conta, Contato e Notificações
- Fallback automático entre múltiplas chaves do Gemini
- Formulário de contato com envio de email
- Integração de notificações via webhook do Discord
- Modo Demo com dados fictícios instantâneos
- Geração de relatório PDF nas páginas Alertas e Risco Real
- Security Health Score na página de Alertas
- Timestamp em cada alerta

### Alterado

- Botão "Sair" saiu do header e passou a viver na página Conta (acessível pela sidebar)
- Chamadas ao Gemini centralizadas em `services/gemini_client.py`
- Projeto versionado formalmente: arquivo `VERSION` e este `CHANGELOG.md`

### Corrigido

- Chave de integração agora pode ser consultada a qualquer momento (antes só aparecia
  uma vez, no signup — quem perdesse ficava sem conseguir conectar repositórios)

## v1.x — Histórico resumido

- **v1.0**: Módulos 1-6 (pipeline, ASU, priorização, DLP, remediação, PR) + dashboard React
- **v1.1**: Deploy em produção (Render + Neon + Vercel), correção de bug de sincronização
- **v1.2**: Módulo 7 (Isolation Forest) e Módulo 8 (Intent Checker) com interface visual
- **v1.3**: Módulo 9 (Risco Real — FAIR/LGPD/Blast Radius), correção crítica do GITHUB_TOKEN
- **v1.4**: Módulo 10 (autenticação multi-tenant), SLA de compliance, Módulo 11 (Radar)
