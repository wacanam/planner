-- Finalize household, visit, and encounter schemas

-- ── Households ────────────────────────────────────────────────────────────────
-- No FK to congregation or territory (spatial membership via coordinates)

-- Drop old FK columns
ALTER TABLE "households" DROP COLUMN IF EXISTS "congregationId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "territoryId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "createdByUserId";
ALTER TABLE "households" DROP COLUMN IF EXISTS "updatedByUserId";

-- Add new columns
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "unitNumber" varchar(50);
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "country" varchar(100);
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "latitude" varchar(30);
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "longitude" varchar(30);
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "type" varchar(50) DEFAULT 'house';
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "floor" integer;
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "languages" text;
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "lastVisitOutcome" varchar(50);
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "createdById" uuid;
ALTER TABLE "households" ADD COLUMN IF NOT EXISTS "updatedById" uuid;

-- Fix status default: 'NEW' → 'new' (consistent lowercase)
ALTER TABLE "households" ALTER COLUMN "status" SET DEFAULT 'new';

-- Remove doNotDisturb boolean (covered by status = 'do_not_visit')
ALTER TABLE "households" DROP COLUMN IF EXISTS "doNotDisturb";

-- ── Visits ────────────────────────────────────────────────────────────────────

-- Add userId (publisher who logged the visit)
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "userId" uuid;

-- Add new fields
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "literatureLeft" text;
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "bibleTopicDiscussed" varchar(255);
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "nextVisitNotes" text;

-- Make assignmentId optional
ALTER TABLE "visits" ALTER COLUMN "assignmentId" DROP NOT NULL;

-- Fix syncStatus default
ALTER TABLE "visits" ALTER COLUMN "syncStatus" SET DEFAULT 'pending';

-- ── Encounters ────────────────────────────────────────────────────────────────

-- Add new fields to encounters (userId, ageGroup, role, bibleStudyInterest, etc.)
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "userId" uuid;
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "ageGroup" varchar(30);
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "role" varchar(50);
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "literatureAccepted" text;
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "bibleStudyInterest" boolean DEFAULT false;
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "returnVisitRequested" boolean DEFAULT false;
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "nextVisitNotes" text;
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "syncStatus" varchar(20) DEFAULT 'pending';
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "offlineCreated" boolean DEFAULT false;
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "syncedAt" timestamp;

-- response replaces 'type' on encounters
ALTER TABLE "encounters" ADD COLUMN IF NOT EXISTS "response" varchar(50);
