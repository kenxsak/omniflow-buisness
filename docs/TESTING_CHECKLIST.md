# OmniFlow Testing Checklist

## Overview

This document provides a comprehensive testing checklist for OmniFlow. Complete all tests before each major release or deployment.

---

## Pre-Testing Setup

- [ ] Clear browser cache and cookies
- [ ] Use incognito/private browsing for clean tests
- [ ] Prepare test accounts (new user, existing user, admin)
- [ ] Ensure test environment is isolated from production
- [ ] Document browser and device being used for testing

---

## Section A: Authentication & User Management

### A1: Sign Up Flow
- [ ] New user can register with email/password
- [ ] Email verification sent (if enabled)
- [ ] New company created automatically
- [ ] User redirected to dashboard after signup
- [ ] Welcome/onboarding flow appears for new users
- [ ] Error messages display for invalid inputs

### A2: Sign In Flow
- [ ] Existing user can sign in with correct credentials
- [ ] "Remember me" functionality works
- [ ] Incorrect password shows appropriate error
- [ ] Account lockout after multiple failed attempts (if enabled)
- [ ] Session persists across browser refresh

### A3: Password Reset
- [ ] Password reset email sends successfully
- [ ] Reset link works and expires appropriately
- [ ] New password can be set
- [ ] User can sign in with new password

### A4: Sign Out
- [ ] Sign out clears session
- [ ] Protected routes redirect to login
- [ ] No cached data accessible after logout

---

## Section B: CRM Core Features

### B1: Contact Management (CRUD)
- [ ] **Create:** Add new contact with all fields
- [ ] **Read:** View contact list with pagination
- [ ] **Read:** View single contact detail page
- [ ] **Update:** Edit contact information
- [ ] **Delete:** Remove contact with confirmation
- [ ] Bulk import contacts via CSV works
- [ ] Contact search and filtering works
- [ ] Contact status can be changed

### B2: Activity Timeline (C1 Verification)
- [ ] Activity timeline displays on contact page
- [ ] Activities show in chronological order (newest first)
- [ ] Email activities display correctly
- [ ] SMS activities display correctly
- [ ] WhatsApp activities display correctly
- [ ] Notes can be added to timeline
- [ ] Activity icons and colors are correct
- [ ] Timestamps format correctly

### B3: Deal/Opportunity Management (C2 Verification)
- [ ] **Create:** New deal can be created
- [ ] **Create:** Deal links to contact correctly
- [ ] **Read:** Deals display on contact page
- [ ] **Read:** Deals table view works
- [ ] **Update:** Deal status can be changed (Proposal → Won/Lost)
- [ ] **Update:** Deal amount can be modified
- [ ] **Delete:** Deal can be removed
- [ ] Deal probability updates with status
- [ ] Pipeline value calculates correctly
- [ ] Deal statuses: Proposal, Negotiation, Closing, Won, Lost

### B4: Pipeline View
- [ ] Pipeline stages display correctly
- [ ] Contacts/deals can be moved between stages
- [ ] Pipeline value shows per stage
- [ ] Filter by pipeline works

### B5: Tasks Management
- [ ] Create new task
- [ ] Assign task to contact
- [ ] Set due date
- [ ] Mark task complete
- [ ] Task reminders work (if enabled)
- [ ] Overdue tasks highlighted

---

## Section C: Onboarding Flow (C3 Verification)

### C1: New User Onboarding
- [ ] Welcome checklist appears for new users
- [ ] Progress bar updates correctly
- [ ] Checklist items link to correct pages
- [ ] Completed items show checkmark
- [ ] "Skip" or "Dismiss" option works
- [ ] Completion celebration displays when done
- [ ] Checklist doesn't reappear after completion

### C2: Onboarding Items
- [ ] "Add contacts" step tracks correctly
- [ ] "Send first campaign" step tracks correctly
- [ ] "Create digital card" step tracks correctly
- [ ] "Invite team member" step tracks correctly
- [ ] "Try AI" step tracks correctly
- [ ] "Setup automation" step tracks correctly
- [ ] "Launch multi-channel" step tracks correctly

---

## Section D: Dashboard (C4 Verification)

### D1: Dashboard Metrics
- [ ] Pipeline Value card shows correct total
- [ ] Weighted pipeline value calculates correctly
- [ ] Won Revenue displays accurate sum
- [ ] Conversion Rate percentage is correct
- [ ] Total Contacts count matches actual
- [ ] New contacts count is accurate

### D2: Dashboard Visualizations
- [ ] Recent Activity section shows latest activities
- [ ] Contact Status Distribution chart renders
- [ ] Distribution percentages are accurate
- [ ] Dashboard loads without errors

### D3: Dashboard Edge Cases
- [ ] Dashboard works with zero contacts
- [ ] Dashboard works with zero deals
- [ ] Dashboard handles large numbers correctly

---

## Section E: Email Campaigns

### E1: Campaign Creation
- [ ] Create new email campaign
- [ ] Add subject line
- [ ] Compose email content
- [ ] Select recipient list/contacts
- [ ] Preview email before sending
- [ ] Save as draft works

### E2: Campaign Sending
- [ ] Send test email works
- [ ] Send to all recipients works
- [ ] Campaign status updates (Draft → Sent)
- [ ] Activity logged for each recipient
- [ ] Error handling for failed sends

### E3: Campaign Analytics
- [ ] Sent count displays
- [ ] Open rate tracks (if provider supports)
- [ ] Click rate tracks (if provider supports)

---

## Section F: SMS Campaigns

### F1: SMS Setup
- [ ] SMS provider configured correctly
- [ ] Test SMS sends successfully
- [ ] Character count displays
- [ ] Multi-part message warning shows

### F2: SMS Campaigns
- [ ] Create SMS campaign
- [ ] Select recipients
- [ ] Send SMS campaign
- [ ] Activity logged for recipients
- [ ] Delivery status updates

---

## Section G: WhatsApp Campaigns

### G1: WhatsApp Setup
- [ ] WhatsApp provider configured
- [ ] Test message sends
- [ ] Template selection works (if applicable)

### G2: WhatsApp Campaigns
- [ ] Create WhatsApp campaign
- [ ] Attach image (if supported)
- [ ] Send to recipients
- [ ] Activity logged correctly

---

## Section H: AI Features

### H1: AI Content Generation
- [ ] AI content writer accessible
- [ ] Email content generation works
- [ ] Blog post generation works
- [ ] Social media content generation works
- [ ] AI respects user prompts

### H2: AI Campaign Studio
- [ ] Create AI-driven campaign
- [ ] Multi-channel campaign generation
- [ ] Draft saving works
- [ ] AI credits tracked (if applicable)

### H3: AI Usage Tracking
- [ ] AI usage displays in dashboard
- [ ] Credits deducted correctly
- [ ] BYOK (Bring Your Own Key) works

---

## Section I: Appointments

### I1: Appointment Booking
- [ ] Create new appointment
- [ ] Select date and time
- [ ] Link to contact
- [ ] Appointment appears in calendar
- [ ] Confirmation sent (if enabled)

### I2: Appointment Management
- [ ] Edit appointment details
- [ ] Reschedule appointment
- [ ] Cancel appointment
- [ ] Appointment reminders work

---

## Section J: Automation

### J1: Email Automation
- [ ] Create automation workflow
- [ ] Set trigger conditions
- [ ] Define email sequence
- [ ] Automation activates correctly
- [ ] Emails send on schedule
- [ ] Automation can be paused/stopped

---

## Section K: Team Management

### K1: Team Invitations
- [ ] Invite team member by email
- [ ] Invitation email sends
- [ ] Invited user can join
- [ ] User gets correct role

### K2: Role-Based Access
- [ ] Admin can access all features
- [ ] Manager has appropriate access
- [ ] User role has limited access
- [ ] SuperAdmin can manage all companies

---

## Section L: Settings & Configuration

### L1: API Keys Setup
- [ ] Email provider API key saves
- [ ] SMS provider API key saves
- [ ] WhatsApp provider API key saves
- [ ] API keys encrypted properly
- [ ] Test connection works

### L2: Company Settings
- [ ] Company name updates
- [ ] Company logo uploads
- [ ] Settings persist after save

---

## Section M: Performance Testing

### M1: Page Load Times
- [ ] Dashboard loads < 3 seconds
- [ ] Contact list loads < 3 seconds
- [ ] Contact detail loads < 2 seconds
- [ ] Campaign pages load < 3 seconds

### M2: Large Data Sets
- [ ] 1,000+ contacts loads correctly
- [ ] Pagination works with large lists
- [ ] Search remains fast
- [ ] No memory issues

### M3: Mobile Responsiveness
- [ ] Dashboard works on mobile
- [ ] Navigation menu works on mobile
- [ ] Forms are usable on mobile
- [ ] Tables scroll horizontally on mobile

---

## Section N: Security Testing

### N1: Authentication Security
- [ ] Cannot access protected routes without login
- [ ] Session expires appropriately
- [ ] CSRF protection works
- [ ] No sensitive data in URLs

### N2: Authorization
- [ ] Users cannot access other company's data
- [ ] Role permissions enforced
- [ ] API endpoints require authentication

### N3: Data Security
- [ ] API keys not visible in frontend
- [ ] No sensitive data in console logs
- [ ] HTTPS enforced

---

## Section O: Cross-Browser Testing

### O1: Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### O2: Mobile Browsers
- [ ] iOS Safari
- [ ] Android Chrome

---

## Section P: Error Handling

### P1: User-Friendly Errors
- [ ] Form validation errors display clearly
- [ ] API errors show helpful messages
- [ ] Network errors handled gracefully
- [ ] 404 page displays for missing routes

### P2: Error Recovery
- [ ] User can retry failed operations
- [ ] Data not lost on errors
- [ ] Session recovers after network issues

---

## Test Completion Sign-Off

| Section | Tested By | Date | Status |
|---------|-----------|------|--------|
| A: Authentication | | | |
| B: CRM Core | | | |
| C: Onboarding | | | |
| D: Dashboard | | | |
| E: Email Campaigns | | | |
| F: SMS Campaigns | | | |
| G: WhatsApp | | | |
| H: AI Features | | | |
| I: Appointments | | | |
| J: Automation | | | |
| K: Team Management | | | |
| L: Settings | | | |
| M: Performance | | | |
| N: Security | | | |
| O: Cross-Browser | | | |
| P: Error Handling | | | |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 29, 2025 | System | Initial creation |
