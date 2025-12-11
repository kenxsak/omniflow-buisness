'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Plus, Settings, RefreshCw, CalendarCheck, CalendarClock, CalendarX, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { AppointmentList } from '@/components/appointments/appointment-list';
import { AppointmentForm } from '@/components/appointments/appointment-form';
import {
  getAppointmentsAction,
  createAppointmentAction,
  updateAppointmentAction,
  cancelAppointmentAction,
  deleteAppointmentAction,
  markAppointmentCompletedAction,
  getAppointmentStatsAction,
  syncCalComBookingsAction,
} from '@/app/actions/appointment-actions';
import type { Appointment, AppointmentFilter, AppointmentStats, CreateAppointmentInput, UpdateAppointmentInput } from '@/types/appointments';

export default function AppointmentsPage() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<AppointmentFilter>({});

  const fetchAppointments = useCallback(async () => {
    if (!appUser?.idToken) return;
    
    setIsLoading(true);
    try {
      const [appointmentsResult, statsResult] = await Promise.all([
        getAppointmentsAction({ idToken: appUser.idToken, filters }),
        getAppointmentStatsAction({ idToken: appUser.idToken }),
      ]);
      
      if (appointmentsResult.success) {
        setAppointments(appointmentsResult.appointments);
      } else {
        console.error('Error fetching appointments:', appointmentsResult.error);
      }
      
      if (statsResult.success) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load appointments. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [appUser?.idToken, filters, toast]);

  useEffect(() => {
    if (appUser?.idToken) {
      fetchAppointments();
    }
  }, [appUser?.idToken, fetchAppointments]);

  const handleCreateAppointment = async (data: CreateAppointmentInput | UpdateAppointmentInput) => {
    if (!appUser?.idToken) return;
    
    try {
      const result = await createAppointmentAction({
        idToken: appUser.idToken,
        input: data as CreateAppointmentInput,
      });
      
      if (result.success) {
        toast({
          title: 'Appointment Created',
          description: 'Your appointment has been scheduled successfully.',
        });
        setShowCreateDialog(false);
        fetchAppointments();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create appointment.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create appointment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAppointment = async (data: CreateAppointmentInput | UpdateAppointmentInput) => {
    if (!appUser?.idToken || !editingAppointment) return;
    
    try {
      const result = await updateAppointmentAction({
        idToken: appUser.idToken,
        appointmentId: editingAppointment.id,
        updates: data as Partial<UpdateAppointmentInput>,
      });
      
      if (result.success) {
        toast({
          title: 'Appointment Updated',
          description: 'Your appointment has been updated successfully.',
        });
        setShowEditDialog(false);
        setEditingAppointment(null);
        fetchAppointments();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update appointment.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update appointment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelAppointment = async () => {
    if (!appUser?.idToken || !selectedAppointmentId) return;
    
    try {
      const result = await cancelAppointmentAction({
        idToken: appUser.idToken,
        appointmentId: selectedAppointmentId,
      });
      
      if (result.success) {
        toast({
          title: 'Appointment Cancelled',
          description: 'The appointment has been cancelled.',
        });
        setShowCancelDialog(false);
        setSelectedAppointmentId(null);
        fetchAppointments();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to cancel appointment.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAppointment = async () => {
    if (!appUser?.idToken || !selectedAppointmentId) return;
    
    try {
      const result = await deleteAppointmentAction({
        idToken: appUser.idToken,
        appointmentId: selectedAppointmentId,
      });
      
      if (result.success) {
        toast({
          title: 'Appointment Deleted',
          description: 'The appointment has been deleted.',
        });
        setShowDeleteDialog(false);
        setSelectedAppointmentId(null);
        fetchAppointments();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete appointment.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete appointment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    if (!appUser?.idToken) return;
    
    try {
      const result = await markAppointmentCompletedAction({
        idToken: appUser.idToken,
        appointmentId,
      });
      
      if (result.success) {
        toast({
          title: 'Appointment Completed',
          description: 'The appointment has been marked as completed.',
        });
        fetchAppointments();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to complete appointment.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete appointment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSyncCalCom = async () => {
    if (!appUser?.idToken) return;
    
    setIsSyncing(true);
    try {
      const result = await syncCalComBookingsAction({ idToken: appUser.idToken });
      
      if (result.success) {
        toast({
          title: 'Sync Complete',
          description: `Synced ${result.synced} bookings. Created: ${result.created}, Updated: ${result.updated}`,
        });
        fetchAppointments();
      } else {
        toast({
          title: 'Sync Failed',
          description: result.error || 'Failed to sync Cal.com bookings.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error syncing Cal.com:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync Cal.com bookings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFilterChange = (newFilters: AppointmentFilter) => {
    setFilters(newFilters);
  };

  const handleView = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowEditDialog(true);
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowEditDialog(true);
  };

  const handleCancelClick = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowCancelDialog(true);
  };

  const handleDeleteClick = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId);
    setShowDeleteDialog(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">
            Manage your bookings and schedule
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleSyncCalCom}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Cal.com'}
          </Button>
          <Link href="/settings?tab=integrations">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time bookings</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <CalendarClock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.scheduled}</div>
              <p className="text-xs text-muted-foreground">Upcoming appointments</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CalendarCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">Finished appointments</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.upcomingThisWeek}</div>
              <p className="text-xs text-muted-foreground">
                {stats.upcomingToday} today
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            All Appointments
          </CardTitle>
          <CardDescription>
            View, manage, and schedule appointments with your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppointmentList
            appointments={appointments}
            isLoading={isLoading}
            onView={handleView}
            onEdit={handleEdit}
            onCancel={handleCancelClick}
            onComplete={handleCompleteAppointment}
            onDelete={handleDeleteClick}
            onFilterChange={handleFilterChange}
          />
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Appointment</DialogTitle>
            <DialogDescription>
              Create a new appointment with reminder settings
            </DialogDescription>
          </DialogHeader>
          <AppointmentForm
            onSubmit={handleCreateAppointment}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update appointment details and reminders
            </DialogDescription>
          </DialogHeader>
          {editingAppointment && (
            <AppointmentForm
              appointment={editingAppointment}
              onSubmit={handleUpdateAppointment}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingAppointment(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the appointment and notify the client. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAppointmentId(null)}>
              Keep Appointment
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The appointment will be permanently deleted from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAppointmentId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAppointment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
