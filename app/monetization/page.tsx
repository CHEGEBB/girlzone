"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Coins,
  BarChart3,
  Calendar,
  Zap,
  Star,
  Cpu,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { UserModelAnalytics } from "@/components/user-model-analytics"
import { WithdrawalRequestForm } from "@/components/withdrawal-request-form-new"
import { WithdrawalHistory } from "@/components/withdrawal-history-new"
import Link from "next/link"
import { useMemo } from "react"
import { UserModelsDisplay } from "@/components/user-models-display"

function RecentActivity() {
  const [items, setItems] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/user-recent-activity")
        const data = await res.json()
        if (data.success) setItems(data.activity || [])
        else setItems([])
      } catch (e) {
        console.error("Failed to load recent activity:", e)
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-14 bg-muted rounded animate-pulse" />
        <div className="h-14 bg-muted rounded animate-pulse" />
        <div className="h-14 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          Activity will appear here as you use the platform
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((it, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${it.type === 'earning' ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'} rounded-full flex items-center justify-center`}>
              {it.type === 'earning' ? (
                <DollarSign className="h-4 w-4 text-green-600" />
              ) : (
                <Cpu className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div>
              <div className="font-medium">{it.title}</div>
              <div className="text-sm text-muted-foreground">
                {it.modelName ? `${it.modelName} • ` : ''}{new Date(it.date).toLocaleDateString()}
              </div>
            </div>
          </div>
          <Badge variant="outline">Recent</Badge>
        </div>
      ))}
    </div>
  )
}

export default function MonetizationPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [monetizationEnabled, setMonetizationEnabled] = useState(true)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [stats, setStats] = useState<{
    tokenBalance: number | null
    totalEarnings: number | null
    modelsOwned: number | null
    availableWithdrawal: number | null
    loading: boolean
  }>({
    tokenBalance: null,
    totalEarnings: null,
    modelsOwned: null,
    availableWithdrawal: null,
    loading: true
  })

  const [modelEarnings, setModelEarnings] = useState<{
    totalTokens: number
    totalEarnings: number
    modelsCount: number
    models: any[]
    loading: boolean
  }>({
    totalTokens: 0,
    totalEarnings: 0,
    modelsCount: 0,
    models: [],
    loading: true
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push("/login?redirect=/monetization")
    }
  }, [mounted, isLoading, user, router])

  useEffect(() => {
    const checkMonetizationStatus = async () => {
      try {
        const response = await fetch("/api/monetization-status")
        const data = await response.json()
        if (data.success) {
          setMonetizationEnabled(data.monetization_enabled)
        }
      } catch (error) {
        console.error("Error checking monetization status:", error)
      } finally {
        setIsCheckingStatus(false)
      }
    }

    if (mounted && user) {
      checkMonetizationStatus()
    }
  }, [mounted, user])

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [balanceRes, earningsRes, analyticsRes] = await Promise.all([
          fetch("/api/user-token-balance"),
          fetch("/api/available-earnings"),
          fetch("/api/model-analytics")
        ])

        const balanceData = balanceRes.ok ? await balanceRes.json() : null
        const earningsData = earningsRes.ok ? await earningsRes.json() : null
        const analyticsData = analyticsRes.ok ? await analyticsRes.json() : null

        setStats({
          tokenBalance: balanceData?.success ? balanceData.balance : 0,
          totalEarnings: earningsData?.success ? earningsData.data.total_earnings : 0,
          modelsOwned: analyticsData?.success ? analyticsData.analytics.summary.purchasedModels : 0,
          availableWithdrawal: earningsData?.success ? earningsData.data.available_amount : 0,
          loading: false
        })
      } catch (error) {
        console.error("Failed to load monetization stats:", error)
        setStats({
          tokenBalance: 0,
          totalEarnings: 0,
          modelsOwned: 0,
          availableWithdrawal: 0,
          loading: false
        })
      }
    }

    if (mounted && user && monetizationEnabled) {
      loadStats()
    }
  }, [mounted, user, monetizationEnabled])

  useEffect(() => {
    const loadModelEarnings = async () => {
      if (!user?.id) return

      try {
        const response = await fetch(`/api/model-earnings?userId=${user.id}`)
        const data = await response.json()

        if (data.success) {
          setModelEarnings({
            totalTokens: data.totalTokens || 0,
            totalEarnings: data.totalEarnings || 0,
            modelsCount: data.modelsCount || 0,
            models: data.models || [],
            loading: false
          })
        } else {
          setModelEarnings({
            totalTokens: 0,
            totalEarnings: 0,
            modelsCount: 0,
            models: [],
            loading: false
          })
        }
      } catch (error) {
        console.error("Failed to load model earnings:", error)
        setModelEarnings({
          totalTokens: 0,
          totalEarnings: 0,
          modelsCount: 0,
          models: [],
          loading: false
        })
      }
    }

    if (mounted && user && monetizationEnabled) {
      loadModelEarnings()
    }
  }, [mounted, user, monetizationEnabled])

  if (!mounted || isLoading || isCheckingStatus) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1111FF]"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  // If monetization is disabled, show unavailable message
  if (!monetizationEnabled) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-gray-500" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Monetization Unavailable</h1>
          <p className="text-muted-foreground mb-6">
            Monetization features are currently disabled. Please check back later.
          </p>
          <Button onClick={() => router.push("/")} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Monetization Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your earnings, models, and withdrawal requests
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token Balance</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1111FF]">
              {stats.loading ? "Loading..." : (stats.tokenBalance ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Available for image generation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {modelEarnings.loading ? "Loading..." : `$${(modelEarnings.totalTokens * 0.0001).toFixed(4)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              From {modelEarnings.totalTokens.toLocaleString()} tokens earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Models Owned</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.loading ? "Loading..." : (stats.modelsOwned ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Premium models purchased
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available for Withdrawal</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {modelEarnings.loading ? "Loading..." : `$${(modelEarnings.totalTokens * 0.0001).toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {modelEarnings.totalTokens * 0.0001 >= 50 ? "Ready to withdraw" : `Need $${(50 - (modelEarnings.totalTokens * 0.0001)).toFixed(2)} more`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Information Alert */}
      <Alert className="mb-8">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Welcome to your Monetization Dashboard!</strong> Here you can view your earnings from model usage,
          manage your purchased models, and request withdrawals. All earnings are automatically tracked when you use premium models.
        </AlertDescription>
      </Alert>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common monetization tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Link href="/premium">
                    <Button className="w-full justify-start" variant="outline">
                      <Star className="mr-2 h-4 w-4" />
                      Purchase Token Packages
                    </Button>
                  </Link>
                  <Link href="/premium">
                    <Button className="w-full justify-start" variant="outline">
                      <Cpu className="mr-2 h-4 w-4" />
                      Browse Premium Models
                    </Button>
                  </Link>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => {
                      const withdrawalsTab = document.querySelector('[value="withdrawals"]') as HTMLElement;
                      withdrawalsTab?.click();
                    }}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    Request Withdrawal
                  </Button>
                  <Link href="/profile">
                    <Button className="w-full justify-start" variant="outline">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      View Profile Analytics
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest monetization activity</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity />
              </CardContent>
            </Card>
          </div>

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                How Monetization Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-medium mb-2">1. Purchase Models</h3>
                  <p className="text-sm text-muted-foreground">
                    Buy premium AI models using tokens to unlock advanced features
                  </p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-medium mb-2">2. Earn from Usage</h3>
                  <p className="text-sm text-muted-foreground">
                    Earn money when others use your purchased models
                  </p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Wallet className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-medium mb-2">3. Withdraw Earnings</h3>
                  <p className="text-sm text-muted-foreground">
                    Request payouts of your earnings via multiple payment methods
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-6">
          {/* Token Earnings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Token Earnings from Model Usage
              </CardTitle>
              <CardDescription>
                Earnings from users chatting with your models at $0.0001 per token
              </CardDescription>
            </CardHeader>
            <CardContent>
              {modelEarnings.loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : modelEarnings.modelsCount === 0 ? (
                <div className="text-center py-8">
                  <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium mb-2">No Model Earnings Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Purchase models and earn when others use them in chats
                  </p>
                  <Link href="/premium">
                    <Button>
                      <Star className="mr-2 h-4 w-4" />
                      Browse Premium Models
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-4 w-4 text-[#1111FF]" />
                        <span className="text-sm font-medium">Total Tokens</span>
                      </div>
                      <div className="text-2xl font-bold text-[#1111FF]">
                        {modelEarnings.totalTokens.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Consumed in all chats
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Total Earnings</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        ${(modelEarnings.totalTokens * 0.0001).toFixed(4)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {modelEarnings.totalTokens} tokens × $0.0001 = ${(modelEarnings.totalTokens * 0.0001).toFixed(4)}
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Earning Models</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {modelEarnings.modelsCount}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Generating revenue
                      </p>
                    </div>
                  </div>

                  {/* Overall Summary for 2+ Models */}
                  {modelEarnings.modelsCount >= 2 && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            Overall Earnings Summary
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Combined earnings across {modelEarnings.modelsCount} models
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-green-600">
                            ${(modelEarnings.totalTokens * 0.0001).toFixed(4)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            From {modelEarnings.totalTokens.toLocaleString()} total tokens
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Models Breakdown */}
                  <div>
                    <h3 className="font-medium mb-3">
                      {modelEarnings.modelsCount >= 2 ? 'Individual Model Earnings' : 'Earnings by Model'}
                    </h3>
                    <div className="space-y-3">
                      {modelEarnings.models.map((model, idx) => {
                        const modelEarning = model.totalTokensConsumed * 0.0001;
                        return (
                          <div key={model.modelId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted">
                                {model.characterImage ? (
                                  <img
                                    src={model.characterImage}
                                    alt={model.characterName || model.modelName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Cpu className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {model.characterName || model.modelName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {model.totalUsageCount} {model.totalUsageCount === 1 ? 'chat' : 'chats'} • {model.totalTokensConsumed.toLocaleString()} tokens
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                ${modelEarning.toFixed(4)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {model.totalTokensConsumed} tokens × $0.0001
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <UserModelAnalytics userId={user.id} />
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-6">
          <WithdrawalRequestForm onSuccess={() => window.location.reload()} />
          <WithdrawalHistory />
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Model Management
              </CardTitle>
              <CardDescription>Manage your purchased models and browse new ones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <UserModelsDisplay showOnlyPurchased className="" />
              <div className="text-center py-4">
                <div className="flex gap-3 justify-center">
                  <Link href="/premium">
                    <Button>
                      <Star className="mr-2 h-4 w-4" />
                      Browse More Models
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const earningsTab = document.querySelector('[value="earnings"]') as HTMLElement;
                      earningsTab?.click();
                    }}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
