/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
export default function StatCard({ label, value, sub, accent = false }) {
  return (
    <div style={{
      background: accent
        ? 'linear-gradient(135deg, #1A1400 0%, #111111 100%)'
        : '#111111',
      border: `1px solid ${accent ? '#C9A84C40' : '#2A2200'}`,
      borderRadius: '12px',
      padding: '24px',
      boxShadow: accent
        ? '0 4px 24px rgba(201, 168, 76, 0.12)'
        : '0 4px 24px rgba(201, 168, 76, 0.06)',
    }}>
      <div style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize: '11px',
        fontWeight: '500',
        color: '#8A7A5A',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginBottom: '12px',
      }}>{label}</div>
      <div style={{
        fontFamily: "'Cinzel', serif",
        fontSize: '36px',
        fontWeight: '700',
        color: accent ? '#C9A84C' : '#F0E6C8',
        lineHeight: 1,
        marginBottom: '6px',
        background: accent
          ? 'linear-gradient(135deg, #8B6914, #E8C97A)'
          : 'none',
        WebkitBackgroundClip: accent ? 'text' : 'unset',
        WebkitTextFillColor: accent ? 'transparent' : 'unset',
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '12px',
          color: '#8A7A5A',
        }}>{sub}</div>
      )}
    </div>
  )
}
