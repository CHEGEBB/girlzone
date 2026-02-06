const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qfjptqdkthmejxpwbmvq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmanB0cWRrdGhtZWp4cHdibXZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA5NTIyMCwiZXhwIjoyMDY4NjcxMjIwfQ.wVBiVf-fmg3KAng-QN9ApxhjVkgKxj7L2aem7y1iPT4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
  console.log('Checking admin_settings table...');
  const { data, error } = await supabase.from('admin_settings').select('*');
  if (error) {
    console.error('Error fetching settings:', error);
  } else {
    console.log('Settings found:', data.length);
    console.log(JSON.stringify(data, null, 2));
    
    // Check specifically for monetization_enabled
    const monetization = data.find(item => item.key === 'monetization_enabled');
    console.log('Monetization setting:', monetization);
  }
}

checkSettings();

checkSettings();
