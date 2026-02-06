"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Clock, 
  CheckCircle, 
  XCircle,
  Mail,
  Wallet,
  AlertCircle
} from "lucide-react"

interface WithdrawalRequest {
  id: string
  amount: number
  payment_method: string
  payment_details: any
  status: string
  admin_notes: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  completed_at: string | null
}

export function WithdrawalHistory({ className = "" }: { className?: string }) {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchWithdrawalHistory()
  }, [])

  const fetchWithdrawalHistory = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/withdrawal-request")
      const data = await response.json()
      
      if (data.success) {
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Error fetching withdrawal history:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      case 'approved':
      case 'completed':
        return <Badge variant="default" className="bg-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'paypal':
        return <Mail className="h-4 w-4 text-blue-600" />
      case 'usdt_trc20':
        return <Wallet className="h-4 w-4 text-green-600" />
      default:
        return null
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'paypal':
        return 'PayPal'
      case 'usdt_trc20':
        return 'USDT (TRC20)'
      default:
        return method
    }
  }

  const getPaymentDetails = (method: string, details: any) => {
    if (method === 'paypal') {
      return details.email || 'N/A'
    } else if (method === 'usdt_trc20') {
      const address = details.wallet_address || 'N/A'
      return address.length > 20 ? `${address.substring(0, 10)}...${address.substring(address.length - 10)}` : address
    }
    return 'N/A'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-24 bg-gray-200 rounded mb-4"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Withdrawal History
        </CardTitle>
        <CardDescription>
          Track your withdrawal requests and their status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-2">No withdrawal requests yet</h3>
            <p className="text-sm text-muted-foreground">
              Your withdrawal requests will appear here once you submit them
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-green-600">
                        ${parseFloat(request.amount.toString()).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(request.payment_method)}
                        <span className="text-sm">
                          {getPaymentMethodLabel(request.payment_method)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {getPaymentDetails(request.payment_method, request.payment_details)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground max-w-xs">
                        {request.admin_notes || '-'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
