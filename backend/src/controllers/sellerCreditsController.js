import prisma from '../lib/prisma.js';

export const BOOST_COSTS = {
  HOT: 1,
  PREMIUM: 2,
  PLATINUM: 3,
};

const VERIFICATION_COST = 10;
const BOOST_DURATION_DAYS = 30;

const ensureSellerOwnership = (req, bodySellerId) => {
  const authSellerId = req.user.profile.id;
  if (bodySellerId && bodySellerId !== authSellerId) {
    const err = new Error('You can only act on your own seller account');
    err.status = 403;
    throw err;
  }
  return authSellerId;
};

// POST /api/seller/credits/purchase
export const purchaseCredits = async (req, res) => {
  const { sellerId: bodySellerId, creditsAmount, transactionId } = req.body;

  const credits = parseInt(creditsAmount, 10);
  if (!Number.isFinite(credits) || credits < 1) {
    return res.status(400).json({ error: 'creditsAmount must be a positive integer' });
  }

  if (!transactionId || typeof transactionId !== 'string') {
    return res.status(400).json({ error: 'transactionId is required' });
  }

  let sellerId;
  try {
    sellerId = ensureSellerOwnership(req, bodySellerId);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  try {
    const existing = await prisma.creditTransaction.findUnique({
      where: { externalTransactionId: transactionId },
      include: {
        seller: {
          select: { id: true, credits: true, verifiedBadge: true },
        },
      },
    });

    if (existing) {
      if (existing.sellerId !== sellerId) {
        return res.status(403).json({ error: 'This transaction belongs to a different seller' });
      }

      return res.status(200).json({
        message: 'Transaction already recorded',
        balance: existing.seller.credits,
        verifiedBadge: existing.seller.verifiedBadge,
        transaction: existing,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.update({
        where: { id: sellerId },
        data: { credits: { increment: credits } },
        select: { id: true, credits: true, verifiedBadge: true },
      });

      const ledger = await tx.creditTransaction.create({
        data: {
          sellerId,
          type: 'PURCHASE',
          amount: credits,
          description: `Purchased ${credits} credit${credits === 1 ? '' : 's'} (mock txn ${transactionId})`,
          externalTransactionId: transactionId,
        },
      });

      return { profile, ledger };
    });

    return res.status(201).json({
      message: 'Credits added',
      balance: result.profile.credits,
      verifiedBadge: result.profile.verifiedBadge,
      transaction: result.ledger,
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const duplicate = await prisma.creditTransaction.findUnique({
        where: { externalTransactionId: transactionId },
        include: {
          seller: { select: { credits: true, verifiedBadge: true } },
        },
      });

      if (duplicate) {
        return res.status(200).json({
          message: 'Transaction already recorded',
          balance: duplicate.seller.credits,
          verifiedBadge: duplicate.seller.verifiedBadge,
          transaction: duplicate,
        });
      }
    }

    console.error('Purchase credits error:', err);
    return res.status(500).json({ error: 'Failed to add credits' });
  }
};

// GET /api/seller/credits/balance
export const getCreditsBalance = async (req, res) => {
  const sellerId = req.user.profile.id;

  try {
    const [profile, history] = await Promise.all([
      prisma.profile.findUnique({
        where: { id: sellerId },
        select: { id: true, credits: true, verifiedBadge: true },
      }),
      prisma.creditTransaction.findMany({
        where: { sellerId },
        orderBy: { createdAt: 'desc' },
        include: {
          property: {
            select: { id: true, title: true, status: true },
          },
        },
      }),
    ]);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const totals = history.reduce(
      (acc, t) => {
        if (t.type === 'PURCHASE') acc.totalPurchased += t.amount;
        else if (t.type === 'SPENT') acc.totalSpent += t.amount;
        return acc;
      },
      { totalPurchased: 0, totalSpent: 0 }
    );

    return res.json({
      balance: profile.credits,
      verifiedBadge: profile.verifiedBadge,
      history,
      totals: {
        ...totals,
        currentBalance: profile.credits,
      },
    });
  } catch (err) {
    console.error('Get credits balance error:', err);
    return res.status(500).json({ error: 'Failed to fetch credit balance' });
  }
};

// POST /api/seller/credits/spend
export const spendCredits = async (req, res) => {
  const { sellerId: bodySellerId, amount, description, propertyId } = req.body;

  const credits = parseInt(amount, 10);
  if (!Number.isFinite(credits) || credits < 1) {
    return res.status(400).json({ error: 'amount must be a positive integer' });
  }
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'description is required' });
  }

  let sellerId;
  try {
    sellerId = ensureSellerOwnership(req, bodySellerId);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({
        where: { id: sellerId },
        select: { credits: true },
      });

      if (!profile) {
        const e = new Error('Profile not found');
        e.code = 'NOT_FOUND';
        throw e;
      }

      if (profile.credits < credits) {
        const e = new Error('Insufficient credits');
        e.code = 'INSUFFICIENT_CREDITS';
        throw e;
      }

      const updated = await tx.profile.update({
        where: { id: sellerId },
        data: { credits: { decrement: credits } },
        select: { id: true, credits: true },
      });

      const ledger = await tx.creditTransaction.create({
        data: {
          sellerId,
          type: 'SPENT',
          amount: credits,
          description,
          propertyId: propertyId || null,
        },
      });

      return { profile: updated, ledger };
    });

    return res.json({
      message: 'Credits deducted',
      balance: result.profile.credits,
      transaction: result.ledger,
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    if (err.code === 'INSUFFICIENT_CREDITS') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Spend credits error:', err);
    return res.status(500).json({ error: 'Failed to spend credits' });
  }
};

// POST /api/seller/listings/boost
export const boostListing = async (req, res) => {
  const { sellerId: bodySellerId, propertyId, boostType } = req.body;

  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }
  const normalizedBoost = String(boostType || '').toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(BOOST_COSTS, normalizedBoost)) {
    return res.status(400).json({ error: 'boostType must be HOT, PREMIUM, or PLATINUM' });
  }

  let sellerId;
  try {
    sellerId = ensureSellerOwnership(req, bodySellerId);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const cost = BOOST_COSTS[normalizedBoost];

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, sellerId: true, title: true },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (property.sellerId !== sellerId) {
      return res.status(403).json({ error: 'You can only boost your own properties' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({
        where: { id: sellerId },
        select: { credits: true },
      });

      if (!profile) {
        const e = new Error('Profile not found');
        e.code = 'NOT_FOUND';
        throw e;
      }
      if (profile.credits < cost) {
        const e = new Error(
          `You need ${cost} credit${cost === 1 ? '' : 's'} to apply ${normalizedBoost} boost. Current balance: ${profile.credits}`
        );
        e.code = 'INSUFFICIENT_CREDITS';
        throw e;
      }

      // Deactivate existing active boosts for this property
      await tx.propertyBoost.updateMany({
        where: { propertyId, isActive: true },
        data: { isActive: false },
      });

      const startDate = new Date();
      const expiryDate = new Date(startDate.getTime() + BOOST_DURATION_DAYS * 24 * 60 * 60 * 1000);

      const boost = await tx.propertyBoost.create({
        data: {
          propertyId,
          sellerId,
          boostType: normalizedBoost,
          startDate,
          expiryDate,
          isActive: true,
        },
      });

      const updatedProfile = await tx.profile.update({
        where: { id: sellerId },
        data: { credits: { decrement: cost } },
        select: { id: true, credits: true },
      });

      const ledger = await tx.creditTransaction.create({
        data: {
          sellerId,
          type: 'SPENT',
          amount: cost,
          description: `${normalizedBoost} boost on "${property.title}" (30 days)`,
          propertyId,
        },
      });

      return { boost, profile: updatedProfile, ledger };
    });

    return res.status(201).json({
      message: 'Boost applied',
      balance: result.profile.credits,
      boost: result.boost,
      transaction: result.ledger,
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    if (err.code === 'INSUFFICIENT_CREDITS') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Boost listing error:', err);
    return res.status(500).json({ error: 'Failed to apply boost' });
  }
};

// POST /api/seller/profile/verify
export const verifyProfile = async (req, res) => {
  const sellerId = req.user.profile.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({
        where: { id: sellerId },
        select: { credits: true, verifiedBadge: true },
      });

      if (!profile) {
        const e = new Error('Profile not found');
        e.code = 'NOT_FOUND';
        throw e;
      }
      if (profile.verifiedBadge) {
        return { profile, ledger: null, alreadyVerified: true };
      }
      if (profile.credits < VERIFICATION_COST) {
        const e = new Error(
          `Verification requires ${VERIFICATION_COST} credits. Current balance: ${profile.credits}`
        );
        e.code = 'INSUFFICIENT_CREDITS';
        throw e;
      }

      const updated = await tx.profile.update({
        where: { id: sellerId },
        data: {
          credits: { decrement: VERIFICATION_COST },
          verifiedBadge: true,
        },
        select: { id: true, credits: true, verifiedBadge: true },
      });

      const ledger = await tx.creditTransaction.create({
        data: {
          sellerId,
          type: 'SPENT',
          amount: VERIFICATION_COST,
          description: 'Profile verification badge',
        },
      });

      return { profile: updated, ledger, alreadyVerified: false };
    });

    if (result.alreadyVerified) {
      return res.status(200).json({
        message: 'Already verified',
        balance: result.profile.credits,
        verifiedBadge: true,
      });
    }

    return res.status(201).json({
      message: 'Profile verified',
      balance: result.profile.credits,
      verifiedBadge: result.profile.verifiedBadge,
      transaction: result.ledger,
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    if (err.code === 'INSUFFICIENT_CREDITS') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Verify profile error:', err);
    return res.status(500).json({ error: 'Failed to verify profile' });
  }
};

// PATCH /api/seller/boosts/expire
export const expireBoostsAndListings = async (req, res) => {
  const sellerId = req.user.profile.id;
  const now = new Date();

  try {
    const expiredBoostsResult = await prisma.propertyBoost.updateMany({
      where: {
        sellerId,
        isActive: true,
        expiryDate: { lt: now },
      },
      data: { isActive: false },
    });

    // Pause expired listings while remembering the original status so we can
    // restore it on renewal. Done one at a time so we can capture each
    // property's prior status — `updateMany` cannot copy a column.
    const expiredListings = await prisma.property.findMany({
      where: {
        sellerId,
        listingExpiresAt: { lt: now },
        status: { notIn: ['SOLD', 'PAUSED'] },
      },
      select: { id: true, status: true },
    });

    if (expiredListings.length > 0) {
      await prisma.$transaction(
        expiredListings.map((p) =>
          prisma.property.update({
            where: { id: p.id },
            data: {
              status: 'PAUSED',
              pausedFromStatus: p.status,
            },
          })
        )
      );
    }

    return res.json({
      message: 'Expiry checks completed',
      expiredBoosts: expiredBoostsResult.count,
      pausedListings: expiredListings.length,
    });
  } catch (err) {
    console.error('Expire boosts/listings error:', err);
    return res.status(500).json({ error: 'Failed to run expiry checks' });
  }
};

// POST /api/seller/listings/renew
export const renewListing = async (req, res) => {
  const sellerId = req.user.profile.id;
  const { propertyId } = req.body;
  const RENEW_COST = 1;
  const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

  if (!propertyId) {
    return res.status(400).json({ error: 'propertyId is required' });
  }

  try {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, sellerId: true, title: true, status: true, pausedFromStatus: true },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (property.sellerId !== sellerId) {
      return res.status(403).json({ error: 'You can only renew your own listings' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({
        where: { id: sellerId },
        select: { credits: true },
      });

      if (!profile) {
        const e = new Error('Profile not found');
        e.code = 'NOT_FOUND';
        throw e;
      }

      if (profile.credits < RENEW_COST) {
        const e = new Error("You don't have enough credits. Please purchase credits to renew this listing.");
        e.code = 'INSUFFICIENT_CREDITS';
        throw e;
      }

      const restoreStatus = property.pausedFromStatus || 'FOR_SALE';
      const listingExpiresAt = new Date(Date.now() + SIX_MONTHS_MS);

      const updatedProperty = await tx.property.update({
        where: { id: propertyId },
        data: {
          status: restoreStatus,
          pausedFromStatus: null,
          listingExpiresAt,
        },
        select: { id: true, status: true, listingExpiresAt: true, title: true },
      });

      const updatedProfile = await tx.profile.update({
        where: { id: sellerId },
        data: { credits: { decrement: RENEW_COST } },
        select: { id: true, credits: true },
      });

      const ledger = await tx.creditTransaction.create({
        data: {
          sellerId,
          type: 'SPENT',
          amount: RENEW_COST,
          description: `Renewed listing "${property.title}" (6 months)`,
          propertyId: propertyId,
        },
      });

      return { property: updatedProperty, profile: updatedProfile, ledger };
    });

    return res.json({
      message: 'Listing renewed',
      property: result.property,
      balance: result.profile.credits,
      transaction: result.ledger,
    });
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    if (err.code === 'INSUFFICIENT_CREDITS') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Renew listing error:', err);
    return res.status(500).json({ error: 'Failed to renew listing' });
  }
};

// GET /api/seller/notifications
export const getSellerNotifications = async (req, res) => {
  const sellerId = req.user.profile.id;
  const now = new Date();
  const MS_IN_DAY = 1000 * 60 * 60 * 24;

  try {
    const boosts = await prisma.propertyBoost.findMany({
      where: {
        sellerId,
        isActive: true,
      },
      include: {
        property: {
          select: { id: true, title: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    const notifications = boosts
      .map((boost) => {
        const daysRemaining = Math.floor((new Date(boost.expiryDate).getTime() - now.getTime()) / MS_IN_DAY);
        return {
          propertyId: boost.propertyId,
          propertyTitle: boost.property?.title || 'Property',
          boostType: boost.boostType,
          daysRemaining,
          expiryDate: boost.expiryDate,
        };
      })
      .filter((n) => n.daysRemaining <= 5);

    return res.json({ notifications });
  } catch (err) {
    console.error('Get seller notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};
