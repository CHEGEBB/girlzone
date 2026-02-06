import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

const defaultThemeSettings = {
  primary_hue: "240",
  primary_saturation: "100",
  primary_lightness: "53",
  background_light_hue: "0",
  background_light_saturation: "0",
  background_light_lightness: "100",
  foreground_light_hue: "222.2",
  foreground_light_saturation: "84",
  foreground_light_lightness: "4.9",
  background_dark_hue: "0",
  background_dark_saturation: "0",
  background_dark_lightness: "4",
  foreground_dark_hue: "0",
  foreground_dark_saturation: "0",
  foreground_dark_lightness: "98",
  card_light_hue: "0",
  card_light_saturation: "0",
  card_light_lightness: "100",
  card_dark_hue: "0",
  card_dark_saturation: "0",
  card_dark_lightness: "8",
  border_light_hue: "214.3",
  border_light_saturation: "31.8",
  border_light_lightness: "91.4",
  border_dark_hue: "0",
  border_dark_saturation: "0",
  border_dark_lightness: "15"
}

// Simple in-memory cache with TTL
let cachedThemeSettings: any | null = null
let cachedThemeAtMs = 0
const THEME_CACHE_TTL_MS = 60 * 1000 // 60 seconds

export async function GET() {
  try {
    // Serve from cache if fresh
    const now = Date.now()
    if (cachedThemeSettings && now - cachedThemeAtMs < THEME_CACHE_TTL_MS) {
      return NextResponse.json({ settings: cachedThemeSettings })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Get theme settings from site_settings table
    const { data: themeData, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", Object.keys(defaultThemeSettings))

    if (error) {
      console.error("Error fetching theme settings:", error)
      return NextResponse.json({ settings: defaultThemeSettings })
    }

    // Convert key-value pairs to object
    const settings: any = { ...defaultThemeSettings }
    if (themeData) {
      themeData.forEach((setting: any) => {
        try {
          settings[setting.key] = JSON.parse(setting.value);
        } catch {
          settings[setting.key] = setting.value;
        }
      })
    }

    // Update cache
    cachedThemeSettings = settings
    cachedThemeAtMs = now

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error in GET /api/theme-settings:", error)
    return NextResponse.json({ settings: defaultThemeSettings })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        error: "Unauthorized"
      }, { status: 401 })
    }

    const body = await request.json()

    // Prepare updates array
    const updates = []

    // List of all valid theme keys
    const validKeys = Object.keys(defaultThemeSettings)

    // Only update valid keys that are provided
    for (const key of validKeys) {
      if (body[key] !== undefined) {
        updates.push({
          key: key,
          value: String(body[key]),
          updated_at: new Date().toISOString()
        })
      }
    }

    // Save each setting as a key-value pair
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("site_settings")
        .upsert(update, { onConflict: 'key' })

      if (updateError) {
        console.error("Error updating theme settings:", updateError)
        return NextResponse.json({
          error: "Failed to update theme settings",
          details: updateError.message
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Theme settings updated successfully"
    })
  } catch (error) {
    console.error("Error in POST /api/theme-settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
