// Painel: Asaas, e-mail e dados da hospedagem, para o administrador alterar quando precisar.
(function () {
  var P = window.ncPainel;
  if (!P || window.__ncIntegracoes) return;
  window.__ncIntegracoes = true;
  var estado = null;
  var CARTAO = 'bg-surface-container-lowest rounded-xl border border-outline-variant/40 p-5 space-y-4';

  P.criarSecao('integracoes', 'Integrações', 'key', P.cab('Integrações', 'Pagamento, e-mail, Instagram e dados da hospedagem. Só administradores têm acesso.') + '<div id="ncIntegracoes" class="space-y-5"><p class="text-sm text-outline">Carregando...</p></div>', 'configuracoes');
  var botaoMenu = document.querySelector('.nav-btn[data-section="integracoes"]');
  botaoMenu.addEventListener('click', carregar);

  function texto(nome, rotulo, dica, tipo, ph) {
    return '<div><label class="' + P.ROTULO + '" for="nc-int-' + nome + '">' + esc(rotulo) + '</label><input id="nc-int-' + nome + '" name="' + nome + '" type="' + (tipo || 'text') + '" placeholder="' + esc(ph || '') + '" value="' + esc(estado.textos[nome] || '') + '" autocomplete="off" class="' + P.CAMPO + '"/>' + (dica ? '<p class="text-[11px] text-outline mt-1">' + esc(dica) + '</p>' : '') + '</div>';
  }
  function segredo(nome, rotulo, dica, extra) {
    var s = estado.segredos[nome];
    var situacao = s.configurado ? 'Salva' + (s.final ? ', termina em ' + s.final : '') + (s.origem === 'vercel' ? ' (na Vercel)' : '') : 'Não configurada';
    return '<div><div class="flex flex-wrap items-center justify-between gap-2 mb-1"><label class="block text-xs font-display font-bold text-on-surface" for="nc-int-' + nome + '">' + esc(rotulo) + '</label><span class="text-[11px] font-bold ' + (s.configurado ? 'text-emerald-700' : 'text-error') + '">' + esc(situacao) + '</span></div><div class="flex gap-2"><input id="nc-int-' + nome + '" name="' + nome + '" type="password" autocomplete="new-password" spellcheck="false" placeholder="' + (s.configurado ? 'Deixe vazio para manter a atual' : 'Cole aqui') + '" class="' + P.CAMPO + '"/><button type="button" data-ver="' + nome + '" aria-label="Mostrar o que foi digitado" class="px-2.5 rounded-lg bg-surface-container-low">' + P.ic('visibility') + '</button>' + (extra || '') + '</div>' + (dica ? '<p class="text-[11px] text-outline mt-1">' + esc(dica) + '</p>' : '') + (s.origem === 'painel' ? '<button type="button" data-limpar="' + nome + '" class="text-[11px] font-bold text-error mt-1">Remover</button>' : '') + '</div>';
  }
  var salvar = function (t) { return '<button class="' + P.BTN_PRIM + '">' + P.ic('save') + esc(t) + '</button>'; };

  function desenhar() {
    var e = estado, alvo = document.getElementById('ncIntegracoes');
    var aviso = '';
    if (e.problema === 'chave') aviso = '<p class="p-3 rounded-lg bg-red-100 text-red-800 text-sm font-semibold">Os dados salvos não puderam ser abertos porque a chave de segurança do servidor mudou. Cole as chaves de novo.</p>';
    if (e.problema === 'leitura') aviso = '<p class="p-3 rounded-lg bg-amber-100 text-amber-900 text-sm font-semibold">Não foi possível ler os dados agora. Atualize a página antes de alterar.</p>';
    if (!e.podeSalvar) aviso += '<p class="p-3 rounded-lg bg-red-100 text-red-800 text-sm font-semibold">O servidor ainda não está preparado para guardar chaves.</p>';
    alvo.innerHTML = aviso +
      '<form data-grupo="asaas" class="' + CARTAO + '"><div class="flex flex-wrap items-center justify-between gap-2"><h2 class="font-display font-bold">Pagamentos (Asaas)</h2><span class="px-2.5 py-1 rounded-full text-[11px] font-bold ' + (e.ambienteAsaas === 'produção' ? 'bg-emerald-100 text-emerald-800' : e.ambienteAsaas === 'teste' ? 'bg-amber-100 text-amber-900' : 'bg-surface-container text-on-surface-variant') + '">' + (e.ambienteAsaas === 'produção' ? 'Recebendo de verdade' : e.ambienteAsaas === 'teste' ? 'Modo de teste' : 'Sem chave') + '</span></div>' +
      segredo('ASAAS_API_KEY', 'Chave da API do Asaas', 'No Asaas: Integrações > Chaves de API. O site reconhece sozinho se é de teste ou de produção.') +
      segredo('ASAAS_WEBHOOK_TOKEN', 'Senha do webhook', 'Crie uma senha, salve aqui e cole a mesma no webhook do Asaas.', '<button type="button" id="ncGerarToken" class="' + P.BTN_SEC + ' whitespace-nowrap">Gerar</button>') +
      '<div><label class="' + P.ROTULO + '">URL do webhook (colar no Asaas)</label><div class="flex gap-2"><input readonly value="' + esc(e.webhookUrl) + '" aria-label="URL do webhook" class="' + P.CAMPO + '"/><button type="button" data-copiar="' + esc(e.webhookUrl) + '" class="' + P.BTN_SEC + '">Copiar</button></div><p class="text-[11px] text-outline mt-1">Eventos: cobrança confirmada, recebida, vencida, removida, estornada e contestação.</p></div>' +
      '<div class="flex flex-wrap justify-end gap-2"><button type="button" data-testar="asaas" class="' + P.BTN_SEC + '">' + P.ic('sync') + 'Testar conexão</button>' + salvar('Salvar Asaas') + '</div><p data-res="asaas" class="text-sm font-semibold" role="status"></p></form>' +
      '<form data-grupo="email" class="' + CARTAO + '"><h2 class="font-display font-bold">E-mail dos avisos</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      texto('SMTP_USER', 'E-mail que envia', 'Normalmente é o mesmo do login da caixa.', 'email', 'contato@natacaocriativa.com.br') +
      segredo('SMTP_PASS', 'Senha desse e-mail') +
      texto('LOJA_EMAIL_AVISO', 'E-mail que recebe as compras', '', 'email') +
      texto('EMAIL_FROM', 'Remetente (opcional)', 'Vazio = usa o e-mail que envia.', 'email') +
      texto('SMTP_HOST', 'Servidor de envio', 'Vazio = smtp.titan.email', 'text', 'smtp.titan.email') +
      texto('SMTP_PORT', 'Porta', 'Vazio = 465', 'text', '465') +
      '</div><div class="flex flex-wrap justify-end gap-2"><button type="button" data-testar="email" class="' + P.BTN_SEC + '">' + P.ic('mail') + 'Enviar e-mail de teste</button>' + salvar('Salvar e-mail') + '</div><p data-res="email" class="text-sm font-semibold" role="status"></p></form>' +
      '<form data-grupo="instagram" class="' + CARTAO + '"><div><h2 class="font-display font-bold">Instagram</h2><p class="text-xs text-on-surface-variant">Mostra as últimas publicações na página inicial.</p></div>' +
      segredo('INSTAGRAM_ACCESS_TOKEN', 'Token de acesso do Instagram', 'Token da conta @natacaocriativa, gerado no app creatIApp da Meta. Ele costuma vencer em cerca de 60 dias: se as publicações sumirem, gere outro e cole aqui.') +
      '<div class="flex flex-wrap justify-end gap-2"><button type="button" data-testar="instagram" class="' + P.BTN_SEC + '">' + P.ic('sync') + 'Testar conexão</button>' + salvar('Salvar Instagram') + '</div><p data-res="instagram" class="text-sm font-semibold" role="status"></p></form>' +
      '<form data-grupo="hospedagem" class="' + CARTAO + '"><div><h2 class="font-display font-bold">Site e hospedagem</h2><p class="text-xs text-on-surface-variant">Anotações para achar tudo quando precisar. Não guarde senhas aqui.</p></div><div class="grid grid-cols-1 md:grid-cols-2 gap-4">' +
      texto('SITE_URL', 'Endereço oficial do site', 'Usado nos links dos e-mails e do webhook. Troque quando o domínio mudar.', 'url', 'https://') +
      texto('HOSPEDAGEM_EMPRESA', 'Empresa da hospedagem', '', 'text', 'Ex.: Vercel, HostGator') +
      texto('HOSPEDAGEM_LINK', 'Link do painel da hospedagem', '', 'url', 'https://') +
      texto('HOSPEDAGEM_USUARIO', 'Usuário ou e-mail de acesso', '') +
      '</div><div><label class="' + P.ROTULO + '" for="nc-int-notas">Observações</label><textarea id="nc-int-notas" name="HOSPEDAGEM_NOTAS" rows="3" maxlength="2000" class="w-full p-3 rounded-lg bg-surface-container-low text-sm outline-none focus:ring-2 focus:ring-primary">' + esc(e.textos.HOSPEDAGEM_NOTAS || '') + '</textarea></div><div class="flex justify-end">' + salvar('Salvar dados') + '</div><p data-res="hospedagem" class="text-sm font-semibold" role="status"></p></form>' +
      (e.atualizadoEm ? '<p class="text-xs text-outline">Última alteração: ' + esc(new Date(e.atualizadoEm).toLocaleString('pt-BR')) + ' por ' + esc(e.atualizadoPor) + '.</p>' : '');
  }
  function resultado(g, ok, msg) {
    var p = document.querySelector('#ncIntegracoes [data-res="' + g + '"]');
    if (!p) return;
    p.textContent = msg; p.className = 'text-sm font-semibold ' + (ok ? 'text-emerald-700' : 'text-error');
  }

  var alvo = document.getElementById('ncIntegracoes');
  alvo.addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var f = ev.target, g = f.dataset.grupo, corpo = {}, b = f.querySelector('button.bg-primary');
    new FormData(f).forEach(function (v, k) { corpo[k] = v; });
    b.disabled = true;
    try {
      estado = await api('/api/admin/integracoes', { method: 'PUT', body: JSON.stringify(corpo) });
      desenhar(); resultado(g, true, 'Salvo.'); showToast('Integrações salvas.');
    } catch (e) { b.disabled = false; resultado(g, false, e.message); }
  });
  alvo.addEventListener('click', async function (ev) {
    var t = ev.target.closest('button');
    if (!t) return;
    if (t.dataset.ver) { var c = document.getElementById('nc-int-' + t.dataset.ver); c.type = c.type === 'password' ? 'text' : 'password'; }
    if (t.dataset.copiar) { navigator.clipboard.writeText(t.dataset.copiar).then(function () { t.textContent = 'Copiado'; }); }
    if (t.id === 'ncGerarToken') {
      var bytes = crypto.getRandomValues(new Uint8Array(24)), i = document.getElementById('nc-int-ASAAS_WEBHOOK_TOKEN');
      i.value = Array.from(bytes, function (x) { return x.toString(16).padStart(2, '0'); }).join(''); i.type = 'text';
      resultado('asaas', true, 'Senha gerada. Copie, clique em Salvar Asaas e cole a mesma no webhook do Asaas.');
    }
    if (t.dataset.limpar) {
      if (t.dataset.confirmando !== '1') { t.dataset.confirmando = '1'; t.textContent = 'Clique de novo para remover'; return; }
      try { estado = await api('/api/admin/integracoes', { method: 'PUT', body: JSON.stringify({ limpar: [t.dataset.limpar] }) }); desenhar(); showToast('Removido.'); } catch (e) { showToast(e.message, 'error'); }
    }
    if (t.dataset.testar) {
      var g = t.dataset.testar;
      t.disabled = true; resultado(g, true, 'Testando...');
      try {
        var r = await api('/api/admin/integracoes/testar/' + g, { method: 'POST' });
        resultado(g, true, g === 'asaas' ? 'Conectado ao Asaas (' + r.ambiente + ')' + (r.conta ? ': ' + r.conta : '') + '.' : g === 'instagram' ? 'Conectado ao Instagram: @' + r.conta + '.' : 'E-mail de teste enviado para ' + r.para + '.');
      } catch (e) { resultado(g, false, e.message); }
      t.disabled = false;
    }
  });

  async function carregar() {
    try { estado = await api('/api/admin/integracoes'); desenhar(); }
    catch (e) { alvo.innerHTML = '<p class="text-sm font-semibold text-error">' + esc(e.message) + '</p>'; }
  }
  // Quem não é administrador não vê o menu.
  (function esconder(n) {
    if (window.state && state.user) { if (state.user.role !== 'admin') botaoMenu.classList.add('hidden'); return; }
    if (n > 0) setTimeout(function () { esconder(n - 1); }, 500);
  })(20);
})();
