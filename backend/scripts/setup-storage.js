/**
 * Creates the property-images bucket in Supabase Storage if it doesn't exist.
 * Run: npx tsx scripts/setup-storage.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const BUCKETS = [
  { name: 'property-images', fileSizeLimit: 5242880 },
  { name: 'realnest-documents', fileSizeLimit: 10485760 },
];

async function setup() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { data: buckets } = await supabase.storage.listBuckets();
  const existing = new Set((buckets || []).map((b) => b.name));

  for (const b of BUCKETS) {
    if (existing.has(b.name)) {
      console.log(`Bucket "${b.name}" already exists.`);
      continue;
    }

    const { error } = await supabase.storage.createBucket(b.name, {
      public: true,
      fileSizeLimit: b.fileSizeLimit,
    });

    if (error) {
      console.error(`Failed to create bucket "${b.name}":`, error.message);
      process.exit(1);
    }

    console.log(`Bucket "${b.name}" created successfully (public).`);
  }
}

setup();
