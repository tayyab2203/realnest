import { supabaseAdmin } from '../lib/supabase.js';
import prisma from '../lib/prisma.js';
import { checkSubscriptionExpiry } from '../services/subscriptionService.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    let profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return res.status(401).json({ error: 'Profile not found. Please complete registration.' });
    }

    // Lazy expiry check: if a paid subscription has lapsed, downgrade the
    // profile to FREE before the rest of the request sees stale entitlements.
    profile = await checkSubscriptionExpiry(profile);

    req.user = { ...user, profile };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/** Valid Supabase JWT only — profile may be missing (used to bootstrap profile after login). */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.supabaseUser = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Like `authenticate`, but never fails the request — populates `req.user` if a
// valid token is present, otherwise simply continues unauthenticated. Used for
// routes that have public access but want to know the viewer when available.
export const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return next();

    let profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (profile) {
      profile = await checkSubscriptionExpiry(profile);
      req.user = { ...user, profile };
    }
    next();
  } catch {
    next();
  }
};

export const requireRole = (role) => {
  return (req, res, next) => {
    if (req.user.profile.role !== role) {
      return res.status(403).json({ error: `Only ${role.toLowerCase()}s can perform this action` });
    }
    next();
  };
};
