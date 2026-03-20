import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Globe } from 'lucide-react';

interface TimezoneSelectorProps {
  onTimezoneChange: (timezone: string) => void;
}

// Common timezones grouped by region
const TIMEZONES = [
  // North America - Canadian Timezones
  { value: 'America/St_Johns', label: 'Newfoundland Time (NT)', region: 'Canada' },
  { value: 'America/Halifax', label: 'Atlantic Time (AT)', region: 'Canada' },
  { value: 'America/Toronto', label: 'Eastern Time - Toronto', region: 'Canada' },
  { value: 'America/Montreal', label: 'Eastern Time - Montreal', region: 'Canada' },
  { value: 'America/Winnipeg', label: 'Central Time - Winnipeg', region: 'Canada' },
  { value: 'America/Regina', label: 'Central Time - Regina (no DST)', region: 'Canada' },
  { value: 'America/Edmonton', label: 'Mountain Time - Edmonton', region: 'Canada' },
  { value: 'America/Vancouver', label: 'Pacific Time - Vancouver', region: 'Canada' },
  
  // North America - US Timezones
  { value: 'America/New_York', label: 'Eastern Time (ET)', region: 'United States' },
  { value: 'America/Chicago', label: 'Central Time (CT)', region: 'United States' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', region: 'United States' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)', region: 'United States' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', region: 'United States' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', region: 'United States' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)', region: 'United States' },
  
  // Europe
  { value: 'Europe/London', label: 'London (GMT/BST)', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris (CET)', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome (CET)', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)', region: 'Europe' },
  { value: 'Europe/Brussels', label: 'Brussels (CET)', region: 'Europe' },
  { value: 'Europe/Vienna', label: 'Vienna (CET)', region: 'Europe' },
  { value: 'Europe/Warsaw', label: 'Warsaw (CET)', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens (EET)', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT)', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)', region: 'Europe' },
  
  // Asia
  { value: 'Asia/Dubai', label: 'Dubai (GST)', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'India (IST)', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)', region: 'Asia' },
  
  // Pacific
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)', region: 'Pacific' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT)', region: 'Pacific' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)', region: 'Pacific' },
  { value: 'Australia/Perth', label: 'Perth (AWST)', region: 'Pacific' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT)', region: 'Pacific' },
  
  // South America
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', region: 'South America' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)', region: 'South America' },
  { value: 'America/Santiago', label: 'Santiago (CLT)', region: 'South America' },
  
  // Africa
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', region: 'Africa' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)', region: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)', region: 'Africa' },
];

export function TimezoneSelector({ onTimezoneChange }: TimezoneSelectorProps) {
  const [detectedTimezone, setDetectedTimezone] = useState<string>('');
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');

  useEffect(() => {
    // Detect user's timezone
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setDetectedTimezone(detected);
    
    // Load saved timezone or use detected
    const saved = localStorage.getItem('calendar-timezone');
    const timezone = saved || detected;
    setSelectedTimezone(timezone);
    onTimezoneChange(timezone);
  }, []);

  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    localStorage.setItem('calendar-timezone', timezone);
    onTimezoneChange(timezone);
  };

  const getCurrentOffset = () => {
    const now = new Date();
    const offset = -now.getTimezoneOffset() / 60;
    return offset >= 0 ? `UTC+${offset}` : `UTC${offset}`;
  };

  // Group timezones by region
  const groupedTimezones = TIMEZONES.reduce((acc, tz) => {
    if (!acc[tz.region]) {
      acc[tz.region] = [];
    }
    acc[tz.region].push(tz);
    return acc;
  }, {} as Record<string, typeof TIMEZONES>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Timezone Settings
        </CardTitle>
        <CardDescription>
          Events are stored in UTC and displayed in your selected timezone
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">Detected:</span>
          <Badge variant="outline">
            {detectedTimezone || 'Detecting...'} ({getCurrentOffset()})
          </Badge>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone-select">Display Timezone</Label>
          <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger id="timezone-select">
              <SelectValue placeholder="Select timezone..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {Object.entries(groupedTimezones).map(([region, timezones]) => (
                <div key={region}>
                  <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                    {region}
                  </div>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            All event times will be converted to this timezone for display
          </p>
        </div>
      </CardContent>
    </Card>
  );
}