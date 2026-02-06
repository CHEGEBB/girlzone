"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  DollarSign, 
  Users, 
  Cpu, 
  Plus,
  Search,
  AlertCircle,
  CheckCircle
} from "lucide-react"

interface User {
  id: string
  email: string
  full_name: string
  created_at: string
}

interface Model {
  id: string
  name: string
  description: string
  category: string
  creator_id: string | null
  is_active: boolean
}

interface AdminAddEarningsProps {
  className?: string
  onSuccess?: () => void
}

export function AdminAddEarnings({ className = "", onSuccess }: AdminAddEarningsProps) {
  const [users, setUsers] = useState<User[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [formData, setFormData] = useState({
    userId: "",
    modelId: "",
    amount: 0,
    description: "",
    transactionType: "bonus"
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch users and models in parallel
      const [usersResponse, modelsResponse] = await Promise.all([
        fetch("/api/admin/users-models?type=users"),
        fetch("/api/admin/users-models?type=models")
      ])

      const usersData = await usersResponse.json()
      const modelsData = await modelsResponse.json()

      if (usersData.success) {
        setUsers(usersData.users)
      } else {
        toast.error("Failed to fetch users")
      }

      if (modelsData.success) {
        setModels(modelsData.models)
      } else {
        toast.error("Failed to fetch models")
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.userId || !formData.modelId || formData.amount <= 0) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/admin/add-earnings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(data.message)
        setFormData({
          userId: "",
          modelId: "",
          amount: 0,
          description: "",
          transactionType: "bonus"
        })
        onSuccess?.()
      } else {
        toast.error(data.error || "Failed to add earnings")
      }
    } catch (error) {
      console.error("Error adding earnings:", error)
      toast.error("Failed to add earnings")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const selectedUser = users.find(user => user.id === formData.userId)
  const selectedModel = models.find(model => model.id === formData.modelId)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-green-500" />
          Add Earnings to User
        </CardTitle>
        <CardDescription>Manually add earnings to a user's model balance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Selection */}
        <div>
          <Label htmlFor="user-search">Select User</Label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-search"
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={formData.userId} onValueChange={(value) => setFormData(prev => ({ ...prev, userId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{user.full_name || user.email}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUser && (
              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Selected: {selectedUser.full_name || selectedUser.email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <Label htmlFor="model">Select Model</Label>
          <Select value={formData.modelId} onValueChange={(value) => setFormData(prev => ({ ...prev, modelId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{model.name}</div>
                      <div className="text-sm text-muted-foreground">{model.category}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedModel && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-lg mt-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <div className="font-medium">Selected: {selectedModel.name}</div>
                <div className="text-xs">{selectedModel.description}</div>
              </div>
            </div>
          )}
        </div>

        {/* Amount and Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="transaction-type">Transaction Type</Label>
            <Select value={formData.transactionType} onValueChange={(value) => setFormData(prev => ({ ...prev, transactionType: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bonus">Bonus</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
                <SelectItem value="reward">Reward</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Optional description for this earnings addition..."
            rows={3}
          />
        </div>

        {/* Summary */}
        {formData.userId && formData.modelId && formData.amount > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Transaction Summary</h4>
            <div className="space-y-1 text-sm">
              <div><strong>User:</strong> {selectedUser?.full_name || selectedUser?.email}</div>
              <div><strong>Model:</strong> {selectedModel?.name}</div>
              <div><strong>Amount:</strong> ${formData.amount.toFixed(2)}</div>
              <div><strong>Type:</strong> <Badge variant="outline">{formData.transactionType}</Badge></div>
              {formData.description && (
                <div><strong>Description:</strong> {formData.description}</div>
              )}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || !formData.userId || !formData.modelId || formData.amount <= 0}
          className="w-full"
        >
          {isSubmitting ? "Adding Earnings..." : "Add Earnings"}
        </Button>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>This will add earnings to the user's model balance immediately</li>
                <li>The earnings will be available for withdrawal requests</li>
                <li>All transactions are recorded in the earnings history</li>
                <li>This action cannot be undone automatically</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
