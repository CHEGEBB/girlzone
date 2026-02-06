"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface DeleteCharacterButtonProps {
  characterId: string
  characterName: string
}

export function DeleteCharacterButton({ characterId, characterName }: DeleteCharacterButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)

      const response = await fetch("/api/delete-character", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          characterId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete character")
      }

      toast.success(`${characterName} has been deleted successfully`)
      router.push("/my-ai")
      router.refresh()
    } catch (error) {
      console.error("Error deleting character:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete character")
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          className="text-red-600 hover:text-red-700 w-full min-h-[48px] touch-manipulation"
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="mr-1.5 sm:mr-2 h-4 w-4 animate-spin flex-shrink-0" />
          ) : (
            <Trash2 className="mr-1.5 sm:mr-2 h-4 w-4 flex-shrink-0" />
          )}
          <span className="text-sm sm:text-base truncate">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{characterName}</strong> and all associated data. 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Character"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
