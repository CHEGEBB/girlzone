 "use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Home,
  MessageSquare,
  Sparkles,
  Crown,
  Search,
  ChevronLeft,
  Menu,
  LogOut,
  User,
  FolderHeart,
  Heart,
  PlusSquare,
  Users,
  DollarSign,
  Shuffle,
} from "lucide-react"
import { useAuth } from "@/components/auth-context"
import { useAuthModal } from "@/components/auth-modal-context"
import { useSidebar } from "@/components/sidebar-context"
import { cn } from "@/lib/utils"
import { useSite } from "@/components/site-context"
import { useEffect, useState } from "react"
import { UserAvatar } from "./user-avatar"
import { LanguageDropdown } from "./language-dropdown"
import { useLanguage } from "./language-context"

export default function AppSidebar() {
  const pathname = usePathname()
  const { isOpen, toggle, close, setIsOpen } = useSidebar()
  const { user, logout } = useAuth()
  const { openLoginModal } = useAuthModal()
  const { settings } = useSite()
  const { t } = useLanguage()
  const [monetizationEnabled, setMonetizationEnabled] = useState<boolean>(true)

  useEffect(() => {
    const handleRouteChange = () => {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setIsOpen(false)
      }
      if (pathname === "/generate") {
        setIsOpen(false)
      }
    }
    handleRouteChange()
  }, [pathname, setIsOpen])

  useEffect(() => {
    const checkMonetization = async () => {
      try {
        const res = await fetch("/api/monetization-status")
        if (res.ok) {
          const data = await res.json()
          if (typeof data.monetization_enabled === "boolean") {
            setMonetizationEnabled(data.monetization_enabled)
          }
        }
      } catch (e) {
        // Default to enabled on error
        setMonetizationEnabled(true)
      }
    }
    checkMonetization()
  }, [])

  const isAdminPage = pathname?.startsWith("/admin")
  if (isAdminPage) {
    return null
  }

  const menuItems = [
    {
      icon: <Home className="h-5 w-5" />,
      label: t("nav.home"),
      href: "/",
      active: pathname === "/",
    },
    {
      icon: <Heart className="h-5 w-5" />,
      label: t("nav.myAI"),
      href: "/my-ai",
      active: pathname?.startsWith("/my-ai"),
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: t("nav.chat"),
      href: "/chat",
      active: pathname?.startsWith("/chat"),
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      label: t("nav.generateImage"),
      href: "/generate",
      active: pathname?.startsWith("/generate"),
    },
  ] as Array<{ icon: React.ReactNode; label: string; href: string; active: boolean }>

  if (settings.features.faceSwap) {
    menuItems.push({
      icon: <Shuffle className="h-5 w-5" />,
      label: t("nav.faceSwap"),
      href: "/face-swap",
      active: (pathname?.startsWith("/face-swap") || false),
    })
  }

  const secondaryMenuItems = [
    {
      icon: <PlusSquare className="h-5 w-5" />,
      label: t("nav.createCharacter"),
      href: "/create-character",
      active: pathname?.startsWith("/create-character"),
    },
    {
      icon: <FolderHeart className="h-5 w-5" />,
      label: t("nav.collection"),
      href: "/collections",
      active: pathname?.startsWith("/collections"),
    },
  ]

  // Add secondary items to main menu
  menuItems.push(...secondaryMenuItems)

  if (monetizationEnabled) {
    menuItems.push({
      icon: <DollarSign className="h-5 w-5" />,
      label: t("nav.monetization"),
      href: "/monetization",
      active: pathname?.startsWith("/monetization") || false,
    })
  }



  const supportLinks: Array<{ icon: React.ReactNode; label: string; href: string; active: boolean }> = [
    {
      icon: <Users className="h-5 w-5" />,
      label: t("nav.affiliate"),
      href: "/affiliate",
      active: pathname?.startsWith("/affiliate") || false,
    },
  ]

  if (user?.isAdmin) {
    menuItems.push({
      icon: <User className="h-5 w-5" />,
      label: t("nav.admin"),
      href: "/admin/dashboard",
      active: pathname?.startsWith("/admin") || false,
    })
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={close} />}
      <div
        className={cn(
          "fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out [border-top-right-radius:8px] [border-bottom-right-radius:8px]",
          "bg-card text-card-foreground shadow-lg border-r border-border",
          "pb-20 md:pb-0", // Add bottom padding on mobile to account for mobile nav
          isOpen ? "w-64" : "w-20",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          <div className={`flex items-center ${isOpen ? "px-6" : "justify-center"} h-16 border-b border-border`}>
            {isOpen ? (
              <div className="flex items-center justify-between w-full">
                <Link href="/" className="flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    <span className="text-foreground">{settings.logoText}</span>
                    <span className="text-primary">{settings.siteSuffix}</span>
                  </span>
                </Link>
                <button
                  className="p-2 rounded-full hover:bg-secondary transition-colors"
                  onClick={toggle}
                  aria-label="Toggle sidebar"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                className="p-2 rounded-full hover:bg-secondary transition-colors"
                onClick={toggle}
                aria-label="Toggle sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <nav>
              <ul className="space-y-2">
                {menuItems.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-4 rounded-full transition-all duration-200",
                        isOpen ? "px-4 py-2" : "h-12 w-12 justify-center",
                        item.active
                          ? "bg-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(var(--primary-rgb),0.4)]"
                          : "hover:bg-secondary",
                      )}
                      style={{
                        border: "1px solid #ffffff17"
                      }}
                    >
                      {item.icon}
                      {isOpen && <span className="font-medium">{item.label}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {isOpen && (
              <div className="px-4">
                <div className="h-px bg-border" />
              </div>
            )}

            <nav>
              <ul className="space-y-2">
                {supportLinks.map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-4 rounded-full transition-all duration-200",
                        isOpen ? "px-4 py-2" : "h-12 w-12 justify-center",
                        item.active ? "bg-secondary" : "hover:bg-secondary",
                      )}
                      style={{
                        border: "1px solid #ffffff17"
                      }}
                    >
                      {item.icon}
                      {isOpen && <span className="font-medium">{item.label}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {isOpen && (
            <div className="p-4 space-y-3">
              <Link href="/premium">
                <Button
                  variant="outline"
                  className="w-full rounded-full border-2 border-primary text-primary bg-transparent hover:bg-primary/10 transition-all duration-300"
                >
                  {t("buttons.addTokens")}
                </Button>
              </Link>
              <LanguageDropdown />
            </div>
          )}

          <div className={`border-t border-border ${isOpen ? "p-4" : "p-2"}`}>
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/profile" className="flex-shrink-0">
                  <UserAvatar />
                </Link>
                {isOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.username}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.isAdmin ? t("nav.admin") : t("nav.user")}</p>
                  </div>
                )}
                {isOpen && (
                  <button onClick={logout} className="p-2 rounded-full hover:bg-secondary transition-colors">
                    <LogOut className="h-5 w-5" />
                  </button>
                )}
              </div>
            ) : (
              <div className={cn("flex", isOpen ? "flex-col space-y-2" : "flex-col items-center space-y-2")}>
                <Button
                  variant="outline"
                  className={cn("w-full rounded-full", !isOpen && "w-12 h-12 p-0")}
                  onClick={openLoginModal}
                >
                  {isOpen ? t("buttons.login") : <User className="h-5 w-5" />}
                </Button>
              </div>
            )}
          </div>

          {isOpen && (
            <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
              <div className="flex justify-between">
                <Link href="/privacy" className="hover:text-foreground">{t("nav.privacy")}</Link>
                <Link href="/legal" className="hover:text-foreground">{t("nav.terms")}</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
