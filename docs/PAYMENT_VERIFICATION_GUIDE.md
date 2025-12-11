# Payment Flow Verification Guide

## Overview

This document provides comprehensive testing procedures for both Stripe (international) and Razorpay (India) payment integrations.

---

## Prerequisites

### Environment Variables Required

```bash
# Stripe (International)
STRIPE_SECRET_KEY=sk_test_...          # Test secret key
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Publishable key

# Razorpay (India)
RAZORPAY_KEY_ID=rzp_test_...           # Test key ID
RAZORPAY_KEY_SECRET=...                 # Key secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_... # Public key ID
```

### Test Cards

**Stripe Test Cards:**
| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 3220 | 3D Secure required |
| 4000 0027 6000 3184 | 3D Secure authentication |

**Razorpay Test Mode:**
- Use any valid card number in test mode
- Use UPI ID: success@razorpay for successful payments
- Use UPI ID: failure@razorpay for failed payments

---

## Stripe Payment Flow Testing

### Test 1: Checkout Session Creation

**Steps:**
1. Log in as an admin user
2. Navigate to `/settings/billing`
3. View available plans
4. Click "Upgrade" on a paid plan
5. Select billing cycle (monthly/yearly)

**Expected:**
- [ ] Stripe checkout page opens
- [ ] Correct plan name displayed
- [ ] Correct price displayed
- [ ] Currency is USD

**Verification Query:**
```sql
-- Check Firestore for checkout session
SELECT * FROM companies WHERE id = 'YOUR_COMPANY_ID'
-- Should show stripeCustomerId if first purchase
```

### Test 2: Successful Payment

**Steps:**
1. On Stripe checkout, enter test card: `4242 4242 4242 4242`
2. Enter any future expiry date (e.g., 12/30)
3. Enter any CVC (e.g., 123)
4. Complete payment

**Expected:**
- [ ] Redirected to success page
- [ ] Plan updated in UI
- [ ] Access to new plan features
- [ ] Confirmation email received (if configured)

**Verification:**
```javascript
// Check company document in Firestore
{
  "planId": "pro",           // Updated to new plan
  "billingCycle": "monthly",  // Selected cycle
  "status": "active",
  "planExpiresAt": "2025-01-03T...", // Future date
  "stripeCustomerId": "cus_...",
  "stripeSubscriptionId": "sub_..." // For monthly
}
```

### Test 3: Webhook Processing

**Steps:**
1. Check Stripe Dashboard → Developers → Webhooks
2. Verify webhook endpoint is configured: `https://your-app/api/webhooks/stripe`
3. Trigger a test webhook event

**Expected:**
- [ ] Webhook received (200 response)
- [ ] Event processed correctly
- [ ] No duplicate processing

**Verify in Stripe CLI (local testing):**
```bash
stripe listen --forward-to localhost:5000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

### Test 4: Failed Payment

**Steps:**
1. Start checkout process
2. Use declined card: `4000 0000 0000 0002`
3. Complete payment attempt

**Expected:**
- [ ] Error message displayed
- [ ] Plan NOT updated
- [ ] User can retry payment

### Test 5: Subscription Cancellation

**Steps:**
1. Go to `/settings/billing`
2. Click "Manage Subscription" or "Cancel"
3. Confirm cancellation

**Expected:**
- [ ] Subscription marked for cancellation at period end
- [ ] User keeps access until expiry
- [ ] No immediate charge

---

## Razorpay Payment Flow Testing

### Test 1: Order Creation

**Steps:**
1. Log in from an Indian location (or simulate)
2. Navigate to `/settings/billing`
3. Verify INR pricing is displayed
4. Click "Upgrade" on a paid plan

**Expected:**
- [ ] Razorpay modal opens
- [ ] Amount in INR
- [ ] Order ID created

**Verification:**
```javascript
// Check razorpayOrders collection
{
  "orderId": "order_...",
  "companyId": "...",
  "planId": "pro",
  "amount": 99900, // in paise
  "currency": "INR",
  "status": "created"
}
```

### Test 2: Successful Payment

**Steps:**
1. In Razorpay modal, select payment method
2. For UPI: Enter `success@razorpay`
3. Complete payment

**Expected:**
- [ ] Payment successful message
- [ ] Plan updated
- [ ] Modal closes
- [ ] Success notification shown

**Verification:**
```javascript
// Check company document
{
  "planId": "pro",
  "billingCycle": "monthly",
  "status": "active",
  "planExpiresAt": "2025-01-03T..."
}

// Check razorpayOrders
{
  "status": "paid",
  "paymentId": "pay_..."
}

// Check paymentTransactions
{
  "gateway": "razorpay",
  "amount": 999, // in rupees
  "currency": "INR",
  "status": "succeeded"
}
```

### Test 3: Signature Verification

**Important Security Check:**

The payment must verify the Razorpay signature to prevent fraud.

**Verification Code Path:** `src/app/actions/razorpay-payment-actions.ts`

```javascript
// Signature verification
const expectedSignature = crypto
  .createHmac('sha256', keySecret)
  .update(`${orderId}|${paymentId}`)
  .digest('hex');

if (expectedSignature !== signature) {
  // Payment should be REJECTED
}
```

### Test 4: Webhook Processing

**Steps:**
1. Check Razorpay Dashboard → Settings → Webhooks
2. Verify webhook endpoint: `https://your-app/api/webhooks/razorpay`
3. Verify webhook secret is configured

**Expected:**
- [ ] Webhook events received
- [ ] Signature verified
- [ ] Events processed correctly

### Test 5: Failed Payment

**Steps:**
1. Start checkout process
2. For UPI: Enter `failure@razorpay`
3. Attempt payment

**Expected:**
- [ ] Error message shown
- [ ] Plan NOT updated
- [ ] User can retry

---

## End-to-End Payment Checklist

### Before Testing

- [ ] Test API keys configured (not live keys!)
- [ ] Webhook secrets configured
- [ ] Plans created in database
- [ ] Pricing tiers configured

### Stripe Tests

| Test | Status | Notes |
|------|--------|-------|
| Checkout session creation | [ ] Pass / [ ] Fail | |
| Successful payment | [ ] Pass / [ ] Fail | |
| Failed payment handling | [ ] Pass / [ ] Fail | |
| Webhook processing | [ ] Pass / [ ] Fail | |
| Subscription update | [ ] Pass / [ ] Fail | |
| Subscription cancellation | [ ] Pass / [ ] Fail | |
| Customer portal access | [ ] Pass / [ ] Fail | |

### Razorpay Tests

| Test | Status | Notes |
|------|--------|-------|
| Order creation | [ ] Pass / [ ] Fail | |
| Successful payment | [ ] Pass / [ ] Fail | |
| Failed payment handling | [ ] Pass / [ ] Fail | |
| Signature verification | [ ] Pass / [ ] Fail | |
| Webhook processing | [ ] Pass / [ ] Fail | |
| Plan update after payment | [ ] Pass / [ ] Fail | |

### Post-Payment Verification

| Check | Status |
|-------|--------|
| Plan features unlocked | [ ] |
| AI credits updated | [ ] |
| Transaction recorded | [ ] |
| Confirmation email sent | [ ] |
| Dashboard reflects new plan | [ ] |

---

## Troubleshooting

### Stripe Issues

| Issue | Solution |
|-------|----------|
| Checkout not opening | Check publishable key in client |
| Webhook failures | Verify webhook secret, check signature |
| Payment not reflecting | Check webhook handler logs |
| Currency mismatch | Verify price calculation |

### Razorpay Issues

| Issue | Solution |
|-------|----------|
| Modal not opening | Check public key ID |
| Signature verification failing | Verify key secret |
| Order creation failing | Check API credentials |
| Amount mismatch | Verify USD to INR conversion |

### Common Fixes

```bash
# Check environment variables are set
echo $STRIPE_SECRET_KEY
echo $RAZORPAY_KEY_ID

# Verify webhook endpoints are accessible
curl -X POST https://your-app/api/webhooks/stripe
curl -X POST https://your-app/api/webhooks/razorpay

# Check Firestore for transaction records
# Firebase Console → Firestore → paymentTransactions
```

---

## Production Checklist

Before going live:

- [ ] Switch to live Stripe keys
- [ ] Switch to live Razorpay keys
- [ ] Update webhook endpoints for production domain
- [ ] Test with real cards (small amount)
- [ ] Verify refund process works
- [ ] Set up monitoring for payment failures
- [ ] Configure payment failure alerts

---

## Support Contacts

| Issue Type | Contact |
|------------|---------|
| Stripe Integration | Stripe Support Dashboard |
| Razorpay Integration | Razorpay Dashboard Support |
| Payment Disputes | Respective gateway's dispute center |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial payment verification guide |
