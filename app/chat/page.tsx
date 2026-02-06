"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Separator } from "@/components/ui/separator"
import { ClientChatList } from "@/components/client-chat-list"
import { CharacterGrid } from "@/components/character-grid"
import { useLanguage } from "@/components/language-context"

export default function ChatPage() {
  const { t } = useLanguage()
  const [characters, setCharacters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadCharacters()
  }, [])

  async function loadCharacters() {
    try {
      const { data } = await supabase
        .from("characters")
        .select("*")
        .is("user_id", null)
        .order("created_at", { ascending: false })
      
      setCharacters(data || [])
    } catch (error) {
      console.error("Error loading characters:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('pages.chat.title')}</h1>
            <p className="text-muted-foreground">{t('pages.chat.description')}</p>
          </div>
        </div>

        <ClientChatList />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t('pages.chat.allCharacters')}</h2>
            <Link href="/characters" className="flex items-center text-sm">
              {t('pages.chat.viewAll')}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          <Separator />
          <Suspense fallback={<div>{t('pages.chat.loadingCharacters')}</div>}>
            {loading ? <div>{t('pages.chat.loadingCharacters')}</div> : <CharacterGrid characters={characters} />}
          </Suspense>
        </div>
      </div>
    </div>
  )
}
