/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { useInterfaceText } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import { getStats, getAlerts } from '../services/api'
import { useTranslation } from 'react-i18next'
import { useDemoMode, demoDelay } from '../context/DemoContext'
import { demoStats, demoAlerts } from '../data/demoData'

const severityColors = {
  CRITICAL: '#C0392B',
  HIGH: '#D35400',
  MEDIUM: '#C9A84C',
  LOW: '#1A6B3C',
  INFO: '#2C4A6B',
}

export default function Dashboard() {
  const tx = useInterfaceText()
  const [stats, setStats] = useState(null)
  const [recentAlerts, setRecentAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { isDemoMode } = useDemoMode()
  const { t } = useTranslation()

  useEffect(() => {
    // MODO DEMO: dados ficticios locais, sem chamada de API
    if (isDemoMode) {
      setLoading(true)
      demoDelay().then(() => {
        setStats(demoStats)
        setRecentAlerts(demoAlerts.slice(0, 5))
        setLoading(false)
      })
      return
    }

    setLoading(true)
    Promise.all([getStats(), getAlerts()])
      .then(([statsRes, alertsRes]) => {
        setStats(statsRes.data)
        setRecentAlerts(alertsRes.data.slice(0, 5))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [isDemoMode])

  const chartData = stats?.by_severity
    ? Object.entries(stats.by_severity).map(([k, v]) => ({ name: k, value: v }))
    : []

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ color: '#8A7A5A', fontFamily: "'Raleway', sans-serif", letterSpacing: '0.2em' }}>
        {t('common.loading')}
      </div>
    </div>
  )

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '24px',
          fontWeight: '600',
          color: '#F0E6C8',
          letterSpacing: '0.05em',
          marginBottom: '4px',
        }}>{t('dashboard.title')}</h1>
        <p style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: '13px',
          color: '#8A7A5A',
        }}>{t('dashboard.subtitle')}</p>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <StatCard
          label={t('dashboard.totalAlerts')}
          value={stats?.total_alerts ?? 0}
          sub={t('dashboard.totalAlertsSub')}
          accent={true}
        />
        <StatCard
          label={t('dashboard.critical')}
          value={stats?.by_severity?.CRITICAL ?? 0}
          sub={t('dashboard.criticalSub')}
        />
        <StatCard
          label={t('dashboard.highSeverity')}
          value={stats?.by_severity?.HIGH ?? 0}
          sub={t('dashboard.highSeveritySub')}
        />
        <StatCard
          label={t('dashboard.resolved')}
          value={stats?.by_severity?.LOW ?? 0}
          sub={t('dashboard.resolvedSub')}
        />
      </div>

      {/* Gráfico + alertas recentes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
      }}>
        {/* Gráfico */}
        <Card>
          <div style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '12px',
            fontWeight: '600',
            color: '#8A7A5A',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>{t('dashboard.severityDistribution')}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={32}>
              <XAxis
                dataKey="name"
                tickFormatter={tx}
                tick={{ fill: '#8A7A5A', fontSize: 11, fontFamily: 'Raleway' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8A7A5A', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                labelFormatter={tx}
                formatter={(value, name) => [value, tx(name)]}
                cursor={{ fill: 'rgba(201, 168, 76, 0.06)' }}
                contentStyle={{
                  background: '#111111',
                  border: '1px solid #2A2200',
                  borderRadius: '8px',
                  color: '#F0E6C8',
                  fontFamily: 'Inter',
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={severityColors[entry.name] || '#8A7A5A'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Alertas recentes */}
        <Card>
          <div style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize: '12px',
            fontWeight: '600',
            color: '#8A7A5A',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}>{t('dashboard.recentAlerts')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tx(recentAlerts.length === 0 ? (
              <div style={{ color: '#8A7A5A', fontSize: '13px' }}>{t('dashboard.noAlerts')}</div>
            ) : recentAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => navigate(`/alerts`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  background: '#0A0A0A',
                  borderRadius: '8px',
                  border: '1px solid #2A2200',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#C9A84C40'
                  e.currentTarget.style.background = '#1A1400'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#2A2200'
                  e.currentTarget.style.background = '#0A0A0A'
                }}
              >
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: severityColors[alert.severity_adjusted] || '#8A7A5A',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#F0E6C8',
                    fontFamily: 'Inter',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>{isDemoMode ? tx(alert.title) : alert.title}</div>
                  <div style={{
                    fontSize: '11px',
                    color: '#8A7A5A',
                    fontFamily: 'Inter',
                  }}>{alert.repository}</div>
                </div>
                <div style={{
                  fontSize: '10px',
                  color: severityColors[alert.severity_adjusted] || '#8A7A5A',
                  fontFamily: 'Raleway',
                  fontWeight: '600',
                  letterSpacing: '0.08em',
                  flexShrink: 0,
                }}>{tx(alert.severity_adjusted)}</div>
              </div>
            )))}
          </div>
        </Card>
      </div>
    </div>
  )
}
