# Migration Guide: KV Store → Supabase Database

## Overview
Your calendar application is being migrated from Deno KV store to Supabase PostgreSQL tables for better data management and querying capabilities.

---

## ✅ What's Been Created

### 1. **Database Migration File**
Location: `/supabase/migrations/20260226000001_create_events_table.sql`

**Tables Created:**
- `events` - Main calendar events table
- `series` - Recurring event series patterns

**Features:**
- Proper data types (TIMESTAMPTZ for UTC dates, JSONB for arrays)
- Indexed columns for fast queries (start, end, category, series_id)
- Row Level Security (RLS) policies configured
- Automatic `updated_at` timestamp trigger

---

## 🔄 Migration Steps

### Step 1: Apply the Migration to Your Supabase Project

You have two options:

#### Option A: Using Supabase CLI (Recommended)
```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push
```

#### Option B: Using Supabase Dashboard (Manual)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the contents of `/supabase/migrations/20260226000001_create_events_table.sql`
5. Paste and click **"Run"**

---

### Step 2: Update Your Edge Function

The backend code needs to be updated to use Supabase database queries instead of KV store.

**What Changes:**
- ❌ `await kv.set('event:${id}', event)` 
- ✅ `await supabase.from('events').upsert(event)`

- ❌ `await kv.get('event:${id}')`
- ✅ `await supabase.from('events').select('*').eq('id', id).single()`

- ❌ `await kv.getByPrefix('event:')`
- ✅ `await supabase.from('events').select('*')`

---

### Step 3: Migrate Existing Data (Optional)

If you have existing events in the KV store, you'll need to migrate them:

**Create a migration endpoint** (add to your backend):

```typescript
app.post('/make-server-832943b5/migrate/kv-to-database', validateAdminToken, async (c) => {
  try {
    // Get all events from KV store
    const kvEvents = await kv.getByPrefix('event:');
    let migratedCount = 0;
    
    for (const event of kvEvents) {
      // Insert into Supabase table
      const { error } = await supabase
        .from('events')
        .upsert({
          id: event.id,
          subject: event.subject,
          start: event.start,
          end: event.end,
          location: event.location || '',
          description: event.description || '',
          attendees: event.attendees || [],
          organizer: event.organizer || '',
          is_recurring: event.isRecurring || false,
          recurrence_pattern: event.recurrencePattern,
          series_id: event.seriesId,
          is_cancelled: event.isCancelled || false,
          category: event.category || '',
          import_source: event.importSource || 'powerautomate',
          email_subject: event.emailSubject,
          imported_at: event.importedAt
        });
      
      if (!error) {
        migratedCount++;
      } else {
        console.log('Error migrating event:', event.id, error);
      }
    }
    
    return c.json({
      success: true,
      message: `Migrated ${migratedCount} events from KV to database`,
      migratedCount
    });
  } catch (error) {
    return c.json({
      error: `Migration failed: ${error.message}`
    }, 500);
  }
});
```

Then call it:
```bash
POST https://[YOUR_PROJECT].supabase.co/functions/v1/make-server-832943b5/migrate/kv-to-database
Headers:
  X-Admin-Token: [YOUR_ADMIN_TOKEN]
```

---

## 📊 Database Schema Reference

### Events Table
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,                    -- Outlook event ID
  subject TEXT NOT NULL,                  -- Event title
  start TIMESTAMPTZ NOT NULL,             -- Start time (UTC)
  "end" TIMESTAMPTZ NOT NULL,             -- End time (UTC)
  location TEXT DEFAULT '',               -- Location
  description TEXT DEFAULT '',            -- Description
  attendees JSONB DEFAULT '[]'::jsonb,    -- Array of attendee emails
  organizer TEXT DEFAULT '',              -- Organizer email
  is_recurring BOOLEAN DEFAULT false,     -- Is recurring?
  recurrence_pattern TEXT,                -- Recurrence rule
  series_id TEXT,                         -- Series ID for recurring events
  is_cancelled BOOLEAN DEFAULT false,     -- Is cancelled?
  category TEXT DEFAULT '',               -- Event category
  import_source TEXT DEFAULT 'powerautomate',  -- Import source
  email_subject TEXT,                     -- Original email subject
  created_at TIMESTAMPTZ DEFAULT NOW(),   -- Created timestamp
  imported_at TIMESTAMPTZ,                -- Import timestamp
  updated_at TIMESTAMPTZ DEFAULT NOW()    -- Auto-updated on changes
);
```

### Series Table
```sql
CREATE TABLE series (
  series_id TEXT PRIMARY KEY,             -- Series ID
  recurrence_pattern TEXT,                -- Recurrence rule
  subject TEXT NOT NULL,                  -- Series title
  import_source TEXT DEFAULT 'powerautomate',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 Benefits of Using Supabase Tables

### ✅ Advantages Over KV Store:

1. **Better Querying**
   - Filter by date range: `WHERE start >= '2026-02-01' AND start < '2026-03-01'`
   - Filter by category: `WHERE category = 'Engineering'`
   - Complex joins and relationships

2. **SQL Power**
   - Aggregate functions (COUNT, SUM, AVG)
   - Window functions for analytics
   - Full-text search on descriptions

3. **Scalability**
   - Handles millions of records efficiently
   - Proper indexing for fast queries
   - Connection pooling

4. **Data Integrity**
   - Foreign key constraints
   - Check constraints
   - Proper data types with validation

5. **Built-in Features**
   - Automatic backups
   - Point-in-time recovery
   - Realtime subscriptions (if needed)
   - Row Level Security (RLS)

6. **Admin Tools**
   - Supabase Table Editor for manual edits
   - SQL Editor for complex queries
   - Database logs and performance metrics

---

##  🚀 Example Updated Endpoint

### Before (KV Store):
```typescript
app.get('/make-server-832943b5/events', async (c) => {
  const events = await kv.getByPrefix('event:');
  const activeEvents = events
    .filter(e => !e.isCancelled)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return c.json({ events: activeEvents });
});
```

### After (Supabase):
```typescript
app.get('/make-server-832943b5/events', async (c) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_cancelled', false)
    .order('start', { ascending: true });
    
  if (error) {
    return c.json({ error: error.message }, 500);
  }
  
  return c.json({ events: data });
});
```

---

## 🔍 Advanced Queries You Can Now Do

### Filter by Date Range
```typescript
const { data } = await supabase
  .from('events')
  .select('*')
  .gte('start', '2026-02-01')
  .lt('start', '2026-03-01')
  .eq('is_cancelled', false);
```

### Filter by Multiple Categories
```typescript
const { data } = await supabase
  .from('events')
  .select('*')
  .in('category', ['Engineering', 'Product'])
  .order('start');
```

### Count Events by Category
```typescript
const { data } = await supabase
  .from('events')
  .select('category, count(*)')
  .group('category');
```

### Search Events by Title or Description
```typescript
const { data } = await supabase
  .from('events')
  .select('*')
  .or(`subject.ilike.%${searchTerm}%, description.ilike.%${searchTerm}%`);
```

---

## ⚠️ Important Notes

### Column Name Mapping
Due to SQL reserved words, some columns have been renamed:

| KV Store Key | Database Column |
|--------------|-----------------|
| `isRecurring` | `is_recurring` |
| `isCancelled` | `is_cancelled` |
| `seriesId` | `series_id` |
| `importSource` | `import_source` |
| `emailSubject` | `email_subject` |
| `createdAt` | `created_at` |
| `importedAt` | `imported_at` |
| `recurrencePattern` | `recurrence_pattern` |

### Frontend Compatibility
Your frontend expects camelCase, so you may need to add a mapping function:

```typescript
function dbToApi(dbEvent: any) {
  return {
    id: dbEvent.id,
    subject: dbEvent.subject,
    start: dbEvent.start,
    end: dbEvent.end,
    location: dbEvent.location,
    description: dbEvent.description,
    attendees: dbEvent.attendees,
    organizer: dbEvent.organizer,
    isRecurring: dbEvent.is_recurring,
    recurrencePattern: dbEvent.recurrence_pattern,
    seriesId: dbEvent.series_id,
    isCancelled: dbEvent.is_cancelled,
    category: dbEvent.category,
    importSource: dbEvent.import_source,
    emailSubject: dbEvent.email_subject,
    createdAt: dbEvent.created_at,
    importedAt: dbEvent.imported_at
  };
}
```

---

## 📝 Next Steps

1. ✅ Apply the database migration
2. ✅ Update backend endpoints to use Supabase (I can do this for you!)
3. ✅ Test with a few events
4. ✅ Migrate existing KV data (if any)
5. ✅ Update frontend if needed (column name compatibility)
6. ✅ Monitor performance and indexes

---

## 🛠️ Need Help?

**Common Issues:**

**Q: RLS policies blocking requests?**
A: The migration includes policies for public read and service role full access. Your Edge Function uses the service role key, so it should have full access.

**Q: Timezone issues?**
A: The database uses `TIMESTAMPTZ` which automatically handles UTC. Always store dates in UTC format (ending with 'Z').

**Q: Need to add more columns?**
A: Create a new migration file with `ALTER TABLE` statements.

---

**Ready to proceed? Let me know if you'd like me to update all the backend endpoints to use the Supabase database!** 🚀
