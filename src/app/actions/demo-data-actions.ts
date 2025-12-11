'use server';

import { serverDb } from '@/lib/firebase-server';
import { collection, doc, addDoc, getDoc, updateDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import type { Lead } from '@/lib/mock-data';
import type { Task } from '@/types/task';
import type { Deal, DealStatus } from '@/types/crm';

const DEMO_CONTACTS = [
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+91 98765 43210',
    status: 'New' as const,
    source: 'Website',
    notes: 'Interested in enterprise solution. Follow up next week.',
  },
  {
    name: 'Rahul Verma',
    email: 'rahul.v@techcorp.in',
    phone: '+91 87654 32109',
    status: 'Contacted' as const,
    source: 'LinkedIn',
    notes: 'Had initial call. Needs pricing information.',
  },
  {
    name: 'Anita Desai',
    email: 'anita.desai@startup.io',
    phone: '+91 76543 21098',
    status: 'Qualified' as const,
    source: 'Referral',
    notes: 'Decision maker. Budget approved for Q1.',
  },
  {
    name: 'Vikram Patel',
    email: 'vikram@globaltech.com',
    phone: '+91 65432 10987',
    status: 'Won' as const,
    source: 'Trade Show',
    notes: 'Signed annual contract. Great customer!',
  },
  {
    name: 'Meera Singh',
    email: 'meera.singh@enterprise.co',
    phone: '+91 54321 09876',
    status: 'Contacted' as const,
    source: 'Email Campaign',
    notes: 'Requested demo. Schedule for Thursday.',
  },
];

const DEMO_TASKS = [
  {
    title: 'Follow up with Priya about enterprise pricing',
    priority: 'High' as const,
    status: 'To Do' as const,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Send pricing PDF and schedule a call.',
  },
  {
    title: 'Send product demo to Rahul',
    priority: 'Medium' as const,
    status: 'In Progress' as const,
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Prepare custom demo based on their requirements.',
  },
  {
    title: 'Prepare proposal for Anita',
    priority: 'High' as const,
    status: 'To Do' as const,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Include volume discount options.',
  },
  {
    title: 'Schedule onboarding call with Vikram',
    priority: 'Medium' as const,
    status: 'Done' as const,
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Completed successfully. Very engaged customer.',
  },
  {
    title: 'Book demo meeting with Meera',
    priority: 'High' as const,
    status: 'To Do' as const,
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Thursday afternoon preferred.',
  },
];

const DEMO_DEALS: Array<{
  name: string;
  amount: number;
  currency: string;
  status: DealStatus;
  probability: number;
  contactIndex: number;
  expectedCloseDate: string;
  notes: string;
}> = [
  {
    name: 'Enterprise License - Anita Desai',
    amount: 25000,
    currency: 'USD',
    status: 'closing',
    probability: 80,
    contactIndex: 2,
    expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Final negotiations. Awaiting legal approval.',
  },
  {
    name: 'Annual Contract - Vikram Patel',
    amount: 15000,
    currency: 'USD',
    status: 'won',
    probability: 100,
    contactIndex: 3,
    expectedCloseDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Successfully closed! Great reference customer.',
  },
  {
    name: 'Pilot Program - Rahul Verma',
    amount: 5000,
    currency: 'USD',
    status: 'proposal',
    probability: 30,
    contactIndex: 1,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Sent proposal. Waiting for feedback.',
  },
];

export async function checkDemoDataSeeded(companyId: string): Promise<boolean> {
  if (!serverDb || !companyId) return false;

  try {
    const companyRef = doc(serverDb, 'companies', companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) return false;
    
    const companyData = companyDoc.data();
    return companyData?.demoDataSeeded === true;
  } catch (error) {
    console.error('Error checking demo data status:', error);
    return false;
  }
}

export async function seedDemoDataAction(
  companyId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string; contactsCreated?: number; tasksCreated?: number; dealsCreated?: number }> {
  if (!serverDb || !companyId) {
    return { success: false, message: 'Invalid parameters' };
  }

  try {
    const alreadySeeded = await checkDemoDataSeeded(companyId);
    if (alreadySeeded) {
      return { success: true, message: 'Demo data already exists', contactsCreated: 0, tasksCreated: 0, dealsCreated: 0 };
    }

    const leadsRef = collection(serverDb, 'leads');
    const existingLeadsQuery = query(leadsRef, where('companyId', '==', companyId));
    const existingLeads = await getDocs(existingLeadsQuery);
    
    if (!existingLeads.empty) {
      await updateDoc(doc(serverDb, 'companies', companyId), {
        demoDataSeeded: true,
      });
      return { success: true, message: 'Company already has contacts', contactsCreated: 0, tasksCreated: 0, dealsCreated: 0 };
    }

    const now = Timestamp.now();
    const contactIds: string[] = [];

    for (const contact of DEMO_CONTACTS) {
      const leadDoc = await addDoc(leadsRef, {
        ...contact,
        companyId,
        createdAt: now,
        lastContacted: now,
        isDemo: true,
      });
      contactIds.push(leadDoc.id);
    }

    const tasksRef = collection(serverDb, 'tasks');
    let tasksCreated = 0;
    
    for (let i = 0; i < DEMO_TASKS.length; i++) {
      const task = DEMO_TASKS[i];
      const linkedContactId = contactIds[i];
      const linkedContactName = DEMO_CONTACTS[i].name;
      
      await addDoc(tasksRef, {
        ...task,
        companyId,
        leadId: linkedContactId,
        leadName: linkedContactName,
        createdAt: now,
        updatedAt: now,
        isDemo: true,
      });
      tasksCreated++;
    }

    const dealsRef = collection(serverDb, 'deals');
    let dealsCreated = 0;
    
    for (const deal of DEMO_DEALS) {
      const contactId = contactIds[deal.contactIndex];
      const contactName = DEMO_CONTACTS[deal.contactIndex].name;
      
      await addDoc(dealsRef, {
        name: deal.name,
        amount: deal.amount,
        currency: deal.currency,
        status: deal.status,
        probability: deal.probability,
        expectedCloseDate: deal.expectedCloseDate,
        notes: deal.notes,
        companyId,
        contactId,
        contactName,
        createdBy: userId,
        createdByName: userName,
        createdAt: now,
        updatedAt: now,
        isDemo: true,
        ...(deal.status === 'won' ? { actualCloseDate: deal.expectedCloseDate } : {}),
      });
      dealsCreated++;
    }

    await updateDoc(doc(serverDb, 'companies', companyId), {
      demoDataSeeded: true,
      demoDataSeededAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Demo data created successfully',
      contactsCreated: contactIds.length,
      tasksCreated,
      dealsCreated,
    };
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return { success: false, message: 'Failed to create demo data' };
  }
}

export async function clearDemoDataAction(
  companyId: string
): Promise<{ success: boolean; message: string }> {
  if (!serverDb || !companyId) {
    return { success: false, message: 'Invalid parameters' };
  }

  try {
    const leadsRef = collection(serverDb, 'leads');
    const demoLeadsQuery = query(
      leadsRef,
      where('companyId', '==', companyId),
      where('isDemo', '==', true)
    );
    const demoLeads = await getDocs(demoLeadsQuery);

    const tasksRef = collection(serverDb, 'tasks');
    const demoTasksQuery = query(
      tasksRef,
      where('companyId', '==', companyId),
      where('isDemo', '==', true)
    );
    const demoTasks = await getDocs(demoTasksQuery);

    const dealsRef = collection(serverDb, 'deals');
    const demoDealsQuery = query(
      dealsRef,
      where('companyId', '==', companyId),
      where('isDemo', '==', true)
    );
    const demoDeals = await getDocs(demoDealsQuery);

    const { deleteDoc } = await import('firebase/firestore');
    
    for (const docSnap of demoLeads.docs) {
      await deleteDoc(doc(serverDb, 'leads', docSnap.id));
    }
    
    for (const docSnap of demoTasks.docs) {
      await deleteDoc(doc(serverDb, 'tasks', docSnap.id));
    }
    
    for (const docSnap of demoDeals.docs) {
      await deleteDoc(doc(serverDb, 'deals', docSnap.id));
    }

    await updateDoc(doc(serverDb, 'companies', companyId), {
      demoDataSeeded: false,
    });

    return { success: true, message: 'Demo data cleared successfully' };
  } catch (error) {
    console.error('Error clearing demo data:', error);
    return { success: false, message: 'Failed to clear demo data' };
  }
}
