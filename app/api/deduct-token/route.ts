import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    const supabase = createClient()
    const { userId, amount = 1, characterId, description = 'Chat message', type = 'usage' } = await req.json()

    console.log('🟦 [DEDUCT-TOKEN] API called with userId:', userId, 'amount:', amount, 'characterId:', characterId)

    if (!userId) {
        console.log('🔴 [DEDUCT-TOKEN] No userId provided')
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    try {
        // Get current token balance
        console.log('🔍 [DEDUCT-TOKEN] Fetching user tokens from database...')
        const { data: userTokens, error: selectError } = await supabase
            .from('user_tokens')
            .select('balance')
            .eq('user_id', userId)
            .single()

        console.log('🔍 [DEDUCT-TOKEN] Query result:', { 
            balance: userTokens?.balance, 
            hasError: !!selectError,
            errorMessage: selectError?.message 
        })

        if (selectError) {
            console.error('🔴 [DEDUCT-TOKEN] Error fetching user tokens:', selectError)
            return NextResponse.json({ 
                error: 'Failed to fetch token balance',
                details: selectError.message 
            }, { status: 500 })
        }

        if (!userTokens) {
            console.log('🔴 [DEDUCT-TOKEN] No token record found for user')
            return NextResponse.json({ 
                error: 'Insufficient tokens',
                insufficientTokens: true,
                currentBalance: 0,
                requiredTokens: amount
            }, { status: 400 })
        }

        // Check if user has enough tokens
        console.log('💰 [DEDUCT-TOKEN] Current balance:', userTokens.balance, 'Required:', amount)
        if (userTokens.balance < amount) {
            console.log('🔴 [DEDUCT-TOKEN] Insufficient tokens!')
            return NextResponse.json({
                error: 'Insufficient tokens',
                insufficientTokens: true,
                currentBalance: userTokens.balance,
                requiredTokens: amount
            }, { status: 400 })
        }

        // Calculate new balance
        const newBalance = userTokens.balance - amount
        console.log('➖ [DEDUCT-TOKEN] Deducting token. New balance will be:', newBalance)

        // Update balance
        console.log('💾 [DEDUCT-TOKEN] Updating database...')
        const { data: updateData, error: updateError } = await supabase
            .from('user_tokens')
            .update({ 
                balance: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()

        console.log('💾 [DEDUCT-TOKEN] Update result:', { 
            updatedData: updateData, 
            hasError: !!updateError,
            errorMessage: updateError?.message 
        })

        if (updateError) {
            console.error('🔴 [DEDUCT-TOKEN] Error deducting tokens:', updateError)
            return NextResponse.json({ 
                error: 'Failed to deduct tokens',
                details: updateError.message 
            }, { status: 500 })
        }

        // Record transaction
        const { error: transactionError } = await supabase
            .from('token_transactions')
            .insert({
                user_id: userId,
                amount: -amount,
                type: type,
                description: description,
                created_at: new Date().toISOString()
            })

        if (transactionError) {
            console.error('Error recording transaction:', transactionError)
            // Don't fail the request for transaction recording errors
        }

        // If characterId is provided, track model usage and credit model owner
        if (characterId) {
            console.log('🎯 [DEDUCT-TOKEN] Character ID provided, tracking model usage:', characterId)
            
            // Find the model associated with this character
            const { data: model, error: modelError } = await supabase
                .from('models')
                .select('id, creator_id, name, character_id')
                .eq('character_id', characterId)
                .eq('is_active', true)
                .maybeSingle()

            console.log('🔍 [DEDUCT-TOKEN] Model lookup result:', {
                found: !!model,
                modelId: model?.id,
                modelName: model?.name,
                characterId: model?.character_id,
                creatorId: model?.creator_id,
                error: modelError?.message
            })

            if (modelError) {
                console.error('🔴 [DEDUCT-TOKEN] Error fetching model:', modelError)
            } else if (model) {
                console.log('✅ [DEDUCT-TOKEN] Found model:', model.id, 'with creator:', model.creator_id)
                
                // Get the user who purchased this model (the buyer should earn)
                const { data: userModel } = await supabase
                    .from('user_models')
                    .select('user_id')
                    .eq('model_id', model.id)
                    .maybeSingle()

                const modelBuyerId = userModel?.user_id
                
                if (modelBuyerId) {
                    console.log('💰 [DEDUCT-TOKEN] Model buyer/owner:', modelBuyerId, '(who purchased the model)')
                    
                    // Calculate earnings: $0.0001 per token = 0.0001 * amount
                    const earningsGenerated = 0.0001 * amount
                    
                    console.log('💵 [DEDUCT-TOKEN] Crediting model owner with earnings:', earningsGenerated)
                    
                    // Log the usage
                    const { error: usageLogError } = await supabase
                        .from('model_usage_logs')
                        .insert({
                            user_id: userId,
                            model_id: model.id,
                            usage_type: 'chat',
                            tokens_consumed: amount,
                            earnings_generated: earningsGenerated,
                            created_at: new Date().toISOString()
                        })

                    if (usageLogError) {
                        console.error('🔴 [DEDUCT-TOKEN] Error logging model usage:', usageLogError)
                    } else {
                        console.log('✅ [DEDUCT-TOKEN] Model usage logged successfully')
                    }

                    // Update or create model creator earnings record
                    const { data: existingEarnings, error: earningsSelectError } = await supabase
                        .from('model_creator_earnings')
                        .select('*')
                        .eq('model_id', model.id)
                        .maybeSingle()

                    if (earningsSelectError && earningsSelectError.code !== 'PGRST116') {
                        console.error('🔴 [DEDUCT-TOKEN] Error fetching creator earnings:', earningsSelectError)
                    } else if (existingEarnings) {
                        // Update existing record
                        const { error: earningsUpdateError } = await supabase
                            .from('model_creator_earnings')
                            .update({
                                total_usage_count: existingEarnings.total_usage_count + 1,
                                total_tokens_consumed: existingEarnings.total_tokens_consumed + amount,
                                total_earnings: existingEarnings.total_earnings + earningsGenerated,
                                last_usage_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .eq('model_id', model.id)

                        if (earningsUpdateError) {
                            console.error('🔴 [DEDUCT-TOKEN] Error updating creator earnings:', earningsUpdateError)
                        } else {
                            console.log('✅ [DEDUCT-TOKEN] Creator earnings updated successfully')
                        }
                    } else {
                        // Create new record
                        const { error: earningsInsertError } = await supabase
                            .from('model_creator_earnings')
                            .insert({
                                model_id: model.id,
                                creator_id: modelBuyerId,
                                total_usage_count: 1,
                                total_tokens_consumed: amount,
                                total_earnings: earningsGenerated,
                                last_usage_at: new Date().toISOString(),
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })

                        if (earningsInsertError) {
                            console.error('🔴 [DEDUCT-TOKEN] Error creating creator earnings:', earningsInsertError)
                        } else {
                            console.log('✅ [DEDUCT-TOKEN] Creator earnings record created successfully')
                        }
                    }
                } else {
                    console.log('ℹ️ [DEDUCT-TOKEN] No model owner found')
                }
            } else {
                console.log('ℹ️ [DEDUCT-TOKEN] No model found for character:', characterId)
            }
        }

        console.log('✅ [DEDUCT-TOKEN] Token deducted successfully! New balance:', newBalance)
        return NextResponse.json({ 
            success: true,
            message: 'Tokens deducted successfully',
            newBalance: newBalance
        }, { status: 200 })

    } catch (error) {
        console.error('🔴 [DEDUCT-TOKEN] Unexpected error:', error)
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
