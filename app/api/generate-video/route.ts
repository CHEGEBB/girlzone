import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/client"
import { uploadImageToBunny } from "@/lib/cloudinary-upload"

export async function POST(request: NextRequest) {
  try {
    const {
      image_url,
      prompt,
      width = 480,
      height = 832,
      length = 81,
      steps = 10,
      seed = 42,
      cfg = 2
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
          console.log("[API] Enhanced video prompt:", enhancedPrompt);
        } else {
          console.warn("[API] Failed to enhance prompt, using original");
        }
      } catch (error) {
        console.error("[API] Error enhancing prompt:", error);
        // Continue with original prompt if enhancement fails
      }
    }

    // Get user authentication
    const authHeader = request.headers.get('authorization');
    const userIdHeader = request.headers.get('x-user-id');
    
    let userId: string | null = null;

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

    // Check if user is premium
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
      } else {
        // If premium check fails, deny access
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

    // Deduct tokens (50 tokens for video generation)
    try {
      const deductResponse = await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId, 
          amount: 50,
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
              requiredTokens: 50
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
    } catch (error) {
      console.error('Error deducting tokens:', error);
      return NextResponse.json(
        { error: 'Failed to process token deduction' },
        { status: 500 }
      );
    }

    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      // Refund tokens on error
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -50 }),
      });
      
      return NextResponse.json(
        { error: 'RunPod API key not configured' },
        { status: 500 }
      );
    }

    // Upload image to Bunny.net CDN first, then send URL to RunPod
    console.log("[API] Uploading image to Bunny.net CDN for video generation...");
    let bunnyImageUrl: string;
    try {
      // Fetch the image from the source URL
      const imageResponse = await fetch(image_url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64Data = Buffer.from(imageBuffer).toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const base64Image = `data:${contentType};base64,${imageBase64Data}`;
      
      // Upload to Bunny.net and get public URL
      bunnyImageUrl = await uploadImageToBunny(base64Image);
      console.log("[API] Image uploaded to Bunny.net:", bunnyImageUrl);
    } catch (error) {
      console.error("[API] Failed to upload image to Bunny.net:", error);
      
      // Refund tokens on error
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -50 }),
      });
      
      return NextResponse.json(
        { error: 'Failed to upload image for video generation', refunded: true },
        { status: 500 }
      );
    }

    // Call RunPod video generation endpoint (async)
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
        body: JSON.stringify({ userId, amount: -50 }),
      });
      
      return NextResponse.json(
        { error: 'Failed to start video generation', refunded: true },
        { status: 500 }
      );
    }

    const runpodData = await runpodResponse.json();

    // Return job ID for status polling
    if (!runpodData.id) {
      console.error('No job ID in response:', runpodData);
      
      // Refund tokens on error
      await fetch(`${request.nextUrl.origin}/api/deduct-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: -50 }),
      });
      
      return NextResponse.json(
        { error: 'No job ID received from video generation service', refunded: true },
        { status: 500 }
      );
    }

    console.log('Video generation started successfully, job ID:', runpodData.id);

    return NextResponse.json({
      success: true,
      job_id: runpodData.id,
      status: runpodData.status
    });

  } catch (error) {
    console.error('Error in video generation:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
