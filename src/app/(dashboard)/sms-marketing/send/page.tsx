
"use client";

import PageTitle from '@/components/ui/page-title';
import SendSmsForm from '@/components/sms/SendSmsForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SendNewSmsPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/sms-marketing">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to SMS Marketing</span>
            </Link>
          </Button>
          <PageTitle 
            title="Send New SMS" 
            description="Compose and send an SMS message via Twilio. Use AI to help draft your message."
        />
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Compose SMS</CardTitle>
            <CardDescription>
                Fill in the details below to send an SMS. This will use your configured Twilio credentials.
                Ensure your Twilio 'From' number is set in Settings or the .env file.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <SendSmsForm />
        </CardContent>
      </Card>
    </div>
  );
}
