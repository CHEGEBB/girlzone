"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth-context"
import { useSite } from "@/components/site-context"
import { useCharacters } from "@/components/character-context"
import {
  Home,
  Save,
  Edit,
  Settings,
  Users,
  MessageSquare,
  CreditCard,
  TrendingUp,
  DollarSign,
  Activity,
  Eye,
  UserPlus,
  Database,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth()
  const { settings, updateSettings } = useSite()
  const { characters } = useCharacters()
  const router = useRouter()

  // Site and SEO settings
  const [siteName, setSiteName] = useState(settings.siteName)
  const [logoText, setLogoText] = useState(settings.logoText)
  const [siteSuffix, setSiteSuffix] = useState(settings.siteSuffix)
  const [seoTitle, setSeoTitle] = useState(settings.seoTitle)
  const [seoDescription, setSeoDescription] = useState(settings.seoDescription)
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string>("")
  const [customFaviconUrl, setCustomFaviconUrl] = useState<string>("")
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false)

  // Pricing settings
  const [currency, setCurrency] = useState(settings.pricing.currency)
  const [currencyPosition, setCurrencyPosition] = useState(settings.pricing.currencyPosition)
  const [monthlyPrice, setMonthlyPrice] = useState(settings.pricing.monthly.price.toString())
  const [monthlyOriginalPrice, setMonthlyOriginalPrice] = useState(settings.pricing.monthly.originalPrice.toString())
  const [monthlyDiscount, setMonthlyDiscount] = useState(settings.pricing.monthly.discount.toString())
  const [quarterlyPrice, setQuarterlyPrice] = useState(settings.pricing.quarterly.price.toString())
  const [quarterlyOriginalPrice, setQuarterlyOriginalPrice] = useState(
    settings.pricing.quarterly.originalPrice.toString(),
  )
  const [quarterlyDiscount, setQuarterlyDiscount] = useState(settings.pricing.quarterly.discount.toString())
  const [yearlyPrice, setYearlyPrice] = useState(settings.pricing.yearly.price.toString())
  const [yearlyOriginalPrice, setYearlyOriginalPrice] = useState(settings.pricing.yearly.originalPrice.toString())
  const [yearlyDiscount, setYearlyDiscount] = useState(settings.pricing.yearly.discount.toString())
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  // Real stats from actual data
  const [monthlyRevenue, setMonthlyRevenue] = useState<number | undefined>(undefined)
  const [totalRevenue, setTotalRevenue] = useState<number | undefined>(undefined)
  const [totalOrders, setTotalOrders] = useState<number | undefined>(undefined)
  const [totalUsers, setTotalUsers] = useState<number | undefined>(undefined)
  const [activeCharactersCount, setActiveCharactersCount] = useState<number | undefined>(undefined)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // Update local state when settings change
  useEffect(() => {
    setSiteName(settings.siteName)
    setLogoText(settings.logoText)
    setSiteSuffix(settings.siteSuffix)
    setSeoTitle(settings.seoTitle)
    setSeoDescription(settings.seoDescription)
    if (settings.customFaviconUrl) {
      setCustomFaviconUrl(settings.customFaviconUrl)
      setFaviconPreview(settings.customFaviconUrl)
    }
  }, [settings])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const monthlyResponse = await fetch("/api/monthly-revenue", { next: { revalidate: 0 } })
        if (monthlyResponse.ok) {
          const monthlyData = await monthlyResponse.json()
          setMonthlyRevenue(monthlyData.totalRevenue)
        } else {
          setMonthlyRevenue(0)
        }
      } catch (error) {
        console.error("Failed to fetch monthly revenue:", error)
        setMonthlyRevenue(0)
      }

      try {
        const totalResponse = await fetch("/api/revenue", { next: { revalidate: 0 } })
        if (totalResponse.ok) {
          const totalData = await totalResponse.json()
          setTotalRevenue(totalData.totalRevenue)
          setTotalOrders(totalData.totalOrders)
        } else {
          setTotalRevenue(0)
          setTotalOrders(0)
        }
      } catch (error) {
        console.error("Failed to fetch total revenue:", error)
        setTotalRevenue(0)
        setTotalOrders(0)
      }

      try {
        const usersResponse = await fetch("/api/total-users", { next: { revalidate: 0 } })
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setTotalUsers(usersData.totalUsers)
        } else {
          setTotalUsers(0)
        }
      } catch (error) {
        console.error("Failed to fetch total users:", error)
        setTotalUsers(0)
      }

      try {
        const charactersResponse = await fetch("/api/total-characters", { next: { revalidate: 0 } })
        if (charactersResponse.ok) {
          const charactersData = await charactersResponse.json()
          setActiveCharactersCount(charactersData.totalCharacters)
        } else {
          setActiveCharactersCount(0)
        }
      } catch (error) {
        console.error("Failed to fetch total characters:", error)
        setActiveCharactersCount(0)
      }

      try {
        const activityResponse = await fetch("/api/recent-activity", { next: { revalidate: 0 } })
        if (activityResponse.ok) {
          const activityData = await activityResponse.json()
          setRecentActivity(activityData.activity)
        } else {
          setRecentActivity([])
        }
      } catch (error) {
        console.error("Failed to fetch recent activity:", error)
        setRecentActivity([])
      }
    }

    fetchData()

    const interval = setInterval(fetchData, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const { users: authUsers } = useAuth()

  const stats = [
    {
      title: "Total Users",
      value: authUsers.length.toString(),
      change: "0%",
      changeType: "neutral",
      icon: Users,
    },
    {
      title: "Active Characters",
      value: typeof activeCharactersCount === 'number' ? activeCharactersCount.toString() : (characters?.length?.toString() || "0"),
      change: "0%",
      changeType: "neutral",
      icon: MessageSquare,
    },
    {
      title: "Token usage",
      value: typeof monthlyRevenue === 'number' ? `${monthlyRevenue.toFixed(2)}` : "0.00",
      change: "0%",
      changeType: "neutral",
      icon: DollarSign,
    },
    {
      title: "Total Revenue",
      value: typeof activeCharactersCount === 'number' ? activeCharactersCount.toString() : (characters?.length?.toString() || "0"),
      change: "0%",
      changeType: "neutral",
      icon: MessageSquare,
    },
    {
      title: "Total Orders",
      value: typeof totalOrders === 'number' ? totalOrders.toString() : "0",
      change: "0%",
      changeType: "neutral",
      icon: CreditCard,
    },
  ]

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      router.push("/admin/login")
    }
  }, [user, isLoading, router])

  const handleSaveSEO = async () => {
    setIsSaving(true)
    try {
      await updateSettings({
        siteName,
        logoText,
        siteSuffix,
        seoTitle,
        seoDescription,
      })
      setSaveMessage("SEO settings saved successfully!")

      setTimeout(() => {
        setSaveMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error saving SEO settings:", error)
      setSaveMessage("Error saving SEO settings. Please try again.")

      setTimeout(() => {
        setSaveMessage("")
      }, 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFaviconFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setFaviconPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadFavicon = async () => {
    if (!faviconFile) return

    setIsUploadingFavicon(true)
    try {
      const formData = new FormData()
      formData.append("file", faviconFile)

      const response = await fetch("/api/upload-favicon", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setCustomFaviconUrl(data.url)

        // Save favicon URL to settings
        await updateSettings({
          customFaviconUrl: data.url,
        } as any)

        setSaveMessage("Favicon uploaded successfully!")
        setTimeout(() => {
          setSaveMessage("")
        }, 3000)
      } else {
        throw new Error("Failed to upload favicon")
      }
    } catch (error) {
      console.error("Error uploading favicon:", error)
      setSaveMessage("Error uploading favicon. Please try again.")
      setTimeout(() => {
        setSaveMessage("")
      }, 5000)
    } finally {
      setIsUploadingFavicon(false)
    }
  }

  const handleSavePricing = async () => {
    setIsSaving(true)
    try {
      await updateSettings({
        pricing: {
          currency,
          currencyPosition,
          monthly: {
            price: Number.parseFloat(monthlyPrice),
            originalPrice: Number.parseFloat(monthlyOriginalPrice),
            discount: Number.parseInt(monthlyDiscount),
          },
          quarterly: {
            price: Number.parseFloat(quarterlyPrice),
            originalPrice: Number.parseFloat(quarterlyOriginalPrice),
            discount: Number.parseInt(quarterlyDiscount),
          },
          yearly: {
            price: Number.parseFloat(yearlyPrice),
            originalPrice: Number.parseFloat(yearlyOriginalPrice),
            discount: Number.parseInt(yearlyDiscount),
          },
        },
      })
      setSaveMessage("Pricing saved successfully!")

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage("")
      }, 3000)
    } catch (error) {
      console.error("Error saving pricing:", error)
      setSaveMessage("Error saving pricing. Please try again.")

      // Clear error message after 5 seconds
      setTimeout(() => {
        setSaveMessage("")
      }, 5000)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !user.isAdmin) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Welcome back! Here's your platform overview.</p>
        </div>
        <Button onClick={() => router.push("/")} variant="outline" className="flex items-center space-x-2">
          <Home className="h-4 w-4" />
          <span>View Site</span>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
              <div className="flex items-center space-x-1 mt-1">
                <Badge
                  variant={
                    stat.changeType === "positive"
                      ? "default"
                      : stat.changeType === "negative"
                        ? "destructive"
                        : "secondary"
                  }
                  className="text-xs"
                >
                  {stat.change}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="seo">SEO & Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>System Status</span>
                </CardTitle>
                <CardDescription>Current system health and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database</span>
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      Online
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Services</span>
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Image Generation</span>
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      Available
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Storage</span>
                    <Badge
                      variant="default"
                      className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    >
                      Connected
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4 bg-transparent"
                    onClick={() => router.push("/admin/dashboard/users")}
                  >
                    <div className="flex items-center space-x-3">
                      <UserPlus className="h-5 w-5 text-blue-500" />
                      <div className="text-left">
                        <div className="font-medium">Manage Users</div>
                        <div className="text-xs text-slate-500">Add or edit users</div>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4 bg-transparent"
                    onClick={() => router.push("/admin/dashboard/characters")}
                  >
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="h-5 w-5 text-green-500" />
                      <div className="text-left">
                        <div className="font-medium">Characters</div>
                        <div className="text-xs text-slate-500">Manage AI characters</div>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4 bg-transparent"
                    onClick={() => router.push("/admin/payment-methods")}
                  >
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-5 w-5 text-purple-500" />
                      <div className="text-left">
                        <div className="font-medium">Payments</div>
                        <div className="text-xs text-slate-500">Configure payments</div>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4 bg-transparent"
                    onClick={() => router.push("/admin/dashboard/database")}
                  >
                    <div className="flex items-center space-x-3">
                      <Database className="h-5 w-5 text-orange-500" />
                      <div className="text-left">
                        <div className="font-medium">Database</div>
                        <div className="text-xs text-slate-500">Database tools</div>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>Latest actions on your platform</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <ul className="space-y-4">
                  {recentActivity.map((activity) => (
                    <li key={activity.id} className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {activity.users_view.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {activity.users_view.username}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {activity.description}
                        </p>
                      </div>
                      <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No recent activity</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Activity will appear here as users interact with your platform.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Site Information</CardTitle>
              <CardDescription>Configure your site's basic information and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Girlzone"
                  />
                  <p className="text-xs text-slate-500">The name of your site</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoText">Logo Text</Label>
                  <Input
                    id="logoText"
                    value={logoText}
                    onChange={(e) => setLogoText(e.target.value)}
                    placeholder="Girlzone"
                  />
                  <p className="text-xs text-slate-500">Text displayed in the logo and used for dynamic favicon</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteSuffix">Site Suffix</Label>
                <Input
                  id="siteSuffix"
                  value={siteSuffix}
                  onChange={(e) => setSiteSuffix(e.target.value)}
                  placeholder=".ai"
                />
                <p className="text-xs text-slate-500">Suffix displayed next to the logo (e.g. .ai, .com)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="Girlzone - Your AI Companion"
                  maxLength={60}
                />
                <div className="flex justify-between text-xs">
                  <p className="text-slate-500">The title shown in search engines and browser tabs</p>
                  <span className={seoTitle.length > 60 ? "text-red-500" : "text-slate-500"}>
                    {seoTitle.length}/60
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO Description</Label>
                <textarea
                  id="seoDescription"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="Explore and chat with AI characters on Girlzone"
                  maxLength={160}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
                />
                <div className="flex justify-between text-xs">
                  <p className="text-slate-500">The description shown in search engine results</p>
                  <span className={seoDescription.length > 160 ? "text-red-500" : "text-slate-500"}>
                    {seoDescription.length}/160
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSaveSEO}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save SEO Settings"}
                </Button>
                {saveMessage && (
                  <p className={`mt-2 text-sm ${saveMessage.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                    {saveMessage}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Favicon Settings</CardTitle>
              <CardDescription>Upload a custom favicon or use the dynamic one generated from your logo text</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="faviconUpload">Upload Custom Favicon</Label>
                    <p className="text-xs text-slate-500 mb-2">PNG or ICO format, recommended 32x32 or 64x64 pixels</p>
                    <Input
                      id="faviconUpload"
                      type="file"
                      accept=".png,.ico,.svg"
                      onChange={handleFaviconChange}
                      className="cursor-pointer"
                    />
                  </div>

                  {faviconFile && (
                    <Button
                      onClick={handleUploadFavicon}
                      disabled={isUploadingFavicon}
                      className="w-full"
                    >
                      {isUploadingFavicon ? "Uploading..." : "Upload Favicon"}
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>Favicon Preview</Label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center space-y-4">
                    {faviconPreview ? (
                      <>
                        <img src={faviconPreview} alt="Favicon preview" className="w-16 h-16" />
                        <p className="text-xs text-slate-500">Custom favicon preview</p>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
                          {logoText.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-xs text-slate-500">Dynamic favicon (from logo text)</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Note:</strong> If no custom favicon is uploaded, a dynamic SVG favicon will be generated using the first letter of your logo text.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
