#!/usr/bin/env node

/**
 * Navigation Translation Test Script
 * This script tests the language switcher and navigation translation functionality
 */

console.log('🧪 NAVIGATION TRANSLATION TEST SCRIPT')
console.log('=====================================')

// Test 1: Check if language context file exists and is valid
console.log('\n📋 Test 1: Language Context File Check')
try {
  const fs = require('fs')
  const path = './components/language-context.tsx'
  
  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf8')
    
    // Check for key features
    const hasUseRef = content.includes('useRef')
    const hasPathnameTracking = content.includes('previousPathRef.current')
    const hasLanguageRef = content.includes('languageRef.current')
    const hasNavigationDetection = content.includes('pathname !== previousPathRef.current')
    const hasConsoleLogging = content.includes('console.log')
    
    console.log('✅ Language context file exists')
    console.log(`  - useRef implementation: ${hasUseRef ? '✅' : '❌'}`)
    console.log(`  - Pathname tracking: ${hasPathnameTracking ? '✅' : '❌'}`)
    console.log(`  - Language ref tracking: ${hasLanguageRef ? '✅' : '❌'}`)
    console.log(`  - Navigation detection: ${hasNavigationDetection ? '✅' : '❌'}`)
    console.log(`  - Console debugging: ${hasConsoleLogging ? '✅' : '❌'}`)
  } else {
    console.log('❌ Language context file not found')
  }
} catch (error) {
  console.log('❌ Error checking language context file:', error.message)
}

// Test 2: Check Google Translate API route
console.log('\n📋 Test 2: Google Translate API Route Check')
try {
  const fs = require('fs')
  const path = './app/api/google-translate/route.ts'
  
  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf8')
    const hasPostMethod = content.includes('method: \'POST\'')
    const hasGoogleApi = content.includes('translation.googleapis.com')
    
    console.log('✅ Google Translate API route exists')
    console.log(`  - POST method: ${hasPostMethod ? '✅' : '❌'}`)
    console.log(`  - Google Translate API: ${hasGoogleApi ? '✅' : '❌'}`)
  } else {
    console.log('❌ Google Translate API route not found')
  }
} catch (error) {
  console.log('❌ Error checking Google Translate API route:', error.message)
}

// Test 3: Check language dropdown integration
console.log('\n📋 Test 3: Language Dropdown Integration Check')
try {
  const fs = require('fs')
  const path = './components/language-dropdown.tsx'
  
  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf8')
    const hasUseLanguage = content.includes('useLanguage')
    const hasChangeLanguage = content.includes('changeLanguage')
    const hasLanguageOptions = content.includes('SUPPORTED_LANGUAGES')
    
    console.log('✅ Language dropdown component exists')
    console.log(`  - useLanguage hook: ${hasUseLanguage ? '✅' : '❌'}`)
    console.log(`  - changeLanguage function: ${hasChangeLanguage ? '✅' : '❌'}`)
    console.log(`  - Language options: ${hasLanguageOptions ? '✅' : '❌'}`)
  } else {
    console.log('❌ Language dropdown component not found')
  }
} catch (error) {
  console.log('❌ Error checking language dropdown:', error.message)
}

// Test 4: Check Google Translate library
console.log('\n📋 Test 4: Google Translate Library Check')
try {
  const fs = require('fs')
  const path = './lib/google-translate.ts'
  
  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path, 'utf8')
    const hasSupportedLanguages = content.includes('SUPPORTED_LANGUAGES')
    const hasTranslateMethod = content.includes('translateText')
    
    console.log('✅ Google Translate library exists')
    console.log(`  - Supported languages: ${hasSupportedLanguages ? '✅' : '❌'}`)
    console.log(`  - Translate method: ${hasTranslateMethod ? '✅' : '❌'}`)
  } else {
    console.log('❌ Google Translate library not found')
  }
} catch (error) {
  console.log('❌ Error checking Google Translate library:', error.message)
}

// Test 5: Environment variable check
console.log('\n📋 Test 5: Environment Variable Check')
try {
  const fs = require('fs')
  const envPath = './.env.local'
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8')
    const hasGoogleApiKey = content.includes('GOOGLE_TRANSLATE_API_KEY') || content.includes('NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY')
    
    console.log('✅ .env.local file exists')
    console.log(`  - Google Translate API key: ${hasGoogleApiKey ? '✅' : '❌'}`)
    
    if (!hasGoogleApiKey) {
      console.log('  ⚠️  Warning: Google Translate API key not found in .env.local')
    }
  } else {
    console.log('❌ .env.local file not found')
  }
} catch (error) {
  console.log('❌ Error checking environment variables:', error.message)
}

console.log('\n📋 Test 6: Expected Console Output When Working')
console.log('When navigation translation works, you should see:')
console.log('🔧 Initializing language context with: es')
console.log('📍 Pathname change detected: "" → "/"')
console.log('🏠 Skipping first page load translation')
console.log('📍 Pathname change detected: "/" → "/chat"')
console.log('🔄 Navigation detected: "" → "/chat"')
console.log('🚀 Checking if translation needed for language: es')
console.log('🚀 Starting auto-translation for new page: /chat, lang: es')
console.log('⚡ Executing delayed translation for: /chat')
console.log('🔄 Starting page translation for language: es, page: /chat')
console.log('✅ Translated 5 elements on page: /chat')

console.log('\n📋 Test 7: Manual Testing Steps')
console.log('1. Open the website in browser')
console.log('2. Open browser developer console (F12)')
console.log('3. Select a non-English language from the sidebar dropdown')
console.log('4. Check console for language initialization logs')
console.log('5. Navigate to a different page (e.g., /chat)')
console.log('6. Look for navigation detection and translation logs')
console.log('7. Verify that page content translates automatically')

console.log('\n📋 Test 8: Debugging Steps')
console.log('If navigation translation is not working:')
console.log('1. Check console for any error messages')
console.log('2. Look for pathname change detection logs')
console.log('3. Verify language is not English when navigating')
console.log('4. Check if translation API calls are being made')
console.log('5. Verify Google Translate API key is working')

console.log('\n🎯 SUMMARY')
console.log('This test verifies that all components are in place for navigation translation.')
console.log('Check the console output above for any ❌ marked issues.')
console.log('For detailed debugging, open the browser console and test the functionality manually.')

// Additional test: Package.json scripts
console.log('\n📋 Test 9: Development Server Check')
console.log('To start the development server, run:')
console.log('npm run dev')
console.log('Then open http://localhost:3000 and test the language switcher.')

// Additional test: File structure verification
console.log('\n📋 Test 10: Required Files Summary')
const requiredFiles = [
  'components/language-context.tsx',
  'components/language-dropdown.tsx',
  'lib/google-translate.ts',
  'app/api/google-translate/route.ts'
]

requiredFiles.forEach(file => {
  const exists = require('fs').existsSync(`./${file}`)
  console.log(`  ${exists ? '✅' : '❌'} ${file}`)
})

console.log('\n🏁 Test completed! Check the results above.')
