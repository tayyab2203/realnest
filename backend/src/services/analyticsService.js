import prisma from '../lib/prisma.js';

/**
 * Aggregate seller-level KPIs for the analytics dashboard. Heavily relies on
 * Prisma's `_count` and groupBy aggregations to keep round-trips small —
 * roughly four DB queries regardless of how many listings a seller has.
 */
export const buildSellerAnalytics = async (sellerId) => {
  const now = new Date();

  // Pull the listings + their counts in one go so we can compute most-viewed
  // and per-status breakdowns without N+1 queries.
  const properties = await prisma.property.findMany({
    where: { sellerId },
    include: {
      _count: {
        select: { interactions: true, saved: true, transactions: true },
      },
      boosts: {
        where: { isActive: true, expiryDate: { gt: now } },
        orderBy: { startDate: 'desc' },
        take: 1,
      },
    },
  });

  const totalListings = properties.length;
  const activeListings = properties.filter(
    (p) => !['SOLD', 'PAUSED'].includes(p.status)
  ).length;
  const soldListings = properties.filter((p) => p.status === 'SOLD').length;
  const pausedListings = properties.filter((p) => p.status === 'PAUSED').length;
  const boostedListings = properties.filter((p) => p.boosts.length > 0).length;

  // Sum interaction counts across listings.
  const propertyIds = properties.map((p) => p.id);
  const [viewsAgg, savesAgg, inquiriesAgg] = propertyIds.length
    ? await Promise.all([
        prisma.userInteraction.count({
          where: { propertyId: { in: propertyIds }, interactionType: 'VIEW' },
        }),
        prisma.savedProperty.count({
          where: { propertyId: { in: propertyIds } },
        }),
        // We treat LIKE + SAVE + FAVORITE as buyer "inquiries" — basically
        // anything stronger than a passive view.
        prisma.userInteraction.count({
          where: {
            propertyId: { in: propertyIds },
            interactionType: { in: ['LIKE', 'SAVE', 'FAVORITE'] },
          },
        }),
      ])
    : [0, 0, 0];

  // Find the most viewed listing for the headline card.
  let mostViewed = null;
  if (propertyIds.length > 0) {
    const grouped = await prisma.userInteraction.groupBy({
      by: ['propertyId'],
      where: {
        propertyId: { in: propertyIds },
        interactionType: 'VIEW',
      },
      _count: { propertyId: true },
      orderBy: { _count: { propertyId: 'desc' } },
      take: 1,
    });
    if (grouped.length > 0) {
      const top = grouped[0];
      const property = properties.find((p) => p.id === top.propertyId);
      mostViewed = property
        ? {
            id: property.id,
            title: property.title,
            views: top._count.propertyId,
            city: property.city,
            price: property.price,
            image: property.images?.[0] || null,
          }
        : null;
    }
  }

  // Top 5 listings by interaction count for the "best performers" table.
  const byInteractions = [...properties]
    .map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      status: p.status,
      price: p.price,
      image: p.images?.[0] || null,
      views: p._count.interactions,
      saves: p._count.saved,
      sales: p._count.transactions,
      activeBoost: p.boosts[0] || null,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Sales revenue: platform completions + offline sales recorded by seller.
  const [platformSalesAgg, offlineSalesAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED', property: { sellerId } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.offlineTransaction.aggregate({
      where: { sellerId },
      _sum: { salePrice: true },
      _count: { _all: true },
    }),
  ]);

  const totalSales =
    platformSalesAgg._count._all + offlineSalesAgg._count._all;
  const salesRevenue =
    (platformSalesAgg._sum.amount || 0) + (offlineSalesAgg._sum.salePrice || 0);

  return {
    summary: {
      totalListings,
      activeListings,
      soldListings,
      pausedListings,
      boostedListings,
      propertyViews: viewsAgg,
      inquiries: inquiriesAgg,
      savedCount: savesAgg,
      totalSales,
      salesRevenue,
    },
    mostViewed,
    topListings: byInteractions,
  };
};
