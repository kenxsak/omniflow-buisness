"use client";

import React, { useState, useEffect } from 'react';
import PageTitle from '@/components/ui/page-title';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutoDistributionSettings } from '@/components/enterprise/auto-distribution-settings';
import { AuditLogViewer } from '@/components/enterprise/audit-log-viewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { 
  Shield, 
  Shuffle, 
  FileText, 
  Lock, 
  Key, 
  Users, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Crown
} from 'lucide-react';

export default function EnterpriseSettingsPage() {
  const { isAdmin, company } = useAuth();
  const { isFeatureEnabled } = useFeatureFlag();
  const [hasEnterpriseFeature, setHasEnterpriseFeature] = useState<boolean | null>(null);

  useEffect(() => {
    isFeatureEnabled('feat_enterprise_team').then(setHasEnterpriseFeature);
  }, [isFeatureEnabled]);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Enterprise Settings"
          description="Advanced settings for enterprise customers"
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only administrators can access enterprise settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (hasEnterpriseFeature === false) {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Enterprise Settings"
          description="Advanced features for large teams"
        />
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-800 dark:text-amber-200">Enterprise Plan Required</CardTitle>
            </div>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              These advanced team collaboration features are available exclusively on the Enterprise plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
              <li className="flex items-center gap-2"><Lock className="h-4 w-4" /> <strong>Lead Claiming</strong> - Prevent duplicate work with transaction-based claiming</li>
              <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> <strong>Audit Trail</strong> - Full compliance logging of all CRM actions</li>
              <li className="flex items-center gap-2"><Shuffle className="h-4 w-4" /> <strong>Auto-Distribution</strong> - Fair lead assignment with round-robin or load-balanced methods</li>
            </ul>
            <Button variant="default" className="mt-4" asChild>
              <a href="/settings">Upgrade to Enterprise</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasEnterpriseFeature === null) {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Enterprise Settings"
          description="Loading..."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Enterprise Settings"
        description="Configure advanced features for team collaboration and compliance"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                <Lock className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lead Claiming</p>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Audit Trail</p>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                <Shuffle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Auto-Distribution</p>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Available
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                <Key className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SSO</p>
                <Badge variant="outline">
                  Contact Sales
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <Shuffle className="h-4 w-4" />
            Auto-Distribution
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
          <TabsTrigger value="sso" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            SSO Setup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribution">
          <AutoDistributionSettings />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="sso">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Single Sign-On (SSO)
              </CardTitle>
              <CardDescription>
                Enterprise SSO integration for secure authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Enterprise Feature</AlertTitle>
                <AlertDescription>
                  SSO is available for Enterprise plan customers. Contact our sales team to enable
                  SAML 2.0, OAuth 2.0, or OpenID Connect authentication for your organization.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold">Supported Identity Providers</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-blue-100">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Microsoft Entra ID</p>
                        <p className="text-xs text-muted-foreground">(Azure AD)</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-green-100">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Google Workspace</p>
                        <p className="text-xs text-muted-foreground">SAML/OIDC</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-yellow-100">
                        <Users className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium">Okta</p>
                        <p className="text-xs text-muted-foreground">SAML 2.0</p>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Current Authentication</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your team currently uses Firebase Authentication which supports:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Email/Password</Badge>
                    <Badge>Google Sign-In</Badge>
                    <Badge>GitHub</Badge>
                    <Badge>Microsoft</Badge>
                    <Badge>Apple</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Contact Sales for Enterprise SSO
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
