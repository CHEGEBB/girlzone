"use client"

import { useSite } from "@/components/site-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLanguage } from "@/components/language-context"

export function CompanionExperienceSection() {
  const { settings } = useSite()
  const isMobile = useIsMobile()
  const { t } = useLanguage()
  
  return (
    <div className={`w-full bg-gradient-to-r from-gray-100 via-white to-gray-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 ${isMobile ? 'py-6 sm:py-8' : 'py-8 sm:py-12 md:py-16'} px-4 border-t border-b border-gray-200 dark:border-zinc-800 rounded-[2px]`}>
      <div className={`container mx-auto ${isMobile ? 'max-w-3xl' : 'max-w-4xl'}`}>
        <h2 className={`${isMobile ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl md:text-4xl'} font-bold text-zinc-800 dark:text-white ${isMobile ? 'mb-4 md:mb-6' : 'mb-6 md:mb-8'}`}>
          {t("companion.title")} {settings.siteName}
        </h2>

        <div className={`space-y-4 ${isMobile ? 'sm:space-y-5' : 'sm:space-y-6'} text-zinc-700 dark:text-zinc-300`}>
          <p className={`${isMobile ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`}>
            {t("companion.intro")}
          </p>

          <p className={isMobile ? 'text-sm sm:text-base' : ''}>
            {t("companion.p1")}
          </p>

          <p className={isMobile ? 'text-sm sm:text-base' : ''}>
            {t("companion.p2")}
          </p>

          <p className={isMobile ? 'text-sm sm:text-base' : ''}>
            {t("companion.p3")}
          </p>

          <p className={isMobile ? 'text-sm sm:text-base' : ''}>
            {t("companion.p4")}
          </p>

          <p className={isMobile ? 'text-sm sm:text-base' : ''}>
            {t("companion.p5")}
          </p>

          <p className={isMobile ? 'text-sm sm:text-base' : ''}>
            {t("companion.p6")}
          </p>

          <p className={isMobile ? 'text-sm sm:text-base' : ''}>
            {t("companion.p7")}
          </p>
        </div>
      </div>
    </div>
  )
}
