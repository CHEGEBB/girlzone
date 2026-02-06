"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth-context"
import { AlertCircle, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useAuthModal } from "./auth-modal-context"
import Image from "next/image"

export function LoginModal() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { login } = useAuth()
    const { isLoginModalOpen, closeLoginModal, switchToSignup } = useAuthModal()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            const success = await login(email, password)
            if (success) {
                window.location.reload()
            } else {
                setError("Invalid email or password")
            }
        } catch (err) {
            setError("An error occurred during login")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isLoginModalOpen} onOpenChange={closeLoginModal}>
            <DialogContent className="max-w-3xl p-0 bg-[#1E1E1E] border-[#252525] rounded-lg grid grid-cols-1 md:grid-cols-2 max-h-[90vh] overflow-y-auto">
                <div className="relative h-48 md:h-full w-full hidden md:block">
                    <Image
                        src="/login-placeholder.jpeg"
                        alt="Login image"
                        layout="fill"
                        objectFit="cover"
                        className="rounded-l-lg"
                    />
                </div>
                <div className="relative p-4 sm:p-6 md:p-8">
                    <DialogTitle className="sr-only">Login</DialogTitle>

                    <div className="text-center mb-6 sm:mb-8">
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Sign in</h1>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-6 flex items-center">
                            <AlertCircle className="h-5 w-5 mr-2" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="email-login"
                                className="block text-xs sm:text-sm font-medium text-gray-300"
                            >
                                E-mail
                            </label>
                            <Input
                                id="email-login"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-[#252525] border-[#333333] text-white focus:ring-[#1111FF] focus:border-[#1111FF] text-sm sm:text-base h-10 sm:h-11"
                                placeholder="E-mail"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="password-login"
                                className="block text-xs sm:text-sm font-medium text-gray-300"
                            >
                                Password
                            </label>
                            <Input
                                id="password-login"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-[#252525] border-[#333333] text-white focus:ring-[#1111FF] focus:border-[#1111FF] text-sm sm:text-base h-10 sm:h-11"
                                placeholder="Password"
                            />
                            <div className="text-right">
                                <a href="#" className="text-xs sm:text-sm text-[#1111FF] hover:underline">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <div>
                            <Button
                                type="submit"
                                className="w-full bg-[#1111FF] hover:bg-[#0e0ecc] text-white py-4 sm:py-5 text-sm sm:text-base"
                                disabled={isLoading}
                            >
                                {isLoading ? "Logging in..." : "Sign in"}
                            </Button>
                        </div>
                    </form>


                    <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm">
                        <p className="text-muted-foreground">
                            Don't have an account?{" "}
                            <button onClick={switchToSignup} className="text-[#1111FF] hover:underline">
                                Sign up
                            </button>
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
