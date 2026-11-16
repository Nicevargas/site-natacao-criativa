// Liga as páginas ao banco (Supabase) pelas rotas /api do servidor.
// Se o banco não estiver configurado ou falhar, a página continua como estava.
(function () {
  if (window.__ncDados) return;
  window.__ncDados = true;

  var banco = false;
  var pronto = fetch('/api/status').then(function (r) { return r.json(); }).then(function (s) { banco = !!s.banco; }).catch(function () {});

  function enviar(rota, dados) {
    return fetch(rota, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, corpo: j }; }); });
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function icone(nome, cls) { return el('span', 'material-symbols-outlined ' + (cls || ''), nome); }
  function aviso(form, txt, ok) {
    var a = form.parentNode.querySelector('.nc-aviso');
    if (!a) { a = el('div', 'nc-aviso'); a.setAttribute('role', 'status'); form.parentNode.insertBefore(a, form.nextSibling); }
    a.textContent = txt;
    a.style.cssText = 'margin-top:10px;padding:10px 14px;border-radius:10px;font:600 14px/1.4 Inter,sans-serif;' +
      (ok ? 'background:#e8f3d0;color:#3d5206' : 'background:#ffdad6;color:#93000a');
  }
  function ocupado(form, sim) {
    var b = form.querySelector('button[type=submit],button:not([type])');
    if (b) { b.disabled = sim; b.style.opacity = sim ? '.6' : ''; }
  }

  // ---------- formulários ----------
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!banco || !form || form.tagName !== 'FORM') return;

    // Atendimento
    if (form.id === 'form-contato') {
      e.preventDefault(); e.stopPropagation();
      var assunto = form.assunto.value;
      var tipo = /consultoria/i.test(assunto) ? 'consultoria_academia' : /personalizadas/i.test(assunto) ? 'aula_particular' : 'suporte';
      ocupado(form, true);
      enviar('/api/contato', { nome: form.nome.value, email: form.email.value, perfil: form.perfil.value, assunto: assunto, mensagem: form.mensagem.value, tipo: tipo })
        .then(function (r) {
          if (r.corpo.ok) { form.reset(); aviso(form, 'Mensagem enviada! Respondemos de segunda a sexta, das 9h às 18h.', true); }
          else if (r.corpo.motivo === 'email_invalido') aviso(form, 'Confira o e-mail digitado e tente de novo.', false);
          else throw new Error(r.corpo.motivo);
        })
        .catch(function () { aviso(form, 'Não foi possível enviar agora. Escreva para contato@natacaocriativa.com.br.', false); })
        .then(function () { ocupado(form, false); });
      return;
    }

    // Validação de certificado
    if (form.id === 'form-validar') {
      e.preventDefault(); e.stopPropagation();
      var caixa = document.getElementById('resultado');
      var codigo = document.getElementById('codigo').value.trim().toUpperCase();
      caixa.style.display = ''; caixa.textContent = 'Consultando...';
      fetch('/api/certificados/' + encodeURIComponent(codigo)).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.ok) throw new Error(j.motivo);
        var c = j.certificado;
        caixa.textContent = '';
        if (!c) { caixa.textContent = 'Não encontramos nenhum certificado com o código ' + codigo + '. Confira se digitou igual ao que está no rodapé do certificado.'; return; }
        var data = new Date(c.issued_at).toLocaleDateString('pt-BR');
        caixa.appendChild(el('strong', '', c.is_valid ? 'Certificado válido' : 'Certificado cancelado'));
        caixa.appendChild(el('div', '', c.recipient_name + ' · ' + c.course_title));
        caixa.appendChild(el('div', '', c.workload_hours + ' horas · emitido em ' + data + ' · código ' + c.validation_code));
      }).catch(function () { caixa.textContent = 'Não foi possível consultar agora. Fale com o atendimento e informe o código ' + codigo + '.'; });
      return;
    }

    // Cardume Criativo (qualquer formulário com campo de e-mail)
    var campoEmail = form.querySelector('input[type=email]');
    if (campoEmail) {
      e.preventDefault(); e.stopPropagation();
      var sel = form.querySelector('select');
      ocupado(form, true);
      enviar('/api/cardume', { email: campoEmail.value, perfil: sel ? sel.options[sel.selectedIndex].text : '', pagina: location.pathname })
        .then(function (r) {
          if (r.corpo.ok) { form.reset(); aviso(form, 'Pronto! Você entrou para o Cardume Criativo.', true); }
          else if (r.corpo.motivo === 'email_invalido') aviso(form, 'Confira o e-mail digitado e tente de novo.', false);
          else throw new Error(r.corpo.motivo);
        })
        .catch(function () { aviso(form, 'Não foi possível concluir agora. Tente de novo em instantes.', false); })
        .then(function () { ocupado(form, false); });
    }
  }, true);

  // ---------- catálogo de Formações vindo do banco ----------
  var STATUS = {
    aberto: ['ABERTO', 'text-on-primary bg-[#89B113]'], em_breve: ['EM BREVE', 'text-on-secondary-fixed bg-[#FAC61C] font-bold'],
    gravacao: ['GRAVAÇÃO', 'text-on-primary bg-primary-container'], encerrado: ['ENCERRADO', 'text-on-surface bg-surface-variant font-bold']
  };
  var CATEGORIA = {
    pos_graduacao: ['PÓS-GRADUAÇÃO', 'workspace_premium'], especializacao: ['CURSO DE ESPECIALIZAÇÃO', 'school'], curso_pratico: ['CURSO PRÁTICO', 'pool'],
    workshop: ['WORKSHOP', 'health_and_safety'], palestra: ['PALESTRA', 'podium'], imersao: ['IMERSÃO', 'pool'],
    grupo_estudos: ['GRUPO DE ESTUDOS', 'groups'], treino: ['TREINO', 'surfing'], guia_aberto: ['GUIA ABERTO', 'menu_book']
  };
  var FORMATO = { online_gravado: 'Online gravado', online_ao_vivo: 'Online ao vivo', online_hibrido: 'Online gravado + ao vivo', presencial: 'Presencial', hibrido: 'Híbrido' };
  var reais = function (centavos) { return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(',00', ''); };
  var pilula = 'px-2.5 py-1 rounded-full text-label-caps font-label-caps uppercase ';

  function cardCurso(c) {
    var st = STATUS[c.status] || STATUS.aberto, cat = CATEGORIA[c.category] || ['FORMAÇÃO', 'school'];
    var art = el('article', 'flex flex-col bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(11,50,88,0.05)] hover:shadow-[0_12px_28px_-6px_rgba(11,50,88,0.12)] transition-all duration-300 group' + (c.status === 'encerrado' ? ' opacity-90' : ''));
    var capa = el('div', 'relative h-48 w-full overflow-hidden bg-gradient-to-br from-[#047AE4] to-[#001c38]');
    if (c.cover_image_url) {
      var img = el('img', 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'); img.src = c.cover_image_url; img.alt = c.cover_image_alt || ''; img.loading = 'lazy';
      capa.appendChild(img);
      capa.appendChild(el('div', 'absolute inset-0 bg-gradient-to-t from-on-secondary-fixed/90 via-on-secondary-fixed/30 to-transparent'));
    } else {
      capa.appendChild(icone(cat[1], 'absolute right-5 top-1/2 -translate-y-1/2 text-on-primary/25 text-[88px]'));
    }
    var selos = el('div', 'absolute top-3 left-3 right-3 flex items-center justify-between gap-2');
    var esq = el('div', 'flex items-center gap-1.5');
    if (c.is_free) esq.appendChild(el('span', pilula + 'tracking-wider shadow-sm text-on-primary bg-[#89B113]', 'GRATUITO'));
    esq.appendChild(el('span', pilula + 'tracking-wider shadow-sm ' + st[1], st[0]));
    selos.appendChild(esq);
    var direita = (c.has_certificate && c.certificate_badge) || c.workload_label;
    if (direita) selos.appendChild(el('span', pilula + 'bg-surface-container-lowest/90 backdrop-blur-md text-on-secondary-fixed', direita));
    capa.appendChild(selos);
    var rot = el('div', 'absolute bottom-3 left-3 text-secondary-fixed text-label-caps font-label-caps uppercase tracking-wider flex items-center gap-1');
    rot.appendChild(icone(cat[1], 'text-[14px]')); rot.appendChild(document.createTextNode(cat[0]));
    capa.appendChild(rot); art.appendChild(capa);

    var corpo = el('div', 'p-space-lg flex-1 flex flex-col justify-between'), cima = el('div', 'space-y-3');
    cima.appendChild(el('h2', 'text-on-secondary-fixed font-headline-md text-headline-md group-hover:text-primary transition-colors', c.title));
    cima.appendChild(el('p', 'text-on-surface-variant font-body-sm text-body-sm line-clamp-2', c.description));
    var metas = el('div', 'space-y-2 pt-2 text-on-surface-variant font-body-sm text-body-sm');
    [['play_circle', c.modality_details || FORMATO[c.format]], ['event_available', c.start_date_label], ['location_on', c.city_state], ['badge', c.instructor_display_name]].forEach(function (m) {
      if (!m[1] || metas.children.length >= 3) return;
      var l = el('div', 'flex items-center gap-2'); l.appendChild(icone(m[0], 'text-[18px] text-primary')); l.appendChild(el('span', '', m[1])); metas.appendChild(l);
    });
    cima.appendChild(metas); corpo.appendChild(cima);

    var pe = el('div', 'mt-6 pt-4 bg-surface-container-low -mx-space-lg -mb-space-lg p-space-lg flex items-center justify-between gap-3'), preco = el('div');
    if (c.is_free) {
      preco.appendChild(el('span', 'text-label-caps font-label-caps text-[#89B113] uppercase block font-bold', '100% Gratuito'));
      preco.appendChild(el('span', 'text-on-secondary-fixed font-headline-sm text-headline-sm', 'R$ 0,00'));
    } else {
      preco.appendChild(el('span', 'text-label-caps font-label-caps text-on-surface-variant uppercase block', 'Investimento'));
      preco.appendChild(el('span', 'text-on-secondary-fixed font-headline-sm text-headline-sm', c.price_label || reais(c.display_price_cents)));
      if (c.installments_count > 1 && c.installment_value_cents) preco.appendChild(el('span', 'text-label-caps font-label-caps text-on-surface-variant block', 'ou ' + c.installments_count + 'x ' + reais(c.installment_value_cents)));
    }
    pe.appendChild(preco);
    var a = el('a', 'px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg transition-all flex items-center gap-1.5 shadow-sm');
    a.href = '/atendimento'; a.appendChild(el('span', '', 'Saiba mais')); a.appendChild(icone('arrow_forward', 'text-[16px]'));
    pe.appendChild(a); corpo.appendChild(pe); art.appendChild(corpo);
    return art;
  }

  function catalogo() {
    if (location.pathname !== '/formacoes' && location.pathname !== '/catalogo') return;
    var grade = document.querySelector('main section .grid.lg\\:grid-cols-3');
    if (!grade) return;
    fetch('/api/cursos').then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok || !j.itens.length) return; // sem dados: fica o catálogo fixo
      var novo = document.createDocumentFragment();
      j.itens.forEach(function (c) { novo.appendChild(cardCurso(c)); });
      grade.textContent = ''; grade.appendChild(novo);
      document.querySelectorAll('main strong').forEach(function (s) {
        if (/formações encontradas/.test(s.textContent)) s.textContent = j.itens.length + (j.itens.length === 1 ? ' formação encontrada' : ' formações encontradas');
      });
    }).catch(function () {});
  }

  pronto.then(function () { if (banco) catalogo(); });
})();
