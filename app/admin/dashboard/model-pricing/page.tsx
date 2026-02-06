"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Zap, Eye, EyeOff, Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Model {
  id: string
  name: string
  description: string
  category: string
  token_cost: number
  is_premium: boolean
  is_active: boolean
  features: any
  created_at: string
  updated_at: string
  creator_id: string | null
  earnings_per_use: number
  earnings_per_token: number
}

type AdminCharacter = {
  id: string
  name: string
  description: string
  image?: string | null
  created_at?: string
}

export default function ModelPricingPage() {
  const supabase = createClient()
  const [models, setModels] = useState<Model[]>([])
  const [characters, setCharacters] = useState<AdminCharacter[]>([])
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [sellDialogOpen, setSellDialogOpen] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<AdminCharacter | null>(null)
  const [sellTokenCost, setSellTokenCost] = useState<number>(0)
  const [sellIsPremium, setSellIsPremium] = useState<boolean>(true)
  const [isPublishing, setIsPublishing] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCharacters, setTotalCharacters] = useState(0)
  const ITEMS_PER_PAGE = 25

  const categories = [
    "Image Generation",
    "Anime",
    "Realistic",
    "Fantasy",
    "Sci-Fi",
    "Artistic",
    "Character",
    "Environment"
  ]

  useEffect(() => {
    fetchModels()
  }, [])

  useEffect(() => {
    fetchCharacters()
  }, [currentPage, searchQuery])

  const fetchModels = async () => {
    const { data, error } = await supabase
      .from("models")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      toast.error("Failed to fetch models")
    } else {
      setModels(data)
    }
  }

  const fetchCharacters = async () => {
    let query = supabase
      .from("characters")
      .select("id,name,description,image,created_at", { count: "exact" })
      .order("created_at", { ascending: false })

    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`)
    }

    const from = (currentPage - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      // Silent fail to avoid blocking models page
      console.error("Failed to fetch characters", error)
    } else {
      setCharacters(data as AdminCharacter[])
      setTotalCharacters(count || 0)
    }
  }

  const handlePublishFromCharacter = (character: AdminCharacter) => {
    setSelectedCharacter(character)
    setSellTokenCost(0)
    setSellIsPremium(true)
    setSellDialogOpen(true)
  }

  const confirmPublish = async () => {
    if (!selectedCharacter) return
    if (sellTokenCost < 0) {
      toast.error("Token cost must be 0 or greater")
      return
    }

    setIsPublishing(true)
    try {
      const { error } = await supabase.from("models").insert([{
        name: selectedCharacter.name || "",
        description: selectedCharacter.description || "",
        category: "Character",
        token_cost: sellTokenCost,
        is_premium: sellIsPremium,
        is_active: true,
        features: {},
        creator_id: null,
        earnings_per_use: 0,
        earnings_per_token: 0.0001,
        character_id: selectedCharacter.id,
      }])
      if (error) {
        toast.error("Failed to publish model")
      } else {
        toast.success("Model published and available on Premium page")
        setSellDialogOpen(false)
        setSelectedCharacter(null)
        await fetchModels()
      }
    } finally {
      setIsPublishing(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingModel) return

    const { error } = await supabase
      .from("models")
      .update({
        name: editingModel.name,
        description: editingModel.description,
        category: editingModel.category,
        token_cost: editingModel.token_cost,
        is_premium: editingModel.is_premium,
        is_active: editingModel.is_active,
        features: editingModel.features
      })
      .eq("id", editingModel.id)

    if (error) {
      toast.error("Failed to update model")
    } else {
      toast.success("Model updated successfully")
      setEditingModel(null)
      fetchModels()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return

    const { error } = await supabase.from("models").delete().eq("id", id)
    if (error) {
      toast.error("Failed to delete model")
    } else {
      toast.success("Model deleted successfully")
      fetchModels()
    }
  }

  const toggleModelStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("models")
      .update({ is_active: !currentStatus })
      .eq("id", id)

    if (error) {
      toast.error("Failed to update model status")
    } else {
      toast.success(`Model ${!currentStatus ? 'activated' : 'deactivated'}`)
      fetchModels()
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price)
  }

  const modelNames = new Set(models.map((m) => m.name?.trim().toLowerCase()))

  const prefillFromCharacter = (_character: AdminCharacter) => { }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Model Pricing Management</h1>
        <div className="text-sm text-muted-foreground">
          Total Models: {models.length} | Active: {models.filter(m => m.is_active).length}
        </div>
      </div>

      {/* Characters List (Models Source) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Characters</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search characters..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1) // Reset to first page on search
                }}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Character</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {characters.map((ch) => {
                const alreadyListed = modelNames.has((ch.name || "").trim().toLowerCase())
                return (
                  <TableRow key={ch.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {ch.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ch.image} alt={ch.name} className="h-10 w-10 rounded object-cover border" />
                        ) : (
                          <div className="h-10 w-10 rounded border bg-muted" />
                        )}
                        <div>
                          <div className="font-medium">{ch.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-1">{ch.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {alreadyListed ? (
                        <Badge>Listed as Model</Badge>
                      ) : (
                        <Badge variant="outline">Not Listed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={alreadyListed ? "outline" : "default"}
                        disabled={alreadyListed}
                        onClick={() => handlePublishFromCharacter(ch)}
                      >
                        {alreadyListed ? "Already Listed" : "Sell as Model"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {characters.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <div className="text-sm text-muted-foreground">No characters found.</div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalCharacters > ITEMS_PER_PAGE && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  <PaginationItem>
                    <div className="flex items-center px-4 text-sm font-medium">
                      Page {currentPage} of {Math.ceil(totalCharacters / ITEMS_PER_PAGE)}
                    </div>
                  </PaginationItem>

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(Math.ceil(totalCharacters / ITEMS_PER_PAGE), p + 1))}
                      className={currentPage === Math.ceil(totalCharacters / ITEMS_PER_PAGE) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sell as Model Dialog */}
      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell as Model</DialogTitle>
            <DialogDescription>
              {selectedCharacter ? `Publish "${selectedCharacter.name}" as a purchasable model.` : "Publish character as model."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sell_token_cost">Token Price</Label>
              <Input
                id="sell_token_cost"
                type="number"
                value={Number.isFinite(sellTokenCost) ? sellTokenCost : 0}
                onChange={(e) => setSellTokenCost(parseInt(e.target.value) || 0)}
                placeholder="Enter token price"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="sell_is_premium"
                checked={sellIsPremium}
                onCheckedChange={(checked) => setSellIsPremium(checked)}
              />
              <Label htmlFor="sell_is_premium">Mark as Premium</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialogOpen(false)} disabled={isPublishing}>Cancel</Button>
            <Button onClick={confirmPublish} disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Models List */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Models</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Token Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  {editingModel?.id === model.id ? (
                    <>
                      <TableCell>
                        <div className="space-y-2">
                          <Input
                            value={editingModel.name}
                            onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                            placeholder="Model name"
                          />
                          <Textarea
                            value={editingModel.description}
                            onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                            placeholder="Description"
                            rows={2}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select value={editingModel.category} onValueChange={(value) => setEditingModel({ ...editingModel, category: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editingModel.token_cost}
                          onChange={(e) => setEditingModel({ ...editingModel, token_cost: parseInt(e.target.value) || 0 })}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={editingModel.is_active}
                            onCheckedChange={(checked) => setEditingModel({ ...editingModel, is_active: checked })}
                          />
                          <span className="text-sm">{editingModel.is_active ? "Active" : "Inactive"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={editingModel.is_premium}
                            onCheckedChange={(checked) => setEditingModel({ ...editingModel, is_premium: checked })}
                          />
                          <span className="text-sm">{editingModel.is_premium ? "Premium" : "Free"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button onClick={handleUpdate} size="sm">Save</Button>
                          <Button onClick={() => setEditingModel(null)} variant="outline" size="sm">
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {model.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Zap className="h-4 w-4 text-[#1111FF]" />
                          <span className="font-medium">{model.token_cost}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleModelStatus(model.id, model.is_active)}
                          >
                            {model.is_active ? (
                              <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Badge variant={model.is_active ? "default" : "secondary"}>
                            {model.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={model.is_premium ? "default" : "outline"}>
                          {model.is_premium ? "Premium" : "Free"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button onClick={() => setEditingModel(model)} size="sm">
                            Edit
                          </Button>
                          <Button onClick={() => handleDelete(model.id)} variant="destructive" size="sm">
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
