import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookies() })

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: "not_admin" }, { status: 403 })
    }

    // Get admin settings using key-value structure (as per migration)
    const { data: settingsData, error: settingsError } = await supabase.from("admin_settings").select("*")

    if (settingsError) {
      console.error("Error fetching admin settings:", settingsError)
      return NextResponse.json({ error: "database_error" }, { status: 500 })
    }

    // Convert key-value pairs to object
    const settings: any = {}
    if (settingsData) {
      settingsData.forEach(setting => {
        settings[setting.key] = setting.value
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { settings } = await request.json()
    const supabase = createRouteHandlerClient({ cookies: () => cookies() })

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: "not_admin" }, { status: 403 })
    }

    // Save admin settings as key-value pairs (as per migration)
    for (const [key, value] of Object.entries(settings)) {
      const { error: saveError } = await supabase.from("admin_settings").upsert({
        key: key,
        value: value.toString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

      if (saveError) {
        console.error("Error saving admin settings:", saveError)
        return NextResponse.json({ error: "database_error" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
