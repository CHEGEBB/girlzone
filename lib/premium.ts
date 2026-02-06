import { SupabaseClient } from "@supabase/supabase-js";

export async function checkPremiumStatus(userId: string, supabase: SupabaseClient): Promise<{ isPremium: boolean, expiresAt: string | null, planName: string | null }> {
    try {
        // Method 0: Check profiles table (Where webhooks write to) - PRIORITY
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at")
            .eq("id", userId)
            .single();

        if (!profileError && profile && profile.is_premium) {
            const expiresAt = profile.premium_expires_at;
            if (!expiresAt || new Date(expiresAt) > new Date()) {
                return { 
                    isPremium: true, 
                    expiresAt, 
                    planName: "Premium Plan" 
                };
            }
        }

        // Method 1: Check premium_profiles table
        const { data: premiumProfile, error: premiumError } = await supabase
            .from("premium_profiles")
            .select(`
                expires_at,
                subscription_plans (name)
            `)
            .eq("user_id", userId)
            .maybeSingle();

        if (!premiumError && premiumProfile) {
            const expiresAt = premiumProfile.expires_at;
            
            // Handle subscription_plans safely regardless of type
            let planName = null;
            const plans = premiumProfile.subscription_plans;
            
            if (Array.isArray(plans)) {
                planName = plans[0]?.name;
            } else if (plans && typeof plans === 'object') {
                // @ts-ignore - Supabase types might be tricky with joined tables
                planName = plans.name;
            }

            if (expiresAt && new Date(expiresAt) > new Date()) {
                return { 
                    isPremium: true, 
                    expiresAt, 
                    planName 
                };
            }
        }

        // Method 2: Check payment_transactions for recent successful payments
        const { data: recentPayment, error: paymentError } = await supabase
            .from("payment_transactions")
            .select("created_at, metadata, plan_name")
            .eq("user_id", userId)
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!paymentError && recentPayment) {
            const createdAt = new Date(recentPayment.created_at);
            let duration = 1; // Default 1 month
            
            if (recentPayment.metadata && recentPayment.metadata.planDuration) {
                duration = parseInt(recentPayment.metadata.planDuration, 10) || 1;
            }

            const calculatedExpiry = new Date(createdAt);
            calculatedExpiry.setMonth(calculatedExpiry.getMonth() + duration);
            
            if (calculatedExpiry > new Date()) {
                return {
                    isPremium: true,
                    expiresAt: calculatedExpiry.toISOString(),
                    planName: recentPayment.plan_name || (recentPayment.metadata && recentPayment.metadata.planName)
                };
            }
        }

        return { isPremium: false, expiresAt: null, planName: null };

    } catch (error) {
        console.error("Error checking premium status:", error);
        return { isPremium: false, expiresAt: null, planName: null };
    }
}
