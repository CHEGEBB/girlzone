import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { uploadImageToBunny } from '@/lib/cloudinary-upload';

// Creative prompts for varied, visually appealing gallery images
const CREATIVE_PROMPTS = [
  "standing confidently in a modern city street at golden hour, vibrant urban atmosphere, cinematic lighting",
  "relaxing at a trendy rooftop bar with city skyline in background, stylish ambiance, sunset glow",
  "walking through a beautiful park with cherry blossoms, spring atmosphere, soft natural lighting",
  "posing elegantly at a luxurious beach resort, tropical paradise, azure waters and palm trees",
  "at an upscale art gallery opening, sophisticated setting, contemporary art pieces in background"
];

export async function POST(request: NextRequest) {
  try {
    const { characterId, characterImageUrl } = await request.json();

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      );
    }

    if (!characterImageUrl) {
      return NextResponse.json(
        { error: 'Character image URL is required' },
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

    console.log(`Generating gallery for character ${characterId}`);

    const generatedImages: any[] = [];
    const errors: string[] = [];

    // Generate 5 images with different creative prompts
    for (let i = 0; i < CREATIVE_PROMPTS.length; i++) {
      const prompt = CREATIVE_PROMPTS[i];
      
      try {
        console.log(`Generating image ${i + 1}/5 with prompt: "${prompt}"`);

        // Call RunPod API with the qwen-image-edit endpoint as specified
        const runpodResponse = await fetch('https://api.runpod.ai/v2/qwen-image-edit/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${runpodApiKey}`,
          },
          body: JSON.stringify({
            input: {
              prompt: prompt,
              negative_prompt: "",
              seed: -1,
              image: characterImageUrl,
              output_format: "png",
              enable_safety_checker: true
            }
          }),
        });

        if (!runpodResponse.ok) {
          const errorText = await runpodResponse.text();
          console.error(`RunPod API error for image ${i + 1}:`, errorText);
          errors.push(`Image ${i + 1}: Failed to generate`);
          continue;
        }

        const runpodData = await runpodResponse.json();
        
        // The response contains a task ID that we need to poll
        if (runpodData.id) {
          console.log(`Image ${i + 1} task started: ${runpodData.id}`);
          
          // Poll for the result
          let attempts = 0;
          const maxAttempts = 60; // 60 seconds timeout
          let imageUrl = null;

          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between checks
            
            const statusResponse = await fetch(`https://api.runpod.ai/v2/qwen-image-edit/status/${runpodData.id}`, {
              headers: {
                'Authorization': `Bearer ${runpodApiKey}`,
              },
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              
              if (statusData.status === 'COMPLETED') {
                // Extract the image URL from the output
                imageUrl = statusData.output?.image_url || 
                          statusData.output?.result || 
                          statusData.output?.images?.[0] || 
                          null;
                
                if (imageUrl) {
                  console.log(`Image ${i + 1} generated successfully`);
                  break;
                }
              } else if (statusData.status === 'FAILED') {
                console.error(`Image ${i + 1} generation failed:`, statusData.error);
                errors.push(`Image ${i + 1}: Generation failed`);
                break;
              }
            }
            
            attempts++;
          }

          if (imageUrl) {
            generatedImages.push({
              imageUrl,
              prompt
            });
          } else if (attempts >= maxAttempts) {
            errors.push(`Image ${i + 1}: Timeout waiting for generation`);
          }
        } else {
          console.error(`No task ID in response for image ${i + 1}`);
          errors.push(`Image ${i + 1}: No task ID returned`);
        }

      } catch (error) {
        console.error(`Error generating image ${i + 1}:`, error);
        errors.push(`Image ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (generatedImages.length === 0) {
      return NextResponse.json(
        { error: 'Failed to generate any images', details: errors },
        { status: 500 }
      );
    }

    // Upload images to Bunny.net and save to database
    const supabaseAdmin = await createAdminClient();
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Failed to initialize database client' },
        { status: 500 }
      );
    }

    const savedImages: any[] = [];

    for (const genImage of generatedImages) {
      try {
        // Upload to Bunny.net
        let bunnyUrl = genImage.imageUrl;
        try {
          console.log('Uploading image to Bunny.net CDN...');
          bunnyUrl = await uploadImageToBunny(genImage.imageUrl);
          console.log('Image uploaded to Bunny.net:', bunnyUrl);
        } catch (uploadError) {
          console.error('Failed to upload to Bunny.net, using original URL:', uploadError);
        }

        // Save to both Unlocked and Gallery tabs
        console.log(`Saving image to database: ${bunnyUrl}`);

        const unlocked = await supabaseAdmin
          .from('admin_character_content')
          .insert({
            character_id: characterId,
            tab_type: 'unlocked',
            image_url: bunnyUrl,
          })
          .select()
          .single();

        if (unlocked.error) {
          console.error('Error saving to unlocked tab:', unlocked.error);
        } else {
          console.log('Successfully saved to unlocked tab');
        }

        const gallery = await supabaseAdmin
          .from('admin_character_content')
          .insert({
            character_id: characterId,
            tab_type: 'gallery',
            image_url: bunnyUrl,
          })
          .select()
          .single();

        if (gallery.error) {
          console.error('Error saving to gallery tab:', gallery.error);
        } else {
          console.log('Successfully saved to gallery tab');
        }

        // Count as saved if at least one insertion succeeded (since images are uploaded to Bunny.net)
        if (unlocked.data || gallery.data) {
          savedImages.push(bunnyUrl);
          console.log(`Image saved successfully (unlocked: ${!!unlocked.data}, gallery: ${!!gallery.data})`);
        } else {
          console.error('Failed to save image to either tab');
          errors.push(`Failed to save image to database: unlocked error: ${unlocked.error?.message}, gallery error: ${gallery.error?.message}`);
        }

      } catch (saveError) {
        console.error('Error saving generated image:', saveError);
        errors.push(`Failed to save image: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      generated: savedImages.length,
      total: CREATIVE_PROMPTS.length,
      images: savedImages,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error generating character gallery:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
