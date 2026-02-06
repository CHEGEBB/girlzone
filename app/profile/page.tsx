"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProfileDashboard } from "@/components/profile-dashboard"
import { useAuth } from "@/components/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"
import { ProfileDashboardSkeleton } from "@/components/skeletons"

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push("/login?redirect=/profile")
    }
  }, [mounted, isLoading, user, router])

  if (!mounted || isLoading) {
    return (
      <div className={`container ${isMobile ? 'max-w-full px-4' : 'max-w-6xl'} py-8`}>
        <ProfileDashboardSkeleton />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className={`container ${isMobile ? 'max-w-full px-4' : 'max-w-6xl'} py-8`}>
      <div className={`mb-4 ${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>User ID: <span className="font-mono break-all">{user.id}</span></div>
      <ProfileDashboard userId={user.id} />
    </div>
  )
}
