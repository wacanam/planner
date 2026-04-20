# Territory Visits Investigation

## Current Symptom
Territory T-03 shows "No visits yet" even though visits exist in database.

## Root Cause Analysis

### Current Query Logic (BUGGY)
```typescript
// Line 40-46: Filters by userId only
const whereConditions = [];
if (!isAdmin) {
  whereConditions.push(eq(visits.userId, user.userId));
} else if (territory.publisherId) {
  whereConditions.push(eq(visits.userId, territory.publisherId));
}
```

**Problem:** 
- Service Overseer is not a Publisher (different role)
- Query filters by `territory.publisherId` but Service Overseer likely has no personal publisher link
- Completely ignores `territory_assignments` table relationship

### What SHOULD Happen

1. **Check what households are in this territory**
   ```sql
   SELECT householdId FROM territory_assignments WHERE territoryId = ?
   ```

2. **Get visits to those households**
   ```sql
   SELECT * FROM visits 
   WHERE householdId IN (SELECT householdId FROM territory_assignments WHERE territoryId = ?)
   ```

3. **Apply RBAC**
   - Admins: see all visits
   - Service Overseers (assigned to territory): see all visits
   - Publishers: see only their own visits

## Next Steps
1. Verify households ARE in territory_assignments table
2. Rewrite query to join through territory_assignments
3. Add proper Service Overseer territory assignment checks
4. Test with Vercel preview before merging
