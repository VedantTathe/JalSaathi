# Add to Home Screen Feature

## Overview
This feature allows users to install JalSaathi as a Progressive Web App (PWA) on their devices, providing an app-like experience with offline capabilities and quick access from the home screen.

## Implementation Details

### Backend Changes

1. **User Model** (`backend/src/modules/user/model.js`)
   - Added `addedToHomeScreen` field (Boolean, default: false)
   - Tracks whether user has seen/dismissed the install prompt

2. **Auth Service** (`backend/src/modules/auth/service.js`)
   - Added `updateAddToHomeScreenStatus(userId)` method
   - Updates `addedToHomeScreen` to true when user interacts with prompt
   - Added field to `getProfile` response

3. **Auth Controller** (`backend/src/modules/auth/controller.js`)
   - Added `updateAddToHomeScreenStatus` controller
   - Added field to `verifyToken` response

4. **Auth Routes** (`backend/src/modules/auth/routes.js`)
   - Added protected route: `POST /auth/add-to-home-screen`

5. **Helpers** (`backend/src/utils/helpers.js`)
   - Updated `generateTokenResponse` to include `addedToHomeScreen` field

### Frontend Changes

1. **AddToHomeScreenPrompt Component** (`frontend/src/components/AddToHomeScreenPrompt.jsx`)
   - Modal popup that appears for new users
   - Detects device type (iOS vs Android/Chrome)
   - Handles `beforeinstallprompt` event for Android/Chrome
   - Shows platform-specific instructions for iOS
   - Calls API to mark status as true when dismissed

2. **DashboardLayout Component** (`frontend/src/components/DashboardLayout.jsx`)
   - Integrated AddToHomeScreenPrompt
   - Shows popup 2 seconds after dashboard loads
   - Only displays if `user.addedToHomeScreen === false`

3. **Profile Page** (`frontend/src/pages/Profile.jsx`)
   - Added "App Settings" section
   - Includes manual "Add to Home Screen" button
   - Available regardless of `addedToHomeScreen` status
   - Handles install prompt or shows platform-specific toast messages

4. **AuthContext** (`frontend/src/contexts/AuthContext.jsx`)
   - Added `updateUser` method to update user state without full re-fetch
   - Used when `addedToHomeScreen` status changes

5. **API Service** (`frontend/src/services/api.js`)
   - Added `updateAddToHomeScreenStatus()` method

### PWA Configuration

1. **Manifest** (`frontend/public/manifest.json`)
   - App name: "JalSaathi - Har Pyaas Ka Saathi"
   - Standalone display mode
   - Configured icon sizes (72x72 to 512x512)
   - Theme color: #3b82f6 (primary blue)

2. **Service Worker** (`frontend/public/service-worker.js`)
   - Basic cache-first strategy
   - Caches essential resources
   - Enables offline functionality

3. **HTML Updates** (`frontend/index.html`)
   - Added manifest link
   - Added Apple-specific meta tags for iOS
   - Registered service worker

## User Flow

### New Users
1. User logs in for the first time
2. After 2 seconds on dashboard, popup appears
3. User can either:
   - Install the app (Android/Chrome) - triggers browser install prompt
   - View iOS instructions (iOS Safari) - manual steps shown
   - Dismiss the popup - marks status as true
4. Status saved to database, popup won't appear again

### Existing Users
1. Can manually install from Profile > App Settings
2. "Add to Home Screen" button always available
3. Triggers appropriate action based on platform

## Platform-Specific Behavior

### Android / Chrome
- Uses native `beforeinstallprompt` event
- Shows browser's install dialog
- Automatic installation with one click

### iOS Safari
- Shows step-by-step instructions
- Users manually add via Share > Add to Home Screen
- No automatic installation (iOS limitation)

### Unsupported Browsers
- Shows informational toast
- Suggests using Chrome or Safari

## Testing

### Test Scenarios
1. **New User Flow**
   - Register/login with new account
   - Wait for popup to appear
   - Test install or dismiss

2. **Existing User Flow**
   - Login with existing account
   - Navigate to Profile
   - Test manual install button

3. **Platform Testing**
   - Test on Android Chrome
   - Test on iOS Safari
   - Test on desktop browsers

4. **Offline Testing**
   - Install the app
   - Disconnect network
   - Verify cached resources load

## Future Enhancements

1. **Push Notifications**
   - Notify users of order updates
   - Alert delivery partners of new deliveries

2. **Background Sync**
   - Queue orders when offline
   - Sync when connection restored

3. **Advanced Caching**
   - Cache order history
   - Cache provider data for offline browsing

4. **App Update Notifications**
   - Prompt users when new version available
   - Automatic cache refresh

## Notes

- The `addedToHomeScreen` field tracks user interaction, not actual installation
- Actual installation detection is unreliable across browsers
- Users can always manually install from Settings regardless of status
- Service worker requires HTTPS in production
- iOS has limited PWA support compared to Android
