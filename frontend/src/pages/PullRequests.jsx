import { useInterfaceText } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import Card from '../components/Card'
import { getPRs } from '../services/api'
import { useDemoMode, demoDelay } from '../context/DemoContext'
import { demoPullRequests } from '../data/demoData'

const statusConfig = {
  open: { color: '#C9A84C', label: 'ABERTO' },
  merged: { color: '#1A6B3C', label: 'MERGED' },
  closed: { color: '#C0392B', label: 'FECHADO' },
}

export default function PullRequests() {
  const tx = useInterfaceText()
  const [prs, setPRs] = useState([])
  const [loading, setLoading] = useState(true)
  const { isDemoMode } = useDemoMode()

  useEffect(() => {
    // MODO DEMO: sem chamada de API
    if (isDemoMode) {
      setLoading(true)
      demoDelay().then(() => { setPRs(demoPullRequests); setLoading(false) })
      return
    }
    setLoading(true)
    getPRs().then(r => setPRs(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [isDemoMode])

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', color: '#F0E6C8', letterSpacing: '0.05em', marginBottom: '4px' }}>{tx("Pull Requests")}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Correções automáticas aguardando revisão humana")}</p>
      </div>

      {tx(loading ? (
        <div style={{ color: '#8A7A5A', fontFamily: 'Raleway', letterSpacing: '0.2em' }}>{tx("CARREGANDO...")}</div>
      ) : prs.length === 0 ? (
        <Card>
          <div style={{ color: '#8A7A5A', textAlign: 'center', padding: '32px', fontFamily: 'Raleway' }}>{tx("Nenhum Pull Request criado ainda. Vá para Alertas e clique em \"Criar PR\".")}</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {prs.map(pr => {
            const status = statusConfig[pr.status] || statusConfig.open
            return (
              <div key={pr.id} style={{
                background: '#111111',
                border: '1px solid #2A2200',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}>
                <span style={{
                  background: `${status.color}20`,
                  color: status.color,
                  border: `1px solid ${status.color}40`,
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontFamily: 'Raleway',
                  fontWeight: '700',
                  letterSpacing: '0.1em',
                  flexShrink: 0,
                }}>{tx(status.label)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Inter', fontSize: '13px', color: '#F0E6C8', marginBottom: '2px' }}>{tx("PR #")}{tx(pr.pr_number)}{tx(" — Alert #")}{tx(pr.alert_id)}
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#8A7A5A' }}>
                    {pr.branch_name}
                  </div>
                </div>
                {tx(pr.pr_url && (
                  <a
                    href={pr.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
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
                      textDecoration: 'none',
                    }}
                  >{tx("VER NO GITHUB →")}</a>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
