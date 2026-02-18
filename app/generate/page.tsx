"use client"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Wand2, Loader2, Download, Share2, AlertCircle, ChevronLeft, FolderOpen, Clock, Video, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { ImageModal } from "@/components/image-modal"
import { useAuth } from "@/components/auth-context"
import { useSidebar } from "@/components/sidebar-context"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  getImageSuggestions,
  getImageSuggestionsByCategory,
  type ImageSuggestion,
} from "@/app/actions/image-suggestions"
import { ThemeToggle } from "@/components/theme-toggle"
import { InsufficientTokensDialog } from "@/components/insufficient-tokens-dialog"
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLanguage } from "@/components/language-context"

// Remove the static imageOptions array and replace with dynamic calculation
// Get selected option for token calculation - move this logic up and make it dynamic
const imageOptions = [
  { value: "1", label: "1", tokens: 5 },
  { value: "4", label: "4", tokens: 20 },
  { value: "8", label: "8", tokens: 40 },
  { value: "16", label: "16", tokens: 80 },
  { value: "32", label: "32", tokens: 160 },
]

export default function GenerateImagePage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const { setIsOpen } = useSidebar()
  const isMobile = useIsMobile()
  const [prompt, setPrompt] = useState("")
  const [negativePrompt, setNegativePrompt] = useState("")
  const [showNegativePrompt, setShowNegativePrompt] = useState(false)
  const [selectedCount, setSelectedCount] = useState("1")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState("")
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [savingImageIndex, setSavingImageIndex] = useState<number | null>(null)
  // const [autoSaving, setAutoSaving] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [timeoutWarning, setTimeoutWarning] = useState(false)
  const [showInsufficientTokens, setShowInsufficientTokens] = useState(false)
  const [tokenBalanceInfo, setTokenBalanceInfo] = useState({
    currentBalance: 0,
    requiredTokens: 5
  })
  const [isPremium, setIsPremium] = useState(false)
  const [isCheckingPremium, setIsCheckingPremium] = useState(true)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  // Video generation states
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [userImages, setUserImages] = useState<any[]>([])
  const [selectedImageForVideo, setSelectedImageForVideo] = useState<string | null>(null)
  const [isLoadingUserImages, setIsLoadingUserImages] = useState(false)
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null)
  const videoStatusCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const [showImageSelectionModal, setShowImageSelectionModal] = useState(false)

  // Helper function to get valid image src
  const getValidImageSrc = (src: string | null | undefined, fallback: string): string => {
    if (typeof src === "string" && src.trim() !== "") {
      return src
    }
    return fallback
  }

  // Check premium status
  useEffect(() => {
    async function checkPremiumStatus() {
      if (!user?.id) {
        console.log("No user ID, setting as free user")
        setIsPremium(false)
        setIsCheckingPremium(false)
        return
      }

      try {
        console.log("Checking premium status for user:", user.id)

        // Get authentication headers
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        let headers: HeadersInit = {
          "Content-Type": "application/json",
        }

        // Try to get access token, with fallback to user ID
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`
        } else {
          // Fallback to user ID header
          headers["X-User-ID"] = user.id
        }

        const response = await fetch(`/api/user-premium-status?userId=${user.id}`, {
          headers
        })

        if (response.ok) {
          const data = await response.json()
          console.log("Premium status response:", data)
          setIsPremium(data.isPremium || false)
          console.log("User is premium:", data.isPremium || false)
        } else {
          console.error("Premium status check failed:", response.status)
          // If the check fails, assume free user
          setIsPremium(false)
        }
      } catch (error) {
        console.error("Failed to check premium status:", error)
        // If error occurs, assume free user
        setIsPremium(false)
      } finally {
        setIsCheckingPremium(false)
      }
    }

    checkPremiumStatus()
  }, [user?.id])

  // Automatically close the sidebar on component mount
  useEffect(() => {
    setIsOpen(false)
  }, [setIsOpen])

  // Check URL parameters and sessionStorage for auto-switching to video mode and selecting image
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');

    if (mode === 'video') {
      setMediaType('video');

      // Check sessionStorage for image URL (avoids URL length issues)
      const storedImageUrl = sessionStorage.getItem('videoImageUrl');
      if (storedImageUrl) {
        setSelectedImageForVideo(storedImageUrl);
        // Clear from sessionStorage after using
        sessionStorage.removeItem('videoImageUrl');
      }
    }
  }, [])

  // Fetch user's images when switching to video mode
  useEffect(() => {
    if (mediaType === 'video' && user) {
      fetchUserImages()
    }
  }, [mediaType, user])

  const fetchUserImages = async () => {
    setIsLoadingUserImages(true)
    try {
      const response = await fetch('/api/generated-images')
      if (response.ok) {
        const data = await response.json()
        // Filter only images (not videos)
        const images = (data.images || []).filter((img: any) =>
          !img.media_type || img.media_type === 'image'
        )
        setUserImages(images)
      }
    } catch (error) {
      console.error('Error fetching user images:', error)
    } finally {
      setIsLoadingUserImages(false)
    }
  }

  // Fetch suggestions on component mount
  useEffect(() => {
    async function loadSuggestions() {
      setIsLoadingSuggestions(true)
      try {
        const data = await getImageSuggestions()
        setSuggestions(data)

        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.map((item) => item.category)))
        setCategories(uniqueCategories)

        // Set default active category if available
        if (uniqueCategories.length > 0) {
          setActiveCategory(uniqueCategories[0])
        }
      } catch (error) {
        console.error("Error loading suggestions:", error)
        toast({
          title: "Error",
          description: "Failed to load suggestions. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingSuggestions(false)
      }
    }

    loadSuggestions()
  }, [toast])

  // Handle category change
  const handleCategoryChange = async (category: string) => {
    setActiveCategory(category)
    setIsLoadingSuggestions(true)

    try {
      const data = await getImageSuggestionsByCategory(category)
      setSuggestions(data)
    } catch (error) {
      console.error("Error loading suggestions for category:", error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current)
      }
      if (videoStatusCheckInterval.current) {
        clearInterval(videoStatusCheckInterval.current)
      }
    }
  }, [])

  // Progress simulation for better UX
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null

    if (isGenerating) {
      setGenerationProgress(0)
      setTimeoutWarning(false)

      progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 90) {
            // Show timeout warning after 20 seconds
            if (prev >= 95) {
              setTimeoutWarning(true)
            }
            return prev + 0.5 // Slow down near the end
          }
          return prev + Math.random() * 3 + 1 // Random progress increments
        })
      }, 1000)
    } else {
      setGenerationProgress(0)
      setTimeoutWarning(false)
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [isGenerating])

  // Auto-save generated images when they're ready (no loader, just save silently, and avoid infinite loop)
  const savedImagesRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (generatedImages.length > 0 && user) {
      generatedImages.forEach((imageUrl) => {
        if (!savedImagesRef.current.has(imageUrl)) {
          savedImagesRef.current.add(imageUrl)
          saveImageToCollection(imageUrl, -1, false)
        }
      })
    }
    // Reset the ref if all images are cleared
    if (generatedImages.length === 0) {
      savedImagesRef.current.clear()
    }
  }, [generatedImages, user])

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index)
    setIsModalOpen(true)
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please enter a description for the image you want to generate.",
        variant: "destructive",
      })
      return
    }

    // Check if user is logged in
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to generate and save images",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    // Check token balance before generation
    const selectedOption = imageOptions.find((option) => option.value === selectedCount)
    const tokensRequired = selectedOption?.tokens || 5

    try {
      const response = await fetch("/api/deduct-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          amount: tokensRequired,
          description: "Image generation",
          type: "image_generation"
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.insufficientTokens) {
          // Show insufficient tokens dialog and don't start generation
          setTokenBalanceInfo({
            currentBalance: data.currentBalance || 0,
            requiredTokens: data.requiredTokens || tokensRequired
          })
          setShowInsufficientTokens(true)
          return
        } else {
          console.error("Failed to deduct tokens:", data.error)
          toast({
            title: "Error",
            description: data.error || "Failed to check token balance",
            variant: "destructive",
          })
          return
        }
      }
    } catch (error) {
      console.error("Failed to check token balance:", error)
      toast({
        title: "Error",
        description: "Failed to check token balance. Please try again.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedImages([])
    setGenerationProgress(0)
    setTimeoutWarning(false)

    try {
      let response: Response
      let endpoint: string
      let requestBody: any

      // Always use Seedream 3.0 API now
      endpoint = "/api/generate-image"
      requestBody = {
        prompt,
        negativePrompt,
        model: "stability",
        response_format: "url",
        size: "512x1024",
        seed: -1,
        guidance_scale: 7.5,
        watermark: true,
        selectedCount, // Send the number of images selected
        selectedModel: "stability", // Send the model type for token calculation
      }

      // Create AbortController for timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        setError("Request timed out. Please try again with a simpler prompt or fewer images.")
        setIsGenerating(false)
      }, 45000) // 45 second timeout on frontend

      try {
        // Get the current session token for authentication
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        let accessToken = session?.access_token

        // If we don't have a token, try a refresh, but don't treat it as a hard error if it fails.
        if (!accessToken) {
          console.log("🔄 No access token found, attempting to refresh session...")
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshData?.session) {
            accessToken = refreshData.session.access_token
            console.log("✅ Session refreshed successfully")
          } else if (refreshError) {
            console.warn("⚠️ Session refresh failed:", refreshError.message)
          }
        }

        // Now, decide which auth method to use
        if (accessToken) {
          console.log("✅ Using access token for authentication.")
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          })
        } else if (user?.id) {
          console.log("🔄 No access token, falling back to User ID.")
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-User-ID": user.id,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          })
        } else {
          // If we have no token and no user ID, then we are truly unauthenticated.
          throw new Error("Unable to authenticate. Please log out and log in again.")
        }

        clearTimeout(timeoutId) // Clear timeout since fetch completed
      } catch (fetchError) {
        clearTimeout(timeoutId) // Also clear on error
        if (fetchError && typeof fetchError === "object" && "name" in fetchError && fetchError.name === "AbortError") {
          setError("Request timed out. The image generation is taking longer than expected. Please try again.")
        } else {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "An unexpected network error occurred.",
          )
        }
        setIsGenerating(false)
        return
      }

      // Enhanced error handling for non-JSON responses
      let data
      try {
        // First check if the response is ok
        if (!response.ok) {
          // Handle specific status codes
          if (response.status === 408 || response.status === 504) {
            setError("Request timed out. Please try again with a simpler prompt or fewer images.")
            setIsGenerating(false)
            return
          }

          // Try to get error message from response
          let errorMessage = `Request failed with status ${response.status}`
          try {
            const errorText = await response.text()
            // Try to parse as JSON first
            try {
              const errorJson = JSON.parse(errorText)
              errorMessage = errorJson.error || errorJson.message || errorMessage

              // Handle premium restriction error
              if (response.status === 403 && errorJson.upgradeUrl) {
                setError(errorMessage)
                setIsGenerating(false)
                toast({
                  title: "Premium Feature",
                  description: errorMessage,
                  variant: "destructive",
                  duration: 8000
                })
                return
              }
            } catch {
              // If not JSON, use the text if it's reasonable length
              if (errorText && errorText.length < 200 && !errorText.includes("<html>")) {
                errorMessage = errorText
              }
            }
          } catch {
            // Fallback to status text
            errorMessage = response.statusText || errorMessage
          }
          throw new Error(errorMessage)
        }

        // Try to parse successful response as JSON
        const responseText = await response.text()
        if (!responseText) {
          throw new Error("Empty response from server")
        }

        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", responseText)
          throw new Error("Invalid response format from server")
        }
      } catch (error) {
        console.error("Error processing response:", error)
        setError(
          typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to process the server response.",
        )
        setIsGenerating(false)
        return
      }

      console.log("Received data from /api/generate-image:", JSON.stringify(data, null, 2));
      console.log("✅ Images received immediately:", data.images);
      
      // THIS IS THE FIX - Handle direct image response (ModelsLab sync)
      if (data.status === "TASK_STATUS_SUCCEED" && data.images && Array.isArray(data.images)) {
        console.log("🖼️ Setting images to state:", data.images);
        setGeneratedImages(data.images);
        setGenerationProgress(100);
        setIsGenerating(false);
        toast({
          title: "Success!",
          description: `Your image${data.images.length > 1 ? "s have" : " has"} been generated.`,
        });
      }
      // Handle task ID response (async)
      else if (data.task_id) {
        console.log("⏳ Starting status check for task:", data.task_id);
        setCurrentTaskId(data.task_id);
        startStatusCheck(data.task_id);
      }
      // Error case
      else {
        console.error("❌ Unexpected response format:", data);
        throw new Error("No Task ID or direct images returned from the API.");
      }
    } catch (error) {
      console.error("Error generating image:", error)

      // Handle timeout errors specifically
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
        setError("Request timed out. Please try again with a simpler prompt or fewer images.")
      } else {
        // Check if the error response includes refund information
        let errorMessage = typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "An unexpected error occurred"

        // If tokens were refunded, add that information to the error message
        if (typeof error === "object" && error !== null && "refunded" in error && error.refunded) {
          errorMessage += " Your tokens have been refunded."
        }

        setError(errorMessage)
      }
      setIsGenerating(false)
    }
  }

  const startStatusCheck = (taskId: string) => {
    // Clear any existing interval
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current)
    }

    // Check status immediately, then start interval
    checkGenerationStatus(taskId)
    statusCheckInterval.current = setInterval(() => {
      checkGenerationStatus(taskId)
    }, 3000) // Check every 3 seconds
  }

  const checkGenerationStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/check-generation?taskId=${taskId}`)
      if (!response.ok) {
        // Stop polling on non-transient errors
        if (response.status >= 400 && response.status < 500) {
          if (statusCheckInterval.current) clearInterval(statusCheckInterval.current)
          setError("Failed to check generation status. Please try again.")
          setIsGenerating(false)
        }
        return // Continue polling on server errors
      }

      const result = await response.json()

      if (result.status === "TASK_STATUS_SUCCEED") {
        if (statusCheckInterval.current) clearInterval(statusCheckInterval.current)
        setGeneratedImages(result.images || [])
        setGenerationProgress(100)
        setIsGenerating(false)
        toast({
          title: "Success!",
          description: `Your image${(result.images?.length || 0) > 1 ? "s have" : " has"} been generated.`,
        })
      } else if (result.status === "TASK_STATUS_FAILED") {
        if (statusCheckInterval.current) clearInterval(statusCheckInterval.current)
        setError(result.reason || "Image generation failed. Please try again.")
        setIsGenerating(false)
      } else {
        // Update progress if available
        if (result.progress) {
          setGenerationProgress(result.progress)
        }
      }
    } catch (error) {
      console.error("Error checking status:", error)
      // Don't stop polling on network errors, just log them
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt((prev) => {
      const newPrompt = prev ? `${prev}, ${suggestion}` : suggestion
      return newPrompt
    })
  }

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `generated-image-${index + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading image:", error)
      toast({
        title: "Download failed",
        description: "Failed to download the image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleShare = async (imageUrl: string) => {
    const copyToClipboardFallback = (text: string) => {
      try {
        const textArea = document.createElement("textarea")
        textArea.value = text
        textArea.style.position = "fixed"
        textArea.style.opacity = "0"
        textArea.style.pointerEvents = "none"
        textArea.style.left = "0"
        textArea.style.top = "0"
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        const successful = document.execCommand('copy')
        if (successful) {
          toast({ title: "Image URL copied to clipboard" })
        } else {
          console.error('Fallback: Copy command was unsuccessful')
          toast({ title: "Failed to copy URL", variant: "destructive" })
        }

        document.body.removeChild(textArea)
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err)
        toast({ title: "Failed to copy URL", variant: "destructive" })
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(imageUrl)
        toast({ title: "Image URL copied to clipboard" })
      } else {
        copyToClipboardFallback(imageUrl)
      }
    } catch (err) {
      console.error("Failed to copy image URL using Clipboard API, trying fallback:", err)
      copyToClipboardFallback(imageUrl)
    }
  }

  const handleDownloadAll = async () => {
    try {
      for (let i = 0; i < generatedImages.length; i++) {
        await handleDownload(generatedImages[i], i)
        // Add a small delay between downloads to prevent browser issues
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error("Error downloading all images:", error)
      toast({
        title: "Download failed",
        description: "Failed to download all images. Please try again.",
        variant: "destructive",
      })
    }
  }

  const saveImageToCollection = async (imageUrl: string, index: number, showToast = true) => {
    try {
      if (index >= 0) {
        setSavingImageIndex(index)
      }

      // Call the save-generated-image API to upload to Cloudinary and save to database
      const response = await fetch("/api/save-generated-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          prompt: prompt,
          modelUsed: "stability",
          userId: user?.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save image")
      }

      // Check if image was already saved
      if (data.message === "Image already saved") {
        if (showToast) {
          toast({
            title: "Already saved",
            description: "This image is already in your collection.",
          })
        }
        return false
      }

      if (showToast) {
        toast({
          title: "Success",
          description: "Image saved to your collection with permanent URL",
        })
      }

      return true
    } catch (error) {
      console.error("Error saving image:", error)
      if (showToast) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to save image to collection",
          variant: "destructive",
        })
      }
      return false
    } finally {
      if (index >= 0) {
        setSavingImageIndex(null)
      }
    }
  }

  const viewCollection = () => {
    router.push("/collection")
  }

  // Video generation handlers
  const handleVideoGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the video animation.",
        variant: "destructive",
      })
      return
    }

    if (!selectedImageForVideo) {
      toast({
        title: "Image required",
        description: "Please select an image from your collection for video generation.",
        variant: "destructive",
      })
      return
    }

    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to generate videos",
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedVideo(null)
    setGenerationProgress(0)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      let accessToken = session?.access_token

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`
      } else if (user?.id) {
        headers["X-User-ID"] = user.id
      }

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers,
        body: JSON.stringify({
          image_url: selectedImageForVideo,
          prompt,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403) {
          setShowPremiumModal(true)
          setError(data.error)
        } else if (data.insufficientTokens) {
          setTokenBalanceInfo({
            currentBalance: data.currentBalance || 0,
            requiredTokens: 50
          })
          setShowInsufficientTokens(true)
        } else {
          setError(data.error || "Failed to start video generation")
        }
        setIsGenerating(false)
        return
      }

      if (data.job_id) {
        startVideoStatusCheck(data.job_id, data.provider, data.fetch_url, data.future_video_url)
      } else {
        throw new Error("No job ID received")
      }
    } catch (error) {
      console.error("Error generating video:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
      setIsGenerating(false)
    }
  }


  const startVideoStatusCheck = (jobId: string, provider?: string, fetchUrl?: string, futureVideoUrl?: string) => {
    if (videoStatusCheckInterval.current) {
      clearInterval(videoStatusCheckInterval.current)
    }
  
    checkVideoStatus(jobId, provider, fetchUrl, futureVideoUrl)
    videoStatusCheckInterval.current = setInterval(() => {
      checkVideoStatus(jobId, provider, fetchUrl, futureVideoUrl)
    }, 5000)
  }

  const checkVideoStatus = async (jobId: string, provider?: string, fetchUrl?: string, futureVideoUrl?: string) => {
    try {
      let url = `/api/check-video-generation?jobId=${jobId}`
      if (provider) {
        url += `&provider=${provider}`
      }
      if (fetchUrl) {
        url += `&fetch_url=${encodeURIComponent(fetchUrl)}`
      }
      if (futureVideoUrl) {
        url += `&future_video_url=${encodeURIComponent(futureVideoUrl)}`
      }
      
      const response = await fetch(url)
  
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          // Don't stop polling on 4xx, just log and continue
          console.error("Status check error:", response.status)
        }
        return
      }
  
      const result = await response.json()
  
      if (result.status === 'COMPLETED') {
        if (videoStatusCheckInterval.current) clearInterval(videoStatusCheckInterval.current)
  
        const videoData = result.video_url
        if (!videoData) {
          setError("No video URL received")
          setIsGenerating(false)
          return
        }
        setGeneratedVideo(videoData)
        setGenerationProgress(100)
        setIsGenerating(false)
  
        // Auto-save video
        if (user) {
          await saveVideoToCollection(videoData)
        }
  
        toast({
          title: "Success!",
          description: "Your video has been generated.",
        })
      } else if (result.status === 'FAILED') {
        if (videoStatusCheckInterval.current) clearInterval(videoStatusCheckInterval.current)
        setError(result.error || "Video generation failed")
        setIsGenerating(false)
      } else {
        if (result.progress) {
          setGenerationProgress(result.progress)
        }
      }
    } catch (error) {
      console.error("Error checking video status:", error)
    }
  }

  const saveVideoToCollection = async (videoData: string) => {
    try {
      await fetch("/api/save-generated-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoData,
          prompt,
          userId: user?.id,
        }),
      })
    } catch (error) {
      console.error("Error saving video:", error)
    }
  }

  const handleVideoDownload = () => {
    if (!generatedVideo) return

    const link = document.createElement('a')
    link.href = generatedVideo
    link.download = 'generated-video.mp4'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const selectedOption = imageOptions.find((option) => option.value === selectedCount)
  const tokensRequired = mediaType === 'video' ? 50 : (selectedOption?.tokens || 5)

  return (
    <div className={`flex flex-col ${isMobile ? 'min-h-screen' : 'lg:flex-row min-h-screen'} bg-background text-foreground`}>
      {/* Left Column - Generation Controls */}
      <div className={`w-full ${isMobile ? 'p-3 sm:p-4' : 'lg:w-1/2 p-6'} border-b lg:border-b-0 lg:border-r border-border overflow-y-auto`}>
        <div className={`flex justify-between items-center ${isMobile ? 'mb-3' : 'mb-6'}`}>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button variant="ghost" size="sm" className="mr-1 p-0 h-8 w-8" onClick={() => router.back()} aria-label="Go back">
              <ChevronLeft className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
            </Button>
            <Wand2 className={`${isMobile ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-6 w-6'}`} />
            <h1 className={`${isMobile ? 'text-lg sm:text-xl' : 'text-2xl'} font-bold truncate`}>
              {mediaType === 'image' ? t('pages.generate.title') : t('pages.generate.videoTitle')}
            </h1>
            {/* Debug: Show premium status */}
            {!isCheckingPremium && isPremium && (
              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                👑 Premium
              </span>
            )}
          </div>
          <ThemeToggle />
        </div>

        {/* Image/Video Toggle */}
        <div className={`${isMobile ? 'mb-3' : 'mb-6'}`}>
          <Tabs value={mediaType} onValueChange={(value) => setMediaType(value as 'image' | 'video')}>
            <TabsList className={`grid w-full grid-cols-2 bg-card border border-border ${isMobile ? 'h-9' : ''}`}>
              <TabsTrigger value="image" className={`flex items-center gap-2 ${isMobile ? 'text-xs px-1' : ''}`}>
                <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t('pages.generate.imageTab')}
              </TabsTrigger>
              <TabsTrigger value="video" className={`flex items-center gap-2 ${isMobile ? 'text-xs px-1' : ''}`}>
                <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                {t('pages.generate.videoTab')} {!isPremium && !isCheckingPremium && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full ml-1">{t('pages.generate.premium')}</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Video Mode: Image Selection */}
        {mediaType === 'video' && (
          <div className={`${isMobile ? 'mb-3' : 'mb-6'}`}>
            <h3 className={`${isMobile ? 'text-sm sm:text-base' : 'text-lg'} font-semibold mb-2 sm:mb-3`}>
              Select Image for Video
            </h3>
            {isLoadingUserImages ? (
              <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-2 sm:gap-3`}>
                {Array.from({ length: isMobile ? 2 : 3 }).map((_, i) => (
                  <div key={i} className={`aspect-square rounded-xl bg-muted animate-pulse ${isMobile ? 'h-20' : 'h-24'}`} />
                ))}
              </div>
            ) : userImages.length === 0 ? (
              <div className={`${isMobile ? 'p-3' : 'p-6'} border-2 border-dashed border-border rounded-xl text-center bg-card/50`}>
                <p className={`${isMobile ? 'text-xs' : ''} text-muted-foreground mb-3`}>
                  No images in your collection
                </p>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => setMediaType('image')}
                  className="w-full"
                >
                  Generate images first
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-2 sm:gap-3`}>
                  {userImages.slice(0, isMobile ? 2 : 3).map((img) => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImageForVideo(img.image_url)}
                      className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-200 ${selectedImageForVideo === img.image_url
                        ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-105'
                        : 'border-transparent hover:border-primary/50 hover:shadow-md hover:scale-102'
                        }`}
                    >
                      <Image
                        src={img.image_url}
                        alt="Your image"
                        width={150}
                        height={150}
                        className="w-full h-full object-cover object-top"
                        unoptimized
                      />
                      {selectedImageForVideo === img.image_url && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-1">
                            <svg className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} fill="currentColor" viewBox="0 0 16 16">
                              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {userImages.length > (isMobile ? 2 : 3) && (
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowImageSelectionModal(true)}
                      className={`${isMobile ? 'text-xs' : ''} text-muted-foreground hover:text-foreground`}
                    >
                      View all ({userImages.length}) images
                    </Button>
                  </div>
                )}

                {selectedImageForVideo && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-primary font-medium`}>
                      ✓ Image selected for video generation
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Prompt Input */}
        <div className={`relative ${isMobile ? 'mb-3' : 'mb-6'}`}>
          <div className={`absolute right-2 top-2 sm:right-3 sm:top-3 flex items-center gap-2 ${isMobile ? 'flex-col gap-1' : ''}`}>
            <Copy
              className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground cursor-pointer`}
              onClick={async () => {
                const copyToClipboardFallback = (text: string) => {
                  try {
                    const textArea = document.createElement("textarea")
                    textArea.value = text
                    textArea.style.position = "fixed"
                    textArea.style.opacity = "0"
                    textArea.style.pointerEvents = "none"
                    textArea.style.left = "0"
                    textArea.style.top = "0"
                    document.body.appendChild(textArea)
                    textArea.focus()
                    textArea.select()

                    const successful = document.execCommand('copy')
                    if (successful) {
                      toast({ title: "Copied to clipboard" })
                    } else {
                      console.error('Fallback: Copy command was unsuccessful')
                      toast({ title: "Failed to copy", variant: "destructive" })
                    }

                    document.body.removeChild(textArea)
                  } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err)
                    toast({ title: "Failed to copy", variant: "destructive" })
                  }
                }

                try {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(prompt)
                    toast({ title: "Copied to clipboard" })
                  } else {
                    copyToClipboardFallback(prompt)
                  }
                } catch (err) {
                  console.error("Failed to copy prompt using Clipboard API, trying fallback:", err)
                  copyToClipboardFallback(prompt)
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className={`${isMobile ? 'h-5 text-[10px] px-1.5' : 'h-8'} bg-transparent`}
              onClick={() => {
                if (navigator.clipboard && navigator.clipboard.readText) {
                  navigator.clipboard.readText().then((text) => {
                    setPrompt(text)
                    toast({ title: "Pasted from clipboard" })
                  }).catch(err => {
                    console.error("Failed to read clipboard:", err)
                    toast({ title: "Failed to paste", variant: "destructive" })
                  })
                } else {
                  toast({ title: "Clipboard access not supported", variant: "destructive" })
                }
              }}
            >
              Paste
            </Button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className={`w-full ${isMobile ? 'h-20 text-xs sm:text-sm' : 'h-32'} bg-card rounded-xl ${isMobile ? 'p-2' : 'p-4'} resize-none focus:outline-none focus:ring-2 focus:ring-primary border border-border placeholder:text-muted-foreground/70`}
            placeholder={mediaType === 'image'
              ? "Describe the image you want to generate..."
              : "Describe the video animation..."}
          />
        </div>

        {/* Show Negative Prompt - Only in image mode */}
        {mediaType === 'image' && (
          <div className={`${isMobile ? 'mb-3' : 'mb-6'}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNegativePrompt(!showNegativePrompt)}
              className={`text-muted-foreground hover:text-foreground ${isMobile ? 'text-xs h-7' : ''}`}
            >
              {showNegativePrompt ? "Hide Negative Prompt" : "Show Negative Prompt"}
            </Button>

            {/* Negative Prompt Input - Only shown when toggled */}
            {showNegativePrompt && (
              <div className={`${isMobile ? 'mt-1.5' : 'mt-3'}`}>
                <label htmlFor="negative-prompt" className={`block ${isMobile ? 'text-[10px]' : 'text-sm'} font-medium text-muted-foreground ${isMobile ? 'mb-1' : 'mb-2'}`}>
                  Negative Prompt (what to avoid in the image)
                </label>
                <textarea
                  id="negative-prompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className={`w-full ${isMobile ? 'h-14 text-xs p-2' : 'h-20 p-4 text-sm'} bg-card rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary border border-border`}
                  placeholder="Elements to exclude..."
                />
              </div>
            )}
          </div>
        )}

        {/* Suggestions */}
        <div className={`${isMobile ? 'mb-3' : 'mb-6'}`}>
          <h3 className={`${isMobile ? 'text-sm sm:text-base' : 'text-lg'} font-semibold ${isMobile ? 'mb-2' : 'mb-4'}`}>Suggestions</h3>
          {isLoadingSuggestions && categories.length === 0 ? (
            // Initial loading state
            <div className="space-y-4">
              <div className={`${isMobile ? 'mb-2 h-9' : 'mb-4 h-12'} bg-card border border-border rounded-lg w-full animate-pulse`} />
              <div className={`${isMobile ? 'flex overflow-x-auto gap-3 pb-2 w-full max-w-[calc(100vw-2rem)] scrollbar-hide' : 'grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 p-1 sm:p-2'}`}>
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className={`${isMobile ? 'w-24 flex-shrink-0' : 'w-full'} aspect-square rounded-lg bg-muted animate-pulse`} />
                ))}
              </div>
            </div>
          ) : categories.length > 0 ? (
            <Tabs defaultValue={categories[0]} value={activeCategory} onValueChange={handleCategoryChange} className="w-full max-w-full">
              <TabsList className={`${isMobile ? 'mb-2 p-0.5 w-full max-w-[calc(100vw-2rem)] overflow-x-auto flex-nowrap justify-start gap-1' : 'mb-4 p-1 flex-wrap'} bg-card border border-border rounded-lg h-auto flex`}>
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    className={`capitalize text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex-shrink-0 ${isMobile ? 'text-[10px] px-3 py-1.5 h-7' : ''}`}
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className={`${isMobile ? 'flex overflow-x-auto gap-3 pb-2 w-full max-w-[calc(100vw-2rem)] scrollbar-hide' : 'grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 p-1 sm:p-2'}`}>
                {isLoadingSuggestions
                  ? // Show loading placeholders
                  Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className={`${isMobile ? 'w-24 flex-shrink-0' : 'w-full'} aspect-square rounded-lg bg-muted animate-pulse`} />
                  ))
                  : // Show filtered suggestions
                  suggestions
                    .filter((suggestion) => suggestion.category === activeCategory && suggestion.is_active)
                    .map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={`${isMobile ? 'w-24 flex-shrink-0 flex flex-col gap-1' : 'relative aspect-square rounded-lg overflow-hidden group hover:ring-2 hover:ring-primary transition-all cursor-pointer min-w-0'}`}
                        onClick={() => handleSuggestionClick(suggestion.name)}
                      >
                        <div className={`aspect-square rounded-xl overflow-hidden ${isMobile ? '' : 'w-full h-full'}`}>
                          <Image
                            src={getValidImageSrc(
                              suggestion.image,
                              `/placeholder.svg?height=88&width=88&query=${encodeURIComponent(suggestion.name || "suggestion")}`,
                            )}
                            alt={suggestion.name}
                            width={88}
                            height={88}
                            className="w-full h-full object-cover transition-transform hover:scale-110"
                            unoptimized={true}
                            onError={(e) => {
                              // Fall back to a local placeholder with the suggestion name
                              e.currentTarget.src = `/placeholder.svg?height=88&width=88&query=${encodeURIComponent(suggestion.name || "suggestion")}`
                            }}
                          />
                        </div>
                        {isMobile ? (
                          <span className="text-[10px] font-medium text-center text-muted-foreground leading-tight line-clamp-2 px-0.5">
                            {suggestion.name}
                          </span>
                        ) : (
                          <div className="absolute inset-0 bg-black/40 flex items-end p-1.5 sm:p-2 rounded-lg">
                            <span className="text-xs sm:text-sm font-medium text-white leading-tight line-clamp-2">
                              {suggestion.name}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
              </div>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No suggestion categories available.</div>
          )}
        </div>

        {/* Number of Images - Only show in image mode */}
        {mediaType === 'image' && (
          <div className={`${isMobile ? 'mb-3' : 'mb-6'}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`${isMobile ? 'text-sm sm:text-base' : 'text-lg'} font-semibold`}>Number of Images</h3>
              {!isPremium && !isCheckingPremium && (
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  🆓 Free: 1 image only
                </span>
              )}
            </div>
            <div className={`flex flex-wrap ${isMobile ? 'gap-1.5' : 'gap-2 md:gap-4'}`}>
              {imageOptions.map((option) => {
                // Don't disable options while checking premium status
                const isDisabled = !isCheckingPremium && !isPremium && option.value !== "1"
                return (
                  <button
                    key={option.value}
                    onClick={() => !isDisabled && setSelectedCount(option.value)}
                    disabled={isDisabled}
                    className={`flex flex-col items-center gap-0.5 ${isMobile ? 'flex-1 px-1 py-1.5 min-w-[3.5rem]' : 'px-3 md:px-6 py-2 md:py-3'} rounded-lg transition-all relative ${selectedCount === option.value
                      ? "bg-primary text-primary-foreground"
                      : isDisabled
                        ? "bg-muted text-muted-foreground/50 cursor-not-allowed"
                        : "bg-card text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    <span className={`${isMobile ? 'text-sm' : 'text-base md:text-lg'} font-semibold`}>{option.label}</span>
                    <span className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}>{option.tokens} tokens</span>
                    {isDisabled && (
                      <span className="absolute top-0.5 right-0.5 text-[8px] bg-primary/20 text-primary px-1 py-0.5 rounded-full font-medium">
                        Premium
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {!isPremium && !isCheckingPremium && (
              <div className={`${isMobile ? 'mt-2 p-2' : 'mt-3 p-3'} bg-primary/10 border border-primary/20 rounded-lg`}>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground mb-1`}>
                  <span className="font-semibold">Want to generate multiple images?</span>
                </p>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mb-2`}>
                  Upgrade to Premium to generate 4, 8, 16, or 32 images at once!
                </p>
                <Button
                  size={isMobile ? "sm" : "default"}
                  variant="default"
                  className="w-full h-8 text-xs"
                  onClick={() => setShowPremiumModal(true)}
                >
                  Upgrade to Premium
                </Button>
              </div>
            )}
            <div className={`${isMobile ? 'mt-1 text-[10px]' : 'mt-2 text-sm'} text-muted-foreground`}>
              5 tokens per image
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`${isMobile ? 'mb-4 p-3' : 'mb-6 p-4'} bg-destructive/20 border border-destructive text-destructive-foreground rounded-lg flex items-center`}>
            <AlertCircle className={`${isMobile ? 'h-4 w-4 mr-2' : 'h-5 w-5 mr-2'}`} />
            <span className={`${isMobile ? 'text-sm' : ''}`}>{error}</span>
          </div>
        )}

        {/* Generate Button */}
        <div className="relative">
          <Button
            className={`w-full ${isMobile ? 'py-5 text-sm font-semibold' : 'py-6 text-lg'} bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20`}
            disabled={!prompt.trim() || isGenerating || (mediaType === 'video' && !selectedImageForVideo)}
            onClick={mediaType === 'image' ? handleGenerate : handleVideoGenerate}
          >
            {isGenerating ? (
              <>
                <Loader2 className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'} animate-spin`} />
                {mediaType === 'video' ? 'Generating...' : `Generating... ${Math.round(generationProgress)}%`}
              </>
            ) : (
              <>
                {mediaType === 'image' ? <Wand2 className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} /> : <Video className={`mr-2 ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />}
                Generate {mediaType === 'image' ? 'Image' : 'Video'} ({tokensRequired} tokens)
              </>
            )}
          </Button>
        </div>

        {/* View Collection Button - Hidden as requested */}
        {/* {generatedImages.length > 0 && (
          <div className={`${isMobile ? 'mt-4' : 'mt-6'}`}>
            <Button variant="outline" className={`w-full bg-transparent ${isMobile ? 'py-3 text-sm' : ''}`} onClick={viewCollection}>
              <FolderOpen className={`${isMobile ? 'h-4 w-4 mr-2' : 'h-5 w-5 mr-2'}`} />
              View Your Collection
            </Button>
          </div>
        )} */}
      </div>

      {/* Right Column - Generated Media */}
      <div className={`w-full ${isMobile ? 'p-3 sm:p-4' : 'lg:w-1/2 p-6'} overflow-y-auto`}>
        <div className={`flex justify-between items-center ${isMobile ? 'mb-3' : 'mb-6'}`}>
          <h2 className={`${isMobile ? 'text-lg sm:text-xl' : 'text-2xl'} font-bold`}>
            {mediaType === 'image' ? 'Generated Images' : 'Generated Video'}
          </h2>
          {generatedImages.length > 0 && (
            <div className={`flex ${isMobile ? 'gap-1' : 'gap-2'}`}>
              <Button variant="outline" size="sm" onClick={handleDownloadAll} className={isMobile ? 'h-7 text-[10px] px-2' : ''}>
                <Download className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push("/collections")} className={isMobile ? 'h-7 text-[10px] px-2' : ''}>
                <FolderOpen className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                Collection
              </Button>
            </div>
          )}
        </div>

        {isGenerating && (
          <div className={`flex flex-col items-center justify-center ${isMobile ? 'h-[50vh]' : 'h-[70vh]'} text-center`}>
            <div className={`bg-card ${isMobile ? 'p-6' : 'p-8'} rounded-xl mb-4`}>
              <Loader2 className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-4 text-primary animate-spin`} />
            </div>
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2`}>
              Generating {mediaType === 'image' ? 'Images' : 'Video'}...
            </h3>
            <p className={`text-muted-foreground ${isMobile ? 'max-w-sm text-sm' : 'max-w-md'} mb-4`}>
              This may take a few moments. We're creating your {mediaType} based on the prompt.
            </p>

            {/* Progress Bar - Only show for images */}
            {mediaType === 'image' && (
              <div className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'} mb-4`}>
                <div className={`flex justify-between ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground mb-2`}>
                  <span>Progress</span>
                  <span>{Math.round(generationProgress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Timeout Warning */}
            {timeoutWarning && (
              <div className={`${isMobile ? 'mt-3 p-2' : 'mt-4 p-3'} bg-yellow-900/20 border border-yellow-800 text-yellow-300 rounded-lg flex items-center ${isMobile ? 'max-w-sm' : 'max-w-md'}`}>
                <Clock className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                <span className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Hang tight! Your video is being created...</span>
              </div>
            )}
          </div>
        )}

        {!isGenerating && generatedImages.length === 0 && !generatedVideo && !error && (
          <div className={`flex flex-col items-center justify-center ${isMobile ? 'h-[50vh]' : 'h-[70vh]'} text-center`}>
            <div className={`bg-card ${isMobile ? 'p-6' : 'p-8'} rounded-xl mb-4`}>
              {mediaType === 'image' ? (
                <Wand2 className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-4 text-muted-foreground`} />
              ) : (
                <Video className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-4 text-muted-foreground`} />
              )}
            </div>
            <h3 className={`${isMobile ? 'text-base sm:text-lg' : 'text-xl'} font-semibold mb-2`}>
              No {mediaType === 'image' ? 'Images' : 'Video'} Generated Yet
            </h3>
            <p className={`text-muted-foreground ${isMobile ? 'max-w-[280px] text-xs sm:text-sm' : 'max-w-md'}`}>
              {mediaType === 'image'
                ? 'Enter a prompt and click the Generate button to create AI-generated images.'
                : 'Select an image, enter an animation prompt, and click Generate to create an AI video.'}
            </p>
          </div>
        )}

        {/* Video Display */}
        {!isGenerating && generatedVideo && mediaType === 'video' && (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-md bg-card rounded-xl overflow-hidden shadow-lg">
              <video
                controls
                className="w-full"
                src={generatedVideo}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleVideoDownload} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Video
              </Button>
              <Button variant="outline" onClick={() => router.push("/collections")}>
                <FolderOpen className="h-4 w-4 mr-2" />
                View Collection
              </Button>
            </div>
            <div className="mt-3 text-center">
              <p className="text-sm text-muted-foreground">Prompt: {prompt}</p>
              <div className="mt-2 bg-green-500/10 border border-green-500/20 text-green-600 text-xs px-3 py-1 rounded-full inline-block">
                ✓ Saved to collection
              </div>
            </div>
          </div>
        )}



        {!isGenerating && generatedImages.length > 0 && mediaType === 'image' && (
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 sm:grid-cols-2 gap-4'}`}>
            {generatedImages.map((image, index) => (
              <div
                key={index}
                className="relative group cursor-pointer transform transition-transform hover:scale-[1.02]"
                onClick={() => handleImageClick(index)}
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-card">
                  <Image
                    src={getValidImageSrc(image, "/placeholder.svg?height=512&width=512") || "/placeholder.svg"}
                    alt={`Generated image ${index + 1}`}
                    width={512}
                    height={512}
                    className="w-full h-full object-cover object-top"
                    unoptimized // Important for external URLs
                  />
                </div>
                <div className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-xl ${isMobile ? 'opacity-100' : ''}`}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation() // Prevent opening modal
                      handleDownload(image, index)
                    }}
                    className={isMobile ? 'text-xs px-2 py-1' : ''}
                  >
                    <Download className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation() // Prevent opening modal
                      handleShare(image)
                    }}
                    className={isMobile ? 'text-xs px-2 py-1' : ''}
                  >
                    <Share2 className={`${isMobile ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-2'}`} />
                    Share
                  </Button>
                </div>
                <div className={`absolute bottom-2 right-2 bg-background/80 text-foreground ${isMobile ? 'text-xs px-1 py-0.5' : 'text-xs px-2 py-1'} rounded`}>
                  Image {index + 1}
                </div>
                {/* Show saved indicator */}
                <div className={`absolute top-2 right-2 bg-green-500/80 text-white ${isMobile ? 'text-xs px-1 py-0.5' : 'text-xs px-2 py-1'} rounded-full`}>
                  Saved
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Modal */}
      <ImageModal
        images={generatedImages}
        initialIndex={selectedImageIndex}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onDownload={handleDownload}
        onShare={handleShare}
        onSave={(index) => saveImageToCollection(generatedImages[index], index)}
        savingIndex={savingImageIndex}
      />

      {/* Insufficient Tokens Dialog */}
      <InsufficientTokensDialog
        open={showInsufficientTokens}
        onOpenChange={setShowInsufficientTokens}
        currentBalance={tokenBalanceInfo.currentBalance}
        requiredTokens={tokenBalanceInfo.requiredTokens}
      />

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        feature="Multiple Image Generation!"
        description="Become a Premium user now and generate 4, 6, or 8 images simultaneously. Save time and explore more creative possibilities!"
      />

      {/* Image Selection Modal for Video */}
      {showImageSelectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowImageSelectionModal(false)}>
          <div
            className={`bg-background rounded-xl shadow-2xl ${isMobile ? 'w-full max-h-[80vh]' : 'w-full max-w-4xl max-h-[85vh]'} overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`${isMobile ? 'p-4' : 'p-6'} border-b border-border flex items-center justify-between`}>
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold`}>Select Image for Video</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImageSelectionModal(false)}
                className="h-8 w-8 p-0"
              >
                <span className="sr-only">Close</span>
                ✕
              </Button>
            </div>

            {/* Modal Content */}
            <div className={`${isMobile ? 'p-4' : 'p-6'} overflow-y-auto ${isMobile ? 'max-h-[calc(80vh-5rem)]' : 'max-h-[calc(85vh-6rem)]'}`}>
              <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-3 md:grid-cols-4 gap-4'}`}>
                {userImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      setSelectedImageForVideo(img.image_url)
                      setShowImageSelectionModal(false)
                      toast({
                        title: "Image selected",
                        description: "You can now generate a video with this image.",
                      })
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-200 ${selectedImageForVideo === img.image_url
                      ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                      : 'border-transparent hover:border-primary/50 hover:shadow-md'
                      }`}
                  >
                    <Image
                      src={img.image_url}
                      alt="Your image"
                      width={200}
                      height={200}
                      className="w-full h-full object-cover object-top"
                      unoptimized
                    />
                    {selectedImageForVideo === img.image_url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="bg-primary text-primary-foreground rounded-full p-2">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 0 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {img.prompt && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white line-clamp-2">{img.prompt}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {userImages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No images in your collection</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImageSelectionModal(false)
                      setMediaType('image')
                    }}
                  >
                    Generate images first
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
