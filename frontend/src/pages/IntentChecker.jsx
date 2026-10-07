/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { useInterfaceText } from '../utils/interfaceText'
import { useState } from 'react'
import Card from '../components/Card'
import { checkIntent } from '../services/api'
import { useDemoMode, demoDelay } from '../context/DemoContext'
import { demoIntentResult } from '../data/demoData'

const examples = {
  honest: {
    message: 'fix: corrigir mensagem de erro no formulario de login',
    diff: '- errorMsg = "Erro"\n+ errorMsg = "Usuario ou senha invalidos"',
  },
  suspicious: {
    message: 'fix: corrigir typo no texto',
    diff: "+ aws_key = 'AKIAIOSFODNN7EXAMPLE'\n+ os.system('rm -rf /')",
  },
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

const fieldStyle = {
  width: '100%',
  background: '#0A0A0A',
  border: '1px solid #2A2200',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#F0E6C8',
  fontSize: '13px',
  outline: 'none',
  transition: 'all 0.2s ease',
}

export default function IntentChecker() {
  const tx = useInterfaceText()
  const [commitMessage, setCommitMessage] = useState('')
  const [codeDiff, setCodeDiff] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const { isDemoMode } = useDemoMode()

  const handleCheck = async () => {
    if (!commitMessage.trim() || !codeDiff.trim()) return
    setLoading(true)

    // MODO DEMO: resultado ficticio local, sem chamada de API
    if (isDemoMode) {
      await demoDelay(500)
      setResult(demoIntentResult)
      setLoading(false)
      return
    }

    try {
      const res = await checkIntent(commitMessage, codeDiff)
      setResult(res.data)
    } catch (e) {
      console.error(e)
      setResult({ consistent: true, confidence: 0, explanation: 'Erro ao consultar a API — verifique se o backend está no ar.' })
    } finally {
      setLoading(false)
    }
  }

  const loadExample = (key) => {
    setCommitMessage(examples[key].message)
    setCodeDiff(examples[key].diff)
    setResult(null)
  }

  return (
    <div>
      {/* Título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '24px',
          fontWeight: '600',
          color: '#F0E6C8',
          letterSpacing: '0.05em',
          marginBottom: '4px',
        }}>{tx("Verificador de Intenção")}</h1>
        <p style={{ color: '#8A7A5A', fontFamily: 'Raleway', fontSize: '13px' }}>{tx("Verifique se o código de um commit realmente corresponde ao que foi declarado")}</p>
      </div>

      {/* Cabeçalho explicativo — informativo, nunca bloqueia */}
      <Card style={{ marginBottom: '24px', borderLeft: '2px solid #8B6914' }}>
        <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#F0E6C8', lineHeight: 1.7 }}>{tx("Esta é uma verificação de auditoria de intenção: compara a mensagem de commit declarada com o código real alterado, usando IA generativa para identificar divergências suspeitas. Este é um")}{tx(' ')}
          <strong style={{ color: '#E8C97A' }}>{tx("alerta informativo")}</strong>{tx(" — nunca bloqueia Pull Requests ou merges automaticamente.")}</p>
      </Card>

      {/* Botões de exemplo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => loadExample('honest')}
          style={{
            background: 'transparent',
            border: '1px solid #1A6B3C',
            borderRadius: '6px',
            padding: '6px 14px',
            color: '#1A6B3C',
            fontFamily: 'Raleway',
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >{tx("EXEMPLO: COMMIT HONESTO")}</button>
        <button
          onClick={() => loadExample('suspicious')}
          style={{
            background: 'transparent',
            border: '1px solid #C0392B',
            borderRadius: '6px',
            padding: '6px 14px',
            color: '#C0392B',
            fontFamily: 'Raleway',
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >{tx("EXEMPLO: COMMIT SUSPEITO")}</button>
      </div>

      {/* Formulário em duas colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <Card>
          <label style={labelStyle}>{tx("Mensagem do commit")}</label>
          <input
            type="text"
            value={commitMessage}
            onChange={e => setCommitMessage(e.target.value)}
            placeholder={tx("ex: fix: corrigir validacao de e-mail")}
            style={{ ...fieldStyle, fontFamily: 'Inter' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
          />
        </Card>
        <Card>
          <label style={labelStyle}>{tx("Diff do código")}</label>
          <textarea
            value={codeDiff}
            onChange={e => setCodeDiff(e.target.value)}
            placeholder={'- linha removida\n+ linha adicionada'}
            rows={6}
            style={{ ...fieldStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', resize: 'vertical' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#C9A84C' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#2A2200' }}
          />
        </Card>
      </div>

      {/* Botão analisar */}
      <button
        onClick={handleCheck}
        disabled={loading || !commitMessage.trim() || !codeDiff.trim()}
        style={{
          background: 'linear-gradient(135deg, #8B6914 0%, #C9A84C 100%)',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 32px',
          color: '#0A0A0A',
          fontFamily: 'Raleway',
          fontSize: '13px',
          fontWeight: '700',
          letterSpacing: '0.1em',
          cursor: 'pointer',
          opacity: (loading || !commitMessage.trim() || !codeDiff.trim()) ? 0.5 : 1,
          transition: 'all 0.2s ease',
          marginBottom: '24px',
        }}
      >
        {tx(loading ? 'ANALISANDO...' : 'ANALISAR CONSISTÊNCIA')}
      </button>

      {/* Resultado */}
      {tx(result && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <span style={{
              background: result.consistent ? 'rgba(26, 107, 60, 0.15)' : 'rgba(192, 57, 43, 0.15)',
              color: result.consistent ? '#1A6B3C' : '#C0392B',
              border: `1px solid ${result.consistent ? '#1A6B3C' : '#C0392B'}`,
              borderRadius: '8px',
              padding: '10px 24px',
              fontFamily: "'Cinzel', serif",
              fontSize: '16px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              boxShadow: result.consistent
                ? '0 0 16px rgba(26, 107, 60, 0.25)'
                : '0 0 16px rgba(192, 57, 43, 0.25)',
            }}>
              {tx(result.consistent ? '✓ CONSISTENTE' : '✗ DIVERGÊNCIA DETECTADA')}
            </span>
            <span style={{ fontFamily: 'Raleway', fontSize: '13px', color: '#8A7A5A' }}>{tx("Confiança:")}{tx(' ')}
              <strong style={{ color: '#E8C97A', fontFamily: 'JetBrains Mono' }}>{tx(result.confidence)}%</strong>
            </span>
          </div>
          <Card>
            <div style={{ fontFamily: 'Raleway', fontSize: '11px', fontWeight: '600', color: '#8A7A5A', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>{tx("Explicação da análise")}</div>
            <p style={{ fontFamily: 'Inter', fontSize: '13px', color: '#F0E6C8', lineHeight: 1.7 }}>
              {tx(result.explanation)}
            </p>
          </Card>
        </div>
      ))}
    </div>
  )
}
