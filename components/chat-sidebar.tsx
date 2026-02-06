"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSidebar } from "@/components/sidebar-context"
import { useLanguage } from "@/components/language-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { useState } from "react"

interface ChatSidebarProps {
  characters: any[]
  recentChats: any[]
}

export function ChatSidebar({ characters, recentChats }: ChatSidebarProps) {
  const pathname = usePathname()
  const { toggle } = useSidebar()
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  // Extract active ID from pathname
  const characterId = pathname?.split("/").pop()

  // Process recent chats for display
  const chatsWithHistory = recentChats.map((chat: any) => chat.characterId)
  const lastMessages: Record<string, any> = {}
  recentChats.forEach((chat: any) => {
    if (chat.lastMessage) {
      lastMessages[chat.characterId] = {
        content: chat.lastMessage,
        timestamp: new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    }
  })

  const handleImageError = (id: string) => {
    setImageErrors((prev) => ({ ...prev, [id]: true }))
  }

  return (
    <div className={`hidden md:block md:w-72 border-b md:border-b-0 md:border-r border-border flex flex-col md:h-full h-auto ${isMobile ? 'max-h-[30vh]' : 'max-h-[40vh]'} md:max-h-none rounded-2xl`}>
      <div className={`${isMobile ? 'p-3' : 'p-4'} border-b border-border flex items-center justify-between`}>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className={`${isMobile ? 'mr-1' : 'mr-2'} md:hidden`} onClick={toggle}>
            <Menu className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
          </Button>
          <h1 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>{t('pages.chatDetail.title')}</h1>
        </div>
      </div>
      <div className={`${isMobile ? 'p-3' : 'p-4'} border-b border-border`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground`} />
          <Input placeholder={t('pages.chatDetail.searchPlaceholder')} className={`${isMobile ? 'pl-8 text-sm' : 'pl-9'} bg-card border-none`} />
        </div>
      </div>
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'max-h-[calc(100vh-180px)]' : ''} scrollbar-thin scrollbar-thumb-[#252525] scrollbar-track-transparent hover:scrollbar-thumb-[#353535]`}>
        <div className={`${isMobile ? 'p-1' : 'p-2'} space-y-2`}>
          {characters
            .filter((char) => chatsWithHistory.includes(char.id))
            .map((char) => (
              <Link href={`/chat/${char.id}`} key={char.id} className="block">
                <div
                  className={`flex items-center ${isMobile ? 'p-2' : 'p-3'} rounded-xl cursor-pointer ${characterId === char.id ? "bg-[#252525] text-white" : "hover:bg-[#252525] hover:text-white"
                    }`}
                >
                  <div className={`relative ${isMobile ? 'w-8 h-8 mr-2' : 'w-12 h-12 mr-3'}`}>
                    <img
                      src={
                        imageErrors[char.id]
                          ? "/placeholder.svg?height=48&width=48"
                          : char.image || "/placeholder.svg?height=48&width=48"
                      }
                      alt={char.name}
                      className="w-full h-full rounded-full object-cover"
                      onError={() => handleImageError(char.id)}
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className={`${isMobile ? 'text-sm' : 'font-medium'} text-foreground truncate`}>{char.name}</h4>
                      <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
                        {lastMessages[char.id]?.timestamp ?? t('pages.chatDetail.noMessagesYet')}
                      </span>
                    </div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground truncate`}>
                      {lastMessages[char.id]?.content ?? t('pages.chatDetail.noMessagesYet')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          {chatsWithHistory.length === 0 && (
            <div className={`text-center text-muted-foreground ${isMobile ? 'py-2 text-xs' : 'py-4'}`}>{t('pages.chatDetail.noHistory')}</div>
          )}
        </div>
      </div>
    </div>
  )
}
