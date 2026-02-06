import { Suspense } from "react"
import { notFound } from "next/navigation"
import { StorageService } from "@/lib/storage-service"
import { createClient } from "@/lib/supabase-server"
import CharacterDetailClient from "./CharacterDetailClient"

interface CharacterDetailPageProps {
  params: Promise<{
    id: string
  }>
}

async function CharacterContent({ id }: { id: string }) {
  try {
    const character = await StorageService.getCharacter(id)

    // Check if current user owns this character
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const currentUserId = session?.user?.id
    const isOwner = currentUserId && character.user_id === currentUserId

    return (
      <CharacterDetailClient character={character} id={id} isOwner={!!isOwner} />
    )
  } catch (error) {
    console.error("Error loading character:", error)
    notFound()
  }
}

export default async function CharacterDetailPage({ params }: CharacterDetailPageProps) {
  const resolvedParams = await params

  return (
    <div className="container px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 max-w-7xl mx-auto">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">Loading character...</p>
          </div>
        }
      >
        <CharacterContent id={resolvedParams.id} />
      </Suspense>
    </div>
  )
}
