"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { 
  DollarSign, 
  AlertCircle,
  Info,
  Wallet,
  Mail
} from "lucide-react"
import { useAuth } from "@/components/auth-context"

interface WithdrawalRequestFormProps {
  onSuccess?: () => void
  className?: string
}

export function WithdrawalRequestForm({ onSuccess, className = "" }: WithdrawalRequestFormProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableBalance, setAvailableBalance] = useState(0)
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "paypal" as "paypal" | "usdt_trc20",
    paypal_email: "",
    usdt_address: ""
  })

  useEffect(() => {
    fetchAvailableBalance()
  }, [])

  const fetchAvailableBalance = async () => {
    if (!user?.id) return
    
    try {
      setIsLoading(true)
      const response = await fetch(`/api/model-earnings?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success) {
        const earnings = data.totalTokens * 0.0001
        setAvailableBalance(earnings)
      }
    } catch (error) {
      console.error("Error fetching balance:", error)
      toast.error("Failed to fetch available balance")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amount = parseFloat(formData.amount)

    // Validation
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (amount < 50) {
      toast.error("Minimum withdrawal amount is $50.00")
      return
    }

    if (amount > availableBalance) {
      toast.error("Insufficient balance")
      return
    }

    if (formData.payment_method === "paypal" && !formData.paypal_email) {
      toast.error("Please enter your PayPal email")
      return
    }

    if (formData.payment_method === "usdt_trc20" && !formData.usdt_address) {
      toast.error("Please enter your USDT (TRC20) wallet address")
      return
    }

    // Email validation for PayPal
    if (formData.payment_method === "paypal") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.paypal_email)) {
        toast.error("Please enter a valid email address")
        return
      }
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/withdrawal-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount,
          payment_method: formData.payment_method,
          payment_details: formData.payment_method === "paypal" 
            ? { email: formData.paypal_email }
            : { wallet_address: formData.usdt_address, network: "TRC20" }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success("Withdrawal request submitted successfully! Admin will review it shortly.")
        setFormData({
          amount: "",
          payment_method: "paypal",
          paypal_email: "",
          usdt_address: ""
        })
        fetchAvailableBalance()
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

  const canWithdraw = availableBalance >= 50

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Request Withdrawal
        </CardTitle>
        <CardDescription>
          Withdraw your earnings via PayPal or USDT (TRC20)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Balance Summary */}
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-sm text-muted-foreground mb-1">Available Balance</div>
          <div className="text-3xl font-bold text-green-600">
            ${availableBalance.toFixed(4)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Minimum withdrawal: $50.00
          </div>
        </div>

        {!canWithdraw ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need at least $50.00 to request a withdrawal. 
              Current balance: ${availableBalance.toFixed(4)}
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Withdrawal Amount */}
            <div>
              <Label htmlFor="amount">Withdrawal Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="50"
                max={availableBalance}
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="50.00"
                required
              />
              <p className="text-sm text-muted-foreground mt-1">
                Min: $50.00 | Max: ${availableBalance.toFixed(2)}
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <Label className="mb-3 block">Payment Method</Label>
              <RadioGroup
                value={formData.payment_method}
                onValueChange={(value: "paypal" | "usdt_trc20") => 
                  setFormData(prev => ({ ...prev, payment_method: value }))
                }
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">PayPal</div>
                      <div className="text-sm text-muted-foreground">Receive via PayPal email</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="usdt_trc20" id="usdt_trc20" />
                  <Label htmlFor="usdt_trc20" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Wallet className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">USDT (TRC20)</div>
                      <div className="text-sm text-muted-foreground">Receive via USDT TRC20 wallet</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Details */}
            {formData.payment_method === "paypal" && (
              <div>
                <Label htmlFor="paypal_email">PayPal Email Address</Label>
                <Input
                  id="paypal_email"
                  type="email"
                  value={formData.paypal_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, paypal_email: e.target.value }))}
                  placeholder="your@email.com"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Payment will be sent to this PayPal email
                </p>
              </div>
            )}

            {formData.payment_method === "usdt_trc20" && (
              <div>
                <Label htmlFor="usdt_address">USDT TRC20 Wallet Address</Label>
                <Input
                  id="usdt_address"
                  type="text"
                  value={formData.usdt_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, usdt_address: e.target.value }))}
                  placeholder="T..."
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Make sure this is a valid TRC20 (Tron) wallet address
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? "Submitting..." : "Submit Withdrawal Request"}
            </Button>

            {/* Information */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium mb-2">Important Information:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Minimum withdrawal: $50.00 USD</li>
                  <li>Admin will review and manually process your request</li>
                  <li>Processing typically takes 3-5 business days</li>
                  <li>You'll receive email updates on status changes</li>
                  <li>Amount will be deducted after admin approval</li>
                </ul>
              </AlertDescription>
            </Alert>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
