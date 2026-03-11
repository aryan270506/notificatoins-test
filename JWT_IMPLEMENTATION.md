# JWT Token Session Management Implementation

## Overview
This document describes the JWT token-based session management system implemented in the CampusQR application.

## Setup Instructions

### Backend Setup

1. **Install Dependencies:**
   ```bash
   npm install jsonwebtoken
   ```
   ✅ Already installed

2. **Configure JWT_SECRET in .env:**
   ```
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   ```
   ⚠️ **IMPORTANT:** Update this with a strong, random secret key in production.

### Frontend Setup
   
The frontend is already configured with:
- JWT token storage in AsyncStorage
- Automatic token inclusion in all API requests via Axios interceptor
- Auto-logout on token expiration

## Features Implemented

### 1. **Backend (Node.js/Express)**

#### File: `Backend/Routes/AuthRoutes.js`
- `POST /auth/login` - Generates JWT token on successful login
- `POST /auth/verify-token` - Verifies the JWT token validity
- `POST /auth/logout` - Logout endpoint (token removal handled on frontend)

#### File: `Backend/Middleware/auth.js`
- `authenticateToken()` - Middleware to protect routes requiring authentication

**Token Details:**
- **Algorithm:** HS256 (HMAC)
- **Expiration:** 7 days
- **Claims Included:**
  - `userId`: User's database ID
  - `email`: User's email/ID
  - `role`: User's role (student, teacher, parent, admin)
  - `name`: User's name

### 2. **Frontend (React Native)**

#### File: `Frontend/Src/Axios.js`
- **Request Interceptor:** Automatically includes JWT token in Authorization header
  ```
  Authorization: Bearer <token>
  ```
- **Response Interceptor:** Handles token expiration (401 errors)

#### File: `Frontend/Screens/Login/Login.js`
- Stores JWT token in AsyncStorage after successful login
- **Key:** `authToken`

#### File: `Frontend/utils/auth.js`
- `handleLogout()` - Clears all auth data and navigates to login
- `getAuthToken()` - Retrieves stored JWT token
- `isUserAuthenticated()` - Checks if user has valid session
- `getCurrentUser()` - Gets current user information

## Usage

### Login Flow
```javascript
import axiosInstance from "../../Src/Axios";

const response = await axiosInstance.post("/auth/login", {
  email: "user@university.edu",
  password: "password123",
  role: "student"
});

// Response includes token
// Token is automatically stored in AsyncStorage
const { user, role, token } = response.data;
```

### Logout Flow
```javascript
import { handleLogout } from "../../utils/auth";

await handleLogout(navigation);
```

### Protecting Routes (Backend)
```javascript
const { authenticateToken } = require("../Middleware/auth");

router.get("/protected-route", authenticateToken, (req, res) => {
  // req.user contains decoded JWT payload
  const { userId, role } = req.user;
  res.json({ message: "Protected data" });
});
```

### Verifying Token Validity
```javascript
import { isUserAuthenticated } from "../../utils/auth";

const authenticated = await isUserAuthenticated();
if (authenticated) {
  // Make API calls
}
```

## Token Refresh (Optional Enhancement)

For long-running applications, consider implementing token refresh:

1. Generate both `accessToken` (short-lived, 1 hour) and `refreshToken` (long-lived, 7 days)
2. Store refresh token securely on backend
3. Create `POST /auth/refresh` endpoint to get new access token
4. Update Axios interceptor to handle token refresh on 401

## Security Best Practices

1. ✅ Use HTTPS in production
2. ✅ Store JWT in secure storage (AsyncStorage is sufficient for mobile apps)
3. ✅ Use strong JWT_SECRET (minimum 32 characters)
4. ✅ Implement token expiration (7 days set)
5. ✅ Validate token on protected routes
6. ✅ Clear token on logout
7. 🔄 Consider implementing token blacklist for immediate logout effect

## API Endpoints

### POST /auth/login
**Request:**
```json
{
  "email": "user@university.edu",
  "password": "password123",
  "role": "student"
}
```

**Response:**
```json
{
  "role": "student",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /auth/verify-token
**Request Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "userId": "...",
    "email": "...",
    "role": "student",
    "name": "..."
  }
}
```

### POST /auth/logout
**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Troubleshooting

### Issue: "Token expired" error
- **Solution:** Login again to get a new token

### Issue: "Access token required" (401)
- **Solution:** Ensure token is being stored in AsyncStorage with key `authToken`

### Issue: "Invalid token" (403)
- **Solution:** Check if JWT_SECRET in .env matches the one used to create the token

### Issue: Axios not including token in requests
- **Solution:** Ensure Axios interceptor is properly loaded before making API calls

## File Structure
```
Backend/
  ├── Routes/
  │   └── AuthRoutes.js          ✅ Updated with JWT generation
  ├── Middleware/
  │   └── auth.js                ✅ New authentication middleware
  ├── .env.example               ✅ New configuration template
  └── package.json               ✅ jsonwebtoken added

Frontend/
  ├── Screens/
  │   └── Login/
  │       └── Login.js            ✅ Updated to store JWT
  ├── Src/
  │   └── Axios.js               ✅ Updated with interceptors
  └── utils/
      └── auth.js                ✅ New auth utilities
```

## Environment Variables Required

Add to your `.env` file:
```
JWT_SECRET=your_super_secret_key_min_32_chars
```

## Next Steps

1. Update `.env` file with JWT_SECRET
2. Test login flow with different user roles
3. Test token expiration (7 days)
4. Implement token refresh if needed for long sessions
5. Add token blacklist for immediate logout (optional)
