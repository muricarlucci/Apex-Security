# AGENTS.md — Apex Security

## Antes de qualquer tarefa
Leia nesta ordem: CONTEXTO_APEX.md, README.md, CHANGELOG.md. Eles têm o estado atual e as decisões já tomadas. Não refaça o que já está feito.

## Regras fixas
- Nunca commitar .env, tokens ou chaves. Nunca colocar token na URL do git push.
- Modelo de IA: gemini-3.8-flash (configurável por GEMINI_MODEL; definido pelo usuário em 2026-10-01).
- Python 3.11.x. Sem emojis em arquivos Python (Windows cp1252).
- Modo Demo não pode fazer nenhuma chamada real de API.
- Identidade visual: preto e dourado, fontes Cinzel, Raleway, Inter, JetBrains Mono.
- Numeração de módulos (Módulo 9, 10...) só aparece em README e CONTEXTO, nunca na interface.
- Human-in-the-loop: nenhuma IA faz merge sozinha.
- Toda sessão de desenvolvimento incrementa a versão (VERSION), registra no CHANGELOG.md e atualiza o CONTEXTO_APEX.md.
- Os caminhos do workspace têm espaços: use aspas em comandos de shell. A raiz deste repositório é "D:\DASHBOARD APEX\Apex-Security".
- FRONTEND_URL e SITE_URL alimentam as origens permitidas pelo CORS. Mantenha as URLs sem barra final.
- Em testes automáticos, não inicie o servidor nem chame Gemini, GitHub ou Resend; use mocks.
- Todo arquivo-fonte novo do projeto deve começar com o cabeçalho SPDX GPL-3.0-or-later, no formato dos arquivos existentes. Preserve shebang/encoding; HTML depois do doctype. Não acrescente comentários em JSON nem em arquivos de terceiros.
- DAST roda somente no GitHub Actions, com ZAP oficial e laboratório Juice Shop ou URL pública autorizada. Nenhum Gemini na varredura/importação. Full apenas no laboratório ou hosts de treinamento da allowlist.
- Preserve validação de URL/DNS IPv4/IPv6, autorização registrada, cinco solicitações por conta/24h, uma ativa por conta e concurrency global. Callback HMAC com secret fora dos inputs, nonce público, TTL e bloqueio de replay final. Nunca registre assinatura, secrets ou relatório.
- ZAP mantém severity_adjusted igual à severidade mapeada: nunca chame prioritize() para DAST. Resultados e estado final são atômicos; Discord após commit.
- Zona protegida: apex-scan.yml da raiz e sua cópia em pipeline devem permanecer idênticos; POST /api/scan, normalizador/priorizador/regras/DLP/remediador/PR/Gemini/risco/Radar/intenção/anomalias não devem ser refatorados para acomodar DAST. Só extensões opcionais de resposta/filtro e rotas/serviços novos; nenhum comportamento existente deve mudar sem autorização explícita.
- Ao final de cada sessão de desenvolvimento autorizada, execute git add, git commit e git push origin main a partir da raiz do repositório. Confirme com git status e git log origin/main..HEAD que não há mudanças ou commits pendentes.
- Nunca embuta token na URL do Git. Se o push falhar por autenticação ou rede, pare e peça ao usuário para executar git push no terminal dele; o Git Credential Manager pode reautenticar pelo navegador.
