"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { CheckCircle, XCircle, Clock, DollarSign, Users, TrendingUp, Eye } from "lucide-react"
import { toast } from "sonner"

interface Affiliate {
  id: string
  affiliate_code: string
  status: string
  commission_rate: number
  total_earnings: number
  total_clicks: number
  total_conversions: number
  conversion_rate: number
  created_at: string
  approved_at: string
  user: {
    id: string
    email: string
    raw_user_meta_data: any
  }
}

interface AffiliateSettings {
  id: string
  value: any
}

export default function AdminAffiliateManagement() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [settings, setSettings] = useState<AffiliateSettings[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/affiliate/admin')
      const result = await response.json()
      
      if (result.success) {
        setAffiliates(result.affiliates)
        setSettings(result.settings)
      } else {
        toast.error(result.error || 'Failed to load affiliate data')
      }
    } catch (error) {
      console.error('Error fetching affiliate data:', error)
      toast.error('Failed to load affiliate data')
    } finally {
      setLoading(false)
    }
  }

  const updateAffiliateStatus = async (affiliateId: string, status: string, commissionRate?: number) => {
    setUpdating(affiliateId)
    
    try {
      const response = await fetch('/api/affiliate/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: affiliateId,
          status,
          commission_rate: commissionRate
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success('Affiliate updated successfully')
        fetchData() // Refresh data
      } else {
        toast.error(result.error || 'Failed to update affiliate')
      }
    } catch (error) {
      console.error('Error updating affiliate:', error)
      toast.error('Failed to update affiliate')
    } finally {
      setUpdating(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'suspended':
        return <XCircle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      pending: 'secondary',
      rejected: 'destructive',
      suspended: 'outline'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading affiliate management...</p>
          </div>
        </div>
      </div>
    )
  }

  const pendingAffiliates = affiliates.filter(a => a.status === 'pending')
  const approvedAffiliates = affiliates.filter(a => a.status === 'approved')
  const totalEarnings = affiliates.reduce((sum, a) => sum + a.total_earnings, 0)
  const totalClicks = affiliates.reduce((sum, a) => sum + a.total_clicks, 0)
  const totalConversions = affiliates.reduce((sum, a) => sum + a.total_conversions, 0)

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Affiliate Management</h1>
        <p className="text-muted-foreground">Manage affiliate accounts and track performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliates.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingAffiliates.length} pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Paid to affiliates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all affiliates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions}</div>
            <p className="text-xs text-muted-foreground">
              {totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0}% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingAffiliates.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedAffiliates.length})
          </TabsTrigger>
          <TabsTrigger value="all">All Affiliates</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Applications</CardTitle>
              <CardDescription>Review and approve affiliate applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingAffiliates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No pending applications</p>
                ) : (
                  pendingAffiliates.map((affiliate) => (
                    <div key={affiliate.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(affiliate.status)}
                        <div>
                          <p className="font-medium">{affiliate.user.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Code: {affiliate.affiliate_code} • Applied: {new Date(affiliate.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Review Affiliate Application</DialogTitle>
                              <DialogDescription>
                                Review and approve or reject this affiliate application
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Email</Label>
                                <Input value={affiliate.user.email} readOnly />
                              </div>
                              <div>
                                <Label>Affiliate Code</Label>
                                <Input value={affiliate.affiliate_code} readOnly />
                              </div>
                              <div>
                                <Label>Commission Rate (%)</Label>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  step="0.1"
                                  defaultValue={affiliate.commission_rate}
                                  onChange={(e) => setSelectedAffiliate({
                                    ...affiliate,
                                    commission_rate: parseFloat(e.target.value)
                                  })}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => updateAffiliateStatus(affiliate.id, 'approved', selectedAffiliate?.commission_rate)}
                                  disabled={updating === affiliate.id}
                                  className="flex-1"
                                >
                                  {updating === affiliate.id ? 'Updating...' : 'Approve'}
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => updateAffiliateStatus(affiliate.id, 'rejected')}
                                  disabled={updating === affiliate.id}
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approved Affiliates</CardTitle>
              <CardDescription>Manage active affiliate accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {approvedAffiliates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No approved affiliates</p>
                ) : (
                  approvedAffiliates.map((affiliate) => (
                    <div key={affiliate.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {getStatusIcon(affiliate.status)}
                          <div>
                            <p className="font-medium">{affiliate.user.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Code: {affiliate.affiliate_code} • Approved: {new Date(affiliate.approved_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(affiliate.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAffiliateStatus(affiliate.id, 'suspended')}
                            disabled={updating === affiliate.id}
                          >
                            Suspend
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Commission Rate</p>
                          <p className="font-medium">{affiliate.commission_rate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Earnings</p>
                          <p className="font-medium">${affiliate.total_earnings.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Clicks</p>
                          <p className="font-medium">{affiliate.total_clicks}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Conversions</p>
                          <p className="font-medium">{affiliate.total_conversions}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Affiliates</CardTitle>
              <CardDescription>Complete list of all affiliate accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {affiliates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No affiliates found</p>
                ) : (
                  affiliates.map((affiliate) => (
                    <div key={affiliate.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {getStatusIcon(affiliate.status)}
                          <div>
                            <p className="font-medium">{affiliate.user.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Code: {affiliate.affiliate_code} • Created: {new Date(affiliate.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(affiliate.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Commission Rate</p>
                          <p className="font-medium">{affiliate.commission_rate}%</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Earnings</p>
                          <p className="font-medium">${affiliate.total_earnings.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Clicks</p>
                          <p className="font-medium">{affiliate.total_clicks}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Conversion Rate</p>
                          <p className="font-medium">{affiliate.conversion_rate.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
