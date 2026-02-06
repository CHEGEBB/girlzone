import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToBunny } from '@/lib/cloudinary-upload';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterDetails } = body;

    if (!characterDetails) {
      return NextResponse.json(
        { error: 'Character details are required' },
        { status: 400 }
      );
    }

    // Step 1: Build the character description from details
    const description = `A ${characterDetails.style || 'realistic'} style image of a ${characterDetails.age || 'young'} ${characterDetails.ethnicity || 'woman'} woman. She has ${characterDetails.eyeColor || 'brown'} eyes, ${characterDetails.hairColor || 'brown'} ${characterDetails.hairStyle || 'long'} hair. Her body type is ${characterDetails.bodyType || 'slim'} with ${characterDetails.breastSize || 'medium'} breasts and ${characterDetails.buttSize || 'medium'} butt. Her personality is ${characterDetails.personality || 'friendly'} and she's your ${characterDetails.relationship || 'friend'}.${characterDetails.customOccupation ? ` Her occupation/setting is: ${characterDetails.customOccupation}` : ''}`;

    // Step 2: Enhance the description using Novita API
    const novitaApiKey = process.env.NOVITA_API_KEY;
    if (!novitaApiKey) {
      return NextResponse.json(
        { error: 'Novita API key not configured' },
        { status: 500 }
      );
    }

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
            content: `You are a world-class Prompt Engineer for Stable Diffusion specializing in female character creation.
Your goal is to translate a character description into a masterpiece-level prompt.
- SEMANTIC UNDERSTANDING: Deeply understand the user's requested style, setting, and personality.
- FAITHFULNESS: Strictly adhere to all provided details (age, ethnicity, hair, eyes, etc.).
- QUALITY TAGS: Incorporate "natural soft eyes", "photorealistic masterpiece", "highly detailed skin texture", and "anatomically correct" where appropriate.
- NO HALLUCINATION: Do not add random elements that distract from the main character focus.
- FORMAT: Return ONLY the optimized comma-separated prompt string. Keep it under 150 words.`
          },
          {
            role: 'user',
            content: `Create a high-quality, model-optimized prompt for this character description: "${description}". 
Style: ${characterDetails.style === 'anime' ? 'High quality anime/manga' : 'Hyper-photorealistic'}. 
Prioritize user intent and natural appearance.`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
        response_format: { type: 'text' }
      }),
    });

    if (!novitaResponse.ok) {
      const errorText = await novitaResponse.text();
      console.error('Novita API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to enhance character description' },
        { status: 500 }
      );
    }

    const novitaData = await novitaResponse.json();
    const enhancedPrompt = novitaData.choices?.[0]?.message?.content || description;

    console.log('Enhanced prompt:', enhancedPrompt);

    // Step 3: Generate image using ModelsLab Juggernaut (PRIMARY)
    let generatedImageUrl: string | null = null;
    const modelsLabApiKey = process.env.MODELSLAB_API_KEY;

    if (modelsLabApiKey) {
      try {
        console.log('🎨 Attempting generation with ModelsLab MoP Mix Juggernaut...');
        
        const modelsLabResponse = await fetch('https://modelslab.com/api/v6/images/text2img', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: modelsLabApiKey,
            model_id: 'mop-mix-juggernaut',
            lora_model: [],
            prompt: enhancedPrompt + ", natural soft eyes, gentle gaze, warm inviting eyes, realistic eye reflections, ultra realistic, 8K, RAW, cinematic lighting, professional photography, hyper detail",
            negative_prompt: 'hard eyes, piercing eyes, staring eyes, dead eyes, unnatural eyes, glowing eyes, laser eyes, creepy eyes, extra fingers, extra limbs, extra arms, extra legs, multiple fingers, multiple legs, six fingers, bad hands, fused fingers, malformed hands, (worst quality:2), (low quality:2), (normal quality:2), (jpeg artifacts), (blurry), (duplicate), (morbid), (mutilated), (out of frame), (extra limbs), (bad anatomy), (disfigured), (deformed), (cross-eye), (glitch), (oversaturated), (overexposed), (underexposed), (bad proportions), (bad hands), (bad feet), (cloned face), (long neck), (missing arms), (missing legs), (extra fingers), (fused fingers), (poorly drawn hands), (poorly drawn face), (mutation), (deformed eyes), watermark, text, logo, signature, grainy, tiling, ugly, blurry eyes, noisy image, bad lighting, unnatural skin, asymmetry',
            width: '1024',
            height: '1024',
            num_inference_steps: '12',
            scheduler: 'LCMScheduler',
            guidance_scale: 1.0,
            enhance_prompt: false
          }),
        });

        if (modelsLabResponse.ok) {
          const modelsLabData = await modelsLabResponse.json();
          console.log('📥 ModelsLab Response:', JSON.stringify(modelsLabData));
          
          // Check for immediate success
          const imageUrls = modelsLabData.output || modelsLabData.meta?.output;
          
          if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0 && imageUrls[0]) {
            generatedImageUrl = imageUrls[0];
            console.log('✅ Image generated successfully with ModelsLab MoP Mix Juggernaut');
          } 
          // Check for async processing
          else if (modelsLabData.id || modelsLabData.fetch_result) {
            const taskId = modelsLabData.id;
            const fetchUrl = modelsLabData.fetch_result;
            console.log('📋 ModelsLab task created:', taskId);
            console.log('🔗 Fetch URL:', fetchUrl);

            // Poll for completion (max 60 seconds)
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
                  key: modelsLabApiKey,
                }),
              });

              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                console.log(`📊 Poll attempt ${attempts}:`, statusData.status);
                
                const statusImageUrls = statusData.output || statusData.meta?.output;

                if (statusData.status === 'success' && statusImageUrls && Array.isArray(statusImageUrls) && statusImageUrls.length > 0) {
                  generatedImageUrl = statusImageUrls[0];
                  taskCompleted = true;
                  console.log('✅ Image generated successfully with ModelsLab MoP Mix Juggernaut (async)');
                } else if (statusData.status === 'failed' || statusData.status === 'error') {
                  console.warn(`ModelsLab task failed: ${statusData.message || 'Unknown error'}`);
                  break;
                }
              }
            }

            if (!taskCompleted) {
              console.warn('ModelsLab image generation timed out');
            }
          }
        } else {
          const errorText = await modelsLabResponse.text();
          console.warn(`⚠️ ModelsLab API error: ${errorText.substring(0, 200)}`);
        }
      } catch (modelsLabError) {
        console.warn('⚠️ ModelsLab failed:', modelsLabError);
      }
    }

    // FALLBACK TO NOVITA if ModelsLab failed
    if (!generatedImageUrl) {
      console.log('🔄 Falling back to Novita AI with EpicRealism...');

      try {
        const novitaImageResponse = await fetch('https://api.novita.ai/v3/async/txt2img', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${novitaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            extra: {
              response_image_type: 'jpeg',
            },
            request: {
              prompt: enhancedPrompt + ", natural soft eyes, gentle gaze, warm inviting eyes, realistic eye reflections, photorealistic, 8k, high quality, detailed, professional photography, natural lighting, detailed skin texture, anatomically correct, proper proportions",
              model_name: 'epicrealism_naturalSinRC1VAE_106430.safetensors',
              negative_prompt: 'hard eyes, piercing eyes, staring eyes, dead eyes, unnatural eyes, glowing eyes, laser eyes, creepy eyes, extra fingers, extra limbs, extra arms, extra legs, multiple fingers, multiple legs, six fingers, bad hands, fused fingers, malformed hands, cartoon, anime, painting, drawing, illustration, low quality, blurry, distorted, deformed, bad anatomy, extra limbs, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, ugly, bad proportions, disfigured, malformed limbs, fused fingers, watermark, signature',
              width: 512,
              height: 768,
              image_num: 1,
              steps: 40,
              seed: -1,
              sampler_name: 'DPM++ 2M Karras',
              guidance_scale: 7.5,
            },
          }),
        });

        if (!novitaImageResponse.ok) {
          const errorText = await novitaImageResponse.text();
          console.error('❌ Novita image generation error:', errorText);
          throw new Error('Novita image generation failed');
        }

        const novitaImageData = await novitaImageResponse.json();
        const taskId = novitaImageData.task_id;

        if (!taskId) {
          throw new Error('No task ID received from Novita');
        }

        console.log('📋 Novita task created:', taskId);

        // Poll for completion (max 60 seconds)
        let attempts = 0;
        const maxAttempts = 30;
        let taskCompleted = false;

        while (attempts < maxAttempts && !taskCompleted) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;

          const statusResponse = await fetch(`https://api.novita.ai/v3/async/task-result?task_id=${taskId}`, {
            headers: {
              'Authorization': `Bearer ${novitaApiKey}`,
            },
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            if (statusData.task.status === 'TASK_STATUS_SUCCEED') {
              const imageUrl = statusData.images?.[0]?.image_url;
              if (imageUrl) {
                generatedImageUrl = imageUrl;
                taskCompleted = true;
                console.log('✅ Image generated successfully with Novita AI EpicRealism (fallback)');
              }
            } else if (statusData.task.status === 'TASK_STATUS_FAILED') {
              throw new Error('Novita task failed');
            }
          }
        }

        if (!taskCompleted) {
          throw new Error('Novita image generation timed out');
        }

      } catch (novitaError) {
        console.error('❌ Novita fallback failed:', novitaError);
        return NextResponse.json(
          { error: 'Failed to generate character image with both ModelsLab and Novita' },
          { status: 500 }
        );
      }
    }

    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'No image generated from any provider' },
        { status: 500 }
      );
    }

    console.log('Image generated successfully:', generatedImageUrl);

    // Step 4: Upload to Bunny.net CDN
    let bunnyImageUrl = generatedImageUrl;
    try {
      console.log('[Character Creation] Uploading image to Bunny.net CDN...');
      const filename = `character_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      bunnyImageUrl = await uploadImageToBunny(generatedImageUrl, filename);
      console.log('[Character Creation] Image uploaded to Bunny.net:', bunnyImageUrl);
    } catch (bunnyError) {
      console.error('[Character Creation] Failed to upload to Bunny.net:', bunnyError);
      // Return error since we don't want to use the provider URL directly
      return NextResponse.json(
        { error: 'Failed to upload image to CDN' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: bunnyImageUrl,
      enhancedPrompt,
    });

  } catch (error) {
    console.error('Error generating character image:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}