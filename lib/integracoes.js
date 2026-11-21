// Integrações editáveis no painel: Asaas, e-mail e dados da hospedagem.
// Tudo fica criptografado num arquivo do bucket PRIVADO. Fora das variáveis da Vercel,
// só o servidor lê; senhas e chaves nunca voltam para o navegador.
import crypto from 'node:crypto';
import { createSupabaseServiceClient } from './supabaseAuth.js';

const BUCKET = 'painel-admin';
const CAMINHO = 'dados/integracoes.enc.json';
const VALIDADE_MS = 15000;
const SEGREDOS = ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN', 'SMTP_PASS', 'INSTAGRAM_ACCESS_TOKEN'];
const TEXTOS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'EMAIL_FROM', 'LOJA_EMAIL_AVISO', 'SITE_URL', 'HOSPEDAGEM_EMPRESA', 'HOSPEDAGEM_LINK', 'HOSPEDAGEM_USUARIO', 'HOSPEDAGEM_NOTAS'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const API_ASAAS = { producao: 'https://api.asaas.com/v3', sandbox: 'https://api-sandbox.asaas.com/v3' };
const EVENTOS_ASAAS = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'];
const CAMPOS_ASAAS = ['ASAAS_API_KEY', 'ASAAS_AMBIENTE', 'ASAAS_WEBHOOK_TOKEN', 'ASAAS_WEBHOOK_ID', 'ASAAS_CONTA'];
// O Asaas recusa token com espaço, sequência numérica ou letra repetida: base64url aleatório passa.
const novoTokenAsaas = () => crypto.randomBytes(36).toString('base64url');
function chamarAsaas(k, ambiente, caminho, init = {}) {
  return fetch(API_ASAAS[ambiente] + caminho, {
    ...init,
    headers: { access_token: k, 'Content-Type': 'application/json', 'User-Agent': 'site-natacao-criativa' },
    signal: AbortSignal.timeout(10000),
  });
}
async function erroAsaas(r) {
  const t = await r.text().catch(() => '');
  try { return String(JSON.parse(t).errors?.[0]?.description || t).slice(0, 200); } catch { return t.slice(0, 200); }
}

let armazenamento = null;
let dados = {};
let meta = {};
let lidoEm = 0;
let problema = null; // 'leitura' ou 'chave'
let chaveCache = null;

function chave() {
  const base = process.env.ADMIN_SESSION_SECRET;
  if (!base) return null;
  if (chaveCache?.base !== base) chaveCache = { base, k: crypto.scryptSync(base, 'nc-integracoes-v1', 32) };
  return chaveCache.k;
}
function cifrar(obj) {
  const k = chave();
  if (!k) throw new Error('sem ADMIN_SESSION_SECRET');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', k, iv);
  const corpo = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), dados: corpo.toString('base64') });
}
function decifrar(texto) {
  const k = chave();
  if (!k) throw new Error('sem ADMIN_SESSION_SECRET');
  const a = JSON.parse(texto);
  const d = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(a.iv, 'base64'));
  d.setAuthTag(Buffer.from(a.tag, 'base64'));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(a.dados, 'base64')), d.final()]).toString('utf8'));
}

function armazenamentoSupabase() {
  const cliente = createSupabaseServiceClient();
  if (!cliente) return null;
  const base = String(process.env.SUPABASE_URL).replace(/\/+$/, '');
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const opcoes = { upsert: true, contentType: 'application/json', cacheControl: '0' };
  return {
    // Leitura sem cache, para uma troca de chave valer em todos os servidores.
    async ler() {
      const r = await fetch(`${base}/storage/v1/object/authenticated/${BUCKET}/${CAMINHO}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { apikey: k, Authorization: `Bearer ${k}`, 'Cache-Control': 'no-cache' },
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) return r.text();
      const erro = await r.text();
      if (r.status === 404 || /not.?found/i.test(erro)) return null;
      throw new Error(`Storage respondeu ${r.status}`);
    },
    async gravar(texto) {
      const { error } = await cliente.storage.from(BUCKET).upload(CAMINHO, Buffer.from(texto, 'utf8'), opcoes);
      if (error) throw error;
    },
    async guardarCopia(texto) {
      const { error } = await cliente.storage.from(BUCKET).upload(`dados/integracoes.copia-${Date.now()}.enc.json`, Buffer.from(texto, 'utf8'), opcoes);
      if (error) throw error;
    },
  };
}
const banco = () => armazenamento || (armazenamento = armazenamentoSupabase());
export function usarArmazenamentoIntegracoes(a) { armazenamento = a; dados = {}; meta = {}; lidoEm = 0; problema = null; }

export async function carregarIntegracoes({ forcar = false } = {}) {
  if (!forcar && lidoEm && Date.now() - lidoEm < VALIDADE_MS) return;
  const a = banco();
  if (!a) { lidoEm = Date.now(); return; }
  let texto;
  try {
    texto = await a.ler();
  } catch (e) {
    // Falha passageira: segue com a última versão conhecida.
    problema = 'leitura';
    console.error('[integracoes] leitura', e?.message);
    if (forcar) throw e;
    return;
  }
  if (texto === null) { dados = {}; meta = {}; problema = null; lidoEm = Date.now(); return; }
  try {
    const o = decifrar(texto);
    dados = o.valores || {};
    meta = o.meta || {};
    problema = null;
  } catch (e) {
    dados = {};
    meta = {};
    problema = 'chave';
    console.error('[integracoes] não foi possível abrir o arquivo');
  }
  lidoEm = Date.now();
}

// O que foi salvo no painel vale primeiro; sem isso, usa a variável da Vercel.
export const valorIntegracao = (nome) => {
  const v = dados[nome];
  return v !== undefined && v !== '' ? v : (process.env[nome] || '');
};
const origem = (nome) => (dados[nome] ? 'painel' : process.env[nome] ? 'vercel' : '');

function ambienteInterno() {
  const k = valorIntegracao('ASAAS_API_KEY');
  if (!k) return '';
  const salvo = String(valorIntegracao('ASAAS_AMBIENTE')).toLowerCase();
  if (salvo) return salvo === 'producao' ? 'producao' : 'sandbox';
  return /hmlg/i.test(k) ? 'sandbox' : 'producao';
}
function ambienteAsaas() {
  const a = ambienteInterno();
  return a ? (a === 'sandbox' ? 'teste' : 'produção') : '';
}

export function registrarIntegracoes(app, { requireAdmin, readDb, writeDb, appendAuditLog, enviarEmail }) {
  const somenteAdmin = (req, res, next) => {
    if (req.adminUser?.role !== 'admin') return res.status(403).json({ error: 'Só administradores podem ver e alterar as integrações.' });
    next();
  };
  const site = (req) => valorIntegracao('SITE_URL') || `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const estado = (req) => ({
    textos: Object.fromEntries(TEXTOS.map((k) => [k, valorIntegracao(k)])),
    segredos: Object.fromEntries(SEGREDOS.map((k) => [k, {
      configurado: Boolean(valorIntegracao(k)),
      origem: origem(k),
      final: k === 'ASAAS_API_KEY' && valorIntegracao(k) ? valorIntegracao(k).slice(-4) : '',
    }])),
    ambienteAsaas: ambienteAsaas(),
    asaasConta: valorIntegracao('ASAAS_CONTA'),
    asaasAvisoOk: Boolean(valorIntegracao('ASAAS_WEBHOOK_TOKEN')),
    webhookUrl: `${site(req)}/api/webhooks/asaas`,
    atualizadoEm: meta.em || '',
    atualizadoPor: meta.por || '',
    problema,
    podeSalvar: Boolean(chave() && banco()),
  });

  async function gravarValores(req, novos, limpar) {
    const a = banco();
    await carregarIntegracoes({ forcar: true });
    // Arquivo que não abre (a chave do servidor mudou): guarda uma cópia antes de substituir.
    if (problema === 'chave') {
      const antigo = await a.ler();
      if (antigo) await a.guardarCopia(antigo);
    }
    const valores = { ...dados, ...novos };
    limpar.forEach((k) => delete valores[k]);
    Object.keys(valores).forEach((k) => { if (valores[k] === '') delete valores[k]; });
    const novoMeta = { em: new Date().toISOString(), por: req.adminUser?.name || req.adminUser?.email || 'Admin' };
    await a.gravar(cifrar({ valores, meta: novoMeta }));
    dados = valores; meta = novoMeta; problema = null; lidoEm = Date.now();
    const db = readDb();
    appendAuditLog(db, req.adminUser, 'updated', 'settings', `Integrações alteradas: ${[...Object.keys(novos), ...limpar].join(', ') || 'nenhum campo'}.`);
    writeDb(db);
  }

  // Como no Aquagenda: cola a chave uma vez e o site confere a conta e cria o aviso de pagamento.
  app.post('/api/admin/integracoes/asaas/conectar', requireAdmin, somenteAdmin, async (req, res) => {
    const k = String(req.body?.chave || '').trim();
    if (!k.startsWith('$aact_')) return res.status(400).json({ error: 'Essa não parece uma chave de API do Asaas. Ela começa com $aact_.' });
    if (!banco() || !chave()) return res.status(503).json({ error: 'O servidor ainda não está preparado para guardar chaves.' });
    try {
      await carregarIntegracoes({ forcar: true });
      const url = `${site(req)}/api/webhooks/asaas`;
      if (!url.startsWith('https://')) return res.status(400).json({ error: 'O endereço do site precisa começar com https://' });

      // A chave de teste mora em outro endereço; na dúvida, tenta os dois
      let ambiente = null; let info = {};
      for (const amb of /hmlg/i.test(k) ? ['sandbox'] : ['producao', 'sandbox']) {
        const r = await chamarAsaas(k, amb, '/myAccount/commercialInfo');
        if (r.ok) { ambiente = amb; info = await r.json().catch(() => ({})); break; }
        const saldo = await chamarAsaas(k, amb, '/finance/balance');
        if (saldo.ok) { ambiente = amb; break; }
      }
      if (!ambiente) return res.status(400).json({ error: 'O Asaas não aceitou essa chave. Confira se copiou inteira e se ela não foi apagada no Asaas.' });
      const conta = String(info.companyName || info.name || '').slice(0, 120);

      // Reaproveita um aviso que já exista para este site, em vez de duplicar
      let idAviso = null;
      const lista = await chamarAsaas(k, ambiente, '/webhooks?limit=100');
      if (lista.ok) idAviso = ((await lista.json()).data || []).find((w) => w.url === url)?.id || null;
      let token = ''; let criado = null; let motivo = '';
      for (let tentativa = 0; tentativa < 2 && !criado; tentativa += 1) {
        token = novoTokenAsaas();
        const r = await chamarAsaas(k, ambiente, idAviso ? `/webhooks/${idAviso}` : '/webhooks', {
          method: idAviso ? 'PUT' : 'POST',
          body: JSON.stringify({
            name: 'Site Natação Criativa - loja', url, email: valorIntegracao('LOJA_EMAIL_AVISO') || info.email || undefined,
            enabled: true, interrupted: false, apiVersion: 3, authToken: token, sendType: 'SEQUENTIALLY', events: EVENTOS_ASAAS,
          }),
        });
        if (r.ok) criado = (await r.json().catch(() => ({}))).id || idAviso;
        else motivo = await erroAsaas(r);
      }
      if (!criado) {
        console.error('[integracoes] webhook', motivo);
        return res.status(502).json({ error: `A chave é válida, mas o Asaas não criou o aviso de pagamento: ${motivo || 'tente de novo'}` });
      }

      // Trocou de conta: tira o aviso da conta anterior
      const chaveAntiga = dados.ASAAS_API_KEY; const avisoAntigo = dados.ASAAS_WEBHOOK_ID;
      if (chaveAntiga && chaveAntiga !== k && avisoAntigo) {
        await chamarAsaas(chaveAntiga, ambienteInterno() || 'producao', `/webhooks/${avisoAntigo}`, { method: 'DELETE' }).catch(() => {});
      }
      await gravarValores(req, { ASAAS_API_KEY: k, ASAAS_AMBIENTE: ambiente, ASAAS_WEBHOOK_TOKEN: token, ASAAS_WEBHOOK_ID: String(criado), ASAAS_CONTA: conta }, []);
      res.json(estado(req));
    } catch (e) {
      console.error('[integracoes] conectar', e?.message);
      res.status(502).json({ error: 'Não foi possível conectar ao Asaas agora. Tente de novo.' });
    }
  });

  app.post('/api/admin/integracoes/asaas/desconectar', requireAdmin, somenteAdmin, async (req, res) => {
    try {
      await carregarIntegracoes({ forcar: true });
      if (dados.ASAAS_API_KEY && dados.ASAAS_WEBHOOK_ID) {
        await chamarAsaas(dados.ASAAS_API_KEY, ambienteInterno(), `/webhooks/${dados.ASAAS_WEBHOOK_ID}`, { method: 'DELETE' }).catch(() => {});
      }
      await gravarValores(req, {}, CAMPOS_ASAAS);
      res.json(estado(req));
    } catch (e) {
      console.error('[integracoes] desconectar', e?.message);
      res.status(502).json({ error: 'Não foi possível desconectar agora.' });
    }
  });

  app.get('/api/admin/integracoes', requireAdmin, somenteAdmin, async (req, res) => {
    await carregarIntegracoes({ forcar: true }).catch(() => {});
    res.set('Cache-Control', 'no-store');
    res.json(estado(req));
  });

  app.put('/api/admin/integracoes', requireAdmin, somenteAdmin, async (req, res) => {
    const b = req.body || {};
    const a = banco();
    if (!a || !chave()) return res.status(503).json({ error: 'O servidor ainda não está preparado para guardar chaves.' });
    const novos = {};
    for (const k of TEXTOS) if (b[k] !== undefined) novos[k] = String(b[k] ?? '').trim().slice(0, k === 'HOSPEDAGEM_NOTAS' ? 2000 : 300);
    for (const k of SEGREDOS) {
      const v = String(b[k] ?? '').trim();
      if (v) novos[k] = v.slice(0, 500);
    }
    if (novos.ASAAS_API_KEY && !novos.ASAAS_API_KEY.startsWith('$aact_')) return res.status(400).json({ error: 'A chave do Asaas começa com $aact_. Copie a chave inteira, inclusive o $.' });
    if (novos.ASAAS_WEBHOOK_TOKEN && novos.ASAAS_WEBHOOK_TOKEN.length < 16) return res.status(400).json({ error: 'A senha do webhook precisa ter pelo menos 16 caracteres.' });
    if (novos.INSTAGRAM_ACCESS_TOKEN && (novos.INSTAGRAM_ACCESS_TOKEN.length < 30 || /\s/.test(novos.INSTAGRAM_ACCESS_TOKEN))) return res.status(400).json({ error: 'Token do Instagram inválido. Copie o token inteiro.' });
    if (novos.SMTP_PORT && !/^\d{2,5}$/.test(novos.SMTP_PORT)) return res.status(400).json({ error: 'Porta de e-mail inválida.' });
    for (const k of ['SMTP_USER', 'EMAIL_FROM', 'LOJA_EMAIL_AVISO']) if (novos[k] && !EMAIL.test(novos[k])) return res.status(400).json({ error: 'Confira os e-mails informados.' });
    for (const k of ['SITE_URL', 'HOSPEDAGEM_LINK']) {
      if (!novos[k]) continue;
      if (!/^https?:\/\/[^\s]+$/i.test(novos[k])) return res.status(400).json({ error: 'Os links precisam começar com https://' });
      novos[k] = novos[k].replace(/\/+$/, '');
    }
    const limpar = (Array.isArray(b.limpar) ? b.limpar : []).filter((k) => SEGREDOS.includes(k));

    try {
      if (novos.ASAAS_API_KEY) limpar.push('ASAAS_AMBIENTE');
      await gravarValores(req, novos, limpar);
      res.json(estado(req));
    } catch (e) {
      console.error('[integracoes] salvar', e?.message);
      res.status(502).json({ error: 'Não foi possível salvar agora. Nada foi alterado.' });
    }
  });

  app.post('/api/admin/integracoes/testar/asaas', requireAdmin, somenteAdmin, async (req, res) => {
    await carregarIntegracoes({ forcar: true }).catch(() => {});
    const k = valorIntegracao('ASAAS_API_KEY');
    if (!k) return res.status(400).json({ error: 'Cole e salve a chave do Asaas primeiro.' });
    const chamar = (p) => chamarAsaas(k, ambienteInterno(), p);
    try {
      const r = await chamar('/customers?limit=1');
      if (r.status === 401) return res.status(400).json({ error: 'O Asaas recusou esta chave. Confira se copiou inteira.' });
      if (!r.ok) return res.status(502).json({ error: `O Asaas respondeu ${r.status}.` });
      let conta = '';
      try {
        const i = await chamar('/myAccount/commercialInfo/');
        if (i.ok) { const j = await i.json(); conta = String(j.companyName || j.name || '').slice(0, 120); }
      } catch { /* o nome da conta é só uma ajuda */ }
      res.json({ ok: true, ambiente: ambienteAsaas(), conta });
    } catch (e) {
      console.error('[integracoes] teste asaas', e?.message);
      res.status(502).json({ error: 'Não foi possível falar com o Asaas agora.' });
    }
  });

  app.post('/api/admin/integracoes/testar/instagram', requireAdmin, somenteAdmin, async (req, res) => {
    await carregarIntegracoes({ forcar: true }).catch(() => {});
    const token = valorIntegracao('INSTAGRAM_ACCESS_TOKEN');
    if (!token) return res.status(400).json({ error: 'Cole e salve o token do Instagram primeiro.' });
    try {
      const r = await fetch('https://graph.instagram.com/me?fields=username', { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
      if (!r.ok) return res.status(400).json({ error: 'O Instagram recusou este token. Ele pode ter vencido: gere um novo.' });
      const j = await r.json();
      res.json({ ok: true, conta: String(j.username || '').slice(0, 60) });
    } catch (e) {
      console.error('[integracoes] teste instagram', e?.message);
      res.status(502).json({ error: 'Não foi possível falar com o Instagram agora.' });
    }
  });

  app.post('/api/admin/integracoes/testar/email', requireAdmin, somenteAdmin, async (req, res) => {
    await carregarIntegracoes({ forcar: true }).catch(() => {});
    const para = valorIntegracao('LOJA_EMAIL_AVISO') || valorIntegracao('EMAIL_FROM') || valorIntegracao('SMTP_USER');
    if (!valorIntegracao('SMTP_USER') || !valorIntegracao('SMTP_PASS') || !para) return res.status(400).json({ error: 'Preencha e salve o e-mail e a senha primeiro.' });
    try {
      await enviarEmail({ para, assunto: 'Teste de e-mail da Natação Criativa', html: '<p>Tudo certo! O site consegue enviar os avisos da loja por este e-mail.</p>' });
      res.json({ ok: true, para });
    } catch (e) {
      console.error('[integracoes] teste email', e?.message);
      const auth = /auth|credential|535/i.test(String(e?.message));
      res.status(502).json({ error: auth ? 'O servidor de e-mail recusou o usuário ou a senha.' : 'Não foi possível conectar ao servidor de e-mail. Confira o servidor e a porta.' });
    }
  });
}
