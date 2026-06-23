import prisma from '../lib/prisma.js';
import {
  assertBuyerCanPurchaseProperty,
  lockPropertyForSale,
} from '../services/propertySaleLockService.js';

const VALID_PAYMENT_METHODS = ['JAZZCASH', 'EASYPAISA', 'CARD'];

/** Sale: executed sale deed. Rent: executed tenancy agreement. */
async function requireExecutedLegalDocumentForCheckout(property, buyerProfileId) {
  if (property.status === 'FOR_SALE') {
    const deed = await prisma.document.findFirst({
      where: {
        propertyId: property.id,
        buyerId: buyerProfileId,
        type: 'SALE_DEED',
        status: 'FULLY_EXECUTED',
      },
    });
    if (!deed) {
      return 'You must review and fully execute the sale deed for this property before payment. Ask the seller to generate the deed (with you as buyer), then complete signing from your purchase flow or Documents tab.';
    }
    return null;
  }
  if (property.status === 'FOR_RENT') {
    const agr = await prisma.document.findFirst({
      where: {
        propertyId: property.id,
        buyerId: buyerProfileId,
        type: 'RENT_AGREEMENT',
        status: 'FULLY_EXECUTED',
      },
    });
    if (!agr) {
      return 'You must review and fully execute the tenancy agreement before payment. Ask the landlord to generate the agreement (with you as tenant), then sign from your Documents tab.';
    }
    return null;
  }
  return null;
}

// POST /transactions/create
export const createTransaction = async (req, res) => {
  const { propertyId } = req.body;
  const userId = req.user.profile.id;

  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }

  if (req.user.profile.role !== 'BUYER') {
    return res.status(403).json({ error: 'Only buyers can purchase properties' });
  }

  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const purchaseBlock = await assertBuyerCanPurchaseProperty(propertyId, userId);
    if (purchaseBlock) {
      return res.status(400).json({ error: purchaseBlock });
    }

    if (property.status === 'PAUSED') {
      return res.status(400).json({ error: 'This listing is currently paused and cannot be purchased' });
    }

    if (property.sellerId === userId) {
      return res.status(400).json({ error: 'You cannot purchase your own property' });
    }

    if (property.status === 'FOR_SALE') {
      const inst = await prisma.saleInstallment.findFirst({
        where: { propertyId, buyerId: userId },
      });
      if (inst) {
        return res.status(400).json({
          error:
            'This property is paid in installments. Use the installment checkout on the payment page instead of creating a single full-price transaction.',
        });
      }
    }

    const deedErr = await requireExecutedLegalDocumentForCheckout(property, userId);
    if (deedErr) {
      return res.status(403).json({ error: deedErr });
    }

    // Reuse an existing pending transaction for the same buyer/property if any
    const existingPending = await prisma.transaction.findFirst({
      where: { userId, propertyId, status: 'PENDING' },
    });

    if (existingPending) {
      return res.status(200).json({ transaction: existingPending, transactionId: existingPending.id });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        propertyId,
        amount: property.price,
        status: 'PENDING',
      },
    });

    return res.status(201).json({ transaction, transactionId: transaction.id });
  } catch (err) {
    console.error('Create transaction error:', err);
    return res.status(500).json({ error: 'Failed to create transaction' });
  }
};

// POST /transactions/process
export const processTransaction = async (req, res) => {
  const { transactionId, paymentMethod } = req.body;
  const userId = req.user.profile.id;

  if (!transactionId || !paymentMethod) {
    return res.status(400).json({ error: 'transactionId and paymentMethod are required' });
  }

  const method = String(paymentMethod).toUpperCase();
  if (!VALID_PAYMENT_METHODS.includes(method)) {
    return res.status(400).json({ error: 'Invalid payment method' });
  }

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { property: true },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.userId !== userId) {
      return res.status(403).json({ error: 'You can only process your own transactions' });
    }

    if (transaction.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Transaction already completed' });
    }

    const installmentForTx = await prisma.saleInstallment.findFirst({
      where: { transactionId },
    });

    const purchaseBlock = await assertBuyerCanPurchaseProperty(
      transaction.propertyId,
      userId
    );
    if (purchaseBlock) {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED', paymentMethod: method },
      });
      return res.status(400).json({ error: purchaseBlock });
    }

    const deedErr = await requireExecutedLegalDocumentForCheckout(transaction.property, userId);
    if (deedErr) {
      return res.status(403).json({ error: deedErr });
    }

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'PROCESSING', paymentMethod: method },
    });

    // Simulate payment gateway delay (2.5 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    if (installmentForTx) {
      const [completed] = await prisma.$transaction([
        prisma.transaction.update({
          where: { id: transactionId },
          data: { status: 'COMPLETED' },
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            property: {
              include: {
                seller: { select: { id: true, name: true, email: true, phone: true } },
              },
            },
          },
        }),
        prisma.saleInstallment.update({
          where: { id: installmentForTx.id },
          data: { status: 'PAID', paidAt: new Date() },
        }),
      ]);

      const remaining = await prisma.saleInstallment.count({
        where: {
          propertyId: transaction.propertyId,
          buyerId: transaction.userId,
          status: 'PENDING',
        },
      });

      await lockPropertyForSale(transaction.propertyId);

      return res.json({ transaction: completed });
    }

    // Full single payment (e.g. rent): complete; mark sold only for purchases, not rentals
    const propertyUpdates =
      transaction.property.status === 'FOR_SALE'
        ? [
            prisma.property.update({
              where: { id: transaction.propertyId },
              data: { status: 'SOLD', soldAt: new Date() },
            }),
          ]
        : [];

    const [completed] = await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          property: {
            include: {
              seller: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
        },
      }),
      ...propertyUpdates,
    ]);

    return res.json({ transaction: completed });
  } catch (err) {
    console.error('Process transaction error:', err);
    try {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED' },
      });
    } catch (_) {
      // ignore rollback errors
    }
    return res.status(500).json({ error: 'Failed to process payment' });
  }
};

// GET /transactions/:id
export const getTransactionById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.profile.id;

  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        property: {
          include: {
            seller: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const isBuyer = transaction.userId === userId;
    const isSeller = transaction.property?.sellerId === userId;
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'You do not have access to this transaction' });
    }

    return res.json({ transaction });
  } catch (err) {
    console.error('Get transaction error:', err);
    return res.status(500).json({ error: 'Failed to fetch transaction' });
  }
};

// GET /transactions/mine  (buyer's transaction history)
export const getMyTransactions = async (req, res) => {
  const userId = req.user.profile.id;

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            seller: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ transactions });
  } catch (err) {
    console.error('Get my transactions error:', err);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

// GET /transactions/sales  (seller's completed platform + offline sales)
export const getMySales = async (req, res) => {
  const userId = req.user.profile.id;

  try {
    const [platformSales, offlineSales] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          status: 'COMPLETED',
          property: { sellerId: userId },
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          property: {
            select: {
              id: true,
              title: true,
              images: true,
              city: true,
              address: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.offlineTransaction.findMany({
        where: { sellerId: userId },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              images: true,
              city: true,
              address: true,
              price: true,
            },
          },
        },
        orderBy: { saleDate: 'desc' },
      }),
    ]);

    const sales = [
      ...platformSales.map((sale) => ({
        ...sale,
        source: 'platform',
        soldAt: sale.createdAt,
      })),
      ...offlineSales.map((sale) => ({
        id: sale.id,
        source: 'offline',
        amount: sale.salePrice,
        saleDate: sale.saleDate,
        soldAt: sale.saleDate,
        createdAt: sale.createdAt,
        transactionType: sale.transactionType,
        handoverStatus: sale.handoverStatus,
        notes: sale.notes,
        property: sale.property,
        user: sale.buyerName
          ? {
              id: null,
              name: sale.buyerName,
              email: null,
              phone: sale.buyerContact || null,
            }
          : null,
      })),
    ].sort(
      (a, b) =>
        new Date(b.soldAt || b.saleDate || b.createdAt).getTime() -
        new Date(a.soldAt || a.saleDate || a.createdAt).getTime()
    );

    return res.json({ sales });
  } catch (err) {
    console.error('Get my sales error:', err);
    return res.status(500).json({ error: 'Failed to fetch sales' });
  }
};
