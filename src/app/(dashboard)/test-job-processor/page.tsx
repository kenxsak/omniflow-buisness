'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TestJobProcessorPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runJobProcessor = async () => {
    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch('/api/run-campaign-jobs', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'a1b2c3d4-super-secret-key-5e6f7g8h-9i0j'}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process jobs');
      }

      setResult(data);
      
      toast({
        title: 'Job Processor Completed',
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setResult({ error: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Manual Job Processor</h1>
        <p className="text-muted-foreground">
          Trigger the background job processor to process pending campaign jobs
        </p>
      </div>

      <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-yellow-600" />
            <CardTitle className="text-yellow-900 dark:text-yellow-100">Development Tool</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-yellow-800 dark:text-yellow-200 space-y-2">
          <p>
            <strong>Why is this needed?</strong> The campaign job processor is designed to run automatically every 5 minutes via cron jobs on Vercel. 
            Since we're on Replit (not Vercel), the automated scheduling doesn't work.
          </p>
          <p>
            <strong>What this does:</strong> Manually triggers the job processor to check for pending campaign jobs and send them to Brevo, MSG91, and WATI.
          </p>
          <p>
            <strong>When to use:</strong> After creating a campaign, click the "Process Jobs Now" button to manually trigger delivery.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Process Pending Campaign Jobs</CardTitle>
          <CardDescription>
            Click the button below to manually run the campaign job processor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runJobProcessor}
            disabled={isProcessing}
            size="lg"
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Jobs...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Process Jobs Now
              </>
            )}
          </Button>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                {result.error ? (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <h3 className="text-lg font-semibold text-destructive">Error</h3>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-600">Success</h3>
                  </>
                )}
              </div>

              {result.message && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">{result.message}</p>
                </div>
              )}

              {result.details && result.details.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Job Details:</h4>
                  <div className="space-y-2">
                    {result.details.map((detail: string, index: number) => (
                      <div key={index} className="p-3 bg-muted rounded-md text-sm">
                        {detail}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.error && (
                <div className="p-4 bg-destructive/10 rounded-lg text-destructive">
                  <p>{result.error}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg text-sm space-y-2">
            <p className="font-semibold">How the job processor works:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Fetches all pending campaign jobs from the database</li>
              <li>Claims and processes each job one by one</li>
              <li>Sends emails via Brevo API</li>
              <li>Sends SMS via MSG91 API</li>
              <li>Sends WhatsApp messages via WATI API</li>
              <li>Updates job status and progress in real-time</li>
            </ol>
            <div className="mt-3 text-muted-foreground">
              💡 <strong>Tip:</strong> After running this, go to the <Badge variant="outline">Delivery Status</Badge> page and click "Refresh" to see updated progress.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
