const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('🔍 Scanning for paid transactions with missing commissions...');

  // 1. Get recent paid transactions
  const { data: transactions, error: txError } = await supabase
    .from('payment_transactions')
    .select('*')
    .in('status', ['paid', 'completed'])
    .order('created_at', { ascending: false })
    .limit(10); // Check last 10

  if (txError) {
    console.error('Error fetching transactions:', txError);
    return;
  }

  console.log(`Found ${transactions.length} paid transactions.`);

  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const tx of transactions) {
    const paymentId = tx.id;
    const initialUserId = tx.user_id; // Rename to avoid confusion in loop
    let amount = tx.amount;

    // Fallback amount from metadata if main amount is 0/null (sometimes happens)
    if (!amount && tx.metadata && tx.metadata.price) {
        amount = parseFloat(tx.metadata.price);
    }

    if (!amount || amount <= 0) {
        console.log(`⚠️ Transaction ${paymentId}: Amount is 0 or invalid. Skipping.`);
        skippedCount++;
        continue;
    }

    // 2. Check if commission exists
    const { data: bonusTx, error: bonusError } = await supabase
      .from('bonus_transactions')
      .select('id')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (bonusError) {
      console.error(`Error checking bonus for tx ${paymentId}:`, bonusError);
      errorCount++;
      continue;
    }

    if (bonusTx) {
      skippedCount++;
      continue;
    }

    console.log(`🔧 Transaction ${paymentId} (User: ${initialUserId}, Amount: ${amount}): Missing commission. Processing manually...`);

    // 3. Process commission manually (up to 3 levels)
    try {
        let currentUserId = initialUserId;
        let level = 1;
        let distributed = false;

        while (level <= 3) {
            // Get referrer
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('referrer_id')
                .eq('user_id', currentUserId)
                .single();
            
            if (profileError || !profile || !profile.referrer_id) {
                if (level === 1) console.log(`   ℹ️ No referrer for user ${currentUserId} (Level ${level}). Stopping chain.`);
                break;
            }

            const referrerId = profile.referrer_id;
            
            // Calculate commission
            let rate = 0;
            if (level === 1) rate = 0.50;
            else if (level === 2) rate = 0.05;
            else if (level === 3) rate = 0.05;

            const commissionAmount = amount * rate;

            console.log(`   💰 Level ${level}: Referrer ${referrerId} gets ${commissionAmount} (${rate*100}%)`);

            // Update bonus wallet
            // First check if wallet exists
            const { data: wallet } = await supabase.from('bonus_wallets').select('*').eq('user_id', referrerId).single();
            
            if (wallet) {
                await supabase.from('bonus_wallets').update({
                    balance: wallet.balance + commissionAmount,
                    lifetime_earnings: wallet.lifetime_earnings + commissionAmount,
                    updated_at: new Date().toISOString()
                }).eq('user_id', referrerId);
            } else {
                await supabase.from('bonus_wallets').insert({
                    user_id: referrerId,
                    balance: commissionAmount,
                    lifetime_earnings: commissionAmount,
                    updated_at: new Date().toISOString()
                });
            }

            // Insert transaction
            const { error: insertError } = await supabase.from('bonus_transactions').insert({
                user_id: referrerId,
                transaction_type: `commission_level${level}`,
                amount: commissionAmount,
                from_user_id: initialUserId, // Original buyer
                payment_id: paymentId,
                level: level,
                description: `Level ${level} commission from referral purchase (Manual Fix)`,
                status: 'completed'
            });

            if (insertError) {
                console.error(`   ❌ Error inserting transaction for level ${level}:`, insertError);
            } else {
                console.log(`   ✅ Commission credited for level ${level}.`);
                distributed = true;
            }

            // Move up
            currentUserId = referrerId;
            level++;
        }

        if (distributed) fixedCount++;
        else skippedCount++; // No commission distributed (no referrer)

    } catch (e) {
      console.error(`❌ Exception processing commission for tx ${paymentId}:`, e);
      errorCount++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total Scanned: ${transactions.length}`);
  console.log(`Already Had Commission / Skipped: ${skippedCount}`);
  console.log(`Fixed / Credited: ${fixedCount}`);
  console.log(`Errors: ${errorCount}`);
}

main();
