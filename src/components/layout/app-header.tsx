"use client";

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCurrency } from '@/contexts/currency-context';
import { IndianRupee, DollarSign, LogOut, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AppHeader() {
  const { currency } = useCurrency();
  const { isMobile } = useSidebar();
  const { appUser, logout, impersonatingUser, stopImpersonation } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    logout();
    router.push('/login');
  };
  
  const handleStopImpersonation = () => {
    stopImpersonation();
    router.push('/dashboard');
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        {isMounted && isMobile && <SidebarTrigger />}

        <div className="flex-grow" />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md border bg-card text-sm font-medium">
            {currency === 'INR' ? <IndianRupee className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
            <span>{currency}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="user avatar" />
                <AvatarFallback>{appUser?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground">{appUser?.email || 'Not signed in'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout} className="text-destructive" disabled={!appUser}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {impersonatingUser && (
        <div className="sticky top-16 z-10">
          <Alert variant="destructive" className="border-yellow-400 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 rounded-none border-x-0 border-t-0">
            <AlertDescription className="flex items-center justify-center gap-4">
              <UserCog className="h-5 w-5" />
              <span className="text-sm font-semibold">You are impersonating {appUser?.email}.</span>
              <Button onClick={handleStopImpersonation} size="sm" variant="outline" className="text-yellow-800 border-yellow-300 hover:bg-yellow-100 dark:text-yellow-200 dark:border-yellow-600 dark:hover:bg-yellow-800">
                Return to Superadmin
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}
