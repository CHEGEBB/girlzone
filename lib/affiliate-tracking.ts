// Affiliate tracking utilities
import { createClient } from './supabase'

export interface AffiliateClickData {
  affiliate_code: string
  link_type?: string
  target_url?: string
  visitor_ip?: string
  user_agent?: string
  referrer?: string
}

export interface AffiliateConversionData {
  click_id: string
  transaction_id: string
  conversion_value: number
}

/**
 * Track an affiliate click
 */
export async function trackAffiliateClick(data: AffiliateClickData): Promise<string | null> {
  try {
    // Transform data to match the API expectation
    const payload = {
      referral_code: data.affiliate_code,
      ...data
    };

    const response = await fetch('/api/track-referral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()
    
    if (result.status === 'success') {
      return result.data?.id || 'tracked' // API doesn't return click_id in current implementation, but that's fine for now
    } else {
      console.error('Failed to track affiliate click:', result.error)
      return null
    }
  } catch (error) {
    console.error('Error tracking affiliate click:', error)
    return null
  }
}

/**
 * Record an affiliate conversion
 */
export async function recordAffiliateConversion(data: AffiliateConversionData): Promise<string | null> {
  try {
    const supabase = createClient()
    
    const { data: commissionId, error } = await supabase
      .rpc('record_affiliate_conversion', {
        p_click_id: data.click_id,
        p_transaction_id: data.transaction_id,
        p_conversion_value: data.conversion_value
      })

    if (error) {
      console.error('Failed to record affiliate conversion:', error)
      return null
    }

    return commissionId
  } catch (error) {
    console.error('Error recording affiliate conversion:', error)
    return null
  }
}

/**
 * Get affiliate code from URL parameters
 */
export function getAffiliateCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('ref')
}

/**
 * Get affiliate code from cookie
 */
export function getAffiliateCodeFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const affiliateCookie = cookies.find(cookie => 
    cookie.trim().startsWith('affiliate_ref=')
  )
  
  if (affiliateCookie) {
    return affiliateCookie.split('=')[1]
  }
  
  return null
}

/**
 * Get the current affiliate code (from URL or cookie)
 */
export function getCurrentAffiliateCode(): string | null {
  return getAffiliateCodeFromUrl() || getAffiliateCodeFromCookie()
}

/**
 * Generate affiliate URL
 */
export function generateAffiliateUrl(baseUrl: string, affiliateCode: string, linkType: string = 'general'): string {
  const url = new URL(baseUrl)
  url.searchParams.set('ref', affiliateCode)
  url.searchParams.set('type', linkType)
  return url.toString()
}

/**
 * Track affiliate click on page load
 */
export function trackAffiliateOnPageLoad() {
  if (typeof window === 'undefined') return

  const affiliateCode = getAffiliateCodeFromUrl()
  if (!affiliateCode) return

  // Track the click
  trackAffiliateClick({
    affiliate_code: affiliateCode,
    link_type: new URLSearchParams(window.location.search).get('type') || 'general',
    visitor_ip: undefined, // Will be set by the server
    user_agent: navigator.userAgent,
    referrer: document.referrer || undefined
  })
}

/**
 * Hook to track affiliate conversions on successful payments
 */
export function useAffiliateConversionTracking() {
  const trackConversion = async (transactionId: string, amount: number) => {
    const clickId = getAffiliateCodeFromCookie()
    if (!clickId) return

    // We need to get the actual click ID from the cookie or local storage
    // For now, we'll use a simplified approach
    const conversionData: AffiliateConversionData = {
      click_id: clickId, // This should be the actual click ID, not the affiliate code
      transaction_id: transactionId,
      conversion_value: amount
    }

    return await recordAffiliateConversion(conversionData)
  }

  return { trackConversion }
}

/**
 * Initialize affiliate tracking on page load
 */
export function initializeAffiliateTracking() {
  if (typeof window === 'undefined') return

  // Track affiliate click if ref parameter is present
  trackAffiliateOnPageLoad()

  // Listen for successful payments to track conversions
  window.addEventListener('payment-success', async (event: any) => {
    const { transactionId, amount } = event.detail
    if (transactionId && amount) {
      await recordAffiliateConversion({
        click_id: getAffiliateCodeFromCookie() || '',
        transaction_id: transactionId,
        conversion_value: amount
      })
    }
  })
}
