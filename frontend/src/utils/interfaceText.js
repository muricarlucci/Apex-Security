/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import i18n from '../i18n'
import { useTranslation } from 'react-i18next'

export const localeByLanguage = {
  pt: 'pt-BR', en: 'en-US', es: 'es-ES', zh: 'zh-CN',
  hi: 'hi-IN', fr: 'fr-FR', ja: 'ja-JP',
}

export function getInterfaceLocale() {
  return localeByLanguage[i18n.resolvedLanguage] || 'pt-BR'
}

// Translate presentation only. API values, source code and stored data keep their
// original form. Unknown user/scanner/AI content is returned unchanged.
export function translateInterface(value) {
  if (typeof value !== 'string' || i18n.resolvedLanguage === 'pt') return value
  const original = value.trim()
  const options = { ns: 'interface', keySeparator: false, nsSeparator: false }
  const resource = i18n.getResourceBundle('pt', 'interface') || {}
  let translated
  if (Object.hasOwn(resource, original)) {
    translated = i18n.t(original, options)
  } else {
    for (const source of Object.keys(resource)) {
      if (!source.includes('{{v')) continue
      if (source === '{{v0}} a {{v1}}' && !/^[\dR$€£¥.,\s-]+ a [\dR$€£¥.,\s-]+$/.test(original)) continue
      const variables = [...source.matchAll(/\{\{(v\d+)\}\}/g)].map(m => m[1])
      const parts = source.split(/\{\{v\d+\}\}/g)
      const escaped = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      const match = original.match(new RegExp('^' + escaped.join('([\\s\\S]*?)') + '$'))
      if (match) {
        const values = Object.fromEntries(variables.map((key, index) => [key, match[index + 1]]))
        translated = i18n.t(source, { ...options, ...values })
        break
      }
    }
  }
  if (translated === undefined) {
    // Action errors prepend a symbol to the original server message.
    const prefix = value.match(/^([✓✗⚠]\s+)([\s\S]*)$/)
    if (prefix) {
      const message = translateInterface(prefix[2])
      if (message !== prefix[2]) return prefix[1] + message
    }
    return value
  }
  const leading = value.match(/^\s*/)[0]
  const trailing = value.match(/\s*$/)[0]
  return leading + translated + trailing
}

export function useInterfaceText() {
  // Subscribe every page/component so existing result messages also change when
  // the language changes. Messages remain stored in their original Portuguese.
  useTranslation('interface')
  return translateInterface
}
