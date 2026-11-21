// Soluções: diagnóstico para gestores (perguntas, resultado e formulário de contato).
(function () {
  var PERGUNTAS = [
    { area: 'Retenção', dica: 'Crie um alerta para aluno com faltas seguidas e fale com ele antes que ele cancele.', q: 'Você sabe quantos alunos saíram da escola no último mês e por quê?', r: ['Não acompanho', 'Sei quantos, mas não o motivo', 'Sei quantos e o motivo'] },
    { area: 'Metodologia', dica: 'Defina o que o aluno precisa aprender em cada nível, para a aula não depender de quem está na borda.', q: 'Se um professor faltar, o substituto sabe exatamente o que dar naquela turma?', r: ['Não, cada um faz do seu jeito', 'Às vezes', 'Sim, temos planejamento por nível'] },
    { area: 'Equipe', dica: 'Monte uma rotina curta de capacitação, com observação de aula e retorno para cada professor.', q: 'Com que frequência sua equipe de professores recebe capacitação?', r: ['Quase nunca', 'Uma ou duas vezes por ano', 'Temos uma rotina definida'] },
    { area: 'Captação', dica: 'Registre de onde vem cada aluno novo e invista mais no canal que traz matrícula.', q: 'Você sabe de onde vêm os seus novos alunos?', r: ['Não sei', 'Tenho uma ideia', 'Sei e acompanho por canal'] },
    { area: 'Atendimento', dica: 'Padronize a resposta e o retorno a quem pede informação, porque a matrícula costuma se perder aqui.', q: 'O que acontece com quem pede informação e não se matricula na hora?', r: ['Não fazemos contato de novo', 'Fazemos quando dá tempo', 'Temos um retorno combinado'] },
    { area: 'Indicadores', dica: 'Escolha poucos números para olhar todo mês: alunos ativos, saídas, ocupação das turmas e receita.', q: 'Você acompanha a ocupação das turmas e o resultado financeiro todo mês?', r: ['Não acompanho', 'Só o financeiro', 'Acompanho os dois'] },
  ];

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  var BTN = 'px-5 py-3 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-lg text-label-lg transition-all';

  function resultado(total) {
    if (total <= 4) return { nivel: 'Sua escola precisa de atenção agora', texto: 'Há pontos que podem estar custando alunos todo mês sem você perceber. A boa notícia é que os primeiros ajustes costumam ser simples.' };
    if (total <= 8) return { nivel: 'Sua escola tem base, mas está deixando resultado na piscina', texto: 'O que já funciona depende muito de esforço. Organizar os pontos abaixo ajuda a escola a crescer com menos sobrecarga.' };
    return { nivel: 'Sua escola está pronta para o próximo passo', texto: 'A gestão está bem encaminhada. Agora vale refinar os detalhes para crescer sem perder qualidade.' };
  }

  function abrir() {
    if (document.getElementById('ncDiagnostico')) return;
    var fundo = el('div', 'fixed inset-0 z-[9995] bg-[#0B3258]/60 backdrop-blur-sm flex items-center justify-center p-3');
    fundo.id = 'ncDiagnostico';
    var caixa = el('div', 'bg-surface-container-lowest rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 md:p-7 relative');
    caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true'); caixa.setAttribute('aria-label', 'Diagnóstico da sua escola');
    var tecla = function (e) { if (e.key === 'Escape') fechar(); };
    function fechar() { fundo.remove(); document.removeEventListener('keydown', tecla); if (location.hash === '#diagnostico') history.replaceState(null, '', location.pathname); }
    document.addEventListener('keydown', tecla);
    fundo.addEventListener('click', function (e) { if (e.target === fundo) fechar(); });
    var x = el('button', 'absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center');
    x.type = 'button'; x.setAttribute('aria-label', 'Fechar'); x.appendChild(el('span', 'material-symbols-outlined', 'close')); x.onclick = fechar;
    caixa.appendChild(x);
    var corpo = el('div'); caixa.appendChild(corpo);
    fundo.appendChild(caixa); document.body.appendChild(fundo);

    var respostas = [];
    function pergunta(i) {
      corpo.textContent = '';
      var p = PERGUNTAS[i];
      corpo.appendChild(el('span', 'text-label-caps font-label-caps uppercase tracking-wider text-primary block pr-10', 'Diagnóstico · pergunta ' + (i + 1) + ' de ' + PERGUNTAS.length));
      var barra = el('div', 'h-2 rounded-full bg-surface-container-high mt-3 overflow-hidden'), cheio = el('div', 'h-full bg-primary rounded-full');
      cheio.style.width = Math.round((i / PERGUNTAS.length) * 100) + '%'; barra.appendChild(cheio); corpo.appendChild(barra);
      corpo.appendChild(el('h2', 'text-on-secondary-fixed font-headline-md text-headline-md mt-5 mb-4', p.q));
      p.r.forEach(function (t, nota) {
        var b = el('button', 'w-full text-left px-4 py-3.5 mb-2 rounded-lg bg-surface-container-low hover:bg-secondary-fixed text-on-surface font-body-md text-body-md transition-colors', t);
        b.type = 'button';
        b.onclick = function () { respostas[i] = nota; if (i + 1 < PERGUNTAS.length) pergunta(i + 1); else final(); };
        corpo.appendChild(b);
      });
      if (i > 0) { var v = el('button', 'mt-2 text-primary font-semibold', 'Voltar'); v.type = 'button'; v.onclick = function () { pergunta(i - 1); }; corpo.appendChild(v); }
    }

    function final() {
      corpo.textContent = '';
      var total = respostas.reduce(function (a, b) { return a + b; }, 0), max = PERGUNTAS.length * 2, r = resultado(total);
      var fracos = PERGUNTAS.map(function (p, i) { return { p: p, n: respostas[i] }; }).sort(function (a, b) { return a.n - b.n; }).slice(0, 2);
      corpo.appendChild(el('span', 'text-label-caps font-label-caps uppercase tracking-wider text-primary block pr-10', 'Seu resultado: ' + total + ' de ' + max + ' pontos'));
      corpo.appendChild(el('h2', 'text-on-secondary-fixed font-headline-md text-headline-md mt-2', r.nivel));
      corpo.appendChild(el('p', 'text-on-surface-variant font-body-md text-body-md mt-2', r.texto));
      corpo.appendChild(el('h3', 'text-on-secondary-fixed font-headline-sm text-headline-sm mt-5 mb-2', 'Por onde começar'));
      fracos.forEach(function (f) {
        var b = el('div', 'p-3.5 rounded-lg bg-surface-container-low mb-2');
        b.appendChild(el('div', 'font-semibold text-on-secondary-fixed', f.p.area));
        b.appendChild(el('p', 'text-on-surface-variant font-body-sm text-body-sm', f.p.dica));
        corpo.appendChild(b);
      });

      var form = el('form', 'mt-5 pt-5 border-t border-surface-container-high grid grid-cols-1 sm:grid-cols-2 gap-3');
      var t = el('h3', 'sm:col-span-2 text-on-secondary-fixed font-headline-sm text-headline-sm', 'Quer um plano para a sua escola?');
      form.appendChild(t);
      form.appendChild(el('p', 'sm:col-span-2 text-on-surface-variant font-body-sm text-body-sm -mt-2', 'Deixe seus dados e a equipe da Natação Criativa fala com você sobre este resultado.'));
      function campo(nome, rotulo, tipo, auto) {
        var l = el('label', 'block');
        l.appendChild(el('span', 'text-label-md font-label-md uppercase text-on-surface-variant block mb-1', rotulo));
        var i = el('input', 'w-full px-4 py-3 bg-surface-container-low rounded-lg text-on-surface outline-none focus:ring-2 focus:ring-primary-container');
        i.name = nome; i.type = tipo; i.required = true; if (auto) i.autocomplete = auto;
        l.appendChild(i); form.appendChild(l);
      }
      campo('nome', 'Seu nome', 'text', 'name');
      campo('escola', 'Escola ou academia', 'text', 'organization');
      campo('email', 'E-mail', 'email', 'email');
      campo('telefone', 'WhatsApp com DDD', 'tel', 'tel');
      var ac = el('label', 'sm:col-span-2 flex items-start gap-2 text-body-sm text-on-surface-variant');
      var cb = el('input', 'mt-1'); cb.type = 'checkbox'; cb.required = true; ac.appendChild(cb);
      var tx = el('span'); tx.appendChild(document.createTextNode('Aceito o contato da Natação Criativa e a '));
      var pl = el('a', 'underline text-primary', 'Política de Privacidade'); pl.href = '/privacidade'; pl.target = '_blank'; tx.appendChild(pl);
      ac.appendChild(tx); form.appendChild(ac);
      var msg = el('p', 'sm:col-span-2 text-body-sm text-error'); msg.setAttribute('role', 'alert'); form.appendChild(msg);
      var env = el('button', 'sm:col-span-2 ' + BTN, 'Quero meu plano'); env.type = 'submit'; form.appendChild(env);
      form.addEventListener('submit', function (e) {
        e.preventDefault(); env.disabled = true; msg.textContent = '';
        var f = form.elements;
        var linhas = PERGUNTAS.map(function (p, i) { return p.area + ': ' + p.r[respostas[i]]; });
        var mensagem = 'Escola: ' + f.escola.value.trim() + '\nWhatsApp: ' + f.telefone.value.trim() + '\nResultado: ' + total + ' de ' + max + ' (' + r.nivel + ')\n\n' + linhas.join('\n');
        fetch('/api/public/inquiries', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'consultoria_academia', name: f.nome.value, email: f.email.value, profileType: 'Gestor', subject: 'Diagnóstico de gestão: ' + total + ' de ' + max, message: mensagem }),
        }).then(function (x) { return x.json().then(function (j) { if (!x.ok) throw new Error(j.error); }); })
          .then(function () {
            form.textContent = '';
            form.appendChild(el('p', 'sm:col-span-2 font-semibold text-on-secondary-fixed', 'Recebemos seus dados! A equipe da Natação Criativa vai falar com você.'));
          })
          .catch(function (err) { msg.textContent = err.message || 'Não foi possível enviar. Tente de novo.'; env.disabled = false; });
      });
      corpo.appendChild(form);
      caixa.scrollTop = 0;
    }
    pergunta(0);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#diagnostico"]');
    if (a) { e.preventDefault(); abrir(); }
  });
  if (location.hash === '#diagnostico') abrir();
})();
