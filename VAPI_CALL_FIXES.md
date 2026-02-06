# Vapi Call Auto-Start Fixes

## Issues Fixed

### 1. **Dialog Not Opening on Auto-Start**
- **Problem**: Call was starting in the background but dialog stayed closed
- **Solution**: Added `setIsOpen(true)` when auto-starting the call so users can see the call status

### 2. **Vapi Events Not Firing**
- **Problem**: Speech detection and call state events weren't being captured
- **Solution**: 
  - Store Vapi instance in `vapiInstanceRef` to maintain reference
  - Properly initialize event listeners only once
  - Added comprehensive event logging with emoji indicators

### 3. **Multiple Auto-Start Attempts**
- **Problem**: Auto-start could trigger multiple times
- **Solution**: Added `hasAutoStartedRef` to ensure it only runs once per page load

### 4. **Audio Not Working**
- **Problem**: Assistant speech wasn't being detected
- **Solution**: 
  - Added proper event listeners for `speech-start` and `speech-end`
  - Added `error` and `message` event listeners for debugging
  - Extended wait times for Vapi initialization

## Key Changes

### WebCallDialog Component

1. **Better State Management**
   ```typescript
   const vapiInstanceRef = useRef<any>(null)
   const hasAutoStartedRef = useRef(false)
   ```

2. **Enhanced Event Listeners**
   ```typescript
   vapiInstance.on("speech-start", () => {
     console.log("🎤 Assistant started speaking")
     setIsAssistantSpeaking(true)
     // Start minute counter
   })
   
   vapiInstance.on("call-start", () => {
     console.log("📞 Call started - Vapi event")
     setIsCallActive(true)
   })
   ```

3. **Auto-Start with Dialog Open**
   ```typescript
   setIsOpen(true) // Open dialog to show call status
   setIsStartingCall(true)
   ```

## Troubleshooting

### Console Logs to Check

When the call auto-starts, you should see:
```
🔍 Auto-starting call for assistant: [assistant-id]
🎛️ Initializing Vapi widget with assistant: [assistant-id]
✅ Attempt to start call, clicked: true
📞 Call started - Vapi event
🎤 Assistant started speaking (when assistant talks)
📊 Speaking minutes: 1 (every minute)
🔇 Assistant stopped speaking (when assistant stops)
```

### If Call Doesn't Start

1. **Check Browser Console** for error messages
2. **Verify Vapi Keys** are in `.env.local`:
   - `NEXT_PUBLIC_VAPI_PUBLIC_KEY=867f9efc-442b-4957-ae6b-dcd54188a95b` ✅
   - `VAPI_PRIVATE_KEY=71224504-e7cd-414d-b883-17f9671d3f16` ✅

3. **Check Microphone Permissions**
   - Browser may block microphone access
   - Grant permissions when prompted

4. **Verify Assistant Exists**
   - Character must have a Vapi assistant created
   - Check console for "Assistant ID: [id]"

### If You Can't Hear the Assistant

1. **Check Browser Audio Settings**
   - Ensure browser isn't muted
   - Check system volume

2. **Check Vapi Console Logs**
   - Look for "🎤 Assistant started speaking"
   - If this doesn't appear, the assistant isn't speaking

3. **Verify Assistant Configuration**
   - Check the assistant has a voice configured in Vapi dashboard
   - Ensure the assistant has a proper system prompt

4. **Check Network**
   - Vapi requires stable internet connection
   - Check browser network tab for errors

## Testing Steps

1. **Navigate to Chat Page** with a character that has an assistant
2. **Dialog Should Auto-Open** with "Starting..." loading state
3. **Call Should Connect** automatically (you'll see green ring animation)
4. **Speak to Test** - Say something to the assistant
5. **Watch for Speech Indicator** - "Speaking: X mins" should appear when assistant talks
6. **Check Console** for emoji-logged events

## Features

✅ **Auto-start on page load** when assistant exists  
✅ **Dialog opens automatically** to show call status  
✅ **Minute counter** tracks assistant speaking time  
✅ **Real-time call duration** in MM:SS format  
✅ **Visual indicators** for call state (green ring, badges)  
✅ **Comprehensive logging** for debugging  
✅ **Error handling** with user-friendly toast messages  

## Known Limitations

- Auto-start requires `NEXT_PUBLIC_VAPI_PUBLIC_KEY` to be set
- Microphone permissions must be granted by user
- Network connection must be stable
- Assistant must be properly configured in Vapi

## Next Steps

If you're still experiencing issues:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for emoji-prefixed logs (🎤, 📞, 🔇, etc.)
4. Check for any error messages (❌)
5. Share relevant logs for further debugging
