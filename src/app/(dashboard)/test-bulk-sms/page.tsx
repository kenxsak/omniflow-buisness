"use client";

import { useState } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { sendBulkSMSViaMSG91Action } from '@/app/actions/msg91-actions';
import { getMSG91TemplatesAction } from '@/app/actions/msg91-actions';

export default function TestBulkSMSPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [var1, setVar1] = useState('');
  const [mappingType, setMappingType] = useState<'static' | 'field'>('static');
  const [fieldName, setFieldName] = useState('name');

  const loadTemplates = async () => {
    if (!appUser?.idToken) return;
    
    try {
      const result = await getMSG91TemplatesAction({ idToken: appUser.idToken });
      if (result.success && result.templates) {
        setTemplates(result.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSendBulk = async () => {
    if (!selectedTemplate) {
      toast({
        title: 'Missing Information',
        description: 'Please select a template',
        variant: 'destructive',
      });
      return;
    }

    if (mappingType === 'static' && !var1.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a variable value for static mapping',
        variant: 'destructive',
      });
      return;
    }

    if (mappingType === 'field' && !fieldName) {
      toast({
        title: 'Missing Information',
        description: 'Please select a contact field for per-recipient mapping',
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
      const template = templates.find(t => t.id === selectedTemplate);
      
      const variableMappings = [{
        position: 1,
        placeholder: '##var1##',
        mappingType: mappingType as 'static' | 'field',
        ...(mappingType === 'static' ? { staticValue: var1 } : { fieldMapping: fieldName })
      }];

      // Test with 2 real contacts
      const mockRecipients = [
        { phone: '919322277736', name: 'Hitesh', email: 'hitesh@example.com' },
        { phone: '919699663636', name: 'Contact2', email: 'contact2@example.com' }
      ];

      const response = await sendBulkSMSViaMSG91Action({
        idToken: appUser.idToken,
        recipients: mockRecipients,
        messageType: 'transactional',
        templateId: template?.templateId,
        dltTemplateId: template?.dltId,
        message: template?.text,
        variableMappings: variableMappings.length > 0 ? variableMappings : undefined,
      });

      setResult(response);

      if (response.success) {
        toast({
          title: '✅ Bulk SMS Sent!',
          description: `${response.sent} sent, ${response.failed || 0} failed`,
        });
      } else {
        toast({
          title: '❌ Failed',
          description: response.error || 'Unknown error',
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
        title="Test Bulk SMS with 2 Contacts"
        subtitle="Test personalized variables with 2 mock contacts"
        icon={Send}
      />

      <Card>
        <CardHeader>
          <CardTitle>Select Template & Variable Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Template</Label>
            <Button onClick={loadTemplates} variant="outline" className="w-full mb-2">
              Load Templates
            </Button>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Variable Type</Label>
            <Select value={mappingType} onValueChange={(val) => setMappingType(val as 'static' | 'field')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">Static (Same for Both)</SelectItem>
                <SelectItem value="field">Per-Recipient (From Field)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mappingType === 'static' && (
            <div>
              <Label>Variable Value (same for all)</Label>
              <Input
                placeholder="e.g., 123456"
                value={var1}
                onChange={(e) => setVar1(e.target.value)}
              />
            </div>
          )}

          {mappingType === 'field' && (
            <div>
              <Label>Contact Field Name</Label>
              <Select value={fieldName} onValueChange={setFieldName}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-2">
                Contact 1 (Hitesh): {fieldName} = "Hitesh"<br/>
                Contact 2: {fieldName} = "Contact2"
              </p>
            </div>
          )}

          <Button onClick={handleSendBulk} disabled={isSending} className="w-full">
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send to 2 Test Contacts
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Success!
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p><strong>Sent:</strong> {result.sent || 0}</p>
            <p><strong>Failed:</strong> {result.failed || 0}</p>
            {result.error && <p><strong>Error:</strong> {result.error}</p>}
            <p><strong>Message ID:</strong> {result.messageId || 'N/A'}</p>
            <p><strong>Cost:</strong> ₹{result.estimatedCost || 0}</p>
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Test Contacts:</strong> Using your 2 real contacts:
          <ul className="list-disc ml-5 mt-2">
            <li>Contact 1: +919322277736 (name: Hitesh)</li>
            <li>Contact 2: +919699663636</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
