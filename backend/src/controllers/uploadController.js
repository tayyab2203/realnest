import { supabaseAdmin } from '../lib/supabase.js';

const BUCKET = 'property-images';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB per file
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function uniquePath(originalName) {
  const ext = originalName?.split('.').pop() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext.toLowerCase()) ? ext : 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
}

export const uploadImages = async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Storage not configured' });
  }

  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const urls = [];
  const errors = [];

  for (const file of files) {
    if (file.size > MAX_SIZE) {
      errors.push(`${file.originalname}: file too large (max 5MB)`);
      continue;
    }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      errors.push(`${file.originalname}: invalid type (use JPEG, PNG, WebP, GIF)`);
      continue;
    }

    const path = uniquePath(file.originalname);

    try {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        errors.push(`${file.originalname}: ${error.message}`);
        continue;
      }

      const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(data.path);
      urls.push(urlData.publicUrl);
    } catch (err) {
      errors.push(`${file.originalname}: ${err.message}`);
    }
  }

  if (urls.length === 0 && errors.length > 0) {
    return res.status(400).json({ error: errors.join('; '), urls: [] });
  }

  return res.json({ urls, errors: errors.length > 0 ? errors : undefined });
};
