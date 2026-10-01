import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import pt from './locales/pt.json'
import ptInterface from './locales/interface.pt.json'
import en from './locales/en.json'
import enInterface from './locales/interface.en.json'
import es from './locales/es.json'
import esInterface from './locales/interface.es.json'
import zh from './locales/zh.json'
import zhInterface from './locales/interface.zh.json'
import hi from './locales/hi.json'
import hiInterface from './locales/interface.hi.json'
import fr from './locales/fr.json'
import frInterface from './locales/interface.fr.json'
import ja from './locales/ja.json'
import jaInterface from './locales/interface.ja.json'

// Idiomas disponiveis no seletor (nome nativo + bandeira).
// pt e o idioma base: toda chave nova entra primeiro em pt.json.
export const languages = [
  { code: 'pt', label: 'Português (padrão)', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt, interface: ptInterface },
      en: { translation: en, interface: enInterface },
      es: { translation: es, interface: esInterface },
      zh: { translation: zh, interface: zhInterface },
      hi: { translation: hi, interface: hiInterface },
      fr: { translation: fr, interface: frInterface },
      ja: { translation: ja, interface: jaInterface },
    },
    // Sem `lng` fixo de proposito: defini-lo sobrescreve o idioma detectado no
    // localStorage e a escolha do usuario nao sobreviveria ao reload.
    // O fallbackLng garante portugues quando nao ha nada salvo.
    fallbackLng: 'pt',
    load: 'languageOnly',
    supportedLngs: languages.map(l => l.code),
    interpolation: { escapeValue: false },
    detection: {
      // Persiste a escolha no localStorage e a reaplica no proximo carregamento
      order: ['localStorage'],
      caches: ['localStorage'],
    },
  })

const updateDocumentLanguage = () => {
  if (typeof document !== 'undefined') document.documentElement.lang = i18n.resolvedLanguage || 'pt'
}
i18n.on('languageChanged', updateDocumentLanguage)
updateDocumentLanguage()

export default i18n
