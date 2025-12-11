'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SimpleIntegrations from '@/components/settings/simple-integrations';
import SubscriptionDetails from '@/components/settings/subscription-details';
import UserManager from '@/components/settings/user-manager';
import WebhookInfo from '@/components/settings/webhook-info';
import CompanyProfile from '@/components/settings/company-profile';
import AdminManager from '@/components/settings/admin-manager';
import PaymentGatewayConfig from '@/components/settings/payment-gateway-config';
import PlanManager from '@/components/settings/plan-manager';
import { useAuth } from '@/hooks/use-auth';
import { Link2, CreditCard, Users, Webhook, Building2, Shield, LayoutList } from 'lucide-react';

export default function SettingsPage() {
  const { isSuperAdmin, isAdmin, isManager } = useAuth();

  if (isSuperAdmin) {
    return (
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Settings</h1>
          <p className="text-muted-foreground mt-1">Manage platform, companies, and payment gateways</p>
        </div>

        <Tabs defaultValue="companies" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="payment-gateways" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Gateways
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Plan Manager
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="mt-6">
            <AdminManager />
          </TabsContent>

          <TabsContent value="payment-gateways" className="mt-6">
            <PaymentGatewayConfig />
          </TabsContent>

          <TabsContent value="plans" className="mt-6">
            <PlanManager />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account, subscription, and integrations</p>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="h-4 w-4" />
            Company Details
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            My Plan
          </TabsTrigger>
          {(isAdmin || isManager) && (
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Team Members
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="integrations" className="gap-2">
              <Link2 className="h-4 w-4" />
              API Keys
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="company" className="mt-6">
          <CompanyProfile />
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <SubscriptionDetails />
        </TabsContent>

        {(isAdmin || isManager) && (
          <TabsContent value="users" className="mt-6">
            <UserManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="integrations" className="mt-6">
            <SimpleIntegrations />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="webhooks" className="mt-6">
            <WebhookInfo />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
