import crypto from 'node:crypto';
import fs from 'node:fs';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  extractSessionFromRequest,
  hashPassword,
  registerUsersResolver,
  requireAdmin,
  verifyPassword,
} from './lib/auth.js';
import {
  aguardarGravacao,
  prepararAlteracao,
  appendAuditLog,
  armazenamentoRemotoAtivo,
  ensureDataFile,
  estadoDoRemoto,
  getPublicSnapshot,
  readDb,
  sanitizeUser,
  sincronizarDoRemoto,
  usarArmazenamentoRemoto,
  writeDb,
} from './lib/store.js';
import { criarEstadoRemoto } from './lib/remoteState.js';
import { enviarSmtp, registrarLoja } from './lib/loja.js';
import { carregarIntegracoes, registrarIntegracoes } from './lib/integracoes.js';
import { ErroDeAgenda, montarAgenda } from './lib/agenda.js';
import { camposCertificado, camposCurso, camposLoja, camposPessoa, comFotosExtras, contatoCertificado, cpfValido, dadosCertificado, registrarExtras } from './lib/extras.js';
import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
  provisionSupabaseAdminUser,
  signInWithSupabasePassword,
  syncSupabaseAdminUser,
  verifySupabaseAccessToken,
} from './lib/supabaseAuth.js';
import api from './api.js';
import { supabase } from './supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ensureDataFile();
// Com SUPABASE_SERVICE_ROLE_KEY configurada, os dados do painel ficam guardados no Supabase.
usarArmazenamentoRemoto(criarEstadoRemoto());
registerUsersResolver(() => readDb().users || []);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json({ limit: '2mb' }));

// Dados do painel no Supabase: antes de cada chamada /api busca a versão mais recente
// e, antes de responder, espera a gravação terminar (na Vercel o servidor pode ser
// congelado assim que a resposta sai).
app.use('/api', async (req, res, next) => {
  // a atividade do site vai direto para a tabela: não precisa carregar os dados do painel
  if (!armazenamentoRemotoAtivo() || req.path === '/public/atividade' || req.path === '/public/ultimos') return next();
  // Pedidos e estoque ficam em tabelas próprias: não entram na fila do arquivo do painel.
  const alteraDados = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
    && !['/auth/logout', '/public/certificates/verify', '/public/certificates/buscar', '/public/loja/checkout', '/webhooks/asaas'].includes(req.path)
    && !req.path.startsWith('/admin/loja/pedidos')
    && !req.path.startsWith('/admin/loja/estoque')
    && !req.path.startsWith('/admin/integracoes/testar');
  let liberar = async () => {};
  try {
    if (alteraDados) liberar = await prepararAlteracao();
    else await sincronizarDoRemoto();
  } catch (erro) {
    console.error('[painel]', erro?.message || erro);
    if (alteraDados) {
      return res.status(503).json({ error: 'Não foi possível salvar agora porque outra alteração está em andamento. Tente de novo em alguns segundos.' });
    }
  }
  const encerrar = res.end.bind(res);
  res.end = (...args) => {
    aguardarGravacao()
      .then(() => liberar())
      .catch((erro) => console.error('[painel]', erro?.message || erro))
      .finally(() => encerrar(...args));
    return res;
  };
  next();
});

// Chaves do Asaas e do e-mail salvas no painel
app.use('/api', async (req, res, next) => {
  if (/^\/(public\/loja|public\/ultimos|webhooks\/asaas|admin\/loja|admin\/integracoes)/.test(req.path)) {
    await carregarIntegracoes().catch((erro) => console.error('[integracoes]', erro?.message));
  }
  next();
});

app.get('/api/painel/status', (req, res) => {
  res.json(estadoDoRemoto());
});

// Protect internal backend directories and config files from static access
app.use((req, res, next) => {
  const forbiddenPrefixes = ['/data', '/lib', '/supabase', '/.env', '/.git'];
  const forbiddenFiles = ['/package.json', '/package-lock.json', '/bun.lock', '/server.js', '/supabaseClient.js', '/metadata.json'];
  const reqPath = req.path.toLowerCase();
  if (
    forbiddenPrefixes.some((p) => reqPath === p || reqPath.startsWith(p + '/')) ||
    forbiddenFiles.includes(reqPath)
  ) {
    return res.status(404).send('Not found');
  }
  next();
});

// Serve static files
app.use(express.static(__dirname));

// Shared frontend sync script & local Supabase browser SDK bundle
app.get('/site-sync.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'site-sync.js'));
});

app.get('/vendor/supabase.js', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js')
  );
});

// Specific application routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get(['/formacoes', '/catalogo', '/cursos-catalogo'], (req, res) => {
  res.sendFile(path.join(__dirname, 'forma_es_cat_logo_de_cursos_palestras_e_workshops', 'code.html'));
});

app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin_login', 'code.html'));
});

app.get(['/admin', '/painel', '/gestao'], (req, res) => {
  res.sendFile(path.join(__dirname, 'painel_admin_gest_o_e_crud_de_forma_es', 'code.html'));
});

app.get(['/cursos', '/workshops', '/palestras'], (req, res) => {
  res.sendFile(path.join(__dirname, 'cursos_palestras_e_workshops_nata_o_criativa', 'code.html'));
});

app.get(['/privacidade', '/politica-de-privacidade', '/termos'], (req, res) => {
  res.sendFile(path.join(__dirname, 'privacidade_nata_o_criativa', 'code.html'));
});

// Páginas do menu lateral
const paginasDoMenu = {
  '/conteudos': 'conteudos_nata_o_criativa',
  '/solucoes': 'solucoes_nata_o_criativa',
  '/certificados': 'certificados_nata_o_criativa',
  '/loja': 'loja_nata_o_criativa',
  '/atendimento': 'atendimento_nata_o_criativa',
};

for (const [rota, pasta] of Object.entries(paginasDoMenu)) {
  app.get(rota, (req, res) => {
    res.sendFile(path.join(__dirname, pasta, 'code.html'));
  });
}

// Suporte com a foca mascote
app.get('/mascote/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'mascote', 'widget.js'));
});
app.get('/mascote/base.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'mascote', 'base.json'));
});
app.get('/mascote/foca.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'mascote', 'foca.png'));
});

// Identidade visual (logo, fundo, favicon)
app.get('/marca/logo.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'marca', 'logo.png'));
});
app.get('/marca/favicon.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'marca', 'favicon.png'));
});
app.get('/marca/fundo.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'marca', 'fundo.jpg'));
});
app.get('/marca/tema.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'marca', 'tema.css'));
});

// Fotos dos produtos da loja
app.get('/loja/fotos/:arquivo', (req, res) => {
  if (!/^[a-z0-9][a-z0-9_-]*[.]webp$/i.test(req.params.arquivo)) return res.status(404).end();
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(path.join(__dirname, 'loja-fotos', req.params.arquivo), (erro) => {
    if (erro && !res.headersSent) res.status(404).end();
  });
});

// Script antigo de ligação direta com o Supabase (mantido para quem ainda o carrega)
app.get('/dados/site.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'site.js'));
});
app.get('/dados/catalogo.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'catalogo.js'));
});
app.get('/dados/detalhes.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'detalhes.js'));
});
app.get('/dados/filtros.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'filtros.js'));
});
app.get('/dados/extras.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'extras.js'));
});
app.get('/dados/loja.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'loja.js'));
});
app.get('/dados/loja-simulacao.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'loja-simulacao.js'));
});
app.get('/dados/painel-integracoes.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'painel-integracoes.js'));
});
app.get('/dados/painel-loja.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'painel-loja.js'));
});
app.get('/dados/solucoes.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'solucoes.js'));
});
app.get('/dados/painel-extras.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'dados', 'painel-extras.js'));
});

app.get(['/mobile'], (req, res) => {
  res.sendFile(path.join(__dirname, 'home_nata_o_criativa_mobile_otimizado', 'code.html'));
});

app.get(['/mobile/catalogo'], (req, res) => {
  res.sendFile(path.join(__dirname, 'forma_es_cat_logo_mobile', 'code.html'));
});

// ============================================================================
// AUTHENTICATION API (SUPABASE AUTH + SESSION COOKIE)
// ============================================================================
app.get('/api/auth/config', (req, res) => {
  res.json(getSupabasePublicConfig());
});

app.post('/api/auth/supabase-session', async (req, res) => {
  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      error: 'Supabase Auth não configurado neste servidor (SUPABASE_URL e SUPABASE_ANON_KEY).',
    });
  }

  const authHeader = req.headers.authorization;
  const accessToken =
    req.body?.access_token ||
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null);

  if (!accessToken) {
    return res.status(400).json({ error: 'Token de acesso Supabase não informado.' });
  }

  const db = readDb();
  const verification = await verifySupabaseAccessToken(accessToken, db.users || []);
  if (!verification.authorized) {
    return res.status(verification.status || 401).json({ error: verification.error });
  }

  const authUser = verification.user;
  if (!authUser.active) {
    return res.status(403).json({ error: 'Usuário desativado na administração.' });
  }

  const existingLocal = (db.users || []).find(
    (u) => u.email.toLowerCase() === authUser.email.toLowerCase()
  );
  if (existingLocal) {
    existingLocal.lastLoginAt = new Date().toISOString();
  }
  appendAuditLog(db, authUser, 'login', 'auth', `Login via Supabase Auth realizado por ${authUser.name}.`);
  writeDb(db);

  const token = createSessionToken(authUser);
  const remember = req.body?.remember !== false;
  const maxAge = remember ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 12;

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  res.json({
    user: authUser,
    token,
    authProvider: 'supabase',
  });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, remember } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  const db = readDb();
  const normalizedEmail = String(email).trim().toLowerCase();

  // Prefer Supabase Auth whenever SUPABASE_URL + SUPABASE_ANON_KEY are configured
  if (isSupabaseConfigured()) {
    const sbResult = await signInWithSupabasePassword(normalizedEmail, String(password), db.users || []);
    if (!sbResult.authorized) {
      return res.status(sbResult.status || 401).json({
        error: sbResult.error || 'Falha na autenticação com Supabase Auth.',
      });
    }

    const authUser = sbResult.user;
    if (!authUser.active) {
      return res.status(403).json({ error: 'Usuário desativado na administração.' });
    }

    const existingLocal = (db.users || []).find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existingLocal) {
      existingLocal.lastLoginAt = new Date().toISOString();
    }
    appendAuditLog(db, authUser, 'login', 'auth', `Login via Supabase Auth realizado por ${authUser.name}.`);
    writeDb(db);

    const token = createSessionToken(authUser);
    const maxAge = remember ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 12;
    res.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return res.json({
      user: authUser,
      token,
      session: sbResult.session,
      authProvider: 'supabase',
    });
  }

  // Fallback local auth only when Supabase env vars are not yet provisioned
  const user = (db.users || []).find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || !user.active || !verifyPassword(String(password), user.passwordHash)) {
    return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.' });
  }

  user.lastLoginAt = new Date().toISOString();
  appendAuditLog(db, user, 'login', 'auth', `Login administrativo realizado por ${user.name}.`);
  writeDb(db);

  const token = createSessionToken({ ...user, authProvider: 'local' });
  const maxAge = remember ? 1000 * 60 * 60 * 24 * 7 : 1000 * 60 * 60 * 12;

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  res.json({
    user: { ...sanitizeUser(user), authProvider: 'local' },
    token,
    authProvider: 'local',
  });
});

app.post('/api/auth/logout', (req, res) => {
  const session = extractSessionFromRequest(req);
  if (session) {
    const db = readDb();
    appendAuditLog(db, session, 'logout', 'auth', `Logout realizado por ${session.name}.`);
    writeDb(db);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const session = extractSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  const db = readDb();
  const matchedUser = (db.users || []).find(
    (u) => u.id === session.sub || u.email.toLowerCase() === String(session.email || '').toLowerCase()
  );
  if (matchedUser && !matchedUser.active) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.status(401).json({ error: 'Usuário inativo ou removido.' });
  }
  if (session.authProvider === 'supabase') {
    return res.json({
      user: {
        id: session.sub,
        email: session.email,
        name: session.name,
        role: session.role,
        title: matchedUser?.title || 'Equipe Administrativa',
        active: true,
        authProvider: 'supabase',
      },
      supabaseConfigured: isSupabaseConfigured(),
    });
  }
  if (!matchedUser) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.status(401).json({ error: 'Usuário inativo ou removido.' });
  }
  res.json({
    user: { ...sanitizeUser(matchedUser), authProvider: 'local' },
    supabaseConfigured: isSupabaseConfigured(),
  });
});

// ============================================================================
// PUBLIC API (SITE DATA, CARDUME, CERTIFICATES, INQUIRIES)
// ============================================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Natação Criativa', timestamp: new Date().toISOString() });
});

// Cópia permanente no Supabase do que chega pelos formulários públicos.
// O arquivo de dados do painel some quando a Vercel reinicia; o banco não.
const PERFIS_CARDUME = { professor: 'professor', gestor: 'gestor', familia: 'familia', aluno: 'aluno' };
function perfilCardume(valor) {
  const limpo = String(valor || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  return Object.keys(PERFIS_CARDUME).find((p) => limpo.startsWith(p)) || 'outro';
}
async function copiarParaSupabase(tabela, linha) {
  if (!supabase) return;
  try {
    let { error } = await supabase.from(tabela).insert(linha);
    if (error && (error.code === 'PGRST204' || error.code === '42703')) {
      // banco ainda sem as colunas novas: grava o que dá
      const { phone, birth_date, ...resto } = linha;
      ({ error } = await supabase.from(tabela).insert(resto));
    }
    if (error && error.code !== '23505') console.error('[supabase]', tabela, error.message);
  } catch (erro) {
    console.error('[supabase]', tabela, erro.message);
  }
}

app.get('/api/public/site', (req, res) => {
  const site = getPublicSnapshot(readDb());
  // A compra acontece só na loja deste site: nenhum link externo de compra sai daqui.
  site.storeItems = comFotosExtras(site.storeItems.map(({ buyUrl, ...item }) => item), path.join(__dirname, 'dados-antigos', 'loja-fotos-extras.json'));
  res.json(site);
});

app.post('/api/public/cardume', async (req, res) => {
  const { email, profileType, sourcePage } = req.body || {};
  const contato = camposPessoa(req.body);
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'Informe um e-mail válido.' });
  }

  await copiarParaSupabase('cardume_subscribers', {
    email: cleanEmail.slice(0, 200),
    profile_type: perfilCardume(profileType),
    source_page: String(sourcePage || 'site').slice(0, 80),
    phone: contato.phone || null,
    birth_date: contato.birthDate || null,
  });

  const db = readDb();
  const existing = (db.cardumeSubscribers || []).find((s) => s.email.toLowerCase() === cleanEmail);
  if (existing) {
    existing.status = 'ativo';
    if (profileType) existing.profileType = profileType;
    if (contato.phone) existing.phone = contato.phone;
    if (contato.birthDate) existing.birthDate = contato.birthDate;
    writeDb(db);
    return res.json({ ok: true, subscriber: existing, alreadySubscribed: true });
  }

  const subscriber = {
    id: `sub-${crypto.randomUUID().slice(0, 8)}`,
    email: cleanEmail,
    profileType: profileType || 'professor',
    ...contato,
    sourcePage: sourcePage || 'site',
    status: 'ativo',
    subscribedAt: new Date().toISOString(),
  };
  db.cardumeSubscribers = db.cardumeSubscribers || [];
  db.cardumeSubscribers.unshift(subscriber);
  writeDb(db);

  res.status(201).json({ ok: true, subscriber });
});

app.post('/api/public/inquiries', async (req, res) => {
  const { name, email, profileType, subject, message, type } = req.body || {};
  if (!name || !message) {
    return res.status(400).json({ error: 'Nome e mensagem são obrigatórios.' });
  }
  const db = readDb();
  const inquiry = {
    id: `inq-${crypto.randomUUID().slice(0, 8)}`,
    type: type || 'suporte',
    name: String(name).trim(),
    email: String(email || 'não-informado@site').trim(),
    profileType: String(profileType || 'Visitante').trim(),
    subject: String(subject || 'Atendimento pelo site').trim(),
    message: String(message).trim(),
    status: 'novo',
    createdAt: new Date().toISOString(),
  };
  db.inquiries = db.inquiries || [];
  db.inquiries.unshift(inquiry);
  writeDb(db);

  await copiarParaSupabase('inquiries', {
    inquiry_type: ['aula_particular', 'sugestao_tema', 'consultoria_academia', 'suporte'].includes(inquiry.type) ? inquiry.type : 'suporte',
    name: inquiry.name.slice(0, 120),
    email: inquiry.email.slice(0, 200),
    profile_type: inquiry.profileType.slice(0, 40),
    subject: inquiry.subject.slice(0, 160),
    message: inquiry.message.slice(0, 4000),
  });
  res.status(201).json({ ok: true, inquiry });
});

app.post('/api/public/certificates/verify', (req, res) => {
  const code = String(req.body?.code || req.query?.code || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ error: 'Informe o código do certificado.' });
  }
  const db = readDb();
  const cert = (db.certificates || []).find((c) => c.validationCode.toUpperCase() === code);
  if (!cert) {
    return res.status(404).json({ valid: false, error: 'Certificado não encontrado para este código.' });
  }
  res.json({ valid: cert.isValid, certificate: dadosCertificado(db, cert) });
});

// ============================================================================
// ADMIN OVERVIEW & CRUD API (PROTECTED)
// ============================================================================
app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const db = readDb();
  const courses = db.courses || [];
  const openCourses = courses.filter((c) => c.status === 'aberto');
  const totalCapacity = courses.reduce((acc, c) => acc + Number(c.maxCapacity || 0), 0);
  const totalEnrolled = courses.reduce((acc, c) => acc + Number(c.enrolledCount || 0), 0);
  const fillRate = totalCapacity > 0 ? ((totalEnrolled / totalCapacity) * 100).toFixed(1) : '0.0';

  res.json({
    kpis: {
      totalCourses: courses.length,
      openCourses: openCourses.length,
      totalCapacity,
      totalEnrolled,
      fillRate,
      activeSubscribers: (db.cardumeSubscribers || []).filter((s) => s.status === 'ativo').length,
      openInquiries: (db.inquiries || []).filter((i) => i.status !== 'resolvido').length,
      issuedCertificates: (db.certificates || []).filter((c) => c.isValid).length,
      publishedTestimonials: (db.testimonials || []).filter((t) => t.published).length,
    },
    courses,
    highlights: db.highlights || [],
    contents: db.contents || [],
    storeItems: db.storeItems || [],
    partners: db.partners || [],
    leads: db.leads || [],
    testimonials: db.testimonials || [],
    certificates: db.certificates || [],
    cardumeSubscribers: db.cardumeSubscribers || [],
    inquiries: db.inquiries || [],
    users: (db.users || []).map(sanitizeUser),
    settings: db.settings,
    privacyPolicy: db.privacyPolicy,
    auditLogs: db.auditLogs || [],
  });
});

// --- COURSES CRUD ---
app.get('/api/admin/courses', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({ items: db.courses || [] });
});

app.post('/api/admin/courses', requireAdmin, (req, res) => {
  const body = req.body || {};
  if (!body.title) {
    return res.status(400).json({ error: 'Título da formação é obrigatório.' });
  }
  let agenda;
  try {
    agenda = montarAgenda(body, {});
  } catch (erro) {
    if (erro instanceof ErroDeAgenda) return res.status(400).json({ error: erro.message });
    throw erro;
  }
  const db = readDb();

  const course = {
    id: `crs-${crypto.randomUUID().slice(0, 8)}`,
    code: String(body.code || `FOR-${new Date().getFullYear()}-${String((db.courses?.length || 0) + 1).padStart(2, '0')}`).toUpperCase(),
    title: String(body.title).trim(),
    subtitle: String(body.subtitle || '').trim(),
    description: String(body.description || body.subtitle || 'Formação da Plataforma Natação Criativa.').trim(),
    category: String(body.category || 'Curso Prático').trim(),
    theme: String(body.theme || 'geral').trim(),
    format: String(body.format || 'Online Híbrido').trim(),
    modalityDetails: String(body.modalityDetails || 'Plataforma Digital Natação Criativa').trim(),
    locationOrUrl: String(body.locationOrUrl || 'Online').trim(),
    workload: String(body.workload || '20h certificadas').trim(),
    status: String(body.status || 'rascunho').trim(),
    isFree: Boolean(body.isFree),
    enrolledCount: Number(body.enrolledCount || 0),
    maxCapacity: Number(body.maxCapacity || 50),
    waitlistCount: Number(body.waitlistCount || 0),
    priceFormatted: String(body.priceFormatted || (body.isFree ? 'R$ 0,00' : 'R$ 297,00')).trim(),
    installmentInfo: String(body.installmentInfo || '').trim(),
    lotSummary: String(body.lotSummary || '1º Lote').trim(),
    certificateBadge: String(body.certificateBadge || 'Certificado Incluso').trim(),
    coverUrl: String(body.coverUrl || '').trim(),
    lots: Array.isArray(body.lots) ? body.lots : [],
    featured: Boolean(body.featured),
    ...agenda,
    ...camposCurso(body, {}),
    updatedAt: new Date().toISOString(),
  };

  db.courses = db.courses || [];
  db.courses.unshift(course);
  appendAuditLog(db, req.adminUser, 'created', 'courses', `Formação criada: ${course.title} (${course.code}).`);
  writeDb(db);
  res.status(201).json({ item: course });
});

app.put('/api/admin/courses/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = (db.courses || []).findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Formação não encontrada.' });

  const prev = db.courses[idx];
  const body = req.body || {};
  let agenda;
  try {
    agenda = montarAgenda(body, prev);
  } catch (erro) {
    if (erro instanceof ErroDeAgenda) return res.status(400).json({ error: erro.message });
    throw erro;
  }

  const updated = {
    ...prev,
    ...body,
    ...agenda,
    ...camposCurso(body, prev),
    id: prev.id,
    enrolledCount: body.enrolledCount !== undefined ? Number(body.enrolledCount) : prev.enrolledCount,
    maxCapacity: body.maxCapacity !== undefined ? Number(body.maxCapacity) : prev.maxCapacity,
    updatedAt: new Date().toISOString(),
  };
  db.courses[idx] = updated;
  appendAuditLog(db, req.adminUser, 'updated', 'courses', `Formação atualizada: ${updated.title} (${updated.status}).`);
  writeDb(db);
  res.json({ item: updated });
});

app.post('/api/admin/courses/:id/duplicate', requireAdmin, (req, res) => {
  const db = readDb();
  const orig = (db.courses || []).find((c) => c.id === req.params.id);
  if (!orig) return res.status(404).json({ error: 'Formação não encontrada.' });

  const copy = {
    ...structuredClone(orig),
    id: `crs-${crypto.randomUUID().slice(0, 8)}`,
    code: `${orig.code}-CPY`,
    title: `${orig.title} (Cópia)`,
    status: 'rascunho',
    enrolledCount: 0,
    updatedAt: new Date().toISOString(),
  };
  db.courses.unshift(copy);
  appendAuditLog(db, req.adminUser, 'duplicated', 'courses', `Formação duplicada a partir de ${orig.code}.`);
  writeDb(db);
  res.status(201).json({ item: copy });
});

app.patch('/api/admin/courses/bulk', requireAdmin, (req, res) => {
  const { ids, action, status } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: 'Selecione ao menos uma formação.' });
  }
  const db = readDb();
  if (action === 'delete') {
    db.courses = (db.courses || []).filter((c) => !ids.includes(c.id));
    appendAuditLog(db, req.adminUser, 'deleted', 'courses', `Exclusão em massa de ${ids.length} formações.`);
  } else if (action === 'status' && status) {
    (db.courses || []).forEach((c) => {
      if (ids.includes(c.id)) {
        c.status = status;
        c.updatedAt = new Date().toISOString();
      }
    });
    appendAuditLog(db, req.adminUser, 'status_changed', 'courses', `Status alterado para "${status}" em ${ids.length} formações.`);
  } else {
    return res.status(400).json({ error: 'Ação em massa inválida.' });
  }
  writeDb(db);
  res.json({ ok: true, items: db.courses });
});

app.delete('/api/admin/courses/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const target = (db.courses || []).find((c) => c.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'Formação não encontrada.' });
  db.courses = db.courses.filter((c) => c.id !== req.params.id);
  appendAuditLog(db, req.adminUser, 'deleted', 'courses', `Formação excluída: ${target.title}.`);
  writeDb(db);
  res.json({ ok: true });
});

// --- HIGHLIGHTS (HERO CAROUSEL) CRUD ---
app.post('/api/admin/highlights', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: 'Título do destaque é obrigatório.' });
  const db = readDb();
  const item = {
    id: `hl-${crypto.randomUUID().slice(0, 8)}`,
    badge: String(b.badge || 'DESTAQUE').toUpperCase(),
    title: String(b.title).trim(),
    subtitle: String(b.subtitle || '').trim(),
    ctaLabel: String(b.ctaLabel || 'Saiba mais').trim(),
    ctaUrl: String(b.ctaUrl || '/formacoes').trim(),
    trustBadge: String(b.trustBadge || 'Plataforma Natação Criativa').trim(),
    imageCaption: String(b.imageCaption || '').trim(),
    imageUrl: String(b.imageUrl || '').trim(),
    sortOrder: Number(b.sortOrder || (db.highlights?.length || 0) + 1),
    active: b.active !== false,
  };
  db.highlights = db.highlights || [];
  db.highlights.push(item);
  appendAuditLog(db, req.adminUser, 'created', 'highlights', `Destaque adicionado: ${item.title}.`);
  writeDb(db);
  res.status(201).json({ item });
});

app.put('/api/admin/highlights/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = (db.highlights || []).findIndex((h) => h.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Destaque não encontrado.' });
  db.highlights[idx] = { ...db.highlights[idx], ...req.body, id: req.params.id };
  appendAuditLog(db, req.adminUser, 'updated', 'highlights', `Destaque atualizado: ${db.highlights[idx].title}.`);
  writeDb(db);
  res.json({ item: db.highlights[idx] });
});

app.delete('/api/admin/highlights/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.highlights = (db.highlights || []).filter((h) => h.id !== req.params.id);
  appendAuditLog(db, req.adminUser, 'deleted', 'highlights', `Destaque removido (${req.params.id}).`);
  writeDb(db);
  res.json({ ok: true });
});

// --- CONTENTS CRUD ---
app.post('/api/admin/contents', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: 'Título do conteúdo é obrigatório.' });
  const db = readDb();
  const item = {
    id: `cnt-${crypto.randomUUID().slice(0, 8)}`,
    channel: String(b.channel || 'artigo').trim(),
    title: String(b.title).trim(),
    summary: String(b.summary || '').trim(),
    badgeMeta: String(b.badgeMeta || '').trim(),
    externalUrl: String(b.externalUrl || '/conteudos').trim(),
    ctaLabel: String(b.ctaLabel || 'Acessar').trim(),
    published: b.published !== false,
    updatedAt: new Date().toISOString(),
  };
  db.contents = db.contents || [];
  db.contents.unshift(item);
  appendAuditLog(db, req.adminUser, 'created', 'contents', `Conteúdo criado: ${item.title}.`);
  writeDb(db);
  res.status(201).json({ item });
});

app.put('/api/admin/contents/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = (db.contents || []).findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Conteúdo não encontrado.' });
  db.contents[idx] = { ...db.contents[idx], ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  appendAuditLog(db, req.adminUser, 'updated', 'contents', `Conteúdo atualizado: ${db.contents[idx].title}.`);
  writeDb(db);
  res.json({ item: db.contents[idx] });
});

app.delete('/api/admin/contents/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.contents = (db.contents || []).filter((c) => c.id !== req.params.id);
  appendAuditLog(db, req.adminUser, 'deleted', 'contents', `Conteúdo excluído (${req.params.id}).`);
  writeDb(db);
  res.json({ ok: true });
});

// --- STORE ITEMS CRUD ---
app.post('/api/admin/store-items', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
  const db = readDb();
  const item = {
    id: `str-${crypto.randomUUID().slice(0, 8)}`,
    category: String(b.category || 'ebook').trim(),
    title: String(b.title).trim(),
    summary: String(b.summary || '').trim(),
    badge: String(b.badge || 'Digital').trim(),
    price: String(b.price || 'R$ 47').trim(),
    delivery: String(b.delivery || 'Entrega imediata por e-mail').trim(),
    ...camposLoja(b),
    active: b.active !== false,
  };
  db.storeItems = db.storeItems || [];
  db.storeItems.unshift(item);
  appendAuditLog(db, req.adminUser, 'created', 'store', `Material adicionado à loja: ${item.title}.`);
  writeDb(db);
  res.status(201).json({ item });
});

app.put('/api/admin/store-items/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = (db.storeItems || []).findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Material não encontrado.' });
  db.storeItems[idx] = {
    ...db.storeItems[idx],
    ...req.body,
    buyUrl: undefined,
    id: req.params.id,
  };
  appendAuditLog(db, req.adminUser, 'updated', 'store', `Material atualizado: ${db.storeItems[idx].title}.`);
  writeDb(db);
  res.json({ item: db.storeItems[idx] });
});

app.delete('/api/admin/store-items/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.storeItems = (db.storeItems || []).filter((s) => s.id !== req.params.id);
  appendAuditLog(db, req.adminUser, 'deleted', 'store', `Material removido (${req.params.id}).`);
  writeDb(db);
  res.json({ ok: true });
});

// --- TESTIMONIALS CRUD ---
app.post('/api/admin/testimonials', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.authorName || !b.quote) return res.status(400).json({ error: 'Autor e depoimento são obrigatórios.' });
  const db = readDb();
  const item = {
    id: `tst-${crypto.randomUUID().slice(0, 8)}`,
    authorName: String(b.authorName).trim(),
    authorRoleLocation: String(b.authorRoleLocation || 'Profissional Aquático').trim(),
    quote: String(b.quote).trim(),
    verified: b.verified !== false,
    published: b.published !== false,
    sortOrder: Number(b.sortOrder || (db.testimonials?.length || 0) + 1),
  };
  db.testimonials = db.testimonials || [];
  db.testimonials.unshift(item);
  appendAuditLog(db, req.adminUser, 'created', 'testimonials', `Depoimento criado: ${item.authorName}.`);
  writeDb(db);
  res.status(201).json({ item });
});

app.put('/api/admin/testimonials/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = (db.testimonials || []).findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Depoimento não encontrado.' });
  db.testimonials[idx] = { ...db.testimonials[idx], ...req.body, id: req.params.id };
  appendAuditLog(db, req.adminUser, 'updated', 'testimonials', `Depoimento atualizado: ${db.testimonials[idx].authorName}.`);
  writeDb(db);
  res.json({ item: db.testimonials[idx] });
});

app.delete('/api/admin/testimonials/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.testimonials = (db.testimonials || []).filter((t) => t.id !== req.params.id);
  appendAuditLog(db, req.adminUser, 'deleted', 'testimonials', `Depoimento removido (${req.params.id}).`);
  writeDb(db);
  res.json({ ok: true });
});

// --- CERTIFICATES CRUD ---
app.post('/api/admin/certificates', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (!b.recipientName || !b.courseTitle) {
    return res.status(400).json({ error: 'Nome do aluno e formação são obrigatórios.' });
  }
  const db = readDb();
  const code = String(
    b.validationCode || `NC-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 899999))}`
  )
    .trim()
    .toUpperCase();
  const item = {
    id: `crt-${crypto.randomUUID().slice(0, 8)}`,
    validationCode: code,
    recipientName: String(b.recipientName).trim(),
    courseTitle: String(b.courseTitle).trim(),
    workloadHours: Number(b.workloadHours || 20),
    chancelaInfo: String(b.chancelaInfo || 'Conformidade CREF / Natação Criativa').trim(),
    issuedAt: String(b.issuedAt || new Date().toISOString().slice(0, 10)),
    isValid: b.isValid !== false,
    ...camposCertificado(b),
    ...contatoCertificado(b),
  };
  db.certificates = db.certificates || [];
  db.certificates.unshift(item);
  appendAuditLog(db, req.adminUser, 'created', 'certificates', `Certificado emitido: ${item.validationCode} (${item.recipientName}).`);
  writeDb(db);
  res.status(201).json({ item });
});

app.put('/api/admin/certificates/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = (db.certificates || []).findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Certificado não encontrado.' });
  if (req.body?.cpf && !cpfValido(req.body.cpf)) return res.status(400).json({ error: 'CPF inválido.' });
  const { cpf, cpfHash, cpfFinal, ...dadosCert } = req.body || {};
  db.certificates[idx] = { ...db.certificates[idx], ...dadosCert, ...contatoCertificado(req.body, db.certificates[idx]), id: req.params.id };
  appendAuditLog(db, req.adminUser, 'updated', 'certificates', `Certificado atualizado: ${db.certificates[idx].validationCode}.`);
  writeDb(db);
  res.json({ item: db.certificates[idx] });
});

app.delete('/api/admin/certificates/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.certificates = (db.certificates || []).filter((c) => c.id !== req.params.id);
  appendAuditLog(db, req.adminUser, 'deleted', 'certificates', `Certificado excluído (${req.params.id}).`);
  writeDb(db);
  res.json({ ok: true });
});

// --- CARDUME SUBSCRIBERS CRUD ---
app.post('/api/admin/cardume', requireAdmin, (req, res) => {
  const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) return res.status(400).json({ error: 'E-mail inválido.' });
  const db = readDb();
  if ((db.cardumeSubscribers || []).some((s) => s.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'E-mail já cadastrado no Cardume.' });
  }
  const item = {
    id: `sub-${crypto.randomUUID().slice(0, 8)}`,
    email: cleanEmail,
    profileType: String(req.body?.profileType || 'professor'),
    ...camposPessoa(req.body),
    sourcePage: 'admin',
    status: 'ativo',
    subscribedAt: new Date().toISOString(),
  };
  db.cardumeSubscribers.unshift(item);
  appendAuditLog(db, req.adminUser, 'created', 'cardume', `Inscrito adicionado ao Cardume: ${cleanEmail}.`);
  writeDb(db);
  res.status(201).json({ item });
});

app.patch('/api/admin/cardume/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = (db.cardumeSubscribers || []).findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Inscrito não encontrado.' });
  db.cardumeSubscribers[idx] = { ...db.cardumeSubscribers[idx], ...req.body, id: req.params.id };
  writeDb(db);
  res.json({ item: db.cardumeSubscribers[idx] });
});

app.delete('/api/admin/cardume/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.cardumeSubscribers = (db.cardumeSubscribers || []).filter((s) => s.id !== req.params.id);
  appendAuditLog(db, req.adminUser, 'deleted', 'cardume', `Inscrito removido do Cardume (${req.params.id}).`);
  writeDb(db);
  res.json({ ok: true });
});

// --- INQUIRIES CRUD ---
app.patch('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const idx = (db.inquiries || []).findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Atendimento não encontrado.' });
  db.inquiries[idx] = { ...db.inquiries[idx], ...req.body, id: req.params.id };
  appendAuditLog(db, req.adminUser, 'updated', 'inquiries', `Atendimento atualizado (${db.inquiries[idx].name}: ${db.inquiries[idx].status}).`);
  writeDb(db);
  res.json({ item: db.inquiries[idx] });
});

app.delete('/api/admin/inquiries/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.inquiries = (db.inquiries || []).filter((i) => i.id !== req.params.id);
  appendAuditLog(db, req.adminUser, 'deleted', 'inquiries', `Atendimento excluído (${req.params.id}).`);
  writeDb(db);
  res.json({ ok: true });
});

// --- USERS & PERMISSIONS CRUD ---
app.post('/api/admin/users', requireAdmin, async (req, res) => {
  if (req.adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem gerenciar usuários.' });
  }
  const { name, email, role, title, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!name || !cleanEmail || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  }
  const db = readDb();
  if ((db.users || []).some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
  }
  const resolvedRole = ['admin', 'coordinator', 'editor'].includes(role) ? role : 'editor';

  // Provision user in Supabase Auth automatically when SUPABASE_SERVICE_ROLE_KEY is configured
  const sbProvision = await syncSupabaseAdminUser({
    name: String(name).trim(),
    email: cleanEmail,
    password: String(password),
    role: resolvedRole,
  });
  if (sbProvision.error) {
    return res.status(400).json({ error: `Erro no Supabase Auth: ${sbProvision.error}` });
  }

  const user = {
    id: sbProvision.user?.id || `usr-${crypto.randomUUID().slice(0, 8)}`,
    name: String(name).trim(),
    email: cleanEmail,
    role: resolvedRole,
    title: String(title || 'Equipe Natação Criativa').trim(),
    active: true,
    passwordHash: hashPassword(String(password)),
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.users.push(user);
  appendAuditLog(
    db,
    req.adminUser,
    'created',
    'users',
    `Usuário criado: ${user.name} (${user.role})${sbProvision.user ? ' + Supabase Auth' : ''}.`
  );
  writeDb(db);
  res.status(201).json({ item: sanitizeUser(user), supabaseProvisioned: Boolean(sbProvision.user) });
});

app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  if (req.adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem editar usuários.' });
  }
  const db = readDb();
  const idx = (db.users || []).findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuário não encontrado.' });

  const prev = db.users[idx];
  const { name, role, title, active, password } = req.body || {};
  const updated = {
    ...prev,
    name: name !== undefined ? String(name).trim() : prev.name,
    role: role && ['admin', 'coordinator', 'editor'].includes(role) ? role : prev.role,
    title: title !== undefined ? String(title).trim() : prev.title,
    active: active !== undefined ? Boolean(active) : prev.active,
    passwordHash: password ? hashPassword(String(password)) : prev.passwordHash,
    updatedAt: new Date().toISOString(),
  };

  // O login é feito pelo Supabase Auth: a troca de senha, nome ou papel precisa valer lá também.
  const sbSync = await syncSupabaseAdminUser({
    name: updated.name,
    email: updated.email,
    password: password ? String(password) : null,
    role: updated.role,
  });
  if (sbSync.error) {
    return res.status(400).json({ error: `Não foi possível atualizar o login no Supabase: ${sbSync.error}` });
  }

  db.users[idx] = updated;
  appendAuditLog(
    db,
    req.adminUser,
    'updated',
    'users',
    `Usuário atualizado: ${updated.name} (${updated.role})${sbSync.passwordChanged ? ' + senha no Supabase Auth' : ''}.`
  );
  writeDb(db);
  res.json({ item: sanitizeUser(updated), supabaseSynced: Boolean(sbSync.user), loginCreated: Boolean(sbSync.created) });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  if (req.adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem excluir usuários.' });
  }
  if (req.params.id === req.adminUser.sub) {
    return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário logado.' });
  }
  const db = readDb();
  db.users = (db.users || []).filter((u) => u.id !== req.params.id);
  appendAuditLog(db, req.adminUser, 'deleted', 'users', `Usuário removido (${req.params.id}).`);
  writeDb(db);
  res.json({ ok: true });
});

// --- SITE SETTINGS & PRIVACY POLICY CRUD ---
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({ settings: db.settings });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const db = readDb();
  db.settings = {
    ...db.settings,
    ...req.body,
    experienceYears: Number(req.body?.experienceYears ?? db.settings.experienceYears),
    certificatesIssued: Number(req.body?.certificatesIssued ?? db.settings.certificatesIssued),
    studentsImpacted: Number(req.body?.studentsImpacted ?? db.settings.studentsImpacted),
    ebooksPublished: Number(req.body?.ebooksPublished ?? db.settings.ebooksPublished),
    coursesAvailable: Number(req.body?.coursesAvailable ?? db.settings.coursesAvailable),
    lastPublishedAt: new Date().toISOString(),
  };
  appendAuditLog(db, req.adminUser, 'updated', 'settings', 'Configurações e métricas do site atualizadas.');
  writeDb(db);
  res.json({ settings: db.settings });
});

app.get('/api/admin/privacy', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({ privacyPolicy: db.privacyPolicy });
});

app.put('/api/admin/privacy', requireAdmin, (req, res) => {
  const db = readDb();
  const body = req.body || {};
  db.privacyPolicy = {
    ...db.privacyPolicy,
    ...body,
    sections: Array.isArray(body.sections) ? body.sections : db.privacyPolicy.sections,
    updatedAt: body.updatedAt || new Date().toISOString().slice(0, 10),
  };
  appendAuditLog(
    db,
    req.adminUser,
    'updated',
    'privacy_policy',
    `Política de Privacidade (v${db.privacyPolicy.version}) atualizada.`
  );
  writeDb(db);
  res.json({ privacyPolicy: db.privacyPolicy });
});

// --- PUBLISH SITE & SYNC MASCOT KNOWLEDGE ---
app.post('/api/admin/site/publish', requireAdmin, (req, res) => {
  const db = readDb();
  db.settings.lastPublishedAt = new Date().toISOString();

  // Keep mascot knowledge base synced with published courses, contents, store, and privacy
  try {
    const baseFile = path.join(__dirname, 'mascote', 'base.json');
    const existingBase = fs.existsSync(baseFile) ? JSON.parse(fs.readFileSync(baseFile, 'utf8')) : [];
    const fixedEntries = existingBase.filter((e) => !e.p);
    const dynamicEntries = [
      ...(db.courses || [])
        .filter((c) => c.status !== 'rascunho')
        .map((c) => ({
          t: c.title,
          l: '/formacoes',
          p: 'Formações',
          k: `${c.status} ${c.category} ${c.format} ${c.instructor}`,
          r: `${c.description} · ${c.format} · ${c.workload} · ${c.priceFormatted}`,
        })),
      ...(db.contents || [])
        .filter((c) => c.published)
        .map((c) => ({
          t: c.title,
          l: '/conteudos',
          p: 'Conteúdos',
          k: `${c.channel} ${c.badgeMeta}`,
          r: `${c.summary} · ${c.badgeMeta}`,
        })),
      ...(db.storeItems || [])
        .filter((s) => s.active)
        .map((s) => ({
          t: s.title,
          l: '/loja',
          p: 'Loja',
          k: `${s.category} ${s.badge} ${s.price}`,
          r: `${s.summary} · ${s.delivery} · ${s.price}`,
        })),
      {
        t: db.privacyPolicy.title,
        l: '/privacidade',
        p: 'Privacidade',
        k: 'lgpd privacidade dados cookies termos dpo',
        r: `${db.privacyPolicy.summary} Encarregado (DPO): ${db.privacyPolicy.dpoEmail}.`,
      },
    ];
    fs.writeFileSync(baseFile, JSON.stringify([...fixedEntries, ...dynamicEntries], null, 1), 'utf8');
  } catch {
    // Non-fatal if mascot base update fails
  }

  appendAuditLog(db, req.adminUser, 'published', 'site', 'Atualização geral do site e base de conhecimento publicada.');
  writeDb(db);
  res.json({ ok: true, lastPublishedAt: db.settings.lastPublishedAt });
});

app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({ items: db.auditLogs || [] });
});

app.get('/api/admin/export/:resource', requireAdmin, (req, res) => {
  const db = readDb();
  const resource = req.params.resource;
  let rows = [];
  let headers = [];

  if (resource === 'courses') {
    headers = ['Codigo', 'Titulo', 'Categoria', 'Formato', 'Instrutor', 'Status', 'Inscritos', 'Capacidade', 'Investimento', 'Inicio'];
    rows = (db.courses || []).map((c) => [
      c.code,
      c.title,
      c.category,
      c.format,
      c.instructor,
      c.status,
      c.enrolledCount,
      c.maxCapacity,
      c.priceFormatted,
      c.startDateLabel,
    ]);
  } else if (resource === 'cardume') {
    headers = ['Email', 'Telefone', 'Nascimento', 'Perfil', 'Origem', 'Status', 'Data'];
    rows = (db.cardumeSubscribers || []).map((s) => [s.email, s.phone, s.birthDate, s.profileType, s.sourcePage, s.status, s.subscribedAt]);
  } else if (resource === 'leads') {
    headers = ['Nome', 'Email', 'Telefone', 'Nascimento', 'Formacao', 'Data'];
    rows = (db.leads || []).map((l) => [l.name, l.email, l.phone, l.birthDate, l.courseTitle, l.createdAt]);
  } else if (resource === 'inquiries') {
    headers = ['Nome', 'Email', 'Perfil', 'Assunto', 'Status', 'Mensagem', 'Data'];
    rows = (db.inquiries || []).map((i) => [i.name, i.email, i.profileType, i.subject, i.status, i.message, i.createdAt]);
  } else if (resource === 'certificates') {
    headers = ['Codigo', 'Aluno', 'Formacao', 'CargaHoraria', 'Valido', 'Emissao'];
    rows = (db.certificates || []).map((c) => [c.validationCode, c.recipientName, c.courseTitle, c.workloadHours, c.isValid, c.issuedAt]);
  } else {
    return res.status(400).json({ error: 'Recurso de exportação inválido.' });
  }

  const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="natacao-criativa-${resource}.csv"`);
  res.send('\uFEFF' + csv);
});

// Fallback to index.html
registrarExtras(app, {
  requireAdmin,
  readDb,
  writeDb,
  appendAuditLog,
  arquivoLojaAntiga: path.join(__dirname, 'dados-antigos', 'loja.json'),
  arquivoCursos: path.join(__dirname, 'dados-antigos', 'cursos-ativeplay.json'),
  arquivoProfessores: path.join(__dirname, 'dados-antigos', 'professores-cursos.json'),
});

registrarLoja(app, { requireAdmin, readDb, writeDb, appendAuditLog });
registrarIntegracoes(app, { requireAdmin, readDb, writeDb, appendAuditLog, enviarEmail: enviarSmtp });

// Leitura direta do banco Supabase: /api/status, /api/cursos, /api/certificados/:codigo...
app.use('/api', api);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`[Natação Criativa] Server active on http://${HOST}:${PORT}`);
});
