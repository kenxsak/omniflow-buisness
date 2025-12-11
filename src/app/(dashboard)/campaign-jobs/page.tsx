'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, Mail, MessageSquare, MessageCircle,
  Clock, CheckCircle, XCircle, Loader2, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import type { CampaignJob } from '@/types/campaign-jobs';
import PageTitle from '@/components/ui/page-title';

export default function CampaignJobsPage() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<CampaignJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (appUser?.companyId) {
      loadCampaignJobs();
    }
  }, [appUser?.companyId]);

  const loadCampaignJobs = async () => {
    if (!appUser?.companyId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/campaign-jobs?companyId=${appUser.companyId}`);
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs || []);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load campaign jobs',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading campaign jobs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign jobs',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'retrying':
        return <Badge className="bg-amber-500"><RefreshCw className="h-3 w-3 mr-1" />Retrying</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChannelIcon = (jobType: string) => {
    switch (jobType) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getProviderLabel = (job: CampaignJob) => {
    if (job.jobType === 'email' && job.emailData?.provider) {
      const emailProviderMap = {
        'brevo': 'Brevo',
        'sender': 'Sender.net',
        'smtp': 'SMTP'
      };
      return emailProviderMap[job.emailData.provider] || job.emailData.provider;
    }
    
    if (job.jobType === 'sms' && job.smsData?.provider) {
      const smsProviderMap = {
        'msg91': 'MSG91',
        'fast2sms': 'Fast2SMS',
        'twilio': 'Twilio'
      };
      return smsProviderMap[job.smsData.provider] || job.smsData.provider;
    }
    
    if (job.jobType === 'whatsapp' && job.whatsappData?.provider) {
      const whatsappProviderMap = {
        'authkey': 'WMart CPaaS',
        'aisensy': 'Aisensy',
        'gupshup': 'Gupshup',
        'wati': 'WATI',
        'meta': 'Meta Cloud API',
        'msg91': 'MSG91 WhatsApp',
        'fast2sms': 'Fast2SMS WhatsApp'
      };
      return whatsappProviderMap[job.whatsappData.provider] || job.whatsappData.provider;
    }
    
    return null;
  };

  const getProgressPercentage = (job: CampaignJob) => {
    if (!job.progress || job.progress.total === 0) return 0;
    return Math.round((job.progress.sent / job.progress.total) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageTitle 
          title="Campaign Jobs" 
          description="View delivery status of your campaigns"
        />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <PageTitle 
          title="Campaign Jobs" 
          description="Track delivery status of Email, SMS, and WhatsApp campaigns"
        />
        <Button onClick={loadCampaignJobs} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Campaign Jobs</CardTitle>
          <CardDescription>
            Monitor the progress of your campaign delivery in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No campaign jobs found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Campaign jobs will appear here after you publish campaigns from the AI Campaign Studio
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Provider/Tool</TableHead>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const createdDate = job.createdAt?.toDate 
                    ? job.createdAt.toDate() 
                    : new Date(job.createdAt || Date.now());
                  const progressPercent = getProgressPercentage(job);
                  const provider = getProviderLabel(job);
                  
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getChannelIcon(job.jobType)}
                          <span className="capitalize">{job.jobType}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {provider ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {provider}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{job.campaignName}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={progressPercent} className="h-2 w-32" />
                          <p className="text-xs text-muted-foreground">
                            {job.progress?.sent || 0}/{job.progress?.total || 0} sent
                            {job.progress && job.progress.failed > 0 && (
                              <span className="text-destructive ml-2">
                                ({job.progress.failed} failed)
                              </span>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{format(createdDate, 'MMM dd, HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        {job.lastError && (
                          <p className="text-xs text-destructive truncate max-w-xs">
                            {job.lastError}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
