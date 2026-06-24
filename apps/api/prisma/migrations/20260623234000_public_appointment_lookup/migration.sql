-- Public appointment lookup support.
-- Adds a safe public protocol so the frontend never needs to expose internal appointment IDs.
ALTER TABLE "Appointment" ADD COLUMN "publicCode" TEXT;

UPDATE "Appointment"
SET "publicCode" = 'LEGACY-' || SUBSTRING("id" FROM 1 FOR 8)
WHERE "publicCode" IS NULL;

ALTER TABLE "Appointment" ALTER COLUMN "publicCode" SET NOT NULL;

CREATE UNIQUE INDEX "Appointment_publicCode_key" ON "Appointment"("publicCode");
CREATE INDEX "Appointment_companyId_publicCode_idx" ON "Appointment"("companyId", "publicCode");
