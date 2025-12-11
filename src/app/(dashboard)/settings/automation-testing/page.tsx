"use client";

import React, { useState } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, PlayCircle, CheckCircle, Clock, XCircle, Info, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface AutomationRunResult {
  success: boolean;
  message: string;
  details?: string[];
  timestamp?: string;
}

export default function AutomationTestingPage() {
  const { appUser, isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<AutomationRunResult | null>(null);
  const [cronSecret, setCronSecret] = useState('');

  const handleManualTrigger = async () => {
    if (!cronSecret.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the CRON_SECRET to test the automation endpoint.',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    setLastResult(null);

    try {
      const response = await fetch('/api/run-automations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
        },
      });

      const data = await response.json();
      
      setLastResult({
        ...data,
        timestamp: new Date().toISOString(),
      });

      if (response.ok && data.success) {
        toast({
          title: 'Success',
          description: data.message || 'Automation run completed successfully',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || data.message || 'Failed to run automations',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      const errorResult = {
        success: false,
        message: error.message || 'Network error occurred',
        timestamp: new Date().toISOString(),
      };
      setLastResult(errorResult);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to automation endpoint',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestConnection = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/run-automations/test', {
        method: 'GET',
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: 'Connection Test Successful',
          description: data.message,
        });
      } else {
        toast({
          title: 'Connection Test Failed',
          description: data.error || 'Could not reach endpoint',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: 'Failed to reach test endpoint',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access automation testing tools.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageTitle title="Email Automation Testing" description="Test and monitor your email automation system" />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Testing Tools for Administrators</AlertTitle>
        <AlertDescription>
          This page allows you to manually trigger email automations for testing purposes.
          In production, automations should run automatically via scheduled cron jobs.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manual Trigger</CardTitle>
            <CardDescription>
              Test the automation endpoint manually by providing your CRON_SECRET
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="cronSecret" className="text-sm font-medium">
                CRON_SECRET
              </label>
              <input
                id="cronSecret"
                type="password"
                value={cronSecret}
                onChange={(e) => setCronSecret(e.target.value)}
                placeholder="Enter your CRON_SECRET"
                className="mt-1 w-full px-3 py-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is the secret key configured in your environment variables
              </p>
            </div>

            <Button
              onClick={handleManualTrigger}
              disabled={isRunning || !cronSecret.trim()}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Run Automations Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Test</CardTitle>
            <CardDescription>
              Verify the automation endpoint is reachable
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Test if the automation endpoint is accessible. This doesn't require authentication
              and won't trigger any emails.
            </p>

            <Button
              onClick={handleTestConnection}
              disabled={isRunning}
              variant="outline"
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Last Run Result
            </CardTitle>
            <CardDescription>
              {lastResult.timestamp && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(lastResult.timestamp).toLocaleString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Badge variant={lastResult.success ? 'default' : 'destructive'}>
                {lastResult.success ? 'Success' : 'Failed'}
              </Badge>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Message</h4>
              <p className="text-sm text-muted-foreground">{lastResult.message}</p>
            </div>

            {lastResult.details && lastResult.details.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Details</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {lastResult.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Automation Endpoint Information</CardTitle>
          <CardDescription>
            Use this information to set up external cron services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Endpoint URL</h4>
            <code className="block p-2 bg-muted rounded text-sm">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/run-automations
            </code>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">HTTP Method</h4>
            <Badge variant="outline">GET</Badge>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Required Header</h4>
            <code className="block p-2 bg-muted rounded text-sm">
              Authorization: Bearer YOUR_CRON_SECRET
            </code>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Example cURL Command</h4>
            <code className="block p-2 bg-muted rounded text-xs whitespace-pre-wrap break-all">
              {`curl -X GET "${typeof window !== 'undefined' ? window.location.origin : ''}/api/run-automations" \\
  -H "Authorization: Bearer YOUR_CRON_SECRET"`}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
