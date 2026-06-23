import prisma from '../lib/prisma.js';

/**
 * Buyer who has committed to purchase (installment plan, executed deed, or in-progress sale).
 */
export async function getCommittedSaleBuyerId(propertyId) {
  const installment = await prisma.saleInstallment.findFirst({
    where: { propertyId },
    orderBy: { sequence: 'asc' },
    select: { buyerId: true },
  });
  if (installment) return installment.buyerId;

  const executedDeed = await prisma.document.findFirst({
    where: {
      propertyId,
      type: 'SALE_DEED',
      status: 'FULLY_EXECUTED',
      buyerId: { not: null },
    },
    orderBy: { generatedAt: 'desc' },
    select: { buyerId: true },
  });
  if (executedDeed?.buyerId) return executedDeed.buyerId;

  const activeDeed = await prisma.document.findFirst({
    where: {
      propertyId,
      type: 'SALE_DEED',
      status: { in: ['SELLER_SIGNED', 'FULLY_EXECUTED'] },
      buyerId: { not: null },
    },
    orderBy: { generatedAt: 'desc' },
    select: { buyerId: true },
  });
  if (activeDeed?.buyerId) return activeDeed.buyerId;

  const intent = await prisma.propertyPurchaseIntent.findFirst({
    where: {
      propertyId,
      document: { isNot: null },
    },
    orderBy: { updatedAt: 'desc' },
    select: { buyerId: true },
  });
  if (intent?.buyerId) return intent.buyerId;

  return null;
}

/** Mark listing sold so other buyers cannot start checkout. */
export async function lockPropertyForSale(propertyId) {
  await prisma.property.updateMany({
    where: { id: propertyId, status: { in: ['FOR_SALE'] } },
    data: { status: 'SOLD', soldAt: new Date() },
  });
}

/**
 * @returns {string|null} Error message if this buyer may not purchase.
 */
export async function assertBuyerCanPurchaseProperty(propertyId, buyerId) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { status: true, sellerId: true },
  });
  if (!property) return 'Property not found';
  if (property.status === 'PAUSED') return 'This listing is currently paused';
  if (property.sellerId === buyerId) return 'You cannot purchase your own listing';

  const committedBuyerId = await getCommittedSaleBuyerId(propertyId);

  if (property.status === 'SOLD') {
    if (!committedBuyerId || committedBuyerId !== buyerId) {
      return 'This property has been sold to another buyer.';
    }
    return null;
  }

  if (committedBuyerId && committedBuyerId !== buyerId) {
    return 'This property is already reserved for another buyer.';
  }

  return null;
}

export async function getSaleLockMetaForViewer(propertyId, viewerProfileId) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { status: true },
  });

  const committedBuyerId = await getCommittedSaleBuyerId(propertyId);
  const isCommittedBuyer = !!viewerProfileId && committedBuyerId === viewerProfileId;

  let canPurchase = !!viewerProfileId && (isCommittedBuyer || !committedBuyerId);
  if (property?.status === 'SOLD' && !isCommittedBuyer) {
    canPurchase = false;
  }

  return { committedBuyerId, isCommittedBuyer, canPurchase };
}
