"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function CreateCharacterPage() {
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
    const [customOccupation, setCustomOccupation] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const supabase = createClientComponentClient();
    const router = useRouter();

    // Helper function to get local image URL from public directory
    const getImageUrl = (categoryName: string, optionKey: string, fallbackUrl: string) => {
        if (!selectedStyle) return fallbackUrl;

        // Complete mapping of all available images with their exact filenames
        const imageMap: { [key: string]: { [key: string]: { [key: string]: string } } } = {
            'style': {
                'realistic': '/character creation/choose style/realistic.jpg',
                'anime': '/character creation/choose style/Anime.jpg'
            },
            'ethnicity': {
                'realistic': {
                    'caucasian': '/character creation/Ethnicity/realistic/caucasian-3a46e91357800f7a540500d0115fe6364650b7a1d9e42673061b670fc226464d.webp',
                    'latina': '/character creation/Ethnicity/realistic/latina-9f20e7d69703c6489122ac5b69865ac1252a7527c4509522f5d8df717067d1a6.webp',
                    'asian': '/character creation/Ethnicity/realistic/asian-45e23043a3b83e0bcffb1cf30a17f0c8d41f551616b930b11591e97cadfdde29.webp',
                    'african': '/character creation/Ethnicity/realistic/black_afro-3221c8246e818f77797a50c83fca1f39767780b709deeb661cb80041b5fcc4c5.webp',
                    'indian': '/character creation/Ethnicity/realistic/arab-29d6da7f90a7a14b34f080498a9996712ee80d3d5dfb6f9d7ce39be0e6b9922a.webp'
                },
                'anime': {
                    'caucasian': '/character creation/Ethnicity/anime/caucasian-6eeb84a8a1286e6e0cbd3481004ed75ff16d47953e68bb5ae73986c071ce155d.webp',
                    'latina': '/character creation/Ethnicity/anime/latina-39821dee40be7e96ee5c45de9390693cd9f748e0980f96b052f77fff6236c4aa.webp',
                    'asian': '/character creation/Ethnicity/anime/asian-35657a499bbd78c20435391d54af8427ad0cd23a343ae42da1125a2737e8d3ad.webp',
                    'african': '/character creation/Ethnicity/anime/black_afro-4a8e68d341b244c2d3bffeb7ba7eaf2a1b8b1cef409e7fda0dfac37ad5149553.webp',
                    'indian': '/character creation/Ethnicity/anime/arab-271d55b6f7bf8cbdcc323c3cde06d9267cd5f92d12ab5cb7a06bdc5824347f54.webp'
                }
            },
            'eyeColor': {
                'realistic': {
                    'brown': '/character creation/eye  color/realistic/brown-9dbba1bb37191cf2fc0d0fd3f2c118277e3f1c257a66a870484739fa1bd33c42.webp',
                    'blue': '/character creation/eye  color/realistic/blue-f7e75e814204c4d8464d36f525b0f6e9191557a585cb4be01e91ca8eb45416d0.webp',
                    'green': '/character creation/eye  color/realistic/green-8a705cc5c2c435ac0f7addd110f4dd2b883a2e35b6403659c3e30cc7a741359c.webp'
                },
                'anime': {
                    'brown': '/character creation/eye  color/anime/brown-9dbba1bb37191cf2fc0d0fd3f2c118277e3f1c257a66a870484739fa1bd33c42.webp',
                    'blue': '/character creation/eye  color/anime/blue-f7e75e814204c4d8464d36f525b0f6e9191557a585cb4be01e91ca8eb45416d0.webp',
                    'green': '/character creation/eye  color/anime/green-8a705cc5c2c435ac0f7addd110f4dd2b883a2e35b6403659c3e30cc7a741359c.webp',
                    'red': '/character creation/eye  color/anime/red-ff81c2e205a08d9a80fbd8f8773296a6f842690c19c8a1db4f8b3aeccd380327.webp',
                    'yellow': '/character creation/eye  color/anime/yellow-9799b66b14a68e561a20597361141f24f886d68d84b0f6c8735ac2ea69ff486f.webp'
                }
            },
            'hairStyle': {
                'realistic': {
                    'straight': '/character creation/hair styles/realistic/straight-50860930cc288e0be0fef427289870b6d421a4eba489ec04600fd0b3b1b32826.webp',
                    'short': '/character creation/hair styles/realistic/short-f0217dbf9ddb599d1d7ceff342e1a9b846f4ea5c083e66630dbeff55ce574691.webp',
                    'long': '/character creation/hair styles/realistic/long-eb817bef0e59709224eaea96296f33b260b2574a6fc10a5a1f10bfcd5dffb9cd.webp',
                    'curly': '/character creation/hair styles/realistic/curly-4110486ba90646770e43e75e045c0cd9db53fcec28cadbc0222985bdf39d3cea.webp',
                    'bangs': '/character creation/hair styles/realistic/bangs-c696685cde2cdd4b88d2c80cd8bd71a1d62d94348a840e2ff3ec2b974f1b9e75.webp',
                    'bun': '/character creation/hair styles/realistic/bun-93b58d32131d1905f6654d992d20bad3adc798ced8e028d89274aac1d7743885.webp'
                },
                'anime': {
                    'straight': '/character creation/hair styles/anime/straight-44d31e24433b284d0806280c7a6969506c1bc6047264f2ec3efae3363f9191cd.webp',
                    'short': '/character creation/hair styles/anime/short-ea46bfb17c34dcc6ec64e6e138314c617e700cf4e74c41135cb22e30b82a0fe5.webp',
                    'long': '/character creation/hair styles/anime/long-f64056f0882ec6947312a4ea4336c22ddc15afa3f4c617d6b028a6751f633fa0.webp',
                    'curly': '/character creation/hair styles/anime/curly-f8fc6f08fcccf0e54034efc8b891c196e376cdd51ebbe29a3c9be66be4c3042f.webp',
                    'bangs': '/character creation/hair styles/anime/bangs-eee819dbe88b63bcfd3fefdb0d024770e19d2bee0ef1343cd1339ad980543ccc.webp',
                    'ponytail': '/character creation/hair styles/anime/ponytail-860f6eb8a1c955f15bf6c66051cbda9ce78bdecdd27b3321b11a06c3537feb1b.webp',
                    'bun': '/character creation/hair styles/anime/bun-0fcc2a3c6b2b68b0c42de93cb57875e4b652ddd441f47d3cd0d2f6dc6bfc9f60.webp'
                }
            },
            'bodyType': {
                'realistic': {
                    'athletic': '/character creation/Body Type/realistic/body_athletic-c3a09551c478b35d5bab217b946c8d3da9eab3ac3f6c4d1fa106aa4e5d763c16.webp',
                    'slim': '/character creation/Body Type/realistic/body_slim-ce55ea6a36780b0dcc3d75e5c8e23eeea3ff2177c9bbcadd92e02e61e6397b96.webp',
                    'curvy': '/character creation/Body Type/realistic/body_curvy-f18d1ee332d545ae810fd3351824967d9710c4ae8991e6184abb5af5f5ec21bc.webp',
                    'voluptuous': '/character creation/Body Type/realistic/body_voluptuous-d4128f1812af6cff122eb24e973b08eed430b86a315cb80f2506f1258f12535c.webp',
                    'petite': '/character creation/Body Type/realistic/body_petite-b18f62bc362b356112dcf9255804da6c878a0d63d461b683201e6119aa78ea4e.webp'
                },
                'anime': {
                    'athletic': '/character creation/Body Type/anime/body_athletic-0bb37d31c6e9d0dda344526ea3e5ea019216f7bc042ecdba0465e790b9f29921.webp',
                    'slim': '/character creation/Body Type/anime/body_slim-422415ecd930ba6275832c1e4c7105eece45afe83100640f82fa5386fa9b7c01.webp',
                    'curvy': '/character creation/Body Type/anime/body_curvy-d53df8ea34c9a47c0e620e8376d77b95b65d7816c47d4308955e3d1ce4c7bf8a.webp',
                    'voluptuous': '/character creation/Body Type/anime/body_voluptuous-224e774f7e5f8ee33282e73d0602b5ba2ee7113f9abb1cca1287be9b7ca038e2.webp'
                }
            },
            'breastSize': {
                'realistic': {
                    'small': '/character creation/Breast Size/realistic/breasts_small-9063db23ae2bf7f45863129f664bef7edc1164fccc4d03007c1a92c561470cd5.webp',
                    'medium': '/character creation/Breast Size/realistic/breasts_medium-93b4eeb0383da569f549ba5f0b63f2fd6e40b91dc987a5dc54818378507f9fa2.webp',
                    'large': '/character creation/Breast Size/realistic/breasts_large-6a6177548ba4e4a026b91fd4d1cb335ca0af31fba1773355f160a31248e30263.webp',
                    'huge': '/character creation/Breast Size/realistic/breasts_huge-f358a0ada25c9c77fa364bb83d10455f909f09c0b7c8779f27122ed7c91c98e2.webp',
                    'flat': '/character creation/Breast Size/realistic/breasts_flat-340ebc7321d0635c127c7649dba47bbee9b64f6b7d1b9b30cedcf6c75fdd5cf8.webp'
                },
                'anime': {
                    'small': '/character creation/Breast Size/anime/breasts_small-6e6481616712533ff44c47851d7d0acbde763cb2ded75b4613ce64e1795ad5d7.webp',
                    'medium': '/character creation/Breast Size/anime/breasts_medium-fc995e083ebd4d323b4b521ecf8ff7dfbd427304da0923a65f251b427dc1622a.webp',
                    'large': '/character creation/Breast Size/anime/breasts_large-77ff79635706eb0266ac76ced6f5625dc7e08ddafa0236d1db8d4b28e18fb541.webp',
                    'huge': '/character creation/Breast Size/anime/breasts_huge-7c8384265c1f14ec564ed7f51167a1391685d1ea62b7bb78776534f52c70d98e.webp'
                }
            },
            'buttSize': {
                'realistic': {
                    'small': '/character creation/Butt Size/realistic/butt_small-48c1b16f769794ec161e5cd5c125e55d4d472abb1d0d99ecfb342f0905e4cc0f.webp',
                    'medium': '/character creation/Butt Size/realistic/butt_medium-04bd199dd8a881e43a677706acfa72c896b65f027ae63b9c098da6734eef6b0f.webp',
                    'large': '/character creation/Butt Size/realistic/butt_large-30ddcb640a43c5882b28b9a56a5d68e711c3f6cd0ad86adf68ebfc5433a8401f.webp',
                    'athletic': '/character creation/Butt Size/realistic/butt_athletic-48e02ae266c3edba8cb56ccc74300afd82493dea11a51850e7ad9ffa4a28e69f.webp',
                    'skinny': '/character creation/Butt Size/realistic/butt_skinny-1fdd436cdf4ccc633444352998fe0f1094c62c69a568196f646067b71f1b7152.webp'
                },
                'anime': {
                    'small': '/character creation/Butt Size/anime/butt_small-9064e87dbf6e8f4e8b93bc61c719eb9b2b93ed65f61a730b10f3316bd913350f.webp',
                    'medium': '/character creation/Butt Size/anime/butt_medium-3282067ffc84e822fbcb8fbd56aa4d37ccb768667ce2608f5c0637bb460d85ca.webp',
                    'large': '/character creation/Butt Size/anime/butt_large-3b8f3ff013c70eb4c63231d4356f75f04006f9e4cc77e41df1f8505647063d49.webp',
                    'athletic': '/character creation/Butt Size/anime/butt_athletic-0ace722a99eedcd941d296049cf910caa40830f773d17f4514dbad0bb378340c.webp'
                }
            }
        };

        // Get the image path
        const categoryImages = imageMap[categoryName];
        if (!categoryImages) return fallbackUrl;

        // For style, return directly
        if (categoryName === 'style') {
            return categoryImages[optionKey] || fallbackUrl;
        }

        // For other categories, get the style-specific images
        const styleImages = categoryImages[selectedStyle];
        if (!styleImages) return fallbackUrl;

        return styleImages[optionKey] || fallbackUrl;
    };

    // Auto-start generation when reaching step 7
    useEffect(() => {
        if (currentStep === 7 && !generatedImageUrl && !isGenerating) {
            handleGenerateImage();
        }
    }, [currentStep]);

    // Step 6 is summary/preview step
    const renderStep6 = () => {
        return (
            <>
                {/* Summary Section */}
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2 text-card-foreground">Review Your AI Character</h2>
                    <p className="text-muted-foreground">Review your selections before we create your AI</p>
                </div>

                {/* Summary Grid - show all selections */}
                <div className="max-w-6xl mx-auto mb-8">
                    {/* Mobile: 2 columns, Desktop: 5 columns */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
                        {renderSummaryCard('Style', selectedStyle, 'style')}
                        {renderSummaryCard('Ethnicity', selectedEthnicity, 'ethnicity')}
                        {renderSummaryCard('Age', selectedAge, 'age')}
                        {renderSummaryCard('Eyes Color', selectedEyeColor, 'eyeColor')}
                        {renderSummaryCard('Hair Style', selectedHairStyle, 'hairStyle')}
                    </div>

                    {/* Second Row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
                        {renderSummaryCard('Hair Color', selectedHairColor, 'hairColor')}
                        {renderSummaryCard('Body Type', selectedBodyType, 'bodyType')}
                        {renderSummaryCard('Breast Size', selectedBreastSize, 'breastSize')}
                        {renderSummaryCard('Butt Size', selectedButtSize, 'buttSize')}
                        {renderSummaryCard('Personality', selectedPersonality, 'personality')}
                    </div>

                    {/* Third Row - Relationship centered */}
                    <div className="flex justify-center mb-8">
                        <div className="w-full md:w-1/5">
                            {renderSummaryCard('Relationship', selectedRelationship, 'relationship')}
                        </div>
                    </div>

                    {/* Custom Description Section */}
                    <div className="max-w-2xl mx-auto bg-secondary/30 p-4 sm:p-6 rounded-2xl border border-border">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <span>📝</span> Custom Description (Optional)
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add specific details about her occupation, style, or setting (e.g., "A high school student at her desk" or "A mysterious artist in Tokyo"). This will influence both her appearance and her personality.
                        </p>
                        <textarea
                            value={customOccupation}
                            onChange={(e) => setCustomOccupation(e.target.value)}
                            placeholder="Describe her background or a specific setting..."
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none text-foreground transition-all min-h-[100px] resize-none text-sm sm:text-base"
                            maxLength={300}
                        />
                    </div>
                </div>
            </>
        );
    };

    // Step 7 is generation step - show loading or generated image
    const renderStep7 = () => {
        if (isGenerating) {
            return (
                <>
                    {/* Creating your AI Section - Loading */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold mb-2 text-card-foreground">Creating your AI</h2>
                        <p className="text-muted-foreground">Please wait while we generate your perfect AI character...</p>
                    </div>

                    {/* Loading Animation */}
                    <div className="flex justify-center items-center mb-8">
                        <div className="relative">
                            <div className="w-32 h-32 border-4 border-border rounded-full animate-spin border-t-[#1111FF]"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 border-4 border-border rounded-full animate-spin border-t-[#1111FF]" style={{ animationDirection: 'reverse' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Text */}
                    <div className="text-center">
                        <p className="text-lg text-muted-foreground mb-2">Generating your AI character...</p>
                        <p className="text-sm text-muted-foreground">This may take a few moments</p>
                    </div>
                </>
            );
        } else {
            return (
                <>
                    {/* Creating your AI Section - Complete */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold mb-2">Your AI is Ready!</h2>
                        <p className="text-muted-foreground">Your AI character has been created successfully</p>
                    </div>

                    {/* Generated Image Display */}
                    {generatedImageUrl && (
                        <div className="mb-8 flex justify-center">
                            <div
                                className={`rounded-2xl overflow-hidden border-4 border-[#1111FF] shadow-2xl transition-opacity duration-1000 ${showImage ? 'opacity-100' : 'opacity-0'
                                    }`}
                                style={{ maxWidth: '500px' }}
                            >
                                <img
                                    src={generatedImageUrl}
                                    alt="Generated AI Character"
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>
                    )}
                </>
            );
        }
    };

    // Handle image generation - starts automatically when stepping to creation step
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
                customOccupation: customOccupation
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
                // Trigger fade-in animation
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
                customOccupation: customOccupation.trim() || undefined,
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

            // Give the database and cache a moment to update
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Redirect to My AI page
            router.push('/my-ai');
        } catch (error) {
            console.error('Error saving character:', error);
            alert('Failed to save character. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Summary step - shows all selections
    const renderSummaryCard = (title: string, value: string | null, type: string, imageUrl?: string) => {
        const emoji = getEmoji(type, value);
        const displayValue = getDisplayValue(value, type);

        return (
            <div className="bg-secondary rounded-xl p-4 flex flex-col items-center justify-center min-w-[120px] min-h-[120px] border border-border">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={displayValue}
                        className="w-16 h-16 rounded-lg object-cover mb-2"
                    />
                ) : (
                    <div className="text-2xl mb-2">{emoji}</div>
                )}
                <div className="text-center">
                    <h3 className="font-semibold text-sm text-secondary-foreground mb-1">{title}</h3>
                    <p className="text-xs text-muted-foreground">{displayValue}</p>
                </div>
            </div>
        );
    };

    // Helper function to get display values
    const getDisplayValue = (value: string | null, type: string) => {
        if (!value) return 'Not selected';

        const displayMap: { [key: string]: { [key: string]: string } } = {
            style: {
                'realistic': 'Realistic',
                'anime': 'Anime'
            },
            ethnicity: {
                'caucasian': 'Caucasian',
                'latina': 'Latina',
                'asian': 'Asian'
            },
            age: {
                'teen': 'Teen (18+)',
                '20s': '20s'
            },
            eyeColor: {
                'brown': 'Brown',
                'blue': 'Blue',
                'green': 'Green',
                'red': 'Red',
                'yellow': 'Yellow'
            },
            hairStyle: {
                'straight': 'Straight',
                'short': 'Short',
                'long': 'Long',
                'curly': 'Curly',
                'bangs': 'Bangs',
                'bun': 'Bun',
                'ponytail': 'Ponytail'
            },
            hairColor: {
                'blonde': 'Blonde',
                'brunette': 'Brunette',
                'black': 'Black'
            },
            bodyType: {
                'petite': 'Petite',
                'slim': 'Slim',
                'athletic': 'Athletic',
                'voluptuous': 'Voluptuous',
                'curvy': 'Curvy'
            },
            breastSize: {
                'small': 'Small',
                'medium': 'Medium',
                'large': 'Large',
                'huge': 'Huge',
                'flat': 'Flat'
            },
            buttSize: {
                'small': 'Small',
                'medium': 'Medium',
                'large': 'Large',
                'athletic': 'Athletic',
                'skinny': 'Skinny'
            },
            personality: {
                'caregiver': 'Caregiver',
                'sage': 'Sage',
                'innocent': 'Innocent',
                'jester': 'Jester',
                'temptress': 'Temptress',
                'dominant': 'Dominant',
                'submissive': 'Submissive',
                'lover': 'Lover',
                'nympho': 'Nympho',
                'mean': 'Mean',
                'confidant': 'Confidant',
                'experimenter': 'Experimenter'
            },
            relationship: {
                'stranger': 'Stranger',
                'school-mate': 'School Mate',
                'colleague': 'Colleague',
                'mentor': 'Mentor',
                'girlfriend': 'Girlfriend',
                'sex-friend': 'Sex Friend',
                'wife': 'Wife',
                'mistress': 'Mistress',
                'friend': 'Friend',
                'best-friend': 'Best Friend',
                'step-sister': 'Step Sister',
                'step-mom': 'Step Mom'
            }
        };

        return displayMap[type]?.[value] || value;
    };

    const getEmoji = (type: string, value: string | null) => {
        const emojiMap: { [key: string]: { [key: string]: string } } = {
            style: {
                'realistic': '🎭',
                'anime': '🎌'
            },
            ethnicity: {
                'caucasian': '👩🏻',
                'latina': '👩🏽',
                'asian': '👩🏼'
            },
            age: {
                'teen': '👩‍🎓',
                '20s': '👩‍💼'
            },
            eyeColor: {
                'brown': '👁️',
                'blue': '👁️'
            },
            hairStyle: {
                'straight': '💇‍♀️',
                'short': '✂️',
                'long': '🌊'
            },
            hairColor: {
                'blonde': '🌟',
                'brunette': '🟤',
                'black': '⚫'
            },
            bodyType: {
                'slim': '🏃‍♀️',
                'athletic': '💪',
                'voluptuous': '💃'
            },
            breastSize: {
                'medium': '👙',
                'large': '👙',
                'huge': '👙'
            },
            buttSize: {
                'medium': '🍑',
                'large': '🍑',
                'athletic': '🍑'
            },
            personality: {
                'caregiver': '🤝',
                'sage': '🧙‍♀️',
                'innocent': '⭐',
                'jester': '🃏',
                'temptress': '💋',
                'dominant': '👑',
                'submissive': '💝',
                'lover': '💕',
                'nympho': '🔥',
                'mean': '🧊',
                'confidant': '💬',
                'experimenter': '🔬'
            },
            relationship: {
                'stranger': '🕶️',
                'school-mate': '🎓',
                'colleague': '💼',
                'mentor': '💎',
                'girlfriend': '❤️',
                'sex-friend': '👥',
                'wife': '💍',
                'mistress': '👑',
                'friend': '🙌',
                'best-friend': '🎉',
                'step-sister': '👩‍❤️‍👩',
                'step-mom': '👩‍👦'
            }
        };

        return emojiMap[type]?.[value || ''] || '❓';
    };

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="max-w-4xl mx-auto pt-8 sm:pt-12 md:pt-16 px-2 sm:px-4 md:px-6">
                {/* Header */}
                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                    <div className="flex items-center justify-center mb-2 sm:mb-4">
                        <span className="text-lg sm:text-xl md:text-2xl">🧬</span>
                        <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold ml-1 sm:ml-2">Create my AI</h1>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-center mb-4 sm:mb-6 md:mb-8">
                    <div className="flex items-center space-x-0.5 sm:space-x-1 md:space-x-2 overflow-x-auto pb-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((step) => (
                            <div key={step} className="flex items-center flex-shrink-0">
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center text-xs sm:text-xs md:text-sm font-bold ${step <= currentStep
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "bg-secondary border-secondary text-muted-foreground"
                                    }`}>
                                    {step < currentStep ? (
                                        <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        step + 1
                                    )}
                                </div>
                                {step < 7 && (
                                    <div className={`w-4 sm:w-6 md:w-12 h-1 mx-0.5 sm:mx-1 md:mx-2 ${step < currentStep ? "bg-primary" : "bg-secondary"
                                        }`} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-card rounded-xl sm:rounded-2xl p-2 sm:p-4 md:p-8 shadow-2xl relative z-10 border border-border">
                    {currentStep === 0 && (
                        <>
                            <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-card-foreground">Choose Style*</h2>
                            </div>

                            {/* Style Selection - Ultra-small screens: vertical stack, small screens: horizontal */}
                            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                                {/* Realistic Option */}
                                <div
                                    className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedStyle === 'realistic'
                                        ? 'bg-primary border-2 border-primary'
                                        : 'border-2 border-border hover:border-primary'
                                        }`}
                                    onClick={() => setSelectedStyle('realistic')}
                                >
                                    <div className="w-[120px] h-[160px] sm:w-[140px] sm:h-[206px] lg:w-[320px] lg:h-[443px] rounded-lg sm:rounded-xl overflow-hidden relative">
                                        <img
                                            src="/character creation/choose style/realistic.jpg"
                                            alt="Realistic character example"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2">
                                            <span className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${selectedStyle === 'realistic'
                                                ? 'bg-primary-foreground text-primary'
                                                : 'bg-background/50 text-foreground'
                                                }`}>
                                                Realistic
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Anime Option */}
                                <div
                                    className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedStyle === 'anime'
                                        ? 'bg-primary border-2 border-primary'
                                        : 'border-2 border-border hover:border-primary'
                                        }`}
                                    onClick={() => setSelectedStyle('anime')}
                                >
                                    <div className="w-[120px] h-[160px] sm:w-[140px] sm:h-[206px] lg:w-[320px] lg:h-[443px] rounded-lg sm:rounded-xl overflow-hidden relative">
                                        <img
                                            src="/character creation/choose style/Anime.jpg"
                                            alt="Anime character example"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2">
                                            <span className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${selectedStyle === 'anime'
                                                ? 'bg-primary-foreground text-primary'
                                                : 'bg-background/50 text-foreground'
                                                }`}>
                                                Anime
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 1 && (
                        <>
                            {/* Choose Ethnicity Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Choose Ethnicity*</h2>
                                </div>
                                {/* Ultra-small: 2 columns, Small: 3 columns, Desktop: 5 columns */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-center md:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                                    {/* Caucasian */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEthnicity === 'caucasian'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEthnicity('caucasian')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('ethnicity', 'caucasian', '/character creation/Ethnicity/realistic/caucasian-3a46e91357800f7a540500d0115fe6364650b7a1d9e42673061b670fc226464d.webp')}
                                                alt="Caucasian"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedEthnicity === 'caucasian'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Caucasian
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Latina */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEthnicity === 'latina'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEthnicity('latina')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('ethnicity', 'latina', '/character creation/Ethnicity/realistic/latina-9f20e7d69703c6489122ac5b69865ac1252a7527c4509522f5d8df717067d1a6.webp')}
                                                alt="Latina"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedEthnicity === 'latina'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Latina
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Asian */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEthnicity === 'asian'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEthnicity('asian')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('ethnicity', 'asian', '/character creation/Ethnicity/realistic/asian-45e23043a3b83e0bcffb1cf30a17f0c8d41f551616b930b11591e97cadfdde29.webp')}
                                                alt="Asian"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedEthnicity === 'asian'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Asian
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* African */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEthnicity === 'african'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEthnicity('african')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('ethnicity', 'african', '/character creation/Ethnicity/realistic/black_afro-3221c8246e818f77797a50c83fca1f39767780b709deeb661cb80041b5fcc4c5.webp')}
                                                alt="African"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedEthnicity === 'african'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    African
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Indian */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEthnicity === 'indian'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEthnicity('indian')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('ethnicity', 'indian', '/character creation/Ethnicity/realistic/arab-29d6da7f90a7a14b34f080498a9996712ee80d3d5dfb6f9d7ce39be0e6b9922a.webp')}
                                                alt="Indian"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedEthnicity === 'indian'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Indian
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Choose Age Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Choose Age</h2>
                                </div>
                                <div className="flex justify-center items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                                    {/* Teen(18+) */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 ${selectedAge === 'teen'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedAge('teen')}
                                    >
                                        <span className={`text-xs sm:text-sm font-semibold ${selectedAge === 'teen' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            Teen(18+)
                                        </span>
                                    </div>

                                    {/* 20s */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 ${selectedAge === '20s'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedAge('20s')}
                                    >
                                        <span className={`text-xs sm:text-sm font-semibold ${selectedAge === '20s' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            20s
                                        </span>
                                    </div>

                                    {/* 30s */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 ${selectedAge === '30s'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedAge('30s')}
                                    >
                                        <span className={`text-xs sm:text-sm font-semibold ${selectedAge === '30s' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            30s
                                        </span>
                                    </div>

                                    {/* 40s+ */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 ${selectedAge === '40s+'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedAge('40s+')}
                                    >
                                        <span className={`text-xs sm:text-sm font-semibold ${selectedAge === '40s+' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            40s+
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Choose Eye Color Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Choose Eye Color*</h2>
                                </div>
                                <div className="flex justify-center items-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                                    {/* Brown */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEyeColor === 'brown'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEyeColor('brown')}
                                    >
                                        <div className="w-16 h-12 sm:w-20 sm:h-16 md:w-24 md:h-16 rounded-lg sm:rounded-lg overflow-hidden relative">
                                            <img
                                                src={getImageUrl('eyeColor', 'brown', '/character creation/eye  color/realistic/brown-9dbba1bb37191cf2fc0d0fd3f2c118277e3f1c257a66a870484739fa1bd33c42.webp')}
                                                alt="Brown eyes"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="text-center mt-1 sm:mt-2">
                                            <span className={`text-xs sm:text-sm font-semibold ${selectedEyeColor === 'brown' ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                Brown
                                            </span>
                                        </div>
                                    </div>

                                    {/* Blue */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEyeColor === 'blue'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEyeColor('blue')}
                                    >
                                        <div className="w-16 h-12 sm:w-20 sm:h-16 md:w-24 md:h-16 rounded-lg sm:rounded-lg overflow-hidden relative">
                                            <img
                                                src={getImageUrl('eyeColor', 'blue', '/character creation/eye  color/realistic/blue-f7e75e814204c4d8464d36f525b0f6e9191557a585cb4be01e91ca8eb45416d0.webp')}
                                                alt="Blue eyes"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="text-center mt-1 sm:mt-2">
                                            <span className={`text-xs sm:text-sm font-semibold ${selectedEyeColor === 'blue' ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                Blue
                                            </span>
                                        </div>
                                    </div>

                                    {/* Green */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEyeColor === 'green'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEyeColor('green')}
                                    >
                                        <div className="w-16 h-12 sm:w-20 sm:h-16 md:w-24 md:h-16 rounded-lg sm:rounded-lg overflow-hidden relative">
                                            <img
                                                src={getImageUrl('eyeColor', 'green', '/character creation/eye  color/realistic/green-8a705cc5c2c435ac0f7addd110f4dd2b883a2e35b6403659c3e30cc7a741359c.webp')}
                                                alt="Green eyes"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="text-center mt-1 sm:mt-2">
                                            <span className={`text-xs sm:text-sm font-semibold ${selectedEyeColor === 'green' ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                Green
                                            </span>
                                        </div>
                                    </div>

                                    {/* Red */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEyeColor === 'red'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEyeColor('red')}
                                    >
                                        <div className="w-16 h-12 sm:w-20 sm:h-16 md:w-24 md:h-16 rounded-lg sm:rounded-lg overflow-hidden relative">
                                            <img
                                                src={getImageUrl('eyeColor', 'red', '/character creation/eye  color/anime/red-ff81c2e205a08d9a80fbd8f8773296a6f842690c19c8a1db4f8b3aeccd380327.webp')}
                                                alt="Red eyes"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="text-center mt-1 sm:mt-2">
                                            <span className={`text-xs sm:text-sm font-semibold ${selectedEyeColor === 'red' ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                Red
                                            </span>
                                        </div>
                                    </div>

                                    {/* Yellow */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedEyeColor === 'yellow'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedEyeColor('yellow')}
                                    >
                                        <div className="w-16 h-12 sm:w-20 sm:h-16 md:w-24 md:h-16 rounded-lg sm:rounded-lg overflow-hidden relative">
                                            <img
                                                src={getImageUrl('eyeColor', 'yellow', '/character creation/eye  color/anime/yellow-9799b66b14a68e561a20597361141f24f886d68d84b0f6c8735ac2ea69ff486f.webp')}
                                                alt="Yellow eyes"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="text-center mt-1 sm:mt-2">
                                            <span className={`text-xs sm:text-sm font-semibold ${selectedEyeColor === 'yellow' ? 'text-foreground' : 'text-muted-foreground'
                                                }`}>
                                                Yellow
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 2 && (
                        <>
                            {/* Choose Hair Style Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-card-foreground">Choose Hair Style*</h2>
                                </div>

                                {/* Hair styles - Ultra-small: 2 columns, Small: 3 columns, Desktop: scattered layout */}
                                <div className="relative mb-4 sm:mb-6">
                                    {/* Mobile: Grid layout */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:hidden gap-2 sm:gap-3 mb-4 sm:mb-6">
                                        {/* Straight */}
                                        <div
                                            className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedHairStyle === 'straight'
                                                ? 'bg-primary border-2 border-primary'
                                                : 'border-2 border-border hover:border-primary'
                                                }`}
                                            onClick={() => setSelectedHairStyle('straight')}
                                        >
                                            <div className="w-[70px] h-[70px] sm:w-[88px] sm:h-[88px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                                <img
                                                    src={getImageUrl('hairStyle', 'straight', '/character creation/hair styles/realistic/straight-50860930cc288e0be0fef427289870b6d421a4eba489ec04600fd0b3b1b32826.webp')}
                                                    alt="Straight hair"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                    <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedHairStyle === 'straight'
                                                        ? 'bg-primary-foreground text-primary'
                                                        : 'bg-background/50 text-foreground'
                                                        }`}>
                                                        Straight
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Curly */}
                                        <div
                                            className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'curly'
                                                ? 'bg-primary border-2 border-primary'
                                                : 'border-2 border-border hover:border-primary'
                                                }`}
                                            onClick={() => setSelectedHairStyle('curly')}
                                        >
                                            <div className="w-[88px] h-[88px] rounded-xl overflow-hidden relative mx-auto">
                                                <img
                                                    src={getImageUrl('hairStyle', 'curly', '/character creation/hair styles/realistic/curly-4110486ba90646770e43e75e045c0cd9db53fcec28cadbc0222985bdf39d3cea.webp')}
                                                    alt="Curly hair"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'curly'
                                                        ? 'bg-primary-foreground text-primary'
                                                        : 'bg-background/50 text-foreground'
                                                        }`}>
                                                        Curly
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bangs */}
                                        <div
                                            className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'bangs'
                                                ? 'bg-primary border-2 border-primary'
                                                : 'border-2 border-border hover:border-primary'
                                                }`}
                                            onClick={() => setSelectedHairStyle('bangs')}
                                        >
                                            <div className="w-[88px] h-[88px] rounded-xl overflow-hidden relative mx-auto">
                                                <img
                                                    src={getImageUrl('hairStyle', 'bangs', '/character creation/hair styles/realistic/bangs-c696685cde2cdd4b88d2c80cd8bd71a1d62d94348a840e2ff3ec2b974f1b9e75.webp')}
                                                    alt="Bangs hair"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'bangs'
                                                        ? 'bg-primary-foreground text-primary'
                                                        : 'bg-background/50 text-foreground'
                                                        }`}>
                                                        Bangs
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Short */}
                                        <div
                                            className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'short'
                                                ? 'bg-primary border-2 border-primary'
                                                : 'border-2 border-border hover:border-primary'
                                                }`}
                                            onClick={() => setSelectedHairStyle('short')}
                                        >
                                            <div className="w-[88px] h-[88px] rounded-xl overflow-hidden relative mx-auto">
                                                <img
                                                    src={getImageUrl('hairStyle', 'short', '/character creation/hair styles/realistic/short-f0217dbf9ddb599d1d7ceff342e1a9b846f4ea5c083e66630dbeff55ce574691.webp')}
                                                    alt="Short hair"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'short'
                                                        ? 'bg-primary-foreground text-primary'
                                                        : 'bg-background/50 text-foreground'
                                                        }`}>
                                                        Short
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Long */}
                                        <div
                                            className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'long'
                                                ? 'bg-primary border-2 border-primary'
                                                : 'border-2 border-border hover:border-primary'
                                                }`}
                                            onClick={() => setSelectedHairStyle('long')}
                                        >
                                            <div className="w-[88px] h-[88px] rounded-xl overflow-hidden relative mx-auto">
                                                <img
                                                    src={getImageUrl('hairStyle', 'long', '/character creation/hair styles/realistic/long-eb817bef0e59709224eaea96296f33b260b2574a6fc10a5a1f10bfcd5dffb9cd.webp')}
                                                    alt="Long hair"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'long'
                                                        ? 'bg-primary-foreground text-primary'
                                                        : 'bg-background/50 text-foreground'
                                                        }`}>
                                                        Long
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bun */}
                                        <div
                                            className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'bun'
                                                ? 'bg-primary border-2 border-primary'
                                                : 'border-2 border-border hover:border-primary'
                                                }`}
                                            onClick={() => setSelectedHairStyle('bun')}
                                        >
                                            <div className="w-[88px] h-[88px] rounded-xl overflow-hidden relative mx-auto">
                                                <img
                                                    src={getImageUrl('hairStyle', 'bun', '/character creation/hair styles/realistic/bun-93b58d32131d1905f6654d992d20bad3adc798ced8e028d89274aac1d7743885.webp')}
                                                    alt="Bun hair"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'bun'
                                                        ? 'bg-primary-foreground text-primary'
                                                        : 'bg-background/50 text-foreground'
                                                        }`}>
                                                        Bun
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Ponytail - Only available for anime */}
                                        {selectedStyle === 'anime' ? (
                                            <div
                                                className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'ponytail'
                                                    ? 'bg-primary border-2 border-primary'
                                                    : 'border-2 border-border hover:border-primary'
                                                    }`}
                                                onClick={() => setSelectedHairStyle('ponytail')}
                                            >
                                                <div className="w-[88px] h-[88px] rounded-xl overflow-hidden relative mx-auto">
                                                    <img
                                                        src={getImageUrl('hairStyle', 'ponytail', '/character creation/hair styles/anime/ponytail-860f6eb8a1c955f15bf6c66051cbda9ce78bdecdd27b3321b11a06c3537feb1b.webp')}
                                                        alt="Ponytail hair"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'ponytail'
                                                            ? 'bg-primary-foreground text-primary'
                                                            : 'bg-background/50 text-foreground'
                                                            }`}>
                                                            Ponytail
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Desktop: Scattered layout */}
                                    <div className="hidden md:block">
                                        {/* First row - Straight and Short with gaps */}
                                        <div className="flex justify-center items-center mb-8">
                                            {/* Straight */}
                                            <div className="mx-4">
                                                <div
                                                    className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'straight'
                                                        ? 'bg-primary border-2 border-primary'
                                                        : 'border-2 border-border hover:border-primary'
                                                        }`}
                                                    onClick={() => setSelectedHairStyle('straight')}
                                                >
                                                    <div className="w-[88px] h-[88px] lg:w-[120px] lg:h-[120px] rounded-xl overflow-hidden relative">
                                                        <img
                                                            src={getImageUrl('hairStyle', 'straight', '/character creation/hair styles/realistic/straight-50860930cc288e0be0fef427289870b6d421a4eba489ec04600fd0b3b1b32826.webp')}
                                                            alt="Straight hair"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'straight'
                                                                ? 'bg-primary-foreground text-primary'
                                                                : 'bg-background/50 text-foreground'
                                                                }`}>
                                                                Straight
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Curly */}
                                            <div className="mx-6">
                                                <div
                                                    className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'curly'
                                                        ? 'bg-primary border-2 border-primary'
                                                        : 'border-2 border-border hover:border-primary'
                                                        }`}
                                                    onClick={() => setSelectedHairStyle('curly')}
                                                >
                                                    <div className="w-[88px] h-[88px] lg:w-[120px] lg:h-[120px] rounded-xl overflow-hidden relative">
                                                        <img
                                                            src={getImageUrl('hairStyle', 'curly', '/character creation/hair styles/realistic/curly-4110486ba90646770e43e75e045c0cd9db53fcec28cadbc0222985bdf39d3cea.webp')}
                                                            alt="Curly hair"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'curly'
                                                                ? 'bg-primary-foreground text-primary'
                                                                : 'bg-background/50 text-foreground'
                                                                }`}>
                                                                Curly
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bangs */}
                                            <div className="mx-6">
                                                <div
                                                    className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'bangs'
                                                        ? 'bg-primary border-2 border-primary'
                                                        : 'border-2 border-border hover:border-primary'
                                                        }`}
                                                    onClick={() => setSelectedHairStyle('bangs')}
                                                >
                                                    <div className="w-[88px] h-[88px] lg:w-[120px] lg:h-[120px] rounded-xl overflow-hidden relative">
                                                        <img
                                                            src={getImageUrl('hairStyle', 'bangs', '/character creation/hair styles/realistic/bangs-c696685cde2cdd4b88d2c80cd8bd71a1d62d94348a840e2ff3ec2b974f1b9e75.webp')}
                                                            alt="Bangs hair"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'bangs'
                                                                ? 'bg-primary-foreground text-primary'
                                                                : 'bg-background/50 text-foreground'
                                                                }`}>
                                                                Bangs
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Short */}
                                            <div className="mx-4">
                                                <div
                                                    className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'short'
                                                        ? 'bg-primary border-2 border-primary'
                                                        : 'border-2 border-border hover:border-primary'
                                                        }`}
                                                    onClick={() => setSelectedHairStyle('short')}
                                                >
                                                    <div className="w-[88px] h-[88px] lg:w-[120px] lg:h-[120px] rounded-xl overflow-hidden relative">
                                                        <img
                                                            src={getImageUrl('hairStyle', 'short', '/character creation/hair styles/realistic/short-f0217dbf9ddb599d1d7ceff342e1a9b846f4ea5c083e66630dbeff55ce574691.webp')}
                                                            alt="Short hair"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'short'
                                                                ? 'bg-primary-foreground text-primary'
                                                                : 'bg-background/50 text-foreground'
                                                                }`}>
                                                                Short
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Second row - Long positioned more to the left */}
                                        <div className="flex justify-center items-center">
                                            <div className="mx-8">
                                                <div
                                                    className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'long'
                                                        ? 'bg-primary border-2 border-primary'
                                                        : 'border-2 border-border hover:border-primary'
                                                        }`}
                                                    onClick={() => setSelectedHairStyle('long')}
                                                >
                                                    <div className="w-[88px] h-[88px] lg:w-[120px] lg:h-[120px] rounded-xl overflow-hidden relative">
                                                        <img
                                                            src={getImageUrl('hairStyle', 'long', '/character creation/hair styles/realistic/long-eb817bef0e59709224eaea96296f33b260b2574a6fc10a5a1f10bfcd5dffb9cd.webp')}
                                                            alt="Long hair"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'long'
                                                                ? 'bg-primary-foreground text-primary'
                                                                : 'bg-background/50 text-foreground'
                                                                }`}>
                                                                Long
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bun */}
                                            <div className="mx-12">
                                                <div
                                                    className={`relative cursor-pointer rounded-xl p-2 transition-all duration-200 ${selectedHairStyle === 'bun'
                                                        ? 'bg-primary border-2 border-primary'
                                                        : 'border-2 border-border hover:border-primary'
                                                        }`}
                                                    onClick={() => setSelectedHairStyle('bun')}
                                                >
                                                    <div className="w-[88px] h-[88px] lg:w-[120px] lg:h-[120px] rounded-xl overflow-hidden relative">
                                                        <img
                                                            src={getImageUrl('hairStyle', 'bun', '/character creation/hair styles/realistic/bun-93b58d32131d1905f6654d992d20bad3adc798ced8e028d89274aac1d7743885.webp')}
                                                            alt="Bun hair"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedHairStyle === 'bun'
                                                                ? 'bg-primary-foreground text-primary'
                                                                : 'bg-background/50 text-foreground'
                                                                }`}>
                                                                Bun
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Choose Hair Color Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Choose Hair Color*</h2>
                                </div>
                                {/* Ultra-small: vertical stack, Small: horizontal */}
                                <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
                                    {/* Blonde */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 ${selectedHairColor === 'blonde'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedHairColor('blonde')}
                                    >
                                        <span className={`text-xs sm:text-sm font-semibold ${selectedHairColor === 'blonde' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            Blonde
                                        </span>
                                    </div>

                                    {/* Brunette */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 ${selectedHairColor === 'brunette'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedHairColor('brunette')}
                                    >
                                        <span className={`text-xs sm:text-sm font-semibold ${selectedHairColor === 'brunette' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            Brunette
                                        </span>
                                    </div>

                                    {/* Black */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 ${selectedHairColor === 'black'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedHairColor('black')}
                                    >
                                        <span className={`text-xs sm:text-sm font-semibold ${selectedHairColor === 'black' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            Black
                                        </span>
                                    </div>

                                    {/* Red */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 ${selectedHairColor === 'red'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedHairColor('red')}
                                    >
                                        <span className={`text-xs sm:text-sm font-semibold ${selectedHairColor === 'red' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            Red
                                        </span>
                                    </div>

                                    {/* Gray */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 transition-all duration-200 ${selectedHairColor === 'gray'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedHairColor('gray')}
                                    >
                                        <span className={`text-xs sm:text-sm font-semibold ${selectedHairColor === 'gray' ? 'text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            Gray
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 3 && (
                        <>
                            {/* Choose Body Type Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Choose Body Type*</h2>
                                </div>
                                {/* Ultra-small: 2 columns with smaller items, Small: 3 columns, Desktop: 5 columns */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-center md:items-center gap-1.5 sm:gap-2 md:gap-4 mb-4 sm:mb-6 md:mb-8 max-w-full overflow-x-hidden">
                                    {/* Petite */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBodyType === 'petite'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBodyType('petite')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('bodyType', 'petite', '/character creation/Body Type/realistic/body_petite-b18f62bc362b356112dcf9255804da6c878a0d63d461b683201e6119aa78ea4e.webp')}
                                                alt="Petite body"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBodyType === 'petite'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Petite
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Slim */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBodyType === 'slim'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBodyType('slim')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('bodyType', 'slim', '/character creation/Body Type/realistic/body_slim-ce55ea6a36780b0dcc3d75e5c8e23eeea3ff2177c9bbcadd92e02e61e6397b96.webp')}
                                                alt="Slim body"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBodyType === 'slim'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Slim
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Athletic */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBodyType === 'athletic'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBodyType('athletic')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('bodyType', 'athletic', '/character creation/Body Type/realistic/body_athletic-c3a09551c478b35d5bab217b946c8d3da9eab3ac3f6c4d1fa106aa4e5d763c16.webp')}
                                                alt="Athletic body"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBodyType === 'athletic'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Athletic
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Voluptuous */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBodyType === 'voluptuous'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBodyType('voluptuous')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('bodyType', 'voluptuous', '/character creation/Body Type/realistic/body_voluptuous-d4128f1812af6cff122eb24e973b08eed430b86a315cb80f2506f1258f12535c.webp')}
                                                alt="Voluptuous body"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBodyType === 'voluptuous'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Voluptuous
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Curvy */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBodyType === 'curvy'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBodyType('curvy')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('bodyType', 'curvy', '/character creation/Body Type/realistic/body_curvy-f18d1ee332d545ae810fd3351824967d9710c4ae8991e6184abb5af5f5ec21bc.webp')}
                                                alt="Curvy body"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBodyType === 'curvy'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Curvy
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Choose Breast Size Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Choose Breast Size*</h2>
                                </div>
                                {/* Ultra-small: 2 columns, Small: 3 columns, Desktop: 6 columns */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-center md:items-center gap-1.5 sm:gap-2 md:gap-4 mb-4 sm:mb-6 md:mb-8 max-w-full overflow-x-hidden">
                                    {/* Small */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBreastSize === 'small'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBreastSize('small')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('breastSize', 'small', '/character creation/Breast Size/realistic/breasts_small-9063db23ae2bf7f45863129f664bef7edc1164fccc4d03007c1a92c561470cd5.webp')}
                                                alt="Small breast size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBreastSize === 'small'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Small
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Medium */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBreastSize === 'medium'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBreastSize('medium')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('breastSize', 'medium', '/character creation/Breast Size/realistic/breasts_medium-93b4eeb0383da569f549ba5f0b63f2fd6e40b91dc987a5dc54818378507f9fa2.webp')}
                                                alt="Medium breast size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBreastSize === 'medium'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Medium
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Large */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBreastSize === 'large'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBreastSize('large')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('breastSize', 'large', '/character creation/Breast Size/realistic/breasts_large-6a6177548ba4e4a026b91fd4d1cb335ca0af31fba1773355f160a31248e30263.webp')}
                                                alt="Large breast size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBreastSize === 'large'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Large
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Huge */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBreastSize === 'huge'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBreastSize('huge')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('breastSize', 'huge', '/character creation/Breast Size/realistic/breasts_huge-f358a0ada25c9c77fa364bb83d10455f909f09c0b7c8779f27122ed7c91c98e2.webp')}
                                                alt="Huge breast size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBreastSize === 'huge'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Huge
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Flat */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedBreastSize === 'flat'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedBreastSize('flat')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('breastSize', 'flat', '/character creation/Breast Size/realistic/breasts_flat-340ebc7321d0635c127c7649dba47bbee9b64f6b7d1b9b30cedcf6c75fdd5cf8.webp')}
                                                alt="Flat breast size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedBreastSize === 'flat'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Flat
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Choose Butt Size Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2">Choose Butt Size*</h2>
                                </div>
                                {/* Ultra-small: 2 columns, Small: 3 columns, Desktop: 5 columns */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-center md:items-center gap-1.5 sm:gap-2 md:gap-4 mb-4 sm:mb-6 md:mb-8 max-w-full overflow-x-hidden">
                                    {/* Small */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedButtSize === 'small'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedButtSize('small')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('buttSize', 'small', '/character creation/Butt Size/realistic/butt_small-48c1b16f769794ec161e5cd5c125e55d4d472abb1d0d99ecfb342f0905e4cc0f.webp')}
                                                alt="Small butt size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedButtSize === 'small'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Small
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Medium */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedButtSize === 'medium'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedButtSize('medium')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('buttSize', 'medium', '/character creation/Butt Size/realistic/butt_medium-04bd199dd8a881e43a677706acfa72c896b65f027ae63b9c098da6734eef6b0f.webp')}
                                                alt="Medium butt size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedButtSize === 'medium'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Medium
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Large */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedButtSize === 'large'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedButtSize('large')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('buttSize', 'large', '/character creation/Butt Size/realistic/butt_large-30ddcb640a43c5882b28b9a56a5d68e711c3f6cd0ad86adf68ebfc5433a8401f.webp')}
                                                alt="Large butt size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedButtSize === 'large'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Large
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Athletic */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedButtSize === 'athletic'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedButtSize('athletic')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('buttSize', 'athletic', '/character creation/Butt Size/realistic/butt_athletic-48e02ae266c3edba8cb56ccc74300afd82493dea11a51850e7ad9ffa4a28e69f.webp')}
                                                alt="Athletic butt size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedButtSize === 'athletic'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Athletic
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skinny */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-1 sm:p-2 transition-all duration-200 ${selectedButtSize === 'skinny'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedButtSize('skinny')}
                                    >
                                        <div className="w-[60px] h-[60px] sm:w-[88px] sm:h-[88px] lg:w-[120px] lg:h-[120px] rounded-lg sm:rounded-xl overflow-hidden relative mx-auto">
                                            <img
                                                src={getImageUrl('buttSize', 'skinny', '/character creation/Butt Size/realistic/butt_skinny-1fdd436cdf4ccc633444352998fe0f1094c62c69a568196f646067b71f1b7152.webp')}
                                                alt="Skinny butt size"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2">
                                                <span className={`px-1 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${selectedButtSize === 'skinny'
                                                    ? 'bg-primary-foreground text-primary'
                                                    : 'bg-background/50 text-foreground'
                                                    }`}>
                                                    Skinny
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 4 && (
                        <>
                            {/* Choose Personality Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-card-foreground">Choose Personality*</h2>
                                </div>

                                {/* Personality Grid - Ultra-small: 1 column, Small: 2 columns, Desktop: 3 columns */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-4xl mx-auto mb-4 sm:mb-6 md:mb-8">
                                    {/* Row 1 */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'caregiver'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('caregiver')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🤝</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'caregiver' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Caregiver
                                            </h3>
                                            <p className={`text-[10px] sm:text-xs leading-relaxed ${selectedPersonality === 'caregiver' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Nurturing, protective, and always there to offer comfort.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'sage'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('sage')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🧙‍♀️</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'sage' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Sage
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'sage' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Wise, reflective, and a source of guidance.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'innocent'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('innocent')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">⭐</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'innocent' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Innocent
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'innocent' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Optimistic, naive, and sees world with wonder.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Row 2 */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'jester'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('jester')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🃏</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'jester' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Jester
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'jester' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Playful, humorous, and always there to make you laugh.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'temptress'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('temptress')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">💋</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'temptress' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Temptress
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'temptress' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Flirtatious, playful, and always leaving you wanting more.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'dominant'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('dominant')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">👑</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'dominant' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Dominant
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'dominant' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Assertive, controlling, and commanding.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Row 3 */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'submissive'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('submissive')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">💝</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'submissive' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Submissive
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'submissive' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Obedient, yielding, and happy to follow.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'lover'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('lover')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">💕</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'lover' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Lover
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'lover' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Romantic, affectionate, and cherishes deep emotional connection.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'nympho'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('nympho')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🔥</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'nympho' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Nympho
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'nympho' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Insatiable, passionate, and constantly craving intimacy.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Row 4 - Additional personalities */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'mean'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('mean')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🧊</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'mean' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Mean
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'mean' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Cold, dismissive, and often sarcastic.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'confidant'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('confidant')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">💬</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'confidant' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Confidant
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'confidant' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Trustworthy, a good listener, and always can offer advice.
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedPersonality === 'experimenter'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedPersonality('experimenter')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🔬</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedPersonality === 'experimenter' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Experimenter
                                            </h3>
                                            <p className={`text-xs leading-relaxed ${selectedPersonality === 'experimenter' ? 'text-foreground/80' : 'text-muted-foreground'
                                                }`}>
                                                Curious, willing, eager to try new things.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 5 && (
                        <>
                            {/* Choose Relationship Section */}
                            <div className="mb-6 sm:mb-8 md:mb-12">
                                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-card-foreground">Choose Relationship*</h2>
                                </div>

                                {/* Relationship Grid - Ultra-small: 1 column, Small: 2 columns, Desktop: 3 columns */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-5xl mx-auto mb-4 sm:mb-6 md:mb-8 max-w-full overflow-x-hidden">
                                    {/* Row 1 */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'stranger'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('stranger')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🕶️</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'stranger' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Stranger
                                            </h3>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'school-mate'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('school-mate')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🎓</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'school-mate' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                School Mate
                                            </h3>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'colleague'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('colleague')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">💼</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'colleague' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Colleague
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Row 2 */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'mentor'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('mentor')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">💎</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'mentor' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Mentor
                                            </h3>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'girlfriend'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('girlfriend')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">❤️</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'girlfriend' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Girlfriend
                                            </h3>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'sex-friend'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('sex-friend')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">👥</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'sex-friend' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Sex Friend
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Row 3 */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'wife'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('wife')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">💍</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'wife' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Wife
                                            </h3>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'mistress'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('mistress')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">👑</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'mistress' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Mistress
                                            </h3>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'friend'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('friend')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🙌</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'friend' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Friend
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Row 4 */}
                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'best-friend'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('best-friend')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">🎉</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'best-friend' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Best Friend
                                            </h3>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'step-sister'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('step-sister')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">👩‍❤️‍👩</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'step-sister' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Step Sister
                                            </h3>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative cursor-pointer rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 transition-all duration-200 ${selectedRelationship === 'step-mom'
                                            ? 'bg-primary border-2 border-primary'
                                            : 'bg-secondary border-2 border-border hover:border-primary'
                                            }`}
                                        onClick={() => setSelectedRelationship('step-mom')}
                                    >
                                        <div className="text-center">
                                            <div className="text-lg sm:text-xl md:text-2xl mb-1 sm:mb-2">👩‍👦</div>
                                            <h3 className={`font-semibold text-xs sm:text-sm mb-1 ${selectedRelationship === 'step-mom' ? 'text-foreground' : 'text-foreground'
                                                }`}>
                                                Step Mom
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 6 && renderStep6()}
                    {currentStep === 7 && renderStep7()}



                    {/* Navigation Buttons */}
                    <div className={`flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 ${currentStep === 0 ? 'justify-end' : 'justify-between'} relative z-20`}>
                        {currentStep > 0 && (
                            <button
                                className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all font-semibold text-xs sm:text-sm md:text-base order-1 sm:order-1 w-full sm:w-auto relative z-10 border border-border"
                                onClick={() => setCurrentStep(currentStep - 1)}
                                disabled={isGenerating}
                            >
                                ← Previous
                            </button>
                        )}
                        <button
                            className={`px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base md:text-lg transition-all order-2 sm:order-2 w-full sm:w-auto relative z-20 ${currentStep === 0
                                ? (selectedStyle ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary text-muted-foreground cursor-not-allowed border border-border')
                                : currentStep === 1
                                    ? (selectedEthnicity && selectedAge && selectedEyeColor ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary text-muted-foreground cursor-not-allowed border border-border')
                                    : currentStep === 2
                                        ? (selectedHairStyle && selectedHairColor ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary text-muted-foreground cursor-not-allowed border border-border')
                                        : currentStep === 3
                                            ? (selectedBodyType && selectedBreastSize && selectedButtSize ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary text-muted-foreground cursor-not-allowed border border-border')
                                            : currentStep === 4
                                                ? (selectedPersonality ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary text-muted-foreground cursor-not-allowed border border-border')
                                                : currentStep === 5
                                                    ? (selectedRelationship ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary text-muted-foreground cursor-not-allowed border border-border')
                                                    : currentStep === 6
                                                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                                        : currentStep === 7
                                                            ? (generatedImageUrl ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-secondary text-muted-foreground cursor-not-allowed border border-border')
                                                            : isGenerating
                                                                ? 'bg-secondary text-muted-foreground cursor-not-allowed border border-border'
                                                                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                }`}
                            disabled={
                                currentStep === 0
                                    ? !selectedStyle
                                    : currentStep === 1
                                        ? !(selectedEthnicity && selectedAge && selectedEyeColor)
                                        : currentStep === 2
                                            ? !(selectedHairStyle && selectedHairColor)
                                            : currentStep === 3
                                                ? !(selectedBodyType && selectedBreastSize && selectedButtSize)
                                                : currentStep === 4
                                                    ? !selectedPersonality
                                                    : currentStep === 5
                                                        ? !selectedRelationship
                                                        : currentStep === 6
                                                            ? false
                                                            : currentStep === 7
                                                                ? !generatedImageUrl
                                                                : isGenerating
                            }
                            onClick={() => {
                                if (currentStep === 7) {
                                    // Show the naming dialog when user clicks Continue on step 7
                                    setShowNameDialog(true);
                                } else {
                                    setCurrentStep(currentStep + 1);
                                }
                            }}
                        >
                            {currentStep === 5 ? 'Review Character →' : currentStep === 6 ? 'Create my AI →' : currentStep === 7 ? 'Continue →' : 'Next →'}
                        </button>
                    </div>
                </div>
            </div>



            {/* Character Naming Dialog */}
            {showNameDialog && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-8 max-w-md w-full shadow-2xl border border-border">
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 text-center text-card-foreground">Name Your AI Character</h2>
                        <p className="text-muted-foreground mb-4 sm:mb-6 text-center text-xs sm:text-sm md:text-base">Choose a unique name to bring your AI to life</p>

                        <input
                            type="text"
                            value={characterName}
                            onChange={(e) => setCharacterName(e.target.value)}
                            placeholder="Enter character name..."
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-foreground mb-3 transition-colors text-sm sm:text-base"
                            maxLength={50}
                            autoFocus
                        />

                        <label className="text-xs text-muted-foreground mb-1 block">
                            Custom Description (optional)
                        </label>
                        <textarea
                            value={customOccupation}
                            onChange={(e) => setCustomOccupation(e.target.value)}
                            placeholder="e.g., 'High school student and part-time waitress' or 'Mysterious artist living in Tokyo'"
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-foreground mb-4 sm:mb-6 transition-colors text-sm sm:text-base min-h-[60px] resize-none"
                            maxLength={200}
                            rows={2}
                        />

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <button
                                onClick={() => setShowNameDialog(false)}
                                disabled={isSaving}
                                className="flex-1 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground font-semibold transition-all text-xs sm:text-sm md:text-base"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCharacter}
                                disabled={isSaving || !characterName.trim()}
                                className={`flex-1 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg font-semibold transition-all text-xs sm:text-sm md:text-base ${isSaving || !characterName.trim()
                                    ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                    }`}
                            >
                                {isSaving ? 'Naming...' : 'Name Character'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
