import { NextResponse } from 'next/server';
import { serverDb as db } from '@/lib/firebase-server';

/**
 * Health check endpoint for campaign job processor
 */
export async function GET() {
  try {
    const checks = {
      database: false,
      endpoint: true,
      firebaseServer: false,
    };

    if (db) {
      checks.database = true;
      checks.firebaseServer = true;
    }

    const allChecksPass = Object.values(checks).every(check => check === true);

    return NextResponse.json({
      success: allChecksPass,
      message: allChecksPass 
        ? 'Campaign job processor is healthy and ready' 
        : 'Some checks failed - see details',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Health check failed',
      error: error.message,
    }, { status: 500 });
  }
}
