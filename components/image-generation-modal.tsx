"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Sparkles, Copy, Settings, Palette, User, Zap, Brain, Target } from "lucide-react"
import Image from "next/image"

interface ImageGenerationModalProps {
  isOpen: boolean
  onClose: () => void
  onImageSelect: (imageUrl: string) => void
  trigger?: React.ReactNode
}

export function ImageGenerationModal({ isOpen, onClose, onImageSelect, trigger }: ImageGenerationModalProps) {
  const [imageGenerationPrompt, setImageGenerationPrompt] = useState("")
  const [imageGenerationNegativePrompt, setImageGenerationNegativePrompt] = useState("")
  const [selectedImageModel, setSelectedImageModel] = useState<"stability" | "flux">("stability")
  const [imageGenerationCount, setImageGenerationCount] = useState(1)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [imageGenerationError, setImageGenerationError] = useState<string>("")
  const [currentImageTaskId, setCurrentImageTaskId] = useState<string | null>(null)
  const [isCheckingImageStatus, setIsCheckingImageStatus] = useState(false)
  const imageCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Enhanced character controls
  const [characterGender, setCharacterGender] = useState<string>("female")
  const [characterAge, setCharacterAge] = useState<string>("young_adult")
  const [bodyType, setBodyType] = useState<string>("average")
  const [characterStyle, setCharacterStyle] = useState<string>("anime")
  const [artStyle, setArtStyle] = useState<string>("digital_art")
  const [hairColor, setHairColor] = useState<string>("brown")
  const [eyeColor, setEyeColor] = useState<string>("brown")
  const [skinTone, setSkinTone] = useState<string>("fair")
  const [clothing, setClothing] = useState<string>("casual")
  const [pose, setPose] = useState<string>("portrait")
  const [background, setBackground] = useState<string>("simple")
  const [mood, setMood] = useState<string>("neutral")

  // LoRA-specific settings
  const [selectedLora, setSelectedLora] = useState<string>("anime_v1")
  const [loraStrength, setLoraStrength] = useState(0.8)
  const [loraBlendMode, setLoraBlendMode] = useState<string>("multiply")

  // Advanced settings
  const [cfgScale, setCfgScale] = useState(7)
  const [steps, setSteps] = useState(30)
  const [seed, setSeed] = useState<number | null>(null)
  const [aspectRatio, setAspectRatio] = useState<string>("1:1")

  const genderOptions = [
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "non_binary", label: "Non-binary" },
  ]

  const ageOptions = [
    { value: "young_adult", label: "Young Adult (18-25)" },
    { value: "adult", label: "Adult (26-35)" },
    { value: "mature", label: "Mature (36-50)" },
    { value: "middle_aged", label: "Middle-aged (51+)" },
  ]

  const bodyTypeOptions = [
    { value: "petite", label: "Petite" },
    { value: "slim", label: "Slim" },
    { value: "average", label: "Average" },
    { value: "curvy", label: "Curvy" },
    { value: "athletic", label: "Athletic" },
    { value: "muscular", label: "Muscular" },
    { value: "plus_size", label: "Plus Size" },
  ]

  const characterStyleOptions = [
    { value: "anime", label: "Anime" },
    { value: "realistic", label: "Realistic" },
    { value: "semi_realistic", label: "Semi-Realistic" },
    { value: "cartoon", label: "Cartoon" },
    { value: "chibi", label: "Chibi" },
    { value: "manga", label: "Manga" },
  ]

  const artStyleOptions = [
    { value: "digital_art", label: "Digital Art" },
    { value: "oil_painting", label: "Oil Painting" },
    { value: "watercolor", label: "Watercolor" },
    { value: "pencil_sketch", label: "Pencil Sketch" },
    { value: "cel_shading", label: "Cel Shading" },
    { value: "photorealistic", label: "Photorealistic" },
  ]

  const hairColorOptions = [
    { value: "black", label: "Black" },
    { value: "brown", label: "Brown" },
    { value: "blonde", label: "Blonde" },
    { value: "red", label: "Red" },
    { value: "auburn", label: "Auburn" },
    { value: "silver", label: "Silver" },
    { value: "white", label: "White" },
    { value: "blue", label: "Blue" },
    { value: "pink", label: "Pink" },
    { value: "purple", label: "Purple" },
    { value: "green", label: "Green" },
  ]

  const eyeColorOptions = [
    { value: "brown", label: "Brown" },
    { value: "blue", label: "Blue" },
    { value: "green", label: "Green" },
    { value: "hazel", label: "Hazel" },
    { value: "amber", label: "Amber" },
    { value: "gray", label: "Gray" },
    { value: "violet", label: "Violet" },
    { value: "red", label: "Red" },
    { value: "heterochromia", label: "Heterochromia" },
  ]

  const skinToneOptions = [
    { value: "pale", label: "Pale" },
    { value: "fair", label: "Fair" },
    { value: "light", label: "Light" },
    { value: "medium", label: "Medium" },
    { value: "olive", label: "Olive" },
    { value: "tan", label: "Tan" },
    { value: "dark", label: "Dark" },
    { value: "deep", label: "Deep" },
  ]

  const clothingOptions = [
    { value: "casual", label: "Casual" },
    { value: "formal", label: "Formal" },
    { value: "business", label: "Business" },
    { value: "school_uniform", label: "School Uniform" },
    { value: "fantasy", label: "Fantasy" },
    { value: "medieval", label: "Medieval" },
    { value: "modern", label: "Modern" },
    { value: "traditional", label: "Traditional" },
    { value: "swimwear", label: "Swimwear" },
    { value: "lingerie", label: "Lingerie" },
    { value: "cosplay", label: "Cosplay" },
  ]

  const poseOptions = [
    { value: "portrait", label: "Portrait" },
    { value: "full_body", label: "Full Body" },
    { value: "sitting", label: "Sitting" },
    { value: "standing", label: "Standing" },
    { value: "lying_down", label: "Lying Down" },
    { value: "action", label: "Action" },
    { value: "dancing", label: "Dancing" },
    { value: "walking", label: "Walking" },
    // NSFW Poses
    { value: "ass", label: "🍑 Ass View" },
    { value: "boobs", label: "🔥 Topless" },
    { value: "blowjob", label: "💋 Oral" },
    { value: "cumshot", label: "💦 Facial" },
    { value: "pussy", label: "🌸 Spread" },
    { value: "cowgirl", label: "🤠 Cowgirl" },
    { value: "feet", label: "👣 Feet" },
    { value: "doggy", label: "🐕 Doggy Style" },
    { value: "masturbation", label: "✨ Masturbation" },
    { value: "missionary", label: "💕 Missionary" },
    { value: "dildo", label: "🎯 Dildo" },
    { value: "bondage", label: "⛓️ Bondage" },
    { value: "handjob", label: "🤚 Handjob POV" },
    { value: "squirting", label: "💧 Squirting" },
    { value: "boobjob", label: "🍈 Boobjob" },
    { value: "reverse_cowgirl", label: "🔄 Reverse Cowgirl" },
  ]

  const backgroundOptions = [
    { value: "simple", label: "Simple" },
    { value: "white", label: "White Background" },
    { value: "transparent", label: "Transparent" },
    { value: "bedroom", label: "Bedroom" },
    { value: "office", label: "Office" },
    { value: "school", label: "School" },
    { value: "outdoor", label: "Outdoor" },
    { value: "fantasy", label: "Fantasy" },
    { value: "cyberpunk", label: "Cyberpunk" },
    { value: "nature", label: "Nature" },
  ]

  const moodOptions = [
    { value: "neutral", label: "Neutral" },
    { value: "happy", label: "Happy" },
    { value: "sad", label: "Sad" },
    { value: "angry", label: "Angry" },
    { value: "surprised", label: "Surprised" },
    { value: "seductive", label: "Seductive" },
    { value: "shy", label: "Shy" },
    { value: "confident", label: "Confident" },
    { value: "mysterious", label: "Mysterious" },
  ]

  const aspectRatioOptions = [
    { value: "1:1", label: "Square (1:1)" },
    { value: "3:4", label: "Portrait (3:4)" },
    { value: "4:3", label: "Landscape (4:3)" },
    { value: "9:16", label: "Vertical (9:16)" },
    { value: "16:9", label: "Horizontal (16:9)" },
  ]

  // LoRA model options
  const loraOptions = [
    {
      value: "anime_v1",
      label: "Anime Style v1",
      description: "High-quality anime character generation",
      category: "Anime",
    },
    {
      value: "realistic_portrait",
      label: "Realistic Portrait",
      description: "Photorealistic human portraits",
      category: "Realistic",
    },
    {
      value: "fantasy_art",
      label: "Fantasy Art",
      description: "Fantasy characters and creatures",
      category: "Fantasy",
    },
    {
      value: "cyberpunk_style",
      label: "Cyberpunk Style",
      description: "Futuristic cyberpunk aesthetics",
      category: "Sci-Fi",
    },
    {
      value: "manga_style",
      label: "Manga Style",
      description: "Traditional manga art style",
      category: "Anime",
    },
    {
      value: "oil_painting",
      label: "Oil Painting",
      description: "Classical oil painting style",
      category: "Artistic",
    },
  ]

  const loraBlendModeOptions = [
    { value: "multiply", label: "Multiply" },
    { value: "overlay", label: "Overlay" },
    { value: "soft_light", label: "Soft Light" },
    { value: "hard_light", label: "Hard Light" },
    { value: "linear_burn", label: "Linear Burn" },
  ]

  const generatePromptFromControls = () => {
    const parts = []

    // Character basics
    parts.push(`${characterAge.replace("_", " ")} ${characterGender}`)

    // Physical attributes
    parts.push(`${bodyType} body type`)
    parts.push(`${hairColor} hair`)
    parts.push(`soft natural ${eyeColor} eyes`) // Softer eye description
    parts.push(`${skinTone} skin`)

    // Style and art
    parts.push(`${characterStyle} style`)
    parts.push(`${artStyle}`)

    // Clothing and pose - with detailed NSFW prompts (candy.ai reference quality)
    const nsfwPosePrompts: Record<string, string> = {
      ass: "on all fours, grabbing naked ass from behind, rear view, looking back seductively, bare buttocks exposed",
      boobs: "topless, sitting down, looking sultry, exposed breasts, nipples visible, seductive gaze",
      blowjob: "performing oral sex, intimate POV view, lips around penis, looking up at camera",
      cumshot: "kneeling, face covered in cum, satisfied expression, cum dripping, open mouth",
      pussy: "vagina exposed, legs spread wide open, explicit frontal view, wet, aroused",
      cowgirl: "front view, having sex in cowgirl position, on top, excited expression, riding motion, breasts bouncing",
      feet: "naked, feet covered in cum, foot fetish view, soles visible, cum on toes",
      doggy: "on all fours, doggy style sex, man fucking pussy from behind, back arched, moaning expression",
      masturbation: "rubbing pussy with fingers, self pleasure, masturbating, orgasmic expression, wet",
      missionary: "missionary sex position, legs spread in the air, man on top, orgasmic facial expression, moaning",
      dildo: "inserting dildo into pussy, masturbating with toy, vagina focused, orgasm expression, explicit view",
      bondage: "tied up in bondage ropes, naked, submissive pose, helpless, sensual",
      handjob: "giving handjob from POV, hands wrapped around penis, looking up seductively, stroking motion",
      squirting: "squirting orgasm, wet explosion, orgasmic, explicit, fluids visible",
      boobjob: "penis between breasts, titfuck, mouth open, looking at camera, breasts pressed together",
      reverse_cowgirl: "reverse cowgirl position, getting fucked, looking back over shoulder, orgasm expression, ass view",
    }

    if (nsfwPosePrompts[pose]) {
      parts.push(nsfwPosePrompts[pose])
    } else {
      parts.push(`wearing ${clothing} clothing`)
      parts.push(`${pose} pose`)
    }

    // Mood and background
    parts.push(`${mood} expression`)
    parts.push(`${background} background`)

    // LoRA-specific enhancements
    const selectedLoraData = loraOptions.find((lora) => lora.value === selectedLora)
    if (selectedLoraData) {
      parts.push(`<lora:${selectedLora}:${loraStrength}>`)
    }

    // Quality tags with improved eye quality
    parts.push("high quality", "detailed", "masterpiece", "best quality", "natural soft eyes", "realistic proportions", "anatomically correct")

    return parts.join(", ")
  }

  const handleGenerateFromControls = () => {
    const generatedPrompt = generatePromptFromControls()
    setImageGenerationPrompt(generatedPrompt)
  }

  const handleGenerateImage = async () => {
    if (!imageGenerationPrompt.trim()) {
      setImageGenerationError("Please enter a prompt for image generation")
      return
    }

    setIsGeneratingImage(true)
    setImageGenerationError("")
    setGeneratedImages([])
    setCurrentImageTaskId(null)

    try {
      let response: Response
      let endpoint: string
      let requestBody: any

      if (selectedImageModel === "flux") {
        // Use FLUX model
        endpoint = "/api/generate/flux"
        requestBody = {
          prompt: imageGenerationPrompt,
          imageCount: imageGenerationCount,
          aspectRatio: aspectRatio,
          lora: selectedLora,
          loraStrength: loraStrength,
        }
      } else {
        // Use stability model (default)
        const [width, height] =
          aspectRatio === "1:1"
            ? [1024, 1024]
            : aspectRatio === "3:4"
              ? [768, 1024]
              : aspectRatio === "4:3"
                ? [1024, 768]
                : aspectRatio === "9:16"
                  ? [576, 1024]
                  : aspectRatio === "16:9"
                    ? [1024, 576]
                    : [1024, 1024]

        requestBody = {
          prompt: imageGenerationPrompt,
          negativePrompt: imageGenerationNegativePrompt,
          imageCount: imageGenerationCount,
          width,
          height,
          cfgScale,
          steps,
          seed: seed || undefined,
          lora: selectedLora,
          loraStrength: loraStrength,
          loraBlendMode: loraBlendMode,
        }
        endpoint = "/api/generate-image"
      }

      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        credentials: "include", // Ensure cookies are sent
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start image generation")
      }

      const data = await response.json()

      if (selectedImageModel === "flux") {
        // FLUX model returns images directly
        if (data.images && data.images.length > 0) {
          setGeneratedImages(data.images)
          setIsGeneratingImage(false)
        } else {
          throw new Error("No images returned from FLUX model")
        }
      } else {
        // Stability model uses task polling
        const taskId = data.taskId
        setCurrentImageTaskId(taskId)
        startImageStatusCheck(taskId)
      }
    } catch (error) {
      console.error("Error generating image:", error)
      setImageGenerationError(error instanceof Error ? error.message : "Failed to generate image")
      setIsGeneratingImage(false)
    }
  }

  const startImageStatusCheck = (taskId: string) => {
    setIsCheckingImageStatus(true)

    // Clear any existing interval
    if (imageCheckIntervalRef.current) {
      clearInterval(imageCheckIntervalRef.current)
    }

    // Check immediately
    checkImageGenerationStatus(taskId)

    // Then set up interval
    imageCheckIntervalRef.current = setInterval(() => {
      checkImageGenerationStatus(taskId)
    }, 2000) // Check every 2 seconds
  }

  const checkImageGenerationStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/check-generation?taskId=${taskId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to check generation status")
      }

      const data = await response.json()

      if (data.status === "TASK_STATUS_SUCCEED") {
        // Image is ready
        if (data.images && data.images.length > 0) {
          setGeneratedImages(data.images)
          setIsGeneratingImage(false)
          setIsCheckingImageStatus(false)

          // Clear the interval
          if (imageCheckIntervalRef.current) {
            clearInterval(imageCheckIntervalRef.current)
            imageCheckIntervalRef.current = null
          }
        } else {
          throw new Error("No images returned from the API")
        }
      } else if (data.status === "TASK_STATUS_FAILED") {
        // Generation failed
        throw new Error(data.reason || "Image generation failed")
      }
      // For other statuses, we continue checking
    } catch (error) {
      console.error("Error checking generation status:", error)
      setImageGenerationError(error instanceof Error ? error.message : "Failed to check generation status")

      setIsGeneratingImage(false)
      setIsCheckingImageStatus(false)

      // Clear the interval
      if (imageCheckIntervalRef.current) {
        clearInterval(imageCheckIntervalRef.current)
        imageCheckIntervalRef.current = null
      }
    }
  }

  const handleUseImage = (imageUrl: string) => {
    onImageSelect(imageUrl)
    onClose()
    // Reset the modal state
    setGeneratedImages([])
    setImageGenerationError("")
  }

  const handleClose = () => {
    // Clear any ongoing generation
    if (imageCheckIntervalRef.current) {
      clearInterval(imageCheckIntervalRef.current)
      imageCheckIntervalRef.current = null
    }
    setIsGeneratingImage(false)
    setIsCheckingImageStatus(false)
    onClose()
  }

  const generateRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000))
  }

  useEffect(() => {
    return () => {
      if (imageCheckIntervalRef.current) {
        clearInterval(imageCheckIntervalRef.current)
      }
    }
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto bg-[#1A1A1A] border-[#333333] text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center">
            <Brain className="mr-3 h-6 w-6 text-[#1111FF]" />
            LoRA Character Generator
            <div className="ml-auto flex items-center space-x-2">
              <div className="px-3 py-1 bg-gradient-to-r from-[#1111FF] to-[#0e0ecc] rounded-full text-xs font-medium">
                AI Powered
              </div>
              <div className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full text-xs font-medium">
                LoRA Enhanced
              </div>
            </div>
          </DialogTitle>
          <p className="text-gray-400 mt-2">
            Generate high-quality character images using advanced LoRA (Low-Rank Adaptation) models for enhanced style
            control and consistency.
          </p>
        </DialogHeader>

        <div className="space-y-6 p-2">
          <Tabs defaultValue="lora" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-[#252525]">
              <TabsTrigger value="lora" className="data-[state=active]:bg-[#1111FF]">
                <Brain className="h-4 w-4 mr-2" />
                LoRA Models
              </TabsTrigger>
              <TabsTrigger value="basic" className="data-[state=active]:bg-[#1111FF]">
                <User className="h-4 w-4 mr-2" />
                Character
              </TabsTrigger>
              <TabsTrigger value="appearance" className="data-[state=active]:bg-[#1111FF]">
                <Palette className="h-4 w-4 mr-2" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="style" className="data-[state=active]:bg-[#1111FF]">
                <Sparkles className="h-4 w-4 mr-2" />
                Style
              </TabsTrigger>
              <TabsTrigger value="advanced" className="data-[state=active]:bg-[#1111FF]">
                <Settings className="h-4 w-4 mr-2" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lora" className="space-y-4">
              <Card className="bg-[#252525] border-[#333333]">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Brain className="mr-2 h-5 w-5 text-[#1111FF]" />
                    LoRA Model Selection
                  </CardTitle>
                  <p className="text-sm text-gray-400">
                    Choose a specialized LoRA model to enhance your character generation with specific artistic styles
                    and techniques.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-gray-300 mb-3 block">Available LoRA Models</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {loraOptions.map((lora) => (
                        <div
                          key={lora.value}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedLora === lora.value
                            ? "border-[#1111FF] bg-[#1111FF]/10"
                            : "border-[#333] hover:border-[#555] bg-[#1A1A1A]"
                            }`}
                          onClick={() => setSelectedLora(lora.value)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-white mb-1">{lora.label}</h4>
                              <p className="text-sm text-gray-400 mb-2">{lora.description}</p>
                              <div className="inline-flex items-center px-2 py-1 bg-[#333] rounded text-xs text-gray-300">
                                {lora.category}
                              </div>
                            </div>
                            <div className="ml-3">
                              {selectedLora === lora.value && (
                                <div className="w-6 h-6 bg-[#1111FF] rounded-full flex items-center justify-center">
                                  <Target className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-gray-300 mb-3 block">LoRA Strength: {loraStrength.toFixed(2)}</Label>
                      <Slider
                        value={[loraStrength]}
                        min={0.1}
                        max={1.5}
                        step={0.1}
                        onValueChange={(value) => setLoraStrength(value[0])}
                        className="my-2"
                      />
                      <p className="text-xs text-gray-400">
                        Controls how strongly the LoRA model influences the generation. Higher values = stronger style
                        influence.
                      </p>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-2 block">Blend Mode</Label>
                      <Select value={loraBlendMode} onValueChange={setLoraBlendMode}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {loraBlendModeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400 mt-1">How the LoRA model blends with the base generation.</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#1111FF]/10 to-purple-600/10 border border-[#1111FF]/30 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Zap className="h-4 w-4 text-[#1111FF] mr-2" />
                      <span className="text-sm font-medium text-white">LoRA Enhancement Active</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Selected model:{" "}
                      <span className="text-[#1111FF] font-medium">
                        {loraOptions.find((l) => l.value === selectedLora)?.label}
                      </span>{" "}
                      at {(loraStrength * 100).toFixed(0)}% strength
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="basic" className="space-y-4">
              <Card className="bg-[#252525] border-[#333333]">
                <CardHeader>
                  <CardTitle className="text-white">Character Basics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 mb-2 block">Gender</Label>
                      <RadioGroup value={characterGender} onValueChange={setCharacterGender} className="flex gap-4">
                        {genderOptions.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={option.value} />
                            <Label htmlFor={option.value} className="text-white">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-2 block">Age Range</Label>
                      <Select value={characterAge} onValueChange={setCharacterAge}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {ageOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Body Type</Label>
                    <Select value={bodyType} onValueChange={setBodyType}>
                      <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        {bodyTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-white">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <Card className="bg-[#252525] border-[#333333]">
                <CardHeader>
                  <CardTitle className="text-white">Physical Appearance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 mb-2 block">Hair Color</Label>
                      <Select value={hairColor} onValueChange={setHairColor}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {hairColorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-2 block">Eye Color</Label>
                      <Select value={eyeColor} onValueChange={setEyeColor}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {eyeColorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 mb-2 block">Skin Tone</Label>
                      <Select value={skinTone} onValueChange={setSkinTone}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {skinToneOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-2 block">Mood/Expression</Label>
                      <Select value={mood} onValueChange={setMood}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {moodOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="style" className="space-y-4">
              <Card className="bg-[#252525] border-[#333333]">
                <CardHeader>
                  <CardTitle className="text-white">Style & Setting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 mb-2 block">Character Style</Label>
                      <Select value={characterStyle} onValueChange={setCharacterStyle}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {characterStyleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-2 block">Art Style</Label>
                      <Select value={artStyle} onValueChange={setArtStyle}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {artStyleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 mb-2 block">Clothing</Label>
                      <Select value={clothing} onValueChange={setClothing}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {clothingOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300 mb-2 block">Pose</Label>
                      <Select value={pose} onValueChange={setPose}>
                        <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-[#333]">
                          {poseOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-white">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Background</Label>
                    <Select value={background} onValueChange={setBackground}>
                      <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        {backgroundOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-white">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card className="bg-[#252525] border-[#333333]">
                <CardHeader>
                  <CardTitle className="text-white">Advanced Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Model Selector */}
                  <div>
                    <Label className="text-gray-300 mb-3 block">AI Model</Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={selectedImageModel === "stability" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedImageModel("stability")}
                        className={
                          selectedImageModel === "stability"
                            ? "bg-[#1111FF] hover:bg-[#0e0ecc]"
                            : "bg-transparent border-[#333] hover:bg-[#252525]"
                        }
                      >
                        Stability AI + LoRA
                      </Button>
                      <Button
                        type="button"
                        variant={selectedImageModel === "flux" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedImageModel("flux")}
                        className={
                          selectedImageModel === "flux"
                            ? "bg-[#1111FF] hover:bg-[#0e0ecc]"
                            : "bg-transparent border-[#333] hover:bg-[#252525]"
                        }
                      >
                        FLUX + LoRA
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-2 block">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="bg-[#1A1A1A] border-[#333] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-[#333]">
                        {aspectRatioOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-white">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedImageModel === "stability" && (
                    <>
                      <div>
                        <Label className="text-gray-300 mb-3 block">CFG Scale: {cfgScale}</Label>
                        <Slider
                          value={[cfgScale]}
                          min={1}
                          max={20}
                          step={0.5}
                          onValueChange={(value) => setCfgScale(value[0])}
                          className="my-2"
                        />
                        <p className="text-xs text-gray-400">Higher values follow the prompt more closely</p>
                      </div>

                      <div>
                        <Label className="text-gray-300 mb-3 block">Steps: {steps}</Label>
                        <Slider
                          value={[steps]}
                          min={10}
                          max={50}
                          step={5}
                          onValueChange={(value) => setSteps(value[0])}
                          className="my-2"
                        />
                        <p className="text-xs text-gray-400">More steps = higher quality but slower generation</p>
                      </div>

                      <div>
                        <Label className="text-gray-300 mb-2 block">Seed (Optional)</Label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={seed || ""}
                            onChange={(e) => setSeed(e.target.value ? Number.parseInt(e.target.value) : null)}
                            className="flex-1 bg-[#1A1A1A] border border-[#333] text-white rounded px-3 py-2"
                            placeholder="Random seed"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generateRandomSeed}
                            className="bg-transparent border-[#333] hover:bg-[#252525]"
                          >
                            Random
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Use same seed for consistent results</p>
                      </div>
                    </>
                  )}

                  <div>
                    <Label className="text-gray-300 mb-3 block">Number of Images: {imageGenerationCount}</Label>
                    <Slider
                      value={[imageGenerationCount]}
                      min={1}
                      max={4}
                      step={1}
                      onValueChange={(value) => setImageGenerationCount(value[0])}
                      className="my-2"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Prompt Generation and Manual Input */}
          <Card className="bg-[#252525] border-[#333333]">
            <CardHeader>
              <CardTitle className="text-white flex justify-between items-center">
                Enhanced LoRA Prompt
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateFromControls}
                    className="bg-transparent border-[#1111FF] text-[#1111FF] hover:bg-[#1111FF]/10"
                  >
                    <Brain className="h-4 w-4 mr-1" />
                    Generate LoRA Prompt
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.readText().then((text) => {
                        setImageGenerationPrompt(text)
                      })
                    }}
                    className="bg-transparent border-[#333] hover:bg-[#252525]"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Paste
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={imageGenerationPrompt}
                onChange={(e) => setImageGenerationPrompt(e.target.value)}
                className="w-full h-24 bg-[#1A1A1A] border-[#333] text-white resize-none"
                placeholder="Describe your character or use 'Generate LoRA Prompt' to auto-fill with LoRA enhancements..."
              />

              {/* Negative Prompt (only for Stability) */}
              {selectedImageModel === "stability" && (
                <div>
                  <Label className="text-gray-300 mb-2 block">Negative Prompt (Optional)</Label>
                  <Textarea
                    value={imageGenerationNegativePrompt}
                    onChange={(e) => setImageGenerationNegativePrompt(e.target.value)}
                    className="w-full h-20 bg-[#1A1A1A] border-[#333] text-white resize-none"
                    placeholder="What to avoid in the image... (e.g., 'blurry, low quality, distorted, ugly, deformed')"
                  />
                </div>
              )}

              {/* LoRA Preview */}
              {imageGenerationPrompt.includes("<lora:") && (
                <div className="bg-gradient-to-r from-[#1111FF]/10 to-purple-600/10 border border-[#1111FF]/30 rounded-lg p-3">
                  <div className="flex items-center mb-1">
                    <Brain className="h-4 w-4 text-[#1111FF] mr-2" />
                    <span className="text-sm font-medium text-white">LoRA Enhancement Detected</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Your prompt includes LoRA model tags for enhanced generation quality.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            type="button"
            onClick={handleGenerateImage}
            disabled={isGeneratingImage || !imageGenerationPrompt.trim()}
            className="w-full bg-gradient-to-r from-[#1111FF] to-[#0e0ecc] hover:from-[#0e0ecc] hover:to-[#0c0cbb] h-14 text-lg font-medium"
          >
            {isGeneratingImage ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                {isCheckingImageStatus ? "Processing with LoRA..." : "Generating with LoRA..."}
              </>
            ) : (
              <>
                <Brain className="mr-3 h-6 w-6" />
                Generate with LoRA Enhancement
              </>
            )}
          </Button>

          {/* Error Display */}
          {imageGenerationError && (
            <div className="p-4 bg-red-900/20 border border-red-800 text-red-300 rounded-lg text-sm">
              {imageGenerationError}
            </div>
          )}

          {/* Generated Images */}
          {generatedImages.length > 0 && (
            <Card className="bg-[#252525] border-[#333333]">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Sparkles className="mr-2 h-5 w-5 text-[#1111FF]" />
                  LoRA Enhanced Results
                </CardTitle>
                <p className="text-sm text-gray-400">
                  Generated using {loraOptions.find((l) => l.value === selectedLora)?.label} at{" "}
                  {(loraStrength * 100).toFixed(0)}% strength
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {generatedImages.map((imageUrl, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-[#1A1A1A] border border-[#333]">
                        <Image
                          src={imageUrl || "/placeholder.svg"}
                          alt={`LoRA generated image ${index + 1}`}
                          width={300}
                          height={300}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          type="button"
                          onClick={() => handleUseImage(imageUrl)}
                          className="bg-gradient-to-r from-[#1111FF] to-[#0e0ecc] hover:from-[#0e0ecc] hover:to-[#0c0cbb] text-white font-medium"
                        >
                          Use This Image
                        </Button>
                      </div>
                      {/* LoRA badge */}
                      <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-[#1111FF] to-purple-600 rounded text-xs font-medium text-white">
                        LoRA Enhanced
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
