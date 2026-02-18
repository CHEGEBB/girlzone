import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/client"
import { uploadImageToBunny } from "@/lib/cloudinary-upload"

const MODELSLAB_API_KEY = process.env.MODELSLAB_API_KEY!
const MODELSLAB_IMG2VIDEO_ENDPOINT = "https://modelslab.com/api/v6/video/img2video"
const VIDEO_TOKEN_COST = 50;

export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    const {
      image_url,
      prompt,
      width = 512,
      height = 512,
      steps = 25,
      seed = 42,
      motion_bucket_id = 127,
      cond_aug = 0.02
    } = await request.json();

    if (!image_url) return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    // Get user authentication
    const authHeader = request.headers.get('authorization');
    const userIdHeader = request.headers.get('x-user-id');

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      const premiumCheckResponse = await fetch(
        `${request.nextUrl.origin}/api/user-premium-status?userId=${userId}`,
        { headers: authHeader ? { Authorization: authHeader } : { 'X-User-ID': userId } }
      );
      if (premiumCheckResponse.ok) {
        const premiumData = await premiumCheckResponse.json();
        if (!premiumData.isPremium) {
          return NextResponse.json(
            { error: 'Video generation is a premium feature.', isPremium: false, upgradeUrl: '/premium' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json({ error: 'Unable to verify premium status' }, { status: 403 });
      }
    } else {
      console.log('⚠️ TEST MODE - Premium check bypassed')
    }

    // Deduct tokens
    const deductResponse = await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount: VIDEO_TOKEN_COST, description: 'Video generation', type: 'video_generation' }),
    });

    const deductData = await deductResponse.json();
    if (!deductResponse.ok) {
      if (deductData.insufficientTokens) {
        return NextResponse.json(
          { error: 'Insufficient tokens', insufficientTokens: true, currentBalance: deductData.currentBalance || 0, requiredTokens: VIDEO_TOKEN_COST },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: deductData.error || 'Failed to deduct tokens' }, { status: 400 });
    }

    console.log(`✅ Successfully deducted ${VIDEO_TOKEN_COST} tokens`)

    // Enhance prompt with Novita (fast, 5s timeout)
    let enhancedPrompt = prompt;
    const novitaApiKey = process.env.NOVITA_API_KEY;
    if (novitaApiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const novitaResponse = await fetch('https://api.novita.ai/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${novitaApiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'deepseek/deepseek-v3.1',
            messages: [
              { role: 'system', content: 'Transform simple descriptions into vivid video animation prompts. Keep under 80 words, focus on movement and visual dynamics.' },
              { role: 'user', content: `Create a video animation prompt from: "${prompt}"` }
            ],
            max_tokens: 100,
            temperature: 0.7,
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (novitaResponse.ok) {
          const novitaData = await novitaResponse.json();
          enhancedPrompt = novitaData.choices?.[0]?.message?.content || prompt;
        }
      } catch {
        console.warn("[API] Prompt enhancement skipped, using original");
      }
    }

    // Upload image to Bunny CDN
    console.log("[API] Uploading image to Bunny.net CDN...");
    let bunnyImageUrl: string;
    try {
      const imageResponse = await fetch(image_url);
      if (!imageResponse.ok) throw new Error(`Failed to fetch image`);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64Data = Buffer.from(imageBuffer).toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      bunnyImageUrl = await uploadImageToBunny(`data:${contentType};base64,${imageBase64Data}`);
      console.log("[API] ✅ Image uploaded to Bunny.net:", bunnyImageUrl);
    } catch (error) {
      console.error("[API] Failed to upload image:", error);
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -VIDEO_TOKEN_COST }),
      });
      return NextResponse.json({ error: 'Failed to upload image for video generation', refunded: true }, { status: 500 });
    }

    // Build webhook URL
    const webhookUrl = `http://194.163.157.79:3001/api/video-webhook?userId=${userId}&prompt=${encodeURIComponent(prompt)}`;
    
    // Call ModelsLab with webhook
    console.log("🎬 Starting ModelsLab video generation with webhook...");
    const modelsLabRequestBody = {
      key: MODELSLAB_API_KEY,
      init_image: bunnyImageUrl,
      prompt: enhancedPrompt,
      width,
      height,
      motion_bucket_id,
      cond_aug,
      steps,
      seed,
      webhook: webhookUrl,  // <-- ModelsLab will call this when done
      track_id: null
    };

    const modelsLabResponse = await fetch(MODELSLAB_IMG2VIDEO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modelsLabRequestBody),
    });

    const modelsLabData = await modelsLabResponse.json();
    console.log("📥 ModelsLab Response:", JSON.stringify(modelsLabData, null, 2));

    if (!modelsLabResponse.ok || (!modelsLabData.id && !modelsLabData.fetch_result)) {
      // Refund tokens
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -VIDEO_TOKEN_COST }),
      });
      return NextResponse.json({ error: modelsLabData.message || 'Video generation failed', refunded: true }, { status: 500 });
    }

    const taskId = modelsLabData.id?.toString() || modelsLabData.fetch_result;
    const futureVideoUrl = modelsLabData.future_links?.[0];

    // Save pending record to Supabase immediately
    try {
      const { createAdminClient } = await import('@/lib/supabase-admin');
      const supabaseAdmin = await createAdminClient();
      if (supabaseAdmin) {
        await supabaseAdmin.from("generated_images").insert({
          user_id: userId,
          image_url: futureVideoUrl || '',
          prompt: prompt,
          model_used: "modelslab-video",
          media_type: "video",
          status: "pending",
          job_id: taskId,
          provider: "modelslab"
        });
        console.log(`✅ Pending video record saved to DB: ${taskId}`);
      }
    } catch (dbError) {
      console.error("DB save error:", dbError);
    }

    // Return immediately — webhook will handle the rest
    return NextResponse.json({
      success: true,
      job_id: taskId,
      status: 'processing',
      provider: 'modelslab',
      fetch_url: modelsLabData.fetch_result,
      future_video_url: futureVideoUrl
    });

  } catch (error) {
    console.error('❌ Error in video generation:', error);
    if (userId) {
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -VIDEO_TOKEN_COST }),
      });
    }
    return NextResponse.json({ error: 'An unexpected error occurred', refunded: true }, { status: 500 });
  }
}