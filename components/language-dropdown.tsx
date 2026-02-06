"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useLanguage } from "./language-context"
import { Globe, Search, Loader2, Check } from "lucide-react"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"

export function LanguageDropdown() {
  const { 
    language, 
    changeLanguage, 
    isTranslatingPage,
    availableLanguages 
  } = useLanguage()
  
  const [searchQuery, setSearchQuery] = useState("")
  
  // Only show the 10 requested languages
  const requestedLanguages = useMemo(() => {
    const allowedCodes = ['en', 'es', 'ja', 'de', 'fr', 'pt', 'ar', 'hi', 'id', 'ru']
    return availableLanguages.filter(lang => allowedCodes.includes(lang.code))
  }, [availableLanguages])

  const currentLanguage = useMemo(() => {
    return requestedLanguages.find(lang => lang.code === language.split('-')[0]) || requestedLanguages[0]
  }, [language, requestedLanguages])

  // Filter languages based on search query
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return requestedLanguages
    }
    return requestedLanguages.filter(lang => 
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, requestedLanguages])

  const handleLanguageChange = async (langCode: string) => {
    changeLanguage(langCode)
    setSearchQuery("")
  }

  const getFlagEmoji = (langCode: string) => {
    // Flag mapping for the 10 requested languages
    const flags: Record<string, string> = {
      'en': '🇺🇸',
      'es': '🇪🇸', 
      'ja': '🇯🇵',
      'de': '🇩🇪',
      'fr': '🇫🇷',
      'pt': '🇵🇹',
      'ar': '🇸🇦',
      'hi': '🇮🇳',
      'id': '🇮🇩',
      'ru': '🇷🇺'
    }
    return flags[langCode] || '🌐'
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={cn(
            "w-full flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200 hover:bg-secondary/80 relative backdrop-blur-sm",
            isTranslatingPage && "opacity-75"
          )}
          style={{
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(255, 255, 255, 0.05)"
          }}
          disabled={isTranslatingPage}
        >
          {isTranslatingPage ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <div className="flex items-center gap-1">
              <Globe className="h-5 w-5 text-primary" />
              <span className="text-lg">{getFlagEmoji(currentLanguage.code)}</span>
            </div>
          )}
          <span className="font-medium text-sm">
            {isTranslatingPage 
              ? "Translating..." 
              : currentLanguage.nativeName
            }
          </span>
          {isTranslatingPage && (
            <div className="absolute right-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-72">
        <div className="p-3 space-y-3">
          <DropdownMenuLabel className="flex items-center gap-2 font-semibold">
            <Globe className="h-4 w-4 text-primary" />
            ...
          </DropdownMenuLabel>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search languages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50 backdrop-blur-sm"
            />
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <div className="max-h-64 overflow-y-auto">
          {filteredLanguages.length > 0 ? (
            filteredLanguages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  "flex items-center gap-3 cursor-pointer py-3 px-3 hover:bg-accent/50 transition-colors",
                  language.split('-')[0] === lang.code && 'bg-accent'
                )}
              >
                <span className="text-xl">{getFlagEmoji(lang.code)}</span>
                <span className="flex-1 flex flex-col">
                  <span className="font-medium">{lang.nativeName}</span>
                  <span className="text-xs text-muted-foreground">{lang.name}</span>
                </span>
                <div className="flex items-center gap-2">
                  {language.split('-')[0] === lang.code && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  {lang.code !== 'en' && (
                    <div className="w-2 h-2 bg-primary rounded-full opacity-60" title="Auto-translate enabled" />
                  )}
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No languages found matching "{searchQuery}"
            </div>
          )}
        </div>
        
        <div className="p-3 border-t bg-muted/20">
          <div className="text-xs text-muted-foreground text-center space-y-1">
            {language === 'en' ? (
              <div className="flex items-center justify-center gap-1">
                <span>🇺🇸</span>
                <span>Default: English (no translation needed)</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>{getFlagEmoji(currentLanguage.code)}</span>
                <span> {currentLanguage.nativeName}</span>
              </div>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
