"use client";

import React, { useState } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, PlayCircle, CheckCircle, Clock, XCircle, Info, Loader2, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface AutomationResult {
  success: boolean;
  triggeredBy?: string;
  triggeredAt?: string;
  summary?: {
    companiesProcessed?: number;
    totalStatesProcessed?: number;
    totalEmailsSent?: number;
    totalNewEnrollments?: number;
    totalErrors?: number;
  };
  errors?: string[];
  error?: string;
}

export default function TestEmailAutomationsPage() {
  const { isSuperAdmin, getIdToken } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AutomationResult | null>(null);

  const handleTriggerAutomations = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const idToken = await getIdToken();
      if (!idToken) {
        toast({
          title: 'Authentication Error',
          description: 'Please log in again',
          variant: 'destructive',
        });
        setIsRunning(false);
        return;
      }

      const response = await fetch('/api/admin/trigger-email-automations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'Automations Triggered',
          description: `${data.summary?.totalEmailsSent || 0} emails sent, ${data.summary?.totalNewEnrollments || 0} new enrollments`,
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to trigger automations',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      const errorResult = {
        success: false,
        error: error.message || 'Network error occurred',
      };
      setResult(errorResult);
      toast({
        title: 'Network Error',
        description: 'Failed to connect to server',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only Super Admins can access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageTitle 
        title="Test Email Automations" 
        description="Instantly trigger all pending email automations for testing" 
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Super Admin Testing Tool</AlertTitle>
        <AlertDescription>
          This will process all pending email automation steps across all companies. 
          Emails that are due will be sent immediately.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Trigger Email Automations
          </CardTitle>
          <CardDescription>
            Click the button below to process all pending email automation steps. 
            This is the same as what the cron job does on Vercel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleTriggerAutomations}
            disabled={isRunning}
            size="lg"
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing Automations...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Run All Email Automations Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Result
            </CardTitle>
            {result.triggeredAt && (
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(result.triggeredAt).toLocaleString()}
                {result.triggeredBy && ` by ${result.triggeredBy}`}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant={result.success ? 'default' : 'destructive'}>
              {result.success ? 'Success' : 'Failed'}
            </Badge>

            {result.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{result.summary.companiesProcessed || 0}</p>
                  <p className="text-xs text-muted-foreground">Companies</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{result.summary.totalEmailsSent || 0}</p>
                  <p className="text-xs text-muted-foreground">Emails Sent</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{result.summary.totalNewEnrollments || 0}</p>
                  <p className="text-xs text-muted-foreground">New Enrollments</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{result.summary.totalStatesProcessed || 0}</p>
                  <p className="text-xs text-muted-foreground">States Processed</p>
                </div>
              </div>
            )}

            {result.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}

            {result.errors && result.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Errors ({result.errors.length})</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
