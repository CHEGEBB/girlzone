"use client"

import { AppShellSkeleton } from "@/components/skeletons"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <AppShellSkeleton />
    </div>
  )
}
