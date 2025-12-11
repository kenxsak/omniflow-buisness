import { NextRequest, NextResponse } from 'next/server';
import { adminDb, verifyAuthToken } from '@/lib/firebase-admin';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.replace('Bearer ', '');
    
    if (!idToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - No auth token provided' 
      }, { status: 401 });
    }

    const decodedToken = await verifyAuthToken(idToken);
    if (!decodedToken || !decodedToken.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - Invalid token' 
      }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database not initialized' 
      }, { status: 500 });
    }

    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'superadmin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized - Super Admin access required' 
      }, { status: 403 });
    }

    const cronSecret = process.env.CRON_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    
    const response = await fetch(`${baseUrl}/api/cron/process-email-automations`, {
      method: 'GET',
      headers: cronSecret ? {
        'Authorization': `Bearer ${cronSecret}`,
      } : {},
    });

    const data = await response.json();

    return NextResponse.json({
      success: response.ok,
      triggeredBy: userData.email,
      triggeredAt: new Date().toISOString(),
      ...data,
    });
  } catch (error: any) {
    console.error('Error triggering email automations:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to trigger email automations',
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
