// Página Formações: busca e filtros sobre os cartões montados pelo catálogo.
// Um filtro só aparece quando há pelo menos duas opções reais nos dados, e cada opção
// mostra quantos cursos restam considerando os outros filtros já escolhidos.
(function () {
  var semAcento = function (t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var hoje = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  function quando(c) {
    var fim = c.endDate || c.startDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(fim || '')) return fim >= hoje() ? 'Próximas datas' : 'Datas passadas';
    return /acesso imediato/i.test(c.startDateLabel || '') ? 'Acesso imediato' : 'Data a definir';
  }
  function docentes(c) {
    if (Array.isArray(c.instructors) && c.instructors.length) return c.instructors.map(function (d) { return d.name; });
    return c.instructor ? String(c.instructor).split(/\s*,\s*/) : [];
  }
  var NIVEIS = { iniciacao: 'Iniciação', intermediario: 'Intermediário', avancado: 'Avançado' };

  var FILTROS = [
    { id: 'categoria', rotulo: 'Tema', todos: 'Todos os temas', icone: 'category', valores: function (c) { return c.category ? [c.category] : []; } },
    { id: 'formato', rotulo: 'Formato', todos: 'Todos os formatos', icone: 'tune', valores: function (c) { return c.format ? [c.format] : []; } },
    { id: 'valor', rotulo: 'Valor', todos: 'Gratuito ou pago', icone: 'payments', valores: function (c) { return [c.isFree ? 'Gratuito' : 'Pago']; } },
    { id: 'quando', rotulo: 'Data', todos: 'Qualquer data', icone: 'calendar_month', valores: function (c) { return [quando(c)]; } },
    { id: 'nivel', rotulo: 'Nível', todos: 'Todos os níveis', icone: 'signal_cellular_alt', valores: function (c) { return c.level ? [NIVEIS[c.level] || c.level] : []; } },
    { id: 'professor', rotulo: 'Professor', todos: 'Todos os professores', icone: 'badge', valores: docentes },
  ];

  window.ncLigarFiltros = function (itens, grade) {
    var campo = document.getElementById('search-input');
    var contador = [].find.call(document.querySelectorAll('main strong'), function (s) { return /formaç(ões|ão) encontrada/.test(s.textContent); });
    var limparOriginal = [].find.call(document.querySelectorAll('main button'), function (b) { return /Limpar filtros/.test(b.textContent); });
    var barra = limparOriginal && limparOriginal.parentElement;
    if (!barra) return;

    itens.forEach(function (i) {
      i.busca = semAcento(i.el.textContent + ' ' + (i.curso.syllabus || ''));
      i.valores = {};
      FILTROS.forEach(function (f) { i.valores[f.id] = f.valores(i.curso); });
    });
    var ativos = FILTROS.filter(function (f) {
      var todos = new Set();
      itens.forEach(function (i) { i.valores[f.id].forEach(function (v) { todos.add(v); }); });
      f.opcoes = [...todos].sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
      return f.opcoes.length > 1;
    });

    var escolha = {};
    var texto = '';
    var passa = function (i, ignorar) {
      if (texto && texto.split(/\s+/).some(function (t) { return i.busca.indexOf(t) === -1; })) return false;
      return ativos.every(function (f) {
        return f.id === ignorar || !escolha[f.id] || i.valores[f.id].indexOf(escolha[f.id]) > -1;
      });
    };

    barra.textContent = '';
    ativos.forEach(function (f) {
      var caixa = document.createElement('label');
      caixa.className = 'nc-filtro relative inline-flex items-center rounded-full shadow-sm bg-surface-container-lowest hover:bg-surface-container-high transition-all max-w-full';
      var ic = document.createElement('span');
      ic.className = 'material-symbols-outlined text-[16px] text-primary absolute left-3 pointer-events-none';
      ic.textContent = f.icone;
      var sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Filtrar por ' + f.rotulo.toLowerCase());
      sel.className = 'appearance-none bg-transparent rounded-full pl-9 pr-8 py-2 text-on-surface text-label-md font-label-md outline-none focus:ring-2 focus:ring-primary-container cursor-pointer max-w-[260px] truncate';
      var seta = document.createElement('span');
      seta.className = 'material-symbols-outlined text-[16px] text-outline absolute right-2.5 pointer-events-none';
      seta.textContent = 'expand_more';
      caixa.appendChild(ic); caixa.appendChild(sel); caixa.appendChild(seta);
      barra.appendChild(caixa);
      f.sel = sel; f.caixa = caixa; f.icEl = ic; f.setaEl = seta;
      sel.addEventListener('change', function () { escolha[f.id] = sel.value; aplicar(); });
    });
    var limpar = document.createElement('button');
    limpar.type = 'button';
    limpar.className = 'flex items-center gap-1 px-3 py-1.5 text-outline hover:text-on-surface text-label-md font-label-md transition-colors';
    limpar.innerHTML = '<span class="material-symbols-outlined text-[16px]">close</span>Limpar filtros';
    barra.appendChild(limpar);

    var vazio = document.createElement('p');
    vazio.className = 'text-center text-on-surface-variant font-body-md text-body-md py-10';
    vazio.setAttribute('role', 'status');
    vazio.textContent = 'Nenhuma formação com esses filtros. Tente limpar um deles.';
    vazio.style.display = 'none';
    grade.insertAdjacentElement('afterend', vazio);

    function desenharOpcoes() {
      ativos.forEach(function (f) {
        var cont = {};
        itens.forEach(function (i) {
          if (!passa(i, f.id)) return;
          i.valores[f.id].forEach(function (v) { cont[v] = (cont[v] || 0) + 1; });
        });
        f.sel.textContent = '';
        f.sel.add(new Option(f.todos, ''));
        f.opcoes.forEach(function (v) {
          var n = cont[v] || 0;
          if (!n && v !== escolha[f.id]) return;
          f.sel.add(new Option(v + ' (' + n + ')', v));
        });
        f.sel.value = escolha[f.id] || '';
        var marcado = Boolean(escolha[f.id]);
        f.caixa.classList.toggle('bg-on-secondary-fixed', marcado);
        f.caixa.classList.toggle('bg-surface-container-lowest', !marcado);
        f.caixa.classList.toggle('hover:bg-surface-container-high', !marcado);
        f.sel.classList.toggle('text-on-primary', marcado);
        f.sel.classList.toggle('text-on-surface', !marcado);
        f.icEl.classList.toggle('text-primary', !marcado);
        f.icEl.classList.toggle('text-on-primary', marcado);
        f.setaEl.classList.toggle('text-outline', !marcado);
        f.setaEl.classList.toggle('text-on-primary', marcado);
        [].forEach.call(f.sel.options, function (o) { o.style.color = '#171c1e'; o.style.background = '#fff'; });
      });
    }
    function aplicar() {
      var n = 0;
      itens.forEach(function (i) {
        var ok = passa(i);
        i.el.style.display = ok ? '' : 'none';
        if (ok) n += 1;
      });
      if (contador) contador.textContent = n + (n === 1 ? ' formação encontrada' : ' formações encontradas');
      vazio.style.display = n ? 'none' : '';
      limpar.style.display = texto || Object.keys(escolha).some(function (k) { return escolha[k]; }) ? '' : 'none';
      desenharOpcoes();
    }
    function limparTudo() {
      escolha = {};
      texto = '';
      if (campo) campo.value = '';
      aplicar();
    }

    limpar.addEventListener('click', limparTudo);
    if (campo) {
      campo.addEventListener('input', function () { texto = semAcento(campo.value).trim(); aplicar(); });
      var buscar = campo.closest('.flex.flex-col') && [].find.call(campo.closest('.flex.flex-col').querySelectorAll('button'), function (b) { return /Buscar/.test(b.textContent); });
      var irParaResultados = function () { barra.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
      if (buscar) buscar.addEventListener('click', irParaResultados);
      campo.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); irParaResultados(); } });
    }
    var verTodos = [].find.call(document.querySelectorAll('main button'), function (b) { return /Ver todos os cursos/.test(b.textContent); });
    if (verTodos) verTodos.addEventListener('click', function () { limparTudo(); barra.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    var url = new URLSearchParams(location.search);
    [['tema', 'categoria'], ['valor', 'valor']].forEach(function (par) {
      var f = ativos.find(function (x) { return x.id === par[1]; });
      if (f && f.opcoes.indexOf(url.get(par[0])) > -1) escolha[f.id] = url.get(par[0]);
    });
    aplicar();
  };
})();
