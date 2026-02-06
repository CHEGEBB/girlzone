"use client"

import { Skeleton } from "@/components/ui/skeleton"

interface GallerySkeletonProps {
  count?: number;
  className?: string;
}

export function GallerySkeleton({ count = 6, className }: GallerySkeletonProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted/30 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfileDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-4 w-96 bg-muted/50 rounded animate-pulse" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
              <div className="h-8 w-24 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-1 bg-muted/20 p-1 rounded-lg w-full md:w-64">
          <div className="h-8 flex-1 bg-muted rounded animate-pulse" />
          <div className="h-8 flex-1 bg-muted/50 rounded animate-pulse" />
        </div>
        <div className="border rounded-xl p-6 h-64 bg-muted/5 animate-pulse" />
      </div>
    </div>
  )
}

export function AppShellSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="p-6">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex-1 px-4 space-y-4 py-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2">
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b bg-card flex items-center justify-between px-6">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AffiliateDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="h-10 w-64 bg-muted rounded animate-pulse" />
          <div className="h-5 w-96 bg-muted/50 rounded animate-pulse" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-6 space-y-2">
              <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 bg-muted rounded animate-pulse" />
                <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Referral Code Card */}
        <div className="border rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-full max-w-md bg-muted/50 rounded animate-pulse" />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-muted/50 rounded-full animate-pulse" />
            <div className="h-6 w-24 bg-muted/50 rounded-full animate-pulse" />
            <div className="h-6 w-24 bg-muted/50 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-4">
          <div className="flex gap-1 border-b">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-24 bg-muted/30 rounded-t animate-pulse" />
            ))}
          </div>
          <div className="border rounded-xl p-6 h-64 bg-muted/5 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full overflow-auto">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border pb-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div 
              key={`header-${i}`} 
              className="h-4 bg-muted/50 rounded animate-pulse"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
        
        {/* Rows */}
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex items-center gap-4 py-4 border-b border-border/50">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div 
                key={`cell-${rowIndex}-${colIndex}`} 
                className="h-4 bg-muted/30 rounded animate-pulse"
                style={{ width: `${Math.random() * 40 + 40}%` }} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChatListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-muted/50 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
