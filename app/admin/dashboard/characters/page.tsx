"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth-context"
import { useCharacters } from "@/components/character-context"
import { Home, Search, Trash2, Edit, Plus, Upload, AlertTriangle, Video, VideoOff, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import Image from "next/image"
import { CharacterHoverVideoModal } from "@/components/character-hover-video-modal"
import type { Character } from "@/types/character"
import { TableSkeleton } from "@/components/skeletons"

// Add export const dynamic = 'force-dynamic' at the top of the file to prevent static prerendering
export const dynamic = "force-dynamic"

// Add helper function at the top of the component
const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AdminCharactersPage() {
  const { user, isLoading } = useAuth()
  const { characters, deleteCharacter, updateCharacter, refreshCharacters } = useCharacters()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [selectedCharacterForVideo, setSelectedCharacterForVideo] = useState<Character | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 25
  const [isGeneratingGallery, setIsGeneratingGallery] = useState<string | null>(null)
  const [charactersWithGallery, setCharactersWithGallery] = useState<Set<string>>(new Set())

  // Redirect if not logged in or not admin
  useEffect(() => {
    if (!isLoading && (!user || !user.isAdmin)) {
      router.push("/admin/login")
    }
  }, [user, isLoading, router])

  // Load all characters when admin dashboard mounts
  useEffect(() => {
    if (user && user.isAdmin && !isLoading) {
      refreshCharacters()
    }
  }, [user, isLoading])

  const [activeCategory, setActiveCategory] = useState("Female")

  // Update the filteredCharacters logic to handle undefined characters array and category filtering
  const filteredCharacters =
    characters?.filter((char) => {
      // Search filter
      const matchesSearch =
        char.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        char.description.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      // Category filter
      const charCategory = (char.category || "").toLowerCase().trim()
      const activeTypeLC = activeCategory.toLowerCase().trim()

      // Map UI types to DB types (matching HomeClient logic)
      if (activeTypeLC === "female" && ["girls", "girl", "female", "woman", "women"].includes(charCategory)) return true
      if (activeTypeLC === "male" && ["guys", "guy", "male", "man", "men", "boy", "boys"].includes(charCategory))
        return true
      if (activeTypeLC === "anime" && charCategory === "anime") return true

      // Fallback for direct matches
      if (charCategory.includes(activeTypeLC)) return true

      // If we are in "Female" tab, we might want to capture empty categories or defaults? 
      // For now strict matching as per user request "sort into these three classes"
      return false
    }) || []

  // Calculate pagination
  const totalPages = Math.ceil(filteredCharacters.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedCharacters = filteredCharacters.slice(startIndex, endIndex)

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Check which characters already have gallery images
  useEffect(() => {
    const checkGalleryStatus = async () => {
      if (!characters.length) return

      try {
        // Fetch ALL character content in a single API call (much faster!)
        const response = await fetch('/api/admin/character-content')

        if (!response.ok) {
          console.error('Error fetching character content:', await response.text())
          return
        }

        const data = await response.json()

        if (!data.success || !data.content) {
          console.error('Invalid response from character content API')
          return
        }

        // Process all content to find which characters have gallery images
        const galleryStatus = new Set<string>()

        data.content.forEach((item: any) => {
          if ((item.tab_type === 'gallery' || item.tab_type === 'unlocked') && item.character_id) {
            galleryStatus.add(item.character_id)
          }
        })

        setCharactersWithGallery(galleryStatus)
      } catch (error) {
        console.error('Error checking gallery status:', error)
      }
    }

    checkGalleryStatus()
  }, [characters])

  const handleDeleteCharacter = async (id: string) => {
    setIsDeleting(id)
    try {
      await deleteCharacter(id)
    } catch (error) {
      console.error("Failed to delete character:", error)
    } finally {
      setIsDeleting(null)
    }
  }

  const handleImageUpload = async (characterId: string) => {
    const character = characters.find(c => c.id === characterId)
    if (!character) return

    // Trigger file picker
    fileInputRef.current?.setAttribute('data-character-id', characterId)
    fileInputRef.current?.click()
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const characterId = e.target.getAttribute('data-character-id')
    if (!characterId) return

    const character = characters.find(c => c.id === characterId)
    if (!character) return

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image file is too large. Please choose a smaller image (max 10MB).")
      return
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if (!validTypes.includes(file.type)) {
      setError("Unsupported image format. Please use JPG, PNG, WebP, or GIF images.")
      return
    }

    try {
      setIsUpdating(characterId)
      setError("")

      // Convert file to base64
      const base64Data = await convertFileToBase64(file)

      // Upload to Bunny.net
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Data,
          filename: `admin-character_${Date.now()}_${file.name}`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const result = await response.json()

      if (!result.success || !result.url) {
        throw new Error('Failed to upload image to Bunny.net')
      }

      // Update the character with the new image using the context's updateCharacter
      // Note: This will call the /api/update-character endpoint internally
      await updateCharacter(characterId, {
        name: character.name,
        age: character.age,
        image: result.url,
        videoUrl: character.videoUrl || "",
        description: character.description,
        personality: character.personality || "",
        occupation: character.occupation || "",
        hobbies: character.hobbies || "",
        body: character.body || "Average",
        ethnicity: character.ethnicity || "Mixed",
        language: character.language || "English",
        relationship: character.relationship || "Single",
        systemPrompt: character.systemPrompt || "",
      })

      console.log('Character image updated successfully:', characterId)

    } catch (err) {
      console.error('Error uploading image:', err)

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to upload image. Please try again.')
      }
    } finally {
      setIsUpdating(null)
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
        fileInputRef.current.removeAttribute('data-character-id')
      }
    }
  }

  const handleVideoGeneration = (character: Character) => {
    setSelectedCharacterForVideo(character)
    setVideoModalOpen(true)
  }

  const handleVideoSuccess = () => {
    // Refresh characters to get updated video URLs
    refreshCharacters()
  }

  const handleGenerateGallery = async (characterId: string) => {
    const character = characters.find(c => c.id === characterId)
    if (!character) return

    setIsGeneratingGallery(characterId)
    setError("")

    try {
      const response = await fetch('/api/generate-character-gallery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          characterId: characterId,
          characterImageUrl: character.image,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate gallery')
      }

      // Update gallery status for this character
      setCharactersWithGallery(prev => new Set([...prev, characterId]))

      // Show success message
      setError(`✅ Successfully generated ${data.generated} images for ${character.name}'s gallery! Images are saved. Refresh the chat page (/chat/${characterId}) to see them in the Unlocked and Gallery tabs.`)

      // Clear success message after 10 seconds
      setTimeout(() => setError(""), 10000)

    } catch (err) {
      console.error('Error generating gallery:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate gallery. Please try again.')
    } finally {
      setIsGeneratingGallery(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white p-6">
        <div className="mb-6">
          <div className="h-8 w-48 bg-muted/20 rounded animate-pulse mb-2" />
        </div>
        <div className="bg-[#1A1A1A] rounded-xl p-6">
          <div className="flex justify-between mb-6">
            <div className="h-8 w-32 bg-muted/20 rounded animate-pulse" />
            <div className="h-8 w-64 bg-muted/20 rounded animate-pulse" />
          </div>
          <TableSkeleton rows={10} columns={6} />
        </div>
      </div>
    )
  }

  if (!user || !user.isAdmin) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="flex h-screen">
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <header className="bg-[#1A1A1A] border-b border-[#252525] p-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Character Management</h2>
            <Button variant="outline" onClick={() => router.push("/")}>
              <Home className="mr-2 h-4 w-4" />
              View Site
            </Button>
          </header>

          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-800 text-red-300 rounded-lg flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-[#1A1A1A] rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium">Characters ({characters.length})</h3>
                <div className="flex items-center gap-4">
                  {/* Category Filter Tabs */}
                  <div className="bg-[#252525] p-1 rounded-full flex">
                    {["Female", "Anime", "Male"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setActiveCategory(cat)
                          setCurrentPage(1) // Reset page on category change
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeCategory === cat ? "bg-[#6366f1] text-white shadow-sm" : "text-gray-400 hover:text-gray-200"
                          }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search characters..."
                        className="pl-9 bg-[#252525] border-[#333] text-white w-64"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Link href="/admin/dashboard/characters/create">
                      <Button className="bg-[#FF4D8D] hover:bg-[#FF3D7D] text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Character
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#252525]">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Age</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Occupation</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Hover Video</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
                      <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCharacters.map((character) => (
                      <tr key={character.id} className="border-b border-[#252525] hover:bg-[#252525]/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div
                              className="w-8 h-8 rounded-full bg-[#252525] mr-3 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => handleImageUpload(character.id)}
                              title="Click to update profile picture"
                            >
                              {isUpdating === character.id ? (
                                <div className="flex items-center justify-center w-full h-full">
                                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                </div>
                              ) : (
                                <img
                                  src={character.image || "/placeholder.svg"}
                                  alt={character.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <span>{character.name}</span>
                            {character.isNew && (
                              <span className="ml-2 px-2 py-0.5 bg-[#FF4D8D]/20 text-[#FF4D8D] text-xs rounded-full">
                                New
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">{character.age}</td>
                        <td className="py-3 px-4">{character.occupation}</td>
                        <td className="py-3 px-4">
                          {character.videoUrl ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <Video className="h-4 w-4" />
                              <span className="text-xs">Has Video</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-500">
                              <VideoOff className="h-4 w-4" />
                              <span className="text-xs">No Video</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {format(new Date(character.createdAt), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={charactersWithGallery.has(character.id)
                                ? "text-green-400 hover:text-green-300 hover:bg-green-900/20"
                                : "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20"
                              }
                              onClick={() => handleGenerateGallery(character.id)}
                              disabled={isGeneratingGallery === character.id}
                              title={charactersWithGallery.has(character.id) ? "Regenerate gallery images" : "Generate 5 gallery images"}
                            >
                              {isGeneratingGallery === character.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={character.videoUrl ? "text-purple-400 hover:text-purple-300 hover:bg-purple-900/20" : "text-gray-400 hover:text-gray-300 hover:bg-gray-900/20"}
                              onClick={() => handleVideoGeneration(character)}
                              title={character.videoUrl ? "Regenerate hover video" : "Create hover video"}
                            >
                              <Video className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                              onClick={() => handleImageUpload(character.id)}
                              disabled={isUpdating === character.id}
                              title="Upload new image"
                            >
                              {isUpdating === character.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                            </Button>
                            <Link href={`/admin/dashboard/characters/edit/${character.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              onClick={() => handleDeleteCharacter(character.id)}
                              disabled={isDeleting === character.id}
                            >
                              {isDeleting === character.id ? "Deleting..." : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredCharacters.length === 0 && (
                <div className="text-center py-8 text-gray-400">No characters found matching your search.</div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-[#252525] pt-4">
                  <div className="text-sm text-gray-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredCharacters.length)} of {filteredCharacters.length} characters
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="bg-[#252525] border-[#333] text-white hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm text-gray-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="bg-[#252525] border-[#333] text-white hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden file input for image uploads */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleImageChange}
        />

        {/* Hover Video Generation Modal */}
        {selectedCharacterForVideo && (
          <CharacterHoverVideoModal
            character={selectedCharacterForVideo}
            isOpen={videoModalOpen}
            onClose={() => {
              setVideoModalOpen(false)
              setSelectedCharacterForVideo(null)
            }}
            onSuccess={handleVideoSuccess}
          />
        )}
      </div>
    </div>
  )
}
