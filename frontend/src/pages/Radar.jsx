/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { useInterfaceText, getInterfaceLocale } from '../utils/interfaceText'
import { useState } from 'react'
import Card from '../components/Card'
import { getRadar } from '../services/api'
import { useDemoMode, demoDelay } from '../context/DemoContext'
import { demoRadarReport } from '../data/demoData'

export default function Radar() {
  const tx = useInterfaceText()
  const [report, setReport] = useState(null)
  const [generatedAt, setGeneratedAt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { isDemoMode } = useDemoMode()

  const fetchRadar = async () => {
    setLoading(true)
    setError('')

    // MODO DEMO: relatorio ficticio local, sem chamada de API
    if (isDemoMode) {
      await demoDelay(500)
      setReport(demoRadarReport)
      setGeneratedAt(new Date().toISOString())
      setLoading(false)
      return
    }

    try {
      const res = await getRadar()
      setReport(res.data.report)
      setGeneratedAt(res.data.generated_at)
    } catch (e) {
      setError(e.response?.data?.detail || 'Não foi possível gerar o panorama.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '24px',
          fontWeight: '600',
          color: '#F0E6C8',
          letterSpacing: '0.05em',
          marginBottom: '4px',
        }}>{tx("Radar")}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Panorama de ameaças relevantes para o seu setor")}</p>
      </div>

      {/* Aviso de honestidade técnica — obrigatório */}
      <Card style={{ marginBottom: '24px', borderLeft: '2px solid #8B6914' }}>
        <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#F0E6C8', lineHeight: 1.7 }}>{tx("Panorama analítico de ameaças relevantes para o seu setor, baseado no perfil da sua empresa. Esta análise é gerada a partir do")}{tx(' ')}
          <strong style={{ color: '#E8C97A' }}>{tx("conhecimento do modelo de IA")}</strong>{tx(" — não é uma busca ao vivo na internet, mas uma síntese estruturada de padrões de ameaça consistentes com seu contexto.")}</p>
      </Card>

      {/* Ação */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={fetchRadar}
          disabled={loading}
          style={{
            background: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 100%)',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 32px',
            color: '#0A0A0A',
            fontFamily: 'Raleway',
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {tx(loading ? 'ANALISANDO...' : report ? '⟳ ATUALIZAR' : 'GERAR PANORAMA')}
        </button>
        {tx(generatedAt && (
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: '#8A7A5A' }}>{tx("última atualização: ")}{new Date(generatedAt).toLocaleString(getInterfaceLocale())}
          </span>
        ))}
      </div>

      {tx(error && (
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ color: '#C0392B', fontFamily: 'Inter', fontSize: '13px' }}>{tx(error)}</div>
        </Card>
      ))}

      {/* Relatório */}
      {tx(report ? (
        <Card>
          <div style={{
            fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A',
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '16px',
          }}>{tx("Panorama executivo")}</div>
          <div style={{
            fontFamily: 'Inter',
            fontSize: '13px',
            color: '#F0E6C8',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}>{report === demoRadarReport ? report.split('\n\n').map(tx).join('\n\n') : report}</div>
        </Card>
      ) : !loading && (
        <Card>
          <div style={{ color: '#8A7A5A', textAlign: 'center', padding: '32px', fontFamily: 'Raleway' }}>{tx("Clique em \"Gerar Panorama\" para produzir a análise com base no perfil da sua empresa (configurável na aba ")}<strong style={{ color: '#C9A84C' }}>{tx("Risco Real")}</strong>).
          </div>
        </Card>
      ))}
    </div>
  )
}
