CREATE TABLE "congregation_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"congregationId" uuid NOT NULL,
	"congregationRole" varchar(50),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"joinMessage" text,
	"reviewedBy" uuid,
	"reviewedAt" timestamp,
	"reviewNote" text,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "congregation_members_userId_congregationId_unique" UNIQUE("userId","congregationId")
);
--> statement-breakpoint
CREATE TABLE "congregations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"city" varchar(255),
	"country" varchar(100),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"createdById" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "congregations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitId" uuid,
	"householdId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"personSpoken" varchar(255),
	"date" timestamp DEFAULT now() NOT NULL,
	"duration" integer,
	"followUp" boolean DEFAULT false NOT NULL,
	"followUpDate" timestamp,
	"followUpNotes" text,
	"syncedAt" timestamp,
	"offlineCreated" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"groupId" uuid NOT NULL,
	"groupRole" varchar(50) DEFAULT 'member' NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_userId_groupId_unique" UNIQUE("userId","groupId")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"congregationId" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"congregationId" uuid NOT NULL,
	"territoryId" uuid NOT NULL,
	"address" varchar(255) NOT NULL,
	"houseNumber" varchar(50),
	"streetName" varchar(255) NOT NULL,
	"city" varchar(255) NOT NULL,
	"postalCode" varchar(20),
	"location" text,
	"occupantsCount" integer,
	"ageRange" varchar(100),
	"specialNeeds" text,
	"status" varchar(50) DEFAULT 'NEW' NOT NULL,
	"lastVisitDate" timestamp,
	"lastVisitNotes" text,
	"languagePreference" varchar(50),
	"doNotDisturb" boolean DEFAULT false NOT NULL,
	"bestTimeToCall" varchar(100),
	"notes" text,
	"lwpNotes" text,
	"createdByUserId" uuid,
	"updatedByUserId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"data" text,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_sync_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"entityType" varchar(50) NOT NULL,
	"entityId" uuid NOT NULL,
	"operation" varchar(50) NOT NULL,
	"data" jsonb NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"syncedAt" timestamp,
	"error" text,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"congregationId" uuid NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "territories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"notes" text,
	"status" varchar(50) DEFAULT 'available' NOT NULL,
	"householdsCount" integer DEFAULT 0 NOT NULL,
	"coveragePercent" numeric(5, 2) DEFAULT '0' NOT NULL,
	"boundary" text,
	"congregationId" uuid NOT NULL,
	"publisherId" uuid,
	"groupId" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "territory_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"territoryId" uuid NOT NULL,
	"userId" uuid,
	"serviceGroupId" uuid,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"assignedAt" timestamp,
	"dueAt" timestamp,
	"returnedAt" timestamp,
	"coverageAtAssignment" numeric(5, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "territory_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"congregationId" uuid NOT NULL,
	"publisherId" uuid NOT NULL,
	"territoryId" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"approvedBy" uuid,
	"approvedAt" timestamp,
	"requestedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "territory_rotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"territoryId" uuid NOT NULL,
	"assignedUserId" uuid,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"startDate" timestamp NOT NULL,
	"completedDate" timestamp,
	"coverageAchieved" numeric(5, 2) DEFAULT '0' NOT NULL,
	"visitsMade" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'USER' NOT NULL,
	"congregationId" uuid,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastLoginAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"householdId" uuid NOT NULL,
	"assignmentId" uuid NOT NULL,
	"householdStatusBefore" varchar(50),
	"householdStatusAfter" varchar(50),
	"visitDate" timestamp DEFAULT now() NOT NULL,
	"duration" integer,
	"outcome" varchar(50),
	"returnVisitPlanned" boolean DEFAULT false NOT NULL,
	"nextVisitDate" timestamp,
	"notes" text,
	"syncedAt" timestamp,
	"syncStatus" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"offlineCreated" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
