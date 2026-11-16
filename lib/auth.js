import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSupabaseConfigured, verifySupabaseAccessToken } from './supabaseAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const SECRET_FILE = path.join(ROOT_DIR, 'data', '.session-secret');

export const SESSION_COOKIE_NAME = 'nc_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

let resolveLocalUsers = () => [];

export function registerUsersResolver(fn) {
  if (typeof fn === 'function') {
    resolveLocalUsers = fn;
  }
}

function getSessionSecret() {
  if (process.env.ADMIN_SESSION_SECRET) {
    return process.env.ADMIN_SESSION_SECRET;
  }
  try {
    const dataDir = path.dirname(SECRET_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(SECRET_FILE)) {
      return fs.readFileSync(SECRET_FILE, 'utf8').trim();
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return 'natacao-criativa-fallback-session-secret';
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, keyHex] = storedHash.split(':');
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(String(password), salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

export function createSessionToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    authProvider: user.authProvider || 'local',
    exp: Date.now() + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

export function extractSessionFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = verifySessionToken(token);
    if (verified) return verified;
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE_NAME]) {
    return verifySessionToken(cookies[SESSION_COOKIE_NAME]);
  }
  return null;
}

export async function requireAdmin(req, res, next) {
  const session = extractSessionFromRequest(req);
  if (session) {
    req.adminUser = session;
    return next();
  }

  // Also allow direct Supabase JWT Bearer tokens when Supabase Auth is configured
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && isSupabaseConfigured()) {
    const token = authHeader.slice(7).trim();
    try {
      const localUsers = resolveLocalUsers();
      const result = await verifySupabaseAccessToken(token, localUsers);
      if (result.authorized && result.user) {
        req.adminUser = {
          sub: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          authProvider: 'supabase',
        };
        return next();
      }
      if (result.status === 403) {
        return res.status(403).json({
          error: result.error,
          code: 'FORBIDDEN',
        });
      }
    } catch {
      // Fall through to 401
    }
  }

  return res.status(401).json({
    error: 'Sessão administrativa expirada ou não autenticada.',
    code: 'UNAUTHORIZED',
  });
}
