import { createClient } from "@/lib/supabase-server"
import { getRecentChats } from "@/lib/chat-actions"
import { ChatSidebar } from "@/components/chat-sidebar"
import { redirect } from "next/navigation"

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect("/login")
  }

  const { data: characters } = await supabase.from("characters").select("*")
  const recentChats = await getRecentChats(session.user.id)
  
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

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background">
      <ChatSidebar characters={snakeToCamel(characters || [])} recentChats={recentChats} />
      <div className="flex-1 min-w-0 h-full">
        {children}
      </div>
    </div>
  )
}
