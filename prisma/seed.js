/**
 * Prisma Seeder Script
 * 
 * Business data (Medications, Organizations, Prices) is explicitly NOT seeded
 * because the application uses the official CNOPS OpenData automated synchronisation
 * strategy (`/api/v1/sync/*`).
 * 
 * Run `npm run test` or utilize the Sync APIs to populate the database.
 */

async function main() {
  console.log('No business data to seed. Database relies on official CNOPS sync.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
