# Firebase iOS Authentication Setup Guide

This guide will help you configure Firebase Authentication for your iOS app.

## Prerequisites
- Firebase project created at [Firebase Console](https://console.firebase.google.com/)
- Your iOS Bundle Identifier: `com.pz2372.Tally`

## Step 1: Download GoogleService-Info.plist

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on the iOS icon or "Add app" to add an iOS app
4. Enter your iOS bundle ID: **com.pz2372.Tally**
5. Register the app and download the **GoogleService-Info.plist** file
6. Save it to: `/Users/peter/Desktop/Accounting/Tally/ios/GoogleService-Info.plist`

## Step 2: Add GoogleService-Info.plist to Xcode

1. Open the project in Xcode:
   ```bash
   open ios/Tally.xcworkspace
   ```

2. In Xcode, right-click on the "Tally" folder in the Project Navigator
3. Select "Add Files to Tally..."
4. Navigate to and select `GoogleService-Info.plist`
5. **Important**: Make sure "Copy items if needed" is checked
6. Make sure "Tally" target is selected
7. Click "Add"

## Step 3: Enable Authentication Methods

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable the authentication providers you want to use:
   - Email/Password
   - Google Sign-In
   - Apple Sign-In (recommended for iOS)
   - Phone Authentication
   - etc.

## Step 4: Configure Apple Sign-In (Recommended for iOS)

If using Apple Sign-In:

1. In your Apple Developer account, enable "Sign in with Apple" capability
2. In Firebase Console → Authentication → Sign-in method → Apple
3. Enable Apple sign-in and follow the configuration steps

## Step 5: Install iOS Pods

Run this command to install the iOS dependencies:

```bash
cd ios && pod install && cd ..
```

## Step 6: Build and Run

```bash
npm run ios
```

## Verification

After setup, Firebase should initialize automatically when the app starts. Check the console logs for:
- `[Firebase/Core] Configuration successful`

## Troubleshooting

### App crashes on launch
- Verify GoogleService-Info.plist is properly added to Xcode target
- Clean build folder in Xcode: Product → Clean Build Folder

### "No Firebase App" error
- Make sure GoogleService-Info.plist is in the correct location
- Rebuild the app after adding the file

### Authentication not working
- Check that authentication methods are enabled in Firebase Console
- Verify bundle identifier matches exactly: `com.pz2372.Tally`
- Check iOS app is properly registered in Firebase Console

## URL Schemes

The URL scheme `com.pz2372.Tally` has already been configured in Info.plist for OAuth redirects.

## Next Steps

After completing this setup:
1. Test authentication in your app
2. Configure additional auth providers as needed
3. Set up Firebase Security Rules for your database

## Support

For more information, visit:
- [React Native Firebase Docs](https://rnfirebase.io/)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
