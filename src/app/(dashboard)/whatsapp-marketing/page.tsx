"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function RedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/campaigns/whatsapp');
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Redirecting to Campaigns...</p>
    </div>
  );
}
