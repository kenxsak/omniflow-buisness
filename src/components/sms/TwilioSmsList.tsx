
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { fetchTwilioMessagesAction } from '@/actions/twilio-actions';
import type { TwilioMessage } from '@/types/integrations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, MessageSquare, AlertTriangle, ArrowRight, ArrowLeft, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle as AlertTitleComponent } from "@/components/ui/alert";
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

const getTwilioMessageStatusClass = (status: TwilioMessage['status']) => {
  switch (status?.toLowerCase()) {
    case 'sent':
    case 'delivered':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'queued':
    case 'sending':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 animate-pulse';
    case 'failed':
    case 'undelivered':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default: // e.g., receiving, accepted
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  }
};

const getTwilioMessageStatusIcon = (status: TwilioMessage['status']) => {
  switch (status?.toLowerCase()) {
    case 'sent':
    case 'delivered':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'queued':
    case 'sending':
       return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    case 'failed':
    case 'undelivered':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <MessageSquare className="h-4 w-4 text-yellow-600" />;
  }
}

export default function TwilioSmsList() {
  const [messages, setMessages] = useState<TwilioMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [messagesPerPage, setMessagesPerPage] = useState(10);
  
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { appUser, company } = useAuth();

  const handleRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);

  useEffect(() => {
    // This effect now correctly handles the loading sequence for company data.
    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        
        // Ensure company context is loaded before proceeding
        if (!company || !company.apiKeys) {
            // If company data isn't loaded yet, we can't fetch keys.
            // Check if there's a user but no company to show a specific error.
            if (appUser && !company) {
                setError("Could not load company data. API keys are unavailable.");
            }
            // If there's no user at all, it's not an error, just wait.
            setIsLoading(false);
            return;
        }

        const twilioKeys = company.apiKeys.twilio;
        const accountSid = twilioKeys?.accountSid;
        const authToken = twilioKeys?.authToken;

        if (!accountSid || !authToken) {
            setError("Twilio Account SID and Auth Token not configured. Please add them in the Settings page.");
            setIsLoading(false);
            setMessages([]);
            return;
        }

        try {
            const result = await fetchTwilioMessagesAction(accountSid, authToken, 50);
            if (result.success && result.messages) {
                setMessages(result.messages);
                setCurrentPage(1);
            } else {
                setError(result.error || 'Failed to load SMS messages from Twilio.');
                setMessages([]);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Only trigger fetch if we have a user, otherwise AuthContext will re-render this component when user logs in.
    if(appUser) {
        fetchData();
    } else {
        // If there's no user, we are not loading.
        setIsLoading(false);
    }
  }, [refreshTrigger, appUser, company]);

  const indexOfLastMessage = currentPage * messagesPerPage;
  const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;
  const currentMessagesToDisplay = messages.slice(indexOfFirstMessage, indexOfLastMessage);
  const totalPages = Math.ceil(messages.length / messagesPerPage);

  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
        setCurrentPage(pageNumber);
    }
  };

  const handleMessagesPerPageChange = (value: string) => {
    setMessagesPerPage(parseInt(value, 10));
    setCurrentPage(1);
  };


  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Twilio SMS Log</CardTitle>
          <CardDescription>View recent SMS message activity from your Twilio account.</CardDescription>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh Log
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading Twilio SMS log...</p>
          </div>
        )}
        {error && !isLoading && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitleComponent>Could Not Load Twilio SMS Log</AlertTitleComponent>
              <AlertDescription>
                  {error}
                  <p className="mt-2 text-xs">Please go to <Link href="/settings?tab=integrations" className="underline font-semibold">Settings &gt; API Keys</Link> to add your Twilio credentials.</p>
              </AlertDescription>
          </Alert>
        )}
        {!isLoading && !error && messages.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No SMS messages found. If this is unexpected, check your Twilio API Keys in Settings.</p>
        )}
        {messages.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Direction</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Body</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date Sent</TableHead>
                    <TableHead className="text-right">SID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMessagesToDisplay.map((msg) => (
                    <TableRow key={msg.sid}>
                      <TableCell>
                          {msg.direction.startsWith('outbound') ? 
                              <ArrowRight className="h-4 w-4 text-blue-500" title="Outbound" /> : 
                              <ArrowLeft className="h-4 w-4 text-green-500" title="Inbound" />}
                      </TableCell>
                      <TableCell className="font-medium">{msg.from}</TableCell>
                      <TableCell>{msg.to}</TableCell>
                      <TableCell className="max-w-xs truncate" title={msg.body}>
                          {msg.body.length > 50 ? `${msg.body.substring(0, 47)}...` : msg.body}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getTwilioMessageStatusClass(msg.status)} text-xs gap-1`} variant="outline">
                          {getTwilioMessageStatusIcon(msg.status)}
                          {msg.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                        {format(new Date(msg.dateSent), 'PPp')}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs truncate" title={msg.sid}>{msg.sid.substring(0,10)}...</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Rows per page:</span>
                  <Select value={messagesPerPage.toString()} onValueChange={handleMessagesPerPageChange}>
                    <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map(val => <SelectItem key={val} value={val.toString()}>{val}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
