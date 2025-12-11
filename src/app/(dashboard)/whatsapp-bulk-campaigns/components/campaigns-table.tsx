"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { WhatsAppCampaign } from '@/types/messaging';

interface CampaignsTableProps {
  campaigns: WhatsAppCampaign[];
  onView: (campaign: WhatsAppCampaign) => void;
  onDelete: (campaignId: string) => void;
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

export default function CampaignsTable({ campaigns, onView, onDelete }: CampaignsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Campaign</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Recipients</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => (
          <TableRow key={campaign.id}>
            <TableCell className="font-medium">{campaign.name}</TableCell>
            <TableCell>
              <Badge variant="outline">{campaign.platform?.toUpperCase()}</Badge>
            </TableCell>
            <TableCell>{getStatusBadge(campaign.status)}</TableCell>
            <TableCell>{(campaign as any).recipientCount || 0}</TableCell>
            <TableCell>
              {campaign.createdAt ? format(new Date(campaign.createdAt), 'MMM d, yyyy') : '-'}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => onView(campaign)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(campaign.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
