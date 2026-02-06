# Monetization Control Update

## Changes Implemented

### 1. App Sidebar (`components/app-sidebar.tsx`)
- Verified existing logic that hides/shows the "Monetization" navigation item based on the `monetization_enabled` setting.
- The item links to `/monetization`.
- This logic relies on the `/api/monetization-status` endpoint.

### 2. Premium Page (`app/premium/page.tsx`)
- Removed the full-page block that prevented access to the entire Premium page when monetization was disabled.
- Added conditional rendering to the "Monetization" tab trigger. It is now only visible when `monetizationEnabled` is true.
- Added an effect to automatically switch the view mode to 'subscriptions' if the user is on the 'monetization' tab when it becomes disabled.
- This allows users to access "Tokens" and "Subscriptions" tabs even when "Monetization" (Creator Models) is disabled.

## Verification
- The "Monetization" item in the sidebar will toggle based on the admin setting.
- The "Monetization" tab on the Premium page will toggle based on the admin setting.
- The rest of the Premium page (Subscriptions, Tokens) remains accessible.
