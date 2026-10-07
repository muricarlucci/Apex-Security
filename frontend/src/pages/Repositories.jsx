/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { useInterfaceText } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import Card from '../components/Card'
import { getAlerts } from '../services/api'
import { useDemoMode, demoDelay } from '../context/DemoContext'
import { demoRepositories } from '../data/demoData'

const severityColors = {
  CRITICAL: '#C0392B',
  HIGH: '#D35400',
  MEDIUM: '#C9A84C',
  LOW: '#1A6B3C',
  INFO: '#2C4A6B',
  UNKNOWN: '#8A7A5A',
}

export default function Repositories() {
  const tx = useInterfaceText()
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)
  const { isDemoMode } = useDemoMode()

  useEffect(() => {
    // MODO DEMO: sem chamada de API
    if (isDemoMode) {
      setLoading(true)
      demoDelay().then(() => { setRepos(demoRepositories); setLoading(false) })
      return
    }

    setLoading(true)
    getAlerts()
      .then(res => {
        const grouped = {}
        for (const alert of res.data) {
          if (alert.repository?.startsWith('dast:')) continue
          const name = alert.repository || 'desconhecido'
          if (!grouped[name]) {
            grouped[name] = { name, total: 0, severities: {} }
          }
          grouped[name].total += 1
          const sev = (alert.severity_adjusted || alert.severity || 'UNKNOWN').toUpperCase()
          grouped[name].severities[sev] = (grouped[name].severities[sev] || 0) + 1
        }
        setRepos(Object.values(grouped).sort((a, b) => b.total - a.total))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isDemoMode])

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '24px', color: '#F0E6C8', letterSpacing: '0.05em', marginBottom: '4px' }}>{tx("Repositórios")}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Inventário de ativos monitorados e alertas por severidade")}</p>
      </div>

      {tx(loading ? (
        <div style={{ color: '#8A7A5A', fontFamily: 'Raleway', letterSpacing: '0.2em' }}>{tx("CARREGANDO...")}</div>
      ) : repos.length === 0 ? (
        <Card>
          <div style={{ color: '#8A7A5A', textAlign: 'center', padding: '32px', fontFamily: 'Raleway' }}>{tx("Nenhum repositório com alertas ainda.")}</div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {repos.map(repo => (
            <Card key={repo.name} hoverable>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{
                  fontFamily: 'JetBrains Mono',
                  fontSize: '14px',
                  color: '#F0E6C8',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>{repo.name === 'desconhecido' ? tx('desconhecido') : repo.name}</div>
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#C9A84C',
                  flexShrink: 0,
                  marginLeft: '12px',
                }}>{tx(repo.total)}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(repo.severities).map(([sev, count]) => (
                  <span key={sev} style={{
                    background: `${severityColors[sev] || '#8A7A5A'}20`,
                    color: severityColors[sev] || '#8A7A5A',
                    border: `1px solid ${severityColors[sev] || '#8A7A5A'}40`,
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontFamily: 'Raleway',
                    fontWeight: '600',
                    letterSpacing: '0.06em',
                  }}>{tx(sev)} {tx(count)}</span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}
