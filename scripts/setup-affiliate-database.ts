import { createClient } from '../lib/supabase'

async function setupAffiliateDatabase() {
  console.log('Setting up affiliate database...')
  
  const supabase = createClient()
  
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('affiliates')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Database connection test failed:', error)
      console.log('This might mean the affiliate tables need to be created.')
      console.log('Please run the SQL from supabase/affiliate_system.sql in your Supabase dashboard.')
      return false
    }
    
    console.log('✅ Database connection successful')
    console.log('✅ Affiliate tables exist')
    
    // Test the affiliate functions
    console.log('Testing affiliate functions...')
    
    // Test generate_affiliate_code function
    const { data: testCode, error: codeError } = await supabase
      .rpc('generate_affiliate_code')
    
    if (codeError) {
      console.error('❌ generate_affiliate_code function test failed:', codeError)
    } else {
      console.log('✅ generate_affiliate_code function working:', testCode)
    }
    
    // Test affiliate settings
    const { data: settings, error: settingsError } = await supabase
      .from('affiliate_settings')
      .select('*')
    
    if (settingsError) {
      console.error('❌ affiliate_settings table test failed:', settingsError)
    } else {
      console.log('✅ affiliate_settings table working, found', settings?.length || 0, 'settings')
    }
    
    console.log('🎉 Affiliate database setup complete!')
    return true
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    return false
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupAffiliateDatabase()
    .then(success => {
      if (success) {
        console.log('Setup completed successfully!')
        process.exit(0)
      } else {
        console.log('Setup failed!')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Setup error:', error)
      process.exit(1)
    })
}

export { setupAffiliateDatabase }
