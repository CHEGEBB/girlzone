"use client"

import { AppShellSkeleton } from "@/components/skeletons"

export function SiteLoader() {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <AppShellSkeleton />
    </div>
  )
}
