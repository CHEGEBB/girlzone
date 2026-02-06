# Bunny.net Setup Guide

## Getting Your Bunny.net API Key

The current `BUNNY_API_KEY` in your `.env.local` appears to be incorrect or malformed. Here's how to get the correct one:

### Step 1: Log into Bunny.net
Go to https://bunny.net and log into your account

### Step 2: Navigate to Your Storage Zone
1. Click on **Storage** in the left sidebar
2. Click on your storage zone: **paidfam**

### Step 3: Get the Storage Zone Password (API Key)
1. In your storage zone, click on **FTP & API Access**
2. Look for the **Password** field - this is your API key
3. Copy the password (it should be a single UUID/GUID format like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Step 4: Update Your .env.local
Replace the current `BUNNY_API_KEY` with the password you just copied:

```env
# Bunny.net Configuration
BUNNY_STORAGE_ZONE=paidfam
BUNNY_API_KEY=your-single-password-here
BUNNY_CDN_URL=https://paidfam.b-cdn.net
BUNNY_HOSTNAME=storage.bunnycdn.com
```

### Step 5: Verify Your CDN URL
1. In your storage zone, check if you have a **Pull Zone** connected
2. The Pull Zone URL should match your `BUNNY_CDN_URL`
3. It should be: `https://paidfam.b-cdn.net`

## Testing the Configuration

After updating your API key, try generating an image on the `/generate` page. Check the console logs for:

```
[Bunny.net] Uploading to: https://storage.bunnycdn.com/paidfam/generated-images/...
[Bunny.net] Storage Zone: paidfam
[Bunny.net] Using API Key: xxxxxxxxxx...
[Bunny.net] Upload successful: https://paidfam.b-cdn.net/generated-images/...
```

If you still get 401 Unauthorized:
1. Double-check the password is copied correctly (no extra spaces)
2. Verify the storage zone name is exactly "paidfam"
3. Check that your Bunny.net account has the storage zone properly set up

## Common Issues

### Issue: 401 Unauthorized
**Cause**: Incorrect API key (password)
**Solution**: Get the password from FTP & API Access in your storage zone

### Issue: 404 Not Found
**Cause**: Storage zone name is wrong
**Solution**: Verify BUNNY_STORAGE_ZONE matches your actual zone name

### Issue: CDN URL doesn't work
**Cause**: No Pull Zone attached to storage zone
**Solution**: Create a Pull Zone in Bunny.net and link it to your storage zone

## Current Configuration Status

Based on your .env.local:
- ✅ Storage Zone: `paidfam` 
- ❌ API Key: Appears to be malformed (two GUIDs concatenated)
- ✅ CDN URL: `https://paidfam.b-cdn.net`
- ✅ Hostname: `storage.bunnycdn.com`

**Action Required**: Update the BUNNY_API_KEY with the correct password from your Bunny.net dashboard.
