"use client"

import { useIsMobile } from "@/hooks/use-mobile"

export function CharacterCardSkeleton() {
  const isMobile = useIsMobile()
  
  return (
    <div
      className={`relative overflow-hidden ${isMobile ? 'rounded-2xl' : 'rounded-3xl'} aspect-[3/4] animate-pulse bg-muted`}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10"></div>

      {/* Character Info Skeleton */}
      <div className={`absolute bottom-0 left-0 right-0 ${isMobile ? 'p-2' : 'p-3'} z-20`}>
        <div className="flex items-baseline gap-1.5">
          <div className={`${isMobile ? 'h-4 w-20' : 'h-5 w-24'} bg-white/20 rounded`}></div>
          <div className={`${isMobile ? 'h-3 w-8' : 'h-4 w-10'} bg-white/20 rounded`}></div>
        </div>
        <div className={`${isMobile ? 'h-3 w-full mt-1' : 'h-3 w-full mt-1.5'} bg-white/20 rounded`}></div>
        <div className={`${isMobile ? 'h-3 w-3/4 mt-0.5' : 'h-3 w-3/4 mt-1'} bg-white/20 rounded`}></div>
      </div>
    </div>
  )
}

export function CharacterGridSkeleton({ count = 16 }: { count?: number }) {
  const isMobile = useIsMobile()
  
  return (
    <div className={`grid ${isMobile ? 'grid-cols-2 gap-3 px-4' : 'grid-cols-2 gap-4 px-4 md:px-6 lg:px-8 md:gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} ${isMobile ? 'max-w-full' : 'max-w-7xl'} mx-auto ${isMobile ? 'mt-3' : 'mt-4'}`}>
      {Array.from({ length: count }).map((_, i) => (
        <CharacterCardSkeleton key={i} />
      ))}
    </div>
  )
}
