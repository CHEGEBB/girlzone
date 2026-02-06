import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function GET() {
  try {
    const supabase = createClient()

    // Auth
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Try to read monetization flag (key/value); default to enabled if not visible
    const { data: setting, error: settingsError } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "monetization_enabled")
      .maybeSingle()

    if (settingsError) {
      console.warn("Monetization check warning:", settingsError)
    }

    let monetizationEnabled = true
    const raw = setting?.value
    if (typeof raw === "string") monetizationEnabled = raw.toLowerCase() !== "false"
    else if (typeof raw === "boolean") monetizationEnabled = raw !== false

    if (!monetizationEnabled) {
      return NextResponse.json({ success: true, activity: [] })
    }

    // Recent earnings for this creator
    const { data: earnings, error: earningsError } = await supabase
      .from("earnings_transactions")
      .select(`
        id,
        amount,
        transaction_type,
        description,
        created_at,
        models!inner(id, name)
      `)
      .eq("creator_id", userId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5)

    if (earningsError) {
      console.error("Error fetching earnings:", earningsError)
    }

    // Recent model purchases by this user
    const { data: purchases, error: purchasesError } = await supabase
      .from("user_models")
      .select(`
        id,
        purchased_at,
        models!inner(id, name, token_cost, is_premium)
      `)
      .eq("user_id", userId)
      .order("purchased_at", { ascending: false })
      .limit(5)

    if (purchasesError) {
      console.error("Error fetching purchases:", purchasesError)
    }

    // Recent usage earnings for this creator (requires admin client to bypass RLS for user-specific logs)
    let usageItems: Activity[] = []
    const adminSupabase = await createAdminClient()
    
    if (adminSupabase) {
      const { data: usageLogs, error: usageError } = await adminSupabase
        .from("model_usage_logs")
        .select(`
          id,
          created_at,
          usage_type,
          earnings_generated,
          models!inner(id, name, creator_id)
        `)
        .eq("models.creator_id", userId)
        .gt("earnings_generated", 0)
        .order("created_at", { ascending: false })
        .limit(10)

      if (usageError) {
        console.error("Error fetching usage logs:", usageError)
      } else if (usageLogs) {
        usageItems = usageLogs.map((log: any) => ({
          type: "earning",
          date: log.created_at,
          title: "Usage Earnings",
          subtitle: `User chatted with ${log.models?.name}`,
          modelName: log.models?.name,
          amountUsd: parseFloat(log.earnings_generated),
        }))
      }
    }

    type Activity = {
      type: "earning" | "purchase"
      date: string
      title: string
      subtitle?: string
      modelName?: string
      amountUsd?: number
      tokenCost?: number
    }

    const earningItems: Activity[] = (earnings || []).map((e: any) => ({
      type: "earning",
      date: e.created_at,
      title: "Earnings Updated",
      subtitle: e.description || e.transaction_type,
      modelName: e.models?.name,
      amountUsd: parseFloat(e.amount),
    }))

    const purchaseItems: Activity[] = (purchases || []).map((p: any) => ({
      type: "purchase",
      date: p.purchased_at,
      title: "Model Purchased",
      subtitle: p.models?.is_premium ? "Premium model added" : "Model added",
      modelName: p.models?.name,
      tokenCost: p.models?.token_cost ?? 0,
    }))

    // Combine all activity types
    const activity: Activity[] = [...earningItems, ...purchaseItems, ...usageItems]
      .filter((a) => !!a.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10) // Increased limit to show more variety

    return NextResponse.json({ success: true, activity })
  } catch (error) {
    console.error("User recent activity error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
