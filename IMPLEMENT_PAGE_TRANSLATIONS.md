# How to Implement Page Translations - Complete Guide

All translation keys are ready in all 10 languages! Now you just need to update the page components to use them.

## Step 1: Import the Translation Hook

Add this import at the top of each page file:

```typescript
import { useTranslation } from '@/lib/i18n';
```

## Step 2: Use the Hook in Your Component

Add this line at the start of your component function:

```typescript
const { t } = useTranslation();
```

## Step 3: Replace Hard-coded Strings

Replace all hard-coded English strings with `t('key.path')` calls.

---

# Complete Implementation Examples

## 1. Face-Swap Page (`app/face-swap/page.tsx`)

### Changes to Make:

1. **Add import at top:**
```typescript
import { useTranslation } from '@/lib/i18n';
```

2. **Add hook after other hooks:**
```typescript
export default function FaceSwapPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const { setIsOpen } = useSidebar()
  const isMobile = useIsMobile()
  const { t } = useTranslation(); // ADD THIS LINE
```

3. **Replace all hard-coded strings:**

| Current Hard-coded Text | Replace With |
|------------------------|--------------|
| `"Face Swap"` | `{t('pages.faceSwap.title')}` |
| `"Source Face"` | `{t('pages.faceSwap.sourceFace')}` |
| `"Target Body"` | `{t('pages.faceSwap.targetBody')}` |
| `"Click to select source face image"` | `{t('pages.faceSwap.selectSourcePlaceholder')}` |
| `"Click to select target body image"` | `{t('pages.faceSwap.selectTargetPlaceholder')}` |
| `"Swapping Faces..."` | `{t('pages.faceSwap.swappingFaces')}` |
| `"Swap Faces (20 tokens)"` | `{t('pages.faceSwap.swapFaces')}` |
| `"Reset Images"` | `{t('pages.faceSwap.resetImages')}` |
| `"How it works:"` | `{t('pages.faceSwap.howItWorks')}` |
| `"1. Upload a source image with a clear face"` | `{t('pages.faceSwap.step1')}` |
| `"2. Upload a target image with a person"` | `{t('pages.faceSwap.step2')}` |
| `"3. Click \"Swap Faces\" to blend them"` | `{t('pages.faceSwap.step3')}` |
| `"4. Download your result!"` | `{t('pages.faceSwap.step4')}` |
| `"Result"` | `{t('pages.faceSwap.result')}` |
| `"Download Result"` | `{t('pages.faceSwap.downloadResult')}` |
| `"Processing Faces..."` | `{t('pages.faceSwap.processingFaces')}` |
| `"Our AI is carefully swapping the faces. This may take a moment..."` | `{t('pages.faceSwap.processingDesc')}` |
| `"Ready for Face Swap"` | `{t('pages.faceSwap.readyForSwap')}` |
| `"Upload both source and target images, then click \"Swap Faces\" to see the result."` | `{t('pages.faceSwap.readyDesc')}` |

### Toast Messages:
```typescript
// Replace toast messages:
toast({
  title: t('pages.faceSwap.invalidFileType'),
  description: t('pages.faceSwap.invalidFileTypeDesc'),
  variant: "destructive",
})

toast({
  title: t('pages.faceSwap.fileTooLarge'),
  description: t('pages.faceSwap.fileTooLargeDesc'),
  variant: "destructive",
})

toast({
  title: t('pages.faceSwap.missingImages'),
  description: t('pages.faceSwap.missingImagesDesc'),
  variant: "destructive",
})

toast({
  title: t('pages.faceSwap.loginRequired'),
  description: t('pages.faceSwap.loginRequiredDesc'),
  variant: "destructive",
})

toast({
  title: t('pages.faceSwap.successTitle'),
  description: t('pages.faceSwap.successDesc'),
})
```

---

## 2. My-AI Page (`app/my-ai/page.tsx`)

### Add these translations:

```typescript
import { useTranslation } from '@/lib/i18n';

export default function MyAIPage() {
  const { t } = useTranslation();
  
  // Replace strings:
  // "My AI Characters" → {t('pages.myAI.title')}
  // "No characters yet" → {t('pages.myAI.noCharacters')}
  // "Create your first AI character to get started" → {t('pages.myAI.createFirst')}
  // "+ Create New" → {t('pages.myAI.createNew')}
  // "View Profile" → {t('pages.myAI.viewProfile')}
  // "Public" → {t('pages.myAI.public')}
  // "Private" → {t('pages.myAI.private')}
}
```

---

## 3. Chat Page (`app/chat/page.tsx`)

### Add these translations:

```typescript
import { useTranslation } from '@/lib/i18n';

export default function ChatPage() {
  const { t } = useTranslation();
  
  // Replace strings:
  // "Chats" → {t('pages.chat.title')}
  // "View your conversation history with characters." → {t('pages.chat.description')}
  // "All Characters" → {t('pages.chat.allCharacters')}
  // "View all" → {t('pages.chat.viewAll')}
  // "Loading characters..." → {t('pages.chat.loadingCharacters')}
}
```

---

## 4. Generate Page (`app/generate/page.tsx`)

### Add these translations:

```typescript
import { useTranslation } from '@/lib/i18n';

export default function GeneratePage() {
  const { t } = useTranslation();
  
  // This page has 60 translation keys! Here are the main ones:
  // "Generate Image" → {t('pages.generate.title')}
  // "Generate Video" → {t('pages.generate.videoTitle')}
  // "Image" → {t('pages.generate.imageTab')}
  // "Video" → {t('pages.generate.videoTab')}
  // "Premium" → {t('pages.generate.premium')}
  // "Generating..." → {t('pages.generate.generating')}
  // "Generate Image" (button) → {t('pages.generate.generateImage')}
  // "Generate Video" (button) → {t('pages.generate.generateVideo')}
  // etc... (see full list in translation files)
}
```

---

## Quick Copy-Paste Helper

### For Face-Swap Page - Replace Section by Section:

**Title Section:**
```typescript
<h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
  {t('pages.faceSwap.title')}
</h1>
```

**Source Face Section:**
```typescript
<h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-3`}>
  {t('pages.faceSwap.sourceFace')}
</h3>
<p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
  {t('pages.faceSwap.selectSourcePlaceholder')}
</p>
```

**Target Body Section:**
```typescript
<h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold mb-3`}>
  {t('pages.faceSwap.targetBody')}
</h3>
<p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>
  {t('pages.faceSwap.selectTargetPlaceholder')}
</p>
```

**Swap Button:**
```typescript
{isGenerating ? (
  <>
    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
    {t('pages.faceSwap.swappingFaces')}
  </>
) : (
  <>
    <Users className="mr-2 h-5 w-5" />
    {t('pages.faceSwap.swapFaces')}
  </>
)}
```

**Reset Button:**
```typescript
<Button variant="outline" className="w-full" onClick={resetImages} disabled={isGenerating}>
  {t('pages.faceSwap.resetImages')}
</Button>
```

**Instructions:**
```typescript
<h4 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold mb-2`}>
  {t('pages.faceSwap.howItWorks')}
</h4>
<ol className={`space-y-1 ${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
  <li>{t('pages.faceSwap.step1')}</li>
  <li>{t('pages.faceSwap.step2')}</li>
  <li>{t('pages.faceSwap.step3')}</li>
  <li>{t('pages.faceSwap.step4')}</li>
</ol>
```

**Result Section:**
```typescript
<h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>
  {t('pages.faceSwap.result')}
</h2>
<Button onClick={handleDownload} className={isMobile ? 'text-sm' : ''}>
  {t('pages.faceSwap.downloadResult')}
</Button>
```

**Processing State:**
```typescript
<h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2`}>
  {t('pages.faceSwap.processingFaces')}
</h3>
<p className={`text-muted-foreground ${isMobile ? 'max-w-sm text-sm' : 'max-w-md'}`}>
  {t('pages.faceSwap.processingDesc')}
</p>
```

**Ready State:**
```typescript
<h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold mb-2`}>
  {t('pages.faceSwap.readyForSwap')}
</h3>
<p className={`text-muted-foreground ${isMobile ? 'max-w-sm text-sm' : 'max-w-md'}`}>
  {t('pages.faceSwap.readyDesc')}
</p>
```

---

## Testing

After implementing:

1. **Test language switcher** - Switch between languages and verify text changes
2. **Test all 10 languages** - Make sure each language displays correctly
3. **Test RTL for Arabic** - Verify Arabic displays right-to-left
4. **Test on mobile** - Ensure responsive design works with all languages

---

## Common Buttons Already Translated

These are already available in all pages:
- `{t('buttons.save')}` - "Save"
- `{t('buttons.cancel')}` - "Cancel"
- `{t('buttons.delete')}` - "Delete"
- `{t('buttons.edit')}` - "Edit"
- `{t('buttons.create')}` - "Create"
- `{t('buttons.close')}` - "Close"
- `{t('buttons.submit')}` - "Submit"
- `{t('buttons.back')}` - "Back"

---

## ✅ Once Complete

When you switch languages using the language selector, ALL pages will automatically update to show the selected language!

The translation framework is fully functional - you just need to replace the hard-coded strings with the translation function calls.
