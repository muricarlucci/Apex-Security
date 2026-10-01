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
- Ao final de cada sessão de desenvolvimento autorizada, execute git add, git commit e git push origin main a partir da raiz do repositório. Confirme com git status e git log origin/main..HEAD que não há mudanças ou commits pendentes.
- Nunca embuta token na URL do Git. Se o push falhar por autenticação ou rede, pare e peça ao usuário para executar git push no terminal dele; o Git Credential Manager pode reautenticar pelo navegador.
