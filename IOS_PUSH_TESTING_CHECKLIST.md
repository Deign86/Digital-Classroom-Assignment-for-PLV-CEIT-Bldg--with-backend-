# iOS Push Notification Testing Checklist

This document provides step-by-step verification for iOS Web Push notifications.

## Prerequisites

### iOS Device Requirements
- [ ] **iOS/iPadOS 16.4 or later** - Check in Settings → General → About → iOS Version
- [ ] **Safari browser** - Other browsers (Chrome, Firefox, Edge) cannot install PWAs on iOS
- [ ] **Web Push enabled in system settings** - Settings → Safari → Advanced → Web Push (should be ON by default)

### Server/Deployment Requirements
- [ ] **HTTPS** - The site must be served over HTTPS (localhost is allowed for testing)
- [ ] **Valid manifest** - `/manifest.webmanifest` exists and is correctly served
- [ ] **Service worker** - `/firebase-messaging-sw.js` is accessible
- [ ] **VAPID key configured** - `VITE_FIREBASE_VAPID_KEY` environment variable is set

---

## Test 1: PWA Installation on iOS

### Steps
1. Open Safari on your iOS device
2. Navigate to your deployed app URL (must be HTTPS)
3. Tap the **Share button** (rectangle with arrow pointing up)
4. Scroll down and tap **"Add to Home Screen"**
5. Optionally customize the name, then tap **"Add"**
6. The app icon should appear on your Home Screen

### Expected Results
- [ ] App icon appears on Home Screen with the correct icon
- [ ] Opening the app from Home Screen shows it in **standalone mode** (no Safari UI/address bar)
- [ ] App Switcher shows the app as a separate app (not Safari)

### Troubleshooting
- If "Add to Home Screen" option is missing → Ensure you're using Safari (not in-app browser)
- If app still opens in Safari → Check that manifest has `"display": "standalone"`
- If icon is generic → Check `apple-touch-icon` in index.html and manifest icons

---

## Test 2: Push Permission Request (iOS PWA)

### Prerequisites
- App must be installed to Home Screen (Test 1 completed)
- Open the app from Home Screen (not Safari)

### Steps
1. Log in to the app
2. Navigate to **Profile Settings** → **Notification Preferences**
3. Tap the push notifications toggle to enable

### Expected Results
- [ ] iOS permission dialog appears: "This website would like to send you notifications"
- [ ] After allowing, the toggle stays ON
- [ ] No error messages appear

### Troubleshooting
- If toggle is disabled with message → Read the iOS-specific guidance shown
- If "Add to Home Screen Required" message appears → You're running in Safari, not the installed PWA
- If permission dialog never appears → Check iOS Settings → Safari → Advanced → Web Push

---

## Test 3: Receive Test Notification (iOS PWA)

### Prerequisites
- Push notifications enabled (Test 2 completed)
- App should be in the background or closed

### Steps
1. Minimize or close the PWA
2. From another device or the Firebase Console, send a test notification
3. Wait for the notification to arrive

### Expected Results
- [ ] Notification appears on Lock Screen
- [ ] Notification appears in Notification Center
- [ ] Tapping notification opens the PWA

### Troubleshooting
- If notification doesn't arrive → Check that `pushEnabled: true` in Firestore user document
- If notification sound doesn't play → Check iOS notification settings for the app
- If notification doesn't show badge → Badge permission may be disabled

---

## Test 4: Non-iOS Platforms (Regression Check)

Verify push notifications still work on other platforms.

### Desktop Chrome/Firefox/Edge
1. [ ] Open the app in the browser
2. [ ] Navigate to Profile Settings
3. [ ] Enable push notifications
4. [ ] Verify permission dialog appears
5. [ ] Send a test notification
6. [ ] Verify notification appears in system tray

### Android Chrome
1. [ ] Open the app in Chrome
2. [ ] Navigate to Profile Settings  
3. [ ] Enable push notifications
4. [ ] Verify permission dialog appears
5. [ ] Send a test notification
6. [ ] Verify notification appears

---

## Test 5: Unsupported Scenarios

Verify appropriate error messaging in unsupported cases.

### iOS Safari (Not Installed)
1. Open the app in Safari (without installing)
2. Navigate to Profile Settings
3. Observe the push notification toggle

**Expected:** Toggle disabled with "Add to Home Screen Required" message and visual instructions

### Older iOS (< 16.4)
1. On an older iOS device, install the PWA
2. Navigate to Profile Settings
3. Observe the push notification toggle

**Expected:** Toggle disabled with "iOS Update Required" message showing current version

### Non-Safari iOS Browsers
1. Open the app in Chrome/Firefox on iOS
2. Navigate to Profile Settings
3. Observe the push notification toggle

**Expected:** Toggle disabled with "Safari Required" message

---

## Debug Logging

To enable debug logging for push service:

1. Open browser DevTools (Console tab)
2. Look for logs prefixed with `[pushService]`, `[iosDetection]`, `[ProfileSettings]`
3. In development mode, access debug utilities:
   ```javascript
   // Check iOS detection
   window.iosDetection.logIOSWebPushStatus()
   
   // Check push service
   window.pushServiceLazy
   ```

---

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Push toggle disabled, no message | iOS detection not working | Check `iosDetection.ts` is imported correctly |
| "No active Service Worker" error | SW not activated yet | Refresh page, wait for SW to activate |
| Permission granted but no notifications | FCM token not registered | Check Firestore user document for `pushToken` |
| Notifications work but no sound/badge | iOS notification settings | Check Settings → Notifications → [App Name] |
| "Add to Home Screen" missing | Using non-Safari browser | Open in Safari |

---

## Verification Checklist Summary

Before releasing:

- [ ] iOS 16.4+ device can install PWA from Safari
- [ ] Installed iOS PWA can request and receive push permission
- [ ] iOS PWA receives notifications in background
- [ ] Non-iOS platforms still work (no regressions)
- [ ] Unsupported scenarios show appropriate guidance
- [ ] All error messages are user-friendly
