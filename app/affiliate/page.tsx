"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Copy, Check, Users, DollarSign, Share2, Wallet, ArrowDownToLine, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AffiliateDashboardSkeleton } from "@/components/skeletons"

interface BonusWallet {
  balance: number
  lifetime_earnings: number
  withdrawn_amount: number
  usdt_address: string | null
}

interface Downline {
  downline_id: string
  downline_email: string
  level: number
  total_earnings: number
  joined_date: string
}

interface Transaction {
  id: string
  transaction_type: string
  amount: number
  level: number | null
  description: string
  created_at: string
  from_user: { email: string } | null
}

interface Withdrawal {
  id: string
  amount: number
  usdt_address: string
  status: string
  tx_hash: string | null
  requested_at: string
  processed_at: string | null
}

interface SharedChat {
  id: string
  character_id: string
  share_code: string
  include_history: boolean
  view_count: number
  click_count: number
  conversion_count: number
  is_active: boolean
  created_at: string
}

export default function AffiliatePage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [wallet, setWallet] = useState<BonusWallet | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [downlines, setDownlines] = useState<Downline[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [sharedChats, setSharedChats] = useState<SharedChat[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [copiedCode, setCopiedCode] = useState(false)
  
  // Withdrawal form
  const [withdrawalAmount, setWithdrawalAmount] = useState("")
  const [usdtAddress, setUsdtAddress] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [withdrawalError, setWithdrawalError] = useState("")

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }

    fetchData()
  }, [user, router])

  const fetchData = async () => {
    try {
      // Fetch wallet
      const walletRes = await fetch("/api/bonus-wallet", { credentials: "include" })
      if (walletRes.ok) {
        const walletData = await walletRes.json()
        setWallet(walletData.wallet)
        setReferralCode(walletData.referralCode)
        setUsdtAddress(walletData.wallet.usdt_address || "")
      }

      // Fetch downlines
      const downlinesRes = await fetch("/api/downlines", { credentials: "include" })
      if (downlinesRes.ok) {
        const downlinesData = await downlinesRes.json()
        setDownlines(downlinesData.downlines || [])
      }

      // Fetch transactions
      const transactionsRes = await fetch("/api/bonus-transactions", { credentials: "include" })
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json()
        setTransactions(transactionsData.transactions || [])
      }

      // Fetch withdrawals
      const withdrawalsRes = await fetch("/api/usdt-withdrawal", { credentials: "include" })
      if (withdrawalsRes.ok) {
        const withdrawalsData = await withdrawalsRes.json()
        setWithdrawals(withdrawalsData.withdrawals || [])
      }

      // Fetch shared chats
      const sharedChatsRes = await fetch("/api/share-chat", { credentials: "include" })
      if (sharedChatsRes.ok) {
        const sharedChatsData = await sharedChatsRes.json()
        setSharedChats(sharedChatsData.sharedChats || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyReferralCode = async () => {
    if (referralCode) {
      const referralUrl = `${window.location.origin}?ref=${referralCode}`
      const copyToClipboardFallback = (text: string) => {
        try {
          const textArea = document.createElement("textarea")
          textArea.value = text
          textArea.style.position = "fixed"
          textArea.style.opacity = "0"
          textArea.style.pointerEvents = "none"
          textArea.style.left = "0"
          textArea.style.top = "0"
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          
          const successful = document.execCommand('copy')
          if (successful) {
            setCopiedCode(true)
          } else {
            console.error('Fallback: Copy command was unsuccessful')
          }
          
          document.body.removeChild(textArea)
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err)
        }
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(referralUrl)
          setCopiedCode(true)
        } else {
          copyToClipboardFallback(referralUrl)
        }
        setTimeout(() => setCopiedCode(false), 2000)
      } catch (err) {
        console.error("Failed to copy referral code using Clipboard API, trying fallback:", err)
        copyToClipboardFallback(referralUrl)
        setTimeout(() => setCopiedCode(false), 2000)
      }
    }
  }

  const handleSaveUsdtAddress = async () => {
    try {
      const response = await fetch("/api/bonus-wallet", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ usdtAddress }),
      })

      if (response.ok) {
        alert("USDT address saved successfully!")
      }
    } catch (error) {
      console.error("Error saving USDT address:", error)
    }
  }

  const handleWithdrawal = async () => {
    setWithdrawalError("")
    setIsSubmitting(true)

    try {
      const amount = parseFloat(withdrawalAmount)
      
      if (isNaN(amount) || amount < 10) {
        setWithdrawalError("Minimum withdrawal is $10")
        return
      }

      if (!usdtAddress) {
        setWithdrawalError("Please set your USDT address first")
        return
      }

      const response = await fetch("/api/usdt-withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount, usdtAddress }),
      })

      const data = await response.json()

      if (response.ok) {
        alert("Withdrawal request submitted successfully!")
        setWithdrawalAmount("")
        fetchData() // Refresh data
      } else {
        setWithdrawalError(data.error || "Failed to submit withdrawal")
      }
    } catch (error) {
      setWithdrawalError("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const levelStats = {
    level1: downlines.filter(d => d.level === 1).length,
    level2: downlines.filter(d => d.level === 2).length,
    level3: downlines.filter(d => d.level === 3).length,
  }

  if (isLoading) {
    return <AffiliateDashboardSkeleton />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Multi-Level Affiliate System</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Earn up to 50% commission on 3 levels of referrals. Withdraw via USDT (TRC20)
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Bonus Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                <span className="text-2xl sm:text-3xl font-bold">${wallet?.balance.toFixed(2) || "0.00"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Lifetime Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                <span className="text-2xl sm:text-3xl font-bold">${wallet?.lifetime_earnings.toFixed(2) || "0.00"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                <span className="text-2xl sm:text-3xl font-bold">{downlines.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Withdrawn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                <span className="text-2xl sm:text-3xl font-bold">${wallet?.withdrawn_amount.toFixed(2) || "0.00"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Card */}
        <Card className="mb-6 sm:mb-8 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-bold text-base sm:text-lg mb-1">Your Referral Link</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                  Share this link to earn 50% on Level 1, 5% on Level 2, and 5% on Level 3
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <code className="bg-background px-3 py-2 rounded border text-xs sm:text-sm break-all flex-1 overflow-x-auto">
                    {window.location.origin}?ref={referralCode}
                  </code>
                  <Button size="sm" onClick={handleCopyReferralCode} className="shrink-0 w-full sm:w-auto">
                    {copiedCode ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span className="ml-2 sm:hidden">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span className="ml-2 sm:hidden">Copy Link</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600 text-xs sm:text-sm">Level 1: 50%</Badge>
                <Badge variant="outline" className="text-blue-600 border-blue-600 text-xs sm:text-sm">Level 2: 5%</Badge>
                <Badge variant="outline" className="text-purple-600 border-purple-600 text-xs sm:text-sm">Level 3: 5%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 h-auto p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 py-2">Overview</TabsTrigger>
            <TabsTrigger value="downlines" className="text-xs sm:text-sm px-2 py-2">Downlines</TabsTrigger>
            <TabsTrigger value="shared-chats" className="text-xs sm:text-sm px-2 py-2">Shared Chats</TabsTrigger>
            <TabsTrigger value="withdrawal" className="text-xs sm:text-sm px-2 py-2">Withdraw</TabsTrigger>
            <TabsTrigger value="history" className="text-xs sm:text-sm px-2 py-2">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {/* Chat Sharing Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Chat Sharing Performance</CardTitle>
                  <CardDescription>
                    Stats from your shared chats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Total Shares</span>
                      <span className="text-2xl font-bold">{sharedChats.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Total Clicks</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {sharedChats.reduce((sum, chat) => sum + chat.click_count, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Conversions</span>
                      <span className="text-2xl font-bold text-green-600">
                        {sharedChats.reduce((sum, chat) => sum + chat.conversion_count, 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>
                    Latest commission earnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No transactions yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transactions.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground truncate">
                            {tx.description}
                          </span>
                          <span className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Withdrawals */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Withdrawals</CardTitle>
                  <CardDescription>
                    Latest affiliate withdrawal requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {withdrawals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No withdrawals yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {withdrawals.slice(0, 5).map((withdrawal) => (
                        <div key={withdrawal.id} className="flex justify-between items-center text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-orange-600">
                                ${withdrawal.amount.toFixed(2)}
                              </span>
                              <Badge
                                variant={
                                  withdrawal.status === "completed" ? "default" :
                                  withdrawal.status === "pending" ? "secondary" :
                                  withdrawal.status === "processing" ? "outline" :
                                  "destructive"
                                }
                                className="text-xs"
                              >
                                {withdrawal.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              To: {withdrawal.usdt_address.substring(0, 10)}...
                              {withdrawal.usdt_address.substring(withdrawal.usdt_address.length - 6)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(withdrawal.requested_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Downlines Tab */}
          <TabsContent value="downlines">
            <Card>
              <CardHeader>
                <CardTitle>Your Referral Network</CardTitle>
                <CardDescription>
                  View all your referrals across 3 levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                  <div className="text-center p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">{levelStats.level1}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Level 1 (50%)</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{levelStats.level2}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Level 2 (5%)</div>
                  </div>
                  <div className="text-center p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">{levelStats.level3}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Level 3 (5%)</div>
                  </div>
                </div>

                {downlines.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Referrals Yet</h3>
                    <p className="text-muted-foreground">
                      Start sharing your referral link to build your network
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {downlines.map((downline) => (
                      <div
                        key={downline.downline_id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 gap-3"
                      >
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <Badge 
                            variant={downline.level === 1 ? "default" : "outline"}
                            className={`shrink-0 text-xs ${
                              downline.level === 1 ? "bg-green-600" :
                              downline.level === 2 ? "border-blue-600 text-blue-600" :
                              "border-purple-600 text-purple-600"
                            }`}
                          >
                            Level {downline.level}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm sm:text-base break-all">{downline.downline_email}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              Joined {new Date(downline.joined_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0 pl-10 sm:pl-0">
                          <div className="font-bold text-green-600 text-sm sm:text-base">
                            ${Number(downline.total_earnings).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">earned from this user</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Shared Chats Tab */}
          <TabsContent value="shared-chats">
            <Card>
              <CardHeader>
                <CardTitle>Your Shared Chats</CardTitle>
                <CardDescription>
                  Manage your shared chat links and track their performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sharedChats.length === 0 ? (
                  <div className="text-center py-12">
                    <Share2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Shared Chats Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start sharing your chats to earn commission!
                    </p>
                    <Button onClick={() => router.push("/chat")}>
                      Go to Chat
                      <Share2 className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {sharedChats.map((chat) => (
                      <div
                        key={chat.id}
                        className="border border-border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <span className="font-mono text-xs sm:text-sm bg-muted px-2 py-1 rounded break-all">
                                {chat.share_code}
                              </span>
                              <Badge variant={chat.is_active ? "default" : "secondary"} className="text-xs">
                                {chat.is_active ? "Active" : "Inactive"}
                              </Badge>
                              {chat.include_history && (
                                <Badge variant="outline" className="text-xs">With History</Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm mb-3">
                              <div>
                                <div className="text-muted-foreground">Clicks</div>
                                <div className="font-bold text-blue-600">{chat.click_count}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Conversions</div>
                                <div className="font-bold text-green-600">{chat.conversion_count}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Created</div>
                                <div className="font-medium text-xs">{new Date(chat.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto text-xs sm:text-sm"
                                onClick={async () => {
                                  const url = `${window.location.origin}/shared-chat/${chat.share_code}`
                                  const copyToClipboardFallback = (text: string) => {
                                    try {
                                      const textArea = document.createElement("textarea")
                                      textArea.value = text
                                      textArea.style.position = "fixed"
                                      textArea.style.opacity = "0"
                                      textArea.style.pointerEvents = "none"
                                      textArea.style.left = "0"
                                      textArea.style.top = "0"
                                      document.body.appendChild(textArea)
                                      textArea.focus()
                                      textArea.select()
                                      
                                      const successful = document.execCommand('copy')
                                      if (!successful) {
                                        console.error('Fallback: Copy command was unsuccessful')
                                      }
                                      
                                      document.body.removeChild(textArea)
                                    } catch (err) {
                                      console.error('Fallback: Oops, unable to copy', err)
                                    }
                                  }

                                  try {
                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                      await navigator.clipboard.writeText(url)
                                    } else {
                                      copyToClipboardFallback(url)
                                    }
                                  } catch (err) {
                                    console.error("Failed to copy link using Clipboard API, trying fallback:", err)
                                    copyToClipboardFallback(url)
                                  }
                                }}
                              >
                                <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                Copy Link
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto text-xs sm:text-sm"
                                onClick={() => window.open(`/shared-chat/${chat.share_code}`, "_blank")}
                              >
                                Preview
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab - Removed, now in Overview */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  All your bonus earnings and withdrawals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                    <p className="text-muted-foreground">
                      Your commission earnings will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{tx.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString()}
                            {tx.from_user && ` • From: ${tx.from_user.email}`}
                          </div>
                        </div>
                        <div className={`font-bold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                          {tx.amount > 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawal Tab */}
          <TabsContent value="withdrawal">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Withdraw to USDT (TRC20)</CardTitle>
                  <CardDescription>
                    Minimum withdrawal: $10 USD
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="usdt-address" className="text-sm sm:text-base">USDT TRC20 Address</Label>
                    <div className="flex flex-col sm:flex-row gap-2 mt-1">
                      <Input
                        id="usdt-address"
                        value={usdtAddress}
                        onChange={(e) => setUsdtAddress(e.target.value)}
                        placeholder="Enter your USDT TRC20 address"
                        className="text-sm"
                      />
                      <Button onClick={handleSaveUsdtAddress} variant="outline" className="w-full sm:w-auto shrink-0">
                        Save
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="amount" className="text-sm sm:text-base">Withdrawal Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={withdrawalAmount}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="10"
                      step="0.01"
                      className="mt-1 text-sm"
                    />
                  </div>

                  {withdrawalError && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                      {withdrawalError}
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Available balance: <span className="font-bold text-foreground">
                      ${wallet?.balance.toFixed(2) || "0.00"}
                    </span>
                  </div>

                  <Button
                    onClick={handleWithdrawal}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Request Withdrawal"
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-primary/5">
                <CardHeader>
                  <CardTitle>How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="font-bold mb-1">💰 Commission Structure</div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Level 1: 50% commission on direct referrals</li>
                      <li>Level 2: 5% on your referrals' referrals</li>
                      <li>Level 3: 5% on level 2's referrals</li>
                    </ul>
                  </div>

                  <div>
                    <div className="font-bold mb-1">🔄 Withdrawal Process</div>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Minimum withdrawal: $10</li>
                      <li>Withdrawals in USDT (TRC20)</li>
                      <li>Processing time: 1-3 business days</li>
                      <li>Admin approval required</li>
                    </ul>
                  </div>

                  <div>
                    <div className="font-bold mb-1">🎯 Example Earnings</div>
                    <div className="bg-background p-3 rounded">
                      <div className="text-xs text-muted-foreground mb-1">User D pays $100:</div>
                      <div className="space-y-1">
                        <div>• User C gets $50 (Level 1: 50%)</div>
                        <div>• User B gets $5 (Level 2: 5%)</div>
                        <div>• User A gets $5 (Level 3: 5%)</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Withdrawal History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal History</CardTitle>
                <CardDescription>
                  Track your withdrawal requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowDownToLine className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Withdrawals Yet</h3>
                    <p className="text-muted-foreground">
                      Your withdrawal requests will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {withdrawals.map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-sm sm:text-base">${withdrawal.amount.toFixed(2)}</span>
                            <Badge
                              variant={
                                withdrawal.status === "completed" ? "default" :
                                withdrawal.status === "pending" ? "secondary" :
                                withdrawal.status === "processing" ? "outline" :
                                "destructive"
                              }
                              className="text-xs"
                            >
                              {withdrawal.status}
                            </Badge>
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground break-all">
                            To: {withdrawal.usdt_address.substring(0, 10)}...
                            {withdrawal.usdt_address.substring(withdrawal.usdt_address.length - 6)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Requested: {new Date(withdrawal.requested_at).toLocaleDateString()} {new Date(withdrawal.requested_at).toLocaleTimeString()}
                          </div>
                          {withdrawal.tx_hash && (
                            <div className="text-xs text-primary mt-1 break-all">
                              TX: {withdrawal.tx_hash.substring(0, 10)}...
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
