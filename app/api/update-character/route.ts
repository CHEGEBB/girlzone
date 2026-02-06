import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterId, userId, updates } = body;

    if (!characterId || !userId || !updates) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First, get the current character to access the old system_prompt, description, and greeting
    const { data: currentChar } = await supabase
      .from('characters')
      .select('system_prompt, description, greeting, name')
      .eq('id', characterId)
      .eq('user_id', userId)
      .single();

    // Update the system_prompt, description, and greeting to replace old name with new name
    let updatedSystemPrompt = currentChar?.system_prompt || '';
    let updatedDescription = currentChar?.description || '';
    let updatedGreeting = currentChar?.greeting || '';
    
    if (currentChar && updates.name && currentChar.name !== updates.name) {
      // Create case-insensitive regex to catch all name variations
      const nameRegex = new RegExp(currentChar.name, 'gi');
      
      // Replace all instances of old name with new name (matching case)
      updatedSystemPrompt = updatedSystemPrompt.replace(nameRegex, (match: string) => {
        // If original was uppercase, make new name uppercase
        if (match === match.toUpperCase()) return updates.name.toUpperCase();
        // If original had capital first letter, capitalize new name
        if (match[0] === match[0].toUpperCase()) {
          return updates.name.charAt(0).toUpperCase() + updates.name.slice(1);
        }
        // Otherwise keep lowercase
        return updates.name.toLowerCase();
      });
      
      updatedDescription = updatedDescription.replace(nameRegex, (match: string) => {
        if (match === match.toUpperCase()) return updates.name.toUpperCase();
        if (match[0] === match[0].toUpperCase()) {
          return updates.name.charAt(0).toUpperCase() + updates.name.slice(1);
        }
        return updates.name.toLowerCase();
      });
      
      updatedGreeting = updatedGreeting.replace(nameRegex, (match: string) => {
        if (match === match.toUpperCase()) return updates.name.toUpperCase();
        if (match[0] === match[0].toUpperCase()) {
          return updates.name.charAt(0).toUpperCase() + updates.name.slice(1);
        }
        return updates.name.toLowerCase();
      });
    }

    // Update character in characters table
    const updateData: any = {
      name: updates.name,
      age: updates.age,
      body: updates.body,
      ethnicity: updates.ethnicity,
      relationship: updates.relationship,
      occupation: updates.occupation,
      hobbies: updates.hobbies,
      personality: updates.personality,
      system_prompt: updatedSystemPrompt,
      description: updatedDescription,
      greeting: updatedGreeting,
    };

    // Add image field if provided
    if (updates.image) {
      updateData.image = updates.image;
    }

    const { data, error } = await supabase
      .from('characters')
      .update(updateData)
      .eq('id', characterId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating character:', error);
      return NextResponse.json(
        { error: 'Failed to update character' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      character: data,
    });

  } catch (error) {
    console.error('Error updating character:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
