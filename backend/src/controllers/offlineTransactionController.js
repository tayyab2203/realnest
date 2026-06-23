import prisma from '../lib/prisma.js';

const VALID_TRANSACTION_TYPES = ['CASH', 'BANK_TRANSFER', 'INSTALLMENTS', 'OTHER'];
const VALID_HANDOVER_STATUSES = ['COMPLETED', 'PENDING'];

/** POST /api/transactions/offline-sale */
export const recordOfflineSale = async (req, res) => {
  const sellerId = req.user.profile.id;
  const {
    propertyId,
    saleDate,
    salePrice,
    buyerName,
    buyerContact,
    transactionType,
    handoverStatus,
    notes,
  } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }
  if (!saleDate) {
    return res.status(400).json({ error: 'saleDate is required' });
  }
  if (!transactionType) {
    return res.status(400).json({ error: 'transactionType is required' });
  }
  if (!handoverStatus) {
    return res.status(400).json({ error: 'handoverStatus is required' });
  }

  const parsedSaleDate = new Date(saleDate);
  if (Number.isNaN(parsedSaleDate.getTime())) {
    return res.status(400).json({ error: 'saleDate must be a valid date' });
  }

  const price = parseFloat(salePrice);
  if (!Number.isFinite(price) || price <= 0) {
    return res.status(400).json({ error: 'salePrice must be greater than 0' });
  }

  const txType = String(transactionType).toUpperCase();
  if (!VALID_TRANSACTION_TYPES.includes(txType)) {
    return res.status(400).json({
      error: `transactionType must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`,
    });
  }

  const handover = String(handoverStatus).toUpperCase();
  if (!VALID_HANDOVER_STATUSES.includes(handover)) {
    return res.status(400).json({
      error: `handoverStatus must be one of: ${VALID_HANDOVER_STATUSES.join(', ')}`,
    });
  }

  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (property.sellerId !== sellerId) {
      return res.status(403).json({ error: 'You can only record offline sales for your own properties' });
    }
    if (property.status === 'SOLD') {
      return res.status(400).json({ error: 'Property is already marked as sold' });
    }
    if (property.status !== 'FOR_SALE') {
      return res.status(400).json({
        error: 'Only properties listed for sale can be marked as sold offline',
      });
    }

    const existingOffline = await prisma.offlineTransaction.findUnique({
      where: { propertyId },
    });
    if (existingOffline) {
      return res.status(400).json({ error: 'An offline sale has already been recorded for this property' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const offlineTransaction = await tx.offlineTransaction.create({
        data: {
          propertyId,
          sellerId,
          saleDate: parsedSaleDate,
          salePrice: price,
          buyerName: buyerName?.trim() || null,
          buyerContact: buyerContact?.trim() || null,
          transactionType: txType,
          handoverStatus: handover,
          notes: notes?.trim() || null,
        },
      });

      const updatedProperty = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: 'SOLD',
          soldAt: parsedSaleDate,
        },
      });

      await tx.propertyBoost.updateMany({
        where: { propertyId, isActive: true },
        data: { isActive: false },
      });

      return { offlineTransaction, property: updatedProperty };
    });

    return res.status(201).json({
      success: true,
      offlineTransaction: result.offlineTransaction,
      property: result.property,
    });
  } catch (err) {
    console.error('recordOfflineSale error:', err);
    return res.status(500).json({ error: 'Failed to record offline sale' });
  }
};
