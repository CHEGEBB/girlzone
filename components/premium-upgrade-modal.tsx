"use client"

import React from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Crown } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface PremiumUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  feature: string
  description: string
  imageSrc?: string
}

export function PremiumUpgradeModal({ 
  isOpen, 
  onClose, 
  feature,
  description,
  imageSrc = "/placeholder.svg"
}: PremiumUpgradeModalProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    onClose()
    router.push("/premium?tab=subscriptions")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-background border-border overflow-hidden max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 sm:right-4 sm:top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4 text-muted-foreground" />
          <span className="sr-only">Close</span>
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left side - Image */}
          <div className="md:w-2/5 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center p-4 sm:p-8 min-h-[200px]">
            <div className="relative w-full max-w-[200px] sm:max-w-[280px] aspect-[3/4] rounded-2xl overflow-hidden">
              <Image
                src={imageSrc}
                alt="Premium Feature"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          </div>

          {/* Right side - Content */}
          <div className="md:w-3/5 p-4 sm:p-6 md:p-8 flex flex-col">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                Upgrade to Unlock
              </h2>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-primary mb-3 sm:mb-4">
                {feature}
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                This feature is available exclusively for our Premium Users.
              </p>

              <p className="text-xs sm:text-sm font-medium mb-4 sm:mb-6">
                {description}
              </p>

              {/* Audio waveform visualization */}
              {feature.toLowerCase().includes("voice") && (
                <div className="flex items-center justify-center gap-1 mb-4 sm:mb-6 py-3 sm:py-4">
                  {[...Array(15)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-full transition-all duration-300"
                      style={{
                        height: `${Math.random() * 40 + 10}px`,
                        animation: `pulse ${Math.random() * 0.5 + 0.5}s ease-in-out infinite`,
                        animationDelay: `${i * 0.1}s`
                      }}
                    />
                  ))}
                </div>
              )}

              {feature.toLowerCase().includes("image") && (
                <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6 py-3 sm:py-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-primary">4</span>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-primary">6</span>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-primary">8</span>
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={handleUpgrade}
              className="w-full py-4 sm:py-6 text-sm sm:text-base font-semibold min-h-[44px]"
              size="lg"
            >
              <Crown className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              Upgrade to Premium
            </Button>
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% {
              opacity: 0.4;
            }
            50% {
              opacity: 1;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}
