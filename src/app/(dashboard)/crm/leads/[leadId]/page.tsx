
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageTitle from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getStoredLeads, type Lead } from '@/lib/mock-data';
import { getStoredTasks, type Task } from '@/lib/task-data';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, AlertTriangle, UserCircle, Mail, Phone, Building, Briefcase, Calendar, Edit, ClipboardCheck, Link as LinkIcon, CheckCircle, Activity, DollarSign, Plus } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { ActivityTimeline } from '@/components/crm/activity-timeline';
import { ContactDeals } from '@/components/crm/contact-deals';
import { AppointmentDialog } from '@/components/appointments/appointment-dialog';

const statusColors: Record<Lead['status'], string> = {
  New: 'bg-blue-500 hover:bg-blue-600',
  Contacted: 'bg-yellow-500 hover:bg-yellow-600',
  Qualified: 'bg-green-500 hover:bg-green-600',
  Lost: 'bg-red-500 hover:bg-red-600',
  Won: 'bg-purple-500 hover:bg-purple-600',
};

const syncStatusColors: Record<NonNullable<Lead['brevoSyncStatus'] | Lead['hubspotSyncStatus']>, string> = {
    synced: 'text-green-600 dark:text-green-400',
    pending: 'text-yellow-600 dark:text-yellow-400',
    failed: 'text-red-600 dark:text-red-400',
    unsynced: 'text-gray-500 dark:text-gray-400',
    syncing: 'text-blue-500 dark:text-blue-400 animate-pulse',
};

const syncStatusIcons: Record<NonNullable<Lead['brevoSyncStatus'] | Lead['hubspotSyncStatus']>, React.ElementType> = {
    synced: CheckCircle,
    pending: Loader2,
    failed: AlertTriangle,
    unsynced: LinkIcon,
    syncing: Loader2,
};

const taskPriorityColors: Record<Task['priority'], string> = {
  High: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  Medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  Low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
};

export default function LeadDossierPage() {
    const params = useParams();
    const router = useRouter();
    const { appUser } = useAuth();
    const leadId = typeof params.leadId === 'string' ? params.leadId : '';

    const [lead, setLead] = useState<Lead | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);

    const loadData = useCallback(async () => {
        if (!appUser?.companyId || !appUser?.idToken) {
            return;
        }
        
        setIsLoading(true);
        try {
            const allLeads = await getStoredLeads(appUser.companyId);
            const foundLead = allLeads.find(l => l.id === leadId);
            setLead(foundLead || null);

            if (foundLead) {
                const allTasks = await getStoredTasks(foundLead.companyId);
                const leadTasks = allTasks.filter(t => t.leadId === leadId);
                setTasks(leadTasks);

                try {
                    const appointmentsResponse = await fetch('/api/appointments/contact', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${appUser.idToken}`
                        },
                        body: JSON.stringify({ 
                            contactId: foundLead.id,
                            contactEmail: foundLead.email 
                        })
                    });
                    if (appointmentsResponse.ok) {
                        const result = await appointmentsResponse.json();
                        setAppointments(result.appointments || []);
                    }
                } catch (e) {
                    console.error("Error loading appointments", e);
                    setAppointments([]);
                }
            }
        } catch(e) {
            console.error("Error loading lead data", e);
            setLead(null);
        }
        setIsLoading(false);
    }, [leadId, appUser?.companyId, appUser?.idToken]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!lead) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Lead Not Found</CardTitle>
                    <CardDescription>The lead with ID "{leadId}" could not be found.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild><Link href="/crm"><ArrowLeft className="mr-2 h-4 w-4" />Back to All Leads</Link></Button>
                </CardContent>
            </Card>
        );
    }
    
    const getValidDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (timestamp.toDate) return timestamp.toDate();
        if (!isNaN(new Date(timestamp).getTime())) return new Date(timestamp);
        return null;
    };
    
    const createdAtDate = getValidDate(lead.createdAt);
    const lastContactedDate = getValidDate(lead.lastContacted);
    
    const brevoSyncStatus = lead.brevoSyncStatus || 'unsynced';
    const hubspotSyncStatus = lead.hubspotSyncStatus || 'unsynced';
    const BrevoIcon = syncStatusIcons[brevoSyncStatus];
    const HubspotIcon = syncStatusIcons[hubspotSyncStatus];
    const brevoColor = syncStatusColors[brevoSyncStatus];
    const hubspotColor = syncStatusColors[hubspotSyncStatus];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/crm"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <PageTitle title={lead.name} description={`Lead Dossier - A complete overview.`} />
                 <Button variant="outline" asChild>
                    <Link href={`/crm?editLeadId=${lead.id}`}><Edit className="mr-2 h-4 w-4"/>Edit Lead</Link>
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Lead Information</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-muted-foreground"/><strong>Assigned To:</strong> <span className="text-muted-foreground">{lead.assignedTo || 'Unassigned'}</span></div>
                                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/><strong>Email:</strong> <span className="text-muted-foreground">{lead.email}</span></div>
                                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/><strong>Phone:</strong> <span className="text-muted-foreground">{lead.phone || 'N/A'}</span></div>
                                <div className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground"/><strong>Company:</strong> <span className="text-muted-foreground">{lead.attributes?.COMPANY_NAME || 'N/A'}</span></div>
                                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground"/><strong>Role:</strong> <span className="text-muted-foreground">{lead.attributes?.ROLE || 'N/A'}</span></div>
                                <div className="flex items-center gap-2"><LinkIcon className="h-4 w-4 text-muted-foreground"/><strong>Source:</strong> <span className="text-muted-foreground">{lead.source}</span></div>
                                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/><strong>Created:</strong> <span className="text-muted-foreground">{createdAtDate ? format(createdAtDate, 'PPp') : 'N/A'}</span></div>
                                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground"/><strong>Last Contact:</strong> <span className="text-muted-foreground">{lastContactedDate ? format(lastContactedDate, 'PPp') : 'N/A'}</span></div>
                                <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-muted-foreground"/><strong>Status:</strong> <Badge className={`${statusColors[lead.status]} text-white`}>{lead.status}</Badge></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="activity" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                            <TabsTrigger value="activity" className="flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                Activity
                            </TabsTrigger>
                            <TabsTrigger value="deals" className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Deals
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="flex items-center gap-2">
                                <ClipboardCheck className="h-4 w-4" />
                                Tasks
                            </TabsTrigger>
                            <TabsTrigger value="appointments" className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Appointments
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="activity" className="mt-4">
                            <ActivityTimeline 
                                contactId={lead.id} 
                                companyId={lead.companyId} 
                            />
                        </TabsContent>
                        <TabsContent value="deals" className="mt-4">
                            <ContactDeals 
                                contactId={lead.id} 
                                contactName={lead.name}
                                companyId={lead.companyId} 
                            />
                        </TabsContent>
                        <TabsContent value="tasks" className="mt-4">
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Associated Tasks</CardTitle></CardHeader>
                                <CardContent>
                                    {tasks.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Title</TableHead>
                                                    <TableHead>Priority</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Due Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tasks.map(task => (
                                                    <TableRow key={task.id}>
                                                        <TableCell className="font-medium">{task.title}</TableCell>
                                                        <TableCell><Badge className={taskPriorityColors[task.priority]}>{task.priority}</Badge></TableCell>
                                                        <TableCell><Badge variant="outline">{task.status}</Badge></TableCell>
                                                        <TableCell>{task.dueDate ? format(new Date(task.dueDate), 'PP') : 'N/A'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-muted-foreground text-center py-4">No tasks associated with this lead.</p>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href="/tasks">View All Tasks</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        </TabsContent>
                        <TabsContent value="appointments" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg">Appointments</CardTitle>
                                        <Button size="sm" onClick={() => setShowAppointmentDialog(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Schedule Appointment
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {appointments.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Title</TableHead>
                                                    <TableHead>Date & Time</TableHead>
                                                    <TableHead>Duration</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {appointments.map((appointment: any) => (
                                                    <TableRow key={appointment.id}>
                                                        <TableCell className="font-medium">{appointment.title}</TableCell>
                                                        <TableCell>
                                                            {appointment.startTime 
                                                                ? format(new Date(appointment.startTime), 'PPp')
                                                                : 'N/A'
                                                            }
                                                        </TableCell>
                                                        <TableCell>{appointment.duration || 'N/A'} min</TableCell>
                                                        <TableCell>
                                                            <Badge variant={
                                                                appointment.status === 'completed' ? 'default' :
                                                                appointment.status === 'cancelled' ? 'destructive' :
                                                                'outline'
                                                            }>
                                                                {appointment.status || 'scheduled'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button asChild variant="ghost" size="sm">
                                                                <Link href={`/appointments?id=${appointment.id}`}>View</Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                            <p className="text-muted-foreground mb-4">No appointments scheduled for this contact.</p>
                                            <Button variant="outline" onClick={() => setShowAppointmentDialog(true)}>
                                                <Plus className="mr-2 h-4 w-4" />
                                                Schedule First Appointment
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Sync Status</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div className={`flex items-center gap-2 text-sm p-3 rounded-md border ${brevoSyncStatus === 'synced' ? 'border-green-200 bg-green-50' : brevoSyncStatus === 'failed' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                                <BrevoIcon className={`h-5 w-5 ${brevoColor}`} />
                                <div>
                                    <p className={`font-semibold ${brevoColor}`}>Brevo</p>
                                    <p className={`text-xs capitalize ${brevoColor}`}>{brevoSyncStatus}</p>
                                    {brevoSyncStatus === 'failed' && <p className="text-xs text-destructive">{lead.brevoErrorMessage}</p>}
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 text-sm p-3 rounded-md border ${hubspotSyncStatus === 'synced' ? 'border-green-200 bg-green-50' : hubspotSyncStatus === 'failed' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                                <HubspotIcon className={`h-5 w-5 ${hubspotColor}`} />
                                <div>
                                    <p className={`font-semibold ${hubspotColor}`}>HubSpot</p>
                                    <p className={`text-xs capitalize ${hubspotColor}`}>{hubspotSyncStatus}</p>
                                    {hubspotSyncStatus === 'failed' && <p className="text-xs text-destructive">{lead.hubspotErrorMessage}</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Notes</CardTitle></CardHeader>
                        <CardContent>
                            <div className="prose dark:prose-invert prose-sm max-h-80 overflow-y-auto p-3 bg-muted/50 rounded-md border">
                                <pre className="whitespace-pre-wrap font-sans text-sm">{lead.notes || 'No notes yet.'}</pre>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AppointmentDialog
                open={showAppointmentDialog}
                onOpenChange={setShowAppointmentDialog}
                contact={lead ? {
                    id: lead.id,
                    name: lead.name,
                    email: lead.email,
                    phone: lead.phone
                } : undefined}
                onSuccess={() => {
                    setShowAppointmentDialog(false);
                    loadData();
                }}
            />
        </div>
    );
}
