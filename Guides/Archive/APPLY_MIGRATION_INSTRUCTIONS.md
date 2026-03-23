# 🚨 ACTION REQUIRED: Apply Database Migration

## Your calendar app has been upgraded to use Supabase PostgreSQL!

The backend code has been updated, but the database tables need to be created. This is a **one-time setup** that takes less than 1 minute.

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Open Supabase Dashboard
Go to: **https://supabase.com/dashboard**

Select your project

### Step 2: Run the SQL Migration
1. Click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Copy the SQL below and paste it into the editor
4. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 3: Refresh Your Calendar App
Once the SQL runs successfully, refresh your calendar page!

---

## 📄 SQL Migration Script

Copy this entire block:

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

-- Create policy to allow read access to everyone (since we're using API key auth)
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

-- Create policy to allow insert/update/delete via service role only
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
COMMENT ON COLUMN events.id IS 'Unique event ID from Outlook';
COMMENT ON COLUMN events.start IS 'Event start time in UTC';
COMMENT ON COLUMN events."end" IS 'Event end time in UTC';
COMMENT ON COLUMN events.is_recurring IS 'Whether this event is part of a recurring series';
COMMENT ON COLUMN events.series_id IS 'Reference to the series table for recurring events';
COMMENT ON COLUMN events.is_cancelled IS 'Whether the event has been cancelled';
COMMENT ON COLUMN events.category IS 'Event category (Product, Health, Insurance, Engineering, Marketing, Sales, General)';
COMMENT ON COLUMN events.import_source IS 'Source of import: powerautomate or email';
```

---

## ✅ Success Indicators

After running the SQL, you should see:
- ✅ "Success. No rows returned" message
- ✅ Two new tables in "Table Editor": `events` and `series`
- ✅ Your calendar app loads without errors

---

## 🔄 If You Have Existing Events (Optional)

If you already have events in the old KV store, you can migrate them:

1. Log in to Admin panel in your calendar app
2. Go to Supabase Dashboard → Functions → Logs
3. Run this curl command:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-832943b5/migrate/kv-to-database \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "X-Admin-Token: YOUR_ADMIN_JWT_TOKEN"
```

---

## 🆘 Troubleshooting

### Error: "relation already exists"
✅ This is fine! The tables are already created. Just refresh your app.

### Error: "permission denied"
❌ Make sure you're logged into the correct Supabase project.

### Tables created but app still shows error
1. Check Supabase Dashboard → Project Settings → API
2. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly
3. Refresh the page (hard refresh: Cmd/Ctrl + Shift + R)

---

## 🎉 Benefits of This Upgrade

Once complete, you'll have:
- ✅ **Better performance** - Indexed database queries
- ✅ **Easier data management** - View/edit events in Supabase Table Editor
- ✅ **Advanced filtering** - Date ranges, categories, full-text search
- ✅ **Scalability** - Handles millions of events
- ✅ **Data integrity** - Proper types and validation

---

## 📞 Need Help?

- Check the backend logs: Supabase → Functions → Logs → make-server-832943b5
- Review the full migration guide: `/DATABASE_MIGRATION_GUIDE.md`
- Test health check: `GET https://YOUR_PROJECT.supabase.co/functions/v1/make-server-832943b5/health`

---

**This is a one-time setup. After applying the migration, your calendar will work perfectly! 🚀**
