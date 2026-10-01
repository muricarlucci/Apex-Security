# Changelog — Apex Security

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
