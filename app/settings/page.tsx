"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { UserProfileInfo } from "@/components/user-profile-info"
import { useAuth } from "@/components/auth-context"
import { useIsMobile } from "@/hooks/use-mobile"

export default function SettingsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.push("/login?redirect=/settings")
    }
  }, [mounted, isLoading, user, router])

  if (!mounted || isLoading) {
    return (
      <div className={`container ${isMobile ? 'max-w-full px-4' : 'max-w-6xl'} py-8`}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className={`animate-spin rounded-full ${isMobile ? 'h-8 w-8' : 'h-12 w-12'} border-t-2 border-b-2 border-[#1111FF]`}></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className={`container ${isMobile ? 'max-w-full px-4' : 'max-w-4xl'} py-8`}>
      <div className="space-y-6">
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>Settings</h1>
          <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground mt-2`}>
            Manage your account settings and preferences
          </p>
        </div>

        <UserProfileInfo userId={user.id} />
      </div>
    </div>
  )
}
