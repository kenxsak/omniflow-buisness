"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/ui/page-title';
import type { Lead } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Eye } from 'lucide-react';
import { AppointmentDialog } from '@/components/appointments/appointment-dialog';
import { useToast } from '@/hooks/use-toast';

interface PipelineClientProps {
  leadsByStatus: Record<Lead['status'], Lead[]>;
  statuses: Array<Lead['status']>;
}

export function PipelineClient({ leadsByStatus, statuses }: PipelineClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleLeadClick = (leadId: string) => {
    router.push(`/crm/leads/${leadId}`);
  };

  const handleScheduleAppointment = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLead(lead);
    setAppointmentDialogOpen(true);
  };

  const statusColors: Record<Lead['status'], string> = {
    New: 'border-blue-500',
    Contacted: 'border-yellow-500',
    Qualified: 'border-green-500',
    Lost: 'border-red-500',
    Won: 'border-purple-500',
  };

  return (
    <div className="space-y-6">
      <PageTitle title="Pipeline" description="Visualize your sales pipeline" />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statuses.map(status => (
          <Card key={status} className={`border-t-4 ${statusColors[status]}`}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{status}</CardTitle>
              <div className="text-2xl font-bold">{leadsByStatus[status].length}</div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leadsByStatus[status].slice(0, 5).map(lead => (
                  <div 
                    key={lead.id} 
                    className="text-sm border rounded-md p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors group"
                  >
                    <div 
                      onClick={() => handleLeadClick(lead.id)}
                      className="flex flex-col"
                    >
                      <div className="font-medium truncate">{lead.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{lead.email}</div>
                    </div>
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleLeadClick(lead.id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => handleScheduleAppointment(lead, e)}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                ))}
                {leadsByStatus[status].length > 5 && (
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    +{leadsByStatus[status].length - 5} more
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        contact={selectedLead ? {
          id: selectedLead.id,
          name: selectedLead.name,
          email: selectedLead.email,
          phone: selectedLead.phone
        } : undefined}
        onSuccess={() => {
          setAppointmentDialogOpen(false);
          toast({
            title: 'Appointment Scheduled',
            description: `Appointment with ${selectedLead?.name} has been scheduled.`,
          });
          setSelectedLead(null);
        }}
      />
    </div>
  );
}
