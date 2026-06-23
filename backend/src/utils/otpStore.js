/** In-memory OTP store with 5 minute expiry (FYP / demo). */

const TTL_MS = 5 * 60 * 1000;
const store = new Map();

function key(documentId, role) {
  return `${documentId}:${role}`;
}

export function saveOtp(documentId, role, otp) {
  store.set(key(documentId, role), { otp: String(otp), expiresAt: Date.now() + TTL_MS });
}

export function consumeOtp(documentId, role, inputOtp) {
  const k = key(documentId, role);
  const row = store.get(k);
  if (!row) return { ok: false, reason: 'expired_or_missing' };
  if (Date.now() > row.expiresAt) {
    store.delete(k);
    return { ok: false, reason: 'expired_or_missing' };
  }
  if (String(inputOtp) !== String(row.otp)) {
    return { ok: false, reason: 'mismatch' };
  }
  store.delete(k);
  return { ok: true };
}

export function peekOtp(documentId, role) {
  return store.get(key(documentId, role));
}
