/**
 * Lightweight admin gate. We don't have an admin role in the system (this is
 * an FYP), so we accept either:
 *   - an `x-admin-secret` header that matches the ADMIN_SECRET env var, OR
 *   - a logged-in user whose email is listed in ADMIN_EMAILS (comma separated)
 *
 * If neither env var is configured, the gate is open in development to keep
 * the demo frictionless. In production it will refuse access.
 */
export const requireAdmin = (req, res, next) => {
  const secret = process.env.ADMIN_SECRET;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const hasSecret = secret && req.headers['x-admin-secret'] === secret;
  const hasEmail =
    adminEmails.length > 0 &&
    req.user?.profile?.email &&
    adminEmails.includes(req.user.profile.email.toLowerCase());

  if (hasSecret || hasEmail) return next();

  if (!secret && adminEmails.length === 0 && process.env.NODE_ENV !== 'production') {
    return next();
  }

  return res.status(403).json({ error: 'Admin access required' });
};
