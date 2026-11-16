// Suporte com a foca mascote: responde com as informações que estão no site (mascote/base.json).
(function () {
  if (window.__focaSuporte) return;
  window.__focaSuporte = true;

  var IMG = '/mascote/foca.svg';
  var SUGESTOES = ['Quais formações existem?', 'Como emito meu certificado?', 'O que tem na loja?', 'Como falo com o atendimento?'];
  var PARADAS = ' a o e as os um uma uns umas de da do das dos em no na nos nas para pra por com sem que qual quais como onde quando quem tem ter tenho voce voces eu me meu minha meus minhas seu sua seus suas se ao aos ou mais muito isso esse essa este esta ser sao foi quero queria gostaria preciso posso pode saber sobre fazer faco faz existe existem tudo algum alguma oi ola bom boa dia tarde noite favor obrigado obrigada ';

  var css = '' +
    '#foca-btn{position:fixed;right:16px;bottom:16px;z-index:9998;width:68px;height:68px;border-radius:50%;border:0;padding:0;cursor:pointer;background:#fff;box-shadow:0 10px 24px -4px rgba(11,50,88,.35);transition:transform .2s}' +
    '#foca-btn:hover{transform:scale(1.06)}#foca-btn img{width:100%;height:100%;border-radius:50%;display:block}' +
    '#foca-btn:focus-visible,#foca-painel button:focus-visible,#foca-painel input:focus-visible{outline:3px solid #0074da;outline-offset:2px}' +
    '#foca-balao{position:fixed;right:92px;bottom:30px;z-index:9998;background:#001c38;color:#fff;font:600 13px/1.3 Inter,system-ui,sans-serif;padding:9px 12px;border-radius:12px 12px 2px 12px;box-shadow:0 6px 16px rgba(11,50,88,.25);max-width:190px}' +
    '#foca-painel{position:fixed;right:16px;bottom:16px;z-index:9999;width:370px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);background:#f6fafc;border-radius:16px;box-shadow:0 20px 40px -8px rgba(11,50,88,.35);display:none;flex-direction:column;overflow:hidden;font:400 14px/1.45 Inter,system-ui,sans-serif;color:#171c1e}' +
    '#foca-painel.aberto{display:flex}' +
    '#foca-topo{background:linear-gradient(135deg,#047AE4,#7B2CBF 60%,#D41076);color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px}' +
    '#foca-topo img{width:44px;height:44px;border-radius:50%;background:#fff;flex-shrink:0}' +
    '#foca-topo strong{display:block;font:700 15px/1.2 "Plus Jakarta Sans",Inter,sans-serif}#foca-topo span{font-size:12px;opacity:.9}' +
    '#foca-fechar{margin-left:auto;background:rgba(255,255,255,.18);border:0;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:20px;line-height:1}' +
    '#foca-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}' +
    '.foca-m{max-width:88%;padding:10px 12px;border-radius:14px;white-space:pre-line;word-wrap:break-word}' +
    '.foca-m.bot{background:#fff;align-self:flex-start;border-bottom-left-radius:4px;box-shadow:0 2px 10px rgba(11,50,88,.06)}' +
    '.foca-m.eu{background:#005cae;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}' +
    '.foca-m b{display:block;color:#001c38;font:700 14px/1.3 "Plus Jakarta Sans",Inter,sans-serif;margin-bottom:4px}' +
    '.foca-m a.ir{display:inline-block;margin-top:8px;background:#005cae;color:#fff;text-decoration:none;font-weight:700;font-size:12px;padding:7px 12px;border-radius:8px}' +
    '.foca-chips{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start}' +
    '.foca-chips button{background:#d3e4ff;color:#001c38;border:0;border-radius:999px;padding:7px 12px;font:600 12px/1.2 Inter,sans-serif;cursor:pointer;text-align:left}' +
    '.foca-chips button:hover{background:#b1d1ff}' +
    '#foca-form{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e5e9eb}' +
    '#foca-form input{flex:1;min-width:0;border:0;background:#f0f4f6;border-radius:10px;padding:11px 12px;font:400 16px/1.2 Inter,sans-serif;color:#171c1e}' +
    '#foca-form button{background:#005cae;color:#fff;border:0;border-radius:10px;padding:0 16px;font:700 14px Inter,sans-serif;cursor:pointer}' +
    '#foca-nota{font-size:11px;color:#717784;text-align:center;padding:0 10px 8px;background:#fff}';

  function el(tag, attrs, txt) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (txt != null) e.textContent = txt;
    return e;
  }
  function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function raiz(w) { return w.replace(/(oes|aes|ais|es|s)$/, '').slice(0, 5); }
  function termos(s) {
    var out = [];
    norm(s).split(' ').forEach(function (w) { if (w.length > 2 && PARADAS.indexOf(' ' + w + ' ') < 0) out.push(raiz(w)); });
    return out;
  }
  function conjunto(s) { var o = {}; termos(s).forEach(function (t) { o[t] = 1; }); return o; }

  var base = null, carregando = null;
  function carregar() {
    if (!carregando) carregando = fetch('/mascote/base.json').then(function (r) { return r.json(); }).then(function (lista) {
      base = lista.map(function (e) { return { e: e, k: conjunto(e.k), t: conjunto(e.t), r: conjunto(e.r) }; });
    });
    return carregando;
  }
  function buscar(pergunta) {
    var q = termos(pergunta), achados = [];
    if (!q.length) return [];
    base.forEach(function (b, i) {
      var p = 0;
      q.forEach(function (t) { p += (b.k[t] ? 4 : 0) + (b.t[t] ? 3 : 0) + (b.r[t] ? 1 : 0); });
      if (p >= 3) achados.push({ p: p, i: i, e: b.e });
    });
    achados.sort(function (a, b) { return b.p - a.p || a.i - b.i; });
    return achados;
  }

  var style = el('style'); style.textContent = css; document.head.appendChild(style);

  var btn = el('button', { id: 'foca-btn', type: 'button', 'aria-label': 'Abrir o suporte da Natação Criativa' });
  btn.appendChild(el('img', { src: IMG, alt: '' }));
  var balao = el('div', { id: 'foca-balao' }, 'Posso ajudar? Pergunte aqui!');

  var painel = el('section', { id: 'foca-painel', role: 'dialog', 'aria-label': 'Suporte da Natação Criativa' });
  var topo = el('div', { id: 'foca-topo' });
  topo.appendChild(el('img', { src: IMG, alt: '' }));
  var nome = el('div'); nome.appendChild(el('strong', null, 'Foca da Natação Criativa')); nome.appendChild(el('span', null, 'Respondo com o que está no site'));
  topo.appendChild(nome);
  var fechar = el('button', { id: 'foca-fechar', type: 'button', 'aria-label': 'Fechar o suporte' }, '×');
  topo.appendChild(fechar);
  var msgs = el('div', { id: 'foca-msgs', 'aria-live': 'polite' });
  var form = el('form', { id: 'foca-form' });
  var campo = el('input', { type: 'text', placeholder: 'Escreva sua pergunta...', 'aria-label': 'Sua pergunta', autocomplete: 'off', maxlength: '200' });
  form.appendChild(campo); form.appendChild(el('button', { type: 'submit' }, 'Enviar'));
  painel.appendChild(topo); painel.appendChild(msgs); painel.appendChild(form);
  painel.appendChild(el('div', { id: 'foca-nota' }, 'Respostas automáticas. Para casos específicos, fale com o atendimento.'));

  document.body.appendChild(btn); document.body.appendChild(balao); document.body.appendChild(painel);

  function rolar() { msgs.scrollTop = msgs.scrollHeight; }
  function fala(quem, txt) { var m = el('div', { class: 'foca-m ' + quem }, txt); msgs.appendChild(m); rolar(); return m; }
  function chips(lista, aoClicar) {
    var c = el('div', { class: 'foca-chips' });
    lista.forEach(function (item) {
      var b = el('button', { type: 'button' }, item.rotulo);
      b.addEventListener('click', function () { aoClicar(item); });
      c.appendChild(b);
    });
    msgs.appendChild(c); rolar();
  }
  function mostrar(e) {
    var m = el('div', { class: 'foca-m bot' });
    m.appendChild(el('b', null, e.t));
    m.appendChild(document.createTextNode(e.r));
    if (e.l && e.l !== location.pathname) { m.appendChild(document.createElement('br')); m.appendChild(el('a', { class: 'ir', href: e.l }, (e.p ? 'Abrir a página ' + e.p : 'Abrir a página') + ' →')); }
    msgs.appendChild(m); rolar();
  }
  function responder(pergunta) {
    var n = ' ' + norm(pergunta) + ' ';
    if (/ (oi|ola|bom dia|boa tarde|boa noite|eai|hello) /.test(n) && termos(pergunta).length === 0) return fala('bot', 'Olá! Sou a foca da Natação Criativa. Pode perguntar sobre formações, certificados, loja, conteúdos ou atendimento.');
    if (/ (obrigad[oa]|valeu|agradeco) /.test(n)) return fala('bot', 'Por nada! Se precisar, é só chamar. Bons mergulhos!');
    var achados = buscar(pergunta);
    if (!achados.length) {
      var m = fala('bot', 'Não encontrei essa informação no site. A equipe pode responder para você: ');
      m.appendChild(el('a', { class: 'ir', href: '/atendimento' }, 'Falar com o atendimento →'));
      return;
    }
    mostrar(achados[0].e);
    var outros = achados.slice(1, 4).filter(function (a) { return a.p >= achados[0].p * 0.6 && a.e.t !== achados[0].e.t; }).slice(0, 2);
    if (outros.length) {
      fala('bot', 'Veja também:');
      chips(outros.map(function (a) { return { rotulo: a.e.t, e: a.e }; }), function (item) { fala('eu', item.rotulo); mostrar(item.e); });
    }
  }
  function perguntar(txt) {
    txt = txt.trim(); if (!txt) return;
    fala('eu', txt);
    carregar().then(function () { responder(txt); }).catch(function () {
      var m = fala('bot', 'Não consegui consultar as informações agora. ');
      m.appendChild(el('a', { class: 'ir', href: '/atendimento' }, 'Falar com o atendimento →'));
    });
  }

  var iniciado = false;
  function abrir() {
    painel.classList.add('aberto'); btn.style.display = 'none'; balao.style.display = 'none';
    try { sessionStorage.setItem('focaBalao', '1'); } catch (e) {}
    if (!iniciado) {
      iniciado = true; carregar().catch(function () {});
      fala('bot', 'Olá! Sou a foca da Natação Criativa. Faça uma pergunta e eu respondo com as informações do site.');
      chips(SUGESTOES.map(function (s) { return { rotulo: s }; }), function (item) { perguntar(item.rotulo); });
    }
    campo.focus();
  }
  function fecharPainel() { painel.classList.remove('aberto'); btn.style.display = ''; btn.focus(); }

  btn.addEventListener('click', abrir);
  balao.addEventListener('click', abrir);
  fechar.addEventListener('click', fecharPainel);
  painel.addEventListener('keydown', function (e) { if (e.key === 'Escape') fecharPainel(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = campo.value; campo.value = ''; perguntar(v); });
  try { if (sessionStorage.getItem('focaBalao')) balao.style.display = 'none'; } catch (e) {}
})();
