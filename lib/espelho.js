// Espelha os dados do painel admin nas tabelas do Supabase.
//
// O painel trabalha com um documento JSON único (ver lib/store.js). A cada gravação,
// este módulo copia cursos, lotes, destaques, conteúdos, depoimentos, certificados e
// configurações para as tabelas do banco, para que o que se vê no painel seja o que
// está no Table Editor do Supabase. O sentido é só painel -> tabelas.
import crypto from 'node:crypto';

// ---------- utilidades ----------
// Os ids do painel são textos ("crs-01"); as tabelas usam uuid. O mesmo texto vira sempre o mesmo uuid.
export function uuidDe(texto) {
  const h = crypto.createHash('sha1').update(`natacao-criativa:${texto}`).digest('hex');
  const variante = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variante}${h.slice(18, 20)}-${h.slice(20, 32)}`;
}

const semAcento = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const txt = (v, padrao = '') => (v === undefined || v === null ? padrao : String(v));
const inteiro = (v, padrao = 0) => {
  const n = parseInt(String(v ?? '').replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : padrao;
};
// "R$ 1.890,50" -> 189050
export function centavos(v) {
  const m = String(v || '').match(/(\d[\d.]*)(?:,(\d{1,2}))?/);
  if (!m) return 0;
  return parseInt(m[1].replace(/\./g, ''), 10) * 100 + parseInt((m[2] || '0').padEnd(2, '0'), 10);
}
const dataIso = (v) => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : null);
const slug = (v) => semAcento(v).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';

function categoria(v) {
  const t = semAcento(v);
  if (t.includes('pos')) return 'pos_graduacao';
  if (t.includes('especializ')) return 'especializacao';
  if (t.includes('workshop')) return 'workshop';
  if (t.includes('palestra')) return 'palestra';
  if (t.includes('imers')) return 'imersao';
  if (t.includes('grupo')) return 'grupo_estudos';
  if (t.includes('treino')) return 'treino';
  if (t.includes('guia')) return 'guia_aberto';
  return 'curso_pratico';
}
const TEMAS = ['natacao_infantil', 'biomecanica', 'personal_aquatico', 'seguranca_salvamento', 'gestao_escolas', 'geral'];
function formato(v) {
  const t = semAcento(v);
  if (t.includes('online') && t.includes('hibrido')) return 'online_hibrido';
  if (t.includes('hibrido')) return 'hibrido';
  if (t.includes('ao vivo')) return 'online_ao_vivo';
  if (t.includes('presencial')) return 'presencial';
  return 'online_gravado';
}
function nivel(v) {
  const t = semAcento(v);
  if (t.includes('avanc')) return 'avancado';
  if (t.includes('intermed')) return 'intermediario';
  return 'iniciacao';
}
const STATUS_CURSO = ['aberto', 'em_breve', 'gravacao', 'encerrado', 'rascunho'];
const STATUS_LOTE = ['programado', 'vigente', 'esgotado', 'encerrado'];
const CANAIS = { podcast: 'spotify', spotify: 'spotify', video: 'youtube', youtube: 'youtube', instagram: 'instagram', artigo: 'artigo', ebook: 'ebook', planilha: 'ebook' };

// ---------- JSON do painel -> linhas das tabelas ----------
export function montarLinhas(dados) {
  const cursos = dados.courses || [];
  const codigos = new Set();
  const slugs = new Set();
  const unico = (conjunto, base) => {
    let valor = base;
    for (let i = 2; conjunto.has(valor); i++) valor = `${base}-${i}`;
    conjunto.add(valor);
    return valor;
  };

  const courses = cursos.map((c) => {
    const parcelas = String(c.installmentInfo || '').match(/(\d+)\s*x\s*(R\$\s*[\d.,]+)/i);
    return {
      id: uuidDe(c.id),
      code: unico(codigos, txt(c.code, c.id)),
      slug: unico(slugs, slug(c.title)),
      title: txt(c.title, 'Sem título'),
      subtitle: txt(c.subtitle) || null,
      description: txt(c.description),
      category: categoria(c.category),
      theme: TEMAS.includes(c.theme) ? c.theme : 'geral',
      format: formato(c.format),
      level: nivel(c.level),
      status: STATUS_CURSO.includes(c.status) ? c.status : 'rascunho',
      is_free: Boolean(c.isFree),
      has_certificate: Boolean(c.certificateBadge),
      certificate_badge: txt(c.certificateBadge) || null,
      workload_hours: inteiro(c.workload, null),
      workload_label: txt(c.workload) || null,
      modality_details: txt(c.modalityDetails) || null,
      location_or_url: txt(c.locationOrUrl) || null,
      start_date: dataIso(c.startDate),
      start_date_label: txt(c.startDateLabel) || null,
      // colunas da migração 0006 (se ainda não existirem, são retiradas no envio)
      end_date: dataIso(c.endDate),
      schedule: Array.isArray(c.sessions) ? c.sessions : [],
      instructors: Array.isArray(c.instructors) ? c.instructors : [],
      max_capacity: inteiro(c.maxCapacity, 0),
      display_price_cents: c.isFree ? 0 : centavos(c.priceFormatted),
      installments_count: parcelas ? Math.max(1, parseInt(parcelas[1], 10)) : 1,
      installment_value_cents: parcelas ? centavos(parcelas[2]) : null,
      price_label: txt(c.priceFormatted) || null,
      cover_image_url: txt(c.coverUrl) || null,
      is_featured: Boolean(c.featured),
      instructor_display_name: txt(c.instructor) || null,
    };
  });

  const course_lots = cursos.flatMap((c) =>
    (c.lots || []).map((l, i) => ({
      id: uuidDe(`${c.id}/${l.id || i}`),
      course_id: uuidDe(c.id),
      name: txt(l.name, `Lote ${i + 1}`),
      price_cents: centavos(l.price),
      max_slots: inteiro(l.max, 0),
      status: STATUS_LOTE.includes(l.status) ? l.status : 'programado',
      sort_order: i + 1,
    }))
  );

  const hero_highlights = (dados.highlights || []).map((h, i) => ({
    id: uuidDe(h.id),
    badge_label: txt(h.badge, 'DESTAQUE'),
    title: txt(h.title, 'Sem título'),
    subtitle: txt(h.subtitle),
    cta_label: txt(h.ctaLabel, 'Saiba mais'),
    cta_url: txt(h.ctaUrl, '/formacoes'),
    trust_badge_label: txt(h.trustBadge) || null,
    image_url: txt(h.imageUrl),
    image_caption: txt(h.imageCaption) || null,
    sort_order: inteiro(h.sortOrder, i + 1),
    is_active: h.active !== false,
  }));

  const ecosystem_contents = (dados.contents || []).map((c) => ({
    id: uuidDe(c.id),
    channel: CANAIS[semAcento(c.channel)] || 'artigo',
    title: txt(c.title, 'Sem título'),
    summary: txt(c.summary),
    external_url: txt(c.externalUrl, '#') || '#',
    cta_label: txt(c.ctaLabel, 'Acessar') || 'Acessar',
    badge_meta: txt(c.badgeMeta) || null,
    is_published: c.published !== false,
  }));

  const testimonials = (dados.testimonials || []).map((t, i) => ({
    id: uuidDe(t.id),
    author_name: txt(t.authorName, 'Anônimo'),
    author_role_location: txt(t.authorRoleLocation),
    quote: txt(t.quote),
    is_verified: Boolean(t.verified),
    is_published: t.published !== false,
    sort_order: inteiro(t.sortOrder, i + 1),
  }));

  // A tabela de certificados exige um curso; o painel guarda só o título do curso.
  const cursoPorTitulo = new Map(cursos.map((c) => [semAcento(c.title).trim(), uuidDe(c.id)]));
  const certificados = dados.certificates || [];
  const certificates = certificados
    .filter((c) => c.validationCode && cursoPorTitulo.has(semAcento(c.courseTitle).trim()))
    .map((c) => ({
      id: uuidDe(c.id),
      course_id: cursoPorTitulo.get(semAcento(c.courseTitle).trim()),
      validation_code: txt(c.validationCode).toUpperCase(),
      recipient_name: txt(c.recipientName, 'Sem nome'),
      course_title: txt(c.courseTitle),
      workload_hours: inteiro(c.workloadHours, 0),
      chancela_info: txt(c.chancelaInfo) || null,
      is_valid: c.isValid !== false,
      ...(dataIso(c.issuedAt) ? { issued_at: `${dataIso(c.issuedAt)}T12:00:00Z` } : {}),
    }));

  const s = dados.settings || {};
  const site_settings = [
    { key: 'painel_configuracoes', value: s, description: 'Configurações gerais editadas no painel admin' },
    {
      key: 'trajectory_metrics',
      value: {
        experience_years: s.experienceYears ?? null,
        certificates_issued: s.certificatesIssued ?? null,
        students_impacted: s.studentsImpacted ?? null,
        ebooks_published: s.ebooksPublished ?? null,
        courses_available: s.coursesAvailable ?? null,
      },
      description: 'Números exibidos na seção Trajetória da página inicial',
    },
    {
      key: 'contact_info',
      value: { email: s.contactEmail ?? null, support_hours: s.supportHours ?? null, cref_notice: s.crefNotice ?? null },
      description: 'Informações institucionais de atendimento e rodapé',
    },
    { key: 'itens_da_loja_do_painel', value: dados.storeItems || [], description: 'Itens da loja cadastrados no painel admin' },
    { key: 'politica_de_privacidade', value: dados.privacyPolicy || {}, description: 'Política de Privacidade publicada' },
  ];

  return {
    linhas: { courses, course_lots, hero_highlights, ecosystem_contents, testimonials, certificates, site_settings },
    certificadosSemCurso: certificados.length - certificates.length,
  };
}

// Ordem importa: cursos antes de lotes e certificados (que apontam para cursos).
const TABELAS = [
  { nome: 'courses', chave: 'id' },
  { nome: 'course_lots', chave: 'id' },
  { nome: 'hero_highlights', chave: 'id' },
  { nome: 'ecosystem_contents', chave: 'id' },
  { nome: 'testimonials', chave: 'id' },
  { nome: 'certificates', chave: 'id' },
  { nome: 'site_settings', chave: 'key', semRemocao: true },
];

const ultimaVersao = new Map(); // tabela -> impressão digital do que já foi espelhado

// Colunas que só existem depois de rodar supabase/migrations/20261117000001_*.sql
const COLUNAS_NOVAS = { courses: ['end_date', 'schedule', 'instructors'] };
const colunaFaltando = (erro) => erro?.code === 'PGRST204' || /could not find the .* column/i.test(String(erro?.message || ''));
const semColunas = (lista, colunas) => lista.map((linha) => {
  const copia = { ...linha };
  colunas.forEach((c) => delete copia[c]);
  return copia;
});

// Copia para as tabelas só o que mudou desde a última vez. Devolve um resumo por tabela.
export async function espelharNasTabelas(cliente, dados) {
  const { linhas, certificadosSemCurso } = montarLinhas(dados);
  const resumo = { em: new Date().toISOString(), tabelas: {}, certificadosSemCurso };

  for (const { nome, chave, semRemocao } of TABELAS) {
    const lista = linhas[nome];
    const digital = crypto.createHash('sha1').update(JSON.stringify(lista)).digest('hex');
    if (ultimaVersao.get(nome) === digital) {
      resumo.tabelas[nome] = { linhas: lista.length, situacao: 'sem alteração' };
      continue;
    }
    try {
      let aviso = null;
      if (lista.length) {
        let { error } = await cliente.from(nome).upsert(lista, { onConflict: chave });
        if (error && COLUNAS_NOVAS[nome] && colunaFaltando(error)) {
          // banco ainda sem as colunas novas: grava o resto e avisa
          ({ error } = await cliente.from(nome).upsert(semColunas(lista, COLUNAS_NOVAS[nome]), { onConflict: chave }));
          aviso = `faltam as colunas ${COLUNAS_NOVAS[nome].join(', ')} (rodar a migração 20261117000001)`;
        }
        if (error) throw error;
      }
      if (!semRemocao) {
        // remove das tabelas o que foi apagado no painel
        const consulta = cliente.from(nome).delete();
        const { error } = lista.length
          ? await consulta.not(chave, 'in', `(${lista.map((l) => l[chave]).join(',')})`)
          : await consulta.not(chave, 'is', null);
        if (error) throw error;
      }
      if (!aviso) ultimaVersao.set(nome, digital); // sem marcar, tenta as colunas de novo na próxima vez
      resumo.tabelas[nome] = { linhas: lista.length, situacao: 'gravado', ...(aviso ? { aviso } : {}) };
    } catch (erro) {
      resumo.tabelas[nome] = { linhas: lista.length, situacao: 'erro', erro: String(erro?.message || erro).slice(0, 200) };
    }
  }
  return resumo;
}
