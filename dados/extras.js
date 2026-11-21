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
  function galeriaLoja(titulo, fotos, inicio) {
    var i = inicio || 0;
    var fundo = el('div', 'fixed inset-0 z-[9996] bg-[#001c38]/90 flex flex-col items-center justify-center p-3');
    fundo.setAttribute('role', 'dialog'); fundo.setAttribute('aria-modal', 'true'); fundo.setAttribute('aria-label', 'Fotos de ' + titulo);
    function botao(icone, rotulo, cls, f) {
      var b = el('button', 'w-11 h-11 rounded-full bg-white text-on-secondary-fixed flex items-center justify-center shadow ' + cls);
      b.type = 'button'; b.setAttribute('aria-label', rotulo); b.appendChild(el('span', 'material-symbols-outlined', icone));
      b.onclick = function (e) { e.stopPropagation(); f(); };
      return b;
    }
    var grande = el('img', 'max-w-full max-h-[70vh] object-contain rounded-lg bg-white');
    var quadro = el('div', 'relative w-full max-w-3xl flex items-center justify-center');
    var cont = el('div', 'text-white text-body-sm mt-2');
    var miniaturas = el('div', 'flex gap-2 mt-2 max-w-full overflow-x-auto p-1');
    function mostrar(n) {
      i = (n + fotos.length) % fotos.length;
      grande.src = fotos[i]; grande.alt = titulo + ', foto ' + (i + 1);
      cont.textContent = (i + 1) + ' de ' + fotos.length;
      [].forEach.call(miniaturas.children, function (m, k) { m.style.outline = k === i ? '2px solid #FAC61C' : 'none'; });
    }
    function fechar() { fundo.remove(); document.removeEventListener('keydown', tecla); }
    function tecla(e) { if (e.key === 'Escape') fechar(); if (e.key === 'ArrowLeft') mostrar(i - 1); if (e.key === 'ArrowRight') mostrar(i + 1); }
    quadro.appendChild(grande);
    quadro.appendChild(botao('chevron_left', 'Foto anterior', 'absolute left-1', function () { mostrar(i - 1); }));
    quadro.appendChild(botao('chevron_right', 'Próxima foto', 'absolute right-1', function () { mostrar(i + 1); }));
    fotos.forEach(function (u, k) {
      var m = el('button', 'w-14 h-14 flex-shrink-0 rounded bg-white overflow-hidden'); m.type = 'button'; m.setAttribute('aria-label', 'Ver foto ' + (k + 1));
      var t = el('img', 'w-full h-full object-contain'); t.src = u; t.alt = ''; t.loading = 'lazy'; m.appendChild(t);
      m.onclick = function (e) { e.stopPropagation(); mostrar(k); };
      miniaturas.appendChild(m);
    });
    var x = botao('close', 'Fechar', 'absolute top-3 right-3', fechar);
    fundo.appendChild(x); fundo.appendChild(quadro); fundo.appendChild(cont); fundo.appendChild(miniaturas);
    fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(); });
    document.addEventListener('keydown', tecla);
    document.body.appendChild(fundo);
    mostrar(i); x.focus();
  }
  function cartaoLoja(s) {
    var a = el('article', 'flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(11,50,88,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(11,50,88,0.12)] transition-all duration-300 group');
    a.dataset.cat = chave(s.category);
    a.dataset.id = s.id;
    var capa = el('div', 'relative h-56 w-full overflow-hidden bg-white');
    if (s.imageUrl) {
      var img = el('img', 'w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500');
      img.src = s.imageUrl; img.alt = s.title; img.loading = 'lazy'; capa.appendChild(img);
    } else capa.appendChild(el('span', 'material-symbols-outlined absolute inset-0 m-auto h-fit w-fit text-outline-variant text-[72px]', 'toys'));
    capa.appendChild(el('span', 'absolute top-3 left-3 px-2.5 py-1 rounded-full text-label-caps font-label-caps uppercase tracking-wider shadow-sm text-on-primary bg-primary-container', s.category));
    if (s.badge && s.badge !== 'Digital') capa.appendChild(el('span', 'absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-label-caps font-label-caps uppercase shadow-sm ' + (s.badge === 'Pronta entrega' ? 'text-on-primary bg-[#587309]' : 'text-on-secondary-fixed bg-[#FAC61C]'), s.badge));
    var todasFotos = [s.imageUrl].concat(s.fotos || []).filter(Boolean);
    if (todasFotos.length > 1) {
      var verFotos = el('button', 'absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-on-secondary-fixed/85 text-on-primary text-label-md font-label-md inline-flex items-center gap-1 shadow-sm');
      verFotos.type = 'button'; verFotos.setAttribute('aria-label', 'Ver ' + todasFotos.length + ' fotos de ' + s.title);
      verFotos.appendChild(el('span', 'material-symbols-outlined text-[16px]', 'photo_library'));
      verFotos.appendChild(document.createTextNode(todasFotos.length + ' fotos'));
      capa.appendChild(verFotos);
      capa.classList.add('cursor-zoom-in');
      capa.addEventListener('click', function () { galeriaLoja(s.title, todasFotos, 0); });
    }
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
    var b = el('a', 'px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg inline-flex items-center gap-1.5 shadow-sm', 'Comprar');
    b.href = '/atendimento';
    b.setAttribute('data-comprar', '');
    pe.appendChild(b);
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
    window.__ncItensLoja = itens;
    document.dispatchEvent(new CustomEvent('nc:loja', { detail: itens }));
    var sc = document.createElement('script'); sc.src = '/dados/loja.js'; document.body.appendChild(sc);
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
  function secaoMidia(rotulo, titulo, itens, link, textoLink) {
    var s = el('section', 'w-full mb-space-xl');
    var topo = el('div', 'flex flex-wrap items-end justify-between gap-3 mb-space-lg'), t = el('div');
    t.appendChild(el('span', 'font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider', rotulo));
    t.appendChild(el('h2', 'font-headline-lg text-headline-md md:text-headline-lg text-on-secondary-fixed font-bold mt-1', titulo));
    topo.appendChild(t);
    var mais = el('a', 'text-primary font-label-lg text-label-lg font-bold', textoLink + ' →'); mais.href = link; mais.target = '_blank'; mais.rel = 'noopener';
    topo.appendChild(mais); s.appendChild(topo);
    var g = el('div', 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md');
    itens.forEach(function (x) {
      if (!linkSeguro(x.url)) return;
      var a = el('a', 'group flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow');
      a.href = x.url; a.target = '_blank'; a.rel = 'noopener';
      var capa = el('div', 'aspect-video bg-surface-container-low overflow-hidden');
      if (x.image) { var i = el('img', 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'); i.src = x.image; i.alt = ''; i.loading = 'lazy'; capa.appendChild(i); }
      a.appendChild(capa);
      var c = el('div', 'p-space-md');
      c.appendChild(el('h3', 'font-body-md text-body-md text-on-secondary-fixed font-bold line-clamp-3', x.title));
      if (x.publishedAt) c.appendChild(el('p', 'font-body-sm text-body-sm text-secondary mt-1', tempoAtras(x.publishedAt)));
      a.appendChild(c); g.appendChild(a);
    });
    s.appendChild(g);
    return s;
  }
  function midiasDaHome(base, d) {
    if (!base) return;
    var sec = base.closest('section');
    if (!sec) return;
    if ((d.instagramPosts || []).length) sec.insertAdjacentElement('afterend', secaoMidia('No Instagram', 'Últimas publicações', d.instagramPosts, 'https://instagram.com/natacaocriativa', 'Seguir no Instagram'));
    if ((d.entrevistas || []).length) sec.insertAdjacentElement('afterend', secaoMidia('Podcast', 'Últimas entrevistas', d.entrevistas, 'https://www.youtube.com/channel/UCcPX8E650U9AT8B-8h6WouQ', 'Ver o canal'));
  }
  function lancamentos() {
    var yt = cartaoDe('Assistir no YouTube'), sp = cartaoDe('Ouvir no Spotify'), ig = cartaoDe('Ver no Instagram');
    if (!yt && !sp && !ig) return;
    if (ig) { ig.botao.href = 'https://instagram.com/natacaocriativa'; ig.botao.target = '_blank'; ig.botao.rel = 'noopener'; }
    fetch('/api/public/ultimos').then(function (r) { return r.json(); }).then(function (d) {
      aplicarCartao(yt, d.youtube);
      aplicarCartao(ig, d.instagram);
      midiasDaHome((yt || ig || sp).card, d);
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
    var x = cv.getContext('2d'), F = '"Plus Jakarta Sans",Inter,Arial,sans-serif', temModelo = false, m = c.modelo || {};
    x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    if (c.templateUrl) {
      try { x.drawImage(await carregarImg(c.templateUrl), 0, 0, cv.width, cv.height); temModelo = true; } catch (e) {}
    }
    x.textAlign = 'center'; x.fillStyle = '#001c38';
    if (!temModelo) {
      x.strokeStyle = '#047AE4'; x.lineWidth = 10; x.strokeRect(40, 40, cv.width - 80, cv.height - 80);
      try { var lg = await carregarImg('/marca/logo.png'); x.drawImage(lg, cv.width / 2 - 170, 90, 340, 132); } catch (e) {}
      x.font = '800 60px ' + F; x.fillText(m.titulo || 'CERTIFICADO', cv.width / 2, 320);
      x.font = '400 32px ' + F; x.fillText(m.abertura || 'Certificamos que', cv.width / 2, 450);
    }
    ajustarFonte(x, c.recipientName, '800', 72, cv.width - 300, F);
    x.fillText(c.recipientName, cv.width / 2, 560);
    x.font = '400 32px ' + F;
    x.fillText(m.texto || 'concluiu a formação', cv.width / 2, 640);
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

  // ---------- página de certificados ----------
  function mostrarCertificado(alvo, c) {
    var b = el('div', 'mt-3 p-3.5 rounded-lg bg-surface-container-lowest');
    b.appendChild(el('div', 'font-semibold', c.courseTitle));
    b.appendChild(el('div', 'text-on-surface-variant', c.recipientName + ' · ' + c.workloadHours + 'h · ' + String(c.issuedAt).split('-').reverse().join('/') + ' · ' + c.validationCode));
    if (c.isValid === false) b.appendChild(el('div', 'text-error font-semibold mt-1', 'Certificado revogado'));
    else window.ncBotaoCertificado(b, c);
    alvo.appendChild(b);
  }
  function enviarCert(form, url, corpo, alvo, depois) {
    var botao = form.querySelector('button');
    botao.disabled = true; alvo.style.display = ''; alvo.textContent = 'Procurando...';
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (r) { alvo.textContent = ''; depois(r); })
      .catch(function () { alvo.textContent = 'Não foi possível consultar agora. Tente de novo.'; })
      .finally(function () { botao.disabled = false; });
  }
  function paginaCertificados(settings) {
    if (location.pathname !== '/certificados') return;
    var emitir = document.getElementById('form-emitir'), validar = document.getElementById('form-validar');
    var saida = document.getElementById('resultado-emitir'), res = document.getElementById('resultado');
    if (emitir) emitir.addEventListener('submit', function (e) {
      e.preventDefault();
      enviarCert(emitir, '/api/public/certificates/buscar', { busca: document.getElementById('busca-cert').value }, saida, function (r) {
        if (!r.ok) { saida.textContent = r.j.error || 'Não foi possível consultar.'; return; }
        if (!r.j.certificados.length) {
          saida.appendChild(document.createTextNode('Não encontramos certificado com esse dado. Confira o que digitou ou '));
          var a = el('a', 'text-primary font-semibold underline', 'fale com o atendimento'); a.href = '/atendimento'; saida.appendChild(a);
          saida.appendChild(document.createTextNode('.'));
          return;
        }
        saida.appendChild(el('div', 'font-semibold', r.j.certificados.length === 1 ? 'Encontramos 1 certificado:' : 'Encontramos ' + r.j.certificados.length + ' certificados:'));
        r.j.certificados.forEach(function (c) { mostrarCertificado(saida, c); });
      });
    });
    if (validar) validar.addEventListener('submit', function (e) {
      e.preventDefault();
      enviarCert(validar, '/api/public/certificates/verify', { code: document.getElementById('codigo').value }, res, function (r) {
        if (!r.j.certificate) { res.textContent = r.j.error || 'Certificado não encontrado para este código.'; return; }
        res.appendChild(el('div', 'font-semibold', r.j.valid ? 'Certificado válido' : 'Certificado revogado'));
        mostrarCertificado(res, r.j.certificate);
      });
    });
    if (new URLSearchParams(location.search).get('previa') === '1' && saida) {
      var mod = (settings && settings.certificateModel) || {};
      saida.style.display = '';
      saida.appendChild(el('div', 'font-semibold', 'Prévia do modelo padrão'));
      mostrarCertificado(saida, { recipientName: 'Nome do Aluno', courseTitle: 'Nome da Formação', workloadHours: 20, issuedAt: new Date().toISOString().slice(0, 10), validationCode: 'NC-0000-000000', teachers: 'Nome do Professor', templateUrl: mod.imageUrl || '', modelo: mod, partnerLogos: [] });
    }
  }

  // ---------- caminhos: Profissionais, Gestores, Famílias e Alunos ----------
  var TREINOS_PADRAO = 'https://play.google.com/store/apps/details?id=com.natacaocriativa.treinos';
  function caminhos(settings) {
    var s = settings || {};
    var agenda = linkSeguro(s.aquagendaUrl), treinos = linkSeguro(s.treinosUrl) || TREINOS_PADRAO;
    var destinos = {
      'Profissionais': { href: '/formacoes', texto: 'Quero me atualizar' },
      'Gestores': { href: '/solucoes#diagnostico', texto: 'Fazer o diagnóstico grátis' },
      'Famílias': { href: agenda || '/atendimento', texto: agenda ? 'Agendar uma aula' : 'Falar sobre aulas', fora: !!agenda },
      'Alunos': { href: treinos, texto: 'Ver os treinos', fora: true },
    };
    function aplicar(a, d, trocaTexto) {
      a.href = d.href;
      if (d.fora) { a.target = '_blank'; a.rel = 'noopener'; } else { a.removeAttribute('target'); a.removeAttribute('rel'); }
      if (trocaTexto) trocaTexto(d.texto);
    }
    if (location.pathname === '/' || location.pathname === '/mobile') {
      [].forEach.call(document.querySelectorAll('main a'), function (a) {
        var h = a.querySelector('h3'), d = h && destinos[h.textContent.trim()];
        if (!d || a.textContent.indexOf('Acessar caminho') === -1) return;
        aplicar(a, d, function (t) { var ult = a.lastElementChild; if (ult) ult.textContent = t + ' →'; });
      });
    }
    if (location.pathname === '/solucoes') {
      [['ncCaminhoFamilias', destinos['Famílias']], ['ncCaminhoAlunos', destinos['Alunos']]].forEach(function (p) {
        var a = document.getElementById(p[0]);
        if (a) aplicar(a, p[1], function (t) { a.firstElementChild.textContent = t; });
      });
    }
  }

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

  // ---------- ofertas e depoimentos reais na home ----------
  function escolherOfertas(cursos) {
    var d = new Date();
    var hoje = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var abertos = (cursos || []).filter(function (c) { return c && c.title && c.status !== 'rascunho' && c.status !== 'encerrado'; });
    var proximos = abertos.filter(function (c) { return (c.endDate || c.startDate || '') >= hoje && c.startDate; })
      .sort(function (a, b) { return String(a.startDate).localeCompare(String(b.startDate)); });
    var escolhidos = proximos.concat(abertos.filter(function (c) { return c.featured; }));
    ['NATAÇÃO TREINAMENTO', 'NATAÇÃO INFANTIL', 'NATAÇÃO BEBÊ', 'GESTÃO', 'PERSONAL TRAINER'].forEach(function (tema) {
      var c = abertos.find(function (x) { return x.category === tema && !x.isFree && x.coverUrl; });
      if (c) escolhidos.push(c);
    });
    escolhidos = escolhidos.concat(abertos);
    var vistos = {}, temas = {}, saida = [];
    escolhidos.forEach(function (c) {
      if (saida.length >= 3 || vistos[c.id] || temas[c.category]) return;
      vistos[c.id] = temas[c.category] = true;
      saida.push(c);
    });
    return saida;
  }
  function cartaoOferta(c) {
    var a = el('article', 'bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col');
    var capa = el('div', 'relative h-44 bg-gradient-to-br from-[#047AE4] to-[#001c38]');
    if (c.coverUrl) { var i = el('img', 'w-full h-full object-cover'); i.src = c.coverUrl; i.alt = ''; i.loading = 'lazy'; capa.appendChild(i); }
    var r = c.status === 'em_breve' ? ['EM BREVE', 'bg-[#FAC61C] text-on-secondary-fixed'] : c.isFree ? ['GRATUITO', 'bg-[#89B113] text-on-primary'] : ['ABERTO', 'bg-[#89B113] text-on-primary'];
    capa.appendChild(el('span', 'absolute top-3 right-3 font-label-caps text-label-caps px-3 py-1 rounded-full uppercase tracking-wider font-extrabold shadow-sm ' + r[1], r[0]));
    a.appendChild(capa);
    var corpo = el('div', 'p-space-lg flex-1 flex flex-col justify-between');
    var cima = el('div');
    cima.appendChild(el('span', 'font-label-caps text-label-caps text-outline uppercase font-bold block mb-1', c.category || 'Formação'));
    cima.appendChild(el('h3', 'font-headline-sm text-headline-sm text-on-secondary-fixed font-bold mb-space-xs', c.title));
    if (c.description) cima.appendChild(el('p', 'font-body-sm text-body-sm text-secondary mb-space-md line-clamp-3', c.description));
    var info = el('div', 'space-y-1.5 py-space-sm bg-surface-container-low px-3.5 rounded-xl mb-space-lg');
    [['event', c.startDateLabel], ['schedule', c.workload], ['payments', c.isFree ? 'Gratuito' : (/^\d/.test(String(c.priceFormatted || '')) ? 'R$ ' + c.priceFormatted : c.priceFormatted)]].forEach(function (m) {
      if (!m[1]) return;
      var l = el('div', 'flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm');
      l.appendChild(el('span', 'material-symbols-outlined text-[18px] text-primary', m[0]));
      l.appendChild(el('span', '', m[1]));
      info.appendChild(l);
    });
    cima.appendChild(info);
    corpo.appendChild(cima);
    var b = el('a', 'w-full py-3 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-center font-label-lg text-label-lg font-bold transition-colors shadow-sm', 'Ver detalhes');
    b.href = '/formacoes?curso=' + encodeURIComponent(c.id);
    corpo.appendChild(b);
    a.appendChild(corpo);
    return a;
  }
  function ofertas(cursos) {
    var grade = document.getElementById('ncOfertas'), secao = document.getElementById('ncSecOfertas');
    if (!grade || !secao) return;
    var lista = escolherOfertas(cursos);
    if (!lista.length) return;
    lista.forEach(function (c) { grade.appendChild(cartaoOferta(c)); });
    secao.style.display = '';
  }
  function depoimentos(lista) {
    var grade = document.getElementById('ncDepoimentos'), secao = document.getElementById('ncSecDepoimentos');
    if (!grade || !secao || !(lista || []).length) return; // sem depoimento real, a seção não aparece
    lista.slice(0, 6).forEach(function (t) {
      var c = el('div', 'bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col justify-between');
      var cima = el('div');
      cima.appendChild(el('div', 'text-primary text-4xl font-serif mb-space-xs leading-none', '“'));
      cima.appendChild(el('p', 'font-body-md text-body-md text-on-surface-variant mb-space-md italic', t.quote));
      c.appendChild(cima);
      var pe = el('div', 'bg-surface-container-low p-3 rounded-xl');
      pe.appendChild(el('div', 'font-headline-sm text-headline-sm text-on-secondary-fixed font-bold', t.authorName));
      if (t.authorRoleLocation) pe.appendChild(el('div', 'font-body-sm text-body-sm text-secondary', t.authorRoleLocation));
      c.appendChild(pe);
      grade.appendChild(c);
    });
    secao.style.display = '';
  }

  // ---------- início ----------
  camposCardume();
  lancamentos();
  fetch('/api/public/site').then(function (r) { return r.json(); }).then(function (d) {
    parceiros(d.partners);
    caminhos(d.settings);
    paginaCertificados(d.settings);
    if (location.pathname === '/') destaques(d.highlights);
    loja(d.storeItems);
    ofertas(d.courses);
    depoimentos(d.testimonials);
  }).catch(function () {});
})();
