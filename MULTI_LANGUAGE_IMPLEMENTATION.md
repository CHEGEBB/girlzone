# Multi-Language Support Implementation

## Overview
This document details the implementation of multi-language support for the user view using i18next. The system now supports 10 languages with a modern Girlzone AI-style language switcher.

## Supported Languages

1. 🇺🇸 **English** (en) - Default
2. 🇪🇸 **Spanish** (es) - Español
3. 🇯🇵 **Japanese** (ja) - 日本語
4. 🇩🇪 **German** (de) - Deutsch
5. 🇫🇷 **French** (fr) - Français
6. 🇵🇹 **Portuguese** (pt) - Português
7. 🇸🇦 **Arabic** (ar) - العربية (with RTL support)
8. 🇮🇳 **Hindi** (hi) - हिन्दी
9. 🇮🇩 **Indonesian** (id) - Bahasa Indonesia
10. 🇷🇺 **Russian** (ru) - Русский

## Implementation Details

### 1. Dependencies Installed
```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

### 2. File Structure
```
public/locales/
├── en/common.json
├── es/common.json
├── ja/common.json
├── de/common.json
├── fr/common.json
├── pt/common.json
├── ar/common.json
├── hi/common.json
├── id/common.json
└── ru/common.json

lib/
└── i18n.ts (i18next configuration)

components/
├── language-context.tsx (refactored to use i18next)
├── language-dropdown.tsx (new Girlzone AI-style component)
├── site-header.tsx (updated with language switcher)
└── user-nav.tsx (updated with language submenu)
```

### 3. Key Files Created/Modified

#### `lib/i18n.ts`
- Configures i18next with all 10 languages
- Sets up language detection from localStorage and browser
- Imports all translation JSON files
- Fallback language: English

#### `components/language-context.tsx`
- Refactored to use i18next hooks
- Handles RTL language support (Arabic)
- Provides `t()` function for translations
- Manages language switching with persistence

#### `components/language-dropdown.tsx`
- Modern Girlzone AI-style dropdown with flag emojis
- Globe icon indicator
- Shows current language with checkmark
- Responsive design (collapses on mobile)

#### `components/site-header.tsx`
- Language dropdown positioned below "Add Tokens" button
- Shows for both logged-in and logged-out users
- Responsive layout with flex column for user info

#### `components/user-nav.tsx`
- Added Language submenu in user dropdown
- Includes all 10 languages with flags and checkmarks
- Integrated with Globe icon

### 4. Translation Keys Structure
All translation files follow this structure:
```json
{
  "nav": { "home", "characters", "favorites", "collections", "profile", "settings", "billing", "logout" },
  "buttons": { "login", "signup", "addTokens", "save", "cancel", "delete", "edit", "create", "close", "submit", "back" },
  "language": { "select", "current" },
  "tokens": { "balance", "add", "insufficient" },
  "messages": { "loading", "error", "success", "saved", "deleted", "welcome" },
  "characterTypes": { "girls", "anime", "guy" }
}
```

## Features

### ✅ Language Switcher Placement
- **Location**: Below the "Add Tokens" button in the **left sidebar** (as requested)
- **Visibility**: Shows when sidebar is expanded (isOpen = true)
- **Full-width button**: Displays current language with flag emoji

### ✅ User Dropdown Integration
- Language submenu accessible from user dropdown (avatar click)
- Globe icon indicator
- Submenu with all languages and flags

### ✅ RTL Support
- Automatic RTL direction for Arabic language
- Document direction switches automatically
- All UI elements adapt to RTL layout

### ✅ Persistence
- Language preference saved in localStorage
- Persists across browser sessions
- Auto-detects browser language on first visit

### ✅ Modern UI
- Flag emojis for visual language identification
- Checkmark for currently selected language
- Hover states and smooth transitions
- Responsive design for mobile/tablet/desktop

## Usage

### For Users
1. **Sidebar (When Expanded)**:
   - Open the left sidebar (click hamburger menu if collapsed)
   - Language dropdown appears below "Add Tokens" button
   - Shows current language with flag emoji and name
   - Click to see all 10 available languages
   - Click a language to switch instantly

2. **User Dropdown Menu** (Alternative Access):
   - Click user avatar in sidebar
   - Navigate to "Language" submenu
   - All languages accessible with flags and checkmarks

### For Developers

#### Using Translations in Components
```typescript
import { useLanguage } from '@/components/language-context'

function MyComponent() {
  const { t } = useLanguage()
  
  return (
    <button>{t('buttons.save')}</button>
  )
}
```

#### Adding New Translation Keys
1. Add key to `public/locales/en/common.json`
2. Add translations to all other language files
3. Use in component with `t('your.new.key')`

#### Adding New Languages
1. Create new folder in `public/locales/{lang-code}/`
2. Add `common.json` with translations
3. Import in `lib/i18n.ts`
4. Add to resources object
5. Add to language arrays in `language-dropdown.tsx` and `user-nav.tsx`

## Testing

### Manual Testing Steps

1. **Language Switching**:
   - [ ] Open application in browser
   - [ ] Click language dropdown in header
   - [ ] Select a different language
   - [ ] Verify UI text changes
   - [ ] Refresh page - language should persist

2. **RTL Support (Arabic)**:
   - [ ] Switch to Arabic language
   - [ ] Verify page direction changes to right-to-left
   - [ ] Check all UI elements align correctly
   - [ ] Switch back to English - verify LTR restored

3. **User Dropdown Menu**:
   - [ ] Login to account
   - [ ] Click user avatar
   - [ ] Click "Language" menu item
   - [ ] Verify submenu opens with all languages
   - [ ] Select a language - verify it switches

4. **Persistence**:
   - [ ] Select a non-English language
   - [ ] Close browser completely
   - [ ] Reopen application
   - [ ] Verify selected language is still active

5. **Responsive Design**:
   - [ ] Test on desktop (1920px)
   - [ ] Test on tablet (768px)
   - [ ] Test on mobile (375px)
   - [ ] Verify language dropdown adapts correctly

## Technical Notes

### Language Detection Priority
1. localStorage ('i18nextLng' key)
2. Browser language settings
3. Fallback to English

### Performance
- Translation files are imported statically
- No runtime network requests for translations
- Lightweight JSON files (<5KB each)
- Language switching is instant

### Browser Compatibility
- All modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills if needed)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

### Potential Additions
- [ ] Add more languages as needed
- [ ] Translate character names/descriptions
- [ ] Translate dynamic content from database
- [ ] Add country/region specific variants (e.g., pt-BR vs pt-PT)
- [ ] Implement automatic translation for user-generated content
- [ ] Add language preference to user profile in database

### Recommended Pages to Translate
- [ ] Character cards and descriptions
- [ ] Chat interface messages
- [ ] Premium/billing pages
- [ ] Settings pages
- [ ] FAQ and help pages
- [ ] Error messages and notifications

## Support

For issues or questions about the multi-language implementation:
1. Check this documentation
2. Review translation files in `public/locales/`
3. Verify i18next configuration in `lib/i18n.ts`
4. Test language switching in browser DevTools

## Credits

- **i18next**: Internationalization framework
- **react-i18next**: React bindings for i18next
- **Flag Emojis**: Unicode country flags
- **Design Inspiration**: Girlzone AI language switcher
