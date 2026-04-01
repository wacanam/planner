-- Reset territories that are marked as "assigned" but have no assignee
-- (publisherId IS NULL AND groupId IS NULL). These are orphaned records
-- caused by the assignment INSERT failing after the status UPDATE had
-- already committed. They are technically not assigned.
UPDATE territories
SET status = 'available',
    "publisherId" = NULL,
    "groupId" = NULL,
    "updatedAt" = now()
WHERE status = 'assigned'
  AND "publisherId" IS NULL
  AND "groupId" IS NULL;
