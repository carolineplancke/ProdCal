import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Lock, LogOut, Info, Shield, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface AdminLoginProps {
  isAdmin: boolean;
  onAdminChange: (isAdmin: boolean, token?: string) => void;
}

export function AdminLogin({ isAdmin, onAdminChange }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-832943b5`;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Login failed');
        setPassword('');
        setLoading(false);
        return;
      }

      // Store token in localStorage
      localStorage.setItem('calendar-admin-token', data.token);
      localStorage.setItem('calendar-admin', 'true');
      
      onAdminChange(true, data.token);
      toast.success('Logged in as admin');
      setPassword('');
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error('Failed to connect to server');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('calendar-admin-token');
    localStorage.removeItem('calendar-admin');
    onAdminChange(false);
    toast.success('Logged out of admin mode');
  };

  if (isAdmin) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Admin Mode Active
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </CardTitle>
          <CardDescription>
            You have full access to calendar settings and management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Admin Privileges:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Cancel calendar events</li>
                <li>Manage API keys</li>
                <li>Access setup instructions</li>
                <li>View troubleshooting tools</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Admin Login
        </CardTitle>
        <CardDescription>
          Enter the admin password to access calendar settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading || !password} className="w-full">
            {loading ? 'Logging in...' : 'Login as Admin'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            The admin password is securely stored as an environment variable and verified server-side.
            Contact your system administrator if you need access.
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
}
