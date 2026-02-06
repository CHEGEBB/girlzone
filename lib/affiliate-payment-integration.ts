// Integration between affiliate system and payment processing
import { createClient } from './supabase'

export interface PaymentData {
  transactionId: string
  amount: number
  userId: string
  stripeSessionId?: string
}

/**
 * Record affiliate conversion when a payment is successful
 */
export async function recordAffiliateConversionFromPayment(paymentData: PaymentData): Promise<void> {
  try {
    const supabase = createClient()
    
    // Get the user's affiliate cookie or session data
    // In a real implementation, you'd get this from the request context
    const affiliateCode = await getAffiliateCodeFromUser(paymentData.userId)
    
    if (!affiliateCode) {
      console.log('No affiliate code found for user:', paymentData.userId)
      return
    }

    // Find the most recent click for this affiliate
    const { data: recentClick, error: clickError } = await supabase
      .from('affiliate_clicks')
      .select('id')
      .eq('affiliate_id', affiliateCode)
      .eq('converted', false)
      .order('clicked_at', { ascending: false })
      .limit(1)
      .single()

    if (clickError || !recentClick) {
      console.log('No recent click found for affiliate:', affiliateCode)
      return
    }

    // Record the conversion
    const { error: conversionError } = await supabase
      .rpc('record_affiliate_conversion', {
        p_click_id: recentClick.id,
        p_transaction_id: paymentData.transactionId,
        p_conversion_value: paymentData.amount
      })

    if (conversionError) {
      console.error('Failed to record affiliate conversion:', conversionError)
    } else {
      console.log('Affiliate conversion recorded successfully')
    }

  } catch (error) {
    console.error('Error recording affiliate conversion from payment:', error)
  }
}

/**
 * Get affiliate code for a user (from cookies, session, or database)
 */
async function getAffiliateCodeFromUser(userId: string): Promise<string | null> {
  try {
    const supabase = createClient()
    
    // Check if user has an active affiliate session
    // This would typically be stored in a user session or cookie
    // For now, we'll check if the user has any recent affiliate clicks
    
    const { data: recentClick } = await supabase
      .from('affiliate_clicks')
      .select(`
        id,
        affiliate_id,
        affiliates!inner(affiliate_code)
      `)
      .eq('converted', false)
      .order('clicked_at', { ascending: false })
      .limit(1)
      .single()

    return recentClick?.affiliates?.affiliate_code || null

  } catch (error) {
    console.error('Error getting affiliate code for user:', error)
    return null
  }
}

/**
 * Hook to integrate with Stripe webhooks
 */
export function useAffiliatePaymentIntegration() {
  const handleSuccessfulPayment = async (paymentData: PaymentData) => {
    await recordAffiliateConversionFromPayment(paymentData)
  }

  return { handleSuccessfulPayment }
}

/**
 * Server-side function to handle payment success webhook
 */
export async function handlePaymentSuccessWebhook(paymentData: PaymentData) {
  try {
    await recordAffiliateConversionFromPayment(paymentData)
    
    // You can also trigger other post-payment actions here
    // like sending confirmation emails, updating user status, etc.
    
  } catch (error) {
    console.error('Error handling payment success webhook:', error)
    throw error
  }
}
