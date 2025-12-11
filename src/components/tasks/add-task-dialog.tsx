
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/types/task';
import type { Lead } from '@/lib/mock-data';
import type { Appointment } from '@/types/appointments';
import { addStoredTask, updateStoredTask } from '@/lib/task-data';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Loader2, Wand2 } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { logActivity } from '@/lib/activity-log';
import { generateTaskSuggestions, type GenerateTaskSuggestionsInput } from '@/ai/flows/generate-task-suggestions-flow';
import { useAuth } from '@/hooks/use-auth';


const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  notes: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  dueDate: z.date({ required_error: "A due date is required." }),
  leadId: z.string().optional(),
  appointmentId: z.string().optional(),
  companyId: z.string(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface AddTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskSaved: () => void;
  taskToEdit?: Task | null;
  allLeads: Lead[];
  allAppointments?: Appointment[];
}

export default function AddTaskDialog({ isOpen, onOpenChange, onTaskSaved, taskToEdit, allLeads, allAppointments = [] }: AddTaskDialogProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const { control, handleSubmit, reset, formState: { errors, isSubmitting }, setValue, watch } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
  });

  const selectedLeadId = watch("leadId");
  const [taskSuggestions, setTaskSuggestions] = useState<string[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);


  useEffect(() => {
    if (isOpen && appUser?.companyId) {
      if (taskToEdit) {
        reset({
          title: taskToEdit.title,
          notes: taskToEdit.notes || '',
          priority: taskToEdit.priority,
          status: taskToEdit.status,
          dueDate: new Date(taskToEdit.dueDate),
          leadId: taskToEdit.leadId || '_NONE_',
          appointmentId: taskToEdit.appointmentId || '_NONE_',
          companyId: taskToEdit.companyId,
        });
      } else {
        reset({
          title: '',
          notes: '',
          priority: 'Medium',
          status: 'To Do',
          dueDate: new Date(),
          leadId: '_NONE_',
          appointmentId: '_NONE_',
          companyId: appUser.companyId,
        });
      }
      setTaskSuggestions(null); // Clear suggestions when dialog opens/changes
    }
  }, [isOpen, taskToEdit, reset, appUser]);

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    setTaskSuggestions(null);
    
    const lead = allLeads.find(l => l.id === selectedLeadId);

    const input: GenerateTaskSuggestionsInput = {
        leadStatus: lead?.status || 'New',
        leadContext: lead?.notes?.slice(-200) || 'General business task',
        numSuggestions: 3,
    };

    try {
        const result = await generateTaskSuggestions(input);
        setTaskSuggestions(result.taskSuggestions);
        toast({ title: 'AI Suggestions Ready' });
    } catch (e: any) {
        toast({ title: "Suggestion Error", description: e.message || "Could not generate suggestions.", variant: "destructive"});
    } finally {
        setIsGenerating(false);
    }
  };

  const useSuggestion = (title: string) => {
    setValue('title', title, { shouldValidate: true });
    setTaskSuggestions(null);
  };


  const onSubmit: SubmitHandler<TaskFormData> = async (data) => {
     if (!appUser?.companyId) {
        toast({ title: "Error", description: "Cannot save task without a company context.", variant: "destructive"});
        return;
    }

    const taskPayload = {
        ...data,
        dueDate: data.dueDate.toISOString(),
        leadId: data.leadId === '_NONE_' ? undefined : data.leadId,
        appointmentId: data.appointmentId === '_NONE_' ? undefined : data.appointmentId,
    };

    if (taskToEdit) {
      await updateStoredTask({ ...taskToEdit, ...taskPayload });
      toast({ title: 'Task Updated', description: `Task "${data.title}" has been saved.` });
      logActivity({ companyId: appUser.companyId, description: `Task updated: "${data.title.substring(0,30)}..."`, type: 'task' });
    } else {
      await addStoredTask(taskPayload);
      toast({ title: 'Task Created', description: `New task "${data.title}" has been added.` });
      logActivity({ companyId: appUser.companyId, description: `New task created: "${data.title.substring(0,30)}..."`, type: 'task' });
    }
    onTaskSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription>Fill in the details for your task. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-3">
          <input type="hidden" {...control.register("companyId")} />
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label htmlFor="title">Title</Label>
              <Button type="button" variant="ghost" size="sm" onClick={handleGenerateSuggestions} disabled={isGenerating}>
                <Wand2 className="mr-2 h-4 w-4" />
                {isGenerating ? 'Suggesting...' : 'Suggest with AI'}
              </Button>
            </div>
            <Controller name="title" control={control} render={({ field }) => <Input id="title" {...field} />} />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
            {isGenerating && <div className="flex items-center text-muted-foreground text-sm mt-2"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating suggestions...</div>}
            {taskSuggestions && (
                <div className="mt-2 space-y-1">
                    <Label className="text-xs">Suggestions:</Label>
                    <ul className="space-y-1">
                        {taskSuggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-center justify-between text-sm p-1.5 bg-muted/50 rounded-md">
                                <span className="flex-grow pr-2">{suggestion}</span>
                                <Button type="button" size="xs" variant="secondary" onClick={() => useSuggestion(suggestion)}>Use</Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Controller name="status" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="To Do">To Do</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Controller name="priority" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          
           <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Controller
                    name="dueDate"
                    control={control}
                    render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                    )}
                />
                 {errors.dueDate && <p className="text-sm text-destructive mt-1">{errors.dueDate.message}</p>}
            </div>

            <div>
                <Label htmlFor="leadId">Link to Lead (Optional)</Label>
                <Controller
                    name="leadId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || '_NONE_'}>
                            <SelectTrigger id="leadId"><SelectValue placeholder="Select a lead..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_NONE_">None</SelectItem>
                                {Array.isArray(allLeads) && allLeads.map(lead => (
                                    <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            <div>
                <Label htmlFor="appointmentId">Link to Appointment (Optional)</Label>
                <Controller
                    name="appointmentId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || '_NONE_'}>
                            <SelectTrigger id="appointmentId"><SelectValue placeholder="Select an appointment..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="_NONE_">None</SelectItem>
                                {Array.isArray(allAppointments) && allAppointments.map(appt => (
                                    <SelectItem key={appt.id} value={appt.id}>
                                        {appt.title} - {format(new Date(appt.startTime), 'MMM d, yyyy')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Controller name="notes" control={control} render={({ field }) => <Textarea id="notes" {...field} placeholder="Add any relevant notes here..."/>} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Task'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
