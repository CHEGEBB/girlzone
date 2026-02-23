"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import supabase from "@/lib/supabase"
import { signIn, signUp, signOut, isAdmin } from "@/lib/auth"

export type User = {
  id: string
  username: string
  email: string
  isAdmin: boolean
  isPremium?: boolean
  createdAt: string
  avatar?: string
}

type AuthContextType = {
  user: User | null
  users: User[]
  login: (email: string, password: string) => Promise<boolean>
  signup: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshSession: () => Promise<boolean>
  isLoading: boolean
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string; needsMigration?: boolean }>
  checkDeleteUserFunction: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Cache admin status to avoid repeated DB calls
const adminCache = new Map<string, { value: boolean; timestamp: number }>()
const ADMIN_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getCachedAdminStatus(userId: string): Promise<boolean> {
  const cached = adminCache.get(userId)
  if (cached && Date.now() - cached.timestamp < ADMIN_CACHE_TTL) {
    return cached.value
  }
  const value = await isAdmin(userId)
  adminCache.set(userId, { value, timestamp: Date.now() })
  return value
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const fetchingUsers = useRef(false)
  const lastFetchTime = useRef(0)
  // Prevent the onAuthStateChange handler from running while loadUser is still in flight
  const initialLoadDone = useRef(false)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      setIsLoading(true)
      try {
        // Single call — getSession() uses the local stored token, no network request needed
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!session || error) {
          if (mounted) {
            setUser(null)
            setIsLoading(false)
            initialLoadDone.current = true
          }
          return
        }

        // Use the user from the session directly — avoids an extra network call
        const supabaseUser = session.user
        const adminStatus = await getCachedAdminStatus(supabaseUser.id)

        if (mounted) {
          setUser({
            id: supabaseUser.id,
            username: supabaseUser.user_metadata?.username || supabaseUser.email?.split("@")[0] || "User",
            email: supabaseUser.email || "",
            isAdmin: adminStatus,
            createdAt: supabaseUser.created_at || new Date().toISOString(),
            avatar: supabaseUser.user_metadata?.avatar_url,
          })
        }
      } catch (error) {
        console.error("Error loading user:", error)
        if (mounted) setUser(null)
      } finally {
        if (mounted) {
          setIsLoading(false)
          initialLoadDone.current = true
        }
      }
    }

    loadUser()

    // onAuthStateChange handles everything AFTER the initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip if initial load hasn't finished yet — loadUser already handles that state
      if (!initialLoadDone.current) return
      // Skip noisy intermediate events
      if (event === 'INITIAL_SESSION') return

      console.log("Auth state change event:", event)

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // TOKEN_REFRESHED fires frequently — don't re-fetch admin status every time
        if (event === 'TOKEN_REFRESHED') {
          // Just update the session-derived fields, keep existing user state
          setUser(prev => prev ? {
            ...prev,
            email: session.user.email || prev.email,
          } : null)
          return
        }

        const adminStatus = await getCachedAdminStatus(session.user.id)
        if (mounted) {
          setUser({
            id: session.user.id,
            username: session.user.user_metadata?.username || session.user.email?.split("@")[0] || "User",
            email: session.user.email || "",
            isAdmin: adminStatus,
            createdAt: session.user.created_at || new Date().toISOString(),
            avatar: session.user.user_metadata?.avatar_url,
          })
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setUser(null)
        localStorage.removeItem("currentUser")
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // ← empty deps — runs once on mount only

  // Load users from database when admin is logged in
  useEffect(() => {
    const debouncedFetchUsers = debounce(async () => {
      if (!user?.isAdmin || fetchingUsers.current) return

      const now = Date.now()
      if (now - lastFetchTime.current < 10000) return

      fetchingUsers.current = true
      lastFetchTime.current = now

      try {
        const { data, error } = await supabase.from("users_view").select("*")

        if (error) {
          console.error("Error fetching users:", error)
          return
        }

        if (data) {
          const dataArray = data as any[]
          const userIds = dataArray.map((u) => u.id)
          const premiumMap = new Map<string, boolean>()

          try {
            const { data: profilesData } = await (supabase
              .from("profiles")
              .select("user_id, is_premium")
              .in("user_id", userIds) as any)

            if (profilesData) {
              (profilesData as any[]).forEach((p) => {
                if (p.is_premium) premiumMap.set(p.user_id, true)
              })
            }

            const nowIso = new Date().toISOString()
            const { data: premiumProfilesData } = await (supabase
              .from("premium_profiles")
              .select("user_id, expires_at")
              .in("user_id", userIds)
              .gt("expires_at", nowIso) as any)

            if (premiumProfilesData) {
              (premiumProfilesData as any[]).forEach((p) => {
                premiumMap.set(p.user_id, true)
              })
            }

            const oneYearAgo = new Date()
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

            const { data: transactionsData } = await (supabase
              .from("payment_transactions")
              .select("user_id, created_at, metadata, plan_name")
              .in("user_id", userIds)
              .eq("status", "completed")
              .gt("created_at", oneYearAgo.toISOString())
              .order("created_at", { ascending: false }) as any)

            if (transactionsData) {
              const now = new Date()
              ;(transactionsData as any[]).forEach((t) => {
                if (premiumMap.get(t.user_id)) return
                const createdAt = new Date(t.created_at)
                const duration = parseInt((t.metadata as any)?.planDuration, 10) || 1
                const expiry = new Date(createdAt)
                expiry.setMonth(expiry.getMonth() + duration)
                if (expiry > now) premiumMap.set(t.user_id, true)
              })
            }

            try {
              const { data: fallbackStatusData } = await (supabase
                .from("user_premium_status")
                .select("user_id, is_premium, expires_at")
                .in("user_id", userIds) as any)

              if (fallbackStatusData) {
                const now = new Date()
                ;(fallbackStatusData as any[]).forEach((p) => {
                  if (p.is_premium && (!p.expires_at || new Date(p.expires_at) > now)) {
                    premiumMap.set(p.user_id, true)
                  }
                })
              }
            } catch {
              // Table may not exist, silently ignore
            }
          } catch (profileError) {
            console.error("Error fetching premium status:", profileError)
          }

          const formattedUsers = dataArray.map((u) => ({
            id: u.id,
            username: u.username || (u.email ? u.email.split("@")[0] : "User"),
            email: u.email || "",
            isAdmin: u.is_admin || false,
            isPremium: premiumMap.get(u.id) || false,
            createdAt: u.created_at,
          }))

          setUsers(formattedUsers)
        }
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        fetchingUsers.current = false
      }
    }, 300)

    if (user?.isAdmin) {
      debouncedFetchUsers()
    }
  }, [user])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await signIn(email, password)

      if (error) {
        console.error("Login error:", error.message)
        return false
      }

      if (data?.user) {
        const adminStatus = await getCachedAdminStatus(data.user.id)

        const userObj = {
          id: data.user.id,
          username: data.user.user_metadata?.username || data.user.email?.split("@")[0] || "User",
          email: data.user.email || "",
          isAdmin: adminStatus,
          createdAt: data.user.created_at || new Date().toISOString(),
          avatar: data.user.user_metadata?.avatar_url,
        }

        setUser(userObj)
        localStorage.setItem("currentUser", JSON.stringify(userObj))

        try {
          const { clearAnonymousUserId } = await import("@/lib/anonymous-user")
          clearAnonymousUserId()
        } catch (e) {
          console.error("Failed to clear anonymous user ID on login", e)
        }

        window.location.reload()
        return true
      }

      return false
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const signup = async (
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await signUp(email, password)

      if (error) {
        console.error("Signup error:", error.message)
        return { success: false, error: error.message }
      }

      if (data?.user) {
        await supabase.auth.updateUser({ data: { username } })
        return { success: true }
      }

      return { success: false, error: "Signup failed. Please try again." }
    } catch (error) {
      console.error("Signup error:", error)
      const errorMessage = error instanceof Error ? error.message : "An error occurred during signup"
      return { success: false, error: errorMessage }
    }
  }

  const logout = async () => {
    try {
      await signOut()
      setUser(null)
      adminCache.clear()
      localStorage.removeItem("currentUser")
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.refreshSession()
      if (error) {
        console.error("Error refreshing session:", error)
        if (error.message.includes("invalid refresh token") || error.message.includes("expired")) {
          await logout()
        }
        return false
      }
      return true
    } catch (error) {
      console.error("Error refreshing session:", error)
      return false
    }
  }

  const checkDeleteUserFunction = async (): Promise<boolean> => {
    try {
      const { error } = await (supabase.rpc as any)("delete_user", {
        user_id: "00000000-0000-0000-0000-000000000000",
      })

      if (
        error &&
        (error.message.includes("User not found") ||
          error.message.includes("Cannot delete administrator accounts") ||
          error.message.includes("Only administrators can delete users"))
      ) {
        return true
      }

      if (error && error.message.includes("Could not find the function")) {
        return false
      }

      return true
    } catch (error) {
      console.error("Error checking delete_user function:", error)
      return true
    }
  }

  const deleteUser = async (id: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from("users_view")
        .select("*")
        .eq("id", id)
        .single() as any

      if (userError || !userData) {
        console.error("Error finding user:", userError)
        return { success: false, error: "User not found" }
      }

      if (userData.is_admin) {
        return { success: false, error: "Cannot delete administrator accounts" }
      }

      const { error } = await (supabase.rpc as any)("delete_user", { target_user_id: id })

      if (error) {
        console.error("Error deleting user:", error)
        if (error.message.includes("Could not find the function")) {
          return {
            success: false,
            error: "The delete_user function does not exist. Please run the migration first.",
            needsMigration: true,
          }
        }
        return { success: false, error: error.message }
      }

      setUsers(users.filter((u) => u.id !== id))
      return { success: true }
    } catch (error) {
      console.error("Error in deleteUser:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      if (errorMessage.includes("Could not find the function")) {
        return {
          success: false,
          error: "The delete_user function does not exist. Please run the migration first.",
          needsMigration: true,
        }
      }
      return { success: false, error: errorMessage }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        login,
        signup,
        logout,
        refreshSession,
        isLoading,
        deleteUser,
        checkDeleteUserFunction,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}