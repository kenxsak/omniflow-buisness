
"use client";

import { useSidebar } from '@/components/ui/sidebar';
import { SheetTitle } from '@/components/ui/sheet';
import { SidebarHeader as CustomSidebarHeaderDiv } from '@/components/ui/sidebar';
import Link from 'next/link';
import Image from 'next/image';

export default function AppSidebarHeader() {
  const { isMobile } = useSidebar();

  return (
    <CustomSidebarHeaderDiv className="p-4">
      <Link href="/dashboard" className="flex items-center gap-3" aria-label="Go to Dashboard">
        <Image 
          src="/logo.png" 
          alt="OmniFlow Logo" 
          width={40} 
          height={40} 
          className="flex-shrink-0"
          priority
        />
        {isMobile ? (
          <SheetTitle asChild>
            <h1 className="text-xl font-semibold text-primary">OmniFlow</h1>
          </SheetTitle>
        ) : (
          <h1 className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden">OmniFlow</h1>
        )}
      </Link>
    </CustomSidebarHeaderDiv>
  );
}
