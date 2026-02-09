import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/client"
import { uploadImageToBunny } from "@/lib/cloudinary-upload"

// ModelsLab API Configuration
const MODELSLAB_API_KEY = process.env.MODELSLAB_API_KEY!
const MODELSLAB_IMG2VIDEO_ENDPOINT = "https://modelslab.com/api/v6/video/img2video"

// Helper function to validate video URL
const isValidVideoUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')
    return response.ok && (contentType?.startsWith('video/') || contentType?.includes('mp4'))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  let userId: string | null = null;
  const VIDEO_TOKEN_COST = 50;

  try {
    const {
      image_url,
      prompt,
      width = 512,
      height = 512,
      length = 81,
      steps = 25,
      seed = 42,
      cfg = 2,
      motion_bucket_id = 127,
      cond_aug = 0.02
    } = await request.json();

    if (!image_url) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Enhance the video prompt using Novita API
    const novitaApiKey = process.env.NOVITA_API_KEY;
    let enhancedPrompt = prompt;

    if (novitaApiKey) {
      try {
        console.log("[API] Enhancing video prompt with Novita AI...");
        const novitaResponse = await fetch('https://api.novita.ai/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${novitaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-v3.1',
            messages: [
              {
                role: 'system',
                content: 'You are an expert at creating detailed video animation prompts. Transform simple descriptions into vivid, detailed animation prompts that capture movement, emotion, and visual dynamics. Keep it concise (under 100 words) but descriptive, focusing on the action and how it should be animated.'
              },
              {
                role: 'user',
                content: `Create a detailed video animation prompt from this: "${prompt}". Make it vivid and suitable for AI video generation, focusing on the movement and animation style.`
              }
            ],
            max_tokens: 150,
            temperature: 0.8,
            response_format: { type: 'text' }
          }),
        });

        if (novitaResponse.ok) {
          const novitaData = await novitaResponse.json();
          enhancedPrompt = novitaData.choices?.[0]?.message?.content || prompt;
          console.log("[API] ✅ Enhanced video prompt:", enhancedPrompt);
        } else {
          console.warn("[API] ⚠️ Failed to enhance prompt, using original");
        }
      } catch (error) {
        console.error("[API] ❌ Error enhancing prompt:", error);
      }
    }

    // Get user authentication
    const authHeader = request.headers.get('authorization');
    const userIdHeader = request.headers.get('x-user-id');

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    } else if (userIdHeader) {
      userId = userIdHeader;
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`👤 User authenticated: ${userId.substring(0, 8)}...`)

    // Check premium status
    const isTestMode = process.env.TEST_MODE === 'true';

    if (!isTestMode) {
      try {
        const premiumCheckResponse = await fetch(
          `${request.nextUrl.origin}/api/user-premium-status?userId=${userId}`,
          {
            headers: authHeader ? { Authorization: authHeader } : { 'X-User-ID': userId }
          }
        );

        if (premiumCheckResponse.ok) {
          const premiumData = await premiumCheckResponse.json();
          if (!premiumData.isPremium) {
            return NextResponse.json(
              { 
                error: 'Video generation is a premium feature. Please upgrade to access this feature.',
                isPremium: false,
                upgradeUrl: '/premium'
              },
              { status: 403 }
            );
          }
          console.log('👑 User is premium')
        } else {
          return NextResponse.json(
            { error: 'Unable to verify premium status' },
            { status: 403 }
          );
        }
      } catch (error) {
        console.error('Error checking premium status:', error);
        return NextResponse.json(
          { error: 'Unable to verify premium status' },
          { status: 403 }
        );
      }
    } else {
      console.log('⚠️ TEST MODE - Premium check bypassed')
    }

    // Deduct tokens
    try {
      const deductResponse = await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          amount: VIDEO_TOKEN_COST,
          description: 'Video generation',
          type: 'video_generation'
        }),
      });

      const deductData = await deductResponse.json();

      if (!deductResponse.ok) {
        if (deductData.insufficientTokens) {
          return NextResponse.json(
            {
              error: 'Insufficient tokens',
              insufficientTokens: true,
              currentBalance: deductData.currentBalance || 0,
              requiredTokens: VIDEO_TOKEN_COST
            },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { error: deductData.error || 'Failed to deduct tokens' },
            { status: 400 }
          );
        }
      }
      console.log(`✅ Successfully deducted ${VIDEO_TOKEN_COST} tokens`)
    } catch (error) {
      console.error('Error deducting tokens:', error);
      return NextResponse.json(
        { error: 'Failed to process token deduction' },
        { status: 500 }
      );
    }

    // Upload image to Bunny CDN
    console.log("[API] Uploading image to Bunny.net CDN...");
    let bunnyImageUrl: string;
    try {
      const imageResponse = await fetch(image_url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64Data = Buffer.from(imageBuffer).toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const base64Image = `data:${contentType};base64,${imageBase64Data}`;
      
      bunnyImageUrl = await uploadImageToBunny(base64Image);
      console.log("[API] ✅ Image uploaded to Bunny.net:", bunnyImageUrl);
    } catch (error) {
      console.error("[API] Failed to upload image to Bunny.net:", error);
      
      // Refund tokens
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -VIDEO_TOKEN_COST }),
      });
      
      return NextResponse.json(
        { error: 'Failed to upload image for video generation', refunded: true },
        { status: 500 }
      );
    }

    // 🔥 TRY MODELSLAB VIDEO GENERATION FIRST
    console.log("🎬 Trying ModelsLab video generation...");
    
    if (MODELSLAB_API_KEY) {
      try {
        const modelsLabRequestBody = {
          key: MODELSLAB_API_KEY,
          init_image: bunnyImageUrl,
          prompt: enhancedPrompt,
          width: width,
          height: height,
          motion_bucket_id: motion_bucket_id,
          cond_aug: cond_aug,
          steps: steps,
          seed: seed,
          webhook: null,
          track_id: null
        }

        console.log("📤 ModelsLab Video Request:", JSON.stringify(modelsLabRequestBody, null, 2))

        const modelsLabResponse = await fetch(MODELSLAB_IMG2VIDEO_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(modelsLabRequestBody),
        })

        const modelsLabData = await modelsLabResponse.json()
        console.log("📥 ModelsLab Video Response:", JSON.stringify(modelsLabData, null, 2))

        if (modelsLabResponse.ok && (modelsLabData.id || modelsLabData.fetch_result)) {
          const fetchUrl = modelsLabData.fetch_result
          const taskId = modelsLabData.id
          
          // Check if we already have the video URL in future_links
          const futureVideoUrl = modelsLabData.future_links?.[0] || modelsLabData.meta?.output?.[0];
          
          console.log(`✅ ModelsLab video task created: ${taskId}`)
          console.log(`📍 Future video URL: ${futureVideoUrl || 'Not yet available'}`)
          
          return NextResponse.json({
            success: true,
            job_id: taskId,
            status: modelsLabData.status || 'processing',
            provider: 'modelslab',
            fetch_url: fetchUrl,
            future_video_url: futureVideoUrl // Store this so frontend can use it
          });
        } else {
          throw new Error(modelsLabData.message || "ModelsLab request failed")
        }

      } catch (modelsLabError) {
        console.error("❌ ModelsLab Error:", modelsLabError)
        console.log("⚠️ Falling back to RunPod...")
      }
    }

    // 🔄 FALLBACK TO RUNPOD
    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      // Refund tokens on error
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -VIDEO_TOKEN_COST }),
      });
      
      return NextResponse.json(
        { error: 'No video generation service available', refunded: true },
        { status: 500 }
      );
    }

    console.log("🔄 Using RunPod fallback...");
    const runpodResponse = await fetch('https://api.runpod.ai/v2/1r3p16wimwa0v2/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${runpodApiKey}`,
      },
      body: JSON.stringify({
        input: {
          image_url: bunnyImageUrl,
          prompt: enhancedPrompt,
          width,
          height,
          length,
          steps,
          seed,
          cfg
        },
      }),
    });

    if (!runpodResponse.ok) {
      const errorText = await runpodResponse.text();
      console.error('RunPod API error:', errorText);
      
      // Refund tokens on error
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -VIDEO_TOKEN_COST }),
      });
      
      return NextResponse.json(
        { error: 'Failed to start video generation', refunded: true },
        { status: 500 }
      );
    }

    const runpodData = await runpodResponse.json();

    if (!runpodData.id) {
      console.error('No job ID in response:', runpodData);
      
      // Refund tokens on error
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -VIDEO_TOKEN_COST }),
      });
      
      return NextResponse.json(
        { error: 'No job ID received from video generation service', refunded: true },
        { status: 500 }
      );
    }

    console.log('✅ RunPod video generation started, job ID:', runpodData.id);

    return NextResponse.json({
      success: true,
      job_id: runpodData.id,
      status: runpodData.status,
      provider: 'runpod'
    });

  } catch (error) {
    console.error('❌ Error in video generation:', error);
    
    // Refund tokens on error
    if (userId) {
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -VIDEO_TOKEN_COST }),
      });
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred', refunded: true },
      { status: 500 }
    );
  }
}