# OmniFlow QA Testing Checklist

## Pre-Launch Verification Checklist

### 1. Authentication & Authorization

- [ ] User registration works correctly
- [ ] User login/logout works correctly
- [ ] Password reset flow works
- [ ] Session management (tokens expire and refresh properly)
- [ ] Protected routes redirect unauthenticated users
- [ ] Role-based access control works (admin vs user)
- [ ] Firebase authentication token validation works

### 2. CRM Core Features

#### Contacts/Leads
- [ ] Create new contact with all fields
- [ ] Edit existing contact
- [ ] Delete contact (with confirmation)
- [ ] Contact list pagination works
- [ ] Search and filter contacts
- [ ] Sort by different fields
- [ ] Contact status changes update correctly
- [ ] Contact detail page loads properly

#### Activity Timeline
- [ ] Activities display in chronological order
- [ ] Add new note works
- [ ] Email activities logged automatically
- [ ] SMS activities logged automatically
- [ ] Status changes logged automatically

#### Deals/Opportunities
- [ ] Create new deal
- [ ] Edit deal details
- [ ] Update deal status
- [ ] Deal probabilities auto-update with status
- [ ] Deal value calculations correct
- [ ] Weighted pipeline value calculation accurate
- [ ] Won/Lost deals move to closed state

### 3. Dashboard

- [ ] Pipeline value displays correctly
- [ ] Won revenue shows accurate total
- [ ] Conversion rate calculation correct
- [ ] Contact status distribution accurate
- [ ] Recent activities show correctly
- [ ] All metric cards load properly

### 4. Campaigns

- [ ] Create email campaign
- [ ] Create SMS campaign
- [ ] Create WhatsApp campaign
- [ ] Campaign recipient selection works
- [ ] Campaign scheduling works
- [ ] Campaign sending works
- [ ] Campaign analytics display correctly

### 5. AI Features

- [ ] AI content generation works
- [ ] AI response times acceptable (<5 seconds)
- [ ] AI error handling graceful
- [ ] Cost tracking for AI calls working

### 6. Integrations

- [ ] Brevo sync works (if configured)
- [ ] HubSpot sync works (if configured)
- [ ] Razorpay integration works (if configured)
- [ ] Stripe integration works (if configured)

### 7. Performance

- [ ] Page load times < 3 seconds
- [ ] API response times < 1 second
- [ ] No memory leaks observed
- [ ] Bundle size reasonable (< 500KB initial)
- [ ] Images optimized

### 8. Security

- [ ] Rate limiting active on API routes
- [ ] CORS headers configured
- [ ] No sensitive data in console logs
- [ ] API keys not exposed in client code
- [ ] Input validation on all forms
- [ ] XSS protection active
- [ ] CSRF protection active

### 9. Database

- [ ] Firestore indexes deployed
- [ ] Queries returning expected results
- [ ] No N+1 query issues
- [ ] Data consistency maintained

### 10. UI/UX

- [ ] All buttons clickable
- [ ] All forms submit correctly
- [ ] Loading states display properly
- [ ] Error messages user-friendly
- [ ] Responsive on mobile (320px+)
- [ ] Responsive on tablet (768px+)
- [ ] Dark mode works correctly
- [ ] Accessibility (keyboard navigation, screen readers)

### 11. Error Handling

- [ ] 404 page displays for invalid routes
- [ ] Network errors handled gracefully
- [ ] Form validation errors shown clearly
- [ ] API errors logged properly
- [ ] User-friendly error messages displayed

### 12. Onboarding

- [ ] First-run modal appears for new users
- [ ] Onboarding checklist tracks progress
- [ ] Skip/dismiss functionality works
- [ ] Steps link to correct pages

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Firebase project configured
- [ ] Firestore indexes deployed
- [ ] Build completes without errors
- [ ] No TypeScript errors (or acceptable suppressions)
- [ ] Production API endpoints working
- [ ] SSL certificate valid
- [ ] Domain configured correctly

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product | | | |
