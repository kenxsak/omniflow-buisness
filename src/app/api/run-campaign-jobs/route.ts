import { NextResponse } from 'next/server';
import { runAllCampaignJobs } from '@/lib/campaign-job-processor';

// Secure this endpoint with a cron secret
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint to process campaign jobs
 * Called every 5 minutes by Vercel Cron
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid secret.' }, { status: 401 });
  }

  try {
    const result = await runAllCampaignJobs();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error running campaign jobs via API route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
