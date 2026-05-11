# Firebase Firestore Schema

The MVP now uses Firestore as the source of truth with web SDK offline persistence enabled. Data is intentionally stored in flat, congregation-scoped collections so the mobile client can subscribe directly, keep working offline, and let Firestore synchronize pending writes when connectivity returns.

## Collections

- `users/{userId}`: profile, role, active congregation, avatar metadata.
- `congregations/{congregationId}`: name, slug, city, country, status, owner metadata.
- `congregationMembers/{memberId}`: `congregationId`, `userId`, congregation role, status, join/review metadata.
- `groups/{groupId}`: `congregationId`, group name, member summaries.
- `territories/{territoryId}`: `congregationId`, number, name, notes, status, assigned publisher/group ids, boundary GeoJSON string, coverage counters.
- `territoryRequests/{requestId}`: `congregationId`, publisher, optional territory, status, message, review metadata.
- `assignments/{assignmentId}`: `territoryId`, assignee user/group, status, assigned/due/returned dates, coverage snapshot.
- `households/{householdId}`: `congregationId`, `territoryId`, address, coordinates, status, visit summary, notes.
- `visits/{visitId}`: `householdId`, optional `assignmentId`, publisher, outcome, visit notes, return-visit fields.
- `encounters/{encounterId}`: optional `visitId` and `householdId`, publisher, response, demographic/context notes.

## Offline Behavior

The Firebase client initializes Firestore with `persistentLocalCache` and a multiple-tab manager. Screens subscribe with `onSnapshot` and let Firestore handle local cache reads, queued writes, and background synchronization automatically. The UI shows a small global offline banner but allows normal reads, writes, visit logging, household pinning, and territory edits while disconnected.
