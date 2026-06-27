UPDATE "Quote"
SET "code" = LPAD(COALESCE("sequence", 1)::text, 6, '0')
WHERE "code" IS NULL OR "code" LIKE 'OS-%' OR "code" LIKE 'WO-%';

UPDATE "WorkOrder"
SET "code" = LPAD(COALESCE("sequence", 1)::text, 6, '0')
WHERE "code" IS NULL OR "code" LIKE 'OS-%' OR "code" LIKE 'WO-%';
