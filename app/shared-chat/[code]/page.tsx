"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, MessageSquare, Clock } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-context"

interface SharedChatData {
  character: {
    id: string
    name: string
    image: string
    description: string
    age: string
    occupation: string
  }
  includeHistory: boolean
  chatData: Array<{
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: string
  }> | null
  affiliateCode: string | null
}

export default function SharedChatPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = React.use(params)
  const { code } = resolvedParams
  const router = useRouter()
  const { user } = useAuth()
  const [sharedChat, setSharedChat] = useState<SharedChatData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSharedChat() {
      try {
        const response = await fetch(`/api/shared-chat/${code}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to load shared chat")
        }

        setSharedChat({
          character: data.character,
          includeHistory: data.includeHistory,
          chatData: data.chatData,
          affiliateCode: data.affiliateCode,
        })

        // Track affiliate code if present
        if (data.affiliateCode) {
          // 1. Set the cookie so registration flow picks it up
          // Set cookie to match middleware (30 days)
          const maxAge = 60 * 60 * 24 * 30
          document.cookie = `affiliate_ref=${data.affiliateCode}; path=/; max-age=${maxAge}`

          // 2. Track the referral click/view in the database
          // We use track-referral instead of affiliate/track as that's the active endpoint
          try {
            fetch('/api/track-referral', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                referral_code: data.affiliateCode
              })
            }).catch(err => console.error('Error tracking referral:', err))
          } catch (e) {
            console.error('Error initiating referral tracking:', e)
          }
        }
      } catch (err) {
        console.error("Error fetching shared chat:", err)
        setError(err instanceof Error ? err.message : "Failed to load shared chat")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSharedChat()
  }, [code])

  const handleStartChat = () => {
    if (sharedChat?.character?.id) {
      router.push(`/chat/${sharedChat.character.id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading shared chat...</p>
        </div>
      </div>
    )
  }

  if (error || !sharedChat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl mb-4">😕</div>
              <h2 className="text-2xl font-bold mb-2">Chat Not Found</h2>
              <p className="text-muted-foreground mb-6">
                {error || "This shared chat link is invalid or has been deactivated."}
              </p>
              <Button onClick={() => router.push("/")} variant="outline">
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { character, includeHistory, chatData } = sharedChat

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              <span className="text-foreground">Girlzone</span>
              <span className="text-primary">.ai</span>
            </span>
          </Link>
          {!user && (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => router.push("/login")}>
                Log In
              </Button>
              <Button onClick={() => router.push("/login")}>
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Character Card */}


        {/* Chat History */}
        {includeHistory && chatData && chatData.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Shared Conversation</h2>
              <div className="space-y-4">
                {chatData.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-3 ${message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                        }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border text-center">
                <p className="text-muted-foreground mb-4">
                  Want to continue this conversation?
                </p>
                <Button onClick={handleStartChat} size="lg">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Start Your Own Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Affiliate Info Banner */}
        {sharedChat.affiliateCode && (
          <Card className="mt-6 bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                💰 Love what you see? Share your own chats and earn <span className="font-bold text-primary">50% commission</span> on referrals!
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
