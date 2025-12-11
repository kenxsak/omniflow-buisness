import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface EmailList {
  id: string;
  automationId?: string;
  companyId: string;
  type: string;
}

interface EmailContact {
  id: string;
  email: string;
  name: string;
  status: string;
  listId: string;
}

interface AutomationStep {
  id: string;
  type: 'email' | 'delay';
  order: number;
  delayDays?: number;
  delayHours?: number;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
  }

  let totalEnrolled = 0;
  const errors: string[] = [];

  try {
    const companiesSnapshot = await adminDb.collection('companies').get();

    for (const companyDoc of companiesSnapshot.docs) {
      const companyId = companyDoc.id;

      try {
        const listsSnapshot = await adminDb
          .collection('companies')
          .doc(companyId)
          .collection('emailLists')
          .get();

        for (const listDoc of listsSnapshot.docs) {
          const list = { id: listDoc.id, ...listDoc.data() } as EmailList;
          
          if (!list.automationId) continue;

          const automationDoc = await adminDb
            .collection('companies')
            .doc(companyId)
            .collection('emailAutomationSequences')
            .doc(list.automationId)
            .get();

          if (!automationDoc.exists) continue;
          
          const automation = automationDoc.data();
          if (automation?.status !== 'active') continue;

          const contactsSnapshot = await adminDb
            .collection('companies')
            .doc(companyId)
            .collection('emailContacts')
            .where('listId', '==', list.id)
            .where('status', '==', 'active')
            .get();

          for (const contactDoc of contactsSnapshot.docs) {
            const contact = { id: contactDoc.id, ...contactDoc.data() } as EmailContact;

            const existingStateSnapshot = await adminDb
              .collection('companies')
              .doc(companyId)
              .collection('contactAutomationStates')
              .where('contactId', '==', contact.id)
              .where('automationId', '==', list.automationId)
              .limit(1)
              .get();

            if (!existingStateSnapshot.empty) continue;

            const steps = automation.steps as AutomationStep[];
            const firstStep = steps[0];
            let delayMs = 60 * 1000;
            
            if (firstStep?.type === 'delay') {
              delayMs = ((firstStep.delayDays || 0) * 24 * 60 * 60 * 1000) + ((firstStep.delayHours || 0) * 60 * 60 * 1000);
              if (delayMs === 0) delayMs = 60 * 1000;
            }
            
            const nextStepTime = Timestamp.fromMillis(Date.now() + delayMs);

            await adminDb
              .collection('companies')
              .doc(companyId)
              .collection('contactAutomationStates')
              .add({
                contactId: contact.id,
                contactEmail: contact.email,
                listId: list.id,
                automationId: list.automationId,
                status: 'active',
                currentStepIndex: 0,
                nextStepTime,
                emailsSentInSequence: 0,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              });

            totalEnrolled++;
          }
        }
      } catch (error: any) {
        errors.push(`Company ${companyId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalEnrolled,
      errors: errors.slice(0, 10),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Enrollment cron error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
