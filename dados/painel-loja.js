// Painel: pedidos da loja, frete, estoque e preparação do checkout.
(function () {
  var P = window.ncPainel;
  if (!P || window.__ncPainelLoja) return;
  window.__ncPainelLoja = true;
  var pedidos = [], nomes = {}, config = null, filtro = '';
  var reais = function (c) { return (Number(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var data = function (d) { return d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''; };
  var COR = { aguardando_pagamento: 'bg-amber-100 text-amber-800', vencido: 'bg-surface-container text-on-surface-variant', pago: 'bg-emerald-100 text-emerald-800', em_separacao: 'bg-sky-100 text-sky-800', enviado: 'bg-indigo-100 text-indigo-800', entregue: 'bg-emerald-200 text-emerald-900', cancelado: 'bg-red-100 text-red-800', reembolsado: 'bg-red-100 text-red-800' };
  var selo = function (o) { return '<span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ' + (COR[o.status] || '') + '">' + esc(o.statusNome) + '</span>'; };
  var ACAO = { em_separacao: 'Marcar em separação', enviado: 'Marcar como enviado', entregue: 'Marcar como entregue', pago: 'Voltar para pago', cancelado: 'Cancelar pedido' };

  P.criarSecao('pedidos', 'Pedidos da Loja', 'shopping_bag', P.cab('Pedidos da Loja', 'Vendas, pagamentos, entregas, frete e estoque.', '<div class="flex flex-wrap gap-2"><button type="button" id="ncLojaSim" class="' + P.BTN_SEC + '">' + P.ic('science') + '<span>Simular loja</span></button><a id="ncLojaCsv" href="/api/admin/loja/pedidos.csv" class="' + P.BTN_SEC + '">' + P.ic('file_download') + 'Exportar CSV</a><button type="button" id="ncLojaAtualizar" class="' + P.BTN_SEC + '">' + P.ic('refresh') + 'Atualizar</button></div>') +
    '<div id="ncLojaSimAviso" class="hidden p-4 rounded-xl bg-[#FAC61C]/30 border border-[#FAC61C] flex flex-wrap items-center justify-between gap-3"><div><div class="font-display font-bold text-sm">Modo simulação ligado</div><div class="text-xs text-on-surface-variant">Pedidos de exemplo, só neste navegador. Nada é cobrado, enviado ou gravado no banco. Frete e Estoque abaixo continuam reais.</div></div><a href="/loja" target="_blank" rel="noopener" class="' + P.BTN_PRIM + '">' + P.ic('shopping_cart') + 'Testar uma compra</a></div>' +
    '<div id="ncLojaResumo" class="grid grid-cols-2 lg:grid-cols-4 gap-3"></div>' +
    '<div class="flex flex-wrap gap-1.5" id="ncLojaAbas"><button type="button" data-aba="pedidos" class="' + P.BTN_SEC + '">Pedidos</button><button type="button" data-aba="config" class="' + P.BTN_SEC + '">Frete e checkout</button><button type="button" data-aba="estoque" class="' + P.BTN_SEC + '">Estoque</button></div>' +
    '<div data-painel="pedidos" class="space-y-3"><div class="flex flex-wrap gap-2"><select id="ncLojaFiltro" aria-label="Filtrar por situação" class="h-10 px-3 rounded-lg bg-surface-container-low text-sm"></select><input id="ncLojaBusca" aria-label="Buscar" placeholder="Buscar por número, nome ou e-mail" class="flex-1 min-w-[200px] h-10 px-3 rounded-lg bg-surface-container-low text-sm outline-none"/></div><div class="' + P.caixa + '"><table class="w-full text-left text-sm"><thead><tr class="bg-surface-container-low text-[11px] font-display font-extrabold uppercase text-on-surface-variant"><th class="py-3 px-4">Pedido</th><th class="py-3 px-4">Cliente</th><th class="py-3 px-4">Total</th><th class="py-3 px-4">Situação</th><th class="py-3 px-4"></th></tr></thead><tbody id="ncLojaLista"></tbody></table></div></div>' +
    '<div data-painel="config" class="hidden" id="ncLojaConfig"></div><div data-painel="estoque" class="hidden" id="ncLojaEstoque"></div>', 'conteudos');

  function aba(n) {
    document.querySelectorAll('#sec-pedidos [data-painel]').forEach(function (d) { d.classList.toggle('hidden', d.dataset.painel !== n); });
    document.querySelectorAll('#ncLojaAbas [data-aba]').forEach(function (b) { b.classList.toggle('ring-2', b.dataset.aba === n); b.classList.toggle('ring-primary', b.dataset.aba === n); });
  }
  document.getElementById('ncLojaAbas').addEventListener('click', function (e) { var b = e.target.closest('[data-aba]'); if (b) aba(b.dataset.aba); });
  aba('pedidos');

  function resumo() {
    var pagos = pedidos.filter(function (o) { return o.paid_at && o.status !== 'reembolsado'; });
    var mes = new Date().toISOString().slice(0, 7);
    var doMes = pagos.filter(function (o) { return String(o.paid_at).slice(0, 7) === mes; });
    var cards = [['Vendas no mês', reais(doMes.reduce(function (t, o) { return t + o.total_cents; }, 0))], ['Pedidos pagos no mês', doMes.length], ['Para separar ou enviar', pedidos.filter(function (o) { return o.status === 'pago' || o.status === 'em_separacao'; }).length], ['Aguardando pagamento', pedidos.filter(function (o) { return o.status === 'aguardando_pagamento'; }).length]];
    document.getElementById('ncLojaResumo').innerHTML = cards.map(function (c) { return '<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-4"><div class="text-[11px] font-bold uppercase text-outline">' + esc(c[0]) + '</div><div class="font-display font-extrabold text-xl text-on-secondary-fixed mt-1">' + esc(c[1]) + '</div></div>'; }).join('');
  }
  function lista() {
    var q = document.getElementById('ncLojaBusca').value.trim().toLowerCase();
    var v = pedidos.filter(function (o) { return (!filtro || o.status === filtro) && (!q || (o.number + ' ' + o.customer_name + ' ' + o.customer_email).toLowerCase().indexOf(q) > -1); });
    document.getElementById('ncLojaLista').innerHTML = v.map(function (o) {
      return '<tr class="border-t border-surface-container"><td class="py-3 px-4"><div class="font-display font-bold">nº ' + esc(o.number) + (o.simulado ? ' <span class="text-[10px] px-1.5 py-0.5 rounded bg-[#FAC61C] text-on-secondary-fixed">SIMULADO</span>' : '') + '</div><div class="text-xs text-outline">' + esc(data(o.created_at)) + '</div></td><td class="py-3 px-4"><div class="font-semibold">' + esc(o.customer_name) + '</div><div class="text-xs text-outline">' + esc(o.customer_email) + '</div></td><td class="py-3 px-4 font-bold whitespace-nowrap">' + reais(o.total_cents) + '</td><td class="py-3 px-4">' + selo(o) + (o.email_error ? '<div class="text-[11px] text-error mt-1">E-mail não enviado</div>' : '') + '</td><td class="py-3 px-4 text-right"><button type="button" data-abrir="' + esc(o.id) + '" class="px-2.5 py-1 rounded bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary">Abrir</button></td></tr>';
    }).join('') || '<tr><td colspan="5" class="py-6 px-4 text-sm text-outline">Nenhum pedido.</td></tr>';
  }
  document.getElementById('ncLojaLista').addEventListener('click', function (e) { var b = e.target.closest('[data-abrir]'); if (b) abrir(b.dataset.abrir); });
  document.getElementById('ncLojaBusca').addEventListener('input', lista);
  document.getElementById('ncLojaFiltro').addEventListener('change', function (e) { filtro = e.target.value; lista(); });

  function trocar(o) { pedidos = pedidos.map(function (x) { return x.id === o.id ? o : x; }); resumo(); lista(); }
  function abrir(id) {
    var o = pedidos.find(function (x) { return x.id === id; });
    if (!o) return;
    var a = o.address || {};
    var ent = o.delivery_method === 'retirada' ? 'Retirada no local' : [a.rua + ', ' + a.numero + (a.complemento ? ' - ' + a.complemento : ''), a.bairro, a.cidade + '/' + a.uf, 'CEP ' + a.cep].join(' · ');
    var html = '<div class="flex flex-wrap items-center justify-between gap-2">' + selo(o) + '<span class="text-xs text-outline">' + esc(data(o.created_at)) + (o.billing_type ? ' · ' + esc(o.billing_type) : '') + '</span></div>' +
      (o.email_error ? '<p class="text-sm font-semibold text-error">Último e-mail não enviado: ' + esc(o.email_error) + '</p>' : '') +
      '<div class="text-sm"><div class="font-bold">' + esc(o.customer_name) + '</div><div>' + esc(o.customer_email) + ' · ' + esc(o.customer_phone) + '</div><div class="text-on-surface-variant mt-1">' + esc(ent) + '</div></div>' +
      '<div class="text-sm border-t border-surface-container pt-3">' + o.items.map(function (i) { return '<div class="flex justify-between gap-3 py-0.5"><span>' + esc(i.qtd) + 'x ' + esc(i.titulo) + (i.tamanho ? ' (' + esc(i.tamanho) + ')' : '') + (i.situacao ? ' <span class="text-xs text-outline">' + esc(i.situacao) + '</span>' : '') + '</span><span class="whitespace-nowrap">' + reais(i.precoCents * i.qtd) + '</span></div>'; }).join('') + '<div class="flex justify-between py-0.5"><span>Frete</span><span>' + reais(o.shipping_cents) + '</span></div><div class="flex justify-between font-bold pt-1"><span>Total</span><span>' + reais(o.total_cents) + '</span></div></div>' +
      '<form class="space-y-3"><div><label class="' + P.ROTULO + '">Código de rastreio</label><input name="tracking_code" value="' + esc(o.tracking_code || '') + '" class="' + P.CAMPO + '"/></div><div><label class="' + P.ROTULO + '">Observações internas</label><textarea name="internal_notes" rows="2" class="w-full p-3 rounded-lg bg-surface-container-low text-sm outline-none">' + esc(o.internal_notes || '') + '</textarea></div><div class="flex justify-end"><button class="' + P.BTN_SEC + '">Salvar</button></div></form>' +
      '<div class="flex flex-wrap gap-2 border-t border-surface-container pt-3">' + (o.proximos || []).map(function (s) { return '<button type="button" data-status="' + esc(s) + '" class="' + (s === 'cancelado' ? P.BTN_SEC + ' text-error' : P.BTN_PRIM) + '">' + esc(ACAO[s] || s) + '</button>'; }).join('') + '<button type="button" data-acao="consultar" class="' + P.BTN_SEC + '">' + P.ic('sync') + 'Consultar Asaas</button><button type="button" data-acao="reenviar" class="' + P.BTN_SEC + '">' + P.ic('mail') + 'Reenviar e-mail</button></div>' +
      '<details class="text-xs text-on-surface-variant"><summary class="cursor-pointer font-bold">Histórico</summary><div class="mt-2 space-y-1">' + (o.history || []).slice().reverse().map(function (h) { return '<div>' + esc(data(h.em)) + ' · ' + esc(h.quem) + ': ' + esc(h.texto) + '</div>'; }).join('') + '</div></details>' +
      '<p class="text-[11px] text-outline">Reembolso é feito no Asaas e atualiza o pedido sozinho.</p>';
    var j = P.abrirJanela('Pedido nº ' + o.number, html);
    async function mandar(url, opcoes, ok) {
      if (o.simulado) {
        if (/consultar$/.test(url)) { showToast('Simulação: nenhuma consulta ao Asaas foi feita.'); return; }
        if (/reenviar$/.test(url)) { showToast('Simulação: nenhum e-mail foi enviado.'); return; }
        var rs = window.ncSim.atualizar(o.id, JSON.parse(opcoes.body));
        if (rs.error) { showToast(rs.error, 'error'); return; }
        trocar(rs.pedido); showToast(ok + ' (simulação)'); abrir(o.id);
        return;
      }
      try {
        var r = await api(url, opcoes);
        trocar(r.pedido); showToast(ok + (r.situacaoAsaas ? ' Situação: ' + r.situacaoAsaas : '')); abrir(o.id);
      } catch (e) { showToast(e.message, 'error'); }
    }
    j.querySelector('form').onsubmit = function (e) {
      e.preventDefault();
      mandar('/api/admin/loja/pedidos/' + o.id, { method: 'PATCH', body: JSON.stringify({ tracking_code: e.target.tracking_code.value, internal_notes: e.target.internal_notes.value }) }, 'Pedido salvo.');
    };
    j.addEventListener('click', function (e) {
      var s = e.target.closest('[data-status]'), ac = e.target.closest('[data-acao]');
      if (s) {
        var campo = j.querySelector('[name=tracking_code]');
        if (s.dataset.status === 'cancelado') {
          j.querySelectorAll('[data-confirmar]').forEach(function (x) { x.remove(); });
          s.insertAdjacentHTML('afterend', '<button type="button" data-confirmar class="' + P.BTN_PRIM + ' !bg-red-700">Confirmar cancelamento</button>');
          return;
        }
        mandar('/api/admin/loja/pedidos/' + o.id, { method: 'PATCH', body: JSON.stringify({ status: s.dataset.status, tracking_code: campo.value }) }, 'Situação atualizada.');
      }
      if (e.target.closest('[data-confirmar]')) mandar('/api/admin/loja/pedidos/' + o.id, { method: 'PATCH', body: JSON.stringify({ status: 'cancelado' }) }, 'Pedido cancelado.');
      if (ac) mandar('/api/admin/loja/pedidos/' + o.id + '/' + ac.dataset.acao, { method: 'POST' }, ac.dataset.acao === 'reenviar' ? 'E-mail enviado.' : 'Consulta feita.');
    });
  }

  var REG = [['N', 'Norte'], ['NE', 'Nordeste'], ['CO', 'Centro-Oeste'], ['SE', 'Sudeste'], ['S', 'Sul']];
  var emReais = function (c) { return c === null || c === undefined ? '' : (c / 100).toFixed(2).replace('.', ','); };
  function paraCentavos(v) {
    v = String(v).trim();
    if (!v) return null;
    var n = Math.round(Number(v.replace(/\./g, '').replace(',', '.')) * 100);
    return Number.isInteger(n) && n >= 0 ? n : NaN;
  }
  function telaConfig() {
    var c = config, p = c.pronto;
    var item = function (ok, t, d) { return '<li class="flex items-start gap-2 text-sm"><span class="material-symbols-outlined text-[18px] ' + (ok ? 'text-emerald-700' : 'text-error') + '">' + (ok ? 'check_circle' : 'cancel') + '</span><span><b>' + esc(t) + '</b>' + (d ? '<br><span class="text-xs text-on-surface-variant">' + esc(d) + '</span>' : '') + '</span></li>'; };
    var pode = p.banco && p.asaas && p.webhook && p.frete;
    document.getElementById('ncLojaConfig').innerHTML = '<div class="grid grid-cols-1 lg:grid-cols-2 gap-4"><div class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 space-y-3"><h2 class="font-display font-bold">Preparação</h2><ul class="space-y-2">' +
      item(p.banco, 'Tabelas da loja no banco') + item(p.asaas, 'Chave do Asaas', p.ambiente ? 'Ambiente: ' + p.ambiente : 'Preencha no menu Integrações') + item(p.webhook, 'Aviso de pagamento (webhook)', 'Criado sozinho ao conectar o Asaas') + item(p.email, 'E-mail de aviso', 'Preencha no menu Integrações') + item(p.frete, 'Frete ou retirada preenchidos') + '</ul>' +
      '<div class="border-t border-surface-container pt-3 flex flex-wrap items-center justify-between gap-2"><div class="text-sm font-bold">Checkout: ' + (c.ativo ? 'ligado' : 'desligado') + (p.ambiente === 'teste' && c.ativo ? ' (modo teste)' : '') + '</div><button type="button" id="ncLojaLigar" ' + (!c.ativo && !pode ? 'disabled' : '') + ' class="' + P.BTN_PRIM + (!c.ativo && !pode ? ' opacity-50' : '') + '">' + (c.ativo ? 'Desligar checkout' : 'Ligar checkout') + '</button></div><p class="text-[11px] text-outline">Desligado, o carrinho envia o pedido para o menu de atendimento, sem cobrança.</p></div>' +
      '<form id="ncLojaFrete" class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 space-y-3"><h2 class="font-display font-bold">Frete por região</h2><p class="text-xs text-on-surface-variant">Em reais. Vazio = não entrega na região. 0 = frete grátis.</p><div class="grid grid-cols-2 gap-3">' +
      REG.map(function (r) { return '<div><label class="' + P.ROTULO + '">' + r[1] + '</label><input name="' + r[0] + '" inputmode="decimal" placeholder="Ex.: 25,00" value="' + esc(emReais(c.frete[r[0]])) + '" class="' + P.CAMPO + '"/></div>'; }).join('') + '</div>' +
      '<label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="retiradaAtiva" ' + (c.frete.retiradaAtiva ? 'checked' : '') + '/> Permitir retirada</label><div><label class="' + P.ROTULO + '">Endereço e horário da retirada</label><input name="retiradaEndereco" value="' + esc(c.frete.retiradaEndereco || '') + '" class="' + P.CAMPO + '"/></div><div class="flex justify-end"><button class="' + P.BTN_PRIM + '">Salvar frete</button></div></form></div>';
    document.getElementById('ncLojaFrete').onsubmit = async function (e) {
      e.preventDefault();
      var f = e.target, frete = { retiradaAtiva: f.retiradaAtiva.checked, retiradaEndereco: f.retiradaEndereco.value };
      for (var i = 0; i < REG.length; i++) {
        var v = paraCentavos(f[REG[i][0]].value);
        if (Number.isNaN(v)) { showToast('Valor inválido em ' + REG[i][1] + '.', 'error'); return; }
        frete[REG[i][0]] = v;
      }
      if (frete.retiradaAtiva && !frete.retiradaEndereco.trim()) { showToast('Informe o endereço da retirada.', 'error'); return; }
      try { await api('/api/admin/loja/config', { method: 'PUT', body: JSON.stringify({ frete: frete }) }); showToast('Frete salvo.'); await carregarConfig(); } catch (err) { showToast(err.message, 'error'); }
    };
    document.getElementById('ncLojaLigar').onclick = async function () {
      try { await api('/api/admin/loja/config', { method: 'PUT', body: JSON.stringify({ ativo: !c.ativo }) }); showToast(c.ativo ? 'Checkout desligado.' : 'Checkout ligado.'); await carregarConfig(); } catch (err) { showToast(err.message, 'error'); }
    };
  }
  function telaEstoque() {
    var itens = (state.storeItems || []).filter(function (s) { return s.active; });
    document.getElementById('ncLojaEstoque').innerHTML = '<p class="text-sm text-on-surface-variant mb-3">Preencha só os produtos com quantidade limitada. Vazio = sem limite (sob encomenda). O estoque baixa quando o pedido é feito e volta se ele vencer ou for cancelado.</p><div class="' + P.caixa + '"><table class="w-full text-left text-sm"><thead><tr class="bg-surface-container-low text-[11px] font-display font-extrabold uppercase text-on-surface-variant"><th class="py-3 px-4">Produto</th><th class="py-3 px-4">Situação</th><th class="py-3 px-4 w-32">Estoque</th></tr></thead><tbody>' +
      itens.map(function (s) { var q = config.estoque[s.id]; return '<tr class="border-t border-surface-container"><td class="py-2 px-4 font-semibold">' + esc(s.title) + '</td><td class="py-2 px-4 text-xs">' + esc(s.badge || '') + '</td><td class="py-2 px-4"><input data-estoque="' + esc(s.id) + '" aria-label="Estoque de ' + esc(s.title) + '" type="number" min="0" value="' + esc(q === undefined ? '' : q) + '" class="w-24 h-9 px-2 rounded-lg bg-surface-container-low text-sm"/></td></tr>'; }).join('') + '</tbody></table></div>';
    document.querySelectorAll('[data-estoque]').forEach(function (i) {
      i.onchange = async function () {
        try { await api('/api/admin/loja/estoque/' + i.dataset.estoque, { method: 'PUT', body: JSON.stringify({ quantidade: i.value }) }); if (i.value === '') delete config.estoque[i.dataset.estoque]; else config.estoque[i.dataset.estoque] = Number(i.value); showToast('Estoque salvo.'); } catch (e) { showToast(e.message, 'error'); }
      };
    });
  }
  async function carregarConfig() {
    config = await api('/api/admin/loja/config');
    telaConfig(); telaEstoque();
  }
  function preencherFiltro() {
    var sel = document.getElementById('ncLojaFiltro');
    sel.innerHTML = '<option value="">Todas as situações</option>' + Object.keys(nomes).map(function (k) { return '<option value="' + esc(k) + '" ' + (k === filtro ? 'selected' : '') + '>' + esc(nomes[k]) + '</option>'; }).join('');
  }
  function telaSimulacao() {
    var ligado = Boolean(window.ncSim && window.ncSim.ativo());
    document.getElementById('ncLojaSimAviso').classList.toggle('hidden', !ligado);
    document.getElementById('ncLojaCsv').classList.toggle('hidden', ligado);
    document.querySelector('#ncLojaSim span:last-child').textContent = ligado ? 'Sair da simulação' : 'Simular loja';
    return ligado;
  }
  document.getElementById('ncLojaSim').onclick = function () {
    if (!window.ncSim) return;
    if (window.ncSim.ativo()) { window.ncSim.desligar(); showToast('Simulação encerrada e pedidos de exemplo removidos.'); }
    else { window.ncSim.ligar(state.storeItems || []); showToast('Simulação ligada.'); }
    filtro = ''; aba('pedidos'); carregar();
  };
  async function carregar() {
    if (telaSimulacao()) {
      pedidos = window.ncSim.pedidos(); nomes = window.ncSim.NOMES;
      preencherFiltro(); resumo(); lista();
      try { await carregarConfig(); } catch (e) { /* a simulação não depende do servidor */ }
      return;
    }
    try { await carregarConfig(); } catch (e) { showToast(e.message, 'error'); return; }
    if (!config.pronto.banco) { aba('config'); pedidos = []; resumo(); lista(); return; }
    try {
      var r = await api('/api/admin/loja/pedidos');
      pedidos = r.pedidos; nomes = r.nomes;
      preencherFiltro(); resumo(); lista();
    } catch (e) { showToast(e.message, 'error'); }
  }
  document.getElementById('ncLojaAtualizar').onclick = carregar;
  window.ncAoAbrirSecao = function (id) { if (id === 'pedidos') carregar(); };
})();
