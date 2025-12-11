# PHASE 0 Testing Guide - Step by Step

## Pre-Testing Setup

1. **Start the Application**
   - Server should be running on port 5000
   - Open your app URL in browser

2. **Create a Test Account**
   - Sign up with a new email
   - Or use an existing test account

---

## TEST 1: Dashboard Improvements (C4)

### What to Test:
Navigate to **Dashboard** (`/crm/dashboard`)

### Verification Checklist:
- [ ] **Pipeline Value Card** displays (shows sum of open deals)
- [ ] **Weighted Pipeline** value shows below Pipeline Value
- [ ] **Won Revenue Card** displays with deals closed count
- [ ] **Conversion Rate Card** shows percentage
- [ ] **Total Contacts Card** displays contact count
- [ ] **Recent Activity** section shows latest activities
- [ ] **Contact Status Distribution** chart renders

### Expected Results:
- If you have deals: Pipeline value should show the sum
- If no deals: Values show $0 (this is correct)
- Charts should render without errors

---

## TEST 2: Activity Timeline (C1)

### What to Test:
Navigate to **CRM** → Click on any **Contact** → Look for **Activity Timeline**

### Verification Checklist:
- [ ] Activity Timeline section displays on contact page
- [ ] "Add Note" button is visible
- [ ] Click "Add Note" → Note input appears
- [ ] Type a note and click "Save Note"
- [ ] Note appears in timeline immediately
- [ ] Timeline shows proper icons for different activity types:
  - Email (blue envelope)
  - SMS (green message)
  - WhatsApp (emerald message)
  - Note (yellow sticky note)
  - Deal created (teal dollar)
- [ ] Timestamps show correctly ("2 minutes ago", etc.)

### How to Test Activity Logging:
1. Open a contact
2. Add a note using the "Add Note" button
3. The note should appear in the timeline
4. Refresh the page - note should persist

---

## TEST 3: Deal/Opportunity Management (C2)

### What to Test:
Navigate to **CRM** → Open a **Contact** → Look for **Deals** section

### Verification Checklist:

#### Creating a Deal:
- [ ] "Add Deal" or "Create Deal" button is visible on contact page
- [ ] Click to open deal form
- [ ] Form fields appear:
  - Deal Name
  - Amount
  - Currency dropdown
  - Status dropdown (Proposal, Negotiation, Closing, Won, Lost)
  - Probability (auto-fills based on status)
  - Expected Close Date
  - Notes
- [ ] Fill in details and submit
- [ ] Deal appears on the contact page

#### Editing a Deal:
- [ ] Click on existing deal
- [ ] Edit form opens with current values
- [ ] Change values and save
- [ ] Changes persist

#### Deal Pipeline View:
- [ ] Navigate to `/crm/pipeline`
- [ ] Pipeline stages should display
- [ ] Deals should appear in their respective stages

### Expected Deal Status → Probability:
| Status | Default Probability |
|--------|---------------------|
| Proposal | 20% |
| Negotiation | 40% |
| Closing | 60% |
| Won | 100% |
| Lost | 0% |

---

## TEST 4: Onboarding Flow (C3)

### What to Test:
The onboarding checklist should appear for new users

### Verification Checklist:

#### For New Users:
- [ ] Sign up with a brand new account
- [ ] **Onboarding Checklist** appears on dashboard
- [ ] Shows "Get Started with OmniFlow" title
- [ ] Progress bar displays (e.g., "0 of 7 completed")
- [ ] 7 checklist items display:
  1. Add Your First Contacts
  2. Send Your First Email Campaign
  3. Create Your Digital Business Card
  4. Invite Your First Team Member
  5. Try AI Content Generation
  6. Set Up Email Automation
  7. Launch Multi-Channel Campaign
- [ ] Each item has an action button
- [ ] Clicking action button navigates to correct page

#### Testing Checklist Completion:
- [ ] Complete an action (e.g., add 10+ contacts)
- [ ] Return to dashboard
- [ ] That checklist item should show as completed (checkmark)
- [ ] Progress bar updates

#### Dismiss Function:
- [ ] Click the "X" button to dismiss checklist
- [ ] Checklist disappears
- [ ] Confirmation toast appears

---

## TEST 5: Security Rules

### What to Test:
Verify users can only access their own company's data

### Verification Checklist:
- [ ] Log in with User A → Create contacts → Log out
- [ ] Log in with User B (different company) → Check they cannot see User A's contacts
- [ ] Verify dashboard only shows current user's data

---

## TEST 6: Firestore Indexes

### What to Test:
Navigate to pages that use indexed queries

### Verification Checklist:
- [ ] `/crm` - Contact list loads without errors
- [ ] `/tasks` - Task list loads without errors
- [ ] `/email-marketing` - Campaign list loads without errors
- [ ] `/crm/dashboard` - Dashboard loads without errors

### Check Console for Errors:
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for any "Index required" errors
4. If you see index errors, indexes need to be deployed

---

## TEST 7: Cost Tracking

### What to Test:
Send a test campaign and verify costs are tracked

### Verification Checklist:
- [ ] Send a test email campaign
- [ ] Check if cost tracking records are created
- [ ] Verify in Firestore: `companyCosts` collection should have entries

---

## Quick Smoke Test Checklist

Use this for a rapid verification:

| Feature | Test | Pass? |
|---------|------|-------|
| Dashboard | Page loads, shows metrics | [ ] |
| Activity Timeline | Shows on contact page | [ ] |
| Add Note | Can add note to contact | [ ] |
| Create Deal | Can create deal on contact | [ ] |
| Deal Form | All fields work | [ ] |
| Onboarding | Checklist appears for new user | [ ] |
| Pipeline View | `/crm/pipeline` loads | [ ] |
| Contact List | `/crm` loads contacts | [ ] |
| Tasks | `/tasks` loads tasks | [ ] |

---

## Troubleshooting

### Issue: "Index required" errors
**Solution:** Deploy Firestore indexes:
```bash
firebase deploy --only firestore:indexes
```

### Issue: Pages crash/don't load
**Check:** 
1. Browser console for errors
2. Server logs for backend errors
3. Ensure Firebase credentials are configured

### Issue: Activities not saving
**Check:**
1. User is authenticated
2. companyId is set correctly
3. Check Firestore rules permissions

### Issue: Onboarding not appearing
**Check:**
1. User is truly new (no existing onboarding progress)
2. companyId is set
3. Check browser console for errors

---

## Test Results Template

Copy and fill in:

```
PHASE 0 Test Results
Date: _______________
Tester: _______________

Dashboard (C4): [ ] PASS  [ ] FAIL
Activity Timeline (C1): [ ] PASS  [ ] FAIL
Deal Management (C2): [ ] PASS  [ ] FAIL
Onboarding Flow (C3): [ ] PASS  [ ] FAIL
Security Rules (A1): [ ] PASS  [ ] FAIL
Indexes Working (A2): [ ] PASS  [ ] FAIL

Notes:
_______________________________
_______________________________
_______________________________
```

---

## Next Steps After Testing

If all tests pass:
1. Deploy Firestore security rules: `firebase deploy --only firestore:rules`
2. Begin PHASE 1 development
3. Start onboarding beta users

If tests fail:
1. Document the failure
2. Check console/server logs
3. Report specific errors for debugging
