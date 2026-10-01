import { useInterfaceText } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../components/Card'
import { getMe } from '../services/api'

const labelStyle = {
  fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A',
  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px',
}

export default function Account() {
  const tx = useInterfaceText()
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    getMe()
      .then(res => setMe(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('api_key')
    localStorage.removeItem('company_name')
    navigate('/login')
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif", fontSize: '24px', fontWeight: '600',
          color: '#F0E6C8', letterSpacing: '0.05em', marginBottom: '4px',
        }}>{tx("Conta")}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Dados de acesso da sua empresa")}</p>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        {tx(loading ? (
          <div style={{ color: '#8A7A5A', fontFamily: 'Raleway', letterSpacing: '0.2em' }}>{tx("CARREGANDO...")}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={labelStyle}>{tx("Empresa")}</div>
              <div style={{ fontFamily: 'Inter', fontSize: '15px', color: '#F0E6C8' }}>
                {me?.company_name || '—'}
              </div>
            </div>
            <div>
              <div style={labelStyle}>{tx("E-mail")}</div>
              <div style={{ fontFamily: 'Inter', fontSize: '15px', color: '#F0E6C8' }}>
                {me?.email || '—'}
              </div>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ ...labelStyle, marginBottom: '12px' }}>{tx("Sessão")}</div>
        <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#8A7A5A', lineHeight: 1.7, marginBottom: '16px' }}>{tx("Encerrar a sessão remove o acesso deste navegador. Seus dados continuam salvos e voltam a aparecer no próximo login.")}</p>
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent', border: '1px solid #C0392B', borderRadius: '8px',
            padding: '10px 28px', color: '#C0392B', fontFamily: 'Raleway',
            fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192, 57, 43, 0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {t('auth.logout')}
        </button>
      </Card>
    </div>
  )
}
