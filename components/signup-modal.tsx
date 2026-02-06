"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth-context"
import { AlertCircle, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useAuthModal } from "./auth-modal-context"
import Image from "next/image"
import { getCurrentAffiliateCode } from "@/lib/affiliate-tracking"

export function SignupModal() {
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [referralCode, setReferralCode] = useState("")
    const [hasReferral, setHasReferral] = useState(false)
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const { signup } = useAuth()
    const { isSignupModalOpen, closeSignupModal, switchToLogin } = useAuthModal()

    // Check for referral code on component mount
    useEffect(() => {
        const affiliateCode = getCurrentAffiliateCode()
        if (affiliateCode) {
            setReferralCode(affiliateCode)
            setHasReferral(true)
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setIsLoading(true)

        try {
            const result = await signup(username, email, password)
            if (result.success) {
                // If signup was successful and there's a referral code, link the referrer
                if (referralCode) {
                    try {
                        console.log('Linking referrer with code:', referralCode);

                        // Small delay to ensure user profile is created by trigger
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Link the referrer relationship
                        const linkResponse = await fetch('/api/link-referrer', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                referralCode: referralCode
                            })
                        });

                        const linkResult = await linkResponse.json();

                        if (linkResult.success) {
                            console.log('Referrer linked successfully:', linkResult.referrerId);
                        } else {
                            console.error('Failed to link referrer:', linkResult.error);
                        }
                    } catch (linkError) {
                        console.error('Error linking referrer:', linkError);
                        // Don't fail the signup if referrer linking fails
                    }
                }
                window.location.reload()
            } else {
                setError(result.error || "Signup failed. Please try again.")
            }
        } catch (err) {
            setError("An error occurred during signup")
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isSignupModalOpen} onOpenChange={closeSignupModal}>
            <DialogContent className="max-w-3xl p-0 bg-[#1E1E1E] border-[#252525] rounded-lg grid grid-cols-1 md:grid-cols-2 max-h-[90vh] overflow-y-auto">
                <div className="relative h-48 md:h-full w-full hidden md:block">
                    <Image
                        src="/signup-placeholder.jpeg"
                        alt="Signup image"
                        layout="fill"
                        objectFit="cover"
                        className="rounded-l-lg"
                    />
                </div>
                <div className="relative p-4 sm:p-6 md:p-8">
                    <DialogTitle className="sr-only">Create Account</DialogTitle>

                    <div className="text-center mb-6 sm:mb-8">
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Create Account</h1>
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
                                htmlFor="username-signup"
                                className="block text-xs sm:text-sm font-medium text-gray-300"
                            >
                                Username
                            </label>
                            <Input
                                id="username-signup"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="bg-[#252525] border-[#333333] text-white focus:ring-[#1111FF] focus:border-[#1111FF] text-sm sm:text-base h-10 sm:h-11"
                                placeholder="Username"
                            />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="email-signup"
                                className="block text-xs sm:text-sm font-medium text-gray-300"
                            >
                                E-mail
                            </label>
                            <Input
                                id="email-signup"
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
                                htmlFor="password-signup"
                                className="block text-xs sm:text-sm font-medium text-gray-300"
                            >
                                Password
                            </label>
                            <Input
                                id="password-signup"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-[#252525] border-[#333333] text-white focus:ring-[#1111FF] focus:border-[#1111FF] text-sm sm:text-base h-10 sm:h-11"
                                placeholder="Password"
                            />
                            <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                        </div>

                        {/* Referral Code Display */}
                        {hasReferral && referralCode && (
                            <div className="p-3 sm:p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-xs sm:text-sm font-medium text-green-400">Referral Code Applied</span>
                                </div>
                                <div className="text-xs text-gray-400 mb-2 break-all">
                                    You're signing up with referral code: <span className="font-mono text-green-400">{referralCode}</span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    🎉 You and your referrer will earn bonuses!
                                </div>
                            </div>
                        )}

                        <div>
                            <Button
                                type="submit"
                                className="w-full bg-[#1111FF] hover:bg-[#0e0ecc] text-white py-4 sm:py-5 text-sm sm:text-base"
                                disabled={isLoading}
                            >
                                {isLoading ? "Creating Account..." : "Create Free Account"}
                            </Button>
                        </div>
                    </form>


                    <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm">
                        <p className="text-muted-foreground">
                            Already have an account?{" "}
                            <button onClick={switchToLogin} className="text-[#1111FF] hover:underline">
                                Sign in
                            </button>
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
