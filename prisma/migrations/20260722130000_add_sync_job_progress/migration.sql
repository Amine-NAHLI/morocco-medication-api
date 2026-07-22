-- Persist a durable, contiguous import checkpoint for resumable synchronizations.
ALTER TABLE "SyncJob" ADD COLUMN "recordsProcessed" INTEGER NOT NULL DEFAULT 0;
