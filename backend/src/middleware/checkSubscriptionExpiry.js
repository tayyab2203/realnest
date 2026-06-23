import { checkSubscriptionExpiry as checkExpiryService } from '../services/subscriptionService.js';

/**
 * Express middleware wrapper around the subscription expiry service.
 *
 * Because `authenticate` already calls the service inline (so every
 * authenticated request runs an expiry check), this middleware is a
 * convenience for routes that want to be defensive — e.g. when chaining
 * with `optionalAuthenticate` where expiry isn't auto-checked.
 *
 * Always continues — never fails the request. Refreshes `req.user.profile`
 * in place if a downgrade happened.
 */
export const checkSubscriptionExpiry = async (req, _res, next) => {
  try {
    if (req.user?.profile) {
      const updated = await checkExpiryService(req.user.profile);
      if (updated) req.user.profile = updated;
    }
  } catch (err) {
    console.error('checkSubscriptionExpiry middleware error:', err);
  }
  next();
};

export default checkSubscriptionExpiry;
