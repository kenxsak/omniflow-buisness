/**
 * Razorpay Webhook Handler
 * Processes Razorpay webhook events for payment confirmations
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { serverDb } from '@/lib/firebase-server';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { addMonths, addYears } from 'date-fns';
import type { Plan } from '@/types/saas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Razorpay webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);

    // Handle different event types
    switch (event.event) {
      case 'payment.captured': {
        const payment = event.payload.payment.entity;
        console.log('Payment captured:', payment.id);

        if (!serverDb) {
          console.error('Database not initialized');
          break;
        }

        // Get order details from payment notes
        const orderId = payment.order_id;
        const orderRef = doc(serverDb, 'razorpayOrders', orderId);
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) {
          console.error('Order not found:', orderId);
          break;
        }

        const orderData = orderDoc.data();

        // Get plan details
        const planRef = doc(serverDb, 'plans', orderData.planId);
        const planDoc = await getDoc(planRef);

        if (!planDoc.exists()) {
          console.error('Plan not found:', orderData.planId);
          break;
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
          updatedAt: serverTimestamp(),
        });

        // Update order status
        await updateDoc(orderRef, {
          status: 'paid',
          paymentId: payment.id,
          paidAt: serverTimestamp(),
        });

        // Record transaction
        const transactionRef = doc(serverDb, 'paymentTransactions', `razorpay_${payment.id}`);
        await setDoc(transactionRef, {
          companyId: orderData.companyId,
          gateway: 'razorpay',
          gatewayTransactionId: payment.id,
          amount: payment.amount / 100, // Convert paise to rupees
          currency: payment.currency.toUpperCase(),
          status: 'succeeded',
          description: `${plan.name} Plan - ${orderData.billingCycle}`,
          metadata: {
            orderId: orderId,
            planId: orderData.planId,
            billingCycle: orderData.billingCycle,
          },
          createdAt: serverTimestamp(),
        });

        break;
      }

      case 'payment.failed': {
        const payment = event.payload.payment.entity;
        console.log('Payment failed:', payment.id);
        
        if (!serverDb) {
          break;
        }

        // Update order status
        const orderId = payment.order_id;
        const orderRef = doc(serverDb, 'razorpayOrders', orderId);
        await updateDoc(orderRef, {
          status: 'failed',
          failedAt: serverTimestamp(),
          error: payment.error_description || 'Payment failed',
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.event}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
