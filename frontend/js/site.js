/* Shared bootstrapping for every public page: fetch site data once,
   wire up the header/footer, mobile nav, language switch, and scroll reveal. */
const RANA_SITE = (() => {
  const API_BASE = window.location.origin.replace(/\/$/, '');
  let cache = null;

  async function load() {
    if (cache) return cache;
    const res = await fetch(`${API_BASE}/api/site`);
    if (!res.ok) throw new Error('Could not load site content.');
    cache = await res.json();
    return cache;
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function formatDate(iso, lang) {
    try {
      return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch { return iso; }
  }

  function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (!toggle || !links) return;
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  function renderFooter(settings) {
    const y = document.getElementById('footer-year');
    if (y) y.textContent = new Date().getFullYear();
    const email = document.getElementById('footer-email');
    if (email && settings) { email.textContent = settings.email; email.href = `mailto:${settings.email}`; }
    const phone = document.getElementById('footer-phone');
    if (phone && settings) { phone.textContent = settings.phone; }
  }

  async function boot({ onReady } = {}) {
    initMobileNav();
    let data;
    try {
      data = await load();
    } catch (err) {
      console.error(err);
      data = null;
    }
    const lang = RANA_I18N.getLang();
    document.documentElement.setAttribute('lang', lang);
    if (data) {
      RANA_I18N.applyStaticStrings(data.ui);
      renderFooter(data.settings);
    }
    RANA_I18N.initSwitcher(data ? data.ui : { en: {}, fr: {} }, () => {
      if (typeof onReady === 'function') onReady(data, true);
    });
    initReveal();
    if (typeof onReady === 'function') onReady(data, false);
    return data;
  }

  return { load, boot, escapeHtml, formatDate };
})();
