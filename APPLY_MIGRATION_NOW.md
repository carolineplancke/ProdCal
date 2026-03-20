# 🚀 Quick Start: Apply Database Migration

## Step 1: Apply the SQL Migration

You need to run the SQL migration file to create the tables in your Supabase project.

### Option A: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**
5. Copy the entire contents of `/supabase/migrations/20260226000001_create_events_table.sql`
6. Paste into the SQL Editor
7. Click **"Run"** (or press Cmd/Ctrl + Enter)

✅ You should see: "Success. No rows returned"

### Option B: Supabase CLI (For Developers)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project (you'll need your project reference ID)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the migration
supabase db push
```

---

## Step 2: Verify Tables Were Created

In Supabase Dashboard:
1. Go to **"Table Editor"**
2. You should see two new tables:
   - ✅ **events** - with columns like id, subject, start, end, category, etc.
   - ✅ **series** - with columns series_id, recurrence_pattern, subject

---

## Step 3: Test the Updated Backend

### Test Database Connection
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-832943b5/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-26T...",
  "database": "connected"
}
```

### Test Event Retrieval
```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-832943b5/events
```

Expected response:
```json
{
  "events": []
}
```

---

## Step 4: Migrate Existing KV Data (If You Have Events)

If you already have events in the KV store, migrate them:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-832943b5/migrate/kv-to-database \
  -H "X-Admin-Token: YOUR_ADMIN_JWT_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "message": "Migrated X events from KV to database",
  "migratedCount": X,
  "errorCount": 0
}
```

---

## Step 5: Test Creating an Event

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-832943b5/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "id": "test-event-1",
    "subject": "Test Event",
    "start": "2026-03-01T10:00:00Z",
    "end": "2026-03-01T11:00:00Z",
    "location": "Conference Room",
    "category": "General"
  }'
```

---

## ✅ Success Checklist

- [ ] SQL migration applied successfully
- [ ] `events` and `series` tables visible in Table Editor
- [ ] Health check returns "database": "connected"
- [ ] GET /events returns empty array or events
- [ ] POST /events creates events successfully
- [ ] Existing KV data migrated (if applicable)

---

## 🎉 You're Done!

Your calendar app is now using Supabase PostgreSQL database instead of KV store!

**What Changed:**
- ✅ Events stored in `events` table
- ✅ Better querying and filtering
- ✅ Proper data types and validation
- ✅ Database indexes for performance
- ✅ API responses still use camelCase (frontend compatible)

**What Stayed the Same:**
- ✅ All API endpoints work exactly as before
- ✅ Authentication still works (admin JWT tokens)
- ✅ Power Automate integration unchanged
- ✅ Frontend doesn't need updates

---

## 🔍 Troubleshooting

### Error: "relation 'events' does not exist"
→ The migration hasn't been applied. Go back to Step 1.

### Error: "column 'isRecurring' does not exist"  
→ The backend has been updated to use snake_case (`is_recurring`). This should be automatic.

### Health check shows "database": "disconnected"
→ Check your SUPABASE_SERVICE_ROLE_KEY environment variable is set correctly.

### Events not showing up
→ Check if events have `is_cancelled: true`. Only non-cancelled events are returned by default.

---

## 📊 View Your Data

In Supabase Dashboard → Table Editor → events:
- See all your events in a nice table format
- Edit events directly
- Run SQL queries for analytics
- Export data as CSV

---

Need help? Check the `/DATABASE_MIGRATION_GUIDE.md` for more details!
