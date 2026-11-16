// Ponte entre o site e o banco Supabase. Todas as rotas ficam em /api/...
import express from 'express';
import { supabase, supabaseConfigurado } from './supabaseClient.js';

const api = express.Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const PERFIS = { 'professor(a)': 'professor', professor: 'professor', 'gestor(a)': 'gestor', gestor: 'gestor', 'família': 'familia', familia: 'familia', 'aluno(a)': 'aluno', aluno: 'aluno' };
const perfil = (v) => PERFIS[texto(v, 40).toLowerCase()] || 'outro';

api.get('/status', (req, res) => {
  res.json({ banco: supabaseConfigurado });
});

// Daqui para baixo, tudo depende do banco.
api.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!supabaseConfigurado) return res.status(503).json({ ok: false, motivo: 'banco_nao_configurado' });
  next();
});

const responder = (res, { data, error }) => {
  if (error) {
    console.error('[banco]', error.message);
    return res.status(502).json({ ok: false, motivo: 'erro_no_banco' });
  }
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ ok: true, itens: data });
};

api.get('/cursos', async (req, res) => {
  responder(res, await supabase
    .from('courses')
    .select('code,slug,title,subtitle,description,category,theme,format,level,target_audience,status,is_free,has_certificate,certificate_badge,workload_label,modality_details,city_state,start_date_label,display_price_cents,installments_count,installment_value_cents,price_label,cover_image_url,cover_image_alt,is_featured,featured_order,instructor_display_name')
    .neq('status', 'rascunho')
    .order('featured_order', { ascending: true, nullsFirst: false })
    .order('title'));
});

api.get('/conteudos', async (req, res) => {
  responder(res, await supabase
    .from('ecosystem_contents')
    .select('channel,title,summary,external_url,cta_label,thumbnail_url,thumbnail_alt,badge_meta,episode_number,duration_minutes,published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false }));
});

api.get('/depoimentos', async (req, res) => {
  responder(res, await supabase
    .from('testimonials')
    .select('author_name,author_role_location,quote,is_verified')
    .eq('is_published', true)
    .order('sort_order'));
});

api.get('/config', async (req, res) => {
  responder(res, await supabase.from('site_settings').select('key,value'));
});

api.get('/certificados/:codigo', async (req, res) => {
  const codigo = texto(req.params.codigo, 40);
  if (codigo.length < 4) return res.status(400).json({ ok: false, motivo: 'codigo_invalido' });
  const { data, error } = await supabase.rpc('verify_certificate', { p_code: codigo });
  if (error) {
    console.error('[banco]', error.message);
    return res.status(502).json({ ok: false, motivo: 'erro_no_banco' });
  }
  res.json({ ok: true, certificado: (data && data[0]) || null });
});

api.post('/cardume', async (req, res) => {
  const email = texto(req.body?.email, 200).toLowerCase();
  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, motivo: 'email_invalido' });
  const { error } = await supabase.from('cardume_subscribers').insert({
    email,
    profile_type: perfil(req.body?.perfil),
    source_page: texto(req.body?.pagina, 80) || 'home',
  });
  // 23505 = e-mail já cadastrado: para a pessoa, o resultado é o mesmo
  if (error && error.code !== '23505') {
    console.error('[banco]', error.message);
    return res.status(502).json({ ok: false, motivo: 'erro_no_banco' });
  }
  res.json({ ok: true });
});

const TIPOS = ['aula_particular', 'sugestao_tema', 'consultoria_academia', 'suporte'];

api.post('/contato', async (req, res) => {
  const nome = texto(req.body?.nome, 120);
  const email = texto(req.body?.email, 200).toLowerCase();
  const mensagem = texto(req.body?.mensagem, 4000);
  if (!nome || !mensagem) return res.status(400).json({ ok: false, motivo: 'campos_obrigatorios' });
  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, motivo: 'email_invalido' });
  const tipo = TIPOS.includes(req.body?.tipo) ? req.body.tipo : 'suporte';
  const { error } = await supabase.from('inquiries').insert({
    inquiry_type: tipo,
    name: nome,
    email,
    phone: texto(req.body?.telefone, 40) || null,
    profile_type: texto(req.body?.perfil, 40) || null,
    subject: texto(req.body?.assunto, 160) || null,
    message: mensagem,
  });
  if (error) {
    console.error('[banco]', error.message);
    return res.status(502).json({ ok: false, motivo: 'erro_no_banco' });
  }
  res.json({ ok: true });
});

export default api;
