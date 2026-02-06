"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/components/auth-context"
import { useToast } from "@/hooks/use-toast"
import { ImageUpload } from "@/components/admin/image-upload"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Home,
  Search
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Category {
  id: string
  name: string
  display_name: string
  description?: string
  step_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ImageOption {
  id: string
  category_id: string
  option_key: string
  display_name: string
  image_url: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  character_image_categories?: Category
}

export default function CharacterImagesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [options, setOptions] = useState<ImageOption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("categories")

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    display_name: "",
    description: "",
    step_order: 0
  })
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)

  // Option form state
  const [optionForm, setOptionForm] = useState({
    category_id: "",
    option_key: "",
    display_name: "",
    image_url: "",
    sort_order: 0
  })
  const [editingOption, setEditingOption] = useState<string | null>(null)
  const [showOptionForm, setShowOptionForm] = useState(false)

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push("/admin/login")
    }
  }, [user, authLoading, router])

  // Fetch data
  useEffect(() => {
    if (user?.isAdmin) {
      fetchCategories()
      fetchOptions()
    }
  }, [user])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/admin/character-images/categories")
      const data = await response.json()
      if (data.categories) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const response = await fetch("/api/admin/character-images/options")
      const data = await response.json()
      if (data.options) {
        setOptions(data.options)
      }
    } catch (error) {
      console.error("Error fetching options:", error)
      toast({
        title: "Error",
        description: "Failed to fetch options",
        variant: "destructive"
      })
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingCategory 
        ? "/api/admin/character-images/categories"
        : "/api/admin/character-images/categories"
      
      const method = editingCategory ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCategory ? { id: editingCategory, ...categoryForm } : categoryForm)
      })

      if (!response.ok) {
        throw new Error("Failed to save category")
      }

      toast({
        title: "Success",
        description: `Category ${editingCategory ? "updated" : "created"} successfully`
      })

      setCategoryForm({ name: "", display_name: "", description: "", step_order: 0 })
      setEditingCategory(null)
      setShowCategoryForm(false)
      fetchCategories()
    } catch (error) {
      console.error("Error saving category:", error)
      toast({
        title: "Error",
        description: "Failed to save category",
        variant: "destructive"
      })
    }
  }

  const handleOptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingOption 
        ? "/api/admin/character-images/options"
        : "/api/admin/character-images/options"
      
      const method = editingOption ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingOption ? { id: editingOption, ...optionForm } : optionForm)
      })

      if (!response.ok) {
        throw new Error("Failed to save option")
      }

      toast({
        title: "Success",
        description: `Option ${editingOption ? "updated" : "created"} successfully`
      })

      setOptionForm({ category_id: "", option_key: "", display_name: "", image_url: "", sort_order: 0 })
      setEditingOption(null)
      setShowOptionForm(false)
      fetchOptions()
    } catch (error) {
      console.error("Error saving option:", error)
      toast({
        title: "Error",
        description: "Failed to save option",
        variant: "destructive"
      })
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? This will also delete all associated options.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/character-images/categories?id=${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete category")
      }

      toast({
        title: "Success",
        description: "Category deleted successfully"
      })

      fetchCategories()
      fetchOptions()
    } catch (error) {
      console.error("Error deleting category:", error)
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      })
    }
  }

  const handleDeleteOption = async (id: string) => {
    if (!confirm("Are you sure you want to delete this option?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/character-images/options?id=${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        throw new Error("Failed to delete option")
      }

      toast({
        title: "Success",
        description: "Option deleted successfully"
      })

      fetchOptions()
    } catch (error) {
      console.error("Error deleting option:", error)
      toast({
        title: "Error",
        description: "Failed to delete option",
        variant: "destructive"
      })
    }
  }


  const filteredCategories = categories.filter(category =>
    category.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredOptions = options.filter(option =>
    option.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.option_key.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Character Creation Images</h1>
              <p className="text-muted-foreground mt-2">
                Manage images used in the character creation flow
              </p>
            </div>
            <Button
              onClick={() => router.push("/admin/dashboard")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search categories or options..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="options">Image Options</TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Categories</h2>
              <Button
                onClick={() => {
                  setCategoryForm({ name: "", display_name: "", description: "", step_order: 0 })
                  setEditingCategory(null)
                  setShowCategoryForm(true)
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>

            {/* Category Form */}
            {showCategoryForm && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </h3>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name (key)</Label>
                      <Input
                        id="name"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., style, ethnicity"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={categoryForm.display_name}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="e.g., Character Style"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="step_order">Step Order</Label>
                    <Input
                      id="step_order"
                      type="number"
                      value={categoryForm.step_order}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, step_order: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      {editingCategory ? "Update" : "Create"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCategoryForm(false)
                        setEditingCategory(null)
                        setCategoryForm({ name: "", display_name: "", description: "", step_order: 0 })
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Categories List - Organized by Step Order */}
            <div className="space-y-4">
              {filteredCategories
                .sort((a, b) => a.step_order - b.step_order)
                .map((category) => (
                <div key={category.id} className="bg-card border rounded-lg">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                          {category.step_order}
                        </div>
                        <div>
                          <h3 className="font-semibold">{category.display_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {category.name} • {options.filter(opt => opt.category_id === category.id && opt.is_active).length} active options
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCategoryForm({
                              name: category.name,
                              display_name: category.display_name,
                              description: category.description || "",
                              step_order: category.step_order
                            })
                            setEditingCategory(category.id)
                            setShowCategoryForm(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {category.description && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Options Tab */}
          <TabsContent value="options" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Image Options</h2>
              <Button
                onClick={() => {
                  setOptionForm({ category_id: "", option_key: "", display_name: "", image_url: "", sort_order: 0 })
                  setEditingOption(null)
                  setShowOptionForm(true)
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Option
              </Button>
            </div>

            {/* Option Form */}
            {showOptionForm && (
              <div className="bg-card border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingOption ? "Edit Option" : "Add New Option"}
                </h3>
                <form onSubmit={handleOptionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category_id">Category</Label>
                      <select
                        id="category_id"
                        value={optionForm.category_id}
                        onChange={(e) => setOptionForm(prev => ({ ...prev, category_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="option_key">Option Key</Label>
                      <Input
                        id="option_key"
                        value={optionForm.option_key}
                        onChange={(e) => setOptionForm(prev => ({ ...prev, option_key: e.target.value }))}
                        placeholder="e.g., realistic, caucasian"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="display_name">Display Name</Label>
                      <Input
                        id="display_name"
                        value={optionForm.display_name}
                        onChange={(e) => setOptionForm(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="e.g., Realistic, Caucasian"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="sort_order">Sort Order</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        value={optionForm.sort_order}
                        onChange={(e) => setOptionForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Image</Label>
                    <ImageUpload
                      value={optionForm.image_url || ""}
                      onChange={(url) => setOptionForm(prev => ({ ...prev, image_url: url }))}
                      onRemove={() => setOptionForm(prev => ({ ...prev, image_url: "" }))}
                      placeholder="Click to upload image"
                      aspectRatio="aspect-[3/4]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      {editingOption ? "Update" : "Create"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowOptionForm(false)
                        setEditingOption(null)
                        setOptionForm({ category_id: "", option_key: "", display_name: "", image_url: "", sort_order: 0 })
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Options List - Organized by Steps */}
            <div className="space-y-8">
              {categories
                .filter(category => category.is_active)
                .sort((a, b) => a.step_order - b.step_order)
                .map((category) => {
                  const categoryOptions = filteredOptions.filter(option => 
                    option.category_id === category.id && option.is_active
                  ).sort((a, b) => a.sort_order - b.sort_order);
                  
                  if (categoryOptions.length === 0) return null;
                  
                  return (
                    <div key={category.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{category.display_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Step {category.step_order} • {categoryOptions.length} options
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOptionForm({
                              category_id: category.id,
                              option_key: "",
                              display_name: "",
                              image_url: "",
                              sort_order: categoryOptions.length
                            })
                            setEditingOption(null)
                            setShowOptionForm(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to {category.display_name}
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {categoryOptions.map((option) => (
                          <div key={option.id} className="bg-card border rounded-lg overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="aspect-[3/4] relative">
                              {option.image_url && option.image_url.trim() !== '' ? (
                                <img
                                  src={option.image_url}
                                  alt={option.display_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                  <div className="text-center text-gray-500">
                                    <div className="text-4xl mb-2">📷</div>
                                    <div className="text-sm">No image</div>
                                  </div>
                                </div>
                              )}
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setOptionForm({
                                      category_id: option.category_id,
                                      option_key: option.option_key,
                                      display_name: option.display_name,
                                      image_url: option.image_url,
                                      sort_order: option.sort_order
                                    })
                                    setEditingOption(option.id)
                                    setShowOptionForm(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteOption(option.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="p-3">
                              <h4 className="font-semibold text-sm truncate">{option.display_name}</h4>
                              <p className="text-xs text-muted-foreground truncate">
                                {option.option_key}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Order: {option.sort_order}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
