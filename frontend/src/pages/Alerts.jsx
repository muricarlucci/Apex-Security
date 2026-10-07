/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { useInterfaceText, getInterfaceLocale } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import SeverityBadge from '../components/SeverityBadge'
import Card from '../components/Card'
import { getAlerts, remediate, createPR, createRiskAssessment, createSLAAssessment } from '../services/api'
import { generateAlertsReport } from '../utils/pdfReport'
import { useTranslation } from 'react-i18next'
import { useDemoMode, demoDelay } from '../context/DemoContext'
import { demoAlerts } from '../data/demoData'
import { useSearchParams } from 'react-router-dom'

const severities = ['TODAS', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
const tools = ['TODAS', 'semgrep', 'trivy', 'zap']

const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  return date.toLocaleString(getInterfaceLocale(), {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Security Health Score — puramente frontend, derivado dos alertas em tela
const calculateHealthScore = (alerts) => {
  const critical = alerts.filter(a => a.severity_adjusted === 'CRITICAL').length
  const high = alerts.filter(a => a.severity_adjusted === 'HIGH').length
  const medium = alerts.filter(a => a.severity_adjusted === 'MEDIUM').length
  const score = Math.max(0, 100 - (critical * 25) - (high * 10) - (medium * 5))
  let grade, color, labelKey
  if (score >= 90) { grade = 'A'; color = '#1A6B3C'; labelKey = 'alerts.gradeExcellent' }
  else if (score >= 70) { grade = 'B'; color = '#C9A84C'; labelKey = 'alerts.gradeAttention' }
  else { grade = 'F'; color = '#C0392B'; labelKey = 'alerts.gradeCritical' }
  return { score, grade, color, labelKey }
}

export default function Alerts() {
  const [searchParams] = useSearchParams()
  const tx = useInterfaceText()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('TODAS')
  const [toolFilter, setToolFilter] = useState(searchParams.get('tool') === 'zap' ? 'zap' : 'TODAS')
  const [solutions, setSolutions] = useState({})
  const [actionLoading, setActionLoading] = useState({})
  const [messages, setMessages] = useState({})
  const { isDemoMode } = useDemoMode()
  const { t } = useTranslation()
  useEffect(() => { if (searchParams.get('tool') === 'zap') setToolFilter('zap') }, [searchParams])

  const fetchAlerts = async () => {
    // MODO DEMO: filtra os dados ficticios localmente, sem tocar na API
    if (isDemoMode) {
      setLoading(true)
      await demoDelay()
      let data = demoAlerts
      if (severityFilter !== 'TODAS') data = data.filter(a => a.severity_adjusted === severityFilter)
      if (toolFilter !== 'TODAS') data = data.filter(a => a.source_tool === toolFilter)
      setAlerts(data)
      setLoading(false)
      return
    }

    const params = {}
    if (severityFilter !== 'TODAS') params.severity = severityFilter
    if (toolFilter !== 'TODAS') params.source_tool = toolFilter
    getAlerts(params)
      .then(res => setAlerts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchAlerts() }, [severityFilter, toolFilter, isDemoMode])

  /** No Modo Demo, as acoes simulam sucesso sem chamar a API. */
  const runDemoAction = async (alertId, key, message) => {
    setActionLoading(p => ({ ...p, [`${key}_${alertId}`]: true }))
    await demoDelay(400)
    setMessages(p => ({ ...p, [alertId]: message }))
    setActionLoading(p => ({ ...p, [`${key}_${alertId}`]: false }))
  }

  const handleRemediate = async (alertId) => {
    if (isDemoMode) return runDemoAction(alertId, 'rem', '✓ Remediação gerada — patch e teste unitário prontos')
    setActionLoading(p => ({ ...p, [`rem_${alertId}`]: true }))
    try {
      await remediate(alertId)
      setMessages(p => ({ ...p, [alertId]: '✓ Remediação gerada' }))
    } catch (e) {
      const msg = e.response?.data?.detail || 'Erro ao remediar'
      setMessages(p => ({ ...p, [alertId]: `✗ ${msg}` }))
    } finally {
      setActionLoading(p => ({ ...p, [`rem_${alertId}`]: false }))
    }
  }

  const handleCreatePR = async (alertId) => {
    if (isDemoMode) return runDemoAction(alertId, 'pr', '✓ PR criado: https://github.com/acme-corp/checkout-api/pull/43')
    setActionLoading(p => ({ ...p, [`pr_${alertId}`]: true }))
    try {
      const res = await createPR(alertId)
      setMessages(p => ({ ...p, [alertId]: `✓ PR criado: ${res.data.pr_url}` }))
    } catch (e) {
      // 401 = credencial do GitHub invalida/expirada: nao e erro do usuario,
      // e configuracao pendente da equipe. Mensagem diferenciada e amigavel.
      if (e.response?.status === 401) {
        setMessages(p => ({
          ...p,
          [alertId]: '⚠ Configuração pendente — token do GitHub precisa ser atualizado (ação da equipe)',
        }))
      } else {
        const msg = e.response?.data?.detail || 'Erro ao criar PR'
        setMessages(p => ({ ...p, [alertId]: `✗ ${msg}` }))
      }
    } finally {
      setActionLoading(p => ({ ...p, [`pr_${alertId}`]: false }))
    }
  }

  const handleMapRisk = async (alertId) => {
    if (isDemoMode) return runDemoAction(alertId, 'risk', '✓ Risco mapeado — ver aba Risco Real')
    setActionLoading(p => ({ ...p, [`risk_${alertId}`]: true }))
    try {
      await createRiskAssessment(alertId)
      setMessages(p => ({ ...p, [alertId]: '✓ Risco mapeado — ver aba Risco Real' }))
    } catch (e) {
      const msg = e.response?.data?.detail || 'Erro ao mapear risco'
      setMessages(p => ({ ...p, [alertId]: `✗ ${msg}` }))
    } finally {
      setActionLoading(p => ({ ...p, [`risk_${alertId}`]: false }))
    }
  }

  const handleViewSLA = async (alertId) => {
    if (isDemoMode) return runDemoAction(alertId, 'sla', '✓ SLA calculado — ver aba Risco Real')
    setActionLoading(p => ({ ...p, [`sla_${alertId}`]: true }))
    try {
      await createSLAAssessment(alertId)
      setMessages(p => ({ ...p, [alertId]: '✓ SLA calculado — ver aba Risco Real' }))
    } catch (e) {
      const msg = e.response?.data?.detail || 'Erro ao calcular SLA'
      setMessages(p => ({ ...p, [alertId]: `✗ ${msg}` }))
    } finally {
      setActionLoading(p => ({ ...p, [`sla_${alertId}`]: false }))
    }
  }

  const filterBtnStyle = (active) => ({
    background: active ? 'rgba(201, 168, 76, 0.15)' : 'transparent',
    border: `1px solid ${active ? '#C9A84C' : '#2A2200'}`,
    borderRadius: '6px',
    padding: '5px 12px',
    color: active ? '#C9A84C' : '#8A7A5A',
    fontFamily: "'Raleway', sans-serif",
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  })

  const health = calculateHealthScore(alerts)

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '24px',
          color: '#F0E6C8',
          letterSpacing: '0.05em',
          marginBottom: '4px',
        }}>{t('alerts.title')}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>
          {t('alerts.found', { count: alerts.length })}
        </p>

        {/* Security Health Score — compacto, complementa o cabecalho */}
        {tx(!loading && alerts.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: `${health.color}20`,
              border: `1px solid ${health.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Cinzel', serif", fontSize: '14px', fontWeight: '700',
              color: health.color, flexShrink: 0,
            }}>{tx(health.grade)}</div>
            <div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '12px', color: '#F0E6C8' }}>
                {tx(health.score)}/100
              </div>
              <div style={{
                fontFamily: 'Raleway', fontSize: '9px', color: health.color,
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>{t('alerts.healthScore')} · {t(health.labelKey)}</div>
            </div>
          </div>
        ))}
        </div>

        {/* Exportar PDF */}
        <button
          onClick={() => generateAlertsReport(alerts, localStorage.getItem('company_name'))}
          disabled={alerts.length === 0}
          style={{
            background: 'transparent',
            border: '1px solid #2A2200',
            borderRadius: '6px',
            padding: '7px 14px',
            color: '#8A7A5A',
            fontFamily: 'Raleway',
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.08em',
            cursor: alerts.length === 0 ? 'default' : 'pointer',
            opacity: alerts.length === 0 ? 0.4 : 1,
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { if (alerts.length) { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#C9A84C' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2200'; e.currentTarget.style.color = '#8A7A5A' }}
        >
          ▤ {t('common.exportPDF')}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ color: '#8A7A5A', fontSize: '11px', fontFamily: 'Raleway', letterSpacing: '0.1em', marginRight: '4px' }}>{t('alerts.severity')}</span>
          {severities.map(s => (
            <button key={s} style={filterBtnStyle(severityFilter === s)} onClick={() => setSeverityFilter(s)}>
              {tx(s === 'TODAS' ? t('alerts.all') : s)}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ color: '#8A7A5A', fontSize: '11px', fontFamily: 'Raleway', letterSpacing: '0.1em', marginRight: '4px' }}>{t('alerts.tool')}</span>
          {tools.map(tool => (
            <button key={tool} style={filterBtnStyle(toolFilter === tool)} onClick={() => setToolFilter(tool)}>
              {tx(tool === 'TODAS' ? t('alerts.all') : tool.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {tx(loading ? (
        <div style={{ color: '#8A7A5A', fontFamily: 'Raleway', letterSpacing: '0.2em' }}>{t('common.loading')}</div>
      ) : alerts.length === 0 ? (
        <Card>
          <div style={{ color: '#8A7A5A', textAlign: 'center', padding: '32px', fontFamily: 'Raleway' }}>
            {t('alerts.empty')}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map(alert => (
            <div key={alert.id} style={{
              background: '#111111',
              border: '1px solid #2A2200',
              borderRadius: '12px',
              padding: '16px 20px',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <SeverityBadge severity={alert.severity_adjusted || alert.severity} />
                <span style={{ color: '#C9A84C', fontFamily: 'JetBrains Mono', fontSize: 10 }}>{alert.scan_type || (alert.source_tool === 'semgrep' ? 'SAST' : alert.source_tool === 'trivy' ? 'SCA/IaC' : alert.source_tool.toUpperCase())}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'Inter',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#F0E6C8',
                    marginBottom: '4px',
                  }}>{isDemoMode ? (alert.title_key ? t(alert.title_key) : tx(alert.title)) : alert.title}</div>
                  <div style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '10px',
                    color: '#8A7A5A',
                    marginBottom: '2px',
                  }}>
                    {formatDate(alert.created_at)}
                  </div>
                  <div style={{
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px',
                    color: '#8A7A5A',
                  }}>
                    {alert.repository}{tx(alert.file_path ? ` · ${alert.file_path}` : '')}{tx(alert.line_number ? `:${alert.line_number}` : '')}
                  </div>
                  {tx(messages[alert.id] && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: messages[alert.id].startsWith('✓') ? '#1A6B3C' : '#C0392B',
                      fontFamily: 'Inter',
                      wordBreak: 'break-all',
                    }}>{tx(messages[alert.id])}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {alert.scan_type === 'DAST' || alert.source_tool === 'zap' ? (
                    <button style={filterBtnStyle(Boolean(solutions[alert.id]))} onClick={() => setSolutions(previous => ({ ...previous, [alert.id]: !previous[alert.id] }))}>{t('dast.solution')}</button>
                  ) : (<>
                  <button
                    onClick={() => handleRemediate(alert.id)}
                    disabled={actionLoading[`rem_${alert.id}`]}
                    style={{
                      background: 'rgba(201, 168, 76, 0.1)',
                      border: '1px solid rgba(201, 168, 76, 0.3)',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      color: '#C9A84C',
                      fontFamily: 'Raleway',
                      fontSize: '11px',
                      fontWeight: '600',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      opacity: actionLoading[`rem_${alert.id}`] ? 0.5 : 1,
                    }}
                  >
                    {tx(actionLoading[`rem_${alert.id}`] ? t('alerts.remediating') : t('alerts.remediate'))}
                  </button>
                  <button
                    onClick={() => handleCreatePR(alert.id)}
                    disabled={actionLoading[`pr_${alert.id}`]}
                    style={{
                      background: 'transparent',
                      border: '1px solid #2A2200',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      color: '#8A7A5A',
                      fontFamily: 'Raleway',
                      fontSize: '11px',
                      fontWeight: '600',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      opacity: actionLoading[`pr_${alert.id}`] ? 0.5 : 1,
                    }}
                  >
                    {tx(actionLoading[`pr_${alert.id}`] ? t('alerts.creatingPR') : t('alerts.createPR'))}
                  </button>
                  </>)}
                  <button
                    onClick={() => handleMapRisk(alert.id)}
                    disabled={actionLoading[`risk_${alert.id}`]}
                    style={{
                      background: 'transparent',
                      border: '1px solid #2A2200',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      color: '#8A7A5A',
                      fontFamily: 'Raleway',
                      fontSize: '11px',
                      fontWeight: '600',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      opacity: actionLoading[`risk_${alert.id}`] ? 0.5 : 1,
                    }}
                  >
                    {tx(actionLoading[`risk_${alert.id}`] ? t('alerts.mappingRisk') : t('alerts.mapRisk'))}
                  </button>
                  <button
                    onClick={() => handleViewSLA(alert.id)}
                    disabled={actionLoading[`sla_${alert.id}`]}
                    style={{
                      background: 'transparent',
                      border: '1px solid #2A2200',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      color: '#8A7A5A',
                      fontFamily: 'Raleway',
                      fontSize: '11px',
                      fontWeight: '600',
                      letterSpacing: '0.08em',
                      cursor: 'pointer',
                      opacity: actionLoading[`sla_${alert.id}`] ? 0.5 : 1,
                    }}
                  >
                    {tx(actionLoading[`sla_${alert.id}`] ? t('alerts.calculatingSLA') : t('alerts.viewSLA'))}
                  </button>
                </div>
              </div>
              {(alert.scan_type === 'DAST' || alert.source_tool === 'zap') && solutions[alert.id] && (
                <div style={{ color: '#F0E6C8', fontFamily: 'Inter', fontSize: 12, marginTop: 16, whiteSpace: 'pre-wrap' }}>
                  <p>{t('dast.codeHelp')}</p>
                  <p>{isDemoMode && alert.solution_key ? t(alert.solution_key) : alert.solution || t('dast.noSolution')}</p>
                  {alert.cwe_id && <span>CWE-{alert.cwe_id}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
