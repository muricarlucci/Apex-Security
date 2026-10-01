// In-memory bundle + intercepted browser requests. No server or external API.
// APEX_PLAYWRIGHT_MODULE may point to a preinstalled Playwright package.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { build } from 'vite'
import react from '@vitejs/plugin-react'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.APEX_PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repo = path.dirname(root)
const baseline = process.env.APEX_BASELINE_REF || '796987e'
const source = path.join(root, 'src').replaceAll('\\', '/')
const entry = path.join(root, 'scripts/language-check-entry.jsx').replaceAll('\\', '/')
const baselineFiles = execFileSync('git', ['-c', `safe.directory=${repo}`, 'diff', '--name-only', baseline, '--', 'frontend/src'], { cwd: repo, encoding: 'utf8' }).trim().split('\n')
  .filter(file => /\.(jsx|js)$/.test(file))
const originals = new Map(baselineFiles.map(file => [path.join(repo, file).replaceAll('\\', '/'), execFileSync('git', ['-c', `safe.directory=${repo}`, 'show', `${baseline}:${file}`], { cwd: repo, encoding: 'utf8' })]))
const fakeAPI = `
import * as data from '${source}/data/demoData.js';
const answer = (name, value, args=[]) => { window.__apiCalls.push({name,args}); return Promise.resolve({data:value}); };
const me={email:'fixture@example.test',company_name:'Empresa de Teste',api_key:'test-only-key',discord_webhook_url:''};
export const getMe=()=>answer('getMe',me);
export const getStats=()=>answer('getStats',data.demoStats);
export const getAlerts=(...a)=>answer('getAlerts',data.demoAlerts,a);
export const getAlert=()=>answer('getAlert',data.demoAlerts[0]);
export const getRemediations=()=>answer('getRemediations',data.demoRemediations);
export const getRemediation=()=>answer('getRemediation',data.demoRemediations[0]);
export const remediate=()=>answer('remediate',data.demoRemediations[0]);
export const getPRs=()=>answer('getPRs',data.demoPullRequests);
export const createPR=()=>answer('createPR',{pr_url:data.demoPullRequests[0].pr_url});
export const updatePRStatus=(...a)=>answer('updatePRStatus',{},a);
export const getCompanyProfile=()=>answer('getCompanyProfile',data.demoCompanyProfile);
export const saveCompanyProfile=(...a)=>answer('saveCompanyProfile',{},a);
export const getRiskAssessments=()=>answer('getRiskAssessments',data.demoRiskAssessments);
export const getRiskAssessment=()=>answer('getRiskAssessment',data.demoRiskAssessments[0]);
export const createRiskAssessment=()=>answer('createRiskAssessment',data.demoRiskAssessments[0]);
export const createSLAAssessment=()=>answer('createSLAAssessment',data.demoRiskAssessments[0]);
export const getAnomalyAnalysis=()=>answer('getAnomalyAnalysis',data.demoAnomalyAnalysis);
export const checkIntent=(...a)=>answer('checkIntent',data.demoIntentResult,a);
export const getRadar=()=>answer('getRadar',{report:data.demoRadarReport,generated_at:'2026-10-01T12:00:00Z'});
export const sendContact=(...a)=>answer('sendContact',{},a);
export const saveDiscordWebhook=(...a)=>answer('saveDiscordWebhook',{},a);
export const testDiscordWebhook=()=>answer('testDiscordWebhook',{});
export const regenerateApiKey=()=>answer('regenerateApiKey',{api_key:'test-only-new-key'});
export const signup=(...a)=>answer('signup',{},a);
export const login=(...a)=>answer('login',{access_token:'fake-session'},a);
export default {};
`
async function bundle(previous) {
  const entryCode = `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from '${source}/App.jsx'; import {DemoProvider} from '${source}/context/DemoContext.jsx';
import i18n from '${source}/i18n.js'; import '${source}/index.css';
${previous ? '' : `import {translateInterface} from '${source}/utils/interfaceText.js'; import * as pdf from '${source}/utils/pdfReport.js'; window.__tx=translateInterface;window.__pdf=pdf;`}
window.__i18n=i18n;window.__apiCalls=[];
createRoot(document.getElementById('root')).render(<BrowserRouter><DemoProvider><App/></DemoProvider></BrowserRouter>);`
  const result = await build({ root, configFile: false, logLevel: 'error', define: { 'process.env.NODE_ENV': '"production"' }, plugins: [{
    name: 'offline-language-fixtures', enforce: 'pre',
    resolveId(id) { if (id.toLowerCase() === entry.toLowerCase()) return entry },
    load(id) {
      const clean = id.split('?')[0].replaceAll('\\', '/')
      if (clean.toLowerCase() === entry.toLowerCase()) return entryCode
      if (clean.toLowerCase() === (source + '/services/api.js').toLowerCase()) return fakeAPI
      if (previous) for (const [name, code] of originals) if (name.toLowerCase() === clean.toLowerCase()) return code
    },
  }, react()], build: { write: false, minify: false, lib: { entry, name: 'LanguageCheck', formats: ['iife'] },
    } })
  const output = (Array.isArray(result) ? result[0] : result).output
  const js = output.filter(file => file.type === 'chunk').map(file => file.code).join('\n')
  new vm.Script(js, { filename: 'language-fixture.js' })
  const css = output.filter(file => file.fileName.endsWith('.css')).map(file => file.source).join('\n')
  return { html: `<html lang="pt"><head><meta charset="utf-8"><style>${css}</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>`, js }
}
const routes = ['/', '/alerts', '/remediations', '/pull-requests', '/real-risk', '/repositories', '/anomaly-analysis', '/intent-checker', '/radar', '/integration-key', '/account', '/contact', '/notifications', '/login', '/signup']
const languages = ['pt', 'en', 'es', 'zh', 'hi', 'fr', 'ja']
const nativeNames = ['Português', 'English', 'Español', '中文', 'हिन्दी', 'Français', '日本語']
const snapshots = new Map()
let checks = 0
const errors = [], network = []
const browser = await chromium.launch({ headless: true, ...(fs.existsSync(chromium.executablePath()) ? {} : { channel: 'chrome' }) })
async function context(bundle, lang) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  await context.addInitScript(({lang}) => {
    localStorage.setItem('access_token','fake-session');localStorage.setItem('company_name','Empresa de Teste');
    if (lang) localStorage.setItem('i18nextLng',lang)
    const OriginalDate=Date; window.Date=class extends OriginalDate {
      constructor(...args){super(...(args.length?args:['2026-10-01T12:00:00Z']))}
      static now(){return new OriginalDate('2026-10-01T12:00:00Z').valueOf()}
    }
  }, {lang})
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === 'http://apex.test') {
      if (url.pathname === '/fixture.js') return route.fulfill({ contentType: 'text/javascript; charset=utf-8', body: bundle.js })
      if (url.pathname === '/apex-logo.png') return route.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(root, 'public/apex-logo.png')) })
      return route.fulfill({ contentType: 'text/html', body: bundle.html })
    }
    network.push(url.origin); await route.abort()
  })
  const page = await context.newPage()
  page.on('pageerror', error => { errors.push(error.message); console.log('Runtime error:',error.stack) })
  return {context,page}
}
async function snapshot(page) {
  return page.evaluate(() => ({
    text: document.getElementById('root').textContent.replace(/\s+/g,' ').trim(),
    fields: [...document.querySelectorAll('input,textarea,select')].map(e => [e.tagName,e.type,e.value,e.getAttribute('placeholder')]),
    links: [...document.querySelectorAll('a')].map(e=>e.getAttribute('href')),
    buttons: [...document.querySelectorAll('button')].map(e=>e.disabled),
  }))
}
try {
  const old = await context(await bundle(true), 'pt')
  for (const route of routes) {
    await old.page.goto('http://apex.test'+route); await old.page.locator('h1').waitFor(); await old.page.waitForTimeout(350)
    snapshots.set(route, await snapshot(old.page))
  }
  await old.context.close()
  const html = await bundle(false)
  for (const lang of languages) {
    const {context: ctx,page} = await context(html, lang)
    for (const route of routes) {
      await page.goto('http://apex.test'+route); await page.locator('h1').waitFor(); await page.waitForTimeout(350)
      assert.equal(await page.evaluate(()=>document.documentElement.lang),lang)
      if (lang==='pt') assert.deepEqual(await snapshot(page),snapshots.get(route),`Portuguese regression at ${route}`)
      if (!['/login','/signup'].includes(route)) {
        await page.locator('header button').first().click()
        await page.locator('aside').getByRole('button',{name:new RegExp(nativeNames[languages.indexOf(lang)])}).click()
        assert.equal(await page.evaluate(()=>localStorage.getItem('i18nextLng')),lang)
        await page.locator('aside button').first().click()
      }
      // Any registered Portuguese phrase still displayed is a localization hole.
      // Exclude real data, proper names, code, and shared international terms.
      if (lang!=='pt') {
        const leftovers=await page.evaluate(() => {
          const pt=window.__i18n.getResourceBundle('pt','interface')
          const ignore=new Set(['Radar','SLA','Compliance','score','Patch','Descrição do Pull Request'])
          const result=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT)
          for(let n=walker.nextNode();n;n=walker.nextNode()){
            if(n.parentElement.closest('pre,code,aside,textarea,script,style'))continue
            const value=n.textContent.trim()
            if(value.length>8 && Object.hasOwn(pt,value) && window.__tx(value)!==value && !ignore.has(value))result.push(value)
          }
          return [...new Set(result)]
        })
        // Fixture narratives are intentionally stored in their original language.
        const allowed = ['Removida a senha hardcoded', 'Substituída a concatenação', 'A injeção de SQL está', 'Vulnerabilidade crítica', 'S3 bucket com ACL pública','Credencial de teste em fixture']
        assert.deepEqual(leftovers.filter(s=>!allowed.some(prefix=>s.startsWith(prefix))),[],`${lang} ${route}: untranslated UI`)
      }
      checks++
    }
    console.log(`OK: ${lang}, ${routes.length} routes, actual sidebar selection${lang==='pt'?', Portuguese identical to '+baseline:''}`)
    await page.goto('http://apex.test/real-risk'); await page.waitForTimeout(350)
    await page.locator('select').first().selectOption('Financeiro')
    await page.getByRole('button',{name:await page.evaluate(()=>window.__tx('SALVAR PERFIL')),exact:true}).click()
    const payload=await page.evaluate(()=>window.__apiCalls.findLast(c=>c.name==='saveCompanyProfile').args[0])
    assert.equal(payload.sector,'Financeiro');assert.equal(payload.sensitive_data_volume,'Alto — até 500 mil registros')
    assert.ok((await page.locator('body').innerText()).includes(await page.evaluate(()=>window.__tx('✓ Perfil salvo — as próximas estimativas usarão estes dados'))))
    await page.evaluate(()=>window.__i18n.changeLanguage('en'))
    await page.waitForTimeout(50)
    assert.ok((await page.locator('body').innerText()).includes('Profile saved'))
    await page.evaluate(lang=>window.__i18n.changeLanguage(lang),lang)
    if (['en','ja'].includes(lang)) {
      const file=path.join(os.tmpdir(),`apex-language-${lang}.png`)
      await page.screenshot({path:file,fullPage:true});console.log(`Screenshot: ${file}`)
    }
    const download=page.waitForEvent('download')
    await page.getByRole('button',{name:await page.evaluate(()=>window.__tx('▤ EXPORTAR PDF')),exact:true}).click()
    const file=await download;const filePath=await file.path()
    assert.ok(fs.statSync(filePath).size>1000,`${lang}: PDF empty`)
    await page.goto('http://apex.test/alerts'); await page.locator('h1').waitFor(); await page.waitForTimeout(350)
    await page.getByRole('button',{name:await page.evaluate(()=>window.__i18n.t('alerts.all')),exact:true}).first().click()
    await page.getByRole('button',{name:await page.evaluate(()=>window.__tx('HIGH')),exact:true}).first().click()
    await page.waitForTimeout(100)
    assert.equal(await page.evaluate(()=>window.__apiCalls.findLast(c=>c.name==='getAlerts').args[0].severity),'HIGH')
    const alertDownload=page.waitForEvent('download')
    await page.getByRole('button',{name:'▤ '+await page.evaluate(()=>window.__i18n.t('common.exportPDF')),exact:true}).click()
    const alertFile=await alertDownload
    assert.ok(fs.statSync(await alertFile.path()).size>1000,`${lang}: alerts PDF empty`)
    await ctx.close()
  }
  const {context: liveContext,page: live}=await context(html)
  await live.goto('http://apex.test/notifications');await live.locator('h1').waitFor();await live.waitForTimeout(350)
  assert.equal(await live.evaluate(()=>document.documentElement.lang),'pt','Portuguese is the default without a saved preference')
  await live.locator('input').fill('https://discord.com/api/webhooks/test-only')
  await live.getByRole('button',{name:await live.evaluate(()=>window.__tx('SALVAR')),exact:true}).click()
  for(const lang of languages.slice(1)){
    await live.locator('header button').first().click()
    await live.locator('aside').getByRole('button',{name:new RegExp(nativeNames[languages.indexOf(lang)])}).click()
    await live.locator('aside button').first().click()
    assert.equal(await live.evaluate(()=>document.documentElement.lang),lang)
    assert.ok((await live.locator('body').innerText()).includes(await live.evaluate(()=>window.__tx('✓ Webhook salvo — novos alertas serão notificados no seu canal.'))))
    assert.equal(await live.locator('input').inputValue(),'https://discord.com/api/webhooks/test-only')
  }
  await live.reload();await live.locator('h1').waitFor();await live.waitForTimeout(350)
  assert.equal(await live.evaluate(()=>document.documentElement.lang),'ja','Selected language survives reload')
  await live.goto('http://apex.test/real-risk');await live.waitForTimeout(350)
  await live.evaluate(()=>window.__i18n.changeLanguage('en'))
  const beforeDemo=await live.evaluate(()=>window.__apiCalls.length)
  await live.locator('header button').nth(1).click();await live.waitForTimeout(350)
  assert.equal(await live.evaluate(()=>window.__apiCalls.length),beforeDemo,'Demo must not call the API')
  assert.ok((await live.locator('body').innerText()).includes('The SQL injection is in a payment endpoint'))
  await live.getByRole('button',{name:await live.evaluate(()=>window.__i18n.t('nav.remediations')),exact:false}).click();await live.waitForTimeout(350)
  assert.ok((await live.locator('body').innerText()).includes('Removed the hardcoded password'))
  assert.ok((await live.locator('pre').first().innerText()).includes('DATABASE_PASSWORD nao configurada no ambiente'),'Source code preserved')
  await live.getByRole('button',{name:await live.evaluate(()=>window.__i18n.t('nav.radar')),exact:false}).click()
  await live.getByRole('button',{name:await live.evaluate(()=>window.__tx('GERAR PANORAMA')),exact:true}).click();await live.waitForTimeout(600)
  assert.ok((await live.locator('body').innerText()).includes('Executive Threat Overview'))
  assert.ok(!(await live.locator('body').innerText()).includes('Prioridade imediata'))
  assert.equal(await live.evaluate(()=>window.__apiCalls.length),beforeDemo,'Demo navigation/results must remain offline')
  await liveContext.close()
  assert.deepEqual(errors,[],'Browser runtime errors')
  assert.deepEqual(network,[],'Unexpected external requests')
  console.log(`OK: ${checks} route/language combinations; 14 PDFs; payloads and code unchanged; live sidebar switching and persistence; demo offline; zero external requests.`)
} finally { await browser.close() }
