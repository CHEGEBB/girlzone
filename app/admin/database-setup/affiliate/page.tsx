"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, Copy, Database, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function AffiliateDatabaseSetupPage() {
  const [copied, setCopied] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)

  const affiliateSetupSQL = `-- Affiliate System Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  total_earnings DECIMAL(10,2) DEFAULT 0.00,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id)
);

-- Create affiliate_links table
CREATE TABLE IF NOT EXISTS affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  link_type VARCHAR(50) NOT NULL CHECK (link_type IN ('general', 'character', 'premium', 'custom')),
  target_url TEXT NOT NULL,
  custom_code VARCHAR(100),
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create affiliate_clicks table for tracking
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  affiliate_link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  visitor_ip INET,
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted BOOLEAN DEFAULT FALSE,
  conversion_value DECIMAL(10,2),
  conversion_date TIMESTAMP WITH TIME ZONE
);

-- Create affiliate_commissions table
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  transaction_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Create affiliate_payouts table
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  commission_ids UUID[] NOT NULL,
  payout_method VARCHAR(50) NOT NULL CHECK (payout_method IN ('paypal', 'bank_transfer', 'crypto')),
  payout_details JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Create affiliate_settings table for global settings
CREATE TABLE IF NOT EXISTS affiliate_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate_id ON affiliate_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);

-- Enable Row Level Security
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own affiliate data" ON affiliates;
DROP POLICY IF EXISTS "Users can insert their own affiliate data" ON affiliates;
DROP POLICY IF EXISTS "Users can update their own affiliate data" ON affiliates;
DROP POLICY IF EXISTS "Admins can view all affiliate data" ON affiliates;
DROP POLICY IF EXISTS "Admins can update affiliate data" ON affiliates;

DROP POLICY IF EXISTS "Users can view their own affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "Users can manage their own affiliate links" ON affiliate_links;
DROP POLICY IF EXISTS "Admins can view all affiliate links" ON affiliate_links;

DROP POLICY IF EXISTS "Users can view their own affiliate clicks" ON affiliate_clicks;
DROP POLICY IF EXISTS "System can insert affiliate clicks" ON affiliate_clicks;
DROP POLICY IF EXISTS "Admins can view all affiliate clicks" ON affiliate_clicks;

DROP POLICY IF EXISTS "Users can view their own commissions" ON affiliate_commissions;
DROP POLICY IF EXISTS "Admins can manage all commissions" ON affiliate_commissions;

DROP POLICY IF EXISTS "Users can view their own payouts" ON affiliate_payouts;
DROP POLICY IF EXISTS "Admins can manage all payouts" ON affiliate_payouts;

DROP POLICY IF EXISTS "Admins can manage affiliate settings" ON affiliate_settings;

-- Create RLS policies for affiliates table
CREATE POLICY "Users can view their own affiliate data"
ON affiliates FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own affiliate data"
ON affiliates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate data"
ON affiliates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all affiliate data"
ON affiliates FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admins can update affiliate data"
ON affiliates FOR UPDATE
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create RLS policies for affiliate_links table
CREATE POLICY "Users can view their own affiliate links"
ON affiliate_links FOR SELECT
USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own affiliate links"
ON affiliate_links FOR ALL
USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all affiliate links"
ON affiliate_links FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create RLS policies for affiliate_clicks table
CREATE POLICY "Users can view their own affiliate clicks"
ON affiliate_clicks FOR SELECT
USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "System can insert affiliate clicks"
ON affiliate_clicks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all affiliate clicks"
ON affiliate_clicks FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create RLS policies for affiliate_commissions table
CREATE POLICY "Users can view their own commissions"
ON affiliate_commissions FOR SELECT
USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all commissions"
ON affiliate_commissions FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create RLS policies for affiliate_payouts table
CREATE POLICY "Users can view their own payouts"
ON affiliate_payouts FOR SELECT
USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all payouts"
ON affiliate_payouts FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Create RLS policies for affiliate_settings table
CREATE POLICY "Admins can manage affiliate settings"
ON affiliate_settings FOR ALL
USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_affiliates_updated_at
    BEFORE UPDATE ON affiliates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_links_updated_at
    BEFORE UPDATE ON affiliate_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique affiliate code
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character code
        new_code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM affiliates WHERE affiliate_code = new_code) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to track affiliate click
CREATE OR REPLACE FUNCTION track_affiliate_click(
    p_affiliate_code TEXT,
    p_link_type TEXT DEFAULT 'general',
    p_target_url TEXT DEFAULT NULL,
    p_visitor_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_referrer TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_affiliate_id UUID;
    v_link_id UUID;
    v_click_id UUID;
BEGIN
    -- Get affiliate ID from code
    SELECT id INTO v_affiliate_id 
    FROM affiliates 
    WHERE affiliate_code = p_affiliate_code AND status = 'approved';
    
    IF v_affiliate_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or inactive affiliate code: %', p_affiliate_code;
    END IF;
    
    -- Get or create affiliate link
    SELECT id INTO v_link_id
    FROM affiliate_links
    WHERE affiliate_id = v_affiliate_id 
    AND link_type = p_link_type 
    AND (p_target_url IS NULL OR target_url = p_target_url);
    
    IF v_link_id IS NULL THEN
        INSERT INTO affiliate_links (affiliate_id, link_type, target_url)
        VALUES (v_affiliate_id, p_link_type, COALESCE(p_target_url, ''))
        RETURNING id INTO v_link_id;
    END IF;
    
    -- Record the click
    INSERT INTO affiliate_clicks (
        affiliate_id, 
        affiliate_link_id, 
        visitor_ip, 
        user_agent, 
        referrer
    )
    VALUES (
        v_affiliate_id, 
        v_link_id, 
        p_visitor_ip, 
        p_user_agent, 
        p_referrer
    )
    RETURNING id INTO v_click_id;
    
    -- Update click count
    UPDATE affiliate_links 
    SET click_count = click_count + 1 
    WHERE id = v_link_id;
    
    UPDATE affiliates 
    SET total_clicks = total_clicks + 1 
    WHERE id = v_affiliate_id;
    
    RETURN v_click_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record affiliate conversion
CREATE OR REPLACE FUNCTION record_affiliate_conversion(
    p_click_id UUID,
    p_transaction_id UUID,
    p_conversion_value DECIMAL(10,2)
)
RETURNS UUID AS $$
DECLARE
    v_affiliate_id UUID;
    v_link_id UUID;
    v_commission_rate DECIMAL(5,2);
    v_commission_amount DECIMAL(10,2);
    v_commission_id UUID;
BEGIN
    -- Get affiliate and link info from click
    SELECT affiliate_id, affiliate_link_id INTO v_affiliate_id, v_link_id
    FROM affiliate_clicks
    WHERE id = p_click_id;
    
    IF v_affiliate_id IS NULL THEN
        RAISE EXCEPTION 'Invalid click ID: %', p_click_id;
    END IF;
    
    -- Get commission rate
    SELECT commission_rate INTO v_commission_rate
    FROM affiliates
    WHERE id = v_affiliate_id;
    
    -- Calculate commission
    v_commission_amount := (p_conversion_value * v_commission_rate) / 100;
    
    -- Record commission
    INSERT INTO affiliate_commissions (
        affiliate_id,
        transaction_id,
        commission_amount,
        commission_rate,
        transaction_amount
    )
    VALUES (
        v_affiliate_id,
        p_transaction_id,
        v_commission_amount,
        v_commission_rate,
        p_conversion_value
    )
    RETURNING id INTO v_commission_id;
    
    -- Update conversion tracking
    UPDATE affiliate_clicks 
    SET converted = TRUE, 
        conversion_value = p_conversion_value,
        conversion_date = NOW()
    WHERE id = p_click_id;
    
    UPDATE affiliate_links 
    SET conversion_count = conversion_count + 1 
    WHERE id = v_link_id;
    
    UPDATE affiliates 
    SET total_conversions = total_conversions + 1,
        total_earnings = total_earnings + v_commission_amount,
        conversion_rate = CASE 
            WHEN total_clicks > 0 THEN (total_conversions::DECIMAL / total_clicks) * 100 
            ELSE 0 
        END
    WHERE id = v_affiliate_id;
    
    RETURN v_commission_id;
END;
$$ LANGUAGE plpgsql;

-- Insert default affiliate settings
INSERT INTO affiliate_settings (id, value) VALUES 
('default_commission_rate', '{"value": 10.0}'),
('min_payout_amount', '{"value": 50.0}'),
('payout_frequency', '{"value": "monthly"}'),
('cookie_duration_days', '{"value": 30}'),
('approval_required', '{"value": true}')
ON CONFLICT (id) DO NOTHING;`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(affiliateSetupSQL)
      setCopied(true)
      toast.success("SQL copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy SQL")
    }
  }

  const testDatabaseConnection = async () => {
    setTesting(true)
    try {
      const response = await fetch('/api/affiliate/test')
      const result = await response.json()
      setTestResults(result)
      
      if (result.success) {
        toast.success("Database connection test passed!")
      } else {
        toast.error("Database connection test failed")
      }
    } catch (error) {
      console.error('Test error:', error)
      toast.error("Failed to test database connection")
      setTestResults({ error: "Failed to connect to database" })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Affiliate System Database Setup</h1>
        <p className="text-muted-foreground">
          Set up the database tables and functions required for the affiliate system.
        </p>
      </div>

      <div className="space-y-6">
        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Setup Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to set up the affiliate system database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <p className="font-medium">Copy the SQL script</p>
                  <p className="text-sm text-muted-foreground">Click the copy button below to copy the complete SQL setup script</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <p className="font-medium">Open Supabase SQL Editor</p>
                  <p className="text-sm text-muted-foreground">Go to your Supabase dashboard and open the SQL Editor</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <p className="font-medium">Run the SQL script</p>
                  <p className="text-sm text-muted-foreground">Paste and execute the SQL script in the Supabase SQL Editor</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">4</div>
                <div>
                  <p className="font-medium">Test the setup</p>
                  <p className="text-sm text-muted-foreground">Click the test button below to verify everything is working</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SQL Script */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Affiliate System SQL Script</CardTitle>
              <Button onClick={copyToClipboard} variant="outline" size="sm">
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Complete SQL script to create all affiliate system tables, functions, and policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
              <code>{affiliateSetupSQL}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Test Database Connection */}
        <Card>
          <CardHeader>
            <CardTitle>Test Database Connection</CardTitle>
            <CardDescription>
              Verify that the affiliate system database is properly set up
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testDatabaseConnection} disabled={testing}>
              {testing ? "Testing..." : "Test Database Connection"}
            </Button>

            {testResults && (
              <Alert className={testResults.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <div className="flex items-center gap-2">
                  {testResults.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertTitle>
                    {testResults.success ? "Database Test Passed" : "Database Test Failed"}
                  </AlertTitle>
                </div>
                <AlertDescription className="mt-2">
                  {testResults.success ? (
                    <div className="space-y-2">
                      <p>✅ All affiliate database components are working correctly!</p>
                      {testResults.tests && (
                        <div className="space-y-1 text-sm">
                          {Object.entries(testResults.tests).map(([test, result]) => (
                            <div key={test} className="flex items-center gap-2">
                              <span className="font-medium">{test}:</span>
                              <span>{result}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p>❌ Database setup is incomplete or has errors.</p>
                      {testResults.details && (
                        <p className="text-sm"><strong>Error:</strong> {testResults.details}</p>
                      )}
                      {testResults.suggestion && (
                        <p className="text-sm"><strong>Suggestion:</strong> {testResults.suggestion}</p>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
