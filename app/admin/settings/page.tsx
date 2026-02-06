"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/components/auth-context"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useSite } from "@/components/site-context"
import { useTranslations } from "@/lib/use-translations"
import { AdminDebug } from "@/components/admin-debug"
import { Settings, Globe, CreditCard, Save, AlertCircle, DollarSign, ToggleLeft, ToggleRight, Palette, Database, Eye, RotateCcw, Info, CheckCircle2, XCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function AdminSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    stripe_secret_key: "",
    stripe_webhook_secret: "",
    monetization_enabled: true,
    payment_gateway: "stripe",
    upgate_key: "",
    upgate_status: "test",
    token_to_usd_rate: "0.01",
    withdrawal_processing_fee_percent: "0",
    minimum_withdrawal_amount: "10.00",
    site_name: "",
    logo_text: "",
    site_suffix: "",
    custom_favicon_url: "",
    seo_title: "",
    seo_description: "",
  })
  const [themeSettings, setThemeSettings] = useState({
    primary_hue: "24",
    primary_saturation: "95",
    primary_lightness: "55",
  })
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const { settings: siteSettings, updateSettings: updateSiteSettings, updateTheme } = useSite()
  const { t } = useTranslations()

  useEffect(() => {
    const checkAdminAndLoadSettings = async () => {
      try {
        setIsLoading(true)

        if (!user) {
          router.push("/admin/login?redirect=/admin/settings")
          return
        }

        const { data: adminSettingsData, error: adminError } = await supabase.from("admin_settings").select("*")
        const { data: siteSettingsData, error: siteError } = await supabase.from("site_settings").select("*")

        if (adminError) {
          console.error("Error loading admin settings:", adminError)
        }
        if (siteError) {
          console.error("Error loading site settings:", siteError)
        }

        const adminSettingsObj: any = {}
        if (adminSettingsData) {
          adminSettingsData.forEach(setting => {
            adminSettingsObj[setting.key] = setting.value
          })
        }

        const siteSettingsObj: any = {}
        if (siteSettingsData) {
          siteSettingsData.forEach(setting => {
            siteSettingsObj[setting.key] = setting.value
          })
        }

        setSettings(prev => ({
          ...prev,
          ...adminSettingsObj,
          site_name: siteSettingsObj.site_name || siteSettings.siteName,
          logo_text: siteSettingsObj.logo_text || siteSettings.logoText,
          site_suffix: siteSettingsObj.site_suffix || siteSettings.siteSuffix,
          custom_favicon_url: siteSettingsObj.custom_favicon_url || siteSettings.customFaviconUrl,
          seo_title: siteSettingsObj.seo_title || siteSettings.seoTitle,
          seo_description: siteSettingsObj.seo_description || siteSettings.seoDescription,
          monetization_enabled: adminSettingsObj.monetization_enabled !== undefined
            ? String(adminSettingsObj.monetization_enabled).toLowerCase().trim() === 'true'
            : prev.monetization_enabled
        }))

        setThemeSettings({
          primary_hue: siteSettings.theme.primary_hue,
          primary_saturation: siteSettings.theme.primary_saturation,
          primary_lightness: siteSettings.theme.primary_lightness,
        })
      } catch (error) {
        console.error("Error loading admin settings:", error)
        toast.error("Failed to load settings")
      } finally {
        setIsLoading(false)
      }
    }

    checkAdminAndLoadSettings()
  }, [user, router, supabase, siteSettings])

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)

      const adminSettings = [
        { key: 'stripe_secret_key', value: settings.stripe_secret_key },
        { key: 'stripe_webhook_secret', value: settings.stripe_webhook_secret },
        { key: 'monetization_enabled', value: settings.monetization_enabled.toString() },
        { key: 'token_to_usd_rate', value: settings.token_to_usd_rate },
        { key: 'withdrawal_processing_fee_percent', value: settings.withdrawal_processing_fee_percent },
        { key: 'minimum_withdrawal_amount', value: settings.minimum_withdrawal_amount }
      ]

      for (const setting of adminSettings) {
        const { error } = await supabase.from("admin_settings").upsert({
          key: setting.key,
          value: setting.value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' })
        if (error) throw error
      }

      const siteSettings = [
        { key: 'site_name', value: settings.site_name },
        { key: 'logo_text', value: settings.logo_text },
        { key: 'site_suffix', value: settings.site_suffix },
        { key: 'custom_favicon_url', value: settings.custom_favicon_url },
        { key: 'seo_title', value: settings.seo_title },
        { key: 'seo_description', value: settings.seo_description }
      ]

      for (const setting of siteSettings) {
        const { error } = await supabase.from("site_settings").upsert({
          key: setting.key,
          value: setting.value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' })
        if (error) throw error
      }

      await updateSiteSettings({
        siteName: settings.site_name,
        logoText: settings.logo_text,
        siteSuffix: settings.site_suffix,
        customFaviconUrl: settings.custom_favicon_url,
        seoTitle: settings.seo_title,
        seoDescription: settings.seo_description
      })

      toast.success("Settings saved successfully")
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleLanguageChange = (value: "en" | "sv") => {
    updateSiteSettings({ language: value })
  }

  const handleMonetizationToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, monetization_enabled: enabled }))
  }

  const handleSaveTheme = async () => {
    try {
      setIsSaving(true)
      await updateTheme(themeSettings)
      toast.success("Theme updated successfully! Changes will be visible across the entire site.")
    } catch (error) {
      console.error("Error saving theme:", error)
      toast.error("Failed to save theme settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleThemeChange = (key: string, value: string) => {
    setThemeSettings((prev) => ({ ...prev, [key]: value }))
  }

  const resetThemeToDefault = () => {
    setThemeSettings({
      primary_hue: "24",
      primary_saturation: "95",
      primary_lightness: "55",
    })
    toast.info("Theme reset to default values. Click 'Save Theme' to apply.")
  }

  const runMigration = async () => {
    try {
      const response = await fetch('/api/admin/complete-admin-settings-reset', {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success("Admin settings table has been completely reset and recreated!")
        window.location.reload()
      } else {
        toast.error("Reset failed: " + result.details)
      }
    } catch (error) {
      console.error("Error running reset:", error)
      toast.error("Failed to run reset")
    }
  }

  const resetSiteSettings = async () => {
    try {
      const response = await fetch('/api/admin/reset-site-settings-table', {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success("Site settings table has been completely reset and recreated!")
        window.location.reload()
      } else {
        toast.error("Site settings reset failed: " + result.details)
      }
    } catch (error) {
      console.error("Error running site settings reset:", error)
      toast.error("Failed to run site settings reset")
    }
  }

  const viewDatabaseData = async () => {
    try {
      const [adminResponse, siteResponse] = await Promise.all([
        fetch('/api/admin/view-database-data?table=admin_settings'),
        fetch('/api/admin/view-database-data?table=site_settings')
      ])

      const adminData = await adminResponse.json()
      const siteData = await siteResponse.json()

      console.log("=== DATABASE DATA CONFIRMATION ===")
      console.log("Admin Settings:", adminData)
      console.log("Site Settings:", siteData)
      console.log("================================")

      toast.success("Database data logged to console! Check browser console (F12) to see the actual data.")
    } catch (error) {
      console.error("Error viewing database data:", error)
      toast.error("Failed to view database data")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 dark:from-purple-500/5 dark:via-pink-500/5 dark:to-blue-500/5 rounded-2xl p-8 border border-purple-200/50 dark:border-purple-800/50 backdrop-blur-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                {t ? t("admin.settings") : "Admin Settings"}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Configure system settings, integrations, and customize your platform
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300">
            <Info className="h-3 w-3 mr-1" />
            v1.0.0
          </Badge>
        </div>
      </div>

      {/* Debug Component */}
      <AdminDebug />

      {/* Main Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 gap-2 bg-slate-100 dark:bg-slate-900 p-2 rounded-xl">
          <TabsTrigger value="general" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="monetization" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <DollarSign className="h-4 w-4 mr-2" />
            Monetization
          </TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
            <Database className="h-4 w-4 mr-2" />
            Database
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Site Settings */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-green-900 dark:text-green-100">Site Information</CardTitle>
                    <CardDescription>Configure your site name and branding</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="site_name" className="flex items-center gap-2">
                      <span className="font-medium">Site Name</span>
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    </Label>
                    <Input
                      id="site_name"
                      name="site_name"
                      value={settings.site_name}
                      onChange={handleChange}
                      placeholder="Girlzone.ai"
                      className="transition-all focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Displayed in browser tabs and throughout the site
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_text" className="flex items-center gap-2">
                      <span className="font-medium">Logo Text</span>
                      <Badge variant="secondary" className="text-xs">Required</Badge>
                    </Label>
                    <Input
                      id="logo_text"
                      name="logo_text"
                      value={settings.logo_text}
                      onChange={handleChange}
                      placeholder="Girlzone"
                      className="transition-all focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Text shown in logo and favicon
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="site_suffix" className="flex items-center gap-2">
                      <span className="font-medium">Site Suffix</span>
                    </Label>
                    <Input
                      id="site_suffix"
                      name="site_suffix"
                      value={settings.site_suffix}
                      onChange={handleChange}
                      placeholder=".ai"
                      className="transition-all focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Suffix displayed next to the logo
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom_favicon_url" className="flex items-center gap-2">
                      <span className="font-medium">Custom Favicon URL</span>
                    </Label>
                    <Input
                      id="custom_favicon_url"
                      name="custom_favicon_url"
                      value={settings.custom_favicon_url}
                      onChange={handleChange}
                      placeholder="https://example.com/favicon.png"
                      className="transition-all focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Optional: URL to a custom ID/favicon image (PNG/ICO). Leave empty to use dynamic logo.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    <h4 className="font-semibold text-base">SEO Configuration</h4>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo_title" className="font-medium">SEO Title</Label>
                    <Input
                      id="seo_title"
                      name="seo_title"
                      value={settings.seo_title}
                      onChange={handleChange}
                      placeholder="Girlzone.ai - Your AI Companion"
                      className="transition-all focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Browser tab title • Recommended: 50-60 characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo_description" className="font-medium">SEO Description</Label>
                    <Input
                      id="seo_description"
                      name="seo_description"
                      value={settings.seo_description}
                      onChange={handleChange}
                      placeholder="Explore and chat with AI characters"
                      className="transition-all focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Search engine preview • Recommended: 150-160 characters
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Site Settings"}
                </Button>
              </CardFooter>
            </Card>

            {/* Language Settings */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-blue-900 dark:text-blue-100">{t("admin.language")}</CardTitle>
                    <CardDescription>{t("admin.languageDescription")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                    <Label htmlFor="language" className="text-base font-semibold mb-3 block">
                      {t("admin.selectLanguage")}
                    </Label>
                    <Select
                      value={siteSettings.language}
                      onValueChange={(value) => handleLanguageChange(value as "en" | "sv")}
                    >
                      <SelectTrigger id="language" className="h-14 text-base border-2 hover:border-blue-400 transition-colors">
                        <SelectValue placeholder={t("admin.selectLanguage")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en" className="text-base py-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">🇺🇸</span>
                            <span className="font-medium">{t("admin.english")}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="sv" className="text-base py-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">🇸🇪</span>
                            <span className="font-medium">{t("admin.swedish")}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-blue-900 dark:text-blue-100">
                      Language changes apply immediately across the entire platform for all users.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-6">
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-purple-900 dark:text-purple-100">Theme Customization</CardTitle>
                  <CardDescription>Customize your site's primary color theme</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/50">
                <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <AlertDescription className="text-purple-900 dark:text-purple-100">
                  <strong>Theme affects:</strong> Buttons, links, accents, and interactive elements.
                  Backgrounds and cards remain unchanged for consistency.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3 p-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-xl border-2 border-red-200 dark:border-red-800">
                  <Label htmlFor="primary_hue" className="text-base font-semibold flex items-center gap-2">
                    <span className="text-2xl">🎨</span>
                    Hue (Color)
                  </Label>
                  <Input
                    id="primary_hue"
                    type="number"
                    min="0"
                    max="360"
                    value={themeSettings.primary_hue}
                    onChange={(e) => handleThemeChange('primary_hue', e.target.value)}
                    placeholder="24"
                    className="h-12 text-lg font-mono border-2 transition-all focus:ring-2 focus:ring-red-500"
                  />
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="font-semibold">Color wheel (0-360):</p>
                    <div className="grid grid-cols-2 gap-1">
                      <p>• 0° Red</p>
                      <p>• 180° Cyan</p>
                      <p>• 60° Yellow</p>
                      <p>• 240° Blue</p>
                      <p>• 120° Green</p>
                      <p>• 300° Magenta</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border-2 border-purple-200 dark:border-purple-800">
                  <Label htmlFor="primary_saturation" className="text-base font-semibold flex items-center gap-2">
                    <span className="text-2xl">💫</span>
                    Saturation (Intensity)
                  </Label>
                  <Input
                    id="primary_saturation"
                    type="number"
                    min="0"
                    max="100"
                    value={themeSettings.primary_saturation}
                    onChange={(e) => handleThemeChange('primary_saturation', e.target.value)}
                    placeholder="95"
                    className="h-12 text-lg font-mono border-2 transition-all focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="font-semibold">Intensity level (0-100):</p>
                    <p>• 0% = Grayscale (no color)</p>
                    <p>• 50% = Muted colors</p>
                    <p>• 100% = Vibrant, full color</p>
                  </div>
                </div>

                <div className="space-y-3 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                  <Label htmlFor="primary_lightness" className="text-base font-semibold flex items-center gap-2">
                    <span className="text-2xl">☀️</span>
                    Lightness (Brightness)
                  </Label>
                  <Input
                    id="primary_lightness"
                    type="number"
                    min="0"
                    max="100"
                    value={themeSettings.primary_lightness}
                    onChange={(e) => handleThemeChange('primary_lightness', e.target.value)}
                    placeholder="55"
                    className="h-12 text-lg font-mono border-2 transition-all focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="font-semibold">Brightness level (0-100):</p>
                    <p>• 0% = Black</p>
                    <p>• 50% = Normal brightness</p>
                    <p>• 100% = White</p>
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              {/* Enhanced Color Preview */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-xl font-bold">Live Preview</Label>
                  <Badge variant="outline" className="text-xs">
                    Real-time updates
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-3 group">
                    <div
                      className="h-28 rounded-xl shadow-lg transition-transform group-hover:scale-105 border-4 border-white dark:border-slate-900"
                      style={{
                        backgroundColor: `hsl(${themeSettings.primary_hue}, ${themeSettings.primary_saturation}%, ${themeSettings.primary_lightness}%)`
                      }}
                    />
                    <p className="text-sm font-semibold text-center">Primary Color</p>
                  </div>

                  <div className="space-y-3 group">
                    <div
                      className="h-28 rounded-xl shadow-lg transition-all group-hover:scale-105 border-2 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900"
                    >
                      <button className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-110 shadow-md" style={{ backgroundColor: `hsl(${themeSettings.primary_hue}, ${themeSettings.primary_saturation}%, ${themeSettings.primary_lightness}%)`, color: `hsl(${themeSettings.primary_hue}, ${themeSettings.primary_saturation}%, 90%)` }}>
                        Button
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-center">Button Style</p>
                  </div>

                  <div className="space-y-3 group">
                    <div
                      className="h-28 rounded-xl shadow-lg transition-all group-hover:scale-105 border-2 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900"
                    >
                      <span
                        className="text-sm font-medium underline hover:no-underline transition-all hover:scale-110"
                        style={{ color: `hsl(${themeSettings.primary_hue}, ${themeSettings.primary_saturation}%, ${themeSettings.primary_lightness}%)` }}
                      >
                        Sample Link
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-center">Links</p>
                  </div>

                  <div className="space-y-3 group">
                    <div
                      className="h-28 rounded-xl shadow-lg transition-all group-hover:scale-105 border-2 flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900"
                    >
                      <div
                        className="w-4 h-4 rounded-full animate-pulse shadow-md"
                        style={{
                          backgroundColor: `hsl(${themeSettings.primary_hue}, ${themeSettings.primary_saturation}%, ${themeSettings.primary_lightness}%)`
                        }}
                      />
                      <div
                        className="w-2 h-2 rounded-full animate-ping absolute ml-1"
                        style={{
                          backgroundColor: `hsl(${themeSettings.primary_hue}, ${themeSettings.primary_saturation}%, ${themeSettings.primary_lightness}%)`,
                          filter: 'blur(1px)'
                        }}
                      />
                    </div>
                    <p className="text-sm font-semibold text-center">Accents</p>
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={resetThemeToDefault}
                  variant="outline"
                  disabled={isSaving}
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/50"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Default
                </Button>
                <Button
                  onClick={handleSaveTheme}
                  disabled={isSaving}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Theme"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          {/* Payment Gateway Selector */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-indigo-900 dark:text-indigo-100">Payment Gateway</CardTitle>
                  <CardDescription>Select your preferred payment processor</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold">Active Gateway</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setSettings(prev => ({ ...prev, payment_gateway: "stripe" }))}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${settings.payment_gateway === "stripe"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/50 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold">Stripe</h3>
                      {settings.payment_gateway === "stripe" && (
                        <Badge className="bg-purple-500 text-white">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Industry-standard payment processing with card payments
                    </p>
                  </div>

                  <div
                    onClick={() => setSettings(prev => ({ ...prev, payment_gateway: "upgate" }))}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${settings.payment_gateway === "upgate"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/50 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold">Upgate</h3>
                      {settings.payment_gateway === "upgate" && (
                        <Badge className="bg-blue-500 text-white">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      European payment gateway with card and MBWAY support
                    </p>
                  </div>
                </div>

                <Alert className="border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/50">
                  <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <AlertDescription className="text-indigo-900 dark:text-indigo-100">
                    Changing the payment gateway will affect all new purchases. Existing payment records remain valid.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
              <Button
                onClick={async () => {
                  try {
                    setIsSaving(true)
                    const { error } = await supabase.from("admin_settings").upsert({
                      key: 'payment_gateway',
                      value: settings.payment_gateway,
                      updated_at: new Date().toISOString(),
                    }, { onConflict: 'key' })
                    if (error) throw error
                    toast.success("Payment gateway updated successfully")
                  } catch (error) {
                    console.error("Error saving payment gateway:", error)
                    toast.error("Failed to update payment gateway")
                  } finally {
                    setIsSaving(false)
                  }
                }}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Gateway Selection"}
              </Button>
            </CardFooter>
          </Card>

          {/* Stripe Configuration */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-purple-900 dark:text-purple-100">Stripe Integration</CardTitle>
                  <CardDescription>Configure payment processing and webhooks</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-900 dark:text-red-100">
                  <strong>Security warning:</strong> These keys are extremely sensitive. Never share them publicly or commit them to version control.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="stripe_secret_key" className="flex items-center gap-2 font-medium">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    Secret Key
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  </Label>
                  <Input
                    id="stripe_secret_key"
                    name="stripe_secret_key"
                    value={settings.stripe_secret_key}
                    onChange={handleChange}
                    placeholder="sk_test_..."
                    type="password"
                    className="transition-all focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Server-side key for processing payments (starts with sk_)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe_webhook_secret" className="flex items-center gap-2 font-medium">
                    <Globe className="h-4 w-4 text-purple-500" />
                    Webhook Secret
                  </Label>
                  <Input
                    id="stripe_webhook_secret"
                    name="stripe_webhook_secret"
                    value={settings.stripe_webhook_secret}
                    onChange={handleChange}
                    placeholder="whsec_..."
                    type="password"
                    className="transition-all focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Signing secret to verify webhook authenticity (starts with whsec_)
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Stripe Settings"}
              </Button>
            </CardFooter>
          </Card>

          {/* Upgate Configuration */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-blue-900 dark:text-blue-100">Upgate Integration</CardTitle>
                  <CardDescription>Configure European payment gateway</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-900 dark:text-blue-100">
                  Upgate supports card payments and MBWAY. Domain is automatically set based on mode (test/live).
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="upgate_key" className="flex items-center gap-2 font-medium">
                    <CreditCard className="h-4 w-4 text-blue-500" />
                    API Key
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  </Label>
                  <Input
                    id="upgate_key"
                    name="upgate_key"
                    value={settings.upgate_key}
                    onChange={handleChange}
                    placeholder="Your Upgate API key"
                    type="password"
                    className="transition-all focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Your Upgate X-Api-Key for authentication
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upgate_status" className="font-medium">Mode</Label>
                  <Select
                    value={settings.upgate_status}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, upgate_status: value }))}
                  >
                    <SelectTrigger id="upgate_status" className="h-12 text-base transition-all focus:ring-2 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Test</Badge>
                          <span>Sandbox Mode (api.sandbox.upgate.com)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="live">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Live</Badge>
                          <span>Production Mode (api.upgate.com)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Test mode uses sandbox environment for testing without real charges
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Current Domain</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {settings.upgate_status === "live" ? "api.upgate.com" : "api.sandbox.upgate.com"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          setIsSaving(true)
                          const response = await fetch('/api/admin/test-upgate-connection', {
                            method: 'POST',
                          })
                          const result = await response.json()
                          if (result.success) {
                            toast.success(result.message)
                          } else {
                            toast.error(result.message || "Connection test failed")
                          }
                        } catch (error) {
                          toast.error("Failed to test connection")
                        } finally {
                          setIsSaving(false)
                        }
                      }}
                      disabled={isSaving || !settings.upgate_key}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Test Connection
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
              <Button
                onClick={async () => {
                  try {
                    setIsSaving(true)
                    const upgateSettings = [
                      { key: 'upgate_key', value: settings.upgate_key },
                      { key: 'upgate_status', value: settings.upgate_status }
                    ]
                    for (const setting of upgateSettings) {
                      const { error } = await supabase.from("admin_settings").upsert({
                        key: setting.key,
                        value: setting.value,
                        updated_at: new Date().toISOString(),
                      }, { onConflict: 'key' })
                      if (error) throw error
                    }
                    toast.success("Upgate settings saved successfully")
                  } catch (error) {
                    console.error("Error saving Upgate settings:", error)
                    toast.error("Failed to save Upgate settings")
                  } finally {
                    setIsSaving(false)
                  }
                }}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-md hover:shadow-lg transition-all"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Upgate Settings"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Monetization Tab */}
        <TabsContent value="monetization" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monetization Toggle */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-800">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <ToggleLeft className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-green-900 dark:text-green-100">Monetization Control</CardTitle>
                    <CardDescription>Enable or disable monetization features</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-xl border-2 border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Label className="text-lg font-semibold">Enable Monetization</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow users to purchase tokens and premium models
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm">
                            {settings.monetization_enabled ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className={settings.monetization_enabled ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>
                              {settings.monetization_enabled ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => handleMonetizationToggle(!settings.monetization_enabled)}
                        className={`flex items-center gap-2 h-12 px-6 ${settings.monetization_enabled
                          ? "bg-green-100 border-green-300 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:border-green-700 dark:text-green-200 dark:hover:bg-green-800"
                          : "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                          }`}
                      >
                        {settings.monetization_enabled ? (
                          <>
                            <ToggleRight className="h-5 w-5" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5" />
                            Disabled
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Alert className={settings.monetization_enabled ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50"}>
                    {settings.monetization_enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                    <AlertDescription className={`${settings.monetization_enabled ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}>
                      {settings.monetization_enabled
                        ? "Users can purchase tokens and access premium features."
                        : "Users will not see payment options, but existing purchases remain valid."}
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>

            {/* Withdrawal Settings */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-800">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-blue-900 dark:text-blue-100">Withdrawal Settings</CardTitle>
                    <CardDescription>Configure creator payouts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="token_to_usd_rate" className="font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Token Rate
                    </Label>
                    <Input
                      id="token_to_usd_rate"
                      type="number"
                      step="0.001"
                      value={settings.token_to_usd_rate}
                      onChange={(e) => setSettings(prev => ({ ...prev, token_to_usd_rate: e.target.value }))}
                      placeholder="0.01"
                      className="h-12 text-lg font-mono transition-all focus:ring-2 focus:ring-green-500"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      USD value per token (e.g., 0.01 = $0.01/token)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="minimum_withdrawal_amount" className="font-medium">Minimum Amount</Label>
                    <Input
                      id="minimum_withdrawal_amount"
                      type="number"
                      step="0.01"
                      value={settings.minimum_withdrawal_amount}
                      onChange={(e) => setSettings(prev => ({ ...prev, minimum_withdrawal_amount: e.target.value }))}
                      placeholder="10.00"
                      className="h-12 text-lg font-mono transition-all focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Minimum USD amount for withdrawals
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="withdrawal_processing_fee_percent" className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-purple-500" />
                    Processing Fee
                  </Label>
                  <Input
                    id="withdrawal_processing_fee_percent"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={settings.withdrawal_processing_fee_percent}
                    onChange={(e) => setSettings(prev => ({ ...prev, withdrawal_processing_fee_percent: e.target.value }))}
                    placeholder="0"
                    className="h-12 text-lg font-mono transition-all focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Processing fee percentage (0-100%) deducted from withdrawals
                  </p>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
                <Button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-md hover:shadow-lg transition-all"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Withdrawal Settings"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Admin Settings Reset */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="border-b bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-red-900 dark:text-red-100">Admin Settings Fix</CardTitle>
                    <CardDescription>Reset admin_settings table</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-900 dark:text-red-100">
                    <strong>Destructive action:</strong> Completely removes and recreates the admin_settings table with correct UUID structure.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
                <Button
                  onClick={runMigration}
                  variant="outline"
                  className="w-full border-red-500 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/50 transition-all"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Reset Admin Settings
                </Button>
              </CardFooter>
            </Card>

            {/* Site Settings Reset */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-blue-900 dark:text-blue-100">Site Settings Fix</CardTitle>
                    <CardDescription>Reset site_settings table</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <strong>Destructive action:</strong> Completely removes and recreates the site_settings table with correct key-value structure.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
                <Button
                  onClick={resetSiteSettings}
                  variant="outline"
                  className="w-full border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/50 transition-all"
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Reset Site Settings
                </Button>
              </CardFooter>
            </Card>

            {/* View Database Data */}
            <Card className="shadow-lg border-slate-200 dark:border-slate-800 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-green-900 dark:text-green-100">Data Inspector</CardTitle>
                    <CardDescription>View stored configuration</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
                  <Eye className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    View actual data stored in admin_settings and site_settings tables. Output will appear in the browser console.
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="bg-slate-50 dark:bg-slate-900/50 border-t">
                <Button
                  onClick={viewDatabaseData}
                  variant="outline"
                  className="w-full border-green-500 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/50 transition-all"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Database Data
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* System Information */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-500 rounded-lg">
                  <Info className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-slate-900 dark:text-slate-100">System Information</CardTitle>
                  <CardDescription>Current system status and configuration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Environment
                  </Label>
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-sm font-mono font-bold text-center">
                      {process.env.NODE_ENV || "development"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Version
                  </Label>
                  <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <p className="text-sm font-mono font-bold text-center text-blue-900 dark:text-blue-100">
                      v1.0.0
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Last Updated
                  </Label>
                  <div className="p-4 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <p className="text-sm font-mono font-bold text-center text-purple-900 dark:text-purple-100">
                      {new Date().toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
