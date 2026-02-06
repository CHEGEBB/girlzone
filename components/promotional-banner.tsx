"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBanners } from "@/components/banner-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { useAuth } from "@/components/auth-context"
import { useAuthModal } from "@/components/auth-modal-context"

export default function PromotionalBanner() {
  const { banners, isLoading } = useBanners()
  const [currentIndex, setCurrentIndex] = useState(0)
  const router = useRouter()
  const { user } = useAuth()
  const { openLoginModal } = useAuthModal()
  const isMobile = useIsMobile()

  // Only show active banners
  const activeBanners = banners.filter((banner) => banner.isActive)

  // Function to navigate to the next banner
  const nextBanner = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % activeBanners.length)
  }

  // Function to navigate to the previous banner
  const prevBanner = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + activeBanners.length) % activeBanners.length)
  }

  // Auto-rotate banners every 5 seconds
  useEffect(() => {
    if (activeBanners.length <= 1) return

    const interval = setInterval(() => {
      nextBanner()
    }, 5000)

    return () => clearInterval(interval)
  }, [activeBanners.length])

  // If loading or no banners, don't render anything
  if (isLoading || activeBanners.length === 0) return null

  const currentBanner = activeBanners[currentIndex]

  // Handle banner click (instead of using Link)
  const handleBannerClick = () => {
    if (!user) {
      openLoginModal()
      return
    }
    if (currentBanner.linkUrl) {
      router.push(currentBanner.linkUrl)
    }
  }

  return (
    <div className={`w-full ${isMobile ? 'max-w-full px-4' : 'max-w-[1222px]'} mx-auto ${isMobile ? 'mb-6' : 'mb-8'} overflow-hidden rounded-xl border border-border`}>
      <div className={`relative ${isMobile ? 'h-auto' : 'h-[244px]'}`}>
        {/* Clickable Banner Area */}
        <div
          className={`${isMobile ? 'relative' : 'absolute inset-0'} z-10 ${currentBanner.linkUrl ? "cursor-pointer" : "cursor-default"}`}
          onClick={handleBannerClick}
        >
          {/* Banner Image */}
          <div className={`${isMobile ? 'relative' : 'absolute inset-0'}`}>
            <img
              src={currentBanner.imageUrl || "/placeholder.svg"}
              alt={currentBanner.title}
              className={`w-full ${isMobile ? 'h-auto' : 'h-full object-cover'}`}
            />
          </div>

          {/* Banner Content Overlay */}
          {(currentBanner.title || currentBanner.subtitle) && (
            <div className={`absolute inset-0 flex flex-col justify-center ${isMobile ? 'px-6' : 'px-12'} rounded-[22px]`}>
              {currentBanner.title && (
                <h2 className={`${isMobile ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'} font-bold text-white drop-shadow-lg ${isMobile ? 'mb-1' : 'mb-2'}`}>{currentBanner.title}</h2>
              )}
              {currentBanner.subtitle && (
                <p className={`${isMobile ? 'text-sm md:text-base' : 'text-lg md:text-xl'} text-white drop-shadow-lg`}>{currentBanner.subtitle}</p>
              )}
            </div>
          )}
        </div>

        {/* Banner Button - Optional */}
        {currentBanner.buttonText && currentBanner.buttonLink && (
          <div className={`absolute ${isMobile ? 'bottom-6 right-6' : 'bottom-8 right-8'} z-20`}>
            <Button
              className={`bg-primary hover:bg-primary/90 text-white font-bold ${isMobile ? 'py-1.5 px-4 text-sm' : 'py-2 px-6'} rounded-full`}
              onClick={(e) => {
                e.stopPropagation() // Prevent triggering the banner click
                if (!user) {
                  openLoginModal()
                  return
                }
                router.push(currentBanner.buttonLink)
              }}
            >
              {currentBanner.buttonText}
            </Button>
          </div>
        )}

        {/* Navigation Arrows - Only show if there are multiple banners */}
        {activeBanners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                prevBanner()
              }}
              className={`absolute ${isMobile ? 'left-2 top-1/2 -translate-y-1/2' : 'left-4 top-1/2 -translate-y-1/2'} bg-black/30 hover:bg-black/50 text-white ${isMobile ? 'p-1.5' : 'p-2'} rounded-full z-20`}
              aria-label="Previous banner"
            >
              <ChevronLeft className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                nextBanner()
              }}
              className={`absolute ${isMobile ? 'right-2 top-1/2 -translate-y-1/2' : 'right-4 top-1/2 -translate-y-1/2'} bg-black/30 hover:bg-black/50 text-white ${isMobile ? 'p-1.5' : 'p-2'} rounded-full z-20`}
              aria-label="Next banner"
            >
              <ChevronRight className={`${isMobile ? 'h-4 w-4' : 'h-6 w-6'}`} />
            </button>
          </>
        )}

        {/* Indicator Dots - Only show if there are multiple banners */}
        {activeBanners.length > 1 && (
          <div className={`absolute ${isMobile ? 'bottom-3' : 'bottom-4'} left-0 right-0 flex justify-center gap-2 z-20`}>
            {activeBanners.map((_, index) => (
              <div
                key={index}
                className={`${isMobile ? 'h-1.5' : 'h-2'} ${index === currentIndex ? `${isMobile ? 'w-6' : 'w-8'} bg-primary` : `${isMobile ? 'w-1.5' : 'w-2'} bg-white/50`} rounded-full transition-all duration-300 cursor-pointer`}
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrentIndex(index)
                }}
              ></div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
