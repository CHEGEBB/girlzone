"use client"

import React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreditCard, Coins } from "lucide-react"
import { useRouter } from "next/navigation"

interface InsufficientTokensDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
  requiredTokens: number
}

export function InsufficientTokensDialog({
  open,
  onOpenChange,
  currentBalance,
  requiredTokens,
}: InsufficientTokensDialogProps) {
  const router = useRouter()

  const handlePurchaseTokens = () => {
    onOpenChange(false)
    router.push("/premium")
  }

  const handleGoToProfile = () => {
    onOpenChange(false)
    router.push("/profile")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogContent className="sm:max-w-md bg-background/95 border-border/50 shadow-2xl backdrop-blur-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                <Coins className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle>Insufficient Tokens</DialogTitle>
            </div>
            <DialogDescription className="text-left text-xs sm:text-sm">
              You don't have enough tokens to perform this action.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 sm:p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium">Current Balance:</span>
                <span className="text-xs sm:text-sm font-mono">{currentBalance} tokens</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-medium">Required:</span>
                <span className="text-xs sm:text-sm font-mono">{requiredTokens} tokens</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400">Shortfall:</span>
                <span className="text-xs sm:text-sm font-mono text-red-600 dark:text-red-400">
                  {requiredTokens - currentBalance} tokens
                </span>
              </div>
            </div>
            
            <div className="text-xs sm:text-sm text-muted-foreground">
              Purchase more tokens to continue using AI features and generate content.
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handleGoToProfile}
              className="w-full sm:w-auto min-h-[44px]"
            >
              View Profile
            </Button>
            <Button
              onClick={handlePurchaseTokens}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 min-h-[44px]"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Purchase Tokens
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
