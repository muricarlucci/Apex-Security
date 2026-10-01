# Apex Security v2.3.2

Plataforma ASPM (Application Security Posture Management), projeto acadêmico de Cibersegurança da FIAP. A Apex Security automatiza detecção, priorização e proposta de correção de vulnerabilidades. Pessoas revisam e decidem o merge de cada Pull Request.

## Acessos de produção

- [Dashboard](https://apex-security-kappa.vercel.app)
- [API e Swagger](https://apex-security-xzk4.onrender.com/docs)
- [Site de apresentação](https://apex-security-site-apresentacao.vercel.app)
- [Repositório do dashboard e backend](https://github.com/muricarlucci/Apex-Security)

Versão atual: **v2.3.2**. Consulte o [histórico de mudanças](CHANGELOG.md).

Gemini: modelo principal `gemini-3.8-flash`, uma request normalmente, com retry de 503 após 0,5s. Após o segundo 503, uma única tentativa com `gemini-3.5-flash-lite`. Cota diária 429 explicitamente associada ao modelo principal também permite essa contingência; rate limit temporário/429 ambíguo mantém o tratamento anterior. As duas chaves e o fallback por falha específica da chave permanecem. No máximo três requests (duas no principal, uma na contingência), sem loop nem retry do 3.5. Cada RPC tem prazo de 20s, orçamento total de 65s e timeout frontend de 120s incluindo cold start. Cancelamento impede novas tentativas. No Render, manter `GEMINI_MODEL=gemini-3.8-flash` e ambas as chaves; o modelo de contingência não exige variável adicional.

Resultados válidos são reutilizados por conta e entradas: Radar por até 6h (mantém a data original), Intenção/Risco/SLA por até 1h, Remediação sem expiração enquanto a entrada permanecer igual. Mudanças de entradas/modelo invalidam a reutilização. PostgreSQL impede gerações simultâneas iguais entre abas/processos; a segunda solicitação em andamento recebe 409. A tabela aditiva `gemini_operation_cache` é criada pelo startup existente. Não foram executados testes nem chamadas Gemini nesta alteração, por solicitação do usuário.

O backend no plano gratuito do Render dorme após 15 minutos sem uso; a primeira resposta pode levar 30 a 50 segundos. O banco usa Neon. Acorde a API antes de uma apresentação.

## Fluxo

Um push aciona o workflow do repositório do cliente. Semgrep e Trivy rodam na CPU do GitHub Actions desse repositório e enviam os resultados a `POST /api/scan` com o header `X-Apex-Api-Key`. O backend normaliza para ASU, aplica regras determinísticas de priorização e associa os alertas à conta da chave. No dashboard, o usuário pode solicitar remediação via Gemini, criar um PR para revisão humana, mapear risco e ver uma sugestão de SLA. A varredura pesada não roda no servidor da Apex, mantendo o custo operacional próximo de zero nos planos gratuitos.

## Arquitetura: 11 módulos

| Módulo | Função |
| --- | --- |
| 1. Pipeline CI/CD | GitHub Actions, Semgrep e Trivy |
| 2. Normalização ASU | JSON canônico de scanners; veja [o schema](docs/asu-schema.md) |
| 3. Priorização IaC | Regras determinísticas e explicáveis; fonte oficial da severidade ajustada |
| 4. DLP de borda | Ofusca segredos no trecho de código enviado pela remediação e reverte no resultado |
| 5. Remediação via Gemini | Gera patch e teste unitário obrigatório em JSON |
| 6. Pull Request | Cria branch, commits e PR via PyGitHub; nunca faz merge sozinho |
| 7. Análise de anomalias | Isolation Forest; sinal consultivo, sem substituir o módulo 3 |
| 8. Verificador de intenção | Compara mensagem de commit e diff via Gemini; alerta informativo |
| 9. Risco Real | Estimativa FAIR/LGPD/downtime, grafo de blast radius e sugestão de SLA |
| 10. Autenticação multi-tenant | JWT, bcrypt, isolamento por `user_id` e chave de integração por usuário |
| 11. Radar | Panorama setorial via Gemini; síntese do modelo, sem busca ao vivo |

A numeração aparece na documentação, nunca na interface. Estimativas de risco e SLA, anomalias, intenção e Radar são apoio à decisão; não são conclusões definitivas.

Recursos adicionais: sidebar de Chave de Integração, Conta, Contato, Notificações e Idioma; fallback entre chaves Gemini; contato via Resend; webhook do Discord; Modo Demo; relatórios PDF; Security Health Score; data e hora dos alertas; interface em português, inglês, espanhol, chinês, hindi, francês e japonês. A escolha muda também mensagens, gráficos, datas e relatórios. Português mantém os textos originais. Dados inseridos pelo usuário, código, identificadores e análises reais da IA são preservados no idioma original; a troca de idioma não reescreve esses conteúdos.

## Infraestrutura

| Componente | Hospedagem | Configuração |
| --- | --- | --- |
| Backend FastAPI | Render, free tier | Banco, chaves e origens CORS |
| PostgreSQL | Neon, free tier | Tabelas via SQLAlchemy no startup; alterações aditivas legadas em `database.py` |
| Dashboard React/Vite | Vercel, free tier | Root Directory `frontend`; `VITE_API_URL` entra no build |
| Site de apresentação | Vercel, free tier, repositório separado | Formulário usa `POST /api/contact` |
| Pipeline do cliente | GitHub Actions | Secrets `APEX_API_URL` e `APEX_USER_API_KEY` |

Mudar `VITE_API_URL` na Vercel exige Redeploy. O CORS da API aceita localhost, `FRONTEND_URL` para o dashboard e `SITE_URL` para o site.

## Conectar um repositório

1. Crie uma conta no [dashboard](https://apex-security-kappa.vercel.app).
2. Abra **Chave de Integração** na sidebar e copie a chave da conta.
3. No repositório cliente, crie os secrets do GitHub Actions: `APEX_USER_API_KEY` com essa chave e `APEX_API_URL` com `https://apex-security-xzk4.onrender.com`, sem `/api` e sem barra final.
4. Copie [.github/workflows/apex-scan.yml](.github/workflows/apex-scan.yml) para `.github/workflows/` do repositório cliente. A cópia em `pipeline/` é apenas referência.
5. Faça um push, confira o Actions e os alertas na sua conta. O workflow usa `github.repository` dinamicamente e sinaliza falhas HTTP.

## Para desenvolvedores

Use Python **3.11.x**. No PowerShell, a partir da raiz:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Preencha as credenciais locais em .env
uvicorn main:app --reload
```

A API local fica em `http://localhost:8000`; o Swagger, em `http://localhost:8000/docs`. Iniciar o backend cria ou atualiza tabelas no banco configurado; use um banco de desenvolvimento. Em outro terminal:

```powershell
cd frontend
npm install
copy .env.example .env.local
# Em .env.local, use VITE_API_URL=http://localhost:8000/api
npm run dev
```

O dashboard local fica em `http://localhost:5173`. `frontend/.env.example` mostra a URL de produção; substitua-a em `.env.local` para uso local. Veja também o [guia de deploy](DEPLOY.md).

### Variáveis do backend

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL do Neon ou banco local |
| `GEMINI_API_KEY` | Chave principal do Gemini |
| `GEMINI_API_KEY_2` | Chave opcional de fallback |
| `GEMINI_MODEL` | Modelo; padrão `gemini-3.8-flash` |
| `GITHUB_TOKEN` | PAT para criar branches, commits e PRs |
| `GITHUB_REPO` | Repositório alvo; padrão `muricarlucci/Apex-Security` |
| `JWT_SECRET_KEY` | Assinatura dos JWTs |
| `RESEND_API_KEY` | Envio do formulário de contato |
| `CONTACT_EMAIL_TO` | Destinatário do contato |
| `RESEND_FROM_ADDRESS` | Remetente autorizado no Resend |
| `FRONTEND_URL` | Origem CORS do dashboard: `https://apex-security-kappa.vercel.app` |
| `SITE_URL` | Origem CORS do site: `https://apex-security-site-apresentacao.vercel.app` |

`APEX_API_URL` **não é variável do backend**. É apenas um secret do GitHub Actions com a URL base do Render; o workflow acrescenta `/api/scan`. Nunca versione `.env`, tokens ou senhas.

A ingestão usa uma única transação para o scan inteiro. O pool verifica conexões antes do uso e recicla conexões com mais de 300 segundos no próximo checkout. Interrupções durante a transação retornam erro; não há replay automático nem garantia de deduplicação entre reenvios. Chave enviada mas inválida retorna 401. Veja o [diagnóstico e as pendências operacionais](docs/DIAGNOSTICO_2026-10-01.md).

## Segurança e limites conhecidos

Há hash de senha com bcrypt, JWT com expiração, HTTPS em produção, isolamento de dados por `user_id` e revisão humana antes do merge. A remediação ofusca segredos no trecho de código antes de enviá-lo ao Gemini. Essa proteção ainda não cobre todos os campos de todos os serviços de LLM, como o diff do verificador de intenção e o contexto do perfil da empresa.

Ainda não há verificação de e-mail, rate limiting nem 2FA. A chave de integração é armazenada em texto no banco. O endpoint de scan aceita ausência de chave e grava dados legados sem usuário. No Modo Demo, enviar o formulário da página Contato ainda faz chamada real. Essas limitações exigem atenção antes de uso comercial.
