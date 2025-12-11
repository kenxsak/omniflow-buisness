
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { Task } from '@/types/task';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isSameDay } from 'date-fns';
import { Edit } from 'lucide-react';

interface TaskCalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

const priorityDotColors: Record<Task['priority'], string> = {
  High: 'bg-red-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-blue-500',
};

const TaskDot: React.FC<{ priority: Task['priority'] }> = ({ priority }) => (
  <div className={`h-2 w-2 rounded-full ${priorityDotColors[priority]}`}></div>
);

export default function TaskCalendarView({ tasks, onEditTask }: TaskCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(task);
    });
    return map;
  }, [tasks]);

  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(dateKey) || [];
  }, [selectedDate, tasksByDate]);
  
  // Set initial selected date to today if there are tasks today, otherwise the first day with tasks
  useEffect(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    if (tasksByDate.has(todayKey)) {
        setSelectedDate(new Date());
    } else if (tasks.length > 0) {
        // Find the earliest date with a task
        const firstTaskDate = tasks.map(t => new Date(t.dueDate)).sort((a,b) => a.getTime() - b.getTime())[0];
        setSelectedDate(firstTaskDate);
    } else {
        setSelectedDate(new Date());
    }
  }, [tasks, tasksByDate]);


  const DayWithDots: React.FC<{ date: Date }> = ({ date }) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayTasks = tasksByDate.get(dateKey) || [];

    return (
      <div className="relative h-full w-full flex items-center justify-center">
        <span>{date.getDate()}</span>
        {dayTasks.length > 0 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-0.5">
            {dayTasks.slice(0, 3).map((task) => (
              <TaskDot key={task.id} priority={task.priority} />
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const modifiers = useMemo(() => {
    const modifiersMap: Record<string, Date[]> = {
      hasTasks: [],
    };
    tasksByDate.forEach((_, dateKey) => {
        modifiersMap.hasTasks.push(new Date(dateKey + 'T12:00:00')); // Use noon to avoid timezone issues
    });
    return modifiersMap;
  }, [tasksByDate]);

  const modifiersStyles = {
    hasTasks: {
        // We will use the custom component to render dots, so no specific style needed here
        // But we could add a subtle background for days with tasks if we wanted
        // backgroundColor: 'hsl(var(--muted))'
    },
  };

  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex justify-center">
           <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border p-0"
              components={{
                 Day: (props) => <DayWithDots date={props.date} />
              }}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
            />
        </div>
        <div>
          <CardHeader className="p-1 mb-2">
            <CardTitle className="text-lg">
                Tasks for {selectedDate ? format(selectedDate, 'PPP') : '...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-1 space-y-3 max-h-[350px] overflow-y-auto">
            {tasksForSelectedDate.length > 0 ? (
              tasksForSelectedDate.map(task => (
                <div key={task.id} className="p-3 border rounded-md bg-muted/30">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-sm flex-grow pr-2">{task.title}</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onEditTask(task)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <Badge className={priorityDotColors[task.priority]} />
                    <span className="text-xs">{task.priority} Priority</span>
                    <Badge variant="outline" className="text-xs">{task.status}</Badge>
                  </div>
                  {task.leadName && <p className="text-xs text-muted-foreground mt-1">Lead: {task.leadName}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No tasks due on this day.</p>
            )}
          </CardContent>
        </div>
      </CardContent>
    </Card>
  );
}
