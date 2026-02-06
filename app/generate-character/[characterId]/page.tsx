"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Image as ImageIcon, Sparkles, Camera, Mic, ChevronDown, Copy, RefreshCw, X, Maximize2, Download, Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  getImageSuggestions,
  getImageSuggestionsByCategory,
  type ImageSuggestion,
} from "@/app/actions/image-suggestions";
import { useLanguage } from "@/components/language-context";

interface Character {
  id: string;
  name: string;
  image: string;
  age: number;
  body: string;
  ethnicity: string;
  relationship: string;
  personality: string;
}

interface GenerateCharacterPageProps {
  params: Promise<{
    characterId: string;
  }>;
}

export default function GenerateCharacterPage({ params }: GenerateCharacterPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [character, setCharacter] = useState<Character | null>(null);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("outfit");
  const [isRedirectingToVideo, setIsRedirectingToVideo] = useState(false);
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(true);

  // Load character data and all characters
  useEffect(() => {
    async function loadCharacters() {
      try {
        const resolvedParams = await params;
        
        // Load specific character first (priority)
        const characterResponse = await fetch(`/api/characters/${resolvedParams.characterId}`);
        if (characterResponse.ok) {
          const characterData = await characterResponse.json();
          setCharacter(characterData.character);
          setSelectedCharacterId(resolvedParams.characterId);
          setIsLoadingCharacter(false);
        }
        
        // Load all characters in background (non-blocking)
        fetch('/api/characters')
          .then(response => response.ok ? response.json() : null)
          .then(data => {
            if (data) {
              setAllCharacters(data.characters || []);
            }
          })
          .catch(error => console.error('Error loading all characters:', error));
        
      } catch (error) {
        console.error('Error loading character:', error);
        router.push('/my-ai');
      }
    }

    loadCharacters();
  }, [params, router]);

  // Fetch suggestions on component mount (non-blocking)
  useEffect(() => {
    async function loadSuggestions() {
      try {
        const data = await getImageSuggestions();
        setSuggestions(data);

        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.map((item) => item.category)));
        setCategories(uniqueCategories);

        // Set default active category if available
        if (uniqueCategories.length > 0) {
          setActiveTab(uniqueCategories[0].toLowerCase());
        }
      } catch (error) {
        console.error("Error loading suggestions:", error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }

    // Load suggestions in background
    loadSuggestions();
  }, []);

  // Handle category change
  const handleCategoryChange = async (category: string) => {
    setActiveTab(category);
    setIsLoadingSuggestions(true);

    try {
      const data = await getImageSuggestionsByCategory(category);
      setSuggestions(data);
    } catch (error) {
      console.error("Error loading suggestions for category:", error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle character selection
  const handleCharacterChange = async (characterId: string) => {
    if (characterId === selectedCharacterId) return;
    
    // Find character in already loaded list first
    const existingCharacter = allCharacters.find(char => char.id === characterId);
    if (existingCharacter) {
      setCharacter(existingCharacter);
      setSelectedCharacterId(characterId);
      router.push(`/generate-character/${characterId}`, { scroll: false });
      return;
    }
    
    // If not found, fetch from API
    setSelectedCharacterId(characterId);
    setIsLoadingCharacter(true);
    
    try {
      const response = await fetch(`/api/characters/${characterId}`);
      if (response.ok) {
        const data = await response.json();
        setCharacter(data.character);
        router.push(`/generate-character/${characterId}`, { scroll: false });
      }
    } catch (error) {
      console.error('Error loading selected character:', error);
    } finally {
      setIsLoadingCharacter(false);
    }
  };

  // Enhanced prompt generation that uses user input as main context
  const enhanceUserPrompt = (userPrompt: string) => {
    if (!character || !userPrompt.trim()) return userPrompt;
    
    const viewVariations = [
      "close-up portrait",
      "full body shot", 
      "three-quarter view",
      "profile view",
      "over-the-shoulder",
      "low angle view",
      "high angle view",
      "side profile",
      "front facing",
      "back view",
      "sitting pose",
      "standing pose",
      "walking pose",
      "dancing pose",
      "relaxed pose",
      "dynamic pose"
    ];
    
    const lightingVariations = [
      "soft natural lighting",
      "dramatic lighting", 
      "golden hour lighting",
      "studio lighting",
      "moody lighting",
      "bright daylight",
      "warm candlelight",
      "cool blue lighting",
      "neon lighting",
      "sunset lighting"
    ];
    
    const backgroundVariations = [
      "luxurious bedroom",
      "modern living room",
      "elegant bathroom", 
      "rooftop terrace",
      "beach setting",
      "forest background",
      "urban cityscape",
      "cozy cafe",
      "art gallery",
      "hotel suite",
      "garden setting",
      "mountain view",
      "lake house",
      "penthouse",
      "boutique hotel"
    ];
    
    const qualityEnhancers = [
      "professional photography",
      "high quality",
      "detailed",
      "realistic", 
      "cinematic composition",
      "perfect lighting",
      "sharp focus",
      "8K resolution",
      "photorealistic",
      "beautiful",
      "elegant",
      "sophisticated",
      "artistic",
      "masterpiece"
    ];
    
    // Extract key elements from user prompt
    const userWords = userPrompt.toLowerCase().split(/\s+/);
    
    // Check if user already specified view/pose
    const hasView = viewVariations.some(view => 
      userWords.some(word => view.toLowerCase().includes(word))
    );
    
    // Check if user already specified lighting
    const hasLighting = lightingVariations.some(lighting => 
      userWords.some(word => lighting.toLowerCase().includes(word))
    );
    
    // Check if user already specified background
    const hasBackground = backgroundVariations.some(background => 
      userWords.some(word => background.toLowerCase().includes(word))
    );
    
    // Check for nudity and explicit content indicators
    const nudityKeywords = [
      "nude", "naked", "topless", "bottomless", "undressed", "unclothed", "bare", "exposed",
      "lingerie", "underwear", "bra", "panties", "thong", "bikini", "swimsuit",
      "intimate", "sensual", "erotic", "sexy", "seductive", "provocative", "revealing",
      "boudoir", "pinup", "glamour", "artistic nude", "tasteful nude", "nude art"
    ];
    
    const hasNudityContent = nudityKeywords.some(keyword => 
      userWords.some(word => word.includes(keyword))
    );
    
    // Build enhanced prompt
    let enhancedPrompt = `${character.name}, ${userPrompt}`;
    
    // Add character details if not already mentioned
    if (!userWords.includes(character.age.toString())) {
      enhancedPrompt += `, ${character.age} years old`;
    }
    if (!userWords.includes(character.ethnicity.toLowerCase())) {
      enhancedPrompt += `, ${character.ethnicity}`;
    }
    if (!userWords.includes(character.body.toLowerCase())) {
      enhancedPrompt += `, ${character.body} build`;
    }
    
    // Add view if not specified
    if (!hasView) {
      const randomView = viewVariations[Math.floor(Math.random() * viewVariations.length)];
      enhancedPrompt += `, ${randomView}`;
    }
    
    // Add lighting if not specified
    if (!hasLighting) {
      const randomLighting = lightingVariations[Math.floor(Math.random() * lightingVariations.length)];
      enhancedPrompt += `, ${randomLighting}`;
    }
    
    // Add background if not specified
    if (!hasBackground) {
      const randomBackground = backgroundVariations[Math.floor(Math.random() * backgroundVariations.length)];
      enhancedPrompt += `, ${randomBackground}`;
    }
    
    // Add personality if not mentioned
    if (!userWords.some(word => character.personality.toLowerCase().includes(word))) {
      enhancedPrompt += `, ${character.personality} personality`;
    }
    
    // Add nudity enhancers if user specified nudity content
    if (hasNudityContent) {
      const nudityEnhancers = [
        "artistic nude",
        "tasteful nudity", 
        "sensual pose",
        "intimate setting",
        "provocative expression",
        "alluring gaze",
        "seductive pose",
        "romantic lighting",
        "intimate atmosphere",
        "passionate expression",
        "elegant nude",
        "beautiful nude",
        "graceful nude",
        "sophisticated nude"
      ];
      const randomNudity = nudityEnhancers[Math.floor(Math.random() * nudityEnhancers.length)];
      enhancedPrompt += `, ${randomNudity}`;
    }
    
    // Add quality enhancers
    const randomQuality = qualityEnhancers[Math.floor(Math.random() * qualityEnhancers.length)];
    enhancedPrompt += `, ${randomQuality}`;
    
    // Add nudity content tags if detected
    if (hasNudityContent) {
      enhancedPrompt += `, artistic nude, tasteful nudity, nude art, elegant nude, beautiful nude`;
    }
    
    return enhancedPrompt;
  };

  // Generate a default prompt based on character attributes with view variations
  const generateDefaultPrompt = () => {
    if (!character) return;
    
    const viewVariations = [
      "close-up portrait",
      "full body shot",
      "three-quarter view",
      "profile view",
      "over-the-shoulder",
      "low angle view",
      "high angle view",
      "side profile",
      "front facing",
      "back view",
      "sitting pose",
      "standing pose",
      "walking pose",
      "dancing pose",
      "relaxed pose",
      "dynamic pose"
    ];
    
    const lightingVariations = [
      "soft natural lighting",
      "dramatic lighting",
      "golden hour lighting",
      "studio lighting",
      "moody lighting",
      "bright daylight",
      "warm candlelight",
      "cool blue lighting",
      "neon lighting",
      "sunset lighting"
    ];
    
    const backgroundVariations = [
      "luxurious bedroom",
      "modern living room",
      "elegant bathroom",
      "rooftop terrace",
      "beach setting",
      "forest background",
      "urban cityscape",
      "cozy cafe",
      "art gallery",
      "hotel suite",
      "garden setting",
      "mountain view",
      "lake house",
      "penthouse",
      "boutique hotel"
    ];
    
    const clothingVariations = [
      "elegant evening wear",
      "casual chic outfit",
      "designer lingerie",
      "summer dress",
      "formal attire",
      "athletic wear",
      "vintage fashion",
      "modern streetwear",
      "luxury loungewear",
      "party dress",
      "business casual",
      "vacation outfit",
      "date night attire",
      "cocktail dress",
      "designer ensemble"
    ];
    
    const randomView = viewVariations[Math.floor(Math.random() * viewVariations.length)];
    const randomLighting = lightingVariations[Math.floor(Math.random() * lightingVariations.length)];
    const randomBackground = backgroundVariations[Math.floor(Math.random() * backgroundVariations.length)];
    const randomClothing = clothingVariations[Math.floor(Math.random() * clothingVariations.length)];
    
    const basePrompt = `${character.name}, ${randomView}, ${character.age} years old, ${character.ethnicity}, ${character.body} build, wearing ${randomClothing}, ${randomLighting}, ${randomBackground}, ${character.personality} personality, professional photography, high quality, detailed, realistic, cinematic composition, perfect lighting, sharp focus, 8K resolution, photorealistic, beautiful, elegant, sophisticated, artistic, masterpiece`;
    
    setPrompt(basePrompt);
  };

  const addSuggestionToPrompt = (suggestion: ImageSuggestion) => {
    setPrompt(prev => prev + `, ${suggestion.name}`);
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `character-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim() || !character) {
      setError(t('pages.generateCharacter.promptRequired'));
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      // Automatically enhance the user's prompt
      const enhancedPrompt = enhanceUserPrompt(prompt);
      
      // Check if enhanced prompt contains nudity content
      const nudityKeywords = [
        "nude", "naked", "topless", "bottomless", "undressed", "unclothed", "bare", "exposed",
        "lingerie", "underwear", "bra", "panties", "thong", "bikini", "swimsuit",
        "intimate", "sensual", "erotic", "sexy", "seductive", "provocative", "revealing",
        "boudoir", "pinup", "glamour", "artistic nude", "tasteful nude", "nude art",
        "artistic nude", "tasteful nudity", "nude art", "elegant nude", "beautiful nude"
      ];
      
      const hasNudityContent = nudityKeywords.some(keyword => 
        enhancedPrompt.toLowerCase().includes(keyword)
      );
      
      const response = await fetch("/api/generate-character-image-novita", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          characterImage: character.image,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      if (data.success && data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        
        // Automatically save the generated image to the gallery
        try {
          const saveResponse = await fetch('/api/save-character-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageUrl: data.imageUrl,
              prompt: enhancedPrompt, // Save the enhanced prompt
              characterId: character.id,
            }),
          });

          const saveData = await saveResponse.json();

          if (!saveResponse.ok) {
            console.error('Failed to save image to gallery:', saveData.error);
          } else {
            console.log('Image automatically saved to gallery:', saveData);
          }
        } catch (saveError) {
          console.error('Error saving image to gallery:', saveError);
        }
      } else {
        throw new Error("No image was generated");
      }
    } catch (err) {
      console.error("Error generating image:", err);
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoadingCharacter) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{t('pages.generateCharacter.notFoundTitle')}</h1>
          <Link href="/my-ai" className="text-blue-400 hover:text-blue-300">
            {t('pages.generateCharacter.backToMyAI')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-gray-400 hover:text-white"
          >
            <Link href={`/characters/${character.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('pages.generateCharacter.backToCharacter')}
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Camera className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">{t('pages.generateCharacter.title')}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left side - Character and Generation Controls */}
          <div className="space-y-6">
            {/* Character Selector */}
            {allCharacters.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-300">{t('pages.generateCharacter.switchCharacter')}</span>
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {allCharacters.length} {t('pages.generateCharacter.charactersLabel')}
                      </Badge>
                    </div>
                    <Select value={selectedCharacterId} onValueChange={handleCharacterChange}>
                      <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white hover:bg-gray-600 transition-colors">
                        <div className="flex items-center gap-3">
                          {character && (
                            <img
                              src={character.image}
                              alt={character.name}
                              className="w-8 h-8 rounded-lg object-cover border border-gray-500"
                            />
                          )}
                          <div className="flex-1 text-left">
                            <div className="font-medium">{character?.name || t('pages.generateCharacter.selectCharacter')}</div>
                            <div className="text-xs text-gray-400">
                              {character ? `${character.age} • ${character.ethnicity}` : t('pages.generateCharacter.chooseCharacter')}
                            </div>
                          </div>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 max-h-60 shadow-xl backdrop-blur-sm">
                        {allCharacters.map((char) => (
                          <SelectItem 
                            key={char.id} 
                            value={char.id}
                            className="text-white hover:bg-gray-700 focus:bg-gray-700 cursor-pointer"
                          >
                            <div className="flex items-center gap-3 py-1">
                              <img
                                src={char.image}
                                alt={char.name}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-500"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{char.name}</div>
                                <div className="text-xs text-gray-400">
                                  {char.age} • {char.ethnicity}
                                </div>
                              </div>
                              {char.id === selectedCharacterId && (
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Character Profile Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="relative">
                    <img
                      src={character.image}
                      alt={character.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <Badge className="absolute -top-1 -left-1 bg-purple-600 text-white text-xs">
                      V2
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{character.name}</h3>
                    <p className="text-sm text-gray-400">{character.age} • {character.ethnicity}</p>
                    <p className="text-sm text-gray-400">{character.personality}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-gray-400">
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Prompt Input */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-300">{t('pages.generateCharacter.promptLabel')}</h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={generateDefaultPrompt}
                    className="text-gray-400 hover:text-white hover:bg-gray-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('pages.generateCharacter.generateNewPrompt')}
                  </Button>
                </div>
                <div className="relative">
                  <div className="absolute right-3 top-3 flex items-center gap-2 z-10">
                    <Copy
                      className="h-4 w-4 text-gray-400 cursor-pointer hover:text-white transition-colors"
                      onClick={async () => {
                        const copyToClipboardFallback = (text: string) => {
                          try {
                            const textArea = document.createElement("textarea");
                            textArea.value = text;
                            textArea.style.position = "fixed";
                            textArea.style.opacity = "0";
                            textArea.style.pointerEvents = "none";
                            textArea.style.left = "0";
                            textArea.style.top = "0";
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();
                            
                            const successful = document.execCommand('copy');
                            if (successful) {
                              toast({ title: t('pages.generate.copyPrompt') });
                            } else {
                              console.error('Fallback: Copy command was unsuccessful');
                              toast({ title: "Failed to copy", variant: "destructive" });
                            }
                            
                            document.body.removeChild(textArea);
                          } catch (err) {
                            console.error('Fallback: Oops, unable to copy', err);
                            toast({ title: "Failed to copy", variant: "destructive" });
                          }
                        };

                        try {
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(prompt);
                            toast({ title: t('pages.generate.copyPrompt') });
                          } else {
                            copyToClipboardFallback(prompt);
                          }
                        } catch (err) {
                          console.error("Failed to copy prompt using Clipboard API, trying fallback:", err);
                          copyToClipboardFallback(prompt);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 bg-transparent text-gray-400 hover:text-white hover:bg-gray-600"
                      onClick={() => {
                        if (navigator.clipboard && navigator.clipboard.readText) {
                          navigator.clipboard.readText().then((text) => {
                            setPrompt(text);
                            toast({ title: t('pages.generate.pastePrompt') });
                          }).catch(err => {
                            console.error("Failed to read clipboard:", err);
                            toast({ title: "Failed to paste", variant: "destructive" });
                          });
                        } else {
                          toast({ title: "Clipboard access not supported", variant: "destructive" });
                        }
                      }}
                    >
                      {t('pages.generate.paste')}
                    </Button>
                  </div>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={t('pages.generateCharacter.promptPlaceholder')}
                    className="min-h-[120px] bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none pr-24"
                  />
                </div>
                <div className="flex justify-end items-center mt-2">
                  <Button variant="ghost" size="sm" className="text-gray-400">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm"></div>
                      <div className="w-3 h-3 bg-pink-500 rounded-sm"></div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Suggestions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-white">{t('pages.generateCharacter.suggestionsTitle')}</h3>
                  </div>
                  
                  <Tabs value={activeTab} onValueChange={handleCategoryChange} className="w-full">
                    <TabsList className="flex w-full bg-gray-700 border-gray-600 p-1 rounded-lg overflow-x-auto">
                      {categories.slice(0, 5).map((category) => (
                        <TabsTrigger 
                          key={category} 
                          value={category.toLowerCase()} 
                          className="flex-shrink-0 text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm transition-all px-3 py-2 text-sm font-medium whitespace-nowrap"
                        >
                          {category}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    <TabsContent value={activeTab} className="mt-4">
                      {isLoadingSuggestions ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <div className="relative">
                          {/* Custom scrollbar styling */}
                          <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 pb-2 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
                            {suggestions.map((suggestion) => (
                              <div 
                                key={suggestion.id} 
                                className="flex-shrink-0 cursor-pointer group flex flex-col items-center" 
                                onClick={() => addSuggestionToPrompt(suggestion)}
                              >
                                <div className="relative">
                                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-2 hover:scale-110 transition-all duration-200 relative overflow-hidden shadow-lg group-hover:shadow-purple-500/25">
                                    {suggestion.image ? (
                                      <img 
                                        src={suggestion.image} 
                                        alt={suggestion.name}
                                        className="w-full h-full object-cover rounded-xl"
                                      />
                                    ) : (
                                      <span className="text-white text-xs font-medium px-2 text-center leading-tight">{suggestion.name}</span>
                                    )}
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex items-center justify-center">
                                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">+</span>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-400 text-center group-hover:text-white transition-colors duration-200 break-words max-w-16 leading-tight">{suggestion.name}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Scroll indicators */}
                          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-800 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-800 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateImage}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-white font-semibold py-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin text-blue-400" />
                  <span className="text-gray-300">{t('pages.generate.generating')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2 text-blue-400" />
                  <span className="text-white">{t('pages.generateCharacter.generateButtonLabel')}</span>
                </>
              )}
            </Button>

            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Right side - Generated Images */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">{t('pages.generateCharacter.generatedImagesTitle')}</h3>
              <p className="text-sm text-gray-400 mb-4">
                {t('pages.generateCharacter.generatedImagesDescription')}
              </p>
              
              {/* Video Toggle */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm text-gray-300">{t('pages.generateCharacter.videoToggleLabel')}</span>
                <Badge className="bg-red-600 text-white text-xs">{t('pages.generateCharacter.newBadge')}</Badge>
                <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                </div>
              </div>

              {/* Generated Image Display */}
              {isGenerating ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-0">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
                        <p className="text-gray-300 text-sm">{t('pages.generate.generatingTitle')}</p>
                        <p className="text-gray-500 text-xs mt-2">{t('pages.generate.generatingDesc')}</p>
                      </div>
                    </div>
                    <div className="p-4">
                      <Button
                        disabled
                        className="w-full bg-gray-600 text-gray-400 cursor-not-allowed"
                      >
                        {t('pages.generate.generating')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : generatedImage ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-0">
                    <div 
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => setSelectedImage(generatedImage)}
                    >
                      <img
                        src={generatedImage}
                        alt="Generated character"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-4 left-4">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent opening the image modal
                            setIsRedirectingToVideo(true);
                            // Store image URL in sessionStorage to avoid URL length issues
                            sessionStorage.setItem('videoImageUrl', generatedImage);
                            router.push('/generate?mode=video');
                          }}
                          disabled={isRedirectingToVideo}
                          className="bg-black/50 hover:bg-black/70 text-white disabled:opacity-75"
                        >
                          {isRedirectingToVideo ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              {t('pages.generateCharacter.goingToVideo')}
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              {t('pages.generateCharacter.aiVideoButton')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="p-4">
                      <Button
                        onClick={() => router.push(`/characters/${character.id}`)}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        {t('pages.generateCharacter.viewInGallery')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <ImageIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">{t('pages.generateCharacter.noImagesYet')}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            <div className="relative aspect-square max-h-[80vh] rounded-lg overflow-hidden">
              <img
                src={selectedImage}
                alt="Generated character"
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">{t('pages.generateCharacter.modalTitle')}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownload(selectedImage)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t('pages.generate.download')}
                  </Button>
                </div>
              </div>
              <p className="text-white/80 mb-2">{prompt}</p>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span>{t('pages.generateCharacter.generatedFor', { name: character?.name })}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
