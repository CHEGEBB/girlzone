"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react"
import { useTranslation } from 'react-i18next'
import { useRouter, usePathname } from 'next/navigation'
import '@/lib/i18n'
import { SUPPORTED_LANGUAGES } from '@/lib/google-cloud-translate'

type LanguageContextType = {
  language: string
  t: (key: string, options?: any) => string
  changeLanguage: (lang: string) => void
  translateText: (text: string, targetLang: string, sourceLang?: string) => Promise<string>
  translatedContent: Map<string, string>
  isTranslatingPage: boolean
  translatePage: () => Promise<void>
  availableLanguages: typeof SUPPORTED_LANGUAGES
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation('common')
  const router = useRouter()
  const pathname = usePathname()
  const [translatedContent, setTranslatedContent] = useState<Map<string, string>>(new Map())
  const [isTranslatingPage, setIsTranslatingPage] = useState(false)
  
  // Use ref to track the previous pathname
  const previousPathRef = useRef<string>('')
  const isFirstLoadRef = useRef(true)
  const languageRef = useRef<string>('en')

  // Set default language to English if none is set
  useEffect(() => {
    const savedLanguage = localStorage.getItem('selected-language') || 'en'
    languageRef.current = savedLanguage
    console.log(`🔧 Initializing language context with: ${savedLanguage}`)
    
    if (i18n.language !== savedLanguage) {
      i18n.changeLanguage(savedLanguage)
    }
  }, [i18n])

  // Update language reference when i18n language changes
  useEffect(() => {
    languageRef.current = i18n.language
    console.log(`🌐 i18n language changed to: ${i18n.language}`)
  }, [i18n.language])

  const translateText = useCallback(async (text: string, targetLang: string, sourceLang = 'en'): Promise<string> => {
    try {
      // Create timeout promise using Promise.race instead of AbortController
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Translation request timed out')), 10000)
      })

      const fetchPromise = fetch('/api/google-translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          source: sourceLang
        })
      })

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Translation failed: ${response.status}`)
      }

      const data = await response.json()
      return data.data.translatedText || text
    } catch (error) {
      // Only log actual errors, not timeout errors to avoid console noise
      if (error instanceof Error && !error.message.includes('timed out')) {
        console.error('Translation error:', error)
      }
      
      return text // Return original text if translation fails
    }
  }, [])

  const translatePage = useCallback(async () => {
    const currentLang = languageRef.current // Use ref instead of state
    if (currentLang === 'en') {
      console.log(`⏭️ Skipping translation - language is English`)
      return // No translation needed for English
    }
    
    console.log(`🔄 Starting SAFE page translation for language: ${currentLang}, page: ${pathname}`)
    
    setIsTranslatingPage(true)
    
    try {
      // SAFE: Target only TEXT ELEMENTS that are leaf nodes (no children)
      const textSelectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'span', 'label', 'button', 'a',
        'li', 'td', 'th', 'caption', 'figcaption',
        'small', 'strong', 'em', 'b', 'i', 'u', 'mark',
        'dt', 'dd', 'summary', 'time', 'blockquote'
      ]
      
      const elementsToTranslate: { element: Element, text: string }[] = []
      
      // Helper function to check if element is translatable
      const isTranslatable = (element: Element, text: string) => {
        // SAFETY CHECK: Only translate if element has no children (leaf node)
        if (element.children.length > 0) return false
        
        // Skip technical elements
        if (['CODE', 'PRE', 'KBD', 'SAMP', 'VAR'].includes(element.tagName)) return false

        // Skip if already translated or processing
        if (element.hasAttribute('data-translated')) return false

        // SAFE CRITERIA: Only translate simple text content
        return (
          text && 
          text.length >= 1 && 
          text.length <= 1000 &&
          !text.includes('http') &&
          !text.includes('@') &&
          !text.includes('.com') &&
          !text.includes('.org') &&
          !text.includes('function') &&
          !text.includes('const ') &&
          !text.includes('let ') &&
          !text.includes('var ') &&
          !text.includes('class ') &&
          !text.includes('{') &&
          !text.includes('}') &&
          !text.includes('(') &&
          !text.includes(')') &&
          !text.match(/^[a-zA-Z0-9_$]+$/) && // Exclude single identifiers/variables
          !text.includes('<') &&
          !text.includes('>') &&
          !element.closest('[data-no-translate]') &&
          !element.closest('.logo') &&
          !element.closest('.site-name') &&
          !element.closest('.brand') &&
          !element.closest('#logo') &&
          !element.closest('#site-name') &&
          !element.closest('#brand') &&
          !element.closest('[role="banner"]') &&
          !element.closest('header')
        )
      }

      // Collect all valid elements
      for (const selector of textSelectors) {
        const elements = document.querySelectorAll(selector)
        for (const element of elements) {
          const text = element.textContent?.trim() || ''
          if (isTranslatable(element, text)) {
            elementsToTranslate.push({ element, text })
          }
        }
      }
      
      // Also check custom elements
      const customElements = document.querySelectorAll('[data-translate]')
      for (const element of customElements) {
        const text = element.textContent?.trim() || ''
        if (isTranslatable(element, text)) {
          elementsToTranslate.push({ element, text })
        }
      }

      if (elementsToTranslate.length === 0) {
        console.log('✨ No elements to translate')
        return
      }

      console.log(`📝 Found ${elementsToTranslate.length} elements to translate`)

      // Process in batches of 50
      const BATCH_SIZE = 50
      let translatedCount = 0

      for (let i = 0; i < elementsToTranslate.length; i += BATCH_SIZE) {
        const batch = elementsToTranslate.slice(i, i + BATCH_SIZE)
        const texts = batch.map(item => item.text)
        
        try {
          const response = await fetch('/api/google-translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: texts,
              target: currentLang,
              source: 'en'
            })
          })

          const data = await response.json()

          if (data.success && data.data.translations) {
            data.data.translations.forEach((translation: any, index: number) => {
              const item = batch[index]
              
              // Store original text if not exists
              if (!item.element.getAttribute('data-original-text')) {
                item.element.setAttribute('data-original-text', item.text)
              }
              
              item.element.textContent = translation.translatedText
              item.element.setAttribute('data-translated', 'true')
              translatedCount++
            })
          }
        } catch (error) {
          console.error('Batch translation error:', error)
        }
      }
      
      console.log(`✅ SAFE TRANSLATION COMPLETE: ${translatedCount} elements translated on page: ${pathname}`)
      
    } catch (error) {
      console.error('Safe page translation error:', error)
    } finally {
      setIsTranslatingPage(false)
    }
  }, [pathname])

  const changeLanguage = useCallback(async (lang: string) => {
    console.log(`🌐 Changing language from ${languageRef.current} to: ${lang}`)
    
    // Save language preference
    localStorage.setItem('selected-language', lang)
    localStorage.setItem('translation-mode', 'google') // Always use Google Translate
    
    // Update language reference
    languageRef.current = lang
    
    // Update i18n language
    i18n.changeLanguage(lang)
    
    // Clear translated content when language changes
    setTranslatedContent(new Map())
    
    // Handle language switching
    if (lang === 'en') {
      // When switching to English, restore original content
      console.log(`🔄 Switching to English - restoring original content`)
      
      // Clear all translated text from elements using stored original text
      const textSelectors = [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'span', 'label', 'button', 'a',
        'li', 'td', 'th', 'caption', 'figcaption',
        'small', 'strong', 'em', 'b', 'i', 'u', 'mark',
        'dt', 'dd', 'summary', 'time', 'blockquote'
      ]
      
      textSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector)
        elements.forEach(element => {
          const originalText = element.getAttribute('data-original-text')
          if (originalText) {
            element.textContent = originalText
            element.removeAttribute('data-original-text')
          }
        })
      })
      
      // Also handle custom translated elements
      const customElements = document.querySelectorAll('[data-translate]')
      customElements.forEach(element => {
        const originalText = element.getAttribute('data-original-text')
        if (originalText) {
          element.textContent = originalText
          element.removeAttribute('data-original-text')
        }
      })
      
      // Reset document direction to LTR for English
      document.documentElement.dir = 'ltr'
      
      // Clear any previous translations from the Map
      setTranslatedContent(new Map())
      
    } else {
      // Update document direction for RTL languages (Arabic)
      if (lang === 'ar') {
        document.documentElement.dir = 'rtl'
      } else {
        document.documentElement.dir = 'ltr'
      }
      
      // Auto-translate the page for non-English languages
      console.log(`🌍 Switching to ${lang} - starting translation`)
      setTimeout(() => {
        translatePage()
      }, 500)
    }
  }, [i18n, translatePage])

  // CRITICAL: Track route changes and auto-translate new pages - ENHANCED IMPLEMENTATION
  useEffect(() => {
    console.log(`📍 Pathname change detected: "${previousPathRef.current}" → "${pathname}"`)
    console.log(`📍 Current language from ref: ${languageRef.current}`)
    console.log(`📍 Current language from i18n: ${i18n.language}`)
    
    if (pathname && pathname !== previousPathRef.current) {
      const oldPath = previousPathRef.current
      previousPathRef.current = pathname
      
      // Skip first load
      if (isFirstLoadRef.current) {
        console.log('🏠 Skipping first page load translation')
        isFirstLoadRef.current = false
        return
      }
      
      console.log(`🔄 Navigation detected: "${oldPath}" → "${pathname}"`)
      console.log(`🚀 Checking if translation needed for language: ${languageRef.current}`)
      
      const currentLang = languageRef.current // Use ref for current language
      
      // Auto-translate new pages if not English
      if (currentLang !== 'en') {
        console.log(`🚀 Starting auto-translation for new page: ${pathname}, lang: ${currentLang}`)
        
        // Clear previous translations
        setTranslatedContent(new Map())
        
        // Add delay to ensure page is loaded before translation
        const timeoutId = setTimeout(() => {
          console.log(`⚡ Executing delayed translation for: ${pathname}`)
          translatePage()
        }, 2000) // Longer delay for page navigation
        
        return () => {
          console.log(`🧹 Clearing timeout for: ${pathname}`)
          clearTimeout(timeoutId)
        }
      } else {
        console.log('⏭️ Skipping translation - language is English')
      }
    } else {
      console.log(`⚖️ No pathname change detected: "${previousPathRef.current}" === "${pathname}"`)
    }
  }, [pathname, translatePage]) // Removed i18n.language from dependencies to prevent unnecessary re-runs

  // Auto-translate page when language changes (existing functionality) - REMOVED to prevent conflicts
  // This was causing translation to run multiple times, so removed it

  return (
    <LanguageContext.Provider
      value={{ 
        language: i18n.language, 
        t, 
        changeLanguage,
        translateText,
        translatedContent,
        isTranslatingPage,
        translatePage,
        availableLanguages: SUPPORTED_LANGUAGES
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
