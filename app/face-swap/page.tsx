"use client"

import { Button } from "@/components/ui/button"
import { Loader2, Users, Upload, ChevronLeft } from "lucide-react"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-context"
import { useSidebar } from "@/components/sidebar-context"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { InsufficientTokensDialog } from "@/components/insufficient-tokens-dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLanguage } from "@/components/language-context"

export default function FaceSwapPage() {
  const { t } = useLanguage()
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const { setIsOpen } = useSidebar()
  const isMobile = useIsMobile()

  // Close sidebar on mobile when navigating to face swap
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
  }, [isMobile, setIsOpen])
  const [sourceImage, setSourceImage] = useState<File | null>(null)
  const [targetImage, setTargetImage] = useState<File | null>(null)
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const [targetPreview, setTargetPreview] = useState<string | null>(null)
  const [resultImage, setResultImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInsufficientTokens, setShowInsufficientTokens] = useState(false)
  const [tokenBalanceInfo, setTokenBalanceInfo] = useState({
    currentBalance: 0,
    requiredTokens: 20
  })

  const sourceInputRef = useRef<HTMLInputElement>(null)
  const targetInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (type: 'source' | 'target', file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('pages.faceSwap.invalidFileType'),
        description: t('pages.faceSwap.invalidFileTypeDesc'),
        variant: "destructive",
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: t('pages.faceSwap.fileTooLarge'),
        description: t('pages.faceSwap.fileTooLargeDesc'),
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (type === 'source') {
        setSourceImage(file)
        setSourcePreview(result)
      } else {
        setTargetImage(file)
        setTargetPreview(result)
      }
    }
    reader.readAsDataURL(file)
  }

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFaceSwap = async () => {
    if (!sourceImage || !targetImage) {
      toast({
        title: t('pages.faceSwap.missingImages'),
        description: t('pages.faceSwap.missingImagesDesc'),
        variant: "destructive",
      })
      return
    }

    // Check if user is logged in
    if (!user) {
      toast({
        title: t('pages.faceSwap.loginRequired'),
        description: t('pages.faceSwap.loginRequiredDesc'),
        variant: "destructive",
      })
      router.push("/login")
      return
    }

    // Check token balance
    try {
      const response = await fetch("/api/deduct-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userId: user.id, 
          amount: 20,
          description: "Face swap",
          type: "image_generation"
        }), // 20 tokens for face swap
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.insufficientTokens) {
          setTokenBalanceInfo({
            currentBalance: data.currentBalance || 0,
            requiredTokens: data.requiredTokens || 20
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
    setResultImage(null)

    try {
      // Convert images to base64
      const sourceBase64 = await convertToBase64(sourceImage)
      const targetBase64 = await convertToBase64(targetImage)

      // Remove data URL prefix for base64 data
      const sourceImageData = sourceBase64.split(',')[1]
      const targetImageData = targetBase64.split(',')[1]

      const requestBody = {
        source_image: sourceImageData,
        target_image: targetImageData,
        source_indexes: "-1",
        target_indexes: "-1",
        background_enhance: true,
        face_restore: true,
        face_upsample: true,
        upscale: 1,
        codeformer_fidelity: 0.5,
        output_format: "JPEG"
      }

      // Get authentication headers
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      let accessToken = session?.access_token

      const response = await fetch("/api/face-swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
          ...(!accessToken && user?.id && { "X-User-ID": user.id }),
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to swap faces")
      }

      const data = await response.json()
      setResultImage(data.resultImage)

      toast({
        title: t('pages.faceSwap.successTitle'),
        description: t('pages.faceSwap.successDesc'),
      })
    } catch (error) {
      console.error("Face swap error:", error)
      setError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during face swap"
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!resultImage) return

    const link = document.createElement('a')
    link.href = resultImage
    link.download = 'face-swapped.jpg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const resetImages = () => {
    setSourceImage(null)
    setTargetImage(null)
    setSourcePreview(null)
    setTargetPreview(null)
    setResultImage(null)
    setError(null)
    if (sourceInputRef.current) sourceInputRef.current.value = ''
    if (targetInputRef.current) targetInputRef.current.value = ''
  }

  return (
    <div className={`flex flex-col ${isMobile ? 'min-h-screen' : 'lg:flex-row min-h-screen'} bg-background text-foreground`}>
      {/* Left Column - Controls */}
      <div className={`w-full ${isMobile ? 'p-4' : 'lg:w-1/2 p-6'} border-b lg:border-b-0 lg:border-r border-border overflow-y-auto`}>
        <div className={`flex justify-between items-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="mr-1 p-0" onClick={() => router.back()} aria-label="Go back">
              <ChevronLeft className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
            </Button>
            <Users className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'}`} />
            <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{t('pages.faceSwap.title')}</h1>
          </div>
          <ThemeToggle />
        </div>

        {/* Image Upload Section */}
        <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
          {/* Source Image Upload */}
          <div>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-3`}>{t('pages.faceSwap.sourceFace')}</h3>
            <div className="relative">
              <input
                ref={sourceInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageSelect('source', e.target.files[0])}
                className="hidden"
              />
              <div
                className={`border-2 border-dashed border-border rounded-xl ${isMobile ? 'p-4' : 'p-8'} text-center cursor-pointer hover:border-primary transition-colors`}
                onClick={() => sourceInputRef.current?.click()}
              >
                {sourcePreview ? (
                  <div className="relative">
                    <Image
                      src={sourcePreview}
                      alt="Source face"
                      width={200}
                      height={200}
                      className="max-w-full max-h-48 object-contain mx-auto rounded-lg"
                    />
                  </div>
                ) : (
                  <div>
                    <Upload className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-2 text-muted-foreground`} />
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
                      {t('pages.faceSwap.selectSourcePlaceholder')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Target Image Upload */}
          <div>
            <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-3`}>{t('pages.faceSwap.targetBody')}</h3>
            <div className="relative">
              <input
                ref={targetInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleImageSelect('target', e.target.files[0])}
                className="hidden"
              />
              <div
                className={`border-2 border-dashed border-border rounded-xl ${isMobile ? 'p-4' : 'p-8'} text-center cursor-pointer hover:border-primary transition-colors`}
                onClick={() => targetInputRef.current?.click()}
              >
                {targetPreview ? (
                  <div className="relative">
                    <Image
                      src={targetPreview}
                      alt="Target body"
                      width={200}
                      height={200}
                      className="max-w-full max-h-48 object-contain mx-auto rounded-lg"
                    />
                  </div>
                ) : (
                  <div>
                    <Upload className={`${isMobile ? 'h-8 w-8' : 'h-12 w-12'} mx-auto mb-2 text-muted-foreground`} />
                    <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
                      {t('pages.faceSwap.selectTargetPlaceholder')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`${isMobile ? 'mt-4 p-3' : 'mt-6 p-4'} bg-destructive/20 border border-destructive text-destructive-foreground rounded-lg`}>
            <span className={`${isMobile ? 'text-sm' : ''}`}>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`${isMobile ? 'mt-4 space-y-2' : 'mt-6 space-y-3'}`}>
          <Button
            className={`w-full ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'} bg-primary hover:bg-primary/90 text-primary-foreground`}
            disabled={!sourceImage || !targetImage || isGenerating}
            onClick={handleFaceSwap}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('pages.faceSwap.swappingFaces')}
              </>
            ) : (
              <>
                <Users className="mr-2 h-5 w-5" />
                {t('pages.faceSwap.swapFaces')}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={resetImages}
            disabled={isGenerating}
          >
            {t('pages.faceSwap.resetImages')}
          </Button>
        </div>

        {/* Instructions */}
        <div className={`${isMobile ? 'mt-4 p-3' : 'mt-6 p-4'} bg-muted/50 rounded-lg`}>
          <h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold mb-2`}>{t('pages.faceSwap.howItWorks')}</h4>
          <ol className={`space-y-1 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
            <li>{t('pages.faceSwap.step1')}</li>
            <li>{t('pages.faceSwap.step2')}</li>
            <li>{t('pages.faceSwap.step3')}</li>
            <li>{t('pages.faceSwap.step4')}</li>
          </ol>
        </div>
      </div>

      {/* Right Column - Result */}
      <div className={`w-full ${isMobile ? 'p-4' : 'lg:w-1/2 p-6'} overflow-y-auto`}>
        <div className={`flex justify-between items-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
          <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>{t('pages.faceSwap.result')}</h2>
          {resultImage && (
            <Button onClick={handleDownload} className={isMobile ? 'text-sm' : ''}>
              {t('pages.faceSwap.downloadResult')}
            </Button>
          )}
        </div>

        {isGenerating && (
          <div className={`flex flex-col items-center justify-center ${isMobile ? 'h-[50vh]' : 'h-[70vh]'} text-center`}>
            <Loader2 className={`${isMobile ? 'h-12 w-12' : 'h-16 w-16'} text-primary animate-spin mb-4`} />
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2`}>{t('pages.faceSwap.processingFaces')}</h3>
            <p className={`text-muted-foreground ${isMobile ? 'max-w-sm text-sm' : 'max-w-md'}`}>
              {t('pages.faceSwap.processingDesc')}
            </p>
          </div>
        )}

        {!isGenerating && !resultImage && (
          <div className={`flex flex-col items-center justify-center ${isMobile ? 'h-[50vh]' : 'h-[70vh]'} text-center`}>
            <Users className={`${isMobile ? 'h-16 w-16' : 'h-20 w-20'} text-muted-foreground mb-4`} />
            <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2`}>{t('pages.faceSwap.readyForSwap')}</h3>
            <p className={`text-muted-foreground ${isMobile ? 'max-w-sm text-sm' : 'max-w-md'}`}>
              {t('pages.faceSwap.readyDesc')}
            </p>
          </div>
        )}

        {!isGenerating && resultImage && (
          <div className="flex justify-center">
            <div className={`relative ${isMobile ? 'w-full max-w-sm' : ''}`}>
              <Image
                src={resultImage}
                alt="Face swapped result"
                width={512}
                height={512}
                className="w-full max-w-md mx-auto rounded-xl shadow-lg"
                unoptimized
              />
            </div>
          </div>
        )}
      </div>

      {/* Insufficient Tokens Dialog */}
      <InsufficientTokensDialog
        open={showInsufficientTokens}
        onOpenChange={setShowInsufficientTokens}
        currentBalance={tokenBalanceInfo.currentBalance}
        requiredTokens={tokenBalanceInfo.requiredTokens}
      />
    </div>
  )
}
