import { createClient } from "@supabase/supabase-js";

// Set these in .env.local (and in your hosting provider's environment settings):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-public-key
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const CONTENT_TABLE = "site_content";
export const CONTENT_ID = "main";
export const MEDIA_BUCKET = "site-media";

let client = null;

export function isConfigured() {
  return Boolean(url && key);
}

export function getSupabase() {
  if (!isConfigured()) return null;
  if (!client) client = createClient(url, key);
  return client;
}
