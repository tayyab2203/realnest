import prisma from '../lib/prisma.js';

// Each credit purchase ledger row is `amount` credits — we multiply by the
// PKR value of one credit (mirrors the frontend constant) to get revenue.
const PKR_PER_CREDIT = 1000;

// GET /api/admin/platform-revenue
// Aggregates revenue from both subscription purchases and credit (boost) sales.
export const getPlatformRevenue = async (_req, res) => {
  try {
    const [subscriptionAgg, creditAgg, subscriptionByPlan, recentSubs] = await Promise.all([
      prisma.subscriptionTransaction.aggregate({
        where: { paymentStatus: 'completed' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.creditTransaction.aggregate({
        where: { type: 'PURCHASE' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.subscriptionTransaction.groupBy({
        by: ['plan'],
        where: { paymentStatus: 'completed' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.subscriptionTransaction.findMany({
        where: { paymentStatus: 'completed' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { transactionDate: 'desc' },
        take: 10,
      }),
    ]);

    const subscriptionRevenue = subscriptionAgg._sum.amount || 0;
    // Credits purchased * PKR per credit = boost revenue earned by platform.
    const creditsSold = creditAgg._sum.amount || 0;
    const boostRevenue = creditsSold * PKR_PER_CREDIT;
    const totalRevenue = subscriptionRevenue + boostRevenue;

    return res.json({
      revenue: {
        totalRevenue,
        subscriptionRevenue,
        boostRevenue,
        creditsSold,
        subscriptionTransactionCount: subscriptionAgg._count._all,
        creditPurchaseCount: creditAgg._count._all,
      },
      subscriptionByPlan: subscriptionByPlan.map((row) => ({
        plan: row.plan,
        amount: row._sum.amount || 0,
        count: row._count._all,
      })),
      recentSubscriptions: recentSubs,
    });
  } catch (err) {
    console.error('Get platform revenue error:', err);
    return res.status(500).json({ error: 'Failed to fetch platform revenue' });
  }
};
