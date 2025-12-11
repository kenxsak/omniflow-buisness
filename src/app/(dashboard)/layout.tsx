"use client";

import { AuthProvider } from '@/contexts/auth-context';
import { CurrencyProvider } from '@/contexts/currency-context';
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/toaster';
import DashboardGate from '@/components/auth/dashboard-gate';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <DashboardGate>
          <AppShell>{children}</AppShell>
        </DashboardGate>
        <Toaster />
      </CurrencyProvider>
    </AuthProvider>
  );
}
