"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Cpu, Zap, TrendingUp, DollarSign, Calendar, Star } from "lucide-react"
import Link from "next/link"

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

interface ModelAnalytics {
  summary: {
    totalModels: number
    purchasedModels: number
    availableModels: number
    totalTokensSpent: number
    totalEarningsTokens: number
    totalEarningsUsd: number
    totalUsageCount: number
    averageEarningsPerModel: number
  }
  categoryBreakdown: { [key: string]: { purchased: number, earnings: number } }
  mostProfitableModel: (Model & {
    earnings: {
      earnings_tokens: number
      earnings_usd: number
      usage_count: number
      last_earned_at: string | null
    }
  }) | null
  recentActivity: Array<{
    name: string
    earnings_usd: number
    usage_count: number
    last_earned_at: string
  }>
  purchasedModels: Array<Model & {
    purchased_at: string
    earnings: {
      earnings_tokens: number
      earnings_usd: number
      usage_count: number
      last_earned_at: string | null
    }
  }>
  availableModels: Model[]
}

interface UserModelAnalyticsProps {
  userId: string
}

export function UserModelAnalytics({ userId }: UserModelAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ModelAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/model-analytics")
        const data = await response.json()
        
        if (data.success) {
          setAnalytics(data.analytics)
        } else {
          console.error("Failed to fetch analytics:", data.error)
        }
      } catch (error) {
        console.error("Error fetching model analytics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [userId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Failed to load model analytics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold tracking-tight mb-1 flex items-center justify-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          Your Model Analytics
        </h2>
        <p className="text-muted-foreground">Track your premium model performance and earnings</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Models Owned</CardTitle>
            <Cpu className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.purchasedModels}</div>
            <p className="text-xs text-muted-foreground">
              of {analytics.summary.totalModels} available
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Invested</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.totalTokensSpent}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.totalUsageCount} total uses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${analytics.summary.totalEarningsUsd.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.totalEarningsTokens} tokens earned
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Star className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold line-clamp-1">
              {analytics.mostProfitableModel?.name || "None yet"}
            </div>
            <p className="text-xs text-muted-foreground">
              ${analytics.mostProfitableModel?.earnings?.earnings_usd?.toFixed(2) || "0.00"} earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {analytics.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Earnings Activity
            </CardTitle>
            <CardDescription>Your latest model earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <div className="font-medium">{activity.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.usage_count} uses • {new Date(activity.last_earned_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      +${activity.earnings_usd.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
