"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Banknote,
  ExternalLink
} from "lucide-react"

interface WithdrawalRequest {
  id: string
  amount: number
  payout_method: string
  payout_details: any
  status: string
  admin_notes: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  withdrawal_request_items: Array<{
    id: string
    amount: number
    earnings_transactions: {
      id: string
      amount: number
      transaction_type: string
      description: string
      created_at: string
      models: {
        id: string
        name: string
      }
    }
  }>
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

interface WithdrawalHistoryProps {
  className?: string
}

export function WithdrawalHistory({ className = "" }: WithdrawalHistoryProps) {
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null)

  useEffect(() => {
    fetchWithdrawalRequests()
  }, [])

  const fetchWithdrawalRequests = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/withdrawal-requests")
      const data = await response.json()
      
      if (data.success) {
        setWithdrawalRequests(data.withdrawal_requests)
      } else {
        toast.error(data.error || "Failed to fetch withdrawal requests")
      }
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error)
      toast.error("Failed to fetch withdrawal requests")
    } finally {
      setIsLoading(false)
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

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Withdrawal History
          </CardTitle>
          <CardDescription>Your withdrawal request history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded dark:bg-gray-700"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Withdrawal History
        </CardTitle>
        <CardDescription>Your withdrawal request history and status</CardDescription>
      </CardHeader>
      <CardContent>
        {withdrawalRequests.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium text-green-600">
                      ${request.amount.toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPayoutMethodIcon(request.payout_method)}
                      <span className="capitalize">
                        {request.payout_method.replace('_', ' ')}
                      </span>
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
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No withdrawal requests yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Submit your first withdrawal request above
            </p>
          </div>
        )}

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Withdrawal Request Details</span>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <div className="text-lg font-bold text-green-600">
                      ${selectedRequest.amount.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(selectedRequest.status)}
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payout Method</label>
                    <div className="flex items-center gap-2 mt-1">
                      {getPayoutMethodIcon(selectedRequest.payout_method)}
                      <span className="capitalize">
                        {selectedRequest.payout_method.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <div className="text-sm">
                      {new Date(selectedRequest.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Payout Details */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payout Details</label>
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(selectedRequest.payout_details, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Included Earnings */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Included Earnings</label>
                  <div className="mt-2 space-y-2">
                    {selectedRequest.withdrawal_request_items.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {item.earnings_transactions.models.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.earnings_transactions.transaction_type} • 
                              {new Date(item.earnings_transactions.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              ${item.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        {item.earnings_transactions.description && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {item.earnings_transactions.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedRequest.admin_notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Admin Notes</label>
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm">{selectedRequest.admin_notes}</p>
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedRequest.rejection_reason && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Rejection Reason</label>
                    <div className="mt-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {selectedRequest.rejection_reason}
                      </p>
                    </div>
                  </div>
                )}

                {/* History */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Request History</label>
                  <div className="mt-2 space-y-2">
                    {selectedRequest.withdrawal_history.map((history) => (
                      <div key={history.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium capitalize">
                              {history.action}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(history.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {history.profiles.full_name || history.profiles.email}
                          </div>
                        </div>
                        {history.notes && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {history.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}