/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { useInterfaceText } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Sidebar from './Sidebar'
import { useDemoMode } from '../context/DemoContext'
import { cancelGeminiRequests } from '../services/api'

const navItems = [
  { path: '/', key: 'dashboard', icon: '◈' },
  { path: '/alerts', key: 'alerts', icon: '⚠' },
  { path: '/remediations', key: 'remediations', icon: '⚕' },
  { path: '/pull-requests', key: 'pullRequests', icon: '⟲' },
  { path: '/real-risk', key: 'realRisk', icon: '◆' },
  { path: '/repositories', key: 'repositories', icon: '◉' },
  { path: '/dast', key: 'dast', icon: '◎' },
  // Módulos avançados (consultivos) — separados visualmente na navegação
  { path: '/anomaly-analysis', key: 'anomalies', icon: '✦', advanced: true },
  { path: '/intent-checker', key: 'intent', icon: '⟡', advanced: true },
  { path: '/radar', key: 'radar', icon: '◎', advanced: true },
]

export default function Layout({ children }) {
  const tx = useInterfaceText()
  const navigate = useNavigate()
  const location = useLocation()
  const companyName = localStorage.getItem('company_name')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isDemoMode, setIsDemoMode } = useDemoMode()
  const { t } = useTranslation()

  // Abort abandoned AI operations when navigating, logging out or entering Demo.
  useEffect(() => () => cancelGeminiRequests(), [location.pathname, isDemoMode])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0A0A0A',
    }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Header */}
      <header style={{
        background: 'linear-gradient(180deg, #111111 0%, #0A0A0A 100%)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Menu + logo + modo demo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label={t('nav.openMenu')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: 'block', width: '18px', height: '1.5px', background: '#8A7A5A' }} />
            ))}
          </button>

          <img
            src="/apex-logo.png"
            alt="Apex Security"
            style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
          />

          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            style={{
              fontSize: '10px',
              fontFamily: "'Raleway', sans-serif",
              fontWeight: '600',
              letterSpacing: '0.05em',
              color: isDemoMode ? '#0A0A0A' : '#8A7A5A',
              background: isDemoMode ? '#C9A84C' : 'transparent',
              border: `1px solid ${isDemoMode ? '#C9A84C' : '#2A2200'}`,
              borderRadius: '4px',
              padding: '3px 8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {t('nav.demoMode')}: {tx(isDemoMode ? t('nav.on') : t('nav.off'))}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {navItems.map((item, idx) => {
            const isActive = location.pathname === item.path
            const isFirstAdvanced = item.advanced && !navItems[idx - 1]?.advanced
            return (
              <span key={item.path} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {tx(isFirstAdvanced && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    margin: '0 6px 0 8px',
                  }}>
                    <span style={{ width: '1px', height: '20px', background: '#2A2200' }} />
                    <span style={{
                      fontFamily: "'Raleway', sans-serif",
                      fontSize: '8px',
                      color: '#8B6914',
                      letterSpacing: '0.2em',
                      writingMode: 'horizontal-tb',
                      whiteSpace: 'nowrap',
                    }}>{t('nav.advanced')}</span>
                  </span>
                ))}
              <button
                onClick={() => navigate(item.path)}
                style={{
                  background: isActive ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid transparent',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: isActive ? '#C9A84C' : '#8A7A5A',
                  fontFamily: "'Raleway', sans-serif",
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  letterSpacing: '0.05em',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#C9A84C'
                    e.currentTarget.style.background = 'rgba(201, 168, 76, 0.05)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#8A7A5A'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{tx(item.icon)}</span>
                {t(`nav.${item.key}`)}
              </button>
              </span>
            )
          })}
        </nav>

        {/* Status + conta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#1A6B3C',
              boxShadow: '0 0 6px rgba(26, 107, 60, 0.8)',
            }} />
            <span style={{
              fontFamily: "'Raleway', sans-serif",
              fontSize: '11px',
              color: '#8A7A5A',
              letterSpacing: '0.1em',
            }}>{companyName || tx('SISTEMA ATIVO')}</span>
          </div>
        </div>

        {/* Linha dourada embaixo do header */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
        }} />
      </header>

      {/* Conteúdo */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px',
      }}>
        {children}
      </main>
    </div>
  )
}
