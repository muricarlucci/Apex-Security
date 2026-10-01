import { useInterfaceText } from '../utils/interfaceText'
const config = {
  CRITICAL: { color: '#C0392B', bg: 'rgba(192, 57, 43, 0.15)', label: 'CRÍTICO' },
  HIGH: { color: '#D35400', bg: 'rgba(211, 84, 0, 0.15)', label: 'ALTO' },
  MEDIUM: { color: '#C9A84C', bg: 'rgba(201, 168, 76, 0.15)', label: 'MÉDIO' },
  LOW: { color: '#1A6B3C', bg: 'rgba(26, 107, 60, 0.15)', label: 'BAIXO' },
  INFO: { color: '#2C4A6B', bg: 'rgba(44, 74, 107, 0.15)', label: 'INFO' },
  UNKNOWN: { color: '#8A7A5A', bg: 'rgba(138, 122, 90, 0.15)', label: '?' },
}

export default function SeverityBadge({ severity }) {
  const tx = useInterfaceText()
  const s = config[severity?.toUpperCase()] || config.UNKNOWN
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.color}40`,
      borderRadius: '4px',
      padding: '2px 8px',
      fontSize: '11px',
      fontFamily: "'Raleway', sans-serif",
      fontWeight: '600',
      letterSpacing: '0.08em',
    }}>
      {tx(s.label)}
    </span>
  )
}
