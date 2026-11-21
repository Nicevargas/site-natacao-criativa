// Recursos do painel: envio de fotos, parceiros, leads antes do pagamento, duplicar,
// importação da loja e de alunos, últimos lançamentos e atividade dos alunos.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createSupabaseServiceClient } from './supabaseAuth.js';
import { montarAgenda } from './agenda.js';
import { valorIntegracao } from './integracoes.js';

const BUCKET_FOTOS = 'course-covers';
const MAX_FOTO_BYTES = 1.5 * 1024 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ID = () => crypto.randomUUID().slice(0, 8);
const txt = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const urlSegura = (v) => {
  const u = txt(v, 1000);
  return /^https?:\/\//i.test(u) || /^\/[^/]/.test(u) ? u : '';
};
const urlExterna = (v) => {
  const u = txt(v, 1000);
  return /^https?:\/\//i.test(u) ? u : '';
};
const dataIso = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const lista = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => txt(x, 60)).filter(Boolean);

// ---------- campos novos de cada cadastro ----------
export function camposCurso(b = {}, prev = {}) {
  const tem = (k) => b[k] !== undefined;
  const lotesAntigos = new Map((prev.lots || []).map((l) => [l.id, l]));
  const STATUS = ['programado', 'vigente', 'esgotado', 'encerrado'];
  const c = {};
  if (tem('lots')) {
    c.lots = (Array.isArray(b.lots) ? b.lots : [])
      .filter((l) => txt(l?.name))
      .slice(0, 12)
      .map((l) => {
        const antigo = lotesAntigos.get(l.id) || {};
        return {
          id: antigo.id || `lot-${ID()}`,
          name: txt(l.name, 80),
          price: txt(l.price, 30),
          max: Math.max(0, Number(l.max) || 0),
          sold: Number(antigo.sold) || 0,
          status: STATUS.includes(l.status) ? l.status : 'programado',
        };
      });
    const vigente = c.lots.find((l) => l.status === 'vigente');
    if (vigente) {
      c.lotSummary = vigente.name;
      if (vigente.price) c.priceFormatted = vigente.price;
    }
  }
  if (tem('photos')) c.photos = (Array.isArray(b.photos) ? b.photos : []).map(urlSegura).filter(Boolean).slice(0, 12);
  if (tem('coverUrl')) c.coverUrl = urlSegura(b.coverUrl);
  if (tem('syllabus')) c.syllabus = txt(b.syllabus, 8000);
  if (tem('partnerIds')) c.partnerIds = lista(b.partnerIds);
  if (tem('paymentUrl')) c.paymentUrl = urlExterna(b.paymentUrl);
  if (tem('pixKey')) c.pixKey = txt(b.pixKey, 140);
  if (tem('pixName')) c.pixName = txt(b.pixName, 120);
  if (tem('bannerTemplateUrl')) c.bannerTemplateUrl = urlSegura(b.bannerTemplateUrl);
  if (tem('certificateTemplateUrl')) c.certificateTemplateUrl = urlSegura(b.certificateTemplateUrl);
  return c;
}

export const camposLoja = (b = {}) => ({
  imageUrl: urlSegura(b.imageUrl),
  videoUrl: urlExterna(b.videoUrl),
  buyUrl: urlExterna(b.buyUrl),
  size: txt(b.size, 80),
});

// Botão Comprar: usa o link do painel; sem ele, a página do produto na loja antiga.
let linksLojaAntiga = null;
export function comLinkDeCompra(itens, arquivo) {
  if (!linksLojaAntiga) {
    try {
      linksLojaAntiga = new Map(JSON.parse(fs.readFileSync(arquivo, 'utf8')).map((p) => [p.id, urlExterna(p.link_antigo)]));
    } catch {
      linksLojaAntiga = new Map();
    }
  }
  return (itens || []).map((s) => ({ ...s, buyUrl: s.buyUrl || linksLojaAntiga.get(s.sourceId) || '' }));
}

export const camposCertificado = (b = {}) => ({
  teachers: txt(b.teachers, 300),
  partnerIds: lista(b.partnerIds),
});

// E-mail e CPF servem só para o aluno encontrar o próprio certificado e nunca saem na API pública.
// O CPF é guardado embaralhado com a chave do servidor, mais os 2 últimos dígitos para o painel.
export const limparCpf = (v) => {
  const d = String(v ?? '').replace(/\D/g, '');
  return d.length >= 9 && d.length <= 11 ? d.padStart(11, '0') : d;
};
export function cpfValido(v) {
  const d = limparCpf(v);
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i += 1) soma += Number(d[i]) * (n + 1 - i);
    return ((soma * 10) % 11) % 10;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}
const hashCpf = (v) => crypto
  .createHmac('sha256', process.env.ADMIN_SESSION_SECRET || 'site-natacao-local')
  .update(limparCpf(v))
  .digest('hex');
export function contatoCertificado(b = {}, prev = {}) {
  const c = {};
  if (b.recipientEmail !== undefined || b.email !== undefined) {
    const e = txt(b.recipientEmail ?? b.email, 200).toLowerCase();
    c.recipientEmail = EMAIL.test(e) ? e : '';
  } else if (prev.recipientEmail) c.recipientEmail = prev.recipientEmail;
  if (cpfValido(b.cpf)) {
    c.cpfHash = hashCpf(b.cpf);
    c.cpfFinal = limparCpf(b.cpf).slice(-2);
  } else if (prev.cpfHash) {
    c.cpfHash = prev.cpfHash;
    c.cpfFinal = prev.cpfFinal;
  }
  return c;
}
export function dadosCertificado(db, cert) {
  const curso = (db.courses || []).find((c) => c.title === cert.courseTitle);
  const modelo = db.settings?.certificateModel || {};
  const ids = cert.partnerIds?.length ? cert.partnerIds : curso?.partnerIds || [];
  return {
    validationCode: cert.validationCode,
    recipientName: cert.recipientName,
    courseTitle: cert.courseTitle,
    workloadHours: cert.workloadHours,
    chancelaInfo: cert.chancelaInfo,
    issuedAt: cert.issuedAt,
    isValid: cert.isValid,
    teachers: cert.teachers || curso?.instructor || '',
    templateUrl: curso?.certificateTemplateUrl || modelo.imageUrl || '',
    modelo: { titulo: modelo.titulo || '', abertura: modelo.abertura || '', texto: modelo.texto || '' },
    partnerLogos: (db.partners || []).filter((p) => ids.includes(p.id) && p.logoUrl).map((p) => p.logoUrl),
  };
}

export const camposPessoa = (b = {}) => ({
  phone: txt(b.phone, 30),
  birthDate: dataIso(b.birthDate),
});

// ---------- últimos lançamentos ----------
const CANAIS_YOUTUBE = ['UCrpnrBHKrISbKt4vBJp4r2Q', 'UCcPX8E650U9AT8B-8h6WouQ'];
const CANAL_PODCAST = 'UCcPX8E650U9AT8B-8h6WouQ';
const SHOW_SPOTIFY = '5NbHmCfbdMmDii5PrFYdDC';
const VALIDADE_LANCAMENTOS = 30 * 60 * 1000;
let lancamentos = null;
let lancamentosEm = 0;
let lancamentosToken = '';

const decodificar = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function ultimoYoutube() {
  const videos = [];
  await Promise.all(CANAIS_YOUTUBE.map(async (canal) => {
    try {
      const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${canal}`, { signal: AbortSignal.timeout(6000) });
      if (!r.ok) return;
      const xml = await r.text();
      const entrada = xml.match(/<entry>[\s\S]*?<\/entry>/);
      if (!entrada) return;
      const id = entrada[0].match(/<yt:videoId>([^<]+)/)?.[1];
      if (!id) return;
      videos.push({
        title: decodificar(entrada[0].match(/<title>([^<]*)/)?.[1]),
        summary: decodificar(entrada[0].match(/<media:description>([^<]*)/)?.[1]).slice(0, 180),
        url: `https://www.youtube.com/watch?v=${id}`,
        image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: entrada[0].match(/<published>([^<]+)/)?.[1] || '',
      });
    } catch { /* canal fora do ar: segue com o outro */ }
  }));
  videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return videos[0] || null;
}

// Só vídeos completos do canal (a lista "UULF" do YouTube deixa os Shorts de fora)
async function ultimasEntrevistas() {
  try {
    const lista = `UULF${CANAL_PODCAST.slice(2)}`;
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${lista}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return [];
    const xml = await r.text();
    return (xml.match(/<entry>[\s\S]*?<\/entry>/g) || []).slice(0, 6).map((e) => {
      const id = e.match(/<yt:videoId>([^<]+)/)?.[1];
      return id ? {
        title: decodificar(e.match(/<title>([^<]*)/)?.[1]),
        url: `https://www.youtube.com/watch?v=${id}`,
        image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        publishedAt: e.match(/<published>([^<]+)/)?.[1] || '',
      } : null;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

async function ultimosInstagram() {
  const token = valorIntegracao('INSTAGRAM_ACCESS_TOKEN');
  if (!token) return [];
  try {
    const campos = 'caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const r = await fetch(`https://graph.instagram.com/me/media?fields=${campos}&limit=6`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return [];
    return ((await r.json())?.data || []).map((p) => {
      const legenda = String(p.caption || '').trim();
      return {
        title: legenda.split('\n')[0].slice(0, 90) || 'Última publicação',
        summary: legenda.split('\n').slice(1).join(' ').trim().slice(0, 180),
        url: p.permalink,
        image: p.media_type === 'VIDEO' ? p.thumbnail_url : p.media_url,
        publishedAt: p.timestamp,
      };
    });
  } catch {
    return [];
  }
}

async function buscarLancamentos() {
  const tokenAtual = valorIntegracao('INSTAGRAM_ACCESS_TOKEN');
  if (lancamentos && lancamentosToken === tokenAtual && Date.now() - lancamentosEm < VALIDADE_LANCAMENTOS) return lancamentos;
  const [youtube, instagramPosts, entrevistas] = await Promise.all([ultimoYoutube(), ultimosInstagram(), ultimasEntrevistas()]);
  lancamentos = {
    youtube,
    instagram: instagramPosts[0] || null,
    instagramPosts,
    entrevistas,
    spotify: {
      embedUrl: `https://open.spotify.com/embed/show/${SHOW_SPOTIFY}?theme=0`,
      url: `https://open.spotify.com/show/${SHOW_SPOTIFY}`,
    },
  };
  lancamentosEm = Date.now();
  lancamentosToken = tokenAtual;
  return lancamentos;
}

// ---------- rotas ----------
export function registrarExtras(app, { requireAdmin, readDb, writeDb, appendAuditLog, arquivoLojaAntiga, arquivoCursos, arquivoProfessores }) {
  const servico = () => createSupabaseServiceClient();

  // Envio de fotos (o painel já reduz a imagem antes de mandar)
  app.post('/api/admin/upload', requireAdmin, async (req, res) => {
    const m = String(req.body?.dataUrl || '').match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return res.status(400).json({ error: 'Envie uma imagem PNG, JPG ou WEBP.' });
    const dados = Buffer.from(m[2], 'base64');
    if (dados.length > MAX_FOTO_BYTES) return res.status(413).json({ error: 'Imagem muito grande.' });
    const assinatura = {
      png: dados.subarray(0, 4).toString('hex') === '89504e47',
      jpeg: dados.subarray(0, 3).toString('hex') === 'ffd8ff',
      webp: dados.subarray(0, 4).toString() === 'RIFF' && dados.subarray(8, 12).toString() === 'WEBP',
    };
    if (!assinatura[m[1]]) return res.status(400).json({ error: 'O arquivo não é uma imagem válida.' });
    const cliente = servico();
    if (!cliente) return res.status(503).json({ error: 'Envio de fotos indisponível: falta a chave do Supabase no servidor.' });

    const pasta = /^[a-z-]{2,20}$/.test(String(req.body?.pasta || '')) ? req.body.pasta : 'geral';
    const caminho = `${pasta}/${Date.now()}-${ID()}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
    const opcoes = { contentType: `image/${m[1]}`, cacheControl: '31536000', upsert: false };
    let { error } = await cliente.storage.from(BUCKET_FOTOS).upload(caminho, dados, opcoes);
    if (error && /bucket not found/i.test(error.message || '')) {
      const criado = await cliente.storage.createBucket(BUCKET_FOTOS, { public: true });
      if (criado.error) return res.status(502).json({ error: 'Não foi possível preparar o espaço de fotos.' });
      ({ error } = await cliente.storage.from(BUCKET_FOTOS).upload(caminho, dados, opcoes));
    }
    if (error) {
      console.error('[upload]', error.message);
      return res.status(502).json({ error: 'Não foi possível guardar a foto.' });
    }
    res.status(201).json({ url: cliente.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data.publicUrl });
  });

  // Parceiros
  const parceiro = (b, prev = {}) => ({
    ...prev,
    name: txt(b.name ?? prev.name, 120),
    logoUrl: urlSegura(b.logoUrl ?? prev.logoUrl),
    url: urlExterna(b.url ?? prev.url),
    showHeader: b.showHeader !== undefined ? Boolean(b.showHeader) : prev.showHeader !== false,
    showFooter: b.showFooter !== undefined ? Boolean(b.showFooter) : prev.showFooter !== false,
    active: b.active !== undefined ? Boolean(b.active) : prev.active !== false,
  });
  app.post('/api/admin/partners', requireAdmin, (req, res) => {
    if (!txt(req.body?.name)) return res.status(400).json({ error: 'Informe o nome do parceiro.' });
    const db = readDb();
    const item = { id: `prc-${ID()}`, ...parceiro(req.body) };
    db.partners = [...(db.partners || []), item];
    appendAuditLog(db, req.adminUser, 'created', 'partners', `Parceiro adicionado: ${item.name}.`);
    writeDb(db);
    res.status(201).json({ item });
  });
  app.put('/api/admin/partners/:id', requireAdmin, (req, res) => {
    const db = readDb();
    const i = (db.partners || []).findIndex((p) => p.id === req.params.id);
    if (i === -1) return res.status(404).json({ error: 'Parceiro não encontrado.' });
    db.partners[i] = parceiro(req.body, db.partners[i]);
    appendAuditLog(db, req.adminUser, 'updated', 'partners', `Parceiro atualizado: ${db.partners[i].name}.`);
    writeDb(db);
    res.json({ item: db.partners[i] });
  });
  app.delete('/api/admin/partners/:id', requireAdmin, (req, res) => {
    const db = readDb();
    db.partners = (db.partners || []).filter((p) => p.id !== req.params.id);
    appendAuditLog(db, req.adminUser, 'deleted', 'partners', `Parceiro removido (${req.params.id}).`);
    writeDb(db);
    res.json({ ok: true });
  });

  // Duplicar
  app.post('/api/admin/store-items/:id/duplicate', requireAdmin, (req, res) => {
    const db = readDb();
    const orig = (db.storeItems || []).find((s) => s.id === req.params.id);
    if (!orig) return res.status(404).json({ error: 'Material não encontrado.' });
    const item = { ...structuredClone(orig), id: `str-${ID()}`, title: `${orig.title} (Cópia)`, active: false };
    db.storeItems.unshift(item);
    appendAuditLog(db, req.adminUser, 'duplicated', 'store', `Material duplicado: ${orig.title}.`);
    writeDb(db);
    res.status(201).json({ item });
  });
  const novoCodigo = (db) => {
    const usados = new Set((db.certificates || []).map((c) => c.validationCode));
    let codigo;
    do {
      codigo = `NC-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;
    } while (usados.has(codigo));
    usados.add(codigo);
    return codigo;
  };
  app.post('/api/admin/certificates/:id/duplicate', requireAdmin, (req, res) => {
    const db = readDb();
    const orig = (db.certificates || []).find((c) => c.id === req.params.id);
    if (!orig) return res.status(404).json({ error: 'Certificado não encontrado.' });
    const item = { ...structuredClone(orig), id: `crt-${ID()}`, validationCode: novoCodigo(db), recipientName: `${orig.recipientName} (Cópia)` };
    db.certificates.unshift(item);
    appendAuditLog(db, req.adminUser, 'duplicated', 'certificates', `Certificado duplicado a partir de ${orig.validationCode}.`);
    writeDb(db);
    res.status(201).json({ item });
  });

  // Certificados em lote (nomes vindos do Excel)
  app.post('/api/admin/certificates/importar', requireAdmin, (req, res) => {
    const b = req.body || {};
    const entrada = Array.isArray(b.alunos) ? b.alunos : (Array.isArray(b.names) ? b.names : []).map((name) => ({ name }));
    const porNome = new Map();
    entrada.forEach((a) => {
      const name = txt(a?.name, 140);
      if (name && !porNome.has(name.toLowerCase())) porNome.set(name.toLowerCase(), { ...a, name });
    });
    const nomes = [...porNome.values()];
    const cpfInvalidos = nomes.filter((a) => a.cpf && !cpfValido(a.cpf)).length;
    if (!txt(b.courseTitle)) return res.status(400).json({ error: 'Informe a formação.' });
    if (!nomes.length) return res.status(400).json({ error: 'Nenhum nome encontrado na planilha.' });
    if (nomes.length > 2000) return res.status(400).json({ error: 'Importe no máximo 2.000 nomes por vez.' });
    const db = readDb();
    db.certificates = db.certificates || [];
    const titulo = txt(b.courseTitle, 200);
    const jaTem = new Map(db.certificates.filter((c) => c.courseTitle === titulo).map((c) => [c.recipientName.toLowerCase(), c]));
    // Aluno que já tinha certificado: só completa e-mail e CPF que estavam vazios
    let completados = 0;
    nomes.forEach((a) => {
      const atual = jaTem.get(a.name.toLowerCase());
      if (!atual) return;
      const novo = contatoCertificado({ email: a.email, cpf: a.cpf });
      let mudou = false;
      if (!atual.recipientEmail && novo.recipientEmail) { atual.recipientEmail = novo.recipientEmail; mudou = true; }
      if (!atual.cpfHash && novo.cpfHash) { atual.cpfHash = novo.cpfHash; atual.cpfFinal = novo.cpfFinal; mudou = true; }
      if (mudou) completados += 1;
    });
    const novos = nomes.filter((a) => !jaTem.has(a.name.toLowerCase())).map((a) => ({
      id: `crt-${ID()}`,
      validationCode: (() => {
        const c = novoCodigo(db);
        db.certificates.push({ validationCode: c, recipientName: '', courseTitle: '', __temp: true });
        return c;
      })(),
      recipientName: a.name,
      courseTitle: titulo,
      workloadHours: Number(b.workloadHours) || 0,
      chancelaInfo: 'Conformidade CREF / Natação Criativa',
      issuedAt: dataIso(b.issuedAt) || new Date().toISOString().slice(0, 10),
      isValid: true,
      ...camposCertificado(b),
      ...contatoCertificado({ email: a.email ?? '', cpf: a.cpf }),
    }));
    db.certificates = [...novos, ...db.certificates.filter((c) => !c.__temp)];
    appendAuditLog(db, req.adminUser, 'created', 'certificates', `${novos.length} certificados importados: ${titulo}.`);
    writeDb(db);
    res.status(201).json({ criados: novos.length, repetidos: nomes.length - novos.length, completados, cpfInvalidos });
  });

  // O aluno encontra os próprios certificados pelo e-mail ou CPF
  const tentativas = new Map();
  app.post('/api/public/certificates/buscar', (req, res) => {
    const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const agora = Date.now();
    const t = tentativas.get(ip);
    const registro = t && agora - t.inicio < 60000 ? t : { inicio: agora, n: 0 };
    registro.n += 1;
    tentativas.set(ip, registro);
    if (tentativas.size > 5000) tentativas.clear();
    if (registro.n > 10) return res.status(429).json({ error: 'Muitas tentativas. Aguarde um minuto e tente de novo.' });

    const busca = txt(req.body?.busca, 200).toLowerCase();
    const porEmail = EMAIL.test(busca);
    if (!porEmail && !cpfValido(busca)) return res.status(400).json({ error: 'Digite um e-mail ou CPF válido.' });
    const db = readDb();
    const alvo = porEmail ? busca : hashCpf(busca);
    const achados = (db.certificates || []).filter((c) => c.isValid !== false && (porEmail ? c.recipientEmail === alvo : c.cpfHash === alvo));
    res.json({ certificados: achados.map((c) => dadosCertificado(db, c)) });
  });

  // Modelo padrão do certificado
  app.put('/api/admin/certificate-model', requireAdmin, (req, res) => {
    const b = req.body || {};
    const db = readDb();
    db.settings = {
      ...db.settings,
      certificateModel: { imageUrl: urlSegura(b.imageUrl), titulo: txt(b.titulo, 60), abertura: txt(b.abertura, 120), texto: txt(b.texto, 120) },
    };
    appendAuditLog(db, req.adminUser, 'updated', 'certificates', 'Modelo padrão do certificado atualizado.');
    writeDb(db);
    res.json({ certificateModel: db.settings.certificateModel });
  });

  // Destinos dos caminhos Famílias e Alunos
  app.put('/api/admin/site-links', requireAdmin, (req, res) => {
    const db = readDb();
    db.settings = { ...db.settings, aquagendaUrl: urlExterna(req.body?.aquagendaUrl), treinosUrl: urlExterna(req.body?.treinosUrl) };
    appendAuditLog(db, req.adminUser, 'updated', 'settings', 'Links de Famílias e Alunos atualizados.');
    writeDb(db);
    res.json({ aquagendaUrl: db.settings.aquagendaUrl, treinosUrl: db.settings.treinosUrl });
  });

  // Traz os 66 produtos da loja antiga para o painel (não apaga nada; exemplos ficam pausados)
  app.post('/api/admin/store-items/importar', requireAdmin, (req, res) => {
    let produtos;
    try {
      produtos = JSON.parse(fs.readFileSync(arquivoLojaAntiga, 'utf8'));
    } catch {
      return res.status(500).json({ error: 'Não foi possível ler os produtos da loja antiga.' });
    }
    const db = readDb();
    db.storeItems = db.storeItems || [];
    const existentes = new Set(db.storeItems.map((s) => s.sourceId).filter(Boolean));
    const CATEGORIA = { Brinquedos: 'Brinquedos pedagógicos', Uniformes: 'Uniformes', Livros: 'Livros', 'Materiais de Natação': 'Materiais de natação' };
    const novos = produtos.filter((p) => !existentes.has(p.id)).map((p) => ({
      id: `str-${ID()}`,
      sourceId: p.id,
      category: CATEGORIA[p.categoria] || 'Brinquedos pedagógicos',
      title: p.nome,
      summary: txt(p.resumo || p.descricao, 600),
      badge: p.estoque === 'pronta' ? 'Pronta entrega' : 'Sob encomenda',
      price: `R$ ${Number(p.preco).toFixed(2).replace('.', ',').replace(',00', '')}`,
      delivery: p.estoque === 'pronta' ? 'Pronta entrega · frete pelo atendimento' : 'Sob encomenda · prazo e frete pelo atendimento',
      imageUrl: p.foto ? `/loja/fotos/${p.foto}` : '',
      videoUrl: '',
      size: '',
      active: true,
    }));
    // Produtos já importados antes: preenche a situação de estoque só se ninguém a editou
    const porOrigem = new Map(produtos.map((p) => [p.id, p]));
    let atualizados = 0;
    db.storeItems.forEach((s) => {
      const p = porOrigem.get(s.sourceId);
      if (!p || s.badge || s.delivery !== 'Disponibilidade e frete pelo atendimento') return;
      s.badge = p.estoque === 'pronta' ? 'Pronta entrega' : 'Sob encomenda';
      s.delivery = p.estoque === 'pronta' ? 'Pronta entrega · frete pelo atendimento' : 'Sob encomenda · prazo e frete pelo atendimento';
      atualizados += 1;
    });
    let pausados = 0;
    db.storeItems.forEach((s) => {
      if (/^str-[1-6]$/.test(s.id) && s.active) {
        s.active = false;
        pausados += 1;
      }
    });
    db.storeItems = [...db.storeItems, ...novos];
    appendAuditLog(db, req.adminUser, 'created', 'store', `${novos.length} produtos importados da loja antiga; ${atualizados} com estoque atualizado.`);
    writeDb(db);
    res.status(201).json({ importados: novos.length, pausados, atualizados });
  });

  // Traz o catálogo da plataforma de cursos como RASCUNHO (só aparece no site depois de publicar)
  app.post('/api/admin/courses/importar', requireAdmin, (req, res) => {
    let cursos;
    try {
      cursos = JSON.parse(fs.readFileSync(arquivoCursos, 'utf8'));
    } catch {
      return res.status(500).json({ error: 'Não foi possível ler o catálogo de cursos.' });
    }
    const db = readDb();
    db.courses = db.courses || [];
    const existentes = new Set(db.courses.map((c) => c.sourceId).filter(Boolean));
    const reais = (cent) => `R$ ${(cent / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const novos = cursos.filter((c) => !existentes.has(c.sourceId)).map((c, i) => {
      const aulas = c.lessons || [];
      const minutos = Number(c.totalMinutes) || 0;
      const horas = Math.round(minutos / 60);
      return {
        id: `crs-${ID()}`,
        sourceId: c.sourceId,
        code: `AP-${String(db.courses.length + i + 1).padStart(3, '0')}-${ID().slice(0, 4).toUpperCase()}`,
        title: txt(c.title, 200),
        subtitle: '',
        description: txt(c.description, 4000) || 'Formação da Natação Criativa.',
        category: txt(c.category, 80) || 'Curso',
        theme: 'geral',
        format: 'Online Gravado',
        modalityDetails: aulas.length ? `${aulas.length} ${aulas.length === 1 ? 'aula gravada' : 'aulas gravadas'}` : 'Online gravado',
        locationOrUrl: 'Online',
        workload: horas ? `${horas}h de conteúdo` : minutos ? `${minutos} min de conteúdo` : '',
        status: 'rascunho',
        isFree: Boolean(c.isFree),
        enrolledCount: 0,
        maxCapacity: 0,
        waitlistCount: 0,
        priceFormatted: c.isFree ? 'R$ 0,00' : reais(Number(c.priceCents) || 0),
        installmentInfo: '',
        lotSummary: '',
        certificateBadge: c.certificate ? 'Certificado incluso' : '',
        coverUrl: urlSegura(c.coverUrl),
        paymentUrl: urlExterna(c.url),
        pixKey: '',
        pixName: '',
        photos: [],
        lots: [],
        partnerIds: [],
        syllabus: txt(aulas.map((a) => a.title).filter(Boolean).join('\n'), 8000),
        featured: false,
        ...montarAgenda({ sessions: [], instructors: [], startDateLabel: 'Acesso imediato' }, {}),
        updatedAt: new Date().toISOString(),
      };
    });
    db.courses = [...db.courses, ...novos];
    appendAuditLog(db, req.adminUser, 'created', 'courses', `${novos.length} cursos importados da plataforma como rascunho.`);
    writeDb(db);
    res.status(201).json({ importados: novos.length, jaExistiam: cursos.length - novos.length });
  });

  // Preenche os professores identificados nas capas, só em cursos ainda sem docente
  app.post('/api/admin/courses/professores', requireAdmin, (req, res) => {
    let mapa;
    try {
      mapa = JSON.parse(fs.readFileSync(arquivoProfessores, 'utf8'));
    } catch {
      return res.status(500).json({ error: 'Não foi possível ler a lista de professores.' });
    }
    const db = readDb();
    let preenchidos = 0;
    let jaTinham = 0;
    (db.courses || []).forEach((c) => {
      const nomes = c.sourceId && mapa[c.sourceId];
      if (!nomes) return;
      if ((c.instructors || []).length) {
        jaTinham += 1;
        return;
      }
      Object.assign(c, montarAgenda({ instructors: nomes.map((name) => ({ name, role: '', bio: '' })) }, c));
      c.updatedAt = new Date().toISOString();
      preenchidos += 1;
    });
    appendAuditLog(db, req.adminUser, 'updated', 'courses', `Professores preenchidos em ${preenchidos} cursos importados.`);
    writeDb(db);
    res.json({ preenchidos, jaTinham });
  });

  // Episódios de podcast: quem aparece é convidado(a). Não troca função já preenchida.
  app.post('/api/admin/courses/convidados-podcast', requireAdmin, (req, res) => {
    const db = readDb();
    let episodios = 0;
    let pessoas = 0;
    (db.courses || []).forEach((c) => {
      if (String(c.category || '').trim().toUpperCase() !== 'PODCAST' || !(c.instructors || []).length) return;
      let mudou = false;
      c.instructors = c.instructors.map((d) => {
        if (d.role) return d;
        mudou = true;
        pessoas += 1;
        return { ...d, role: 'Convidado(a)' };
      });
      if (!mudou) return;
      c.instructorRole = c.instructors[0].role;
      c.updatedAt = new Date().toISOString();
      episodios += 1;
    });
    appendAuditLog(db, req.adminUser, 'updated', 'courses', `Convidados marcados em ${episodios} episódios de podcast.`);
    writeDb(db);
    res.json({ episodios, pessoas });
  });

  // Lead antes do pagamento: só depois do cadastro a pessoa recebe o link e o Pix
  app.post('/api/public/leads', async (req, res) => {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true, pagamento: {} }); // campo-isca contra robôs
    const name = txt(b.name, 120);
    const email = txt(b.email, 200).toLowerCase();
    const { phone, birthDate } = camposPessoa(b);
    if (!name || !EMAIL.test(email) || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ error: 'Preencha nome, e-mail e telefone com DDD.' });
    }
    if (b.consent !== true) return res.status(400).json({ error: 'É preciso aceitar a Política de Privacidade.' });
    const db = readDb();
    const curso = (db.courses || []).find((c) => c.id === b.courseId && c.status !== 'rascunho');
    if (!curso) return res.status(404).json({ error: 'Formação não encontrada.' });

    db.leads = db.leads || [];
    const agora = new Date().toISOString();
    const existente = db.leads.find((l) => l.email === email && l.courseId === curso.id);
    if (existente) Object.assign(existente, { name, phone, birthDate: birthDate || existente.birthDate, updatedAt: agora });
    else db.leads.unshift({ id: `lead-${ID()}`, courseId: curso.id, courseTitle: curso.title, name, email, phone, birthDate, status: 'novo', createdAt: agora, updatedAt: agora });
    writeDb(db);

    const cliente = servico();
    if (cliente) {
      const { error } = await cliente.from('course_leads').upsert(
        { course_code: curso.code, course_title: curso.title, name, email, phone, birth_date: birthDate || null, updated_at: agora },
        { onConflict: 'course_code,email' }
      );
      if (error) console.error('[leads]', error.message);
    }
    const vigente = (curso.lots || []).find((l) => l.status === 'vigente');
    res.status(201).json({
      ok: true,
      pagamento: {
        paymentUrl: curso.paymentUrl || '',
        pixKey: curso.pixKey || '',
        pixName: curso.pixName || '',
        preco: vigente?.price || curso.priceFormatted || '',
        lote: vigente?.name || '',
      },
    });
  });

  app.get('/api/public/ultimos', async (req, res) => {
    res.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    res.json(await buscarLancamentos());
  });

  // Atividade: o site só envia depois que a pessoa aceita o aviso de privacidade
  app.post('/api/public/atividade', async (req, res) => {
    const b = req.body || {};
    const visitor = txt(b.visitorId, 40);
    const eventos = Array.isArray(b.events) ? b.events.slice(0, 30) : [];
    if (!/^[a-z0-9-]{16,40}$/i.test(visitor) || !eventos.length) return res.status(400).json({ ok: false });
    const cliente = servico();
    if (!cliente) return res.status(202).json({ ok: false });
    const email = EMAIL.test(txt(b.email, 200)) ? txt(b.email, 200).toLowerCase() : null;
    const linhas = eventos.map((e) => ({
      visitor_id: visitor,
      email,
      event_type: ['pagina', 'clique'].includes(e?.type) ? e.type : 'pagina',
      path: txt(e?.path, 200) || '/',
      label: txt(e?.label, 160) || null,
      seconds: Math.min(14400, Math.max(0, Math.round(Number(e?.seconds) || 0))),
    }));
    const { error } = await cliente.from('site_activity').insert(linhas);
    if (error) console.error('[atividade]', error.message);
    res.status(202).json({ ok: !error });
  });

  app.get('/api/admin/atividade', requireAdmin, async (req, res) => {
    const cliente = servico();
    if (!cliente) return res.json({ pessoas: [], aviso: 'Falta a chave do Supabase no servidor.' });
    const { data, error } = await cliente
      .from('site_activity')
      .select('visitor_id,email,event_type,path,label,seconds,created_at')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (error) return res.json({ pessoas: [], aviso: 'A tabela de atividade ainda não existe no banco: rode o comando SQL.' });

    const emailDoVisitante = new Map();
    data.forEach((l) => { if (l.email && !emailDoVisitante.has(l.visitor_id)) emailDoVisitante.set(l.visitor_id, l.email); });
    const db = readDb();
    const nomes = new Map((db.leads || []).map((l) => [l.email, l.name]));
    const pessoas = new Map();
    data.forEach((l) => {
      const email = l.email || emailDoVisitante.get(l.visitor_id) || '';
      const chave = email || l.visitor_id;
      if (!pessoas.has(chave)) pessoas.set(chave, { chave, email, nome: nomes.get(email) || '', segundos: 0, paginas: {}, cliques: [], ultimo: l.created_at });
      const p = pessoas.get(chave);
      if (l.event_type === 'clique') {
        if (p.cliques.length < 30) p.cliques.push({ label: l.label || l.path, path: l.path, em: l.created_at });
      } else {
        p.segundos += l.seconds;
        p.paginas[l.path] = (p.paginas[l.path] || 0) + l.seconds;
      }
    });
    res.json({
      pessoas: [...pessoas.values()]
        .map((p) => ({ ...p, paginas: Object.entries(p.paginas).map(([path, segundos]) => ({ path, segundos })).sort((a, b) => b.segundos - a.segundos) }))
        .sort((a, b) => b.ultimo.localeCompare(a.ultimo))
        .slice(0, 300),
    });
  });
}
