"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Compass, Settings, Wand2, MessageCircle, Diamond } from "lucide-react"

export function MobileNav() {
  const pathname = usePathname()

  // Don't show the mobile nav on specific chat rooms (but show on chat list)
  if (pathname?.startsWith("/chat/")) {
    return null
  }

  const navItems = [
    {
      href: "/",
      icon: Compass,
      label: "Explore",
      isActive: pathname === "/"
    },
    {
      href: "/generate",
      icon: Settings,
      label: "Generate", 
      isActive: pathname?.startsWith("/generate")
    },
    {
      href: "/create-character",
      icon: Wand2,
      label: "Create",
      isActive: pathname?.startsWith("/create-character")
    },
    {
      href: "/chat",
      icon: MessageCircle,
      label: "Chat",
      isActive: pathname?.startsWith("/chat")
    },
    {
      href: "/premium",
      icon: Diamond,
      label: "Premium",
      isActive: pathname?.startsWith("/premium")
    }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999999] md:hidden bg-card">
      <div className="w-full h-full bg-card">
        <div className="bg-card border-t border-border px-2 py-3">
          <div className="flex justify-around items-center">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  className="flex flex-col items-center space-y-1 min-w-0 flex-1"
                >
                  <div className="relative">
                    {item.isActive ? (
                      // Active state with primary color background circle for Explore
                      item.href === "/" ? (
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary-foreground" />
                        </div>
                      ) : (
                        <Icon className="h-6 w-6 text-primary" />
                      )
                    ) : (
                      <Icon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  
                  <span 
                    className={`text-xs font-medium text-center ${
                      item.isActive 
                        ? "text-primary" 
                        : "text-gray-400"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
