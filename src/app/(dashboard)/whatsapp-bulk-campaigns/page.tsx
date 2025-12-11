'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const WhatsAppBulkCampaignsClient = dynamic(
  () => import('./whatsapp-bulk-campaigns-client'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading WhatsApp Campaigns...</p>
        </div>
      </div>
    ),
  }
);

export default function WhatsAppBulkCampaignsPage() {
  return <WhatsAppBulkCampaignsClient />;
}
