# PHASE 1 Testing Guide - Complete MVP Launch

## Overview
This document provides step-by-step testing instructions for all Phase 1 features before going live with the MVP launch.

**Testing Philosophy**: Every feature must be tested from a user's perspective, not just technically verified.

**Phase 1 Goals**:
- Ensure contact limit enforcement works correctly
- Verify pricing and messaging accuracy
- Confirm WhatsApp marketing visibility
- Test analytics tier differentiation
- Validate super admin controls
- Complete pre-launch QA

---

## Pre-Testing Setup

1. **Start the Application**
   - Server should be running on port 5000
   - Open your app URL in browser
   - Clear browser cache if testing after updates

2. **Test Accounts Needed**
   - Free Plan User (100 contact limit)
   - Starter Plan User (unlimited contacts)
   - Pro Plan User (unlimited contacts)
   - Super Admin User (all permissions)

---

## TEST 1: Contact Limit Enforcement

### Test 1.1: Free User Contact Creation Limit
**User Role**: Free Plan User  
**Expected Behavior**: User should be blocked at 100 contacts

#### Steps:
1. Log in as a Free Plan user
2. Navigate to CRM → Contacts (`/crm`)
3. Check contact count in the usage indicator
4. If under 100 contacts, add contacts until you reach 90
5. Verify warning message appears at 90%: "⚠️ Almost at limit!"
6. Continue adding contacts until 100
7. Try to add one more contact
8. Verify error message includes: "Contact limit reached!"
9. Verify "Upgrade" button appears and works
10. Verify contact count remains at 100

**Pass Criteria**:
- [ ] Warning at 90% (90/100 contacts)
- [ ] Hard block at 100 contacts
- [ ] Error message shows upgrade suggestion
- [ ] Upgrade button navigates to billing settings
- [ ] No contacts created beyond limit

---

### Test 1.2: Bulk CSV Import Limit (Free User)
**User Role**: Free Plan User  
**Expected Behavior**: Import should respect contact limit

#### Steps:
1. As free user with 50 existing contacts
2. Navigate to CRM → Contacts → Import
3. Upload CSV with 60 contacts (total would be 110)
4. Verify pre-import validation message appears
5. Message should show: "Cannot import 60 contacts. You have 50/100 contacts used. Maximum you can import: 50"
6. Cancel import
7. Upload CSV with exactly 50 contacts
8. Verify import succeeds
9. Verify total contact count is now 100

**Pass Criteria**:
- [ ] Pre-import validation runs
- [ ] Over-limit import rejected with clear message
- [ ] Shows exact number available for import
- [ ] At-limit import works (50 + 50 = 100)

---

### Test 1.3: Paid User Unlimited Contacts
**User Role**: Starter/Pro/Enterprise User  
**Expected Behavior**: No contact limits

#### Steps:
1. Log in as Starter plan user
2. Navigate to CRM → Contacts
3. Check usage indicator shows "unlimited" or no limit bar
4. Add 150+ contacts (exceeds free limit)
5. Verify no warnings or errors
6. Import CSV with 500+ contacts
7. Verify import succeeds without limit warnings
8. Navigate to Settings → Plan
9. Verify plan shows "Unlimited Contacts"

**Pass Criteria**:
- [ ] Can add 100+ contacts without warnings
- [ ] Bulk import works for large files
- [ ] No upgrade prompts appear
- [ ] Plan details show "Unlimited"

---

### Test 1.4: Contact Usage Indicator Display
**User Role**: Free User and Paid User  
**Expected Behavior**: Shows accurate contact usage

#### Steps:
1. Login as free user with some contacts
2. Navigate to CRM → Contacts page
3. Locate the Contact Usage Indicator component
4. Verify it shows: "X/100 contacts (XX%)"
5. Verify progress bar percentage matches
6. Add more contacts, verify indicator updates
7. At 90%+, verify progress bar turns yellow/warning color
8. Login as paid user
9. Verify indicator shows: "X contacts (unlimited)" with green styling
10. Verify no progress bar for paid users (or infinite symbol)

**Pass Criteria**:
- [ ] Accurate count display for free users
- [ ] Progress bar reflects percentage correctly
- [ ] Color changes at thresholds (green → yellow → red)
- [ ] Paid users see "unlimited" message with different styling

---

## TEST 2: Pricing & Messaging Accuracy

### Test 2.1: Pricing Page Accuracy
**User Role**: Visitor (not logged in)  
**Expected Behavior**: Correct contact limits displayed per plan

#### Steps:
1. Visit `/pricing` page (log out first)
2. Check **Free Plan** card:
   - Should show: "Basic CRM • 100 contacts"
3. Check **Starter Plan** card:
   - Should show: "Full CRM • Unlimited contacts"
   - Should NOT show "100 contacts"
4. Check **Pro Plan** card:
   - Should show: "Full CRM • Unlimited contacts"
5. Check **Enterprise Plan** card:
   - Should show: "Full CRM • Unlimited contacts"
6. Verify currency displays correctly based on your location
7. Mobile responsive check: Verify same information visible on mobile

**Pass Criteria**:
- [ ] Free: Shows "100 contacts" or similar limit
- [ ] Starter/Pro/Enterprise: Shows "Unlimited contacts"
- [ ] Currency detection works (INR for India, USD for US, etc.)
- [ ] Mobile display correct and readable

---

### Test 2.2: Homepage Comparison Table
**User Role**: Visitor  
**Expected Behavior**: Comparison table shows accurate limits

#### Steps:
1. Visit homepage `/`
2. Scroll to "Start Free, Scale as You Grow" section
3. Find the plan comparison table
4. Locate "CRM & Contacts" row or similar
5. Verify columns show:
   - Free: Limited/Basic contacts
   - Starter: Full/Unlimited
   - Pro: Full/Unlimited
   - Enterprise: Full/Unlimited
6. Check for WhatsApp Marketing row
7. Verify proper checkmarks and features per plan

**Pass Criteria**:
- [ ] Contact limits accurate per plan
- [ ] WhatsApp row exists with correct plan availability
- [ ] Table is readable and properly formatted
- [ ] No contradictions with pricing page

---

## TEST 3: WhatsApp Marketing Prominence

### Test 3.1: Homepage WhatsApp Visibility
**User Role**: Visitor  
**Expected Behavior**: WhatsApp featured prominently

#### Steps:
1. Visit homepage `/`
2. Check Hero Section area - look for multi-channel mentions
3. Scroll to Features section
4. Find "WhatsApp & SMS Marketing" feature card
5. Verify it mentions: "Reach customers on their preferred channels"
6. Check competitor comparison section
7. Look for "zero markup" or similar messaging
8. Count total WhatsApp mentions on homepage (should be 4+)

**Pass Criteria**:
- [ ] Features section has WhatsApp card
- [ ] WhatsApp mentioned in structured data/SEO
- [ ] Comparison shows WhatsApp as differentiator
- [ ] Minimum 4+ WhatsApp mentions on page

---

### Test 3.2: Pricing Page WhatsApp Display
**User Role**: Visitor  
**Expected Behavior**: WhatsApp shown in plan features

#### Steps:
1. Visit `/pricing`
2. Check each plan's feature list
3. Verify WhatsApp-related features are listed for appropriate plans
4. Pro/Enterprise should have more WhatsApp features
5. Look for visual indicators (icons, badges)

**Pass Criteria**:
- [ ] WhatsApp features visible in paid plans
- [ ] Clear differentiation between plan tiers
- [ ] Icon or visual indicator present

---

## TEST 4: Analytics Tier Differentiation

### Test 4.1: Dashboard Analytics (Free User)
**User Role**: Free Plan User  
**Expected Behavior**: Limited analytics access

#### Steps:
1. Login as free user
2. Navigate to Dashboard
3. Check what analytics/metrics are visible
4. Look for upgrade prompts on advanced features
5. Verify basic metrics are available

**Pass Criteria**:
- [ ] Basic dashboard metrics visible
- [ ] Advanced analytics show upgrade prompts or are hidden
- [ ] No console errors

---

### Test 4.2: Dashboard Analytics (Paid User)
**User Role**: Pro Plan User  
**Expected Behavior**: Full analytics access

#### Steps:
1. Login as Pro user
2. Navigate to Dashboard
3. Verify all metric cards display:
   - Pipeline Value
   - Won Revenue
   - Conversion Rate
   - Total Contacts
4. Check for advanced features:
   - Recent Activity feed
   - Charts and graphs
   - AI insights (if available)
5. Navigate to Analytics section
6. Verify advanced components load without errors

**Pass Criteria**:
- [ ] All dashboard cards visible
- [ ] Charts render properly
- [ ] No upgrade prompts for analytics
- [ ] Advanced features accessible

---

## TEST 5: Super Admin Plan Controls

### Test 5.1: Super Admin Dashboard Access
**User Role**: Super Admin  
**Expected Behavior**: Can access admin dashboard

#### Steps:
1. Login as super admin user
2. Verify Super Admin Dashboard loads
3. Check for stat cards:
   - Total Admins/Companies
   - MRR (USD)
   - MRR (INR)
   - Plans Expiring This Month
   - Paused Accounts
4. Verify data displays correctly

**Pass Criteria**:
- [ ] Super admin dashboard accessible
- [ ] All stat cards display
- [ ] MRR calculations appear correct
- [ ] No errors in console

---

### Test 5.2: Plan Manager Access
**User Role**: Super Admin  
**Expected Behavior**: Can access and modify plan settings

#### Steps:
1. As super admin, navigate to Settings → Plan Manager
2. Verify page loads with list of plans
3. Click "Edit" on Free Plan
4. Verify form shows all fields:
   - Max Contacts
   - CRM Access Level
   - BYOK settings
   - Digital Card limits
5. Change Max Contacts from 100 to 150
6. Save changes
7. Verify success message
8. Refresh and verify change persisted
9. Change back to 100

**Pass Criteria**:
- [ ] Plan Manager accessible to super admin
- [ ] All plan fields editable
- [ ] Changes save successfully
- [ ] Changes persist after refresh

---

### Test 5.3: Company Usage Overview
**User Role**: Super Admin  
**Expected Behavior**: Can view all companies

#### Steps:
1. As super admin, look for Admin Manager component
2. Verify you can see company listings
3. Check for:
   - Company names
   - Plan assignments
   - Status (Active/Paused)
4. Verify sorting/filtering works if available

**Pass Criteria**:
- [ ] All companies listed
- [ ] Company details visible
- [ ] Status information accurate

---

## TEST 6: Appointment Booking System

### Test 6.1: Appointment CRUD Operations
**User Role**: Logged in user
**Expected Behavior**: Full appointment management functionality

#### Steps:
1. Navigate to `/appointments`
2. Click "Schedule New Appointment" button
3. Fill in required fields:
   - Client Name: "Test Client"
   - Client Email: "test@example.com"
   - Title: "Initial Consultation"
   - Date: Tomorrow's date
   - Time: 10:00 AM
   - Duration: 30 minutes
   - Timezone: India (IST)
4. Enable Email Reminder (24 hours before)
5. Click "Schedule Appointment"
6. Verify appointment appears in list
7. Click Edit on the appointment
8. Change duration to 45 minutes
9. Save changes
10. Click Cancel on the appointment
11. Verify status changes to "Cancelled"

**Pass Criteria**:
- [ ] Create appointment form validates required fields
- [ ] Date picker prevents selecting past dates
- [ ] Appointment appears in list after creation
- [ ] Edit functionality works correctly
- [ ] Cancel changes status appropriately
- [ ] Toast notifications show for actions

---

### Test 6.2: Multi-Channel Reminders
**User Role**: Logged in user
**Expected Behavior**: Reminder preferences work correctly

#### Steps:
1. Create new appointment
2. Enable Email Reminder (set to 24 hours before)
3. Enable SMS Reminder (set to 2 hours before)
4. Enable WhatsApp Reminder (set to 1 hour before)
5. Save appointment
6. Edit the appointment and verify reminder preferences are saved
7. Check that reminder timing dropdowns show correct values

**Pass Criteria**:
- [ ] Email reminder toggle works
- [ ] SMS reminder toggle works
- [ ] WhatsApp reminder toggle works
- [ ] Different timing for each channel persists
- [ ] Preferences saved correctly to database

---

### Test 6.3: Appointment List Filtering
**User Role**: Logged in user
**Expected Behavior**: Filters work correctly

#### Steps:
1. Create multiple appointments with different statuses
2. Use search box to find by client name
3. Filter by status (Scheduled, Cancelled, Completed)
4. Toggle between list and calendar view
5. Verify calendar shows appointments on correct dates

**Pass Criteria**:
- [ ] Search filters in real-time
- [ ] Status filter shows only matching appointments
- [ ] Calendar view displays correctly
- [ ] "No appointments found" shows when no matches

---

### Test 6.4: Appointment Reminder Cron Job
**Purpose**: Verify automated reminders work

#### Steps:
1. Create appointment with reminders enabled
2. Access `/api/cron/appointment-reminders` endpoint
3. Check server logs for reminder processing
4. Verify no errors in cron execution

**Pass Criteria**:
- [ ] Cron endpoint responds without errors
- [ ] Reminders queued for appropriate appointments
- [ ] Duplicate reminders prevented
- [ ] Error handling in place for failed sends

---

## TEST 7: CRM Core Features (Regression)

### Test 7.1: Contact CRUD Operations
**Purpose**: Ensure Phase 0 features still work

#### Steps:
1. Create a new contact with all fields
2. Verify contact appears in list
3. Edit the contact, change some fields
4. Verify changes saved
5. View contact detail page
6. Check Activity Timeline loads
7. Check Deals tab loads
8. Delete the contact
9. Verify contact removed from list

**Pass Criteria**:
- [ ] Create works
- [ ] Read/List works
- [ ] Update works
- [ ] Delete works
- [ ] Activity Timeline displays
- [ ] Deals section displays

---

### Test 6.2: Deal Management
**Purpose**: Verify Phase 0 Deal feature still works

#### Steps:
1. Open any contact
2. Go to Deals tab
3. Click "Add Deal"
4. Fill in deal form:
   - Name: "Test Deal Phase 1"
   - Amount: 5000
   - Currency: USD
   - Status: Negotiation
5. Save deal
6. Verify deal appears
7. Edit deal, change status to "Won"
8. Verify probability updates
9. Check Dashboard → Pipeline Value includes this deal
10. Delete the deal

**Pass Criteria**:
- [ ] Deal creation works
- [ ] Deal editing works
- [ ] Status → Probability auto-update works
- [ ] Dashboard reflects deal values
- [ ] Deal deletion works

---

### Test 6.3: Activity Timeline
**Purpose**: Verify Phase 0 Activity feature still works

#### Steps:
1. Open any contact
2. Go to Activity tab
3. Click "Add Note"
4. Type: "Phase 1 Testing Note"
5. Save note
6. Verify note appears in timeline
7. Check timestamp shows correctly
8. Check icon displays correctly

**Pass Criteria**:
- [ ] Note creation works
- [ ] Note appears immediately
- [ ] Timestamp correct
- [ ] Icon displays

---

## TEST 7: Onboarding Flow (Regression)

### Test 7.1: New User Onboarding
**Purpose**: Verify onboarding still works for new users

#### Steps:
1. Create a brand new account (or clear onboarding data)
2. Login with new account
3. Navigate to Dashboard
4. Look for Onboarding Checklist
5. Verify it shows:
   - Welcome message
   - Progress bar
   - Checklist items (7 steps)
6. Click on one checklist item action
7. Verify it navigates to correct page
8. Return to dashboard
9. Click dismiss/close button
10. Verify checklist disappears

**Pass Criteria**:
- [ ] Onboarding checklist appears for new users
- [ ] All 7 items display
- [ ] Navigation works
- [ ] Dismiss works

---

## TEST 8: Payment Processing

### Test 8.1: Stripe Payment Flow (Non-India)
**User Role**: Logged in user from non-India location

#### Steps:
1. Login as user
2. Navigate to Pricing page
3. Select Starter plan
4. Click payment button
5. Verify Stripe checkout appears or redirects
6. Use test card: 4242 4242 4242 4242
7. Complete payment (test mode)
8. Verify success handling

**Pass Criteria**:
- [ ] Stripe checkout loads
- [ ] Test payment processes
- [ ] Success redirect works
- [ ] Plan updates after payment

---

### Test 8.2: Razorpay Payment Flow (India)
**User Role**: Logged in user from India

#### Steps:
1. Login as user with India location
2. Navigate to Pricing page
3. Verify INR pricing displays
4. Select Starter plan
5. Click payment button
6. Verify Razorpay checkout appears
7. Use Razorpay test mode credentials
8. Verify payment flow works

**Pass Criteria**:
- [ ] Razorpay checkout loads for India users
- [ ] INR pricing displays correctly
- [ ] Payment flow initiates properly

---

## TEST 9: Campaign Features (Regression)

### Test 9.1: Email Campaign
**Purpose**: Verify email campaigns work

#### Steps:
1. Navigate to Email Marketing
2. Create new campaign
3. Fill in required fields
4. Select recipients
5. Preview campaign
6. Verify campaign saves

**Pass Criteria**:
- [ ] Campaign creation works
- [ ] Recipient selection works
- [ ] Preview displays correctly

---

### Test 9.2: SMS Campaign
**Purpose**: Verify SMS campaigns work

#### Steps:
1. Navigate to SMS Campaigns
2. Create new campaign
3. Fill in message content
4. Select recipients
5. Verify campaign saves

**Pass Criteria**:
- [ ] SMS campaign creation works
- [ ] Character count displays
- [ ] DLT template selection (if India)

---

### Test 9.3: WhatsApp Campaign
**Purpose**: Verify WhatsApp campaigns work

#### Steps:
1. Navigate to WhatsApp Marketing
2. Create new campaign
3. Select template
4. Add recipients
5. Verify campaign saves

**Pass Criteria**:
- [ ] WhatsApp campaign creation works
- [ ] Template selection works
- [ ] Image upload works (if applicable)

---

## TEST 10: AI Features (Regression)

### Test 10.1: AI Content Generation
**Purpose**: Verify AI features work

#### Steps:
1. Navigate to AI-enabled feature (AI Chat, Content Hub, etc.)
2. Trigger AI content generation
3. Verify content generates
4. Check AI credits deduction

**Pass Criteria**:
- [ ] AI content generates
- [ ] Credits deducted correctly
- [ ] No console errors

---

## TEST 11: Performance Testing

### Test 11.1: Page Load Times
**Purpose**: Ensure acceptable performance

#### Steps:
1. Open browser DevTools → Network tab
2. Visit each major page:
   - Dashboard: Target < 3 seconds
   - CRM Contacts: Target < 3 seconds
   - Settings: Target < 3 seconds
3. Check for slow resources

**Pass Criteria**:
- [ ] Dashboard loads < 3 seconds
- [ ] CRM loads < 3 seconds
- [ ] No extremely slow API calls (> 5 seconds)

---

### Test 11.2: Contact Operations Speed
**Purpose**: Ensure contact operations are fast

#### Steps:
1. Time contact creation
2. Should complete in < 2 seconds
3. Time bulk import of 50 contacts
4. Should complete in < 10 seconds

**Pass Criteria**:
- [ ] Single contact creation < 2 seconds
- [ ] Bulk import 50 contacts < 10 seconds

---

## TEST 12: Cross-Browser & Mobile

### Test 12.1: Browser Compatibility
**Browsers**: Chrome, Firefox, Safari, Edge

#### Steps:
1. Test pricing page on all browsers
2. Test contact operations on all browsers
3. Test dashboard on all browsers
4. Verify no layout issues

**Pass Criteria**:
- [ ] Works on Chrome
- [ ] Works on Firefox
- [ ] Works on Safari
- [ ] Works on Edge

---

### Test 12.2: Mobile Responsiveness
**Devices**: iPhone, Android, Tablet

#### Steps:
1. Visit all major pages on mobile
2. Check navigation works
3. Verify buttons are tappable
4. Verify tables scroll properly
5. Check modals display correctly

**Pass Criteria**:
- [ ] Navigation works on mobile
- [ ] All pages responsive
- [ ] Forms usable on mobile
- [ ] No horizontal overflow issues

---

## Quick Smoke Test Checklist (5 minutes)

Use this for rapid verification:

| Feature | Test | Pass? |
|---------|------|-------|
| Dashboard | Page loads, shows metrics | [ ] |
| Contact Limit | Free user blocked at 100 | [ ] |
| Pricing Page | Shows correct limits | [ ] |
| Contact CRUD | Can create/edit/delete | [ ] |
| Activity Timeline | Shows on contact page | [ ] |
| Deals | Can create deal | [ ] |
| Super Admin | Dashboard accessible | [ ] |
| WhatsApp | Featured on homepage | [ ] |
| Payment Button | Displays correctly | [ ] |
| Mobile | Site responsive | [ ] |

---

## Final Checklist Before Launch

### Code Quality
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] Server runs without errors
- [ ] All pages load without crashing

### Functionality
- [ ] All test cases passed
- [ ] Free users blocked at 100 contacts
- [ ] Paid users have unlimited contacts
- [ ] Pricing pages show correct information
- [ ] WhatsApp prominently featured
- [ ] Super admin can manage plans
- [ ] Payment flows work
- [ ] CRM CRUD operations work
- [ ] AI features work

### User Experience
- [ ] Warning messages are helpful
- [ ] Upgrade prompts are clear
- [ ] Mobile experience is good
- [ ] Page load times acceptable
- [ ] No broken links

### Documentation
- [ ] replit.md updated
- [ ] Phase 1 testing guide completed
- [ ] Known issues documented

---

## Test Results Template

Copy and fill in:

```
PHASE 1 Test Results
Date: _______________
Tester: _______________

Contact Limit Enforcement: [ ] PASS  [ ] FAIL
Pricing Accuracy: [ ] PASS  [ ] FAIL
WhatsApp Visibility: [ ] PASS  [ ] FAIL
Analytics Differentiation: [ ] PASS  [ ] FAIL
Super Admin Controls: [ ] PASS  [ ] FAIL
CRM Core Features: [ ] PASS  [ ] FAIL
Deal Management: [ ] PASS  [ ] FAIL
Activity Timeline: [ ] PASS  [ ] FAIL
Onboarding Flow: [ ] PASS  [ ] FAIL
Payment Processing: [ ] PASS  [ ] FAIL
Campaign Features: [ ] PASS  [ ] FAIL
AI Features: [ ] PASS  [ ] FAIL
Performance: [ ] PASS  [ ] FAIL
Mobile/Responsive: [ ] PASS  [ ] FAIL

Overall Phase 1 Status: [ ] PASS / [ ] FAIL
Ready for Production: [ ] YES / [ ] NO

Notes:
_______________________________
_______________________________
```

---

## Sign-Off

**Tested By**: _________________  
**Date**: _________________  
**Phase 1 Status**: [ ] PASS / [ ] FAIL  
**Ready for Production Launch**: [ ] YES / [ ] NO

**Issues Found**:
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

**Blockers**:
1. _________________________________________________________________

---

## Next Steps After Phase 1 Testing

If all tests pass:
1. Deploy to production Firebase project
2. Configure production API keys
3. Set up monitoring (Sentry, analytics)
4. Begin Phase 2 development (Two-Way Communication)

If tests fail:
1. Document the failure with screenshots
2. Check console/server logs
3. Report specific errors for debugging
4. Fix critical issues before launch
5. Re-run failed tests

---

**End of Phase 1 Testing Guide**
