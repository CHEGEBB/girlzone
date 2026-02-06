"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
  placeholder?: string
  className?: string
  aspectRatio?: string
  maxSize?: number // in MB
  acceptedFormats?: string[]
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  placeholder = "Click to upload image",
  className = "",
  aspectRatio = "aspect-square",
  maxSize = 5,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp"]
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please select a file smaller than ${maxSize}MB`,
        variant: "destructive"
      })
      return
    }

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `Please select a ${acceptedFormats.join(", ")} file`,
        variant: "destructive"
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setPreview(result)
    }
    reader.readAsDataURL(file)

    // Upload file
    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)

    try {
      // Convert file to base64 for Cloudinary upload
      const base64 = await convertFileToBase64(file)
      
      const formData = new FormData()
      formData.append("file", base64)
      formData.append("upload_preset", "ai-characters-preset")
      formData.append("folder", "character-creation-images")

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "demo"
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Cloudinary API error: ${errorData.error?.message || "Unknown error"}`)
      }

      const result = await response.json()

      if (!result.secure_url) {
        throw new Error("Failed to upload image to Cloudinary")
      }

      onChange(result.secure_url)
      
      toast({
        title: "Image uploaded",
        description: "The image has been uploaded successfully.",
      })
    } catch (error) {
      console.error("Error uploading image:", error)
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const handleRemove = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onRemove?.()
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label>Image</Label>
      <div
        className={`
          relative border-2 border-dashed border-gray-300 rounded-lg cursor-pointer
          hover:border-gray-400 transition-colors group
          ${aspectRatio}
          ${isUploading ? "opacity-50 pointer-events-none" : ""}
        `}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />

        {preview && preview.trim() !== '' ? (
          <div className="relative w-full h-full">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-2" />
            ) : (
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
            )}
            <p className="text-sm text-gray-500">
              {isUploading ? "Uploading..." : placeholder}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Max {maxSize}MB • {acceptedFormats.join(", ")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
