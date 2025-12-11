'use client';

import dynamic from 'next/dynamic';

const AICampaignStudioPage = dynamic(() => import('./client-page'), {
  ssr: false,
  loading: () => (
    <div className="container mx-auto py-6 max-w-6xl flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading AI Campaign Studio...</p>
      </div>
    </div>
  ),
});

export default AICampaignStudioPage;
