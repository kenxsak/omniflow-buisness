#!/bin/bash

# OmniFlow Security Scan Script
# Run automated security checks for pre-MVP validation
# Usage: ./scripts/security-scan.sh
#
# SCOPE: This script performs static code analysis to detect:
# - Hardcoded secrets and API keys
# - Basic authentication patterns
# - Input validation usage
# - Firestore security rules configuration
# - XSS vulnerability patterns
# - Payment security patterns
#
# LIMITATIONS: This script does NOT:
# - Test runtime security behavior
# - Verify CORS configuration at runtime
# - Test actual rate limiting effectiveness
# - Perform penetration testing
#
# For comprehensive security testing, also:
# - Run npm audit for dependency vulnerabilities
# - Perform manual penetration testing
# - Use OWASP ZAP or similar tools for dynamic analysis

set -e

echo "=================================================="
echo "  OmniFlow Security Scan - Pre-MVP Validation"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

# Function to log results
log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++))
}

echo "1. Checking for hardcoded secrets..."
echo "-----------------------------------"

# Check for ACTUAL hardcoded API keys
# Only exclude lines that are clearly UI text (contain quotes around placeholder patterns)
# Actual keys would be in variable assignments, not quoted display text

# Stripe live keys (minimum 24 chars after prefix to be valid)
LIVE_STRIPE=$(grep -rn "sk_live_[a-zA-Z0-9]\{24,\}\|pk_live_[a-zA-Z0-9]\{24,\}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null) || true

# Razorpay live keys (minimum 14 chars after prefix)
LIVE_RAZORPAY=$(grep -rn "rzp_live_[a-zA-Z0-9]\{14,\}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null) || true

# Google API keys (exact pattern: AIzaSy followed by 33 alphanumeric chars)
GOOGLE_KEYS=$(grep -rn "AIzaSy[a-zA-Z0-9_-]\{33\}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null) || true

if [ -n "$LIVE_STRIPE" ] || [ -n "$LIVE_RAZORPAY" ] || [ -n "$GOOGLE_KEYS" ]; then
    log_fail "CRITICAL: Potential hardcoded production API keys found!"
    echo "Review these matches manually:"
    [ -n "$LIVE_STRIPE" ] && echo "$LIVE_STRIPE"
    [ -n "$LIVE_RAZORPAY" ] && echo "$LIVE_RAZORPAY"
    [ -n "$GOOGLE_KEYS" ] && echo "$GOOGLE_KEYS"
else
    log_pass "No hardcoded production API keys detected"
fi

# Check for test keys with full length (warning only)
TEST_KEYS=$(grep -rn "sk_test_[a-zA-Z0-9]\{24,\}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null) || true
if [ -n "$TEST_KEYS" ]; then
    log_warn "Potential test API keys found - review manually:"
    echo "$TEST_KEYS"
else
    log_pass "No test API keys hardcoded"
fi

if grep -rn "password\s*=\s*['\"][^'\"]" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "type\|interface\|placeholder\|label" | head -5; then
    log_warn "Possible hardcoded passwords found - review manually"
else
    log_pass "No obvious hardcoded passwords"
fi

# Note: Actual live key detection with minimum length is done above
# This redundant check was removed to avoid false positives from UI placeholder text

echo ""
echo "2. Checking environment configuration..."
echo "----------------------------------------"

# Check for .env files that shouldn't be committed
if [ -f ".env" ] && grep -q "SECRET\|KEY\|PASSWORD" .env 2>/dev/null; then
    if grep -q ".env" .gitignore 2>/dev/null; then
        log_pass ".env file is in .gitignore"
    else
        log_fail ".env file with secrets is NOT in .gitignore"
    fi
else
    log_pass "No .env file with secrets found"
fi

# Check for required environment variables documentation
if grep -rn "process.env\." src/ --include="*.ts" -o 2>/dev/null | sort -u | wc -l | xargs -I {} test {} -gt 10 && log_pass "Environment variables are used"; then
    :
fi

echo ""
echo "3. Checking authentication patterns..."
echo "--------------------------------------"

# Check for auth verification in server actions
AUTH_CHECKS=$(grep -rn "verifyAuthToken\|isAuthenticated\|checkAuth" src/app/actions/ 2>/dev/null | wc -l)
if [ "$AUTH_CHECKS" -gt 10 ]; then
    log_pass "Authentication checks found in server actions ($AUTH_CHECKS occurrences)"
else
    log_warn "Limited authentication checks in server actions ($AUTH_CHECKS occurrences)"
fi

# Check for role-based access
RBAC_CHECKS=$(grep -rn "role\s*===\|hasRole\|isAdmin\|isSuperAdmin\|isManagerOrAbove" src/ 2>/dev/null | wc -l)
if [ "$RBAC_CHECKS" -gt 20 ]; then
    log_pass "RBAC checks implemented ($RBAC_CHECKS occurrences)"
else
    log_warn "Review RBAC implementation ($RBAC_CHECKS occurrences)"
fi

echo ""
echo "4. Checking input validation..."
echo "-------------------------------"

# Check for Zod schema usage
ZOD_USAGE=$(grep -rn "z\.\|zod" src/ --include="*.ts" 2>/dev/null | wc -l)
if [ "$ZOD_USAGE" -gt 20 ]; then
    log_pass "Zod validation schemas in use ($ZOD_USAGE occurrences)"
else
    log_warn "Consider adding more input validation with Zod ($ZOD_USAGE occurrences)"
fi

# Check for SQL injection patterns (if any raw SQL)
if grep -rn "query\s*(" src/ --include="*.ts" 2>/dev/null | grep -v "querySnapshot\|useQuery\|queryClient" | head -5; then
    log_warn "Review raw query patterns for injection vulnerabilities"
else
    log_pass "No raw SQL query patterns detected"
fi

echo ""
echo "5. Checking rate limiting..."
echo "----------------------------"

if [ -f "src/lib/security/rate-limiter.ts" ]; then
    log_pass "Rate limiter module exists at src/lib/security/rate-limiter.ts"
else
    log_warn "Rate limiter module not found at expected location"
fi

RATE_LIMIT_USAGE=$(grep -rn "RateLimiter\|rateLimiter\|checkRateLimit" src/app/actions/ 2>/dev/null | wc -l)
if [ "$RATE_LIMIT_USAGE" -gt 0 ]; then
    log_pass "Rate limiting used in server actions ($RATE_LIMIT_USAGE usages)"
else
    log_warn "Rate limiting not found in server actions - verify implementation"
fi

echo ""
echo "6. Checking CORS configuration..."
echo "----------------------------------"

if grep -rn "Access-Control\|cors\|CORS" src/ middleware.ts next.config.ts 2>/dev/null | head -3; then
    log_pass "CORS-related configuration found (verify at runtime)"
else
    log_warn "No CORS configuration found - may need to add"
fi

if [ -f "middleware.ts" ]; then
    log_pass "Middleware file exists for request handling"
    # Check for origin validation in middleware
    if grep -q "origin\|Origin\|headers" middleware.ts 2>/dev/null; then
        log_pass "Middleware appears to handle headers/origin"
    fi
else
    log_warn "No middleware.ts found - request protection may be limited"
fi

echo ""
echo "7. Checking for sensitive data exposure..."
echo "------------------------------------------"

# Check for console.log with sensitive data
CONSOLE_LOGS=$(grep -rn "console.log" src/app/actions/ 2>/dev/null | wc -l)
if [ "$CONSOLE_LOGS" -gt 50 ]; then
    log_warn "High number of console.log statements ($CONSOLE_LOGS) - review for sensitive data"
else
    log_pass "Console logging appears controlled ($CONSOLE_LOGS occurrences)"
fi

# Check for password/token logging
if grep -rn "console.log.*password\|console.log.*token\|console.log.*secret" src/ 2>/dev/null; then
    log_fail "Potential sensitive data logging found"
else
    log_pass "No obvious sensitive data logging"
fi

echo ""
echo "8. Checking Firebase security rules..."
echo "--------------------------------------"

if [ -f "firestore.rules" ]; then
    # Check for overly permissive rules
    if grep -q "allow read, write: if true" firestore.rules; then
        log_fail "Overly permissive Firestore rules found"
    else
        log_pass "Firestore rules do not have open access"
    fi
    
    # Check for auth checks
    if grep -q "isAuthenticated()" firestore.rules; then
        log_pass "Authentication checks in Firestore rules"
    else
        log_warn "Review authentication in Firestore rules"
    fi
    
    # Check for companyId isolation
    if grep -q "companyId" firestore.rules; then
        log_pass "Multi-tenant isolation appears configured"
    else
        log_warn "Review multi-tenant data isolation"
    fi
else
    log_fail "firestore.rules file not found"
fi

echo ""
echo "9. Checking for XSS vulnerabilities..."
echo "---------------------------------------"

# Check for dangerouslySetInnerHTML
XSS_PATTERNS=$(grep -rn "dangerouslySetInnerHTML\|innerHTML" src/ --include="*.tsx" 2>/dev/null | wc -l)
if [ "$XSS_PATTERNS" -gt 5 ]; then
    log_warn "Multiple uses of dangerouslySetInnerHTML ($XSS_PATTERNS) - review for XSS"
else
    log_pass "Limited use of dangerouslySetInnerHTML ($XSS_PATTERNS occurrences)"
fi

echo ""
echo "10. Checking payment security..."
echo "---------------------------------"

# Check for secure payment handling
if grep -rn "stripe\|razorpay" src/ --include="*.ts" 2>/dev/null | grep -v "node_modules" | head -3; then
    log_pass "Payment integrations found"
fi

# Check for signature verification
if grep -rn "signature\|verifySignature\|hmac" src/ 2>/dev/null | head -3; then
    log_pass "Payment signature verification found"
else
    log_warn "Review payment signature verification"
fi

echo ""
echo "11. Checking for secure headers..."
echo "-----------------------------------"

if grep -rn "X-Frame-Options\|X-Content-Type-Options\|Strict-Transport-Security" src/ next.config.ts middleware.ts 2>/dev/null; then
    log_pass "Security headers configuration found"
else
    log_warn "Consider adding security headers"
fi

echo ""
echo "12. Checking for dependency vulnerabilities..."
echo "----------------------------------------------"

if command -v npm &> /dev/null; then
    echo "Running npm audit (summary)..."
    npm audit --audit-level=high 2>/dev/null && log_pass "No high severity vulnerabilities" || log_warn "Run 'npm audit' to review vulnerabilities"
else
    log_warn "npm not available for dependency check"
fi

echo ""
echo "=================================================="
echo "  SECURITY SCAN SUMMARY"
echo "=================================================="
echo -e "${GREEN}PASSED:${NC} $PASS_COUNT"
echo -e "${YELLOW}WARNINGS:${NC} $WARN_COUNT"
echo -e "${RED}FAILED:${NC} $FAIL_COUNT"
echo "=================================================="

if [ "$FAIL_COUNT" -gt 0 ]; then
    echo ""
    echo -e "${RED}ACTION REQUIRED: Please address failed checks before MVP launch${NC}"
    exit 1
elif [ "$WARN_COUNT" -gt 5 ]; then
    echo ""
    echo -e "${YELLOW}REVIEW RECOMMENDED: Multiple warnings need attention${NC}"
    exit 0
else
    echo ""
    echo -e "${GREEN}Security scan passed with acceptable results${NC}"
    exit 0
fi
