-- Update earnings_transactions table to support additional transaction types
ALTER TABLE earnings_transactions 
DROP CONSTRAINT IF EXISTS earnings_transactions_transaction_type_check;

ALTER TABLE earnings_transactions 
ADD CONSTRAINT earnings_transactions_transaction_type_check 
CHECK (transaction_type IN ('earnings', 'payout', 'bonus', 'adjustment', 'refund', 'correction', 'reward'));

-- Add admin attribution fields to earnings_transactions
ALTER TABLE earnings_transactions 
ADD COLUMN IF NOT EXISTS added_by_admin UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE earnings_transactions 
ADD COLUMN IF NOT EXISTS admin_email TEXT;

-- Update the metadata to include admin information
COMMENT ON COLUMN earnings_transactions.added_by_admin IS 'Admin user ID who added this earnings transaction';
COMMENT ON COLUMN earnings_transactions.admin_email IS 'Email of the admin who added this earnings transaction';

-- Create index for admin attribution
CREATE INDEX IF NOT EXISTS earnings_transactions_added_by_admin_idx ON earnings_transactions (added_by_admin);

-- Update RLS policies to allow admins to view all earnings transactions
CREATE POLICY "Admins can view all earnings transactions" 
  ON earnings_transactions FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Allow admins to insert earnings transactions
CREATE POLICY "Admins can insert earnings transactions" 
  ON earnings_transactions FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Allow admins to update earnings transactions
CREATE POLICY "Admins can update earnings transactions" 
  ON earnings_transactions FOR UPDATE 
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
