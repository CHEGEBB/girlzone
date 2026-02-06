-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payout_method TEXT NOT NULL CHECK (payout_method IN ('stripe', 'paypal', 'bank_transfer', 'crypto')),
  payout_details JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')) DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal_request_items table to track which earnings are being withdrawn
CREATE TABLE IF NOT EXISTS withdrawal_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  earnings_transaction_id UUID NOT NULL REFERENCES earnings_transactions(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create withdrawal_history table for audit trail
CREATE TABLE IF NOT EXISTS withdrawal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'approved', 'processing', 'completed', 'rejected', 'cancelled', 'updated')),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS withdrawal_requests_creator_id_idx ON withdrawal_requests (creator_id);
CREATE INDEX IF NOT EXISTS withdrawal_requests_status_idx ON withdrawal_requests (status);
CREATE INDEX IF NOT EXISTS withdrawal_requests_created_at_idx ON withdrawal_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawal_requests_amount_idx ON withdrawal_requests (amount DESC);

CREATE INDEX IF NOT EXISTS withdrawal_request_items_withdrawal_id_idx ON withdrawal_request_items (withdrawal_request_id);
CREATE INDEX IF NOT EXISTS withdrawal_request_items_earnings_id_idx ON withdrawal_request_items (earnings_transaction_id);

CREATE INDEX IF NOT EXISTS withdrawal_history_withdrawal_id_idx ON withdrawal_history (withdrawal_request_id);
CREATE INDEX IF NOT EXISTS withdrawal_history_created_at_idx ON withdrawal_history (created_at DESC);

-- Enable Row Level Security
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests" 
  ON withdrawal_requests FOR SELECT 
  USING (auth.uid() = creator_id);

-- Users can create their own withdrawal requests
CREATE POLICY "Users can create their own withdrawal requests" 
  ON withdrawal_requests FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

-- Users can update their own pending withdrawal requests
CREATE POLICY "Users can update their own pending withdrawal requests" 
  ON withdrawal_requests FOR UPDATE 
  USING (auth.uid() = creator_id AND status = 'pending')
  WITH CHECK (auth.uid() = creator_id);

-- Users can view their own withdrawal request items
CREATE POLICY "Users can view their own withdrawal request items" 
  ON withdrawal_request_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM withdrawal_requests 
      WHERE withdrawal_requests.id = withdrawal_request_items.withdrawal_request_id 
      AND withdrawal_requests.creator_id = auth.uid()
    )
  );

-- Users can create withdrawal request items for their own requests
CREATE POLICY "Users can create their own withdrawal request items" 
  ON withdrawal_request_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM withdrawal_requests 
      WHERE withdrawal_requests.id = withdrawal_request_items.withdrawal_request_id 
      AND withdrawal_requests.creator_id = auth.uid()
    )
  );

-- Users can view their own withdrawal history
CREATE POLICY "Users can view their own withdrawal history" 
  ON withdrawal_history FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM withdrawal_requests 
      WHERE withdrawal_requests.id = withdrawal_history.withdrawal_request_id 
      AND withdrawal_requests.creator_id = auth.uid()
    )
  );

-- Admins can manage all withdrawal requests
CREATE POLICY "Admins can manage all withdrawal requests" 
  ON withdrawal_requests FOR ALL 
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

-- Admins can manage all withdrawal request items
CREATE POLICY "Admins can manage all withdrawal request items" 
  ON withdrawal_request_items FOR ALL 
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

-- Admins can manage all withdrawal history
CREATE POLICY "Admins can manage all withdrawal history" 
  ON withdrawal_history FOR ALL 
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

-- Add minimum withdrawal amount setting
INSERT INTO admin_settings (key, value, description) 
VALUES ('minimum_withdrawal_amount', '10.00', 'Minimum amount required for withdrawal requests')
ON CONFLICT (key) DO NOTHING;

-- Add withdrawal processing fee setting
INSERT INTO admin_settings (key, value, description) 
VALUES ('withdrawal_processing_fee', '0.00', 'Processing fee for withdrawal requests')
ON CONFLICT (key) DO NOTHING;
