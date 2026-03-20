# Admin Authentication - Quick Start

## ✅ What's Been Set Up

Your calendar now has **enterprise-grade authentication**:

- 🔐 **Password in environment variable** (ADMIN_PASSWORD)
- 🛡️ **Server-side verification** (no password in frontend code)
- 🎟️ **JWT token sessions** (7-day expiration)
- 🔒 **Protected admin endpoints** (delete events requires auth)

---

## 🚀 How to Use

### For You (Admin)

1. **Set Your Password** (Already Done! ✅)
   - You entered it via the Supabase secret modal
   - It's stored securely as `ADMIN_PASSWORD`

2. **Login**
   - Go to: **Settings Tab → Admin Login**
   - Enter your password
   - Click "Login as Admin"

3. **You're Now Admin!**
   - Admin badge appears in header
   - **Admin tab** becomes visible
   - Can cancel events
   - Can manage API keys
   - Can access setup tools

4. **Token Lasts 7 Days**
   - No need to re-login for a week
   - Auto-verified on page load

### For Your Team (Public View)

- Can view calendar
- Can see upcoming events
- Can change timezone
- **Cannot** cancel events
- **Cannot** see API keys
- **Cannot** access setup tools

---

## 🔄 Change Password

1. Go to **Supabase Dashboard**
2. Navigate to: **Project Settings → Edge Functions → Secrets**
3. Find `ADMIN_PASSWORD`
4. Update value
5. Done! (Changes take effect immediately)

---

## 📋 Password Requirements

- No length requirements (you set it)
- Recommended: At least 12 characters
- Use a mix of letters, numbers, symbols
- Store it safely (password manager recommended)

---

## 🆘 Troubleshooting

### Forgot Password?
- Go to Supabase Dashboard → Secrets
- View/change `ADMIN_PASSWORD`

### Token Expired?
- Just log in again
- Tokens last 7 days

### Can't Login?
- Check Supabase Dashboard for `ADMIN_PASSWORD` secret
- Make sure it's set
- Check browser console for errors

---

## 🔐 Security Features

✅ Password stored server-side only
✅ Server verifies credentials
✅ JWT tokens with expiration
✅ Auto-logout on invalid token
✅ Admin actions require authentication
✅ Failed login attempts logged

---

## 📚 More Info

See `ADMIN_AUTH_GUIDE.md` for complete technical documentation.
