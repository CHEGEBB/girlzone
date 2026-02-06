import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    console.log('🟦 [MODEL-EARNINGS] API called with userId:', userId)

    if (!userId) {
        console.log('🔴 [MODEL-EARNINGS] No userId provided')
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    try {
        // Get all models owned by this user (through user_models table OR creator_id)
        const { data: userModels, error: userModelsError } = await supabase
            .from('user_models')
            .select('model_id')
            .eq('user_id', userId)

        console.log('🔍 [MODEL-EARNINGS] User models from user_models table:', {
            count: userModels?.length || 0,
            error: userModelsError?.message
        })

        if (userModelsError) {
            console.error('🔴 [MODEL-EARNINGS] Error fetching user models:', userModelsError)
        }

        // Also get models where user is the creator
        const { data: createdModels, error: createdModelsError } = await supabase
            .from('models')
            .select('id')
            .eq('creator_id', userId)

        console.log('🔍 [MODEL-EARNINGS] Models created by user:', {
            count: createdModels?.length || 0,
            error: createdModelsError?.message
        })

        // Combine both lists
        const userModelIds = new Set(userModels?.map(um => um.model_id) || [])
        const creatorModelIds = createdModels?.map(m => m.id) || []
        
        // Merge the two sets
        creatorModelIds.forEach(id => userModelIds.add(id))
        
        const modelIds = Array.from(userModelIds)

        console.log('📊 [MODEL-EARNINGS] Total models (owned + created):', modelIds.length)

        if (modelIds.length === 0) {
            console.log('ℹ️ [MODEL-EARNINGS] User has no models')
            return NextResponse.json({ 
                success: true,
                totalTokens: 0,
                totalEarnings: 0,
                models: []
            })
        }

        // Get all models data first
        const { data: modelsData, error: modelsError } = await supabase
            .from('models')
            .select(`
                id,
                name,
                category,
                characters (
                    id,
                    name,
                    image
                )
            `)
            .in('id', modelIds)

        if (modelsError) {
            console.error('🔴 [MODEL-EARNINGS] Error fetching models:', modelsError)
            return NextResponse.json({ 
                error: 'Failed to fetch models',
                details: modelsError.message 
            }, { status: 500 })
        }

        // Get earnings data for models
        const { data: earningsData, error: earningsError } = await supabase
            .from('model_creator_earnings')
            .select('*')
            .in('model_id', modelIds)

        if (earningsError) {
            console.error('🔴 [MODEL-EARNINGS] Error fetching earnings data:', earningsError)
            return NextResponse.json({ 
                error: 'Failed to fetch earnings data',
                details: earningsError.message 
            }, { status: 500 })
        }

        // Create a map of earnings by model_id
        const earningsMap = new Map()
        if (earningsData) {
            earningsData.forEach(earning => {
                earningsMap.set(earning.model_id, earning)
            })
        }

        // Get all model IDs where user is owner (through user_models) OR creator
        const { data: allModelsData, error: allModelsError } = await supabase
            .from('models')
            .select(`
                id,
                name,
                category,
                creator_id,
                characters (
                    id,
                    name,
                    image
                )
            `)
            .or(`id.in.(${modelIds.join(',')}),creator_id.eq.${userId}`)

        const finalModelsData = allModelsData || modelsData

        // Calculate totals and format the data
        let totalTokens = 0
        let totalEarnings = 0

        const modelsWithEarnings = (finalModelsData || []).map(model => {
            const earning = earningsMap.get(model.id)
            const tokens = earning?.total_tokens_consumed || 0
            const earnings = parseFloat(earning?.total_earnings || '0')
            
            totalTokens += tokens
            totalEarnings += earnings

            // Handle characters - it might be an array or single object
            const character = Array.isArray(model.characters) 
                ? model.characters[0] 
                : model.characters

            return {
                modelId: model.id,
                modelName: model.name || 'Unknown Model',
                modelCategory: model.category || 'uncategorized',
                characterName: character?.name || null,
                characterImage: character?.image || null,
                totalUsageCount: earning?.total_usage_count || 0,
                totalTokensConsumed: tokens,
                totalEarnings: earnings,
                lastUsageAt: earning?.last_usage_at || null,
                createdAt: earning?.created_at || null,
                updatedAt: earning?.updated_at || null
            }
        })

        // Sort by total earnings descending
        modelsWithEarnings.sort((a, b) => b.totalEarnings - a.totalEarnings)

        console.log('✅ [MODEL-EARNINGS] Success! Total tokens:', totalTokens, 'Total earnings:', totalEarnings)

        return NextResponse.json({ 
            success: true,
            totalTokens,
            totalEarnings,
            modelsCount: modelsWithEarnings.length,
            models: modelsWithEarnings
        })

    } catch (error) {
        console.error('🔴 [MODEL-EARNINGS] Unexpected error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
