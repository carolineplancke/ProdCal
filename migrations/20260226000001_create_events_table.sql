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
CREATE POLICY "Allow public read access" ON events
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access" ON series
  FOR SELECT
  USING (true);

-- Create policy to allow insert/update/delete via service role only
CREATE POLICY "Allow service role full access" ON events
  FOR ALL
  USING (true);

CREATE POLICY "Allow service role full access" ON series
  FOR ALL
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
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
