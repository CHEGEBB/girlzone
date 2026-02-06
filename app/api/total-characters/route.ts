import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await cookies()
    const supabase = await createAdminClient()
    if (!supabase) {
      return NextResponse.json({ error: "Failed to create Supabase admin client" }, { status: 500 })
    }

    // Count system characters (where user_id is null)
    // using count: 'exact' and head: true to avoid fetching data
    const { count, error } = await supabase
      .from("characters")
      .select("*", { count: "exact", head: true })
      .is("user_id", null)

    if (error) {
      console.error("Error fetching total characters:", error)
      return NextResponse.json({ error: "Failed to fetch total characters" }, { status: 500 })
    }

    return NextResponse.json({ totalCharacters: count || 0 })
  } catch (error) {
    console.error("Error in total-characters route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
