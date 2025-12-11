
"use client";

import { SidebarProvider, Sidebar, SidebarInset, SidebarContent, SidebarFooter } from '@/components/ui/sidebar';
import SidebarNav from '@/components/layout/sidebar-nav';
import AppHeader from '@/components/layout/app-header';
import AppSidebarHeader from '@/components/layout/app-sidebar-header';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function AppShell({ children }: { children: React.ReactNode }) {
  // This component now assumes it is only rendered for authenticated users
  // The AuthGuard component handles the logic for what to show when.
  const { appUser } = useAuth();
  const pathname = usePathname();
  
  if (!appUser && pathname !== '/login' && pathname !== '/signup' && pathname !== '/pricing') {
    // Or some other loading/redirect state if needed, though AuthGuard should handle this
    return null; 
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <AppSidebarHeader />
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-4 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          © {new Date().getFullYear()} OmniFlow
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
