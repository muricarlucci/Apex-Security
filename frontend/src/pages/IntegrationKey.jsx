import { useInterfaceText } from '../utils/interfaceText'
import { useState, useEffect } from 'react'
import Card from '../components/Card'
import { getMe, regenerateApiKey } from '../services/api'

export default function IntegrationKey() {
  const tx = useInterfaceText()
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)

  useEffect(() => {
    getMe()
      .then(res => setApiKey(res.data.api_key))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    try {
      const res = await regenerateApiKey()
      setApiKey(res.data.api_key)
      setConfirmRegen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif", fontSize: '24px', fontWeight: '600',
          color: '#F0E6C8', letterSpacing: '0.05em', marginBottom: '4px',
        }}>{tx("Chave de Integração")}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Conecte seus repositórios do GitHub à plataforma")}</p>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px',
        }}>{tx("Sua chave")}</div>

        {tx(loading ? (
          <div style={{ color: '#8A7A5A', fontFamily: 'Raleway', letterSpacing: '0.2em' }}>{tx("CARREGANDO...")}</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
              <div style={{
                flex: 1,
                background: '#0A0A0A',
                border: '1px solid #2A2200',
                borderRadius: '8px',
                padding: '12px 14px',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '12px',
                color: '#E8C97A',
                wordBreak: 'break-all',
              }}>{apiKey}</div>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? 'rgba(26, 107, 60, 0.15)' : 'rgba(201, 168, 76, 0.1)',
                  border: `1px solid ${copied ? '#1A6B3C' : 'rgba(201, 168, 76, 0.3)'}`,
                  borderRadius: '8px',
                  padding: '0 20px',
                  color: copied ? '#1A6B3C' : '#C9A84C',
                  fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600',
                  letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                {tx(copied ? '✓ COPIADO' : 'COPIAR')}
              </button>
            </div>
          </>
        ))}
      </Card>

      <Card style={{ marginBottom: '24px' }}>
        <div style={{
          fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px',
        }}>{tx("Como usar")}</div>
        <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#F0E6C8', lineHeight: 1.8 }}>{tx("Adicione esta chave como o secret")}{tx(' ')}
          <code style={{ fontFamily: "'JetBrains Mono', monospace", color: '#C9A84C' }}>APEX_USER_API_KEY</code>{tx(' ')}{tx("nas configurações do seu repositório no GitHub (")}<strong style={{ color: '#E8C97A' }}>{tx("Settings → Secrets and variables → Actions")}</strong>{tx("). A partir daí, cada push executa os scanners e os alertas aparecem automaticamente nesta conta — e somente nela.")}</p>
      </Card>

      <Card>
        <div style={{
          fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px',
        }}>{tx("Gerar nova chave")}</div>
        <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#8A7A5A', lineHeight: 1.7, marginBottom: '16px' }}>
          <strong style={{ color: '#D35400' }}>{tx("Atenção:")}</strong>{tx(" gerar uma nova chave")}{tx(' ')}
          <strong style={{ color: '#F0E6C8' }}>{tx("invalida a anterior imediatamente")}</strong>{tx(". Os repositórios que usam a chave antiga param de enviar dados até que você atualize o secret no GitHub.")}</p>

        {tx(!confirmRegen ? (
          <button
            onClick={() => setConfirmRegen(true)}
            style={{
              background: 'transparent', border: '1px solid #D35400', borderRadius: '8px',
              padding: '10px 24px', color: '#D35400', fontFamily: 'Raleway',
              fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', cursor: 'pointer',
            }}
          >{tx("GERAR NOVA CHAVE")}</button>
        ) : (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              style={{
                background: '#D35400', border: 'none', borderRadius: '8px',
                padding: '10px 24px', color: '#0A0A0A', fontFamily: 'Raleway',
                fontSize: '12px', fontWeight: '700', letterSpacing: '0.08em',
                cursor: 'pointer', opacity: regenerating ? 0.5 : 1,
              }}
            >
              {tx(regenerating ? 'GERANDO...' : 'CONFIRMAR — INVALIDAR A ANTIGA')}
            </button>
            <button
              onClick={() => setConfirmRegen(false)}
              style={{
                background: 'transparent', border: '1px solid #2A2200', borderRadius: '8px',
                padding: '10px 20px', color: '#8A7A5A', fontFamily: 'Raleway',
                fontSize: '12px', fontWeight: '600', letterSpacing: '0.08em', cursor: 'pointer',
              }}
            >{tx("CANCELAR")}</button>
          </div>
        ))}
      </Card>
    </div>
  )
}
