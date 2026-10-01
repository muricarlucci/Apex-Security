import { useInterfaceText } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import ReactFlow, { Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'
import Card from '../components/Card'
import { getCompanyProfile, saveCompanyProfile, getRiskAssessments } from '../services/api'
import { generateRiskReport } from '../utils/pdfReport'
import { useDemoMode, demoDelay } from '../context/DemoContext'
import { demoCompanyProfile, demoRiskAssessments } from '../data/demoData'

const sectors = [
  'Tecnologia / Software',
  'Financeiro',
  'Saúde',
  'Varejo / E-commerce',
  'Educação',
  'Indústria',
  'Outro',
]

const dataVolumes = [
  'Baixo — até 5 mil registros',
  'Médio — até 50 mil registros',
  'Alto — até 500 mil registros',
  'Muito alto — acima de 500 mil registros',
]

// Cores dos nós do blast radius por tipo de ativo no caminho do ataque
const nodeColors = {
  entry_point: { bg: 'rgba(192, 57, 43, 0.15)', border: '#C0392B', text: '#F0E6C8' },
  lateral: { bg: 'rgba(138, 122, 90, 0.15)', border: '#8A7A5A', text: '#F0E6C8' },
  critical_asset: { bg: 'rgba(232, 201, 122, 0.15)', border: '#E8C97A', text: '#E8C97A' },
}

// Cores do nivel de risco de compliance (SLA)
const complianceColors = {
  BAIXO: '#1A6B3C',
  MEDIO: '#C9A84C',
  ALTO: '#D35400',
  CRITICO: '#C0392B',
}

const labelStyle = {
  fontFamily: 'Raleway',
  fontSize: '11px',
  fontWeight: '600',
  color: '#8A7A5A',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  marginBottom: '8px',
  display: 'block',
}

const fieldStyle = {
  width: '100%',
  background: '#0A0A0A',
  border: '1px solid #2A2200',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#F0E6C8',
  fontSize: '13px',
  fontFamily: 'Inter',
  outline: 'none',
  transition: 'all 0.2s ease',
}

function BlastRadius({ blastRadius }) {
  const tx = useInterfaceText()
  const rawNodes = blastRadius?.nodes || []
  const rawEdges = blastRadius?.edges || []

  if (rawNodes.length === 0) {
    return (
      <div style={{ color: '#8A7A5A', fontFamily: 'Inter', fontSize: '13px' }}>{tx("Sem caminho de propagação mapeado para esta avaliação.")}</div>
    )
  }

  const nodes = rawNodes.map((n, i) => {
    const c = nodeColors[n.type] || nodeColors.lateral
    return {
      id: String(n.id),
      data: { label: tx(n.label) },
      position: { x: 40 + i * 210, y: 60 + (i % 2 === 0 ? 0 : 70) },
      style: {
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '8px',
        color: c.text,
        fontFamily: 'Inter, sans-serif',
        fontSize: '12px',
        padding: '10px 12px',
        width: 170,
        boxShadow: n.type === 'critical_asset' ? '0 0 14px rgba(232, 201, 122, 0.35)' : 'none',
      },
    }
  })

  const edges = rawEdges.map((e, i) => ({
    id: `e${i}`,
    source: String(e.from),
    target: String(e.to),
    label: tx(e.label),
    animated: true,
    style: { stroke: '#8B6914' },
    labelStyle: { fill: '#8A7A5A', fontFamily: 'Inter', fontSize: 10 },
    labelBgStyle: { fill: '#0A0A0A' },
  }))

  return (
    <div style={{ height: '260px', background: '#0A0A0A', border: '1px solid #2A2200', borderRadius: '8px' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#2A2200" gap={16} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

export default function RealRisk() {
  const tx = useInterfaceText()
  const [profile, setProfile] = useState({
    sector: '',
    annual_revenue: '',
    sensitive_data_volume: '',
    regulations: '',
    operational_context: '',
  })
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const { isDemoMode } = useDemoMode()

  useEffect(() => {
    // MODO DEMO: perfil e avaliacoes ficticios, sem chamada de API
    if (isDemoMode) {
      setLoading(true)
      demoDelay().then(() => {
        setProfile(demoCompanyProfile)
        setAssessments(demoRiskAssessments)
        setLoading(false)
      })
      return
    }

    setLoading(true)
    Promise.all([getCompanyProfile(), getRiskAssessments()])
      .then(([profRes, assessRes]) => {
        setProfile(profRes.data)
        setAssessments(assessRes.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isDemoMode])

  const handleSave = async () => {
    if (isDemoMode) {
      setSaving(true)
      await demoDelay(400)
      setSavedMsg('✓ Perfil salvo — as próximas estimativas usarão estes dados')
      setSaving(false)
      return
    }
    setSaving(true)
    setSavedMsg('')
    try {
      await saveCompanyProfile(profile)
      setSavedMsg('✓ Perfil salvo — as próximas estimativas usarão estes dados')
    } catch (e) {
      setSavedMsg('✗ Erro ao salvar o perfil')
    } finally {
      setSaving(false)
    }
  }

  const set = (field) => (e) => setProfile(p => ({ ...p, [field]: e.target.value }))

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '24px',
            fontWeight: '600',
            color: '#F0E6C8',
            letterSpacing: '0.05em',
            marginBottom: '4px',
          }}>{tx("Risco Real")}</h1>
          <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Quanto uma vulnerabilidade pode custar ao seu negócio")}</p>
        </div>
        <button
          onClick={() => generateRiskReport(assessments, localStorage.getItem('company_name'))}
          disabled={assessments.length === 0}
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
            cursor: assessments.length === 0 ? 'default' : 'pointer',
            opacity: assessments.length === 0 ? 0.4 : 1,
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { if (assessments.length) { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.color = '#C9A84C' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2200'; e.currentTarget.style.color = '#8A7A5A' }}
        >{tx("▤ EXPORTAR PDF")}</button>
      </div>

      {/* Cabeçalho explicativo */}
      <Card style={{ marginBottom: '24px', borderLeft: '2px solid #8B6914' }}>
        <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#F0E6C8', lineHeight: 1.7 }}>{tx("Estime o impacto financeiro real de cada vulnerabilidade para o seu negócio, com base em multas LGPD, custo de inatividade e a movimentação simulada do ataque pelos seus sistemas. Quanto mais informações você fornecer sobre sua empresa, mais precisa será a estimativa.")}</p>
        <p style={{ fontFamily: 'Inter', fontSize: '12px', color: '#8A7A5A', lineHeight: 1.7, marginTop: '10px' }}>
          <strong style={{ color: '#E8C97A' }}>{tx("Importante:")}</strong>{tx(" os valores exibidos são")}{tx(' ')}
          <strong style={{ color: '#E8C97A' }}>{tx("estimativas analíticas de apoio à decisão")}</strong>{tx(", geradas por IA a partir do modelo FAIR e da legislação aplicável — não são números contábeis oficiais nem substituem uma avaliação financeira formal.")}</p>
      </Card>

      {tx(loading ? (
        <div style={{ color: '#8A7A5A', fontFamily: 'Raleway', letterSpacing: '0.2em' }}>{tx("CARREGANDO...")}</div>
      ) : (
        <>
          {/* Perfil da empresa */}
          <Card style={{ marginBottom: '24px' }}>
            <div style={{
              fontFamily: 'Raleway', fontSize: '12px', fontWeight: '600', color: '#8A7A5A',
              letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px',
            }}>{tx("Perfil da empresa")}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>{tx("Setor de atuação")}</label>
                <select value={profile.sector || ''} onChange={set('sector')} style={fieldStyle}>
                  {sectors.map(s => <option key={s} value={s} style={{ background: '#111111' }}>{tx(s)}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{tx("Faturamento anual")}</label>
                <input
                  type="text"
                  value={profile.annual_revenue || ''}
                  onChange={set('annual_revenue')}
                  placeholder={tx("R$ 5.000.000,00")}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{tx("Volume de dados sensíveis / PII")}</label>
                <select value={profile.sensitive_data_volume || ''} onChange={set('sensitive_data_volume')} style={fieldStyle}>
                  {dataVolumes.map(v => <option key={v} value={v} style={{ background: '#111111' }}>{tx(v)}</option>)}
                  {tx(profile.sensitive_data_volume && !dataVolumes.includes(profile.sensitive_data_volume) && (
                    <option value={profile.sensitive_data_volume} style={{ background: '#111111' }}>
                      {tx(profile.sensitive_data_volume)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{tx("Regulamentações aplicáveis")}</label>
                <input
                  type="text"
                  value={profile.regulations || ''}
                  onChange={set('regulations')}
                  placeholder={tx("LGPD")}
                  style={fieldStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{tx("Contexto operacional adicional")}</label>
              <textarea
                value={profile.operational_context || ''}
                onChange={set('operational_context')}
                rows={3}
                placeholder={tx("Ex: processamos pagamentos com cartão, temos 3 mil clientes ativos, banco isolado da internet. Quanto mais detalhes, mais precisa a estimativa.")}
                style={{ ...fieldStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 28px',
                  color: '#0A0A0A',
                  fontFamily: 'Raleway',
                  fontSize: '12px',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                {tx(saving ? 'SALVANDO...' : 'SALVAR PERFIL')}
              </button>
              {tx(savedMsg && (
                <span style={{
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  color: savedMsg.startsWith('✓') ? '#1A6B3C' : '#C0392B',
                }}>{tx(savedMsg)}</span>
              ))}
            </div>
          </Card>

          {/* Avaliações de risco */}
          <div style={{
            fontFamily: 'Raleway', fontSize: '12px', fontWeight: '600', color: '#8A7A5A',
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px',
          }}>{tx("Avaliações de risco geradas")}</div>

          {assessments.length === 0 ? (
            <Card>
              <div style={{ color: '#8A7A5A', textAlign: 'center', padding: '32px', fontFamily: 'Raleway' }}>{tx("Nenhuma avaliação ainda. Vá para ")}<strong style={{ color: '#C9A84C' }}>{tx("Alertas")}</strong>{tx(" e clique em \"Mapear Risco\" em qualquer alerta para gerar a primeira estimativa.")}</div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {assessments.map(a => (
                <Card key={a.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <span style={{
                      background: 'rgba(201, 168, 76, 0.12)',
                      color: '#C9A84C',
                      border: '1px solid #C9A84C40',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '10px',
                      fontFamily: 'Raleway',
                      fontWeight: '700',
                      letterSpacing: '0.1em',
                    }}>{tx("ALERTA #")}{tx(a.alert_id)}</span>
                  </div>

                  {/* Impacto financeiro em destaque (so quando o risco foi mapeado) */}
                  {tx(a.financial_impact_min ? (
                    <div style={{
                      background: 'linear-gradient(135deg, #1A1400 0%, #111111 100%)',
                      border: '1px solid #C9A84C40',
                      borderRadius: '12px',
                      padding: '20px 24px',
                      marginBottom: '20px',
                    }}>
                      <div style={{
                        fontFamily: 'Raleway', fontSize: '11px', color: '#8A7A5A',
                        letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px',
                      }}>{tx("Impacto financeiro estimado")}</div>
                      <div style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '26px',
                        fontWeight: '700',
                        color: '#E8C97A',
                        lineHeight: 1.3,
                      }}>
                        {tx(a.financial_impact_min)} — {tx(a.financial_impact_max)}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      background: '#0A0A0A', border: '1px solid #2A2200', borderRadius: '8px',
                      padding: '14px 16px', marginBottom: '20px',
                      fontFamily: 'Inter', fontSize: '12px', color: '#8A7A5A',
                    }}>{tx("Estimativa financeira ainda não gerada — clique em \"Mapear Risco\" na aba Alertas.")}</div>
                  ))}

                  {/* LGPD + downtime */}
                  {tx(a.financial_impact_min && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ background: '#0A0A0A', border: '1px solid #2A2200', borderRadius: '8px', padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'Raleway', fontSize: '10px', color: '#8A7A5A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>{tx("Multa LGPD estimada")}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#F0E6C8' }}>{tx(a.lgpd_fine_estimate || '—')}</div>
                    </div>
                    <div style={{ background: '#0A0A0A', border: '1px solid #2A2200', borderRadius: '8px', padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'Raleway', fontSize: '10px', color: '#8A7A5A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>{tx("Custo de inatividade")}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: '14px', color: '#F0E6C8' }}>{tx(a.downtime_cost_estimate || '—')}</div>
                    </div>
                  </div>
                  ))}

                  {/* SLA de Compliance — só aparece depois de calculado */}
                  {tx(a.sla_deadline && (
                    <div style={{
                      background: '#0A0A0A',
                      border: `1px solid ${(complianceColors[a.compliance_risk_level] || '#2A2200')}40`,
                      borderRadius: '8px',
                      padding: '16px 18px',
                      marginBottom: '20px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' }}>
                        <div style={{
                          fontFamily: 'Raleway', fontSize: '10px', color: '#8A7A5A',
                          letterSpacing: '0.15em', textTransform: 'uppercase',
                        }}>{tx("Prazo de correção (SLA)")}</div>
                        {tx(a.compliance_risk_level && (
                          <span style={{
                            background: `${complianceColors[a.compliance_risk_level] || '#8A7A5A'}20`,
                            color: complianceColors[a.compliance_risk_level] || '#8A7A5A',
                            border: `1px solid ${complianceColors[a.compliance_risk_level] || '#8A7A5A'}40`,
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '10px',
                            fontFamily: 'Raleway',
                            fontWeight: '700',
                            letterSpacing: '0.1em',
                          }}>{tx("RISCO DE COMPLIANCE: ")}{tx(a.compliance_risk_level)}</span>
                        ))}
                      </div>
                      <div style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#E8C97A',
                        marginBottom: '10px',
                      }}>{tx(a.sla_deadline)}</div>
                      {tx(a.sla_reasoning && (
                        <p style={{ fontFamily: 'Inter', fontSize: '12px', color: '#8A7A5A', lineHeight: 1.7 }}>
                          {isDemoMode ? tx(a.sla_reasoning) : a.sla_reasoning}
                        </p>
                      ))}
                    </div>
                  ))}

                  {/* Raciocínio FAIR */}
                  {tx(a.fair_reasoning && (
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>{tx("Raciocínio da estimativa (FAIR)")}</div>
                      <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#F0E6C8', lineHeight: 1.7 }}>
                        {isDemoMode ? tx(a.fair_reasoning) : a.fair_reasoning}
                      </p>
                    </div>
                  ))}

                  {/* Blast radius */}
                  {tx(a.blast_radius?.nodes?.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{tx("Blast radius — propagação simulada")}</div>
                      <div style={{ display: 'flex', gap: '14px', fontFamily: 'Raleway', fontSize: '10px' }}>
                        <span style={{ color: '#C0392B' }}>{tx("● ponto de entrada")}</span>
                        <span style={{ color: '#8A7A5A' }}>{tx("● movimento lateral")}</span>
                        <span style={{ color: '#E8C97A' }}>{tx("● ativo crítico")}</span>
                      </div>
                    </div>
                    <BlastRadius blastRadius={a.blast_radius} />
                  </div>
                  ))}
                </Card>
              ))}
            </div>
          )}
        </>
      ))}
    </div>
  )
}
