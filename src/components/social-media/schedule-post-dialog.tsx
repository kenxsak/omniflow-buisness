
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SocialMediaPost } from '@/types/social-media';
import { useToast } from '@/hooks/use-toast';
import { format, setHours, setMinutes, parse } from 'date-fns';

interface SchedulePostDialogProps {
  post: SocialMediaPost;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedPost: SocialMediaPost) => void;
}

export default function SchedulePostDialog({ post, isOpen, onOpenChange, onSave }: SchedulePostDialogProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('09:00'); // Default time
  const { toast } = useToast();

  useEffect(() => {
    if (post.scheduledAt) {
        const scheduledDate = new Date(post.scheduledAt);
        setDate(scheduledDate);
        setTime(format(scheduledDate, 'HH:mm'));
    } else {
        setDate(new Date());
        setTime('09:00');
    }
  }, [post]);

  const handleSave = () => {
    if (!date) {
      toast({ title: "No Date Selected", description: "Please select a date for scheduling.", variant: "destructive" });
      return;
    }

    try {
        const [hours, minutes] = time.split(':').map(Number);
        let scheduledDateTime = setMinutes(setHours(date, hours), minutes);
        
        // Ensure the scheduled time is not in the past
        if (scheduledDateTime < new Date()) {
            toast({
                title: "Invalid Time",
                description: "Cannot schedule posts in the past. Please select a future date/time.",
                variant: "destructive"
            });
            return;
        }

        const updatedPost = {
            ...post,
            status: 'Scheduled' as const,
            scheduledAt: scheduledDateTime.toISOString(),
        };

        onSave(updatedPost);
        onOpenChange(false);
    } catch(e) {
        console.error("Error setting schedule time:", e);
        toast({ title: "Error", description: "There was an issue saving the schedule.", variant: "destructive"});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Post</DialogTitle>
          <DialogDescription>
            Select a date and time to schedule this post for the "{post.platform}" platform.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex justify-center">
             <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border"
                disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} // Disable past dates
            />
          </div>
           <div>
              <Label htmlFor="schedule-time">Time</Label>
              <Input
                id="schedule-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
