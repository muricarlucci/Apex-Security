# Schema ASU (Apex Standard Unified)

Formato JSON canônico para o qual todo output de scanner é normalizado pelo
módulo `backend/services/normalizer.py` (Módulo 2). Qualquer ferramenta nova
precisa apenas de um parser para este schema — o resto da plataforma não muda.

## Campos

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `str` | UUID gerado internamente |
| `source_tool` | `str` | `"semgrep"` ou `"trivy"` (ou nome da ferramenta desconhecida) |
| `repository` | `str` | Nome do repositório de origem |
| `file_path` | `str \| null` | Caminho do arquivo afetado |
| `line_number` | `int \| null` | Linha do problema |
| `severity` | `str` | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO` |
| `severity_adjusted` | `str` | Severidade após priorização por contexto (Módulo 3) |
| `title` | `str` | Nome curto da vulnerabilidade |
| `description` | `str \| null` | Descrição detalhada |
| `cve_id` | `str \| null` | CVE se disponível |
| `iac_internet_exposed` | `bool \| null` | Exposição à internet segundo o IaC (Módulo 3) |
| `raw_output` | `str` | JSON bruto original preservado para auditoria |
| `timestamp` | `str` | ISO 8601 (UTC) |

## Mapeamento de severidades

| Origem | Valor bruto | ASU |
|---|---|---|
| Semgrep | `error` | `HIGH` |
| Semgrep | `warning` | `MEDIUM` |
| Semgrep | `info` | `INFO` |
| Semgrep | `note` | `LOW` |
| Trivy | `CRITICAL`/`HIGH`/`MEDIUM`/`LOW` | mantidos |
| Trivy | `UNKNOWN` | `INFO` |
| (qualquer) | valor não reconhecido | `INFO` |

## Comportamento com entradas problemáticas

- JSON inválido → `ValueError` (a API responde 400)
- Ferramenta desconhecida → alerta genérico `INFO` com `raw_output` preservado (não quebra)
- Campos ausentes → defaults seguros (`None`/listas vazias), cobertos por testes

## Extensão DAST (v3.0.0)

O parser ZAP fica em `backend/services/dast_normalizer.py`, separado do normalizador estático preservado. Na persistência, `id` é o inteiro do banco e a data exposta é `created_at`; `id` UUID e `timestamp` da tabela acima descrevem o dicionário intermediário dos normalizadores estáticos, não o contrato inteiro da resposta HTTP.

| Campo opcional em `alerts` | Tipo | Uso |
|---|---|---|
| `scan_type` | string ou null | SAST, SCA, IaC ou DAST; legado null tem tipo inferido apenas na UI |
| `target_url` | string ou null | Alvo dinâmico validado |
| `cwe_id` | string ou null | CWE do ZAP; não confundir com CVE |
| `solution` | string ou null | Recomendação sem HTML, truncada |
| `dast_scan_id` | inteiro ou null | Associação interna com `dast_scans` |

DAST: `source_tool=zap`, pseudo-repositório `dast:<host>` ou `dast:juice-shop-lab`, URI da primeira instância em `file_path`, `line_number=null`, `cve_id=null`. Há um registro por alerta, com até 20 instâncias no `raw_output`, contagem completa e até cinco URLs na descrição. A solução/descrição têm HTML removido.

Risco ZAP `3 → HIGH`, `2 → MEDIUM`, `1 → LOW`, `0 → INFO`; desconhecido → INFO. **Não há CRITICAL. `severity_adjusted == severity`: DAST nunca passa pelo priorizador IaC.** Veja [a justificativa e o fluxo de callback](dast.md).

As respostas `/api/alerts` e `/api/alerts/{id}` acrescentam apenas `scan_type`, `target_url`, `cwe_id` e `solution`, todos opcionais. A listagem aceita `scan_type=DAST` e `source_tool=zap`. A ingestão estática e os dados antigos permanecem compatíveis.
