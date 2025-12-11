'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createDigitalCard } from '@/app/actions/digital-card-actions';
import { CreateDigitalCardInput, DigitalCardLink } from '@/lib/digital-card-types';
import { AlertCircle, Plus, Trash2, GripVertical, Eye, Bot, MessageSquare } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ColorExtractor } from '@/components/digital-card/color-extractor';

export default function CreateDigitalCardPage() {
  const router = useRouter();
  const { appUser, company, firebaseUser } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CreateDigitalCardInput>>({
    username: '',
    userId: appUser?.uid || '',
    companyId: company?.id || '',
    businessInfo: {
      name: '',
      tagline: '',
      description: '',
      logo: '',
      coverImage: '',
      category: ''
    },
    contact: {
      phone: '',
      email: '',
      whatsapp: '',
      address: ''
    },
    links: [],
    socialMedia: {},
    contactForm: {
      enabled: true,
      buttonText: 'Contact Us',
      title: 'Get in Touch',
      description: "Send us a message and we'll get back to you soon!"
    },
    voiceChatbot: {
      enabled: false,
      customGreeting: '',
      position: 'right',
    },
    branding: {
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      fontFamily: 'Inter',
      theme: 'modern'
    },
    seo: {
      title: '',
      description: '',
      keywords: []
    },
    status: 'draft'
  });

  const handleSubmit = async (isDraft: boolean = true) => {
    setError(null);
    setSaving(true);

    try {
      if (!appUser || !company || !firebaseUser) {
        setError('Please log in to create a digital card');
        return;
      }

      if (!formData.username || !formData.businessInfo?.name) {
        setError('Please fill in required fields: Username and Name');
        return;
      }

      const idToken = await firebaseUser.getIdToken();

      const cardData: CreateDigitalCardInput = {
        ...formData as CreateDigitalCardInput,
        userId: appUser.uid,
        companyId: company.id,
        status: isDraft ? 'draft' : 'active'
      };

      const result = await createDigitalCard({
        idToken,
        input: cardData
      });

      if (!result.success) {
        setError(result.error || 'Failed to create digital card');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/digital-card/manage`);
      }, 1500);
    } catch (err) {
      console.error('Error creating digital card:', err);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const addLink = () => {
    const newLink: DigitalCardLink = {
      id: `link_${Date.now()}`,
      type: 'custom',
      label: 'New Link',
      url: '',
      icon: 'link',
      enabled: true,
      order: (formData.links?.length || 0) + 1
    };
    
    setFormData({
      ...formData,
      links: [...(formData.links || []), newLink]
    });
  };

  const updateLink = (index: number, updates: Partial<DigitalCardLink>) => {
    const updatedLinks = [...(formData.links || [])];
    updatedLinks[index] = { ...updatedLinks[index], ...updates };
    setFormData({ ...formData, links: updatedLinks });
  };

  const removeLink = (index: number) => {
    const updatedLinks = formData.links?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, links: updatedLinks });
  };

  if (!appUser || !company) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please log in to create a digital card</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Digital Card</h1>
        <p className="text-muted-foreground mt-2">
          Create your digital business card - a beautiful landing page for your business
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 text-green-900 border-green-200">
          <AlertDescription>Digital card created successfully! Redirecting...</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="lead-capture">Lead Capture</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Tell people about yourself or your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username (URL) *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">omniflow.app/card/</span>
                  <Input
                    id="username"
                    placeholder="your-name-or-business"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Use only lowercase letters, numbers, and hyphens</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessName">Name *</Label>
                <Input
                  id="businessName"
                  placeholder="Your Name or Business Name"
                  value={formData.businessInfo?.name}
                  onChange={(e) => setFormData({
                    ...formData,
                    businessInfo: { ...formData.businessInfo!, name: e.target.value }
                  })}
                  required
                />
                <p className="text-xs text-muted-foreground">Your personal name, business name, or brand name</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Professional Title / Tagline</Label>
                <Input
                  id="tagline"
                  placeholder={
                    formData.businessInfo?.category === 'Freelancer' || 
                    formData.businessInfo?.category === 'Professional' || 
                    formData.businessInfo?.category === 'Creator/Influencer'
                      ? 'Digital Marketing Consultant'
                      : 'Best Coffee in Mumbai'
                  }
                  value={formData.businessInfo?.tagline}
                  onChange={(e) => setFormData({
                    ...formData,
                    businessInfo: { ...formData.businessInfo!, tagline: e.target.value }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  For personal: "Digital Marketing Consultant" | For business: "Best Coffee in Mumbai"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell people about yourself or your business..."
                  rows={4}
                  value={formData.businessInfo?.description}
                  onChange={(e) => setFormData({
                    ...formData,
                    businessInfo: { ...formData.businessInfo!, description: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.businessInfo?.category}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    businessInfo: { ...formData.businessInfo!, category: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Services">Services</SelectItem>
                    <SelectItem value="Health & Beauty">Health & Beauty</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Real Estate">Real Estate</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Creator/Influencer">Creator/Influencer</SelectItem>
                    <SelectItem value="Freelancer">Freelancer</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Profile Image / Logo URL</Label>
                <Input
                  id="logo"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={formData.businessInfo?.logo}
                  onChange={(e) => setFormData({
                    ...formData,
                    businessInfo: { ...formData.businessInfo!, logo: e.target.value }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Your photo or business logo. Recommended: <strong>400 x 400px</strong> (square, PNG or JPG)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverImage">Cover Image / Banner URL</Label>
                <Input
                  id="coverImage"
                  type="url"
                  placeholder="https://example.com/cover.jpg"
                  value={formData.businessInfo?.coverImage}
                  onChange={(e) => setFormData({
                    ...formData,
                    businessInfo: { ...formData.businessInfo!, coverImage: e.target.value }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: <strong>780 x 300px</strong> (or 1560 x 600px for high-res). Keep text minimal for best display across devices.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How can people reach you?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={formData.contact?.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact: { ...formData.contact!, phone: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@mybusiness.com"
                  value={formData.contact?.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact: { ...formData.contact!, email: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="+1 555-123-4567"
                  value={formData.contact?.whatsapp}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact: { ...formData.contact!, whatsapp: e.target.value }
                  })}
                />
                <p className="text-xs text-muted-foreground">
                  Enter number with country code (e.g., +1 555-123-4567 or +91 98765 43210)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="123 Main Street, City, Country"
                  rows={3}
                  value={formData.contact?.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact: { ...formData.contact!, address: e.target.value }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links">
          <Card>
            <CardHeader>
              <CardTitle>Action Links</CardTitle>
              <CardDescription>Add buttons that link to your services, products, or booking pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.links && formData.links.length > 0 ? (
                <div className="space-y-3">
                  {formData.links.map((link, index) => (
                    <Card key={link.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          <Select
                            value={link.type}
                            onValueChange={(value) => updateLink(index, { type: value as any })}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone Call</SelectItem>
                              <SelectItem value="website">Website</SelectItem>
                              <SelectItem value="maps">Google Maps</SelectItem>
                              <SelectItem value="calendar">Calendar Booking</SelectItem>
                              <SelectItem value="payment">Payment Link</SelectItem>
                              <SelectItem value="custom">Custom Link</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLink(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                              placeholder={link.type === 'whatsapp' ? 'Chat on WhatsApp' : 'Order Now'}
                              value={link.label}
                              onChange={(e) => updateLink(index, { label: e.target.value })}
                            />
                          </div>
                          
                          {link.type === 'whatsapp' ? (
                            <>
                              <div className="space-y-2">
                                <Label>WhatsApp Number (with country code)</Label>
                                <Input
                                  placeholder="+1 234 567 8900 or 12345678900"
                                  value={link.url.replace('https://wa.me/', '').split('?')[0]}
                                  onChange={(e) => {
                                    const phone = e.target.value.replace(/\D/g, '');
                                    const currentMessage = new URLSearchParams(link.url.split('?')[1] || '').get('text') || '';
                                    const waUrl = phone 
                                      ? `https://wa.me/${phone}${currentMessage ? `?text=${encodeURIComponent(currentMessage)}` : ''}`
                                      : '';
                                    updateLink(index, { url: waUrl });
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Enter number with country code (e.g., 919876543210 for India, 12345678900 for USA)
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label>Pre-filled Message (Optional)</Label>
                                <Textarea
                                  placeholder="Hi! I'd like to know more about..."
                                  rows={2}
                                  value={decodeURIComponent(new URLSearchParams(link.url.split('?')[1] || '').get('text') || '')}
                                  onChange={(e) => {
                                    const phone = link.url.replace('https://wa.me/', '').split('?')[0];
                                    const message = e.target.value;
                                    const waUrl = phone 
                                      ? `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ''}`
                                      : '';
                                    updateLink(index, { url: waUrl });
                                  }}
                                />
                                <p className="text-xs text-muted-foreground">
                                  This message will appear in the chat when someone clicks the button
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-2">
                              <Label>URL</Label>
                              <Input
                                placeholder={
                                  link.type === 'email' ? 'mailto:email@example.com' :
                                  link.type === 'phone' ? 'tel:+1234567890' :
                                  link.type === 'maps' ? 'https://maps.google.com/?q=...' :
                                  'https://...'
                                }
                                value={link.url}
                                onChange={(e) => updateLink(index, { url: e.target.value })}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No links added yet. Click the button below to add your first link.
                </p>
              )}
              
              <Button onClick={addLink} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social">
          <Card>
            <CardHeader>
              <CardTitle>Social Media</CardTitle>
              <CardDescription>Add your social media profiles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">@</span>
                  <Input
                    id="instagram"
                    placeholder="username"
                    value={formData.socialMedia?.instagram}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialMedia: { ...formData.socialMedia!, instagram: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  placeholder="username or page name"
                  value={formData.socialMedia?.facebook}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialMedia: { ...formData.socialMedia!, facebook: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter / X</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">@</span>
                  <Input
                    id="twitter"
                    placeholder="username"
                    value={formData.socialMedia?.twitter}
                    onChange={(e) => setFormData({
                      ...formData,
                      socialMedia: { ...formData.socialMedia!, twitter: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  placeholder="company or profile URL"
                  value={formData.socialMedia?.linkedin}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialMedia: { ...formData.socialMedia!, linkedin: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube">YouTube</Label>
                <Input
                  id="youtube"
                  placeholder="channel URL"
                  value={formData.socialMedia?.youtube}
                  onChange={(e) => setFormData({
                    ...formData,
                    socialMedia: { ...formData.socialMedia!, youtube: e.target.value }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lead-capture">
          <Card>
            <CardHeader>
              <CardTitle>Lead Capture Settings</CardTitle>
              <CardDescription>Configure how visitors can contact you and become leads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Contact Form Section */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 mt-0.5 text-blue-600" />
                    <div>
                      <h3 className="font-semibold mb-1">Contact Form</h3>
                      <p className="text-sm text-muted-foreground">
                        Simple contact form button to capture leads directly into your CRM
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.contactForm?.enabled ?? true}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      contactForm: { ...formData.contactForm!, enabled: checked }
                    })}
                  />
                </div>

                {formData.contactForm?.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="contactButtonText">Button Text</Label>
                      <Input
                        id="contactButtonText"
                        placeholder="Contact Us"
                        value={formData.contactForm?.buttonText || 'Contact Us'}
                        onChange={(e) => setFormData({
                          ...formData,
                          contactForm: { ...formData.contactForm!, buttonText: e.target.value }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactFormTitle">Form Title</Label>
                      <Input
                        id="contactFormTitle"
                        placeholder="Get in Touch"
                        value={formData.contactForm?.title || 'Get in Touch'}
                        onChange={(e) => setFormData({
                          ...formData,
                          contactForm: { ...formData.contactForm!, title: e.target.value }
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactFormDescription">Form Description</Label>
                      <Textarea
                        id="contactFormDescription"
                        placeholder="Send us a message and we'll get back to you soon!"
                        rows={2}
                        value={formData.contactForm?.description || "Send us a message and we'll get back to you soon!"}
                        onChange={(e) => setFormData({
                          ...formData,
                          contactForm: { ...formData.contactForm!, description: e.target.value }
                        })}
                      />
                    </div>

                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        ✓ Contact form submissions automatically create leads in your CRM
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Voice Chatbot Section */}
              <div className="p-4 border rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 mt-0.5 text-purple-600" />
                    <div>
                      <h3 className="font-semibold mb-1">AI Voice Chatbot (109 Languages)</h3>
                      <p className="text-sm text-muted-foreground">
                        Enable your company's Voice Chat AI widget on this digital card
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.voiceChatbot?.enabled || false}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        voiceChatbot: { 
                          ...formData.voiceChatbot!, 
                          enabled: checked
                        }
                      });
                    }}
                  />
                </div>

                {formData.voiceChatbot?.enabled && (
                  <div className="space-y-4 pt-4 border-t">
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-sm text-blue-800">
                        💡 Voice Chat AI is configured company-wide in <strong>Settings → API Integrations</strong>. 
                        Here you can customize how it appears on this specific card.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="voiceChatGreeting">Custom Greeting (Optional)</Label>
                      <Textarea
                        id="voiceChatGreeting"
                        placeholder="Hi! I'm [Your Business Name] AI assistant. How can I help you today?"
                        rows={2}
                        value={formData.voiceChatbot?.customGreeting || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          voiceChatbot: { ...formData.voiceChatbot!, customGreeting: e.target.value }
                        })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Personalize the greeting message for this card. Leave empty to use the default.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="voiceChatPosition">Widget Position</Label>
                      <Select
                        value={formData.voiceChatbot?.position || 'right'}
                        onValueChange={(value: 'left' | 'right') => setFormData({
                          ...formData,
                          voiceChatbot: { ...formData.voiceChatbot!, position: value }
                        })}
                      >
                        <SelectTrigger id="voiceChatPosition">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="right">Bottom Right</SelectItem>
                          <SelectItem value="left">Bottom Left</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose where the chat widget appears on your digital card
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <h4 className="font-medium text-sm text-green-900 mb-2">How it works:</h4>
                      <ul className="text-xs text-green-800 space-y-1">
                        <li>✓ Visitors chat with your AI assistant (voice or text in 109 languages)</li>
                        <li>✓ AI captures contact info and conversation details</li>
                        <li>✓ New leads are automatically created in your CRM</li>
                        <li>✓ Marketing automation follows up automatically</li>
                      </ul>
                    </div>

                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Theme</CardTitle>
              <CardDescription>Customize the look and feel of your digital card</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorExtractor
                logoUrl={formData.businessInfo?.logo || ''}
                onColorsExtracted={(colors) => setFormData({
                  ...formData,
                  branding: {
                    ...formData.branding!,
                    primaryColor: colors.primary,
                    secondaryColor: colors.secondary
                  }
                })}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.branding?.primaryColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...formData.branding!, primaryColor: e.target.value }
                      })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.branding?.primaryColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...formData.branding!, primaryColor: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.branding?.secondaryColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...formData.branding!, secondaryColor: e.target.value }
                      })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.branding?.secondaryColor}
                      onChange={(e) => setFormData({
                        ...formData,
                        branding: { ...formData.branding!, secondaryColor: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">Theme Style</Label>
                <Select
                  value={formData.branding?.theme}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    branding: { ...formData.branding!, theme: value as any }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fontFamily">Font Family</Label>
                <Select
                  value={formData.branding?.fontFamily}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    branding: { ...formData.branding!, fontFamily: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inter">Inter (Modern)</SelectItem>
                    <SelectItem value="Roboto">Roboto</SelectItem>
                    <SelectItem value="Poppins">Poppins</SelectItem>
                    <SelectItem value="Montserrat">Montserrat</SelectItem>
                    <SelectItem value="Playfair Display">Playfair Display (Elegant)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between gap-4 mt-8">
        <Button
          variant="outline"
          onClick={() => router.push('/digital-card/manage')}
          disabled={saving}
        >
          Cancel
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={saving}
          >
            {saving ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
