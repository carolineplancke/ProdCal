import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Settings } from 'lucide-react';
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

function getCategoryStyle(categoryId?: string | null) {
  return (
    EVENT_CATEGORIES.find(c => c.id === categoryId) ??
    EVENT_CATEGORIES.find(c => c.id === 'general')!
  );
}

export function CalendarView({
  events,
  onEventClick,
  timezone,
  onTimezoneChange,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // ✅ SAFE, IMMUTABLE DERIVATION (FIX)
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

  console.log('CalendarView rendered with events:', events.length);

  const navigate = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') return setCurrentDate(new Date());

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
        {/* Your DayView / WeekView / MonthView / YearView can remain unchanged */}
      </CardContent>
    </Card>
  );
}