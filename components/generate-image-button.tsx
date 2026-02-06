"use client"

import { Button } from "@/components/ui/button"
import { ImageIcon } from "lucide-react"
import Link from "next/link"

interface GenerateImageButtonProps {
  character: {
    id: string
    name: string
    image: string
    age: number
    body: string
    ethnicity: string
    relationship: string
    personality: string
  }
}

export function GenerateImageButton({ character }: GenerateImageButtonProps) {
  return (
    <Button variant="outline" asChild className="w-full min-h-[48px] touch-manipulation">
      <Link href={`/generate-character/${character.id}`} className="flex items-center justify-center">
        <ImageIcon className="mr-1.5 sm:mr-2 h-4 w-4 flex-shrink-0" />
        <span className="text-sm sm:text-base truncate">Generate</span>
      </Link>
    </Button>
  )
}
