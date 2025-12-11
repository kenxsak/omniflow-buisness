'use client';

import { useState, useEffect } from 'react';
import PageTitle from '@/components/ui/page-title';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsTrigger, TabsList } from '@/components/ui/tabs';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { testFast2SMSDLTAction, testFast2SMSBulkDLTAction } from '@/app/actions/test-sms-actions';
import { getWhatsAppLists, getWhatsAppContacts } from '@/lib/whatsapp-marketing-data';
import type { WhatsAppList } from '@/types/whatsapp';

interface SingleTestResponse {
  success: boolean;
  requestId?: string;
  message?: string[];
  smsCount?: number;
  apiResponse?: any;
  error?: string;
}

interface BulkTestResult {
  phone: string;
  name: string;
  success: boolean;
  requestId?: string;
  error?: string;
}

export default function TestSMSPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  
  // Single SMS test state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [singleTemplateId, setSingleTemplateId] = useState('203449');
  const [singleVariables, setSingleVariables] = useState('');
  const [isSendingSingle, setIsSendingSingle] = useState(false);
  const [singleTestResponse, setSingleTestResponse] = useState<SingleTestResponse | null>(null);

  // Bulk test state
  const [contactLists, setContactLists] = useState<WhatsAppList[]>([]);
  const [selectedListId, setSelectedListId] = useState('');
  const [bulkTemplateId, setBulkTemplateId] = useState('203449');
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [bulkResults, setBulkResults] = useState<BulkTestResult[] | null>(null);
  const [contactCount, setContactCount] = useState(0);

  // Load contact lists on mount
  useEffect(() => {
    const loadLists = async () => {
      if (!appUser?.companyId) return;
      try {
        const lists = await getWhatsAppLists(appUser.companyId);
        setContactLists(lists);
      } catch (error) {
        console.error('Error loading contact lists:', error);
      } finally {
        setIsLoadingLists(false);
      }
    };

    loadLists();
  }, [appUser?.companyId]);

  // Update contact count when list is selected
  useEffect(() => {
    const selected = contactLists.find(l => l.id === selectedListId);
    setContactCount(selected?.contactCount || 0);
  }, [selectedListId, contactLists]);

  // Single SMS test handler
  const handleSendSingleTest = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a phone number',
        variant: 'destructive',
      });
      return;
    }

    if (!singleTemplateId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a template ID',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingSingle(true);

    try {
      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;

      if (!currentUser) {
        toast({
          title: 'Error',
          description: 'You must be logged in',
          variant: 'destructive',
        });
        setIsSendingSingle(false);
        return;
      }

      const idToken = await currentUser.getIdToken();

      const result = await testFast2SMSDLTAction({
        idToken,
        phoneNumber,
        templateId: singleTemplateId,
        variables: singleVariables,
      });

      setSingleTestResponse(result);

      if (result.success) {
        toast({
          title: 'Success!',
          description: `SMS sent successfully. Request ID: ${result.requestId}`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to send SMS',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setSingleTestResponse({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsSendingSingle(false);
    }
  };

  // Bulk test handler
  const handleSendBulkTest = async () => {
    if (!selectedListId) {
      toast({
        title: 'Error',
        description: 'Please select a contact list',
        variant: 'destructive',
      });
      return;
    }

    if (!bulkTemplateId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a template ID',
        variant: 'destructive',
      });
      return;
    }

    if (!appUser?.companyId || !appUser?.idToken) {
      toast({
        title: 'Error',
        description: 'Authentication required',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingBulk(true);
    setBulkResults(null);

    try {
      const contacts = await getWhatsAppContacts(selectedListId, appUser.companyId);

      if (contacts.length === 0) {
        toast({
          title: 'No Contacts',
          description: 'The selected list has no contacts to test',
          variant: 'destructive',
        });
        setIsSendingBulk(false);
        return;
      }

      const result = await testFast2SMSBulkDLTAction({
        idToken: appUser.idToken,
        recipients: contacts.map(c => ({
          phone: c.phoneNumber,
          name: c.name
        })),
        templateId: bulkTemplateId
      });

      setBulkResults(result.results);

      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        toast({
          title: 'Test SMS Sent!',
          description: `Successfully sent to ${successCount}/${result.results.length} contacts with personalized names`,
        });
      } else {
        toast({
          title: 'Partial Success',
          description: result.error || 'Some messages failed to send',
          variant: result.results.every(r => !r.success) ? 'destructive' : 'default',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSendingBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle 
        title="Test Fast2SMS DLT Templates" 
        subtitle="Test SMS delivery with variable substitution before bulk campaigns"
      />

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="single">Single Test</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Test</TabsTrigger>
        </TabsList>

        {/* Single SMS Test Tab */}
        <TabsContent value="single" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send Single Test SMS</CardTitle>
                  <CardDescription>
                    Test with a specific phone number and custom variable value
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Info Alert */}
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900">Manual Testing</AlertTitle>
                    <AlertDescription className="text-blue-800">
                      Enter a phone number and variable value to test your template manually. Perfect for quick verification.
                    </AlertDescription>
                  </Alert>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="e.g., 919876543210 or 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={isSendingSingle}
                      type="tel"
                    />
                    <p className="text-sm text-gray-500">
                      Enter 10-digit Indian mobile number (with or without +91)
                    </p>
                  </div>

                  {/* Template ID */}
                  <div className="space-y-2">
                    <Label htmlFor="singleTemplateId">Template ID *</Label>
                    <Input
                      id="singleTemplateId"
                      placeholder="e.g., 203449"
                      value={singleTemplateId}
                      onChange={(e) => setSingleTemplateId(e.target.value)}
                      disabled={isSendingSingle}
                    />
                    <p className="text-sm text-gray-500">
                      Your approved DLT template ID from Fast2SMS dashboard
                    </p>
                  </div>

                  {/* Variables */}
                  <div className="space-y-2">
                    <Label htmlFor="variables">Variable Value (Replace {"{#var#}"})</Label>
                    <Input
                      id="variables"
                      placeholder="e.g., 987654 or John Doe"
                      value={singleVariables}
                      onChange={(e) => setSingleVariables(e.target.value)}
                      disabled={isSendingSingle}
                    />
                    <p className="text-sm text-gray-500">
                      Enter the value to replace {"{#var#}"} in the template. Examples: OTP code, customer name, or order ID.
                    </p>
                  </div>

                  {/* Preview */}
                  {singleVariables && (
                    <div className="space-y-2">
                      <Label>Final Message Preview</Label>
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <p className="text-sm text-gray-900">
                          {singleVariables} is your One Time Password (OTP) for Registration. Team Techmandala
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                          {singleVariables.length}/30 characters used
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Send Button */}
                  <Button
                    onClick={handleSendSingleTest}
                    disabled={isSendingSingle || !phoneNumber || !singleTemplateId}
                    className="w-full"
                    size="lg"
                  >
                    {isSendingSingle ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Test SMS
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Info Panel */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">✓ Template</p>
                    <Badge variant="outline" className="mt-1">203449</Badge>
                    <p className="text-gray-600 text-xs mt-1">Transactional OTP</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">✓ Sender ID</p>
                    <Badge variant="outline" className="mt-1">Posble</Badge>
                    <p className="text-gray-600 text-xs mt-1">Pre-configured</p>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <p className="font-semibold text-gray-900">Template Variables</p>
                    <div className="bg-gray-50 p-3 rounded space-y-2">
                      <p className="text-xs text-gray-600 font-mono">{"{#var#}"}</p>
                      <p className="text-xs text-gray-700">= Max 30 characters</p>
                      <p className="text-xs text-gray-600 mt-2">Examples:</p>
                      <ul className="text-xs text-gray-600 space-y-1 ml-2">
                        <li>• 987654 (OTP code)</li>
                        <li>• John Doe (name)</li>
                        <li>• ORDER123 (ID)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Single Test Response */}
          {singleTestResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {singleTestResponse.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-600">Test Successful</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-600">Test Failed</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {singleTestResponse.success ? (
                  <>
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-900">SMS Sent Successfully</AlertTitle>
                      <AlertDescription className="text-green-800">
                        Your test SMS has been queued with Fast2SMS. Check your phone for delivery.
                      </AlertDescription>
                    </Alert>

                    {singleTestResponse.requestId && (
                      <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                        <p className="text-gray-600 mb-1">Request ID:</p>
                        <p className="text-gray-900 break-all">{singleTestResponse.requestId}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Sending SMS</AlertTitle>
                    <AlertDescription>{singleTestResponse.error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bulk Test Tab */}
        <TabsContent value="bulk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send Personalized Bulk Test</CardTitle>
                  <CardDescription>
                    Automatically loads contact names and sends personalized SMS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Info Alert */}
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900">Personalization Testing</AlertTitle>
                    <AlertDescription className="text-blue-800">
                      Select a contact list. System automatically loads contact names and sends personalized SMS where {"{#var#}"} is replaced with each contact's name.
                    </AlertDescription>
                  </Alert>

                  {/* Contact List Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="contactList">Select Contact List *</Label>
                    <Select value={selectedListId} onValueChange={setSelectedListId} disabled={isSendingBulk}>
                      <SelectTrigger id="contactList">
                        <SelectValue placeholder="Choose a contact list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingLists ? (
                          <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                        ) : contactLists.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">
                            No contact lists found. Create one in WhatsApp Marketing first.
                          </div>
                        ) : (
                          contactLists.map((list) => (
                            <SelectItem key={list.id} value={list.id}>
                              {list.name} ({list.contactCount || 0} contacts)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {contactCount > 0 && (
                      <p className="text-sm text-green-600 font-medium">
                        ✓ {contactCount} contacts ready
                      </p>
                    )}
                  </div>

                  {/* Template ID */}
                  <div className="space-y-2">
                    <Label htmlFor="bulkTemplateId">Template ID *</Label>
                    <Input
                      id="bulkTemplateId"
                      placeholder="e.g., 203449"
                      value={bulkTemplateId}
                      onChange={(e) => setBulkTemplateId(e.target.value)}
                      disabled={isSendingBulk}
                    />
                    <p className="text-sm text-gray-500">
                      Your approved DLT template ID
                    </p>
                  </div>

                  {/* Send Button */}
                  <Button
                    onClick={handleSendBulkTest}
                    disabled={isSendingBulk || !selectedListId || !bulkTemplateId || contactCount === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isSendingBulk ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending to {contactCount} contacts...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Personalized Test SMS
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Info Panel */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">How It Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">1. Select List</p>
                    <p className="text-gray-600 text-xs">Choose a contact list with names</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">2. Auto Load</p>
                    <p className="text-gray-600 text-xs">System loads all contact names</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">3. Send SMS</p>
                    <p className="text-gray-600 text-xs">Each contact gets personalized SMS</p>
                  </div>

                  <div className="pt-4 border-t space-y-3">
                    <p className="font-semibold text-gray-900">📋 Example</p>
                    <div className="bg-gray-50 p-3 rounded space-y-2">
                      <p className="text-xs font-mono text-gray-700">John</p>
                      <p className="text-xs text-gray-600">→</p>
                      <p className="text-xs font-mono text-gray-700">"John is your OTP..."</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bulk Results Table */}
          {bulkResults && bulkResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>
                  Personalized SMS sent to {bulkResults.length} contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact Name</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Request ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkResults.map((result, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{result.name}</TableCell>
                          <TableCell>{result.phone}</TableCell>
                          <TableCell>
                            {result.success ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sent
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-500">
                            {result.success ? (result.requestId || '-') : result.error}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ {bulkResults.filter(r => r.success).length} of {bulkResults.length} SMS delivered
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
