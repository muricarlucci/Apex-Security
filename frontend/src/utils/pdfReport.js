import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { translateInterface as tx, getInterfaceLocale } from './interfaceText'
import { generateUnicodeReport } from './unicodePdfReport'

// Relatorios usam os dados ja carregados na tela — nao fazem nova chamada de API.

export function generateAlertsReport(alerts, companyName) {
  const doc = new jsPDF()
  if (['zh-CN', 'hi-IN', 'ja-JP'].includes(getInterfaceLocale())) {
    return generateUnicodeReport(doc, tx('Apex Security — Relatório de Alertas'),
      [tx(`Empresa: ${companyName || 'N/A'}`), tx(`Gerado em: ${new Date().toLocaleString(getInterfaceLocale())}`)],
      ['Severidade', 'Título', 'Repositório', 'Data'].map(tx),
      alerts.map(a => [tx(a.severity_adjusted || a.severity), a.title, a.repository,
        a.created_at ? new Date(a.created_at).toLocaleDateString(getInterfaceLocale()) : '-']),
      `apex-security-alertas-${Date.now()}.pdf`)
  }
  doc.setFontSize(18)
  doc.text(tx('Apex Security — Relatório de Alertas'), 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(tx(`Empresa: ${companyName || 'N/A'}`), 14, 28)
  doc.text(tx(`Gerado em: ${new Date().toLocaleString(getInterfaceLocale())}`), 14, 33)

  autoTable(doc, {
    startY: 40,
    head: [['Severidade', 'Título', 'Repositório', 'Data'].map(tx)],
    body: alerts.map(a => [
      tx(a.severity_adjusted || a.severity),
      a.title,
      a.repository,
      a.created_at ? new Date(a.created_at).toLocaleDateString(getInterfaceLocale()) : '-',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 26, 10] },
  })

  doc.save(`apex-security-alertas-${Date.now()}.pdf`)
}

export function generateRiskReport(riskAssessments, companyName) {
  const doc = new jsPDF()
  if (['zh-CN', 'hi-IN', 'ja-JP'].includes(getInterfaceLocale())) {
    return generateUnicodeReport(doc, tx('Apex Security — Relatório de Risco'),
      [tx(`Empresa: ${companyName || 'N/A'}`), tx(`Gerado em: ${new Date().toLocaleString(getInterfaceLocale())}`)],
      ['Alerta ID', 'Impacto Financeiro', 'SLA', 'Nível de Compliance'].map(tx),
      riskAssessments.map(r => [r.alert_id,
        tx(`${r.financial_impact_min || '-'} a ${r.financial_impact_max || '-'}`),
        tx(r.sla_deadline || '-'), tx(r.compliance_risk_level || '-')]),
      `apex-security-risco-${Date.now()}.pdf`)
  }
  doc.setFontSize(18)
  doc.text(tx('Apex Security — Relatório de Risco'), 14, 20)
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(tx(`Empresa: ${companyName || 'N/A'}`), 14, 28)
  doc.text(tx(`Gerado em: ${new Date().toLocaleString(getInterfaceLocale())}`), 14, 33)

  autoTable(doc, {
    startY: 40,
    head: [['Alerta ID', 'Impacto Financeiro', 'SLA', 'Nível de Compliance'].map(tx)],
    body: riskAssessments.map(r => [
      r.alert_id,
      tx(`${r.financial_impact_min || '-'} a ${r.financial_impact_max || '-'}`),
      tx(r.sla_deadline || '-'),
      tx(r.compliance_risk_level || '-'),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 26, 10] },
  })

  doc.save(`apex-security-risco-${Date.now()}.pdf`)
}
