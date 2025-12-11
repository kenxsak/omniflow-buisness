"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { WhatsAppCampaign, WhatsAppRecipient } from '@/types/messaging';

interface CampaignDetailsDialogProps {
  campaign: WhatsAppCampaign | null;
  recipients: WhatsAppRecipient[];
  isLoadingRecipients: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusBadge = (status: WhatsAppCampaign['status']) => {
  const statusConfig = {
    draft: { variant: 'secondary' as const, icon: Clock },
    scheduled: { variant: 'default' as const, icon: Clock },
    sending: { variant: 'default' as const, icon: Loader2 },
    completed: { variant: 'default' as const, icon: CheckCircle },
    failed: { variant: 'destructive' as const, icon: XCircle },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export default function CampaignDetailsDialog({
  campaign,
  recipients,
  isLoadingRecipients,
  open,
  onOpenChange,
}: CampaignDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campaign?.name}</DialogTitle>
          <DialogDescription>
            Campaign details and recipient status
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Platform:</span>
              <span className="ml-2">{campaign?.platform?.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Template:</span>
              <span className="ml-2">{campaign?.templateName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2">{campaign && getStatusBadge(campaign.status)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Recipients:</span>
              <span className="ml-2">{(campaign as any)?.recipientCount || 0}</span>
            </div>
          </div>
          
          <ScrollArea className="h-[300px] border rounded-lg p-4">
            {isLoadingRecipients ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recipients.length === 0 ? (
              <div className="text-center text-muted-foreground">
                No recipient details available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient, i) => (
                    <TableRow key={i}>
                      <TableCell>{recipient.phone}</TableCell>
                      <TableCell>{recipient.name || '-'}</TableCell>
                      <TableCell>
                        {recipient.status === 'success' ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Sent
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" /> Failed
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
