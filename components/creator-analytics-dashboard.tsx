"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  Users,
  Zap,
  DollarSign,
  BarChart3,
  Calendar,
  Eye,
  Activity,
  Star,
  ArrowUpRight,
  CreditCard,
  Clock
} from "lucide-react"
import { WithdrawalRequestForm } from "./withdrawal-request-form"
import { WithdrawalHistory } from "./withdrawal-history"

interface CreatorAnalytics {
  summary: {
    total_models: number
    total_earnings: number
    total_usage: number
    total_tokens: number
    avg_earnings_per_model: number
  }
  top_models: Array<{
    id: string
    model_id: string
    total_usage_count: number
    total_tokens_consumed: number
    total_earnings: number
    last_usage_at: string
    models: {
      id: string
      name: string
    }
  }>
  all_earnings: Array<{
    id: string
    model_id: string
    total_usage_count: number
    total_tokens_consumed: number
    total_earnings: number
    last_usage_at: string
    models: {
      id: string
      name: string
    }
  }>
  recent_transactions: Array<{
    id: string
    amount: number
    transaction_type: string
    status: string
    description: string
    created_at: string
    models: {
      id: string
      name: string
    }
  }>
  period: {
    days: number
    start_date: string
    end_date: string
  }
}

interface CreatorAnalyticsDashboardProps {
  className?: string
}

export function CreatorAnalyticsDashboard({ className = "" }: CreatorAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("30")
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/creator-analytics?days=${selectedPeriod}${selectedModel ? `&modelId=${selectedModel}` : ''}`)
        const data = await response.json()

        if (data.success) {
          setAnalytics(data.analytics)
        } else {
          console.error("Failed to fetch analytics:", data.error)
        }
      } catch (error) {
        console.error("Error fetching creator analytics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [selectedPeriod, selectedModel])

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
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
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Failed to load creator analytics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Creator Analytics</h2>
          <p className="text-muted-foreground">Track your model performance and earnings</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.summary.total_earnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.total_usage} total uses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.total_models}</div>
            <p className="text-xs text-muted-foreground">
              ${analytics.summary.avg_earnings_per_model.toFixed(2)} avg per model
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.total_usage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.summary.total_tokens.toLocaleString()} tokens consumed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.summary.avg_earnings_per_model.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per model average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Model Performance</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Top Performing Models */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Top Performing Models
              </CardTitle>
              <CardDescription>Your best earning models</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Last Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.top_models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        <div className="font-medium">{model.models.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          ${model.total_earnings.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span>{model.total_usage_count.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-[#1111FF]" />
                          <span>{model.total_tokens_consumed.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(model.last_usage_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          {/* All Models Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                All Models Performance
              </CardTitle>
              <CardDescription>Detailed performance metrics for all your models</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Usage Count</TableHead>
                    <TableHead>Tokens Consumed</TableHead>
                    <TableHead>Avg Earnings/Use</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.all_earnings.map((model) => {
                    const avgEarningsPerUse = model.total_usage_count > 0
                      ? model.total_earnings / model.total_usage_count
                      : 0

                    return (
                      <TableRow key={model.id}>
                        <TableCell>
                          <div className="font-medium">{model.models.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600">
                            ${model.total_earnings.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {model.total_usage_count.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-[#1111FF]" />
                            <span>{model.total_tokens_consumed.toLocaleString()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            ${avgEarningsPerUse.toFixed(4)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={model.total_usage_count > 0 ? "default" : "secondary"}
                          >
                            {model.total_usage_count > 0 ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Your recent earnings and payouts</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.recent_transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.recent_transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{transaction.models.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600">
                            ${transaction.amount.toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.status === 'completed' ? 'default' :
                                transaction.status === 'pending' ? 'secondary' :
                                  transaction.status === 'failed' ? 'destructive' : 'outline'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="space-y-4">
          {/* Withdrawal Request Form */}
          <WithdrawalRequestForm onSuccess={() => window.location.reload()} />

          {/* Withdrawal History */}
          <WithdrawalHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}
