import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Code, Zap, Info, Key, Shield } from 'lucide-react';

interface ApiInstructionsProps {
  apiUrl: string;
}

export function ApiInstructions({ apiUrl }: ApiInstructionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Power Automate Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Configure Power Automate to send Outlook calendar invites to your calendar application.
          </AlertDescription>
        </Alert>

        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Authentication
          </h4>
          <div className="bg-muted/50 border border-border p-4 rounded-lg space-y-3">
            <p className="text-sm text-muted-foreground">
              Your API is secured with an API Key. In Power Automate, add this header to all HTTP requests:
            </p>
            <div className="bg-background p-3 rounded border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Key className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">Header Name:</span>
              </div>
              <code className="text-sm font-mono">X-API-Key</code>
            </div>
            <div className="bg-background p-3 rounded border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Key className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">Header Value:</span>
              </div>
              <code className="text-sm font-mono">[Your API Key from Setup tab]</code>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-2">API Endpoint</h4>
          <div className="bg-muted p-3 rounded-lg font-mono text-sm break-all">
            POST {apiUrl}/events
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-3">Request Body Format</h4>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-xs overflow-x-auto">
{`{
  "id": "unique-event-id",
  "subject": "Meeting Title",
  "start": "2026-02-10T14:00:00Z",
  "end": "2026-02-10T15:00:00Z",
  "location": "Conference Room A",
  "description": "Meeting description",
  "attendees": ["user1@example.com"],
  "organizer": "organizer@example.com",
  "isRecurring": false,
  "recurrencePattern": null,
  "seriesId": null,
  "isCancelled": false
}`}
            </pre>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-3">For Recurring Events</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">isRecurring</Badge>
              <span className="text-muted-foreground">Set to <code className="bg-muted px-1 rounded">true</code></span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">seriesId</Badge>
              <span className="text-muted-foreground">Use the same ID for all instances in the series</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">recurrencePattern</Badge>
              <span className="text-muted-foreground">E.g., "Daily", "Weekly", "Monthly"</span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Code className="h-4 w-4" />
            Power Automate Flow Steps
          </h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Trigger: "When a new event is created" (Outlook Calendar)</li>
            <li>Action: HTTP - POST request to the endpoint above</li>
            <li>Add Header: <code className="bg-muted px-1 rounded">X-API-Key</code> with your API key value</li>
            <li>Body: Map Outlook event fields to JSON format</li>
            <li>Headers: Content-Type: application/json</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}