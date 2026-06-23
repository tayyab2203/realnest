import crypto from 'crypto';

const PUNJAB_CITIES = new Set(
  [
    'lahore',
    'rawalpindi',
    'faisalabad',
    'multan',
    'gujranwala',
    'sialkot',
    'bahawalpur',
    'sargodha',
    'islamabad',
    'gujrat',
    'sahiwal',
    'jhelum',
    'sheikhupura',
    'okara',
    'kasur',
    'rahim yar khan',
    'wazirabad',
  ].map((c) => c.toLowerCase())
);

const SINDH_CITIES = new Set(
  ['karachi', 'hyderabad', 'sukkur', 'larkana', 'nawabshah', 'mirpur khas', 'thattha', 'jamshoro'].map((c) =>
    c.toLowerCase()
  )
);

export function regionFromCity(city) {
  const c = (city || '').trim().toLowerCase();
  if (SINDH_CITIES.has(c)) return 'SINDH';
  if (PUNJAB_CITIES.has(c)) return 'PUNJAB';
  if (c.includes('karachi')) return 'SINDH';
  return 'PUNJAB';
}

export function saleGoverningLaw(city) {
  return regionFromCity(city) === 'SINDH'
    ? 'Laws of Sindh, Islamic Republic of Pakistan, including applicable stamp duty and registration provisions.'
    : 'Laws of Punjab, Islamic Republic of Pakistan, including applicable stamp duty and registration provisions.';
}

export function rentOrdinanceLine(city) {
  const r = regionFromCity(city);
  if (r === 'SINDH') {
    return 'This tenancy shall be interpreted in accordance with the Sindh Rented Premises Ordinance, 1979, where applicable.';
  }
  return 'This tenancy shall be interpreted in accordance with the Punjab Rented Premises Act, 2009, where applicable.';
}

export function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '03X-XXXXXXX';
  const last2 = digits.slice(-2);
  return `033X-XXXXX${last2}`;
}

function randomDigits(n) {
  let s = '';
  for (let i = 0; i < n; i += 1) s += Math.floor(Math.random() * 10);
  return s;
}

export function generateOtp6() {
  return randomDigits(6);
}

export function isDevOtpMode() {
  return process.env.NODE_ENV !== 'production';
}

export function formatCnicDisplay(profile) {
  if (!profile) return 'XXXXX-XXXXXXX-X';
  const h = crypto.createHash('sha256').update(profile.id || '').digest('hex');
  const part = h.slice(0, 13).replace(/\D/g, '') || '0000000000000';
  const a = part.slice(0, 5);
  const b = part.slice(5, 12);
  const c = (parseInt(part.slice(12, 13) || '0', 10) % 9) + 1;
  return `${a}-${b}-${c}`;
}

export function computeDocumentHash(doc, property, seller, buyer) {
  const payload = [
    doc.id,
    doc.type,
    property?.id,
    property?.price,
    seller?.id,
    buyer?.id,
    doc.sellerAgreedAt?.toISOString?.() || '',
    doc.buyerAgreedAt?.toISOString?.() || '',
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

const ones = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigitsToWords(n) {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${tens[t]}${o ? ` ${ones[o]}` : ''}`.trim();
}

function underThousandToWords(n) {
  const x = Math.floor(Number(n) || 0);
  if (x === 0) return '';
  if (x < 20) return ones[x];
  if (x < 100) return twoDigitsToWords(x);
  const h = Math.floor(x / 100);
  const rest = x % 100;
  const head = `${ones[h]} Hundred`;
  if (rest === 0) return head;
  return `${head} ${rest < 20 ? ones[rest] : twoDigitsToWords(rest)}`.trim();
}

export function numberToWordsPkr(amount) {
  const n = Math.floor(Number(amount) || 0);
  if (n === 0) return 'Zero';
  const crores = Math.floor(n / 10000000);
  const lakhs = Math.floor((n % 10000000) / 100000);
  const thousands = Math.floor((n % 100000) / 1000);
  const hundreds = n % 1000;
  const parts = [];
  if (crores) parts.push(`${underThousandToWords(crores)} Crore${crores > 1 ? 's' : ''}`);
  if (lakhs) parts.push(`${underThousandToWords(lakhs)} Lakh${lakhs > 1 ? 's' : ''}`);
  if (thousands) parts.push(`${underThousandToWords(thousands)} Thousand`);
  if (hundreds) parts.push(underThousandToWords(hundreds));
  return parts.join(' ').trim() || 'Zero';
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
