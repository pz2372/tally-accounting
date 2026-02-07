# Authentication Flow Documentation

This document describes the complete authentication flow between the mobile app and the backend server.

## Overview

The authentication system uses a **hybrid approach**:
1. **Firebase Authentication** - For initial identity verification
2. **JWT Access Tokens** - For secure API communication with the backend

## Authentication Flow

```
┌─────────────┐                 ┌──────────────┐                ┌─────────────┐
│   Mobile    │                 │   Firebase   │                │   Backend   │
│     App     │                 │     Auth     │                │   Server    │
└─────────────┘                 └──────────────┘                └─────────────┘
       │                                │                              │
       │  1. signInWithEmail()          │                              │
       │───────────────────────────────>│                              │
       │                                │                              │
       │  2. Firebase User              │                              │
       │<───────────────────────────────│                              │
       │                                │                              │
       │  3. getIdToken()               │                              │
       │───────────────────────────────>│                              │
       │                                │                              │
       │  4. Firebase ID Token          │                              │
       │<───────────────────────────────│                              │
       │                                │                              │
       │  5. POST /api/auth/firebase-login { firebaseToken }          │
       │─────────────────────────────────────────────────────────────>│
       │                                │                              │
       │                                │  6. verifyIdToken()          │
       │                                │<─────────────────────────────│
       │                                │                              │
       │                                │  7. Verified Claims          │
       │                                │─────────────────────────────>│
       │                                │                              │
       │                                │  8. Find/Create User in DB   │
       │                                │              │               │
       │                                │              │               │
       │                                │  9. Generate JWT Token       │
       │                                │              │               │
       │                                │              │               │
       │  10. { accessToken, user }                    │               │
       │<─────────────────────────────────────────────────────────────│
       │                                │                              │
       │  11. Store accessToken         │                              │
       │  (AsyncStorage)                │                              │
       │                                │                              │
```

## Implementation Details

### Mobile App (Tally/)

#### 1. Firebase Configuration ([src/config/firebase.ts](Tally/src/config/firebase.ts))
- Initializes Firebase Auth using GoogleService-Info.plist
- Provides authentication helper functions
- Manages Firebase auth state

#### 2. Auth Service ([src/services/authService.ts](Tally/src/services/authService.ts))
The complete authentication orchestration:

**Login Flow:**
```typescript
login(email, password) {
  1. Sign in with Firebase → firebaseUser
  2. Get Firebase ID token → firebaseToken
  3. Send firebaseToken to server
  4. Receive JWT accessToken
  5. Store accessToken in AsyncStorage
  6. Return success + user data
}
```

**Token Storage:**
- Uses React Native AsyncStorage
- Stores: accessToken (required), refreshToken (optional)
- Keys: `@access_token`, `@refresh_token`

**API Helper:**
```typescript
createAuthenticatedAxios() {
  // Creates axios instance with Bearer token from storage
}
```

#### 3. App Integration ([App.tsx](Tally/App.tsx))
```typescript
useEffect(() => {
  // Check for stored access token on app start
  const isAuth = await checkAuth();
  if (isAuth) setIsAuthenticated(true);
}, []);
```

#### 4. Login Screen ([src/screens/loginScreen.tsx](Tally/src/screens/loginScreen.tsx))
```typescript
const { success, error, user } = await login(email, password);
if (success) onLogin();
```

### Backend Server (server/)

#### 1. Firebase Login Endpoint ([src/controllers/authController.js](server/src/controllers/authController.js))

**POST /api/auth/firebase-login**
```javascript
{
  firebaseToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Process:**
1. Verify Firebase token with Firebase Admin SDK
2. Extract user info (uid, email, email_verified)
3. Find or create user in database
4. Generate JWT access token
5. Return access token + user data

**Response:**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "emailVerified": true,
    "organizations": [...]
  }
}
```

#### 2. Auth Middleware ([src/middleware/auth.js](server/src/middleware/auth.js))

**Token Verification (Hybrid):**
```javascript
verifyToken(req, res, next) {
  1. Extract Bearer token from Authorization header
  2. Try to verify as JWT token
     ✓ Success → attach user to req.user
     ✗ Fail → Try as Firebase token (backward compatibility)
  3. Load user data from database
  4. Attach user + org context to request
}
```

This supports both:
- New JWT tokens from mobile app
- Legacy Firebase tokens (for backward compatibility)

#### 3. Routes ([src/routes/authRoutes.js](server/src/routes/authRoutes.js))
```javascript
// Public (no auth)
POST /api/auth/firebase-login

// Protected (requires JWT)
GET  /api/auth/me
PUT  /api/auth/profile
DELETE /api/auth/user
```

## Security Features

### Mobile App
- ✅ Tokens stored in AsyncStorage (secure on iOS)
- ✅ Automatic token inclusion in API requests
- ✅ Token cleared on logout
- ✅ Session persistence across app restarts

### Server
- ✅ Firebase token verification (cryptographic)
- ✅ JWT tokens with expiration (default: 7 days)
- ✅ User-to-organization mapping
- ✅ Role-based access control (via user.role)
- ✅ Hybrid token support (JWT + Firebase)

## Environment Configuration

### Mobile App (.env)
```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Server (.env)
```bash
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json
```

## API Usage Example

### Making Authenticated Requests

```typescript
import { createAuthenticatedAxios } from './services/authService';

// Get expenses
const api = await createAuthenticatedAxios();
const response = await api.get('/api/expenses');
```

The axios instance automatically includes:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Database Schema

The User model includes:
```prisma
model User {
  id          String   @id @default(cuid())
  firebaseUid String   @unique
  email       String   @unique
  name        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  memberships OrgMembership[]
}
```

## Logout Flow

```typescript
logout() {
  1. Sign out from Firebase (clears Firebase session)
  2. Clear tokens from AsyncStorage
  3. Update app state (isAuthenticated = false)
}
```

## Error Handling

### Mobile App
- Invalid credentials → Alert with error message
- Network errors → Alert with generic error
- Token expiration → Redirect to login

### Server
- Invalid Firebase token → 401 Unauthorized
- Expired JWT → 401 Unauthorized
- Missing token → 401 Unauthorized
- User not found → 401 Unauthorized

## Testing the Flow

1. **Start the server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Run the mobile app:**
   ```bash
   cd Tally
   npm run ios
   ```

3. **Login with Firebase credentials:**
   - Email: your-test-user@example.com
   - Password: your-password

4. **Check console logs:**
   - Mobile: Firebase auth state
   - Server: Token verification logs

## Troubleshooting

### "Invalid Firebase token"
- Ensure GoogleService-Info.plist is properly added to Xcode
- Check Firebase project settings match bundle ID
- Verify Firebase Auth is enabled in console

### "Failed to authenticate with server"
- Check server is running and reachable
- Verify EXPO_PUBLIC_API_URL is correct
- Check server logs for detailed error

### "No token provided"
- Ensure login completed successfully
- Check AsyncStorage for stored token
- Verify axios instance uses createAuthenticatedAxios()

## Next Steps

1. ✅ Add refresh token rotation
2. ✅ Implement token expiration handling
3. ✅ Add biometric authentication (Face ID/Touch ID)
4. ✅ Implement social login (Google, Apple)
5. ✅ Add device management
