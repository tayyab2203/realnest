import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { saveOtp, consumeOtp } from '../utils/otpStore.js';
import {
  maskPhone,
  generateOtp6,
  isDevOtpMode,
  computeDocumentHash,
} from '../utils/documentHelpers.js';
import { buildDocumentPdfBuffer, uploadPdfToSupabase } from '../utils/generateDocument.js';
import { ensureSaleInstallmentsForDeed } from '../services/saleInstallmentService.js';
import { assertBuyerCanPurchaseProperty, getCommittedSaleBuyerId } from '../services/propertySaleLockService.js';

const router = Router();

const fullInclude = {
  property: true,
  seller: true,
  buyer: true,
};

function clientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  if (Array.isArray(xf) && xf[0]) return xf[0].split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

function assertParticipant(doc, profileId) {
  if (doc.sellerId === profileId) return 'seller';
  if (doc.buyerId === profileId) return 'buyer';
  return null;
}

/**
 * Latest legal document for checkout: sale deed (for sale) or tenancy agreement (for rent).
 * GET /api/documents/for-purchase/:propertyId
 */
router.get('/for-purchase/:propertyId', authenticate, async (req, res) => {
  if (req.user.profile.role !== 'BUYER') {
    return res.status(403).json({ error: 'Only buyers can access this' });
  }
  const { propertyId } = req.params;
  const buyerId = req.user.profile.id;
  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const purchaseBlock = await assertBuyerCanPurchaseProperty(propertyId, buyerId);
    if (purchaseBlock) {
      return res.status(403).json({ error: purchaseBlock });
    }

    if (property.status === 'FOR_SALE' || property.status === 'SOLD') {
      const doc = await prisma.document.findFirst({
        where: {
          propertyId,
          buyerId,
          type: 'SALE_DEED',
          status: { not: 'CANCELLED' },
        },
        orderBy: { generatedAt: 'desc' },
        include: fullInclude,
      });
      if (doc?.status === 'FULLY_EXECUTED') {
        await ensureSaleInstallmentsForDeed(doc.id);
      }
      return res.json({ document: doc, deedRequired: true, checkoutKind: 'SALE' });
    }

    if (property.status === 'FOR_RENT') {
      const doc = await prisma.document.findFirst({
        where: {
          propertyId,
          buyerId,
          type: 'RENT_AGREEMENT',
          status: { not: 'CANCELLED' },
        },
        orderBy: { generatedAt: 'desc' },
        include: fullInclude,
      });
      return res.json({ document: doc, deedRequired: false, checkoutKind: 'RENT' });
    }

    return res.json({ document: null, deedRequired: false, checkoutKind: null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to load document' });
  }
});

/** GET /api/documents/buyers/search?q= */
router.get('/buyers/search', authenticate, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });
  try {
    const buyers = await prisma.profile.findMany({
      where: {
        role: 'BUYER',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      select: { id: true, name: true, email: true, phone: true },
    });
    return res.json({ buyers });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Search failed' });
  }
});

/** POST /api/documents/generate */
router.post('/generate', authenticate, async (req, res) => {
  if (req.user.profile.role !== 'SELLER') {
    return res.status(403).json({ error: 'Only sellers can generate documents' });
  }
  const { propertyId, type, buyerId } = req.body || {};
  if (!propertyId || !type || !buyerId) {
    return res.status(400).json({ error: 'propertyId, type, and buyerId are required' });
  }
  if (type !== 'SALE_DEED' && type !== 'RENT_AGREEMENT') {
    return res.status(400).json({ error: 'Invalid document type' });
  }

  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    if (property.sellerId !== req.user.profile.id) {
      return res.status(403).json({ error: 'You do not own this property' });
    }
    if (type === 'SALE_DEED' && property.status !== 'FOR_SALE' && property.status !== 'SOLD') {
      return res.status(400).json({ error: 'Sale deed is only for listings marked For Sale' });
    }

    if (type === 'SALE_DEED') {
      const committed = await getCommittedSaleBuyerId(propertyId);
      if (committed && committed !== buyerId) {
        return res.status(400).json({
          error: 'This property is already reserved for another buyer.',
        });
      }
    }
    if (type === 'RENT_AGREEMENT' && property.status !== 'FOR_RENT') {
      return res.status(400).json({ error: 'Rent agreement is only for listings marked For Rent' });
    }

    const buyer = await prisma.profile.findFirst({
      where: { id: buyerId, role: 'BUYER' },
    });
    if (!buyer) return res.status(404).json({ error: 'Buyer profile not found' });
    if (buyer.id === req.user.profile.id) {
      return res.status(400).json({ error: 'Buyer must be a different user from the seller' });
    }

    const doc = await prisma.document.create({
      data: {
        propertyId,
        type,
        sellerId: req.user.profile.id,
        buyerId: buyer.id,
        status: 'DRAFT',
        ...(type === 'RENT_AGREEMENT' ? { buyerNotifiedAt: new Date() } : {}),
      },
      include: fullInclude,
    });

    await prisma.propertyPurchaseIntent.updateMany({
      where: { propertyId, buyerId: buyer.id },
      data: { documentId: doc.id },
    });

    return res.status(201).json({
      documentId: doc.id,
      document: doc,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to generate document' });
  }
});

/** POST /api/documents/send-otp */
router.post('/send-otp', authenticate, async (req, res) => {
  const { documentId, role } = req.body || {};
  if (!documentId || !['seller', 'buyer'].includes(role)) {
    return res.status(400).json({ error: 'documentId and role (seller|buyer) are required' });
  }

  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId }, include: fullInclude });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const me = req.user.profile.id;
    if (role === 'seller' && doc.sellerId !== me) return res.status(403).json({ error: 'Forbidden' });
    if (role === 'buyer' && doc.buyerId !== me) return res.status(403).json({ error: 'Forbidden' });

    if (role === 'buyer' && doc.buyerId === me) {
      if (doc.type === 'SALE_DEED' && !doc.buyerNotifiedAt) {
        return res.status(400).json({
          error: 'The seller has not released this document to you yet.',
        });
      }
    }

    const profile = role === 'seller' ? doc.seller : doc.buyer;
    if (!profile?.phone) {
      return res.status(400).json({ error: 'No phone number on file for OTP delivery' });
    }

    const otp = isDevOtpMode() ? '123456' : generateOtp6();
    saveOtp(documentId, role, otp);

    if (!isDevOtpMode()) {
      // Production: integrate SMS gateway here.
      console.info(`[OTP] document=${documentId} role=${role} -> ${profile.phone} code=${otp}`);
    }

    return res.json({ success: true, maskedPhone: maskPhone(profile.phone) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

/** POST /api/documents/verify-otp */
router.post('/verify-otp', authenticate, async (req, res) => {
  const { documentId, role, otp } = req.body || {};
  if (!documentId || !['seller', 'buyer'].includes(role) || otp == null) {
    return res.status(400).json({ error: 'documentId, role, and otp are required' });
  }

  const otpStr = String(otp).trim();
  let otpOk = false;
  if (isDevOtpMode() && otpStr === '123456') otpOk = true;
  else otpOk = consumeOtp(documentId, role, otpStr).ok;

  if (!otpOk) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  const ip = clientIp(req);

  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId }, include: fullInclude });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const me = req.user.profile.id;
    if (role === 'seller') {
      if (doc.sellerId !== me) return res.status(403).json({ error: 'Forbidden' });
      if (doc.status !== 'DRAFT') {
        return res.status(400).json({ error: 'Seller OTP is only valid while document is in Draft' });
      }

      const updated = await prisma.document.update({
        where: { id: documentId },
        data: {
          sellerAgreed: true,
          sellerAgreedAt: new Date(),
          sellerOTPVerified: true,
          sellerIP: ip,
          status: 'SELLER_SIGNED',
        },
        include: fullInclude,
      });

      console.info(
        `[notify:buyer] Document ${documentId}: seller signed. Notify buyer ${updated.buyer?.email || updated.buyerId} to complete OTP.`
      );

      return res.json({ document: updated });
    }

    if (role === 'buyer') {
      if (doc.buyerId !== me) return res.status(403).json({ error: 'Forbidden' });
      if (doc.status !== 'SELLER_SIGNED') {
        return res.status(400).json({ error: 'Buyer can only sign after the seller has signed' });
      }
      if (doc.type === 'SALE_DEED' && !doc.buyerNotifiedAt) {
        return res.status(400).json({
          error: 'The seller has not released this sale deed to you yet. Wait for their notification.',
        });
      }

      const executedAt = new Date();
      const hash = computeDocumentHash(
        {
          id: doc.id,
          type: doc.type,
          sellerAgreedAt: doc.sellerAgreedAt,
          buyerAgreedAt: executedAt,
        },
        doc.property,
        doc.seller,
        doc.buyer
      );

      const updated = await prisma.document.update({
        where: { id: documentId },
        data: {
          buyerAgreed: true,
          buyerAgreedAt: executedAt,
          buyerOTPVerified: true,
          buyerIP: ip,
          status: 'FULLY_EXECUTED',
          executedAt,
          documentHash: hash,
        },
        include: fullInclude,
      });

      const pdfData = {
        document: updated,
        property: updated.property,
        seller: updated.seller,
        buyer: updated.buyer,
      };
      const buffer = await buildDocumentPdfBuffer(pdfData);
      const url = await uploadPdfToSupabase(supabaseAdmin, updated.id, buffer);

      const finalDoc = await prisma.document.update({
        where: { id: documentId },
        data: { finalPdfUrl: url || updated.finalPdfUrl },
        include: fullInclude,
      });

      await ensureSaleInstallmentsForDeed(finalDoc.id);

      return res.json({ document: finalDoc });
    }

    return res.status(400).json({ error: 'Invalid role' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

/** POST /api/documents/:documentId/notify-buyer-ready — seller releases deed to buyer (after seller signed). */
router.post('/:documentId/notify-buyer-ready', authenticate, async (req, res) => {
  const { documentId } = req.params;
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId }, include: fullInclude });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.sellerId !== req.user.profile.id) return res.status(403).json({ error: 'Forbidden' });
    if (doc.status !== 'SELLER_SIGNED') {
      return res.status(400).json({ error: 'Sign the document as seller before notifying the buyer' });
    }
    const now = new Date();
    const updated = await prisma.document.update({
      where: { id: documentId },
      data: { buyerNotifiedAt: now },
      include: fullInclude,
    });
    console.info(
      `[notify-buyer-ready] Document ${documentId}: buyer ${updated.buyer?.email || updated.buyerId} can now review and sign.`
    );
    return res.json({ document: updated });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to notify buyer' });
  }
});

/** POST /api/documents/:documentId/remind — seller reminds buyer */
router.post('/:documentId/remind', authenticate, async (req, res) => {
  const { documentId } = req.params;
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId }, include: fullInclude });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.sellerId !== req.user.profile.id) return res.status(403).json({ error: 'Forbidden' });
    if (doc.status !== 'SELLER_SIGNED') {
      return res.status(400).json({ error: 'Reminder is only available while awaiting buyer signature' });
    }
    if (!doc.buyerNotifiedAt) {
      return res.status(400).json({ error: 'Notify the buyer first before sending reminders' });
    }
    console.info(
      `[remind:buyer] Document ${documentId}: reminder sent to ${doc.buyer?.email || doc.buyerId}`
    );
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to send reminder' });
  }
});

router.get('/seller/:sellerId', authenticate, async (req, res) => {
  if (req.params.sellerId !== req.user.profile.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const documents = await prisma.document.findMany({
      where: { sellerId: req.params.sellerId },
      include: fullInclude,
      orderBy: { generatedAt: 'desc' },
    });
    return res.json({ documents });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to list documents' });
  }
});

router.get('/buyer/:buyerId', authenticate, async (req, res) => {
  if (req.params.buyerId !== req.user.profile.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const documents = await prisma.document.findMany({
      where: {
        buyerId: req.params.buyerId,
        OR: [
          { buyerNotifiedAt: { not: null } },
          { type: 'RENT_AGREEMENT' },
          { status: 'FULLY_EXECUTED' },
        ],
      },
      include: fullInclude,
      orderBy: { generatedAt: 'desc' },
    });
    return res.json({ documents });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to list documents' });
  }
});

router.get('/:documentId', authenticate, async (req, res) => {
  const { documentId } = req.params;
  try {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: fullInclude,
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (!assertParticipant(doc, req.user.profile.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (
      doc.buyerId === req.user.profile.id
      && doc.type === 'SALE_DEED'
      && !doc.buyerNotifiedAt
      && doc.status !== 'FULLY_EXECUTED'
    ) {
      return res.status(403).json({
        error: 'The seller has not released this document to you yet. You will be notified when it is ready.',
      });
    }
    return res.json({ document: doc });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to fetch document' });
  }
});

export default router;
