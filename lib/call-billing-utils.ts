// Call billing utilities
export interface CallBillingInfo {
  callSessionId: string
  userId: string
  callId: string
  initialMinutes: number
  actualDurationSeconds: number
  tokensPerMinute: number
}

export interface BillingCalculation {
  actualDurationMinutes: number
  additionalMinutes: number
  additionalTokens: number
  totalTokens: number
}

/**
 * Calculate billing for a completed call
 */
export function calculateCallBilling(billingInfo: CallBillingInfo): BillingCalculation {
  const actualDurationMinutes = Math.ceil(billingInfo.actualDurationSeconds / 60)
  const additionalMinutes = Math.max(0, actualDurationMinutes - billingInfo.initialMinutes)
  const additionalTokens = additionalMinutes * billingInfo.tokensPerMinute
  const totalTokens = (billingInfo.initialMinutes * billingInfo.tokensPerMinute) + additionalTokens

  return {
    actualDurationMinutes,
    additionalMinutes,
    additionalTokens,
    totalTokens
  }
}

/**
 * Format call duration for display
 */
export function formatCallDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes === 0) {
    return `${remainingSeconds}s`
  } else if (remainingSeconds === 0) {
    return `${minutes}m`
  } else {
    return `${minutes}m ${remainingSeconds}s`
  }
}

/**
 * Calculate estimated cost for a call duration
 */
export function estimateCallCost(minutes: number, tokensPerMinute: number = 3): number {
  return Math.max(1, minutes) * tokensPerMinute // Minimum 1 minute
}
