import prisma from '../lib/prisma.js';

export const trackInteraction = async (req, res) => {
  const { propertyId, interactionType } = req.body;
  const userId = req.user.profile.id;

  if (!propertyId || !interactionType) {
    return res.status(400).json({ error: 'propertyId and interactionType are required' });
  }

  if (!['VIEW', 'SAVE', 'LIKE', 'FAVORITE'].includes(interactionType)) {
    return res.status(400).json({ error: 'Invalid interaction type' });
  }

  try {
    const interaction = await prisma.userInteraction.upsert({
      where: {
        userId_propertyId_interactionType: {
          userId,
          propertyId,
          interactionType,
        },
      },
      update: { createdAt: new Date() },
      create: { userId, propertyId, interactionType },
    });

    return res.status(201).json({ interaction });
  } catch (err) {
    console.error('Track interaction error:', err);
    return res.status(500).json({ error: 'Failed to track interaction' });
  }
};

export const removeInteraction = async (req, res) => {
  const { propertyId, interactionType } = req.body;
  const userId = req.user.profile.id;

  try {
    await prisma.userInteraction.delete({
      where: {
        userId_propertyId_interactionType: {
          userId,
          propertyId,
          interactionType,
        },
      },
    });

    return res.json({ message: 'Interaction removed' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Interaction not found' });
    }
    return res.status(500).json({ error: 'Failed to remove interaction' });
  }
};

export const getUserInteractions = async (req, res) => {
  const userId = req.user.profile.id;
  const { type } = req.query;

  const where = { userId };
  if (type) where.interactionType = type;

  try {
    const interactions = await prisma.userInteraction.findMany({
      where,
      include: {
        property: {
          include: {
            seller: { select: { name: true, avatar: true } },
            _count: { select: { interactions: true, saved: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const visible = interactions.filter(
      (i) => i.property && i.property.archiveStatus === 'ACTIVE'
    );

    return res.json({ interactions: visible });
  } catch (err) {
    console.error('Get interactions error:', err);
    return res.status(500).json({ error: 'Failed to fetch interactions' });
  }
};

export const saveProperty = async (req, res) => {
  const { propertyId } = req.body;
  const userId = req.user.profile.id;

  try {
    const saved = await prisma.savedProperty.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      update: {},
      create: { userId, propertyId },
    });

    await prisma.userInteraction.upsert({
      where: {
        userId_propertyId_interactionType: {
          userId, propertyId, interactionType: 'SAVE',
        },
      },
      update: { createdAt: new Date() },
      create: { userId, propertyId, interactionType: 'SAVE' },
    });

    return res.status(201).json({ saved });
  } catch (err) {
    console.error('Save property error:', err);
    return res.status(500).json({ error: 'Failed to save property' });
  }
};

export const unsaveProperty = async (req, res) => {
  const { propertyId } = req.params;
  const userId = req.user.profile.id;

  try {
    await prisma.savedProperty.delete({
      where: { userId_propertyId: { userId, propertyId } },
    });

    await prisma.userInteraction.deleteMany({
      where: { userId, propertyId, interactionType: 'SAVE' },
    });

    return res.json({ message: 'Property unsaved' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Saved property not found' });
    }
    return res.status(500).json({ error: 'Failed to unsave property' });
  }
};

export const getSavedProperties = async (req, res) => {
  const userId = req.user.profile.id;

  try {
    const saved = await prisma.savedProperty.findMany({
      where: { userId },
      include: {
        property: {
          include: {
            seller: { select: { name: true, avatar: true } },
            _count: { select: { interactions: true, saved: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const active = saved
      .map((s) => s.property)
      .filter((p) => p && p.archiveStatus === 'ACTIVE');

    return res.json({ saved: active });
  } catch (err) {
    console.error('Get saved properties error:', err);
    return res.status(500).json({ error: 'Failed to fetch saved properties' });
  }
};
