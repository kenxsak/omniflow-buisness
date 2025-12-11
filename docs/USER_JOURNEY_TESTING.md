# OmniFlow User Journey Testing Guide

## Overview

This document provides step-by-step testing procedures for all 11 critical user journeys that must be verified before MVP launch.

---

## Testing Environment Setup

### Prerequisites

- [ ] Application running locally or on staging
- [ ] Test user accounts created (Admin, Manager, Sales Rep)
- [ ] Test data available (leads, campaigns, etc.)
- [ ] Browser DevTools ready for debugging

### Test Accounts

| Role | Email | Purpose |
|------|-------|---------|
| Admin | admin@testcompany.com | Full access testing |
| Manager | manager@testcompany.com | Management features |
| Sales Rep | salesrep@testcompany.com | Daily user features |

---

## Journey 1: User Registration & Onboarding

**Goal**: New user can sign up and complete onboarding

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.1 | Go to `/signup` | Signup form displays | [ ] |
| 1.2 | Enter email, password, company name | Form validates inputs | [ ] |
| 1.3 | Click "Create Account" | Account created, email verification sent | [ ] |
| 1.4 | Verify email (if enabled) | Email confirmed | [ ] |
| 1.5 | Complete onboarding wizard | Company profile set up | [ ] |
| 1.6 | Arrive at dashboard | Dashboard loads with welcome message | [ ] |

### Verification Points
- [ ] Error messages show for invalid inputs
- [ ] Password strength indicator works
- [ ] Company is created in Firestore
- [ ] User is assigned correct role

---

## Journey 2: Lead Management

**Goal**: User can create, view, edit, and delete leads

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.1 | Navigate to `/crm/leads` | Lead list displays | [ ] |
| 2.2 | Click "Add Lead" | Lead form opens | [ ] |
| 2.3 | Fill lead details (name, email, phone) | Form accepts valid data | [ ] |
| 2.4 | Save lead | Lead appears in list | [ ] |
| 2.5 | Click on lead to view details | Lead detail page loads | [ ] |
| 2.6 | Edit lead information | Changes saved successfully | [ ] |
| 2.7 | Change lead status | Status updates, activity logged | [ ] |
| 2.8 | Delete lead (as manager) | Lead removed from list | [ ] |

### Verification Points
- [ ] Lead appears in correct pipeline stage
- [ ] Activity timeline shows all changes
- [ ] Search and filter work correctly
- [ ] Pagination works for large lists

---

## Journey 3: Email Campaign Creation & Sending

**Goal**: User can create and send an email campaign

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 3.1 | Navigate to `/campaigns` | Campaign list displays | [ ] |
| 3.2 | Click "Create Campaign" | Campaign wizard opens | [ ] |
| 3.3 | Select "Email" channel | Email options appear | [ ] |
| 3.4 | Enter subject and content | Content editor works | [ ] |
| 3.5 | Use AI to generate content (optional) | AI content generated | [ ] |
| 3.6 | Select recipients (leads/contacts) | Recipients selected | [ ] |
| 3.7 | Preview campaign | Preview displays correctly | [ ] |
| 3.8 | Send campaign | Campaign status changes to "Sending" | [ ] |
| 3.9 | Check campaign results | Opens/clicks tracked (if available) | [ ] |

### Verification Points
- [ ] Email provider connected (Brevo/Sender.net/SMTP)
- [ ] Campaign logged in Firestore
- [ ] Activity recorded for each recipient
- [ ] Unsubscribe link included

---

## Journey 4: SMS Campaign Creation & Sending

**Goal**: User can create and send an SMS campaign

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 4.1 | Navigate to `/campaigns/sms` | SMS campaign page loads | [ ] |
| 4.2 | Select SMS provider | Provider options display | [ ] |
| 4.3 | Enter message content | Character count updates | [ ] |
| 4.4 | Select/upload recipients | Recipients loaded | [ ] |
| 4.5 | Add personalization (optional) | Variables replaced | [ ] |
| 4.6 | Preview message | Preview shows sample | [ ] |
| 4.7 | Send campaign | Messages queued/sent | [ ] |

### Verification Points
- [ ] SMS provider API key configured
- [ ] DLT template ID used (for India)
- [ ] Message length within limits
- [ ] Delivery status tracked

---

## Journey 5: WhatsApp Campaign

**Goal**: User can send WhatsApp messages

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 5.1 | Navigate to `/campaigns/whatsapp` | WhatsApp page loads | [ ] |
| 5.2 | Select message type (wa.me link or API) | Options display | [ ] |
| 5.3 | Enter message content | Content saved | [ ] |
| 5.4 | Upload image (for API option) | Image uploaded to ImgBB | [ ] |
| 5.5 | Select recipients | Recipients selected | [ ] |
| 5.6 | Send campaign | Messages sent/queued | [ ] |

### Verification Points
- [ ] WhatsApp provider configured
- [ ] wa.me links work for manual sending
- [ ] API sends work for automation
- [ ] Delivery status tracked

---

## Journey 6: AI Content Generation

**Goal**: User can generate marketing content with AI

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 6.1 | Navigate to AI feature (Content Factory/Chat) | AI interface loads | [ ] |
| 6.2 | Enter prompt or select template | Input accepted | [ ] |
| 6.3 | Click "Generate" | Loading indicator shows | [ ] |
| 6.4 | Receive generated content | Content displays | [ ] |
| 6.5 | Edit generated content | Edits saved | [ ] |
| 6.6 | Use content in campaign | Content transferred | [ ] |
| 6.7 | Check AI credits used | Credits deducted | [ ] |

### Verification Points
- [ ] AI API key configured (platform or BYOK)
- [ ] Credit tracking accurate
- [ ] Content quality acceptable
- [ ] Error handling for API failures

---

## Journey 7: Payment & Subscription

**Goal**: User can upgrade their subscription plan

### Steps (Stripe - International)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 7.1 | Navigate to `/settings/billing` | Billing page loads | [ ] |
| 7.2 | View current plan | Plan details display | [ ] |
| 7.3 | Click "Upgrade" on desired plan | Stripe checkout opens | [ ] |
| 7.4 | Enter test card (4242...) | Card accepted | [ ] |
| 7.5 | Complete payment | Redirected to success page | [ ] |
| 7.6 | Verify plan updated | New plan features unlocked | [ ] |

### Steps (Razorpay - India)

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 7.1 | Navigate to `/settings/billing` | Billing page loads | [ ] |
| 7.2 | View current plan (INR pricing) | India pricing shows | [ ] |
| 7.3 | Click "Upgrade" | Razorpay modal opens | [ ] |
| 7.4 | Complete test payment | Payment successful | [ ] |
| 7.5 | Verify plan updated | New plan active | [ ] |

### Verification Points
- [ ] Correct pricing displayed for region
- [ ] Webhook handles payment confirmation
- [ ] Transaction recorded in database
- [ ] Plan limits updated immediately

---

## Journey 8: Team Management

**Goal**: Admin can invite and manage team members

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 8.1 | Navigate to `/settings/team` | Team page loads | [ ] |
| 8.2 | Click "Invite Member" | Invite form opens | [ ] |
| 8.3 | Enter email and select role | Form validates | [ ] |
| 8.4 | Send invitation | Invite email sent | [ ] |
| 8.5 | New user clicks invite link | Registration with pre-set role | [ ] |
| 8.6 | Admin changes user role | Role updated | [ ] |
| 8.7 | Admin removes user | User deactivated | [ ] |

### Verification Points
- [ ] Role-based access enforced
- [ ] Invitation emails delivered
- [ ] Team member count within plan limits
- [ ] Removed users cannot access

---

## Journey 9: Task & Activity Management

**Goal**: User can create and complete tasks

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 9.1 | Navigate to `/crm/tasks` | Task list displays | [ ] |
| 9.2 | Click "Add Task" | Task form opens | [ ] |
| 9.3 | Enter task details (title, due date) | Form accepts data | [ ] |
| 9.4 | Link task to lead (optional) | Lead linked | [ ] |
| 9.5 | Save task | Task appears in list | [ ] |
| 9.6 | Mark task complete | Status updates | [ ] |
| 9.7 | View completed tasks | Filter works | [ ] |

### Verification Points
- [ ] Due date notifications work
- [ ] Task appears in lead's activity
- [ ] Calendar integration (if available)
- [ ] Overdue tasks highlighted

---

## Journey 10: Deal/Pipeline Management

**Goal**: User can manage sales pipeline

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 10.1 | Navigate to `/crm/deals` or pipeline view | Pipeline displays | [ ] |
| 10.2 | Click "Add Deal" | Deal form opens | [ ] |
| 10.3 | Enter deal details (name, value, stage) | Form validates | [ ] |
| 10.4 | Link deal to contact | Contact associated | [ ] |
| 10.5 | Move deal through stages | Stage updates | [ ] |
| 10.6 | Mark deal as Won/Lost | Final status set | [ ] |
| 10.7 | View deal analytics | Stats display | [ ] |

### Verification Points
- [ ] Pipeline value calculates correctly
- [ ] Deal history logged
- [ ] Weighted pipeline value accurate
- [ ] Dashboard shows deal metrics

---

## Journey 11: Appointment Scheduling

**Goal**: User can schedule and manage appointments

### Steps

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 11.1 | Navigate to `/appointments` or calendar | Calendar view displays | [ ] |
| 11.2 | Click date/time to create appointment | Form opens | [ ] |
| 11.3 | Enter appointment details | Details saved | [ ] |
| 11.4 | Link to contact (if applicable) | Contact associated | [ ] |
| 11.5 | Save appointment | Appears on calendar | [ ] |
| 11.6 | Edit appointment | Changes saved | [ ] |
| 11.7 | Appointment reminder sent (if enabled) | Reminder received | [ ] |
| 11.8 | Mark appointment complete | Status updated | [ ] |

### Verification Points
- [ ] Calendar shows correct timezone
- [ ] Appointment shows in contact's profile
- [ ] Reminders work (if configured)
- [ ] No double-booking (if enforced)

---

## Test Result Summary

| Journey | Description | Status | Notes |
|---------|-------------|--------|-------|
| 1 | User Registration & Onboarding | [ ] Pass / [ ] Fail | |
| 2 | Lead Management | [ ] Pass / [ ] Fail | |
| 3 | Email Campaign | [ ] Pass / [ ] Fail | |
| 4 | SMS Campaign | [ ] Pass / [ ] Fail | |
| 5 | WhatsApp Campaign | [ ] Pass / [ ] Fail | |
| 6 | AI Content Generation | [ ] Pass / [ ] Fail | |
| 7 | Payment & Subscription | [ ] Pass / [ ] Fail | |
| 8 | Team Management | [ ] Pass / [ ] Fail | |
| 9 | Task & Activity Management | [ ] Pass / [ ] Fail | |
| 10 | Deal/Pipeline Management | [ ] Pass / [ ] Fail | |
| 11 | Appointment Scheduling | [ ] Pass / [ ] Fail | |

**Overall Status**: [ ] All Journeys Pass / [ ] Needs Fixes

---

## Test Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Reviewer | | | |
| Approver | | | |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial user journey testing guide |
