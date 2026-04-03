ALTER TABLE "territories" ADD COLUMN IF NOT EXISTS "createdById" uuid REFERENCES "users"("id") ON DELETE SET NULL;
