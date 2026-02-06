"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart, CreditCard, Home, Settings, Users, Image, MessageSquare, DollarSign, FileText, Package, Gem, Database, Cpu, TrendingUp, Wallet, Plus, ChevronRight, ExternalLink, Palette, AlertTriangle, Crown, Shuffle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

// Make sure the Settings link is pointing to the correct path
const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: Home },
  { name: "Features", href: "/admin/dashboard/features", icon: Shuffle },
  { name: "Characters", href: "/admin/dashboard/characters", icon: MessageSquare },
  { name: "Character Content", href: "/admin/dashboard/character-content", icon: Image },
  { name: "Users", href: "/admin/dashboard/users", icon: Users },
  { name: "Image Suggestions", href: "/admin/dashboard/image-suggestions", icon: Image },
  { name: "Banners", href: "/admin/dashboard/banners", icon: BarChart },
  { name: "Subscriptions", href: "/admin/dashboard/subscriptions", icon: Crown },
  { name: "Token Packages", href: "/admin/dashboard/token-packages", icon: Package },
  { name: "Model Pricing", href: "/admin/dashboard/model-pricing", icon: Cpu },
  { name: "Creator Earnings", href: "/admin/dashboard/creator-earnings", icon: TrendingUp },
  { name: "Manage Earnings", href: "/admin/dashboard/manage-earnings", icon: Plus },
  { name: "Withdrawal Requests", href: "/admin/dashboard/withdrawal-requests", icon: Wallet },
  { name: "Premium Content", href: "/admin/dashboard/premium-content", icon: Gem },
  { name: "Troubleshoot", href: "/admin/dashboard/troubleshoot", icon: AlertTriangle },
  { name: "Cron Jobs", href: "/admin/dashboard/cron-jobs", icon: Clock },
  { name: "Settings", href: "/admin/settings", icon: Settings },
  { name: "Legal", href: "/admin/dashboard/documents", icon: FileText },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-card border-r border-border/60 shadow-sm">
      <div className="flex h-16 items-center border-b border-border/60 px-6">
        <Link href="/admin/dashboard" className="flex items-center gap-3 transition-colors hover:opacity-80">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <Database className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-primary">Admin Panel</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out relative overflow-hidden",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                  : "text-muted-foreground hover:bg-primary/40 hover:text-primary-foreground hover:shadow-sm hover:scale-[1.01] hover:translate-x-1",
              )}
            >
              {isActive && (
                <div className="absolute inset-0 bg-primary/10 rounded-xl" />
              )}
              <item.icon
                className={cn(
                  "mr-4 h-5 w-5 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary-foreground",
                )}
                aria-hidden="true"
              />
              <span className="relative z-10">{item.name}</span>
              <ChevronRight
                className={cn(
                  "ml-auto h-4 w-4 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-1",
                  isActive ? "opacity-100 translate-x-0" : ""
                )}
                aria-hidden="true"
              />
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto px-4 pb-6">
        <Link
          href="/"
          className="flex items-center justify-center px-4 py-3 text-sm font-medium rounded-xl bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 ease-in-out"
        >
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
          Visit Site
        </Link>
      </div>
    </div>
  )
}
