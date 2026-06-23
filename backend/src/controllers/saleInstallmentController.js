import prisma from '../lib/prisma.js';
import { assertBuyerCanPurchaseProperty } from '../services/propertySaleLockService.js';
import { ensureSaleInstallmentsForDeed } from '../services/saleInstallmentService.js';

/** GET /api/sale-installments/property/:propertyId */
export const listInstallmentsForProperty = async (req, res) => {
  if (req.user.profile.role !== 'BUYER') {
    return res.status(403).json({ error: 'Only buyers can view installments' });
  }
  const { propertyId } = req.params;
  const buyerId = req.user.profile.id;

  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    if (property.status !== 'FOR_SALE' && property.status !== 'SOLD') {
      return res.json({ installments: [], totalPrice: property.price });
    }

    const purchaseBlock = await assertBuyerCanPurchaseProperty(propertyId, buyerId);
    if (purchaseBlock) {
      return res.status(403).json({ error: purchaseBlock });
    }

    let installments = await prisma.saleInstallment.findMany({
      where: { propertyId, buyerId },
      orderBy: { sequence: 'asc' },
    });

    if (installments.length === 0) {
      const executedDeed = await prisma.document.findFirst({
        where: {
          propertyId,
          buyerId,
          type: 'SALE_DEED',
          status: 'FULLY_EXECUTED',
        },
        orderBy: { executedAt: 'desc' },
      });
      if (executedDeed) {
        await ensureSaleInstallmentsForDeed(executedDeed.id);
        installments = await prisma.saleInstallment.findMany({
          where: { propertyId, buyerId },
          orderBy: { sequence: 'asc' },
        });
      }
    }

    return res.json({
      installments,
      totalPrice: property.price,
      propertyStatus: property.status,
    });
  } catch (err) {
    console.error('listInstallmentsForProperty', err);
    return res.status(500).json({ error: 'Failed to load installments' });
  }
};

/** POST /api/sale-installments/:installmentId/start-payment — creates pending transaction for that installment amount. */
export const startInstallmentPayment = async (req, res) => {
  if (req.user.profile.role !== 'BUYER') {
    return res.status(403).json({ error: 'Only buyers can pay installments' });
  }
  const { installmentId } = req.params;
  const buyerId = req.user.profile.id;

  try {
    const inst = await prisma.saleInstallment.findUnique({
      where: { id: installmentId },
      include: { property: true, document: true },
    });
    if (!inst) return res.status(404).json({ error: 'Installment not found' });
    if (inst.buyerId !== buyerId) return res.status(403).json({ error: 'Forbidden' });
    if (inst.status === 'PAID') {
      return res.status(400).json({ error: 'This installment is already paid' });
    }

    const purchaseBlock = await assertBuyerCanPurchaseProperty(inst.propertyId, buyerId);
    if (purchaseBlock) {
      return res.status(400).json({ error: purchaseBlock });
    }

    const priorPending = await prisma.saleInstallment.findFirst({
      where: {
        propertyId: inst.propertyId,
        buyerId,
        sequence: { lt: inst.sequence },
        status: 'PENDING',
      },
    });
    if (priorPending) {
      return res.status(400).json({ error: 'Pay earlier installments in order first' });
    }

    if (inst.transactionId) {
      const existing = await prisma.transaction.findUnique({ where: { id: inst.transactionId } });
      if (existing && existing.status === 'PENDING') {
        return res.json({ transactionId: existing.id, amount: existing.amount });
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const t = await tx.transaction.create({
        data: {
          userId: buyerId,
          propertyId: inst.propertyId,
          amount: inst.amount,
          status: 'PENDING',
        },
      });
      await tx.saleInstallment.update({
        where: { id: inst.id },
        data: { transactionId: t.id },
      });
      return t;
    });

    return res.status(201).json({ transactionId: transaction.id, amount: transaction.amount });
  } catch (err) {
    console.error('startInstallmentPayment', err);
    return res.status(500).json({ error: 'Could not start payment' });
  }
};
