"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/components/language-context"
import {
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Send,
  Menu,
  ImageIcon,
  Loader2,
  Volume2,
  VolumeX,
  ChevronUp,
  Share2,
} from "lucide-react"
import Link from "next/link"
import { useSidebar } from "@/components/sidebar-context"
import { useCharacters } from "@/components/character-context"
import {
  sendChatMessage,
  type Message,
  getChatHistory,
  saveMessage,
  clearChatHistory,
  getRecentChats
} from "@/lib/chat-actions"
import { checkNovitaApiKey } from "@/lib/api-key-utils"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-context"
import { createClient } from "@/lib/supabase/client"
import { ClearChatDialog } from "@/components/clear-chat-dialog"
import { DebugPanel } from "@/components/debug-panel"
import { SupabaseDebug } from "@/components/supabase-debug"
import { isAskingForImage, isAskingForVideo, extractImagePrompt, imageUrlToBase64 } from "@/lib/image-utils"
import { WebCallDialog } from "@/components/web-call-dialog"
import { ImageModal } from "@/components/image-modal"
import { InsufficientTokensDialog } from "@/components/insufficient-tokens-dialog"
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal"
import { ShareChatModal } from "@/components/share-chat-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { GallerySkeleton } from "@/components/skeletons"

interface ChatClientProps {
  characterId: string
  initialCharacter: any
  initialMessages: Message[]
  initialRecentChats: any[]
  userId: string
  isPremium: boolean
}

export default function ChatClient({
  characterId,
  initialCharacter,
  initialMessages,
  initialRecentChats,
  userId,
  isPremium: initialIsPremium
}: ChatClientProps) {
  const { characters, isLoading: charactersLoading } = useCharacters();
  const [character, setCharacter] = useState<any>(initialCharacter);
  const { toggle, setIsOpen, isOpen } = useSidebar();
  const router = useRouter();
  // We use userId from props instead of useAuth context to avoid hydration mismatch and wait time
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isSendingRef = useRef(false)
  const isMobile = useIsMobile()

  const { t, language } = useLanguage()

  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isClearingChat, setIsClearingChat] = useState(false)
  // History is already loaded from server
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [apiKeyError, setApiKeyError] = useState<string | null>(null)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string[] | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  // Initialize recent chats from props
  const [chatsWithHistory, setChatsWithHistory] = useState<string[]>(
    initialRecentChats.map((chat: any) => chat.characterId)
  )

  // Initialize last messages from props
  const [lastMessages, setLastMessages] = useState<Record<string, Message | null>>(() => {
    const newLastMessages: Record<string, Message | null> = {}
    initialRecentChats.forEach((chat: any) => {
      if (chat.lastMessage) {
        newLastMessages[chat.characterId] = {
          id: 'latest-' + chat.characterId,
          role: 'assistant',
          content: chat.lastMessage,
          timestamp: new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      }
    })
    return newLastMessages
  })

  const [currentlyPlayingMessageId, setCurrentlyPlayingMessageId] = useState<string | null>(null)
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState<Record<string, boolean>>({})
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({})
  const [showVideo, setShowVideo] = useState(!!initialCharacter?.videoUrl)
  const [isSaving, setIsSaving] = useState(false)
  const [showInsufficientTokens, setShowInsufficientTokens] = useState(false)
  const [tokenBalanceInfo, setTokenBalanceInfo] = useState({
    currentBalance: 0,
    requiredTokens: 2
  })
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [isPremium, setIsPremium] = useState(initialIsPremium)
  const [isCheckingPremium, setIsCheckingPremium] = useState(false)
  const [activeTab, setActiveTab] = useState<"gallery" | "unlocked">("gallery")
  const [unlockedImages, setUnlockedImages] = useState<any[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [tokenBalance, setTokenBalance] = useState<number>(0)
  const [galleryImages, setGalleryImages] = useState<any[]>([])
  const [isGalleryUnlocked, setIsGalleryUnlocked] = useState(false)
  const [isCheckingGalleryUnlock, setIsCheckingGalleryUnlock] = useState(false)
  const [isUnlockingGallery, setIsUnlockingGallery] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isBrowsingImages, setIsBrowsingImages] = useState(false)
  const [translatedMessages, setTranslatedMessages] = useState<Record<string, string>>({})

  // Use a ref for the interval to ensure we always have the latest reference
  const imageCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Use a ref to track if we're currently processing an image
  const isProcessingImageRef = useRef(false)

  // Use a ref to store the current task ID
  const currentTaskIdRef = useRef<string | null>(null)

  // Helper function to convert snake_case to camelCase
  const snakeToCamel = (obj: any): any => {
    if (obj === null || typeof obj !== "object") {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(snakeToCamel)
    }

    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      acc[camelKey] = snakeToCamel(obj[key])
      return acc
    }, {} as any)
  }

  const getTranslatedText = async (text: string, targetLanguage: string) => {
    if (targetLanguage === "en" || !text) {
      return text
    }
    try {
      const response = await fetch("/api/google-translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, targetLanguage }),
      })
      if (!response.ok) {
        throw new Error("Translation failed")
      }
      const data = await response.json()
      return data.translatedText
    } catch (error) {
      console.error("Error translating text:", error)
      return text // Fallback to original text
    }
  }

  // Add debug state
  const [debugInfo, setDebugInfo] = useState({
    characterId: characterId,
    messagesCount: initialMessages.length,
    lastError: null as any,
    lastAction: "initializedFromServer",
    storageType: "server",
  })

  // Set mounted state on component mount
  useEffect(() => {
    setIsMounted(true)
    return () => {
      setIsMounted(false);
    };
  }, []);

  // Update character when props change (if navigating without full remount, though key={id} prevents this)
  useEffect(() => {
    setCharacter(initialCharacter)
    setShowVideo(!!initialCharacter?.videoUrl)
  }, [initialCharacter])

  // Automatically close the sidebar on component mount
  useEffect(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  // Handle image error
  const handleImageError = useCallback(
    (id: string) => {
      if (!isMounted) return

      setImageErrors((prev) => ({
        ...prev,
        [id]: true,
      }))
    },
    [isMounted],
  )

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use a timeout to ensure the DOM has been updated
    const scrollTimeout = setTimeout(() => {
      if (messagesEndRef.current) {
        try {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
        } catch (error) {
          console.error("Error scrolling to bottom:", error)
          // Fallback to a simpler scroll method
          try {
            messagesEndRef.current.scrollIntoView()
          } catch (fallbackError) {
            console.error("Fallback scroll also failed:", fallbackError)
          }
        }
      }
    }, 100)

    return () => clearTimeout(scrollTimeout)
  }, [messages])

  // Check API key
  useEffect(() => {
    let isCancelled = false

    async function validateApiKey() {
      try {
        const result = await checkNovitaApiKey()
        if (!isCancelled && result && !result.valid) {
          setApiKeyError(result.message)
        }
      } catch (error) {
        console.error("Error validating API key:", error)
      }
    }

    validateApiKey()

    return () => {
      isCancelled = true
    }
  }, [])

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      try {
        if (imageCheckIntervalRef.current) {
          clearInterval(imageCheckIntervalRef.current)
          imageCheckIntervalRef.current = null
        }
      } catch (error) {
        console.error("Error cleaning up interval:", error)
      }
    }
  }, [])

  // We don't need loadChatHistory useEffect anymore as we load from props
  // However, we might want to sync with localStorage for consistency
  useEffect(() => {
    if (userId && characterId && messages.length > 0) {
      const storageKey = `chat_history_${userId}_${characterId}`
      localStorage.setItem(storageKey, JSON.stringify(messages))
    }
  }, [messages, userId, characterId])

  // Add this inside the ChatPage component function, after the other useEffect hooks:
  // Effect to log character data when it changes
  useEffect(() => {
    if (character) {
      console.log("Character data:", {
        id: character.id,
        name: character.name,
        videoUrl: character.videoUrl,
      })
    }
  }, [character])

  // Translate messages when language changes
  useEffect(() => {
    const translateAllMessages = async () => {
      const newTranslations: Record<string, string> = {}
      for (const message of messages) {
        if (message.role === "assistant" && message.content) {
          const translatedContent = await getTranslatedText(message.content, language)
          newTranslations[message.id] = translatedContent
        }
      }
      setTranslatedMessages(newTranslations)
    }

    if (language !== "en") {
      translateAllMessages()
    } else {
      setTranslatedMessages({}) // Clear translations for English
    }
  }, [language, messages])

  // Load unlocked images for this character
  const loadUnlockedImages = useCallback(async () => {
    if (!userId || !characterId) return

    setIsLoadingImages(true)
    try {
      // Fetch user-generated unlocked images
      const userUrl = `/api/character-images?characterId=${characterId}&userId=${userId}`

      const userResponse = await fetch(userUrl)
      const userData = userResponse.ok ? await userResponse.json() : { images: [] }

      // Fetch admin unlocked content
      const adminResponse = await fetch(`/api/admin/character-content?characterId=${characterId}`)
      const adminData = adminResponse.ok ? await adminResponse.json() : { content: [] }

      // Filter admin content for unlocked tab and format to match user images
      const adminUnlockedImages = (adminData.content || [])
        .filter((item: any) => item.tab_type === 'unlocked')
        .map((item: any) => ({
          id: item.id,
          image_url: item.image_url,
          character_id: item.character_id,
          created_at: item.created_at,
          is_admin_content: true
        }))

      // Merge and sort by created_at
      const allImages = [...(userData.images || []), ...adminUnlockedImages]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setUnlockedImages(allImages)
    } catch (error) {
      console.error("Error loading unlocked images:", error)
    } finally {
      setIsLoadingImages(false)
    }
  }, [characterId, userId])

  // Load unlocked images when component mounts or character/user changes
  useEffect(() => {
    loadUnlockedImages()
  }, [loadUnlockedImages])

  // Determine if image browsing should be enabled (3-4 unlocked images)
  const shouldEnableImageBrowsing = unlockedImages.length >= 3 && unlockedImages.length <= 4

  // Load gallery images (all images for this character)
  const loadGalleryImages = useCallback(async () => {
    if (!characterId) return

    try {
      // Fetch user-generated images
      const userResponse = await fetch(`/api/character-gallery?characterId=${characterId}`)
      const userData = userResponse.ok ? await userResponse.json() : { images: [] }

      // Fetch admin gallery content
      const adminResponse = await fetch(`/api/admin/character-content?characterId=${characterId}`)
      const adminData = adminResponse.ok ? await adminResponse.json() : { content: [] }

      // Filter admin content for gallery tab and format to match user images
      const adminGalleryImages = (adminData.content || [])
        .filter((item: any) => item.tab_type === 'gallery')
        .map((item: any) => ({
          id: item.id,
          image_url: item.image_url,
          character_id: item.character_id,
          created_at: item.created_at,
          is_admin_content: true
        }))

      // Merge and sort by created_at
      const allImages = [...(userData.images || []), ...adminGalleryImages]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setGalleryImages(allImages)
    } catch (error) {
      console.error("Failed to load gallery images:", error)
    }
  }, [characterId])

  // Check if user has unlocked the gallery
  const checkGalleryUnlock = useCallback(async () => {
    if (!userId || !characterId) return

    setIsCheckingGalleryUnlock(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("gallery_unlocks")
        .select("id")
        .eq("user_id", userId)
        .eq("character_id", characterId)
        .single()

      setIsGalleryUnlocked(!!data && !error)
    } catch (error) {
      console.error("Failed to check gallery unlock:", error)
      setIsGalleryUnlocked(false)
    } finally {
      setIsCheckingGalleryUnlock(false)
    }
  }, [userId, characterId])

  // Load gallery images and check unlock status
  useEffect(() => {
    loadGalleryImages()
    checkGalleryUnlock()
  }, [loadGalleryImages, checkGalleryUnlock])

  // Function to unlock gallery
  const handleUnlockGallery = async () => {
    if (!userId || !characterId || isUnlockingGallery) return

    setIsUnlockingGallery(true)
    try {
      const response = await fetch("/api/unlock-gallery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          characterId: characterId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.insufficientTokens) {
          setTokenBalanceInfo({
            currentBalance: data.currentBalance || 0,
            requiredTokens: data.requiredTokens || 1000
          })
          setShowInsufficientTokens(true)
          return
        }
        throw new Error(data.error || "Failed to unlock gallery")
      }

      // Update states
      setIsGalleryUnlocked(true)
      if (data.newBalance !== undefined) {
        setTokenBalance(data.newBalance)
      } else {
        // Reload token balance if not returned by API
        await loadTokenBalance()
      }

      // Show success message (optional)
      console.log("Gallery unlocked successfully!")
    } catch (error) {
      console.error("Failed to unlock gallery:", error)
    } finally {
      setIsUnlockingGallery(false)
    }
  }

  // Load token balance
  const loadTokenBalance = useCallback(async () => {
    if (!userId) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("user_tokens")
        .select("balance")
        .eq("user_id", userId)
        .single()

      if (!error && data) {
        setTokenBalance((data as any).balance || 0)
      }
    } catch (error) {
      console.error("Failed to load token balance:", error)
    }
  }, [userId])

  useEffect(() => {
    loadTokenBalance()
  }, [loadTokenBalance])

  // ... (Keep existing helper functions like generateSpeech, generateImage, handleSendMessage, etc.)
  // I will just copy them from the previous file content but ensuring they use the props/state correctly.

  // Note: For brevity in this thought process I am assuming I will copy the rest of the functions 
  // (clearImageCheckInterval, generateSpeech, playAudio, stopAudio, generateImage, handleSaveImage, handleSendMessage, handleClearChat, handleKeyPress)
  // unchanged except for references to user/character/messages which should be fine as they are in scope.
  // One change: handleSendMessage uses user?.id. We have userId prop. We can use that.

  // Function to clear any existing image check interval
  const clearImageCheckInterval = useCallback(() => {
    try {
      console.log("Clearing image check interval")
      if (imageCheckIntervalRef.current) {
        clearInterval(imageCheckIntervalRef.current)
        imageCheckIntervalRef.current = null
      }
    } catch (error) {
      console.error("Error clearing image check interval:", error)
    }
  }, [])

  // Function to generate speech for a message
  const generateSpeech = async (messageId: string, text: string) => {
    if (!isMounted || isGeneratingSpeech[messageId]) return

    // Check if user is premium before generating speech
    if (!isPremium) {
      setShowPremiumModal(true)
      return
    }

    // If we already have an audio URL for this message, play it
    if (audioUrls[messageId]) {
      playAudio(messageId, audioUrls[messageId])
      return
    }

    try {
      // Set loading state for this message
      setIsGeneratingSpeech((prev) => ({ ...prev, [messageId]: true }))

      console.log("Generating speech for message:", messageId)

      // Determine voice based on character category (same logic as VAPI)
      const characterCategory = (character?.category || '').toLowerCase()
      const isMale = characterCategory.includes('men') ||
        characterCategory.includes('male') ||
        characterCategory.includes('guy')

      // Use correct voice IDs: male voice for guys/men, female voice for girls/anime
      const voiceId = isMale ? "qBEOcMXNopS28FeaKF9t" : "M7baJQBjzMsrxxZ796H6"
      console.log(`TTS Voice selected: ${voiceId} for category: ${characterCategory}`)

      // Call the API to generate speech
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice: voiceId,
          language: "en-US",
          userId: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("Text-to-speech API error:", errorData)

        // Handle insufficient tokens
        if (errorData.insufficientTokens) {
          setShowInsufficientTokens(true)
          setTokenBalanceInfo({
            currentBalance: errorData.currentBalance || 0,
            requiredTokens: errorData.requiredTokens || 1
          })
          setIsGeneratingSpeech((prev) => ({ ...prev, [messageId]: false }))
          return
        }

        throw new Error(errorData.error || "Failed to generate speech")
      }

      const data = await response.json()

      // Check if we got the audio URL directly (runsync response)
      if (data.audioUrl) {
        console.log("Speech generation successful, audio URL:", data.audioUrl)
        setIsGeneratingSpeech((prev) => ({ ...prev, [messageId]: false }))
        setAudioUrls((prev) => ({ ...prev, [messageId]: data.audioUrl }))

        // Play the audio immediately
        playAudio(messageId, data.audioUrl)
        return
      }

      // If we got a task ID, poll for the result (async response)
      if (!data.taskId) {
        console.error("Missing audio URL or task ID in response:", data)
        throw new Error("Invalid response from text-to-speech API")
      }

      const taskId = data.taskId
      console.log("Speech generation started with task ID:", taskId)

      // Poll for the speech generation result
      const checkSpeechStatus = async () => {
        try {
          console.log("Checking speech status for task:", taskId)
          const statusResponse = await fetch(`/api/check-speech-task?taskId=${taskId}`)

          if (!statusResponse.ok) {
            const errorData = await statusResponse.json()
            console.error("Check speech status API error:", errorData)
            throw new Error(errorData.error || "Failed to check speech status")
          }

          const statusData = await statusResponse.json()
          console.log("Speech status check result:", statusData)

          if (statusData.status === "TASK_STATUS_SUCCEED" && statusData.audioUrl) {
            // Speech generation successful
            console.log("Speech generation successful, audio URL:", statusData.audioUrl)
            setIsGeneratingSpeech((prev) => ({ ...prev, [messageId]: false }))
            setAudioUrls((prev) => ({ ...prev, [messageId]: statusData.audioUrl }))

            // Play the audio
            playAudio(messageId, statusData.audioUrl)
          } else if (statusData.status === "TASK_STATUS_FAILED") {
            // Speech generation failed
            console.error("Speech generation failed")
            setIsGeneratingSpeech((prev) => ({ ...prev, [messageId]: false }))
          } else {
            // Still processing, check again after a delay
            console.log("Speech generation still processing, checking again in 1 second")
            setTimeout(checkSpeechStatus, 1000)
          }
        } catch (error) {
          console.error("Error checking speech status:", error)
          setIsGeneratingSpeech((prev) => ({ ...prev, [messageId]: false }))
        }
      }

      // Start checking the status
      checkSpeechStatus()
    } catch (error) {
      console.error("Error generating speech:", error)
      setIsGeneratingSpeech((prev) => ({ ...prev, [messageId]: false }))
    }
  }

  // Function to play audio
  const playAudio = (messageId: string, audioUrl: string) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }

      // Create a new audio element
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      // Set the currently playing message ID
      setCurrentlyPlayingMessageId(messageId)

      // Play the audio
      audio.play()

      // When the audio ends, reset the currently playing message ID
      audio.onended = () => {
        setCurrentlyPlayingMessageId(null)
      }

      // Handle errors
      audio.onerror = () => {
        console.error("Error playing audio")
        setCurrentlyPlayingMessageId(null)
      }
    } catch (error) {
      console.error("Error playing audio:", error)
      setCurrentlyPlayingMessageId(null)
    }
  }

  // Function to stop audio playback
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setCurrentlyPlayingMessageId(null)
    }
  }

  // Function to generate an image
  const generateImage = async (prompt: string) => {
    if (!isMounted) return

    try {
      // If already generating an image, don't start another one
      if (isGeneratingImage) {
        console.log("Already generating an image, ignoring request")
        return
      }

      // Clear any existing interval first
      clearImageCheckInterval()

      // Reset processing state
      isProcessingImageRef.current = false
      currentTaskIdRef.current = null

      setIsGeneratingImage(true)

      // Get the character's image URL
      const characterImageUrl = character?.image || "/placeholder.svg"

      // Add a loading message to the chat with visual indicator
      const loadingMessage: Message = {
        id: "image-loading-" + Date.now(),
        role: "assistant",
        content: "🎨 I'm preparing something very special for us... just for your eyes. Stay close, I'm almost ready. ❤️",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isGenerating: true, // Flag to show special UI
      }

      if (isMounted) {
        setMessages((prev) => [...prev, loadingMessage])
        // Save loading message to database (optional, maybe skip loading messages)
      }

      // Convert the image to base64
      console.log("Converting image to base64:", characterImageUrl)
      const base64Image = await imageUrlToBase64(characterImageUrl)

      if (!base64Image) {
        throw new Error("Failed to convert image to base64")
      }

      if (!isMounted) return

      console.log("Base64 conversion successful, length:", base64Image.length)

      // Use the new intelligent image generation API with hair color detection
      console.log("Using intelligent image generation with hair color detection")
      const response = await fetch("/api/generate-character-image-novita", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          characterImage: characterImageUrl,
          characterId: characterId,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        // Check if it's an insufficient tokens error
        if (response.status === 402 && responseData.insufficientTokens) {
          // Show insufficient tokens dialog and stop generation
          setTokenBalanceInfo({
            currentBalance: responseData.currentBalance || 0,
            requiredTokens: responseData.requiredTokens || 5
          })
          setShowInsufficientTokens(true)
          setIsGeneratingImage(false)
          return
        }

        throw new Error(responseData.error || "Failed to generate image")
      }

      if (!isMounted) return

      if (responseData.success && responseData.imageUrl) {
        // Image generation successful
        console.log("Image generation successful with face swap")
        setGeneratedImageUrl(responseData.imageUrl)
        setIsGeneratingImage(false)

        // Auto-save image to database with Cloudinary
        if (userId) {
          try {
            console.log("Auto-saving generated image to database with userId:", userId)
            const saveResponse = await fetch("/api/save-generated-image", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: prompt,
                imageUrl: responseData.imageUrl,
                modelUsed: "novita",
                characterId: characterId,
                userId: userId, // Pass the userId explicitly
              }),
            })

            if (saveResponse.ok) {
              console.log("Image auto-saved successfully")
              // Reload both unlocked and gallery images to show the new image
              loadUnlockedImages()
              loadGalleryImages()
            } else {
              const errorData = await saveResponse.json()
              console.error("Failed to auto-save image:", errorData)
            }
          } catch (saveError) {
            console.error("Error auto-saving image:", saveError)
          }
        }

        // Add the generated image to the chat (remove loading message first)
        const imageMessage: Message = {
          id: Math.random().toString(36).substring(2, 15),
          role: "assistant",
          content: "",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isImage: true,
          imageUrl: responseData.imageUrl,
        }

        setMessages((prev) => {
          // Remove the loading message and add the final image
          const filtered = prev.filter(msg => !msg.id.startsWith("image-loading-"))
          const updatedMessages = [...filtered, imageMessage]

          return updatedMessages
        })

        // Save image message to database
        if (userId) {
          saveMessage({
            content: imageMessage.content,
            role: "assistant",
            user_id: userId,
            character_id: characterId,
            is_image: true,
            image_url: responseData.imageUrl
          })
        }
      } else {
        throw new Error("No image was generated")
      }
    } catch (error) {
      console.error("Error generating image:", error)

      if (!isMounted) return

      setIsGeneratingImage(false)
      currentTaskIdRef.current = null
      isProcessingImageRef.current = false

      // Add error message to chat with retry option
      const errorMessage: Message = {
        id: Math.random().toString(36).substring(2, 15),
        role: "assistant",
        content: "Sorry, I couldn't generate that image. There was a technical issue with the image processing.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
        errorPrompt: prompt, // Store the prompt for retry
      }

      setMessages((prev) => {
        // Remove the loading message and add error
        const filtered = prev.filter(msg => !msg.id.startsWith("image-loading-"))
        const updatedMessages = [...filtered, errorMessage]

        return updatedMessages
      })

      // Save error message to database
      if (userId) {
        saveMessage({
          content: errorMessage.content,
          role: "assistant",
          user_id: userId,
          character_id: characterId,
          is_error: true,
          error_prompt: prompt
        })
      }
    }
  }

  const handleSaveImage = async (imageUrl: string) => {
    if (!userId) {
      // Handle case where user is not logged in
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/save-generated-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          imageUrl,
          characterId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save image")
      }

      // Optionally, show a success message
    } catch (error) {
      console.error("Error saving image:", error)
      // Optionally, show an error message
    } finally {
      setIsSaving(false)
    }
  }

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!isMounted) return

    // Prevent duplicate submissions using ref for immediate lock
    if (isSendingRef.current) return

    if (inputValue.trim() && !isLoading) {
      // Set locking ref immediately
      isSendingRef.current = true

      // Check if user is premium before allowing chat
      if (!isPremium && !isCheckingPremium) {
        setShowPremiumModal(true)
        isSendingRef.current = false
        return
      }

      // Reset any previous API key errors
      setApiKeyError(null)
      setDebugInfo((prev) => ({ ...prev, lastAction: "sendingMessage" }))

      // Check token balance before sending message
      if (userId) {
        try {
          console.log('🔵 [FRONTEND] Calling deduct-token API for user:', userId, 'character:', characterId)
          const response = await fetch("/api/deduct-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: userId, characterId: characterId }),
          })

          const data = await response.json()
          console.log('🔵 [FRONTEND] API Response:', {
            status: response.status,
            ok: response.ok,
            data: data
          })

          if (!response.ok) {
            if (data.insufficientTokens) {
              // Show insufficient tokens dialog and don't send message
              console.log('🔴 [FRONTEND] Insufficient tokens - showing dialog')
              setTokenBalanceInfo({
                currentBalance: data.currentBalance || 0,
                requiredTokens: data.requiredTokens || 1
              })
              setShowInsufficientTokens(true)
              isSendingRef.current = false
              return
            } else {
              console.error("🔴 [FRONTEND] Failed to deduct token:", data.error)
              isSendingRef.current = false
              return
            }
          }

          console.log('✅ [FRONTEND] Token deducted successfully! New balance:', data.newBalance)
          // Update the token balance in the UI
          setTokenBalance(data.newBalance)
        } catch (error) {
          console.error("🔴 [FRONTEND] Failed to check token balance:", error)
          isSendingRef.current = false
          return
        }
      } else {
        console.log('⚠️ [FRONTEND] No user logged in, skipping token deduction')
      }

      // Create new user message
      const newMessage: Message = {
        id: Math.random().toString(36).substring(2, 15),
        role: "user",
        content: inputValue,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }

      // Add user message to chat
      setMessages((prev) => [...prev, newMessage])
      setInputValue("")
      setIsLoading(true)

      try {
        // Save user message to database
        if (userId) {
          saveMessage({
            content: newMessage.content,
            role: "user",
            user_id: userId,
            character_id: characterId
          })
        }
        setDebugInfo((prev) => ({ ...prev, lastAction: "userMessageSaved" }))


        // Check if the user is asking for a video
        if (isAskingForVideo(newMessage.content)) {
          // For now, inform user about video generation
          setIsLoading(false)
          const videoInfoMessage: Message = {
            id: Math.random().toString(36).substring(2, 15),
            role: "assistant",
            content: "I'd love to make a video for you! 🎬 To generate videos, please go to the Generate page where you can create videos from images. Would you like me to create a photo first that you can then turn into a video?",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }
          setMessages((prev) => [...prev, videoInfoMessage])
          if (userId) {
            saveMessage({
              content: videoInfoMessage.content,
              role: "assistant",
              user_id: userId,
              character_id: characterId
            })
          }
          isSendingRef.current = false
          return
        }

        // Check if the user is asking for an image
        if (isAskingForImage(newMessage.content)) {
          // Extract the image prompt
          const imagePrompt = extractImagePrompt(newMessage.content)

          // Generate the image
          setIsLoading(false)
          await generateImage(imagePrompt)
          isSendingRef.current = false
          return
        }

        // Get system prompt from character
        const systemPrompt =
          character?.systemPrompt ||
          `You are ${character?.name}, a ${character?.age}-year-old ${character?.occupation}. ${character?.description}`

        // Send message to API
        const aiResponse = await sendChatMessage([...messages, newMessage], systemPrompt, language, characterId, userId)

        if (!isMounted) return

        // Check if the response indicates an API key error
        if (aiResponse.content.includes("trouble connecting") || aiResponse.content.includes("try again")) {
          setApiKeyError("There might be an issue with the API key. Please check your Novita API key configuration.")
        }

        // Create assistant message
        const assistantMessage = {
          id: aiResponse.id,
          role: "assistant" as const,
          content: aiResponse.content,
          // Overwrite timestamp with client's local time to match user's time
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isImage: aiResponse.isImage,
          imageUrl: aiResponse.imageUrl,
        }

        // Translate AI response if necessary
        if (language !== "en") {
          const translatedContent = await getTranslatedText(aiResponse.content, language)
          setTranslatedMessages(prev => ({
            ...prev,
            [assistantMessage.id]: translatedContent,
          }))
        }

        // Add AI response to chat
        setMessages((prev) => [...prev, assistantMessage])

        // Save assistant message to database
        if (userId) {
          saveMessage({
            content: assistantMessage.content,
            role: "assistant",
            user_id: userId,
            character_id: characterId,
            is_image: assistantMessage.isImage,
            image_url: assistantMessage.imageUrl
          })
        }
        setDebugInfo((prev) => ({ ...prev, lastAction: "aiMessageSaved" }))
      } catch (error) {
        console.error("Error sending message:", error)

        if (!isMounted) return

        setDebugInfo((prev) => ({ ...prev, lastError: error, lastAction: "sendMessageError" }))

        // Add error message
        const errorMessage: Message = {
          id: Math.random().toString(36).substring(2, 15),
          role: "assistant",
          content: "Sorry, I'm having trouble connecting right now. Please try again later.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }

        setMessages((prev) => [...prev, errorMessage])

        // Save error message to database
        if (userId) {
          saveMessage({
            content: errorMessage.content,
            role: "assistant",
            user_id: userId,
            character_id: characterId,
            is_error: true
          })
        }

        setApiKeyError("Failed to connect to the AI service. Please check your API key configuration.")
      } finally {
        if (isMounted) {
          setIsLoading(false)
          isSendingRef.current = false
        }
      }
    }
  }

  // Clear chat history
  const handleClearChat = async () => {
    if (!isMounted || !userId) return

    setIsClearingChat(true)
    setDebugInfo((prev) => ({ ...prev, lastAction: "clearingChat" }))

    try {
      const result = await clearChatHistory(userId, characterId)
      const success = result.success

      setDebugInfo((prev) => ({
        ...prev,
        lastAction: success ? "chatCleared" : "chatClearFailed",
      }))

      if (success) {
        const initialMessages: Message[] = []

        // Add video message as first message if character has a hover video (no text, just video)
        if (character?.videoUrl) {
          const videoMessage: Message = {
            id: "video-intro",
            role: "assistant",
            content: "",  // Empty content, just show the video
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            isImage: true,
            imageUrl: character.videoUrl,
            isVideo: true,
          }
          initialMessages.push(videoMessage)

          if (userId) {
            saveMessage({
              content: "",
              role: "assistant",
              user_id: userId,
              character_id: characterId,
              is_video: true,
              video_url: character.videoUrl
            })
          }
        }

        // Add text welcome message
        const welcomeMessage: Message = {
          id: "1",
          role: "assistant",
          content: `I've been waiting for you... I'm ${character.name}, and I'm so happy you're finally here with me. What should we do first? ❤️`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
        initialMessages.push(welcomeMessage)

        // Translate welcome message if necessary
        if (language !== "en") {
          const translatedContent = await getTranslatedText(welcomeMessage.content, language)
          setTranslatedMessages({ [welcomeMessage.id]: translatedContent })
        } else {
          setTranslatedMessages({})
        }

        setMessages(initialMessages)

        // Save welcome message to database
        if (userId) {
          saveMessage({
            content: welcomeMessage.content,
            role: "assistant",
            user_id: userId,
            character_id: characterId
          })
        }
      }
    } catch (error) {
      console.error("Error clearing chat:", error)
      setDebugInfo((prev) => ({ ...prev, lastError: error, lastAction: "clearChatError" }))
    } finally {
      if (isMounted) {
        setIsClearingChat(false)
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className={`flex flex-col md:flex-row h-full bg-background ${isMobile ? 'mobile-container' : ''}`}>
      {/* Middle - Chat Area */}
      <div className="flex-1 flex flex-col h-screen md:h-full min-w-0">
        {/* Chat Header */}
        <div className={`${isMobile ? 'h-12' : 'h-14 md:h-16'} border-b border-border flex items-center ${isMobile ? 'px-2' : 'px-3 md:px-4'} justify-between ${isMobile ? 'fixed top-0 left-0 right-0 bg-background z-50' : ''}`}>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className={`${isMobile ? 'mr-1' : 'mr-2'} text-muted-foreground hover:text-foreground`}
              onClick={() => router.back()}
            >
              <ChevronLeft className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </Button>
            <div className={`relative ${isMobile ? 'w-8 h-8 mr-2' : 'w-10 h-10 mr-3'}`}>
              {/* Use regular img tag for Cloudinary images */}
              <img
                src={
                  imageErrors["profile"]
                    ? "/placeholder.svg?height=40&width=40"
                    : character?.image || "/placeholder.svg?height=40&width=40"
                }
                alt={character?.name || "Character"}
                className="w-full h-full rounded-full object-cover"
                onError={() => handleImageError("profile")}
                loading="lazy"
              />
            </div>
            <div className="flex flex-col">
              <h4 className={`${isMobile ? 'text-sm' : 'font-medium'}`}>{character?.name ? character.name.split(" ") : t('messages.loading')}</h4>
              {!isMobile && (
                <span className="text-xs text-muted-foreground">
                  {messages.length > 0 ? messages[messages.length - 1].timestamp : t('pages.chatDetail.noMessagesYet')}
                </span>
              )}
            </div>
          </div>
          <div className={`flex items-center ${isMobile ? 'gap-1' : 'gap-2'}`}>
            <ClearChatDialog onConfirm={handleClearChat} isClearing={isClearingChat} />
            <WebCallDialog
              character={character}
              autoStart={true}
              isPremium={isPremium}
              onPremiumRequired={() => setShowPremiumModal(true)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowShareModal(true)}
              title={t('pages.chatDetail.title')}
            >
              <Share2 className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <div className={`flex-1 overflow-auto ${isMobile ? 'p-1 pb-24 pt-14' : 'p-2 md:p-4'} ${isMobile ? 'space-y-2' : 'space-y-3 md:space-y-4'}`}>
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {/* Render video messages without background */}
              {message.isVideo && message.imageUrl ? (
                <div className="w-full max-w-[160px] sm:max-w-[180px] md:max-w-[200px]">
                  <video
                    src={message.imageUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    preload="auto"
                    className="w-full h-auto rounded-2xl"
                    onError={(e) => {
                      console.error("Video error:", e)
                      handleImageError(message.id)
                    }}
                  />
                  {message.timestamp && (
                    <span className="text-xs text-muted-foreground mt-1 block">{message.timestamp}</span>
                  )}
                </div>
              ) : (
                <div
                  className={`${isMobile ? 'max-w-[90%]' : 'max-w-[85%] md:max-w-[70%]'} ${message.role === "user" ? "bg-[#252525] text-white" : "bg-[#252525] text-white"
                    } rounded-2xl ${isMobile ? 'p-2' : 'p-3'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {(translatedMessages[message.id] || message.content) && (
                        <p className={`${isMobile ? 'text-sm' : 'text-current'}`}>{translatedMessages[message.id] || message.content}</p>
                      )}

                      {/* Show improved loader for generating messages */}
                      {message.isGenerating && (
                        <div className="flex items-center gap-2 mt-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">{t('pages.chatDetail.processing')}</span>
                        </div>
                      )}

                      {/* Show Try Again button for error messages */}
                      {message.isError && message.errorPrompt && (
                        <div className="mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => generateImage(message.errorPrompt!)}
                            disabled={isGeneratingImage}
                          >
                            <ImageIcon className="h-3 w-3 mr-1" />
                            {t('pages.chatDetail.tryAgain')}
                          </Button>
                        </div>
                      )}
                    </div>
                    {message.role === "assistant" && (
                      <div className={`flex items-center ${isMobile ? 'gap-0.5 ml-1' : 'gap-1 ml-2'}`}>
                        {isGeneratingSpeech[message.id] ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`${isMobile ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'} text-muted-foreground`}
                            disabled
                          >
                            <div className="flex items-center space-x-0.5">
                              <div className={`${isMobile ? 'w-0.5 h-2' : 'w-0.5 h-3'} bg-current animate-pulse`} style={{ animationDelay: "0ms" }}></div>
                              <div className={`${isMobile ? 'w-0.5 h-2' : 'w-0.5 h-3'} bg-current animate-pulse`} style={{ animationDelay: "150ms" }}></div>
                              <div className={`${isMobile ? 'w-0.5 h-2' : 'w-0.5 h-3'} bg-current animate-pulse`} style={{ animationDelay: "300ms" }}></div>
                            </div>
                          </Button>
                        ) : currentlyPlayingMessageId === message.id ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`${isMobile ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'} text-primary hover:text-primary/80`}
                            onClick={stopAudio}
                            title="Stop audio"
                          >
                            <div className="flex items-center gap-0.5">
                              <div className={`${isMobile ? 'w-0.5 h-2' : 'w-0.5 h-3'} bg-current rounded-full animate-pulse`} style={{ animationDuration: '0.6s', animationDelay: '0ms' }}></div>
                              <div className={`${isMobile ? 'w-0.5 h-3' : 'w-0.5 h-4'} bg-current rounded-full animate-pulse`} style={{ animationDuration: '0.6s', animationDelay: '0.1s' }}></div>
                              <div className={`${isMobile ? 'w-0.5 h-4' : 'w-0.5 h-5'} bg-current rounded-full animate-pulse`} style={{ animationDuration: '0.6s', animationDelay: '0.2s' }}></div>
                              <div className={`${isMobile ? 'w-0.5 h-3' : 'w-0.5 h-4'} bg-current rounded-full animate-pulse`} style={{ animationDuration: '0.6s', animationDelay: '0.3s' }}></div>
                              <div className={`${isMobile ? 'w-0.5 h-2' : 'w-0.5 h-3'} bg-current rounded-full animate-pulse`} style={{ animationDuration: '0.6s', animationDelay: '0.4s' }}></div>
                            </div>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`${isMobile ? 'h-5 w-5 p-0' : 'h-6 w-6 p-0'} text-muted-foreground hover:text-foreground`}
                            onClick={() => generateSpeech(message.id, message.content)}
                          >
                            <Volume2 className={`${isMobile ? 'h-2 w-2' : 'h-3 w-3'}`} />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {message.isImage && message.imageUrl && (
                    <div className={`${isMobile ? 'mt-1' : 'mt-2'}`}>
                      {message.isVideo ? (
                        <div className={`relative w-full ${isMobile ? 'max-w-[280px]' : 'max-w-sm'} rounded-2xl overflow-hidden`}>
                          <video
                            src={message.imageUrl}
                            controls
                            autoPlay
                            loop
                            muted
                            preload="auto"
                            className="w-full rounded-2xl"
                            style={{ borderRadius: '1rem' }}
                            onError={(e) => {
                              console.error("Video error:", e)
                              handleImageError(message.id)
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className={`relative w-full aspect-[3/4] ${isMobile ? 'max-w-[280px]' : 'max-w-sm'} rounded-2xl overflow-hidden cursor-pointer`}
                          onClick={() => {
                            if (message.imageUrl) {
                              if (Array.isArray(message.imageUrl)) {
                                setSelectedImage(message.imageUrl)
                              } else {
                                setSelectedImage([message.imageUrl])
                              }
                              setIsModalOpen(true)
                            }
                          }}
                        >
                          <img
                            src={imageErrors[message.id] ? "/placeholder.svg" : message.imageUrl}
                            alt="Generated image"
                            className="w-full h-full object-cover object-top"
                            style={{ borderRadius: '1rem' }}
                            onError={() => handleImageError(message.id)}
                            loading="lazy"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground ${isMobile ? 'mt-0.5' : 'mt-1'} block`}>{message.timestamp}</span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[70%]'} bg-[#252525] text-white rounded-2xl ${isMobile ? 'p-2' : 'p-3'}`}>
                <div className="flex space-x-2" aria-label={t('pages.chatDetail.processing')}>
                  <div
                    className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-muted-foreground animate-bounce`}
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-muted-foreground animate-bounce`}
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-muted-foreground animate-bounce`}
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          {isGeneratingImage && (
            <div className="flex justify-start">
              <div className={`${isMobile ? 'max-w-[90%]' : 'max-w-[70%]'} bg-[#252525] text-white rounded-2xl ${isMobile ? 'p-2' : 'p-3'}`}>
                <div className="flex items-center space-x-2">
                  <div className={`w-full aspect-square ${isMobile ? 'max-w-[200px]' : 'max-w-xs'} rounded-2xl bg-gray-700 animate-pulse`}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {apiKeyError && (
          <div className={`${isMobile ? 'mx-2 p-2' : 'mx-4 p-3'} bg-destructive/20 border border-destructive text-destructive-foreground rounded-lg ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <p className={`${isMobile ? 'text-xs' : 'font-medium'}`}>{t('pages.chatDetail.apiKeyTitle')}</p>
            <p className={isMobile ? 'text-xs' : ''}>{apiKeyError || t('pages.chatDetail.apiKeyBody')}</p>
            <p className={`${isMobile ? 'mt-0.5 text-xs' : 'mt-1'}`}>{t('pages.chatDetail.apiKeyAdminHint')}</p>
          </div>
        )}

        {/* Chat Input */}
        <div className={`${isMobile ? 'fixed bottom-0 left-0 right-0 p-2 pb-6 z-[50] border-t border-border' : 'p-2 md:p-4 sticky bottom-0 z-10'} bg-background`}>
          <div className={`flex items-center ${isMobile ? 'gap-2 bg-card p-2 rounded-full border border-border' : 'gap-2 bg-card p-2 rounded-full border border-border'}`}>
            <Input
              placeholder={t('pages.chatDetail.inputPlaceholder')}
              className={`flex-1 min-w-0 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${isMobile ? 'text-sm h-10 px-3' : 'h-10 px-4'}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isLoading || isGeneratingImage}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`flex-shrink-0 rounded-full hover:bg-muted ${isMobile ? 'h-10 w-10' : 'h-10 w-10'}`}
                  title={t('pages.chatDetail.askForImagesTitle')}
                >
                  <ImageIcon className={`${isMobile ? 'h-5 w-5' : 'h-5 w-5'}`} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-[400px] overflow-y-auto w-64">
                {/* POSES SECTION */}
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">🔥 Poses</div>
                <DropdownMenuItem onClick={() => setInputValue("Show me a sexy selfie of you")}>📸 Sexy Selfie</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you topless, sitting down and looking sultry")}>👙 Topless</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me your pussy, legs spread wide")}>🍑 Pussy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you on all fours grabbing your naked ass from behind")}>🍑 Ass</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you having cowgirl sex, you on top, excited expression")}>🔥 Cowgirl</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you having doggy style sex on all fours")}>🔥 Doggy Style</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you performing oral sex")}>💋 Blowjob</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you having missionary sex with legs in the air")}>💕 Missionary</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you rubbing your pussy, masturbating")}>✨ Masturbation</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you inserting a dildo, focused on vagina")}>🔮 Dildo</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you tied up in bondage ropes, naked")}>⛓️ Bondage</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you giving a handjob from my POV")}>🤚 Handjob</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you with penis between your breasts, titfuck")}>💎 Boobjob</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you getting fucked in reverse cowgirl")}>🔄 Reverse Cowgirl</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you squirting, orgasm")}>💦 Squirting</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you kneeling with face covered in cum")}>💦 Cumshot</DropdownMenuItem>

                {/* ENVIRONMENTS SECTION */}
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 mt-2">🏠 Environments</div>
                <DropdownMenuItem onClick={() => setInputValue("Show me you naked in the bathroom, wet from shower")}>🚿 Bathroom</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in the shower, water running down your body")}>🚿 Shower</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you lying naked on the bed, bedroom setting")}>🛏️ Bedroom</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a sexy classroom setting, as a naughty student")}>🎓 Classroom</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a sexy office setting, as a naughty secretary")}>💼 Office</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a gym, wearing tight workout clothes")}>🏋️ Gym</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you at the beach, bikini, sandy and wet")}>🏖️ Beach</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you by the pool, wet swimsuit, sunbathing")}>🏊 Pool</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a hot tub, steamy and relaxed")}>🛁 Hot Tub</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in the kitchen, wearing just an apron")}>🍳 Kitchen</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a luxury hotel room, romantic setting")}>🏨 Hotel Room</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a car, backseat, intimate setting")}>🚗 Car Backseat</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a forest, outdoor nature setting")}>🌲 Forest</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you on a balcony, city view, nighttime")}>🌃 Balcony</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a changing room, trying on lingerie")}>👗 Changing Room</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a sauna, steamy and relaxed")}>♨️ Sauna</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a library, secret naughty moment")}>📚 Library</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a nightclub, party atmosphere")}>🎉 Nightclub</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a penthouse, luxury city view")}>🌆 Penthouse</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a yacht, ocean view, luxurious")}>🛥️ Yacht</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a private jet, mile high club")}>✈️ Private Jet</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a barn, countryside setting")}>🏡 Barn</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a locker room, after workout")}>🚿 Locker Room</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a rooftop, sunset, romantic")}>🌅 Rooftop</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a dorm room, college setting")}>🎒 Dorm Room</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a spa, relaxed and pampered")}>💆 Spa</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a studio, modeling photoshoot")}>📷 Photo Studio</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you camping, outdoor tent setting")}>⛺ Camping</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a bar, after hours, seductive")}>🍸 Bar</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a treehouse, natural and secluded")}>🌳 Treehouse</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a castle, medieval fantasy setting")}>🏰 Castle</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a Japanese onsen, hot spring bath")}>♨️ Onsen</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in an elevator, risky public setting")}>🛗 Elevator</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a massage parlor, on the table")}>💆 Massage Table</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInputValue("Show me you in a tropical resort, paradise setting")}>🌴 Tropical Resort</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="icon"
              className={`flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full ${isMobile ? 'h-10 w-10' : 'h-10 w-10'}`}
              onClick={handleSendMessage}
              disabled={isLoading || isGeneratingImage || !inputValue.trim()}
            >
              <Send className={`${isMobile ? 'h-5 w-5' : 'h-5 w-5'}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Profile */}
      <div className={`hidden lg:block lg:w-80 border-l border-border ${isMobile ? 'mobile-container' : ''}`}>
        <div className="h-full overflow-auto">
          {/* Token Balance Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-background">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span className="text-lg font-bold">{tokenBalance}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => router.push("/premium")}
            >
              {t('pages.chatDetail.getMoreTokens')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <span className="text-xl">🌐</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Profile</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Profile Images Carousel */}
          <div className="relative aspect-square">
            {showVideo ? (
              <div className="w-full h-full relative bg-black">
                {character?.videoUrl ? (
                  <>
                    <video
                      key={character.videoUrl}
                      src={character.videoUrl}
                      className="w-full h-full object-cover object-top"
                      style={{ objectPosition: 'center 20%' }}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      poster={character.image}
                      onError={(e) => {
                        console.error("Video error:", e)
                        alert("Error loading video. See console for details.")
                      }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-black/20">
                    <p className={`text-white bg-black/50 ${isMobile ? 'p-1 text-xs' : 'p-2'} rounded`}>{t('pages.chatDetail.noVideo')}</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Use regular img tag for Cloudinary images */}
                <img
                  src={
                    isBrowsingImages && unlockedImages.length > 0
                      ? (imageErrors[unlockedImages[currentImageIndex]?.id] ? "/placeholder.svg" : unlockedImages[currentImageIndex]?.image_url || "/placeholder.svg")
                      : (imageErrors["profile"] ? "/placeholder.svg" : character?.image || "/placeholder.svg")
                  }
                  alt={
                    isBrowsingImages && unlockedImages.length > 0
                      ? "Unlocked image"
                      : (character?.name || "Character")
                  }
                  className="w-full h-full object-cover object-top"
                  onError={() => handleImageError(isBrowsingImages && unlockedImages.length > 0 ? unlockedImages[currentImageIndex]?.id : "profile")}
                  loading="lazy"
                />
              </>
            )}

            {/* Navigation Arrows - ALWAYS VISIBLE */}
            <button
              className={`absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full transition-colors z-20`}
              onClick={() => {
                if (showVideo) {
                  // Close video and go back to images
                  setShowVideo(false)
                } else if (shouldEnableImageBrowsing && isBrowsingImages) {
                  // If browsing images, go to previous image
                  setCurrentImageIndex((prev) => (prev - 1 + unlockedImages.length) % unlockedImages.length)
                } else if (isBrowsingImages) {
                  // Go to previous image even without shouldEnableImageBrowsing
                  setCurrentImageIndex((prev) => Math.max(0, prev - 1))
                }
              }}
              title="Previous"
            >
              <ChevronLeft className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </button>
            <button
              className={`absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 ${isMobile ? 'p-1.5' : 'p-2'} rounded-full transition-colors z-20`}
              onClick={() => {
                if (showVideo) {
                  // Close video and go back to images
                  setShowVideo(false)
                } else if (shouldEnableImageBrowsing) {
                  // If we have unlocked images, start browsing
                  if (!isBrowsingImages) {
                    setIsBrowsingImages(true)
                    setCurrentImageIndex(0)
                  } else {
                    // Go to next image
                    setCurrentImageIndex((prev) => (prev + 1) % unlockedImages.length)
                  }
                } else if (character?.videoUrl) {
                  // Show video if available
                  setShowVideo(true)
                }
              }}
              title="Next"
            >
              <ChevronRight className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
            </button>

            {/* Dot Indicators */}
            {shouldEnableImageBrowsing && isBrowsingImages && (
              <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex ${isMobile ? 'gap-0.5' : 'gap-1'} z-10`}>
                {unlockedImages.map((_, index) => (
                  <div
                    key={index}
                    className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                  ></div>
                ))}
              </div>
            )}
            {!isBrowsingImages && !showVideo && (
              <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex ${isMobile ? 'gap-0.5' : 'gap-1'} z-10`}>
                <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-white`}></div>
                <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-white/50`}></div>
                <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-white/50`}></div>
                <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-white/50`}></div>
                <div className={`${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-white/50`}></div>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className={`${isMobile ? 'p-3' : 'p-4'}`}>
            <h4 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold ${isMobile ? 'mb-0.5' : 'mb-1'}`}>{character?.name}</h4>
            <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground ${isMobile ? 'mb-3' : 'mb-4'}`}>{character?.description}</p>

            {/* Gallery and Unlocked Tabs */}
            <div className="mb-4">
              <div className="flex border-b border-border">
                <button
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "gallery"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                  onClick={() => setActiveTab("gallery")}
                >
                  {t('pages.chatDetail.galleryTab')}
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === "unlocked"
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                  onClick={() => setActiveTab("unlocked")}
                >
                  {t('pages.chatDetail.unlockedTab')}
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {activeTab === "gallery" && (
                  <div>
                    {isCheckingGalleryUnlock ? (
                      <GallerySkeleton count={4} className="grid-cols-2" />
                    ) : !isGalleryUnlocked ? (
                      <>
                        <div className="mb-4">
                          <Button
                            variant="outline"
                            className="w-full bg-primary/10 text-primary border-primary hover:bg-primary/20 flex items-center gap-2"
                            onClick={handleUnlockGallery}
                            disabled={isUnlockingGallery}
                          >
                            {isUnlockingGallery ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{t('pages.chatDetail.unlocking')}</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="h-4 w-4" />
                                <span className="flex items-center gap-1">
                                  <span className="text-lg">⚡</span> 1,000
                                </span>
                                <span>{t('pages.chatDetail.unlockGallery')}</span>
                              </>
                            )}
                          </Button>
                        </div>
                        {galleryImages.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {galleryImages.slice(0, 8).map((img) => (
                              <div
                                key={img.id}
                                className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                              >
                                <img
                                  src={img.image_url}
                                  alt="Locked"
                                  className="w-full h-full object-cover"
                                  style={{ filter: "blur(12px)" }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = "/placeholder.svg"
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <div className="text-white text-2xl">🔒</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('pages.chatDetail.noGalleryImages')}</p>
                            <p className="text-xs mt-1">
                              {t('pages.chatDetail.galleryHint')}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        {galleryImages.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2">
                            {galleryImages.map((img) => (
                              <div
                                key={img.id}
                                className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => {
                                  setSelectedImage([img.image_url])
                                  setIsModalOpen(true)
                                }}
                              >
                                <img
                                  src={img.image_url}
                                  alt="Gallery"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement
                                    target.src = "/placeholder.svg"
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{t('pages.chatDetail.noGalleryImages')}</p>
                            <p className="text-xs mt-1">
                              {t('pages.chatDetail.galleryHint')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "unlocked" && (
                  <div>
                    {isLoadingImages ? (
                      <GallerySkeleton count={4} className="grid-cols-2" />
                    ) : unlockedImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {unlockedImages.map((img) => (
                          <div
                            key={img.id}
                            className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setSelectedImage([img.image_url])
                              setIsModalOpen(true)
                            }}
                          >
                            <img
                              src={img.image_url}
                              alt="Unlocked"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg"
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">{t('pages.chatDetail.noUnlockedImages')}</p>
                        <p className="text-xs mt-1">
                          {t('pages.chatDetail.unlockedHint')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <DebugPanel
        characterId={characterId}
        chatId={characterId}
        handleClearChat={handleClearChat}
        handleResetCharacter={() => { }}
        isOpen={false}
      />
      <SupabaseDebug />
      {selectedImage && selectedImage.length > 0 && (
        <ImageModal
          images={selectedImage}
          initialIndex={0}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          onDownload={() => { }}
          onShare={() => { }}
        />
      )}

      <InsufficientTokensDialog
        open={showInsufficientTokens}
        onOpenChange={setShowInsufficientTokens}
        currentBalance={tokenBalanceInfo.currentBalance}
        requiredTokens={tokenBalanceInfo.requiredTokens}
      />

      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        feature={t('pages.chatDetail.premiumFeatureTitle')}
        description={t('pages.chatDetail.premiumFeatureDescription')}
        imageSrc={character?.image || "/placeholder.svg"}
      />

      <ShareChatModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        characterId={characterId}
        characterName={character?.name || "Character"}
        messages={messages}
      />
    </div>
  )
}

function ProfileDetail({ icon, label, value }: { icon: string; label: string; value: string }) {
  const isMobile = useIsMobile()

  return (
    <div className={`bg-card ${isMobile ? 'p-2' : 'p-3'} rounded-xl`}>
      <div className={`flex items-center ${isMobile ? 'gap-1 mb-0.5' : 'gap-2 mb-1'}`}>
        <span className={isMobile ? 'text-sm' : ''}>{icon}</span>
        <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>{label}</span>
      </div>
      <div className={`${isMobile ? 'text-xs' : 'text-sm'}`}>{value}</div>
    </div>
  )
}
