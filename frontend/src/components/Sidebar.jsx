/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { languages } from '../i18n'
import { translateInterface as tx } from '../utils/interfaceText'

const menuItems = [
  { path: '/integration-key', key: 'integrationKey', icon: '⚿' },
  { path: '/account', key: 'account', icon: '◐' },
  { path: '/contact', key: 'contact', icon: '✉' },
  { path: '/notifications', key: 'notifications', icon: '◔' },
]

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()

  const go = (path) => {
    navigate(path)
    onClose()
  }

  const changeLanguage = (code) => {
    // O languagedetector persiste a escolha no localStorage automaticamente
    i18n.changeLanguage(code)
  }

  return (
    <>
      {/* Overlay — fecha ao clicar fora */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
          zIndex: 40,
        }}
      />

      {/* Painel deslizante */}
      <aside style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '300px',
        background: '#111111',
        borderRight: '1px solid #2A2200',
        boxShadow: open ? '4px 0 24px rgba(201, 168, 76, 0.08)' : 'none',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <img src="/apex-logo.png" alt="Apex Security" style={{ height: '32px' }} />
          <button
            onClick={onClose}
            aria-label={t('nav.closeMenu')}
            style={{
              background: 'transparent', border: 'none', color: '#8A7A5A',
              fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '4px 8px',
            }}
          >×</button>
        </div>

        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
          margin: '12px 0 20px',
        }} />

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {menuItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => go(item.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: isActive ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(201, 168, 76, 0.3)' : 'transparent'}`,
                  borderRadius: '8px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(201, 168, 76, 0.05)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{
                  fontSize: '15px',
                  color: isActive ? '#C9A84C' : '#8A7A5A',
                  width: '18px',
                  flexShrink: 0,
                }}>{item.icon}</span>
                <span>
                  <span style={{
                    display: 'block',
                    fontFamily: "'Raleway', sans-serif",
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? '#C9A84C' : '#F0E6C8',
                    letterSpacing: '0.03em',
                  }}>{t(`sidebar.${item.key}`)}</span>
                  <span style={{
                    display: 'block',
                    fontFamily: 'Inter',
                    fontSize: '11px',
                    color: '#8A7A5A',
                    marginTop: '1px',
                  }}>{t(`sidebar.${item.key}Desc`)}</span>
                </span>
              </button>
            )
          })}
        </nav>

        {/* Seletor de idioma */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, #2A2200, transparent)',
          margin: '20px 0 16px',
        }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px', padding: '0 14px', marginBottom: '10px',
        }}>
          <span style={{ fontSize: '15px', color: '#8A7A5A', width: '18px', flexShrink: 0 }}>⌘</span>
          <span>
            <span style={{
              display: 'block', fontFamily: "'Raleway', sans-serif", fontSize: '13px',
              fontWeight: '500', color: '#F0E6C8', letterSpacing: '0.03em',
            }}>{t('sidebar.language')}</span>
            <span style={{
              display: 'block', fontFamily: 'Inter', fontSize: '11px', color: '#8A7A5A', marginTop: '1px',
            }}>{t('sidebar.languageDesc')}</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {languages.map(lang => {
            const isCurrent = i18n.resolvedLanguage === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: isCurrent ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
                  border: `1px solid ${isCurrent ? 'rgba(201, 168, 76, 0.3)' : 'transparent'}`,
                  borderRadius: '6px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'rgba(201, 168, 76, 0.05)' }}
                onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: '14px', flexShrink: 0 }}>{lang.flag}</span>
                <span style={{
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  color: isCurrent ? '#C9A84C' : '#8A7A5A',
                  fontWeight: isCurrent ? '600' : '400',
                  flex: 1,
                }}>{tx(lang.label)}</span>
                {isCurrent && <span style={{ color: '#C9A84C', fontSize: '11px' }}>✓</span>}
              </button>
            )
          })}
        </div>
      </aside>
    </>
  )
}
