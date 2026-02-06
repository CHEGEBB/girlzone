"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"

interface Character {
  id: string
  name: string
  image: string
  age: number
  ethnicity: string
  personality: string
  occupation: string
  hobbies: string
  relationship: string
  body: string
}

interface Model {
  id: string
  name: string
  description: string
  category: string
  token_cost: number
  is_premium: boolean
  features: any
  is_purchased: boolean
  image: string
  character?: Character | null
  character_id?: string
}

interface UserModelsDisplayProps {
  className?: string
  showOnlyPurchased?: boolean
  limit?: number
}

function ModelCard({ model }: { model: Model }) {
  const character = model.character

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border border-border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold mb-1">{character?.name || model.name}</h3>
          <div className="mt-2">
            <Badge variant="secondary" className="bg-green-500/90 backdrop-blur-sm text-white text-xs">
              Owned
            </Badge>
          </div>
        </div>

        {model.is_premium && (
          <div className="bg-[#1111FF]/90 backdrop-blur-sm rounded-full p-1.5">
            <Star className="h-3 w-3 text-white" fill="currentColor" />
          </div>
        )}
      </div>
    </Card>
  )
}

export function UserModelsDisplay({
  className = "",
  showOnlyPurchased = true,
  limit
}: UserModelsDisplayProps) {
  const router = useRouter()
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("/api/models")
        const data = await response.json()

        if (data.success) {
          let filteredModels = data.models

          if (showOnlyPurchased) {
            filteredModels = data.models.filter((model: Model) => model.is_purchased)
          }

          if (limit) {
            filteredModels = filteredModels.slice(0, limit)
          }

          setModels(filteredModels)
        }
      } catch (error) {
        console.error("Error fetching models:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchModels()
  }, [showOnlyPurchased, limit])

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-muted-foreground">
          {showOnlyPurchased ? "You haven't purchased any models yet." : "No models available."}
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold">
        Your Models
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>
    </div>
  )
}
