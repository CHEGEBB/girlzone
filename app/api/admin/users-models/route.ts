import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    // Get the authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminUserId = session.user.id
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "users" or "models"

    // Check if user is admin using the users_view (backed by admin_users)
    const { data: adminView, error: adminViewError } = await supabase
      .from("users_view")
      .select("is_admin")
      .eq("id", adminUserId)
      .single()

    if (adminViewError || !adminView?.is_admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    if (type === "users") {
      // Get all users from the view (includes email and admin status)
      const { data: usersRaw, error: usersError } = await supabase
        .from("users_view")
        .select("id, email, created_at, username")
        .order("created_at", { ascending: false })

      if (usersError) {
        throw usersError
      }

      const users = (usersRaw || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.username || u.email,
        created_at: u.created_at,
      }))

      return NextResponse.json({
        success: true,
        users
      })
    } else if (type === "models") {
      // Get all models listed for sale: active and premium
      const { data: models, error: modelsError } = await supabase
        .from("models")
        .select("id, name, description, category, creator_id, is_active")
        .eq("is_active", true)
        .eq("is_premium", true)
        .order("name", { ascending: true })

      if (modelsError) {
        throw modelsError
      }

      return NextResponse.json({
        success: true,
        models: models || []
      })
    } else {
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 })
    }

  } catch (error) {
    console.error("Users/Models fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
