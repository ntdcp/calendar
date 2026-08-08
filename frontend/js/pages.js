/* Page-specific rendering. Dispatches on document.body.dataset.page. */
(function () {
  const { pick, t } = RANA_I18N;
  const { escapeHtml, formatDate } = RANA_SITE;

  function statusTag(status, ui) {
    const map = { completed: 'status_completed', ongoing: 'status_ongoing', planned: 'status_planned' };
    return `<span class="tag tag-${status}">${t(ui, map[status] || 'status_planned')}</span>`;
  }

  function projectCard(p, ui) {
    return `
      <article class="card reveal">
        <div class="card-media ${p.image}"></div>
        <div class="card-body">
          <div class="card-tags">${statusTag(p.status, ui)}<span class="tag">${escapeHtml(p.location)}</span></div>
          <h3>${escapeHtml(pick(p.title))}</h3>
          <p>${escapeHtml(pick(p.description)).slice(0, 110)}${pick(p.description).length > 110 ? '…' : ''}</p>
          <a class="card-link" href="project.html?id=${p.id}">${t(ui, 'view_project')} →</a>
        </div>
      </article>`;
  }

  function newsCard(n, ui, lang) {
    return `
      <article class="card reveal">
        <div class="card-media ${n.image}"></div>
        <div class="card-body">
          <div class="news-date">${formatDate(n.date, lang)}</div>
          <h3>${escapeHtml(pick(n.title))}</h3>
          <p>${escapeHtml(pick(n.excerpt))}</p>
          <a class="card-link" href="article.html?id=${n.id}">${t(ui, 'read_more')} →</a>
        </div>
      </article>`;
  }

  function renderHome(data) {
    const { ui, settings, projects, partners, news } = data;
    const lang = RANA_I18N.getLang();

    document.getElementById('hero-tagline').textContent = pick(settings.tagline);

    const statsWrap = document.getElementById('hero-stats');
    if (statsWrap) {
      statsWrap.innerHTML = settings.stats.map((s) => `
        <div class="hero-stat-row">
          <span class="hero-stat-label">${escapeHtml(pick(s.label))}</span>
          <span class="hero-stat-value">${escapeHtml(s.value)}</span>
        </div>`).join('');
    }

    const statGrid = document.getElementById('stats-grid');
    if (statGrid) {
      statGrid.innerHTML = settings.stats.map((s) => `
        <div class="reveal">
          <div class="stat-value">${escapeHtml(s.value)}</div>
          <div class="stat-label">${escapeHtml(pick(s.label))}</div>
        </div>`).join('');
    }

    const featured = document.getElementById('featured-projects');
    if (featured) featured.innerHTML = projects.slice(0, 3).map((p) => projectCard(p, ui)).join('');

    const partnerStrip = document.getElementById('partner-strip');
    if (partnerStrip) {
      partnerStrip.innerHTML = partners.slice(0, 8).map((p) => `
        <div class="partner-card reveal">
          <div class="partner-mark">${escapeHtml(p.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}</div>
          <h4>${escapeHtml(p.name)}</h4>
          <span class="partner-type">${escapeHtml(p.type)}</span>
        </div>`).join('');
    }

    const newsGrid = document.getElementById('home-news');
    if (newsGrid) newsGrid.innerHTML = news.slice(0, 3).map((n) => newsCard(n, ui, lang)).join('');

    const ce = document.getElementById('contact-email');
    const cp = document.getElementById('contact-phone');
    const ca = document.getElementById('contact-address');
    if (ce) ce.textContent = settings.email;
    if (cp) cp.textContent = settings.phone;
    if (ca) ca.textContent = settings.address;
  }

  function renderAbout(data) {
    const { about } = data;
    const a = about[RANA_I18N.getLang()] || about.en;
    document.getElementById('about-heading').textContent = a.heading;
    document.getElementById('about-intro').textContent = a.intro;
    document.getElementById('about-mission').textContent = a.mission;
    document.getElementById('about-vision').textContent = a.vision;

    document.getElementById('about-values').innerHTML = a.values.map((v) => `
      <div class="value-card reveal">
        <h3>${escapeHtml(v.title)}</h3>
        <p>${escapeHtml(v.text)}</p>
      </div>`).join('');

    document.getElementById('about-timeline').innerHTML = a.timeline.map((row) => `
      <div class="timeline-row reveal">
        <div class="timeline-year">${escapeHtml(row.year)}</div>
        <div>${escapeHtml(row.text)}</div>
      </div>`).join('');
  }

  function renderProjects(data) {
    const { ui, projects } = data;
    const grid = document.getElementById('projects-grid');
    const filterRow = document.getElementById('project-filters');
    const categories = ['all', 'water', 'roads', 'sanitation', 'civil'];
    let active = 'all';

    function paint() {
      const list = active === 'all' ? projects : projects.filter((p) => p.category === active);
      grid.innerHTML = list.length
        ? list.map((p) => projectCard(p, ui)).join('')
        : `<div class="empty-state">${t(ui, 'empty_projects')}</div>`;
      RANA_SITE_lateReveal();
    }

    filterRow.innerHTML = categories.map((c) => `
      <button class="filter-btn" data-cat="${c}" aria-pressed="${c === 'all'}">${t(ui, 'filter_' + c)}</button>`).join('');
    filterRow.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        active = btn.dataset.cat;
        filterRow.querySelectorAll('.filter-btn').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        paint();
      });
    });
    paint();
  }

  function renderProjectDetail(data) {
    const { ui, projects } = data;
    const id = new URLSearchParams(location.search).get('id');
    const p = projects.find((x) => x.id === id) || projects[0];
    if (!p) return;
    document.getElementById('project-media').className = `card-media ${p.image}`;
    document.getElementById('project-title').textContent = pick(p.title);
    document.getElementById('project-desc').textContent = pick(p.description);
    document.getElementById('project-location').textContent = p.location;
    document.getElementById('project-year').textContent = p.year;
    document.getElementById('project-status').innerHTML = statusTag(p.status, ui);
  }

  function renderPartners(data) {
    const { partners } = data;
    document.getElementById('partners-grid').innerHTML = partners.map((p) => `
      <div class="partner-card reveal">
        <div class="partner-mark">${escapeHtml(p.name.split(' ').map((w) => w[0]).slice(0, 2).join(''))}</div>
        <h4>${escapeHtml(p.name)}</h4>
        <span class="partner-type">${escapeHtml(p.type)}</span>
      </div>`).join('');
  }

  function renderNews(data) {
    const { ui, news } = data;
    const lang = RANA_I18N.getLang();
    const grid = document.getElementById('news-grid');
    grid.innerHTML = news.length ? news.map((n) => newsCard(n, ui, lang)).join('')
      : `<div class="empty-state">${t(ui, 'empty_news')}</div>`;
  }

  function renderArticle(data) {
    const { news } = data;
    const lang = RANA_I18N.getLang();
    const id = new URLSearchParams(location.search).get('id');
    const n = news.find((x) => x.id === id) || news[0];
    if (!n) return;
    document.getElementById('article-media').className = `card-media ${n.image}`;
    document.getElementById('article-title').textContent = pick(n.title);
    document.getElementById('article-date').textContent = formatDate(n.date, lang);
    document.getElementById('article-body').innerHTML = `<p>${escapeHtml(pick(n.body)).replace(/\n+/g, '</p><p>')}</p>`;
  }

  function renderFaqs(data) {
    const { faqs } = data;
    const list = document.getElementById('faq-list');
    list.innerHTML = faqs.map((f, i) => `
      <div class="faq-item reveal" data-open="${i === 0}">
        <button class="faq-q" aria-expanded="${i === 0}">
          <span>${escapeHtml(pick(f.question))}</span><span class="icon">+</span>
        </button>
        <div class="faq-a"><p>${escapeHtml(pick(f.answer))}</p></div>
      </div>`).join('');
    list.querySelectorAll('.faq-item').forEach((item) => {
      const btn = item.querySelector('.faq-q');
      btn.addEventListener('click', () => {
        const open = item.getAttribute('data-open') === 'true';
        item.setAttribute('data-open', String(!open));
        btn.setAttribute('aria-expanded', String(!open));
      });
    });
  }

  function RANA_SITE_lateReveal() {
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight) el.classList.add('in');
      else el.classList.add('in'); // filtered content should just appear
    });
  }

  const renderers = {
    home: renderHome,
    about: renderAbout,
    projects: renderProjects,
    project: renderProjectDetail,
    partners: renderPartners,
    news: renderNews,
    article: renderArticle,
    faqs: renderFaqs
  };

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    RANA_SITE.boot({
      onReady: (data) => {
        if (!data) return;
        const fn = renderers[page];
        if (fn) fn(data);
      }
    });
  });
})();
