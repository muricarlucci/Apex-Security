/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
export const theme = {
  colors: {
    bgPrimary: '#0A0A0A',
    bgCard: '#111111',
    bgHover: '#1A1400',
    goldPrimary: '#C9A84C',
    goldLight: '#E8C97A',
    goldDark: '#8B6914',
    goldMuted: '#8A7A5A',
    textPrimary: '#F0E6C8',
    textSecondary: '#8A7A5A',
    border: '#2A2200',
    borderActive: '#C9A84C',
    critical: '#C0392B',
    high: '#D35400',
    medium: '#C9A84C',
    low: '#1A6B3C',
    info: '#2C4A6B',
    success: '#1A6B3C',
  },
  gradients: {
    gold: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 50%, #E8C97A 100%)',
    goldSubtle: 'linear-gradient(135deg, #1A1400 0%, #111111 100%)',
    divider: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
    header: 'linear-gradient(180deg, #111111 0%, #0A0A0A 100%)',
  },
  fonts: {
    display: "'Cinzel', serif",
    heading: "'Raleway', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  radius: {
    card: '12px',
    element: '8px',
    badge: '4px',
  },
  shadows: {
    card: '0 4px 24px rgba(201, 168, 76, 0.08)',
    cardHover: '0 8px 32px rgba(201, 168, 76, 0.16)',
    glow: '0 0 20px rgba(201, 168, 76, 0.3)',
  },
}

export const severityConfig = {
  CRITICAL: { color: '#C0392B', bg: 'rgba(192, 57, 43, 0.12)', label: 'CRÍTICO' },
  HIGH: { color: '#D35400', bg: 'rgba(211, 84, 0, 0.12)', label: 'ALTO' },
  MEDIUM: { color: '#C9A84C', bg: 'rgba(201, 168, 76, 0.12)', label: 'MÉDIO' },
  LOW: { color: '#1A6B3C', bg: 'rgba(26, 107, 60, 0.12)', label: 'BAIXO' },
  INFO: { color: '#2C4A6B', bg: 'rgba(44, 74, 107, 0.12)', label: 'INFO' },
  UNKNOWN: { color: '#8A7A5A', bg: 'rgba(138, 122, 90, 0.12)', label: 'DESCONHECIDO' },
}
