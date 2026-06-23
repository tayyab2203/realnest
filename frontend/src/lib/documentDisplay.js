/** Deterministic CNIC-style display for demo (profile has no CNIC field in schema). */
export function formatCnicDisplay(profile) {
  if (!profile?.id) return 'XXXXX-XXXXXXX-X';
  let h = 2166136261;
  for (let i = 0; i < profile.id.length; i += 1) {
    h ^= profile.id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const digits = String(Math.abs(h >>> 0)).padStart(10, '0').repeat(2).slice(0, 13);
  const a = digits.slice(0, 5);
  const b = digits.slice(5, 12);
  const c = String((parseInt(digits.slice(12, 13), 10) % 9) + 1);
  return `${a}-${b}-${c}`;
}

export function documentTypeLabel(type) {
  if (type === 'SALE_DEED') return 'Sale Deed';
  if (type === 'RENT_AGREEMENT') return 'Tenancy Agreement';
  return type || 'Document';
}
