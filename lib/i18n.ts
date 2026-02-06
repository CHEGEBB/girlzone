import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enCommon from '@/public/locales/en/common.json'
import esCommon from '@/public/locales/es/common.json'
import jaCommon from '@/public/locales/ja/common.json'
import deCommon from '@/public/locales/de/common.json'
import frCommon from '@/public/locales/fr/common.json'
import ptCommon from '@/public/locales/pt/common.json'
import arCommon from '@/public/locales/ar/common.json'
import hiCommon from '@/public/locales/hi/common.json'
import idCommon from '@/public/locales/id/common.json'
import ruCommon from '@/public/locales/ru/common.json'

const resources = {
  en: { common: enCommon },
  es: { common: esCommon },
  ja: { common: jaCommon },
  de: { common: deCommon },
  fr: { common: frCommon },
  pt: { common: ptCommon },
  ar: { common: arCommon },
  hi: { common: hiCommon },
  id: { common: idCommon },
  ru: { common: ruCommon },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

export default i18n
