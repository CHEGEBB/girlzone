"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Copy, Check, Share2, Loader2, Facebook, Twitter, Mail } from "lucide-react"
import { Message } from "@/lib/chat-actions"

interface ShareChatModalProps {
  isOpen: boolean
  onClose: () => void
  characterId: string
  characterName: string
  messages: Message[]
}

export function ShareChatModal({
  isOpen,
  onClose,
  characterId,
  characterName,
  messages,
}: ShareChatModalProps) {
  const [includeHistory, setIncludeHistory] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const handleGenerateLink = async () => {
    setIsGenerating(true)
    setError("")

    try {
      const response = await fetch("/api/share-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({
          characterId,
          includeHistory,
          chatData: includeHistory ? messages : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate share link")
      }

      setShareUrl(data.shareUrl)
    } catch (err) {
      console.error("Error generating share link:", err)
      setError(err instanceof Error ? err.message : "Failed to generate share link")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = async () => {
    const copyToClipboardFallback = (text: string) => {
      try {
        const textArea = document.createElement("textarea")
        textArea.value = text
        
        // Ensure textarea is part of DOM but hidden
        textArea.style.position = "fixed"
        textArea.style.opacity = "0"
        textArea.style.pointerEvents = "none"
        textArea.style.left = "0"
        textArea.style.top = "0"
        
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const successful = document.execCommand('copy')
        if (successful) {
          console.log('Fallback: Copy command successful')
          setCopied(true)
        } else {
          console.error('Fallback: Copy command was unsuccessful')
        }
        
        document.body.removeChild(textArea)
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err)
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        console.log('Clipboard API: Copy successful')
      } else {
        console.log('Clipboard API unavailable, using fallback')
        copyToClipboardFallback(shareUrl)
      }
    } catch (err) {
      console.error("Failed to copy using Clipboard API, trying fallback:", err)
      copyToClipboardFallback(shareUrl)
    }
    
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSocialShare = (platform: string) => {
    const text = `Check out my chat with ${characterName}!`
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(text)

    let shareLink = ""

    switch (platform) {
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        break
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`
        break
      case "whatsapp":
        shareLink = `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        break
      case "telegram":
        shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
        break
      case "email":
        shareLink = `mailto:?subject=${encodedText}&body=${encodedText}%0A%0A${encodedUrl}`
        break
    }

    if (shareLink) {
      window.open(shareLink, "_blank", "width=600,height=400")
    }
  }

  const handleClose = () => {
    setShareUrl("")
    setError("")
    setCopied(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this Chat</DialogTitle>
          <DialogDescription>
            Share your conversation with {characterName} with others. They can view and start their own chat!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Include History Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="include-history" className="flex flex-col space-y-1">
              <span>Include chat history</span>
              <span className="font-normal text-xs text-muted-foreground">
                Share your conversation or just the character
              </span>
            </Label>
            <Switch
              id="include-history"
              checked={includeHistory}
              onCheckedChange={setIncludeHistory}
              disabled={!!shareUrl}
            />
          </div>

          {/* Generate Link Button */}
          {!shareUrl && (
            <Button
              onClick={handleGenerateLink}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Generate Shareable Link
                </>
              )}
            </Button>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Share URL Display */}
          {shareUrl && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Affiliate Info */}
              <div className="bg-primary/10 p-3 rounded-lg">
                <p className="text-sm font-medium">💰 Earn 50% commission!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When someone registers and makes a purchase through your link, you'll earn 50% commission on their payment.
                </p>
              </div>

              {/* Social Share Buttons */}
              <div className="space-y-2">
                <Label className="text-sm">Share on social media</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSocialShare("facebook")}
                    className="flex flex-col items-center gap-1 h-auto py-2"
                  >
                    <Facebook className="h-4 w-4" />
                    <span className="text-xs">Facebook</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSocialShare("twitter")}
                    className="flex flex-col items-center gap-1 h-auto py-2"
                  >
                    <Twitter className="h-4 w-4" />
                    <span className="text-xs">Twitter</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSocialShare("whatsapp")}
                    className="flex flex-col items-center gap-1 h-auto py-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="text-xs">WhatsApp</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSocialShare("telegram")}
                    className="flex flex-col items-center gap-1 h-auto py-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="text-xs">Telegram</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSocialShare("email")}
                    className="flex flex-col items-center gap-1 h-auto py-2"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="text-xs">Email</span>
                  </Button>
                </div>
              </div>

              {/* Generate New Link Button */}
              <Button
                variant="outline"
                onClick={() => {
                  setShareUrl("")
                  setError("")
                }}
                className="w-full"
              >
                Generate New Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
