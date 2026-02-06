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
import { getSubscriptionPlans } from "@/lib/subscription-plans"
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

export default function PremiumPage() {
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([])
  const [content, setContent] = useState<PremiumPageContent>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
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
    const tab = searchParams?.get('tab')
    if (tab === 'tokens' || tab === 'monetization' || tab === 'subscriptions') {
      setViewMode(tab)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchInitialData = async () => {
      // Fetch all data in parallel for faster loading
      const promises = []
      
      // Check monetization status
      promises.push(
        fetch("/api/monetization-status")
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setMonetizationEnabled(data.monetization_enabled)
            }
          })
          .catch(error => console.error("Error fetching monetization status:", error))
      )

      // Fetch subscription plans immediately
      promises.push(
        getSubscriptionPlans()
          .then(plans => setSubscriptionPlans(plans))
          .catch(error => {
            console.error("Error fetching subscription plans:", error)
            toast.error("Failed to load subscription plans.")
          })
      )

      // Fetch token packages
      promises.push(
        supabase.from("token_packages").select("*")
          .then(({ data, error }) => {
            if (error) {
              toast.error("Failed to load token packages.")
            } else if (data) {
              setTokenPackages(data)
            }
          })
      )

      // Fetch models
      promises.push(
        fetch("/api/models")
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setModels(data.models)
            } else {
              toast.error("Failed to load models.")
            }
          })
          .catch(error => {
            console.error("Error fetching models:", error)
            toast.error("Failed to load models.")
          })
      )

      // Fetch content
      promises.push(
        supabase.from("premium_page_content").select("*")
          .then(({ data, error }) => {
            if (error) {
              toast.error("Failed to load page content.")
            } else if (data) {
              const formattedContent = data.reduce((acc, item) => {
                acc[item.section] = item.content
                return acc
              }, {})
              setContent(formattedContent)
            }
          })
      )

      // Wait for all promises to complete
      await Promise.all(promises)
    }

    fetchInitialData()
  }, [])

  // Auto-select the popular subscription plan (12 months)
  useEffect(() => {
    if (subscriptionPlans.length > 0 && !selectedSubscriptionPlanId) {
      // Find the popular plan
      const popularPlan = subscriptionPlans.find(plan => plan.is_popular)
      
      if (popularPlan) {
        setSelectedSubscriptionPlanId(popularPlan.id)
      } else {
        // Fallback to 12-month plan if no popular plan is set
        const twelveMonthPlan = subscriptionPlans.find(plan => plan.duration === 12)
        if (twelveMonthPlan) {
          setSelectedSubscriptionPlanId(twelveMonthPlan.id)
        } else {
          // Fallback to the first plan if neither exists
          setSelectedSubscriptionPlanId(subscriptionPlans[0].id)
        }
      }
    }
  }, [subscriptionPlans, selectedSubscriptionPlanId])

  useEffect(() => {
    const checkPremiumStatus = async () => {
      if (statusCheckRef.current) return
      statusCheckRef.current = true

      try {
        setIsCheckingStatus(true)

        if (!user) {
          setIsCheckingStatus(false)
          statusCheckRef.current = false
          return
        }

        try {
          // Just call the API to ensure profile exists/is synced
          // No need to handle response since API is now lenient
          await fetch("/api/check-premium-status")
        } catch (error) {
          // Silently handle any errors - user can still access the page
          console.error("Error checking premium status:", error)
        }
      } finally {
        setIsCheckingStatus(false)
        statusCheckRef.current = false
      }
    }

    checkPremiumStatus()
  }, [user])

  // Effect to redirect away from monetization tab if disabled
  useEffect(() => {
    if (!monetizationEnabled && viewMode === 'monetization') {
      setViewMode('subscriptions')
    }
  }, [monetizationEnabled, viewMode])

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
        throw new Error(errorMessage) // Still throw to stop further execution in this try block
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
      // If the dialog was shown, the toast is redundant for insufficient tokens
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
                  {monetizationEnabled && (
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
                  )}
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
                        <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mr-2 mt-0.5 flex-shrink-0`} />
                        <span>{content.how_tokens_work_item_3}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className={`${isMobile ? '' : 'md:col-span-5'}`}>
                  <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold ${isMobile ? 'mb-3' : 'mb-4'}`}>{content.select_package_title}</h3>
                  <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
                    {tokenPackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`rounded-xl ${isMobile ? 'p-4' : 'p-6'} cursor-pointer transition-all duration-300 relative ${selectedTokenPackageId === pkg.id
                          ? "bg-primary text-primary-foreground shadow-xl border-2 border-primary transform scale-[1.02] ring-2 ring-primary/30"
                          : "bg-card hover:bg-primary/5 border border-border hover:border-primary/50 hover:shadow-md"
                          }`}
                        onClick={() => setSelectedTokenPackageId(pkg.id)}
                      >
                        {selectedTokenPackageId === pkg.id && (
                          <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-3 right-3'} flex items-center text-white bg-white/20 ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-full backdrop-blur-sm`}>
                            <Check className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1'}`} />
                            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Selected</span>
                          </div>
                        )}

                        <div className={`flex justify-between items-start ${isMobile ? 'mb-1' : 'mb-2'}`}>
                          <div className={`font-bold ${isMobile ? 'text-lg' : 'text-xl'}`}>{pkg.name}</div>
                          {pkg.name === "Super Value" && selectedTokenPackageId !== pkg.id && (
                            <Badge className={`bg-orange-600 text-white ${isMobile ? 'text-xs px-2 py-0.5' : 'text-xs font-bold px-3 py-1'} rounded-full shadow-sm`}>
                              <Star className={`${isMobile ? 'h-2 w-2 mr-0.5' : 'h-3 w-3 mr-1'}`} fill="currentColor" /> BEST VALUE
                            </Badge>
                          )}
                          {pkg.name === "Standard" && selectedTokenPackageId !== pkg.id && (
                            <Badge className={`bg-amber-500 text-primary-foreground ${isMobile ? 'text-xs px-2 py-0.5' : 'text-xs font-bold px-3 py-1'} rounded-full shadow-sm`}>
                              POPULAR
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center mt-1">
                          <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold ${selectedTokenPackageId === pkg.id ? "text-white" : ""}`}>
                            {pkg.tokens}
                          </span>
                          <span
                            className={`ml-2 ${isMobile ? 'text-sm' : ''} ${selectedTokenPackageId === pkg.id ? "text-white/90" : "text-muted-foreground"}`}
                          >
                            tokens
                          </span>
                        </div>

                        <div className={`${isMobile ? 'mt-1' : 'mt-2'} flex justify-between items-center`}>
                          <div
                            className={`${isMobile ? 'text-xs' : 'text-sm'} ${selectedTokenPackageId === pkg.id ? "text-white/90" : "text-muted-foreground"}`}
                          >
                            {Math.floor(pkg.tokens / 5)} images
                          </div>
                          <div className={`font-bold ${isMobile ? 'text-lg' : ''}`}>{formatPrice(pkg.price)}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    className={`w-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 ${isMobile ? 'h-10 mt-4' : 'h-12 mt-6'} transition-all duration-300`}
                    onClick={handleTokenPurchase}
                    disabled={isLoading || !selectedTokenPackageId}
                  >
                    {isLoading ? "Processing..." : "Purchase Tokens"}
                    {!isLoading && (
                      <div className="flex items-center gap-2 ml-2">
                        <img src="/visa-logo.svg" alt="Visa" className={`${isMobile ? 'h-3' : 'h-4'}`} />
                        <img src="/mastercard-logo.svg" alt="Mastercard" className={`${isMobile ? 'h-3' : 'h-4'}`} />
                      </div>
                    )}
                  </Button>

                  <div className={`text-center ${isMobile ? 'text-xs mt-1' : 'text-xs mt-2'} text-muted-foreground`}>
                    {selectedTokenPackageId && (
                      <>
                        One-time payment of{" "}
                        {formatPrice(tokenPackages.find((pkg) => pkg.id === selectedTokenPackageId)?.price || 0)}
                      </>
                    )}
                  </div>
                </div>

                <div className={`${isMobile ? '' : 'md:col-span-4'}`}>
                  <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold ${isMobile ? 'mb-3' : 'mb-4'}`}>{content.value_comparison_title}</h3>
                  <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
                    {(() => {
                      if (tokenPackages.length === 0) {
                        return null
                      }

                      const sortedPackages = [...tokenPackages].sort((a, b) => a.tokens - b.tokens)
                      const basePackage = sortedPackages[0]
                      const baseCostPerToken = basePackage.price / basePackage.tokens

                      return sortedPackages.map((pkg) => {
                        const costPerToken = pkg.price / pkg.tokens
                        const costPerImage = costPerToken * 5
                        const savings = ((baseCostPerToken - costPerToken) / baseCostPerToken) * 100

                        return (
                          <div
                            key={`value-${pkg.id}`}
                            className={`flex items-center justify-between ${isMobile ? 'p-2' : 'p-3'} border border-border rounded-lg`}
                          >
                            <div>
                              <div className={`${isMobile ? 'text-sm' : ''} font-medium`}>{pkg.tokens} tokens</div>
                              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>${costPerImage.toFixed(2)} per image</div>
                            </div>
                            {pkg.id !== basePackage.id && savings > 0 && (
                              <div className={`bg-primary/10 text-primary ${isMobile ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-sm'} rounded font-medium`}>
                                Save {savings.toFixed(0)}%
                              </div>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>

                  <div className={`${isMobile ? 'mt-4 p-3' : 'mt-6 p-4'} bg-muted/30 rounded-lg border border-border`}>
                    <h4 className={`${isMobile ? 'text-sm' : ''} font-medium ${isMobile ? 'mb-1' : 'mb-2'}`}>{content.why_buy_tokens_title}</h4>
                    <ul className={`space-y-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      <li className="flex items-start">
                        <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mr-2 mt-0.5 flex-shrink-0`} />
                        <span>{content.why_buy_tokens_item_1}</span>
                      </li>
                      <li className="flex items-start">
                        <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mr-2 mt-0.5 flex-shrink-0`} />
                        <span>{content.why_buy_tokens_item_2}</span>
                      </li>
                      <li className="flex items-start">
                        <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mr-2 mt-0.5 flex-shrink-0`} />
                        <span>{content.why_buy_tokens_item_3}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          ) : viewMode === 'monetization' ? (
            /* Monetization Section - Models */
            <Card className={`${isMobile ? 'p-4' : 'p-8'} relative overflow-hidden`}>
              <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
                <h2 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold tracking-tight ${isMobile ? 'mb-1' : 'mb-2'} flex items-center justify-center gap-3`}>
                  <Crown className={`${isMobile ? 'h-6 w-6' : 'h-9 w-9'} text-primary`} />
                  Available Models
                </h2>
                <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground`}>Purchase premium AI models with tokens for enhanced image generation</p>
              </div>

              {/* Monetization Feature List */}
              <div className={`${isMobile ? 'mb-6 p-3' : 'mb-8 p-4'} rounded-lg border border-border bg-muted/30`}>
                <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold ${isMobile ? 'mb-2' : 'mb-3'}`}>Premium features:</h3>
                <ul className={`grid gap-2 ${isMobile ? 'text-xs' : 'text-sm'} ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                  <li className="flex items-start gap-2">
                    <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mt-0.5`} />
                    <span>Public character listing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mt-0.5`} />
                    <span>Earn up to 90% spent by users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mt-0.5`} />
                    <span>Watermark-free generations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mt-0.5`} />
                    <span>Public Character Gallery</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mt-0.5`} />
                    <span>Unlimited Chat with Your Character</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mt-0.5`} />
                    <span>Stats Dashboard</span>
                  </li>
                  <li className={`flex items-start gap-2 ${isMobile ? '' : 'md:col-span-2'}`}>
                    <Check className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary mt-0.5`} />
                    <span>And many other exclusive features</span>
                  </li>
                </ul>
              </div>

              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                {models.map((model) => (
                  <div
                    key={model.id}
                    className={`relative rounded-xl ${isMobile ? 'p-4' : 'p-6'} border transition-all duration-300 ${
                      model.is_purchased
                        ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                        : "bg-card hover:bg-primary/5 border-border hover:border-primary/50 hover:shadow-md"
                    }`}
                  >
                    {model.is_purchased && (
                      <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-3 right-3'}`}>
                        <Badge variant="secondary" className={`bg-green-500 text-white ${isMobile ? 'text-xs px-2 py-0.5' : ''}`}>
                          <Check className={`${isMobile ? 'h-2 w-2 mr-0.5' : 'h-3 w-3 mr-1'}`} />
                          Owned
                        </Badge>
                      </div>
                    )}

                    <div className={`${isMobile ? 'mb-3' : 'mb-4'}`}>
                      <div className={`flex items-center gap-2 ${isMobile ? 'mb-1' : 'mb-2'}`}>
                        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>{model.name}</h3>
                        {model.is_premium && (
                          <Star className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary`} fill="currentColor" />
                        )}
                      </div>
                      <Badge variant="outline" className={`${isMobile ? 'text-xs px-2 py-0.5' : 'text-xs'}`}>
                        {model.category}
                      </Badge>
                    </div>

                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ${isMobile ? 'mb-3' : 'mb-4'}`}>{model.description}</p>

                    {model.features && (
                      <div className={`${isMobile ? 'mb-3' : 'mb-4'}`}>
                        <h4 className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium ${isMobile ? 'mb-1' : 'mb-2'}`}>Features:</h4>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(model.features).map(([key, value]) => (
                            <Badge key={key} variant="default" className={`${isMobile ? 'text-xs px-1 py-0.5' : 'text-xs'} bg-primary/10 text-primary-foreground hover:bg-primary/20`}>
                              {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-primary`} />
                        <span className={`font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>{model.token_cost}</span>
                        <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>tokens</span>
                      </div>

                      {!model.is_purchased ? (
                        <Button
                          onClick={() => handleModelPurchase(model.id)}
                          disabled={isPurchasingModel === model.id}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          size={isMobile ? "sm" : "sm"}
                        >
                          {isPurchasingModel === model.id ? "Purchasing..." : "Purchase"}
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className={`text-green-600 border-green-600 ${isMobile ? 'text-xs px-2 py-1' : ''}`}>
                          <Check className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                          Owned
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {models.length === 0 && (
                <div className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
                  <p className={`${isMobile ? 'text-sm' : ''} text-muted-foreground`}>No models available at the moment.</p>
                </div>
              )}
            </Card>
          ) : viewMode === 'subscriptions' ? (
            /* Subscriptions Section - Redesigned UI */
            <div className="relative">
              {/* Three Column Layout */}
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'lg:grid-cols-12 gap-8'} items-start`}>
                
                {/* Left Column - Promotional Section */}
                <div className={`${isMobile ? '' : 'lg:col-span-3'}`}>
                  <div className={`bg-gradient-to-br from-pink-500/10 to-red-500/10 ${isMobile ? 'p-6' : 'p-8'} rounded-2xl border border-pink-500/20`}>
                    <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-pink-400 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                      Get An Exclusive Discount Only Today!
                    </h2>
                    <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-white font-semibold ${isMobile ? 'mb-4' : 'mb-6'}`}>
                      Up to 70% off for first subscription
                    </p>
                    
                    {/* Promotional Image */}
                    {(() => {
                      const promotionalPlan = subscriptionPlans.find(plan => plan.promotional_image) || subscriptionPlans[0];
                      return promotionalPlan?.promotional_image ? (
                        <div className={`${isMobile ? 'h-48' : 'h-64'} rounded-xl overflow-hidden`}>
                          <Image
                            src={promotionalPlan.promotional_image}
                            alt="Promotional Character"
                            width={isMobile ? 200 : 300}
                            height={isMobile ? 200 : 300}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                      ) : (
                      <div className={`${isMobile ? 'h-48' : 'h-64'} bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center`}>
                        <div className="text-center text-gray-400">
                          <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center`}>
                            <Crown className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-gray-400`} />
                          </div>
                          <p className={`${isMobile ? 'text-sm' : ''} font-medium`}>Premium Character</p>
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Center Column - Subscription Plans */}
                <div className={`${isMobile ? '' : 'lg:col-span-6'}`}>
                  <div className="space-y-4">
                    {subscriptionPlans.length === 0 ? (
                      <div className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
                        <p className={`${isMobile ? 'text-sm' : ''} text-muted-foreground`}>No subscription plans available at the moment.</p>
                      </div>
                    ) : (
                      subscriptionPlans.map((plan) => (
                        <div
                          key={plan.id}
                          className={`rounded-xl ${isMobile ? 'p-4' : 'p-6'} cursor-pointer transition-all duration-300 relative ${
                            selectedSubscriptionPlanId === plan.id
                              ? "bg-card border-2 border-primary shadow-lg ring-2 ring-primary/30 transform scale-[1.02]"
                              : "bg-card border border-border hover:border-primary/50 hover:shadow-md"
                          }`}
                          onClick={() => setSelectedSubscriptionPlanId(plan.id)}
                        >


                          <div className={`flex justify-between items-start ${isMobile ? 'mb-1' : 'mb-2'}`}>
                            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-foreground`}>
                              {plan.duration === 1 ? '1 month' : plan.duration === 3 ? '3 months' : plan.duration === 6 ? '6 months' : plan.duration === 12 ? '12 months' : `${plan.duration} months`}
                            </h3>
                            {plan.is_popular && (
                              <Badge className={`bg-primary text-primary-foreground ${isMobile ? 'text-xs px-2 py-0.5' : 'text-xs font-bold px-3 py-1'} rounded-full shadow-sm`}>
                                RECOMMENDED
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              {plan.discount_percentage && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs mt-1">
                                  {plan.discount_percentage}% OFF
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-right">
                              {plan.discounted_price ? (
                                <>
                                  <div className="flex items-baseline gap-2">
                                    <span className="line-through text-muted-foreground text-sm">
                                      ${plan.original_price}
                                    </span>
                                    <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
                                      ${plan.discounted_price}
                                    </span>
                                  </div>
                                  <p className="text-muted-foreground text-sm">/month</p>
                                </>
                              ) : (
                                <>
                                  <span className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-foreground`}>
                                    ${plan.original_price}
                                  </span>
                                  <p className="text-muted-foreground text-sm">/month</p>
                                </>
                              )}
                            </div>
                          </div>

                        </div>
                      ))
                    )}

                    {/* Guarantees */}
                    <div className={`${isMobile ? 'mt-4' : 'mt-6'} space-y-2`}>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">No adult transaction in your bank statement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm text-muted-foreground">No hidden fees • Cancel subscription at any time</span>
                      </div>
                    </div>

                    {/* Payment Options */}
                    <div className={`${isMobile ? 'mt-4' : 'mt-6'} space-y-3`}>
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleSubscriptionPurchase}
                        disabled={!selectedSubscriptionPlanId || isLoading}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span>
                            {isLoading 
                              ? "Processing..."
                              : selectedSubscriptionPlanId 
                                ? (() => {
                                    const selectedPlan = subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlanId)
                                    const monthlyPrice = selectedPlan?.discounted_price || selectedPlan?.original_price || 0
                                    const duration = selectedPlan?.duration || 1
                                    const totalPrice = monthlyPrice * duration
                                    return `Pay $${totalPrice.toFixed(2)} with Credit / Debit Card`
                                  })()
                                : "Select a plan to continue"
                            }
                          </span>
                          {!isLoading && (
                            <div className="flex items-center gap-1 ml-2">
                              <img src="/visa-logo.svg" alt="Visa" className="h-4" />
                              <img src="/mastercard-logo.svg" alt="Mastercard" className="h-4" />
                            </div>
                          )}
                        </div>
                      </Button>
                      
                      <Button
                        variant="outline"
                        className="w-full bg-card border-border hover:bg-accent text-foreground font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => {
                          if (!selectedSubscriptionPlanId) {
                            toast.error("Please select a subscription plan")
                            return
                          }
                          toast.info("Crypto payment coming soon!")
                        }}
                        disabled={!selectedSubscriptionPlanId || isLoading}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span>
                            {selectedSubscriptionPlanId 
                              ? (() => {
                                  const selectedPlan = subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlanId)
                                  const monthlyPrice = selectedPlan?.discounted_price || selectedPlan?.original_price || 0
                                  const duration = selectedPlan?.duration || 1
                                  const totalPrice = monthlyPrice * duration
                                  return `Pay $${totalPrice.toFixed(2)} with`
                                })()
                              : "Select a plan to continue"
                            }
                          </span>
                          <div className="flex items-center gap-1 ml-2">
                            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">₿</span>
                            </div>
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">Ξ</span>
                            </div>
                          </div>
                        </div>
                      </Button>
                    </div>

                    {/* Billing Note */}
                    {selectedSubscriptionPlanId && (() => {
                      const selectedPlan = subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlanId)
                      const monthlyPrice = selectedPlan?.discounted_price || selectedPlan?.original_price || 0
                      const duration = selectedPlan?.duration || 1
                      const totalPrice = monthlyPrice * duration
                      return (
                        <p className={`text-center ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground ${isMobile ? 'mt-2' : 'mt-3'}`}>
                          {duration === 1 
                            ? `Billed monthly at $${monthlyPrice.toFixed(2)}`
                            : `Total: $${totalPrice.toFixed(2)} (${duration} months × $${monthlyPrice.toFixed(2)}/month)`
                          }
                        </p>
                      )
                    })()}
                  </div>
                </div>

                {/* Right Column - Plan Features */}
                <div className={`${isMobile ? '' : 'lg:col-span-3'}`}>
                  <div className={`bg-card ${isMobile ? 'p-6' : 'p-8'} rounded-xl border border-border`}>
                    <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground ${isMobile ? 'mb-4' : 'mb-6'}`}>
                      {selectedSubscriptionPlanId 
                        ? `${subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlanId)?.duration === 1 ? '1 month' : subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlanId)?.duration === 3 ? '3 months' : subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlanId)?.duration === 6 ? '6 months' : subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlanId)?.duration === 12 ? '12 months' : `${subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlanId)?.duration} months`} Plan Features`
                        : 'Select a Plan to View Features'
                      }
                    </h2>
                    
                    {selectedSubscriptionPlanId ? (
                      (() => {
                        const selectedPlan = subscriptionPlans.find(plan => plan.id === selectedSubscriptionPlanId);
                        return selectedPlan?.features && selectedPlan.features.length > 0 ? (
                          <div className="space-y-3">
                            {selectedPlan.features.map((feature, index) => (
                              <div key={index} className="flex items-center gap-3">
                                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                </div>
                                <span className="text-sm text-muted-foreground">{feature}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">No specific features listed for this plan.</p>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Please select a subscription plan to view its features.</p>
                      </div>
                    )}

                    {/* Features Image */}
                    {(() => {
                      const featuresPlan = subscriptionPlans.find(plan => plan.features_image) || subscriptionPlans[0];
                      return featuresPlan?.features_image ? (
                        <div className={`${isMobile ? 'mt-6 h-48' : 'mt-8 h-64'} rounded-xl overflow-hidden`}>
                          <Image
                            src={featuresPlan.features_image}
                            alt="Features Character"
                            width={isMobile ? 200 : 300}
                            height={isMobile ? 200 : 300}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                      ) : (
                      <div className={`${isMobile ? 'mt-6 h-48' : 'mt-8 h-64'} bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center`}>
                        <div className="text-center text-gray-400">
                          <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center`}>
                            <Star className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-gray-400`} />
                          </div>
                          <p className={`${isMobile ? 'text-sm' : ''} font-medium`}>Premium Character</p>
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
  
          {/* User Model Analytics Section */}
          {viewMode === 'monetization' && user?.id && (
            <div className={`${isMobile ? 'mt-6' : 'mt-10'}`}>
              <UserModelAnalytics userId={user.id} />
            </div>
          )}
  
          <div className={`flex justify-center ${isMobile ? 'mt-6' : 'mt-10'}`}>
            <div className={`grid grid-cols-1 ${isMobile ? 'gap-4 max-w-sm' : 'md:grid-cols-2 gap-6 max-w-4xl'} w-full`}>
              <div className={`bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] ${isMobile ? 'p-4' : 'p-5'} rounded-xl border border-[#3a3a3a] shadow-md flex items-center`}>
                <div className={`bg-primary/10 ${isMobile ? 'p-2' : 'p-3'} rounded-full ${isMobile ? 'mr-3' : 'mr-4'}`}>
                  <Shield className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} text-primary`} />
                </div>
                <div>
                  <h4 className={`font-bold text-primary ${isMobile ? 'mb-0.5 text-sm' : 'mb-1'}`}>Secure Payments</h4>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'}`}>{content.security_badge_1}</p>
                </div>
              </div>
              
              <div className={`bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] ${isMobile ? 'p-4' : 'p-5'} rounded-xl border border-[#3a3a3a] shadow-md flex items-center`}>
                <div className={`bg-primary/10 ${isMobile ? 'p-2' : 'p-3'} rounded-full ${isMobile ? 'mr-3' : 'mr-4'}`}>
                  <Lock className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'} text-primary`} />
                </div>
                <div>
                  <h4 className={`font-bold text-primary ${isMobile ? 'mb-0.5 text-sm' : 'mb-1'}`}>Privacy Protected</h4>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'}`}>{content.security_badge_2}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insufficient Tokens Dialog */}
      <AlertDialog open={showInsufficientTokensDialog} onOpenChange={setShowInsufficientTokensDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Insufficient Tokens</AlertDialogTitle>
            <AlertDialogDescription>
              You do not have enough tokens to purchase {insufficientTokensModelName}. Please purchase more tokens to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowInsufficientTokensDialog(false)
              setViewMode('tokens') // Switch to tokens tab
              router.push("/premium") // Optionally navigate to premium page if not already there
            }}>
              Purchase Tokens
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Fragment>
  )
}
