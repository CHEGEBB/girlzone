"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { useCharacterImages } from "@/hooks/use-character-images";

export default function CreateCharacterPageWithAdminImages() {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedStyle, setSelectedStyle] = useState<'realistic' | 'anime' | null>(null);
    const [selectedEthnicity, setSelectedEthnicity] = useState<string | null>(null);
    const [selectedAge, setSelectedAge] = useState<string | null>(null);
    const [selectedEyeColor, setSelectedEyeColor] = useState<string | null>(null);
    const [selectedHairStyle, setSelectedHairStyle] = useState<string | null>(null);
    const [selectedHairColor, setSelectedHairColor] = useState<string | null>(null);
    const [selectedBodyType, setSelectedBodyType] = useState<string | null>(null);
    const [selectedBreastSize, setSelectedBreastSize] = useState<string | null>(null);
    const [selectedButtSize, setSelectedButtSize] = useState<string | null>(null);
    const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);
    const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
    const [showImage, setShowImage] = useState(false);
    const [showNameDialog, setShowNameDialog] = useState(false);
    const [characterName, setCharacterName] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const supabase = createClientComponentClient();
    const router = useRouter();
    const { categories, loading: imagesLoading, getCategoryImages, getImageByKey } = useCharacterImages();

    // Auto-start generation when reaching step 7
    useEffect(() => {
        if (currentStep === 7 && !generatedImageUrl && !isGenerating) {
            handleGenerateImage();
        }
    }, [currentStep]);

    // Helper function to get image URL for an option
    const getImageUrl = (categoryName: string, optionKey: string, fallbackUrl: string) => {
        const imageOption = getImageByKey(categoryName, optionKey);
        return imageOption?.image_url || fallbackUrl;
    };

    // Helper function to render image options for a category
    const renderImageOptions = (categoryName: string, selectedValue: string | null, onSelect: (value: string) => void, options: Array<{key: string, label: string, fallbackUrl: string}>) => {
        const imageOptions = getCategoryImages(categoryName);
        
        return (
            <div className="flex justify-center items-center space-x-4 mb-8">
                {options.map((option) => {
                    const imageUrl = getImageUrl(categoryName, option.key, option.fallbackUrl);
                    const isSelected = selectedValue === option.key;
                    
                    return (
                        <div
                            key={option.key}
                            className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${
                                isSelected
                                    ? 'bg-[#FF4D8D] border-2 border-[#FF4D8D]'
                                    : 'border-2 border-[#333333] hover:border-[#FF4D8D]'
                            }`}
                            onClick={() => onSelect(option.key)}
                        >
                            <div className="w-[88px] h-[88px] lg:w-[120px] lg:h-[120px] rounded-xl overflow-hidden relative">
                                <img
                                    src={imageUrl}
                                    alt={option.label}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                        isSelected
                                            ? 'bg-white text-[#FF4D8D]'
                                            : 'bg-black/50 text-white'
                                    }`}>
                                        {option.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Step 0: Style Selection
    const renderStep0 = () => {
        const styleOptions = [
            { key: 'realistic', label: 'Realistic', fallbackUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=500&fit=crop&crop=face' },
            { key: 'anime', label: 'Anime', fallbackUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop&crop=face' }
        ];

        return (
            <>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Choose Style*</h2>
                </div>

                <div className="flex justify-center items-center space-x-6 mb-8">
                    {styleOptions.map((option) => {
                        const imageUrl = getImageUrl('style', option.key, option.fallbackUrl);
                        const isSelected = selectedStyle === option.key;
                        
                        return (
                            <div
                                key={option.key}
                                className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${
                                    isSelected
                                        ? 'bg-[#FF4D8D] border-2 border-[#FF4D8D]'
                                        : 'border-2 border-[#333333] hover:border-[#FF4D8D]'
                                }`}
                                onClick={() => setSelectedStyle(option.key as 'realistic' | 'anime')}
                            >
                                <div className="w-[140px] h-[206px] lg:w-[320px] lg:h-[443px] rounded-xl overflow-hidden relative">
                                    <img
                                        src={imageUrl}
                                        alt={`${option.label} character example`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                            isSelected
                                                ? 'bg-white text-[#FF4D8D]'
                                                : 'bg-black/50 text-white'
                                        }`}>
                                            {option.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        );
    };

    // Step 1: Basic Info (Ethnicity, Age, Eye Color)
    const renderStep1 = () => {
        const ethnicityOptions = [
            { key: 'caucasian', label: 'Caucasian', fallbackUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=300&fit=crop&crop=face' },
            { key: 'latina', label: 'Latina', fallbackUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=face' },
            { key: 'asian', label: 'Asian', fallbackUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=face' },
            { key: 'african', label: 'African', fallbackUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop&crop=face' },
            { key: 'indian', label: 'Indian', fallbackUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=300&fit=crop&crop=face' }
        ];

        const ageOptions = [
            { key: 'teen', label: 'Teen(18+)', fallbackUrl: '/placeholder.svg?height=80&width=80' },
            { key: '20s', label: '20s', fallbackUrl: '/placeholder.svg?height=80&width=80' }
        ];

        const eyeColorOptions = [
            { key: 'brown', label: 'Brown', fallbackUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=150&fit=crop&crop=eyes' },
            { key: 'blue', label: 'Blue', fallbackUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=150&fit=crop&crop=eyes' }
        ];

        return (
            <>
                {/* Choose Ethnicity Section */}
                <div className="mb-12">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Choose Ethnicity*</h2>
                    </div>
                    {renderImageOptions('ethnicity', selectedEthnicity, setSelectedEthnicity, ethnicityOptions)}
                </div>

                {/* Choose Age Section */}
                <div className="mb-12">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Choose Age</h2>
                    </div>
                    <div className="flex justify-center items-center space-x-4 mb-8">
                        {ageOptions.map((option) => {
                            const isSelected = selectedAge === option.key;
                            return (
                                <div
                                    key={option.key}
                                    className={`relative cursor-pointer rounded-xl p-3 transition-all duration-200 ${
                                        isSelected
                                            ? 'bg-[#FF4D8D] border-2 border-[#FF4D8D]'
                                            : 'border-2 border-[#333333] hover:border-[#FF4D8D]'
                                    }`}
                                    onClick={() => setSelectedAge(option.key)}
                                >
                                    <span className={`text-sm font-semibold ${
                                        isSelected ? 'text-white' : 'text-gray-300'
                                    }`}>
                                        {option.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Choose Eye Color Section */}
                <div className="mb-12">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Choose Eye Color*</h2>
                    </div>
                    {renderImageOptions('eye_color', selectedEyeColor, setSelectedEyeColor, eyeColorOptions)}
                </div>
            </>
        );
    };

    // Step 2: Hair Style
    const renderStep2 = () => {
        const hairStyleOptions = [
            { key: 'straight', label: 'Straight', fallbackUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=hair' },
            { key: 'curly', label: 'Curly', fallbackUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=hair' },
            { key: 'wavy', label: 'Wavy', fallbackUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=hair' },
            { key: 'short', label: 'Short', fallbackUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=hair' },
            { key: 'long', label: 'Long', fallbackUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=hair' },
            { key: 'bob', label: 'Bob Cut', fallbackUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=hair' }
        ];

        return (
            <>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Choose Hair Style*</h2>
                </div>

                <div className="relative mb-6">
                    {/* First row */}
                    <div className="flex justify-center items-center mb-8">
                        {hairStyleOptions.slice(0, 4).map((option, index) => (
                            <div key={option.key} className={`mx-${index === 0 || index === 3 ? '4' : '6'}`}>
                                {renderImageOptions('hair_style', selectedHairStyle, setSelectedHairStyle, [option])}
                            </div>
                        ))}
                    </div>

                    {/* Second row */}
                    <div className="flex justify-center items-center">
                        {hairStyleOptions.slice(4).map((option, index) => (
                            <div key={option.key} className={`mx-${index === 0 ? '8' : '12'}`}>
                                {renderImageOptions('hair_style', selectedHairStyle, setSelectedHairStyle, [option])}
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    // Step 3: Hair Color
    const renderStep3 = () => {
        const hairColorOptions = [
            { key: 'blonde', label: 'Blonde', fallbackUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=hair' },
            { key: 'brunette', label: 'Brunette', fallbackUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=hair' },
            { key: 'black', label: 'Black', fallbackUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=hair' }
        ];

        return (
            <>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Choose Hair Color*</h2>
                </div>
                {renderImageOptions('hair_color', selectedHairColor, setSelectedHairColor, hairColorOptions)}
            </>
        );
    };

    // Step 4: Body Type
    const renderStep4 = () => {
        const bodyTypeOptions = [
            { key: 'petite', label: 'Petite', fallbackUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=body' },
            { key: 'slim', label: 'Slim', fallbackUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=body' },
            { key: 'athletic', label: 'Athletic', fallbackUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=body' },
            { key: 'voluptuous', label: 'Voluptuous', fallbackUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop&crop=body' },
            { key: 'curvy', label: 'Curvy', fallbackUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=300&fit=crop&crop=body' }
        ];

        return (
            <>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Choose Body Type*</h2>
                </div>
                {renderImageOptions('body_type', selectedBodyType, setSelectedBodyType, bodyTypeOptions)}
            </>
        );
    };

    // Step 5: Breast and Butt Size
    const renderStep5 = () => {
        const breastSizeOptions = [
            { key: 'small', label: 'Small', fallbackUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=body' },
            { key: 'medium', label: 'Medium', fallbackUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=body' },
            { key: 'large', label: 'Large', fallbackUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=body' },
            { key: 'huge', label: 'Huge', fallbackUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop&crop=body' },
            { key: 'xlarge', label: 'X-Large', fallbackUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=300&fit=crop&crop=body' }
        ];

        const buttSizeOptions = [
            { key: 'small', label: 'Small', fallbackUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=300&fit=crop&crop=body' },
            { key: 'medium', label: 'Medium', fallbackUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200&h=300&fit=crop&crop=body' },
            { key: 'large', label: 'Large', fallbackUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=200&h=300&fit=crop&crop=body' },
            { key: 'athletic', label: 'Athletic', fallbackUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=300&fit=crop&crop=body' },
            { key: 'xlarge', label: 'X-Large', fallbackUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=300&fit=crop&crop=body' }
        ];

        return (
            <>
                {/* Breast Size Section */}
                <div className="mb-12">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Choose Breast Size*</h2>
                    </div>
                    {renderImageOptions('breast_size', selectedBreastSize, setSelectedBreastSize, breastSizeOptions)}
                </div>

                {/* Butt Size Section */}
                <div className="mb-12">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold mb-2">Choose Butt Size*</h2>
                    </div>
                    {renderImageOptions('butt_size', selectedButtSize, setSelectedButtSize, buttSizeOptions)}
                </div>
            </>
        );
    };

    // Step 6: Summary
    const renderStep6 = () => {
        return (
            <>
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2">Review Your AI Character</h2>
                    <p className="text-gray-400">Review your selections before we create your AI</p>
                </div>

                <div className="max-w-6xl mx-auto mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {[
                            { title: "Style", value: selectedStyle, type: "style" },
                            { title: "Ethnicity", value: selectedEthnicity, type: "ethnicity" },
                            { title: "Age", value: selectedAge, type: "age" },
                            { title: "Eye Color", value: selectedEyeColor, type: "eyeColor" },
                            { title: "Hair Style", value: selectedHairStyle, type: "hairStyle" },
                            { title: "Hair Color", value: selectedHairColor, type: "hairColor" },
                            { title: "Body Type", value: selectedBodyType, type: "bodyType" },
                            { title: "Breast Size", value: selectedBreastSize, type: "breastSize" },
                            { title: "Butt Size", value: selectedButtSize, type: "buttSize" },
                            { title: "Personality", value: selectedPersonality, type: "personality" },
                            { title: "Relationship", value: selectedRelationship, type: "relationship" }
                        ].map((item) => (
                            <div key={item.title} className="bg-[#333333] rounded-xl p-4 flex flex-col items-center justify-center min-w-[120px] min-h-[120px]">
                                <div className="text-2xl mb-2">❓</div>
                                <div className="text-center">
                                    <h3 className="font-semibold text-sm text-white mb-1">{item.title}</h3>
                                    <p className="text-xs text-gray-300">{item.value || 'Not selected'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    };

    // Step 7: Generation
    const renderStep7 = () => {
        if (isGenerating) {
            return (
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#FF4D8D] mx-auto mb-4"></div>
                    <h2 className="text-2xl font-bold mb-2">Creating Your AI...</h2>
                    <p className="text-gray-400">This may take a few moments</p>
                </div>
            );
        }

        if (generatedImageUrl) {
            return (
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Your AI Character is Ready!</h2>
                    <div className="relative inline-block">
                        <img
                            src={generatedImageUrl}
                            alt="Generated character"
                            className={`w-80 h-96 object-cover rounded-xl mx-auto transition-opacity duration-500 ${
                                showImage ? 'opacity-100' : 'opacity-0'
                            }`}
                        />
                    </div>
                    <p className="text-gray-400 mt-4">Click "Save Character" to add a name and save your AI</p>
                </div>
            );
        }

        return null;
    };

    // Handle image generation
    const handleGenerateImage = async () => {
        setIsGenerating(true);
        setShowImage(false);

        try {
            const characterDetails = {
                style: selectedStyle,
                ethnicity: selectedEthnicity,
                age: selectedAge,
                eyeColor: selectedEyeColor,
                hairStyle: selectedHairStyle,
                hairColor: selectedHairColor,
                bodyType: selectedBodyType,
                breastSize: selectedBreastSize,
                buttSize: selectedButtSize,
                personality: selectedPersonality,
                relationship: selectedRelationship,
            };

            const response = await fetch('/api/generate-character-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ characterDetails }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate image');
            }

            const data = await response.json();

            if (data.success && data.imageUrl) {
                setGeneratedImageUrl(data.imageUrl);
                setEnhancedPrompt(data.enhancedPrompt);
                setTimeout(() => {
                    setShowImage(true);
                }, 100);
            } else {
                throw new Error('No image URL received');
            }
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Something went wrong while generating your AI. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle character save
    const handleSaveCharacter = async () => {
        if (!characterName.trim()) {
            alert('Please enter a character name');
            return;
        }

        setIsSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                alert('Please login to save your character');
                return;
            }

            const characterDetails = {
                style: selectedStyle,
                ethnicity: selectedEthnicity,
                age: selectedAge,
                eyeColor: selectedEyeColor,
                hairStyle: selectedHairStyle,
                hairColor: selectedHairColor,
                bodyType: selectedBodyType,
                breastSize: selectedBreastSize,
                buttSize: selectedButtSize,
                personality: selectedPersonality,
                relationship: selectedRelationship,
            };

            const response = await fetch('/api/save-character', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    characterName: characterName.trim(),
                    imageUrl: generatedImageUrl,
                    characterDetails,
                    enhancedPrompt,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save character');
            }

            const data = await response.json();

            await new Promise(resolve => setTimeout(resolve, 1000));

            router.push('/my-ai');
        } catch (error) {
            console.error('Error saving character:', error);
            alert('Failed to save character. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0: return selectedStyle !== null;
            case 1: return selectedEthnicity !== null && selectedEyeColor !== null;
            case 2: return selectedHairStyle !== null;
            case 3: return selectedHairColor !== null;
            case 4: return selectedBodyType !== null;
            case 5: return selectedBreastSize !== null && selectedButtSize !== null;
            case 6: return true;
            case 7: return true;
            default: return false;
        }
    };

    const nextStep = () => {
        if (currentStep < 7) {
            setCurrentStep(currentStep + 1);
        } else if (currentStep === 7 && generatedImageUrl) {
            setShowNameDialog(true);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (imagesLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading character creation options...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto pt-16 px-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <span className="text-2xl">🧬</span>
                        <h1 className="text-3xl font-bold ml-2">Create my AI</h1>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center space-x-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((step) => (
                            <div key={step} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                                    step <= currentStep
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "bg-secondary border-secondary text-muted-foreground"
                                }`}>
                                    {step < currentStep ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        step + 1
                                    )}
                                </div>
                                {step < 7 && (
                                    <div className={`w-12 h-1 mx-2 ${
                                        step < currentStep ? "bg-[#FF4D8D]" : "bg-[#252525]"
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-[#252525] rounded-2xl p-8 shadow-2xl">
                    {currentStep === 0 && renderStep0()}
                    {currentStep === 1 && renderStep1()}
                    {currentStep === 2 && renderStep2()}
                    {currentStep === 3 && renderStep3()}
                    {currentStep === 4 && renderStep4()}
                    {currentStep === 5 && renderStep5()}
                    {currentStep === 6 && renderStep6()}
                    {currentStep === 7 && renderStep7()}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                                currentStep === 0
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-700 text-white hover:bg-gray-600'
                            }`}
                        >
                            Previous
                        </button>

                        {currentStep === 7 && generatedImageUrl && !showNameDialog ? (
                            <button
                                onClick={() => setShowNameDialog(true)}
                                className="px-6 py-3 bg-[#FF4D8D] text-white rounded-lg font-semibold hover:bg-[#FF3D7D] transition-colors"
                            >
                                Save Character
                            </button>
                        ) : (
                            <button
                                onClick={nextStep}
                                disabled={!canProceed()}
                                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                                    canProceed()
                                        ? 'bg-[#FF4D8D] text-white hover:bg-[#FF3D7D]'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {currentStep === 7 ? 'Generate' : 'Next'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Name Dialog */}
                {showNameDialog && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-[#252525] rounded-2xl p-8 max-w-md w-full mx-4">
                            <h3 className="text-xl font-bold mb-4">Name Your Character</h3>
                            <input
                                type="text"
                                value={characterName}
                                onChange={(e) => setCharacterName(e.target.value)}
                                placeholder="Enter character name"
                                className="w-full px-4 py-3 bg-[#333333] border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#FF4D8D] mb-6"
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNameDialog(false)}
                                    className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveCharacter}
                                    disabled={isSaving || !characterName.trim()}
                                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                                        isSaving || !characterName.trim()
                                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                            : 'bg-[#FF4D8D] text-white hover:bg-[#FF3D7D]'
                                    }`}
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
