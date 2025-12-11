'use client';

import { useState } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Upload, 
  Users, 
  ArrowRight, 
  Mail, 
  MessageSquare, 
  Send,
  CheckCircle2,
  FileSpreadsheet,
  Zap,
  Info,
  CreditCard,
  MessageCircle,
  Smartphone,
  Download,
  Star,
  ArrowDownRight
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export default function DataFlowGuidePage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <PageTitle 
        title="Complete Data Flow Guide" 
        description="How your contact data flows through OmniFlow's all-in-one platform"
      />

      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">OmniFlow = Your Single Source of Truth</AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          All contact data lives in OmniFlow CRM. External platforms (Brevo, MSG91, WATI) are tools you use to send campaigns, not databases you sync with.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="step-by-step">Step-by-Step</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="troubleshoot">FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How Data Flows Through OmniFlow</CardTitle>
              <CardDescription>Your complete contact management ecosystem (GoHighLevel alternative for SMEs)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Stage 1: Data Entry - ALL 5 SOURCES */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                    <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Stage 1: Import Into OmniFlow CRM</h3>
                    <p className="text-sm text-muted-foreground">Your central database - everything starts here</p>
                  </div>
                </div>
                <div className="ml-12 space-y-3 border-l-2 border-blue-200 dark:border-blue-800 pl-6 py-2">
                  {/* Digital Card - HIGHLIGHTED */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg border-2 border-purple-200">
                    <div className="flex items-start gap-2">
                      <CreditCard className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-purple-900 dark:text-purple-100">Digital Card Contact Form</p>
                          <Badge className="bg-purple-600">⚡ Key for India</Badge>
                        </div>
                        <p className="text-sm text-purple-800 dark:text-purple-200">Customers submit their details via your Digital Card (90% of businesses in India don't have websites!)</p>
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">Auto-captures: Name, Email, Phone, Message</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Voice Chat AI - HIGHLIGHTED */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-3 rounded-lg border-2 border-green-200">
                    <div className="flex items-start gap-2">
                      <MessageCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-green-900 dark:text-green-100">AI Voice Chatbot (on Digital Card)</p>
                          <Badge className="bg-green-600">24/7 Lead Gen</Badge>
                        </div>
                        <p className="text-sm text-green-800 dark:text-green-200">Visitors chat with your AI, share contact info automatically</p>
                        <div className="flex items-center gap-2 mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">Auto-captures: Name, Phone/Email, Conversation Summary, Lead Score</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CSV Upload */}
                  <div className="flex items-start gap-2">
                    <Upload className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">CSV/Excel Upload</p>
                      <p className="text-sm text-muted-foreground">Bulk import existing contacts with Name, Email, Phone</p>
                    </div>
                  </div>

                  {/* Manual Entry */}
                  <div className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Manual Entry</p>
                      <p className="text-sm text-muted-foreground">Add contacts one by one through the CRM interface</p>
                    </div>
                  </div>

                  {/* One-time Import */}
                  <div className="flex items-start gap-2">
                    <Download className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">One-Time Import from HubSpot/Zoho/Bitrix24</p>
                      <p className="text-sm text-muted-foreground">Migrate existing contacts (use once, then OmniFlow owns the data)</p>
                      <Badge variant="outline" className="mt-1">Migration Only</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>

              {/* Stage 2: Organize Into Lists */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
                    <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Stage 2: Organize Into Messaging Lists</h3>
                    <p className="text-sm text-muted-foreground">Prepare contacts for targeted campaigns</p>
                  </div>
                </div>
                <div className="ml-12 border-l-2 border-orange-200 dark:border-orange-800 pl-6 py-2">
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                    <p className="font-medium text-sm mb-2">One-Click Export from CRM</p>
                    <ol className="text-sm space-y-1 list-decimal list-inside">
                      <li>Select contacts in CRM</li>
                      <li>Click "Add to WhatsApp/SMS List"</li>
                      <li>Choose or create a list</li>
                      <li>Contacts are ready for campaigns ✓</li>
                    </ol>
                    <Alert className="mt-3 bg-green-50 dark:bg-green-900/20 border-green-200">
                      <Star className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-xs">
                        <strong>No re-uploading!</strong> Contacts flow directly from CRM to lists with one click.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-8 w-8 text-muted-foreground animate-pulse" />
              </div>

              {/* Stage 3: Send Campaigns */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full">
                    <Send className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Stage 3: Send Campaigns (One Direction)</h3>
                    <p className="text-sm text-muted-foreground">OmniFlow pushes messages to your customers</p>
                  </div>
                </div>
                <div className="ml-12 grid md:grid-cols-3 gap-4 border-l-2 border-purple-200 dark:border-purple-800 pl-6 py-2">
                  <div className="flex flex-col gap-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <p className="font-medium">Email via Brevo</p>
                    </div>
                    <p className="text-xs text-muted-foreground">OmniFlow → Brevo (sends emails on your behalf)</p>
                    <ArrowDownRight className="h-4 w-4 text-blue-600 mx-auto" />
                    <Link href="/email-marketing">
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        Send Email Campaign
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-col gap-2 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-orange-600" />
                      <p className="font-medium">SMS via MSG91</p>
                    </div>
                    <p className="text-xs text-muted-foreground">OmniFlow → MSG91 (sends SMS on your behalf)</p>
                    <ArrowDownRight className="h-4 w-4 text-orange-600 mx-auto" />
                    <Link href="/sms-bulk-campaigns">
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        Send SMS Campaign
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-col gap-2 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <p className="font-medium">WhatsApp via WATI</p>
                    </div>
                    <p className="text-xs text-muted-foreground">OmniFlow → WATI (sends WhatsApp on your behalf)</p>
                    <ArrowDownRight className="h-4 w-4 text-green-600 mx-auto" />
                    <Link href="/whatsapp-bulk-campaigns">
                      <Button variant="outline" size="sm" className="mt-2 w-full">
                        Send WhatsApp Campaign
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Why This Matters */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-purple-600" />
                Why Digital Cards Are Game-Changing for India
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">90% of small businesses in India don't have websites. Digital Cards solve this:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <span><strong>No website needed:</strong> Share your Digital Card link on WhatsApp, Instagram, Facebook</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <span><strong>24/7 AI chatbot:</strong> Captures leads even when you're sleeping</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <span><strong>Contact form:</strong> Customers can reach you directly from the card</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <span><strong>All leads flow into CRM:</strong> Auto-follow-up with bulk campaigns</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="step-by-step" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete Workflow: Digital Card to Bulk Campaigns</CardTitle>
              <CardDescription>The fastest path to getting customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Create Digital Card */}
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                  <h3 className="font-semibold text-lg">Create Your Digital Card</h3>
                </div>
                <div className="space-y-2 ml-8">
                  <p className="text-sm">Go to <Link href="/digital-card/create" className="text-blue-600 hover:underline font-medium">Digital Cards</Link></p>
                  <p className="text-sm">Fill in your business details, enable Contact Form & Voice Chat AI</p>
                  <p className="text-sm">Share your card link on WhatsApp, Instagram, social media</p>
                  <Alert className="mt-2">
                    <CreditCard className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Every visitor who fills the form or chats with AI becomes a lead in your CRM automatically!
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Step 2: Import Existing Contacts */}
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                  <h3 className="font-semibold text-lg">Import Existing Contacts (Optional)</h3>
                </div>
                <div className="space-y-2 ml-8">
                  <p className="text-sm">Go to <Link href="/crm/leads" className="text-blue-600 hover:underline font-medium">Contacts Table</Link></p>
                  <p className="text-sm">Click <strong>"Download Template"</strong> → Fill Excel with Name, Email, Phone → Upload</p>
                  <p className="text-sm">Or: Click "Import CSV/Excel" to upload your existing contact sheet</p>
                  <Alert className="mt-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      All contacts (Digital Card + CSV) are now in one place - your CRM!
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Step 3: Add to Lists */}
              <div className="border-l-4 border-orange-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                  <h3 className="font-semibold text-lg">Add Contacts to Messaging Lists</h3>
                </div>
                <div className="space-y-2 ml-8">
                  <p className="text-sm">In CRM, select contacts (check the boxes)</p>
                  <p className="text-sm">Click <strong>"Add to WhatsApp/SMS List"</strong></p>
                  <p className="text-sm">Choose or create a list → Done!</p>
                  <Alert className="mt-2 bg-green-50 dark:bg-green-900/20 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-xs">
                      <strong>One-Click Export:</strong> No need to re-upload Excel! Contacts sync instantly.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Step 4: Send Campaigns */}
              <div className="border-l-4 border-purple-500 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                  <h3 className="font-semibold text-lg">Send Bulk Campaigns</h3>
                </div>
                <div className="space-y-3 ml-8">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Campaign (Brevo)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Email Marketing → Create Campaign → Compose & Send
                    </p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS Campaign (MSG91)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      SMS Bulk Campaigns → Select List → Compose & Send
                    </p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                    <p className="font-medium text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp Campaign (WATI)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      WhatsApp Bulk Campaigns → Select List → Choose Template → Send
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Brevo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Brevo
                </CardTitle>
                <CardDescription>Email campaign execution platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">How it works:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>OmniFlow creates campaigns on Brevo</li>
                    <li>Brevo sends emails on your behalf</li>
                    <li>Track opens, clicks, bounces</li>
                    <li><strong>One-way push:</strong> OmniFlow → Brevo only</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Setup:</h4>
                  <p className="text-sm text-muted-foreground">
                    Add Brevo API key in <Link href="/settings?tab=integrations" className="text-blue-600 hover:underline">Settings → Integrations</Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* MSG91 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-orange-600" />
                  MSG91
                </CardTitle>
                <CardDescription>Bulk SMS execution platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">How it works:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>OmniFlow sends SMS via MSG91 API</li>
                    <li>MSG91 delivers to phone numbers</li>
                    <li>Requires DLT template ID (India)</li>
                    <li><strong>One-way push:</strong> OmniFlow → MSG91 only</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Setup:</h4>
                  <p className="text-sm text-muted-foreground">
                    Add MSG91 Auth Key in <Link href="/settings?tab=integrations" className="text-blue-600 hover:underline">Settings → Integrations</Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* WATI */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  WATI
                </CardTitle>
                <CardDescription>WhatsApp Business API execution platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">How it works:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>OmniFlow sends WhatsApp via WATI</li>
                    <li>Use pre-approved Meta templates</li>
                    <li>WATI delivers to WhatsApp numbers</li>
                    <li><strong>One-way push:</strong> OmniFlow → WATI only</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Setup:</h4>
                  <p className="text-sm text-muted-foreground">
                    Add WATI API key & Account URL in <Link href="/settings?tab=integrations" className="text-blue-600 hover:underline">Settings → Integrations</Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* HubSpot/Zoho/Bitrix24 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  HubSpot / Zoho / Bitrix24
                </CardTitle>
                <CardDescription>One-time migration tools</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">How it works:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Import contacts from legacy CRM once</li>
                    <li>After import, OmniFlow owns the data</li>
                    <li>No ongoing sync needed</li>
                    <li><strong>One-time use:</strong> Migration only</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Setup:</h4>
                  <p className="text-sm text-muted-foreground">
                    Add API keys in <Link href="/settings?tab=integrations" className="text-blue-600 hover:underline">Settings → Integrations</Link>, then use CRM → Integrations → Import
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="troubleshoot" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Common Questions & Solutions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-semibold">Q: How do I capture leads from Digital Cards?</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>A:</strong> Enable "Contact Form" and "Voice Chat AI" when creating your Digital Card. Every visitor who fills the form or chats with AI automatically becomes a lead in your CRM. No setup needed - it just works!
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Q: Do I need to upload contacts twice (CRM + WhatsApp lists)?</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>A:</strong> No! Select contacts in CRM, click "Add to WhatsApp/SMS List", choose your list. Done in one click - no re-uploading!
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Q: Does OmniFlow sync with HubSpot/Zoho automatically?</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>A:</strong> No. HubSpot/Zoho/Bitrix24 are one-time migration tools to import your existing contacts. After import, OmniFlow is your single source of truth. This prevents sync conflicts and keeps your data clean.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Q: Where does data from Digital Cards go?</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>A:</strong> Every Digital Card contact form submission and Voice Chat AI conversation automatically creates a lead in your CRM with the source tagged as "Digital Card - Contact Form" or "Digital Card - Voice Chat". You can then add these leads to messaging lists and send bulk campaigns.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Q: Can I use the same contact list for Email, SMS, and WhatsApp?</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>A:</strong> WhatsApp lists work for both SMS and WhatsApp campaigns. For email, use Brevo lists. You can add contacts from CRM to both with one click.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Q: How do I know if my Voice Chat AI is working?</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>A:</strong> Visit your Digital Card in a private browser window and try chatting. If the chatbot responds, it's working! All conversations that capture contact info will show up in your CRM within 1 minute.
                </p>
              </div>

              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Need Help?</AlertTitle>
                <AlertDescription>
                  Start with a small test: Create a Digital Card, fill the contact form yourself, then check if it appears in your CRM. This confirms the full workflow is working!
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Quick Reference: Where Everything Lives</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold mb-2">Lead Generation:</p>
            <ul className="space-y-1">
              <li>• <Link href="/digital-card/create" className="text-blue-600 hover:underline">Digital Cards</Link> - Create your online business card</li>
              <li>• <Link href="/crm/leads" className="text-blue-600 hover:underline">CRM → Contacts</Link> - Upload CSV or manual entry</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Contact Management:</p>
            <ul className="space-y-1">
              <li>• <Link href="/crm" className="text-blue-600 hover:underline">CRM Hub</Link> - View all contacts</li>
              <li>• <Link href="/whatsapp-marketing" className="text-blue-600 hover:underline">WhatsApp Marketing</Link> - Manage lists</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Send Campaigns:</p>
            <ul className="space-y-1">
              <li>• <Link href="/email-marketing" className="text-blue-600 hover:underline">Email Marketing</Link> - Brevo campaigns</li>
              <li>• <Link href="/sms-bulk-campaigns" className="text-blue-600 hover:underline">SMS Bulk Campaigns</Link> - MSG91 campaigns</li>
              <li>• <Link href="/whatsapp-bulk-campaigns" className="text-blue-600 hover:underline">WhatsApp Bulk Campaigns</Link> - WATI campaigns</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Setup:</p>
            <ul className="space-y-1">
              <li>• <Link href="/settings?tab=integrations" className="text-blue-600 hover:underline">Settings → Integrations</Link> - API keys</li>
              <li>• Check Brevo/MSG91/WATI dashboards for delivery reports</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
