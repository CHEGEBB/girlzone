"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { EditCharacterModal } from "@/components/edit-character-modal"
import { Edit } from "lucide-react"

interface EditCharacterButtonProps {
  character: {
    id: string
    name: string
    age: number
    image: string
    description: string
    personality: string
    occupation: string
    hobbies: string
    body: string
    ethnicity: string
    relationship: string
    system_prompt: string
  }
}

export function EditCharacterButton({ character }: EditCharacterButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCharacterUpdated = (updatedCharacter: any) => {
    // Refresh the page to show the updated character
    window.location.reload()
  }

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsModalOpen(true)}
        className="w-full min-h-[48px] touch-manipulation"
      >
        <Edit className="mr-1.5 sm:mr-2 h-4 w-4 flex-shrink-0" />
        <span className="text-sm sm:text-base truncate">Edit</span>
      </Button>
      
      <EditCharacterModal
        character={character}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCharacterUpdated={handleCharacterUpdated}
      />
    </>
  )
}
