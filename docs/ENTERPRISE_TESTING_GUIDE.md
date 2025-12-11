# Enterprise Features Testing Guide

This guide provides step-by-step instructions to test all enterprise features implemented for the CRM system supporting 50+ concurrent users.

---

## Table of Contents
1. [Setup for Testing](#setup-for-testing)
2. [Feature 1: Real-time Lead Claiming System](#feature-1-real-time-lead-claiming-system)
3. [Feature 2: Comprehensive Audit Trail](#feature-2-comprehensive-audit-trail)
4. [Feature 3: Auto-Distribution for Fair Lead Assignment](#feature-3-auto-distribution-for-fair-lead-assignment)
5. [Feature 4: Enterprise Settings Page](#feature-4-enterprise-settings-page)
6. [Feature 5: SSO (Single Sign-On)](#feature-5-sso-single-sign-on)
7. [Performance Testing](#performance-testing)
8. [Checklist](#testing-checklist)

---

## Setup for Testing

### Prerequisites
- Access to admin/superadmin account
- At least 3 user accounts (different roles: admin, manager, sales_rep)
- Firestore database populated with test leads
- Server running in development mode

### Test Data Setup
1. Create 3 test users with different roles:
   - User 1: Admin account
   - User 2: Manager account  
   - User 3: Sales Rep account
   - User 4: Sales Rep account (for competing claims)

2. Create test leads in Firestore:
   - Lead A: High-value prospect
   - Lead B: Medium-value prospect
   - Lead C: Low-value prospect
   - At least 10 more unassigned leads for distribution testing

### Browser Setup
- Open 2-4 browser windows/incognito sessions for multi-user testing
- Login different test users in each browser window
- Keep browser console open (F12) to check for errors

---

## Feature 1: Real-time Lead Claiming System

### Test 1.1: Basic Lead Claiming
**Objective:** Verify a sales rep can claim a lead and others see it locked

**Steps:**
1. Login as Sales Rep 1 in Browser 1
2. Navigate to CRM → Leads → All Leads
3. Click on a lead to open it
4. Look for "Claim Lead" button
5. Click the button
6. **Expected Result:** 
   - Button changes to "Claim Expiry: 30 minutes" with countdown timer
   - Status shows "Locked by [Rep Name]"

**Verification in Browser 2:**
1. Refresh the leads list in Browser 2 (logged in as Sales Rep 2)
2. Try to open the same lead
3. **Expected Result:**
   - Lead shows "Locked" indicator with padlock icon
   - Shows "Being edited by [Sales Rep 1 Name]"
   - Cannot edit the lead (fields are disabled or read-only)
   - See countdown timer showing remaining time

### Test 1.2: Claim Expiry
**Objective:** Verify claims auto-expire after 30 minutes

**Steps:**
1. Follow Test 1.1 to claim a lead
2. Wait for 30 minutes (or modify test data in database to speed up)
3. In Browser 2, refresh the page
4. **Expected Result:**
   - Padlock icon disappears
   - Lead is now editable again
   - Status shows "Available"

### Test 1.3: Extend Claim
**Objective:** Verify sales reps can extend their claim

**Steps:**
1. Login as Sales Rep 1, claim a lead (Test 1.1)
2. With 5 minutes remaining, click "Extend Claim" button
3. **Expected Result:**
   - Timer resets to 30 minutes
   - Message shows "Claim extended for another 30 minutes"
   - Other users still see it locked with updated timer

### Test 1.4: Release Lead Claim
**Objective:** Verify sales reps can manually release a claim

**Steps:**
1. Login as Sales Rep 1, claim a lead (Test 1.1)
2. Click "Release Lead" button
3. Confirm release in dialog
4. **Expected Result:**
   - Lead becomes available immediately
   - Status changes to "Available"
   - Button changes back to "Claim Lead"

**Verification in Browser 2:**
1. Refresh in Browser 2
2. Lead should now be editable without lock

### Test 1.5: Competing Claims (Transaction Safety)
**Objective:** Verify system prevents two reps from claiming simultaneously

**Steps:**
1. Prepare 2 browser windows with different sales reps logged in
2. Both reps viewing the same unclaimed lead
3. Simultaneously click "Claim Lead" in both browsers (at same second)
4. **Expected Result:**
   - Only ONE rep successfully claims the lead
   - Other rep gets error message: "Lead is currently being edited by another user"
   - No data corruption occurs

### Test 1.6: Manager Release Claim
**Objective:** Verify managers/admins can force-release claims

**Steps:**
1. Sales Rep 1 claims a lead
2. Login as Manager in Browser 2
3. Navigate to the claimed lead
4. Click "Force Release Lead" button (admin/manager only)
5. Confirm action
6. **Expected Result:**
   - Claim is released immediately
   - Original rep sees claim expired message
   - Lead becomes available

---

## Feature 2: Comprehensive Audit Trail

### Test 2.1: Access Audit Trail
**Objective:** Verify only authorized users can view audit logs

**Steps:**
1. Login as Sales Rep
2. Navigate to /settings/enterprise
3. **Expected Result:**
   - Access denied message appears
   - Cannot see Audit Trail tab

**Steps (as Admin/Manager):**
1. Login as Admin/Manager
2. Navigate to /settings/enterprise → Audit Trail tab
3. **Expected Result:**
   - Can view list of all audit log entries
   - See columns: Timestamp, User, Action, Entity, Entity ID, Severity, Status

### Test 2.2: Log Creation Event
**Objective:** Verify lead creation is logged

**Steps:**
1. Login as Sales Rep
2. Create a new lead with details
3. Save the lead
4. Navigate back to /settings/enterprise (as Admin) → Audit Trail
5. **Expected Result:**
   - New entry appears at top
   - Action: "create"
   - Entity Type: "lead"
   - User: Sales Rep's email
   - Severity: "info"

### Test 2.3: Log Update Event
**Objective:** Verify lead updates are logged

**Steps:**
1. Edit an existing lead (change name, phone, etc.)
2. Save changes
3. Check Audit Trail in /settings/enterprise
4. **Expected Result:**
   - New entry with Action: "update"
   - Shows the lead was modified
   - User who made change is logged
   - Timestamp is recent

### Test 2.4: Log Assignment Event
**Objective:** Verify lead assignments are logged

**Steps:**
1. As Manager, assign an unassigned lead to a sales rep
2. Check Audit Trail
3. **Expected Result:**
   - Entry shows Action: "assign"
   - Shows who was assigned
   - Who performed assignment
   - Timestamp is current

### Test 2.5: Log Claim/Release Events
**Objective:** Verify lead claiming and releasing are logged

**Steps:**
1. As Sales Rep, claim a lead
2. After some time, release the lead
3. Check Audit Trail
4. **Expected Result:**
   - Two entries: one for "claim" and one for "release"
   - Each shows who performed action
   - Timestamps are correct

### Test 2.6: Log Delete Event
**Objective:** Verify deletions are logged

**Steps:**
1. Create a test lead
2. Delete it
3. Check Audit Trail
4. **Expected Result:**
   - Entry shows Action: "delete"
   - Shows who deleted
   - Lead is marked as deleted in audit trail

### Test 2.7: Filter by Action Type
**Objective:** Verify audit logs can be filtered

**Steps:**
1. Go to /settings/enterprise → Audit Trail
2. Click "Filter by Action" dropdown
3. Select "update"
4. **Expected Result:**
   - Only "update" entries are shown
   - Other action types are hidden

### Test 2.8: Filter by User
**Objective:** Verify filtering by user who performed action

**Steps:**
1. Go to Audit Trail
2. Click "Filter by User" dropdown
3. Select a specific sales rep
4. **Expected Result:**
   - Only actions by that user are shown
   - Other users' actions are hidden

### Test 2.9: Filter by Date Range
**Objective:** Verify date range filtering

**Steps:**
1. Go to Audit Trail
2. Click "Start Date" calendar picker
3. Select date from 7 days ago
4. Click "End Date" and select today
5. **Expected Result:**
   - Only logs within date range are shown
   - Outside logs are hidden

### Test 2.10: Filter by Severity
**Objective:** Verify filtering by severity level

**Steps:**
1. Go to Audit Trail
2. Filter by Severity: "critical" (e.g., bulk deletion, export)
3. **Expected Result:**
   - Only critical-level actions shown
   - See severity badge colors (info=blue, warning=orange, critical=red)

### Test 2.11: Export Audit Logs
**Objective:** Verify audit logs can be exported for compliance

**Steps:**
1. Apply filters (optional)
2. Click "Export to JSON" button
3. Save the file
4. **Expected Result:**
   - File downloads as `audit-logs-[date].json`
   - Contains all visible logs
   - JSON format is valid and readable
   - Each entry has complete data

### Test 2.12: Verify Sensitive Data is Logged
**Objective:** Ensure bulk operations are logged

**Steps:**
1. Go to Leads
2. Select multiple leads
3. Click "Bulk Export" and export to Excel
4. Check Audit Trail
5. **Expected Result:**
   - Entry shows Action: "export"
   - Who performed it
   - How many records
   - Timestamp of export

---

## Feature 3: Auto-Distribution for Fair Lead Assignment

### Test 3.1: Access Auto-Distribution Settings
**Objective:** Verify only admins can configure distribution

**Steps:**
1. Login as Sales Rep
2. Navigate to /settings/enterprise → Auto-Distribution
3. **Expected Result:**
   - Access denied message

**Steps (as Admin):**
1. Navigate to /settings/enterprise → Auto-Distribution tab
2. **Expected Result:**
   - See distribution method options
   - See eligible roles checkboxes
   - See max leads per rep input
   - See status indicator showing "Active"

### Test 3.2: Configure Round Robin Distribution
**Objective:** Verify round-robin configuration

**Steps:**
1. Go to /settings/enterprise → Auto-Distribution
2. Select "Round Robin" method
3. Check "Sales Rep" role
4. Set "Max Leads per Rep" to 10
5. Click "Save Configuration"
6. **Expected Result:**
   - Success message appears
   - Settings are saved
   - Status shows "Round Robin: Active"

### Test 3.3: Test Round Robin Distribution
**Objective:** Verify leads are distributed equally

**Test Setup:**
- Create 5 unassigned leads
- Have 3 sales reps eligible for distribution
- Configure Round Robin method

**Steps:**
1. Click "Distribute Unassigned Now" button
2. **Expected Result:**
   - Dialog shows distribution summary
   - Rep 1 gets 2 leads (leads 1, 4)
   - Rep 2 gets 2 leads (leads 2, 5)
   - Rep 3 gets 1 lead (lead 3)
   - Distribution follows order

**Verification:**
1. Check each rep's "My Leads" section
2. **Expected Result:**
   - Each can see their assigned leads
   - All 5 leads are distributed

### Test 3.4: Configure Load Balanced Distribution
**Objective:** Verify load-balanced distribution settings

**Steps:**
1. Go to /settings/enterprise → Auto-Distribution
2. Select "Load Balanced" method
3. Set "Max Leads per Rep" to 15
4. Save configuration
5. **Expected Result:**
   - Setting is saved
   - Method changes to "Load Balanced"

### Test 3.5: Test Load Balanced Distribution
**Objective:** Verify leads assigned to rep with fewest

**Test Setup:**
- Rep 1: Currently has 5 leads
- Rep 2: Currently has 3 leads  
- Rep 3: Currently has 8 leads
- 3 new unassigned leads to distribute

**Steps:**
1. Click "Distribute Unassigned Now"
2. **Expected Result:**
   - All 3 new leads go to Rep 2 (has fewest)
   - Distribution balances workload

### Test 3.6: Configure Random Distribution
**Objective:** Verify random distribution settings

**Steps:**
1. Go to /settings/enterprise → Auto-Distribution
2. Select "Random" method
3. Save configuration
4. **Expected Result:**
   - Method changes to "Random"

### Test 3.7: Test Random Distribution
**Objective:** Verify leads are randomly assigned

**Test Setup:**
- 6 unassigned leads
- 3 eligible sales reps

**Steps:**
1. Click "Distribute Unassigned Now"
2. Note which rep gets which lead
3. Run distribution again with 6 more leads
4. **Expected Result:**
   - Leads are distributed randomly
   - Different reps may get different numbers each time

### Test 3.8: Exclude Users from Distribution
**Objective:** Verify specific reps can be excluded

**Steps:**
1. Go to /settings/enterprise → Auto-Distribution
2. In eligible roles section, find "Exclude Users"
3. Select one sales rep to exclude
4. Save
5. Click "Distribute Unassigned Now" with unassigned leads
6. **Expected Result:**
   - Excluded rep doesn't receive any leads
   - Only other reps get assigned leads

### Test 3.9: Respect Max Leads Per Rep Limit
**Objective:** Verify system doesn't exceed lead cap

**Test Setup:**
- Rep 1: 9 leads (limit is 10)
- Rep 2: 5 leads
- Rep 3: 5 leads
- 10 unassigned leads
- Max Leads Per Rep: 10

**Steps:**
1. Run "Distribute Unassigned Now"
2. **Expected Result:**
   - Rep 1 gets only 1 more lead (to reach 10)
   - Rep 2 gets 5 leads (now has 10)
   - Rep 3 gets 4 leads (now has 9, respects limit)
   - Total: 10 leads distributed
   - 0 remain unassigned

### Test 3.10: Distribution Logging
**Objective:** Verify distribution is logged in audit trail

**Steps:**
1. Run "Distribute Unassigned Now"
2. Audit Trail should show distribution event
3. **Expected Result:**
   - Entry shows Action: "distribute"
   - Shows how many leads were distributed
   - Shows who performed distribution
   - Timestamp is current

---

## Feature 4: Enterprise Settings Page

### Test 4.1: Access Enterprise Settings
**Objective:** Verify access control

**Steps (as Sales Rep):**
1. Try to navigate to /settings/enterprise
2. **Expected Result:**
   - "Access Denied" message
   - Cannot see any settings

**Steps (as Admin):**
1. Navigate to /settings/enterprise
2. **Expected Result:**
   - Page loads successfully
   - Shows 4 cards with feature status
   - Shows 3 tabs: Auto-Distribution, Audit Trail, SSO Setup

### Test 4.2: Feature Status Indicators
**Objective:** Verify status cards display correctly

**Steps:**
1. Go to /settings/enterprise
2. **Expected Result - 4 Status Cards:**
   - Lead Claiming: Active (green checkmark badge)
   - Audit Trail: Active (green checkmark badge)
   - Auto-Distribution: Active (green checkmark badge)
   - SSO Configuration: Available (blue info badge)

### Test 4.3: Tab Navigation
**Objective:** Verify all tabs are accessible

**Steps:**
1. Click "Auto-Distribution" tab
2. **Expected Result:** Shows auto-distribution settings

3. Click "Audit Trail" tab
4. **Expected Result:** Shows audit log viewer

5. Click "SSO Setup" tab
6. **Expected Result:** Shows SSO information and current auth methods

### Test 4.4: SSO Information Display
**Objective:** Verify SSO options are clearly shown

**Steps:**
1. Go to /settings/enterprise → SSO Setup tab
2. **Expected Result:**
   - Shows current auth methods (Google, GitHub, Microsoft, Apple)
   - Each marked as "Currently Available"
   - SAML/OIDC section shows "Enterprise Only"
   - Shows note about contacting sales for Okta, Azure AD, Google Workspace

### Test 4.5: Help Text and Documentation Links
**Objective:** Verify help resources are available

**Steps:**
1. Throughout Enterprise Settings, look for help icons (?)
2. Hover or click on them
3. **Expected Result:**
   - Tooltips/popovers appear with helpful info
   - Documentation links are functional
   - External links open in new tabs

---

## Feature 5: SSO (Single Sign-On)

### Test 5.1: Current SSO Methods Available
**Objective:** Verify social authentication works

**Existing Methods (No Configuration Needed):**
- Google Sign-In
- GitHub Sign-In
- Microsoft Sign-In
- Apple Sign-In

**Steps for Each:**
1. Sign out from application
2. On login page, click "[Provider] Sign-In" button
3. Complete provider's authentication flow
4. **Expected Result:**
   - User is logged in successfully
   - Redirected to dashboard
   - User profile shows correct name and email

### Test 5.2: Google Sign-In
**Steps:**
1. Click "Sign in with Google"
2. Use test Google account
3. **Expected Result:**
   - Login succeeds
   - User data is synced
   - Can access dashboard

### Test 5.3: GitHub Sign-In
**Steps:**
1. Click "Sign in with GitHub"
2. Authorize application
3. **Expected Result:**
   - Login succeeds
   - GitHub profile synced
   - Can access dashboard

### Test 5.4: Microsoft Sign-In
**Steps:**
1. Click "Sign in with Microsoft"
2. Complete Microsoft auth
3. **Expected Result:**
   - Login succeeds
   - Microsoft account linked
   - Can access dashboard

### Test 5.5: Apple Sign-In
**Steps:**
1. Click "Sign in with Apple"
2. Complete Apple auth
3. **Expected Result:**
   - Login succeeds
   - Apple ID linked
   - Can access dashboard

### Test 5.6: Enterprise SAML/OIDC (If Available)
**Documentation Only:**
- Okta SAML integration available on request
- Azure AD OIDC available on request
- Google Workspace SAML available on request

**Contact sales for setup and configuration details**

---

## Performance Testing

### Test 6.1: Reference Documentation
**File:** `docs/PERFORMANCE_TESTING_GUIDE.md`

**Key Benchmarks to Verify:**
- 50 concurrent users can load leads page
- Real-time claiming updates propagate within 500ms
- Audit trail queries return within 1 second
- Auto-distribution completes for 100 leads in < 5 seconds

### Test 6.2: Basic Load Testing
**Tools:** k6 (see PERFORMANCE_TESTING_GUIDE.md)

**Quick Test:**
1. Open docs/PERFORMANCE_TESTING_GUIDE.md
2. Follow script to run k6 with 50 virtual users
3. Verify:
   - No timeouts
   - Response times < 1 second
   - Database transactions don't fail under load

---

## Testing Checklist

Use this checklist to track your testing progress:

### Feature 1: Real-time Lead Claiming
- [ ] Test 1.1 - Basic Lead Claiming
- [ ] Test 1.2 - Claim Expiry
- [ ] Test 1.3 - Extend Claim
- [ ] Test 1.4 - Release Claim
- [ ] Test 1.5 - Competing Claims (Transaction Safety)
- [ ] Test 1.6 - Manager Force Release

### Feature 2: Comprehensive Audit Trail
- [ ] Test 2.1 - Access Control
- [ ] Test 2.2 - Log Creation Event
- [ ] Test 2.3 - Log Update Event
- [ ] Test 2.4 - Log Assignment Event
- [ ] Test 2.5 - Log Claim/Release Events
- [ ] Test 2.6 - Log Delete Event
- [ ] Test 2.7 - Filter by Action Type
- [ ] Test 2.8 - Filter by User
- [ ] Test 2.9 - Filter by Date Range
- [ ] Test 2.10 - Filter by Severity
- [ ] Test 2.11 - Export Audit Logs
- [ ] Test 2.12 - Verify Sensitive Data Logging

### Feature 3: Auto-Distribution
- [ ] Test 3.1 - Access Control
- [ ] Test 3.2 - Configure Round Robin
- [ ] Test 3.3 - Test Round Robin Distribution
- [ ] Test 3.4 - Configure Load Balanced
- [ ] Test 3.5 - Test Load Balanced Distribution
- [ ] Test 3.6 - Configure Random
- [ ] Test 3.7 - Test Random Distribution
- [ ] Test 3.8 - Exclude Users
- [ ] Test 3.9 - Respect Max Leads Limit
- [ ] Test 3.10 - Distribution Logging

### Feature 4: Enterprise Settings Page
- [ ] Test 4.1 - Access Control
- [ ] Test 4.2 - Feature Status Indicators
- [ ] Test 4.3 - Tab Navigation
- [ ] Test 4.4 - SSO Information Display
- [ ] Test 4.5 - Help Text and Documentation

### Feature 5: SSO
- [ ] Test 5.1 - Current Methods Available
- [ ] Test 5.2 - Google Sign-In
- [ ] Test 5.3 - GitHub Sign-In
- [ ] Test 5.4 - Microsoft Sign-In
- [ ] Test 5.5 - Apple Sign-In
- [ ] Test 5.6 - Document Enterprise SAML/OIDC

### Performance Testing
- [ ] Test 6.1 - Review Performance Guide
- [ ] Test 6.2 - Run Basic Load Test

---

## Troubleshooting

### Issue: Claim expires too quickly
**Solution:** Check CLAIM_DURATION_MINUTES constant in `src/lib/enterprise/lead-claiming.ts`. Default is 30 minutes.

### Issue: Audit logs not appearing
**Solution:** 
1. Verify user role is admin/manager/superadmin
2. Check browser console for errors
3. Verify Firestore has `audit_logs` collection

### Issue: Distribution fails to run
**Solution:**
1. Verify at least 1 unassigned lead exists
2. Verify at least 1 eligible rep exists
3. Check selected distribution method is configured

### Issue: SSO providers not showing on login page
**Solution:**
1. Verify Firebase project has OAuth credentials
2. Check auth providers are enabled in Firebase console
3. Clear browser cache

### Issue: Transaction conflicts in high-concurrency tests
**Solution:**
- This is expected behavior - system should handle gracefully
- Check error messages guide user to retry
- Verify database transactions are atomic

---

## Test Results Report

After completing all tests, document:

| Feature | Total Tests | Passed | Failed | Notes |
|---------|-----------|--------|--------|-------|
| Lead Claiming | 6 | | | |
| Audit Trail | 12 | | | |
| Auto-Distribution | 10 | | | |
| Settings Page | 5 | | | |
| SSO | 6 | | | |
| Performance | 2 | | | |
| **TOTAL** | **41** | | | |

**Overall Status:** [ ] PASS [ ] FAIL

---

## Sign-Off

- **Tested By:** [Your Name]
- **Date:** [Date]
- **Environment:** [dev/staging/prod]
- **Browser:** [Chrome/Firefox/Safari]
- **Approval:** [Manager/Lead approval]
