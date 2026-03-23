import { useState, useEffect } from 'react';
import { CalendarView } from './components/CalendarView';
import { UpcomingEvents } from './components/UpcomingEvents';
import { EventDialog } from './components/EventDialog';
import { ApiInstructions } from './components/ApiInstructions';
import { ApiKeyManager } from './components/ApiKeyManager';
import { TroubleshootPanel } from './components/TroubleshootPanel';
import { TimezoneSelector } from './components/TimezoneSelector';
import { CategoryFilter } from './components/CategoryFilter';
import { DatabaseSetupBanner } from './components/DatabaseSetupBanner';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { Calendar, List, Settings, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/s';
import { EVENT_CATEGORIES } from './config/categories';

interface CalendarEvent {
  id: string;
  subject: string;
  start: string;
  end: string;
  location: string;
  description: string;
  attendees: string[];
  organizer: string;
  isRecurring: boolean;
  recurrencePattern: string | null;
  seriesId: string | null;
  isCancelled: boolean;
  category?: string | null;
}

const FUNCTION_BASE = `https://${projectId}.functions.supabase.co`;
const API_BASE = `${FUNCTION_BASE}/make-server-832943b5`;

export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEventCount, setLastEventCount] = useState(0);

  const [timezone, setTimezone] = useState<string>(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(EVENT_CATEGORIES.map(c => c.id))
  );

  // ----------------------------
  // Derived data
  // ----------------------------
  const filteredEvents = events.filter(event =>
    selectedCategories.has(event.category ?? 'general')
  );

  const eventCounts = events.reduce((counts, event) => {
    const category = event.category ?? 'general';
    counts[category] = (counts[category] ?? 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // ----------------------------
  // Category handlers
  // ----------------------------
  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
        if (next.size === 0) {
          return new Set(EVENT_CATEGORIES.map(c => c.id));
        }
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleClearFilters = () => {
    setSelectedCategories(new Set(EVENT_CATEGORIES.map(c => c.id)));
  };

  // ----------------------------
  // Fetch events (EDGE FUNCTION)
  // ----------------------------
  const fetchEvents = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      
  const response = await fetch(`${API_BASE}/events`, {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    },
  });


      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg =
          errorData.error ??
          `Failed to fetch events (${response.status})`;
        setError(msg);
        throw new Error(msg);
      }

      const data = await response.json();
      const newEvents: CalendarEvent[] = data.events ?? [];

      if (silent && newEvents.length > lastEventCount && lastEventCount > 0) {
        const diff = newEvents.length - lastEventCount;
        toast.success(`${diff} new event${diff > 1 ? 's' : ''} added`);
      }

      setEvents(newEvents);
      setLastEventCount(newEvents.length);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching events:', err);
      if (!silent) {
        toast.error(err.message ?? 'Failed to load calendar events');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load + polling
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => fetchEvents(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-medium">Calendar</h1>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchEvents()}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && !loading && (
          <div className="mb-6">
            <DatabaseSetupBanner errorMessage={error} />
          </div>
        )}

        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <CategoryFilter
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
              onClearAll={handleClearFilters}
              eventCounts={eventCounts}
            />
            <CalendarView
              events={filteredEvents}
              onEventClick={handleEventClick}
              timezone={timezone}
              onTimezoneChange={setTimezone}
            />
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <CategoryFilter
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
              onClearAll={handleClearFilters}
              eventCounts={eventCounts}
            />
            <UpcomingEvents
              events={filteredEvents}
              onEventClick={handleEventClick}
              timezone={timezone}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 max-w-3xl">
            <TimezoneSelector onTimezoneChange={setTimezone} />
            <ApiKeyManager apiUrl={API_BASE} />
            <ApiInstructions apiUrl={API_BASE} />
            <TroubleshootPanel
              apiUrl={API_BASE}
              events={events}
              onRefresh={() => fetchEvents()}
            />
          </TabsContent>
        </Tabs>
      </main>

      <EventDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        timezone={timezone}
      />
    </div>
  );
}