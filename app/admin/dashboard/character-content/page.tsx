"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/components/auth-context"
import { useCharacters } from "@/components/character-context"
import { Upload, Loader2, Trash2, Image as ImageIcon, Check } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface AdminContent {
  id: string
  character_id: string
  image_url: string
  tab_type: "gallery" | "unlocked"
  uploaded_by: string
  created_at: string
}

export default function CharacterContentPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { characters, isLoading: charactersLoading } = useCharacters()
  const router = useRouter()

  // Form state
  const [selectedCharacter, setSelectedCharacter] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [tabType, setTabType] = useState<"gallery" | "unlocked">("gallery")
  
  // UI state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState<string>("")
  const [uploadProgress, setUploadProgress] = useState<string>("")
  
  // Content management state
  const [adminContent, setAdminContent] = useState<AdminContent[]>([])
  const [isLoadingContent, setIsLoadingContent] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push("/admin/login")
    }
  }, [user, authLoading, router])

  // Load admin content
  useEffect(() => {
    if (user?.isAdmin) {
      loadAdminContent()
    }
  }, [user])

  const loadAdminContent = async () => {
    try {
      setIsLoadingContent(true)
      const response = await fetch("/api/admin/character-content")
      if (response.ok) {
        const data = await response.json()
        setAdminContent(data.content || [])
      }
    } catch (error) {
      console.error("Failed to load admin content:", error)
    } finally {
      setIsLoadingContent(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadSuccess(false)
      setUploadError("")
      
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedCharacter) {
      setUploadError("Please select a character and an image")
      return
    }

    setIsUploading(true)
    setUploadError("")
    setUploadSuccess(false)

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.readAsDataURL(selectedFile)
      
      reader.onloadend = async () => {
        const base64Image = reader.result as string

        // Step 1: Upload to Bunny.net
        setUploadProgress("Uploading to CDN...")
        const uploadResponse = await fetch("/api/upload-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageData: base64Image,
            filename: `character-content_${selectedCharacter}_${Date.now()}.jpg`,
          }),
        })

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image to Bunny.net")
        }

        const uploadData = await uploadResponse.json()
        const imageUrl = uploadData.url

        // Step 2: Save to database
        setUploadProgress("Saving to database...")
        const saveResponse = await fetch("/api/admin/character-content", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            characterId: selectedCharacter,
            imageUrl: imageUrl,
            tabType: tabType,
          }),
        })

        if (!saveResponse.ok) {
          throw new Error("Failed to save content to database")
        }

        // Step 3: Success!
        setUploadProgress("Complete!")
        setUploadSuccess(true)
        setSelectedFile(null)
        setImagePreview("")
        setSelectedCharacter("")
        setTabType("gallery")
        
        // Reload content
        await loadAdminContent()

        // Clear messages after 3 seconds
        setTimeout(() => {
          setUploadSuccess(false)
          setUploadProgress("")
        }, 3000)
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadError(error instanceof Error ? error.message : "Failed to upload image")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content?")) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/character-content/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete content")
      }

      // Reload content
      await loadAdminContent()
    } catch (error) {
      console.error("Delete error:", error)
      alert("Failed to delete content. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const getCharacterName = (characterId: string) => {
    const character = characters.find((c) => c.id === characterId)
    return character?.name || "Unknown Character"
  }

  // Pagination calculations
  const totalPages = Math.ceil(adminContent.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedContent = adminContent.slice(startIndex, endIndex)

  if (authLoading || charactersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !user.isAdmin) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Character Content</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Upload images to appear in character Gallery or Unlocked tabs
        </p>
      </div>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle>Upload New Content</CardTitle>
          <CardDescription>
            Select a character, upload an image, and choose which tab it should appear in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="character">Select Character</Label>
                <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a character" />
                  </SelectTrigger>
                  <SelectContent>
                    {characters.map((character) => (
                      <SelectItem key={character.id} value={character.id}>
                        {character.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Image File</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                <p className="text-xs text-slate-500">
                  Supported formats: JPG, PNG, WebP
                </p>
              </div>

              <div className="space-y-2">
                <Label>Display Tab</Label>
                <RadioGroup value={tabType} onValueChange={(value) => setTabType(value as "gallery" | "unlocked")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gallery" id="gallery" />
                    <Label htmlFor="gallery" className="cursor-pointer font-normal">
                      Gallery Tab
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="unlocked" id="unlocked" />
                    <Label htmlFor="unlocked" className="cursor-pointer font-normal">
                      Unlocked Tab
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-slate-500">
                  Choose which tab this image will appear in
                </p>
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !selectedCharacter || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Content
                  </>
                )}
              </Button>

              {uploadProgress && (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">{uploadProgress}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <Check className="h-4 w-4" />
                  <span className="text-sm">Content uploaded successfully!</span>
                </div>
              )}

              {uploadError && (
                <div className="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <p className="text-sm">{uploadError}</p>
                </div>
              )}
            </div>

            {/* Right Column - Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 aspect-square flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center text-slate-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Image preview will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Content Table */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Content</CardTitle>
          <CardDescription>Manage all character content uploaded by admins</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingContent ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : adminContent.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No content uploaded yet</p>
              <p className="text-sm mt-1">Upload your first character content above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Character</TableHead>
                    <TableHead>Tab</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedContent.map((content) => (
                    <TableRow key={content.id}>
                      <TableCell>
                        <img
                          src={content.image_url}
                          alt="Content"
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {getCharacterName(content.character_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={content.tab_type === "gallery" ? "default" : "secondary"}>
                          {content.tab_type === "gallery" ? "Gallery" : "Unlocked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(content.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(content.id)}
                          disabled={deletingId === content.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          {deletingId === content.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Showing {startIndex + 1}-{Math.min(endIndex, adminContent.length)} of {adminContent.length} items
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[36px]"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
