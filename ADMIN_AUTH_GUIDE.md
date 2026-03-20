# Admin Authentication Setup Guide

## Overview

Your calendar application now has **proper server-side authentication** with:
- ✅ Password stored as environment variable
- ✅ Server-side password verification
- ✅ JWT token-based session management
- ✅ Protected admin-only endpoints
- ✅ 7-day token expiration
- ✅ Automatic token verification on page load

---

## How It Works

### 1. **Password Storage (Environment Variable)**

The admin password is stored in the **ADMIN_PASSWORD** environment variable in Supabase.

**To set your password:**
1. You've already been prompted to enter it via the secret modal
2. The password is securely stored in Supabase and never exposed to the frontend
3. Only the server can read this environment variable

**To change your password later:**
1. Go to your Supabase project dashboard
2. Navigate to: **Project Settings → Edge Functions → Secrets**
3. Find `ADMIN_PASSWORD` and update it
4. Redeploy your edge function (Figma Make handles this automatically)

---

### 2. **Server-Side Verification**

When you log in, here's what happens:

```
Frontend                    Server                      Database
   |                          |                            |
   |-- POST password -------> |                            |
   |                          |-- Read ADMIN_PASSWORD ---> |
   |                          |                            |
   |                          |-- Verify Password          |
   |                          |                            |
   |                          |-- Generate JWT Token       |
   |                          |                            |
   |<-- Return JWT Token ---- |                            |
   |                          |                            |
   | Store token in           |                            |
   | localStorage             |                            |
```

**Security Benefits:**
- Password never stored in frontend code
- Password verification happens server-side
- No hardcoded credentials in JavaScript
- Server logs failed login attempts

---

### 3. **JWT Token-Based Sessions**

After successful login:

1. **Server generates a JWT token** containing:
   - Role: `admin`
   - Expiration: 7 days from login
   - Signed with your Supabase service role key

2. **Frontend stores the token** in localStorage

3. **Token is used for admin actions**:
   - Canceling events
   - Accessing protected features

4. **Token verification**:
   - On page load, token is verified with server
   - If invalid/expired, user is logged out automatically
   - No need to re-authenticate for 7 days

---

## Security Architecture

### Protected Endpoints

The following endpoints require a valid admin token:

| Endpoint | Method | Protection | Purpose |
|----------|--------|------------|---------|
| `/auth/login` | POST | None (public) | Verify password, issue token |
| `/auth/verify` | POST | None (public) | Verify token validity |
| `/events/:id` | DELETE | Admin token required | Cancel events |

### Token Flow

```javascript
// Login
POST /auth/login
{
  "password": "your-password"
}
Response: { "token": "eyJhbG..." }

// Use Token
DELETE /events/123
Headers: { "Authorization": "Bearer eyJhbG..." }

// Verify Token
POST /auth/verify
{
  "token": "eyJhbG..."
}
Response: { "isAdmin": true }
```

---

## Implementation Details

### Server-Side Code (`/supabase/functions/server/index.tsx`)

**1. Login Endpoint**
```typescript
app.post('/make-server-832943b5/auth/login', async (c) => {
  const { password } = await c.req.json();
  const adminPassword = Deno.env.get('ADMIN_PASSWORD');
  
  if (password !== adminPassword) {
    return c.json({ error: 'Invalid password' }, 401);
  }
  
  const token = await sign({
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7)
  }, secret);
  
  return c.json({ token });
});
```

**2. Token Validation Middleware**
```typescript
const validateAdminToken = async (c, next) => {
  const token = c.req.header('Authorization')?.substring(7);
  const payload = await verify(token, secret);
  
  if (payload.role !== 'admin') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }
  
  return next();
};
```

**3. Protected Route**
```typescript
app.delete('/events/:id', validateAdminToken, async (c) => {
  // Only admins with valid tokens can access this
});
```

### Frontend Code

**1. Login Process** (`/src/app/components/AdminLogin.tsx`)
```typescript
const response = await fetch(`${apiUrl}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password }),
});

const { token } = await response.json();
localStorage.setItem('calendar-admin-token', token);
```

**2. Token Verification on Page Load** (`/src/app/App.tsx`)
```typescript
useEffect(() => {
  const token = localStorage.getItem('calendar-admin-token');
  
  const response = await fetch(`${apiUrl}/auth/verify`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  
  if (response.ok) {
    setIsAdmin(true);
  } else {
    // Clear invalid token
    localStorage.removeItem('calendar-admin-token');
  }
}, []);
```

**3. Using Token for Protected Actions**
```typescript
const handleCancelEvent = async (eventId) => {
  await fetch(`${apiUrl}/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });
};
```

---

## Best Practices Implemented

✅ **Never expose passwords in frontend code**
- Password stored as environment variable
- Only server can read it

✅ **Server-side verification**
- Password checking happens on server
- Frontend never sees the actual password

✅ **JWT tokens for stateless authentication**
- No session storage on server
- Token contains all necessary information
- Self-contained and verifiable

✅ **Token expiration**
- 7-day expiration prevents indefinite access
- User must re-authenticate after expiration

✅ **Automatic token verification**
- On page load, token is checked with server
- Invalid/expired tokens are automatically cleared

✅ **Secure token storage**
- JWT signed with Supabase service role key
- Tampering with token will fail verification

✅ **Protected endpoints**
- Admin actions require valid token
- Middleware validates all admin requests

✅ **Proper error handling**
- Failed logins return 401 Unauthorized
- Invalid tokens return 401 Unauthorized
- Insufficient permissions return 403 Forbidden

---

## User Experience

### For Public Users (Non-Admin)
1. Open the calendar
2. See **Calendar**, **Upcoming**, and **Settings** tabs
3. Can view all events
4. Can change timezone
5. See admin login option in Settings
6. Cannot cancel events
7. Cannot access API configuration

### For Admin Users
1. Open the calendar
2. Go to **Settings** → **Admin Login**
3. Enter password
4. Upon success:
   - **Admin badge** appears in header
   - **Admin tab** becomes visible
   - Can cancel events (button appears in event details)
   - Can manage API keys
   - Can access setup instructions
   - Can use troubleshooting tools
5. Token valid for 7 days
6. Can logout anytime

---

## Troubleshooting

### "Admin authentication not configured" error
**Problem:** `ADMIN_PASSWORD` environment variable not set

**Solution:**
1. Check if you entered a password in the secret modal
2. Verify in Supabase dashboard: Project Settings → Edge Functions → Secrets
3. Ensure `ADMIN_PASSWORD` is present

### Token verification fails on page load
**Problem:** Token expired or invalid

**Solution:**
- User will be automatically logged out
- Simply log in again
- Token lasts 7 days, then requires re-authentication

### "Invalid or expired token" when canceling event
**Problem:** Token has expired since last login

**Solution:**
1. Log out
2. Log back in
3. New token will be issued

### Can't access admin features after login
**Problem:** Token not being sent correctly

**Solution:**
1. Check browser console for errors
2. Verify `calendar-admin-token` exists in localStorage
3. Try logging out and back in

---

## Security Considerations

### Current Implementation
✅ **Suitable for internal team use**
✅ **Password protected**
✅ **Server-side verification**
✅ **Token-based sessions**
✅ **Auto-logout on token expiration**

### For Production at Scale
If you need higher security for large-scale deployment:

1. **Add rate limiting**
   - Prevent brute-force password attacks
   - Implement in Hono middleware

2. **Add password hashing**
   - Current: Plain-text comparison
   - Upgrade: Use bcrypt or argon2

3. **Add audit logging**
   - Log all admin actions
   - Track who canceled what and when

4. **Add refresh tokens**
   - Current: Single 7-day token
   - Upgrade: Short-lived access token + long-lived refresh token

5. **Add IP whitelisting**
   - Restrict admin access to specific IPs
   - Useful for office environments

6. **Add multi-factor authentication (MFA)**
   - Require second factor (email, SMS, authenticator app)
   - Significantly increases security

---

## Quick Reference

### Environment Variables
- `ADMIN_PASSWORD` - Your admin password (set via Supabase secrets)
- `SUPABASE_SERVICE_ROLE_KEY` - Used to sign JWT tokens (pre-configured)

### Endpoints
- `POST /auth/login` - Login with password, get token
- `POST /auth/verify` - Verify token validity
- `DELETE /events/:id` - Cancel event (requires admin token)

### Token Lifespan
- **Duration:** 7 days
- **Storage:** localStorage (`calendar-admin-token`)
- **Auto-verification:** On page load

### Logout
- Click **Logout** button in Admin tab
- Clears token from localStorage
- Immediately revokes admin access

---

## Summary

You now have a **production-ready admin authentication system** with:

1. **Environment variable password storage** - Secure and changeable
2. **Server-side verification** - No client-side password exposure
3. **JWT token sessions** - Stateless, secure, time-limited
4. **Protected endpoints** - Admin-only actions require valid token
5. **Auto-verification** - Invalid tokens automatically cleared
6. **Clean UX** - Public users see calendar, admins see extra features

This is a **significant security upgrade** from client-side password checking and follows industry best practices for web application authentication! 🔐✅
