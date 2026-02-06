import { type NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createRouteHandlerClient(
      { cookies: () => cookies() },
      {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    )

    // Run the admin_settings migration SQL directly
    const migrationSQL = `
      -- Create admin_settings table for admin configuration
      CREATE TABLE IF NOT EXISTS admin_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable Row Level Security
      ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Admins can read admin settings" ON admin_settings;
      DROP POLICY IF EXISTS "Admins can modify admin settings" ON admin_settings;

      -- Create RLS policies
      -- Only admins can read admin settings
      CREATE POLICY "Admins can read admin settings" 
        ON admin_settings FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
          )
        );

      -- Only admins can modify admin settings
      CREATE POLICY "Admins can modify admin settings" 
        ON admin_settings FOR ALL 
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
          )
        );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS admin_settings_key_idx ON admin_settings (key);

      -- Insert default settings
      INSERT INTO admin_settings (key, value, description) VALUES
      ('monetization_enabled', 'true', 'Enable or disable the monetization system'),
      ('token_to_usd_rate', '0.01', 'Token to USD conversion rate (1 token = $0.01)'),
      ('withdrawal_processing_fee_percent', '0', 'Processing fee percentage for withdrawals (0-100)'),
      ('minimum_withdrawal_amount', '10.00', 'Minimum amount required for withdrawal requests')
      ON CONFLICT (key) DO NOTHING;
    `

    // Execute the migration
    const { error: migrationError } = await supabaseAdmin.rpc("exec_sql", { sql: migrationSQL })

    if (migrationError) {
      console.error("Error running admin_settings migration:", migrationError)
      return NextResponse.json({ 
        error: "migration_failed", 
        details: migrationError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Admin settings migration completed successfully" 
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
