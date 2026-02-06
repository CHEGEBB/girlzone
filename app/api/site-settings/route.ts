import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Simple in-memory cache with TTL
let cachedSiteSettings: any | null = null
let cachedAtMs = 0
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

export async function GET() {
  try {
    // Serve from cache if fresh
    const now = Date.now()
    if (cachedSiteSettings && now - cachedAtMs < CACHE_TTL_MS) {
      return NextResponse.json({ settings: cachedSiteSettings })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Get site settings from site_settings table (key-value structure)
    const { data: settingsData, error } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", ["site_name", "logo_text", "site_suffix", "seo_title", "seo_description", "custom_favicon_url", "language", "features", "pricing"])

    if (error) {
      console.error("Error fetching site settings:", error)
      return NextResponse.json({
        settings: {
          site_name: "Girlzone",
          logo_text: "Girlzone",
          site_suffix: ".ai",
          seo_title: "Girlzone - Your AI Companion",
          seo_description: "Explore and chat with AI characters on Girlzone",
          custom_favicon_url: "",
          language: "en",
          features: {
            face_swap: true
          },
          pricing: {
            currency: "$",
            currencyPosition: "left",
            monthly: { price: 12.99, originalPrice: 19.99, discount: 35 },
            quarterly: { price: 9.99, originalPrice: 19.99, discount: 50 },
            yearly: { price: 5.99, originalPrice: 19.99, discount: 70 }
          }
        }
      })
    }

    // Convert key-value pairs to object
    const settings: any = {}
    if (settingsData) {
      settingsData.forEach(setting => {
        try {
          settings[setting.key] = JSON.parse(setting.value)
        } catch {
          settings[setting.key] = setting.value
        }
      })
    }

    const normalized = {
      site_name: settings.site_name || "Girlzone",
      logo_text: settings.logo_text || "Girlzone",
      site_suffix: settings.site_suffix || ".ai",
      seo_title: settings.seo_title || "Girlzone - Your AI Companion",
      seo_description: settings.seo_description || "Explore and chat with AI characters on Girlzone",
      custom_favicon_url: settings.custom_favicon_url || "",
      language: settings.language || "en",
      features: settings.features || {
        face_swap: true
      },
      pricing: settings.pricing || {
        currency: "$",
        currencyPosition: "left",
        monthly: { price: 12.99, originalPrice: 19.99, discount: 35 },
        quarterly: { price: 9.99, originalPrice: 19.99, discount: 50 },
        yearly: { price: 5.99, originalPrice: 19.99, discount: 70 }
      }
    }

    // Update cache
    cachedSiteSettings = normalized
    cachedAtMs = now

    return NextResponse.json({ settings: normalized })
  } catch (error) {
    console.error("Error in GET /api/site-settings:", error)
    return NextResponse.json({
      settings: {
        site_name: "Girlzone",
        logo_text: "Girlzone",
        site_suffix: ".ai",
        seo_title: "Girlzone - Your AI Companion",
        seo_description: "Explore and chat with AI characters on Girlzone",
        custom_favicon_url: "",
        language: "en",
        features: {
          face_swap: true
        },
        pricing: {
          currency: "$",
          currencyPosition: "left",
          monthly: { price: 12.99, originalPrice: 19.99, discount: 35 },
          quarterly: { price: 9.99, originalPrice: 19.99, discount: 50 },
          yearly: { price: 5.99, originalPrice: 19.99, discount: 70 }
        }
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const body = await request.json()
    const { site_name, logo_text, site_suffix, seo_title, seo_description, custom_favicon_url, features } = body

    console.log("Updating site settings:", { site_name, logo_text, site_suffix, seo_title, seo_description, custom_favicon_url, features })

    // Update site settings using key-value structure
    const updates = []

    if (site_name !== undefined) {
      updates.push({
        key: 'site_name',
        value: JSON.stringify(site_name),
        updated_at: new Date().toISOString()
      })
    }

    if (logo_text !== undefined) {
      updates.push({
        key: 'logo_text',
        value: JSON.stringify(logo_text),
        updated_at: new Date().toISOString()
      })
    }

    if (site_suffix !== undefined) {
      updates.push({
        key: 'site_suffix',
        value: JSON.stringify(site_suffix),
        updated_at: new Date().toISOString()
      })
    }

    if (seo_title !== undefined) {
      updates.push({
        key: 'seo_title',
        value: JSON.stringify(seo_title),
        updated_at: new Date().toISOString()
      })
    }

    if (seo_description !== undefined) {
      updates.push({
        key: 'seo_description',
        value: JSON.stringify(seo_description),
        updated_at: new Date().toISOString()
      })
    }

    if (custom_favicon_url !== undefined) {
      updates.push({
        key: 'custom_favicon_url',
        value: JSON.stringify(custom_favicon_url),
        updated_at: new Date().toISOString()
      })
    }

    if (features !== undefined) {
      updates.push({
        key: 'features',
        value: JSON.stringify(features),
        updated_at: new Date().toISOString()
      })
    }

    // Save each setting as a key-value pair
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("site_settings")
        .upsert(update, { onConflict: 'key' })

      if (updateError) {
        console.error("Error updating site settings:", updateError)
        return NextResponse.json({
          error: "Failed to update settings",
          details: updateError.message
        }, { status: 500 })
      }
    }

    // Clear cache after update
    cachedSiteSettings = null

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully"
    })
  } catch (error) {
    console.error("Error in POST /api/site-settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
