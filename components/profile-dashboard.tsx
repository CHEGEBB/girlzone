"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Coins, CreditCard, TrendingUp, User, Calendar, ImageIcon, Cpu, BarChart3, Crown, Clock } from "lucide-react"
import { TokenTransactionHistory } from "./token-transaction-history"
import { UserProfileInfo } from "./user-profile-info"
import Link from "next/link"
import { useIsMobile } from "@/hooks/use-mobile"
import { ProfileDashboardSkeleton } from "@/components/skeletons"

interface ProfileDashboardProps {
  userId: string
}

interface TokenBalance {
  balance: number
}

interface UserStats {
  totalImagesGenerated: number
  totalTokensSpent: number
  lastGenerationDate: string | null
}

interface PremiumStatus {
  isPremium: boolean
  expiresAt: string | null
  planName: string | null
}

export function ProfileDashboard({ userId }: ProfileDashboardProps) {
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(true);
  const [monetizationEnabled, setMonetizationEnabled] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get authentication headers
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        let headers: HeadersInit = {
          "Content-Type": "application/json",
        }

        // Try to get access token, with fallback to user ID
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`
        } else {
          // Fallback to user ID header
          headers["X-User-ID"] = userId
        }

        // Fetch token balance for the given userId
        const balanceResponse = await fetch(`/api/user-token-balance?userId=${encodeURIComponent(userId)}`);
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          setTokenBalance(balanceData);
        }

        // Fetch user stats with authentication
        const statsResponse = await fetch("/api/user-usage-stats", {
          headers
        });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setUserStats(statsData);
        } else {
          console.error("Failed to fetch user stats:", statsResponse.status, statsResponse.statusText);
        }

        // Fetch subscriptions enabled setting
        const settingsResponse = await fetch("/api/settings/subscriptions_enabled");
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setSubscriptionsEnabled(settingsData.value);
        }

        // Fetch monetization status
        const monetizationResponse = await fetch("/api/monetization-status");
        if (monetizationResponse.ok) {
          const monetizationData = await monetizationResponse.json();
          setMonetizationEnabled(monetizationData.monetization_enabled);
        }

        // Fetch premium status
        const premiumResponse = await fetch(`/api/user-premium-status?userId=${encodeURIComponent(userId)}`, {
          headers
        });
        if (premiumResponse.ok) {
          const premiumData = await premiumResponse.json();
          if (premiumData.success) {
            setPremiumStatus({
              isPremium: premiumData.isPremium,
              expiresAt: premiumData.expiresAt,
              planName: premiumData.planName
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 5000); // Fetch data every 5 seconds

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [userId]);

  if (loading) {
    return <ProfileDashboardSkeleton />;
  }

  return (
    <div className={`space-y-8 ${isMobile ? 'px-2' : ''}`}>
      <div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>Your Profile</h1>
        <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>Manage your account, view your token balance, and track your usage.</p>
      </div>

      {/* Token Balance and Premium Status Cards */}
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        <Card>
          <CardHeader className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row items-center justify-between'} space-y-0 pb-2`}>
            <div>
              <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Token Balance</CardTitle>
              <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-[#1111FF]`}>{tokenBalance?.balance || 0}</div>
            </div>
            <Button asChild className={isMobile ? 'w-full' : ''}>
              <Link href="/premium">
                <CreditCard className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
                <span className={isMobile ? 'text-xs' : 'text-sm'}>Top Up Tokens</span>
              </Link>
            </Button>
          </CardHeader>
        </Card>

        <Card className={premiumStatus?.isPremium ? 'border-primary/50 bg-primary/5' : ''}>
          <CardHeader className={`flex ${isMobile ? 'flex-col space-y-4' : 'flex-row items-center justify-between'} space-y-0 pb-2`}>
            <div className="flex-1">
              <CardTitle className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium flex items-center gap-2`}>
                <Crown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${premiumStatus?.isPremium ? 'text-primary' : 'text-muted-foreground'}`} />
                Subscription Status
              </CardTitle>
              <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${premiumStatus?.isPremium ? 'text-primary' : 'text-muted-foreground'}`}>
                {premiumStatus?.isPremium ? 'Premium Active' : 'Free Plan'}
              </div>
              {premiumStatus?.isPremium && premiumStatus.expiresAt && (
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground flex items-center gap-1 mt-1`}>
                  <Clock className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  Expires: {new Date(premiumStatus.expiresAt).toLocaleDateString()}
                </div>
              )}
              {premiumStatus?.isPremium && premiumStatus.planName && (
                <Badge variant="secondary" className={`${isMobile ? 'text-xs' : 'text-sm'} mt-2`}>
                  {premiumStatus.planName}
                </Badge>
              )}
            </div>
            {!premiumStatus?.isPremium && (
              <Button asChild className={isMobile ? 'w-full' : ''}>
                <Link href="/premium?tab=subscriptions">
                  <Crown className={`${isMobile ? 'mr-1 h-3 w-3' : 'mr-2 h-4 w-4'}`} />
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>Upgrade Now</span>
                </Link>
              </Button>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Detailed Information Tabs */}
      <Tabs defaultValue="status" className="space-y-4">
        <TabsList className={`bg-muted/50 p-1 rounded-lg border ${isMobile ? 'grid grid-cols-2 gap-1' : ''}`}>
          <TabsTrigger value="status" className={isMobile ? 'text-xs' : ''}>Token Status</TabsTrigger>
          <TabsTrigger value="profile" className={isMobile ? 'text-xs' : ''}>Profile Information</TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>Token Status</CardTitle>
              <CardDescription className={isMobile ? 'text-xs' : 'text-sm'}>Your current token balance and recommendations</CardDescription>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'p-4' : ''}`}>
              <div className={`flex items-center justify-between ${isMobile ? 'text-sm' : ''}`}>
                <span>Current Balance:</span>
                <Badge variant="secondary" className={`text-[#1111FF] ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {tokenBalance?.balance || 0} tokens
                </Badge>
              </div>

              {(tokenBalance?.balance || 0) < 25 && (
                <div className={`${isMobile ? 'p-2' : 'p-3'} bg-yellow-50 border border-yellow-200 rounded-lg`}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-yellow-800`}>
                    ⚠️ Low token balance! Consider purchasing more tokens to continue generating images.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8">
            <TokenTransactionHistory userId={userId} />
          </div>
        </TabsContent>

        <TabsContent value="profile">
          <UserProfileInfo userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
