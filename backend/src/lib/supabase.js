const { createClient } = require('@supabase/supabase-js');

const env = require('../config/env');

function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey && env.supabaseServiceRoleKey);
}

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }
}

function getAuthClient() {
  ensureSupabaseConfigured();
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getAdminClient() {
  ensureSupabaseConfigured();
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

module.exports = {
  getAuthClient,
  getAdminClient,
  ensureSupabaseConfigured,
};
