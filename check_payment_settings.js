const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSettings() {
  console.log('Checking admin settings...');
  
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .in('key', ['monetization_enabled', 'payment_gateway']);

  if (error) {
    console.error('Error fetching settings:', error);
    return;
  }

  console.log('Settings found:', data);
}

checkSettings();
