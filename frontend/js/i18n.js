/* Language handling shared by every public page. */
const RANA_I18N = (() => {
  const STORAGE_KEY = 'rana_lang';
  const SUPPORTED = ['en', 'fr'];
  const LABELS = { en: 'English', fr: 'Français' };

  function getLang() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.includes(saved) ? saved : 'en';
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);
  }

  // Pick a localized value from a { en, fr } object, falling back to English.
  function pick(field) {
    if (field == null) return '';
    if (typeof field === 'string') return field;
    return field[getLang()] || field.en || '';
  }

  function t(dict, key) {
    const lang = getLang();
    return (dict && dict[lang] && dict[lang][key]) || (dict && dict.en && dict.en[key]) || key;
  }

  function applyStaticStrings(dict) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(dict, key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', t(dict, key));
    });
  }

  function initSwitcher(dict, onChange) {
    const btn = document.querySelector('.lang-btn');
    const menu = document.querySelector('.lang-menu');
    if (!btn || !menu) return;

    menu.innerHTML = SUPPORTED.map(
      (code) => `<button type="button" data-lang="${code}" aria-current="${code === getLang()}">${LABELS[code]}</button>`
    ).join('');

    btn.querySelector('.lang-current').textContent = getLang().toUpperCase();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });
    document.addEventListener('click', () => menu.classList.remove('open'));

    menu.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        setLang(b.dataset.lang);
        menu.classList.remove('open');
        applyStaticStrings(dict);
        btn.querySelector('.lang-current').textContent = getLang().toUpperCase();
        menu.querySelectorAll('button').forEach((x) => x.setAttribute('aria-current', String(x === b)));
        if (typeof onChange === 'function') onChange(getLang());
      });
    });
  }

  return { getLang, setLang, pick, t, applyStaticStrings, initSwitcher, SUPPORTED };
})();
