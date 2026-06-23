import prisma from '../lib/prisma.js';

/**
 * Creates 20% / 30% / 50% installment rows for a fully executed sale deed (idempotent).
 */
export async function ensureSaleInstallmentsForDeed(documentId) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { property: true },
  });
  if (!doc || doc.type !== 'SALE_DEED' || doc.status !== 'FULLY_EXECUTED') return;
  if (!doc.buyerId || !doc.property) return;

  const existing = await prisma.saleInstallment.findFirst({ where: { documentId } });
  if (existing) return;

  const total = doc.property.price;
  const a1 = Math.round(total * 0.2);
  const a2 = Math.round(total * 0.3);
  const a3 = Math.round((total - a1 - a2) * 100) / 100;

  await prisma.saleInstallment.createMany({
    data: [
      {
        propertyId: doc.propertyId,
        buyerId: doc.buyerId,
        documentId,
        sequence: 1,
        label: 'Token / earnest money (20%)',
        amount: a1,
      },
      {
        propertyId: doc.propertyId,
        buyerId: doc.buyerId,
        documentId,
        sequence: 2,
        label: 'On possession (30%)',
        amount: a2,
      },
      {
        propertyId: doc.propertyId,
        buyerId: doc.buyerId,
        documentId,
        sequence: 3,
        label: 'Balance (50%)',
        amount: a3,
      },
    ],
  });
  // Property stays FOR_SALE until installments are fully paid (see processTransaction / lockPropertyForSale).
}
