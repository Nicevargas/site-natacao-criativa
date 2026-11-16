// Synchronizes public pages with Admin CMS updates, real form submissions,
// certificate validation, and LGPD privacy consent notice.
(function () {
  if (window.__ncSiteSyncLoaded) return;
  window.__ncSiteSyncLoaded = true;

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 1. Rewrite footer privacy/terms links that are still '#'
  function fixFooterLinks() {
    document.querySelectorAll('footer a').forEach(function (a) {
      var txt = (a.textContent || '').trim().toLowerCase();
      var href = a.getAttribute('href');
      if (!href || href === '#') {
        if (txt.indexOf('privacidade') !== -1) {
          a.setAttribute('href', '/privacidade');
        } else if (txt.indexOf('termos') !== -1 || txt.indexOf('regulamento') !== -1) {
          a.setAttribute('href', '/privacidade#termos');
        } else if (txt.indexOf('certificado') !== -1) {
          a.setAttribute('href', '/certificados');
        } else if (txt.indexOf('loja') !== -1) {
          a.setAttribute('href', '/loja');
        } else if (txt.indexOf('cardume') !== -1) {
          a.setAttribute('href', '/conteudos');
        } else if (txt.indexOf('consultoria') !== -1 || txt.indexOf('gestores') !== -1) {
          a.setAttribute('href', '/solucoes');
        } else if (txt.indexOf('portal') !== -1) {
          a.setAttribute('href', '/admin');
        }
      }
    });
  }

  // 2. Wire Cardume Criativo newsletter forms across pages
  function wireCardumeForms() {
    document.querySelectorAll('form').forEach(function (form) {
      if (form.id === 'form-contato' || form.id === 'form-validar' || form.__ncWired) return;
      var emailInput = form.querySelector('input[type="email"]');
      if (!emailInput) return;
      var parentText = (form.closest('section')?.textContent || '').toLowerCase();
      if (parentText.indexOf('cardume') === -1) return;

      form.__ncWired = true;
      form.removeAttribute('onsubmit');
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var email = (emailInput.value || '').trim();
        var selectEl = form.querySelector('select');
        var profileType = selectEl && selectEl.value ? selectEl.value : 'professor';
        var btn = form.querySelector('button[type="submit"]');
        if (!email) return;
        if (btn) btn.disabled = true;

        try {
          var res = await fetch('/api/public/cardume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              profileType: profileType,
              sourcePage: window.location.pathname || '/',
            }),
          });
          var data = await res.json();
          var noticeId = 'cardume-feedback-' + Math.random().toString(36).slice(2, 7);
          var existingFeedback = form.parentElement.querySelector('.nc-cardume-feedback');
          if (existingFeedback) existingFeedback.remove();

          var msgBox = document.createElement('div');
          msgBox.id = noticeId;
          msgBox.className =
            'nc-cardume-feedback mt-2.5 px-3.5 py-2 rounded-lg text-xs font-semibold ' +
            (res.ok ? 'bg-white/95 text-[#001c38]' : 'bg-rose-100 text-rose-900');
          msgBox.textContent = res.ok
            ? data.alreadySubscribed
              ? 'Este e-mail já faz parte do Cardume Criativo!'
              : 'Inscrição confirmada no Cardume Criativo!'
            : data.error || 'Não foi possível concluir a inscrição.';
          form.insertAdjacentElement('afterend', msgBox);
          if (res.ok) form.reset();
        } catch {
          // ignore offline error
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    });
  }

  // 3. Wire Certificate Validation (/certificados)
  function wireCertificateForm() {
    var form = document.getElementById('form-validar');
    var resultEl = document.getElementById('resultado');
    if (!form || !resultEl) return;

    var clone = form.cloneNode(true);
    form.parentNode.replaceChild(clone, form);

    clone.addEventListener('submit', async function (e) {
      e.preventDefault();
      var codeInput = document.getElementById('codigo');
      var code = (codeInput?.value || '').trim().toUpperCase();
      if (!code) return;

      resultEl.style.display = '';
      resultEl.innerHTML = 'Validando código <strong>' + escapeHtml(code) + '</strong>...';

      try {
        var res = await fetch('/api/public/certificates/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code }),
        });
        var data = await res.json();
        if (res.ok && data.valid && data.certificate) {
          var c = data.certificate;
          resultEl.className = 'mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-950 font-body-sm text-body-sm space-y-1';
          resultEl.innerHTML =
            '<div class="font-bold flex items-center gap-1.5 text-emerald-800"><span class="material-symbols-outlined text-[18px]">verified</span>Certificado Autêntico · ' +
            escapeHtml(c.validationCode) +
            '</div>' +
            '<div><strong>Titular:</strong> ' + escapeHtml(c.recipientName) + '</div>' +
            '<div><strong>Formação:</strong> ' + escapeHtml(c.courseTitle) + ' (' + escapeHtml(c.workloadHours) + 'h)</div>' +
            '<div><strong>Emissão:</strong> ' + escapeHtml(c.issuedAt) + ' · ' + escapeHtml(c.chancelaInfo) + '</div>';
        } else {
          resultEl.className = 'mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-950 font-body-sm text-body-sm';
          resultEl.innerHTML =
            '<strong>Código não localizado ou inválido (' +
            escapeHtml(code) +
            ').</strong> Confira os caracteres ou <a class="text-primary font-semibold underline" href="/atendimento">fale com o atendimento</a>.';
        }
      } catch {
        resultEl.className = 'mt-4 rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-900 font-body-sm text-body-sm';
        resultEl.textContent = 'Erro ao consultar validação agora. Tente novamente em instantes.';
      }
    });
  }

  // 4. Wire Atendimento form (/atendimento) to persist inquiries in Admin
  function wireAtendimentoForm() {
    var form = document.getElementById('form-contato');
    if (!form) return;

    var clone = form.cloneNode(true);
    form.parentNode.replaceChild(clone, form);

    // Ensure email field exists or inject cleanly if not present
    if (!clone.querySelector('input[name="email"]')) {
      var emailWrap = document.createElement('label');
      emailWrap.className = 'block sm:col-span-2';
      emailWrap.innerHTML =
        '<span class="text-label-md font-label-md uppercase text-on-surface-variant block mb-1.5">Seu e-mail para retorno</span>' +
        '<input class="w-full px-4 py-3 bg-surface-container-low rounded-lg text-on-surface font-body-md text-body-md outline-none placeholder:text-outline focus:ring-2 focus:ring-primary-container transition-all" name="email" placeholder="seuemail@exemplo.com.br" required type="email"/>';
      var assuntoEl = clone.querySelector('[name="assunto"]')?.closest('label');
      if (assuntoEl) clone.insertBefore(emailWrap, assuntoEl);
    }

    clone.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(clone);
      var btn = clone.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        var res = await fetch('/api/public/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fd.get('nome'),
            email: fd.get('email'),
            profileType: fd.get('perfil'),
            subject: fd.get('assunto'),
            message: fd.get('mensagem'),
            type: 'suporte',
          }),
        });
        var prevStatus = clone.parentElement.querySelector('.nc-inquiry-status');
        if (prevStatus) prevStatus.remove();

        var box = document.createElement('div');
        box.className =
          'nc-inquiry-status mt-4 p-4 rounded-xl text-sm font-medium ' +
          (res.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900');
        box.textContent = res.ok
          ? 'Mensagem registrada com sucesso! Nossa equipe recebeu seu pedido no painel de atendimento e responderá em breve.'
          : 'Não foi possível enviar sua mensagem. Tente novamente.';
        clone.insertAdjacentElement('afterend', box);
        if (res.ok) clone.reset();
      } catch {
        // ignore
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // 5. Hydrate live CMS settings & highlights from /api/public/site
  function hydrateSiteData(data) {
    if (!data) return;
    var settings = data.settings || {};

    // Sync contact email across mailto links and explicit email text nodes
    if (settings.contactEmail) {
      document.querySelectorAll('a[href^="mailto:contato@"]').forEach(function (a) {
        a.href = 'mailto:' + settings.contactEmail;
        if (a.textContent.indexOf('@') !== -1) a.textContent = settings.contactEmail;
      });
      document.querySelectorAll('footer strong, footer span').forEach(function (el) {
        if (el.children.length === 0 && (el.textContent || '').trim() === 'contato@natacaocriativa.com.br') {
          el.textContent = settings.contactEmail;
        }
      });
    }

    // Hydrate Home hero highlights & trajectory counters if on '/'
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      if (Array.isArray(data.highlights)) {
        data.highlights.slice(0, 3).forEach(function (hl, i) {
          var slide = document.getElementById('slide-' + i);
          if (!slide) return;
          var h1 = slide.querySelector('h1, h2');
          var p = slide.querySelector('p');
          var badge = slide.querySelector('.inline-flex span.uppercase');
          var cta = slide.querySelector('a[href]');
          if (h1 && hl.title) h1.textContent = hl.title;
          if (p && hl.subtitle) p.textContent = hl.subtitle;
          if (badge && hl.badge) badge.textContent = hl.badge;
          if (cta && hl.ctaUrl) {
            cta.setAttribute('href', hl.ctaUrl);
            if (hl.ctaLabel && cta.firstChild && cta.firstChild.nodeType === 3) {
              cta.firstChild.textContent = hl.ctaLabel + ' ';
            }
          }
        });
      }

      // Replace [n] trajectory placeholders with live CMS numbers
      var metricsMap = {
        'EXPERIÊNCIA': settings.experienceYears,
        'CERTIFICADOS': settings.certificatesIssued,
        'ALUNOS': settings.studentsImpacted,
        'E-BOOKS': settings.ebooksPublished,
        'CURSOS': settings.coursesAvailable,
      };
      document.querySelectorAll('section span').forEach(function (el) {
        if ((el.textContent || '').trim() === '[n]' && el.parentElement) {
          var labelText = (el.parentElement.textContent || '').toUpperCase();
          Object.keys(metricsMap).forEach(function (key) {
            if (labelText.indexOf(key) !== -1 && metricsMap[key] !== undefined) {
              var num = Number(metricsMap[key]);
              el.textContent = num >= 1000 ? '+' + num.toLocaleString('pt-BR') : String(num);
            }
          });
        }
      });
    }

    // Render LGPD privacy banner if consent not yet saved
    showLgpdIfNeeded(data.privacyPolicy);
  }

  // 6. LGPD Privacy Notice Banner (compact bottom-left, never overlaps bottom-right mascot)
  function showLgpdIfNeeded(privacyPolicy, force) {
    try {
      if (!force && localStorage.getItem('nc_lgpd_consent')) return;
    } catch {
      return;
    }
    var existing = document.getElementById('nc-lgpd-banner');
    if (existing) existing.remove();

    var text =
      (privacyPolicy && privacyPolicy.cookieBannerText) ||
      'Utilizamos cookies essenciais e dados estritamente necessários conforme a LGPD para o funcionamento da Plataforma Natação Criativa.';

    var banner = document.createElement('div');
    banner.id = 'nc-lgpd-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Aviso de Privacidade LGPD');
    banner.style.cssText =
      'position:fixed;left:16px;bottom:16px;z-index:9990;max-width:380px;width:calc(100vw - 108px);background:#001c38;color:#ffffff;padding:14px 16px;border-radius:14px;box-shadow:0 12px 30px rgba(0,28,56,0.32);font-family:Inter,system-ui,sans-serif;font-size:12px;line-height:1.45;';
    banner.innerHTML =
      '<div style="font-weight:700;margin-bottom:4px;font-family:\'Plus Jakarta Sans\',sans-serif;">Privacidade e Cookies (LGPD)</div>' +
      '<p style="margin:0 0 10px 0;color:#d3e4ff;">' +
      escapeHtml(text) +
      '</p>' +
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">' +
      '<button id="nc-lgpd-accept" type="button" style="background:#0074da;color:#fff;border:0;border-radius:8px;padding:7px 12px;font-weight:700;font-size:12px;cursor:pointer;">Aceitar e continuar</button>' +
      '<a href="/privacidade" style="color:#a9c9f7;text-decoration:underline;font-size:12px;font-weight:600;">Política de Privacidade</a>' +
      '</div>';

    document.body.appendChild(banner);
    document.getElementById('nc-lgpd-accept').addEventListener('click', function () {
      try {
        localStorage.setItem('nc_lgpd_consent', JSON.stringify({ accepted: true, at: new Date().toISOString() }));
      } catch {}
      banner.remove();
    });
  }

  window.showLgpdBanner = function () {
    showLgpdIfNeeded(null, true);
  };

  function init() {
    fixFooterLinks();
    wireCardumeForms();
    wireCertificateForm();
    wireAtendimentoForm();

    fetch('/api/public/site')
      .then(function (r) { return r.json(); })
      .then(hydrateSiteData)
      .catch(function () {
        showLgpdIfNeeded(null);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
