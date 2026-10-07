/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../components/Card'
import SeverityBadge from '../components/SeverityBadge'
import { theme } from '../theme'
import { useDemoMode } from '../context/DemoContext'
import { getDastConfig, createDastScan, getDastScans, getDastScan } from '../services/api'
import { demoDastScans } from '../data/demoDast'

const pending = status => ['queued', 'running'].includes(status)
const inputStyle = { background: theme.colors.bgPrimary, border: `1px solid ${theme.colors.border}`, borderRadius: 8, color: theme.colors.textPrimary, padding: 12, fontFamily: theme.fonts.body, width: '100%', boxSizing: 'border-box' }
const buttonStyle = { ...inputStyle, width: 'auto', cursor: 'pointer', background: theme.gradients.gold, color: theme.colors.bgPrimary, fontWeight: 700 }

export default function Dast() {
  const { t, i18n } = useTranslation()
  const { isDemoMode } = useDemoMode()
  const [config, setConfig] = useState(null)
  const [kind, setKind] = useState('lab')
  const [url, setUrl] = useState('')
  const [ack, setAck] = useState(false)
  const [mode, setMode] = useState('baseline')
  const [scan, setScan] = useState(null)
  const [history, setHistory] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(null)
  const submitting = useRef(false)
  let host = ''
  try { host = new URL(url).hostname.toLowerCase().replace(/\.$/, '') } catch { /* Validate on submission too. */ }
  const activeAllowed = Boolean(config?.active_enabled && (kind === 'lab' || config.training_hosts.includes(host)))
  const errorKey = e => ({ 400: 'invalid', 409: 'inProgress', 429: 'limit', 503: 'notConfigured', 502: 'dispatchError' }[e.response?.status] || 'connectionError')
  const formatDate = value => value ? new Date(value).toLocaleString(i18n.resolvedLanguage || 'pt') : '—'

  useEffect(() => { if (!activeAllowed) setMode('baseline') }, [activeAllowed])
  useEffect(() => {
    setError(''); setScan(null); setConfig(null); setHistory([])
    if (isDemoMode) {
      setConfig({ configured: true, active_enabled: true, training_hosts: ['testphp.vulnweb.com', 'demo.testfire.net', 'public-firing-range.appspot.com'], daily_limit: 5, remaining_today: 5 })
      setHistory(demoDastScans)
      return
    }
    const controller = new AbortController()
    Promise.all([getDastConfig(controller.signal), getDastScans(controller.signal)]).then(([settings, scans]) => {
      if (controller.signal.aborted) return
      setConfig(settings.data); setHistory(scans.data)
      setScan(scans.data.find(item => pending(item.status)) || null)
    }).catch(e => { if (!controller.signal.aborted) setError(errorKey(e)) })
    return () => { controller.abort(); request.current?.abort(); submitting.current = false }
  }, [isDemoMode])

  useEffect(() => {
    if (!scan || !pending(scan.status)) return
    const controller = new AbortController()
    const update = next => {
      setScan(next)
      setHistory(items => [next, ...items.filter(item => item.id !== next.id)].slice(0, 20))
    }
    if (isDemoMode) {
      const running = setTimeout(() => update({ ...scan, status: 'running', started_at: new Date().toISOString() }), 1000)
      const finished = setTimeout(() => update({ ...scan, status: 'completed', started_at: scan.started_at || new Date().toISOString(), finished_at: new Date().toISOString(), alerts_count: scan.mode === 'full' ? 5 : 3, counts: scan.mode === 'full' ? { HIGH: 2, MEDIUM: 1, LOW: 1, INFO: 1 } : { HIGH: 0, MEDIUM: 1, LOW: 1, INFO: 1 }, zap_version: 'Demo' }), 3500)
      return () => { clearTimeout(running); clearTimeout(finished) }
    }
    let fetching = false
    const timer = setInterval(async () => {
      if (fetching) return
      fetching = true
      try {
        const response = await getDastScan(scan.id, controller.signal)
        if (controller.signal.aborted) return
        update(response.data)
        setError('')
        if (!pending(response.data.status)) {
          clearInterval(timer)
          const settings = await getDastConfig(controller.signal)
          if (!controller.signal.aborted) setConfig(settings.data)
        }
      } catch (e) { if (!controller.signal.aborted) setError(errorKey(e)) }
      finally { fetching = false }
    }, 10000)
    return () => { clearInterval(timer); controller.abort() }
  }, [scan?.id, scan?.status, isDemoMode])

  const start = async () => {
    if (submitting.current) return
    submitting.current = true; setBusy(true); setError('')
    try {
      let next
      if (isDemoMode) {
        next = { id: Date.now(), target_kind: kind, target_url: kind === 'lab' ? 'http://localhost:3000' : url, target_label: kind === 'lab' ? t('dast.lab') : url, mode, status: 'queued', requested_at: new Date().toISOString(), alerts_count: 0, counts: {} }
      } else {
        request.current = new AbortController()
        const response = await createDastScan({ target_kind: kind, target_url: kind === 'custom' ? url : undefined, mode, authorization_ack: ack }, request.current.signal)
        next = response.data
      }
      setScan(next); setHistory(items => [next, ...items].slice(0, 20))
      setConfig(previous => ({ ...previous, remaining_today: Math.max(0, previous.remaining_today - 1) }))
    } catch (e) { if (!request.current?.signal.aborted) setError(errorKey(e)) }
    finally { setBusy(false); submitting.current = false }
  }
  const duration = scan?.finished_at ? Math.max(0, Math.round((new Date(scan.finished_at) - new Date(scan.started_at || scan.requested_at)) / 1000)) : null
  const disabled = busy || !config?.configured || config.remaining_today === 0 || history.some(item => pending(item.status)) || (kind === 'custom' && (!ack || !host)) || (mode === 'full' && !activeAllowed)
  return (
    <div style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.body }}>
      <h1 style={{ fontFamily: theme.fonts.display }}>{t('dast.title')}</h1>
      <p style={{ color: theme.colors.textSecondary }}>{t('dast.intro')}</p>
      <Card style={{ marginBottom: 20 }}><p>{t('dast.authorizationHelp')}</p><small>{t('dast.timeHelp')}</small></Card>
      {error && <p role="alert" style={{ color: theme.colors.critical }}>{t(`dast.${error}`)}</p>}
      {config && !config.configured && <Card><p>{t('dast.notConfigured')}</p></Card>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0' }}>
        {['lab', 'custom'].map(value => <button key={value} type="button" onClick={() => setKind(value)} aria-pressed={kind === value} style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', borderColor: kind === value ? theme.colors.goldPrimary : theme.colors.border }}>
          <strong>{t(`dast.${value}`)}</strong><p style={{ color: theme.colors.textSecondary }}>{t(`dast.${value}Help`)}</p>
        </button>)}
      </div>
      {kind === 'custom' && <Card style={{ marginBottom: 20 }}>
        <label>{t('dast.url')}<input value={url} onChange={event => setUrl(event.target.value)} maxLength={2048} placeholder="https://example.com" style={{ ...inputStyle, margin: '10px 0' }} /></label>
        <label><input type="checkbox" checked={ack} onChange={event => setAck(event.target.checked)} /> {t('dast.ack')}</label>
      </Card>}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        <label><input type="radio" name="dast-mode" value="baseline" checked={mode === 'baseline'} onChange={() => setMode('baseline')} /> {t('dast.baseline')}</label>
        <label title={!activeAllowed ? t('dast.activeHelp') : undefined}><input type="radio" name="dast-mode" value="full" checked={mode === 'full'} disabled={!activeAllowed} onChange={() => setMode('full')} /> {t('dast.full')}</label>
      </div>
      <p style={{ color: theme.colors.textSecondary }}>{t('dast.activeHelp')}</p>
      <button style={{ ...buttonStyle, opacity: disabled ? 0.5 : 1 }} disabled={disabled} onClick={start}>{t(busy ? 'dast.starting' : 'dast.start')}</button>
      {config && <p style={{ color: theme.colors.textSecondary }}>{t('dast.remaining', { remaining: config.remaining_today, limit: config.daily_limit })}</p>}
      {scan && <Card style={{ margin: '24px 0' }}>
        <h2>{scan.target_kind === 'lab' ? t('dast.lab') : scan.target_label}</h2>
        <p role="status">{t(`dast.status.${scan.status}`)} · {t(`dast.${scan.mode}`)}</p>
        <ol style={{ display: 'flex', gap: 25, flexWrap: 'wrap', color: theme.colors.textSecondary }}>{['queued', 'running', 'processing', 'completed'].map(stage => <li key={stage} aria-current={scan.status === stage ? 'step' : undefined} style={{ color: scan.status === stage ? theme.colors.goldPrimary : undefined }}>{t(`dast.status.${stage}`)}</li>)}</ol>
        <p>{t('dast.requested')}: {formatDate(scan.requested_at)}</p>
        {!isDemoMode && scan.actions_url && <a href={scan.actions_url} target="_blank" rel="noopener noreferrer" style={{ color: theme.colors.goldPrimary }}>{t('dast.actions')}</a>}
        {scan.status === 'completed' && <>
          <p>{t('dast.summary', { count: scan.alerts_count })}</p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>{['HIGH', 'MEDIUM', 'LOW', 'INFO'].map(severity => <span key={severity}><SeverityBadge severity={severity} />: {scan.counts?.[severity] || 0}</span>)}</div>
          <p>{t('dast.duration', { seconds: duration })} · {t('dast.version')}: {scan.zap_version || '—'}</p>
          <Link to="/alerts?tool=zap" style={{ color: theme.colors.goldPrimary }}>{t('dast.openAlerts')}</Link>
        </>}
        {['failed', 'timeout'].includes(scan.status) && <p style={{ color: theme.colors.critical }}>{t(scan.status === 'timeout' ? 'dast.timeoutHelp' : 'dast.failedHelp')}</p>}
      </Card>}
      <h2>{t('dast.history')}</h2>
      {!history.length && <p>{t('dast.empty')}</p>}
      {history.map(item => <button key={item.id} onClick={() => setScan(item)} style={{ ...inputStyle, cursor: 'pointer', textAlign: 'left', marginBottom: 8 }}>{item.target_kind === 'lab' ? t('dast.lab') : item.target_label} · {t(`dast.status.${item.status}`)} · {formatDate(item.requested_at)}</button>)}
    </div>
  )
}
