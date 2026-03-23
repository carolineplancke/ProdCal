import { useState, useEffect } from 'react';
import { CalendarView } from './components/CalendarView';
import { UpcomingEvents } from './components/UpcomingEvents';
import { EventDialog } from './components/EventDialog';
import { ApiInstructions } from './components/ApiInstructions';
import { ApiKeyManager } from './components/ApiKeyManager';
import { TroubleshootPanel } from './components/TroubleshootPanel';
import { TimezoneSelector } from './components/TimezoneSelector';
import { AdminLogin } from './components/AdminLogin';
import { CategoryFilter } from './components/CategoryFilter';
import { DatabaseSetupBanner } from './components/DatabaseSetupBanner';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { Calendar, List, Settings, RefreshCw, Shield } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
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

export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEventCount, setLastEventCount] = useState(0);
  const [timezone, setTimezone] = useState<string>(() => {
    // Initialize with detected timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(EVENT_CATEGORIES.map(c => c.id))
  );

  const apiUrl = `https://ejugsbtrkjiduczvakpy.supabase.co`;

  // Filter events by selected categories
  const filteredEvents = events.filter(event => 
    selectedCategories.has(event.category || 'general')
  );

  // Count events by category
  const eventCounts = events.reduce((counts, event) => {
    const category = event.category || 'general';
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      
      if (newSet.has(categoryId)) {
        // Deselect the category
        newSet.delete(categoryId);
        
        // If all categories would be deselected, select all instead (reset filter)
        if (newSet.size === 0) {
          return new Set(EVENT_CATEGORIES.map(c => c.id));
        }
      } else {
        // Select the category
        newSet.add(categoryId);
      }
      
      return newSet;
    });
  };

  const handleClearFilters = () => {
    setSelectedCategories(new Set(EVENT_CATEGORIES.map(c => c.id)));
  };

  const handleUpdateCategory = async (eventId: string, category: string) => {
    if (!adminToken) {
      console.error('Admin token not available:', { isAdmin, adminToken });
      toast.error('Admin authentication required');
      return;
    }

    console.log('[handleUpdateCategory] Starting category update');
    console.log('[handleUpdateCategory] Event ID:', eventId);
    console.log('[handleUpdateCategory] Category:', category);
    console.log('[handleUpdateCategory] Admin token (first 20 chars):', adminToken.substring(0, 20));
    console.log('[handleUpdateCategory] API URL:', apiUrl);
    
    // URL encode the eventId to handle special characters
    const encodedEventId = encodeURIComponent(eventId);
    const url = `${apiUrl}/events/${encodedEventId}/category`;
    console.log('[handleUpdateCategory] Full request URL:', url);

    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`, // For Supabase gateway
          'X-Admin-Token': adminToken, // Our custom admin authentication
        },
        body: JSON.stringify({ category }),
      });

      console.log('[handleUpdateCategory] Response status:', response.status);
      console.log('[handleUpdateCategory] Response status text:', response.statusText);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[handleUpdateCategory] Error response body:', data);
        throw new Error(data.error || `Failed to update category: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[handleUpdateCategory] Success response:', result);
      toast.success('Category updated successfully');
      await fetchEvents();
    } catch (error) {
      console.error('[handleUpdateCategory] Exception caught:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update category');
    }
  };

  // Check admin status on mount and verify token
  useEffect(() => {
    const checkAdminStatus = async () => {
      const adminStatus = localStorage.getItem('calendar-admin') === 'true';
      const token = localStorage.getItem('calendar-admin-token');
      
      if (adminStatus && token) {
        // Verify token with server
        try {
          const response = await fetch(`${apiUrl}/auth/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ token }),
          });

          if (response.ok) {
            setIsAdmin(true);
            setAdminToken(token);
          } else {
            // Token invalid, clear admin status
            localStorage.removeItem('calendar-admin');
            localStorage.removeItem('calendar-admin-token');
            setIsAdmin(false);
            setAdminToken(null);
          }
        } catch (error) {
          console.error('Error verifying admin token:', error);
          setIsAdmin(false);
          setAdminToken(null);
        }
      }
    };

    checkAdminStatus();
  }, []);

  const handleAdminChange = (admin: boolean, token?: string) => {
    setIsAdmin(admin);
    setAdminToken(token || null);
  };

  const fetchEvents = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError(null); // Clear previous errors
      }
      const response = await fetch(`${apiUrl}/events`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response from server:', errorData);
        
        // Check for specific error codes
        if (errorData.errorCode === '42P01' || errorData.errorCode === 'PGRST205') {
          const errorMsg = errorData.error || 'Database tables not created. Please apply the SQL migration first.';
          setError(errorMsg);
          throw new Error(errorMsg);
        }
        
        const errorMsg = errorData.error || `Failed to fetch events: ${response.statusText}`;
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const newEvents = data.events || [];
      
      // Check if new events were added
      if (silent && newEvents.length > lastEventCount && lastEventCount > 0) {
        const newCount = newEvents.length - lastEventCount;
        toast.success(`${newCount} new event${newCount > 1 ? 's' : ''} added from Power Automate`);
      }
      
      setEvents(newEvents);
      setLastEventCount(newEvents.length);
      setError(null); // Clear error on success
    } catch (error) {
      console.error('Error fetching events:', error);
      if (!silent) {
        toast.error(error.message || 'Failed to load calendar events');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    if (!adminToken) {
      toast.error('Admin authentication required');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to cancel event: ${response.statusText}`);
      }

      toast.success('Event cancelled successfully');
      fetchEvents();
    } catch (error) {
      console.error('Error cancelling event:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel event');
    }
  };

  useEffect(() => {
    fetchEvents();
    // Poll for new events every 30 seconds
    const interval = setInterval(() => fetchEvents(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-medium">Calendar</h1>
              </div>
              {isAdmin && (
                <Badge variant="default" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchEvents}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Database Setup Banner */}
        {error && !loading && (
          <div className="mb-6">
            <DatabaseSetupBanner errorMessage={error} />
          </div>
        )}

        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className={`grid w-full max-w-md ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <CategoryFilter 
              selectedCategories={selectedCategories}
              onToggleCategory={handleToggleCategory}
              onClearAll={handleClearFilters}
              eventCounts={eventCounts}
            />
            <CalendarView events={filteredEvents} onEventClick={handleEventClick} timezone={timezone} onTimezoneChange={setTimezone} />
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-1 max-w-3xl">
              <CategoryFilter 
                selectedCategories={selectedCategories}
                onToggleCategory={handleToggleCategory}
                onClearAll={handleClearFilters}
                eventCounts={eventCounts}
              />
              <UpcomingEvents events={filteredEvents} onEventClick={handleEventClick} timezone={timezone} />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="max-w-3xl space-y-6">
              <TimezoneSelector onTimezoneChange={setTimezone} />
              {!isAdmin && (
                <AdminLogin isAdmin={isAdmin} onAdminChange={handleAdminChange} />
              )}
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <div className="max-w-3xl space-y-6">
                <AdminLogin isAdmin={isAdmin} onAdminChange={handleAdminChange} />
                <ApiKeyManager apiUrl={apiUrl} publicAnonKey={publicAnonKey} />
                <ApiInstructions apiUrl={apiUrl} />
                <TroubleshootPanel 
                  apiUrl={apiUrl} 
                  publicAnonKey={publicAnonKey} 
                  events={events}
                  onRefresh={() => fetchEvents()} 
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Event Detail Dialog */}
      <EventDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCancel={isAdmin ? handleCancelEvent : undefined}
        onUpdateCategory={isAdmin ? handleUpdateCategory : undefined}
        timezone={timezone}
        isAdmin={isAdmin}
      />
    </div>
  );
}
