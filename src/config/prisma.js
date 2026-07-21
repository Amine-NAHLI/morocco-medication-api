const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

let poolClosed = false;
const disconnect = prisma.$disconnect.bind(prisma);
prisma.$disconnect = async () => {
  await disconnect();
  if (!poolClosed) {
    poolClosed = true;
    await pool.end();
  }
};

module.exports = prisma;
