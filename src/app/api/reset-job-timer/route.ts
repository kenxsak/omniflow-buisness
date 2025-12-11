import { NextRequest, NextResponse } from 'next/server';
import { serverDb as db } from '@/lib/firebase-server';
import { doc, updateDoc } from 'firebase/firestore';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify secret
    const authHeader = request.headers.get('Authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');
    
    if (providedSecret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid secret.' },
        { status: 401 }
      );
    }

    const jobId = request.nextUrl.searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Reset the job's retry timer to allow immediate processing
    await updateDoc(doc(db, 'campaignJobs', jobId), {
      'retry.nextRetryAt': new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Reset retry timer for job ${jobId}`);

    return NextResponse.json({ 
      success: true, 
      message: `Job ${jobId} is now ready for immediate retry` 
    });
  } catch (error) {
    console.error('Error resetting job timer:', error);
    return NextResponse.json(
      { error: 'Failed to reset job timer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
