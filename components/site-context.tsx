"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { SiteSettings as ServerSiteSettings } from "@/lib/settings-utils";

// Update the SiteSettings type to include language, SEO, and theme settings
type SiteSettings = {
  siteName: string
  logoText: string
  siteSuffix: string
  seoTitle: string
  seoDescription: string
  customFaviconUrl?: string
  language: "en" | "sv" // Add language setting
  theme: ThemeSettings // Add theme settings
  features: {
    faceSwap: boolean
  }
  pricing: {
    currency: string
    currencyPosition: "left" | "right"
    monthly: {
      price: number
      originalPrice: number
      discount: number
    }
    quarterly: {
      price: number
      originalPrice: number
      discount: number
    }
    yearly: {
      price: number
      originalPrice: number
      discount: number
    }
  }
}

type ThemeSettings = {
  primary_hue: string
  primary_saturation: string
  primary_lightness: string
  background_light_hue: string
  background_light_saturation: string
  background_light_lightness: string
  foreground_light_hue: string
  foreground_light_saturation: string
  foreground_light_lightness: string
  background_dark_hue: string
  background_dark_saturation: string
  background_dark_lightness: string
  foreground_dark_hue: string
  foreground_dark_saturation: string
  foreground_dark_lightness: string
  card_light_hue: string
  card_light_saturation: string
  card_light_lightness: string
  card_dark_hue: string
  card_dark_saturation: string
  card_dark_lightness: string
  border_light_hue: string
  border_light_saturation: string
  border_light_lightness: string
  border_dark_hue: string
  border_dark_saturation: string
  border_dark_lightness: string
}

// Update the defaultSettings to include language, SEO, and theme
const defaultSettings: SiteSettings = {
  siteName: "Girlzone",
  logoText: "Girlzone",
  siteSuffix: ".ai",
  seoTitle: "Girlzone - Your AI Companion",
  seoDescription: "Explore and chat with AI characters on Girlzone",
  language: "en", // Default to English
  features: {
    faceSwap: true
  },
  theme: {
    primary_hue: "24",
    primary_saturation: "95",
    primary_lightness: "55",
    background_light_hue: "0",
    background_light_saturation: "0",
    background_light_lightness: "100",
    foreground_light_hue: "222.2",
    foreground_light_saturation: "84",
    foreground_light_lightness: "4.9",
    background_dark_hue: "0",
    background_dark_saturation: "0",
    background_dark_lightness: "4",
    foreground_dark_hue: "0",
    foreground_dark_saturation: "0",
    foreground_dark_lightness: "98",
    card_light_hue: "0",
    card_light_saturation: "0",
    card_light_lightness: "100",
    card_dark_hue: "0",
    card_dark_saturation: "0",
    card_dark_lightness: "8",
    border_light_hue: "214.3",
    border_light_saturation: "31.8",
    border_light_lightness: "91.4",
    border_dark_hue: "0",
    border_dark_saturation: "0",
    border_dark_lightness: "15"
  },
  pricing: {
    currency: "$",
    currencyPosition: "left",
    monthly: {
      price: 12.99,
      originalPrice: 19.99,
      discount: 35,
    },
    quarterly: {
      price: 9.99,
      originalPrice: 19.99,
      discount: 50,
    },
    yearly: {
      price: 5.99,
      originalPrice: 19.99,
      discount: 70,
    },
  },
}

const SiteContext = createContext<SiteContextType | undefined>(undefined)

type SiteContextType = {
  settings: SiteSettings
  updateSettings: (newSettings: Partial<SiteSettings>) => Promise<void>
  updateTheme: (themeSettings: Partial<ThemeSettings>) => Promise<void>
  isLoading: boolean
  isInitialized: boolean
  showLoader: boolean
}

export function SiteProvider({
  children,
  settings: initialSettings,
}: {
  children: ReactNode;
  settings: ServerSiteSettings;
}) {
  const [settings, setSettings] = useState<SiteSettings>({
    ...defaultSettings,
    siteName: initialSettings.site_name,
    logoText: initialSettings.logo_text,
    siteSuffix: initialSettings.site_suffix,
    seoTitle: initialSettings.seo_title,
    seoDescription: initialSettings.seo_description,
    customFaviconUrl: initialSettings.custom_favicon_url,
    language: initialSettings.language as "en" | "sv",
    features: {
      faceSwap: initialSettings.features?.face_swap ?? true
    },
    pricing: initialSettings.pricing,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  const applyTheme = (theme: ThemeSettings) => {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    root.style.setProperty('--primary', `${theme.primary_hue} ${theme.primary_saturation}% ${theme.primary_lightness}%`)
    root.style.setProperty('--ring', `${theme.primary_hue} ${theme.primary_saturation}% ${theme.primary_lightness}%`)
  }

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const response = await fetch("/api/theme-settings");
        if (response.ok) {
          const data = await response.json();
          setSettings(prev => ({
            ...prev,
            theme: data.settings,
          }));
        }
      } catch (error) {
        console.error("Error fetching theme settings:", error);
      } finally {
        setIsLoading(false);
        setShowLoader(false);
        setIsInitialized(true);
      }
    };

    fetchTheme();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      applyTheme(settings.theme);
    }
  }, [settings.theme, isInitialized]);

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    try {
      if (newSettings.siteName !== undefined || newSettings.logoText !== undefined ||
        newSettings.siteSuffix !== undefined ||
        newSettings.seoTitle !== undefined || newSettings.seoDescription !== undefined ||
        newSettings.customFaviconUrl !== undefined ||
        newSettings.features !== undefined) {

        const body: any = {
          site_name: newSettings.siteName,
          logo_text: newSettings.logoText,
          site_suffix: newSettings.siteSuffix,
          seo_title: newSettings.seoTitle,
          seo_description: newSettings.seoDescription,
          custom_favicon_url: newSettings.customFaviconUrl
        };

        if (newSettings.features) {
          body.features = {
            face_swap: newSettings.features.faceSwap
          };
        }

        const response = await fetch("/api/site-settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        })

        if (response.ok) {
          console.log("Settings saved successfully")
        } else {
          console.error("Failed to save settings to database")
        }
      }

      setSettings((prev) => {
        const updated = { ...prev, ...newSettings }
        localStorage.setItem("siteSettings", JSON.stringify(updated))
        return updated
      })
    } catch (error) {
      console.error("Error saving site settings:", error)
      setSettings((prev) => {
        const updated = { ...prev, ...newSettings }
        localStorage.setItem("siteSettings", JSON.stringify(updated))
        return updated
      })
    }
  }

  const updateTheme = async (themeSettings: Partial<ThemeSettings>) => {
    try {
      const response = await fetch("/api/theme-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(themeSettings),
      })

      if (response.ok) {
        console.log("Theme settings saved successfully")

        setSettings((prev) => {
          const updated = {
            ...prev,
            theme: { ...prev.theme, ...themeSettings }
          }
          localStorage.setItem("siteSettings", JSON.stringify(updated))

          applyTheme(updated.theme)

          return updated
        })
      } else {
        console.error("Failed to save theme settings to database")
      }
    } catch (error) {
      console.error("Error saving theme settings:", error)
    }
  }

  return (
    <SiteContext.Provider value={{ settings, updateSettings, updateTheme, isLoading, isInitialized, showLoader }}>
      {children}
    </SiteContext.Provider>
  )
}

export function useSite() {
  const context = useContext(SiteContext)
  if (context === undefined) {
    throw new Error("useSite must be used within a SiteProvider")
  }
  return context
}
