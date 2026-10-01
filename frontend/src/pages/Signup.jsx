import { useInterfaceText } from '../utils/interfaceText'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup } from '../services/api'

const fieldStyle = {
  width: '100%',
  background: '#0A0A0A',
  border: '1px solid #2A2200',
  borderRadius: '8px',
  padding: '12px 14px',
  color: '#F0E6C8',
  fontSize: '13px',
  fontFamily: 'Inter',
  outline: 'none',
  transition: 'all 0.2s ease',
}

const labelStyle = {
  fontFamily: 'Raleway',
  fontSize: '11px',
  fontWeight: '600',
  color: '#8A7A5A',
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  marginBottom: '8px',
  display: 'block',
}

export default function Signup() {
  const tx = useInterfaceText()
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await signup(email, password, companyName)
      localStorage.setItem('access_token', res.data.access_token)
      localStorage.setItem('api_key', res.data.api_key)
      localStorage.setItem('company_name', res.data.company_name || '')
      setApiKey(res.data.api_key)
    } catch (err) {
      setError(err.response?.data?.detail || 'Não foi possível criar a conta.')
    } finally {
      setLoading(false)
    }
  }

  // Depois do signup: mostra a api_key em destaque antes de entrar no painel
  if (apiKey) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0A0A0A', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '24px',
      }}>
        <div style={{
          width: '100%', maxWidth: '560px', background: '#111111',
          border: '1px solid #2A2200', borderRadius: '12px', padding: '40px 32px',
          boxShadow: '0 4px 24px rgba(201, 168, 76, 0.08)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <img src="/apex-logo.png" alt="Apex Security" style={{ height: '48px', marginBottom: '20px' }} />
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', marginBottom: '20px' }} />
            <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '20px', color: '#F0E6C8', letterSpacing: '0.05em' }}>{tx("Conta criada")}</h1>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #1A1400 0%, #111111 100%)',
            border: '1px solid #C9A84C40',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <div style={{ ...labelStyle, marginBottom: '10px' }}>{tx("Sua chave de API")}</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#E8C97A',
              wordBreak: 'break-all',
              background: '#0A0A0A',
              border: '1px solid #2A2200',
              borderRadius: '8px',
              padding: '12px',
            }}>{apiKey}</div>
          </div>

          <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#F0E6C8', lineHeight: 1.7, marginBottom: '24px' }}>
            <strong style={{ color: '#E8C97A' }}>{tx("Guarde esta chave")}</strong>{tx(" — você vai precisar dela para conectar seu repositório GitHub. Adicione-a como secret")}{tx(' ')}
            <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C9A84C' }}>APEX_USER_API_KEY</code>{tx(' ')}{tx("nas configurações do seu repositório (Settings → Secrets and variables → Actions).")}</p>

          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 100%)',
              border: 'none', borderRadius: '8px', padding: '12px',
              color: '#0A0A0A', fontFamily: 'Raleway', fontSize: '13px',
              fontWeight: '700', letterSpacing: '0.1em', cursor: 'pointer',
            }}
          >{tx("IR PARA O PAINEL")}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0A0A0A', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', background: '#111111',
        border: '1px solid #2A2200', borderRadius: '12px', padding: '40px 32px',
        boxShadow: '0 4px 24px rgba(201, 168, 76, 0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/apex-logo.png" alt="Apex Security" style={{ height: '48px', marginBottom: '20px' }} />
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', marginBottom: '20px' }} />
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: '20px', fontWeight: '600', color: '#F0E6C8', letterSpacing: '0.05em' }}>{tx("Criar conta")}</h1>
          <p style={{ fontFamily: 'Raleway', fontSize: '12px', color: '#8A7A5A', marginTop: '4px' }}>{tx("Cada empresa vê apenas os próprios dados")}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{tx("Nome da empresa")}</label>
            <input
              type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required
              style={fieldStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{tx("E-mail")}</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={fieldStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>{tx("Senha")}</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              style={fieldStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
            />
          </div>

          {tx(error && (
            <div style={{
              background: 'rgba(192, 57, 43, 0.12)', border: '1px solid #C0392B40',
              borderRadius: '8px', padding: '10px 12px', color: '#C0392B',
              fontFamily: 'Inter', fontSize: '12px', marginBottom: '16px',
            }}>{tx(error)}</div>
          ))}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 100%)',
              border: 'none', borderRadius: '8px', padding: '12px',
              color: '#0A0A0A', fontFamily: 'Raleway', fontSize: '13px',
              fontWeight: '700', letterSpacing: '0.1em', cursor: 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {tx(loading ? 'CRIANDO...' : 'CRIAR CONTA')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontFamily: 'Inter', fontSize: '12px', color: '#8A7A5A' }}>{tx("Já tem conta? ")}<Link to="/login" style={{ color: '#C9A84C' }}>{tx("Entrar")}</Link>
        </div>
      </div>
    </div>
  )
}
