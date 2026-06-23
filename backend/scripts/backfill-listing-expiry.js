import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

async function main() {
  const rows = await prisma.property.findMany({
    where: { listingExpiresAt: null },
    select: { id: true, createdAt: true },
  });

  if (!rows.length) {
    console.log('No properties to backfill.');
    return;
  }

  console.log(`Backfilling listingExpiresAt for ${rows.length} properties...`);

  for (const row of rows) {
    const expiry = new Date(new Date(row.createdAt).getTime() + SIX_MONTHS_MS);
    await prisma.property.update({
      where: { id: row.id },
      data: { listingExpiresAt: expiry },
    });
  }

  console.log('Backfill complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
