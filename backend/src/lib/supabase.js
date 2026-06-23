import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const isConfigured = supabaseUrl && supabaseUrl.startsWith('http');

export const supabaseAdmin = isConfigured
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => isConfigured;
