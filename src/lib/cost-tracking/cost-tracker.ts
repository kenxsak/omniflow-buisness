'use server';

import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import type { DailyCostRecord } from './cost-types';

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function trackCost(
  companyId: string,
  category: 'firebase' | 'ai' | 'messaging',
  subcategory: string,
  amount: number,
  cost: number
): Promise<void> {
  if (!serverDb) {
    console.error('Database not initialized');
    return;
  }

  const todayKey = getTodayKey();
  const docId = `${companyId}_${todayKey}`;
  const docRef = doc(serverDb, 'companyCosts', docId);

  try {
    const existingDoc = await getDoc(docRef);

    if (!existingDoc.exists()) {
      const newRecord: DailyCostRecord = {
        companyId,
        date: todayKey,
        firebase: { reads: 0, writes: 0, deletes: 0, cost: 0 },
        ai: { textTokens: 0, imageCount: 0, ttsCount: 0, cost: 0 },
        messaging: { emailsSent: 0, smsSent: 0, whatsappSent: 0, cost: 0 },
        totalCost: 0,
        updatedAt: new Date(),
      };
      await setDoc(docRef, newRecord);
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    switch (category) {
      case 'firebase':
        if (subcategory === 'reads') updateData['firebase.reads'] = increment(amount);
        else if (subcategory === 'writes') updateData['firebase.writes'] = increment(amount);
        else if (subcategory === 'deletes') updateData['firebase.deletes'] = increment(amount);
        updateData['firebase.cost'] = increment(cost);
        break;
      case 'ai':
        if (subcategory === 'text') updateData['ai.textTokens'] = increment(amount);
        else if (subcategory === 'image') updateData['ai.imageCount'] = increment(amount);
        else if (subcategory === 'tts') updateData['ai.ttsCount'] = increment(amount);
        updateData['ai.cost'] = increment(cost);
        break;
      case 'messaging':
        if (subcategory === 'email') updateData['messaging.emailsSent'] = increment(amount);
        else if (subcategory === 'sms') updateData['messaging.smsSent'] = increment(amount);
        else if (subcategory === 'whatsapp') updateData['messaging.whatsappSent'] = increment(amount);
        updateData['messaging.cost'] = increment(cost);
        break;
    }

    updateData['totalCost'] = increment(cost);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('Error tracking cost:', error);
  }
}

export async function getDailyCost(companyId: string, date?: string): Promise<DailyCostRecord | null> {
  if (!serverDb) return null;

  const dateKey = date || getTodayKey();
  const docRef = doc(serverDb, 'companyCosts', `${companyId}_${dateKey}`);

  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as DailyCostRecord;
    }
    return null;
  } catch (error) {
    console.error('Error getting daily cost:', error);
    return null;
  }
}

export async function getMonthlySpend(companyId: string): Promise<number> {
  if (!serverDb) return 0;

  const monthKey = getMonthKey();
  const today = new Date();
  const startOfMonth = `${monthKey}-01`;
  const endOfMonth = `${monthKey}-${today.getDate().toString().padStart(2, '0')}`;
  
  try {
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const costsRef = collection(serverDb, 'companyCosts');
    const q = query(
      costsRef,
      where('companyId', '==', companyId),
      where('date', '>=', startOfMonth),
      where('date', '<=', endOfMonth)
    );
    
    const snapshot = await getDocs(q);
    
    let totalSpend = 0;
    snapshot.forEach((doc) => {
      const data = doc.data() as DailyCostRecord;
      totalSpend += data.totalCost || 0;
    });
    
    return totalSpend;
  } catch (error) {
    console.error('Error fetching monthly spend:', error);
    return 0;
  }
}

export async function trackEmailSend(companyId: string, count: number, costPerEmail: number): Promise<void> {
  await trackCost(companyId, 'messaging', 'email', count, count * costPerEmail);
}

export async function trackSMSSend(companyId: string, count: number, costPerSMS: number): Promise<void> {
  await trackCost(companyId, 'messaging', 'sms', count, count * costPerSMS);
}

export async function trackWhatsAppSend(companyId: string, count: number, costPerMessage: number): Promise<void> {
  await trackCost(companyId, 'messaging', 'whatsapp', count, count * costPerMessage);
}

export async function trackAIUsage(
  companyId: string,
  type: 'text' | 'image' | 'tts',
  count: number,
  cost: number
): Promise<void> {
  await trackCost(companyId, 'ai', type, count, cost);
}
