import { useInterfaceText } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import Card from '../components/Card'
import { getRemediations } from '../services/api'
import { useDemoMode, demoDelay } from '../context/DemoContext'
import { demoRemediations } from '../data/demoData'

export default function Remediations() {
  const tx = useInterfaceText()
  const [remediations, setRemediations] = useState([])
  const [loading, setLoading] = useState(true)
  const { isDemoMode } = useDemoMode()

  useEffect(() => {
    // MODO DEMO: sem chamada de API
    if (isDemoMode) {
      setLoading(true)
      demoDelay().then(() => { setRemediations(demoRemediations); setLoading(false) })
      return
    }
    setLoading(true)
    getRemediations().then(r => setRemediations(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [isDemoMode])

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', color: '#F0E6C8', letterSpacing: '0.05em', marginBottom: '4px' }}>{tx("Remediações")}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Patches e testes gerados pela IA com DLP de borda")}</p>
      </div>

      {tx(loading ? (
        <div style={{ color: '#8A7A5A', fontFamily: 'Raleway', letterSpacing: '0.2em' }}>{tx("CARREGANDO...")}</div>
      ) : remediations.length === 0 ? (
        <Card>
          <div style={{ color: '#8A7A5A', textAlign: 'center', padding: '32px', fontFamily: 'Raleway' }}>{tx("Nenhuma remediação gerada ainda. Vá para Alertas e clique em \"Remediar\".")}</div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {remediations.map(rem => (
            <Card key={rem.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
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
                }}>{tx("REMEDIAÇÃO #")}{tx(rem.id)}</span>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#8A7A5A' }}>{tx("Alert #")}{tx(rem.alert_id)}
                </span>
              </div>

              {tx(rem.pr_description && (
                <div style={{
                  fontFamily: 'Inter',
                  fontSize: '13px',
                  color: '#F0E6C8',
                  marginBottom: '16px',
                  lineHeight: 1.6,
                }}>{isDemoMode ? tx(rem.pr_description) : rem.pr_description}</div>
              ))}

              <div style={{
                fontFamily: "'Raleway', sans-serif",
                fontSize: '11px',
                fontWeight: '600',
                color: '#8A7A5A',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>{tx("Patch sugerido")}</div>
              <pre style={{
                background: '#0A0A0A',
                border: '1px solid #2A2200',
                borderRadius: '8px',
                padding: '16px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                color: '#E8C97A',
                overflow: 'auto',
                maxHeight: '260px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>{rem.patch_code}</pre>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}
