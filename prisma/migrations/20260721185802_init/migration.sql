-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveIngredient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActiveIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medication" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "form" TEXT,
    "presentation" TEXT,
    "publicPrice" DOUBLE PRECISION,
    "hospitalPrice" DOUBLE PRECISION,
    "manufacturerId" INTEGER,
    "categoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicationIngredient" (
    "id" SERIAL NOT NULL,
    "dosage" TEXT,
    "medicationId" INTEGER NOT NULL,
    "activeIngredientId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reimbursement" (
    "id" SERIAL NOT NULL,
    "reimbursementBase" DOUBLE PRECISION,
    "reimbursementRate" DOUBLE PRECISION,
    "referencePrice" DOUBLE PRECISION,
    "conditions" TEXT,
    "medicationId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportHistory" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "errorDetails" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE INDEX "Organization_code_idx" ON "Organization"("code");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE INDEX "Manufacturer_name_idx" ON "Manufacturer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ActiveIngredient_name_key" ON "ActiveIngredient"("name");

-- CreateIndex
CREATE INDEX "ActiveIngredient_name_idx" ON "ActiveIngredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Medication_code_key" ON "Medication"("code");

-- CreateIndex
CREATE INDEX "Medication_code_idx" ON "Medication"("code");

-- CreateIndex
CREATE INDEX "Medication_name_idx" ON "Medication"("name");

-- CreateIndex
CREATE INDEX "Medication_manufacturerId_idx" ON "Medication"("manufacturerId");

-- CreateIndex
CREATE INDEX "Medication_categoryId_idx" ON "Medication"("categoryId");

-- CreateIndex
CREATE INDEX "MedicationIngredient_medicationId_idx" ON "MedicationIngredient"("medicationId");

-- CreateIndex
CREATE INDEX "MedicationIngredient_activeIngredientId_idx" ON "MedicationIngredient"("activeIngredientId");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationIngredient_medicationId_activeIngredientId_key" ON "MedicationIngredient"("medicationId", "activeIngredientId");

-- CreateIndex
CREATE INDEX "Reimbursement_medicationId_idx" ON "Reimbursement"("medicationId");

-- CreateIndex
CREATE INDEX "Reimbursement_organizationId_idx" ON "Reimbursement"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Reimbursement_medicationId_organizationId_key" ON "Reimbursement"("medicationId", "organizationId");

-- CreateIndex
CREATE INDEX "ImportHistory_status_idx" ON "ImportHistory"("status");

-- CreateIndex
CREATE INDEX "ImportHistory_startedAt_idx" ON "ImportHistory"("startedAt");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationIngredient" ADD CONSTRAINT "MedicationIngredient_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicationIngredient" ADD CONSTRAINT "MedicationIngredient_activeIngredientId_fkey" FOREIGN KEY ("activeIngredientId") REFERENCES "ActiveIngredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "Medication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
