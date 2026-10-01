# AGENTS.md — Apex Security

## Antes de qualquer tarefa
Leia nesta ordem: CONTEXTO_APEX.md, README.md, CHANGELOG.md. Eles têm o estado atual e as decisões já tomadas. Não refaça o que já está feito.

## Regras fixas
- Nunca commitar .env, tokens ou chaves. Nunca colocar token na URL do git push.
- Modelo de IA: gemini-2.5-flash-lite (variantes antigas foram descontinuadas ou não têm cota).
- Python 3.11.x. Sem emojis em arquivos Python (Windows cp1252).
- Modo Demo não pode fazer nenhuma chamada real de API.
- Identidade visual: preto e dourado, fontes Cinzel, Raleway, Inter, JetBrains Mono.
- Numeração de módulos (Módulo 9, 10...) só aparece em README e CONTEXTO, nunca na interface.
- Human-in-the-loop: nenhuma IA faz merge sozinha.
- Toda sessão de desenvolvimento incrementa a versão (VERSION), registra no CHANGELOG.md e atualiza o CONTEXTO_APEX.md.
- Não faça git push. Faça commit e me avise; eu envio.
- Antes de mudanças grandes, resuma o plano e espere confirmação.