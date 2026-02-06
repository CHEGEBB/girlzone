"use client"

import { useState, useEffect } from "react"

interface Category {
  id: string
  name: string
  display_name: string
  description?: string
  step_order: number
  is_active: boolean
  character_image_options: ImageOption[]
}

interface ImageOption {
  id: string
  category_id: string
  option_key: string
  display_name: string
  image_url: string
  is_active: boolean
  sort_order: number
}

export function useCharacterImages() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchImages = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First try to get cached data from localStorage
      try {
        const cached = localStorage.getItem("characterImages")
        if (cached) {
          const parsedCached = JSON.parse(cached)
          setCategories(parsedCached)
          setLoading(false)
          // Still fetch fresh data in background
        }
      } catch (e) {
        // Ignore localStorage errors
      }
      
      const response = await fetch("/api/character-images")
      if (!response.ok) {
        throw new Error("Failed to fetch character images")
      }
      
      const data = await response.json()
      setCategories(data.categories || [])
      
      // Update localStorage with fresh data
      localStorage.setItem("characterImages", JSON.stringify(data.categories || []))
    } catch (err) {
      console.error("Error fetching character images:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch images")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [])

  const getCategoryImages = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName)
    return category?.character_image_options || []
  }

  const getImageByKey = (categoryName: string, optionKey: string) => {
    const options = getCategoryImages(categoryName)
    return options.find(option => option.option_key === optionKey)
  }

  return {
    categories,
    loading,
    error,
    refetch: fetchImages,
    getCategoryImages,
    getImageByKey
  }
}
