// Site público: parceiros, foto dos destaques, loja do painel, campos do Cardume,
// últimos lançamentos, certificado para baixar e atividade (só com consentimento).
(function () {
  if (window.__ncExtras) return;
  window.__ncExtras = true;

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var ler = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var gravar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var linkSeguro = function (u) { return /^https?:\/\//i.test(String(u || '')) ? u : ''; };

  // ---------- parceiros ----------
  function logo(p, altura) {
    var img = el('img', 'object-contain');
    img.src = p.logoUrl; img.alt = p.name || 'Parceiro'; img.loading = 'lazy';
    img.style.cssText = 'height:' + altura + 'px;max-width:110px';
    if (!linkSeguro(p.url)) return img;
    var a = el('a'); a.href = p.url; a.target = '_blank'; a.rel = 'noopener'; a.title = p.name || ''; a.appendChild(img);
    return a;
  }
  function parceiros(lista) {
    lista = (lista || []).filter(function (p) { return p.logoUrl; });
    var cab = lista.filter(function (p) { return p.showHeader !== false; });
    var header = document.querySelector('header');
    if (cab.length && header && header.children.length > 1) {
      var f = el('div', 'hidden xl:flex items-center gap-3 mx-4 min-w-0 overflow-hidden');
      f.setAttribute('aria-label', 'Parceiros');
      cab.slice(0, 6).forEach(function (p) { f.appendChild(logo(p, 30)); });
      header.insertBefore(f, header.lastElementChild);
    }
    var rod = lista.filter(function (p) { return p.showFooter !== false; });
    var footer = document.querySelector('footer');
    if (rod.length && footer) {
      var b = el('div', 'mb-6 pb-6 border-b border-white/10');
      b.appendChild(el('div', 'text-xs font-bold uppercase tracking-wider mb-3 opacity-80', 'Parceiros'));
      var l = el('div', 'flex flex-wrap items-center gap-3');
      rod.forEach(function (p) { var c = el('div', 'bg-white rounded-lg px-3 py-2 flex items-center'); c.appendChild(logo(p, 34)); l.appendChild(c); });
      b.appendChild(l);
      footer.insertBefore(b, footer.firstElementChild);
    }
  }

  // ---------- destaques da home ----------
  function destaques(lista) {
    (lista || []).slice(0, 3).forEach(function (h, i) {
      var s = document.getElementById('slide-' + i);
      if (!s) return;
      var img = s.querySelector('img');
      if (img && h.imageUrl) { img.src = h.imageUrl; img.alt = h.title || ''; }
      if (h.imageCaption) { var leg = s.querySelector('.absolute span'); if (leg) leg.textContent = h.imageCaption; }
    });
  }

  // ---------- loja vinda do painel ----------
  function chave(c) {
    var t = String(c || '').toLowerCase();
    if (t.indexOf('brinquedo') > -1 || t.indexOf('jogo') > -1) return 'brinquedos';
    if (t.indexOf('uniforme') > -1) return 'uniformes';
    if (t.indexOf('livro') > -1) return 'livros';
    if (t.indexOf('material') > -1 || t.indexOf('materiais') > -1) return 'materiais';
    return 'digitais';
  }
  function cartaoLoja(s) {
    var a = el('article', 'flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(11,50,88,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(11,50,88,0.12)] transition-all duration-300 group');
    a.dataset.cat = chave(s.category);
    var capa = el('div', 'relative h-56 w-full overflow-hidden bg-white');
    if (s.imageUrl) {
      var img = el('img', 'w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500');
      img.src = s.imageUrl; img.alt = s.title; img.loading = 'lazy'; capa.appendChild(img);
    } else capa.appendChild(el('span', 'material-symbols-outlined absolute inset-0 m-auto h-fit w-fit text-outline-variant text-[72px]', 'toys'));
    capa.appendChild(el('span', 'absolute top-3 left-3 px-2.5 py-1 rounded-full text-label-caps font-label-caps uppercase tracking-wider shadow-sm text-on-primary bg-primary-container', s.category));
    a.appendChild(capa);
    var corpo = el('div', 'p-space-lg flex-1 flex flex-col justify-between'), cima = el('div', 'space-y-2');
    cima.appendChild(el('h2', 'text-on-secondary-fixed font-headline-sm text-headline-sm group-hover:text-primary transition-colors', s.title));
    if (s.size) cima.appendChild(el('p', 'text-label-md font-label-md text-primary', 'Tamanho: ' + s.size));
    if (s.summary) cima.appendChild(el('p', 'text-on-surface-variant font-body-sm text-body-sm line-clamp-3', s.summary));
    if (linkSeguro(s.videoUrl)) {
      var v = el('a', 'inline-flex items-center gap-1 text-primary font-semibold text-body-sm');
      v.href = s.videoUrl; v.target = '_blank'; v.rel = 'noopener';
      v.appendChild(el('span', 'material-symbols-outlined text-[18px]', 'play_circle')); v.appendChild(document.createTextNode('Ver vídeo'));
      cima.appendChild(v);
    }
    corpo.appendChild(cima);
    var pe = el('div', 'mt-6 bg-surface-container-low -mx-space-lg -mb-space-lg p-space-lg flex items-center justify-between gap-3'), p = el('div');
    p.appendChild(el('span', 'text-label-caps font-label-caps text-on-surface-variant uppercase block', 'Valor'));
    p.appendChild(el('span', 'text-on-secondary-fixed font-headline-sm text-headline-sm', s.price));
    pe.appendChild(p);
    var b = el('a', 'px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg inline-flex items-center gap-1.5 shadow-sm', 'Tenho interesse');
    b.href = '/atendimento'; pe.appendChild(b);
    corpo.appendChild(pe); a.appendChild(corpo);
    return a;
  }
  function loja(itens) {
    if (location.pathname !== '/loja') return;
    if (!(itens || []).some(function (s) { return s.sourceId; })) return; // antes de importar, fica a loja fixa
    var grade = document.querySelector('main article') && document.querySelector('main article').parentElement;
    if (!grade) return;
    grade.textContent = '';
    itens.forEach(function (s) { grade.appendChild(cartaoLoja(s)); });
    var cards = [].slice.call(grade.children), cat = 'todos', q = '';
    var busca = document.getElementById('busca'), cont = document.getElementById('contador'), vazio = document.getElementById('vazio');
    var novaBusca = busca.cloneNode(true); busca.parentNode.replaceChild(novaBusca, busca);
    function aplicar() {
      var n = 0;
      cards.forEach(function (c) { var ok = (cat === 'todos' || c.dataset.cat === cat) && (!q || c.textContent.toLowerCase().indexOf(q) > -1); c.style.display = ok ? '' : 'none'; if (ok) n++; });
      cont.textContent = n + (n === 1 ? ' produto' : ' produtos');
      if (vazio) vazio.style.display = n ? 'none' : '';
    }
    novaBusca.addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); aplicar(); });
    [].forEach.call(document.querySelectorAll('[data-chip]'), function (b) {
      var novo = b.cloneNode(true); b.parentNode.replaceChild(novo, b);
      novo.addEventListener('click', function () {
        cat = novo.dataset.chip;
        document.querySelectorAll('[data-chip]').forEach(function (x) { x.classList.toggle('chip-ativo', x === novo); });
        aplicar();
      });
    });
    aplicar();
  }

  // ---------- Cardume: telefone e nascimento ----------
  function camposCardume() {
    document.querySelectorAll('form').forEach(function (f) {
      var email = f.querySelector('input[type=email]');
      if (!email || f.id === 'form-contato' || f.querySelector('[name=phone]')) return;
      if ((f.closest('section') && f.closest('section').textContent || '').toLowerCase().indexOf('cardume') === -1) return;
      f.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;align-items:stretch;width:100%';
      var bloco = email;
      while (bloco.parentElement !== f) bloco = bloco.parentElement;
      [].forEach.call(f.children, function (c) { c.style.width = '100%'; c.style.minWidth = '0'; });
      var classe = email.className;
      var tel = el('input', classe); tel.type = 'tel'; tel.name = 'phone'; tel.placeholder = 'Telefone com DDD'; tel.autocomplete = 'tel'; tel.setAttribute('aria-label', 'Telefone');
      var nasc = el('input', classe); nasc.type = 'text'; nasc.name = 'birthDate'; nasc.placeholder = 'Data de nascimento'; nasc.setAttribute('aria-label', 'Data de nascimento');
      nasc.addEventListener('focus', function () { nasc.type = 'date'; });
      tel.style.width = nasc.style.width = '100%';
      tel.classList.remove('pl-10', 'pl-11', 'pl-12');
      nasc.classList.remove('pl-10', 'pl-11', 'pl-12');
      bloco.insertAdjacentElement('afterend', nasc);
      bloco.insertAdjacentElement('afterend', tel);
    });
  }

  // ---------- últimos lançamentos (home) ----------
  function cartaoDe(texto) {
    var a = [].find.call(document.querySelectorAll('main a'), function (x) { return x.textContent.indexOf(texto) > -1; });
    return a ? { botao: a, card: a.closest('.group') } : null;
  }
  function tempoAtras(iso) {
    var d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (!(d >= 0)) return '';
    return d === 0 ? 'Publicado hoje' : d === 1 ? 'Publicado ontem' : d < 60 ? 'Publicado há ' + d + ' dias' : 'Publicado em ' + new Date(iso).toLocaleDateString('pt-BR');
  }
  function aplicarCartao(c, item) {
    if (!c || !item || !linkSeguro(item.url)) return;
    c.botao.href = item.url; c.botao.target = '_blank'; c.botao.rel = 'noopener';
    var img = c.card.querySelector('img');
    if (img && item.image) { img.src = item.image; img.alt = item.title; }
    var h = c.card.querySelector('h3'), p = c.card.querySelector('p');
    if (h) h.textContent = item.title;
    if (p) p.textContent = item.summary || '';
    var quando = [].find.call(c.card.querySelectorAll('div'), function (d) { return /^\s*schedule/.test(d.textContent) && d.children.length === 1; });
    if (quando && item.publishedAt) quando.lastChild.textContent = ' ' + tempoAtras(item.publishedAt);
  }
  function lancamentos() {
    var yt = cartaoDe('Assistir no YouTube'), sp = cartaoDe('Ouvir no Spotify'), ig = cartaoDe('Ver no Instagram');
    if (!yt && !sp && !ig) return;
    if (ig) { ig.botao.href = 'https://instagram.com/natacaocriativa'; ig.botao.target = '_blank'; ig.botao.rel = 'noopener'; }
    fetch('/api/public/ultimos').then(function (r) { return r.json(); }).then(function (d) {
      aplicarCartao(yt, d.youtube);
      aplicarCartao(ig, d.instagram);
      if (sp && d.spotify) {
        sp.botao.href = d.spotify.url; sp.botao.target = '_blank'; sp.botao.rel = 'noopener';
        var topo = sp.card.querySelector('.relative');
        if (topo) {
          var f = el('iframe', 'w-full h-full border-0');
          f.src = d.spotify.embedUrl; f.title = 'Últimos episódios do podcast';
          f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
          topo.textContent = ''; topo.style.height = '352px'; topo.style.background = 'transparent'; topo.appendChild(f);
        }
        var corpo = sp.card.querySelector('.p-space-lg');
        if (corpo) corpo.style.display = 'none';
      }
    }).catch(function () {});
  }

  // ---------- certificado para baixar ----------
  function carregarImg(url) {
    return new Promise(function (ok, erro) {
      var i = new Image();
      if (/^https?:/i.test(url)) i.crossOrigin = 'anonymous';
      i.onload = function () { ok(i); }; i.onerror = erro; i.src = url;
    });
  }
  function ajustarFonte(ctx, texto, peso, tam, largura, familia) {
    do { ctx.font = peso + ' ' + tam + 'px ' + familia; tam -= 2; } while (ctx.measureText(texto).width > largura && tam > 14);
  }
  function baixar(cv, nome) {
    var a = document.createElement('a');
    a.download = nome; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  }
  async function gerarCertificado(c) {
    var cv = document.createElement('canvas'); cv.width = 1754; cv.height = 1240;
    var x = cv.getContext('2d'), F = '"Plus Jakarta Sans",Inter,Arial,sans-serif', temModelo = false;
    x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    if (c.templateUrl) {
      try { x.drawImage(await carregarImg(c.templateUrl), 0, 0, cv.width, cv.height); temModelo = true; } catch (e) {}
    }
    x.textAlign = 'center'; x.fillStyle = '#001c38';
    if (!temModelo) {
      x.strokeStyle = '#047AE4'; x.lineWidth = 10; x.strokeRect(40, 40, cv.width - 80, cv.height - 80);
      try { var lg = await carregarImg('/marca/logo.png'); x.drawImage(lg, cv.width / 2 - 170, 90, 340, 132); } catch (e) {}
      x.font = '800 60px ' + F; x.fillText('CERTIFICADO', cv.width / 2, 320);
      x.font = '400 32px ' + F; x.fillText('Certificamos que', cv.width / 2, 450);
    }
    ajustarFonte(x, c.recipientName, '800', 72, cv.width - 300, F);
    x.fillText(c.recipientName, cv.width / 2, 560);
    x.font = '400 32px ' + F;
    x.fillText('concluiu a formação', cv.width / 2, 640);
    ajustarFonte(x, c.courseTitle, '700', 42, cv.width - 300, F);
    x.fillText(c.courseTitle, cv.width / 2, 710);
    x.font = '400 28px ' + F;
    x.fillText('Carga horária: ' + c.workloadHours + 'h · Emitido em ' + String(c.issuedAt).split('-').reverse().join('/'), cv.width / 2, 790);
    if (c.teachers) x.fillText('Professor(es): ' + c.teachers, cv.width / 2, 840);
    var logos = c.partnerLogos || [];
    for (var i = 0; i < Math.min(logos.length, 6); i++) {
      try {
        var l = await carregarImg(logos[i]), h = 80, w = Math.min(190, l.width * (h / l.height));
        x.drawImage(l, cv.width / 2 + (i - (Math.min(logos.length, 6) - 1) / 2) * 210 - w / 2, 900, w, h);
      } catch (e) {}
    }
    x.font = '400 24px ' + F;
    x.fillText('Código de validação: ' + c.validationCode + ' · ' + location.host + '/certificados', cv.width / 2, 1120);
    baixar(cv, 'certificado-' + c.validationCode + '.png');
  }
  window.ncBotaoCertificado = function (caixa, c) {
    var b = el('button', 'mt-3 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-lg text-label-lg inline-flex items-center gap-1.5', 'Baixar certificado');
    b.type = 'button';
    b.onclick = async function () {
      b.disabled = true;
      try { await gerarCertificado(c); } catch (e) { b.textContent = 'Não foi possível gerar. Tente de novo.'; }
      b.disabled = false;
    };
    caixa.appendChild(b);
  };

  // ---------- atividade (somente depois do aceite do aviso) ----------
  function consentiu() {
    try { return JSON.parse(ler('nc_lgpd_consent') || '{}').accepted === true; } catch (e) { return false; }
  }
  function visitante() {
    var v = ler('nc_visitor');
    if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2, 14)).slice(0, 36); gravar('nc_visitor', v); }
    return v;
  }
  window.ncLembrarEmail = function (email) { if (consentiu()) gravar('nc_visitor_email', String(email || '').trim().toLowerCase()); };

  var fila = [], ativoDesde = Date.now(), acumulado = 0;
  function enviar() {
    if (!consentiu()) { fila = []; return; }
    if (document.visibilityState === 'visible') { acumulado += Date.now() - ativoDesde; ativoDesde = Date.now(); }
    var seg = Math.round(acumulado / 1000);
    if (seg >= 1) { fila.push({ type: 'pagina', path: location.pathname, seconds: seg }); acumulado = 0; }
    if (!fila.length) return;
    var corpo = JSON.stringify({ visitorId: visitante(), email: ler('nc_visitor_email') || '', events: fila.splice(0, 30) });
    if (corpo.length < 60000) fetch('/api/public/atividade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corpo, keepalive: true }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { acumulado += Date.now() - ativoDesde; enviar(); } else ativoDesde = Date.now();
  });
  window.addEventListener('pagehide', enviar);
  setInterval(enviar, 60000);
  document.addEventListener('click', function (e) {
    if (!consentiu() || !e.target.closest) return;
    var alvo = e.target.closest('a,button');
    if (!alvo) return;
    var r = (alvo.getAttribute('aria-label') || alvo.textContent || '').replace(/\s+/g, ' ').replace(/\b(arrow_forward|chevron_right|open_in_new|shopping_bag|play_circle)\b/g, '').trim().slice(0, 100);
    if (r) fila.push({ type: 'clique', path: location.pathname, label: r });
  }, true);

  // ---------- início ----------
  camposCardume();
  lancamentos();
  fetch('/api/public/site').then(function (r) { return r.json(); }).then(function (d) {
    parceiros(d.partners);
    if (location.pathname === '/') destaques(d.highlights);
    loja(d.storeItems);
  }).catch(function () {});
})();
