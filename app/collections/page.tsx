"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { GallerySkeleton } from "@/components/skeletons"

interface GeneratedImage {
  id: string
  image_url: string
  prompt: string
  created_at: string
  media_type?: 'image' | 'video'
  character_id?: string
  character_name?: string
}

export default function CollectionsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalImage, setModalImage] = useState<GeneratedImage | null>(null)
  const [modalIndex, setModalIndex] = useState<number>(0)
  const [zoomed, setZoomed] = useState(false)
  const modalImgRef = useRef<HTMLDivElement>(null)

  // NEW: Character filter and prompt visibility
  const [selectedCharacter, setSelectedCharacter] = useState<string>("all")
  const [showPrompts, setShowPrompts] = useState(false)

  // Get unique characters for filter dropdown
  const uniqueCharacters = useMemo(() => {
    const chars = images
      .filter(img => img.character_name)
      .map(img => ({ id: img.character_id, name: img.character_name }))
    const unique = Array.from(new Map(chars.map(c => [c.id, c])).values())
    return unique
  }, [images])

  // Filter images by selected character
  const filteredImages = useMemo(() => {
    if (selectedCharacter === "all") return images
    return images.filter(img => img.character_id === selectedCharacter)
  }, [images, selectedCharacter])

  useEffect(() => {
    async function fetchImages() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/generated-images")
        if (!response.ok) {
          throw new Error("Failed to fetch images")
        }
        const data = await response.json()
        setImages(data.images || [])
      } catch (err) {
        console.error("Error fetching images:", err)
        setError("Failed to load your image collection")
        toast({
          title: "Error",
          description: "Failed to load your image collection",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchImages()
  }, [toast])

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([])
      setSelectAll(false)
    } else {
      setSelectedIds(images.map((img) => img.id))
      setSelectAll(true)
    }
  }

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    )
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return

    try {
      // Delete all selected images from the database
      await Promise.all(
        selectedIds.map((id) =>
          fetch("/api/generated-images", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageId: id }),
          })
        )
      )

      const filtered = images.filter((img) => !selectedIds.includes(img.id))
      setImages(filtered)
      setSelectedIds([])
      setSelectAll(false)

      toast({
        title: "Success",
        description: `${selectedIds.length} image${selectedIds.length > 1 ? 's' : ''} deleted`,
      })
    } catch (error) {
      console.error("Error deleting images:", error)
      toast({
        title: "Error",
        description: "Failed to delete some images",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch("/api/generated-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: id }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete image")
      }

      const filtered = images.filter((img) => img.id !== id)
      setImages(filtered)
      setSelectedIds((prev) => prev.filter((sid) => sid !== id))

      if (modalImage && modalImage.id === id) {
        if (filtered.length === 0) {
          setModalOpen(false)
          setModalImage(null)
        } else {
          const newIdx = Math.max(0, Math.min(modalIndex, filtered.length - 1))
          setModalIndex(newIdx)
          setModalImage(filtered[newIdx])
        }
      }

      toast({
        title: "Success",
        description: "Image deleted",
      })
    } catch (error) {
      console.error("Error deleting image:", error)
      toast({
        title: "Error",
        description: "Failed to delete image",
        variant: "destructive",
      })
    }
  }

  const handleView = (img: GeneratedImage) => {
    const idx = images.findIndex((i) => i.id === img.id)
    setModalImage(img)
    setModalIndex(idx)
    setModalOpen(true)
    setZoomed(false)
  }

  const handleModalNav = (dir: "next" | "prev") => {
    if (!images.length) return
    let newIdx = modalIndex
    if (dir === "next") {
      newIdx = (modalIndex + 1) % images.length
    } else {
      newIdx = (modalIndex - 1 + images.length) % images.length
    }
    setModalIndex(newIdx)
    setModalImage(images[newIdx])
    setZoomed(false)
  }

  useEffect(() => {
    if (!modalOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleModalNav("next")
      if (e.key === "ArrowLeft") handleModalNav("prev")
      if (e.key === "Escape") setModalOpen(false)
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [modalOpen, modalIndex, images])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Image Collection</h1>
        <GallerySkeleton count={8} className="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Your Image Collection</h1>

      {images.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Button variant={selectAll ? "secondary" : "outline"} onClick={handleSelectAll}>
            {selectAll ? "Unselect All" : "Select All"}
          </Button>
          <Button variant="destructive" onClick={handleDeleteSelected} disabled={selectedIds.length === 0}>
            Delete Selected
          </Button>
          <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>

          {/* Character Filter Dropdown */}
          {uniqueCharacters.length > 0 && (
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Characters</option>
              {uniqueCharacters.map((char) => (
                <option key={char.id} value={char.id}>{char.name}</option>
              ))}
            </select>
          )}

          {/* Show Prompts Toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showPrompts}
              onChange={(e) => setShowPrompts(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            Show Prompts
          </label>
        </div>
      )}

      {filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-background rounded-xl shadow-inner border border-border">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" className="mb-4 text-muted-foreground"><path d="M12 5v14m7-7H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <h2 className="text-2xl font-semibold text-foreground">{selectedCharacter === "all" ? "No images saved yet" : "No images for this character"}</h2>
          <p className="mt-2 text-muted-foreground">{selectedCharacter === "all" ? "Generate and save images to see them here!" : "Try selecting 'All Characters' or generate more images."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredImages.map((image) => {
            const selected = selectedSet.has(image.id)
            return (
              <div
                key={image.id}
                className={`relative group rounded-2xl overflow-hidden border transition-all duration-200 bg-background border-border ${selected ? "ring-4 ring-primary ring-offset-2 ring-offset-background" : "hover:shadow-xl"}`}
                style={{ minHeight: showPrompts ? "420px" : "340px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
              >
                <div className="relative w-full h-80 cursor-pointer" onClick={() => handleView(image)}>
                  {image.media_type === 'video' ? (
                    <video
                      src={image.image_url}
                      className="w-full h-full object-cover rounded-2xl"
                      muted
                    />
                  ) : (
                    <Image src={image.image_url || "/placeholder.svg"} alt={image.prompt} fill unoptimized className="object-cover object-top transition-transform duration-200 group-hover:scale-105" style={{ borderRadius: "1rem" }} />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col justify-between p-2 transition-opacity rounded-2xl">
                    <div className="flex justify-between items-center">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleSelect(image.id)}
                        className="w-5 h-5 accent-primary bg-white rounded shadow"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Select image"
                      />
                      <Button size="sm" variant="outline" className="!px-2 !py-1 text-xs" onClick={(e) => { e.stopPropagation(); handleDelete(image.id) }}>Delete</Button>
                    </div>
                    <Button size="sm" variant="secondary" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); handleView(image) }}>View</Button>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  {showPrompts && <p className="text-base text-foreground font-medium line-clamp-3 mb-2">{image.prompt}</p>}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-muted-foreground">{new Date(image.created_at).toLocaleDateString()}</span>
                    {image.character_name && <span className="text-xs text-primary font-medium">{image.character_name}</span>}
                    {selected && <span className="ml-2 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">Selected</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ✅ FIXED Modal Section */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        {modalImage && (
          <DialogContent className="max-w-[95vw] sm:max-w-[32rem] p-0 overflow-hidden border-none bg-background rounded-2xl shadow-2xl">
            <DialogTitle className="sr-only">Image Viewer - {modalImage.prompt}</DialogTitle>
            <button
              className="absolute top-3 right-3 z-10 bg-muted hover:bg-muted/80 text-muted-foreground rounded-full p-2"
              onClick={() => setModalOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>

            {images.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background/90 rounded-full p-2 shadow border border-border"
                  onClick={() => handleModalNav("prev")}
                  aria-label="Previous image"
                >
                  &#8592;
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background/90 rounded-full p-2 shadow border border-border"
                  onClick={() => handleModalNav("next")}
                  aria-label="Next image"
                >
                  &#8594;
                </button>
              </>
            )}

            {modalImage.media_type === 'video' ? (
              <div className="relative w-full aspect-[3/4] bg-muted rounded-t-2xl overflow-hidden">
                <video
                  controls
                  className="w-full h-full object-cover"
                  src={modalImage.image_url}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div
                ref={modalImgRef}
                className="relative w-full aspect-[3/4] bg-muted rounded-t-2xl overflow-hidden transition-transform"
                style={{
                  transform: zoomed ? "scale(1.1)" : "scale(1)",
                  transition: "transform 0.3s ease-in-out",
                  cursor: zoomed ? "zoom-out" : "zoom-in",
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setZoomed((z) => !z)
                }}
                title={zoomed ? "Click to zoom out" : "Click to zoom in"}
              >
                <Image
                  src={modalImage.image_url || "/placeholder.svg"}
                  alt={modalImage.prompt}
                  fill
                  unoptimized
                  className="object-cover object-top w-full h-full"
                  style={{ borderRadius: "1rem 1rem 0 0" }}
                  sizes="(max-width: 640px) 90vw, 24rem"
                />
              </div>
            )}

            <div className="w-full text-center px-4 flex flex-col items-center mt-4">
              <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground">{modalIndex + 1} / {images.length}</span>
                <button
                  className="ml-2 px-2 py-1 rounded bg-muted text-xs hover:bg-muted/80 border border-border"
                  onClick={() => {
                    const a = document.createElement("a")
                    a.href = modalImage.image_url
                    a.download = `image_${modalImage.id}.jpg`
                    a.click()
                  }}
                >
                  Download
                </button>
              </div>
              {showPrompts && <p className="text-lg font-semibold mb-2 text-foreground break-words">{modalImage.prompt}</p>}
              {modalImage.character_name && <p className="text-sm text-primary font-medium mb-1">{modalImage.character_name}</p>}
              <p className="text-xs text-muted-foreground mb-4">{new Date(modalImage.created_at).toLocaleString()}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-2 px-4 pb-4">
              <Button variant="destructive" className="w-full sm:w-1/2" onClick={() => { handleDelete(modalImage.id); setModalOpen(false) }}>Delete</Button>
              <Button variant="secondary" className="w-full sm:w-1/2" onClick={() => setModalOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
