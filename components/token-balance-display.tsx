"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-context"
import { Coins } from "lucide-react"

interface TokenBalanceDisplayProps {
  className?: string
  showIcon?: boolean
  iconSize?: number
  textSize?: "xs" | "sm" | "base" | "lg" | "xl"
  refreshInterval?: number | null
}

export function TokenBalanceDisplay({
  className = "",
  showIcon = true,
  iconSize = 16,
  textSize = "sm",
  refreshInterval = 60000, // 1 minute by default, null for no refresh
}: TokenBalanceDisplayProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [monetizationEnabled, setMonetizationEnabled] = useState(true)
  const { user } = useAuth()

  const fetchBalance = async () => {
    if (!user) {
      setBalance(null)
      setIsLoading(false)
      return
    }

    try {
      // Check monetization status first
      const monetizationResponse = await fetch("/api/monetization-status")
      if (monetizationResponse.ok) {
        const monetizationData = await monetizationResponse.json()
        setMonetizationEnabled(monetizationData.monetization_enabled)

        // If monetization is disabled, don't fetch balance
        if (!monetizationData.monetization_enabled) {
          setBalance(null)
          setIsLoading(false)
          return
        }
      }

      const response = await fetch("/api/user-token-balance")

      if (!response.ok) {
        throw new Error("Failed to fetch token balance")
      }

      const data = await response.json()

      if (data.success) {
        setBalance(data.balance)
      } else {
        console.error("Error fetching token balance:", data.error)
        setBalance(null)
      }
    } catch (error) {
      console.error("Error fetching token balance:", error)
      setBalance(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()

    // Set up refresh interval if specified
    let intervalId: NodeJS.Timeout | null = null

    if (refreshInterval && user) {
      intervalId = setInterval(fetchBalance, refreshInterval)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [user, refreshInterval])

  // Text size classes
  const textSizeClass = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
    xl: "text-xl",
  }[textSize]

  if (!user || balance === null || !monetizationEnabled) {
    return null
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showIcon && <Coins size={iconSize} className="text-[#1111FF]" />}
      <span className={`font-medium ${textSizeClass}`}>{isLoading ? "..." : balance}</span>
    </div>
  )
}
