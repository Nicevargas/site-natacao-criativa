// Datas, horários e docentes das formações.
//
// Cada formação pode ter vários dias (cada um com horário de início e fim) e vários docentes.
// Este módulo limpa o que vem do painel e monta os textos usados no site, por exemplo:
//   "14, 15 e 16 mar 2026 · 19h às 22h"   e   "Renato Simon, Ana Souza"

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MAX_DIAS = 60;
const MAX_DOCENTES = 12;

export class ErroDeAgenda extends Error {}

const dataValida = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(v || ''))) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};
const horaValida = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || ''));
const minutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

// "19:00" -> "19h"   "19:30" -> "19h30"
export const horaCurta = (h) => (h ? `${Number(h.slice(0, 2))}h${h.slice(3, 5) === '00' ? '' : h.slice(3, 5)}` : '');

function partes(data) {
  const d = new Date(`${data}T12:00:00Z`);
  return { dia: d.getUTCDate(), mes: d.getUTCMonth(), ano: d.getUTCFullYear(), semana: d.getUTCDay(), tempo: d.getTime() };
}

const juntar = (lista) => (lista.length <= 1 ? lista.join('') : `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`);

export function textoDoHorario(dia) {
  if (dia.start && dia.end) return `${horaCurta(dia.start)} às ${horaCurta(dia.end)}`;
  if (dia.start) return `a partir das ${horaCurta(dia.start)}`;
  return '';
}

// "14, 15 e 16 mar 2026"  /  "14 a 18 mar 2026"  /  "28 fev e 1 mar 2026"  /  "30 dez 2026 e 2 jan 2027"
export function textoDasDatas(datas) {
  const ps = datas.map(partes);
  if (!ps.length) return '';
  const umDia = 24 * 60 * 60 * 1000;
  const seguidos = ps.length >= 3 && ps.every((p, i) => i === 0 || p.tempo - ps[i - 1].tempo === umDia);
  const mesmoAno = ps.every((p) => p.ano === ps[0].ano);
  const mesmoMes = mesmoAno && ps.every((p) => p.mes === ps[0].mes);
  const ultimo = ps[ps.length - 1];

  if (seguidos) {
    const ini = ps[0];
    if (mesmoMes) return `${ini.dia} a ${ultimo.dia} ${MESES[ultimo.mes]} ${ultimo.ano}`;
    if (mesmoAno) return `${ini.dia} ${MESES[ini.mes]} a ${ultimo.dia} ${MESES[ultimo.mes]} ${ultimo.ano}`;
    return `${ini.dia} ${MESES[ini.mes]} ${ini.ano} a ${ultimo.dia} ${MESES[ultimo.mes]} ${ultimo.ano}`;
  }
  if (mesmoMes) return `${juntar(ps.map((p) => String(p.dia)))} ${MESES[ultimo.mes]} ${ultimo.ano}`;
  if (mesmoAno) return `${juntar(ps.map((p) => `${p.dia} ${MESES[p.mes]}`))} ${ultimo.ano}`;
  return juntar(ps.map((p) => `${p.dia} ${MESES[p.mes]} ${p.ano}`));
}

// Uma linha por dia, para a lista completa no site: "sáb, 14 mar · 19h às 22h"
export function linhaDoDia(dia) {
  const p = partes(dia.date);
  const horario = textoDoHorario(dia);
  return `${DIAS_SEMANA[p.semana]}, ${p.dia} ${MESES[p.mes]}${horario ? ` · ${horario}` : ''}`;
}

function limparDias(lista) {
  if (!Array.isArray(lista)) return [];
  const dias = [];
  lista.forEach((item, i) => {
    const date = String(item?.date || '').trim();
    const start = String(item?.start || '').trim();
    const end = String(item?.end || '').trim();
    if (!date && !start && !end) return; // linha vazia
    const n = i + 1;
    if (!dataValida(date)) throw new ErroDeAgenda(`Dia ${n}: informe uma data válida.`);
    if (start && !horaValida(start)) throw new ErroDeAgenda(`Dia ${n}: horário de início inválido.`);
    if (end && !horaValida(end)) throw new ErroDeAgenda(`Dia ${n}: horário de término inválido.`);
    if (end && !start) throw new ErroDeAgenda(`Dia ${n}: informe também o horário de início.`);
    if (start && end && minutos(end) <= minutos(start)) {
      throw new ErroDeAgenda(`Dia ${n}: o término precisa ser depois do início.`);
    }
    dias.push({ date, start, end });
  });
  if (dias.length > MAX_DIAS) throw new ErroDeAgenda(`Uma formação pode ter no máximo ${MAX_DIAS} dias.`);
  dias.sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const repetido = dias.find((d, i) => i > 0 && d.date === dias[i - 1].date && d.start === dias[i - 1].start);
  if (repetido) throw new ErroDeAgenda(`O dia ${repetido.date.split('-').reverse().join('/')} está repetido com o mesmo horário.`);
  return dias;
}

function limparDocentes(lista, textoAntigo, funcaoAntiga) {
  let docentes = [];
  if (Array.isArray(lista)) {
    docentes = lista.map((d) => ({
      name: String(d?.name || '').trim().slice(0, 120),
      role: String(d?.role || '').trim().slice(0, 80),
      bio: String(d?.bio || '').trim().slice(0, 1200),
    }));
  } else if (textoAntigo) {
    // formato antigo: um texto com nomes separados por vírgula
    docentes = String(textoAntigo)
      .split(/\s*,\s*|\s+e\s+/)
      .map((name, i) => ({ name: name.trim(), role: i === 0 ? String(funcaoAntiga || '').trim() : '' }));
  }
  docentes = docentes.filter((d) => d.name);
  const vistos = new Set();
  docentes = docentes.filter((d) => {
    const chave = d.name.toLowerCase();
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
  if (docentes.length > MAX_DOCENTES) throw new ErroDeAgenda(`Uma formação pode ter no máximo ${MAX_DOCENTES} docentes.`);
  return docentes;
}

const iniciais = (nome) =>
  String(nome || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

// Recebe o que veio do painel (body) e a versão anterior da formação (prev, ou {} ao criar).
// Devolve os campos de agenda e docentes já prontos para gravar.
export function montarAgenda(body = {}, prev = {}) {
  const sessions = body.sessions !== undefined ? limparDias(body.sessions) : limparDias(prev.sessions || []);

  let instructors;
  if (body.instructors !== undefined) instructors = limparDocentes(body.instructors);
  else if (body.instructor !== undefined) instructors = limparDocentes(null, body.instructor, body.instructorRole);
  else if (Array.isArray(prev.instructors)) instructors = limparDocentes(prev.instructors);
  else instructors = limparDocentes(null, prev.instructor, prev.instructorRole);

  const campos = {
    sessions,
    instructors,
    instructor: instructors.map((d) => d.name).join(', '),
    instructorInitials: iniciais(instructors[0]?.name) || 'NC',
    instructorRole: instructors[0]?.role || (instructors.length > 1 ? 'Docentes' : 'Docente'),
  };

  if (sessions.length) {
    const horarios = new Set(sessions.map(textoDoHorario));
    const horario = horarios.size === 1 ? [...horarios][0] : 'horários variados';
    campos.startDate = sessions[0].date;
    campos.endDate = sessions[sessions.length - 1].date;
    campos.startDateLabel = `${textoDasDatas(sessions.map((d) => d.date))}${horario ? ` · ${horario}` : ''}`;
    campos.scheduleLines = sessions.map(linhaDoDia);
  } else {
    const texto = body.startDateLabel !== undefined ? body.startDateLabel : prev.startDateLabel;
    campos.startDate = '';
    campos.endDate = '';
    campos.startDateLabel = String(texto || 'A definir').trim() || 'A definir';
    campos.scheduleLines = [];
  }
  return campos;
}
