# OmniFlow OWASP Security Checklist

## Overview

This document provides a comprehensive security checklist based on OWASP Top 10 guidelines for the OmniFlow platform. Complete all items before MVP launch.

---

## Pre-MVP Security Verification

### How to Run Security Scan

```bash
# Run automated security scan (static code analysis)
chmod +x scripts/security-scan.sh
./scripts/security-scan.sh

# Run npm dependency audit
npm audit
npm audit fix  # Fix auto-fixable issues
```

**What the Security Scan Checks:**
- Hardcoded secrets and API keys in source code
- Authentication pattern usage in server actions
- Input validation with Zod schemas
- Firestore security rules configuration
- XSS vulnerability patterns (dangerouslySetInnerHTML)
- Payment security patterns (signature verification)
- Rate limiter module presence
- Middleware configuration

**What Requires Manual Testing:**
- Runtime CORS behavior
- Actual rate limiting effectiveness
- Session timeout and token expiry
- Penetration testing with OWASP ZAP
- Cross-tenant data isolation (log in as different users)

---

## OWASP Top 10 Checklist

### A01:2021 - Broken Access Control

| Check | Status | Notes |
|-------|--------|-------|
| All API endpoints require authentication | [ ] | Verify `verifyAuthToken()` in all server actions |
| Role-based access control (RBAC) enforced | [ ] | Admin, Manager, User roles properly separated |
| Firestore rules prevent cross-tenant access | [ ] | `companyId` isolation in all queries |
| Direct object reference validated | [ ] | Users can only access their own company data |
| API rate limiting enabled | [ ] | See `src/lib/security/rate-limiter.ts` |

**Testing Steps:**
1. Log in as a regular user
2. Try to access admin-only pages (`/settings/enterprise`)
3. Try to access another company's leads via URL manipulation
4. Expected: Access denied for unauthorized actions

### A02:2021 - Cryptographic Failures

| Check | Status | Notes |
|-------|--------|-------|
| HTTPS enforced for all connections | [ ] | Replit handles SSL |
| API keys encrypted at rest | [ ] | AES-GCM encryption in `src/lib/encryption/` |
| Passwords hashed (Firebase Auth) | [ ] | Firebase Auth handles password hashing |
| Sensitive data not logged | [ ] | Review console.log statements |
| Payment data handled securely | [ ] | Stripe/Razorpay SDKs, no raw card storage |

**Testing Steps:**
1. Check browser DevTools Network tab for HTTPS
2. Verify API keys in Firestore are encrypted
3. Review logs for sensitive data exposure

### A03:2021 - Injection

| Check | Status | Notes |
|-------|--------|-------|
| Input validation with Zod schemas | [ ] | All form inputs validated |
| Parameterized queries (Firestore) | [ ] | Firestore SDK handles escaping |
| No raw SQL queries | [ ] | Using Firestore, not SQL |
| Email template sanitization | [ ] | Review campaign email content |
| File upload validation | [ ] | Check file type/size limits |

**Testing Steps:**
1. Try submitting forms with special characters `<script>alert('xss')</script>`
2. Verify input is sanitized or rejected
3. Check that error messages don't expose system details

### A04:2021 - Insecure Design

| Check | Status | Notes |
|-------|--------|-------|
| Secure session management | [ ] | Firebase Auth tokens with expiry |
| Password reset flow secure | [ ] | Firebase Auth handles this |
| Multi-tenant data isolation | [ ] | `companyId` required for all queries |
| Fail-safe defaults | [ ] | Deny access by default |
| Error handling doesn't leak info | [ ] | Generic error messages to users |

**Testing Steps:**
1. Log out and try accessing protected routes
2. Verify redirect to login page
3. Check error messages don't expose stack traces

### A05:2021 - Security Misconfiguration

| Check | Status | Notes |
|-------|--------|-------|
| Default credentials removed | [ ] | No default admin passwords |
| Debug mode disabled in production | [ ] | `NODE_ENV=production` |
| Security headers configured | [ ] | See middleware.ts |
| CORS properly configured | [ ] | Only allow known origins |
| Firebase rules deployed | [ ] | Run `firebase deploy --only firestore:rules` |

**Testing Steps:**
1. Check response headers in DevTools
2. Verify CORS blocks unknown origins
3. Confirm Firestore rules are active

### A06:2021 - Vulnerable Components

| Check | Status | Notes |
|-------|--------|-------|
| npm audit passed | [ ] | Run `npm audit` |
| No critical vulnerabilities | [ ] | Fix high/critical issues |
| Dependencies updated | [ ] | Run `npm outdated` |
| Unused dependencies removed | [ ] | Clean package.json |

**Testing Steps:**
```bash
npm audit
npm outdated
npm audit fix
```

### A07:2021 - Authentication Failures

| Check | Status | Notes |
|-------|--------|-------|
| Strong password policy | [ ] | Firebase Auth enforces |
| Brute force protection | [ ] | Rate limiting on login |
| Session timeout configured | [ ] | Token expiry set |
| Secure password reset | [ ] | Firebase Auth handles |
| MFA available for admins | [ ] | Optional, can be enabled |

**Testing Steps:**
1. Try logging in with wrong password 10 times
2. Verify rate limiting kicks in
3. Test password reset flow

### A08:2021 - Data Integrity Failures

| Check | Status | Notes |
|-------|--------|-------|
| Webhook signatures verified | [ ] | Stripe/Razorpay signature validation |
| Data integrity checks | [ ] | Firestore transactions for critical ops |
| Automated backups enabled | [ ] | See backup documentation |
| Audit logging active | [ ] | Actions logged with timestamps |

**Testing Steps:**
1. Review webhook handlers for signature verification
2. Check audit logs capture all critical actions
3. Verify backup procedures are documented

### A09:2021 - Logging & Monitoring

| Check | Status | Notes |
|-------|--------|-------|
| Security events logged | [ ] | Failed logins, access denials |
| Logs don't contain sensitive data | [ ] | No passwords/tokens in logs |
| Monitoring alerts configured | [ ] | Firebase alerts for anomalies |
| Audit trail for compliance | [ ] | Enterprise audit log feature |

**Testing Steps:**
1. Trigger a failed login and check logs
2. Verify no sensitive data in console output
3. Review audit trail in `/settings/enterprise`

### A10:2021 - Server-Side Request Forgery

| Check | Status | Notes |
|-------|--------|-------|
| URL validation for external requests | [ ] | Validate webhook/API URLs |
| Allowlist for external services | [ ] | Only known API endpoints |
| No user-controlled URLs in requests | [ ] | Review fetch/axios calls |

**Testing Steps:**
1. Review code for any user-controlled URL fetching
2. Verify external API calls use known endpoints

---

## Pre-Launch Security Checklist

### Environment Configuration

- [ ] All secrets stored in Replit Secrets, not in code
- [ ] Production environment variables set
- [ ] Firebase project in production mode
- [ ] Error reporting configured (no stack traces to users)

### Database Security

- [ ] Firestore security rules deployed and tested
- [ ] Firestore indexes deployed
- [ ] Automated backups configured
- [ ] Data retention policies documented

### API Security

- [ ] Rate limiting enabled on all endpoints
- [ ] Input validation on all forms
- [ ] CORS configured for production domain
- [ ] Webhook endpoints secured with signatures

### Payment Security

- [ ] Stripe webhook signature verification working
- [ ] Razorpay signature verification working
- [ ] No raw payment data stored
- [ ] Test mode keys NOT in production

### User Data Protection

- [ ] Data isolation by companyId enforced
- [ ] Personal data encrypted where required
- [ ] Data export/deletion capability for GDPR
- [ ] Privacy policy and terms published

---

## Security Testing Procedures

### Manual Testing Checklist

```
1. Authentication Tests
   [ ] Try accessing protected routes without login
   [ ] Test session expiry after inactivity
   [ ] Verify password reset email is secure

2. Authorization Tests  
   [ ] Log in as user, try admin actions
   [ ] Try accessing another company's data
   [ ] Verify RBAC for all features

3. Input Validation Tests
   [ ] Submit XSS payloads in forms
   [ ] Test file uploads with wrong types
   [ ] Verify error messages are generic

4. Payment Flow Tests
   [ ] Complete a test payment (Stripe test mode)
   [ ] Complete a test payment (Razorpay test mode)
   [ ] Verify webhook handling
```

### Automated Security Scan

```bash
# Run the security scan script
./scripts/security-scan.sh

# Expected output:
# - PASS for critical checks
# - WARN for items to review
# - FAIL for issues to fix

# Fix any FAIL items before launch
```

---

## Incident Response Plan

### If a Security Issue is Found

1. **Assess** - Determine severity and scope
2. **Contain** - Disable affected functionality if needed
3. **Fix** - Implement and test the fix
4. **Deploy** - Push fix to production
5. **Document** - Record the incident and resolution
6. **Review** - Update security procedures

### Emergency Contacts

| Role | Action |
|------|--------|
| Primary Admin | First responder for security issues |
| Firebase Support | Database/auth issues |
| Stripe Support | Payment security issues |
| Razorpay Support | Payment security issues (India) |

---

## Compliance Notes

### GDPR Considerations

- [ ] Data processing consent obtained
- [ ] Privacy policy published
- [ ] Data export capability available
- [ ] Account deletion removes all user data

### PCI DSS (Payment)

- [ ] No raw card numbers stored
- [ ] Payment handled by certified providers (Stripe/Razorpay)
- [ ] Secure HTTPS for all transactions

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2025 | Initial security checklist |
