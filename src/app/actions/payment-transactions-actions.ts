'use server';

import { serverDb } from '@/lib/firebase-server';
import { collection, getDocs, query, orderBy, limit, where, doc, getDoc, updateDoc, serverTimestamp, startAfter, DocumentSnapshot, Timestamp } from 'firebase/firestore';
import { verifyAuthToken } from '@/lib/firebase-admin';
import type { PaymentTransaction, PaymentStatus } from '@/types/payment';

export interface TransactionWithCompany extends PaymentTransaction {
  companyName?: string;
  companyEmail?: string;
  planName?: string;
}

export interface TransactionsResponse {
  success: boolean;
  transactions?: TransactionWithCompany[];
  totalCount?: number;
  error?: string;
}

export async function getPaymentTransactions(params: {
  idToken: string;
  pageSize?: number;
  status?: PaymentStatus | 'all';
  gateway?: 'stripe' | 'razorpay' | 'all';
  searchTerm?: string;
}): Promise<TransactionsResponse> {
  try {
    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Authentication required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const userId = verification.uid;
    const userRef = doc(serverDb, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const user = userDoc.data();
    if (user.role !== 'superadmin') {
      return { success: false, error: 'Access denied. Super admin role required.' };
    }

    const transactionsRef = collection(serverDb, 'paymentTransactions');
    let q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(params.pageSize || 100));

    if (params.status && params.status !== 'all') {
      q = query(transactionsRef, where('status', '==', params.status), orderBy('createdAt', 'desc'), limit(params.pageSize || 100));
    }

    if (params.gateway && params.gateway !== 'all') {
      q = query(transactionsRef, where('gateway', '==', params.gateway), orderBy('createdAt', 'desc'), limit(params.pageSize || 100));
    }

    const snapshot = await getDocs(q);
    const transactions: TransactionWithCompany[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      let companyName = 'Unknown';
      let companyEmail = '';
      let planName = '';

      if (data.companyId) {
        const companyRef = doc(serverDb, 'companies', data.companyId);
        const companyDoc = await getDoc(companyRef);
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          companyName = companyData.name || 'Unknown';
          
          if (companyData.planId) {
            const planRef = doc(serverDb, 'plans', companyData.planId);
            const planDoc = await getDoc(planRef);
            if (planDoc.exists()) {
              planName = planDoc.data().name || '';
            }
          }

          const usersRef = collection(serverDb, 'users');
          const ownerQuery = query(usersRef, where('companyId', '==', data.companyId), where('role', '==', 'admin'), limit(1));
          const ownerSnapshot = await getDocs(ownerQuery);
          if (!ownerSnapshot.empty) {
            companyEmail = ownerSnapshot.docs[0].data().email || '';
          }
        }
      }

      const createdAt = data.createdAt instanceof Timestamp 
        ? data.createdAt.toDate().toISOString() 
        : data.createdAt;

      transactions.push({
        id: docSnap.id,
        companyId: data.companyId,
        gateway: data.gateway,
        gatewayTransactionId: data.gatewayTransactionId,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        description: data.description,
        metadata: data.metadata,
        createdAt: createdAt,
        companyName,
        companyEmail,
        planName,
      });
    }

    if (params.searchTerm) {
      const term = params.searchTerm.toLowerCase();
      const filtered = transactions.filter(t => 
        t.companyName?.toLowerCase().includes(term) ||
        t.companyEmail?.toLowerCase().includes(term) ||
        t.gatewayTransactionId?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
      return { success: true, transactions: filtered, totalCount: filtered.length };
    }

    return { success: true, transactions, totalCount: transactions.length };
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return { success: false, error: error.message || 'Failed to fetch transactions' };
  }
}

export async function updateTransactionStatus(params: {
  idToken: string;
  transactionId: string;
  newStatus: PaymentStatus;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Authentication required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const userId = verification.uid;
    const userRef = doc(serverDb, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const user = userDoc.data();
    if (user.role !== 'superadmin') {
      return { success: false, error: 'Access denied. Super admin role required.' };
    }

    const transactionRef = doc(serverDb, 'paymentTransactions', params.transactionId);
    await updateDoc(transactionRef, {
      status: params.newStatus,
      manualReviewNotes: params.notes || null,
      manuallyUpdatedAt: serverTimestamp(),
      manuallyUpdatedBy: userId,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating transaction status:', error);
    return { success: false, error: error.message || 'Failed to update transaction status' };
  }
}

export async function getTransactionStats(params: {
  idToken: string;
}): Promise<{ success: boolean; stats?: { total: number; succeeded: number; failed: number; pending: number; totalRevenue: { USD: number; INR: number } }; error?: string }> {
  try {
    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Authentication required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const userId = verification.uid;
    const userRef = doc(serverDb, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const user = userDoc.data();
    if (user.role !== 'superadmin') {
      return { success: false, error: 'Access denied. Super admin role required.' };
    }

    const transactionsRef = collection(serverDb, 'paymentTransactions');
    const snapshot = await getDocs(transactionsRef);

    let total = 0;
    let succeeded = 0;
    let failed = 0;
    let pending = 0;
    let totalUSD = 0;
    let totalINR = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      total++;
      
      if (data.status === 'succeeded') {
        succeeded++;
        if (data.currency === 'USD') {
          totalUSD += data.amount || 0;
        } else if (data.currency === 'INR') {
          totalINR += data.amount || 0;
        }
      } else if (data.status === 'failed') {
        failed++;
      } else if (data.status === 'pending') {
        pending++;
      }
    });

    return {
      success: true,
      stats: {
        total,
        succeeded,
        failed,
        pending,
        totalRevenue: { USD: totalUSD, INR: totalINR }
      }
    };
  } catch (error: any) {
    console.error('Error fetching transaction stats:', error);
    return { success: false, error: error.message || 'Failed to fetch transaction stats' };
  }
}
