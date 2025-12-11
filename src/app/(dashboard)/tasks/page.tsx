
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import PageTitle from '@/components/ui/page-title';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, PlusCircle, Loader2, Rows, Calendar as CalendarIcon, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getStoredTasks, deleteTask } from '@/lib/task-data';
import type { Task } from '@/types/task';
import type { Lead } from '@/lib/mock-data';
import type { Appointment } from '@/types/appointments';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { logActivity } from '@/lib/activity-log';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { getAppointmentsAction } from '@/app/actions/appointment-actions';
import { getLeadsForTaskDropdown } from '@/app/actions/task-actions';

const AddTaskDialog = dynamic(() => import('@/components/tasks/add-task-dialog'), { ssr: false });
const TaskCalendarView = dynamic(() => import('@/components/tasks/task-calendar-view'), { ssr: false });
const AppointmentDialog = dynamic(() => import('@/components/appointments/appointment-dialog').then(mod => ({ default: mod.AppointmentDialog })), { ssr: false });

const priorityColors: Record<Task['priority'], string> = {
  High: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  Low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
};

const statusColors: Record<Task['status'], string> = {
  'To Do': 'border-gray-400 text-gray-600',
  'In Progress': 'border-orange-400 text-orange-600 animate-pulse',
  'Done': 'border-green-500 text-green-600',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedTaskLead, setSelectedTaskLead] = useState<Lead | null>(null);
  const { toast } = useToast();
  const { appUser, idToken } = useAuth();

  const loadData = useCallback(async () => {
    if (!appUser?.companyId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const [storedTasks, leads, appointmentsResult] = await Promise.all([
          getStoredTasks(appUser.companyId),
          getLeadsForTaskDropdown(appUser.companyId),
          idToken ? getAppointmentsAction({ idToken }) : Promise.resolve({ success: false, appointments: [] }),
        ]);
        
        setTasks(storedTasks);
        setAllLeads(leads);
        if (appointmentsResult.success && appointmentsResult.appointments) {
          setAllAppointments(appointmentsResult.appointments);
        }
    } catch (error) {
        console.error("Failed to load tasks and leads:", error);
        toast({
            title: "Error",
            description: "Could not load tasks and leads data from the database.",
            variant: "destructive"
        });
    } finally {
        setIsLoading(false);
    }
  }, [appUser, idToken, toast]);

  useEffect(() => {
    if (appUser) {
        loadData();
    }
  }, [appUser, loadData]);
  
  const handleCreateNew = () => {
    setEditingTask(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleDelete = async (task: Task) => {
    if (!appUser?.companyId) return;
    await deleteTask(task.id);
    toast({ title: "Task Deleted", description: `Task "${task.title}" has been removed.` });
    await logActivity({ companyId: appUser.companyId, description: `Task deleted: "${task.title.substring(0, 30)}..."`, type: 'task' });
    await loadData();
  };

  const handleScheduleAppointment = (task: Task) => {
    if (!task.leadId) return;
    const lead = allLeads.find(l => l.id === task.leadId);
    if (lead) {
      setSelectedTaskLead(lead);
      setAppointmentDialogOpen(true);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <PageTitle
            title="Task Management"
            description="A central place to view, create, and manage all your tasks."
          />
          <Button onClick={handleCreateNew} variant="accent">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Task
          </Button>
        </div>

        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'calendar')} className="w-full">
            <div className="flex justify-between items-center mb-4">
                <CardTitle>All Tasks</CardTitle>
                <TabsList>
                    <TabsTrigger value="table"><Rows className="mr-2 h-4 w-4" /> Table View</TabsTrigger>
                    <TabsTrigger value="calendar"><CalendarIcon className="mr-2 h-4 w-4" /> Calendar View</TabsTrigger>
                </TabsList>
            </div>
          
          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardDescription>View all your scheduled tasks. Sort by due date by default.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Linked Lead</TableHead>
                            <TableHead>Linked Appointment</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {tasks.length > 0 ? (
                            tasks.map(task => (
                            <TableRow key={task.id}>
                                <TableCell className="font-medium max-w-xs truncate" title={task.title}>{task.title}</TableCell>
                                <TableCell><Badge className={priorityColors[task.priority]}>{task.priority}</Badge></TableCell>
                                <TableCell><Badge variant="outline" className={statusColors[task.status]}>{task.status}</Badge></TableCell>
                                <TableCell>{format(new Date(task.dueDate), 'PP')}</TableCell>
                                <TableCell>
                                    {task.leadId ? (
                                        <Button variant="link" asChild className="p-0 h-auto text-xs">
                                            <Link href={`/crm/leads/${task.leadId}`}>{task.leadName || 'View Lead'}</Link>
                                        </Button>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">None</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {task.appointmentTitle ? (
                                        <Button variant="link" asChild className="p-0 h-auto text-xs">
                                            <Link href="/appointments">{task.appointmentTitle}</Link>
                                        </Button>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">None</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => handleEdit(task)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                        {task.leadId && (
                                          <>
                                            <DropdownMenuItem onSelect={() => handleScheduleAppointment(task)}>
                                              <CalendarPlus className="mr-2 h-4 w-4" /> Schedule Appointment
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                          </>
                                        )}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete the task "{task.title}".</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(task)} className={buttonVariants({ variant: "destructive" })}>Delete Task</AlertDialogAction>
                                            </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                </TableCell>
                            </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center">No tasks found. Create one to get started.</TableCell></TableRow>
                        )}
                        </TableBody>
                    </Table>
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="calendar">
            {isLoading ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <TaskCalendarView tasks={tasks} onEditTask={handleEdit} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddTaskDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onTaskSaved={loadData}
        taskToEdit={editingTask}
        allLeads={allLeads}
        allAppointments={allAppointments}
      />

      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        contact={selectedTaskLead ? {
          id: selectedTaskLead.id,
          name: selectedTaskLead.name,
          email: selectedTaskLead.email,
          phone: selectedTaskLead.phone
        } : undefined}
        onSuccess={() => {
          setAppointmentDialogOpen(false);
          toast({
            title: 'Appointment Scheduled',
            description: `Appointment with ${selectedTaskLead?.name} has been scheduled.`,
          });
          setSelectedTaskLead(null);
          loadData();
        }}
      />
    </>
  );
}
