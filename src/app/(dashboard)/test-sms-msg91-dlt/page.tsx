"use client";

import { useState, useEffect } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, CheckCircle, AlertTriangle, MessageSquare, RefreshCw, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import type { MSG91Template } from '@/app/actions/msg91-actions';

export default function TestMSG91Page() {
  const { toast } = useToast();
  const { appUser, company } = useAuth();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [dltTemplateId, setDltTemplateId] = useState('');
  const [var1, setVar1] = useState(''); // First variable (Name)
  const [var2, setVar2] = useState(''); // Second variable (URL/Link)
  const [var3, setVar3] = useState(''); // Third variable (Discount/Offer)
  const [messageType, setMessageType] = useState<'transactional' | 'promotional'>('transactional');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [savedTemplates, setSavedTemplates] = useState<MSG91Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedSavedTemplate, setSelectedSavedTemplate] = useState<string>('');
  const [selectedTemplateData, setSelectedTemplateData] = useState<MSG91Template | null>(null);

  useEffect(() => {
    if (appUser?.idToken) {
      loadSavedTemplates();
    }
  }, [appUser?.idToken]);

  const loadSavedTemplates = async () => {
    if (!appUser?.idToken) return;
    
    setIsLoadingTemplates(true);
    try {
      const { getMSG91TemplatesAction } = await import('@/app/actions/msg91-actions');
      const result = await getMSG91TemplatesAction({ idToken: appUser.idToken });
      
      if (result.success && result.templates) {
        setSavedTemplates(result.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = (templateInternalId: string) => {
    setSelectedSavedTemplate(templateInternalId);
    
    if (templateInternalId === 'manual') {
      setTemplateId('');
      setDltTemplateId('');
      setSelectedTemplateData(null);
      return;
    }
    
    const template = savedTemplates.find(t => t.id === templateInternalId);
    if (template) {
      setTemplateId(template.templateId);
      setDltTemplateId(template.dltId);
      setMessageType(template.type);
      setSelectedTemplateData(template);
      
      toast({
        title: 'Template Selected',
        description: `Using "${template.name}" - ${template.variables?.length || 0} variable(s)`,
      });
    }
  };

  const handleSendTest = async () => {
    if (!phoneNumber.trim() || !templateId.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter both phone number and MSG91 Template ID',
        variant: 'destructive',
      });
      return;
    }

    if (!appUser?.idToken) {
      toast({
        title: 'Authentication Error',
        description: 'Please log in first',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const { sendBulkSMSViaMSG91Action } = await import('@/app/actions/msg91-actions');
      
      // Build variableMappings based on which variable fields have values
      // This works regardless of whether user selected template or entered ID manually
      const variableMappings = [];
      
      if (var1 && var1.trim() !== '') {
        variableMappings.push({ position: 1, placeholder: '##var1##', mappingType: 'static' as const, staticValue: var1 });
      }
      if (var2 && var2.trim() !== '') {
        variableMappings.push({ position: 2, placeholder: '##var2##', mappingType: 'static' as const, staticValue: var2 });
      }
      if (var3 && var3.trim() !== '') {
        variableMappings.push({ position: 3, placeholder: '##var3##', mappingType: 'static' as const, staticValue: var3 });
      }

      const response = await sendBulkSMSViaMSG91Action({
        idToken: appUser.idToken,
        recipients: [{ phone: phoneNumber, name: var1 || 'User' }],
        messageType,
        templateId,
        dltTemplateId: dltTemplateId || templateId,
        message: selectedTemplateData?.text,  // Pass template text for manual substitution!
        variableMappings: variableMappings.length > 0 ? variableMappings : undefined,
      });

      setResult(response);

      if (response.success) {
        toast({
          title: '✅ Test SMS Sent!',
          description: `Message sent successfully. Request ID: ${response.requestId || 'N/A'}`,
        });
      } else {
        toast({
          title: '❌ Failed to Send',
          description: response.error || 'Unknown error occurred',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult({ success: false, error: errorMessage });
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle
        title="Test MSG91 DLT"
        subtitle="Test your approved transactional MSG91 template before sending bulk campaigns"
        icon={MessageSquare}
      />

      {!company?.apiKeys?.msg91 && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">MSG91 Setup Required</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              To test MSG91 SMS, you need to connect your MSG91 account first.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/settings?tab=integrations">Configure MSG91 in Settings</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-900 dark:text-red-100">⚠️ TRAI Timing Restriction</AlertTitle>
        <AlertDescription className="space-y-2 text-sm text-red-800 dark:text-red-200">
          <p><strong>Promotional SMS can only be sent between 10:00 AM - 9:00 PM IST</strong></p>
          <p>Messages sent outside this window will be rejected with error code 651 "Blocked Promo Hours"</p>
          <p>✓ <strong>Transactional SMS:</strong> No timing restrictions - safe to send anytime</p>
          <p>💡 Use <strong>Transactional</strong> route if you need to send outside 10 AM - 9 PM</p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send Test SMS
          </CardTitle>
          <CardDescription>
            Test your MSG91 DLT template with a single number before bulk sending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              placeholder="e.g., 919876543210 or +919876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              type="tel"
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">10-digit with or without +91 country code</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="messageType">Message Type</Label>
            <Select value={messageType} onValueChange={(v) => setMessageType(v as 'transactional' | 'promotional')}>
              <SelectTrigger id="messageType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transactional">
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                    Transactional (Account updates, OTPs, Confirmations)
                  </span>
                </SelectItem>
                <SelectItem value="promotional">Promotional (Marketing, Offers)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {messageType === 'transactional' 
                ? 'For transactional messages - faster delivery, no scheduling limits' 
                : 'For promotional offers - requires DLT approval'}
            </p>
          </div>

          {savedTemplates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="savedTemplate">Select Saved Template</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={loadSavedTemplates}
                  disabled={isLoadingTemplates}
                  className="h-6 px-2 text-xs"
                >
                  {isLoadingTemplates ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Select value={selectedSavedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger id="savedTemplate">
                  <SelectValue placeholder="Select a saved template or enter manually..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      Enter Template ID Manually
                    </span>
                  </SelectItem>
                  {savedTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1">
                          {template.type === 'transactional' ? 'TXN' : 'PROMO'}
                        </Badge>
                        {template.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a previously saved template to auto-fill IDs
              </p>
            </div>
          )}

          {savedTemplates.length === 0 && !isLoadingTemplates && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                No saved templates found. You can add templates in the{' '}
                <Link href="/sms-bulk-campaigns" className="font-medium underline hover:no-underline">
                  SMS Campaigns
                </Link>{' '}
                page, or enter template IDs manually below.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="templateId">MSG91 Template ID *</Label>
            <Input
              id="templateId"
              placeholder="e.g., 6921b592abb2923d9406da22"
              value={templateId}
              onChange={(e) => {
                setTemplateId(e.target.value);
                setSelectedSavedTemplate('manual');
              }}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              Found in MSG91 Dashboard → Templates → Click your template → Copy "Template ID" (NOT the Flow ID)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dltTemplateId">TRAI DLT Template ID (Optional)</Label>
            <Input
              id="dltTemplateId"
              placeholder="e.g., 11071683008307668847"
              value={dltTemplateId}
              onChange={(e) => setDltTemplateId(e.target.value)}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              The TRAI DLT approval ID. If not provided, the Template ID will be used.
            </p>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 space-y-2">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">💡 Route Selection</p>
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <p>
                <strong>Transactional:</strong> Same template, sent 24/7 (no timing restrictions)
              </p>
              <p>
                <strong>Promotional:</strong> Same template, sent only 10 AM - 9 PM IST (TRAI requirement)
              </p>
            </div>
          </div>

          <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200">
            <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">Template Variables ({selectedTemplateData?.variables?.length || 0} variable{(selectedTemplateData?.variables?.length || 0) !== 1 ? 's' : ''})</p>
            
            {selectedTemplateData?.variables && selectedTemplateData.variables.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="var1">Variable 1: {selectedTemplateData.variables[0]?.description || 'Value'} *</Label>
                <Input
                  id="var1"
                  placeholder="Enter variable value..."
                  value={var1}
                  onChange={(e) => setVar1(e.target.value.slice(0, 30))}
                  disabled={isSending}
                  maxLength={30}
                />
              </div>
            )}

            {selectedTemplateData?.variables && selectedTemplateData.variables.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="var2">Variable 2: {selectedTemplateData.variables[1]?.description || 'Value'} *</Label>
                <Input
                  id="var2"
                  placeholder="Enter variable value..."
                  value={var2}
                  onChange={(e) => setVar2(e.target.value.slice(0, 50))}
                  disabled={isSending}
                  maxLength={50}
                />
              </div>
            )}

            {selectedTemplateData?.variables && selectedTemplateData.variables.length > 2 && (
              <div className="space-y-2">
                <Label htmlFor="var3">Variable 3: {selectedTemplateData.variables[2]?.description || 'Value'} *</Label>
                <Input
                  id="var3"
                  placeholder="Enter variable value..."
                  value={var3}
                  onChange={(e) => setVar3(e.target.value.slice(0, 30))}
                  disabled={isSending}
                  maxLength={30}
                />
              </div>
            )}
          </div>

          {selectedTemplateData && (
            <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-100">📝 Message Preview</p>
              <div className="p-3 bg-white dark:bg-slate-950 rounded border border-amber-200 dark:border-amber-700">
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                  {selectedTemplateData.text
                    .replace(/##var1##/g, var1 || '{{variable 1}}')
                    .replace(/##var2##/g, var2 || '{{variable 2}}')
                    .replace(/##var3##/g, var3 || '{{variable 3}}')}
                </p>
              </div>
            </div>
          )}

          <Button
            onClick={handleSendTest}
            disabled={isSending || !phoneNumber || !templateId}
            className="w-full min-h-11"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Test...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Test SMS
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className={result.success ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {result.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-900 dark:text-green-100">Test Sent Successfully!</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-red-900 dark:text-red-100">Failed to Send</span>
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {result.success ? (
                <>
                  <p className="text-green-800 dark:text-green-200">
                    ✓ Your test SMS has been queued for delivery
                  </p>
                  <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                    {result.requestId && <p>Request ID: {result.requestId}</p>}
                    {result.messageId && <p>Message ID: {result.messageId}</p>}
                    <p>Check your phone in the next few moments</p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-red-800 dark:text-red-200">
                    ✗ {result.error || 'Unknown error occurred'}
                  </p>
                  <div className="text-xs text-red-700 dark:text-red-300 mt-2">
                    <p>Common issues:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>Invalid DLT Template ID</li>
                      <li>Phone number format incorrect</li>
                      <li>MSG91 account not properly configured</li>
                      <li>Template not approved in MSG91 dashboard</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="text-base">How to Use & Troubleshoot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">✓ How to Send</p>
            <ol className="list-decimal ml-4 space-y-1 text-sm text-blue-900 dark:text-blue-100">
              <li>Go to MSG91 Dashboard → Templates → Click your template</li>
              <li>Copy the <strong>Template ID</strong> (alphanumeric code like 692479929146c72555716eea)</li>
              <li>Paste it in the "MSG91 Template ID" field above</li>
              <li>Optionally add TRAI DLT Template ID if you have it</li>
              <li>Enter your phone number</li>
              <li>Select route:
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li><strong>Transactional:</strong> Send anytime (24/7)</li>
                  <li><strong>Promotional:</strong> Send only 10 AM - 9 PM IST</li>
                </ul>
              </li>
              <li>Click "Send Test SMS"</li>
            </ol>
          </div>

          <Alert className="bg-white dark:bg-blue-950 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
              <p><strong>💡 Pro Tip: Avoid Timing Issues</strong></p>
              <p className="mt-2">If you keep getting "Blocked Promo Hours" errors:</p>
              <ul className="list-disc ml-4 space-y-1 mt-1">
                <li>Use <strong>Transactional route</strong> - works 24/7, no template ID needed</li>
                <li>Or use <strong>Promotional route</strong> but only send between 10 AM - 9 PM IST</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
