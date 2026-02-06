"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink
} from "lucide-react"

interface AvailableEarnings {
  total_earnings: number
  available_amount: number
  requested_amount: number
  minimum_withdrawal_amount: number
  can_withdraw: boolean
  available_earnings: Array<{
    id: string
    amount: number
    transaction_type: string
    description: string
    created_at: string
    models: {
      id: string
      name: string
    }
  }>
  total_transactions: number
  available_transactions: number
}

interface WithdrawalRequestFormProps {
  onSuccess?: () => void
  className?: string
}

export function WithdrawalRequestForm({ onSuccess, className = "" }: WithdrawalRequestFormProps) {
  const [availableEarnings, setAvailableEarnings] = useState<AvailableEarnings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedEarnings, setSelectedEarnings] = useState<Set<string>>(new Set())
  const [withdrawalData, setWithdrawalData] = useState({
    amount: 0,
    payout_method: "",
    payout_details: {
      email: "",
      account_number: "",
      routing_number: "",
      bank_name: "",
      account_holder_name: "",
      paypal_email: "",
      stripe_account: "",
      crypto_address: "",
      crypto_type: ""
    }
  })

  useEffect(() => {
    fetchAvailableEarnings()
  }, [])

  const fetchAvailableEarnings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/available-earnings")
      const data = await response.json()
      
      if (data.success) {
        setAvailableEarnings(data.data)
      } else {
        toast.error(data.error || "Failed to fetch available earnings")
      }
    } catch (error) {
      console.error("Error fetching available earnings:", error)
      toast.error("Failed to fetch available earnings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEarningsSelection = (transactionId: string, checked: boolean) => {
    const newSelected = new Set(selectedEarnings)
    if (checked) {
      newSelected.add(transactionId)
    } else {
      newSelected.delete(transactionId)
    }
    setSelectedEarnings(newSelected)

    // Calculate total amount for selected earnings
    if (availableEarnings) {
      const selectedAmount = availableEarnings.available_earnings
        .filter(earning => newSelected.has(earning.id))
        .reduce((sum, earning) => sum + parseFloat(earning.amount), 0)
      
      setWithdrawalData(prev => ({ ...prev, amount: selectedAmount }))
    }
  }

  const handleSelectAll = () => {
    if (!availableEarnings) return

    const allSelected = selectedEarnings.size === availableEarnings.available_earnings.length
    if (allSelected) {
      setSelectedEarnings(new Set())
      setWithdrawalData(prev => ({ ...prev, amount: 0 }))
    } else {
      const allIds = new Set(availableEarnings.available_earnings.map(earning => earning.id))
      setSelectedEarnings(allIds)
      setWithdrawalData(prev => ({ ...prev, amount: availableEarnings.available_amount }))
    }
  }

  const handleSubmit = async () => {
    if (!availableEarnings) return

    if (selectedEarnings.size === 0) {
      toast.error("Please select earnings to withdraw")
      return
    }

    if (!withdrawalData.payout_method) {
      toast.error("Please select a payout method")
      return
    }

    if (withdrawalData.amount < availableEarnings.minimum_withdrawal_amount) {
      toast.error(`Minimum withdrawal amount is $${availableEarnings.minimum_withdrawal_amount.toFixed(2)}`)
      return
    }

    // Validate payout details based on method
    const requiredFields = getRequiredFields(withdrawalData.payout_method)
    const missingFields = requiredFields.filter(field => !withdrawalData.payout_details[field as keyof typeof withdrawalData.payout_details])
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(", ")}`)
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/withdrawal-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: withdrawalData.amount,
          payout_method: withdrawalData.payout_method,
          payout_details: withdrawalData.payout_details,
          earnings_transaction_ids: Array.from(selectedEarnings)
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success("Withdrawal request submitted successfully")
        setSelectedEarnings(new Set())
        setWithdrawalData({
          amount: 0,
          payout_method: "",
          payout_details: {
            email: "",
            account_number: "",
            routing_number: "",
            bank_name: "",
            account_holder_name: "",
            paypal_email: "",
            stripe_account: "",
            crypto_address: "",
            crypto_type: ""
          }
        })
        onSuccess?.()
      } else {
        toast.error(data.error || "Failed to submit withdrawal request")
      }
    } catch (error) {
      console.error("Error submitting withdrawal request:", error)
      toast.error("Failed to submit withdrawal request")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRequiredFields = (method: string) => {
    switch (method) {
      case "stripe":
        return ["stripe_account"]
      case "paypal":
        return ["paypal_email"]
      case "bank_transfer":
        return ["account_number", "routing_number", "bank_name", "account_holder_name"]
      case "crypto":
        return ["crypto_address", "crypto_type"]
      default:
        return []
    }
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
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-24 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!availableEarnings) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-muted-foreground">Failed to load available earnings</p>
        </CardContent>
      </Card>
    )
  }

  if (!availableEarnings.can_withdraw) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Withdrawal Request
          </CardTitle>
          <CardDescription>Request a payout of your earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Info className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium mb-2">Insufficient Earnings</h3>
            <p className="text-muted-foreground mb-4">
              You need at least ${availableEarnings.minimum_withdrawal_amount.toFixed(2)} to request a withdrawal.
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">
                Available: ${availableEarnings.available_amount.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                Minimum Required: ${availableEarnings.minimum_withdrawal_amount.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Withdrawal Request
        </CardTitle>
        <CardDescription>Request a payout of your earnings</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">Available</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              ${availableEarnings.available_amount.toFixed(2)}
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Earnings</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              ${availableEarnings.total_earnings.toFixed(2)}
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
            <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">Minimum</div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              ${availableEarnings.minimum_withdrawal_amount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Select Earnings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Select Earnings to Withdraw</h3>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedEarnings.size === availableEarnings.available_earnings.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
          
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedEarnings.size === availableEarnings.available_earnings.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableEarnings.available_earnings.map((earning) => (
                  <TableRow key={earning.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedEarnings.has(earning.id)}
                        onCheckedChange={(checked) => handleEarningsSelection(earning.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{earning.models.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{earning.transaction_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-green-600">
                        ${parseFloat(earning.amount).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {new Date(earning.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Withdrawal Amount */}
        <div>
          <Label htmlFor="amount">Withdrawal Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={withdrawalData.amount || ""}
            onChange={(e) => setWithdrawalData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            placeholder="0.00"
            max={availableEarnings.available_amount}
            min={availableEarnings.minimum_withdrawal_amount}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Selected: ${withdrawalData.amount.toFixed(2)} | Available: ${availableEarnings.available_amount.toFixed(2)}
          </p>
        </div>

        {/* Payout Method */}
        <div>
          <Label htmlFor="payout_method">Payout Method</Label>
          <Select value={withdrawalData.payout_method} onValueChange={(value) => setWithdrawalData(prev => ({ ...prev, payout_method: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select payout method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stripe">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Stripe
                </div>
              </SelectItem>
              <SelectItem value="paypal">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  PayPal
                </div>
              </SelectItem>
              <SelectItem value="bank_transfer">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Bank Transfer
                </div>
              </SelectItem>
              <SelectItem value="crypto">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Cryptocurrency
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payout Details */}
        {withdrawalData.payout_method && (
          <div className="space-y-4">
            <h4 className="font-medium">Payout Details</h4>
            
            {withdrawalData.payout_method === "stripe" && (
              <div>
                <Label htmlFor="stripe_account">Stripe Account ID</Label>
                <Input
                  id="stripe_account"
                  value={withdrawalData.payout_details.stripe_account}
                  onChange={(e) => setWithdrawalData(prev => ({
                    ...prev,
                    payout_details: { ...prev.payout_details, stripe_account: e.target.value }
                  }))}
                  placeholder="acct_1234567890"
                />
              </div>
            )}

            {withdrawalData.payout_method === "paypal" && (
              <div>
                <Label htmlFor="paypal_email">PayPal Email</Label>
                <Input
                  id="paypal_email"
                  type="email"
                  value={withdrawalData.payout_details.paypal_email}
                  onChange={(e) => setWithdrawalData(prev => ({
                    ...prev,
                    payout_details: { ...prev.payout_details, paypal_email: e.target.value }
                  }))}
                  placeholder="your@email.com"
                />
              </div>
            )}

            {withdrawalData.payout_method === "bank_transfer" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_holder_name">Account Holder Name</Label>
                  <Input
                    id="account_holder_name"
                    value={withdrawalData.payout_details.account_holder_name}
                    onChange={(e) => setWithdrawalData(prev => ({
                      ...prev,
                      payout_details: { ...prev.payout_details, account_holder_name: e.target.value }
                    }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={withdrawalData.payout_details.bank_name}
                    onChange={(e) => setWithdrawalData(prev => ({
                      ...prev,
                      payout_details: { ...prev.payout_details, bank_name: e.target.value }
                    }))}
                    placeholder="Chase Bank"
                  />
                </div>
                <div>
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    value={withdrawalData.payout_details.account_number}
                    onChange={(e) => setWithdrawalData(prev => ({
                      ...prev,
                      payout_details: { ...prev.payout_details, account_number: e.target.value }
                    }))}
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="routing_number">Routing Number</Label>
                  <Input
                    id="routing_number"
                    value={withdrawalData.payout_details.routing_number}
                    onChange={(e) => setWithdrawalData(prev => ({
                      ...prev,
                      payout_details: { ...prev.payout_details, routing_number: e.target.value }
                    }))}
                    placeholder="021000021"
                  />
                </div>
              </div>
            )}

            {withdrawalData.payout_method === "crypto" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="crypto_type">Cryptocurrency Type</Label>
                  <Select value={withdrawalData.payout_details.crypto_type} onValueChange={(value) => setWithdrawalData(prev => ({
                    ...prev,
                    payout_details: { ...prev.payout_details, crypto_type: value }
                  }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select crypto type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                      <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                      <SelectItem value="usdt">Tether (USDT)</SelectItem>
                      <SelectItem value="usdc">USD Coin (USDC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="crypto_address">Wallet Address</Label>
                  <Input
                    id="crypto_address"
                    value={withdrawalData.payout_details.crypto_address}
                    onChange={(e) => setWithdrawalData(prev => ({
                      ...prev,
                      payout_details: { ...prev.payout_details, crypto_address: e.target.value }
                    }))}
                    placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || selectedEarnings.size === 0 || !withdrawalData.payout_method}
          className="w-full"
        >
          {isSubmitting ? "Submitting..." : "Submit Withdrawal Request"}
        </Button>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Withdrawal Process:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your request will be reviewed by our admin team</li>
                <li>Processing typically takes 3-5 business days</li>
                <li>You'll receive email updates on the status</li>
                <li>Minimum withdrawal amount is ${availableEarnings.minimum_withdrawal_amount.toFixed(2)}</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
