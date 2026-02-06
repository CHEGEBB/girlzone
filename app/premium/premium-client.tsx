"use client"

import { useState, useEffect, useRef, Fragment } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Check, Shield, Lock, Zap, Star, Crown, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-context"
import { createClient } from "@/utils/supabase/client"
import { UserModelAnalytics } from "@/components/user-model-analytics"
import { useIsMobile } from "@/hooks/use-mobile"
import type { SubscriptionPlan } from "@/types/subscription"

interface TokenPackage {
  id: string
  name: string
  tokens: number
  price: number
}

interface PremiumPageContent {
  [key: string]: string
}

interface Model {
  id: string
  name: string
  description: string
  category: string
  token_cost: number
  is_premium: boolean
  features: any
  is_purchased: boolean
}

interface PremiumClientProps {
  initialSubscriptionPlans: SubscriptionPlan[]
}

export default function PremiumClient({ initialSubscriptionPlans }: PremiumClientProps) {
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(initialSubscriptionPlans)
  const [content, setContent] = useState<PremiumPageContent>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isPurchasingModel, setIsPurchasingModel] = useState<string | null>(null)
  const [monetizationEnabled, setMonetizationEnabled] = useState(true)
  const [viewMode, setViewMode] = useState<'tokens' | 'monetization' | 'subscriptions'>('subscriptions')
  const [showInsufficientTokensDialog, setShowInsufficientTokensDialog] = useState(false)
  const [insufficientTokensModelName, setInsufficientTokensModelName] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const statusCheckRef = useRef<boolean>(false)
  const [selectedTokenPackageId, setSelectedTokenPackageId] = useState<string | null>(null)
  const [selectedSubscriptionPlanId, setSelectedSubscriptionPlanId] = useState<string | null>(null)
  const supabase = createClient()

  // Set initial tab from URL parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'tokens' || tab === 'monetization' || tab === 'subscriptions') {
      setViewMode(tab)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchInitialData = async () => {
      // Check monetization status first
      try {
        const monetizationResponse = await fetch("/api/monetization-status")
        const monetizationData = await monetizationResponse.json()
        if (monetizationData.success) {
          setMonetizationEnabled(monetizationData.monetization_enabled)
        }
      } catch (error) {
        console.error("Error fetching monetization status:", error)
      }

      // Only fetch monetization data if enabled
      if (monetizationEnabled) {
        const { data: packagesData, error: packagesError } = await supabase.from("token_packages").select("*")
        if (packagesError) {
          toast.error("Failed to load token packages.")
        } else {
          setTokenPackages(packagesData)
        }

        // Fetch models
        try {
          const response = await fetch("/api/models")
          const data = await response.json()
          if (data.success) {
            setModels(data.models)
          } else {
            toast.error("Failed to load models.")
          }
        } catch (error) {
          console.error("Error fetching models:", error)
          toast.error("Failed to load models.")
        }
      }

      const { data: contentData, error: contentError } = await supabase.from("premium_page_content").select("*")
      if (contentError) {
        toast.error("Failed to load page content.")
      } else {
        const formattedContent = contentData.reduce((acc, item) => {
          acc[item.section] = item.content
          return acc
        }, {})
        setContent(formattedContent)
      }
    }

    fetchInitialData()
  }, [monetizationEnabled])

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (statusCheckRef.current) return
      statusCheckRef.current = true

      try {
        setIsCheckingStatus(true)
        setStatusError(null)

        if (!user) {
          setIsCheckingStatus(false)
          statusCheckRef.current = false
          return
        }

        try {
          const response = await fetch("/api/check-premium-status")
          const data = await response.json()

          if (data.error) {
            console.error("Premium status error:", data.error)
            setStatusError(`Error checking premium status`)
          }
        } catch (error) {
          console.error("Error checking premium status:", error)
          setStatusError("Failed to check premium status")
        }
      } finally {
        setIsCheckingStatus(false)
        statusCheckRef.current = false
      }
    }

    checkPremiumStatus()
  }, [user])

  const handleTokenPurchase = async () => {
    if (!selectedTokenPackageId) {
      toast.error("Please select a token package")
      return
    }

    try {
      setIsLoading(true)

      const selectedPackage = tokenPackages.find((pkg) => pkg.id === selectedTokenPackageId)
      if (!selectedPackage) {
        throw new Error("Selected token package not found")
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedTokenPackageId,
          userId: user?.id,
          email: user?.email,
          metadata: {
            type: "token_purchase",
            tokens: selectedPackage.tokens,
            price: selectedPackage.price,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      window.location.href = data.url
    } catch (error) {
      console.error("Payment error:", error)
      toast.error("Failed to process token purchase. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscriptionPurchase = async () => {
    if (!selectedSubscriptionPlanId) {
      toast.error("Please select a subscription plan")
      return
    }

    if (!user) {
      toast.error("You must be logged in to purchase a subscription")
      router.push("/login?redirect=/premium")
      return
    }

    try {
      setIsLoading(true)

      const selectedPlan = subscriptionPlans.find((plan) => plan.id === selectedSubscriptionPlanId)
      if (!selectedPlan) {
        throw new Error("Selected subscription plan not found")
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          userId: user.id,
          email: user.email,
          metadata: {
            type: "subscription_purchase",
            planName: selectedPlan.name,
            planDuration: selectedPlan.duration,
            price: selectedPlan.discounted_price || selectedPlan.original_price,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      window.location.href = data.url
    } catch (error) {
      console.error("Subscription payment error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to process subscription purchase. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleModelPurchase = async (modelId: string) => {
    try {
      setIsPurchasingModel(modelId)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error("You must be logged in to purchase models.")
        router.push("/login?redirect=/premium")
        return
      }


      const response = await fetch("/api/purchase-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ modelId }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || "Failed to purchase model"
        if (errorMessage.includes("Insufficient tokens")) {
          const purchasedModel = models.find(m => m.id === modelId)
          setInsufficientTokensModelName(purchasedModel?.name || "this model")
          setShowInsufficientTokensDialog(true)
        } else {
          toast.error(errorMessage)
        }
        throw new Error(errorMessage)
      }

      toast.success(data.message)
      
      // Refresh models to update purchase status
      const modelsResponse = await fetch("/api/models")
      const modelsData = await modelsResponse.json()
      if (modelsData.success) {
        setModels(modelsData.models)
      }
    } catch (error) {
      console.error("Model purchase error:", error)
      if (!showInsufficientTokensDialog) {
        toast.error(error instanceof Error ? error.message : "Failed to purchase model")
      }
    } finally {
      setIsPurchasingModel(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price)
  }

  if (isCheckingStatus) {
    return (
      <div className={`container max-w-6xl mx-auto ${isMobile ? 'py-8 px-4' : 'py-12 px-4'} flex justify-center`}>
        <div className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} border-4 border-primary border-t-transparent rounded-full animate-spin`} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className={`container max-w-md mx-auto ${isMobile ? 'py-8 px-4' : 'py-12 px-4'}`}>
        <Card className={`${isMobile ? 'p-6' : 'p-8'}`}>
          <div className={`text-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${isMobile ? 'mb-1' : 'mb-2'}`}>Login Required</h1>
            <p className={`${isMobile ? 'text-sm' : ''} text-muted-foreground`}>Please log in to access premium features</p>
          </div>
          <Button className="w-full" onClick={() => router.push("/login?redirect=/premium")}>
            Log In
          </Button>
        </Card>
      </div>
    )
  }

  if (statusError) {
    return (
      <div className={`container max-w-md mx-auto ${isMobile ? 'py-8 px-4' : 'py-12 px-4'}`}>
        <Card className={`${isMobile ? 'p-6' : 'p-8'}`}>
          <div className={`text-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${isMobile ? 'mb-1' : 'mb-2'}`}>Error</h1>
            <p className={`${isMobile ? 'text-sm' : ''} text-muted-foreground`}>There was an error checking your premium status</p>
            {process.env.NODE_ENV === "development" && <p className={`text-xs text-destructive ${isMobile ? 'mt-1' : 'mt-2'}`}>{statusError}</p>}
          </div>
          <Button className="w-full" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  if (!monetizationEnabled) {
    return (
      <div className={`container max-w-6xl mx-auto ${isMobile ? 'py-8 px-4' : 'py-12 px-4'}`}>
        <div className="text-center">
          <div className={`mx-auto ${isMobile ? 'w-12 h-12' : 'w-16 h-16'} bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <Lock className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} text-gray-500`} />
          </div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold ${isMobile ? 'mb-3' : 'mb-4'}`}>Premium Features Unavailable</h1>
          <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground ${isMobile ? 'mb-4' : 'mb-6'}`}>
            Premium features are currently unavailable. Please check back later.
          </p>
          <Button onClick={() => router.push("/")} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Fragment>
      <div className="relative min-h-screen bg-background">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-primary/5 to-background opacity-50" />
        <div className={`container max-w-6xl mx-auto ${isMobile ? 'py-8 px-4' : 'py-12 px-4'} relative z-10`}>
          <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
            <h1 className={`${isMobile ? 'text-3xl' : 'text-5xl'} font-bold tracking-tight ${isMobile ? 'mb-3' : 'mb-4'}`}>
              {viewMode === 'tokens' ? 'Buy Tokens' : 
               viewMode === 'monetization' ? 'Premium Features' : 
               viewMode === 'subscriptions' ? 'Choose your Plan' : 
               content.main_title}
            </h1>
            <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground`}>
              {viewMode === 'tokens' ? 'Pay-as-you-go token system for image generation' :
               viewMode === 'monetization' ? 'Unlock premium AI models and monetization features' :
               viewMode === 'subscriptions' ? '100% anonymous. You can cancel anytime.' :
               content.main_subtitle}
            </p>

            {/* Enhanced Tabs */}
            <div className={`${isMobile ? 'mt-4' : 'mt-6'} flex justify-center`}>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'tokens' | 'monetization' | 'subscriptions')}>
                <TabsList className={`bg-card/50 backdrop-blur-sm border border-border/50 ${isMobile ? 'p-1' : 'p-1.5'} rounded-xl shadow-lg`}>
                  <TabsTrigger 
                    value="subscriptions" 
                    className={`
                      ${isMobile ? 'text-sm px-4 py-2' : 'text-base px-6 py-3'} 
                      font-medium transition-all duration-300 ease-in-out
                      data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md
                      data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-accent/50
                      rounded-lg relative overflow-hidden
                    `}
                  >
                    <span className="relative z-10">Subscriptions</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="tokens" 
                    className={`
                      ${isMobile ? 'text-sm px-4 py-2' : 'text-base px-6 py-3'} 
                      font-medium transition-all duration-300 ease-in-out
                      data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md
                      data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-accent/50
                      rounded-lg relative overflow-hidden
                    `}
                  >
                    <span className="relative z-10">Tokens</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="monetization" 
                    className={`
                      ${isMobile ? 'text-sm px-4 py-2' : 'text-base px-6 py-3'} 
                      font-medium transition-all duration-300 ease-in-out
                      data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md
                      data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-accent/50
                      rounded-lg relative overflow-hidden
                    `}
                  >
                    <span className="relative z-10">Monetization</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {viewMode === 'tokens' ? (
            <Card className={`${isMobile ? 'p-4' : 'p-8'} relative overflow-hidden`}>
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-12 gap-6'}`}>
                <div className={`${isMobile ? '' : 'md:col-span-3'}`}>
                  <div className={`${isMobile ? 'mb-6' : 'mb-8'}`}>
                    <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold ${isMobile ? 'mb-1' : 'mb-2'}`}>
                      <span className="text-primary">{content.token_system_title}</span> {content.pay_as_you_go_title}
                    </h2>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`} dangerouslySetInnerHTML={{ __html: content.purchase_intro || "" }} />
                  </div>

                  <div className={`bg-muted/30 ${isMobile ? 'p-3' : 'p-4'} rounded-lg border border-border`}>
                    <h4 className={`${isMobile ? 'text-sm' : ''} font-medium ${isMobile ? 'mb-1' : 'mb-2'}`}>{content.how_tokens_work_title}</h4>
                    <ul className={`space-y-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      <li className="flex items-start">
                        <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mr-2 mt-0.5 flex-shrink-0`} />
                        <span>{content.how_tokens_work_item_1}</span>
                      </li>
                      <li className="flex items-start">
                        <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mr-2 mt-0.5 flex-shrink-0`} />
                        <span>{content.how_tokens_work_item_2}</span>
                      </li>
                      <li className="flex items-start">
                        <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mr-2 mt-0.5 flex-shr
