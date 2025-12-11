'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarDays, ExternalLink } from 'lucide-react';

interface CalendarBookingButtonProps {
  buttonText?: string;
  calcomUsername?: string;
  calcomEventSlug?: string;
  primaryColor?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

export default function CalendarBookingButton({
  buttonText = 'Book Appointment',
  calcomUsername,
  calcomEventSlug = '',
  primaryColor = '#000000',
  variant = 'default',
  size = 'default',
  showIcon = true
}: CalendarBookingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!calcomUsername) {
    return null;
  }

  const calcomUrl = calcomEventSlug 
    ? `https://cal.com/${calcomUsername}/${calcomEventSlug}`
    : `https://cal.com/${calcomUsername}`;

  const embedUrl = `${calcomUrl}?embed=true&theme=light`;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className="w-full"
          style={{
            backgroundColor: variant === 'default' ? primaryColor : undefined,
            borderColor: variant === 'outline' ? primaryColor : undefined,
            color: variant === 'outline' ? primaryColor : undefined,
          }}
        >
          {showIcon && <CalendarDays className="h-4 w-4 mr-2" />}
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" style={{ color: primaryColor }} />
            Schedule an Appointment
          </DialogTitle>
          <DialogDescription>
            Select a time that works for you
          </DialogDescription>
        </DialogHeader>

        <div className="w-full h-[500px] overflow-hidden rounded-lg border">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title="Book an appointment"
          />
        </div>

        <div className="flex justify-center pt-2">
          <a
            href={calcomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            Open in new tab <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
