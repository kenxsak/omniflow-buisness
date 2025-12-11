import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const checks = {
      database: false,
      endpoint: true,
    };

    if (db) {
      checks.database = true;
    }

    const allChecksPass = Object.values(checks).every(check => check === true);

    return NextResponse.json({
      success: allChecksPass,
      message: allChecksPass 
        ? 'Automation endpoint is healthy and ready' 
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
