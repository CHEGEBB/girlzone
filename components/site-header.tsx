"use client"

import { useCharacters } from "@/components/character-context"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserTokenBalance } from "@/components/user-token-balance"
import { UserNav } from "@/components/user-nav"
import { useAuth } from "./auth-context"
import { Menu } from "lucide-react"
import { useSidebar } from "@/components/sidebar-context"
import { useSite } from "@/components/site-context"

export function SiteHeader() {
  const { activeType, setActiveType } = useCharacters()
  const { user } = useAuth()
  const { toggle } = useSidebar()
  const { settings } = useSite()
  const characterTypes = ["Female", "Anime", "Male"]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background shadow-lg">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between bg-background">
        {/* Left Side - Mobile */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Hamburger Menu - Mobile Only */}
          <Button variant="ghost" size="icon" className="md:hidden p-2" onClick={toggle}>
            <Menu className="h-5 w-5 text-foreground" />
          </Button>

          {/* Logo - Mobile */}
          <div className="md:hidden max-w-[150px] sm:max-w-[200px]">
            <span className="text-sm sm:text-base font-bold text-foreground truncate block">
              {settings.logoText}<span className="text-primary">{settings.siteSuffix}</span>
            </span>
          </div>

          {/* Character Type Tabs - Desktop Only */}
          <div className="hidden md:flex items-center gap-2 rounded-full bg-secondary p-1">
            {characterTypes.map(type => (
              <Button
                key={type}
                variant={activeType === type ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveType(type)}
                className="rounded-full"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Right Side - Mobile & Desktop */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          {user && (
            <div className="hidden sm:block">
              <UserTokenBalance userId={user.id} className="text-sm" />
            </div>
          )}
          {user && <ThemeToggle />}
          <UserNav />
        </div>
      </div>
    </header>
  )
}
