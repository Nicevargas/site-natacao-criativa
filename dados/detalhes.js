// Detalhes da formação: fotos, professores, programa, lotes, parceiros, banner,
// captura do lead e, depois dela, o link de pagamento e o Pix.
(function () {
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function icone(n, c) { return el('span', 'material-symbols-outlined ' + (c || ''), n); }
  function linha(nomeIcone, texto) {
    var l = el('div', 'flex items-start gap-2');
    l.appendChild(icone(nomeIcone, 'text-[18px] mt-px text-primary'));
    l.appendChild(el('span', '', texto));
    return l;
  }
  function titulo(t) { return el('h3', 'font-headline-sm text-headline-sm text-on-secondary-fixed mt-5 mb-2', t); }
  function campo(nome, rotulo, tipo, obrigatorio, auto) {
    var l = el('label', 'block');
    l.appendChild(el('span', 'text-label-md font-label-md uppercase text-on-surface-variant block mb-1', rotulo));
    var i = el('input', 'w-full px-4 py-3 bg-surface-container-low rounded-lg text-on-surface outline-none focus:ring-2 focus:ring-primary-container');
    i.name = nome; i.type = tipo; i.required = !!obrigatorio; if (auto) i.autocomplete = auto;
    l.appendChild(i);
    return l;
  }

  function pagamento(alvo, p) {
    alvo.textContent = '';
    alvo.appendChild(el('p', 'font-semibold text-on-secondary-fixed', 'Cadastro recebido!' + (p.preco ? ' Valor: ' + p.preco + (p.lote ? ' (' + p.lote + ')' : '') : '')));
    if (/^https?:\/\//i.test(p.paymentUrl || '')) {
      var a = el('a', 'mt-3 w-full px-5 py-3 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg flex items-center justify-center gap-2', 'Ir para o pagamento');
      a.href = p.paymentUrl; a.target = '_blank'; a.rel = 'noopener';
      alvo.appendChild(a);
    }
    if (p.pixKey) {
      var bx = el('div', 'mt-3 p-4 rounded-lg bg-surface-container-low');
      bx.appendChild(el('div', 'text-label-md font-label-md uppercase text-on-surface-variant', 'Pagar com Pix'));
      bx.appendChild(el('div', 'font-semibold break-all mt-1', p.pixKey));
      if (p.pixName) bx.appendChild(el('div', 'text-body-sm text-on-surface-variant', 'Recebedor: ' + p.pixName));
      var cp = el('button', 'mt-2 px-4 py-2 bg-surface-container-high rounded-lg font-label-lg text-label-lg', 'Copiar chave');
      cp.type = 'button';
      cp.onclick = function () { navigator.clipboard.writeText(p.pixKey).then(function () { cp.textContent = 'Chave copiada'; }); };
      bx.appendChild(cp);
      alvo.appendChild(bx);
    }
    if (!p.paymentUrl && !p.pixKey) {
      var at = el('a', 'mt-3 inline-block text-primary font-semibold underline', 'Nossa equipe vai falar com você. Se preferir, chame o atendimento.');
      at.href = '/atendimento';
      alvo.appendChild(at);
    }
  }

  function blocoLead(c) {
    var alvo = el('div', 'mt-6 p-5 rounded-xl border border-surface-container-high');
    alvo.appendChild(el('h3', 'font-headline-sm text-headline-sm text-on-secondary-fixed mb-1', 'Quero me inscrever'));
    alvo.appendChild(el('p', 'text-body-sm text-on-surface-variant mb-3', 'Deixe seus dados para ver as formas de pagamento.'));
    var f = el('form', 'relative grid grid-cols-1 sm:grid-cols-2 gap-3');
    var n = campo('nome', 'Nome completo', 'text', true, 'name');
    n.classList.add('sm:col-span-2');
    f.appendChild(n);
    f.appendChild(campo('email', 'E-mail', 'email', true, 'email'));
    f.appendChild(campo('phone', 'Telefone com DDD', 'tel', true, 'tel'));
    f.appendChild(campo('birthDate', 'Data de nascimento', 'date', false, 'bday'));
    var isca = el('input');
    isca.name = 'website'; isca.tabIndex = -1; isca.autocomplete = 'off'; isca.style.cssText = 'position:absolute;left:-9999px'; isca.setAttribute('aria-hidden', 'true');
    f.appendChild(isca);
    var ac = el('label', 'sm:col-span-2 flex items-start gap-2 text-body-sm text-on-surface-variant');
    var cb = el('input', 'mt-1');
    cb.type = 'checkbox'; cb.name = 'consent'; cb.required = true;
    ac.appendChild(cb);
    var tx = el('span');
    tx.appendChild(document.createTextNode('Aceito o contato da Natação Criativa e a '));
    var pl = el('a', 'underline text-primary', 'Política de Privacidade');
    pl.href = '/privacidade'; pl.target = '_blank';
    tx.appendChild(pl);
    ac.appendChild(tx);
    f.appendChild(ac);
    var msg = el('p', 'sm:col-span-2 text-body-sm text-error');
    msg.setAttribute('role', 'alert');
    f.appendChild(msg);
    var env = el('button', 'sm:col-span-2 px-5 py-3 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg', 'Continuar para o pagamento');
    env.type = 'submit';
    f.appendChild(env);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      env.disabled = true; msg.textContent = '';
      fetch('/api/public/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: c.id, name: f.elements.nome.value, email: f.elements.email.value, phone: f.elements.phone.value, birthDate: f.elements.birthDate.value, website: isca.value, consent: cb.checked }),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.j.error);
          if (window.ncLembrarEmail) window.ncLembrarEmail(f.elements.email.value);
          pagamento(alvo, r.j.pagamento || {});
        })
        .catch(function (err) { msg.textContent = err.message || 'Não foi possível enviar. Tente de novo.'; env.disabled = false; });
    });
    alvo.appendChild(f);
    return alvo;
  }

  function carregar(src, cors) {
    return new Promise(function (ok, no) {
      var i = new Image();
      if (cors) i.crossOrigin = 'anonymous';
      i.onload = function () { ok(i); }; i.onerror = no; i.src = src;
    });
  }
  function blocoBanner(c) {
    var d = el('details', 'mt-5 p-4 rounded-xl bg-surface-container-low');
    d.appendChild(el('summary', 'cursor-pointer font-semibold text-primary', 'Criar meu banner do evento'));
    var f = el('div', 'mt-3 space-y-3');
    var nome = campo('nomeBanner', 'Seu nome no banner', 'text', false, 'name');
    f.appendChild(nome);
    var lf = el('label', 'block text-body-sm');
    lf.appendChild(el('span', 'block mb-1 font-semibold', 'Sua foto (opcional)'));
    var foto = el('input'); foto.type = 'file'; foto.accept = 'image/*';
    lf.appendChild(foto); f.appendChild(lf);
    var la = el('label', 'block text-body-sm');
    la.appendChild(el('span', 'block mb-1 font-semibold', 'Usar outra arte de fundo (opcional)'));
    var arte = el('input'); arte.type = 'file'; arte.accept = 'image/*';
    la.appendChild(arte); f.appendChild(la);
    var b = el('button', 'px-4 py-2 bg-primary text-on-primary rounded-lg font-label-lg text-label-lg', 'Gerar e baixar');
    b.type = 'button';
    var aviso = el('p', 'text-body-sm text-error');
    b.onclick = function () {
      var deArquivo = function (inp) { return inp.files[0] ? carregar(URL.createObjectURL(inp.files[0])) : Promise.resolve(null); };
      var modelo = arte.files[0] ? deArquivo(arte) : (c.bannerTemplateUrl ? carregar(c.bannerTemplateUrl, /^https?:/i.test(c.bannerTemplateUrl)) : Promise.resolve(null));
      aviso.textContent = '';
      Promise.all([modelo, deArquivo(foto)]).then(function (r) {
        var cv = document.createElement('canvas'), fundo = r[0], pessoa = r[1];
        cv.width = 1080;
        cv.height = fundo ? Math.round(1080 * fundo.height / fundo.width) : 1350;
        var x = cv.getContext('2d');
        if (fundo) x.drawImage(fundo, 0, 0, cv.width, cv.height);
        else {
          var g = x.createLinearGradient(0, 0, 1080, 1350);
          g.addColorStop(0, '#047AE4'); g.addColorStop(0.5, '#7B2CBF'); g.addColorStop(1, '#D41076');
          x.fillStyle = g; x.fillRect(0, 0, cv.width, cv.height);
        }
        var cy = cv.height * 0.42, raio = cv.width * 0.2;
        if (pessoa) {
          var l = Math.min(pessoa.width, pessoa.height);
          x.save(); x.beginPath(); x.arc(540, cy, raio, 0, Math.PI * 2); x.clip();
          x.drawImage(pessoa, (pessoa.width - l) / 2, (pessoa.height - l) / 2, l, l, 540 - raio, cy - raio, raio * 2, raio * 2);
          x.restore();
          x.lineWidth = 10; x.strokeStyle = '#fff'; x.beginPath(); x.arc(540, cy, raio, 0, Math.PI * 2); x.stroke();
        }
        var quem = nome.querySelector('input').value.trim();
        x.textAlign = 'center'; x.fillStyle = '#fff'; x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 14;
        if (quem) {
          var t = 64;
          do { x.font = '800 ' + t + 'px "Plus Jakarta Sans",Arial,sans-serif'; t -= 2; } while (x.measureText(quem).width > 940 && t > 24);
          x.fillText(quem, 540, cv.height * 0.72);
        }
        x.font = '600 34px "Plus Jakarta Sans",Arial,sans-serif';
        x.fillText('Eu vou!', 540, cv.height * 0.77);
        if (!fundo) { x.font = '700 38px "Plus Jakarta Sans",Arial,sans-serif'; x.fillText(String(c.title).slice(0, 48), 540, cv.height * 0.14); }
        var a = document.createElement('a');
        a.download = 'banner-natacao-criativa.png'; a.href = cv.toDataURL('image/png');
        document.body.appendChild(a); a.click(); a.remove();
      }).catch(function () { aviso.textContent = 'Não foi possível gerar com essa imagem. Tente outra.'; });
    };
    f.appendChild(b); f.appendChild(aviso); d.appendChild(f);
    return d;
  }

  window.ncAbrirDetalhes = function (c, parceiros) {
    var fundo = el('div', 'fixed inset-0 z-[9995] bg-[#0B3258]/60 backdrop-blur-sm flex items-center justify-center p-3');
    var caixa = el('div', 'bg-surface-container-lowest rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto');
    caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true'); caixa.setAttribute('aria-label', c.title);
    var tecla = function (e) { if (e.key === 'Escape') fechar(); };
    function fechar() { fundo.remove(); document.removeEventListener('keydown', tecla); }
    document.addEventListener('keydown', tecla);
    fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(); });

    var topo = el('div', 'relative h-56 bg-gradient-to-br from-[#047AE4] to-[#001c38]');
    if (c.coverUrl) { var im = el('img', 'w-full h-full object-cover'); im.src = c.coverUrl; im.alt = ''; topo.appendChild(im); }
    var bf = el('button', 'absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 text-on-secondary-fixed flex items-center justify-center');
    bf.type = 'button'; bf.setAttribute('aria-label', 'Fechar'); bf.appendChild(icone('close')); bf.onclick = fechar;
    topo.appendChild(bf);
    caixa.appendChild(topo);

    var m = el('div', 'p-5 md:p-7');
    m.appendChild(el('div', 'text-label-caps font-label-caps uppercase text-primary', c.category || 'Formação'));
    m.appendChild(el('h2', 'font-headline-lg text-headline-md md:text-headline-lg text-on-secondary-fixed mt-1', c.title));
    if (c.description) m.appendChild(el('p', 'text-on-surface-variant mt-2 whitespace-pre-line', c.description));
    var inf = el('div', 'mt-4 space-y-2 text-body-sm text-on-surface-variant');
    if (c.startDateLabel) inf.appendChild(linha('event', c.startDateLabel));
    if ((c.scheduleLines || []).length > 1) c.scheduleLines.forEach(function (d) { inf.appendChild(el('div', 'pl-[26px]', d)); });
    if (c.workload) inf.appendChild(linha('schedule', c.workload));
    var onde = [c.format, c.locationOrUrl].filter(Boolean).join(' · ');
    if (onde) inf.appendChild(linha('location_on', onde));
    m.appendChild(inf);

    if ((c.photos || []).length) {
      m.appendChild(titulo('Fotos'));
      var gal = el('div', 'grid grid-cols-2 sm:grid-cols-3 gap-2');
      c.photos.forEach(function (u) { var i = el('img', 'w-full h-32 object-cover rounded-lg'); i.src = u; i.alt = 'Foto da formação'; i.loading = 'lazy'; gal.appendChild(i); });
      m.appendChild(gal);
    }
    var docs = Array.isArray(c.instructors) ? c.instructors : [];
    if (docs.length) {
      m.appendChild(titulo(docs.length > 1 ? 'Professores' : 'Professor'));
      docs.forEach(function (d) {
        var b = el('div', 'mb-3');
        b.appendChild(el('div', 'font-semibold text-on-secondary-fixed', d.name + (d.role ? ' · ' + d.role : '')));
        if (d.bio) b.appendChild(el('p', 'text-body-sm text-on-surface-variant whitespace-pre-line', d.bio));
        m.appendChild(b);
      });
    }
    if (c.syllabus) {
      m.appendChild(titulo('Conteúdo programático'));
      m.appendChild(el('p', 'text-body-sm text-on-surface-variant whitespace-pre-line', c.syllabus));
    }
    if ((c.lots || []).length) {
      m.appendChild(titulo('Lotes'));
      c.lots.forEach(function (l) {
        var r = el('div', 'flex justify-between gap-3 py-2 border-b border-surface-container text-body-sm' + (l.status === 'vigente' ? ' font-semibold text-primary' : ' text-on-surface-variant'));
        r.appendChild(el('span', '', l.name + (l.status === 'vigente' ? ' (atual)' : l.status === 'esgotado' ? ' (esgotado)' : '')));
        r.appendChild(el('span', '', l.price));
        m.appendChild(r);
      });
    }
    var apoio = (parceiros || []).filter(function (p) { return (c.partnerIds || []).indexOf(p.id) > -1 && p.logoUrl; });
    if (apoio.length) {
      m.appendChild(titulo('Apoio'));
      var la = el('div', 'flex flex-wrap items-center gap-4');
      apoio.forEach(function (p) { var i = el('img', 'h-12 max-w-[120px] object-contain'); i.src = p.logoUrl; i.alt = p.name; la.appendChild(i); });
      m.appendChild(la);
    }
    m.appendChild(blocoBanner(c));
    if (c.status !== 'encerrado') m.appendChild(blocoLead(c));
    caixa.appendChild(m);
    fundo.appendChild(caixa);
    document.body.appendChild(fundo);
    bf.focus();
  };
})();
