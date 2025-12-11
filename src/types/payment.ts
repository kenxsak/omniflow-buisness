/**
 * Payment Gateway Types
 * Supports both Stripe and Razorpay payment processing
 */

export type PaymentGateway = 'stripe' | 'razorpay';
export type BillingCycle = 'monthly' | 'yearly';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';

/**
 * Payment session for checkout
 */
export interface PaymentSession {
  sessionId: string;
  gateway: PaymentGateway;
  planId: string;
  billingCycle: BillingCycle;
  amount: number;
  currency: string;
  companyId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  status: PaymentStatus;
}

/**
 * Stripe-specific payment data
 */
export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
  clientSecret?: string;
}

/**
 * Razorpay-specific payment data
 */
export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  key: string; // Razorpay public key
}

/**
 * Subscription record in Firestore
 */
export interface Subscription {
  id: string;
  companyId: string;
  planId: string;
  billingCycle: BillingCycle;
  gateway: PaymentGateway;
  gatewayCustomerId?: string;
  gatewaySubscriptionId?: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payment transaction record
 */
export interface PaymentTransaction {
  id: string;
  companyId: string;
  subscriptionId?: string;
  gateway: PaymentGateway;
  gatewayTransactionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

/**
 * Webhook event for payment processing
 */
export interface PaymentWebhookEvent {
  id: string;
  gateway: PaymentGateway;
  type: string;
  data: any;
  receivedAt: string;
  processed: boolean;
  processedAt?: string;
  error?: string;
}
