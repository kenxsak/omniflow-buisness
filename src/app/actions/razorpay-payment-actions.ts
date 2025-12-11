/**
 * Razorpay Payment Actions
 * Server actions for Razorpay payment processing (India)
 * Uses fixed INR pricing for Indian customers
 */

'use server';

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { serverDb } from '@/lib/firebase-server';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { verifyAuthToken } from '@/lib/firebase-admin';
import type { Plan } from '@/types/saas';
import type { BillingCycle, RazorpayOrder } from '@/types/payment';
import { addMonths, addYears } from 'date-fns';

const FIXED_INR_PRICING: Record<string, number> = {
  plan_starter: 1999,
  plan_pro: 7999,
  plan_enterprise: 20999,
};

// Initialize Razorpay
const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }
  
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * Create Razorpay order for plan subscription
 */
export async function createRazorpayOrder(params: {
  idToken: string;
  planId: string;
  billingCycle: BillingCycle;
}): Promise<{ success: boolean; order?: RazorpayOrder; error?: string }> {
  try {
    // Verify authentication
    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Authentication required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const userId = verification.uid;
    
    // Get user data
    const userRef = doc(serverDb, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }
    
    const user = userDoc.data();
    const razorpay = getRazorpayInstance();

    // Get plan details
    const planRef = doc(serverDb, 'plans', params.planId);
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) {
      return { success: false, error: 'Plan not found' };
    }

    const plan = planDoc.data() as Plan;
    
    const basePrice = FIXED_INR_PRICING[params.planId];
    if (!basePrice) {
      return { success: false, error: 'Free plan does not require payment' };
    }
    
    let amountINR = basePrice;
    if (params.billingCycle === 'yearly') {
      const yearlyPrice = basePrice * 12;
      const discount = plan.yearlyDiscountPercentage || 0;
      amountINR = Math.round(yearlyPrice * (1 - discount / 100));
    }
    
    const amountINRPaise = amountINR * 100;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amountINRPaise,
      currency: 'INR',
      receipt: `order_${user.companyId}_${Date.now()}`,
      notes: {
        companyId: user.companyId,
        planId: params.planId,
        billingCycle: params.billingCycle,
        userId: userId,
      },
    });

    // Store order in Firestore for verification
    const orderRef = doc(serverDb, 'razorpayOrders', order.id);
    await setDoc(orderRef, {
      orderId: order.id,
      companyId: user.companyId,
      planId: params.planId,
      billingCycle: params.billingCycle,
      amount: amountINRPaise,
      currency: 'INR',
      status: 'created',
      createdAt: serverTimestamp(),
    });

    return {
      success: true,
      order: {
        orderId: order.id,
        amount: amountINRPaise,
        currency: 'INR',
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
      },
    };
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return {
      success: false,
      error: error.message || 'Failed to create order',
    };
  }
}

/**
 * Verify Razorpay payment signature
 */
export async function verifyRazorpayPayment(params: {
  idToken: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const verification = await verifyAuthToken(params.idToken);
    if (!verification.success) {
      return { success: false, error: 'Authentication required' };
    }

    if (!serverDb) {
      return { success: false, error: 'Database not initialized' };
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return { success: false, error: 'Razorpay not configured' };
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');

    if (expectedSignature !== params.signature) {
      return { success: false, error: 'Invalid payment signature' };
    }

    // Get order details
    const orderRef = doc(serverDb, 'razorpayOrders', params.orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      return { success: false, error: 'Order not found' };
    }

    const orderData = orderDoc.data();
    
    // Get plan details
    const planRef = doc(serverDb, 'plans', orderData.planId);
    const planDoc = await getDoc(planRef);
    
    if (!planDoc.exists()) {
      return { success: false, error: 'Plan not found' };
    }

    const plan = planDoc.data() as Plan;

    // Calculate new expiry date
    const now = new Date();
    const expiryDate = orderData.billingCycle === 'yearly' 
      ? addYears(now, 1)
      : addMonths(now, 1);

    // Update company subscription
    const companyRef = doc(serverDb, 'companies', orderData.companyId);
    await updateDoc(companyRef, {
      planId: orderData.planId,
      billingCycle: orderData.billingCycle,
      planExpiresAt: expiryDate.toISOString(),
      status: 'active',
      razorpayCustomerId: null, // Razorpay doesn't require customer ID for one-time payments
      updatedAt: serverTimestamp(),
    });

    // Update order status
    await updateDoc(orderRef, {
      status: 'paid',
      paymentId: params.paymentId,
      paidAt: serverTimestamp(),
    });

    // Record transaction
    const transactionRef = doc(serverDb, 'paymentTransactions', `razorpay_${params.paymentId}`);
    await setDoc(transactionRef, {
      companyId: orderData.companyId,
      gateway: 'razorpay',
      gatewayTransactionId: params.paymentId,
      amount: orderData.amount / 100, // Convert paise to rupees
      currency: 'INR',
      status: 'succeeded',
      description: `${plan.name} Plan - ${orderData.billingCycle}`,
      metadata: {
        orderId: params.orderId,
        planId: orderData.planId,
        billingCycle: orderData.billingCycle,
      },
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error verifying Razorpay payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get public Razorpay key
 */
export async function getRazorpayPublicKey(): Promise<{ success: boolean; key?: string; error?: string }> {
  try {
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      return { success: false, error: 'Razorpay not configured' };
    }
    return { success: true, key };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
