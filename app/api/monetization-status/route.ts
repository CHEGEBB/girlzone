import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // admin_settings is a key/value table; read value by key
    const { data: settings, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "monetization_enabled")
      .maybeSingle()

    if (error) {
      console.error("Error fetching monetization status:", error)
    }

    // Default to enabled if no settings found or on error
    let monetizationEnabled = true
    const raw = settings?.value
    if (typeof raw === "string") {
      monetizationEnabled = raw.toLowerCase() !== "false"
    } else if (typeof raw === "boolean") {
      monetizationEnabled = raw !== false
    }

    return NextResponse.json({
      success: true,
      monetization_enabled: monetizationEnabled
    })

  } catch (error) {
    console.error("Monetization status error:", error)
    // Default to enabled on error
    return NextResponse.json({ 
      success: true, 
      monetization_enabled: true 
    })
  }
}
