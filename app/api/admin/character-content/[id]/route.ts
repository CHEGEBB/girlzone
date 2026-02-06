import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

// DELETE - Remove admin character content
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Content ID is required" }, { status: 400 })
    }

    const supabase = createClient()

    // Delete content - RLS policies will handle authorization
    // Admin page ensures only admins can access this
    const { error } = await supabase
      .from("admin_character_content")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[API] Error deleting admin content:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Content deleted successfully" })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
