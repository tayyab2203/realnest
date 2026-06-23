import prisma from '../lib/prisma.js';

/** GET /api/seller/sold-properties — seller's SOLD listings with sale details */
export const getSoldProperties = async (req, res) => {
  const sellerId = req.user.profile.id;

  try {
    const properties = await prisma.property.findMany({
      where: {
        sellerId,
        status: 'SOLD',
      },
      include: {
        offlineTransactions: {
          orderBy: { saleDate: 'desc' },
          take: 1,
        },
        transactions: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        documents: {
          where: { type: 'SALE_DEED', status: 'FULLY_EXECUTED' },
          orderBy: { executedAt: 'desc' },
          take: 1,
          select: { finalPdfUrl: true, executedAt: true },
        },
      },
      orderBy: [{ soldAt: 'desc' }, { updatedAt: 'desc' }],
    });

    const decorated = properties.map((p) => {
      const offline = p.offlineTransactions?.[0] ?? null;
      const platformTx = p.transactions?.[0] ?? null;
      const deedDocument =
        p.deedDocument || p.documents?.[0]?.finalPdfUrl || null;

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        type: p.type,
        status: p.status,
        price: p.price,
        city: p.city,
        address: p.address,
        images: p.images,
        soldAt: p.soldAt,
        deedDocument,
        offlineSale: offline
          ? {
              id: offline.id,
              saleDate: offline.saleDate,
              salePrice: offline.salePrice,
              buyerName: offline.buyerName,
              buyerContact: offline.buyerContact,
              transactionType: offline.transactionType,
              handoverStatus: offline.handoverStatus,
              notes: offline.notes,
            }
          : null,
        transaction: platformTx
          ? {
              id: platformTx.id,
              amount: platformTx.amount,
              paymentMethod: platformTx.paymentMethod,
              createdAt: platformTx.createdAt,
              buyer: platformTx.user,
            }
          : null,
      };
    });

    return res.json({ properties: decorated });
  } catch (err) {
    console.error('getSoldProperties', err);
    return res.status(500).json({ error: 'Failed to fetch sold properties' });
  }
};
