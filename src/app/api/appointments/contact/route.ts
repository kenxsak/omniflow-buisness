import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, adminDb } from '@/lib/firebase-admin';
import { getAppointments, getAppointmentsByClientEmail } from '@/lib/appointments-data';
import type { Appointment, AppointmentFilter } from '@/types/appointments';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const idToken = authHeader?.replace('Bearer ', '');
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    const authResult = await verifyAuthToken(idToken);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || 'Invalid token' },
        { status: 401 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    const userDoc = await adminDb.collection('users').doc(authResult.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const companyId = userData?.companyId;

    if (!companyId) {
      return NextResponse.json(
        { error: 'User does not have a company assigned' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { contactId, contactEmail } = body;

    if (!contactId && !contactEmail) {
      return NextResponse.json(
        { error: 'Either contactId or contactEmail is required' },
        { status: 400 }
      );
    }

    let appointments: Appointment[] = [];

    if (contactId) {
      const filter: AppointmentFilter = { clientId: contactId };
      appointments = await getAppointments(companyId, filter);
    }
    
    if (contactEmail && appointments.length === 0) {
      appointments = await getAppointmentsByClientEmail(companyId, contactEmail);
    }

    return NextResponse.json({ 
      success: true, 
      appointments 
    });
  } catch (error: any) {
    console.error('Error fetching contact appointments:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch appointments' },
      { status: 500 }
    );
  }
}
