import { type NextRequest, NextResponse } from "next/server"
import { deductTokens, refundTokens } from "@/lib/token-utils"
import { createClient } from "@/lib/supabase-server"

// ModelsLab API Configuration (PRIMARY)
const MODELSLAB_API_KEY = process.env.MODELSLAB_API_KEY!
const MODELSLAB_TEXT_TO_IMAGE_ENDPOINT = "https://modelslab.com/api/v6/images/text2img"
const MODELSLAB_FETCH_ENDPOINT = "https://modelslab.com/api/v6/images/fetch"

// Novita API Configuration (FALLBACK)
const NOVITA_API_KEY = process.env.NOVITA_API_KEY!
const NOVITA_TXT2IMG_ENDPOINT = "https://api.novita.ai/v3/async/txt2img"
const NOVITA_TASK_RESULT_ENDPOINT = "https://api.novita.ai/v3/async/task-result"

// Dynamic token costs based on model and image count
const getTokenCost = (model: string, imageCount: number = 1): number => {
  let baseTokenCost = 5 // Default for seedream models
  
  if (model === "flux") {
    baseTokenCost = 10
  } else if (model === "stability" || model === "seedream") {
    baseTokenCost = 5
  }
  
  return baseTokenCost * imageCount
}

export async function POST(req: NextRequest) {
  let userId: string | undefined
  let tokenCost: number | undefined
  let actualImageCount: number
  let actualModel: string
  let usedFallback = false

  try {
    const supabase = createClient();
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid or empty request body" }, { status: 400 });
    }

    const {
      prompt,
      negativePrompt = "",
      selectedCount,
      selectedModel,
    } = body;

    actualImageCount = selectedCount ? parseInt(selectedCount) : 1
    actualModel = selectedModel || "seedream"

    // Calculate dynamic token cost
    tokenCost = getTokenCost(actualModel, actualImageCount)
    console.log(`💰 Token cost calculation: ${tokenCost} tokens (model: ${actualModel}, images: ${actualImageCount})`)

    // Authenticate user
    const authHeader = req.headers.get('authorization')
    const userIdHeader = req.headers.get('x-user-id')

    console.log("🔑 Auth headers:", {
      hasAuthHeader: !!authHeader,
      hasUserIdHeader: !!userIdHeader
    })

    // Try Authorization header first
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (!authError && user) {
          userId = user.id
          console.log("✅ Authentication successful via token")
        }
      } catch (error) {
        console.error("❌ Token authentication error:", error)
      }
    }

    // Fallback to User ID header
    if (!userId && userIdHeader) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users_view')
          .select('id')
          .eq('id', userIdHeader)
          .single()

        if (!userError && userData) {
          userId = userIdHeader
          console.log("✅ Authentication successful via user ID")
        }
      } catch (error) {
        console.error("❌ User ID validation error:", error)
      }
    }

    if (!userId) {
      return NextResponse.json({
        error: "Unauthorized",
        details: "Please ensure you are logged in."
      }, { status: 401 })
    }

    // Check premium status
    let isPremium = false
    try {
      const premiumResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/user-premium-status?userId=${userId}`, {
        headers: {
          'Authorization': authHeader || '',
          'X-User-ID': userId
        }
      })

      if (premiumResponse.ok) {
        const premiumData = await premiumResponse.json()
        isPremium = premiumData.isPremium || false
        console.log(`${isPremium ? '👑' : '🆓'} User premium status: ${isPremium}`)
      }
    } catch (error) {
      console.error("⚠️ Failed to check premium status:", error)
    }

    // Limit free users to 1 image
    if (!isPremium && actualImageCount > 1) {
      return NextResponse.json({
        error: "Free users can only generate 1 image at a time",
        details: "Upgrade to Premium to generate multiple images simultaneously.",
        isPremium: false,
        upgradeUrl: "/premium?tab=subscriptions"
      }, { status: 403 })
    }

    // Deduct tokens
    console.log(`💳 Deducting ${tokenCost} tokens for user ${userId.substring(0, 8)}...`)
    try {
      const deductionResult = await deductTokens(userId, tokenCost, "Image generation", {}, "image_generation")
      if (!deductionResult) {
        return NextResponse.json({
          error: "Failed to deduct tokens. Please check your token balance."
        }, { status: 402 })
      }
      console.log(`✅ Successfully deducted ${tokenCost} tokens`)
    } catch (error: any) {
      console.error("❌ Token deduction error:", error.message)
      return NextResponse.json({
        error: error.message || "Insufficient tokens"
      }, { status: 402 })
    }

    // Track model usage
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/track-model-usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader || '',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          modelId: actualModel,
          tokensConsumed: tokenCost,
          usageType: 'image_generation',
          metadata: {
            imageCount: actualImageCount,
            prompt: prompt.substring(0, 100)
          }
        })
      })
    } catch (error) {
      console.warn("⚠️ Error tracking model usage:", error)
    }

    // TRY MODELSLAB FIRST (PRIMARY) - Using MoP Mix Juggernaut for photorealism
    console.log("🎨 Attempting generation with ModelsLab MoP Mix Juggernaut...")
    let taskId: string | null = null
    let modelsLabSuccess = false

    try {
      const modelsLabRequestBody = {
        key: MODELSLAB_API_KEY,
        model_id: "mop-mix-juggernaut",
        lora_model: [],
        prompt: prompt + ", ultra realistic, 8K, RAW, unedited, cinematic lighting, professional photography, hyper detail",
        negative_prompt: negativePrompt || "(worst quality:2), (low quality:2), (normal quality:2), (jpeg artifacts), (blurry), (duplicate), (morbid), (mutilated), (out of frame), (extra limbs), (bad anatomy), (disfigured), (deformed), (cross-eye), (glitch), (oversaturated), (overexposed), (underexposed), (bad proportions), (bad hands), (bad feet), (cloned face), (long neck), (missing arms), (missing legs), (extra fingers), (fused fingers), (poorly drawn hands), (poorly drawn face), (mutation), (deformed eyes), watermark, text, logo, signature, grainy, tiling, censored, ugly, blurry eyes, noisy image, bad lighting, unnatural skin, asymmetry",
        width: "1024",
        height: "1024",
        num_inference_steps: "12",
        scheduler: "LCMScheduler",
        guidance_scale: 1.0,
        enhance_prompt: false
      }

      console.log("📤 ModelsLab Request:", JSON.stringify(modelsLabRequestBody, null, 2))

      const modelsLabResponse = await fetch(MODELSLAB_TEXT_TO_IMAGE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(modelsLabRequestBody),
      })

      const modelsLabData = await modelsLabResponse.json()
      console.log("📥 ModelsLab Response:", JSON.stringify(modelsLabData, null, 2))

      if (modelsLabResponse.ok) {
        // Check if ModelsLab returned images immediately
        const imageUrls = modelsLabData.output || modelsLabData.meta?.output
        
        if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0 && imageUrls[0]) {
          // Images returned - return them immediately
          console.log(`✅ ModelsLab returned ${imageUrls.length} images immediately (status: ${modelsLabData.status})`)
          
          // Return success response directly to frontend
          return NextResponse.json({
            status: "TASK_STATUS_SUCCEED",
            images: imageUrls,
            tokens_used: tokenCost,
            provider: "modelslab"
          })
        } else if (modelsLabData.id || modelsLabData.fetch_result) {
          // Async response - need to poll for status
          const fetchUrl = modelsLabData.fetch_result
          taskId = `modelslab_${modelsLabData.id}`
          modelsLabSuccess = true
          console.log(`✅ ModelsLab task created: ${taskId}`)
          
          // Poll for completion if needed
          if (fetchUrl) {
            console.log('🔗 Fetch URL:', fetchUrl);
            
            let attempts = 0;
            const maxAttempts = 30;
            let taskCompleted = false;

            while (attempts < maxAttempts && !taskCompleted) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              attempts++;

              const statusResponse = await fetch(fetchUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  key: MODELSLAB_API_KEY,
                }),
              });

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                console.log(`📊 Poll attempt ${attempts}:`, statusData.status);
                
                const statusImageUrls = statusData.output || statusData.meta?.output;

                if (statusData.status === 'success' && statusImageUrls && Array.isArray(statusImageUrls) && statusImageUrls.length > 0) {
                  // Return images immediately
                  return NextResponse.json({
                    status: "TASK_STATUS_SUCCEED",
                    images: statusImageUrls,
                    tokens_used: tokenCost,
                    provider: "modelslab"
                  })
                } else if (statusData.status === 'failed' || statusData.status === 'error') {
                  throw new Error(`ModelsLab task failed: ${statusData.message || 'Unknown error'}`);
                }
              }
            }
          }
        } else {
          console.warn("⚠️ ModelsLab unexpected response format:", modelsLabData)
        }
      } else {
        console.warn("⚠️ ModelsLab failed:", modelsLabData.message || modelsLabData.error)
      }
    } catch (error) {
      console.error("❌ ModelsLab Error:", error)
    }

    // FALLBACK TO NOVITA IF MODELSLAB FAILED
    if (!modelsLabSuccess) {
      console.log("🔄 Falling back to Novita (less restrictive for adult content)...")
      usedFallback = true

      try {
        // Using the original working model from your code
        const novitaRequestBody = {
          extra: {
            response_image_type: "jpeg",
          },
          request: {
            prompt: prompt + ", photorealistic, 8k, high quality, detailed, professional photography, natural lighting, detailed skin texture, anatomically correct, proper proportions",
            model_name: "epicrealism_naturalSinRC1VAE_106430.safetensors", // This is the working model from your original code
            negative_prompt: (negativePrompt ? negativePrompt + ", " : "") + "cartoon, anime, painting, drawing, illustration, low quality, blurry, distorted, deformed, bad anatomy, extra limbs, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, ugly, bad proportions, disfigured, malformed limbs, fused fingers, watermark, signature",
            width: 512,
            height: 1024,
            image_num: actualImageCount,
            steps: 40, // Increased for better quality
            seed: -1,
            sampler_name: "DPM++ 2M Karras",
            guidance_scale: 7.5,
          },
        }

        console.log("📤 Novita Request:", JSON.stringify(novitaRequestBody, null, 2))

        const novitaResponse = await fetch(NOVITA_TXT2IMG_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NOVITA_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(novitaRequestBody),
        })

        if (!novitaResponse.ok) {
          const errorData = await novitaResponse.text()
          console.error("❌ Novita API error:", errorData)
          throw new Error("Both ModelsLab and Novita failed")
        }

        const novitaData = await novitaResponse.json()
        console.log("📥 Novita Response:", JSON.stringify(novitaData, null, 2))

        if (novitaData.task_id) {
          taskId = `novita_${novitaData.task_id}`
          console.log(`✅ Novita task created: ${taskId}`)
        } else {
          throw new Error("No task ID from Novita")
        }
      } catch (error) {
        console.error("❌ Novita Error:", error)
        
        // Refund tokens since both APIs failed
        console.log(`🔄 Refunding ${tokenCost} tokens due to API failure...`)
        try {
          await refundTokens(
            userId,
            tokenCost,
            "Refund for failed image generation (both APIs failed)",
            { error_message: error instanceof Error ? error.message : String(error) }
          )
          console.log(`✅ Successfully refunded ${tokenCost} tokens`)
        } catch (refundError) {
          console.error("❌ Refund error:", refundError)
        }

        return NextResponse.json({
          error: "Image generation failed",
          details: "Both primary and fallback services are unavailable. Your tokens have been refunded.",
          refunded: true
        }, { status: 500 })
      }
    }

    if (!taskId) {
      // Refund tokens
      try {
        await refundTokens(userId, tokenCost, "Refund for failed task creation", {})
      } catch (refundError) {
        console.error("❌ Refund error:", refundError)
      }

      return NextResponse.json({
        error: "Failed to create generation task",
        refunded: true
      }, { status: 500 })
    }

    return NextResponse.json({
      task_id: taskId,
      tokens_used: tokenCost,
      used_fallback: usedFallback,
      provider: usedFallback ? "novita" : "modelslab"
    })

  } catch (error) {
    console.error("❌ Error generating image:", error);

    // Refund tokens on unexpected error
    if (userId && tokenCost) {
      try {
        await refundTokens(
          userId,
          tokenCost,
          "Refund for server error during generation",
          { error_message: error instanceof Error ? error.message : String(error) }
        )
        console.log(`✅ Successfully refunded ${tokenCost} tokens`)
      } catch (refundError) {
        console.error("❌ Refund error:", refundError)
      }
    }

    return NextResponse.json({
      error: "Internal server error",
      details: "An unexpected error occurred. Your tokens have been refunded.",
      refunded: !!userId && !!tokenCost
    }, { status: 500 });
  }
}