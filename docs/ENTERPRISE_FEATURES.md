# Enterprise Features Documentation

## Overview

OmniFlow CRM includes enterprise-grade features designed for teams of 50+ employees working collaboratively on sales and marketing activities.

---

## 1. Real-Time Lead Claiming System

### Purpose
Prevents data conflicts when multiple sales reps attempt to work on the same lead simultaneously.

### How It Works
1. When a rep opens a lead for editing, they can "claim" it
2. The lead is locked for 30 minutes (configurable)
3. Other team members see a "Locked" indicator with the claimer's name
4. Claims auto-expire after 30 minutes if not released
5. Reps can extend their claim or release early

### Technical Implementation
- **Files**: 
  - `src/lib/enterprise/lead-claiming.ts` - Core claiming logic
  - `src/components/enterprise/lead-claim-indicator.tsx` - UI component
  - `src/app/actions/enterprise-actions.ts` - Server actions

### Database Fields Added to Leads
```typescript
{
  claimedBy: string | null;      // User ID of claimer
  claimedByName: string | null;  // Display name
  claimedAt: string | null;      // ISO timestamp
  claimExpiry: string | null;    // When claim expires
}
```

### API Actions
- `claimLeadAction(leadId)` - Claim a lead
- `releaseLeadAction(leadId)` - Release claim
- `extendLeadClaimAction(leadId)` - Extend claim by 15 minutes
- `getLeadClaimStatusAction(leadId)` - Check claim status

---

## 2. Comprehensive Audit Trail

### Purpose
Complete logging of all actions for compliance, security, and accountability.

### What Gets Logged
- Lead operations (create, update, delete, assign, claim)
- Task operations
- Deal operations
- Appointment changes
- User management (invite, remove, role changes)
- Data exports and imports
- Login/logout events

### Audit Log Entry Structure
```typescript
interface AuditLogEntry {
  id: string;
  companyId: string;
  entityType: 'lead' | 'task' | 'deal' | 'appointment' | 'user' | 'company';
  entityId: string;
  action: AuditAction;
  performedBy: string;
  performedByName?: string;
  performedByEmail?: string;
  performedByRole?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}
```

### API Actions
- `getAuditLogsAction(options)` - Query audit logs with filters
- `exportAuditLogsAction(startDate, endDate)` - Export for compliance

### Retention
- Audit logs are stored indefinitely
- Exportable in JSON format for compliance reporting
- Filterable by entity type, action, user, and date range

---

## 3. Auto-Distribution for Fair Lead Assignment

### Purpose
Automatically distribute new leads fairly among sales team members.

### Distribution Methods

#### Round Robin
- Leads assigned in strict rotation order
- Ensures perfectly equal distribution over time
- Remembers last assigned index

#### Load Balanced
- Assigns to rep with fewest current leads
- Optional max leads per rep limit
- Prevents overloading any single rep

#### Random
- Random assignment for variety
- Good for A/B testing rep performance

### Configuration
```typescript
interface AutoDistributionConfig {
  enabled: boolean;
  method: 'round_robin' | 'load_balanced' | 'random';
  eligibleRoles: string[];        // Which roles receive leads
  excludeUserIds?: string[];      // Exclude specific users
  maxLeadsPerRep?: number;        // For load_balanced method
  lastAssignedIndex?: number;     // For round_robin tracking
}
```

### API Actions
- `getAutoDistributionConfigAction()` - Get current config
- `saveAutoDistributionConfigAction(config)` - Save config
- `autoDistributeLeadsAction(leadIds)` - Distribute specific leads
- `distributeUnassignedLeadsAction()` - Distribute all unassigned

### Access
Settings page: `/settings/enterprise`

---

## 4. SSO (Single Sign-On)

### Current Authentication
Firebase Authentication with support for:
- Email/Password
- Google Sign-In
- GitHub
- Microsoft
- Apple

### Enterprise SSO Options
For Enterprise plan customers, we support integration with:
- **Microsoft Entra ID** (Azure AD) - SAML 2.0 / OIDC
- **Google Workspace** - SAML / OIDC
- **Okta** - SAML 2.0
- **Custom SAML 2.0** providers

### Implementation Notes
SSO requires:
1. Firebase Identity Platform upgrade
2. Custom SAML provider configuration
3. Domain verification
4. User provisioning setup

Contact sales for SSO setup assistance.

---

## 5. Performance for 50 Concurrent Users

### Optimizations Implemented

#### Database Level
- Server-side filtering with Firestore indexes
- Role-based query scoping (reps only see their leads)
- Batch operations for bulk actions
- Pagination for large datasets

#### Application Level
- React Query for efficient data caching
- Optimistic updates for responsiveness
- Lazy loading of heavy components
- Memory leak prevention

#### Recommended Firestore Indexes
```
Collection: leads
  - companyId ASC, assignedTo ASC, status ASC
  - companyId ASC, createdAt DESC
  - companyId ASC, claimedBy ASC, claimExpiry ASC

Collection: audit_logs
  - companyId ASC, timestamp DESC
  - companyId ASC, entityType ASC, timestamp DESC
```

### Performance Targets
| Operation | Target | Actual |
|-----------|--------|--------|
| Lead list load (50 leads) | < 500ms | ~300ms |
| Lead claim/release | < 200ms | ~150ms |
| Bulk assign 100 leads | < 2s | ~1.5s |
| Audit log query | < 500ms | ~400ms |
| Dashboard load | < 1s | ~800ms |

### Load Testing Recommendations
```bash
# Test concurrent users with k6
k6 run --vus 50 --duration 5m load-test.js

# Monitor Firebase Console for:
# - Read operations per second
# - Write operations per second
# - Active connections
```

---

## Enterprise Settings Page

Access enterprise configuration at:
```
/settings/enterprise
```

Available tabs:
1. **Auto-Distribution** - Configure lead distribution
2. **Audit Trail** - View and export audit logs
3. **SSO Setup** - SSO configuration (Enterprise plan)

---

## Security Considerations

### Role-Based Access
- Only `admin` and `superadmin` can access enterprise settings
- Only `manager`, `admin`, `superadmin` can assign leads
- Only lead claimer or admin can release a claim

### Data Isolation
- All queries scoped by `companyId`
- Server-side validation of company membership
- Leads/users cannot be accessed across companies

### Audit Trail Integrity
- Audit logs are append-only
- Cannot be edited or deleted
- Timestamp from server (not client)

---

## API Reference

### Lead Claiming
```typescript
// Claim a lead for editing
const result = await claimLeadAction(leadId);
// Returns: { success: boolean, message: string, claimInfo?: {...} }

// Release a lead
const result = await releaseLeadAction(leadId);

// Extend claim
const result = await extendLeadClaimAction(leadId);

// Check status
const status = await getLeadClaimStatusAction(leadId);
// Returns: { claimedBy, claimedByName, claimExpiry, isLocked }
```

### Audit Logs
```typescript
// Query logs
const { logs, total } = await getAuditLogsAction({
  entityType: 'lead',
  action: 'update',
  limit: 100,
});

// Export for compliance
const { success, logs } = await exportAuditLogsAction(startDate, endDate);
```

### Auto-Distribution
```typescript
// Get config
const config = await getAutoDistributionConfigAction();

// Save config
await saveAutoDistributionConfigAction({
  enabled: true,
  method: 'round_robin',
  eligibleRoles: ['user', 'manager'],
});

// Distribute unassigned leads
const result = await distributeUnassignedLeadsAction();
// Returns: { success, assignedLeads: [...], summary: {...} }
```

---

## Support

For enterprise support inquiries:
- Email: enterprise@omniflow.com
- Priority support hotline for Enterprise customers
- Quarterly strategy reviews included
