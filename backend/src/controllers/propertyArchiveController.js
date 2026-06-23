import prisma from '../lib/prisma.js';

async function resolveDeedDocumentUrl(propertyId, existingUrl) {
  if (existingUrl) return existingUrl;
  const deed = await prisma.document.findFirst({
    where: {
      propertyId,
      type: 'SALE_DEED',
      status: 'FULLY_EXECUTED',
      finalPdfUrl: { not: null },
    },
    orderBy: { executedAt: 'desc' },
    select: { finalPdfUrl: true },
  });
  return deed?.finalPdfUrl ?? null;
}

/** PATCH /api/properties/:id/archive */
export const archiveProperty = async (req, res) => {
  const { id } = req.params;
  const sellerId = req.user.profile.id;

  try {
    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (existing.sellerId !== sellerId) {
      return res.status(403).json({ error: 'You can only archive your own properties' });
    }
    if (existing.archiveStatus === 'ARCHIVED') {
      return res.status(400).json({ error: 'Property is already archived' });
    }

    const deedDocument = await resolveDeedDocumentUrl(id, existing.deedDocument);

    const property = await prisma.property.update({
      where: { id },
      data: {
        archiveStatus: 'ARCHIVED',
        archivedAt: new Date(),
        ...(deedDocument && !existing.deedDocument ? { deedDocument } : {}),
      },
      include: {
        seller: {
          select: {
            name: true,
            email: true,
            phone: true,
            subscriptionPlan: true,
            isVerified: true,
            companyName: true,
            companyLogo: true,
          },
        },
      },
    });

    return res.json({ property });
  } catch (err) {
    console.error('archiveProperty', err);
    return res.status(500).json({ error: 'Failed to archive property' });
  }
};

/** GET /api/seller/archived-properties */
export const getArchivedProperties = async (req, res) => {
  const sellerId = req.user.profile.id;

  try {
    const properties = await prisma.property.findMany({
      where: {
        sellerId,
        archiveStatus: 'ARCHIVED',
      },
      include: {
        documents: {
          where: { type: 'SALE_DEED', status: 'FULLY_EXECUTED' },
          orderBy: { executedAt: 'desc' },
          take: 1,
          select: { finalPdfUrl: true, executedAt: true },
        },
        transactions: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
      orderBy: { archivedAt: 'desc' },
    });

    const decorated = properties.map((p) => {
      const saleTx = p.transactions?.[0] ?? null;
      const deedDocument =
        p.deedDocument || p.documents?.[0]?.finalPdfUrl || null;
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        type: p.type,
        status: p.status,
        archiveStatus: p.archiveStatus,
        price: p.price,
        city: p.city,
        address: p.address,
        latitude: p.latitude,
        longitude: p.longitude,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        area: p.area,
        images: p.images,
        archivedAt: p.archivedAt,
        deedDocument,
        transaction: saleTx
          ? {
              id: saleTx.id,
              amount: saleTx.amount,
              paymentMethod: saleTx.paymentMethod,
              createdAt: saleTx.createdAt,
              buyer: saleTx.user,
            }
          : null,
      };
    });

    return res.json({ properties: decorated });
  } catch (err) {
    console.error('getArchivedProperties', err);
    return res.status(500).json({ error: 'Failed to fetch archived properties' });
  }
};
