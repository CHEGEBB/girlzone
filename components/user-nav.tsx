"use client"

import type React from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "./user-avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "./auth-context"
import { useAuthModal } from "./auth-modal-context"
import { useLanguage } from "./language-context"
import Link from "next/link"
import { Globe } from "lucide-react"

const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
]

export function UserNav() {
    const { user, logout } = useAuth()
    const { openLoginModal, openSignupModal } = useAuthModal()
    const { language, changeLanguage } = useLanguage()

    if (user) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <UserAvatar />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.username}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <Link href="/profile">
                            <DropdownMenuItem>Profile</DropdownMenuItem>
                        </Link>
                        <Link href="/premium">
                            <DropdownMenuItem>Billing</DropdownMenuItem>
                        </Link>
                        <Link href="/settings">
                            <DropdownMenuItem>Settings</DropdownMenuItem>
                        </Link>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Globe className="mr-2 h-4 w-4" />
                                <span>Language</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48">
                                {languages.map((lang) => (
                                    <DropdownMenuItem
                                        key={lang.code}
                                        onClick={() => changeLanguage(lang.code)}
                                        className={`flex items-center gap-2 ${
                                            language.split('-')[0] === lang.code ? 'bg-accent' : ''
                                        }`}
                                    >
                                        <span>{lang.flag}</span>
                                        <span className="flex-1">{lang.name}</span>
                                        {language.split('-')[0] === lang.code && (
                                            <span className="text-primary">✓</span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    return (
        <div className="flex items-center gap-1 sm:gap-2">
            <Button 
                variant="outline" 
                onClick={openLoginModal}
                className="text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
            >
                Log In
            </Button>
            <Button 
                onClick={openSignupModal}
                className="text-xs sm:text-sm px-2 sm:px-4 h-8 sm:h-10"
            >
                Sign Up
            </Button>
        </div>
    )
}
