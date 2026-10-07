/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
// Dados ficticios do Modo Demo.
// Servem para apresentar a plataforma sem depender de rede, API ou cota de LLM.
// NENHUMA chamada real de API acontece enquanto o Modo Demo estiver ativo.

const iso = (daysAgo, hour = 10) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 30, 0, 0)
  return d.toISOString()
}

import { demoDastAlerts } from './demoDast'
export { demoDastScans } from './demoDast'

export const demoAlerts = [
  ...demoDastAlerts,
  {
    id: 9001, source_tool: 'semgrep', repository: 'acme-corp/checkout-api',
    severity: 'CRITICAL', severity_adjusted: 'CRITICAL',
    title: 'python.lang.security.audit.sql-injection.raw-query',
    file_path: 'api/payments/queries.py', line_number: 87, created_at: iso(0, 9),
  },
  {
    id: 9002, source_tool: 'semgrep', repository: 'acme-corp/checkout-api',
    severity: 'HIGH', severity_adjusted: 'HIGH',
    title: 'python.lang.security.audit.hardcoded-password',
    file_path: 'api/config/settings.py', line_number: 23, created_at: iso(0, 11),
  },
  {
    id: 9003, source_tool: 'trivy', repository: 'acme-corp/checkout-api',
    severity: 'HIGH', severity_adjusted: 'HIGH',
    title: 'CVE-2026-31337', file_path: 'requirements.txt', line_number: null,
    created_at: iso(1, 14),
  },
  {
    id: 9004, source_tool: 'trivy', repository: 'acme-corp/infra-terraform',
    severity: 'HIGH', severity_adjusted: 'MEDIUM',
    title: 'S3 bucket com ACL pública', file_path: 'terraform/storage.tf', line_number: 42,
    created_at: iso(1, 16),
  },
  {
    id: 9005, source_tool: 'semgrep', repository: 'acme-corp/portal-web',
    severity: 'MEDIUM', severity_adjusted: 'MEDIUM',
    title: 'javascript.browser.security.insecure-document-method',
    file_path: 'src/render/html.js', line_number: 115, created_at: iso(2, 10),
  },
  {
    id: 9006, source_tool: 'trivy', repository: 'acme-corp/portal-web',
    severity: 'MEDIUM', severity_adjusted: 'MEDIUM',
    title: 'CVE-2025-88123', file_path: 'package-lock.json', line_number: null,
    created_at: iso(2, 15),
  },
  {
    id: 9007, source_tool: 'semgrep', repository: 'acme-corp/infra-terraform',
    severity: 'MEDIUM', severity_adjusted: 'LOW',
    title: 'Credencial de teste em fixture', file_path: 'tests/fixtures/auth_mock.py',
    line_number: 12, created_at: iso(3, 9),
  },
  {
    id: 9008, source_tool: 'semgrep', repository: 'acme-corp/portal-web',
    severity: 'LOW', severity_adjusted: 'LOW',
    title: 'generic.secrets.security.detected-generic-api-key',
    file_path: 'docs/exemplos.md', line_number: 58, created_at: iso(4, 13),
  },
  {
    id: 9009, source_tool: 'trivy', repository: 'acme-corp/checkout-api',
    severity: 'LOW', severity_adjusted: 'LOW',
    title: 'CVE-2025-40021', file_path: 'Dockerfile', line_number: null,
    created_at: iso(5, 11),
  },
]

export const demoStats = {
  total_alerts: demoAlerts.length,
  by_severity: {
    CRITICAL: demoAlerts.filter(a => a.severity_adjusted === 'CRITICAL').length,
    HIGH: demoAlerts.filter(a => a.severity_adjusted === 'HIGH').length,
    MEDIUM: demoAlerts.filter(a => a.severity_adjusted === 'MEDIUM').length,
    LOW: demoAlerts.filter(a => a.severity_adjusted === 'LOW').length,
  },
}

export const demoRemediations = [
  {
    id: 7001, alert_id: 9002,
    pr_description: 'Removida a senha hardcoded do arquivo de configuração. A credencial passa a ser lida de variável de ambiente, e um teste garante que nenhum literal sensível volte ao código.',
    patch_code: `import os\n\nDATABASE_PASSWORD = os.environ["DATABASE_PASSWORD"]\n\nif not DATABASE_PASSWORD:\n    raise RuntimeError("DATABASE_PASSWORD nao configurada no ambiente")`,
    test_code: `def test_sem_senha_hardcoded():\n    conteudo = open("api/config/settings.py").read()\n    assert "password =" not in conteudo.lower()`,
    created_at: iso(0, 12),
  },
  {
    id: 7002, alert_id: 9001,
    pr_description: 'Substituída a concatenação de string na query SQL por consulta parametrizada, eliminando o vetor de SQL Injection.',
    patch_code: `cursor.execute(\n    "SELECT * FROM pagamentos WHERE cliente_id = %s",\n    (cliente_id,)\n)`,
    test_code: `def test_query_parametrizada():\n    from api.payments import queries\n    assert "%s" in queries.BUSCAR_PAGAMENTO`,
    created_at: iso(0, 13),
  },
]

export const demoPullRequests = [
  {
    id: 5001, alert_id: 9002, pr_number: 42, status: 'open',
    pr_url: 'https://github.com/acme-corp/checkout-api/pull/42',
    branch_name: 'apex/fix-9002-hardcoded-password', created_at: iso(0, 12),
  },
  {
    id: 5002, alert_id: 9001, pr_number: 41, status: 'merged',
    pr_url: 'https://github.com/acme-corp/checkout-api/pull/41',
    branch_name: 'apex/fix-9001-sql-injection', created_at: iso(1, 17),
  },
]

export const demoAnomalyAnalysis = {
  trained: true,
  total_analyzed: demoAlerts.length,
  anomalies_found: 1,
  scores: {
    9001: { anomaly_score: -0.0412, is_anomaly: true },
    9002: { anomaly_score: 0.0821, is_anomaly: false },
    9003: { anomaly_score: 0.1104, is_anomaly: false },
    9004: { anomaly_score: 0.1367, is_anomaly: false },
    9005: { anomaly_score: 0.1512, is_anomaly: false },
    9006: { anomaly_score: 0.1498, is_anomaly: false },
    9007: { anomaly_score: 0.1233, is_anomaly: false },
    9008: { anomaly_score: 0.1655, is_anomaly: false },
    9009: { anomaly_score: 0.1601, is_anomaly: false },
  },
}

export const demoCompanyProfile = {
  sector: 'Financeiro',
  annual_revenue: 'R$ 24.000.000,00',
  sensitive_data_volume: 'Alto — até 500 mil registros',
  regulations: 'LGPD, PCI-DSS',
  operational_context: 'Processamos pagamentos com cartão para e-commerces parceiros. Banco de dados de clientes em rede privada, sem exposição direta à internet.',
}

export const demoRiskAssessments = [
  {
    id: 6001, alert_id: 9001,
    financial_impact_min: 'R$ 320.000,00', financial_impact_max: 'R$ 1.450.000,00',
    lgpd_fine_estimate: 'R$ 480.000,00', downtime_cost_estimate: 'R$ 95.000,00',
    fair_reasoning: 'A injeção de SQL está em um endpoint de pagamentos que acessa diretamente a base de clientes, com aproximadamente 500 mil registros de dados pessoais e financeiros. No modelo FAIR, a frequência de eventos de ameaça é elevada (endpoint exposto e vetor amplamente automatizado) e a magnitude da perda é alta, combinando notificação a titulares, multa administrativa da LGPD (até 2% do faturamento, limitada a R$ 50 milhões por infração), custo de resposta a incidente e perda de receita durante a contenção. A faixa reflete o intervalo entre um vazamento parcial contido rapidamente e um comprometimento completo da base.',
    compliance_risk_level: 'CRITICO',
    sla_deadline: '24 horas',
    sla_reasoning: 'Vulnerabilidade crítica com acesso direto a dados pessoais em setor financeiro regulado por LGPD e PCI-DSS. O PCI-DSS exige correção de falhas críticas em prazo imediato, e o tempo de exposição é fator agravante na apuração de responsabilidade pela ANPD.',
    blast_radius: {
      nodes: [
        { id: '1', label: 'Endpoint de pagamentos (SQL Injection)', type: 'entry_point' },
        { id: '2', label: 'Serviço de API interno', type: 'lateral' },
        { id: '3', label: 'Réplica de leitura do banco', type: 'lateral' },
        { id: '4', label: 'Base de clientes e cartões', type: 'critical_asset' },
      ],
      edges: [
        { from: '1', to: '2', label: 'execução de query arbitrária' },
        { from: '2', to: '3', label: 'credencial reutilizada' },
        { from: '3', to: '4', label: 'extração de dados sensíveis' },
      ],
    },
    created_at: iso(0, 14),
  },
]

export const demoRadarReport = `**Panorama Executivo de Ameaças — Setor Financeiro**

**1. Categorias de ameaça mais relevantes**

**Fraude em transações e apropriação de contas.** Empresas que processam pagamentos são alvo constante de tentativas de tomada de conta (account takeover) via credenciais vazadas em outros serviços. O vetor mais comum não é a quebra de criptografia, e sim a reutilização de senhas por clientes finais e a ausência de segundo fator em operações sensíveis.

**Comprometimento da cadeia de suprimentos de software.** Dependências de terceiros em aplicações de pagamento concentram risco desproporcional: uma biblioteca comprometida no pipeline de build alcança produção com as mesmas permissões da aplicação legítima.

**Exposição de dados por falha de aplicação.** Injeção de SQL, referências diretas inseguras a objetos e falhas de autorização em APIs continuam sendo o caminho mais curto entre um atacante externo e a base de titulares — especialmente em endpoints que crescem organicamente sem revisão de modelo de ameaça.

**Ransomware com dupla extorsão.** Além da indisponibilidade, o vazamento dos dados exfiltrados é usado como alavanca — o que, sob LGPD, transforma um incidente operacional em evento de notificação obrigatória à ANPD e aos titulares.

**2. Vulnerabilidades comumente exploradas neste perfil de dados**

Com volume alto de dados pessoais e financeiros, os pontos historicamente mais explorados são: segredos versionados em repositórios (chaves de API, credenciais de banco), controles de acesso ausentes entre microsserviços internos (confiança implícita na rede), logs que registram dados sensíveis em texto claro, e ambientes de homologação com cópia da base de produção sem anonimização.

**3. Recomendações priorizadas**

**Prioridade imediata.** Eliminar credenciais em código e migrar para um cofre de segredos com rotação automática. Garantir consultas parametrizadas em todo acesso a banco — sem exceção para código legado.

**Prioridade alta.** Implementar autorização explícita entre serviços internos, tratando a rede interna como não confiável. Habilitar segundo fator para operações financeiras e para todo acesso administrativo.

**Prioridade média.** Anonimizar dados em ambientes que não sejam produção. Revisar retenção de logs para remover dados pessoais desnecessários. Estabelecer um inventário de dependências com verificação automatizada a cada build.

**Nota de conformidade.** Sob LGPD e PCI-DSS, o tempo entre detecção e correção é fator determinante na apuração de responsabilidade. Manter prazos de correção formalizados por severidade é tão relevante quanto a correção em si.`

export const demoRepositories = [
  { name: 'acme-corp/checkout-api', total: 4, severities: { CRITICAL: 1, HIGH: 2, LOW: 1 } },
  { name: 'acme-corp/portal-web', total: 3, severities: { MEDIUM: 2, LOW: 1 } },
  { name: 'acme-corp/infra-terraform', total: 2, severities: { MEDIUM: 1, LOW: 1 } },
]

export const demoIntentResult = {
  consistent: false,
  confidence: 95,
  explanation: 'A mensagem de commit declara apenas um ajuste de formatação, mas o diff adiciona uma credencial da AWS em texto claro e um comando de execução remota. A divergência entre a intenção declarada e a alteração real é objetiva e merece revisão manual antes do merge.',
}
