import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadImageToBunny } from "@/lib/cloudinary-upload"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { characterId, prompt } = await request.json();

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get character data
    
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (characterError || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    if (!character.image) {
      return NextResponse.json(
        { error: 'Character has no image' },
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

    // NOTE: No token deduction for admin users creating hover videos (as per requirements)
    // This is an admin-only feature

    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      return NextResponse.json(
        { error: 'RunPod API key not configured' },
        { status: 500 }
      );
    }

    // Upload character image to Bunny.net CDN first, then send URL to RunPod
    console.log("[API] Uploading character image to Bunny.net CDN for video generation...");
    let bunnyImageUrl: string;
    try {
      // Fetch the image from the character's image URL
      const imageResponse = await fetch(character.image);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64Data = Buffer.from(imageBuffer).toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const base64Image = `data:${contentType};base64,${imageBase64Data}`;
      
      // Upload to Bunny.net and get public URL
      bunnyImageUrl = await uploadImageToBunny(base64Image);
      console.log("[API] Character image uploaded to Bunny.net:", bunnyImageUrl);
    } catch (error) {
      console.error("[API] Failed to upload image to Bunny.net:", error);
      return NextResponse.json(
        { error: 'Failed to upload character image for video generation' },
        { status: 500 }
      );
    }

    // Call RunPod video generation endpoint (async)
    // Using default settings: 480x832, 81 frames, 10 steps
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
          width: 480,
          height: 832,
          length: 81,
          steps: 10,
          seed: 42,
          cfg: 2
        },
      }),
    });

    if (!runpodResponse.ok) {
      const errorText = await runpodResponse.text();
      console.error('RunPod API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to start video generation' },
        { status: 500 }
      );
    }

    const runpodData = await runpodResponse.json();

    // Return job ID for status polling
    if (!runpodData.id) {
      console.error('No job ID in response:', runpodData);
      return NextResponse.json(
        { error: 'No job ID received from video generation service' },
        { status: 500 }
      );
    }

    console.log('Character hover video generation started successfully, job ID:', runpodData.id);

    return NextResponse.json({
      success: true,
      job_id: runpodData.id,
      status: runpodData.status
    });

  } catch (error) {
    console.error('Error in character hover video generation:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
