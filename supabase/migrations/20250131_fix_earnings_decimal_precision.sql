-- Fix decimal precision for earnings tables to support micro-earnings ($0.0001 per token)

-- Update model_creator_earnings table to use 4 decimal places
ALTER TABLE model_creator_earnings
ALTER COLUMN total_earnings TYPE DECIMAL(10,4);

-- Update earnings_transactions table to use 4 decimal places
ALTER TABLE earnings_transactions
ALTER COLUMN amount TYPE DECIMAL(10,4);

-- Update model_analytics table to use 4 decimal places
ALTER TABLE model_analytics
ALTER COLUMN earnings_generated TYPE DECIMAL(10,4),
ALTER COLUMN avg_usage_per_user TYPE DECIMAL(10,4);
