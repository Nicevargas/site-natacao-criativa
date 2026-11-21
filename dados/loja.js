// Loja: carrinho, checkout e acompanhamento do pedido.
// Com o checkout desligado no painel, o carrinho vira um pedido de contato para a equipe.
(function () {
  if (window.__ncLoja) return;
  window.__ncLoja = true;
  var CHAVE = 'nc_carrinho', cfg = null, itens = [], modal = null, simulando = false;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var ler = function () { try { var c = JSON.parse(localStorage.getItem(CHAVE) || '[]'); return Array.isArray(c) ? c : []; } catch (e) { return []; } };
  var memoria = null;
  function carrinho() { return memoria || (memoria = ler()); }
  function salvar(c) { memoria = c; try { localStorage.setItem(CHAVE, JSON.stringify(c)); } catch (e) {} contador(); }
  function centavos(p) {
    var s = String(p == null ? '' : p).replace(/[^\d,.]/g, '');
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    var n = Math.round(Number(s) * 100);
    return n > 0 ? n : 0;
  }
  var reais = function (c) { return (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
  var produto = function (id) { return itens.find(function (s) { return s.id === id; }); };
  var limite = function (id) { var q = cfg && cfg.estoque ? cfg.estoque[id] : undefined; return q === undefined ? 20 : Math.min(20, q); };
  function chaveCompra() {
    var k = sessionStorage.getItem('nc_compra');
    if (!k) { k = crypto.randomUUID(); sessionStorage.setItem('nc_compra', k); }
    return k;
  }
  var BTN = 'px-5 py-3 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg transition-all text-center';
  var CAMPO = 'w-full px-4 py-3 bg-surface-container-low rounded-lg text-on-surface outline-none focus:ring-2 focus:ring-primary-container';

  function abrirModal(titulo) {
    fechar();
    var fundo = el('div', 'fixed inset-0 z-[9995] bg-[#0B3258]/60 backdrop-blur-sm flex items-center justify-center p-3');
    var caixa = el('div', 'bg-surface-container-lowest rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 md:p-7 relative');
    caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true'); caixa.setAttribute('aria-label', titulo);
    var x = el('button', 'absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center');
    x.type = 'button'; x.setAttribute('aria-label', 'Fechar'); x.appendChild(el('span', 'material-symbols-outlined', 'close')); x.onclick = fechar;
    caixa.appendChild(x);
    caixa.appendChild(el('h2', 'text-on-secondary-fixed font-headline-md text-headline-md mb-4 pr-10', titulo));
    var corpo = el('div'); caixa.appendChild(corpo);
    fundo.appendChild(caixa);
    fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(); });
    document.body.appendChild(fundo);
    modal = { fundo: fundo, timer: null };
    return corpo;
  }
  function fechar() { if (modal) { clearInterval(modal.timer); modal.fundo.remove(); modal = null; } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); });

  // ---------- carrinho ----------
  function adicionar(id) {
    var c = carrinho(), i = c.find(function (x) { return x.id === id; });
    if (i) i.qtd = Math.min(i.qtd + 1, limite(id)); else c.push({ id: id, qtd: 1 });
    salvar(c); verCarrinho();
  }
  function validos() { return carrinho().filter(function (x) { return produto(x.id) && centavos(produto(x.id).price) && limite(x.id) > 0; }); }
  function subtotal() { return validos().reduce(function (t, x) { return t + centavos(produto(x.id).price) * x.qtd; }, 0); }
  function verCarrinho() {
    var c = abrirModal('Seu carrinho'), lista = validos();
    if (lista.length !== carrinho().length) salvar(lista);
    if (!lista.length) { c.appendChild(el('p', 'text-on-surface-variant', 'Seu carrinho está vazio.')); return; }
    lista.forEach(function (x) {
      var s = produto(x.id), l = el('div', 'flex items-center gap-3 py-3 border-b border-surface-container');
      if (s.imageUrl) { var im = el('img', 'w-14 h-14 object-contain rounded-lg bg-white flex-shrink-0'); im.src = s.imageUrl; im.alt = ''; l.appendChild(im); }
      var t = el('div', 'flex-1 min-w-0');
      t.appendChild(el('div', 'font-semibold text-on-secondary-fixed text-body-sm', s.title));
      t.appendChild(el('div', 'text-body-sm text-on-surface-variant', reais(centavos(s.price)) + (s.badge ? ' · ' + s.badge : '')));
      l.appendChild(t);
      var q = el('div', 'flex items-center gap-1 flex-shrink-0');
      function b(txt, rot, f) { var u = el('button', 'w-8 h-8 rounded-lg bg-surface-container-low font-bold', txt); u.type = 'button'; u.setAttribute('aria-label', rot); u.onclick = f; q.appendChild(u); return u; }
      b('−', 'Diminuir', function () { x.qtd -= 1; salvar(carrinho().filter(function (y) { return y.id !== x.id || x.qtd > 0; })); verCarrinho(); });
      q.appendChild(el('span', 'w-7 text-center font-semibold', x.qtd));
      var mais = b('+', 'Aumentar', function () { x.qtd = Math.min(x.qtd + 1, limite(x.id)); salvar(carrinho()); verCarrinho(); });
      mais.disabled = x.qtd >= limite(x.id);
      l.appendChild(q);
      c.appendChild(l);
    });
    var tot = el('div', 'flex justify-between mt-4 font-headline-sm text-headline-sm text-on-secondary-fixed');
    tot.appendChild(el('span', '', 'Subtotal')); tot.appendChild(el('span', '', reais(subtotal()))); c.appendChild(tot);
    if (cfg) {
      var ir = el('button', 'w-full mt-4 ' + BTN, 'Finalizar compra'); ir.type = 'button'; ir.onclick = checkout; c.appendChild(ir);
      return;
    }
    interesse(c, lista);
  }

  // Pagamento online ainda desligado: a equipe recebe o pedido e fala com o cliente.
  function interesse(c, lista) {
    var f = el('form', 'mt-4 p-4 rounded-lg bg-surface-container-low grid grid-cols-1 sm:grid-cols-2 gap-3');
    f.appendChild(el('p', 'sm:col-span-2 font-semibold text-on-secondary-fixed', 'Pagamento online em ativação'));
    f.appendChild(el('p', 'sm:col-span-2 text-body-sm text-on-surface-variant -mt-2', 'Deixe seu contato e nossa equipe fala com você para concluir a compra.'));
    var nome = campo(f, 'nome', 'Nome completo', 'text', 'name', 'sm:col-span-2'), email = campo(f, 'email', 'E-mail', 'email', 'email'), tel = campo(f, 'telefone', 'WhatsApp com DDD', 'tel', 'tel');
    [nome, email, tel].forEach(function (i) { i.required = true; i.classList.remove('bg-surface-container-low'); i.classList.add('bg-white'); });
    var ac = el('label', 'sm:col-span-2 flex items-start gap-2 text-body-sm text-on-surface-variant');
    var cb = el('input', 'mt-1'); cb.type = 'checkbox'; cb.required = true; ac.appendChild(cb);
    var tx = el('span'); tx.appendChild(document.createTextNode('Aceito o contato da Natação Criativa e a '));
    var pl = el('a', 'underline text-primary', 'Política de Privacidade'); pl.href = '/privacidade'; pl.target = '_blank'; tx.appendChild(pl); ac.appendChild(tx); f.appendChild(ac);
    var msg = el('p', 'sm:col-span-2 text-body-sm text-error'); msg.setAttribute('role', 'alert'); f.appendChild(msg);
    var env = el('button', 'sm:col-span-2 ' + BTN, 'Quero comprar'); env.type = 'submit'; f.appendChild(env);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); env.disabled = true; msg.textContent = '';
      var linhas = lista.map(function (x) { var s = produto(x.id); return x.qtd + 'x ' + s.title + ' (' + reais(centavos(s.price)) + ')'; });
      fetch('/api/public/inquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'suporte', name: nome.value, email: email.value, profileType: 'Cliente da loja', subject: 'Pedido de compra na loja', message: 'WhatsApp: ' + tel.value.trim() + '\n\n' + linhas.join('\n') + '\n\nSubtotal: ' + reais(subtotal()) }),
      }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error); }); }).then(function () {
        salvar([]);
        f.textContent = '';
        f.appendChild(el('p', 'sm:col-span-2 font-semibold text-on-secondary-fixed', 'Recebemos seu pedido! Nossa equipe vai falar com você para concluir a compra.'));
      }).catch(function (err) { msg.textContent = err.message || 'Não foi possível enviar. Tente de novo.'; env.disabled = false; });
    });
    c.appendChild(f);
  }

  // ---------- checkout ----------
  function campo(form, nome, rotulo, tipo, auto, classe) {
    var l = el('label', 'block ' + (classe || ''));
    l.appendChild(el('span', 'text-label-md font-label-md uppercase text-on-surface-variant block mb-1', rotulo));
    var i = el('input', CAMPO); i.name = nome; i.type = tipo || 'text'; if (auto) i.autocomplete = auto;
    l.appendChild(i); form.appendChild(l);
    return i;
  }
  function checkout() {
    var c = abrirModal('Finalizar compra');
    var f = el('form', 'grid grid-cols-1 sm:grid-cols-2 gap-3');
    f.appendChild(el('h3', 'sm:col-span-2 font-headline-sm text-headline-sm text-on-secondary-fixed', 'Seus dados'));
    campo(f, 'nome', 'Nome completo', 'text', 'name', 'sm:col-span-2').required = true;
    campo(f, 'email', 'E-mail', 'email', 'email').required = true;
    campo(f, 'telefone', 'Celular com DDD', 'tel', 'tel').required = true;
    var doc = campo(f, 'documento', 'CPF ou CNPJ', 'text', 'off', 'sm:col-span-2'); doc.required = true; doc.inputMode = 'numeric';
    f.appendChild(el('h3', 'sm:col-span-2 font-headline-sm text-headline-sm text-on-secondary-fixed mt-2', 'Entrega'));
    var temEnvio = Object.keys(cfg.frete).some(function (k) { return Number.isInteger(cfg.frete[k]); });
    var metodo = el('div', 'sm:col-span-2 flex flex-wrap gap-4');
    function radio(v, t, marcado) {
      var l = el('label', 'inline-flex items-center gap-2'); var r = el('input'); r.type = 'radio'; r.name = 'metodo'; r.value = v; r.checked = marcado;
      r.onchange = atualizar; l.appendChild(r); l.appendChild(el('span', '', t)); metodo.appendChild(l);
    }
    if (temEnvio) radio('envio', 'Receber em casa', true);
    if (cfg.retirada) radio('retirada', 'Retirar no local', !temEnvio);
    f.appendChild(metodo);
    var ret = el('p', 'sm:col-span-2 text-body-sm text-on-surface-variant', cfg.retirada ? 'Retirada: ' + cfg.retirada.endereco : '');
    f.appendChild(ret);
    var end = el('div', 'sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3');
    var cep = campo(end, 'cep', 'CEP', 'text', 'postal-code'); cep.inputMode = 'numeric';
    var lUf = el('label', 'block'); lUf.appendChild(el('span', 'text-label-md font-label-md uppercase text-on-surface-variant block mb-1', 'Estado'));
    var uf = el('select', CAMPO); uf.name = 'uf'; uf.add(new Option('Selecione', ''));
    Object.keys(cfg.regioes).reduce(function (t, r) { return Number.isInteger(cfg.frete[r]) ? t.concat(cfg.regioes[r]) : t; }, []).sort().forEach(function (u) { uf.add(new Option(u, u)); });
    uf.onchange = atualizar; lUf.appendChild(uf); end.appendChild(lUf);
    campo(end, 'rua', 'Rua', 'text', 'address-line1', 'sm:col-span-2');
    campo(end, 'numero', 'Número', 'text');
    campo(end, 'complemento', 'Complemento (opcional)', 'text', 'address-line2');
    campo(end, 'bairro', 'Bairro', 'text');
    campo(end, 'cidade', 'Cidade', 'text', 'address-level2');
    f.appendChild(end);
    var isca = el('input'); isca.name = 'website'; isca.tabIndex = -1; isca.autocomplete = 'off'; isca.setAttribute('aria-hidden', 'true'); isca.style.cssText = 'position:absolute;left:-9999px'; f.appendChild(isca);
    var res = el('div', 'sm:col-span-2 p-4 rounded-lg bg-surface-container-low space-y-1 text-body-sm'); f.appendChild(res);
    var ac = el('label', 'sm:col-span-2 flex items-start gap-2 text-body-sm text-on-surface-variant');
    var cb = el('input', 'mt-1'); cb.type = 'checkbox'; cb.required = true; ac.appendChild(cb);
    var tx = el('span'); tx.appendChild(document.createTextNode('Li e aceito a '));
    var pl = el('a', 'underline text-primary', 'Política de Privacidade'); pl.href = '/privacidade'; pl.target = '_blank'; tx.appendChild(pl); ac.appendChild(tx); f.appendChild(ac);
    var msg = el('p', 'sm:col-span-2 text-body-sm text-error'); msg.setAttribute('role', 'alert'); f.appendChild(msg);
    var env = el('button', 'sm:col-span-2 ' + BTN, 'Ir para o pagamento'); env.type = 'submit'; f.appendChild(env);
    f.appendChild(el('p', 'sm:col-span-2 text-center text-body-sm text-on-surface-variant', 'Pagamento seguro pelo Asaas: Pix, boleto ou cartão.'));

    function escolha() { var r = f.querySelector('input[name=metodo]:checked'); return r ? r.value : ''; }
    function frete() {
      if (escolha() !== 'envio') return 0;
      var reg = Object.keys(cfg.regioes).find(function (k) { return cfg.regioes[k].indexOf(uf.value) > -1; });
      return reg ? cfg.frete[reg] : null;
    }
    function linha(a, b, forte) { var d = el('div', 'flex justify-between ' + (forte ? 'font-bold text-body-md text-on-secondary-fixed' : '')); d.appendChild(el('span', '', a)); d.appendChild(el('span', '', b)); res.appendChild(d); }
    function atualizar() {
      var envio = escolha() === 'envio';
      end.style.display = envio ? '' : 'none';
      ret.style.display = envio || !cfg.retirada ? 'none' : '';
      ['cep', 'rua', 'numero', 'bairro', 'cidade', 'uf'].forEach(function (n) { f.elements[n].required = envio; });
      res.textContent = '';
      var v = frete();
      linha('Produtos', reais(subtotal()));
      linha(envio ? 'Frete' : 'Retirada', v === null ? 'Selecione o estado' : v === 0 ? 'Grátis' : reais(v));
      linha('Total', reais(subtotal() + (v || 0)), true);
    }
    if (simulando) {
      // Dados de exemplo: na simulação ninguém precisa digitar dados reais.
      var ex = { nome: 'Cliente de Teste', email: 'teste@example.com', telefone: '11900000000', documento: '00000000000', cep: '01001000', rua: 'Rua de Exemplo', numero: '100', bairro: 'Centro', cidade: 'São Paulo' };
      Object.keys(ex).forEach(function (k) { f.elements[k].value = ex[k]; });
      uf.value = 'SP'; cb.checked = true; env.textContent = 'Continuar para o pagamento simulado';
      f.lastElementChild.textContent = 'Simulação: nenhuma cobrança será feita.';
    }
    atualizar();
    f.addEventListener('submit', function (e) {
      e.preventDefault(); env.disabled = true; msg.textContent = ''; env.textContent = 'Gerando pagamento...';
      var v = f.elements;
      if (simulando) {
        var envio = escolha() === 'envio';
        var novo = window.ncSim.criar({
          nome: v.nome.value.trim(), email: v.email.value.trim(), telefone: v.telefone.value.trim(), metodo: escolha(), frete: frete() || 0, subtotal: subtotal(),
          endereco: envio ? { cep: v.cep.value, rua: v.rua.value, numero: v.numero.value, complemento: v.complemento.value, bairro: v.bairro.value, cidade: v.cidade.value, uf: uf.value } : {},
          itens: validos().map(function (x) { var s = produto(x.id); return { id: x.id, titulo: s.title, tamanho: s.size || '', precoCents: centavos(s.price), qtd: x.qtd, situacao: s.badge || '' }; }),
        });
        salvar([]);
        pedidoSimulado(novo.id);
        return;
      }
      fetch('/api/public/loja/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: chaveCompra(), consent: cb.checked, website: isca.value,
          itens: validos().map(function (x) { return { id: x.id, qtd: x.qtd }; }),
          cliente: { nome: v.nome.value, email: v.email.value, telefone: v.telefone.value, documento: v.documento.value },
          entrega: { metodo: escolha(), cep: v.cep.value, uf: uf.value, rua: v.rua.value, numero: v.numero.value, complemento: v.complemento.value, bairro: v.bairro.value, cidade: v.cidade.value },
        }),
      }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (r) {
        if (!r.ok) {
          // erro de validação não gerou pedido; depois de falha na cobrança, a próxima tentativa é um pedido novo
          if (r.j && /pagamento|concluído/i.test(r.j.error || '')) sessionStorage.removeItem('nc_compra');
          throw new Error(r.j.error);
        }
        sessionStorage.removeItem('nc_compra'); salvar([]);
        history.replaceState(null, '', '/loja?pedido=' + r.j.token);
        acompanhar(r.j.token);
      }).catch(function (err) { msg.textContent = err.message || 'Não foi possível concluir. Tente de novo.'; env.disabled = false; env.textContent = 'Ir para o pagamento'; });
    });
    c.appendChild(f);
  }

  // ---------- pedido simulado ----------
  function pedidoSimulado(id) {
    var c = abrirModal('Pedido simulado'), p = window.ncSim.pedido(id);
    if (!p) { c.textContent = 'Pedido não encontrado.'; return; }
    c.appendChild(el('div', 'text-label-caps font-label-caps uppercase text-primary', 'Pedido nº ' + p.number + ' · simulação'));
    c.appendChild(el('div', 'font-headline-sm text-headline-sm text-on-secondary-fixed mt-1 mb-3', p.statusNome));
    p.items.forEach(function (i) { var d = el('div', 'flex justify-between gap-3 py-1.5 text-body-sm'); d.appendChild(el('span', '', i.qtd + 'x ' + i.titulo)); d.appendChild(el('span', 'whitespace-nowrap', reais(i.precoCents * i.qtd))); c.appendChild(d); });
    var fr = el('div', 'flex justify-between py-1.5 text-body-sm'); fr.appendChild(el('span', '', p.delivery_method === 'retirada' ? 'Retirada' : 'Frete')); fr.appendChild(el('span', '', reais(p.shipping_cents))); c.appendChild(fr);
    var t = el('div', 'flex justify-between py-2 border-t border-surface-container font-bold'); t.appendChild(el('span', '', 'Total')); t.appendChild(el('span', '', reais(p.total_cents))); c.appendChild(t);
    if (p.status === 'aguardando_pagamento') {
      c.appendChild(el('p', 'mt-3 text-body-sm text-on-surface-variant', 'Escolha como simular o pagamento. Nenhum valor é cobrado.'));
      var g = el('div', 'grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2');
      [['PIX', 'Pix'], ['CREDIT_CARD', 'Cartão'], ['BOLETO', 'Boleto']].forEach(function (m) {
        var b = el('button', BTN, 'Aprovar ' + m[1]); b.type = 'button';
        b.onclick = function () { window.ncSim.pagar(id, m[0]); pedidoSimulado(id); };
        g.appendChild(b);
      });
      c.appendChild(g);
    } else {
      c.appendChild(el('p', 'mt-3 font-semibold text-on-secondary-fixed', 'Pagamento simulado aprovado. Na loja real, a equipe e o cliente receberiam o e-mail agora.'));
      var a = el('a', 'block w-full mt-3 ' + BTN, 'Ver no painel'); a.href = '/admin'; c.appendChild(a);
    }
  }
  function faixaSimulacao() {
    if (document.getElementById('ncFaixaSim')) return;
    var f = el('div', 'fixed top-2 left-1/2 -translate-x-1/2 z-[9997] max-w-[calc(100vw-16px)] px-3 py-2 rounded-full bg-[#FAC61C] text-on-secondary-fixed shadow-lg flex items-center gap-3 text-body-sm font-semibold whitespace-nowrap');
    f.id = 'ncFaixaSim';
    f.appendChild(el('span', '', 'Simulação: sem cobrança'));
    var a = el('a', 'underline', 'Ver pedidos'); a.href = '/admin'; f.appendChild(a);
    document.body.appendChild(f);
  }

  // ---------- pedido ----------
  function acompanhar(token) {
    var c = abrirModal('Seu pedido');
    c.textContent = 'Carregando...';
    var atual = modal;
    function carregar() {
      fetch('/api/public/loja/pedido/' + encodeURIComponent(token), { cache: 'no-store' }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); }).then(function (r) {
        if (modal !== atual) return;
        c.textContent = '';
        if (!r.ok) { c.textContent = r.j.error || 'Pedido não encontrado.'; clearInterval(atual.timer); return; }
        var p = r.j;
        c.appendChild(el('div', 'text-label-caps font-label-caps uppercase text-primary', 'Pedido nº ' + p.numero));
        c.appendChild(el('div', 'font-headline-sm text-headline-sm text-on-secondary-fixed mt-1 mb-3', p.statusNome));
        p.itens.forEach(function (i) {
          var d = el('div', 'flex justify-between gap-3 py-1.5 text-body-sm'); d.appendChild(el('span', '', i.qtd + 'x ' + i.titulo)); d.appendChild(el('span', 'whitespace-nowrap', reais(i.precoCents * i.qtd))); c.appendChild(d);
        });
        var fr = el('div', 'flex justify-between py-1.5 text-body-sm'); fr.appendChild(el('span', '', p.entrega === 'retirada' ? 'Retirada' : 'Frete')); fr.appendChild(el('span', '', reais(p.frete))); c.appendChild(fr);
        var t = el('div', 'flex justify-between py-2 border-t border-surface-container font-bold'); t.appendChild(el('span', '', 'Total')); t.appendChild(el('span', '', reais(p.total))); c.appendChild(t);
        if (p.rastreio) c.appendChild(el('p', 'mt-3 text-body-sm', 'Código de rastreio: ' + p.rastreio));
        if (p.invoiceUrl) {
          var a = el('a', 'block w-full mt-4 ' + BTN, 'Pagar agora'); a.href = p.invoiceUrl; a.target = '_blank'; a.rel = 'noopener'; c.appendChild(a);
          c.appendChild(el('p', 'mt-2 text-center text-body-sm text-on-surface-variant', 'Depois de pagar, esta tela atualiza sozinha.'));
        } else clearInterval(atual.timer);
      }).catch(function () {});
    }
    carregar();
    atual.timer = setInterval(carregar, 6000);
    setTimeout(function () { clearInterval(atual.timer); }, 900000);
  }

  // ---------- botões ----------
  function contador() {
    var b = document.getElementById('ncCarrinho');
    if (!b) return;
    var n = carrinho().reduce(function (t, x) { return t + x.qtd; }, 0);
    b.querySelector('span:last-child').textContent = n ? 'Carrinho (' + n + ')' : 'Carrinho';
  }
  function ligarBotoes() {
    [].forEach.call(document.querySelectorAll('main article[data-id]'), function (a) {
      var id = a.dataset.id, s = produto(id), b = a.querySelector('[data-comprar]');
      if (!s || !b || !centavos(s.price)) return;
      var novo = el('button', b.className, limite(id) > 0 ? 'Comprar' : 'Esgotado');
      novo.type = 'button'; novo.disabled = limite(id) <= 0;
      if (novo.disabled) novo.classList.add('opacity-50');
      novo.onclick = function () { adicionar(id); };
      b.replaceWith(novo);
    });
    if (!document.getElementById('ncCarrinho')) {
      var c = el('button', 'fixed left-4 bottom-24 z-[60] px-4 py-3 bg-on-secondary-fixed text-on-primary rounded-full shadow-lg inline-flex items-center gap-2 font-label-lg text-label-lg');
      c.id = 'ncCarrinho'; c.type = 'button';
      c.appendChild(el('span', 'material-symbols-outlined text-[20px]', 'shopping_cart')); c.appendChild(el('span', '', 'Carrinho'));
      c.onclick = verCarrinho;
      document.body.appendChild(c);
    }
    contador();
  }

  function iniciar(lista) {
    itens = lista || [];
    fetch('/api/public/loja/config', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var token = new URLSearchParams(location.search).get('pedido');
      cfg = j.ativa ? j : null;
      if (window.ncSim && window.ncSim.ativo()) { simulando = true; cfg = window.ncSim.config(); faixaSimulacao(); }
      ligarBotoes();
      if (token && !simulando) acompanhar(token);
    }).catch(function () {
      cfg = null;
      if (window.ncSim && window.ncSim.ativo()) { simulando = true; cfg = window.ncSim.config(); faixaSimulacao(); }
      ligarBotoes();
    });
  }
  if (window.__ncItensLoja) iniciar(window.__ncItensLoja);
  else document.addEventListener('nc:loja', function (e) { iniciar(e.detail); }, { once: true });
})();
