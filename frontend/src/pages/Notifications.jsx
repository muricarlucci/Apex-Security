import { useInterfaceText } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import Card from '../components/Card'
import { getMe, saveDiscordWebhook, testDiscordWebhook } from '../services/api'

const labelStyle = {
  fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A',
  letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px', display: 'block',
}

const fieldStyle = {
  width: '100%', background: '#0A0A0A', border: '1px solid #2A2200',
  borderRadius: '8px', padding: '11px 13px', color: '#F0E6C8',
  fontSize: '12px', fontFamily: "'JetBrains Mono', monospace",
  outline: 'none', transition: 'all 0.2s ease',
}

export default function Notifications() {
  const tx = useInterfaceText()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    getMe()
      .then(res => setWebhookUrl(res.data.discord_webhook_url || ''))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setResult(null)
    try {
      await saveDiscordWebhook(webhookUrl)
      setResult({ ok: true, msg: '✓ Webhook salvo — novos alertas serão notificados no seu canal.' })
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.detail || '✗ Não foi possível salvar o webhook.' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setResult(null)
    try {
      await testDiscordWebhook()
      setResult({ ok: true, msg: '✓ Notificação de teste enviada — confira o canal no Discord.' })
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.detail || '✗ Falha ao enviar — verifique a URL.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif", fontSize: '24px', fontWeight: '600',
          color: '#F0E6C8', letterSpacing: '0.05em', marginBottom: '4px',
        }}>{tx("Notificações")}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Receba alertas novos direto no seu canal do Discord")}</p>
      </div>

      <Card style={{ marginBottom: '24px', borderLeft: '2px solid #8B6914' }}>
        <div style={{ ...labelStyle, marginBottom: '10px' }}>{tx("Como obter a URL do webhook")}</div>
        <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#F0E6C8', lineHeight: 1.8 }}>{tx("No Discord, abra as ")}<strong style={{ color: '#E8C97A' }}>{tx("Configurações do Canal")}</strong> →{tx(' ')}
          <strong style={{ color: '#E8C97A' }}>{tx("Integrações")}</strong> →{tx(' ')}
          <strong style={{ color: '#E8C97A' }}>{tx("Webhooks")}</strong> →{tx(' ')}
          <strong style={{ color: '#E8C97A' }}>{tx("Criar Webhook")}</strong>{tx(" → copie a URL gerada e cole abaixo.")}</p>
      </Card>

      <Card>
        <label style={labelStyle}>{tx("URL do webhook")}</label>
        {tx(loading ? (
          <div style={{ color: '#8A7A5A', fontFamily: 'Raleway', letterSpacing: '0.2em' }}>{tx("CARREGANDO...")}</div>
        ) : (
          <>
            <input
              type="text"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              style={{ ...fieldStyle, marginBottom: '16px' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
            />

            {result && (
              <div style={{
                background: result.ok ? 'rgba(26, 107, 60, 0.12)' : 'rgba(192, 57, 43, 0.12)',
                border: `1px solid ${result.ok ? '#1A6B3C' : '#C0392B'}40`,
                borderRadius: '8px', padding: '10px 12px',
                color: result.ok ? '#1A6B3C' : '#C0392B',
                fontFamily: 'Inter', fontSize: '12px', marginBottom: '16px',
              }}>{tx(result.msg)}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSave}
                disabled={saving || !webhookUrl.trim()}
                style={{
                  background: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 100%)',
                  border: 'none', borderRadius: '8px', padding: '11px 28px',
                  color: '#0A0A0A', fontFamily: 'Raleway', fontSize: '12px',
                  fontWeight: '700', letterSpacing: '0.08em', cursor: 'pointer',
                  opacity: (saving || !webhookUrl.trim()) ? 0.5 : 1,
                }}
              >
                {tx(saving ? 'SALVANDO...' : 'SALVAR')}
              </button>
              <button
                onClick={handleTest}
                disabled={testing || !webhookUrl.trim()}
                style={{
                  background: 'transparent', border: '1px solid rgba(201, 168, 76, 0.3)',
                  borderRadius: '8px', padding: '11px 24px', color: '#C9A84C',
                  fontFamily: 'Raleway', fontSize: '12px', fontWeight: '600',
                  letterSpacing: '0.08em', cursor: 'pointer',
                  opacity: (testing || !webhookUrl.trim()) ? 0.5 : 1,
                }}
              >
                {tx(testing ? 'ENVIANDO...' : 'TESTAR NOTIFICAÇÃO')}
              </button>
            </div>
          </>
        ))}
      </Card>
    </div>
  )
}
