import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Calendar, Clock, MapPin, Users, FileText, Repeat, X, Tag } from 'lucide-react';
import { EVENT_CATEGORIES, getCategoryById } from '../config/categories';
import { useState, useEffect } from 'react';

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

interface EventDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: (eventId: string) => void;
  onUpdateCategory?: (eventId: string, category: string) => void;
  timezone: string;
  isAdmin?: boolean;
}

export function EventDialog({ event, open, onOpenChange, onCancel, onUpdateCategory, timezone, isAdmin }: EventDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('general');

  // Update selected category when event changes
  useEffect(() => {
    if (event) {
      setSelectedCategory(event.category || 'general');
    }
  }, [event]);

  if (!event) return null;

  const startDate = toZonedTime(new Date(event.start), timezone);
  const endDate = toZonedTime(new Date(event.end), timezone);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{event.subject}</DialogTitle>
              <DialogDescription className="sr-only">
                Event details for {event.subject}
              </DialogDescription>
              {event.isRecurring && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    Recurring Event
                  </Badge>
                  {event.recurrencePattern && (
                    <span className="text-sm text-muted-foreground">
                      {event.recurrencePattern}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">
                {format(startDate, 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">
                {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))} minutes
              </div>
            </div>
          </div>

          {event.location && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Location</div>
                  <div className="text-sm text-muted-foreground">{event.location}</div>
                </div>
              </div>
            </>
          )}

          {event.organizer && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Organizer</div>
                  <div className="text-sm text-muted-foreground">{event.organizer}</div>
                </div>
              </div>
            </>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium mb-2">
                    Attendees ({event.attendees.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {event.attendees.map((attendee, index) => (
                      <Badge key={index} variant="outline">
                        {attendee}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {event.description && (
            <>
              <Separator />
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium mb-2">Description</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {event.description}
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />
          <div className="flex items-start gap-3">
            <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="font-medium mb-2">Category</div>
              {isAdmin && onUpdateCategory ? (
                <Select
                  value={selectedCategory || 'general'}
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    onUpdateCategory(event.id, value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${category.bgColor.replace('100', '500')}`} />
                          {category.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={`${getCategoryById(event.category).bgColor} ${getCategoryById(event.category).color} border-0`}>
                  {getCategoryById(event.category).label}
                </Badge>
              )}
            </div>
          </div>

          {onCancel && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    onCancel(event.id);
                    onOpenChange(false);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Event
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}