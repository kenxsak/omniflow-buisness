/**
 * Appointment Reminders Cron Job
 * 
 * This API endpoint processes scheduled appointment reminders.
 * It should be called by a cron job (e.g., every 5 minutes).
 * 
 * Security: Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import { processScheduledReminders } from '@/lib/appointment-reminders';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[CRON] Starting appointment reminder processing...');
    
    const result = await processScheduledReminders();
    
    console.log('[CRON] Appointment reminder processing complete:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Appointment reminders processed',
      stats: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[CRON] Error processing appointment reminders:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
