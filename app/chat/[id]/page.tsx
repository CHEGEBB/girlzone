import { createClient } from "@/lib/supabase-server"
import ChatClient from "./chat-client"
import { getChatHistory, getRecentChats } from "@/lib/chat-actions"
import { redirect } from "next/navigation"
import { checkPremiumStatus } from "@/lib/premium"

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const characterId = resolvedParams.id
  const supabase = createClient()

  // Get current user
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect("/login")
  }

  const userId = session.user.id

  // Fetch character details
  const { data: characterData, error: characterError } = await supabase
    .from("characters")
    .select("*")
    .eq("id", characterId)
    .single()

  if (characterError || !characterData) {
    console.error("Error fetching character:", characterError)
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Character Not Found</h1>
          <p className="text-muted-foreground">The character you are looking for does not exist or you don't have permission to view it.</p>
        </div>
      </div>
    )
  }

  // Helper function to convert snake_case to camelCase
  const snakeToCamel = (obj: any): any => {
    if (obj === null || typeof obj !== "object") {
      return obj
    }
    if (Array.isArray(obj)) {
      return obj.map(snakeToCamel)
    }
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      acc[camelKey] = snakeToCamel(obj[key])
      return acc
    }, {} as any)
  }

  const character = snakeToCamel(characterData)

  // Fetch initial messages and recent chats in parallel for speed
  const [initialMessages, initialRecentChats] = await Promise.all([
    getChatHistory(userId, characterId),
    getRecentChats(userId)
  ])

  // Check premium status using the robust logic
  const { isPremium } = await checkPremiumStatus(userId, supabase)

  return (
    <ChatClient
      characterId={characterId}
      initialCharacter={character}
      initialMessages={initialMessages}
      initialRecentChats={initialRecentChats}
      userId={userId}
      isPremium={isPremium}
    />
  )
}
