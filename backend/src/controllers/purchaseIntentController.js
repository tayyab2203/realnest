import prisma from '../lib/prisma.js';
import { assertBuyerCanPurchaseProperty } from '../services/propertySaleLockService.js';

/** POST /api/purchase-intents  { propertyId } — buyer starts purchase (seller must prepare deed). */
export const createPurchaseIntent = async (req, res) => {
  if (req.user.profile.role !== 'BUYER') {
    return res.status(403).json({ error: 'Only buyers can start a purchase' });
  }
  const { propertyId } = req.body || {};
  if (!propertyId) return res.status(400).json({ error: 'propertyId is required' });

  const buyerId = req.user.profile.id;

  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    if (property.status !== 'FOR_SALE') {
      return res.status(400).json({ error: 'Purchase requests are only for properties for sale' });
    }

    const purchaseBlock = await assertBuyerCanPurchaseProperty(propertyId, buyerId);
    if (purchaseBlock) {
      return res.status(400).json({ error: purchaseBlock });
    }

    const intent = await prisma.propertyPurchaseIntent.upsert({
      where: {
        propertyId_buyerId: { propertyId, buyerId },
      },
      create: {
        propertyId,
        buyerId,
        sellerId: property.sellerId,
      },
      update: {},
      include: {
        property: { select: { id: true, title: true, city: true, status: true } },
        document: { select: { id: true, status: true, buyerNotifiedAt: true, type: true } },
        buyer: { select: { id: true, name: true, email: true } },
      },
    });

    console.info(
      `[purchase-intent] Buyer ${intent.buyer?.email} requested purchase on "${intent.property?.title}" — seller must generate & sign sale deed, then notify buyer.`
    );

    return res.status(201).json({ intent });
  } catch (err) {
    console.error('createPurchaseIntent', err);
    const msg = String(err?.message || '');
    if (msg.includes('propertyPurchaseIntent') && msg.includes('undefined')) {
      return res.status(503).json({
        error: 'Server database client is out of date. Run: cd backend && npx prisma generate && restart the API.',
      });
    }
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Failed to create purchase request' : msg || 'Failed to create purchase request',
    });
  }
};

/** GET /api/purchase-intents/for-property/:propertyId — current buyer's intent for this listing. */
export const getIntentForProperty = async (req, res) => {
  if (req.user.profile.role !== 'BUYER') {
    return res.status(403).json({ error: 'Only buyers can view this' });
  }
  const { propertyId } = req.params;
  const buyerId = req.user.profile.id;

  try {
    const intent = await prisma.propertyPurchaseIntent.findUnique({
      where: { propertyId_buyerId: { propertyId, buyerId } },
      include: {
        property: { select: { id: true, title: true, city: true, status: true, price: true } },
        document: { select: { id: true, status: true, buyerNotifiedAt: true, type: true } },
      },
    });
    return res.json({ intent });
  } catch (err) {
    console.error('getIntentForProperty', err);
    const msg = String(err?.message || '');
    if (msg.includes('propertyPurchaseIntent') && msg.includes('undefined')) {
      return res.status(503).json({
        error: 'Server database client is out of date. Run: cd backend && npx prisma generate && restart the API.',
      });
    }
    return res.status(500).json({ error: 'Failed to load purchase request' });
  }
};

/** GET /api/purchase-intents/buyer — active purchases awaiting or holding a deed. */
export const listBuyerPurchaseIntents = async (req, res) => {
  if (req.user.profile.role !== 'BUYER') {
    return res.status(403).json({ error: 'Only buyers can view this' });
  }
  const buyerId = req.user.profile.id;

  try {
    const intents = await prisma.propertyPurchaseIntent.findMany({
      where: { buyerId },
      include: {
        property: { select: { id: true, title: true, city: true, status: true, price: true } },
        document: {
          select: {
            id: true,
            status: true,
            buyerNotifiedAt: true,
            type: true,
            generatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ intents });
  } catch (err) {
    console.error('listBuyerPurchaseIntents', err);
    return res.status(500).json({ error: 'Failed to list your purchases' });
  }
};

/** GET /api/purchase-intents/seller — pending / active requests for my listings. */
export const listSellerPurchaseIntents = async (req, res) => {
  if (req.user.profile.role !== 'SELLER') {
    return res.status(403).json({ error: 'Only sellers can view this' });
  }
  const sellerId = req.user.profile.id;

  try {
    const intents = await prisma.propertyPurchaseIntent.findMany({
      where: { sellerId },
      include: {
        property: { select: { id: true, title: true, city: true, status: true, price: true } },
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        document: { select: { id: true, status: true, buyerNotifiedAt: true, type: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ intents });
  } catch (err) {
    console.error('listSellerPurchaseIntents', err);
    return res.status(500).json({ error: 'Failed to list purchase requests' });
  }
};
