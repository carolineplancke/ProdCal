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
  isSameDay, 
  addMonths, 
  subMonths,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  startOfWeek, 
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  isToday as isTodayFn,
  getDay,
  isWithinInterval,
  parseISO,
  isBefore,
  endOfToday
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

// Helper function to get timezone display name for Canadian timezones
const getTimezoneDisplayName = (timezone: string): string => {
  const canadianTimezones: Record<string, string> = {
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
  
  return canadianTimezones[timezone] || timezone.split('/').pop() || timezone;
};

// Helper function to get category styling
function getCategoryStyle(categoryId: string | null | undefined) {
  const category = EVENT_CATEGORIES.find(c => c.id === (categoryId || 'general'));
  return category || EVENT_CATEGORIES.find(c => c.id === 'general')!;
}

export function CalendarView({ events, onEventClick, timezone, onTimezoneChange }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const eventDate = toZonedTime(new Date(event.start), timezone);
      const dateKey = format(eventDate, 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)?.push(event);
    });
    return map;
  }, [events, timezone]);

  const navigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const modifier = direction === 'prev' ? -1 : 1;
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, modifier));
        break;
      case 'week':
      case 'work-week':
        setCurrentDate(addWeeks(currentDate, modifier));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, modifier));
        break;
      case 'year':
        setCurrentDate(addYears(currentDate, modifier));
        break;
    }
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
      case 'work-week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'year':
        return format(currentDate, 'yyyy');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {getTitle()}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('today')}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="work-week">Work Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'day' && <DayView currentDate={currentDate} eventsMap={eventsMap} onEventClick={onEventClick} timezone={timezone} />}
        {viewMode === 'week' && <WeekView currentDate={currentDate} eventsMap={eventsMap} onEventClick={onEventClick} timezone={timezone} onTimezoneChange={onTimezoneChange} />}
        {viewMode === 'work-week' && <WorkWeekView currentDate={currentDate} eventsMap={eventsMap} onEventClick={onEventClick} timezone={timezone} onTimezoneChange={onTimezoneChange} />}
        {viewMode === 'month' && <MonthView currentDate={currentDate} eventsMap={eventsMap} onEventClick={onEventClick} timezone={timezone} />}
        {viewMode === 'year' && <YearView currentDate={currentDate} eventsMap={eventsMap} onEventClick={onEventClick} timezone={timezone} />}
      </CardContent>
    </Card>
  );
}

// Day View - Shows one day with hourly time slots
function DayView({ currentDate, eventsMap, onEventClick, timezone }: {
  currentDate: Date;
  eventsMap: Map<string, CalendarEvent[]>;
  onEventClick: (event: CalendarEvent) => void;
  timezone: string;
}) {
  const dateKey = format(currentDate, 'yyyy-MM-dd');
  const dayEvents = eventsMap.get(dateKey) || [];
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7am to 7pm
  const isToday = isTodayFn(currentDate);
  const isPast = isBefore(startOfDay(currentDate), startOfDay(new Date()));

  return (
    <div className="space-y-2">
      <div className={`text-center py-3 rounded-lg ${
        isPast ? 'opacity-50' : ''
      } ${isToday ? 'bg-primary/10 text-primary font-medium' : 'bg-muted'}`}>
        {format(currentDate, 'EEEE')}
      </div>
      <div className={`border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto ${
        isPast ? 'opacity-50' : ''
      }`}>
        {hours.map(hour => {
          const hourEvents = dayEvents.filter(event => {
            const eventTime = toZonedTime(new Date(event.start), timezone);
            return eventTime.getHours() === hour;
          });

          return (
            <div key={hour} className="border-b last:border-b-0 min-h-16 flex">
              <div className="w-20 border-r p-2 text-sm text-muted-foreground flex-shrink-0">
                {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
              </div>
              <div className="flex-1 p-2 space-y-1">
                {hourEvents.map(event => {
                  const startTime = toZonedTime(new Date(event.start), timezone);
                  const endTime = toZonedTime(new Date(event.end), timezone);
                  const categoryStyle = getCategoryStyle(event.category);
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded transition-colors ${categoryStyle.bgColor} ${categoryStyle.color} hover:opacity-80`}
                    >
                      <div className="font-medium">{event.subject}</div>
                      <div className="text-xs opacity-80">
                        {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Week View - Shows 7 days (Sun-Sat) with time grid layout
function WeekView({ currentDate, eventsMap, onEventClick, timezone, onTimezoneChange }: {
  currentDate: Date;
  eventsMap: Map<string, CalendarEvent[]>;
  onEventClick: (event: CalendarEvent) => void;
  timezone: string;
  onTimezoneChange?: (timezone: string) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7am to 7pm

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header with day names and dates */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b bg-muted">
        <Popover>
          <PopoverTrigger asChild>
            <button className="border-r flex items-center justify-center p-2 hover:bg-muted-foreground/10 transition-colors cursor-pointer">
              <div className="text-xs text-muted-foreground text-center">
                <div className="font-medium flex items-center gap-1">
                  {getTimezoneDisplayName(timezone)}
                  {onTimezoneChange && <Settings className="h-3 w-3" />}
                </div>
                <div className="text-[10px] opacity-70">Timezone</div>
              </div>
            </button>
          </PopoverTrigger>
          {onTimezoneChange && (
            <PopoverContent className="w-80">
              <TimezoneSelector onTimezoneChange={onTimezoneChange} />
            </PopoverContent>
          )}
        </Popover>
        {weekDays.map(day => {
          const isToday = isTodayFn(day);
          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={`text-center py-3 border-r last:border-r-0 ${
                isToday ? 'bg-primary text-primary-foreground' : ''
              }`}
            >
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className={`text-lg ${isToday ? '' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b last:border-b-0 min-h-16">
            {/* Time label */}
            <div className="border-r p-2 text-sm text-muted-foreground flex-shrink-0">
              {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
            </div>
            
            {/* Day columns */}
            {weekDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsMap.get(dateKey) || [];
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              
              // Filter events that start in this hour
              const hourEvents = dayEvents.filter(event => {
                const eventTime = toZonedTime(new Date(event.start), timezone);
                return eventTime.getHours() === hour;
              });

              return (
                <div
                  key={`${dateKey}-${hour}`}
                  className={`border-r last:border-r-0 p-1 space-y-1 overflow-hidden ${isPast && !isTodayFn(day) ? 'bg-muted/30' : ''}`}
                >
                  {hourEvents.map(event => {
                    const startTime = toZonedTime(new Date(event.start), timezone);
                    const endTime = toZonedTime(new Date(event.end), timezone);
                    const categoryStyle = getCategoryStyle(event.category);
                    
                    return (
                      <Tooltip key={event.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onEventClick(event)}
                            className={`w-full text-left text-xs px-1.5 py-1 rounded transition-colors ${categoryStyle.bgColor} ${categoryStyle.color} hover:opacity-80 overflow-hidden`}
                          >
                            <div className="font-medium truncate">{event.subject}</div>
                            <div className="text-[10px] opacity-80 truncate">
                              {format(startTime, 'h:mm a')}
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <div className="font-semibold">{event.subject}</div>
                            <div className="text-xs">
                              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                            </div>
                            {event.location && (
                              <div className="text-xs opacity-90">📍 {event.location}</div>
                            )}
                            {event.organizer && (
                              <div className="text-xs opacity-90">👤 {event.organizer}</div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Work Week View - Shows Mon-Fri only with time grid layout
function WorkWeekView({ currentDate, eventsMap, onEventClick, timezone, onTimezoneChange }: {
  currentDate: Date;
  eventsMap: Map<string, CalendarEvent[]>;
  onEventClick: (event: CalendarEvent) => void;
  timezone: string;
  onTimezoneChange?: (timezone: string) => void;
}) {
  const weekStart = startOfWeek(currentDate);
  const allDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const workDays = allDays.filter(day => {
    const dayOfWeek = getDay(day);
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday (1) to Friday (5)
  });
  const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7am to 7pm

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header with day names and dates */}
      <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b bg-muted">
        <Popover>
          <PopoverTrigger asChild>
            <button className="border-r flex items-center justify-center p-2 hover:bg-muted-foreground/10 transition-colors cursor-pointer">
              <div className="text-xs text-muted-foreground text-center">
                <div className="font-medium flex items-center gap-1">
                  {getTimezoneDisplayName(timezone)}
                  {onTimezoneChange && <Settings className="h-3 w-3" />}
                </div>
                <div className="text-[10px] opacity-70">Timezone</div>
              </div>
            </button>
          </PopoverTrigger>
          {onTimezoneChange && (
            <PopoverContent className="w-80">
              <TimezoneSelector onTimezoneChange={onTimezoneChange} />
            </PopoverContent>
          )}
        </Popover>
        {workDays.map(day => {
          const isToday = isTodayFn(day);
          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={`text-center py-3 border-r last:border-r-0 ${
                isToday ? 'bg-primary text-primary-foreground' : ''
              }`}
            >
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className={`text-lg ${isToday ? '' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-[80px_repeat(5,1fr)] border-b last:border-b-0 min-h-16">
            {/* Time label */}
            <div className="border-r p-2 text-sm text-muted-foreground flex-shrink-0">
              {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
            </div>
            
            {/* Day columns */}
            {workDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsMap.get(dateKey) || [];
              const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
              
              // Filter events that start in this hour
              const hourEvents = dayEvents.filter(event => {
                const eventTime = toZonedTime(new Date(event.start), timezone);
                return eventTime.getHours() === hour;
              });

              return (
                <div
                  key={`${dateKey}-${hour}`}
                  className={`border-r last:border-r-0 p-1 space-y-1 overflow-hidden ${isPast && !isTodayFn(day) ? 'bg-muted/30' : ''}`}
                >
                  {hourEvents.map(event => {
                    const startTime = toZonedTime(new Date(event.start), timezone);
                    const endTime = toZonedTime(new Date(event.end), timezone);
                    const categoryStyle = getCategoryStyle(event.category);
                    
                    return (
                      <Tooltip key={event.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onEventClick(event)}
                            className={`w-full text-left text-xs px-1.5 py-1 rounded transition-colors ${categoryStyle.bgColor} ${categoryStyle.color} hover:opacity-80 overflow-hidden`}
                          >
                            <div className="font-medium truncate">{event.subject}</div>
                            <div className="text-[10px] opacity-80 truncate">
                              {format(startTime, 'h:mm a')}
                            </div>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <div className="font-semibold">{event.subject}</div>
                            <div className="text-xs">
                              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                            </div>
                            {event.location && (
                              <div className="text-xs opacity-90">📍 {event.location}</div>
                            )}
                            {event.organizer && (
                              <div className="text-xs opacity-90">👤 {event.organizer}</div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Month View - Traditional calendar grid
function MonthView({ currentDate, eventsMap, onEventClick, timezone }: {
  currentDate: Date;
  eventsMap: Map<string, CalendarEvent[]>;
  onEventClick: (event: CalendarEvent) => void;
  timezone: string;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="grid grid-cols-7 gap-1">
      {weekDays.map(day => (
        <div
          key={day}
          className="text-center text-sm font-medium text-muted-foreground py-2"
        >
          {day}
        </div>
      ))}
      {days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayEvents = eventsMap.get(dateKey) || [];
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isToday = isTodayFn(day);
        const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

        return (
          <div
            key={day.toISOString()}
            className={`min-h-24 border rounded-lg p-2 ${
              isCurrentMonth ? 'bg-card' : 'bg-muted/30'
            } ${isToday ? 'border-primary border-2' : 'border-border'} ${
              isPast && !isToday ? 'opacity-50' : ''
            }`}
          >
            <div className={`text-sm font-medium mb-1 ${
              isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
            } ${isToday ? 'text-primary' : ''}`}>
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map(event => {
                const startTime = toZonedTime(new Date(event.start), timezone);
                const endTime = toZonedTime(new Date(event.end), timezone);
                const categoryStyle = getCategoryStyle(event.category);
                return (
                  <Tooltip key={event.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onEventClick(event)}
                        className={`w-full text-left text-xs px-1 py-0.5 rounded truncate transition-colors ${categoryStyle.bgColor} ${categoryStyle.color} hover:opacity-80`}
                      >
                        {format(startTime, 'HH:mm')} {event.subject}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <div className="font-semibold">{event.subject}</div>
                        <div className="text-xs">
                          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                        </div>
                        {event.location && (
                          <div className="text-xs opacity-90">📍 {event.location}</div>
                        )}
                        {event.organizer && (
                          <div className="text-xs opacity-90">👤 {event.organizer}</div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {dayEvents.length > 3 && (
                <div className="text-xs text-muted-foreground px-1">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Year View - Shows all 12 months in a grid
function YearView({ currentDate, eventsMap, onEventClick, timezone }: {
  currentDate: Date;
  eventsMap: Map<string, CalendarEvent[]>;
  onEventClick: (event: CalendarEvent) => void;
  timezone: string;
}) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);
  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  return (
    <div className="grid grid-cols-3 gap-4">
      {months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const calendarStart = startOfWeek(monthStart);
        const calendarEnd = endOfWeek(monthEnd);
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
        
        // Count events in this month
        const monthEventCount = days.reduce((count, day) => {
          if (isSameMonth(day, month)) {
            const dateKey = format(day, 'yyyy-MM-dd');
            return count + (eventsMap.get(dateKey)?.length || 0);
          }
          return count;
        }, 0);

        return (
          <div key={month.toISOString()} className="border rounded-lg p-3">
            <div className="text-sm font-medium text-center mb-2 flex items-center justify-between">
              <span>{format(month, 'MMMM')}</span>
              {monthEventCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {monthEventCount}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-[10px] text-muted-foreground">
                  {day}
                </div>
              ))}
              {days.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsMap.get(dateKey) || [];
                const isCurrentMonth = isSameMonth(day, month);
                const isToday = isTodayFn(day);
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()));
                const hasEvents = dayEvents.length > 0;

                return (
                  <div
                    key={day.toISOString()}
                    className={`text-center text-[10px] py-1 ${
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'
                    } ${isToday ? 'bg-primary text-primary-foreground rounded' : ''} ${
                      hasEvents && !isToday ? 'font-bold text-primary' : ''
                    } ${isPast && !isToday ? 'opacity-50' : ''}`}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}