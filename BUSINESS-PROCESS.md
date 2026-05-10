# Business Process

## Core Workflows

- Territory servants open My Assignments, view assigned territories, inspect households, and log visits or encounters from the local Firestore cache.
- Service overseers create territories, manage boundaries, assign or return territories, and review territory requests.
- Records screens read household, visit, and encounter history from Firestore snapshots.
- Membership, group, report, notification, and onboarding support screens now use Firestore-backed hooks instead of resource API endpoints.

## Offline-First Behavior

- Firestore persistent local cache keeps subscribed data available on the device.
- Writes are accepted while offline and are marked as pending by Firestore metadata until synchronized.
- The app shows a small top offline banner while preserving normal operation.
- No manual service-worker sync queue is required for MVP records, assignments, territories, households, visits, or encounters.

## Data Ownership

- Congregation-scoped documents carry `congregationId` for filtering and access control.
- Assignment documents connect territories to publishers or groups.
- Household, visit, and encounter documents preserve the existing ministry record workflow while using Firestore IDs and timestamps.
