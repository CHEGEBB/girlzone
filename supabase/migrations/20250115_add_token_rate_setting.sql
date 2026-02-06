-- Add token-to-USD rate setting for withdrawals
INSERT INTO admin_settings (key, value, description) 
VALUES ('token_to_usd_rate', '0.01', 'Token to USD conversion rate for withdrawals (1 token = $0.01)')
ON CONFLICT (key) DO NOTHING;

-- Add withdrawal processing fee setting
INSERT INTO admin_settings (key, value, description) 
VALUES ('withdrawal_processing_fee_percent', '0', 'Processing fee percentage for withdrawals (0-100)')
ON CONFLICT (key) DO NOTHING;
