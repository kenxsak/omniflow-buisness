"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Building2, Globe, MapPin, Save, Mail, Phone, Clock, DollarSign, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getCompany } from '@/lib/saas-data';
import { updateCompanyProfileAction } from '@/app/actions/profile-actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Company } from '@/types/saas';

const COUNTRIES = [
  { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'DE', name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'IT', name: 'Italy', currency: 'EUR', timezone: 'Europe/Rome' },
  { code: 'ES', name: 'Spain', currency: 'EUR', timezone: 'Europe/Madrid' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', timezone: 'Europe/Amsterdam' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', timezone: 'Europe/Brussels' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', timezone: 'Europe/Zurich' },
  { code: 'AT', name: 'Austria', currency: 'EUR', timezone: 'Europe/Vienna' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', timezone: 'Europe/Stockholm' },
  { code: 'NO', name: 'Norway', currency: 'NOK', timezone: 'Europe/Oslo' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', timezone: 'Europe/Copenhagen' },
  { code: 'FI', name: 'Finland', currency: 'EUR', timezone: 'Europe/Helsinki' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', timezone: 'Europe/Lisbon' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', timezone: 'Europe/Dublin' },
  { code: 'PL', name: 'Poland', currency: 'PLN', timezone: 'Europe/Warsaw' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', timezone: 'Europe/Prague' },
  { code: 'RU', name: 'Russia', currency: 'RUB', timezone: 'Europe/Moscow' },
  { code: 'JP', name: 'Japan', currency: 'JPY', timezone: 'Asia/Tokyo' },
  { code: 'CN', name: 'China', currency: 'CNY', timezone: 'Asia/Shanghai' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', timezone: 'Asia/Seoul' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore' },
  { code: 'HK', name: 'Hong Kong', currency: 'HKD', timezone: 'Asia/Hong_Kong' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD', timezone: 'Asia/Taipei' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'TH', name: 'Thailand', currency: 'THB', timezone: 'Asia/Bangkok' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', timezone: 'Asia/Jakarta' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', timezone: 'Asia/Manila' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', timezone: 'Asia/Ho_Chi_Minh' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { code: 'IL', name: 'Israel', currency: 'ILS', timezone: 'Asia/Jerusalem' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', timezone: 'Europe/Istanbul' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', timezone: 'Africa/Cairo' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', timezone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', currency: 'KES', timezone: 'Africa/Nairobi' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', timezone: 'America/Mexico_City' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', timezone: 'America/Buenos_Aires' },
  { code: 'CL', name: 'Chile', currency: 'CLP', timezone: 'America/Santiago' },
  { code: 'CO', name: 'Colombia', currency: 'COP', timezone: 'America/Bogota' },
  { code: 'PE', name: 'Peru', currency: 'PEN', timezone: 'America/Lima' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', timezone: 'Pacific/Auckland' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', timezone: 'Asia/Dhaka' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', timezone: 'Asia/Karachi' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', timezone: 'Asia/Colombo' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', timezone: 'Asia/Kathmandu' },
].sort((a, b) => a.name.localeCompare(b.name));

const TIMEZONES = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Phoenix',
  'America/Denver', 'America/Chicago', 'America/New_York', 'America/Toronto',
  'America/Halifax', 'America/Sao_Paulo', 'America/Buenos_Aires', 'America/Mexico_City',
  'Atlantic/Reykjavik', 'Europe/London', 'Europe/Dublin', 'Europe/Lisbon',
  'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/Brussels',
  'Europe/Madrid', 'Europe/Rome', 'Europe/Vienna', 'Europe/Zurich',
  'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen', 'Europe/Helsinki',
  'Europe/Warsaw', 'Europe/Prague', 'Europe/Athens', 'Europe/Moscow',
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
  'Asia/Dubai', 'Asia/Riyadh', 'Asia/Jerusalem', 'Asia/Istanbul',
  'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka', 'Asia/Bangkok',
  'Asia/Ho_Chi_Minh', 'Asia/Jakarta', 'Asia/Singapore', 'Asia/Kuala_Lumpur',
  'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Taipei', 'Asia/Seoul',
  'Asia/Tokyo', 'Australia/Perth', 'Australia/Sydney', 'Australia/Melbourne',
  'Pacific/Auckland', 'Pacific/Fiji',
];

export default function CompanyProfile() {
  const { appUser, isAdmin, refreshAuthContext } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [currencyCode, setCurrencyCode] = useState('');
  const [timezone, setTimezone] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const loadCompanyData = useCallback(async () => {
    if (appUser?.companyId) {
      setIsLoading(true);
      try {
        const companyData = await getCompany(appUser.companyId);
        if (companyData) {
          setCompany(companyData);
          setCompanyName(companyData.name || '');
          setCompanyWebsite(companyData.website || '');
          setSelectedCountryCode(companyData.countryCode || '');
          setCurrencyCode(companyData.currencyCode || '');
          setTimezone(companyData.timezone || '');
          setRegisteredEmail(companyData.registeredEmail || '');
          setAdminEmail(companyData.adminEmail || '');
          setPhone(companyData.phone || '');
          setAddress(companyData.address || '');
        }
      } catch (error) {
        console.error('Error loading company data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load company details',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [appUser, toast]);

  useEffect(() => {
    loadCompanyData();
  }, [loadCompanyData]);

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      setCurrencyCode(country.currency);
      setTimezone(country.timezone);
    }
  };

  const handleSave = async () => {
    if (!appUser?.idToken) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update company details',
        variant: 'destructive',
      });
      return;
    }

    if (!companyName.trim()) {
      toast({
        title: 'Error',
        description: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const selectedCountry = COUNTRIES.find(c => c.code === selectedCountryCode);
      
      const result = await updateCompanyProfileAction({
        idToken: appUser.idToken,
        data: {
          name: companyName.trim(),
          website: companyWebsite.trim() || undefined,
          country: selectedCountry?.name || undefined,
          countryCode: selectedCountryCode || undefined,
          currencyCode: currencyCode || undefined,
          timezone: timezone || undefined,
          registeredEmail: registeredEmail.trim() || undefined,
          adminEmail: adminEmail.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        },
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Company details updated successfully',
        });
        refreshAuthContext();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update company details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading company details...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Details
        </CardTitle>
        <CardDescription>
          {isAdmin 
            ? "Update your company information. These settings affect billing, currency display, and scheduled communications."
            : "View your company information. Only administrators can edit company details."
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isAdmin && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You are viewing company details in read-only mode. Contact your administrator to make changes.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Company Name *
            </Label>
            <Input
              id="companyName"
              placeholder="Enter your company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyWebsite" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Website
            </Label>
            <Input
              id="companyWebsite"
              placeholder="https://yourcompany.com"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              disabled={!isAdmin}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Country *
              </Label>
              <Select 
                value={selectedCountryCode} 
                onValueChange={handleCountryChange}
                disabled={!isAdmin}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for payment processing, pricing display, and compliance
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Currency
              </Label>
              <Input
                id="currency"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                placeholder="USD"
                disabled={!isAdmin}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Auto-selected based on country. All dashboards will display this currency.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Timezone
            </Label>
            <Select 
              value={timezone} 
              onValueChange={setTimezone}
              disabled={!isAdmin}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for scheduling emails, SMS, and other time-sensitive communications
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registeredEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Company Registered Email
              </Label>
              <Input
                id="registeredEmail"
                type="email"
                placeholder="info@yourcompany.com"
                value={registeredEmail}
                onChange={(e) => setRegisteredEmail(e.target.value)}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Official business email for invoices and legal notices
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Admin Contact Email
              </Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@yourcompany.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                For account alerts and system notifications
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Business Address
              </Label>
              <Input
                id="address"
                placeholder="123 Main St, City, State"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}

        {company && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Account Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Account ID:</span>
                <p className="font-mono text-xs">{company.id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className={company.status === 'active' ? 'text-green-600' : 'text-yellow-600'}>
                  {company.status === 'active' ? 'Active' : 'Paused'}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
