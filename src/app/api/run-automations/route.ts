
import { NextResponse } from 'next/server';
import { runAllAutomations } from '@/lib/automation-runner';

// To secure this endpoint, we check for a 'cron secret' that must be passed
// in the request headers. This should be a long, random string that you set
// as an environment variable and configure in your scheduling service.
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // For Vercel Cron, the secret is passed in a specific header.
  // For other services (and manual testing), we check the standard Authorization header.
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid secret.' }, { status: 401 });
  }

  try {
    const result = await runAllAutomations();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error running automations via API route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
