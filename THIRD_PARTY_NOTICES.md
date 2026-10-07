# Avisos de terceiros

Inventario gerado em 2026-10-07 a partir dos metadados instalados do Python e de `frontend/package-lock.json`/`node_modules/*/package.json`. As licencas dos terceiros continuam proprias; GPL do projeto nao as substitui.

## Backend: dependencias diretas

| Pacote | Versao instalada | Licenca declarada |
|---|---|---|
| fastapi | 0.111.0 | MIT License |
| uvicorn | 0.29.0 | BSD-3-Clause |
| psycopg2-binary | 2.9.9 | LGPL with exceptions |
| python-dotenv | 1.0.1 | BSD-3-Clause |
| pydantic | 2.7.1 | MIT |
| google-generativeai | 0.5.4 | Apache 2.0 |
| PyGithub | 2.3.0 | GNU Library or Lesser General Public License (LGPL) |
| pytest | 8.2.0 | MIT |
| httpx | 0.27.0 | BSD-3-Clause |
| SQLAlchemy | 2.0.30 | MIT |
| alembic | 1.13.1 | MIT |
| scikit-learn | 1.5.0 | new BSD |
| python-jose | 3.3.0 | MIT |
| passlib | 1.7.4 | BSD |
| bcrypt | 4.0.1 | Apache License, Version 2.0 |
| python-multipart | 0.0.9 | Apache-2.0 |
| email_validator | 2.1.1 | Unlicense |

## Frontend: dependencias diretas e de desenvolvimento

| Pacote | Versao resolvida | Licenca declarada |
|---|---|---|
| @fontsource/inter | 5.2.8 | OFL-1.1 |
| axios | 1.18.1 | MIT |
| i18next | 26.3.6 | MIT |
| i18next-browser-languagedetector | 8.2.1 | MIT |
| jspdf | 4.2.1 | MIT |
| jspdf-autotable | 5.0.8 | MIT |
| react | 19.2.7 | MIT |
| react-dom | 19.2.7 | MIT |
| react-i18next | 17.0.11 | MIT |
| react-router-dom | 7.18.0 | MIT |
| reactflow | 11.11.4 | MIT |
| recharts | 3.8.1 | MIT |
| @eslint/js | 10.0.1 | MIT |
| @types/react | 19.2.17 | MIT |
| @types/react-dom | 19.2.3 | MIT |
| @vitejs/plugin-react | 6.0.2 | MIT |
| eslint | 10.5.0 | MIT |
| eslint-plugin-react-hooks | 7.1.1 | MIT |
| eslint-plugin-react-refresh | 0.5.3 | MIT |
| globals | 17.7.0 | MIT |
| vite | 8.0.16 | MIT |

## Ferramentas externas

Semgrep, Trivy, OWASP ZAP e OWASP Juice Shop sao executados em processos/containers separados, nao incorporados ao codigo Apex. Consulte as licencas de cada distribuicao: [Semgrep](https://github.com/semgrep/semgrep/blob/develop/LICENSE), [Trivy](https://github.com/aquasecurity/trivy/blob/main/LICENSE), [ZAP](https://github.com/zaproxy/zaproxy/blob/main/LICENSE), [Juice Shop](https://github.com/juice-shop/juice-shop/blob/master/LICENSE). ZAP e Juice Shop sao imagens externas usadas apenas no runner GitHub Actions.

## Fontes

Cinzel, Raleway, Inter e JetBrains Mono possuem licenciamento SIL Open Font License. O frontend usa Google Fonts e o pacote @fontsource/inter (licenca declarada OFL-1.1 acima). Os avisos das fontes acompanham as respectivas distribuicoes.

## Compatibilidade e limites do inventario

MIT, BSD, Apache-2.0, LGPL e OFL declaradas pelas dependencias principais nao indicam por si incompatibilidade com GPL v3; devem ser preservados seus avisos e condicoes na redistribuicao. Metadados com licenca nao identificada, genérica ou multiplas alternativas exigem consultar o arquivo LICENSE da distribuicao. Este inventario nao constitui parecer juridico nem verificacao de todas as dependencias transitivas. [Referencia FSF sobre compatibilidade](https://www.gnu.org/licenses/license-list.html).
