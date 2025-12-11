'use client';

import React from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, differenceInMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  ArrowRight,
  CalendarDays,
  User,
  Video,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointments';

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
  isLoading?: boolean;
  maxItems?: number;
  onViewAll?: () => void;
  onViewAppointment?: (appointment: Appointment) => void;
}

export function UpcomingAppointments({
  appointments,
  isLoading = false,
  maxItems = 5,
  onViewAll,
  onViewAppointment,
}: UpcomingAppointmentsProps) {
  const upcomingAppointments = appointments
    .filter(
      (apt) =>
        apt.status === 'scheduled' && new Date(apt.startTime) > new Date()
    )
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    .slice(0, maxItems);

  const formatRelativeDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const getTimeUntil = (date: Date) => {
    const now = new Date();
    const minutes = differenceInMinutes(date, now);

    if (minutes < 60) {
      return `In ${minutes} min`;
    }
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `In ${hours} hr${hours > 1 ? 's' : ''}`;
    }
    const days = Math.floor(minutes / 1440);
    return `In ${days} day${days > 1 ? 's' : ''}`;
  };

  const isStartingSoon = (date: Date) => {
    const minutes = differenceInMinutes(date, new Date());
    return minutes <= 30 && minutes > 0;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Upcoming Appointments
          </CardTitle>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll} asChild>
              <Link href="/appointments">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {upcomingAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">No upcoming appointments</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your scheduled appointments will appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="space-y-2">
              {upcomingAppointments.map((appointment) => {
                const startDate = new Date(appointment.startTime);
                const startingSoon = isStartingSoon(startDate);

                return (
                  <button
                    key={appointment.id}
                    onClick={() => onViewAppointment?.(appointment)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors hover:bg-muted/50',
                      startingSoon && 'border-primary/50 bg-primary/5'
                    )}
                  >
                    <div className="flex flex-col items-center justify-center bg-primary/10 rounded-md p-2 min-w-[50px]">
                      <span className="text-xs text-primary font-medium">
                        {format(startDate, 'MMM')}
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {format(startDate, 'd')}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <p className="font-medium text-sm truncate">
                          {appointment.clientName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{format(startDate, 'h:mm a')}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span>{appointment.duration} min</span>
                        {appointment.meetingLink && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <Video className="h-3 w-3" />
                          </>
                        )}
                        {appointment.location && !appointment.meetingLink && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <MapPin className="h-3 w-3" />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {startingSoon ? (
                        <Badge variant="default" className="bg-primary text-xs">
                          Starting Soon
                        </Badge>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-xs font-medium">
                            {formatRelativeDate(startDate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getTimeUntil(startDate)}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
