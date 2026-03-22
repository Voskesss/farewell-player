import { createContext, useContext, useState, useEffect } from 'react'
import { nl } from './nl'
import { en } from './en'
import { de } from './de'

const translations = { nl, en, de }

const I18nContext = createContext()

/**
 * Detecteer systeem taal
 */
function detectLanguage() {
  // Check navigator language
  const browserLang = navigator.language?.split('-')[0] || 'nl'
  
  // Ondersteunde talen
  if (['nl', 'en', 'de'].includes(browserLang)) {
    return browserLang
  }
  
  // Fallback naar Nederlands
  return 'nl'
}

/**
 * I18n Provider component
 */
export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Check localStorage voor opgeslagen voorkeur
    const saved = localStorage.getItem('farewell-player-language')
    return saved || detectLanguage()
  })

  // Sla taal voorkeur op
  useEffect(() => {
    localStorage.setItem('farewell-player-language', language)
  }, [language])

  const t = (key, params = {}) => {
    const keys = key.split('.')
    let value = translations[language]
    
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }
    
    // Fallback naar Nederlands als key niet bestaat
    if (value === undefined) {
      value = translations.nl
      for (const k of keys) {
        value = value?.[k]
        if (value === undefined) break
      }
    }
    
    // Fallback naar key zelf
    if (value === undefined) {
      return key
    }
    
    // Vervang parameters {param}
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (_, param) => params[param] ?? '')
    }
    
    return value
  }

  const value = {
    language,
    setLanguage,
    t,
    availableLanguages: [
      { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
      { code: 'en', name: 'English', flag: '🇬🇧' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    ]
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

/**
 * Hook om translations te gebruiken
 */
export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider')
  }
  return context
}

export { translations }
