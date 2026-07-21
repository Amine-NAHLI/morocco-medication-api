require('dotenv').config();
const prisma = require('../src/config/prisma');

async function cleanup() {
  console.log('Cleaning up existing data before schema migration...');
  try {
    // Delete data from tables that will be removed or drastically changed
    await prisma.importHistory.deleteMany();
    await prisma.reimbursement.deleteMany();
    await prisma.medicationIngredient.deleteMany();
    await prisma.medication.deleteMany();
    await prisma.activeIngredient.deleteMany();
    await prisma.category.deleteMany();
    await prisma.manufacturer.deleteMany();
    await prisma.organization.deleteMany();
    
    console.log('Successfully cleared old data. Ready for migration.');
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
