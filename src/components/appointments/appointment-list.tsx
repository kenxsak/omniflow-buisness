'use client';

import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { AppointmentCard } from './appointment-card';
import {
  Search,
  CalendarIcon,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Appointment, AppointmentStatus, AppointmentFilter } from '@/types/appointments';

interface AppointmentListProps {
  appointments: Appointment[];
  isLoading?: boolean;
  onView?: (appointment: Appointment) => void;
  onEdit?: (appointment: Appointment) => void;
  onCancel?: (appointmentId: string) => void;
  onComplete?: (appointmentId: string) => void;
  onDelete?: (appointmentId: string) => void;
  onFilterChange?: (filters: AppointmentFilter) => void;
}

const STATUS_OPTIONS: { value: AppointmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
  { value: 'rescheduled', label: 'Rescheduled' },
];

export function AppointmentList({
  appointments,
  isLoading = false,
  onView,
  onEdit,
  onCancel,
  onComplete,
  onDelete,
  onFilterChange,
}: AppointmentListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onFilterChange?.({
      searchQuery: query,
      status: statusFilter === 'all' ? undefined : statusFilter,
      startDate: dateRange.from?.toISOString(),
      endDate: dateRange.to?.toISOString(),
    });
  };

  const handleStatusChange = (status: AppointmentStatus | 'all') => {
    setStatusFilter(status);
    onFilterChange?.({
      searchQuery,
      status: status === 'all' ? undefined : status,
      startDate: dateRange.from?.toISOString(),
      endDate: dateRange.to?.toISOString(),
    });
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    setDateRange(range);
    onFilterChange?.({
      searchQuery,
      status: statusFilter === 'all' ? undefined : statusFilter,
      startDate: range.from?.toISOString(),
      endDate: range.to?.toISOString(),
    });
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      !searchQuery ||
      apt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;

    const matchesDateRange =
      (!dateRange.from || new Date(apt.startTime) >= dateRange.from) &&
      (!dateRange.to || new Date(apt.startTime) <= dateRange.to);

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const getAppointmentsForDay = (day: Date) => {
    return filteredAppointments.filter((apt) =>
      isSameDay(new Date(apt.startTime), day)
    );
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dayAppointments = getAppointmentsForDay(day);
        const currentDay = day;

        days.push(
          <div
            key={day.toISOString()}
            className={cn(
              'min-h-[100px] border-r border-b p-1',
              !isSameMonth(day, calendarMonth) && 'bg-muted/50',
              isToday(day) && 'bg-primary/5'
            )}
          >
            <div
              className={cn(
                'text-sm font-medium mb-1 px-1',
                !isSameMonth(day, calendarMonth) && 'text-muted-foreground',
                isToday(day) &&
                  'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center'
              )}
            >
              {format(day, 'd')}
            </div>
            <div className="space-y-1">
              {dayAppointments.slice(0, 3).map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => onView?.(apt)}
                  className="w-full text-left text-xs p-1 rounded bg-primary/10 hover:bg-primary/20 truncate transition-colors"
                >
                  <span className="font-medium">
                    {format(new Date(apt.startTime), 'h:mm a')}
                  </span>{' '}
                  - {apt.clientName}
                </button>
              ))}
              {dayAppointments.length > 3 && (
                <p className="text-xs text-muted-foreground px-1">
                  +{dayAppointments.length - 3} more
                </p>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toISOString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-muted/50">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCalendarMonth(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1)
              )
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(calendarMonth, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCalendarMonth(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
              )
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium p-2 border-r last:border-r-0 bg-muted/30"
            >
              {day}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderListView = () => {
    if (filteredAppointments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No appointments found</h3>
          <p className="text-muted-foreground max-w-sm">
            {searchQuery || statusFilter !== 'all' || dateRange.from
              ? 'Try adjusting your filters to find appointments.'
              : 'Schedule your first appointment to get started.'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAppointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            onView={onView}
            onEdit={onEdit}
            onCancel={onCancel ? (apt) => onCancel(apt.id) : undefined}
            onComplete={onComplete ? (apt) => onComplete(apt.id) : undefined}
            onDelete={onDelete ? (apt) => onDelete(apt.id) : undefined}
          />
        ))}
      </div>
    );
  };

  const renderLoadingSkeleton = () => {
    if (viewMode === 'calendar') {
      return (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-8" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-36" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name, email, or title..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              handleStatusChange(value as AppointmentStatus | 'all')
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'MMM d')} -{' '}
                      {format(dateRange.to, 'MMM d')}
                    </>
                  ) : (
                    format(dateRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  'Date Range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) =>
                  handleDateRangeChange({ from: range?.from, to: range?.to })
                }
                numberOfMonths={2}
              />
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDateRangeChange({})}
                >
                  Clear Dates
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'list' | 'calendar')}
          >
            <TabsList>
              <TabsTrigger value="list">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <LayoutGrid className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {isLoading
          ? 'Loading...'
          : `${filteredAppointments.length} appointment${filteredAppointments.length !== 1 ? 's' : ''} found`}
      </div>

      {isLoading ? (
        renderLoadingSkeleton()
      ) : viewMode === 'calendar' ? (
        renderCalendarView()
      ) : (
        renderListView()
      )}
    </div>
  );
}
