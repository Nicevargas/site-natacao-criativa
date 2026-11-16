import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// No computador, lê as chaves do arquivo .env (na Vercel elas vêm das variáveis do projeto).
try {
  process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'));
} catch {
  // sem arquivo .env: segue com as variáveis do ambiente
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Sem as chaves o site continua no ar com as páginas fixas; só as partes ligadas ao banco ficam desligadas.
export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigurado
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export default supabase;
