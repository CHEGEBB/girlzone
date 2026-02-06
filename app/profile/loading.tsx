"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"

export default function ProfileLoading() {
  const isMobile = useIsMobile()
  
  return (
    <div className={`container ${isMobile ? 'max-w-full px-4' : 'max-w-6xl'} py-8`}>
      <div className={`space-y-8 ${isMobile ? 'px-2' : ''}`}>
        {/* Header skeleton */}
        <div className={`flex flex-col ${isMobile ? 'gap-4' : 'md:flex-row gap-6'} items-start ${isMobile ? '' : 'md:items-center'} justify-between`}>
          <div className="space-y-2">
            <Skeleton className={`${isMobile ? 'h-6 w-40' : 'h-8 w-48'}`} />
            <Skeleton className={`${isMobile ? 'h-3 w-48' : 'h-4 w-64'}`} />
          </div>
          <Skeleton className={`${isMobile ? 'h-8 w-full' : 'h-10 w-32'}`} />
        </div>

        {/* Token balance card skeleton */}
        <Skeleton className={`${isMobile ? 'h-24' : 'h-32'} rounded-lg`} />

        {/* Tabs skeleton */}
        <div className="space-y-4">
          <div className={`flex gap-4 border-b ${isMobile ? 'grid grid-cols-2 gap-2' : ''}`}>
            <Skeleton className={`${isMobile ? 'h-8 w-full' : 'h-10 w-24'}`} />
            <Skeleton className={`${isMobile ? 'h-8 w-full' : 'h-10 w-24'}`} />
            <Skeleton className={`${isMobile ? 'h-8 w-full' : 'h-10 w-24'}`} />
            <Skeleton className={`${isMobile ? 'h-8 w-full' : 'h-10 w-24'}`} />
          </div>

          {/* Table skeleton */}
          <div className="space-y-2">
            <Skeleton className={`${isMobile ? 'h-8' : 'h-12'} w-full`} />
            <Skeleton className={`${isMobile ? 'h-8' : 'h-12'} w-full`} />
            <Skeleton className={`${isMobile ? 'h-8' : 'h-12'} w-full`} />
            <Skeleton className={`${isMobile ? 'h-8' : 'h-12'} w-full`} />
            <Skeleton className={`${isMobile ? 'h-8' : 'h-12'} w-full`} />
          </div>
        </div>
      </div>
    </div>
  )
}
