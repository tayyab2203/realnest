import prisma from '../lib/prisma.js';
import { getSaleLockMetaForViewer } from '../services/propertySaleLockService.js';
import { BUYER_VISIBLE_ARCHIVE } from '../utils/propertyArchive.js';

export const createProperty = async (req, res) => {
  const {
    title, description, type, status, price,
    city, address, latitude, longitude,
    bedrooms, bathrooms, area, images
  } = req.body;

  if (!title || !type || !status || !price || !city || !address || bedrooms == null || bathrooms == null || !area) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;
    const listingExpiresAt = new Date(Date.now() + SIX_MONTHS_MS);

    const property = await prisma.property.create({
      data: {
        sellerId: req.user.profile.id,
        title,
        description: description || null,
        type,
        status,
        price: parseFloat(price),
        city,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        area: parseFloat(area),
        images: images || [],
        listingExpiresAt,
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

    return res.status(201).json({ property });
  } catch (err) {
    console.error('Create property error:', err);
    return res.status(500).json({ error: 'Failed to create property' });
  }
};

export const getProperties = async (req, res) => {
  const {
    city, type, status,
    minPrice, maxPrice,
    minBedrooms, maxBedrooms,
    minArea, maxArea,
    search,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 12,
  } = req.query;

  const where = { ...BUYER_VISIBLE_ARCHIVE };

  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (type) where.type = type;
  if (status) {
    where.status = status;
  } else {
    where.status = { notIn: ['PAUSED', 'SOLD'] };
  }
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }
  if (minBedrooms || maxBedrooms) {
    where.bedrooms = {};
    if (minBedrooms) where.bedrooms.gte = parseInt(minBedrooms);
    if (maxBedrooms) where.bedrooms.lte = parseInt(maxBedrooms);
  }
  if (minArea || maxArea) {
    where.area = {};
    if (minArea) where.area.gte = parseFloat(minArea);
    if (maxArea) where.area.lte = parseFloat(maxArea);
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
    ];
  }

  const allowedSort = ['createdAt', 'price', 'area', 'bedrooms'];
  const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';
  const sortOrder = order === 'asc' ? 'asc' : 'desc';

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          seller: {
            select: {
              name: true,
              email: true,
              phone: true,
              avatar: true,
              subscriptionPlan: true,
              isVerified: true,
              companyName: true,
              companyLogo: true,
            },
          },
          boosts: {
            where: { isActive: true, expiryDate: { gt: new Date() } },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
          _count: { select: { interactions: true, saved: true } },
        },
        orderBy: { [sortField]: sortOrder },
        skip,
        take: parseInt(limit),
      }),
      prisma.property.count({ where }),
    ]);

    const decorated = properties.map((p) => ({
      ...p,
      activeBoost: p.boosts?.[0] || null,
    }));

    return res.json({
      properties: decorated,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('Get properties error:', err);
    return res.status(500).json({ error: 'Failed to fetch properties' });
  }
};

export const getPropertyById = async (req, res) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            subscriptionPlan: true,
            isVerified: true,
            companyName: true,
            companyLogo: true,
            companyDescription: true,
            officeAddress: true,
          },
        },
        boosts: {
          where: { isActive: true, expiryDate: { gt: new Date() } },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        _count: { select: { interactions: true, saved: true } },
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Hide paused listings from the public detail route, but allow the owning seller
    // to view their paused property (so the renew button can render).
    if (property.status === 'PAUSED' && req.user?.profile?.id !== property.sellerId) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const viewerId = req.user?.profile?.id ?? null;
    if (
      property.archiveStatus === 'ARCHIVED'
      && viewerId !== property.sellerId
    ) {
      return res.status(404).json({ error: 'Property not found' });
    }
    const saleLock = await getSaleLockMetaForViewer(property.id, viewerId);

    return res.json({
      property: {
        ...property,
        activeBoost: property.boosts?.[0] || null,
        committedBuyerId: saleLock.committedBuyerId,
        isCommittedBuyer: saleLock.isCommittedBuyer,
        canPurchase: saleLock.canPurchase,
      },
    });
  } catch (err) {
    console.error('Get property error:', err);
    return res.status(500).json({ error: 'Failed to fetch property' });
  }
};

export const updateProperty = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (existing.sellerId !== req.user.profile.id) {
      return res.status(403).json({ error: 'You can only edit your own properties' });
    }
    if (existing.status === 'SOLD') {
      return res.status(400).json({ error: 'Sold properties cannot be edited' });
    }

    const {
      title, description, type, status, price,
      city, address, latitude, longitude,
      bedrooms, bathrooms, area, images
    } = req.body;

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(status && { status }),
        ...(price && { price: parseFloat(price) }),
        ...(city && { city }),
        ...(address && { address }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(bedrooms != null && { bedrooms: parseInt(bedrooms) }),
        ...(bathrooms != null && { bathrooms: parseInt(bathrooms) }),
        ...(area && { area: parseFloat(area) }),
        ...(images && { images }),
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
    console.error('Update property error:', err);
    return res.status(500).json({ error: 'Failed to update property' });
  }
};

export const deleteProperty = async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.property.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (existing.sellerId !== req.user.profile.id) {
      return res.status(403).json({ error: 'You can only delete your own properties' });
    }

    await prisma.property.delete({ where: { id } });
    return res.json({ message: 'Property deleted successfully' });
  } catch (err) {
    console.error('Delete property error:', err);
    return res.status(500).json({ error: 'Failed to delete property' });
  }
};

export const getMyProperties = async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: {
        sellerId: req.user.profile.id,
        archiveStatus: 'ACTIVE',
        status: { not: 'SOLD' },
      },
      include: {
        _count: { select: { interactions: true, saved: true } },
        boosts: {
          where: { isActive: true, expiryDate: { gt: new Date() } },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const decorated = properties.map((p) => ({
      ...p,
      activeBoost: p.boosts?.[0] || null,
    }));

    return res.json({ properties: decorated });
  } catch (err) {
    console.error('Get my properties error:', err);
    return res.status(500).json({ error: 'Failed to fetch your properties' });
  }
};

export const getFeaturedProperties = async (req, res) => {
  try {
    const properties = await prisma.property.findMany({
      where: {
        featured: true,
        status: { not: 'PAUSED' },
        ...BUYER_VISIBLE_ARCHIVE,
      },
      include: {
        seller: {
          select: {
            name: true,
            avatar: true,
            subscriptionPlan: true,
            isVerified: true,
            companyName: true,
            companyLogo: true,
          },
        },
        boosts: {
          where: { isActive: true, expiryDate: { gt: new Date() } },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        _count: { select: { interactions: true, saved: true } },
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });

    const decorated = properties.map((p) => ({
      ...p,
      activeBoost: p.boosts?.[0] || null,
    }));

    return res.json({ properties: decorated });
  } catch (err) {
    console.error('Get featured error:', err);
    return res.status(500).json({ error: 'Failed to fetch featured properties' });
  }
};
