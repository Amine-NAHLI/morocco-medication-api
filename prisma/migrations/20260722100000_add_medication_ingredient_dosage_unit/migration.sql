-- Store the dosage unit supplied by official sources alongside the ingredient dosage.
ALTER TABLE "MedicationIngredient" ADD COLUMN "dosageUnit" TEXT;

-- Reprocess a resource once when its importer gains a new normalization mapping.
ALTER TABLE "SourceResource" ADD COLUMN "normalizationVersion" INTEGER NOT NULL DEFAULT 1;
