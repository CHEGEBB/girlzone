"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImageIcon, Download, Heart, Calendar, X, Maximize2 } from "lucide-react"
import Image from "next/image"
import { GallerySkeleton } from "@/components/skeletons"

interface GeneratedImage {
  id: string
  image_url: string
  prompt: string
  created_at: string
  favorite?: boolean
  character_id?: string
}

interface CharacterGalleryProps {
  characterId: string
}

export function CharacterGallery({ characterId }: CharacterGalleryProps) {
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null)

  useEffect(() => {
    loadImages()
  }, [characterId])

  const loadImages = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/character-images/${characterId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load images')
      }

      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error('Error loading images:', error)
      setError('Failed to load images')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `character-image-${Date.now()}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading image:', error)
    }
  }

  const toggleFavorite = async (imageId: string, currentFavorite: boolean) => {
    try {
      const response = await fetch(`/api/generated-images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: !currentFavorite }),
      })

      if (response.ok) {
        setImages(images.map(img => 
          img.id === imageId ? { ...img, favorite: !currentFavorite } : img
        ))
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 sm:gap-3">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Character Gallery</h2>
        </div>
        <GallerySkeleton count={6} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadImages} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Images Yet</h3>
        <p className="text-muted-foreground mb-4">
          Generate some images for this character to see them here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 sm:gap-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Character Gallery</h2>
        <Badge variant="secondary" className="w-fit px-3 py-1.5 text-xs sm:text-sm">
          {images.length} image{images.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-border/50 hover:border-border">
            <CardContent className="p-0">
              <div 
                className="relative aspect-square bg-muted"
                onClick={() => setSelectedImage(image)}
              >
                <Image
                  src={image.image_url}
                  alt={image.prompt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Maximize2 className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg" />
                </div>
                <div className="absolute top-2 right-2 flex gap-1.5 sm:gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 w-9 sm:h-10 sm:w-10 p-0 touch-manipulation backdrop-blur-sm bg-white/90 hover:bg-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(image.id, image.favorite || false)
                    }}
                  >
                    <Heart 
                      className={`h-4 w-4 sm:h-4.5 sm:w-4.5 ${
                        image.favorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                      }`} 
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 w-9 sm:h-10 sm:w-10 p-0 touch-manipulation backdrop-blur-sm bg-white/90 hover:bg-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(image.image_url, image.prompt)
                    }}
                  >
                    <Download className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <div className="p-3 sm:p-4 bg-card">
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
                  {image.prompt}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>{formatDate(image.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-5xl max-h-[95vh] w-full animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 sm:top-2 sm:right-2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white h-10 w-10 sm:h-12 sm:w-12 touch-manipulation rounded-full border border-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            
            <div className="relative aspect-square max-h-[70vh] sm:max-h-[75vh] rounded-lg sm:rounded-xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
              <Image
                src={selectedImage.image_url}
                alt={selectedImage.prompt}
                fill
                className="object-contain"
                priority
              />
            </div>
            
            <div className="mt-3 sm:mt-4 bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 max-h-[20vh] sm:max-h-[15vh] overflow-y-auto border border-white/20 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">Generated Image</h3>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 sm:flex-initial min-h-[48px] sm:min-h-[44px] touch-manipulation font-medium shadow-lg"
                    onClick={() => toggleFavorite(selectedImage.id, selectedImage.favorite || false)}
                  >
                    <Heart 
                      className={`h-4 w-4 mr-2 flex-shrink-0 ${
                        selectedImage.favorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                      }`} 
                    />
                    <span className="text-xs sm:text-sm">{selectedImage.favorite ? 'Unfavorite' : 'Favorite'}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 sm:flex-initial min-h-[48px] sm:min-h-[44px] touch-manipulation font-medium shadow-lg"
                    onClick={() => handleDownload(selectedImage.image_url, selectedImage.prompt)}
                  >
                    <Download className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">Download</span>
                  </Button>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-white/90 mb-2 line-clamp-2 leading-relaxed">{selectedImage.prompt}</p>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>{formatDate(selectedImage.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
