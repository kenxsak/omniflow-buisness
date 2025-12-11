# Enterprise Features - Quick Testing Checklist

**Quick Reference: Test each feature in 5-10 minutes**

---

## 1. LEAD CLAIMING (5 mins)
**What to verify:** Multiple users can't edit the same lead simultaneously

- [ ] **Browser 1 (Rep A):** Open lead → Click "Claim Lead" → See 30-min timer
- [ ] **Browser 2 (Rep B):** Refresh → See padlock + "Locked by [Rep A]" → Try to edit → Disabled
- [ ] **Back to Browser 1:** Click "Release Lead" 
- [ ] **Back to Browser 2:** Refresh → Padlock gone → Can edit
- [ ] **Extend Test:** Claim again → Click "Extend Claim" → Timer resets to 30 mins ✓

---

## 2. AUDIT TRAIL (5 mins)
**What to verify:** All actions are logged and filterable

- [ ] Create a new lead → Go to /settings/enterprise → Audit Trail tab → See "create" entry
- [ ] Edit that lead → Refresh audit trail → See "update" entry  
- [ ] Delete that lead → See "delete" entry in audit trail
- [ ] Click filter dropdown → Select "update" only → Only updates show
- [ ] Click "Export to JSON" → Download file → Verify JSON is valid
- [ ] Try accessing audit trail **as Sales Rep** → See "Access Denied" ✓

---

## 3. AUTO-DISTRIBUTION (5 mins)
**What to verify:** Leads are fairly distributed using selected method

**Setup:** Have 3 sales reps + 6 unassigned leads

- [ ] Go to /settings/enterprise → Auto-Distribution tab
- [ ] Select "Round Robin" method → Save
- [ ] Click "Distribute Unassigned Now"
- [ ] Verify distribution summary shows equal spread (2-2-2)
- [ ] Check each rep's "My Leads" → All 6 leads assigned ✓

**Alternative:** Try "Load Balanced" (favors rep with fewest leads)

---

## 4. ENTERPRISE SETTINGS PAGE (3 mins)
**What to verify:** Page layout and access control

- [ ] Go to /settings/enterprise (as Admin) → Page loads
- [ ] See 4 status cards: Lead Claiming, Audit Trail, Auto-Distribution, SSO (all show "Active")
- [ ] See 3 tabs: Auto-Distribution, Audit Trail, SSO Setup
- [ ] Try accessing as Sales Rep → See "Access Denied" ✓

---

## 5. SSO (5 mins if available)
**What to verify:** Alternative login methods work

- [ ] Sign out
- [ ] Click "Sign in with Google" → Complete login → Works ✓
- [ ] Sign out, try "Sign in with GitHub" → Works ✓
- [ ] (Optional) Try Microsoft, Apple if available
- [ ] Note: Enterprise SAML/Okta requires sales contact

---

## 6. PERFORMANCE (5 mins - Optional)
**What to verify:** System handles multiple concurrent users

- [ ] Open `docs/PERFORMANCE_TESTING_GUIDE.md`
- [ ] Follow instructions to run k6 test
- [ ] Verify: 50 users load successfully, no timeouts

---

## Multi-Browser Testing Setup (IMPORTANT)

**Browser 1:** Sales Rep A (logged in)  
**Browser 2:** Sales Rep B (logged in)  
**Browser 3:** Manager/Admin (logged in)  

Use for testing concurrent access and permissions.

---

## Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| Claiming not working | Refresh page / Check Rep has role 'sales_rep' |
| Audit trail shows nothing | You need admin role / Check leads exist |
| Distribution fails | Need unassigned leads + eligible reps |
| Locked for too long | Wait 30 mins OR modify CLAIM_DURATION_MINUTES in code |
| SSO buttons missing | Check Firebase auth providers enabled |

---

## Test Results Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Lead Claiming | [ ] PASS [ ] FAIL | |
| Audit Trail | [ ] PASS [ ] FAIL | |
| Auto-Distribution | [ ] PASS [ ] FAIL | |
| Settings Page | [ ] PASS [ ] FAIL | |
| SSO | [ ] PASS [ ] FAIL | |
| Performance | [ ] PASS [ ] FAIL | |

**Overall: [ ] ALL PASS [ ] NEEDS FIXES**

---

## Detailed Testing?
See `docs/ENTERPRISE_TESTING_GUIDE.md` for complete test cases with step-by-step instructions.
