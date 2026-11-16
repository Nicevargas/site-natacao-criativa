import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, '..', '.env');

// Load .env if present without overriding already exported environment variables
if (fs.existsSync(ENV_PATH) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(ENV_PATH);
  } catch {
    // Ignore malformed optional .env
  }
}

export const ALLOWED_ADMIN_ROLES = ['admin', 'coordinator', 'editor'];

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

export function hasServiceRoleKey() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabasePublicConfig() {
  const configured = isSupabaseConfigured();
  return {
    supabaseConfigured: configured,
    supabaseUrl: configured ? process.env.SUPABASE_URL : null,
    supabaseAnonKey: configured ? process.env.SUPABASE_ANON_KEY : null,
  };
}

export function createSupabaseAnonClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createSupabaseAuthedClient(accessToken) {
  if (!isSupabaseConfigured() || !accessToken) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function createSupabaseServiceClient() {
  if (!hasServiceRoleKey()) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function verifySupabaseAccessToken(accessToken, localUsers = []) {
  const anonClient = createSupabaseAnonClient();
  if (!anonClient) {
    return { error: 'Supabase Auth não configurado neste servidor.', status: 503 };
  }

  const { data: userData, error: userErr } = await anonClient.auth.getUser(accessToken);
  if (userErr || !userData?.user) {
    return { error: userErr?.message || 'Token Supabase inválido ou expirado.', status: 401 };
  }

  const sbUser = userData.user;
  const email = String(sbUser.email || '').trim().toLowerCase();

  // Query public.profiles respecting RLS (auth.uid() = id)
  let profile = null;
  try {
    const authedClient = createSupabaseAuthedClient(accessToken);
    const { data: prof } = await authedClient
      .from('profiles')
      .select('id, email, full_name, role, headline, avatar_url')
      .eq('id', sbUser.id)
      .maybeSingle();
    if (prof) profile = prof;
  } catch {
    // Profiles table might not be migrated yet; continue with metadata/local role lookup
  }

  const localMatch = (localUsers || []).find(
    (u) => u.active && String(u.email || '').trim().toLowerCase() === email
  );
  const envAdminEmail = String(process.env.ADMIN_EMAIL || 'admin@natacaocriativa.com.br')
    .trim()
    .toLowerCase();

  let resolvedRole = profile?.role || sbUser.app_metadata?.role || sbUser.user_metadata?.role || 'student';

  if (!ALLOWED_ADMIN_ROLES.includes(resolvedRole)) {
    if (localMatch && ALLOWED_ADMIN_ROLES.includes(localMatch.role)) {
      resolvedRole = localMatch.role;
    } else if (email && email === envAdminEmail) {
      resolvedRole = 'admin';
    }
  }

  const fullName =
    profile?.full_name ||
    sbUser.user_metadata?.full_name ||
    sbUser.user_metadata?.name ||
    localMatch?.name ||
    email.split('@')[0];

  const authorized = ALLOWED_ADMIN_ROLES.includes(resolvedRole);

  return {
    authorized,
    status: authorized ? 200 : 403,
    error: authorized
      ? null
      : 'Conta autenticada no Supabase, porém sem permissão administrativa (admin, coordinator ou editor).',
    user: {
      id: sbUser.id,
      email,
      name: fullName,
      role: resolvedRole,
      title: profile?.headline || localMatch?.title || 'Equipe Administrativa',
      active: localMatch ? localMatch.active : true,
      authProvider: 'supabase',
      avatarUrl: profile?.avatar_url || sbUser.user_metadata?.avatar_url || null,
    },
  };
}

export async function signInWithSupabasePassword(email, password, localUsers = []) {
  const anonClient = createSupabaseAnonClient();
  if (!anonClient) {
    return { configured: false };
  }

  const { data, error } = await anonClient.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password: String(password),
  });

  if (error || !data?.session?.access_token) {
    return {
      configured: true,
      error: error?.message || 'Credenciais inválidas no Supabase Auth.',
      status: 401,
    };
  }

  const verification = await verifySupabaseAccessToken(data.session.access_token, localUsers);
  return {
    configured: true,
    session: data.session,
    ...verification,
  };
}

export async function provisionSupabaseAdminUser({ name, email, password, role }) {
  const serviceClient = createSupabaseServiceClient();
  if (!serviceClient) return { skipped: true };

  const cleanEmail = String(email).trim().toLowerCase();
  const { data, error } = await serviceClient.auth.admin.createUser({
    email: cleanEmail,
    password: String(password),
    email_confirm: true,
    user_metadata: { full_name: name, name },
    app_metadata: { role },
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.user?.id) {
    try {
      await serviceClient
        .from('profiles')
        .upsert({ id: data.user.id, email: cleanEmail, full_name: name, role });
    } catch {
      // Ignore if profiles table is not yet migrated
    }
  }

  return { user: data?.user || null };
}
