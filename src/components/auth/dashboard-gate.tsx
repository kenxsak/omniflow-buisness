"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { getCompany } from '@/lib/saas-data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const PausedAccountScreen = () => {
    const { logout, impersonatingUser, stopImpersonation } = useAuth();
    const router = useRouter();

    const handleAction = async () => {
        if (impersonatingUser) {
            await stopImpersonation();
        } else {
            await logout();
            router.push('/login');
        }
    };
    
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="flex flex-col items-center gap-2 text-xl">
                        <ShieldAlert className="h-10 w-10 text-destructive" />
                        Account Paused
                    </CardTitle>
                    <CardDescription>
                        {impersonatingUser 
                            ? "This account is currently paused. You are viewing this as a superadmin."
                            : "Your access to the OmniFlow dashboard is currently suspended."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {impersonatingUser 
                            ? "You can return to your dashboard or contact the administrator if needed."
                            : "This is likely due to a subscription issue. Please contact your administrator or support to reactivate your account."
                        }
                    </p>
                </CardContent>
                <CardFooter className="flex-col gap-3">
                     <Button onClick={handleAction} size="lg">
                        {impersonatingUser ? "Return to Superadmin" : "Logout"}
                    </Button>
                    {!impersonatingUser && (
                        <Button asChild variant="secondary"><a href="mailto:support@omniflow.example.com">Contact Support</a></Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default function DashboardGate({ children }: { children: React.ReactNode }) {
  const { appUser, loading, company, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [companyStatus, setCompanyStatus] = useState<'loading' | 'active' | 'paused' | 'inactive'>('loading');
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!appUser) {
      router.push('/login');
    }
  }, [appUser, loading, router]);
  
  useEffect(() => {
      const checkCompanyStatus = async () => {
          if (appUser?.companyId) {
              setCompanyStatus('loading');
              const userCompany = await getCompany(appUser.companyId);
              setCompanyStatus(userCompany?.status || 'paused');
          } else if (appUser && !appUser.companyId) {
              setCompanyStatus('paused');
          }
      };
      if (!loading && appUser) {
          checkCompanyStatus();
      }
  }, [appUser, loading]);

  useEffect(() => {
    if (loading || !company || onboardingChecked || isSuperAdmin) return;
    
    const currentPath = window.location.pathname;
    const isOnboardingPage = currentPath.includes('/onboarding');
    
    if (!isOnboardingPage && !company.onboardingProgress?.completed) {
      router.push('/onboarding');
    }
    
    setOnboardingChecked(true);
  }, [company, loading, router, onboardingChecked, isSuperAdmin]);

  if (loading || (appUser && companyStatus === 'loading')) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appUser) {
    return null;
  }

  if (companyStatus === 'paused') {
    return <PausedAccountScreen />;
  }
  
  return <>{children}</>;
}
