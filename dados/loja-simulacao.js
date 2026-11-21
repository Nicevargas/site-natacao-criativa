// Modo simulação da loja: existe só no navegador de quem ligou pelo painel.
// Não grava no banco, não fala com o Asaas, não envia e-mail e não mexe no estoque.
(function () {
  if (window.ncSim) return;
  var LIGADO = 'nc_loja_sim', PEDIDOS = 'nc_loja_sim_pedidos';
  var NOMES = { aguardando_pagamento: 'Aguardando pagamento', vencido: 'Pagamento vencido', pago: 'Pago', em_separacao: 'Em separação', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado', reembolsado: 'Reembolsado' };
  var PROXIMOS = { aguardando_pagamento: ['cancelado'], vencido: ['cancelado'], pago: ['em_separacao', 'enviado'], em_separacao: ['pago', 'enviado'], enviado: ['em_separacao', 'entregue'], entregue: ['enviado'], cancelado: [], reembolsado: [] };
  var FRETE = { N: 3900, NE: 3200, CO: 2800, SE: 2000, S: 2400 };
  var REGIOES = { N: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'], NE: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'], CO: ['DF', 'GO', 'MS', 'MT'], SE: ['ES', 'MG', 'RJ', 'SP'], S: ['PR', 'RS', 'SC'] };
  var ler = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var gravar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var tirar = function (k) { try { localStorage.removeItem(k); } catch (e) {} };
  function lista() { try { var l = JSON.parse(ler(PEDIDOS) || '[]'); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function completar(o) { return Object.assign({}, o, { statusNome: NOMES[o.status], proximos: PROXIMOS[o.status] || [], simulado: true }); }
  function guardar(l) { gravar(PEDIDOS, JSON.stringify(l)); }
  function centavos(p) {
    var s = String(p == null ? '' : p).replace(/[^\d,.]/g, '');
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    var n = Math.round(Number(s) * 100);
    return n > 0 ? n : 0;
  }
  function proximoNumero(l) { return l.reduce(function (m, o) { return Math.max(m, o.number); }, 9000) + 1; }
  function historico(texto, quem, em) { return { em: em || new Date().toISOString(), texto: texto + ' (simulação)', quem: quem || 'Simulação' }; }

  function semear(itens) {
    var vendaveis = (itens || []).filter(function (s) { return s.active !== false && centavos(s.price); });
    if (!vendaveis.length) return;
    var modelos = [
      ['Cliente Exemplo Um', 'pago', 'PIX', 'SP', 'São Paulo', 0, null],
      ['Cliente Exemplo Dois', 'em_separacao', 'CREDIT_CARD', 'MG', 'Belo Horizonte', 1, null],
      ['Cliente Exemplo Três', 'enviado', 'PIX', 'RS', 'Porto Alegre', 3, 'BR000000000EX'],
      ['Cliente Exemplo Quatro', 'entregue', 'BOLETO', 'BA', 'Salvador', 8, 'BR000000001EX'],
      ['Cliente Exemplo Cinco', 'aguardando_pagamento', '', 'GO', 'Goiânia', 0, null],
      ['Cliente Exemplo Seis', 'vencido', '', 'PA', 'Belém', 6, null],
      ['Cliente Exemplo Sete', 'cancelado', '', 'PR', 'Curitiba', 10, null],
    ];
    var l = modelos.map(function (m, k) {
      var escolhidos = [vendaveis[(k * 7) % vendaveis.length]];
      if (k % 2 === 0 && vendaveis.length > 1) {
        var outro = vendaveis[(k * 7 + 3) % vendaveis.length];
        if (outro.id !== escolhidos[0].id) escolhidos.push(outro);
      }
      var items = escolhidos.map(function (s, n) { return { id: s.id, titulo: s.title, tamanho: s.size || '', precoCents: centavos(s.price), qtd: n === 0 && k % 3 === 0 ? 2 : 1, situacao: s.badge || '' }; });
      var sub = items.reduce(function (t, i) { return t + i.precoCents * i.qtd; }, 0);
      var reg = Object.keys(REGIOES).find(function (r) { return REGIOES[r].indexOf(m[3]) > -1; });
      var em = new Date(Date.now() - m[5] * 86400000 - k * 3600000).toISOString();
      var pagou = ['pago', 'em_separacao', 'enviado', 'entregue'].indexOf(m[1]) > -1;
      return {
        id: 'sim-' + (9001 + k), number: 9001 + k, status: m[1], customer_name: m[0], customer_email: 'cliente' + (k + 1) + '@example.com', customer_phone: '11900000000',
        delivery_method: 'envio', address: { cep: '00000000', rua: 'Rua de Exemplo', numero: String(100 + k), complemento: '', bairro: 'Centro', cidade: m[4], uf: m[3] },
        items: items, subtotal_cents: sub, shipping_cents: FRETE[reg], total_cents: sub + FRETE[reg], billing_type: m[2], paid_at: pagou ? em : null,
        created_at: em, tracking_code: m[6] || '', internal_notes: '', history: [historico('Pedido criado.', 'Cliente', em)],
      };
    });
    guardar(l);
  }

  window.ncSim = {
    NOMES: NOMES,
    ativo: function () { return ler(LIGADO) === '1'; },
    ligar: function (itens) { gravar(LIGADO, '1'); if (!lista().length) semear(itens); },
    desligar: function () { tirar(LIGADO); tirar(PEDIDOS); },
    pedidos: function () { return lista().map(completar); },
    pedido: function (id) { var o = lista().find(function (x) { return x.id === id; }); return o ? completar(o) : null; },
    config: function () { return { ativa: true, simulacao: true, frete: FRETE, regioes: REGIOES, retirada: { endereco: 'Endereço de exemplo (simulação)' }, estoque: {} }; },
    criar: function (d) {
      var l = lista(), n = proximoNumero(l);
      var o = {
        id: 'sim-' + n, number: n, status: 'aguardando_pagamento', customer_name: d.nome, customer_email: d.email, customer_phone: d.telefone,
        delivery_method: d.metodo, address: d.endereco || {}, items: d.itens, subtotal_cents: d.subtotal, shipping_cents: d.frete, total_cents: d.subtotal + d.frete,
        billing_type: '', paid_at: null, created_at: new Date().toISOString(), tracking_code: '', internal_notes: '', history: [historico('Pedido criado na loja.', 'Cliente')],
      };
      l.unshift(o); guardar(l);
      return completar(o);
    },
    pagar: function (id, forma) {
      var l = lista(), o = l.find(function (x) { return x.id === id; });
      if (!o || o.status !== 'aguardando_pagamento') return null;
      o.status = 'pago'; o.billing_type = forma; o.paid_at = new Date().toISOString();
      o.history.push(historico('Pagamento aprovado.'));
      guardar(l);
      return completar(o);
    },
    atualizar: function (id, b) {
      var l = lista(), o = l.find(function (x) { return x.id === id; });
      if (!o) return { error: 'Pedido não encontrado.' };
      if (b.status && b.status !== o.status && (PROXIMOS[o.status] || []).indexOf(b.status) === -1) return { error: 'Não dá para passar para essa situação.' };
      if (b.tracking_code !== undefined && b.tracking_code !== o.tracking_code) { o.tracking_code = String(b.tracking_code).trim().slice(0, 60); o.history.push(historico('Rastreio: ' + (o.tracking_code || 'removido') + '.', 'Admin')); }
      if (b.internal_notes !== undefined) o.internal_notes = String(b.internal_notes).slice(0, 2000);
      if (b.status && b.status !== o.status) { o.status = b.status; o.history.push(historico('Situação: ' + NOMES[b.status] + '.', 'Admin')); }
      guardar(l);
      return { pedido: completar(o) };
    },
  };
})();
