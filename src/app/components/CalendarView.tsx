import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Settings,
} from 'lucide-react';
import { TimezoneSelector } from './TimezoneSelector';
import { EVENT_CATEGORIES } from '../config/categories';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  addDays,
  addWeeks,
  addYears,
  startOfWeek,
  endOfWeek,
  startOfDay,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isToday as isTodayFn,
  getDay,
  isBefore,
} from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

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

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  timezone: string;
  onTimezoneChange?: (timezone: string) => void;
}

type ViewMode = 'day' | 'week' | 'work-week' | 'month' | 'year';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getCategoryStyle(categoryId?: string | null) {
  return (
    EVENT_CATEGORIES.find(c => c.id === categoryId) ??
    EVENT_CATEGORIES.find(c => c.id === 'general')!
  );
}

const getTimezoneDisplayName = (timezone: string): string => {
  const map: Record<string, string> = {
    'America/Toronto': 'Eastern',
    'America/Montreal': 'Eastern',
    'America/New_York': 'Eastern',
    'America/Winnipeg': 'Central',
    'America/Regina': 'Central',
    'America/Chicago': 'Central',
    'America/Vancouver': 'Pacific',
    'America/Los_Angeles': 'Pacific',
    'America/Halifax': 'Atlantic',
    'America/Edmonton': 'Mountain',
    'America/Denver': 'Mountain',
    'America/St_Johns': 'Newfoundland',
  };
  return map[timezone] ?? timezone.split('/').pop() ?? timezone;
};

/* -------------------------------------------------------------------------- */
/* Main Calendar View                                                         */
/* -------------------------------------------------------------------------- */

export function CalendarView({
  events,
  onEventClick,
  timezone,
  onTimezoneChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // ✅ BEST FIX: immutable, defensive derivation
  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const eventDate = toZonedTime(new Date(event.start), timezone);
      const key = format(eventDate, 'yyyy-MM-dd');
      const existing = map.get(key) ?? [];
      map.set(key, [...existing, event]);
    }

    return map;
  }, [events, timezone]);

  const navigate = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') {
      setCurrentDate(new Date());
      return;
    }
    const delta = dir === 'prev' ? -1 : 1;
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, delta));
        break;
      case 'week':
      case 'work-week':
        setCurrentDate(addWeeks(currentDate, delta));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, delta));
        break;
      case 'year':
        setCurrentDate(addYears(currentDate, delta));
        break;
    }
  };

  const title = (() => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
      case 'work-week': {
        const start = startOfWeek(currentDate);
        const end = endOfWeek(currentDate);
        return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
      }
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'year':
        return format(currentDate, 'yyyy');
    }
  })();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {title}
          </CardTitle>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('today')}>
              Today
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)}>
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="work-week">Work Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            eventsMap={eventsMap}
            onEventClick={onEventClick}
            timezone={timezone}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            eventsMap={eventsMap}
            onEventClick={onEventClick}
            timezone={timezone}
            onTimezoneChange={onTimezoneChange}
          />
        )}
        {viewMode === 'work-week' && (
          <WorkWeekView
            currentDate={currentDate}
            eventsMap={eventsMap}
            onEventClick={onEventClick}
            timezone={timezone}
            onTimezoneChange={onTimezoneChange}
          />
        )}
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            eventsMap={eventsMap}
            onEventClick={onEventClick}
            timezone={timezone}
          />
        )}
        {viewMode === 'year' && (
          <YearView
            currentDate={currentDate}
            eventsMap={eventsMap}
            onEventClick={onEventClick}
            timezone={timezone}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Views                                                                      */
/* -------------------------------------------------------------------------- */

/* Day View */
function DayView({ currentDate, eventsMap, onEventClick, timezone }: any) {
  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const dayEvents = eventsMap.get(dateKey) ?? [];
  const hours = Array.from({ length: 13 }, (_, i) => i + 7);

  return (
    <div className="space-y-2">
      {hours.map(hour => {
        const hourEvents = dayEvents.filter((e: CalendarEvent) => {
          const t = toZonedTime(new Date(e.start), timezone);
          return t.getHours() === hour;
        });

        return (
          <div key={hour} className="border rounded p-2">
            <div className="text-xs text-muted-foreground mb-1">
              {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
            </div>
            {hourEvents.map((event: CalendarEvent) => {
              const style = getCategoryStyle(event.category);
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`block w-full text-left text-sm px-2 py-1 rounded ${style.bgColor} ${style.color}`}
                >
                  {event.subject}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* Week View */
function WeekView({ currentDate, eventsMap, onEventClick, timezone, onTimezoneChange }: any) {
  const weekStart = startOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const events = eventsMap.get(key) ?? [];
          return (
            <div key={key} className="border rounded p-2">
              <div className="text-sm font-medium">{format(day, 'EEE d')}</div>
              {events.map((event: CalendarEvent) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="block text-xs mt-1 text-left"
                >
                  {event.subject}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Work Week View */
function WorkWeekView({ currentDate, eventsMap, onEventClick, timezone }: any) {
  const weekStart = startOfWeek(currentDate);
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) })
    .filter(d => {
      const day = getDay(d);
      return day >= 1 && day <= 5;
    });

  return (
    <WeekView
      currentDate={currentDate}
      eventsMap={eventsMap}
      onEventClick={onEventClick}
      timezone={timezone}
    />
  );
}

/* Month View */
function MonthView({ currentDate, eventsMap, onEventClick, timezone }: any) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map(day => {
        const key = format(day, 'yyyy-MM-dd');
        const events = eventsMap.get(key) ?? [];
        return (
          <div key={key} className="border rounded p-1 min-h-20">
            <div className="text-xs font-medium">{format(day, 'd')}</div>
            {events.slice(0, 3).map((event: CalendarEvent) => (
              <button
                key={event.id}
                onClick={() => onEventClick(event)}
                className="block text-[10px] truncate"
              >
                {event.subject}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* Year View */
function YearView({ currentDate, eventsMap, onEventClick, timezone }: any) {
  const months = eachMonthOfInterval({
    start: startOfYear(currentDate),
    end: endOfYear(currentDate),
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      {months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const days = eachDayOfInterval({
          start: startOfWeek(monthStart),
          end: endOfWeek(monthEnd),
        });

        const count = days.reduce((acc, d) => {
          const key = format(d, 'yyyy-MM-dd');
          return acc + (eventsMap.get(key)?.length ?? 0);
        }, 0);

        return (
          <div key={month.toISOString()} className="border rounded p-3">
            <div className="flex justify-between text-sm font-medium mb-2">
              {format(month, 'MMMM')}
              {count > 0 && <Badge variant="secondary">{count}</Badge>}
            </div>
          </div>
        );
      })}
    </div>
  );
}