// Loja: checkout, cobrança no Asaas, confirmação de pagamento, e-mails e gestão de pedidos.
// O preço e o frete são sempre recalculados aqui. Dados de cartão ficam só na página do Asaas.
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { createSupabaseServiceClient } from './supabaseAuth.js';
import { cpfValido, limparCpf } from './extras.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const txt = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const REGIOES = {
  N: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'],
  NE: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  CO: ['DF', 'GO', 'MS', 'MT'],
  SE: ['ES', 'MG', 'RJ', 'SP'],
  S: ['PR', 'RS', 'SC'],
};
const regiaoDe = (uf) => Object.keys(REGIOES).find((r) => REGIOES[r].includes(uf)) || null;
const STATUS = ['aguardando_pagamento', 'vencido', 'pago', 'em_separacao', 'enviado', 'entregue', 'cancelado', 'reembolsado'];
const NOME_STATUS = {
  aguardando_pagamento: 'Aguardando pagamento', vencido: 'Pagamento vencido', pago: 'Pago', em_separacao: 'Em separação',
  enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado', reembolsado: 'Reembolsado',
};
// Mudanças feitas à mão no painel. Pagamento e reembolso só entram pelo Asaas.
const PROXIMOS = {
  aguardando_pagamento: ['cancelado'], vencido: ['cancelado'], pago: ['em_separacao', 'enviado'],
  em_separacao: ['pago', 'enviado'], enviado: ['em_separacao', 'entregue'], entregue: ['enviado'], cancelado: [], reembolsado: [],
};

export function centavos(preco) {
  let s = String(preco ?? '').replace(/[^\d,.]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Math.round(Number(s) * 100);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
export const reais = (c) => (Number(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function cnpjValido(v) {
  const d = digitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (n) => {
    let soma = 0; let peso = n - 7;
    for (let i = 0; i < n; i += 1) { soma += Number(d[i]) * peso; peso = peso === 2 ? 9 : peso - 1; }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

// ---------- configuração ----------
const fretePadrao = () => ({ N: null, NE: null, CO: null, SE: null, S: null, retiradaAtiva: false, retiradaEndereco: '' });
const freteDe = (db) => ({ ...fretePadrao(), ...(db.settings?.lojaFrete || {}) });
const freteCompleto = (f) => f.retiradaAtiva || Object.keys(REGIOES).some((r) => Number.isInteger(f[r]));
function asaasConfig() {
  const chave = String(process.env.ASAAS_API_KEY || '').trim();
  if (!chave) return null;
  const pedido = String(process.env.ASAAS_AMBIENTE || '').toLowerCase();
  const sandbox = pedido ? pedido !== 'producao' : chave.includes('_hmlg_');
  return { chave, sandbox, base: sandbox ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3' };
}
const smtpPronto = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

// ---------- Asaas ----------
async function asaas(caminho, opcoes = {}) {
  const cfg = asaasConfig();
  if (!cfg) throw new Error('Asaas sem chave');
  const r = await fetch(cfg.base + caminho, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'site-natacao-criativa', access_token: cfg.chave },
    signal: AbortSignal.timeout(12000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j?.errors?.[0]?.description || `Asaas respondeu ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return j;
}
async function clienteAsaas(c) {
  const achado = await asaas(`/customers?cpfCnpj=${c.documento}&limit=1`);
  if (achado?.data?.[0]?.id) return achado.data[0].id;
  const novo = await asaas('/customers', {
    method: 'POST',
    body: JSON.stringify({ name: c.nome, cpfCnpj: c.documento, email: c.email, mobilePhone: c.telefone, notificationDisabled: true }),
  });
  return novo.id;
}
function vencimento(dias = 3) {
  const d = new Date(Date.now() + dias * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
}

// ---------- banco ----------
export function repositorioSupabase(cliente) {
  const t = () => cliente.from('store_orders');
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  return {
    criar: async (o) => ok(await t().insert(o).select().single()),
    porId: async (id) => ok(await t().select('*').eq('id', id).maybeSingle()),
    porToken: async (v) => ok(await t().select('*').eq('access_token', v).maybeSingle()),
    porChave: async (v) => ok(await t().select('*').eq('idempotency_key', v).maybeSingle()),
    atualizar: async (id, campos) => ok(await t().update({ ...campos, updated_at: new Date().toISOString() }).eq('id', id).select().single()),
    listar: async ({ status, limite = 300 }) => {
      let q = t().select('*').order('created_at', { ascending: false }).limit(limite);
      if (status) q = q.eq('status', status);
      return ok(await q);
    },
    reservar: async (id) => ok(await cliente.rpc('loja_reservar_estoque', { p_order: id })),
    devolver: async (id) => ok(await cliente.rpc('loja_devolver_estoque', { p_order: id })),
    registrarEvento: async (ev) => {
      const { error } = await cliente.from('store_payment_events').insert(ev);
      if (!error) return true;
      if (error.code === '23505') return false;
      throw error;
    },
    apagarEvento: async (id) => ok(await cliente.from('store_payment_events').delete().eq('event_id', id)),
    // Só um servidor consegue marcar: evita e-mail duplicado.
    marcarAviso: async (id, coluna) => {
      const data = ok(await t().update({ [coluna]: new Date().toISOString() }).eq('id', id).is(coluna, null).select('id'));
      return data.length > 0;
    },
    estoque: async () => ok(await cliente.from('store_stock').select('item_id,quantity')),
    definirEstoque: async (id, q) => {
      if (q === null) return ok(await cliente.from('store_stock').delete().eq('item_id', id));
      return ok(await cliente.from('store_stock').upsert({ item_id: id, quantity: q, updated_at: new Date().toISOString() }));
    },
    testar: async () => { const { error } = await t().select('id').limit(1); return !error; },
  };
}

// ---------- e-mail ----------
const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function enviarSmtp({ para, assunto, html, responderPara }) {
  const usuario = process.env.SMTP_USER;
  const porta = Number(process.env.SMTP_PORT || 465);
  const envio = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.titan.email', port: porta, secure: porta === 465,
    auth: { user: usuario, pass: process.env.SMTP_PASS },
    connectionTimeout: 7000, greetingTimeout: 7000, socketTimeout: 9000,
  });
  await envio.sendMail({ from: `"Natação Criativa" <${process.env.EMAIL_FROM || usuario}>`, to: para, subject: assunto, html, replyTo: responderPara || undefined });
}
function layout(titulo, corpo) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#0B3258"><h2 style="color:#047AE4">${h(titulo)}</h2>${corpo}<p style="color:#667;font-size:13px;margin-top:28px">Natação Criativa</p></div>`;
}
function resumo(o) {
  const linhas = (o.items || []).map((i) => `<tr><td style="padding:6px 0">${h(i.qtd)}x ${h(i.titulo)}${i.tamanho ? ` (${h(i.tamanho)})` : ''}</td><td align="right">${reais(i.precoCents * i.qtd)}</td></tr>`).join('');
  const entrega = o.delivery_method === 'retirada' ? 'Retirada' : 'Frete';
  return `<table width="100%" style="border-collapse:collapse;font-size:14px">${linhas}<tr><td style="padding:6px 0">${entrega}</td><td align="right">${reais(o.shipping_cents)}</td></tr><tr><td style="padding:6px 0"><b>Total</b></td><td align="right"><b>${reais(o.total_cents)}</b></td></tr></table>`;
}
function enderecoTexto(o) {
  if (o.delivery_method === 'retirada') return 'Retirada no local';
  const a = o.address || {};
  return `${a.rua}, ${a.numero}${a.complemento ? ` - ${a.complemento}` : ''}, ${a.bairro}, ${a.cidade}/${a.uf}, CEP ${a.cep}`;
}
const botao = (url, t) => `<p><a href="${h(url)}" style="background:#047AE4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${h(t)}</a></p>`;

// ---------- rotas ----------
export function registrarLoja(app, { requireAdmin, readDb, writeDb, appendAuditLog, repositorio, enviarEmail = enviarSmtp, urlDoSite }) {
  const repo = () => {
    if (repositorio) return repositorio;
    const c = createSupabaseServiceClient();
    return c ? repositorioSupabase(c) : null;
  };
  const site = (req) => urlDoSite || process.env.SITE_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const emailEquipe = () => process.env.LOJA_EMAIL_AVISO || process.env.EMAIL_FROM || process.env.SMTP_USER;
  const lojaAtiva = (db) => Boolean(db.settings?.lojaCheckoutAtivo && asaasConfig() && process.env.ASAAS_WEBHOOK_TOKEN && repo() && freteCompleto(freteDe(db)));
  const evento = (o, texto, quem = 'Sistema') => [...(o.history || []), { em: new Date().toISOString(), texto, quem }].slice(-60);

  // Cada aviso sai uma vez. Se o envio falhar, fica liberado para reenviar pelo painel.
  async function avisar(r, o, coluna, mensagens) {
    if (!smtpPronto()) { await r.atualizar(o.id, { email_error: 'E-mail não configurado na Vercel.' }); return false; }
    if (!(await r.marcarAviso(o.id, coluna))) return false;
    try {
      for (const m of mensagens) await enviarEmail(m);
      await r.atualizar(o.id, { email_error: null });
      return true;
    } catch (e) {
      console.error('[loja] e-mail', e?.message);
      await r.atualizar(o.id, { [coluna]: null, email_error: txt(e?.message || 'Falha no envio', 200) });
      return false;
    }
  }
  const linkPedido = (req, o) => `${site(req)}/loja?pedido=${o.access_token}`;
  const avisoCriado = (req, r, o) => avisar(r, o, 'notified_created_at', [{
    para: o.customer_email, responderPara: emailEquipe(),
    assunto: `Recebemos seu pedido nº ${o.number}`,
    html: layout(`Pedido nº ${o.number} recebido`, `<p>Olá, ${h(o.customer_name)}! Seu pedido está aguardando o pagamento.</p>${resumo(o)}${o.invoice_url ? botao(o.invoice_url, 'Pagar agora') : ''}${botao(linkPedido(req, o), 'Acompanhar pedido')}`),
  }]);
  const avisoPago = (req, r, o) => avisar(r, o, 'notified_paid_at', [
    {
      para: emailEquipe(), responderPara: o.customer_email,
      assunto: `Nova compra na loja: pedido nº ${o.number} (${reais(o.total_cents)})`,
      html: layout(`Nova compra: pedido nº ${o.number}`, `<p><b>${h(o.customer_name)}</b><br>${h(o.customer_email)} · ${h(o.customer_phone)}</p>${resumo(o)}<p><b>Entrega:</b> ${h(enderecoTexto(o))}</p>${botao(`${site(req)}/admin`, 'Abrir o painel')}`),
    },
    {
      para: o.customer_email, responderPara: emailEquipe(),
      assunto: `Pagamento confirmado: pedido nº ${o.number}`,
      html: layout('Pagamento confirmado!', `<p>Olá, ${h(o.customer_name)}! Recebemos o pagamento do pedido nº ${o.number} e vamos preparar tudo.</p>${resumo(o)}${botao(linkPedido(req, o), 'Acompanhar pedido')}`),
    },
  ]);
  const avisoEnviado = (req, r, o) => avisar(r, o, 'notified_shipped_at', [{
    para: o.customer_email, responderPara: emailEquipe(),
    assunto: `Seu pedido nº ${o.number} foi enviado`,
    html: layout('Pedido enviado!', `<p>Olá, ${h(o.customer_name)}! Seu pedido nº ${o.number} está a caminho.</p>${o.tracking_code ? `<p><b>Código de rastreio:</b> ${h(o.tracking_code)}</p>` : ''}${botao(linkPedido(req, o), 'Acompanhar pedido')}`),
  }]);

  // Aplica a situação da cobrança no pedido. Serve ao aviso do Asaas e à consulta manual.
  async function aplicarPagamento(req, r, o, tipo, pagamento) {
    const pagos = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];
    if (pagos.includes(tipo)) {
      if (!['aguardando_pagamento', 'vencido', 'cancelado'].includes(o.status)) return o;
      if (Math.round(Number(pagamento.value) * 100) < o.total_cents) {
        return r.atualizar(o.id, { history: evento(o, `Pagamento de ${reais(Math.round(Number(pagamento.value) * 100))} menor que o total: conferir no Asaas.`) });
      }
      let nota = `Pagamento confirmado (${pagamento.billingType || 'Asaas'}).`;
      if (o.stock_released_at && !(await r.reservar(o.id))) nota += ' ATENÇÃO: o estoque já tinha sido liberado e falta produto.';
      const atual = await r.atualizar(o.id, {
        status: 'pago', paid_at: pagamento.paymentDate || pagamento.confirmedDate || new Date().toISOString(),
        billing_type: pagamento.billingType || o.billing_type, history: evento(o, nota),
      });
      await avisoPago(req, r, atual);
      return r.porId(o.id);
    }
    if (tipo === 'PAYMENT_OVERDUE' && o.status === 'aguardando_pagamento') {
      await r.devolver(o.id);
      return r.atualizar(o.id, { status: 'vencido', history: evento(o, 'Cobrança venceu sem pagamento. Estoque liberado.') });
    }
    if (tipo === 'PAYMENT_DELETED' && ['aguardando_pagamento', 'vencido'].includes(o.status)) {
      await r.devolver(o.id);
      return r.atualizar(o.id, { status: 'cancelado', history: evento(o, 'Cobrança removida no Asaas.') });
    }
    if (tipo === 'PAYMENT_REFUNDED' && o.status !== 'reembolsado') {
      await r.devolver(o.id);
      return r.atualizar(o.id, { status: 'reembolsado', history: evento(o, 'Pagamento reembolsado no Asaas.') });
    }
    if (tipo === 'PAYMENT_CHARGEBACK_REQUESTED') {
      return r.atualizar(o.id, { history: evento(o, 'ATENÇÃO: o cliente contestou a compra no cartão. Conferir no Asaas antes de enviar.') });
    }
    return o;
  }

  // ---------- público ----------
  app.get('/api/public/loja/config', async (req, res) => {
    const db = readDb();
    const ativa = lojaAtiva(db);
    if (!ativa) return res.json({ ativa: false });
    const f = freteDe(db);
    try {
      const estoque = Object.fromEntries((await repo().estoque()).map((e) => [e.item_id, e.quantity]));
      res.json({ ativa: true, frete: Object.fromEntries(Object.keys(REGIOES).map((k) => [k, f[k]])), regioes: REGIOES, retirada: f.retiradaAtiva ? { endereco: f.retiradaEndereco } : null, estoque });
    } catch (e) {
      console.error('[loja] config', e?.message);
      res.json({ ativa: false });
    }
  });

  const tentativas = new Map();
  app.post('/api/public/loja/checkout', async (req, res) => {
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const agora = Date.now();
    const t = tentativas.get(ip);
    const reg = t && agora - t.inicio < 600000 ? t : { inicio: agora, n: 0 };
    reg.n += 1; tentativas.set(ip, reg);
    if (tentativas.size > 5000) tentativas.clear();
    if (reg.n > 15) return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });

    const b = req.body || {};
    if (b.website) return res.status(400).json({ error: 'Não foi possível concluir.' });
    const db = readDb();
    if (!lojaAtiva(db)) return res.status(503).json({ error: 'A compra pelo site está indisponível no momento.' });
    if (b.consent !== true) return res.status(400).json({ error: 'Aceite a Política de Privacidade para continuar.' });
    const chave = txt(b.idempotencyKey, 80);
    if (!/^[\w-]{16,80}$/.test(chave)) return res.status(400).json({ error: 'Atualize a página e tente de novo.' });

    const c = b.cliente || {};
    const cliente = { nome: txt(c.nome, 120), email: txt(c.email, 200).toLowerCase(), telefone: digitos(c.telefone).slice(0, 13), documento: digitos(c.documento) };
    if (cliente.nome.split(/\s+/).length < 2) return res.status(400).json({ error: 'Informe o nome completo.' });
    if (!EMAIL.test(cliente.email)) return res.status(400).json({ error: 'Informe um e-mail válido.' });
    if (cliente.telefone.length < 10) return res.status(400).json({ error: 'Informe o telefone com DDD.' });
    if (cliente.documento.length === 11 ? !cpfValido(cliente.documento) : !cnpjValido(cliente.documento)) return res.status(400).json({ error: 'CPF ou CNPJ inválido.' });
    if (cliente.documento.length === 11) cliente.documento = limparCpf(cliente.documento);

    const pedidos = Array.isArray(b.itens) ? b.itens.slice(0, 30) : [];
    const itens = [];
    for (const p of pedidos) {
      const s = (db.storeItems || []).find((x) => x.id === p?.id && x.active);
      const qtd = Number(p?.qtd);
      if (!s || !Number.isInteger(qtd) || qtd < 1 || qtd > 20) return res.status(400).json({ error: 'Um item do carrinho não está mais disponível.' });
      const precoCents = centavos(s.price);
      if (!precoCents) return res.status(400).json({ error: `O produto "${s.title}" está sem preço.` });
      if (itens.some((i) => i.id === s.id)) return res.status(400).json({ error: 'Carrinho inválido.' });
      itens.push({ id: s.id, titulo: s.title, tamanho: s.size || '', precoCents, qtd, situacao: s.badge || '' });
    }
    if (!itens.length) return res.status(400).json({ error: 'Seu carrinho está vazio.' });

    const f = freteDe(db);
    const e = b.entrega || {};
    const metodo = e.metodo === 'retirada' ? 'retirada' : 'envio';
    let frete = 0; let address = {};
    if (metodo === 'retirada') {
      if (!f.retiradaAtiva) return res.status(400).json({ error: 'A retirada não está disponível.' });
    } else {
      address = { cep: digitos(e.cep).slice(0, 8), rua: txt(e.rua, 160), numero: txt(e.numero, 20), complemento: txt(e.complemento, 80), bairro: txt(e.bairro, 100), cidade: txt(e.cidade, 100), uf: txt(e.uf, 2).toUpperCase() };
      if (address.cep.length !== 8 || !address.rua || !address.numero || !address.bairro || !address.cidade) return res.status(400).json({ error: 'Preencha o endereço completo.' });
      const regiao = regiaoDe(address.uf);
      if (!regiao || !Number.isInteger(f[regiao])) return res.status(400).json({ error: 'Ainda não entregamos nesse estado. Fale com o atendimento.' });
      frete = f[regiao];
    }
    const subtotal = itens.reduce((t2, i) => t2 + i.precoCents * i.qtd, 0);
    const total = subtotal + frete;
    if (total < 500) return res.status(400).json({ error: 'O valor mínimo da compra é R$ 5,00.' });

    const r = repo();
    const publico = (o) => ({ token: o.access_token, numero: o.number, invoiceUrl: o.invoice_url, total: o.total_cents });
    let pedido = null;
    try {
      const repetido = await r.porChave(chave);
      if (repetido?.invoice_url) return res.json(publico(repetido));
      if (repetido) return res.status(409).json({ error: 'Este pedido não foi concluído. Atualize a página e tente de novo.' });
      pedido = await r.criar({
        access_token: crypto.randomBytes(24).toString('hex'), idempotency_key: chave, customer_name: cliente.nome,
        customer_email: cliente.email, customer_phone: cliente.telefone, delivery_method: metodo, address, items: itens,
        subtotal_cents: subtotal, shipping_cents: frete, total_cents: total, history: [{ em: new Date().toISOString(), texto: 'Pedido criado no site.', quem: 'Cliente' }],
      });
      if (!(await r.reservar(pedido.id))) {
        await r.atualizar(pedido.id, { status: 'cancelado', history: evento(pedido, 'Cancelado: faltou estoque.') });
        return res.status(409).json({ error: 'Um dos produtos acabou de esgotar. Revise o carrinho.' });
      }
      const idCliente = await clienteAsaas(cliente);
      const cobranca = await asaas('/payments', {
        method: 'POST',
        body: JSON.stringify({
          customer: idCliente, billingType: 'UNDEFINED', value: total / 100, dueDate: vencimento(),
          description: `Loja Natação Criativa - Pedido ${pedido.number}`, externalReference: `loja:${pedido.id}`,
        }),
      });
      const pronto = await r.atualizar(pedido.id, { asaas_customer_id: idCliente, asaas_payment_id: cobranca.id, invoice_url: cobranca.invoiceUrl });
      await avisoCriado(req, r, pronto);
      res.status(201).json(publico(pronto));
    } catch (erro) {
      console.error('[loja] checkout', erro?.message);
      if (pedido) {
        try {
          await r.devolver(pedido.id);
          await r.atualizar(pedido.id, { status: 'cancelado', history: evento(pedido, `Falha ao gerar a cobrança: ${txt(erro?.message, 160)}`) });
        } catch (e2) { console.error('[loja] checkout', e2?.message); }
      }
      res.status(502).json({ error: 'Não foi possível gerar o pagamento. Confira seus dados e tente de novo.' });
    }
  });

  app.get('/api/public/loja/pedido/:token', async (req, res) => {
    if (!/^[a-f0-9]{48}$/.test(req.params.token) || !repo()) return res.status(404).json({ error: 'Pedido não encontrado.' });
    try {
      const o = await repo().porToken(req.params.token);
      if (!o) return res.status(404).json({ error: 'Pedido não encontrado.' });
      res.set('Cache-Control', 'no-store');
      res.json({
        numero: o.number, status: o.status, statusNome: NOME_STATUS[o.status], itens: o.items.map((i) => ({ titulo: i.titulo, qtd: i.qtd, precoCents: i.precoCents })),
        frete: o.shipping_cents, total: o.total_cents, entrega: o.delivery_method, rastreio: o.tracking_code || '',
        invoiceUrl: ['aguardando_pagamento', 'vencido'].includes(o.status) ? o.invoice_url : '',
      });
    } catch (e) {
      console.error('[loja] pedido', e?.message);
      res.status(500).json({ error: 'Não foi possível consultar o pedido.' });
    }
  });

  // ---------- aviso do Asaas ----------
  app.post('/api/webhooks/asaas', async (req, res) => {
    const segredo = String(process.env.ASAAS_WEBHOOK_TOKEN || '');
    const recebido = String(req.headers['asaas-access-token'] || '');
    const a = crypto.createHash('sha256').update(segredo).digest();
    const b = crypto.createHash('sha256').update(recebido).digest();
    if (!segredo || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Não autorizado.' });

    const { id: idEvento, event: tipo, payment } = req.body || {};
    // A conta pode ter cobranças de outros produtos: só o que é da loja entra aqui.
    const ref = String(payment?.externalReference || '');
    if (!ref.startsWith('loja:') || !payment?.id) return res.json({ ok: true, ignorado: true });
    const r = repo();
    if (!r) return res.status(503).json({ error: 'Banco indisponível.' });
    const chaveEvento = String(idEvento || `${tipo}:${payment.id}`);
    let registrado = false;
    try {
      registrado = await r.registrarEvento({ event_id: chaveEvento, event_type: String(tipo), payment_id: payment.id });
      if (!registrado) return res.json({ ok: true, repetido: true });
      const o = await r.porId(ref.slice(5));
      if (!o || o.asaas_payment_id !== payment.id) {
        console.error('[loja] aviso sem pedido correspondente', payment.id);
        return res.json({ ok: true, ignorado: true });
      }
      await aplicarPagamento(req, r, o, tipo, payment);
      res.json({ ok: true });
    } catch (e) {
      console.error('[loja] webhook', e?.message);
      if (registrado) await r.apagarEvento(chaveEvento).catch(() => {});
      res.status(500).json({ error: 'Falha ao processar.' }); // o Asaas tenta de novo
    }
  });

  // ---------- painel ----------
  const semRepo = (res) => res.status(503).json({ error: 'Banco da loja indisponível.' });
  app.get('/api/admin/loja/config', requireAdmin, async (req, res) => {
    const db = readDb();
    const cfg = asaasConfig();
    const r = repo();
    const banco = r ? await r.testar().catch(() => false) : false;
    let estoque = {};
    if (banco) estoque = Object.fromEntries((await r.estoque().catch(() => [])).map((e) => [e.item_id, e.quantity]));
    res.json({
      ativo: Boolean(db.settings?.lojaCheckoutAtivo), funcionando: lojaAtiva(db), frete: freteDe(db), estoque,
      pronto: { banco, asaas: Boolean(cfg), ambiente: cfg ? (cfg.sandbox ? 'teste' : 'produção') : '', webhook: Boolean(process.env.ASAAS_WEBHOOK_TOKEN), email: smtpPronto(), frete: freteCompleto(freteDe(db)) },
      webhookUrl: `${site(req)}/api/webhooks/asaas`,
    });
  });
  app.put('/api/admin/loja/config', requireAdmin, (req, res) => {
    const b = req.body || {};
    const db = readDb();
    const f = { ...freteDe(db) };
    for (const k of Object.keys(REGIOES)) {
      if (b.frete?.[k] === undefined) continue;
      const v = b.frete[k];
      if (v === null || v === '') f[k] = null;
      else if (Number.isInteger(v) && v >= 0 && v <= 100000) f[k] = v;
      else return res.status(400).json({ error: 'Valor de frete inválido.' });
    }
    if (b.frete?.retiradaAtiva !== undefined) f.retiradaAtiva = Boolean(b.frete.retiradaAtiva);
    if (b.frete?.retiradaEndereco !== undefined) f.retiradaEndereco = txt(b.frete.retiradaEndereco, 300);
    const ativo = b.ativo === undefined ? Boolean(db.settings?.lojaCheckoutAtivo) : Boolean(b.ativo);
    if (ativo && !(asaasConfig() && process.env.ASAAS_WEBHOOK_TOKEN && repo() && freteCompleto(f))) {
      return res.status(400).json({ error: 'Para ligar, faltam itens da lista de preparação.' });
    }
    db.settings = { ...db.settings, lojaFrete: f, lojaCheckoutAtivo: ativo };
    appendAuditLog(db, req.adminUser, 'updated', 'store', `Configuração da loja atualizada (checkout ${ativo ? 'ligado' : 'desligado'}).`);
    writeDb(db);
    res.json({ ok: true });
  });
  app.put('/api/admin/loja/estoque/:id', requireAdmin, async (req, res) => {
    const r = repo();
    if (!r) return semRepo(res);
    const v = req.body?.quantidade;
    const q = v === null || v === '' ? null : Number(v);
    if (q !== null && (!Number.isInteger(q) || q < 0 || q > 100000)) return res.status(400).json({ error: 'Quantidade inválida.' });
    if (!(readDb().storeItems || []).some((s) => s.id === req.params.id)) return res.status(404).json({ error: 'Produto não encontrado.' });
    try { await r.definirEstoque(req.params.id, q); res.json({ ok: true }); } catch (e) { console.error('[loja] estoque', e?.message); res.status(500).json({ error: 'Não foi possível salvar o estoque.' }); }
  });
  const quem = (req) => req.adminUser?.name || req.adminUser?.email || 'Admin';
  const paraPainel = ({ access_token, idempotency_key, ...o }) => ({ ...o, statusNome: NOME_STATUS[o.status], proximos: PROXIMOS[o.status] || [] });
  app.get('/api/admin/loja/pedidos', requireAdmin, async (req, res) => {
    const r = repo();
    if (!r) return semRepo(res);
    const status = STATUS.includes(req.query.status) ? req.query.status : '';
    try {
      const lista = await r.listar({ status });
      res.set('Cache-Control', 'no-store');
      res.json({ pedidos: lista.map(paraPainel), nomes: NOME_STATUS });
    } catch (e) {
      console.error('[loja] pedidos', e?.message);
      res.status(500).json({ error: 'Não foi possível carregar os pedidos. Confira se a migração da loja foi executada.' });
    }
  });
  app.get('/api/admin/loja/pedidos.csv', requireAdmin, async (req, res) => {
    const r = repo();
    if (!r) return semRepo(res);
    // Campo começando com = + - @ viraria fórmula ao abrir no Excel
    const cel = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
    try {
      const lista = await r.listar({ limite: 5000 });
      const cab = ['Pedido', 'Data', 'Situação', 'Cliente', 'E-mail', 'Telefone', 'Itens', 'Subtotal', 'Frete', 'Total', 'Forma', 'Entrega', 'Rastreio'];
      const linhas = lista.map((o) => [o.number, new Date(o.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), NOME_STATUS[o.status], o.customer_name, o.customer_email, o.customer_phone, o.items.map((i) => `${i.qtd}x ${i.titulo}`).join('; '), reais(o.subtotal_cents), reais(o.shipping_cents), reais(o.total_cents), o.billing_type, enderecoTexto(o), o.tracking_code].map(cel).join(';'));
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="pedidos-loja.csv"');
      res.send(`﻿${cab.join(';')}\n${linhas.join('\n')}`);
    } catch (e) {
      console.error('[loja] csv', e?.message);
      res.status(500).json({ error: 'Não foi possível exportar.' });
    }
  });
  app.patch('/api/admin/loja/pedidos/:id', requireAdmin, async (req, res) => {
    const r = repo();
    if (!r) return semRepo(res);
    const b = req.body || {};
    try {
      const o = await r.porId(req.params.id);
      if (!o) return res.status(404).json({ error: 'Pedido não encontrado.' });
      const campos = {}; const notas = [];
      if (b.tracking_code !== undefined && txt(b.tracking_code, 60) !== (o.tracking_code || '')) { campos.tracking_code = txt(b.tracking_code, 60); notas.push(`Rastreio: ${campos.tracking_code || 'removido'}.`); }
      if (b.internal_notes !== undefined) campos.internal_notes = txt(b.internal_notes, 2000);
      if (b.status && b.status !== o.status) {
        if (!(PROXIMOS[o.status] || []).includes(b.status)) return res.status(400).json({ error: `Não dá para passar de "${NOME_STATUS[o.status]}" para "${NOME_STATUS[b.status] || b.status}".` });
        if (b.status === 'cancelado' && o.asaas_payment_id) {
          await asaas(`/payments/${o.asaas_payment_id}`, { method: 'DELETE' }).catch((e) => { if (e.status !== 404) throw e; });
          await r.devolver(o.id);
        }
        campos.status = b.status;
        notas.push(`Situação: ${NOME_STATUS[b.status]}.`);
      }
      if (notas.length) campos.history = (notas.reduce((h2, n) => [...h2, { em: new Date().toISOString(), texto: n, quem: quem(req) }], o.history || [])).slice(-60);
      let atual = Object.keys(campos).length ? await r.atualizar(o.id, campos) : o;
      if (campos.status === 'enviado') { await avisoEnviado(req, r, atual); atual = await r.porId(o.id); }
      res.json({ pedido: paraPainel(atual) });
    } catch (e) {
      console.error('[loja] atualizar', e?.message);
      res.status(502).json({ error: 'Não foi possível atualizar o pedido.' });
    }
  });
  app.post('/api/admin/loja/pedidos/:id/consultar', requireAdmin, async (req, res) => {
    const r = repo();
    if (!r) return semRepo(res);
    try {
      const o = await r.porId(req.params.id);
      if (!o?.asaas_payment_id) return res.status(404).json({ error: 'Pedido sem cobrança no Asaas.' });
      const p = await asaas(`/payments/${o.asaas_payment_id}`);
      const tipo = p.deleted ? 'PAYMENT_DELETED' : { RECEIVED: 'PAYMENT_RECEIVED', CONFIRMED: 'PAYMENT_CONFIRMED', RECEIVED_IN_CASH: 'PAYMENT_RECEIVED', OVERDUE: 'PAYMENT_OVERDUE', REFUNDED: 'PAYMENT_REFUNDED' }[p.status];
      const atual = tipo ? await aplicarPagamento(req, r, o, tipo, p) : o;
      res.json({ pedido: paraPainel(atual), situacaoAsaas: p.status });
    } catch (e) {
      console.error('[loja] consultar', e?.message);
      res.status(502).json({ error: 'Não foi possível consultar o Asaas.' });
    }
  });
  app.post('/api/admin/loja/pedidos/:id/reenviar', requireAdmin, async (req, res) => {
    const r = repo();
    if (!r) return semRepo(res);
    try {
      const o = await r.porId(req.params.id);
      if (!o) return res.status(404).json({ error: 'Pedido não encontrado.' });
      const tipo = o.status === 'enviado' || o.status === 'entregue' ? 'notified_shipped_at' : o.paid_at ? 'notified_paid_at' : 'notified_created_at';
      const limpo = await r.atualizar(o.id, { [tipo]: null });
      const f = { notified_shipped_at: avisoEnviado, notified_paid_at: avisoPago, notified_created_at: avisoCriado }[tipo];
      const enviado = await f(req, r, limpo);
      const atual = await r.porId(o.id);
      if (!enviado) return res.status(502).json({ error: atual.email_error || 'Não foi possível enviar.' });
      res.json({ pedido: paraPainel(atual) });
    } catch (e) {
      console.error('[loja] reenviar', e?.message);
      res.status(502).json({ error: 'Não foi possível enviar.' });
    }
  });
}
