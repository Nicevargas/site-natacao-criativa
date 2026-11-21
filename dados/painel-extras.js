// Painel admin: fotos, lotes, programa, pagamento, parceiros, leads, atividade,
// importação de alunos e duplicar. Complementa as funções do painel original.
(function () {
  var CAMPO = 'w-full h-10 px-3 rounded-lg bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-primary';
  var BLOCO = 'md:col-span-2 rounded-xl border border-surface-container p-4 space-y-3';
  var ROTULO = 'block text-xs font-display font-bold text-on-surface mb-1';
  var BTN_LINHA = 'px-2.5 py-1 rounded bg-surface-container-low hover:bg-surface-container text-xs font-bold text-primary mr-1';
  var BTN_PRIM = 'px-4 py-2 rounded-lg bg-primary text-white text-xs font-display font-bold inline-flex items-center gap-1.5';
  var BTN_SEC = 'px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-xs font-display font-bold inline-flex items-center gap-1.5';
  var CATEGORIAS_LOJA = ['Brinquedos pedagógicos', 'Jogos pedagógicos', 'Materiais de natação', 'Uniformes', 'Livros', 'E-book', 'Planilha', 'Apostila', 'Kit'];
  var ic = function (n, c) { return '<span class="material-symbols-outlined ' + (c || 'text-[17px]') + '">' + n + '</span>'; };
  var porId = function (lista, id) { return (lista || []).find(function (x) { return x.id === id; }); };

  // ---------- envio de fotos ----------
  async function reduzir(arquivo, lado) {
    if (!/^image\/(png|jpeg|webp)$/.test(arquivo.type)) throw new Error('Use uma imagem PNG, JPG ou WEBP.');
    var bmp = await createImageBitmap(arquivo);
    var escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    var cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * escala);
    cv.height = Math.round(bmp.height * escala);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    var q = 0.85, url = cv.toDataURL('image/webp', q);
    while (url.length > 1.9e6 && q > 0.4) { q -= 0.12; url = cv.toDataURL('image/webp', q); }
    if (url.length > 1.9e6) throw new Error('Imagem grande demais. Tente uma menor.');
    return url;
  }
  async function enviarFoto(arquivo, pasta, lado) {
    var dataUrl = await reduzir(arquivo, lado || 1800);
    return (await api('/api/admin/upload', { method: 'POST', body: JSON.stringify({ dataUrl: dataUrl, pasta: pasta || 'geral' }) })).url;
  }
  function campoFoto(nome, rotulo, valor, pasta, dica) {
    return '<div class="nc-foto" data-pasta="' + esc(pasta || 'geral') + '"><label class="' + ROTULO + '">' + esc(rotulo) + '</label>' +
      '<input type="hidden" name="' + esc(nome) + '" value="' + esc(valor || '') + '"/>' +
      '<div class="flex items-center gap-3"><img alt="" class="nc-foto-previa w-20 h-14 rounded-lg object-contain bg-surface-container-low ' + (valor ? '' : 'hidden') + '" src="' + esc(valor || '') + '"/>' +
      '<label class="' + BTN_SEC + ' cursor-pointer">' + ic('add_photo_alternate') + '<span class="nc-foto-txt">' + (valor ? 'Trocar foto' : 'Escolher foto') + '</span><input type="file" accept="image/png,image/jpeg,image/webp" class="hidden nc-foto-arquivo"/></label>' +
      '<button type="button" class="nc-foto-tirar text-xs font-bold text-error ' + (valor ? '' : 'hidden') + '">Remover</button></div>' +
      (dica ? '<p class="text-[11px] text-outline mt-1">' + esc(dica) + '</p>' : '') + '</div>';
  }
  function marcarFoto(caixa, url) {
    caixa.querySelector('input[type=hidden]').value = url;
    var img = caixa.querySelector('.nc-foto-previa');
    img.src = url; img.classList.toggle('hidden', !url);
    caixa.querySelector('.nc-foto-tirar').classList.toggle('hidden', !url);
    caixa.querySelector('.nc-foto-txt').textContent = url ? 'Trocar foto' : 'Escolher foto';
  }
  document.addEventListener('change', async function (e) {
    if (!e.target.classList || !e.target.classList.contains('nc-foto-arquivo') || !e.target.files[0]) return;
    var caixa = e.target.closest('.nc-foto'), rot = caixa.querySelector('.nc-foto-txt');
    rot.textContent = 'Enviando...';
    try { marcarFoto(caixa, await enviarFoto(e.target.files[0], caixa.dataset.pasta)); }
    catch (err) { rot.textContent = 'Escolher foto'; showToast(err.message, 'error'); }
    e.target.value = '';
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.nc-foto-tirar');
    if (b) marcarFoto(b.closest('.nc-foto'), '');
  });

  function abrirJanela(titulo, html) {
    fecharJanela();
    var o = document.createElement('div');
    o.id = 'ncJanela';
    o.className = 'fixed inset-0 bg-[#0B3258]/55 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    o.innerHTML = '<div role="dialog" aria-label="' + esc(titulo) + '" class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"><div class="px-6 py-4 bg-[#0B3258] text-white flex items-center justify-between"><h3 class="font-display font-bold">' + esc(titulo) + '</h3><button type="button" aria-label="Fechar" onclick="ncFecharJanela()">' + ic('close', 'text-[22px]') + '</button></div><div class="p-6 overflow-y-auto space-y-4">' + html + '</div></div>';
    document.body.appendChild(o);
    return o;
  }
  function fecharJanela() { var o = document.getElementById('ncJanela'); if (o) o.remove(); }
  window.ncFecharJanela = fecharJanela;

  // ---------- formação ----------
  var blocoCurso = document.createElement('div');
  blocoCurso.className = 'md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4';
  blocoCurso.innerHTML =
    '<div class="' + BLOCO + '"><label class="' + ROTULO + '">Fotos da formação</label>' + campoFoto('coverUrl', 'Foto de capa', '', 'cursos') +
    '<div><label class="' + BTN_SEC + ' cursor-pointer">' + ic('photo_library') + 'Adicionar fotos à galeria<input id="ncGaleriaArq" type="file" multiple accept="image/png,image/jpeg,image/webp" class="hidden"/></label></div><div id="ncGaleria" class="flex flex-wrap gap-2"></div></div>' +
    '<div class="' + BLOCO + '"><div class="flex items-center justify-between"><div><label class="block text-xs font-display font-bold">Lotes</label><p class="text-[11px] text-outline">O lote "vigente" define o preço mostrado no site.</p></div><button type="button" id="ncAddLote" class="text-primary text-xs font-display font-bold inline-flex items-center gap-1">' + ic('add', 'text-[16px]') + 'Adicionar lote</button></div><div id="ncLotes" class="space-y-2"></div></div>' +
    '<div class="' + BLOCO + '"><label class="' + ROTULO + '">Conteúdo programático</label><textarea name="syllabus" rows="6" placeholder="Um tópico por linha" class="w-full p-3 rounded-lg bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-primary"></textarea></div>' +
    '<div class="' + BLOCO + '"><label class="' + ROTULO + '">Parceiros que apoiam este evento</label><div id="ncParceirosCurso" class="flex flex-wrap gap-3 text-sm"></div></div>' +
    '<div class="' + BLOCO + '"><label class="block text-xs font-display font-bold">Pagamento</label><p class="text-[11px] text-outline">O aluno só vê isto depois de deixar nome, e-mail e telefone.</p>' +
    '<div><label class="' + ROTULO + '">Link de pagamento externo</label><input name="paymentUrl" type="url" placeholder="https://..." class="' + CAMPO + '"/></div>' +
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label class="' + ROTULO + '">Chave Pix</label><input name="pixKey" class="' + CAMPO + '"/></div><div><label class="' + ROTULO + '">Nome do recebedor do Pix</label><input name="pixName" class="' + CAMPO + '"/></div></div></div>' +
    '<div class="' + BLOCO + '"><label class="block text-xs font-display font-bold">Modelos de arte</label><p class="text-[11px] text-outline">O aluno gera o banner com o nome dele, e o certificado sai nesta arte.</p><div class="grid grid-cols-1 md:grid-cols-2 gap-3">' +
    campoFoto('bannerTemplateUrl', 'Modelo do banner', '', 'modelos', 'Quadrado ou vertical, com espaço no centro.') + campoFoto('certificateTemplateUrl', 'Modelo do certificado', '', 'modelos', 'Horizontal, com espaço no centro para o nome.') + '</div></div>';

  function montarBlocoCurso() {
    var grade = document.querySelector('#courseForm > .grid');
    if (grade && !blocoCurso.parentNode) grade.appendChild(blocoCurso);
  }
  function fotoGaleria(url) {
    var d = document.createElement('div');
    d.className = 'relative nc-galeria-item'; d.dataset.url = url;
    d.innerHTML = '<img alt="" class="w-20 h-16 rounded-lg object-cover" src="' + esc(url) + '"/><button type="button" aria-label="Remover foto" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-error text-white text-xs leading-none">×</button>';
    d.querySelector('button').onclick = function () { d.remove(); };
    document.getElementById('ncGaleria').appendChild(d);
  }
  function addLote(l) {
    l = l || {};
    var d = document.createElement('div');
    d.className = 'nc-lote flex flex-wrap items-center gap-2'; d.dataset.id = l.id || '';
    d.innerHTML = '<input aria-label="Nome do lote" placeholder="1º Lote" value="' + esc(l.name || '') + '" class="nc-l-nome flex-1 min-w-[120px] ' + CAMPO.replace('w-full ', '') + '"/>' +
      '<input aria-label="Preço" placeholder="R$ 297" value="' + esc(l.price || '') + '" class="nc-l-preco w-24 ' + CAMPO.replace('w-full ', '') + '"/>' +
      '<input aria-label="Vagas" type="number" min="0" placeholder="Vagas" value="' + esc(l.max ?? '') + '" class="nc-l-max w-20 ' + CAMPO.replace('w-full ', '') + '"/>' +
      '<select aria-label="Situação" class="nc-l-st h-10 px-2 rounded-lg bg-surface-container-low text-sm">' + ['programado', 'vigente', 'esgotado', 'encerrado'].map(function (s) { return '<option ' + (s === (l.status || 'programado') ? 'selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
      '<button type="button" aria-label="Remover lote" class="p-1 text-error">' + ic('delete', 'text-[18px]') + '</button>';
    d.querySelector('button').onclick = function () { d.remove(); };
    document.getElementById('ncLotes').appendChild(d);
  }

  var abrirCursoOriginal = window.openCourseModal;
  window.openCourseModal = function (modo, id) {
    montarBlocoCurso();
    var c = (modo === 'edit' && porId(state.courses, id)) || {};
    var form = document.getElementById('courseForm');
    // categorias vindas da plataforma entram na lista para não se perderem ao salvar
    if (c.category && ![].some.call(form.elements.category.options, function (o) { return o.value === c.category; })) {
      form.elements.category.add(new Option(c.category, c.category));
    }
    abrirCursoOriginal(modo, id);
    ['syllabus', 'paymentUrl', 'pixKey', 'pixName'].forEach(function (k) { form.elements[k].value = c[k] || ''; });
    ['coverUrl', 'bannerTemplateUrl', 'certificateTemplateUrl'].forEach(function (k) { marcarFoto(form.elements[k].closest('.nc-foto'), c[k] || ''); });
    document.getElementById('ncGaleria').innerHTML = '';
    (c.photos || []).forEach(fotoGaleria);
    document.getElementById('ncLotes').innerHTML = '';
    (c.lots || []).forEach(addLote);
    document.getElementById('ncParceirosCurso').innerHTML = (state.partners || []).map(function (p) {
      return '<label class="inline-flex items-center gap-1.5"><input type="checkbox" class="nc-pc" value="' + esc(p.id) + '" ' + ((c.partnerIds || []).indexOf(p.id) > -1 ? 'checked' : '') + '/>' + esc(p.name) + '</label>';
    }).join('') || '<span class="text-xs text-outline">Cadastre parceiros no menu Parceiros.</span>';
    (c.instructors || []).forEach(function (d, i) {
      var linha = document.querySelectorAll('#instructorRows .instructor-row')[i];
      if (linha) linha.querySelector('.instructor-bio').value = d.bio || '';
    });
  };
  var addDocOriginal = window.addInstructorRow;
  window.addInstructorRow = function (nome, funcao) {
    addDocOriginal(nome, funcao);
    var linhas = document.querySelectorAll('#instructorRows .instructor-row');
    var l = linhas[linhas.length - 1];
    l.classList.add('flex-wrap');
    var t = document.createElement('textarea');
    t.className = 'instructor-bio w-full p-2.5 rounded-lg bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-primary';
    t.rows = 2; t.maxLength = 1200; t.placeholder = 'Mini currículo do professor'; t.setAttribute('aria-label', 'Mini currículo');
    l.appendChild(t);
  };
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#ncAddLote')) addLote(); });
  document.addEventListener('change', async function (e) {
    if (e.target.id !== 'ncGaleriaArq') return;
    var arquivos = [].slice.call(e.target.files);
    e.target.value = '';
    for (var i = 0; i < arquivos.length; i++) {
      try { fotoGaleria(await enviarFoto(arquivos[i], 'cursos')); } catch (err) { showToast(err.message, 'error'); }
    }
  });
  window.ncExtrasCurso = function () {
    var form = document.getElementById('courseForm');
    if (!form.elements.syllabus) return {};
    var linhas = [].slice.call(document.querySelectorAll('#instructorRows .instructor-row'));
    return {
      instructors: linhas.map(function (l) { return { name: l.querySelector('.instructor-name').value.trim(), role: l.querySelector('.instructor-role').value.trim(), bio: l.querySelector('.instructor-bio').value.trim() }; }).filter(function (d) { return d.name; }),
      photos: [].map.call(document.querySelectorAll('.nc-galeria-item'), function (d) { return d.dataset.url; }),
      lots: [].map.call(document.querySelectorAll('.nc-lote'), function (d) { return { id: d.dataset.id, name: d.querySelector('.nc-l-nome').value, price: d.querySelector('.nc-l-preco').value, max: d.querySelector('.nc-l-max').value, status: d.querySelector('.nc-l-st').value }; }),
      partnerIds: [].map.call(document.querySelectorAll('.nc-pc:checked'), function (c) { return c.value; }),
    };
  };

  // ---------- janelas de cadastro ----------
  var abrirEntidadeOriginal = window.openEntityModal;
  window.openEntityModal = function (tipo, id) {
    abrirEntidadeOriginal(tipo, id);
    var form = document.getElementById('entityForm');
    var botoes = form.lastElementChild;
    var add = function (html) { botoes.insertAdjacentHTML('beforebegin', html); };
    if (tipo === 'highlight') {
      add(campoFoto('imageUrl', 'Foto do destaque', (porId(state.highlights, id) || {}).imageUrl, 'destaques'));
    } else if (tipo === 'store') {
      var s = porId(state.storeItems, id) || {};
      var sel = form.elements.category, atual = s.category || 'Brinquedos pedagógicos';
      var ops = CATEGORIAS_LOJA.indexOf(atual) > -1 ? CATEGORIAS_LOJA : [atual].concat(CATEGORIAS_LOJA);
      sel.innerHTML = ops.map(function (o) { return '<option ' + (o === atual ? 'selected' : '') + '>' + esc(o) + '</option>'; }).join('');
      form.elements.summary.required = false;
      if (!id) { form.elements.delivery.value = 'Disponibilidade e frete pelo atendimento'; form.elements.price.value = ''; }
      add(field('size', 'Tamanho (ex: P, M, G ou 17×17 cm)', s.size || '') + campoFoto('imageUrl', 'Foto do produto', s.imageUrl, 'loja') + field('videoUrl', 'Link do vídeo (YouTube, Instagram...)', s.videoUrl || '', false, 'url'));
    } else if (tipo === 'certificate') {
      var c = porId(state.certificates, id) || {};
      add(field('recipientEmail', 'E-mail do aluno (para ele emitir no site)', c.recipientEmail || '', false, 'email') + field('cpf', c.cpfFinal ? 'CPF (termina em ' + c.cpfFinal + '; preencha só para trocar)' : 'CPF do aluno', '') + field('teachers', 'Professor(es)', c.teachers || '') + '<div><label class="' + ROTULO + '">Parceiros que apoiaram</label><input type="hidden" name="partnerIds" value="' + esc((c.partnerIds || []).join(',')) + '"/><div class="flex flex-wrap gap-3 text-sm">' +
        ((state.partners || []).map(function (p) { return '<label class="inline-flex items-center gap-1.5"><input type="checkbox" data-parceiro value="' + esc(p.id) + '" ' + ((c.partnerIds || []).indexOf(p.id) > -1 ? 'checked' : '') + '/>' + esc(p.name) + '</label>'; }).join('') || '<span class="text-xs text-outline">Nenhum parceiro cadastrado.</span>') + '</div></div>');
      form.querySelectorAll('[data-parceiro]').forEach(function (cb) {
        cb.name = '__p';
        cb.addEventListener('change', function () { form.elements.partnerIds.value = [].map.call(form.querySelectorAll('[data-parceiro]:checked'), function (x) { return x.value; }).join(','); });
      });
    } else if (tipo === 'subscriber') {
      add(field('phone', 'Telefone', '', false, 'tel') + field('birthDate', 'Data de nascimento', '', false, 'date'));
    }
  };

  // ---------- listas ----------
  async function duplicar(url) {
    try { await api(url, { method: 'POST' }); showToast('Item duplicado.'); await loadOverview(); }
    catch (e) { showToast(e.message, 'error'); }
  }
  window.ncDuplicar = duplicar;

  window.renderStore = function () {
    document.getElementById('storeTableBody').innerHTML = (state.storeItems || []).map(function (s) {
      return '<tr><td class="py-3 px-4 text-xs font-bold text-secondary">' + esc(s.category) + '</td>' +
        '<td class="py-3 px-4"><div class="flex items-center gap-3">' + (s.imageUrl ? '<img alt="" loading="lazy" class="w-11 h-11 rounded object-contain bg-surface-container-low" src="' + esc(s.imageUrl) + '"/>' : '') + '<div><div class="font-semibold text-on-secondary-fixed">' + esc(s.title) + '</div><div class="text-xs text-outline">' + esc([s.size, s.videoUrl ? 'com vídeo' : '', s.delivery].filter(Boolean).join(' · ')) + '</div></div></div></td>' +
        '<td class="py-3 px-4 font-display font-bold tabular-nums whitespace-nowrap">' + esc(s.price) + '</td><td class="py-3 px-4 text-xs">' + (s.active ? 'Ativo' : 'Pausado') + '</td>' +
        '<td class="py-3 px-4 text-right whitespace-nowrap"><button type="button" onclick="openEntityModal(\'store\', \'' + esc(s.id) + '\')" class="' + BTN_LINHA + '">Editar</button>' +
        '<button type="button" onclick="ncDuplicar(\'/api/admin/store-items/' + esc(s.id) + '/duplicate\')" class="' + BTN_LINHA + '">Duplicar</button>' +
        '<button type="button" onclick="askDelete(\'Excluir material da loja?\', function(){ return delEntity(\'/api/admin/store-items/' + esc(s.id) + '\'); })" class="px-2.5 py-1 rounded hover:bg-error-container text-xs font-bold text-error">Excluir</button></td></tr>';
    }).join('');
    var b = document.getElementById('ncImportarLoja');
    if (b) b.classList.toggle('hidden', (state.storeItems || []).some(function (s) { return s.sourceId; }));
    var bc = document.getElementById('ncImportarCursos');
    if (bc) bc.classList.toggle('hidden', (state.courses || []).some(function (c) { return c.sourceId; }));
  };

  window.renderCardume = function () {
    document.getElementById('cardumeTableBody').innerHTML = (state.cardumeSubscribers || []).map(function (s) {
      var nasc = s.birthDate ? s.birthDate.split('-').reverse().join('/') : '';
      return '<tr><td class="py-3 px-4"><div class="font-medium">' + esc(s.email) + '</div><div class="text-xs text-outline">' + esc([s.phone, nasc].filter(Boolean).join(' · ')) + '</div></td>' +
        '<td class="py-3 px-4 text-xs capitalize">' + esc(s.profileType) + '</td><td class="py-3 px-4 text-xs text-outline">' + esc(s.sourcePage) + '</td>' +
        '<td class="py-3 px-4 text-xs font-semibold ' + (s.status === 'ativo' ? 'text-emerald-700' : 'text-outline') + '">' + esc(s.status) + '</td>' +
        '<td class="py-3 px-4 text-right whitespace-nowrap"><button type="button" onclick="ncEditarPessoa(\'' + esc(s.id) + '\')" class="' + BTN_LINHA + '">Editar</button>' +
        '<button type="button" onclick="toggleCardume(\'' + esc(s.id) + '\', \'' + (s.status === 'ativo' ? 'descadastrado' : 'ativo') + '\')" class="px-2.5 py-1 rounded bg-surface-container-low hover:bg-surface-container text-xs font-bold mr-1">' + (s.status === 'ativo' ? 'Desativar' : 'Reativar') + '</button>' +
        '<button type="button" onclick="askDelete(\'Remover inscrito?\', function(){ return delEntity(\'/api/admin/cardume/' + esc(s.id) + '\'); })" class="px-2.5 py-1 rounded hover:bg-error-container text-xs font-bold text-error">Remover</button></td></tr>';
    }).join('');
  };
  window.ncEditarPessoa = function (id) {
    var s = porId(state.cardumeSubscribers, id);
    var o = abrirJanela('Editar inscrito', '<form id="ncPessoa" class="space-y-4"><p class="text-sm font-semibold">' + esc(s.email) + '</p>' + field('phone', 'Telefone', s.phone || '', false, 'tel') + field('birthDate', 'Data de nascimento', s.birthDate || '', false, 'date') + '<div class="flex justify-end"><button class="' + BTN_PRIM + '">Salvar</button></div></form>');
    o.querySelector('form').onsubmit = async function (e) {
      e.preventDefault();
      try {
        await api('/api/admin/cardume/' + id, { method: 'PATCH', body: JSON.stringify({ phone: e.target.phone.value, birthDate: e.target.birthDate.value }) });
        fecharJanela(); showToast('Inscrito atualizado.'); await loadOverview();
      } catch (err) { showToast(err.message, 'error'); }
    };
  };

  window.renderCertificates = function () {
    document.getElementById('certificatesTableBody').innerHTML = (state.certificates || []).map(function (c) {
      return '<tr><td class="py-3 px-4 font-mono font-bold text-primary">' + esc(c.validationCode) + '</td><td class="py-3 px-4 font-semibold text-on-secondary-fixed">' + esc(c.recipientName) + '</td>' +
        '<td class="py-3 px-4 text-xs">' + esc(c.courseTitle) + (c.teachers ? '<div class="text-outline">Prof.: ' + esc(c.teachers) + '</div>' : '') + '</td><td class="py-3 px-4 text-xs">' + esc(c.workloadHours) + 'h</td>' +
        '<td class="py-3 px-4 text-xs font-bold ' + (c.isValid ? 'text-emerald-700' : 'text-error') + '">' + (c.isValid ? 'Válido' : 'Revogado') + '</td>' +
        '<td class="py-3 px-4 text-right whitespace-nowrap"><button type="button" onclick="openEntityModal(\'certificate\', \'' + esc(c.id) + '\')" class="' + BTN_LINHA + '">Editar</button>' +
        '<button type="button" onclick="ncDuplicar(\'/api/admin/certificates/' + esc(c.id) + '/duplicate\')" class="' + BTN_LINHA + '">Duplicar</button>' +
        '<button type="button" onclick="askDelete(\'Remover certificado?\', function(){ return delEntity(\'/api/admin/certificates/' + esc(c.id) + '\'); })" class="px-2.5 py-1 rounded hover:bg-error-container text-xs font-bold text-error">Excluir</button></td></tr>';
    }).join('');
  };

  // ---------- importar alunos do Excel ----------
  function carregarXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise(function (ok, erro) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = ok; s.onerror = function () { erro(new Error('Não foi possível abrir o leitor de Excel.')); };
      document.head.appendChild(s);
    });
  }
  function alunosDaPlanilha(linhas) {
    if (!linhas.length) return [];
    var cab = linhas[0].map(function (c) { return String(c || '').toLowerCase().trim(); });
    var col = cab.findIndex(function (c) { return /nome|aluno|participante/.test(c); });
    var colEmail = cab.findIndex(function (c) { return /e-?mail/.test(c); });
    var colCpf = cab.findIndex(function (c) { return /cpf/.test(c); });
    var inicio = col > -1 ? 1 : 0;
    if (col < 0) col = 0;
    var valor = function (l, i) { return i < 0 || l[i] == null ? '' : String(l[i]).trim(); };
    return linhas.slice(inicio).map(function (l) { return { name: valor(l, col), email: valor(l, colEmail), cpf: valor(l, colCpf) }; }).filter(function (a) { return a.name; });
  }
  window.ncImportarAlunos = function () {
    var opcoes = (state.courses || []).map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.title) + '</option>'; }).join('');
    var o = abrirJanela('Importar alunos do Excel', '<form class="space-y-4">' +
      '<div><label class="' + ROTULO + '">Formação</label><select name="curso" class="' + CAMPO + '">' + opcoes + '</select></div>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">' + field('workloadHours', 'Carga horária (h)', '', false, 'number') + field('issuedAt', 'Data de emissão', new Date().toISOString().slice(0, 10), true, 'date') + '</div>' +
      field('teachers', 'Professor(es)', '') +
      '<div><label class="' + ROTULO + '">Planilha (.xlsx, .xls ou .csv)</label><input name="arquivo" type="file" required accept=".xlsx,.xls,.csv" class="text-sm"/><p class="text-[11px] text-outline mt-1">Usa as colunas "Nome", "E-mail" e "CPF". Com e-mail ou CPF, o próprio aluno emite o certificado no site.</p></div>' +
      '<p id="ncPrevia" class="text-sm font-semibold text-primary"></p><div class="flex justify-end"><button class="' + BTN_PRIM + '" disabled>Gerar certificados</button></div></form>');
    var f = o.querySelector('form'), nomes = [], botao = f.querySelector('button.bg-primary');
    function preencherCurso() {
      var c = porId(state.courses, f.curso.value) || {};
      f.workloadHours.value = parseInt(c.workload, 10) || '';
      f.teachers.value = c.instructor || '';
    }
    f.curso.onchange = preencherCurso; preencherCurso();
    f.arquivo.onchange = async function () {
      nomes = []; botao.disabled = true;
      var prev = document.getElementById('ncPrevia');
      try {
        await carregarXlsx();
        var livro = XLSX.read(await f.arquivo.files[0].arrayBuffer(), { type: 'array' });
        nomes = alunosDaPlanilha(XLSX.utils.sheet_to_json(livro.Sheets[livro.SheetNames[0]], { header: 1, blankrows: false, raw: false }));
        var comContato = nomes.filter(function (a) { return a.email || a.cpf; }).length;
        prev.textContent = nomes.length + ' nomes encontrados, ' + comContato + ' com e-mail ou CPF. Primeiros: ' + nomes.slice(0, 3).map(function (a) { return a.name; }).join(', ');
        botao.disabled = !nomes.length;
      } catch (e) { prev.textContent = e.message || 'Não foi possível ler a planilha.'; }
    };
    f.onsubmit = async function (e) {
      e.preventDefault();
      var c = porId(state.courses, f.curso.value) || {};
      botao.disabled = true;
      try {
        var r = await api('/api/admin/certificates/importar', { method: 'POST', body: JSON.stringify({ courseTitle: c.title, workloadHours: f.workloadHours.value, issuedAt: f.issuedAt.value, teachers: f.teachers.value, partnerIds: c.partnerIds || [], alunos: nomes }) });
        fecharJanela(); showToast(r.criados + ' certificados criados' + (r.repetidos ? ' (' + r.repetidos + ' já existiam)' : '') + (r.cpfInvalidos ? '. ' + r.cpfInvalidos + ' CPF(s) inválido(s) ignorado(s)' : '') + '.'); await loadOverview();
      } catch (err) { botao.disabled = false; showToast(err.message, 'error'); }
    };
  };

  // ---------- modelo padrão do certificado ----------
  window.ncModeloCertificado = function () {
    var m = (state.settings && state.settings.certificateModel) || {};
    var o = abrirJanela('Modelo padrão do certificado', '<form class="space-y-4"><p class="text-sm text-on-surface-variant">Vale para todos os certificados. O nome do aluno, o professor e os parceiros mudam sozinhos conforme a formação. Uma formação com arte própria usa a arte dela.</p>' +
      campoFoto('imageUrl', 'Arte de fundo (opcional)', m.imageUrl, 'modelos', 'Horizontal, com espaço no centro para o nome. Com arte, o título e a frase de abertura ficam por conta dela.') +
      field('titulo', 'Título', m.titulo || 'CERTIFICADO') + field('abertura', 'Frase antes do nome', m.abertura || 'Certificamos que') + field('texto', 'Frase depois do nome', m.texto || 'concluiu a formação') +
      '<div class="flex justify-between gap-2"><a href="/certificados?previa=1" target="_blank" rel="noopener" class="' + BTN_SEC + '">' + ic('visibility') + 'Ver prévia</a><button class="' + BTN_PRIM + '">Salvar</button></div></form>');
    o.querySelector('form').onsubmit = async function (e) {
      e.preventDefault();
      var f = e.target;
      try {
        await api('/api/admin/certificate-model', { method: 'PUT', body: JSON.stringify({ imageUrl: f.imageUrl.value, titulo: f.titulo.value, abertura: f.abertura.value, texto: f.texto.value }) });
        fecharJanela(); showToast('Modelo do certificado salvo.'); await loadOverview();
      } catch (err) { showToast(err.message, 'error'); }
    };
  };

  // ---------- links dos caminhos ----------
  window.ncLinksSite = function () {
    var s = state.settings || {};
    var o = abrirJanela('Links de Famílias e Alunos', '<form class="space-y-4">' +
      field('aquagendaUrl', 'Link do seu AquAgenda (botão de Famílias)', s.aquagendaUrl || '', false, 'url') +
      field('treinosUrl', 'Link dos treinos (botão de Alunos)', s.treinosUrl || 'https://play.google.com/store/apps/details?id=com.natacaocriativa.treinos', false, 'url') +
      '<div class="flex justify-end"><button class="' + BTN_PRIM + '">Salvar</button></div></form>');
    o.querySelector('form').onsubmit = async function (e) {
      e.preventDefault();
      try {
        await api('/api/admin/site-links', { method: 'PUT', body: JSON.stringify({ aquagendaUrl: e.target.aquagendaUrl.value, treinosUrl: e.target.treinosUrl.value }) });
        fecharJanela(); showToast('Links salvos.'); await loadOverview();
      } catch (err) { showToast(err.message, 'error'); }
    };
  };

  window.ncImportarCursos = async function () {
    if (!confirm('Trazer os cursos da plataforma para o painel como RASCUNHO? Nada aparece no site até você publicar.')) return;
    try {
      var r = await api('/api/admin/courses/importar', { method: 'POST' });
      showToast(r.importados + ' cursos importados como rascunho.'); await loadOverview();
    } catch (e) { showToast(e.message, 'error'); }
  };

  window.ncImportarLoja = async function () {
    if (!confirm('Trazer os 66 produtos da loja antiga para o painel? Os 6 materiais de exemplo ficam pausados, sem serem apagados.')) return;
    try {
      var r = await api('/api/admin/store-items/importar', { method: 'POST' });
      showToast(r.importados + ' produtos importados.'); await loadOverview();
    } catch (e) { showToast(e.message, 'error'); }
  };

  // ---------- novas seções ----------
  function criarSecao(id, rotulo, icone, html, depoisDe) {
    var base = document.querySelector('.nav-btn[data-section="' + depoisDe + '"]');
    var b = base.cloneNode(true);
    b.dataset.section = id;
    b.innerHTML = ic(icone, 'text-[20px]') + '<span>' + esc(rotulo) + '</span>';
    b.addEventListener('click', function () {
      navigateTo(id);
      document.getElementById('breadcrumbCurrent').textContent = rotulo;
      if (id === 'atividade') carregarAtividade();
      if (window.ncAoAbrirSecao) window.ncAoAbrirSecao(id);
    });
    base.insertAdjacentElement('afterend', b);
    var s = document.createElement('section');
    s.id = 'sec-' + id;
    s.className = 'admin-section hidden space-y-5';
    s.innerHTML = html;
    document.getElementById('sec-configuracoes').insertAdjacentElement('afterend', s);
  }
  var cab = function (t, d, extra) { return '<div class="flex flex-wrap items-start justify-between gap-3"><div><h1 class="font-display font-extrabold text-2xl text-on-secondary-fixed">' + esc(t) + '</h1><p class="text-sm text-on-surface-variant">' + esc(d) + '</p></div>' + (extra || '') + '</div>'; };
  var caixa = 'bg-surface-container-lowest rounded-xl border border-outline-variant/40 overflow-x-auto';

  function renderParceiros() {
    var g = document.getElementById('ncParceiros');
    if (!g) return;
    g.innerHTML = (state.partners || []).map(function (p) {
      return '<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-4 flex flex-col gap-3"><div class="h-20 flex items-center justify-center bg-surface-container-low rounded-lg">' + (p.logoUrl ? '<img alt="' + esc(p.name) + '" class="max-h-16 max-w-full object-contain" src="' + esc(p.logoUrl) + '"/>' : ic('image', 'text-outline')) + '</div><div><div class="font-display font-bold text-sm">' + esc(p.name) + '</div><div class="text-xs text-outline">' + esc([p.showHeader !== false ? 'Cabeçalho' : '', p.showFooter !== false ? 'Rodapé' : '', p.active === false ? 'Oculto' : ''].filter(Boolean).join(' · ')) + '</div></div><div class="flex justify-end"><button type="button" onclick="ncParceiro(\'' + esc(p.id) + '\')" class="' + BTN_LINHA + '">Editar</button><button type="button" onclick="askDelete(\'Remover parceiro?\', function(){ return delEntity(\'/api/admin/partners/' + esc(p.id) + '\'); })" class="px-2.5 py-1 text-xs font-bold text-error">Excluir</button></div></div>';
    }).join('') || '<p class="text-sm text-outline">Nenhum parceiro cadastrado.</p>';
  }
  window.ncParceiro = function (id) {
    var p = porId(state.partners, id) || { showHeader: true, showFooter: true, active: true };
    var o = abrirJanela(id ? 'Editar parceiro' : 'Novo parceiro', '<form class="space-y-4">' + field('name', 'Nome', p.name || '', true) + campoFoto('logoUrl', 'Logo (de preferência PNG sem fundo)', p.logoUrl, 'parceiros') + field('url', 'Site do parceiro', p.url || '', false, 'url') + '<div class="flex flex-wrap gap-4">' + checkbox('showHeader', 'Mostrar no cabeçalho', p.showHeader !== false) + checkbox('showFooter', 'Mostrar no rodapé', p.showFooter !== false) + checkbox('active', 'Ativo', p.active !== false) + '</div><div class="flex justify-end"><button class="' + BTN_PRIM + '">Salvar</button></div></form>');
    o.querySelector('form').onsubmit = async function (e) {
      e.preventDefault();
      var f = e.target, corpo = { name: f.name.value, logoUrl: f.logoUrl.value, url: f.url.value, showHeader: f.showHeader.checked, showFooter: f.showFooter.checked, active: f.active.checked };
      try {
        await api('/api/admin/partners' + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(corpo) });
        fecharJanela(); showToast('Parceiro salvo.'); await loadOverview();
      } catch (err) { showToast(err.message, 'error'); }
    };
  };

  function renderLeads() {
    var t = document.getElementById('ncLeads');
    if (!t) return;
    t.innerHTML = (state.leads || []).map(function (l) {
      return '<tr><td class="py-3 px-4 font-semibold">' + esc(l.name) + '</td><td class="py-3 px-4 text-xs">' + esc(l.email) + '<div class="text-outline">' + esc(l.phone) + '</div></td><td class="py-3 px-4 text-xs">' + esc(l.courseTitle) + '</td><td class="py-3 px-4 text-xs text-outline">' + new Date(l.updatedAt || l.createdAt).toLocaleString('pt-BR') + '</td></tr>';
    }).join('') || '<tr><td colspan="4" class="py-6 px-4 text-sm text-outline">Nenhum interessado ainda.</td></tr>';
  }

  var tempo = function (s) { var m = Math.round(s / 60); return m < 1 ? s + ' s' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };
  async function carregarAtividade() {
    var alvo = document.getElementById('ncAtividade');
    alvo.innerHTML = '<p class="text-sm text-outline">Carregando...</p>';
    try {
      var r = await api('/api/admin/atividade');
      alvo.innerHTML = (r.aviso ? '<p class="text-sm font-semibold text-error">' + esc(r.aviso) + '</p>' : '') + ((r.pessoas || []).map(function (p) {
        return '<details class="bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-4"><summary class="cursor-pointer flex flex-wrap justify-between gap-2"><span class="font-display font-bold text-sm">' + esc(p.nome || p.email || 'Visitante sem cadastro') + (p.nome ? ' <span class="font-normal text-outline">' + esc(p.email) + '</span>' : '') + '</span><span class="text-xs text-on-surface-variant">' + tempo(p.segundos) + ' no site · ' + new Date(p.ultimo).toLocaleString('pt-BR') + '</span></summary><div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-xs"><div><div class="font-bold mb-1">Páginas</div>' + p.paginas.map(function (x) { return '<div class="flex justify-between gap-2"><span>' + esc(x.path) + '</span><span class="tabular-nums">' + tempo(x.segundos) + '</span></div>'; }).join('') + '</div><div><div class="font-bold mb-1">O que clicou</div>' + (p.cliques.map(function (x) { return '<div>' + esc(x.label) + ' <span class="text-outline">(' + esc(x.path) + ')</span></div>'; }).join('') || '<span class="text-outline">Nada registrado</span>') + '</div></div></details>';
      }).join('') || (r.aviso ? '' : '<p class="text-sm text-outline">Nenhuma atividade registrada ainda.</p>'));
    } catch (e) { alvo.innerHTML = '<p class="text-sm text-error">' + esc(e.message) + '</p>'; }
  }

  criarSecao('atividade', 'Atividade dos Alunos', 'query_stats', cab('Atividade dos Alunos', 'O que cada pessoa fez no site e quanto tempo ficou. Só registra quem aceitou o aviso de privacidade.', '<button type="button" id="ncAtualizarAtiv" class="' + BTN_SEC + '">' + ic('refresh') + 'Atualizar</button>') + '<div id="ncAtividade" class="space-y-3"></div>', 'comunidade');
  criarSecao('leads', 'Leads', 'person_search', cab('Leads', 'Quem deixou os dados antes de ir para o pagamento.', '<a href="/api/admin/export/leads" class="' + BTN_SEC + '">' + ic('file_download') + 'Exportar CSV</a>') + '<div class="' + caixa + '"><table class="w-full text-left text-sm"><thead><tr class="bg-surface-container-low text-[11px] font-display font-extrabold uppercase text-on-surface-variant"><th class="py-3 px-4">Nome</th><th class="py-3 px-4">Contato</th><th class="py-3 px-4">Formação</th><th class="py-3 px-4">Data</th></tr></thead><tbody id="ncLeads"></tbody></table></div>', 'comunidade');
  criarSecao('parceiros', 'Parceiros', 'handshake', cab('Parceiros', 'Logos no cabeçalho, no rodapé e nos eventos apoiados.', '<button type="button" onclick="ncParceiro()" class="' + BTN_PRIM + '">' + ic('add') + 'Novo Parceiro</button>') + '<div id="ncParceiros" class="grid grid-cols-2 md:grid-cols-4 gap-4"></div>', 'conteudos');
  document.getElementById('ncAtualizarAtiv').onclick = carregarAtividade;
  window.ncPainel = { criarSecao: criarSecao, cab: cab, abrirJanela: abrirJanela, ic: ic, caixa: caixa, CAMPO: CAMPO, ROTULO: ROTULO, BTN_PRIM: BTN_PRIM, BTN_SEC: BTN_SEC };
  ['/dados/loja-simulacao.js', '/dados/painel-loja.js', '/dados/painel-integracoes.js'].forEach(function (src) {
    var sc = document.createElement('script'); sc.src = src; sc.async = false; document.body.appendChild(sc);
  });

  var addLoja = document.querySelector('#subtab-conteudos-store > .flex');
  if (addLoja) {
    addLoja.classList.add('gap-2');
    addLoja.insertAdjacentHTML('afterbegin', '<button type="button" id="ncImportarLoja" onclick="ncImportarLoja()" class="' + BTN_SEC + '">' + ic('inventory_2') + 'Importar 66 produtos da loja antiga</button>');
  }
  var emitir = document.querySelector('#subtab-depoimentos-certificates button[onclick*="certificate"]');
  if (emitir) emitir.insertAdjacentHTML('beforebegin', '<button type="button" onclick="ncModeloCertificado()" class="' + BTN_SEC + '">' + ic('edit_document') + 'Modelo padrão</button><button type="button" onclick="ncImportarAlunos()" class="' + BTN_SEC + '">' + ic('upload_file') + 'Importar alunos do Excel</button>');
  var formConfig = document.getElementById('settingsForm');
  if (formConfig) formConfig.insertAdjacentHTML('beforebegin', '<div class="mb-4 flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-4"><div><div class="font-display font-bold text-sm">Links de Famílias e Alunos</div><div class="text-xs text-outline">Para onde vão os botões da página inicial e de Soluções.</div></div><button type="button" onclick="ncLinksSite()" class="' + BTN_SEC + '">' + ic('link') + 'Editar links</button></div>');
  if (emitir) emitir.parentElement.classList.add('items-center');

  var novaFormacao = document.querySelector('#sec-formacoes button[onclick*="openCourseModal"]');
  if (novaFormacao) novaFormacao.insertAdjacentHTML('beforebegin', '<button type="button" id="ncImportarCursos" onclick="ncImportarCursos()" class="' + BTN_SEC + ' mr-2">' + ic('cloud_download') + 'Importar cursos da plataforma</button>');

  var renderTudoOriginal = window.renderAll;
  window.renderAll = function () { renderTudoOriginal(); renderParceiros(); renderLeads(); };
  if (state && state.courses) window.renderAll();
})();
