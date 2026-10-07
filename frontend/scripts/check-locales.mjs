/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'espree'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const languages = ['pt', 'en', 'es', 'zh', 'hi', 'fr', 'ja']
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'src/locales', name), 'utf8'))
const catalogs = languages.map(lang => read(`interface.${lang}.json`))
const keys = Object.keys(catalogs[0]).sort()
const variables = value => [...value.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).sort()
const flatten = (object, prefix = '') => Object.fromEntries(Object.entries(object).flatMap(([key, value]) =>
  typeof value === 'object' ? Object.entries(flatten(value, prefix + key + '.')) : [[prefix + key, value]]))
const base = flatten(read('pt.json'))
for (let i = 0; i < languages.length; i++) {
  assert.deepEqual(Object.keys(catalogs[i]).sort(), keys, `${languages[i]}: missing interface keys`)
  assert.deepEqual(Object.keys(flatten(read(`${languages[i]}.json`))).sort(), Object.keys(base).sort())
  const locale = flatten(read(`${languages[i]}.json`))
  for (const key of Object.keys(base)) {
    assert.ok(typeof locale[key] === 'string' && locale[key].trim(), `${languages[i]}: empty ${key}`)
    assert.deepEqual(variables(locale[key]), variables(base[key]), `${languages[i]}: interpolation ${key}`)
  }
  for (const key of keys) {
    assert.equal(typeof catalogs[i][key], 'string')
    assert.ok(catalogs[i][key].trim(), `${languages[i]}: empty ${key}`)
    assert.deepEqual(variables(catalogs[i][key]), variables(key), `${languages[i]}: interpolation ${key}`)
    if (i === 0) assert.equal(catalogs[i][key], key, `Portuguese changed: ${key}`)
  }
}
const technical = new Set([' ', 'Alerta #', 'ALERTA #', 'PR #', 'LGPD', 'R$ 5.000.000,00', 'Settings → Secrets and variables → Actions'])
const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return
  if (node.type) visit(node)
  for (const value of Object.values(node)) if (typeof value === 'object') {
    if (Array.isArray(value)) value.forEach(item => walk(item, visit))
    else walk(value, visit)
  }
}
let sources = 0
for (const folder of ['pages', 'components']) {
  for (const file of fs.readdirSync(path.join(root, 'src', folder)).filter(f => f.endsWith('.jsx'))) {
    const code = fs.readFileSync(path.join(root, 'src', folder, file), 'utf8')
    walk(parse(code, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } }), node => {
      if (node.type === 'CallExpression' && node.callee.name === 'tx' && node.arguments[0]?.type === 'Literal') {
        const value = node.arguments[0].value
        if (typeof value === 'string') {
          assert.ok(Object.hasOwn(catalogs[0], value.trim()) || technical.has(value), `${file}: untranslated ${value}`)
          sources++
        }
      }
    })
  }
}
console.log(`OK: ${languages.length} languages, ${keys.length} interface messages, ${sources} literal usages; Portuguese and placeholders preserved.`)
