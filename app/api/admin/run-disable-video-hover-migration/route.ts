import { createAdminClient } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const supabaseAdmin = await createAdminClient()
        if (!supabaseAdmin) {
            return NextResponse.json({ error: "Failed to create Supabase admin client" }, { status: 500 })
        }

        const queries = [
            // 1. Add disable_video_hover column to characters table
            `ALTER TABLE characters ADD COLUMN IF NOT EXISTS disable_video_hover BOOLEAN DEFAULT FALSE;`,

            // 2. Add video_url if missing (just in case)
            `ALTER TABLE characters ADD COLUMN IF NOT EXISTS video_url TEXT;`,

            // 3. Create user_premium_status table
            `CREATE TABLE IF NOT EXISTS user_premium_status (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                is_premium BOOLEAN DEFAULT FALSE,
                expires_at TIMESTAMP WITH TIME ZONE,
                plan_name TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );`,

            // 4. Create unique index on user_id for user_premium_status
            `CREATE UNIQUE INDEX IF NOT EXISTS user_premium_status_user_id_idx ON user_premium_status(user_id);`,

            // 5. Add RLS to user_premium_status
            `ALTER TABLE user_premium_status ENABLE ROW LEVEL SECURITY;`,

            // 6. Add policies for user_premium_status
            `DROP POLICY IF EXISTS "Users can view their own premium status" ON user_premium_status;
             CREATE POLICY "Users can view their own premium status" ON user_premium_status FOR SELECT USING (auth.uid() = user_id);`,

            `DROP POLICY IF EXISTS "Admins can view all premium status" ON user_premium_status;
             CREATE POLICY "Admins can view all premium status" ON user_premium_status FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));`
        ]

        const results = []
        let lastError = null

        // Try using execute_sql RPC first (seems most common in this codebase)
        for (const query of queries) {
            console.log(`Executing: ${query.substring(0, 50)}...`)
            const { data, error } = await supabaseAdmin.rpc("execute_sql", { sql_query: query })

            if (error) {
                console.error(`Migration error with execute_sql:`, error)
                // Fallback to pgclient if execute_sql fails
                const { data: pgData, error: pgError } = await supabaseAdmin.rpc("pgclient", { query: query })

                if (pgError) {
                    console.error(`Migration error with pgclient:`, pgError)
                    lastError = pgError
                } else {
                    results.push(pgData)
                }
            } else {
                results.push(data)
            }
        }

        if (lastError && results.length === 0) {
            return NextResponse.json({
                success: false,
                error: lastError.message,
                hint: "If RPC functions 'execute_sql' or 'pgclient' are missing, you must run the SQL manually in Supabase Dashboard."
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: "Database migration completed successfully",
            results_count: results.length
        })
    } catch (error) {
        console.error("Unexpected error:", error)
        return NextResponse.json({ error: error instanceof Error ? error.message : "An unexpected error occurred" }, { status: 500 })
    }
}
