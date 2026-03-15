import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/client"
import { uploadImageToBunny } from "@/lib/cloudinary-upload"

const MODELSLAB_API_KEY = process.env.MODELSLAB_API_KEY!
const MODELSLAB_IMG2VIDEO_ENDPOINT = "https://modelslab.com/api/v6/video/img2video_ultra"
const VIDEO_TOKEN_COST = 50;

export async function POST(request: NextRequest) {
  let userId: string | null = null;

  try {
    const { image_url, prompt } = await request.json();

    if (!image_url) return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    // Auth
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

    // Premium check
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
          { error: 'Insufficient tokens', insufficientTokens: true, currentBalance: deductData.currentBalance || 0, requiredTokens: VIDEO_TOKEN_COST },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: deductData.error || 'Failed to deduct tokens' }, { status: 400 });
    }
    console.log(`✅ Successfully deducted ${VIDEO_TOKEN_COST} tokens`)

    // Upload image so ModelsLab can access it publicly
    console.log("[API] Uploading image for ModelsLab...");
    let publicImageUrl: string = image_url;
    try {
      const imageResponse = await fetch(image_url);
      if (!imageResponse.ok) throw new Error(`Failed to fetch image`);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64Data = Buffer.from(imageBuffer).toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const base64Image = `data:${contentType};base64,${imageBase64Data}`;
      publicImageUrl = await uploadImageToBunny(base64Image);
      console.log("[API] ✅ Image uploaded:", publicImageUrl);
    } catch (error) {
      console.error("[API] Upload failed, using original URL:", error);
    }

    // Call ModelsLab img2video_ultra
    console.log("🎬 Starting ModelsLab Ultra video generation...");
    const requestBody = {
      key: MODELSLAB_API_KEY,
      init_image: publicImageUrl,
      prompt: prompt,
      height: 512,
      width: 512,
      num_frames: 81,
num_inference_steps: 20,
      min_guidance_scale: 1,
      max_guidance_scale: 3,
      motion_bucket_id: 40,
      noise_aug_strength: 0.02,
      base64: false,
      webhook: null,
      track_id: null
    };

    console.log("📤 ModelsLab Request:", JSON.stringify(requestBody, null, 2));

    const modelsLabResponse = await fetch(MODELSLAB_IMG2VIDEO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const modelsLabData = await modelsLabResponse.json();
    console.log("📥 ModelsLab Response:", JSON.stringify(modelsLabData, null, 2));

    // Video ready immediately
    if (modelsLabData.status === 'success' && modelsLabData.output?.[0]) {
      console.log("✅ Video generated immediately!");
      return NextResponse.json({
        success: true,
        job_id: String(modelsLabData.id || 'direct'),
        status: 'success',
        provider: 'modelslab',
        video_url: modelsLabData.output[0],
      });
    }

    // Video queued for processing
    if (modelsLabData.status === 'processing' && (modelsLabData.id || modelsLabData.fetch_result)) {
      const jobId = String(modelsLabData.id);
      const fetchUrl = modelsLabData.fetch_result || `https://modelslab.com/api/v6/video/fetch/${jobId}`;
      const futureVideoUrl = modelsLabData.future_links?.[0] || modelsLabData.meta?.output?.[0] || null;

      console.log(`⏳ Job queued: ${jobId}, ETA: ${modelsLabData.eta}s`);

      return NextResponse.json({
        success: true,
        job_id: jobId,
        status: 'processing',
        provider: 'modelslab',
        fetch_url: fetchUrl,
        future_video_url: futureVideoUrl,
        eta: modelsLabData.eta || 90,
      });
    }

    // Error
    console.error("❌ ModelsLab error:", modelsLabData);
    await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, amount: -VIDEO_TOKEN_COST }),
    });
    return NextResponse.json(
      { error: modelsLabData.message || 'Video generation failed', refunded: true },
      { status: 500 }
    );

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