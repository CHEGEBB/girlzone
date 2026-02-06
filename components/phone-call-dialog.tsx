"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Phone, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"
import { useAuth } from "@/components/auth-context"
import { InsufficientTokensDialog } from "@/components/insufficient-tokens-dialog"

type PhoneCallDialogProps = {
  character:
    | {
        id: string
        name: string
        image: string
        systemPrompt?: string
        gender?: string
        characterType?: string
      }
    | null
    | undefined
}

export function PhoneCallDialog({ character }: PhoneCallDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showInsufficientTokens, setShowInsufficientTokens] = useState(false)
  const [tokenBalanceInfo, setTokenBalanceInfo] = useState({
    currentBalance: 0,
    requiredTokens: 3
  })
  const { toast } = useToast()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a valid phone number",
        variant: "destructive",
      })
      return
    }

    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to make phone calls",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          userId: user.id,
          characterId: character?.id,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle insufficient tokens
        if (result.insufficientTokens) {
          setShowInsufficientTokens(true)
          setTokenBalanceInfo({
            currentBalance: result.currentBalance || 0,
            requiredTokens: result.requiredTokens || 3
          })
          return
        }
        
        throw new Error(result.error || "Failed to initiate call")
      }

      toast({
        title: "Call initiated!",
        description: `${character?.name || "AI"} will call you shortly at ${phoneNumber}. Cost: ${result.tokensDeducted} tokens`,
      })
      
      // Close dialog on success
      setIsOpen(false)
    } catch (error) {
      console.error("Error initiating call:", error)
      const errorMsg = error instanceof Error ? error.message : "Failed to initiate call"

      toast({
        title: "Call failed",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          title="Call this character"
        >
          <Phone className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Calling {character?.name || "AI Character"}...</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-4 sm:py-6">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 sm:mb-4">
            <Image
              src={character?.image || "/placeholder.svg"}
              alt={character?.name || "Character"}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-base sm:text-lg font-medium">{character?.name || "AI Character"}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">Calling...</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-xs sm:text-sm font-medium">
              Enter your phone number
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-muted-foreground">Enter your phone number with country code (e.g., +1 for US)</p>
          </div>

          <Button type="submit" className="w-full min-h-[44px]" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initiating call...
              </>
            ) : (
              "Call me"
            )}
          </Button>
        </form>
      </DialogContent>
      
      <InsufficientTokensDialog
        open={showInsufficientTokens}
        onOpenChange={setShowInsufficientTokens}
        currentBalance={tokenBalanceInfo.currentBalance}
        requiredTokens={tokenBalanceInfo.requiredTokens}
      />
    </Dialog>
  )
}
