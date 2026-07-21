/*
  Warnings:

  - You are about to drop the column `hospitalPrice` on the `Medication` table. All the data in the column will be lost.
  - You are about to drop the column `publicPrice` on the `Medication` table. All the data in the column will be lost.
  - You are about to drop the `ImportHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DataStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "Reimbursement" DROP CONSTRAINT "Reimbursement_organizationId_fkey";

-- AlterTable
ALTER TABLE "Medication" DROP COLUMN "hospitalPrice",
DROP COLUMN "publicPrice",
ADD COLUMN     "dosageUnit" TEXT,
ADD COLUMN     "isGeneric" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceId" INTEGER,
ADD COLUMN     "status" "DataStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Reimbursement" ADD COLUMN     "documentId" INTEGER,
ADD COLUMN     "regimeId" INTEGER,
ADD COLUMN     "status" "DataStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "ImportHistory";

-- DropTable
DROP TABLE "Organization";

-- CreateTable
CREATE TABLE "Source" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceResource" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "fileHash" TEXT,
    "publishedAt" TIMESTAMP(3),
    "sourceId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficialDocument" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "reference" TEXT,
    "url" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regime" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManagingOrganization" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagingOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationPrice" (
    "id" SERIAL NOT NULL,
    "publicPrice" DOUBLE PRECISION,
    "hospitalPrice" DOUBLE PRECISION,
    "effectiveDate" TIMESTAMP(3),
    "medicationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsValid" INTEGER NOT NULL DEFAULT 0,
    "recordsRejected" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsDuplicates" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" TEXT,
    "sourceId" INTEGER NOT NULL,
    "resourceId" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_name_key" ON "Source"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Source_code_key" ON "Source"("code");

-- CreateIndex
CREATE INDEX "Source_code_idx" ON "Source"("code");

-- CreateIndex
CREATE INDEX "SourceResource_sourceId_idx" ON "SourceResource"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficialDocument_reference_key" ON "OfficialDocument"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Regime_name_key" ON "Regime"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Regime_code_key" ON "Regime"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ManagingOrganization_code_key" ON "ManagingOrganization"("code");

-- CreateIndex
CREATE INDEX "ManagingOrganization_code_idx" ON "ManagingOrganization"("code");

-- CreateIndex
CREATE INDEX "ManagingOrganization_name_idx" ON "ManagingOrganization"("name");

-- CreateIndex
CREATE INDEX "MedicationPrice_medicationId_idx" ON "MedicationPrice"("medicationId");

-- CreateIndex
CREATE INDEX "SyncJob_status_idx" ON "SyncJob"("status");

-- CreateIndex
CREATE INDEX "SyncJob_sourceId_idx" ON "SyncJob"("sourceId");

-- CreateIndex
CREATE INDEX "SyncJob_startedAt_idx" ON "SyncJob"("startedAt");

-- CreateIndex
CREATE INDEX "Medication_sourceId_idx" ON "Medication"("sourceId");

-- CreateIndex
CREATE INDEX "Reimbursement_regimeId_idx" ON "Reimbursement"("regimeId");

-- AddForeignKey
ALTER TABLE "SourceResource" ADD CONSTRAINT "SourceResource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationPrice" ADD CONSTRAINT "MedicationPrice_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "ManagingOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES "Regime"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OfficialDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "SourceResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
