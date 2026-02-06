"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Plus,
  Search,
  Calendar,
  Eye,
  Filter
} from "lucide-react"
import { AdminAddEarnings } from "@/components/admin-add-earnings"

interface EarningsTransaction {
  id: string
  creator_id: string
  model_id: string
  amount: number
  transaction_type: string
  status: string
  description: string
  created_at: string
  processed_at: string
  metadata: any
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

export default function ManageEarningsPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<EarningsTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all earnings transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("earnings_transactions")
        .select(`
          *,
          models!inner(id, name),
          profiles!inner(id, email, full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100)

      if (transactionsError) {
        toast.error("Failed to fetch transactions")
      } else {
        setTransactions(transactionsData)
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast.error("Failed to load transactions")
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.profiles.full_name && transaction.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      transaction.models.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedType === "all" || transaction.transaction_type === selectedType
    
    return matchesSearch && matchesType
  })

  const transactionTypes = Array.from(new Set(transactions.map(t => t.transaction_type)))
  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const adminAddedAmount = transactions
    .filter(t => t.metadata?.added_by_admin)
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
      <h1 className="text-2xl font-bold mb-4">Manage User Earnings</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Added</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${adminAddedAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Manually added by admins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">
              All earnings transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="add" className="space-y-4">
        <TabsList>
          <TabsTrigger value="add">Add Earnings</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <AdminAddEarnings onSuccess={() => fetchTransactions()} />
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Earnings Transactions</span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64 pl-10"
                    />
                  </div>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Types</option>
                    {transactionTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Admin Added</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.profiles.full_name || transaction.profiles.email}</div>
                          <div className="text-sm text-muted-foreground">{transaction.profiles.email}</div>
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
                          variant={transaction.status === 'completed' ? 'default' : 'secondary'}
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
                        {transaction.metadata?.added_by_admin ? (
                          <div className="flex items-center gap-1">
                            <Plus className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Yes</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No transactions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
