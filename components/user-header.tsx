"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/sidebar-context"
import { useSite } from "@/components/site-context"
import { useAuth } from "@/components/auth-context"
import { useCharacters } from "@/components/character-context"
import { UserAvatar } from "./user-avatar"

export function UserHeader() {
  const { toggle } = useSidebar()
  const { settings } = useSite()
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const { activeType, setActiveType } = useCharacters()
  // Fixed character types to match the reference design
  const characterTypes = ["Female", "Anime", "Male"]

  return (
    <header className="border-b border-border bg-card sticky top-0 z-10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={toggle}>
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold text-white">
              {settings.logoText}<span className="text-primary">{settings.siteSuffix}</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          {user ? (
            <>
              <UserAvatar />
              <Link href="/profile">
                <span className="text-sm text-gray-300 hidden sm:inline">{user.username}</span>
              </Link>
              <Button
                variant="outline"
                className="login-button hover:bg-[#e75275]/10 text-xs sm:text-sm"
                onClick={logout}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/signup">
                <Button
                  variant="default"
                  className="account-button text-white hover:bg-[#d14868] text-xs sm:text-sm whitespace-nowrap"
                >
                  Create Free Account
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="login-button hover:bg-[#e75275]/10 text-xs sm:text-sm">
                  Login
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Character Type Tabs - Only show on homepage */}
      {pathname === "/" && (
        <div className="flex justify-center border-t border-border overflow-x-auto">
          {characterTypes.map((type) => (
            <Button
              key={type}
              variant="ghost"
              className={`rounded-none px-6 py-3 ${activeType === type ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                }`}
              onClick={() => setActiveType(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      )}
    </header>
  )
}
