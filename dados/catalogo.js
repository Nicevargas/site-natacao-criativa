// Página Formações: monta os cartões com as formações cadastradas no painel admin,
// mostrando os dias, os horários e os docentes. Se não conseguir carregar, ficam os cartões fixos.
(function () {
  if (window.__ncCatalogo) return;
  window.__ncCatalogo = true;

  var grade = document.querySelector('main section .grid.lg\\:grid-cols-3');
  if (!grade) return;

  var STATUS = {
    aberto: ['ABERTO', 'text-on-primary bg-[#89B113]'],
    em_breve: ['EM BREVE', 'text-on-secondary-fixed bg-[#FAC61C] font-bold'],
    gravacao: ['GRAVAÇÃO', 'text-on-primary bg-primary-container'],
    encerrado: ['ENCERRADO', 'text-on-surface bg-surface-variant font-bold']
  };
  var PILULA = 'px-2.5 py-1 rounded-full text-label-caps font-label-caps uppercase ';

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function icone(nome, cls) { return el('span', 'material-symbols-outlined ' + (cls || ''), nome); }
  function linha(nomeIcone, texto, cor) {
    var l = el('div', 'flex items-start gap-2');
    l.appendChild(icone(nomeIcone, 'text-[18px] mt-px ' + (cor || 'text-primary')));
    l.appendChild(el('span', '', texto));
    return l;
  }
  function iconeDaCategoria(cat) {
    var t = String(cat || '').toLowerCase();
    if (t.indexOf('palestra') > -1) return 'podium';
    if (t.indexOf('workshop') > -1) return 'construction';
    if (t.indexOf('imers') > -1) return 'pool';
    if (t.indexOf('pós') > -1 || t.indexOf('pos') > -1) return 'workspace_premium';
    return 'school';
  }
  var parceirosDoSite = [];
  var ehLink = function (v) { return /^https?:\/\//i.test(String(v || '')); };

  function cartao(c) {
    var encerrado = c.status === 'encerrado';
    var art = el('article', 'flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(11,50,88,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(11,50,88,0.12)] transition-all duration-300 group' + (encerrado ? ' opacity-90' : ''));

    // capa
    var capa = el('div', 'relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#047AE4] to-[#001c38]');
    if (c.coverUrl) {
      var img = el('img', 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500' + (encerrado ? ' grayscale-[25%]' : ''));
      img.src = c.coverUrl;
      img.alt = c.title || '';
      img.loading = 'lazy';
      capa.appendChild(img);
      capa.appendChild(el('div', 'absolute inset-0 bg-gradient-to-t from-on-secondary-fixed/90 via-on-secondary-fixed/30 to-transparent'));
    } else {
      capa.appendChild(icone(iconeDaCategoria(c.category), 'absolute right-5 top-1/2 -translate-y-1/2 text-on-primary/25 text-[88px]'));
    }
    var selos = el('div', 'absolute top-3 left-3 right-3 flex items-center justify-between gap-2');
    var esquerda = el('div', 'flex items-center gap-1.5');
    if (c.isFree) esquerda.appendChild(el('span', PILULA + 'tracking-wider shadow-sm text-on-primary bg-[#89B113]', 'GRATUITO'));
    var st = STATUS[c.status] || STATUS.aberto;
    esquerda.appendChild(el('span', PILULA + 'tracking-wider shadow-sm ' + st[1], st[0]));
    selos.appendChild(esquerda);
    if (c.certificateBadge) selos.appendChild(el('span', PILULA + 'bg-surface-container-lowest/90 backdrop-blur-md text-on-secondary-fixed', c.certificateBadge));
    capa.appendChild(selos);
    var cat = el('div', 'absolute bottom-3 left-3 text-secondary-fixed text-label-caps font-label-caps uppercase tracking-wider flex items-center gap-1');
    cat.appendChild(icone(iconeDaCategoria(c.category), 'text-[14px]'));
    cat.appendChild(document.createTextNode(c.category || 'Formação'));
    capa.appendChild(cat);
    art.appendChild(capa);

    // corpo
    var corpo = el('div', 'p-space-lg flex-1 flex flex-col justify-between');
    var cima = el('div', 'space-y-3');
    cima.appendChild(el('h2', 'text-on-secondary-fixed font-headline-md text-headline-md group-hover:text-primary transition-colors', c.title));
    if (c.description) cima.appendChild(el('p', 'text-on-surface-variant font-body-sm text-body-sm line-clamp-2', c.description));

    var metas = el('div', 'space-y-2 pt-2 text-on-surface-variant font-body-sm text-body-sm');
    var cor = encerrado ? 'text-outline' : 'text-primary';
    if (c.startDateLabel) metas.appendChild(linha('event', c.startDateLabel, cor));

    // lista completa dos dias quando há mais de um
    var dias = Array.isArray(c.scheduleLines) ? c.scheduleLines : [];
    if (dias.length > 1) {
      var det = el('details', 'pl-[26px]');
      var resumo = el('summary', 'cursor-pointer text-primary font-semibold text-body-sm', 'Ver os ' + dias.length + ' dias e horários');
      det.appendChild(resumo);
      var ul = el('ul', 'mt-1.5 space-y-1');
      dias.forEach(function (d) { ul.appendChild(el('li', 'text-body-sm', d)); });
      det.appendChild(ul);
      metas.appendChild(det);
    }

    var docentes = Array.isArray(c.instructors) && c.instructors.length
      ? c.instructors.map(function (d) { return d.name; })
      : (c.instructor ? String(c.instructor).split(/\s*,\s*/) : []);
    if (docentes.length) metas.appendChild(linha(docentes.length > 1 ? 'groups' : 'person', (docentes.length > 1 ? 'Docentes: ' : 'Docente: ') + docentes.join(', '), cor));

    var onde = [c.format, ehLink(c.locationOrUrl) ? '' : c.locationOrUrl].filter(Boolean).join(' · ');
    if (onde) metas.appendChild(linha('location_on', onde, cor));
    cima.appendChild(metas);
    corpo.appendChild(cima);

    // preço e botão
    var pe = el('div', 'mt-6 pt-4 bg-surface-container-low -mx-space-lg -mb-space-lg p-space-lg flex items-center justify-between gap-3');
    var preco = el('div');
    if (c.isFree) {
      preco.appendChild(el('span', 'text-label-caps font-label-caps text-[#89B113] uppercase block font-bold', '100% Gratuito'));
      preco.appendChild(el('span', 'text-on-secondary-fixed font-headline-sm text-headline-sm', 'R$ 0,00'));
    } else {
      preco.appendChild(el('span', 'text-label-caps font-label-caps text-on-surface-variant uppercase block', encerrado ? 'Status' : 'Investimento'));
      preco.appendChild(el('span', 'text-on-secondary-fixed font-headline-sm text-headline-sm', encerrado ? 'Inscrições encerradas' : (c.priceFormatted || 'Consulte')));
      var obs = c.installmentInfo || c.lotSummary;
      if (obs && !encerrado) preco.appendChild(el('span', 'text-label-caps font-label-caps text-on-surface-variant block', obs));
    }
    pe.appendChild(preco);
    var botao = el('button', (encerrado ? 'px-4 py-2.5 bg-surface-container-high hover:bg-surface-variant text-on-secondary-fixed' : 'px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary') + ' rounded-lg font-label-lg text-label-lg transition-all flex items-center gap-1.5 shadow-sm flex-shrink-0');
    botao.type = 'button';
    botao.addEventListener('click', function () { window.ncAbrirDetalhes(c, parceirosDoSite); });
    botao.appendChild(el('span', '', 'Saiba mais'));
    botao.appendChild(icone('arrow_forward', 'text-[16px]'));
    pe.appendChild(botao);
    corpo.appendChild(pe);
    art.appendChild(corpo);
    return art;
  }

  fetch('/api/public/site')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (dados) {
      parceirosDoSite = (dados && dados.partners) || [];
      var cursos = (dados && dados.courses || []).filter(function (c) { return c && c.title && c.status !== 'rascunho'; });
      if (!cursos.length) return; // sem dados: ficam os cartões fixos
      var ordem = { aberto: 0, em_breve: 1, gravacao: 2, encerrado: 3 };
      cursos.sort(function (a, b) {
        return (ordem[a.status] ?? 9) - (ordem[b.status] ?? 9) || String(a.startDate || '9999').localeCompare(String(b.startDate || '9999'));
      });
      var frag = document.createDocumentFragment();
      var itens = cursos.map(function (c) {
        var card = cartao(c);
        frag.appendChild(card);
        return { curso: c, el: card };
      });
      grade.textContent = '';
      grade.appendChild(frag);
      document.querySelectorAll('main strong').forEach(function (s) {
        if (/formaç(ões|ão) encontrada/.test(s.textContent)) s.textContent = cursos.length + (cursos.length === 1 ? ' formação encontrada' : ' formações encontradas');
      });
      if (window.ncLigarFiltros) window.ncLigarFiltros(itens, grade);
    })
    .catch(function () {});
})();
