import prisma from '../lib/prisma.js';
import { BUYER_VISIBLE_ARCHIVE } from '../utils/propertyArchive.js';

/**
 * RECOMMENDATION ENGINE
 *
 * Two-layer scoring system:
 *
 * 1) Content-Based Filtering (60% weight)
 *    - Builds a "preference profile" from the user's past interactions
 *    - Scores each unseen property by how closely it matches the profile
 *
 * 2) Collaborative Filtering (40% weight)
 *    - Finds users with similar interaction patterns
 *    - Surfaces properties those similar users liked but current user hasn't seen
 */

const INTERACTION_WEIGHTS = {
  VIEW: 1,
  SAVE: 3,
  LIKE: 4,
  FAVORITE: 5,
};

async function getUserPreferenceProfile(userId) {
  const interactions = await prisma.userInteraction.findMany({
    where: { userId },
    include: { property: true },
  });

  if (interactions.length === 0) return null;

  const profile = {
    types: {},
    cities: {},
    avgPrice: 0,
    avgBedrooms: 0,
    avgBathrooms: 0,
    avgArea: 0,
    statuses: {},
  };

  let totalWeight = 0;

  for (const interaction of interactions) {
    const weight = INTERACTION_WEIGHTS[interaction.interactionType];
    const p = interaction.property;

    profile.types[p.type] = (profile.types[p.type] || 0) + weight;
    profile.cities[p.city.toLowerCase()] = (profile.cities[p.city.toLowerCase()] || 0) + weight;
    profile.statuses[p.status] = (profile.statuses[p.status] || 0) + weight;
    profile.avgPrice += p.price * weight;
    profile.avgBedrooms += p.bedrooms * weight;
    profile.avgBathrooms += p.bathrooms * weight;
    profile.avgArea += p.area * weight;
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    profile.avgPrice /= totalWeight;
    profile.avgBedrooms /= totalWeight;
    profile.avgBathrooms /= totalWeight;
    profile.avgArea /= totalWeight;
  }

  return profile;
}

function contentScore(property, profile) {
  if (!profile) return 0;

  let score = 0;
  const maxScore = 100;

  const allTypes = Object.values(profile.types);
  const maxTypeWeight = Math.max(...allTypes, 1);
  const typeWeight = profile.types[property.type] || 0;
  score += (typeWeight / maxTypeWeight) * 25;

  const allCities = Object.values(profile.cities);
  const maxCityWeight = Math.max(...allCities, 1);
  const cityWeight = profile.cities[property.city.toLowerCase()] || 0;
  score += (cityWeight / maxCityWeight) * 25;

  const priceDiff = Math.abs(property.price - profile.avgPrice) / Math.max(profile.avgPrice, 1);
  score += Math.max(0, 20 - priceDiff * 20);

  const bedDiff = Math.abs(property.bedrooms - profile.avgBedrooms);
  score += Math.max(0, 15 - bedDiff * 5);

  const areaDiff = Math.abs(property.area - profile.avgArea) / Math.max(profile.avgArea, 1);
  score += Math.max(0, 15 - areaDiff * 15);

  return Math.min(score, maxScore);
}

async function collaborativeScore(userId, propertyId) {
  const userInteractions = await prisma.userInteraction.findMany({
    where: { userId },
    select: { propertyId: true },
  });

  const userPropertyIds = userInteractions.map(i => i.propertyId);

  if (userPropertyIds.length === 0) return 0;

  const similarUsers = await prisma.userInteraction.findMany({
    where: {
      propertyId: { in: userPropertyIds },
      userId: { not: userId },
      interactionType: { in: ['LIKE', 'SAVE', 'FAVORITE'] },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  const similarUserIds = similarUsers.map(u => u.userId);

  if (similarUserIds.length === 0) return 0;

  const interactionsOnTarget = await prisma.userInteraction.findMany({
    where: {
      userId: { in: similarUserIds },
      propertyId,
      interactionType: { in: ['LIKE', 'SAVE', 'FAVORITE'] },
    },
  });

  return Math.min((interactionsOnTarget.length / similarUserIds.length) * 100, 100);
}

export async function getRecommendations(userId, limit = 12) {
  const profile = await getUserPreferenceProfile(userId);

  const viewedPropertyIds = (
    await prisma.userInteraction.findMany({
      where: { userId },
      select: { propertyId: true },
      distinct: ['propertyId'],
    })
  ).map(i => i.propertyId);

  const candidateProperties = await prisma.property.findMany({
    where: {
      id: { notIn: viewedPropertyIds.length > 0 ? viewedPropertyIds : ['none'] },
      status: { notIn: ['PAUSED', 'SOLD'] },
      ...BUYER_VISIBLE_ARCHIVE,
    },
    include: {
      seller: { select: { name: true, avatar: true } },
      _count: { select: { interactions: true, saved: true } },
    },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });

  if (!profile && candidateProperties.length === 0) {
    const popular = await prisma.property.findMany({
      where: { status: { notIn: ['PAUSED', 'SOLD'] }, ...BUYER_VISIBLE_ARCHIVE },
      include: {
        seller: { select: { name: true, avatar: true } },
        _count: { select: { interactions: true, saved: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    return popular.map(p => ({ ...p, recommendationScore: 50, reason: 'New listings' }));
  }

  const scored = await Promise.all(
    candidateProperties.map(async (property) => {
      const cScore = contentScore(property, profile);
      const colScore = await collaborativeScore(userId, property.id);
      const finalScore = cScore * 0.6 + colScore * 0.4;

      let reason = 'Recommended for you';
      if (cScore > colScore && profile) {
        const topCity = Object.entries(profile.cities).sort((a, b) => b[1] - a[1])[0];
        const topType = Object.entries(profile.types).sort((a, b) => b[1] - a[1])[0];
        if (topCity && property.city.toLowerCase() === topCity[0]) {
          reason = `Popular in ${property.city}`;
        } else if (topType && property.type === topType[0]) {
          reason = `Matches your ${property.type.toLowerCase()} preference`;
        }
      } else if (colScore > 0) {
        reason = 'Users like you also liked this';
      }

      return { ...property, recommendationScore: Math.round(finalScore), reason };
    })
  );

  scored.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return scored.slice(0, limit);
}
