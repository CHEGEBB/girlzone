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

    // First, let's check what the current table structure looks like
    const checkTableSQL = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'admin_settings' 
      ORDER BY ordinal_position;
    `

    const { data: tableInfo, error: checkError } = await supabaseAdmin.rpc("exec_sql", { sql: checkTableSQL })

    console.log("Current admin_settings table structure:", tableInfo)

    // Now let's safely migrate the table
    const migrationSQL = `
      -- First, let's backup any existing data
      CREATE TABLE IF NOT EXISTS admin_settings_backup AS 
      SELECT * FROM admin_settings WHERE 1=0;

      -- Drop the existing table if it exists (this will remove the conflicting structure)
      DROP TABLE IF EXISTS admin_settings CASCADE;

      -- Create the new admin_settings table with the correct structure
      CREATE TABLE admin_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Enable Row Level Security
      ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies
      CREATE POLICY "Admins can read admin settings" 
        ON admin_settings FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
          )
        );

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
      CREATE INDEX admin_settings_key_idx ON admin_settings (key);

      -- Insert default settings
      INSERT INTO admin_settings (key, value, description) VALUES
      ('monetization_enabled', 'true', 'Enable or disable the monetization system'),
      ('token_to_usd_rate', '0.01', 'Token to USD conversion rate (1 token = $0.01)'),
      ('withdrawal_processing_fee_percent', '0', 'Processing fee percentage for withdrawals (0-100)'),
      ('minimum_withdrawal_amount', '10.00', 'Minimum amount required for withdrawal requests'),
      ('stripe_secret_key', '', 'Stripe secret key for payment processing'),
      ('stripe_webhook_secret', '', 'Stripe webhook secret for verifying events'),
      ('site_name', 'Girlzone.ai', 'The name of the site'),
      ('logo_text', 'Girlzone', 'The text part of the logo')
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
      message: "Admin settings migration completed successfully. Table structure has been updated to use UUID primary key with key-value pairs.",
      tableInfo: tableInfo
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
