/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
})

// One promise per operation/input/session. Other tabs are protected by the
// backend's PostgreSQL lock. No retries of failed HTTP requests are performed.
const geminiPending = new Map()
export const cancelGeminiRequests = () => {
  for (const entry of geminiPending.values()) entry.controller.abort()
  geminiPending.clear()
}
window.addEventListener('pagehide', cancelGeminiRequests)
const geminiRequest = (url, data) => {
  const key = JSON.stringify([localStorage.getItem('access_token'), url, data])
  if (geminiPending.has(key)) return geminiPending.get(key).promise
  // Backend Gemini budget: 45s; allow Render cold start plus network margin.
  const controller = new AbortController()
  const config = { timeout: 120000, signal: controller.signal, headers: { 'Cache-Control': 'no-cache' } }
  const request = (data === undefined ? api.get(url, config) : api.post(url, data, config))
    .finally(() => {
      if (geminiPending.get(key)?.promise === request) geminiPending.delete(key)
    })
  geminiPending.set(key, { promise: request, controller })
  return request
}

// Anexa o JWT em toda requisicao. O localStorage e a unica excecao ao padrao
// de nao usar storage no projeto — aqui e necessario para persistir a sessao.
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Sessao expirada ou invalida -> limpa e manda para o login
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const signup = (email, password, companyName) =>
  api.post('/auth/signup', { email, password, company_name: companyName })
export const login = (email, password) => api.post('/auth/login', { email, password })
export const getMe = () => api.get('/auth/me')
export const createSLAAssessment = (alertId) => geminiRequest(`/sla-assessment/${alertId}`, {})
export const getRadar = () => geminiRequest('/radar')
export const regenerateApiKey = () => api.post('/auth/regenerate-key')
export const saveDiscordWebhook = (webhookUrl) => api.post('/auth/discord-webhook', { webhook_url: webhookUrl })
export const testDiscordWebhook = () => api.post('/auth/discord-webhook/test')
export const sendContact = (data) => api.post('/contact', data)

export const getAlerts = (params = {}) => api.get('/alerts', { params })
export const getAlert = (id) => api.get(`/alerts/${id}`)
export const getStats = () => api.get('/stats')
export const remediate = (alertId) => geminiRequest(`/remediate/${alertId}`, {})
export const getRemediation = (alertId) => api.get(`/remediations/${alertId}`)
export const getRemediations = () => api.get('/remediations')
export const createPR = (alertId) => api.post(`/pull-request/${alertId}`)
export const getAnomalyAnalysis = () => api.get('/anomaly-analysis')
export const checkIntent = (commitMessage, codeDiff) =>
  geminiRequest('/intent-check', { commit_message: commitMessage, code_diff: codeDiff })
export const getCompanyProfile = () => api.get('/company-profile')
export const saveCompanyProfile = (data) => api.post('/company-profile', data)
export const createRiskAssessment = (alertId) => geminiRequest(`/risk-assessment/${alertId}`, {})
export const getRiskAssessments = () => api.get('/risk-assessments')
export const getRiskAssessment = (alertId) => api.get(`/risk-assessment/${alertId}`)
export const getPRs = () => api.get('/pull-requests')
export const updatePRStatus = (prId, status, approvedBy) =>
  api.patch(`/pull-request/${prId}/status`, null, { params: { status, approved_by: approvedBy } })

export default api

// DAST only orchestrates GitHub Actions; keep the ordinary API timeout.
export const getDastConfig = signal => api.get('/dast/config', { signal })
export const createDastScan = (data, signal) => api.post('/dast/scans', data, { signal })
export const getDastScans = signal => api.get('/dast/scans', { signal })
export const getDastScan = (id, signal) => api.get(`/dast/scans/${id}`, { signal })
