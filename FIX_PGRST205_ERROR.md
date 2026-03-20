# 🔧 Fix PGRST205 Error - Schema Cache Issue

## Error You're Seeing

```
Error: Failed to fetch events: Could not find the table 'public.events' in the schema cache
Code: PGRST205
```

## What This Means

The `PGRST205` error means **Supabase's API layer (PostgREST) hasn't detected your database tables yet**. This happens when:

1. The tables haven't been created yet, OR
2. The tables were created but Supabase's schema cache hasn't refreshed

---

## ✅ Solution: Apply the Migration (2 Minutes)

### Step 1: Open Supabase Dashboard

Go to: **https://supabase.com/dashboard**

Select your project

### Step 2: Run the SQL Migration

1. Click **"SQL Editor"** in the left sidebar (looks like `</>` icon)
2. Click **"New Query"** button (top right)
3. Copy the SQL below and paste it into the editor
4. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 3: Wait for Schema Cache to Refresh

After running the SQL:
- **Option A**: Wait 5 minutes and refresh your calendar app (automatic)
- **Option B**: Manually reload schema cache (see below)

### Step 4: Verify Tables Were Created

1. In Supabase Dashboard, click **"Table Editor"**
2. You should see two new tables:
   - ✅ **events**
   - ✅ **series**

---

## 📄 SQL Migration Script

Copy this entire block into Supabase SQL Editor:

```sql
-- Create events table for calendar application
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  start TIMESTAMPTZ NOT NULL,
  "end" TIMESTAMPTZ NOT NULL,
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  attendees JSONB DEFAULT '[]'::jsonb,
  organizer TEXT DEFAULT '',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  series_id TEXT,
  is_cancelled BOOLEAN DEFAULT false,
  category TEXT DEFAULT '',
  import_source TEXT DEFAULT 'powerautomate',
  email_subject TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  imported_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_events_start ON events(start);
CREATE INDEX IF NOT EXISTS idx_events_end ON events("end");
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_is_cancelled ON events(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_events_series_id ON events(series_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Create series table for recurring event patterns
CREATE TABLE IF NOT EXISTS series (
  series_id TEXT PRIMARY KEY,
  recurrence_pattern TEXT,
  subject TEXT NOT NULL,
  import_source TEXT DEFAULT 'powerautomate',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to everyone
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Allow public read access'
  ) THEN
    CREATE POLICY "Allow public read access" ON events FOR SELECT USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'series' AND policyname = 'Allow public read access'
  ) THEN
    CREATE POLICY "Allow public read access" ON series FOR SELECT USING (true);
  END IF;
END $$;

-- Create policy to allow service role full access
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'events' AND policyname = 'Allow service role full access'
  ) THEN
    CREATE POLICY "Allow service role full access" ON events FOR ALL USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'series' AND policyname = 'Allow service role full access'
  ) THEN
    CREATE POLICY "Allow service role full access" ON series FOR ALL USING (true);
  END IF;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE events IS 'Calendar events imported from Outlook via Power Automate';
COMMENT ON TABLE series IS 'Recurring event series patterns';
```

---

## 🔄 How to Manually Reload Schema Cache (Optional)

If you want to speed up the schema cache refresh:

### Method 1: Supabase Dashboard

1. Go to **Settings** → **API**
2. Scroll down to **"Schema Cache"** section
3. Click **"Reload schema"** button
4. Wait 30 seconds
5. Refresh your calendar app

### Method 2: Edge Function Restart

1. Go to **Edge Functions** → **make-server-832943b5**
2. Click **"Restart"** or **"Redeploy"**
3. Wait for deployment to complete
4. Refresh your calendar app

### Method 3: Just Wait (Easiest)

PostgREST automatically reloads schema every 24 hours, but usually picks up new tables within **5-10 minutes**.

Just wait a bit and refresh your browser!

---

## ✅ Success Indicators

After running the SQL, you should see:

1. ✅ **"Success. No rows returned"** message in SQL Editor
2. ✅ Tables visible in **Table Editor**: `events` and `series`
3. ✅ Your calendar app loads **without errors**
4. ✅ Health check passes: `GET /health` returns `"database": "connected"`

---

## 🔍 Verify It Worked

### Test 1: Check Health Endpoint

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

### Test 2: Check Events Endpoint

```bash
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-832943b5/events
```

Expected response:
```json
{
  "events": []
}
```

### Test 3: View in Supabase Dashboard

1. Go to **Table Editor**
2. Click on **events** table
3. You should see an empty table with all the columns

---

## 🆘 Troubleshooting

### Still Getting PGRST205 After Running SQL?

**Solution 1: Wait Longer**
- Schema cache can take up to 10 minutes to refresh
- Try waiting and refreshing every 2 minutes

**Solution 2: Manually Reload Schema**
- Settings → API → Reload schema
- Wait 1 minute, then refresh app

**Solution 3: Restart Edge Function**
- Edge Functions → make-server-832943b5 → Restart
- Wait for deployment, then refresh app

**Solution 4: Check RLS Policies**
- Go to Authentication → Policies
- Verify `events` table has "Allow public read access" policy
- Verify `events` table has "Allow service role full access" policy

**Solution 5: Hard Refresh**
- Press Cmd/Ctrl + Shift + R to hard refresh your browser
- Clear browser cache
- Try in incognito/private window

---

## 🎯 Why This Upgrade?

Once the migration is complete, you'll have:

✅ **PostgreSQL Database** - Instead of simple KV store  
✅ **Better Performance** - Indexed queries, connection pooling  
✅ **Advanced Queries** - Date ranges, category filters, full-text search  
✅ **Easy Management** - View/edit data in Supabase Table Editor  
✅ **Scalability** - Handles millions of events  
✅ **Data Integrity** - Proper types, constraints, validation  

---

## 📞 Need More Help?

### Check Backend Logs:
1. Supabase Dashboard → Edge Functions → Logs
2. Look for `[GET /events]` entries
3. Check for detailed error information

### Check Database Logs:
1. Supabase Dashboard → Logs → Database
2. Look for DDL statements (CREATE TABLE, etc.)
3. Verify tables were created successfully

### Verify Environment Variables:
- `SUPABASE_URL` ✓
- `SUPABASE_SERVICE_ROLE_KEY` ✓
- `ADMIN_PASSWORD` ✓

---

## 🚀 Quick Summary

1. **Copy SQL** from above
2. **Paste into** Supabase Dashboard → SQL Editor
3. **Click "Run"**
4. **Wait 5 minutes** (or manually reload schema)
5. **Refresh your calendar app**
6. **Done!** 🎉

The PGRST205 error just means Supabase needs to be told about your new tables. Once you run the SQL, everything will work perfectly!
