"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import "./globals.css"
import { SiteProvider, useSite } from "@/components/site-context"
import { SidebarProvider, useSidebar } from "@/components/sidebar-context"
import { CharacterProvider } from "@/components/character-context"
import { ImageSuggestionsProvider } from "@/components/image-suggestions-context"
import { BannerProvider } from "@/components/banner-context"
import AppSidebar from "@/components/app-sidebar"
import { ErrorBoundary } from "@/components/error-boundary"
import { LanguageProvider } from "@/components/language-context"
import { SiteHeader } from "@/components/site-header"
import { SiteLoader } from "@/components/site-loader"
import { trackAffiliateOnPageLoad } from "@/lib/affiliate-tracking"

function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar()
  const pathname = usePathname()
  const { showLoader } = useSite()

  const noHeaderPaths = ["/chat", "/generate", "/premium", "/affiliate", "/admin"]
  const showHeader = !noHeaderPaths.some((path) => pathname?.startsWith(path))

  // Admin routes have their own layout, so exclude AppSidebar and margin
  const isAdminRoute = pathname?.startsWith("/admin") || false

  // Track affiliate clicks on page load
  useEffect(() => {
    trackAffiliateOnPageLoad()
  }, [])

  // Show loader while site is initializing
  if (showLoader) {
    return <SiteLoader />
  }

  return (
    <div className="flex min-h-screen bg-background">
      {!isAdminRoute && <AppSidebar />}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${!isAdminRoute && (isOpen ? "md:ml-64" : "md:ml-20")}`}>
        {showHeader && <SiteHeader />}
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  )
}

import { SiteSettings } from "@/lib/settings-utils";

export default function ClientRootLayout({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: SiteSettings;
}) {
  return (
    <SiteProvider settings={settings}>
      <LanguageProvider>
        <SidebarProvider>
          <CharacterProvider>
            <BannerProvider>
              <ImageSuggestionsProvider>
                <RootLayoutContent>{children}</RootLayoutContent>
              </ImageSuggestionsProvider>
            </BannerProvider>
          </CharacterProvider>
        </SidebarProvider>
      </LanguageProvider>
    </SiteProvider>
  )
}
