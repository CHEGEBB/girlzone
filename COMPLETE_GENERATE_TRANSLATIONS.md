# Complete /generate Page Translations - Quick Guide

## Why It's Not Working Yet

The /generate page has the translation hook (`const { t } = useLanguage()`) but still has ~50 hardcoded English strings that need to be replaced.

## Quick Fix (5 minutes)

### Option 1: Use Find & Replace in VS Code

1. Open `app/generate/page.tsx`
2. Press `Ctrl+H` (or `Cmd+H` on Mac) for Find & Replace
3. **Enable "Match Case"** (Aa icon)
4. Replace each string below:

### Most Visible Strings (Do These First):

```
Find: "Generate Image"
Replace: {t('pages.generate.title')}

Find: "Generate Video"
Replace: {t('pages.generate.videoTitle')}

Find: "Image"
Replace: {t('pages.generate.imageTab')}
(Only in the TabsTrigger, be careful!)

Find: "Video"
Replace: {t('pages.generate.videoTab')}
(Only in the TabsTrigger, be careful!)

Find: "Describe the image you want to generate..."
Replace: {t('pages.generate.promptPlaceholder')}

Find: "Describe the video animation (e.g., 'dancing', 'waving', 'smiling')..."
Replace: {t('pages.generate.videoPromptPlaceholder')}

Find: "Number of Images"
Replace: {t('pages.generate.numberOfImages')}

Find: "Download All"
Replace: {t('pages.generate.downloadAll')}

Find: "Generated Images"
Replace: {t('pages.generate.generatedImages')}

Find: "Generated Video"
Replace: {t('pages.generate.generatedVideo')}

Find: "Suggestions"
Replace: {t('pages.generate.suggestions')}

Find: "No Images Generated Yet"
Replace: {t('pages.generate.noImagesYet')}

Find: "Generating..."
Replace: {t('pages.generate.generating')}
```

### Toast Messages:

```
Find: "Prompt required"
Replace: {t('pages.generate.promptRequired')}

Find: "Login required"
Replace: {t('pages.generate.loginRequired')}

Find: "Copied to clipboard"
Replace: {t('pages.generate.copiedToClipboard')}

Find: "Pasted from clipboard"
Replace: {t('pages.generate.pastedFromClipboard')}

Find: "Success!"
Replace: {t('pages.generate.successTitle')}
```

### Buttons:

```
Find: "Paste"
Replace: {t('pages.generate.paste')}

Find: "Download"
Replace: {t('pages.generate.download')}

Find: "Share"
Replace: {t('pages.generate.share')}

Find: "Collection"
Replace: {t('pages.generate.collection')}

Find: "Saved"
Replace: {t('pages.generate.saved')}
```

## Option 2: Copy-Paste Approach

If Find & Replace is confusing, you can:

1. Look for lines with English text in quotes
2. Replace them with the t() function
3. Example:
   - **Before:** `<h1>Generate Image</h1>`
   - **After:** `<h1>{t('pages.generate.title')}</h1>`

## All Available Keys

Check `public/locales/en/common.json` under `pages.generate` for all 60 available translation keys.

## Testing

After making changes:
1. Save the file
2. Refresh your browser
3. Switch languages
4. Text should now translate!

## Important Notes

- Don't replace strings inside `console.log()` or error handling
- Don't replace strings in comments
- Focus on user-visible text only
- Save frequently and test as you go
