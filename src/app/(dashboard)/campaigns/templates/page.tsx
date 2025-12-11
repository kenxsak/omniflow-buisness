'use client';

import { useState } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Mail, MessageSquare, MessageCircle, Info, ArrowLeft, Copy, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  category: 'promotional' | 'transactional' | 'reminder';
  description: string;
  subject: string;
  body: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  category: 'promotional' | 'transactional' | 'reminder' | 'offer';
  description: string;
  dltFormat: string;
  quickSMSFormat: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'promotional' | 'event' | 'offer' | 'update';
  message: string;
  description: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome-email',
    name: 'Welcome New Customer',
    category: 'promotional',
    description: 'Send to new customers to welcome them',
    subject: 'Welcome to [Your Business Name]! Here\'s 15% OFF',
    body: `Hi [Customer Name],\n\nWelcome! We're thrilled to have you on board.\n\nAs a token of our appreciation, enjoy 15% OFF your first purchase with code: WELCOME15\n\nStart shopping: [Website Link]\n\nBest regards,\n[Your Business Name]`
  },
  {
    id: 'order-confirmation-email',
    name: 'Order Confirmation',
    category: 'transactional',
    description: 'Send when customer places an order',
    subject: 'Order Confirmed - Order #[ORDER_ID]',
    body: `Hi [Customer Name],\n\nThank you for your order!\n\nOrder Details:\n- Order ID: [ORDER_ID]\n- Total Amount: [AMOUNT]\n- Expected Delivery: [DELIVERY_DATE]\n\nTrack your order: [Tracking Link]\n\nThank you for shopping with us!\n[Your Business Name]`
  },
  {
    id: 'promotional-email',
    name: 'Special Promotion',
    category: 'promotional',
    description: 'Announce special offers and sales',
    subject: '🔥 Limited Time: [OFFER]% OFF - Today Only!',
    body: `Hi [Customer Name],\n\n🎉 We're having a FLASH SALE!\n\nGet [OFFER]% OFF on [PRODUCT/SERVICE].\n\nThis is a limited-time offer - valid until [DATE].\n\nShop Now: [Website Link]\n\nDon't miss out!\n[Your Business Name]`
  },
  {
    id: 'feedback-email',
    name: 'Feedback Request',
    category: 'transactional',
    description: 'Ask customers for feedback after purchase',
    subject: "We'd love to hear from you!",
    body: `Hi [Customer Name],\n\nThank you for your recent purchase. Your feedback helps us improve!\n\nHow was your experience with us?\n\nShare Your Feedback: [Feedback Link]\n\nAs a token of appreciation, get 10% OFF your next purchase when you share feedback.\n\nThank you!\n[Your Business Name]`
  },
  {
    id: 'appointment-reminder-email',
    name: 'Appointment Reminder',
    category: 'reminder',
    description: 'Remind customers about upcoming appointments',
    subject: 'Reminder: Your appointment on [DATE]',
    body: `Hi [Customer Name],\n\nThis is a friendly reminder about your upcoming appointment.\n\n📅 Date: [DATE]\n⏰ Time: [TIME]\n📍 Location: [ADDRESS]\n\nIf you need to reschedule, please click here: [Reschedule Link]\n\nLooking forward to seeing you!\n[Your Business Name]`
  }
];

const SMS_TEMPLATES: SMSTemplate[] = [
  {
    id: 'flash-sale-sms',
    name: 'Flash Sale Announcement',
    category: 'promotional',
    description: 'Perfect for announcing limited-time sales and special offers',
    dltFormat: '🔥 *FLASH SALE* - Get 50% OFF on all products! Limited time: 24 hours only. Shop now: ##url##. Thank you - ##company##',
    quickSMSFormat: '🔥 Flash Sale! Hi {name}, get 50% OFF now. Limited time only. Shop: [link]. Thank you - Your Business'
  },
  {
    id: 'order-shipped-sms',
    name: 'Order Shipped Update',
    category: 'transactional',
    description: 'Keep customers informed about their order shipment status',
    dltFormat: '📦 ORDER SHIPPED - Your order ##orderno## has been dispatched! Expected delivery: ##date##. Track: ##trackurl##. Thank you!',
    quickSMSFormat: '📦 Hi {name}, your order is on the way! Expected delivery: [date]. Track: [link]. Thank you!'
  },
  {
    id: 'appointment-reminder-sms',
    name: 'Appointment Reminder',
    category: 'reminder',
    description: 'Remind customers about upcoming appointments',
    dltFormat: 'APPOINTMENT REMINDER ⏰ Hi ##name##, your appointment is on ##date## at ##time##. Location: ##location##. Reply to reschedule.',
    quickSMSFormat: '⏰ Hi {name}, reminder: Your appointment is on [date] at [time]. Location: [address]. Reply to reschedule.'
  },
  {
    id: 'discount-offer-sms',
    name: 'Special Discount Offer',
    category: 'offer',
    description: 'Send exclusive discount offers to customers',
    dltFormat: '🎉 SPECIAL OFFER FOR YOU - Get 20% OFF your next purchase! Use code ##code## at checkout. Valid till ##date##. Shop: ##url##',
    quickSMSFormat: '🎉 Hi {name}, exclusive offer! Get 20% OFF. Use code [code]. Valid till [date]. Shop: [link]'
  },
  {
    id: 'welcome-sms',
    name: 'Welcome New Customer',
    category: 'promotional',
    description: 'Welcome new customers with a special offer',
    dltFormat: '👋 WELCOME TO ##COMPANY## - Thank you for joining! Get 15% OFF your first purchase. Use code ##code##. Shop: ##url##',
    quickSMSFormat: '👋 Welcome {name}! Thank you for joining us. Get 15% OFF your first purchase. Code: [code]. Shop: [link]'
  },
  {
    id: 'feedback-sms',
    name: 'Customer Feedback Request',
    category: 'transactional',
    description: 'Collect valuable customer feedback',
    dltFormat: 'FEEDBACK REQUEST 💭 - Hi ##name##, how was your experience? Your feedback helps us improve. Reply with your thoughts.',
    quickSMSFormat: '💭 Hi {name}, we value your feedback! How was your experience? Reply with your thoughts. Thank you!'
  },
  {
    id: 'back-in-stock-sms',
    name: 'Back in Stock Alert',
    category: 'transactional',
    description: 'Notify when out-of-stock items are available again',
    dltFormat: '✨ BACK IN STOCK - Hi ##name##, the ##product## you wanted is available now! Limited qty. Grab it: ##url## - Thank you!',
    quickSMSFormat: '✨ Hi {name}, good news! The item you wanted is back in stock. Limited qty. Grab it now: [link]'
  },
  {
    id: 'seasonal-offer-sms',
    name: 'Seasonal Offer',
    category: 'offer',
    description: 'Special seasonal greetings with offers',
    dltFormat: '🎊 HOLIDAY SPECIAL - Season greetings ##name##! Enjoy 20% OFF. Code ##code##. Valid till ##date##. Shop: ##url##',
    quickSMSFormat: '🎊 Hi {name}, happy holidays! Enjoy 20% OFF. Code [code]. Valid till [date]. Shop: [link]'
  }
];

const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'flash-sale',
    name: 'Flash Sale Announcement',
    category: 'offer',
    message: `Hi *{{name}}*,\n\n🔥 *Flash Sale Alert!*\n\nGet 50% OFF on all products for the next 24 hours only!\n\nDon't miss out on this amazing deal.\n\nShop now: [Your Website Link]\n\nBest regards,\n*Your Business Name*`,
    description: 'Perfect for announcing limited-time sales and special offers'
  },
  {
    id: 'new-product',
    name: 'New Product Launch',
    category: 'promotional',
    message: `Hi *{{name}}*,\n\n🎉 *Exciting News!*\n\nWe just launched our new product and we think you'll love it!\n\nBe among the first to try it out.\n\nLearn more: [Your Website Link]\n\nBest regards,\n*Your Business Name*`,
    description: 'Announce new products or services to your customers'
  },
  {
    id: 'event-invite',
    name: 'Event Invitation',
    category: 'event',
    message: `Hi *{{name}}*,\n\n📅 *You're Invited!*\n\nJoin us for an exclusive event on [Date] at [Time].\n\nLimited spots available - Reserve yours now!\n\nRegister here: [Your Website Link]\n\nSee you there!\n*Your Business Name*`,
    description: 'Invite customers to events, webinars, or special occasions'
  },
  {
    id: 'order-update',
    name: 'Order Status Update',
    category: 'update',
    message: `Hi *{{name}}*,\n\n📦 *Your Order Update*\n\nYour order has been shipped and is on its way!\n\nExpected delivery: [Date]\n\nTrack your order: [Tracking Link]\n\nThank you for shopping with us!\n*Your Business Name*`,
    description: 'Keep customers informed about their order status'
  },
  {
    id: 'appointment-reminder',
    name: 'Appointment Reminder',
    category: 'update',
    message: `Hi *{{name}}*,\n\n⏰ *Reminder*\n\nYour appointment is scheduled for [Date] at [Time].\n\nLocation: [Your Address]\n\nNeed to reschedule? Reply to this message.\n\nLooking forward to seeing you!\n*Your Business Name*`,
    description: 'Remind customers about upcoming appointments'
  },
  {
    id: 'welcome-new',
    name: 'Welcome New Customer',
    category: 'promotional',
    message: `Hi *{{name}}*,\n\n👋 *Welcome to Our Family!*\n\nThank you for joining us. We're excited to have you!\n\nAs a welcome gift, enjoy 15% OFF your first purchase.\n\nCode: WELCOME15\n\nStart shopping: [Your Website Link]\n\nBest regards,\n*Your Business Name*`,
    description: 'Welcome new customers with a special offer'
  },
  {
    id: 'loyalty-reward',
    name: 'Loyalty Reward',
    category: 'offer',
    message: `Hi *{{name}}*,\n\n🌟 *Thank You for Being Loyal!*\n\nAs a valued customer, you've earned a special reward.\n\nEnjoy 30% OFF your next purchase - just for you!\n\nCode: LOYAL30\n\nShop now: [Your Website Link]\n\nWe appreciate you!\n*Your Business Name*`,
    description: 'Reward loyal customers with exclusive offers'
  }
];

export default function TemplatesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('email');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleCopyTemplate = (message: string, templateId: string, formatType?: string) => {
    navigator.clipboard.writeText(message);
    setCopiedId(templateId);
    toast({
      title: 'Template Copied!',
      description: formatType ? `${formatType} format ready to use` : 'Ready to customize'
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const emailCategories = [
    { value: 'all', label: 'All Templates' },
    { value: 'promotional', label: 'Promotional' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'reminder', label: 'Reminders' }
  ];

  const smsCategories = [
    { value: 'all', label: 'All Templates' },
    { value: 'promotional', label: 'Promotional' },
    { value: 'offer', label: 'Special Offers' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'reminder', label: 'Reminders' }
  ];

  const waCategories = [
    { value: 'all', label: 'All Templates' },
    { value: 'promotional', label: 'Promotional' },
    { value: 'offer', label: 'Special Offers' },
    { value: 'event', label: 'Events' },
    { value: 'update', label: 'Updates' }
  ];

  const filteredEmailTemplates = selectedCategory === 'all'
    ? EMAIL_TEMPLATES
    : EMAIL_TEMPLATES.filter(t => t.category === selectedCategory);

  const filteredSMSTemplates = selectedCategory === 'all'
    ? SMS_TEMPLATES
    : SMS_TEMPLATES.filter(t => t.category === selectedCategory);

  const filteredWhatsAppTemplates = selectedCategory === 'all'
    ? WHATSAPP_TEMPLATES
    : WHATSAPP_TEMPLATES.filter(t => t.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'promotional': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'offer': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      'event': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      'update': 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
      'transactional': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'reminder': 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
    };
    return colorMap[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to Campaigns</span>
          </Link>
        </Button>
        <div className="flex-1">
          <PageTitle icon={FileText}>Ready-to-Use Templates</PageTitle>
          <p className="text-muted-foreground mt-2">
            Copy templates for Email, SMS &amp; WhatsApp campaigns. Customize with your details and send!
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* Email Tab */}
        <TabsContent value="email" className="mt-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {emailCategories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4">
            {filteredEmailTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </div>
                    <Badge className={getCategoryColor(template.category)} variant="secondary">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold mb-1">Subject Line:</p>
                    <div className="bg-muted p-2 rounded text-sm">{template.subject}</div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">Email Body:</p>
                    <div className="bg-muted p-3 rounded max-h-40 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-mono">{template.body}</pre>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleCopyTemplate(`Subject: ${template.subject}\n\n${template.body}`, template.id)}
                    className="w-full"
                    variant={copiedId === template.id ? 'default' : 'outline'}
                  >
                    {copiedId === template.id ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Template
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms" className="mt-6 space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Two SMS Formats:</strong> DLT (TRAI-approved) and Quick SMS (no approval needed)
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 flex-wrap">
            {smsCategories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4">
            {filteredSMSTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </div>
                    <Badge className={getCategoryColor(template.category)} variant="secondary">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">DLT Format:</p>
                    <div className="bg-amber-50 dark:bg-amber-950 p-2 rounded text-xs border border-amber-200 dark:border-amber-800">
                      <pre className="whitespace-pre-wrap font-mono">{template.dltFormat}</pre>
                    </div>
                    <Button
                      onClick={() => handleCopyTemplate(template.dltFormat, `${template.id}-dlt`, 'DLT')}
                      size="sm"
                      className="mt-2 w-full"
                      variant={copiedId === `${template.id}-dlt` ? 'default' : 'outline'}
                    >
                      {copiedId === `${template.id}-dlt` ? (
                        <> <Check className="mr-2 h-3 w-3" /> Copied! </>
                      ) : (
                        <> <Copy className="mr-2 h-3 w-3" /> Copy DLT </>
                      )}
                    </Button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Quick SMS:</p>
                    <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded text-xs border border-blue-200 dark:border-blue-800">
                      <pre className="whitespace-pre-wrap font-mono">{template.quickSMSFormat}</pre>
                    </div>
                    <Button
                      onClick={() => handleCopyTemplate(template.quickSMSFormat, `${template.id}-quick`, 'Quick SMS')}
                      size="sm"
                      className="mt-2 w-full"
                      variant={copiedId === `${template.id}-quick` ? 'default' : 'outline'}
                    >
                      {copiedId === `${template.id}-quick` ? (
                        <> <Check className="mr-2 h-3 w-3" /> Copied! </>
                      ) : (
                        <> <Copy className="mr-2 h-3 w-3" /> Copy Quick SMS </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="mt-6 space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Meta Approval Required:</strong> Submit to your WhatsApp BSP provider (WATI, AiSensy, MSG91, etc.)
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 flex-wrap">
            {waCategories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.value)}
              >
                {category.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredWhatsAppTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </div>
                    <Badge className={getCategoryColor(template.category)} variant="secondary">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-muted p-3 rounded max-h-40 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-mono">{template.message}</pre>
                  </div>
                  <Button
                    onClick={() => handleCopyTemplate(template.message, template.id)}
                    className="w-full"
                    variant={copiedId === template.id ? 'default' : 'outline'}
                  >
                    {copiedId === template.id ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Template
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
