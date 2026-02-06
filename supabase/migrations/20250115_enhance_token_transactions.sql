-- Add balance tracking columns to token_transactions
ALTER TABLE token_transactions 
ADD COLUMN IF NOT EXISTS balance_before INTEGER,
ADD COLUMN IF NOT EXISTS balance_after INTEGER;

-- Update token_transactions type enum to include new types dynamically
-- ensuring we don't break existing data with unknown types
DO $$ 
DECLARE
  existing_types TEXT[];
  new_constraint_def TEXT;
  required_types TEXT[] := ARRAY[
    'purchase', 
    'usage', 
    'refund', 
    'bonus', 
    'recharge', 
    'subscription_bonus', 
    'subscription_grant',
    'chat_consumption', 
    'voice_call_consumption', 
    'image_generation', 
    'video_generation', 
    'manual_adjustment', 
    'refund_reversal'
  ];
  t TEXT;
BEGIN
  -- Get all unique transaction types currently in the table
  SELECT array_agg(DISTINCT type) INTO existing_types
  FROM token_transactions;
  
  RAISE NOTICE 'Existing transaction types: %', existing_types;
  
  -- Drop the existing check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'token_transactions_type_check'
  ) THEN
    ALTER TABLE token_transactions DROP CONSTRAINT token_transactions_type_check;
    RAISE NOTICE 'Dropped existing constraint';
  END IF;
  
  -- Start with required types
  new_constraint_def := '';
  FOREACH t IN ARRAY required_types LOOP
    IF new_constraint_def != '' THEN
      new_constraint_def := new_constraint_def || ', ';
    END IF;
    new_constraint_def := new_constraint_def || '''' || t || '''';
  END LOOP;
  
  -- Add any existing types that aren't in our required list
  IF existing_types IS NOT NULL THEN
    FOREACH t IN ARRAY existing_types LOOP
      IF NOT (t = ANY(required_types)) THEN
        new_constraint_def := new_constraint_def || ', ''' || t || '''';
        RAISE NOTICE 'Adding existing custom type to constraint: %', t;
      END IF;
    END LOOP;
  END IF;
  
  -- Create the new constraint with all types
  EXECUTE format(
    'ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_type_check CHECK (type IN (%s))',
    new_constraint_def
  );
  
  RAISE NOTICE 'Created new constraint with types: %', new_constraint_def;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating constraint: %. Continuing anyway...', SQLERRM;
END $$;

-- Create function to automatically calculate balances on insert
CREATE OR REPLACE FUNCTION update_token_transaction_balances()
RETURNS TRIGGER AS $$
DECLARE
  current_user_balance INTEGER;
BEGIN
  -- Get the current balance from user_tokens
  -- Note: This assumes user_tokens has already been updated if the update happened before insert
  SELECT balance INTO current_user_balance
  FROM user_tokens
  WHERE user_id = NEW.user_id;

  -- If no user_tokens record exists, assume 0
  IF current_user_balance IS NULL THEN
    current_user_balance := 0;
  END IF;

  -- Set the balance_after to the current balance
  NEW.balance_after := current_user_balance;
  
  -- Calculate balance_before based on the transaction amount
  -- balance_after = balance_before + amount
  -- therefore: balance_before = balance_after - amount
  NEW.balance_before := current_user_balance - NEW.amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run before insert
DROP TRIGGER IF EXISTS set_token_transaction_balances ON token_transactions;

CREATE TRIGGER set_token_transaction_balances
BEFORE INSERT ON token_transactions
FOR EACH ROW
EXECUTE FUNCTION update_token_transaction_balances();
