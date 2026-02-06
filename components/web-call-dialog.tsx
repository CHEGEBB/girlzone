"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import Image from "next/image"

type WebCallDialogProps = {
  character:
    | {
        id: string
        name: string
        image: string
        systemPrompt?: string
        gender?: string
        characterType?: string
      }
    | null
    | undefined
  autoStart?: boolean
  isPremium?: boolean
  onPremiumRequired?: () => void
}

export function WebCallDialog({ character, autoStart = false, isPremium = false, onPremiumRequired }: WebCallDialogProps) {
  // Temporarily disable auto-start for debugging
  const actualAutoStart = false // Change to true once working
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [assistantId, setAssistantId] = useState<string | null>(null)
  const [hasAssistant, setHasAssistant] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [isStartingCall, setIsStartingCall] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const vapiInstanceRef = useRef<any>(null)
  const [isVapiReady, setIsVapiReady] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false)
  const [hasAssistantSpoken, setHasAssistantSpoken] = useState(false)
  const [callMinutes, setCallMinutes] = useState(0)
  const minuteTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasAutoStartedRef = useRef(false)
  const { toast } = useToast()

  // Check assistant status when dialog opens or on mount for auto-start
  useEffect(() => {
    if (character?.id) {
      checkAssistantStatus()
    }
  }, [character?.id])

  // Auto-start call if assistant exists and autoStart is true
  useEffect(() => {
    if (actualAutoStart && hasAssistant && assistantId && !isCallActive && !isStartingCall && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true
      // Auto-start the call
      const autoStartCall = async () => {
        try {
          const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
          if (!publicKey) {
            console.error("❌ Missing VAPI public key")
            return
          }

          console.log("🚀 Auto-starting call for assistant:", assistantId)
          setIsOpen(true) // Open dialog to show call status
          setIsStartingCall(true)
          
          await ensureVapiWidget(publicKey, assistantId)

          // Start the call using Vapi API
          const started = await startCall()
          
          if (!started) {
            console.error("❌ Failed to auto-start call")
            toast({
              title: "Call Start Failed",
              description: "Could not automatically start the call. Please try manually.",
              variant: "destructive"
            })
            setIsStartingCall(false)
          }
        } catch (err) {
          console.error("❌ Failed to auto-start call", err)
          toast({
            title: "Auto-start Error",
            description: "Failed to automatically start call. Please try manually.",
            variant: "destructive"
          })
          setIsStartingCall(false)
        }
      }
      
      autoStartCall()
    }
  }, [hasAssistant, assistantId, autoStart])

  const checkAssistantStatus = async () => {
    if (!character?.id) return
    
    setIsCheckingStatus(true)
    try {
      console.log("🔍 Checking assistant status for character:", character.id)
      const response = await fetch(`/api/check-assistant?characterId=${character.id}`)
      const result = await response.json()

      console.log("📋 Assistant check result:", {
        hasAssistant: result.hasAssistant,
        assistantId: result.assistantId,
        characterName: result.characterName
      })

      if (response.ok) {
        setHasAssistant(result.hasAssistant)
        setAssistantId(result.assistantId)
        
        if (!result.hasAssistant) {
          console.warn("⚠️ No assistant ID found for this character. Create one first!")
        } else {
          console.log("✅ Assistant ID retrieved:", result.assistantId)
        }
      }
    } catch (error) {
      console.error("Error checking assistant status:", error)
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const loadVapiScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("Window not available"))

      const existing = document.querySelector<HTMLScriptElement>("script[data-vapi-sdk]")
      if (existing && (window as any).vapiSDK) {
        resolve()
        return
      }

      const g = document.createElement("script")
      g.src = "https://cdn.jsdelivr.net/gh/VapiAI/html-script-tag@latest/dist/assets/index.js"
      g.defer = true
      g.async = true
      g.setAttribute("data-vapi-sdk", "true")
      g.onload = () => resolve()
      g.onerror = () => reject(new Error("Failed to load Vapi SDK"))
      document.head.appendChild(g)
    })
  }

  const ensureVapiWidget = async (publicKey: string, asstId: string) => {
    try {
      await loadVapiScript()
      
      // Validate inputs
      if (!publicKey || !asstId) {
        throw new Error("Missing required Vapi configuration")
      }
      
      console.log("🔑 Using public key:", publicKey.substring(0, 10) + "...")
      console.log("🤖 Using assistant:", asstId)
      
      // Initialize widget if not already initialized
      if ((window as any).vapiSDK && !vapiInstanceRef.current) {
        console.log("🎛️ Initializing Vapi widget...")
        
        const vapiInstance = (window as any).vapiSDK.run({
          apiKey: publicKey,
          assistant: asstId,
          config: {
            position: "bottom-left",
            theme: "dark",
            showCloseButton: true,
          },
        })
        
        if (!vapiInstance) {
          throw new Error("Failed to initialize Vapi instance")
        }
        
        vapiInstanceRef.current = vapiInstance
        console.log("✅ Vapi instance created")
        
        // Listen to Vapi events
        vapiInstance.on("speech-start", () => {
          console.log("🎤 Assistant started speaking")
          setIsAssistantSpeaking(true)
          setHasAssistantSpoken(true)
          
          // Start the call timer when assistant first speaks
          if (!timerRef.current) {
            setCallSeconds(0)
            timerRef.current = setInterval(() => {
              setCallSeconds((s) => s + 1)
            }, 1000)
          }
          
          // Start minute counter when assistant starts talking
          if (!minuteTimerRef.current) {
            setCallMinutes(0)
            minuteTimerRef.current = setInterval(() => {
              setCallMinutes((m) => {
                console.log("📊 Speaking minutes:", m + 1)
                return m + 1
              })
            }, 60000) // Increment every minute
          }
        })
        
        vapiInstance.on("speech-end", () => {
          console.log("🔇 Assistant stopped speaking")
          setIsAssistantSpeaking(false)
        })
        
        vapiInstance.on("call-start", () => {
          console.log("📞 Call started - Vapi event")
          setIsCallActive(true)
          setIsStartingCall(false)
        })
        
        vapiInstance.on("call-end", () => {
          console.log("📴 Call ended - Vapi event")
          setIsCallActive(false)
          setIsAssistantSpeaking(false)
          setHasAssistantSpoken(false)
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          if (minuteTimerRef.current) {
            clearInterval(minuteTimerRef.current)
            minuteTimerRef.current = null
          }
        })
        
        vapiInstance.on("error", (error: any) => {
          console.error("❌ Vapi error details:", {
            error,
            message: error?.message,
            type: error?.type,
            code: error?.code,
            errorString: JSON.stringify(error)
          })
          setIsStartingCall(false)
          
          // Ignore empty/meaningless errors that Vapi sometimes emits during initialization
          const errorStr = JSON.stringify(error)
          if (errorStr === '{}' || !error || !error.message) {
            console.log("ℹ️ Ignoring empty Vapi error (likely initialization noise)")
            return
          }
          
          // Only show toast for real errors
          toast({
            title: "Call Error",
            description: error.message || "An error occurred",
            variant: "destructive"
          })
        })
        
        vapiInstance.on("message", (message: any) => {
          console.log("💬 Vapi message:", message)
        })
        
        console.log("✅ Event listeners attached")
      }
      
      // Make the floating widget invisible but still functional
      const HIDE_STYLE_ID = "vapi-hide-style"
      let styleEl = document.getElementById(HIDE_STYLE_ID) as HTMLStyleElement | null
      if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = HIDE_STYLE_ID
        styleEl.textContent = `
          .vapi-btn, .vapi-container, .vapi-widget-root {
            opacity: 0 !important;
            pointer-events: auto !important;
            width: 60px !important;
            height: 60px !important;
            overflow: hidden !important;
            position: fixed !important;
            bottom: 20px !important;
            left: 20px !important;
          }
        `
        document.head.appendChild(styleEl)
      }
      
      // Wait for Vapi to be ready
      console.log("⏳ Waiting for Vapi to initialize...")
      await new Promise((r) => setTimeout(r, 2000))
      
      // Verify instance is still valid
      if (!vapiInstanceRef.current) {
        throw new Error("Vapi instance lost during initialization")
      }
      
      setIsVapiReady(true)
      console.log("✅ Vapi ready!")
      console.log("📊 Vapi instance status:", {
        exists: !!vapiInstanceRef.current,
        hasStart: typeof vapiInstanceRef.current?.start === 'function',
        hasStop: typeof vapiInstanceRef.current?.stop === 'function',
        methods: vapiInstanceRef.current ? Object.keys(vapiInstanceRef.current).slice(0, 10) : []
      })
    } catch (error) {
      console.error("❌ Failed to initialize Vapi:", error)
      setIsStartingCall(false)
      throw error
    }
  }

  const triggerVapiClick = () => {
    const btn = document.querySelector<HTMLButtonElement>(".vapi-btn")
    if (btn) {
      console.log("✅ Found Vapi button, clicking...")
      btn.click()
      return true
    }
    console.log("⚠️ Vapi button not found")
    return false
  }

  const startCall = async () => {
    if (!vapiInstanceRef.current) {
      console.error("❌ Vapi instance not initialized")
      return false
    }
    
    try {
      console.log("🔄 Starting call by clicking Vapi widget button...")
      
      // Try to click the Vapi button
      if (triggerVapiClick()) {
        console.log("✅ Successfully clicked Vapi button")
        setIsCallActive(true)
        return true
      }
      
      // If button not found, wait and retry
      console.log("⏳ Button not ready, retrying...")
      await new Promise(r => setTimeout(r, 500))
      
      let attempts = 0
      const maxAttempts = 20
      
      const tryClick = () => {
        attempts++
        console.log(`🔄 Click attempt ${attempts}/${maxAttempts}`)
        if (triggerVapiClick()) {
          setIsCallActive(true)
          return true
        }
        return false
      }
      
      return new Promise((resolve) => {
        if (tryClick()) {
          resolve(true)
          return
        }
        
        const interval = setInterval(() => {
          if (tryClick() || attempts >= maxAttempts) {
            clearInterval(interval)
            resolve(attempts < maxAttempts)
          }
        }, 200)
      })
      
    } catch (error: any) {
      console.error("❌ Failed to start call:", {
        error,
        message: error?.message,
        stack: error?.stack
      })
      
      toast({
        title: "Failed to Start Call",
        description: "Could not initiate the call. Please try again.",
        variant: "destructive"
      })
      
      return false
    }
  }

  const stopCall = async () => {
    try {
      console.log("🔄 Stopping call by clicking Vapi button...")
      
      // Immediately stop the call using Vapi instance if available
      if (vapiInstanceRef.current && typeof vapiInstanceRef.current.stop === 'function') {
        console.log("🛑 Using Vapi instance stop method...")
        await vapiInstanceRef.current.stop()
        console.log("✅ Call stopped via Vapi instance")
        return
      }
      
      // Fallback to button clicking
      await new Promise((r) => setTimeout(r, 200))
      
      if (triggerVapiClick()) {
        console.log("✅ Call stop initiated via button click")
      } else {
        // Retry a few times
        let attempts = 0
        const maxAttempts = 15
        const interval = setInterval(() => {
          attempts++
          console.log(`🔄 Stop attempt ${attempts}/${maxAttempts}`)
          if (triggerVapiClick() || attempts >= maxAttempts) {
            clearInterval(interval)
            if (attempts >= maxAttempts) {
              console.warn("⚠️ Could not find button to stop call, forcing state reset")
              // Force state reset if button not found
              setIsCallActive(false)
              setIsAssistantSpeaking(false)
              setHasAssistantSpoken(false)
              setCallSeconds(0)
            }
          }
        }, 150)
      }
    } catch (error) {
      console.error("❌ Failed to stop call:", error)
      // Force state reset on error
      setIsCallActive(false)
      setIsAssistantSpeaking(false)
      setHasAssistantSpoken(false)
      setCallSeconds(0)
    }
  }

  const handleStartWebCall = async () => {
    try {
      if (!assistantId) {
        console.log("⚠️ No assistant ID available")
        return
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
      if (!publicKey) {
        console.error("❌ Missing VAPI public key")
        return
      }

      console.log("🎬 Starting web call manually...")
      setIsStartingCall(true)
      await ensureVapiWidget(publicKey, assistantId)

      // Start the call using Vapi API
      const started = await startCall()
      
      if (!started) {
        console.error("❌ Call start failed")
        setIsStartingCall(false)
      }
    } catch (err) {
      console.error("❌ Failed to start web call", err)
      setIsStartingCall(false)
    }
  }

  const handleEndWebCall = async () => {
    try {
      console.log("🛑 Ending web call...")
      await stopCall()
    } catch (err) {
      console.error("❌ Failed to end web call", err)
      const msg = err instanceof Error ? err.message : "Failed to end web call"
      toast({ title: "End call error", description: msg, variant: "destructive" })
    } finally {
      // Reset all call states
      setIsCallActive(false)
      setIsAssistantSpeaking(false)
      setHasAssistantSpoken(false)
      setCallSeconds(0)
      setIsStartingCall(false)
      
      // Clear timers
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (minuteTimerRef.current) {
        clearInterval(minuteTimerRef.current)
        minuteTimerRef.current = null
      }
      
      // Close the dialog
      setIsOpen(false)
      console.log("✅ Call ended and dialog closed")
      
      // Reload the page after a short delay
      setTimeout(() => {
        console.log("🔄 Reloading page...")
        window.location.reload()
      }, 300)
    }
  }


  const formatDuration = (total: number) => {
    const mm = Math.floor(total / 60)
    const ss = total % 60
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
  }

  const handleWebCall = async () => {
    setIsLoading(true)

    try {
      // First check if assistant already exists
      const checkResponse = await fetch(`/api/check-assistant?characterId=${character?.id}`)
      const checkResult = await checkResponse.json()

      if (checkResponse.ok && checkResult.hasAssistant) {
        // Assistant already exists - silently use it
        console.log("✅ Using existing assistant:", checkResult.assistantId)
        setAssistantId(checkResult.assistantId)
        setHasAssistant(true)
        setIsLoading(false)
        
        // Automatically start the call
        await handleStartWebCall()
        return
      }

      // Create new assistant
      const response = await fetch("/api/create-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ character }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create assistant")
      }

      console.log("✅ Assistant created successfully:", result.assistantId)
      
      setAssistantId(result.assistantId)
      setHasAssistant(true)
      setIsLoading(false)

      // Automatically start the call after creating assistant
      await handleStartWebCall()

    } catch (error) {
      console.error("Error creating assistant:", error)
      setIsLoading(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    // If the user tries to close while a call is active or starting, end the call first
    if (!nextOpen && (isCallActive || isStartingCall)) {
      console.log("🚪 User closing dialog during active/starting call, ending call first...")
      void handleEndWebCall()
      return
    }
    setIsOpen(nextOpen)
  }

  const handleTriggerClick = () => {
    // Check if user is premium before opening the dialog
    if (!isPremium) {
      console.log("🚫 Non-premium user trying to access call feature")
      onPremiumRequired?.()
      return
    }
    setIsOpen(true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary hover:text-primary/80"
          title={isPremium ? "Create AI assistant for this character" : "Premium feature - Click to upgrade"}
          onClick={(e) => {
            if (!isPremium) {
              e.preventDefault()
              handleTriggerClick()
            }
          }}
        >
          <Phone className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogOverlay className="backdrop-blur-sm bg-background/30 fixed inset-0" />
      <DialogContent
        className="p-0 sm:p-6 w-[100vw] h-[100dvh] md:w-[70vw] md:h-[70vh] max-w-none sm:max-w-none md:max-w-none lg:max-w-none sm:h-auto sm:w-auto rounded-none sm:rounded-lg overflow-y-auto"
        onEscapeKeyDown={(e) => { 
          if (isCallActive || isStartingCall) {
            e.preventDefault()
            void handleEndWebCall()
          }
        }}
        onPointerDownOutside={(e) => { 
          if (isCallActive || isStartingCall) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">{character?.name || "AI Character"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6 sm:py-8 md:py-10 px-4 sm:px-6">
          <div className="relative mb-4 sm:mb-6">
            <div 
              className={`relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden transition-all duration-500 ${
                isCallActive 
                  ? "ring-8 ring-green-500/30" 
                  : "ring-4 ring-border/50"
              }`}
              style={{
                boxShadow: isAssistantSpeaking 
                  ? '0 0 40px rgba(59, 130, 246, 0.6), 0 0 80px rgba(59, 130, 246, 0.4)' 
                  : isCallActive 
                    ? '0 0 20px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2)'
                    : '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            >
              <Image
                src={character?.image || "/placeholder.svg"}
                alt={character?.name || "Character"}
                width={192}
                height={192}
                className="w-full h-full object-cover object-top"
              />
            </div>
            {isCallActive && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-green-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-lg">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm font-medium">Live</span>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">{character?.name || "AI Character"}</p>
          
          <div className="flex flex-col items-center gap-2 sm:gap-3 mt-2">
            {isCallActive ? (
              <div className="flex flex-col items-center gap-2 p-3 sm:p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl min-w-[180px] sm:min-w-[200px]">
                {hasAssistantSpoken ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl sm:text-3xl font-mono font-bold text-green-700 dark:text-green-300">
                      {formatDuration(callSeconds)}
                    </span>
                    {isAssistantSpeaking && (
                      <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-blue-500/20 rounded-full">
                        <div className="flex gap-0.5 sm:gap-1">
                          <div className="w-0.5 sm:w-1 h-3 sm:h-4 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '0ms'}} />
                          <div className="w-0.5 sm:w-1 h-3 sm:h-4 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '150ms'}} />
                          <div className="w-0.5 sm:w-1 h-3 sm:h-4 bg-blue-500 rounded-full animate-pulse" style={{animationDelay: '300ms'}} />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                          Speaking {callMinutes > 0 && `· ${callMinutes} min${callMinutes !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2 py-2">
                    <div className="flex gap-0.5 sm:gap-1">
                      <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                      <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                      <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-yellow-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                    </div>
                    <span className="text-base sm:text-lg font-medium text-yellow-700 dark:text-yellow-300">
                      Connecting...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-muted rounded-full">
                <span className="text-xs sm:text-sm text-muted-foreground">
                  {hasAssistant ? "Ready to call" : "Inactive"}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-4 sm:space-y-5 pt-0 pb-4 sm:pb-6 px-4 sm:px-6">
          {isCheckingStatus ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 sm:p-3 rounded-md">
              <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 text-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                Checking assistant status...
              </p>
            </div>
          ) : hasAssistant ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                {!isCallActive ? (
                  <Button
                    onClick={handleStartWebCall}
                    className="h-12 sm:h-14 md:h-16 px-6 sm:px-8 md:px-10 text-base sm:text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl min-h-[44px]"
                    disabled={isStartingCall}
                  >
                    {isStartingCall ? (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                        <span>Starting Call...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span>Start Call</span>
                      </div>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleEndWebCall}
                    className="h-12 sm:h-14 md:h-16 px-6 sm:px-8 md:px-10 text-base sm:text-lg font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl min-h-[44px]"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span>End Call</span>
                    </div>
                  </Button>
                )}
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={checkAssistantStatus}
                  disabled={isCheckingStatus || isStartingCall}
                  variant="ghost"
                  className="text-xs sm:text-sm"
                >
                  {isCheckingStatus ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Refreshing
                    </>
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-muted p-2.5 sm:p-3 rounded-md">
                <p className="text-xs sm:text-sm font-medium">Activate {character?.name || "your AI"}</p>
                <p className="text-xs text-muted-foreground">We're setting up a voice for {character?.name || "your AI"}. This only takes a few seconds.</p>
              </div>
              <Button 
                onClick={handleWebCall} 
                className="w-full h-12 sm:h-14 text-sm sm:text-base min-h-[44px]" 
                disabled={isLoading || isCheckingStatus}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Activating...
                  </>
                ) : (
                  `Activate ${character?.name || "AI"}`
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
