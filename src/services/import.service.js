const prisma = require('../config/prisma');
const ExcelParserService = require('./excelParser.service');
const ValidationService = require('./validation.service');
const logger = require('../utils/logger');

class ImportService {
  async processExcelImport(filename, buffer) {
    // 1. Ensure MANUAL source exists for backwards compatibility
    const manualSource = await prisma.source.upsert({
      where: { code: 'MANUAL_IMPORT' },
      update: {},
      create: {
        code: 'MANUAL_IMPORT',
        name: 'Manual Excel Import',
        description: 'Legacy manual Excel upload'
      }
    });

    // 2. Create history record (SyncJob)
    let syncJob = await prisma.syncJob.create({
      data: {
        sourceId: manualSource.id,
        status: 'PENDING',
        errorDetails: `Filename: ${filename}`
      }
    });

    try {
      // 3. Parse Excel
      const rawRows = ExcelParserService.parseBuffer(buffer);
      
      let created = 0;
      let updated = 0;
      let ignored = 0;
      let valid = 0;
      let errorsCount = 0;
      const errorLog = [];

      // 4. Process Rows Sequentially
      for (let i = 0; i < rawRows.length; i++) {
        const rawRow = rawRows[i];
        const validation = ValidationService.validateMedicationRow(rawRow);
        
        if (!validation.isValid) {
          errorsCount++;
          errorLog.push({ row: i + 2, errors: validation.errors });
          continue;
        }
        valid++;

        const data = validation.data;
        
        try {
          // Transaction per row ensures data consistency
          await prisma.$transaction(async (tx) => {
            // Upsert Manufacturer
            const manufacturer = await tx.manufacturer.upsert({
              where: { name: data.manufacturer },
              update: {},
              create: { name: data.manufacturer }
            });

            // Upsert Category
            let categoryId = null;
            if (data.category) {
              const cat = await tx.category.upsert({
                where: { name: data.category },
                update: {},
                create: { name: data.category }
              });
              categoryId = cat.id;
            }

            // Check if Medication exists to determine if created or updated
            const existingMed = await tx.medication.findUnique({
              where: { code: data.code }
            });

            // Upsert Medication
            const medication = await tx.medication.upsert({
              where: { code: data.code },
              update: {
                name: data.name,
                form: data.form,
                presentation: data.presentation,
                manufacturerId: manufacturer.id,
                categoryId: categoryId,
                sourceId: manualSource.id
              },
              create: {
                code: data.code,
                name: data.name,
                form: data.form,
                presentation: data.presentation,
                manufacturerId: manufacturer.id,
                categoryId: categoryId,
                sourceId: manualSource.id
              }
            });

            if (existingMed) updated++;
            else created++;

            // Handle Prices
            if (data.publicPrice || data.hospitalPrice) {
              await tx.medicationPrice.create({
                data: {
                  medicationId: medication.id,
                  publicPrice: data.publicPrice,
                  hospitalPrice: data.hospitalPrice,
                  effectiveDate: new Date()
                }
              });
            }

            // Handle Active Ingredients
            if (data.activeIngredients.length > 0) {
              for (const ingName of data.activeIngredients) {
                const activeIngredient = await tx.activeIngredient.upsert({
                  where: { name: ingName },
                  update: {},
                  create: { name: ingName }
                });

                await tx.medicationIngredient.upsert({
                  where: {
                    medicationId_activeIngredientId: {
                      medicationId: medication.id,
                      activeIngredientId: activeIngredient.id
                    }
                  },
                  update: { dosage: data.dosage },
                  create: {
                    medicationId: medication.id,
                    activeIngredientId: activeIngredient.id,
                    dosage: data.dosage
                  }
                });
              }
            }

            // Handle Reimbursement
            if (data.reimbursement) {
              const r = data.reimbursement;
              const org = await tx.managingOrganization.upsert({
                where: { code: r.organization },
                update: { name: r.organization },
                create: { code: r.organization, name: r.organization }
              });

              await tx.reimbursement.upsert({
                where: {
                  medicationId_organizationId: {
                    medicationId: medication.id,
                    organizationId: org.id
                  }
                },
                update: {
                  reimbursementBase: r.basePrice,
                  reimbursementRate: r.rate,
                  referencePrice: r.referencePrice,
                  conditions: r.conditions
                },
                create: {
                  medicationId: medication.id,
                  organizationId: org.id,
                  reimbursementBase: r.basePrice,
                  reimbursementRate: r.rate,
                  referencePrice: r.referencePrice,
                  conditions: r.conditions
                }
              });
            }
          });
        } catch (dbError) {
          logger.error(`Error saving row ${i + 2}: ${dbError.message}`);
          errorsCount++;
          errorLog.push({ row: i + 2, errors: [dbError.message] });
        }
      }

      const finalStatus = errorsCount === 0 ? 'SYNC_SUCCESS' : (created + updated > 0 ? 'SYNC_PARTIAL' : 'SYNC_FAILED');

      syncJob = await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: finalStatus,
          recordsRead: rawRows.length,
          recordsValid: valid,
          recordsRejected: errorsCount,
          recordsCreated: created,
          recordsUpdated: updated,
          errorsCount,
          errorDetails: JSON.stringify({ filename, errors: errorLog }),
          completedAt: new Date()
        }
      });

      return {
        success: true,
        summary: {
          totalRows: rawRows.length,
          created,
          updated,
          ignored,
          errors: errorsCount
        },
        historyId: syncJob.id
      };

    } catch (error) {
      // Complete failure
      await prisma.syncJob.update({
        where: { id: syncJob.id },
        data: {
          status: 'SYNC_FAILED',
          errorDetails: error.message,
          completedAt: new Date()
        }
      });
      throw error;
    }
  }
}

module.exports = new ImportService();
