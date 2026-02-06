import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { characterId } = body;

    if (!characterId) {
      return NextResponse.json(
        { error: 'Character ID is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Verify ownership before deleting
    const { data: character, error: fetchError } = await supabase
      .from('characters')
      .select('user_id')
      .eq('id', characterId)
      .single();

    if (fetchError || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      );
    }

    if (character.user_id !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this character' },
        { status: 403 }
      );
    }

    // Delete from characters table
    const { error: characterError } = await supabase
      .from('characters')
      .delete()
      .eq('id', characterId)
      .eq('user_id', userId);

    if (characterError) {
      console.error('Error deleting character:', characterError);
      return NextResponse.json(
        { error: 'Failed to delete character' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Character deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
