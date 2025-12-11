"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCopy, Check, Info, Key, Link2, Code, Zap, Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getVoiceChatConfig } from '@/app/actions/voice-chat-actions';

export default function VoiceChatWebhookGuide() {
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      if (!appUser?.companyId) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const result = await getVoiceChatConfig(appUser.companyId);
        if (result.success && result.config?.webhookToken) {
          setWebhookToken(result.config.webhookToken);
        }
      } catch (error) {
        console.error('Error loading voice chat config:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConfig();
  }, [appUser?.companyId]);

  const webhookUrl = `${baseUrl}/api/webhooks/voice-chat`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ title: 'Copied!', description: 'Copied to clipboard' });
    setTimeout(() => setCopied(null), 2000);
  };

  const samplePayload = {
    contact: {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890"
    },
    card_id: "YOUR_DIGITAL_CARD_ID",
    cardUsername: "your-business",
    conversationId: "conv_12345",
    source: "voice-chat",
    conversation: [
      {
        role: "user",
        message: "Hello, I am interested in your services",
        timestamp: new Date().toISOString()
      },
      {
        role: "bot",
        message: "Great! I would be happy to help. What is your name?",
        timestamp: new Date().toISOString()
      }
    ],
    intent: "inquiry",
    qualified: true,
    language: "en",
    deviceType: "mobile",
    timestamp: new Date().toISOString()
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <CardTitle>Voice Chat AI Webhook Integration</CardTitle>
        </div>
        <CardDescription>
          Configure your Voice Chat AI chatbot to automatically capture leads from digital cards into OmniFlow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>How This Works</AlertTitle>
          <AlertDescription>
            When someone chats with your AI voice chatbot on your digital card, their contact information 
            and conversation are automatically sent to OmniFlow as a new lead. Configure these settings 
            in your Voice Chat AI dashboard.
          </AlertDescription>
        </Alert>

        {!webhookToken && (
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-700 dark:text-amber-300">Setup Required</AlertTitle>
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              Please configure the Voice Chat AI Widget in the "API Integrations" section above first. 
              This will generate your webhook authentication token.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Quick Setup</TabsTrigger>
            <TabsTrigger value="payload">Payload Format</TabsTrigger>
            <TabsTrigger value="test">Test Webhook</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Webhook URL (Enter in Voice Chat AI)
                </Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(webhookUrl, 'url')}
                  >
                    {copied === 'url' ? <Check className="h-4 w-4 text-green-500" /> : <ClipboardCopy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter this URL in your Voice Chat AI webhook configuration settings
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Authentication Token
                </Label>
                <div className="flex gap-2">
                  <Input 
                    value={webhookToken || 'Not configured - set up Voice Chat AI first'} 
                    readOnly 
                    className="font-mono text-sm"
                    type={webhookToken ? "text" : "password"}
                  />
                  {webhookToken && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(webhookToken, 'token')}
                    >
                      {copied === 'token' ? <Check className="h-4 w-4 text-green-500" /> : <ClipboardCopy className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {webhookToken 
                    ? "Use this token for authentication in Voice Chat AI webhook settings"
                    : "Configure Voice Chat AI Widget above to generate your authentication token"
                  }
                </p>
              </div>

              {webhookToken && (
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium">Authentication Options (choose one)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary">Option 1</Badge>
                      <div>
                        <p className="font-medium">Bearer Token (Recommended)</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                          Authorization: Bearer {webhookToken}
                        </code>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="secondary">Option 2</Badge>
                      <div>
                        <p className="font-medium">Query Parameter</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded block mt-1 break-all">
                          {webhookUrl}?token={webhookToken}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-700 dark:text-blue-300">Important: Digital Card ID</AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-400">
                  Make sure your Voice Chat AI sends the <code className="font-mono">card_id</code> field 
                  with your OmniFlow Digital Card ID. This links conversations to the correct business card.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="payload" className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Expected JSON Payload from Voice Chat AI
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(JSON.stringify(samplePayload, null, 2), 'payload')}
                >
                  {copied === 'payload' ? <Check className="h-4 w-4 mr-1" /> : <ClipboardCopy className="h-4 w-4 mr-1" />}
                  Copy Sample
                </Button>
              </div>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs font-mono max-h-80">
                {JSON.stringify(samplePayload, null, 2)}
              </pre>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Required Fields</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex items-start gap-2 p-2 bg-muted rounded">
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                  <div>
                    <code className="font-mono">contact.name</code>
                    <p className="text-muted-foreground">Full name of the lead</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted rounded">
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                  <div>
                    <code className="font-mono">contact.email</code> or <code className="font-mono">contact.phone</code>
                    <p className="text-muted-foreground">At least one contact method is required</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted rounded">
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                  <div>
                    <code className="font-mono">card_id</code>
                    <p className="text-muted-foreground">Your OmniFlow Digital Card ID</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted rounded">
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                  <div>
                    <code className="font-mono">conversationId</code>
                    <p className="text-muted-foreground">Unique ID for the conversation</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="test" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Check Endpoint Status</Label>
                <div className="flex gap-2">
                  <Input value={`curl ${webhookUrl}`} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(`curl ${webhookUrl}`, 'curl-get')}
                  >
                    {copied === 'curl-get' ? <Check className="h-4 w-4 text-green-500" /> : <ClipboardCopy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Run this command to check if the webhook endpoint is active
                </p>
              </div>

              {webhookToken && (
                <div className="space-y-2">
                  <Label>Test POST Request</Label>
                  <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
{`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${webhookToken}" \\
  -d '${JSON.stringify({
    contact: { name: "Test User", email: "test@example.com" },
    card_id: "YOUR_DIGITAL_CARD_ID",
    conversationId: "test_conv_123",
    source: "voice-chat-test",
    conversation: [{ role: "user", message: "Hello", timestamp: new Date().toISOString() }],
    timestamp: new Date().toISOString()
  })}'`}
                    </pre>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(`curl -X POST ${webhookUrl} -H "Content-Type: application/json" -H "Authorization: Bearer ${webhookToken}" -d '${JSON.stringify(samplePayload)}'`, 'curl-post')}
                  >
                    {copied === 'curl-post' ? <Check className="h-4 w-4 mr-1" /> : <ClipboardCopy className="h-4 w-4 mr-1" />}
                    Copy Test Command
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label>Expected Success Response</Label>
                <pre className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 p-4 rounded-lg text-xs font-mono">
{`{
  "success": true,
  "leadId": "lead_abc123",
  "message": "Lead created successfully from voice chat"
}`}
                </pre>
              </div>

              <div className="space-y-2">
                <Label>Error Response Examples</Label>
                <pre className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-4 rounded-lg text-xs font-mono">
{`// 400 Bad Request
{ "error": "Missing required fields: contact.name and card_id are required" }

// 401 Unauthorized  
{ "error": "Unauthorized: Invalid webhook authentication token" }

// 404 Not Found
{ "error": "Digital Card not found" }`}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
