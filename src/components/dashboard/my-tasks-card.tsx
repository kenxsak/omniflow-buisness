'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ClipboardCheck, ArrowRight, Plus, Loader2, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { format, isToday, isPast, isTomorrow } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { getStoredTasks, updateStoredTask } from '@/lib/task-data';
import type { Task } from '@/types/task';
import { useToast } from '@/hooks/use-toast';

export function MyTasksCard() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      if (!appUser?.companyId) {
        setIsLoading(false);
        return;
      }

      try {
        const allTasks = await getStoredTasks(appUser.companyId);
        const pendingTasks = allTasks
          .filter(task => task.status !== 'Done')
          .sort((a, b) => {
            const priorityOrder = { High: 0, Medium: 1, Low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            if (a.dueDate && b.dueDate) {
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            return 0;
          })
          .slice(0, 4);
        setTasks(pendingTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadTasks();
  }, [appUser?.companyId]);

  const handleCompleteTask = async (task: Task) => {
    if (!appUser?.companyId) return;

    try {
      await updateStoredTask({ id: task.id, status: 'Done' });
      setTasks(prev => prev.filter(t => t.id !== task.id));
      toast({
        title: 'Task Completed',
        description: `"${task.title}" marked as done`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'Low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDueLabel = (dueDate?: string) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) {
      return { label: 'Overdue', className: 'text-red-600' };
    }
    if (isToday(date)) {
      return { label: 'Due today', className: 'text-orange-600' };
    }
    if (isTomorrow(date)) {
      return { label: 'Tomorrow', className: 'text-blue-600' };
    }
    return { label: format(date, 'MMM d'), className: 'text-muted-foreground' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-green-500" />
            My Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const overdueCount = tasks.filter(t => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))).length;
  const highPriorityCount = tasks.filter(t => t.priority === 'High').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-green-500" />
              My Tasks
            </CardTitle>
            {tasks.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {tasks.length} pending
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tasks">
              View All <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
        {(overdueCount > 0 || highPriorityCount > 0) && (
          <div className="flex gap-2 mt-2">
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                <AlertCircle className="h-3 w-3 mr-1" />
                {overdueCount} overdue
              </Badge>
            )}
            {highPriorityCount > 0 && (
              <Badge variant="default" className="text-[10px] bg-red-500">
                {highPriorityCount} high priority
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-6">
            <ClipboardCheck className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No pending tasks</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/tasks">
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const dueInfo = getDueLabel(task.dueDate);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors group"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleCompleteTask(task)}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate">{task.title}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                    </div>
                    {dueInfo && (
                      <div className={`flex items-center gap-1 text-[11px] ${dueInfo.className}`}>
                        <Clock className="h-3 w-3" />
                        {dueInfo.label}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
