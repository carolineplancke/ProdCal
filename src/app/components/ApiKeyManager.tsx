import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Key, Lock, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeyManagerProps {
  apiUrl: string;
  publicAnonKey: string;
}

export function ApiKeyManager({ apiUrl, publicAnonKey }: ApiKeyManagerProps) {
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const checkApiKeyStatus = async () => {
    try {
      setChecking(true);
      const response = await fetch(`${apiUrl}/config/api-key`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsConfigured(data.configured);
      }
    } catch (error) {
      console.error('Error checking API key status:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setApiKey(key);
  };

  const handleSaveApiKey = async () => {
    if (apiKey.length < 16) {
      toast.error('API key must be at least 16 characters long');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/config/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save API key');
      }

      toast.success('API key saved successfully');
      setIsConfigured(true);
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error(error.message || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success('API key copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Key Configuration
        </CardTitle>
        <CardDescription>
          Generate and configure your API key for Power Automate authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {checking ? (
          <div className="text-sm text-muted-foreground">Checking API key status...</div>
        ) : (
          <>
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription className="flex items-center gap-2">
                Status: 
                {isConfigured ? (
                  <Badge variant="default" className="ml-2">Configured</Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2">Not Configured</Badge>
                )}
              </AlertDescription>
            </Alert>

            {isConfigured && (
              <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <AlertDescription className="text-sm">
                  An API key is already configured. Setting a new key will replace the existing one and may break existing Power Automate flows.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter or generate an API key"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {apiKey && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    disabled={copied}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 16 characters. Keep this key secure and add it to your Power Automate flow.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={generateRandomKey}
                disabled={loading}
              >
                Generate Random Key
              </Button>
              <Button
                onClick={handleSaveApiKey}
                disabled={loading || !apiKey || apiKey.length < 16}
              >
                {loading ? 'Saving...' : isConfigured ? 'Update API Key' : 'Save API Key'}
              </Button>
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                <strong>Important:</strong> Copy and save your API key securely. You'll need to add it as the <code className="bg-muted px-1 rounded">X-API-Key</code> header in your Power Automate HTTP requests.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
