"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Video, Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import type { Character } from "@/types/character"

interface CharacterHoverVideoModalProps {
  character: Character
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CharacterHoverVideoModal({
  character,
  isOpen,
  onClose,
  onSuccess
}: CharacterHoverVideoModalProps) {
  const [customPrompt, setCustomPrompt] = useState("")
  const [selectedPrompt, setSelectedPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState("")
  const [error, setError] = useState("")
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("")
  const [jobId, setJobId] = useState("")

  // Determine character-specific prompts based on category
  const getPromptSuggestions = () => {
    const category = character.category?.toLowerCase() || ""

    if (category.includes("anime")) {
      return [
        "anime character giving a seductive smile and wink",
        "anime character in a playful, flirty pose",
        "anime character biting lip with a sultry expression",
        "anime character doing a sensual dance move",
        "anime character blowing a passionate kiss"
      ]
    } else {
      return [
        "smiling seductively and winking at the camera",
        "giving a sultry, inviting look",
        "biting lip with an alluring expression",
        "doing a sensual, graceful dance move",
        "blowing a passionate kiss with bedroom eyes"
      ]
    }
  }

  const promptSuggestions = getPromptSuggestions()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomPrompt("")
      setSelectedPrompt("")
      setIsGenerating(false)
      setProgress("")
      setError("")
      setGeneratedVideoUrl("")
      setJobId("")
    }
  }, [isOpen])

  // Poll for video generation status
  useEffect(() => {
    if (!jobId || !isGenerating) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/check-video-generation?jobId=${jobId}`)
        const data = await response.json()

        if (data.status === "COMPLETED" && data.video) {
          setProgress("Video generated! Uploading to CDN...")

          // The video is base64 encoded, we need to convert it to a data URL
          const videoDataUrl = `data:video/mp4;base64,${data.video}`

          // Save video to Bunny.net and update character
          const saveResponse = await fetch("/api/save-character-hover-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              characterId: character.id,
              videoData: videoDataUrl
            })
          })

          const saveData = await saveResponse.json()

          if (saveResponse.ok && saveData.success) {
            setGeneratedVideoUrl(saveData.bunnyVideoUrl)
            setProgress("Video saved successfully!")
            setIsGenerating(false)
            clearInterval(pollInterval)

            // Call success callback after a short delay
            setTimeout(() => {
              onSuccess()
              onClose()
            }, 1500)
          } else {
            throw new Error(saveData.error || "Failed to save video")
          }
        } else if (data.status === "FAILED") {
          throw new Error(data.error || "Video generation failed")
        } else {
          // Update progress
          setProgress(`Generating video... (${data.status})`)
        }
      } catch (err) {
        console.error("Error polling video status:", err)
        setError(err instanceof Error ? err.message : "Failed to check video status")
        setIsGenerating(false)
        clearInterval(pollInterval)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [jobId, isGenerating, character.id, onSuccess, onClose])

  const handleGenerate = async () => {
    const prompt = customPrompt.trim() || selectedPrompt

    if (!prompt) {
      setError("Please select or enter a prompt")
      return
    }

    setIsGenerating(true)
    setError("")
    setProgress("Starting video generation...")

    try {
      const response = await fetch("/api/generate-character-hover-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          prompt: prompt
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to start video generation")
      }

      setJobId(data.job_id)
      setProgress("Video generation started...")
    } catch (err) {
      console.error("Error generating video:", err)
      setError(err instanceof Error ? err.message : "Failed to generate video")
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#1A1A1A] text-white border-[#252525]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-[#1111FF]" />
            {character.videoUrl ? "Regenerate" : "Create"} Hover Video
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Generate an animated hover video for {character.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Character Preview */}
          <div className="flex items-center gap-4 p-4 bg-[#252525] rounded-lg">
            <img
              src={character.image}
              alt={character.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div>
              <h3 className="font-semibold text-lg">{character.name}</h3>
              <p className="text-sm text-gray-400">{character.description.slice(0, 80)}...</p>
            </div>
          </div>

          {/* Prompt Suggestions */}
          <div>
            <Label className="text-white mb-2 block">Select a prompt:</Label>
            <div className="grid grid-cols-1 gap-2">
              {promptSuggestions.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedPrompt(prompt)
                    setCustomPrompt("")
                  }}
                  disabled={isGenerating}
                  className={`p-3 rounded-lg text-left transition-colors ${selectedPrompt === prompt
                      ? "bg-[#1111FF] text-white"
                      : "bg-[#252525] text-gray-300 hover:bg-[#333]"
                    } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {prompt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <Label className="text-white mb-2 block">Or enter custom prompt:</Label>
            <Input
              placeholder="e.g., looking at camera and smiling"
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value)
                setSelectedPrompt("")
              }}
              disabled={isGenerating}
              className="bg-[#252525] border-[#333] text-white"
            />
          </div>

          {/* Progress/Error Messages */}
          {progress && (
            <div className="flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-800 rounded-lg text-blue-300">
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span>{progress}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Video Preview */}
          {generatedVideoUrl && (
            <div className="p-4 bg-[#252525] rounded-lg">
              <Label className="text-white mb-2 block">Preview:</Label>
              <video
                src={generatedVideoUrl}
                controls
                autoPlay
                loop
                muted
                className="w-full rounded-lg"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[#252525]">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
            className="bg-transparent border-[#333] text-white hover:bg-[#252525]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!customPrompt && !selectedPrompt)}
            className="bg-[#1111FF] hover:bg-[#0e0ecc] text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Video className="mr-2 h-4 w-4" />
                {character.videoUrl ? "Regenerate Video" : "Generate Video"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
