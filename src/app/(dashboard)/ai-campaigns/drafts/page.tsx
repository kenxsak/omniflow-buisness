'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, FileText, Trash2, RefreshCw, Eye, Mail, MessageSquare, Send 
} from 'lucide-react';
import { format } from 'date-fns';
import { getAICampaignDraftsAction, deleteAICampaignDraftAction } from '@/app/actions/ai-campaign-draft-actions';
import type { UnifiedCampaignDraft } from '@/types/ai-campaigns';
import Link from 'next/link';
import PageTitle from '@/components/ui/page-title';

export default function AICampaignDraftsPage() {
  const { appUser } = useAuth();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<UnifiedCampaignDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (appUser?.idToken) {
      loadDrafts();
    }
  }, [appUser?.idToken]);

  const loadDrafts = async () => {
    if (!appUser?.idToken) return;
    
    setIsLoading(true);
    try {
      const result = await getAICampaignDraftsAction({ idToken: appUser.idToken });
      
      if (result.success && result.drafts) {
        setDrafts(result.drafts);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load drafts',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load drafts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (draftId: string) => {
    if (!appUser?.idToken) return;
    if (!confirm('Are you sure you want to delete this draft?')) return;
    
    setDeletingId(draftId);
    try {
      const result = await deleteAICampaignDraftAction({
        idToken: appUser.idToken,
        draftId,
      });
      
      if (result.success) {
        toast({
          title: 'Draft Deleted',
          description: 'The draft has been deleted successfully',
        });
        loadDrafts();
      } else {
        toast({
          title: 'Delete Failed',
          description: result.error || 'Failed to delete draft',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete draft',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'ready':
        return <Badge className="bg-blue-500">Ready</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'generating':
        return <Badge variant="secondary">Generating</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChannelIcons = (channels: string[]) => {
    return channels.map((channel) => {
      switch (channel) {
        case 'email':
          return <Mail key={channel} className="h-3 w-3" />;
        case 'sms':
          return <MessageSquare key={channel} className="h-3 w-3" />;
        case 'whatsapp':
          return <Send key={channel} className="h-3 w-3" />;
        default:
          return null;
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageTitle 
          title="AI Campaign Drafts" 
          description="View and manage your saved campaign drafts"
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
          title="AI Campaign Drafts" 
          description="View and manage your saved campaign drafts"
        />
        <div className="flex gap-2">
          <Button onClick={loadDrafts} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button asChild variant="accent">
            <Link href="/ai-campaigns">
              Create New Campaign
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saved Drafts</CardTitle>
          <CardDescription>
            Your AI-generated campaign drafts that can be edited or published
          </CardDescription>
        </CardHeader>
        <CardContent>
          {drafts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No drafts found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Drafts will appear here when you generate campaigns in the AI Campaign Studio
              </p>
              <Button asChild className="mt-4" variant="accent">
                <Link href="/ai-campaigns">
                  Create Your First Campaign
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Goal</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI Credits</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((draft) => {
                  const createdDate = typeof draft.createdAt === 'string'
                    ? new Date(draft.createdAt)
                    : draft.createdAt.toDate();
                  
                  return (
                    <TableRow key={draft.id}>
                      <TableCell className="font-medium">
                        {draft.parsedBrief?.campaignGoal || 'No goal specified'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {getChannelIcons(draft.selectedChannels)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(draft.status)}</TableCell>
                      <TableCell>{draft.aiCreditsConsumed || 0}</TableCell>
                      <TableCell>{format(createdDate, 'MMM dd, HH:mm')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(draft.id)}
                            disabled={deletingId === draft.id}
                          >
                            {deletingId === draft.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
