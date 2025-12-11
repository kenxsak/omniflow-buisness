'use client';

import React from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  MapPin,
  Link as LinkIcon,
  Mail,
  Phone,
  MoreVertical,
  Eye,
  Edit,
  XCircle,
  CheckCircle,
  User,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment, AppointmentStatus } from '@/types/appointments';

interface AppointmentCardProps {
  appointment: Appointment;
  onView?: (appointment: Appointment) => void;
  onEdit?: (appointment: Appointment) => void;
  onCancel?: (appointment: Appointment) => void;
  onComplete?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  no_show: {
    label: 'No Show',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  rescheduled: {
    label: 'Rescheduled',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

export function AppointmentCard({
  appointment,
  onView,
  onEdit,
  onCancel,
  onComplete,
  onDelete,
  compact = false,
}: AppointmentCardProps) {
  // Handle invalid startTime - default to today's date
  let startDate = new Date(); // Default to today
  if (appointment.startTime) {
    const parsedDate = new Date(appointment.startTime);
    if (!isNaN(parsedDate.getTime())) {
      startDate = parsedDate;
    } else {
      console.error('Invalid startTime:', appointment.startTime);
    }
  }
  const statusConfig = STATUS_CONFIG[appointment.status];

  const formatTime = (date: Date, duration: number) => {
    // Validate the date before formatting
    if (!date || isNaN(date.getTime())) {
      return 'Invalid time';
    }
    try {
      const endDate = new Date(date.getTime() + duration * 60 * 1000);
      return `${format(date, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
    } catch (error) {
      console.error('Error formatting time:', error, { date, duration });
      return 'Invalid time';
    }
  };

  const canEdit = appointment.status === 'scheduled' || appointment.status === 'pending';
  const canCancel = appointment.status === 'scheduled' || appointment.status === 'pending';
  const canComplete = appointment.status === 'scheduled';

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center bg-primary/10 rounded-md p-2 min-w-[50px]">
            <span className="text-xs text-primary font-medium">
              {!isNaN(startDate.getTime()) ? format(startDate, 'MMM') : 'N/A'}
            </span>
            <span className="text-lg font-bold text-primary">
              {!isNaN(startDate.getTime()) ? format(startDate, 'd') : '--'}
            </span>
          </div>
          <div>
            <p className="font-medium text-sm">{appointment.clientName}</p>
            <p className="text-xs text-muted-foreground">
              {!isNaN(startDate.getTime()) ? format(startDate, 'h:mm a') : 'N/A'} · {appointment.duration} min
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn('text-xs', statusConfig.className)}>
          {statusConfig.label}
        </Badge>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-lg">{appointment.clientName}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{appointment.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn(statusConfig.className)}>
              {statusConfig.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(appointment)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit && canEdit && (
                  <DropdownMenuItem onClick={() => onEdit(appointment)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onComplete && canComplete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onComplete(appointment)}>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                      Mark Complete
                    </DropdownMenuItem>
                  </>
                )}
                {onCancel && canCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onCancel(appointment)}
                      className="text-destructive focus:text-destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(appointment)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{!isNaN(startDate.getTime()) ? format(startDate, 'EEE, MMM d, yyyy') : 'Invalid date'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatTime(startDate, appointment.duration)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          {appointment.clientEmail && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <a
                href={`mailto:${appointment.clientEmail}`}
                className="hover:text-primary transition-colors"
              >
                {appointment.clientEmail}
              </a>
            </div>
          )}
          {appointment.clientPhone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <a
                href={`tel:${appointment.clientPhone}`}
                className="hover:text-primary transition-colors"
              >
                {appointment.clientPhone}
              </a>
            </div>
          )}
        </div>

        {(appointment.location || appointment.meetingLink) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {appointment.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{appointment.location}</span>
              </div>
            )}
            {appointment.meetingLink && (
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  href={appointment.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Join Meeting
                </a>
              </div>
            )}
          </div>
        )}

        {appointment.notes && (
          <p className="text-sm text-muted-foreground border-t pt-3 mt-3">
            {appointment.notes}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              className="sm:flex-1 text-xs sm:text-sm"
              onClick={() => onView(appointment)}
            >
              <Eye className="h-4 w-4 mr-1 sm:mr-2" />
              View
            </Button>
          )}
          {onEdit && canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="sm:flex-1 text-xs sm:text-sm"
              onClick={() => onEdit(appointment)}
            >
              <Edit className="h-4 w-4 mr-1 sm:mr-2" />
              Edit
            </Button>
          )}
          {onComplete && canComplete && (
            <Button
              variant="default"
              size="sm"
              className="sm:flex-1 text-xs sm:text-sm"
              onClick={() => onComplete(appointment)}
            >
              <CheckCircle className="h-4 w-4 mr-1 sm:mr-2" />
              Done
            </Button>
          )}
          {onCancel && canCancel && (
            <Button
              variant="destructive"
              size="sm"
              className="sm:flex-1 text-xs sm:text-sm"
              onClick={() => onCancel(appointment)}
            >
              <XCircle className="h-4 w-4 mr-1 sm:mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
