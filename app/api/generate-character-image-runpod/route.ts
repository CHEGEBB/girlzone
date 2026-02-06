import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageUrl, enableSafetyChecker = false } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const runpodApiKey = process.env.RUNPOD_API_KEY;
    if (!runpodApiKey) {
      return NextResponse.json(
        { error: 'RunPod API key not configured' },
        { status: 500 }
      );
    }

    // Use the nano-banana-edit endpoint for image editing
    const runpodResponse = await fetch('https://api.runpod.ai/v2/nano-banana-edit/runsync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${runpodApiKey}`,
      },
        body: JSON.stringify({
          input: {
            prompt: prompt,
            images: [imageUrl],
          },
        }),
    });

    if (!runpodResponse.ok) {
      const errorText = await runpodResponse.text();
      console.error('RunPod API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate character image' },
        { status: 500 }
      );
    }

    const runpodData = await runpodResponse.json();
    
    // Extract image URL from response
    const generatedImageUrl = runpodData.output?.result || runpodData.output?.image_url || runpodData.output?.images?.[0] || null;
    
    if (!generatedImageUrl) {
      console.error('No image URL in response:', runpodData);
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }

    console.log('Image generated successfully:', generatedImageUrl);

    return NextResponse.json({
      success: true,
      imageUrl: generatedImageUrl,
      prompt: prompt,
    });

  } catch (error) {
    console.error('Error generating character image:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
