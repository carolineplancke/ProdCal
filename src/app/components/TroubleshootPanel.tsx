import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { AlertCircle, CheckCircle, Bug, Database, Send, Wrench } from 'lucide-react';
import { toast } from 'sonner';

interface TroubleshootPanelProps {
  apiUrl: string;
  publicAnonKey: string;
  events: any[];
  onRefresh?: () => void;
}

export function TroubleshootPanel({ apiUrl, publicAnonKey, events, onRefresh }: TroubleshootPanelProps) {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [rawData, setRawData] = useState<any>(null);
  const [apiKey, setApiKey] = useState('');
  const [migrating, setMigrating] = useState(false);

  const testApiConnection = async () => {
    setTesting(true);
    const results: any = {
      healthCheck: null,
      eventsEndpoint: null,
      timestamp: new Date().toISOString(),
    };

    try {
      // Test health endpoint
      const healthResponse = await fetch(`${apiUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      results.healthCheck = {
        status: healthResponse.ok ? 'success' : 'failed',
        statusCode: healthResponse.status,
        data: await healthResponse.json(),
      };
    } catch (error) {
      results.healthCheck = {
        status: 'error',
        error: error.message,
      };
    }

    try {
      // Test events endpoint
      const eventsResponse = await fetch(`${apiUrl}/events`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const eventsData = await eventsResponse.json();
      results.eventsEndpoint = {
        status: eventsResponse.ok ? 'success' : 'failed',
        statusCode: eventsResponse.status,
        data: eventsData,
        eventCount: eventsData.events?.length || 0,
      };
      setRawData(eventsData);
    } catch (error) {
      results.eventsEndpoint = {
        status: 'error',
        error: error.message,
      };
    }

    setTestResults(results);
    setTesting(false);
  };

  const sendTestEvent = async () => {
    if (!apiKey) {
      toast.error('Please enter your API key first');
      return;
    }

    try {
      const testEvent = {
        id: `test-event-${Date.now()}`,
        subject: 'Test Event from Calendar',
        start: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        end: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        location: 'Test Location',
        description: 'This is a test event to verify the API is working',
        attendees: ['test@example.com'],
        organizer: 'admin@example.com',
        isRecurring: false,
        recurrencePattern: null,
        seriesId: null,
        isCancelled: false,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      };

      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      const response = await fetch(`${apiUrl}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testEvent),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Test event created successfully!');
        console.log('Test event response:', data);
        // Refresh the test
        setTimeout(testApiConnection, 1000);
        if (onRefresh) {
          onRefresh();
        }
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create test event: ${errorData.error || response.statusText}`);
        console.error('Error creating test event:', errorData);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
      console.error('Error creating test event:', error);
    }
  };

  const fixExistingEvents = async () => {
    setMigrating(true);
    try {
      const response = await fetch(`${apiUrl}/migrate/fix-booleans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Events fixed successfully!');
        console.log('Migration result:', data);
        // Refresh events
        if (onRefresh) {
          setTimeout(onRefresh, 500);
        }
        setTimeout(testApiConnection, 1000);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to fix events: ${errorData.error || response.statusText}`);
        console.error('Error fixing events:', errorData);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
      console.error('Error fixing events:', error);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Troubleshoot
        </CardTitle>
        <CardDescription>
          Debug your calendar connection and data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Power Automate events not showing or times are wrong?</strong> Click the button below to fix data type and timezone issues from Power Automate.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={fixExistingEvents} 
          disabled={migrating}
          variant="default"
          className="w-full"
        >
          <Wrench className="h-4 w-4 mr-2" />
          {migrating ? 'Fixing Events...' : 'Fix Power Automate Events'}
        </Button>

        <Separator />

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="test-api-key">API Key (for testing)</Label>
            <Input
              id="test-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key to send test events"
            />
            <p className="text-xs text-muted-foreground">
              Enter the same API key you configured above to test event creation
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={testApiConnection} disabled={testing}>
              <Database className="h-4 w-4 mr-2" />
              {testing ? 'Testing...' : 'Run Diagnostics'}
            </Button>
            <Button onClick={sendTestEvent} variant="outline" disabled={!apiKey}>
              <Send className="h-4 w-4 mr-2" />
              Send Test Event
            </Button>
          </div>
        </div>

        <Separator />

        {/* Current State */}
        <div>
          <h4 className="font-medium mb-2">Current State</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span>Events in State:</span>
              <Badge>{events.length}</Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span>API URL:</span>
              <code className="text-xs truncate max-w-[300px]">{apiUrl}</code>
            </div>
          </div>
        </div>

        <Alert>
          <AlertDescription className="text-sm space-y-2">
            <strong>Debugging Tips:</strong>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Check that your Power Automate request includes the <code className="bg-muted px-1 rounded">X-API-Key</code> header</li>
              <li>Verify the request body has required fields: <code className="bg-muted px-1 rounded">id</code>, <code className="bg-muted px-1 rounded">subject</code>, <code className="bg-muted px-1 rounded">start</code>, <code className="bg-muted px-1 rounded">end</code></li>
              <li>Check Power Automate run history for the HTTP response status (should be 200)</li>
              <li>Look for error messages in the Power Automate response body</li>
              <li>If you got a 200 response but don't see the event, the data might not match the expected format</li>
            </ul>
          </AlertDescription>
        </Alert>

        {testResults && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Diagnostic Results</h4>
              
              {/* Health Check */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  {testResults.healthCheck?.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium text-sm">Health Check</span>
                  <Badge variant={testResults.healthCheck?.status === 'success' ? 'default' : 'destructive'}>
                    {testResults.healthCheck?.statusCode || 'Error'}
                  </Badge>
                </div>
                {testResults.healthCheck?.error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">
                      {testResults.healthCheck.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Events Endpoint */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {testResults.eventsEndpoint?.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium text-sm">Events Endpoint</span>
                  <Badge variant={testResults.eventsEndpoint?.status === 'success' ? 'default' : 'destructive'}>
                    {testResults.eventsEndpoint?.statusCode || 'Error'}
                  </Badge>
                  <Badge variant="outline">
                    {testResults.eventsEndpoint?.eventCount || 0} events
                  </Badge>
                </div>
                {testResults.eventsEndpoint?.error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">
                      {testResults.eventsEndpoint.error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </>
        )}

        {rawData && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Raw API Response</h4>
              <div className="bg-muted p-3 rounded-lg max-h-96 overflow-auto">
                <pre className="text-xs">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}

        {events.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">Events in Memory</h4>
              <div className="bg-muted p-3 rounded-lg max-h-96 overflow-auto">
                <pre className="text-xs">
                  {JSON.stringify(events, null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}