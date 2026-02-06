"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Calendar,
  CreditCard,
  ExternalLink,
  Banknote,
  Users,
  TrendingUp,
  Filter
} from "lucide-react"

interface WithdrawalRequest {
  id: string
  creator_id: string
  amount: number
  payout_method: string
  payout_details: any
  status: string
  admin_notes: string | null
  rejection_reason: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
  profiles: {
    id: string
    email: string
    full_name: string
  }
  withdrawal_history: Array<{
    id: string
    action: string
    notes: string | null
    created_at: string
    profiles: {
      id: string
      email: string
      full_name: string
    }
  }>
}

interface AffiliateWithdrawal {
  id: string
  user_id: string
  amount: number
  usdt_address: string
  status: string
  tx_hash: string | null
  rejection_reason: string | null
  requested_at: string
  processed_at: string | null
  created_at: string
  updated_at: string
  profiles: {
    id: string
    email: string
    username?: string
    full_name: string
  }
}

export default function WithdrawalRequestsPage() {
  const supabase = createClient()
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([])
  const [affiliateWithdrawals, setAffiliateWithdrawals] = useState<AffiliateWithdrawal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)
  const [selectedAffiliateRequest, setSelectedAffiliateRequest] = useState<AffiliateWithdrawal | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedAffiliateStatus, setSelectedAffiliateStatus] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<string>("model-earnings")
  const [actionData, setActionData] = useState({
    action: "",
    notes: "",
    rejection_reason: ""
  })
  const [affiliateActionData, setAffiliateActionData] = useState({
    action: "",
    notes: "",
    rejection_reason: "",
    tx_hash: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        fetchWithdrawalRequests(),
        fetchAffiliateWithdrawals()
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWithdrawalRequests = async () => {
    try {
      const response = await fetch("/api/withdrawal-requests?admin=true")
      const data = await response.json()

      if (data.success) {
        setWithdrawalRequests(data.withdrawal_requests)
      } else {
        toast.error(data.error || "Failed to fetch withdrawal requests")
      }
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error)
      toast.error("Failed to fetch withdrawal requests")
    }
  }

  const fetchAffiliateWithdrawals = async () => {
    try {
      const response = await fetch("/api/usdt-withdrawal?admin=true")
      const data = await response.json()

      if (data.success) {
        setAffiliateWithdrawals(data.withdrawals)
      } else {
        toast.error(data.error || "Failed to fetch affiliate withdrawals")
      }
    } catch (error) {
      console.error("Error fetching affiliate withdrawals:", error)
      toast.error("Failed to fetch affiliate withdrawals")
    }
  }

  const handleAction = async (requestId: string, action: string) => {
    if (!actionData.action) {
      toast.error("Please select an action")
      return
    }

    if (action === "rejected" && !actionData.rejection_reason) {
      toast.error("Please provide a rejection reason")
      return
    }

    try {
      const response = await fetch(`/api/withdrawal-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: actionData.action,
          notes: actionData.notes,
          rejection_reason: actionData.rejection_reason
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Withdrawal request ${actionData.action} successfully`)
        setActionData({ action: "", notes: "", rejection_reason: "" })
        setSelectedRequest(null)
        fetchWithdrawalRequests()
      } else {
        toast.error(data.error || "Failed to update withdrawal request")
      }
    } catch (error) {
      console.error("Error updating withdrawal request:", error)
      toast.error("Failed to update withdrawal request")
    }
  }

  const handleAffiliateAction = async (withdrawalId: string, action: string) => {
    if (!affiliateActionData.action) {
      toast.error("Please select an action")
      return
    }

    if (action === "rejected" && !affiliateActionData.rejection_reason) {
      toast.error("Please provide a rejection reason")
      return
    }

    try {
      const response = await fetch(`/api/usdt-withdrawal/${withdrawalId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: affiliateActionData.action,
          notes: affiliateActionData.notes,
          rejection_reason: affiliateActionData.rejection_reason
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Affiliate withdrawal ${affiliateActionData.action} successfully`)
        setAffiliateActionData({ action: "", notes: "", rejection_reason: "", tx_hash: "" })
        setSelectedAffiliateRequest(null)
        fetchAffiliateWithdrawals()
      } else {
        toast.error(data.error || "Failed to update affiliate withdrawal")
      }
    } catch (error) {
      console.error("Error updating affiliate withdrawal:", error)
      toast.error("Failed to update affiliate withdrawal")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "approved":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      case "processing":
        return <AlertCircle className="h-4 w-4 text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      approved: "default",
      processing: "default",
      completed: "default",
      rejected: "destructive",
      cancelled: "outline"
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getPayoutMethodIcon = (method: string) => {
    switch (method) {
      case "stripe":
        return <CreditCard className="h-4 w-4" />
      case "paypal":
        return <ExternalLink className="h-4 w-4" />
      case "bank_transfer":
        return <Banknote className="h-4 w-4" />
      case "crypto":
        return <DollarSign className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  const filteredRequests = withdrawalRequests.filter(request =>
    selectedStatus === "all" || request.status === selectedStatus
  )

  // Combine both withdrawal types for unified stats
  const allWithdrawals = [...withdrawalRequests, ...affiliateWithdrawals]

  const statusCounts = {
    pending: allWithdrawals.filter(r => r.status === "pending").length,
    approved: allWithdrawals.filter(r => r.status === "approved").length,
    processing: allWithdrawals.filter(r => r.status === "processing").length,
    completed: allWithdrawals.filter(r => r.status === "completed").length,
    rejected: allWithdrawals.filter(r => r.status === "rejected").length,
    cancelled: allWithdrawals.filter(r => r.status === "cancelled").length
  }

  const totalAmount = allWithdrawals.reduce((sum, request) => sum + request.amount, 0)
  const pendingAmount = allWithdrawals
    .filter(r => r.status === "pending")
    .reduce((sum, request) => sum + request.amount, 0)

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Withdrawal Requests Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allWithdrawals.length}</div>
            <p className="text-xs text-muted-foreground">
              ${totalAmount.toFixed(2)} total amount
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.pending}</div>
            <p className="text-xs text-muted-foreground">
              ${pendingAmount.toFixed(2)} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.processing}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.approved}</div>
            <p className="text-xs text-muted-foreground">
              Ready for processing
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="model-earnings">Model Earnings</TabsTrigger>
          <TabsTrigger value="affiliate-earnings">Affiliate Earnings</TabsTrigger>
          <TabsTrigger value="manage">Manage Request</TabsTrigger>
        </TabsList>

        <TabsContent value="model-earnings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Model Earnings Withdrawals</span>
                <div className="flex items-center gap-2">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.profiles.full_name || request.profiles.email}</div>
                          <div className="text-sm text-muted-foreground">{request.profiles.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          ${request.amount.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPayoutMethodIcon(request.payout_method)}
                          <span className="capitalize">{request.payout_method.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          {getStatusBadge(request.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliate-earnings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Affiliate Earnings Withdrawals</span>
                <div className="flex items-center gap-2">
                  <Select value={selectedAffiliateStatus} onValueChange={setSelectedAffiliateStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>USDT Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliateWithdrawals
                    .filter(withdrawal => selectedAffiliateStatus === "all" || withdrawal.status === selectedAffiliateStatus)
                    .map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {withdrawal.profiles.username ||
                             withdrawal.profiles.email ||
                             withdrawal.profiles.full_name ||
                             'Unknown User'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {withdrawal.profiles.email !== withdrawal.profiles.username ?
                             withdrawal.profiles.email : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-orange-600">
                          ${withdrawal.amount.toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono text-muted-foreground">
                          {withdrawal.usdt_address.substring(0, 10)}...{withdrawal.usdt_address.substring(withdrawal.usdt_address.length - 6)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(withdrawal.status)}
                          {getStatusBadge(withdrawal.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(withdrawal.requested_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAffiliateRequest(withdrawal)
                            setActiveTab("manage")
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          {selectedRequest ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Manage Model Earnings Withdrawal</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Close
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Request Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Creator</Label>
                    <div className="text-lg font-bold">
                      {selectedRequest.profiles.full_name || selectedRequest.profiles.email}
                    </div>
                    <div className="text-sm text-muted-foreground">{selectedRequest.profiles.email}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                    <div className="text-2xl font-bold text-green-600">
                      ${selectedRequest.amount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Payout Method</Label>
                    <div className="flex items-center gap-2">
                      {getPayoutMethodIcon(selectedRequest.payout_method)}
                      <span className="capitalize">{selectedRequest.payout_method.replace("_", " ")}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedRequest.status)}
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                </div>

                {/* Payout Details */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Payout Details</Label>
                  <div className="bg-muted p-3 rounded-lg mt-1">
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(selectedRequest.payout_details, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Earnings Summary */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Earnings Summary</Label>
                  <div className="bg-muted p-4 rounded-lg mt-1">
                    <div className="text-sm text-muted-foreground">
                      <p>This withdrawal request includes earnings from the creator's monetized content.</p>
                      <p className="mt-2">
                        <strong>Total Amount:</strong> ${selectedRequest.amount.toFixed(2)}
                      </p>
                      <p className="text-xs mt-1">
                        Detailed earnings breakdown is available in the creator's earnings history.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Form */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Take Action</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="action">Action</Label>
                      <Select value={actionData.action} onValueChange={(value) => setActionData(prev => ({ ...prev, action: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedRequest.status === "pending" && (
                            <>
                              <SelectItem value="approved">Approve</SelectItem>
                              <SelectItem value="rejected">Reject</SelectItem>
                            </>
                          )}
                          {selectedRequest.status === "approved" && (
                            <>
                              <SelectItem value="processing">Mark as Processing</SelectItem>
                              <SelectItem value="rejected">Reject</SelectItem>
                            </>
                          )}
                          {selectedRequest.status === "processing" && (
                            <>
                              <SelectItem value="completed">Mark as Completed</SelectItem>
                              <SelectItem value="rejected">Reject</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {actionData.action === "rejected" && (
                      <div>
                        <Label htmlFor="rejection_reason">Rejection Reason</Label>
                        <Textarea
                          id="rejection_reason"
                          value={actionData.rejection_reason}
                          onChange={(e) => setActionData(prev => ({ ...prev, rejection_reason: e.target.value }))}
                          placeholder="Explain why this withdrawal request was rejected..."
                          rows={3}
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="notes">Admin Notes</Label>
                      <Textarea
                        id="notes"
                        value={actionData.notes}
                        onChange={(e) => setActionData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any notes about this action..."
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={() => handleAction(selectedRequest.id, actionData.action)}
                      disabled={!actionData.action}
                    >
                      {actionData.action === "approved" && "Approve Request"}
                      {actionData.action === "rejected" && "Reject Request"}
                      {actionData.action === "processing" && "Mark as Processing"}
                      {actionData.action === "completed" && "Mark as Completed"}
                    </Button>
                  </div>
                </div>

                {/* History */}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Request History</Label>
                  <div className="space-y-2 mt-1">
                    {selectedRequest.withdrawal_history.map((history) => (
                      <div key={history.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium capitalize">{history.action}</div>
                          {history.notes && (
                            <div className="text-sm text-muted-foreground">{history.notes}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {new Date(history.created_at).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {history.profiles.full_name || history.profiles.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : selectedAffiliateRequest ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Manage Affiliate Earnings Withdrawal</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAffiliateRequest(null)}
                  >
                    Close
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Request Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">User</Label>
                    <div className="text-lg font-bold">
                      {selectedAffiliateRequest.profiles.full_name || selectedAffiliateRequest.profiles.email}
                    </div>
                    <div className="text-sm text-muted-foreground">{selectedAffiliateRequest.profiles.email}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                    <div className="text-2xl font-bold text-orange-600">
                      ${selectedAffiliateRequest.amount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">USDT Address</Label>
                    <div className="text-sm font-mono bg-muted p-2 rounded">
                      {selectedAffiliateRequest.usdt_address}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedAffiliateRequest.status)}
                      {getStatusBadge(selectedAffiliateRequest.status)}
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Requested At</Label>
                    <div className="text-sm">
                      {new Date(selectedAffiliateRequest.requested_at).toLocaleString()}
                    </div>
                  </div>
                  {selectedAffiliateRequest.processed_at && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Processed At</Label>
                      <div className="text-sm">
                        {new Date(selectedAffiliateRequest.processed_at).toLocaleString()}
                      </div>
                    </div>
                  )}
                  {selectedAffiliateRequest.tx_hash && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Transaction Hash</Label>
                      <div className="text-sm font-mono bg-muted p-2 rounded break-all">
                        {selectedAffiliateRequest.tx_hash}
                      </div>
                    </div>
                  )}
                </div>

                {selectedAffiliateRequest.rejection_reason && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Rejection Reason</Label>
                    <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        {selectedAffiliateRequest.rejection_reason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Form */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Take Action</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="affiliate-action">Action</Label>
                      <Select value={affiliateActionData.action} onValueChange={(value) => setAffiliateActionData(prev => ({ ...prev, action: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedAffiliateRequest.status === "pending" && (
                            <>
                              <SelectItem value="approved">Approve</SelectItem>
                              <SelectItem value="rejected">Reject</SelectItem>
                            </>
                          )}
                          {selectedAffiliateRequest.status === "approved" && (
                            <>
                              <SelectItem value="processing">Mark as Processing</SelectItem>
                              <SelectItem value="rejected">Reject</SelectItem>
                            </>
                          )}
                          {selectedAffiliateRequest.status === "processing" && (
                            <>
                              <SelectItem value="completed">Mark as Completed</SelectItem>
                              <SelectItem value="rejected">Reject</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {affiliateActionData.action === "completed" && (
                      <div>
                        <Label htmlFor="tx_hash">Transaction Hash (Optional)</Label>
                        <Input
                          id="tx_hash"
                          value={affiliateActionData.tx_hash || ""}
                          onChange={(e) => setAffiliateActionData(prev => ({ ...prev, tx_hash: e.target.value }))}
                          placeholder="Enter blockchain transaction hash..."
                        />
                      </div>
                    )}

                    {affiliateActionData.action === "rejected" && (
                      <div>
                        <Label htmlFor="affiliate-rejection_reason">Rejection Reason</Label>
                        <Textarea
                          id="affiliate-rejection_reason"
                          value={affiliateActionData.rejection_reason}
                          onChange={(e) => setAffiliateActionData(prev => ({ ...prev, rejection_reason: e.target.value }))}
                          placeholder="Explain why this withdrawal request was rejected..."
                          rows={3}
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="affiliate-notes">Admin Notes</Label>
                      <Textarea
                        id="affiliate-notes"
                        value={affiliateActionData.notes}
                        onChange={(e) => setAffiliateActionData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any notes about this action..."
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={() => handleAffiliateAction(selectedAffiliateRequest.id, affiliateActionData.action)}
                      disabled={!affiliateActionData.action}
                    >
                      {affiliateActionData.action === "approved" && "Approve Request"}
                      {affiliateActionData.action === "rejected" && "Reject Request"}
                      {affiliateActionData.action === "processing" && "Mark as Processing"}
                      {affiliateActionData.action === "completed" && "Mark as Completed"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Select a withdrawal request to manage</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
