import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Clock, MapPin, Repeat } from 'lucide-react';
import { getCategoryById } from '../config/categories';

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

interface UpcomingEventsProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  timezone: string;
}

export function UpcomingEvents({ events, onEventClick, timezone }: UpcomingEventsProps) {
  const now = new Date();
  const upcomingEvents = events
    .filter(event => new Date(event.start) >= now)
    .slice(0, 10);

  const getDateLabel = (dateStr: string) => {
    const date = toZonedTime(new Date(dateStr), timezone);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE');
    return format(date, 'MMM d');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No upcoming events
          </p>
        ) : (
          upcomingEvents.map(event => {
            const startDate = new Date(event.start);
            const zonedStartDate = toZonedTime(startDate, timezone);
            return (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{event.subject}</h4>
                      {event.isRecurring && (
                        <Repeat className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{format(zonedStartDate, 'h:mm a')}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      <Badge 
                        className={`text-xs ${getCategoryById(event.category).bgColor} ${getCategoryById(event.category).color} border-0`}
                      >
                        {getCategoryById(event.category).label}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex-shrink-0">
                    {getDateLabel(event.start)}
                  </Badge>
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}