"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Filter
} from "lucide-react"

interface CreatorEarnings {
  id: string
  model_id: string
  creator_id: string
  total_usage_count: number
  total_tokens_consumed: number
  total_earnings: number
  last_usage_at: string
  models: {
    id: string
    name: string
    creator_id: string
  }
  profiles: {
    id: string
    email: string
    full_name: string
  }
}

interface EarningsTransaction {
  id: string
  creator_id: string
  model_id: string
  amount: number
  transaction_type: string
  status: string
  payout_method: string
  payout_reference: string
  description: string
  created_at: string
  processed_at: string
  models: {
    id: string
    name: string
  }
  profiles: {
    id: string
    email: string
    full_name: string
  }
}

export default function CreatorEarningsPage() {
  const supabase = createClient()
  const [creatorEarnings, setCreatorEarnings] = useState<CreatorEarnings[]>([])
  const [transactions, setTransactions] = useState<EarningsTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCreator, setSelectedCreator] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [newTransaction, setNewTransaction] = useState({
    creator_id: "",
    model_id: "",
    amount: 0,
    transaction_type: "payout",
    payout_method: "stripe",
    description: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Fetch data from admin API
      const response = await fetch("/api/admin/creator-earnings")
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Failed to fetch creator earnings")
        return
      }

      if (data.success) {
        setCreatorEarnings(data.creatorEarnings)
        setTransactions(data.transactions)
      } else {
        toast.error("Failed to fetch data")
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTransaction = async () => {
    if (!newTransaction.creator_id || !newTransaction.model_id || newTransaction.amount <= 0) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const { error } = await supabase
        .from("earnings_transactions")
        .insert([{
          creator_id: newTransaction.creator_id,
          model_id: newTransaction.model_id,
          amount: newTransaction.amount,
          transaction_type: newTransaction.transaction_type,
          payout_method: newTransaction.payout_method,
          description: newTransaction.description,
          status: "pending"
        }])

      if (error) {
        toast.error("Failed to create transaction")
      } else {
        toast.success("Transaction created successfully")
        setNewTransaction({
          creator_id: "",
          model_id: "",
          amount: 0,
          transaction_type: "payout",
          payout_method: "stripe",
          description: ""
        })
        fetchData()
      }
    } catch (error) {
      console.error("Error creating transaction:", error)
      toast.error("Failed to create transaction")
    }
  }

  const handleUpdateTransactionStatus = async (transactionId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus }
      if (newStatus === "completed") {
        updateData.processed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from("earnings_transactions")
        .update(updateData)
        .eq("id", transactionId)

      if (error) {
        toast.error("Failed to update transaction status")
      } else {
        toast.success("Transaction status updated")
        fetchData()
      }
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast.error("Failed to update transaction")
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const creatorMatch = selectedCreator === "all" || transaction.creator_id === selectedCreator
    const statusMatch = selectedStatus === "all" || transaction.status === selectedStatus
    return creatorMatch && statusMatch
  })

  const totalEarnings = creatorEarnings.reduce((sum, earning) => sum + (earning.total_tokens_consumed * 0.0001), 0)
  const totalTransactions = transactions.length
  const pendingTransactions = transactions.filter(t => t.status === "pending").length
  const completedTransactions = transactions.filter(t => t.status === "completed").length

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
      <h1 className="text-2xl font-bold mb-4">Creator Earnings Management</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              Across all creators
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              All transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earnings">Creator Earnings</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="create">Create Transaction</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle>Creator Earnings Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Usage Count</TableHead>
                    <TableHead>Tokens Consumed</TableHead>
                    <TableHead>Last Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creatorEarnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{earning.profiles?.full_name || earning.profiles?.email || 'Unknown User'}</div>
                          <div className="text-sm text-muted-foreground">{earning.profiles?.email || 'No email'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{earning.models.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          ${(earning.total_tokens_consumed * 0.0001).toFixed(4)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {earning.total_usage_count.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {earning.total_tokens_consumed.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(earning.last_usage_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transactions</span>
                <div className="flex items-center gap-2">
                  <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Creator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Creators</SelectItem>
                      {Array.from(new Set(transactions.map(t => t.creator_id))).map(creatorId => {
                        const creator = transactions.find(t => t.creator_id === creatorId)
                        return (
                          <SelectItem key={creatorId} value={creatorId}>
                            {creator?.profiles?.full_name || creator?.profiles?.email || 'Unknown User'}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
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
                    <TableHead>Model</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.profiles?.full_name || transaction.profiles?.email || 'Unknown User'}</div>
                          <div className="text-sm text-muted-foreground">{transaction.profiles?.email || 'No email'}</div>
                        </div>
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
                        <Badge variant="outline">
                          {transaction.transaction_type}
                        </Badge>
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
                      <TableCell>
                        <div className="flex space-x-2">
                          {transaction.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateTransactionStatus(transaction.id, 'completed')}
                              >
                                Complete
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleUpdateTransactionStatus(transaction.id, 'failed')}
                              >
                                Fail
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Creator</label>
                  <Select value={newTransaction.creator_id} onValueChange={(value) => setNewTransaction({...newTransaction, creator_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select creator" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set(creatorEarnings.map(e => e.creator_id))).map(creatorId => {
                        const creator = creatorEarnings.find(e => e.creator_id === creatorId)
                        return (
                          <SelectItem key={creatorId} value={creatorId}>
                            {creator?.profiles?.full_name || creator?.profiles?.email || 'Unknown User'}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Model</label>
                  <Select value={newTransaction.model_id} onValueChange={(value) => setNewTransaction({...newTransaction, model_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {creatorEarnings.map((earning) => (
                        <SelectItem key={earning.model_id} value={earning.model_id}>
                          {earning.models.name} - {earning.profiles?.full_name || earning.profiles?.email || 'Unknown User'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newTransaction.amount.toString()}
                    onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Transaction Type</label>
                  <Select value={newTransaction.transaction_type} onValueChange={(value) => setNewTransaction({...newTransaction, transaction_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payout">Payout</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Payout Method</label>
                  <Select value={newTransaction.payout_method} onValueChange={(value) => setNewTransaction({...newTransaction, payout_method: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Input
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                    placeholder="Transaction description"
                  />
                </div>
              </div>
              <Button onClick={handleCreateTransaction}>
                Create Transaction
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
