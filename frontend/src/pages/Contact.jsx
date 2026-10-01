import { useInterfaceText } from '../utils/interfaceText'
import { useState } from 'react'
import Card from '../components/Card'
import { sendContact } from '../services/api'

const labelStyle = {
  fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A',
  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px', display: 'block',
}

const fieldStyle = {
  width: '100%', background: '#0A0A0A', border: '1px solid #2A2200',
  borderRadius: '8px', padding: '11px 13px', color: '#F0E6C8',
  fontSize: '13px', fontFamily: 'Inter', outline: 'none', transition: 'all 0.2s ease',
}

export default function Contact() {
  const tx = useInterfaceText()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setResult(null)
    try {
      await sendContact(form)
      setResult({ ok: true, msg: '✓ Mensagem enviada com sucesso — responderemos no e-mail informado.' })
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      setResult({ ok: false, msg: err.response?.data?.detail || '✗ Não foi possível enviar a mensagem.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif", fontSize: '24px', fontWeight: '600',
          color: '#F0E6C8', letterSpacing: '0.05em', marginBottom: '4px',
        }}>{tx("Contato")}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Fale com a equipe da Apex Security")}</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>{tx("Nome")}</label>
              <input
                type="text" value={form.name} onChange={set('name')} required style={fieldStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
              />
            </div>
            <div>
              <label style={labelStyle}>{tx("E-mail")}</label>
              <input
                type="email" value={form.email} onChange={set('email')} required style={fieldStyle}
                onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{tx("Assunto")}</label>
            <input
              type="text" value={form.subject} onChange={set('subject')} required style={fieldStyle}
              onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>{tx("Mensagem")}</label>
            <textarea
              value={form.message} onChange={set('message')} required rows={6}
              style={{ ...fieldStyle, resize: 'vertical' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
            />
          </div>

          {tx(result && (
            <div style={{
              background: result.ok ? 'rgba(26, 107, 60, 0.12)' : 'rgba(192, 57, 43, 0.12)',
              border: `1px solid ${result.ok ? '#1A6B3C' : '#C0392B'}40`,
              borderRadius: '8px', padding: '10px 12px',
              color: result.ok ? '#1A6B3C' : '#C0392B',
              fontFamily: 'Inter', fontSize: '12px', marginBottom: '16px',
            }}>{tx(result.msg)}</div>
          ))}

          <button
            type="submit" disabled={sending}
            style={{
              background: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 100%)',
              border: 'none', borderRadius: '8px', padding: '12px 32px',
              color: '#0A0A0A', fontFamily: 'Raleway', fontSize: '13px',
              fontWeight: '700', letterSpacing: '0.1em', cursor: 'pointer',
              opacity: sending ? 0.5 : 1,
            }}
          >
            {tx(sending ? 'ENVIANDO...' : 'ENVIAR')}
          </button>
        </form>
      </Card>
    </div>
  )
}
