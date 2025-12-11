"use client";

import { HelpCircle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpPanel } from './help-panel';
import { cn } from '@/lib/utils';
import { type PageId } from '@/lib/help-content';

interface ContextualHelpButtonProps {
  pageId: PageId;
  className?: string;
}

export function ContextualHelpButton({ pageId, className }: ContextualHelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        variant="outline"
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40 border-2 hover:scale-110 transition-transform",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          isOpen && "bg-destructive hover:bg-destructive/90",
          className
        )}
        aria-label={isOpen ? "Close help" : "Open help"}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <HelpCircle className="h-6 w-6" />
        )}
      </Button>

      <HelpPanel 
        pageId={pageId} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
