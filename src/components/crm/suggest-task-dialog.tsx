
"use client";

import React, { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Lead } from '@/lib/mock-data';
import { generateTrackedTaskSuggestionsAction } from '@/app/actions/tracked-ai-campaign-actions';
import { Loader2, Wand2, PlusCircle } from 'lucide-react';
import { logActivity } from '@/lib/activity-log';
import { addStoredTask } from '@/lib/task-data';
import { useAuth } from '@/hooks/use-auth';
import { showAITaskCompleteToast } from '@/lib/ai-toast-helpers';


interface SuggestTaskDialogProps {
  lead: Lead | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SuggestTaskDialog({ lead, isOpen, onOpenChange }: SuggestTaskDialogProps) {
  const [taskSuggestions, setTaskSuggestions] = useState<string[] | null>(null);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const { toast } = useToast();
  const { appUser } = useAuth();


  useEffect(() => {
    if (!isOpen) {
      setTaskSuggestions(null); // Clear suggestions when dialog closes
    }
  }, [isOpen]);

  const handleGenerateTasks = useCallback(async () => {
    if (!lead || !appUser) return;
    setIsTaskLoading(true);
    setTaskSuggestions(null);

    try {
      const result = await generateTrackedTaskSuggestionsAction(appUser.companyId, appUser.uid, {
        leadStatus: lead.status,
        leadContext: lead.notes?.slice(-200) || `Lead source: ${lead.source}`,
        numSuggestions: 3,
      });

      if (result.success && result.data) {
        setTaskSuggestions(result.data.taskSuggestions);
        showAITaskCompleteToast(toast, "Task suggestions", result.quotaInfo);
      } else {
          throw new Error(result.error || 'Failed to generate suggestions');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate task suggestions.', variant: 'destructive' });
    } finally {
      setIsTaskLoading(false);
    }
  }, [lead, toast, appUser]);
  
  const handleCreateTaskFromSuggestion = async (taskTitle: string) => {
    if (!lead || !appUser?.companyId) return;

    await addStoredTask({
        title: taskTitle,
        priority: 'Medium',
        status: 'To Do',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default due date: 1 week from now
        leadId: lead.id,
        companyId: appUser.companyId,
    });
    
    logActivity({ companyId: appUser.companyId, description: `Task created from suggestion for lead "${lead.name}".`, type: 'task' });
    toast({ title: "Task Created", description: `Task "${taskTitle.substring(0,30)}..." was added. View it in Task Management.`});
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Suggest Next Tasks for {lead.name}</DialogTitle>
          <DialogDescription>
            AI will suggest next actions based on the lead's current status ({lead.status}) and recent notes.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="flex justify-center mb-4">
                <Button onClick={handleGenerateTasks} disabled={isTaskLoading}>
                    {isTaskLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    {taskSuggestions ? 'Regenerate Suggestions' : 'Generate Suggestions'}
                </Button>
            </div>
          
            {taskSuggestions && (
            <div className="space-y-2">
                <Label>AI Suggested Tasks:</Label>
                <ul className="space-y-2">
                    {taskSuggestions.map((task, index) => (
                        <li key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 text-sm bg-muted/50 rounded-md gap-2">
                            <span className="flex-grow pr-2">{task}</span>
                            <div className="flex gap-2 self-end sm:self-center">
                                <Button variant="secondary" size="sm" onClick={() => handleCreateTaskFromSuggestion(task)}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Create Task
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
