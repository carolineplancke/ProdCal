import { AlertCircle, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface DatabaseSetupBannerProps {
  errorMessage: string;
}

const MIGRATION_SQL = `-- Create events table for calendar application
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
COMMENT ON COLUMN events.import_source IS 'Source of import: powerautomate or email';`;

export function DatabaseSetupBanner({ errorMessage }: DatabaseSetupBannerProps) {
  const [copied, setCopied] = useState(false);
  const [sqlExpanded, setSqlExpanded] = useState(false);

  const isDatabaseMigrationError = errorMessage.includes('Database tables not created') || 
                                    errorMessage.includes('42P01') ||
                                    errorMessage.includes('PGRST205') ||
                                    errorMessage.includes('schema cache');

  if (!isDatabaseMigrationError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Events</AlertTitle>
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(MIGRATION_SQL);
      setCopied(true);
      toast.success('SQL copied to clipboard! Now paste it in Supabase SQL Editor.');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Failed to copy SQL. Please select and copy manually.');
    }
  };

  return (
    <Alert className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <AlertCircle className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-lg font-semibold mb-3 text-orange-900 dark:text-orange-100">
        🚨 Action Required: Database Setup (2 minutes)
      </AlertTitle>
      <AlertDescription className="space-y-4 text-orange-900 dark:text-orange-100">
        <p className="text-sm font-medium">
          Your calendar has been upgraded to use PostgreSQL. The database tables need to be created one time.
        </p>
        
        <div className="bg-white dark:bg-gray-900 p-4 rounded-lg border border-orange-200 dark:border-orange-800 space-y-3">
          <p className="font-semibold text-sm">📋 Quick 3-Step Setup:</p>
          <ol className="list-decimal list-inside space-y-2.5 text-sm ml-2">
            <li className="pl-2">
              <strong>Copy the SQL</strong> below (click the copy button)
            </li>
            <li className="pl-2">
              Open{' '}
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
              >
                Supabase Dashboard
                <ExternalLink className="h-3 w-3" />
              </a>
              {' '}→ <strong>SQL Editor</strong> → <strong>New Query</strong>
            </li>
            <li className="pl-2">
              <strong>Paste and Run</strong> the SQL, then <strong>refresh this page</strong>
            </li>
          </ol>
        </div>

        {/* SQL Display Section */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-orange-200 dark:border-orange-800 overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-orange-100 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-800">
            <span className="text-sm font-semibold">SQL Migration Script</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopySQL}
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy SQL
                </>
              )}
            </Button>
          </div>
          
          <div className={`${sqlExpanded ? 'max-h-96' : 'max-h-32'} overflow-y-auto transition-all`}>
            <pre className="p-4 text-xs font-mono leading-relaxed text-gray-800 dark:text-gray-200">
              {MIGRATION_SQL}
            </pre>
          </div>
          
          <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-200 dark:border-orange-800 flex justify-center">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSqlExpanded(!sqlExpanded)}
              className="text-xs"
            >
              {sqlExpanded ? 'Show Less' : 'Show Full SQL'}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" onClick={handleCopySQL} className="flex items-center gap-2">
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy SQL
              </>
            )}
          </Button>
          
          <Button variant="default" size="sm" asChild>
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              Open Supabase Dashboard
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-orange-700 dark:text-orange-300 pt-2 border-t border-orange-200 dark:border-orange-800">
          <p className="font-medium mb-1">💡 After running the SQL:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>You should see "Success. No rows returned"</li>
            <li>Tables <code className="bg-orange-100 dark:bg-orange-900/30 px-1 rounded">events</code> and <code className="bg-orange-100 dark:bg-orange-900/30 px-1 rounded">series</code> will appear in Table Editor</li>
            <li>Refresh this page and the error will be gone!</li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}
