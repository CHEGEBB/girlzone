"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "./language-context"
import { Globe } from "lucide-react"

const REQUESTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' }
]

export function LanguageSelector() {
  const { language, changeLanguage } = useLanguage()

  const currentLang = REQUESTED_LANGUAGES.find(lang => lang.code === language.split('-')[0])

  return (
    <div className="flex items-center space-x-1">
      <Globe className="h-4 w-4 text-muted-foreground" />
      {REQUESTED_LANGUAGES.map((lang) => (
        <Button 
          key={lang.code}
          variant={language.split('-')[0] === lang.code ? "default" : "outline"} 
          size="sm" 
          onClick={() => changeLanguage(lang.code)}
          className="px-2 py-1 h-8 text-xs flex items-center gap-1"
        >
          <span>{lang.flag}</span>
          <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
        </Button>
      ))}
    </div>
  )
}
