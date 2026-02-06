"use client"

import { UserNav } from "@/components/user-nav"
import { ThemeToggle } from "@/components/theme-toggle"
import AdminMobileSidebar from "@/components/admin-mobile-sidebar"

export function AdminHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-4">
                <div className="flex items-center lg:hidden">
                    <AdminMobileSidebar />
                </div>
                <div className="flex items-center space-x-2 ml-auto">
                    <ThemeToggle />
                    <UserNav />
                </div>
            </div>
        </header>
    )
}
