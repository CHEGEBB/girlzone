"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Loader2, Image as ImageIcon, Wand2, Sparkles, Camera, Mic } from "lucide-react";
import {
  getImageSuggestions,
  getImageSuggestionsByCategory,
  type ImageSuggestion,
} from "@/app/actions/image-suggestions";

interface CharacterImageGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: {
    id: string;
    name: string;
    image: string;
    age: number;
    body: string;
    ethnicity: string;
    relationship: string;
    personality: string;
  };
  onImageGenerated: (newImageUrl: string) => void;
}

export function CharacterImageGenerationModal({
  isOpen,
  onClose,
  character,
  onImageGenerated,
}: CharacterImageGenerationModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("outfit");
  const [suggestions, setSuggestions] = useState<ImageSuggestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  // Fetch suggestions on component mount
  useEffect(() => {
    async function loadSuggestions() {
      setIsLoadingSuggestions(true);
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

    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen]);

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

  // Generate a default prompt based on character attributes
  const generateDefaultPrompt = () => {
    const basePrompt = `Sitting on a marble countertop, wearing a blouse and shorts, looking relaxed. ${character.name} in elegant, refined lingerie in a playful mini-skirt draped in smooth satin robe in classic, well-fitted jeans`;
    setPrompt(basePrompt);
  };

  const addSuggestionToPrompt = (suggestion: ImageSuggestion) => {
    setPrompt(prev => prev + `, ${suggestion.name}`);
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const response = await fetch("/api/generate-character-image-novita", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          characterImage: character.image,
          characterId: character.id,
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
              prompt: prompt,
              characterId: character.id,
            }),
          });

          const saveData = await saveResponse.json();

          if (!saveResponse.ok) {
            console.error('Failed to save image to gallery:', saveData.error);
            // Don't throw error here, just log it - user can still see the image
          } else {
            console.log('Image automatically saved to gallery:', saveData);
          }
        } catch (saveError) {
          console.error('Error saving image to gallery:', saveError);
          // Don't throw error here, just log it - user can still see the image
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


  const handleClose = () => {
    setPrompt("");
    setGeneratedImage(null);
    setError(null);
    // Trigger refresh of the gallery if an image was generated
    if (generatedImage) {
      onImageGenerated(generatedImage);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-gray-900 rounded-2xl p-3 sm:p-4 md:p-6 max-w-7xl w-full shadow-2xl border border-gray-700 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">Generate Image</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-gray-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Left side - Character and Generation Controls */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Character Profile Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3 sm:p-4">
                <div className="flex gap-3 sm:gap-4">
                  <div className="relative">
                    <img
                      src={character.image}
                      alt={character.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover"
                    />
                    <Badge className="absolute -top-1 -left-1 bg-purple-600 text-white text-xs">
                      V2
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-white truncate">{character.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">{character.age} • {character.ethnicity}</p>
                    <p className="text-xs sm:text-sm text-gray-400 truncate">{character.personality}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-gray-400">
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Prompt Input */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-3 sm:p-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Sitting on a marble countertop, wearing a blouse and shorts, looking relaxed. in elegant, refined lingerie in a playful mini-skirt draped in smooth satin robe in classic, well-fitted jeans"
                  className="min-h-[100px] sm:min-h-[120px] bg-gray-700 border-gray-600 text-white placeholder-gray-400 resize-none text-sm"
                />
                <div className="flex justify-end mt-2">
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
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-white">Suggestions</h3>
              <Tabs value={activeTab} onValueChange={handleCategoryChange} className="w-full">
                <TabsList className={`grid w-full grid-cols-${Math.min(categories.length, 5)} bg-gray-800 border-gray-700`}>
                  {categories.slice(0, 5).map((category) => (
                    <TabsTrigger 
                      key={category} 
                      value={category.toLowerCase()} 
                      className="text-xs sm:text-sm text-gray-300 data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-400 px-2 sm:px-3"
                    >
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value={activeTab} className="mt-3 sm:mt-4">
                  {isLoadingSuggestions ? (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
                      {suggestions.map((suggestion) => (
                        <div key={suggestion.id} className="flex-shrink-0 cursor-pointer" onClick={() => addSuggestionToPrompt(suggestion)}>
                          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 hover:scale-105 transition-transform relative overflow-hidden">
                            {suggestion.image ? (
                              <img 
                                src={suggestion.image} 
                                alt={suggestion.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-xs font-medium">{suggestion.name}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 text-center">{suggestion.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>


            {/* Generate Button */}
            <Button
              onClick={handleGenerateImage}
              disabled={isGenerating || !prompt.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2.5 sm:py-3 min-h-[44px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate Image
                </>
              )}
            </Button>

            {error && (
              <div className="p-2.5 sm:p-3 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300 text-xs sm:text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Right side - Generated Images */}
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Generated Images</h3>
              <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                Here, you can find your images. You can leave the page or start a new series while others are still loading.
              </p>
              
              {/* Video Toggle */}
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
                <span className="text-xs sm:text-sm text-gray-300">Show images you can turn into video</span>
                <Badge className="bg-red-600 text-white text-xs">New</Badge>
                <div className="w-12 h-6 bg-blue-600 rounded-full relative">
                  <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                </div>
              </div>

              {/* Generated Image Display */}
              {generatedImage ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-0">
                    <div className="relative aspect-square rounded-lg overflow-hidden">
                      <img
                        src={generatedImage}
                        alt="Generated character"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 left-4">
                        <Button className="bg-black/50 hover:bg-black/70 text-white">
                          <Camera className="h-4 w-4 mr-2" />
                          AI Video
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-green-400 mb-2">
                        ✅ Image automatically saved to gallery!
                      </p>
                      <Button
                        onClick={onClose}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        Close
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6 sm:p-8 text-center">
                    <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-600 mx-auto mb-3 sm:mb-4" />
                    <p className="text-sm sm:text-base text-gray-400">No images generated yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
