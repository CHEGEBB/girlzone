"use client"

import { Button } from "@/components/ui/button"
import PromotionalBanner from "@/components/promotional-banner"
import { useSite } from "@/components/site-context"
import { useCharacters } from "@/components/character-context"
import { Separator } from "@/components/ui/separator"
import { CharacterGrid } from "@/components/character-grid"
import { CompanionExperienceSection } from "@/components/companion-experience-section"
import { SiteFooter } from "@/components/site-footer"
import { FAQSection } from "@/components/faq-section"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLanguage } from "@/components/language-context"
import type { Character } from "@/lib/types"

interface HomeClientProps {
  initialCharacters: Character[]
}

export default function HomeClient({ initialCharacters }: HomeClientProps) {
  const { settings } = useSite()
  const isMobile = useIsMobile()
  const { activeType } = useCharacters()
  const { t } = useLanguage()

  // Filter characters based on the active type (case-insensitive)
  const filteredCharacters = initialCharacters.filter((char) => {
    if (activeType === "All") return true

    // Normalize categories
    const charCategory = (char.category || "").toLowerCase().trim()
    const activeTypeLC = activeType.toLowerCase().trim()

    // Map new UI types to legacy DB types
    if (activeTypeLC === "female" && ["girls", "girl", "female", "woman", "women"].includes(charCategory)) return true
    if (activeTypeLC === "male" && ["guys", "guy", "male", "man", "men", "boy", "boys"].includes(charCategory)) return true
    if (activeTypeLC === "anime" && charCategory === "anime") return true

    // Fallback for direct matches
    return charCategory.includes(activeTypeLC)
  })

  return (
    <div className={`flex min-h-screen flex-col bg-background ${isMobile ? 'mobile-container' : ''}`}>
      {/* Content Area */}
      <main className="flex-1">
        {/* Featured Promotional Banner */}
        <PromotionalBanner />

        <div className={`${isMobile ? 'mt-4 mb-3 px-4' : 'mt-6 mb-4 px-4 md:px-6 lg:px-8'} ${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto`}>
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
            <span className="text-primary">{settings.siteName || "Girlzone.ai"}</span>
            <span className="text-white ml-2">{t("nav.characters")}</span>
          </h2>
        </div>

        <div className="space-y-4">
          <CharacterGrid characters={filteredCharacters || []} />
        </div>

        {/* Add the FAQ Section */}
        <FAQSection />

        {/* Add the Companion Experience Section */}
        <CompanionExperienceSection />
      </main>

      {/* Add the Site Footer */}
      <SiteFooter />
    </div>
  )
}
