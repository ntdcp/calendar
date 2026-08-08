/* RANA admin dashboard: settings, about, and CRUD for projects/partners/news/faqs. */
(function () {
  const token = localStorage.getItem('rana_admin_token');
  if (!token) { window.location.href = 'login.html'; return; }

  const root = document.getElementById('panel-root');
  const titleEl = document.getElementById('panel-title');
  const toastEl = document.getElementById('toast');
  document.getElementById('admin-username').textContent = localStorage.getItem('rana_admin_username') || 'admin';

  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('rana_admin_token');
    localStorage.removeItem('rana_admin_username');
    window.location.href = 'login.html';
  });

  function toast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => { toastEl.className = 'toast'; }, 2600);
  }

  async function api(path, opts = {}) {
    const res = await fetch(`/api${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('rana_admin_token')}`,
        ...(opts.headers || {})
      }
    });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('rana_admin_token');
      window.location.href = 'login.html';
      throw new Error('Session expired.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- Generic form value collection: reads every [data-field] element
  // and rebuilds a nested object from its dot-path (numeric segments -> array). ----
  function collectForm(container) {
    const out = {};
    container.querySelectorAll('[data-field]').forEach((el) => {
      const path = el.dataset.field.split('.');
      let cursor = out;
      path.forEach((seg, i) => {
        const isLast = i === path.length - 1;
        const key = /^\d+$/.test(seg) ? Number(seg) : seg;
        if (isLast) {
          cursor[key] = el.value;
        } else {
          const nextSeg = path[i + 1];
          const nextIsArray = /^\d+$/.test(nextSeg);
          if (cursor[key] === undefined) cursor[key] = nextIsArray ? [] : {};
          cursor = cursor[key];
        }
      });
    });
    return out;
  }

  function bilingual(fieldPath, value, opts = {}) {
    const v = value || {};
    const tag = opts.multiline ? 'textarea' : 'input';
    const attrs = opts.multiline ? '' : 'type="text"';
    return `
      <div class="field">
        <label>${esc(opts.label || '')}</label>
        <div class="lang-tabs" data-langtabs>
          <button type="button" class="lang-tab" data-lang-tab="en" aria-pressed="true">EN</button>
          <button type="button" class="lang-tab" data-lang-tab="fr" aria-pressed="false">FR</button>
        </div>
        <div class="lang-pane" data-lang-pane="en">
          <${tag} ${attrs} data-field="${fieldPath}.en" data-lang="en">${opts.multiline ? esc(v.en || '') : ''}</${tag}>
        </div>
        <div class="lang-pane" data-lang-pane="fr" hidden>
          <${tag} ${attrs} data-field="${fieldPath}.fr" data-lang="fr">${opts.multiline ? esc(v.fr || '') : ''}</${tag}>
        </div>
      </div>`;
  }

  function wireLangTabs(container) {
    container.querySelectorAll('[data-langtabs]').forEach((tabs) => {
      const field = tabs.closest('.field');
      tabs.querySelectorAll('.lang-tab').forEach((btn) => {
        btn.addEventListener('click', () => {
          const lang = btn.dataset.langTab;
          tabs.querySelectorAll('.lang-tab').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
          field.querySelectorAll('[data-lang-pane]').forEach((pane) => {
            pane.hidden = pane.dataset.langPane !== lang;
          });
        });
      });
    });
    // Set non-multiline input values after insertion (avoids HTML-escaping issues with value attr)
  }

  function setInputValues(container, values) {
    Object.entries(values).forEach(([field, val]) => {
      const el = container.querySelector(`[data-field="${field}"]`);
      if (el && el.tagName === 'INPUT') el.value = val;
    });
  }

  // =========================================================
  // Panels
  // =========================================================
  const panels = {};

  // ---- Settings ----
  panels.settings = async () => {
    const settings = await api('/settings');
    root.innerHTML = `
      <div class="admin-card">
        <h3>General</h3>
        <div class="field-row">
          <div class="field"><label>Email</label><input data-field="email" value="${esc(settings.email)}"></div>
          <div class="field"><label>Phone</label><input data-field="phone" value="${esc(settings.phone)}"></div>
        </div>
        <div class="field"><label>Office address</label><input data-field="address" value="${esc(settings.address)}"></div>
        ${bilingual('tagline', settings.tagline, { label: 'Homepage tagline' })}
      </div>
      <div class="admin-card">
        <h3>Stats strip (shown on the homepage)</h3>
        <div id="stats-editor"></div>
        <button class="btn btn-outline btn-sm" id="add-stat" type="button">${'+'} Add stat</button>
      </div>
      <button class="btn btn-primary" id="save-settings">Save changes</button>
    `;
    root.querySelector('[data-field="tagline.en"]').value = settings.tagline.en;
    root.querySelector('[data-field="tagline.fr"]').value = settings.tagline.fr;
    wireLangTabs(root);

    let stats = JSON.parse(JSON.stringify(settings.stats || []));
    function paintStats() {
      document.getElementById('stats-editor').innerHTML = stats.map((s, i) => `
        <div class="field-row" style="align-items:end; margin-bottom:10px;">
          <div class="field" style="margin-bottom:0;">
            <label>Value</label>
            <input data-field="stats.${i}.value" value="${esc(s.value)}">
          </div>
          <div class="field" style="margin-bottom:0;">
            <label>Label (EN)</label>
            <input data-field="stats.${i}.label.en" value="${esc(s.label.en)}">
          </div>
          <div class="field" style="margin-bottom:0;">
            <label>Label (FR)</label>
            <input data-field="stats.${i}.label.fr" value="${esc(s.label.fr)}">
          </div>
          <button class="btn btn-outline btn-sm" type="button" data-remove-stat="${i}">Remove</button>
        </div>`).join('') || '<p class="field-hint">No stats yet.</p>';

      document.querySelectorAll('[data-remove-stat]').forEach((b) => {
        b.addEventListener('click', () => {
          stats.splice(Number(b.dataset.removeStat), 1);
          paintStats();
        });
      });
    }
    paintStats();

    document.getElementById('add-stat').addEventListener('click', () => {
      stats.push({ value: '0', label: { en: '', fr: '' } });
      paintStats();
    });

    document.getElementById('save-settings').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const form = collectForm(root);
        const payload = { ...settings, ...form, stats: form.stats || [] };
        await api('/settings', { method: 'PUT', body: JSON.stringify(payload) });
        toast('Settings saved.');
      } catch (err) {
        toast(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });
  };

  // ---- About ----
  panels.about = async () => {
    const about = await api('/about');
    // About has two full localized blocks (en / fr) rather than field-level bilingual pairs,
    // so we build two language panes with matching fields, toggled by a tab pair.
    root.innerHTML = `
      <div class="admin-card">
        <div class="lang-tabs" data-langtabs style="margin-bottom:18px;">
          <button type="button" class="lang-tab" data-lang-tab="en" aria-pressed="true">EN</button>
          <button type="button" class="lang-tab" data-lang-tab="fr" aria-pressed="false">FR</button>
        </div>
        <div data-lang-pane="en">
          <div class="field"><label>Heading</label><input data-field="en.heading" value="${esc(about.en.heading)}"></div>
          <div class="field"><label>Intro paragraph</label><textarea data-field="en.intro">${esc(about.en.intro)}</textarea></div>
          <div class="field"><label>Mission</label><textarea data-field="en.mission">${esc(about.en.mission)}</textarea></div>
          <div class="field"><label>Vision</label><textarea data-field="en.vision">${esc(about.en.vision)}</textarea></div>
        </div>
        <div data-lang-pane="fr" hidden>
          <div class="field"><label>Heading</label><input data-field="fr.heading" value="${esc(about.fr.heading)}"></div>
          <div class="field"><label>Intro paragraph</label><textarea data-field="fr.intro">${esc(about.fr.intro)}</textarea></div>
          <div class="field"><label>Mission</label><textarea data-field="fr.mission">${esc(about.fr.mission)}</textarea></div>
          <div class="field"><label>Vision</label><textarea data-field="fr.vision">${esc(about.fr.vision)}</textarea></div>
        </div>
      </div>

      <div class="admin-card">
        <h3>Values (EN)</h3>
        <div id="values-en"></div>
        <button class="btn btn-outline btn-sm" id="add-value-en" type="button">+ Add value</button>
      </div>
      <div class="admin-card">
        <h3>Values (FR)</h3>
        <div id="values-fr"></div>
        <button class="btn btn-outline btn-sm" id="add-value-fr" type="button">+ Add value</button>
      </div>
      <div class="admin-card">
        <h3>Timeline (EN)</h3>
        <div id="timeline-en"></div>
        <button class="btn btn-outline btn-sm" id="add-timeline-en" type="button">+ Add row</button>
      </div>
      <div class="admin-card">
        <h3>Timeline (FR)</h3>
        <div id="timeline-fr"></div>
        <button class="btn btn-outline btn-sm" id="add-timeline-fr" type="button">+ Add row</button>
      </div>
      <button class="btn btn-primary" id="save-about">Save changes</button>
    `;

    // language tab toggling for the top text block
    root.querySelectorAll('[data-langtabs]')[0].querySelectorAll('.lang-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.langTab;
        root.querySelectorAll('[data-langtabs]')[0].querySelectorAll('.lang-tab').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        root.querySelectorAll('[data-lang-pane]').forEach((p) => { if (p.dataset.langPane) p.hidden = p.dataset.langPane !== lang; });
      });
    });

    let values = { en: JSON.parse(JSON.stringify(about.en.values)), fr: JSON.parse(JSON.stringify(about.fr.values)) };
    let timeline = { en: JSON.parse(JSON.stringify(about.en.timeline)), fr: JSON.parse(JSON.stringify(about.fr.timeline)) };

    function paintValues(lang) {
      document.getElementById(`values-${lang}`).innerHTML = values[lang].map((v, i) => `
        <div class="field-row" style="margin-bottom:10px;">
          <div class="field" style="margin-bottom:0;"><label>Title</label><input data-field="__values_${lang}.${i}.title" value="${esc(v.title)}"></div>
          <div class="field" style="margin-bottom:0;"><label>Text</label><input data-field="__values_${lang}.${i}.text" value="${esc(v.text)}"></div>
        </div>
        <button class="btn btn-outline btn-sm" type="button" data-rm="${lang}-val-${i}" style="margin-bottom:14px;">Remove</button>`).join('') || '<p class="field-hint">None yet.</p>';
      wireRemovers();
    }
    function paintTimeline(lang) {
      document.getElementById(`timeline-${lang}`).innerHTML = timeline[lang].map((v, i) => `
        <div class="field-row" style="margin-bottom:10px;">
          <div class="field" style="margin-bottom:0;"><label>Year</label><input data-field="__timeline_${lang}.${i}.year" value="${esc(v.year)}"></div>
          <div class="field" style="margin-bottom:0;"><label>Text</label><input data-field="__timeline_${lang}.${i}.text" value="${esc(v.text)}"></div>
        </div>
        <button class="btn btn-outline btn-sm" type="button" data-rm="${lang}-tl-${i}" style="margin-bottom:14px;">Remove</button>`).join('') || '<p class="field-hint">None yet.</p>';
      wireRemovers();
    }
    function wireRemovers() {
      root.querySelectorAll('[data-rm]').forEach((b) => {
        b.onclick = () => {
          const [lang, kind, idx] = b.dataset.rm.split('-');
          if (kind === 'val') { values[lang].splice(Number(idx), 1); paintValues(lang); }
          else { timeline[lang].splice(Number(idx), 1); paintTimeline(lang); }
        };
      });
    }
    ['en', 'fr'].forEach((lang) => { paintValues(lang); paintTimeline(lang); });

    document.getElementById('add-value-en').addEventListener('click', () => { values.en.push({ title: '', text: '' }); paintValues('en'); });
    document.getElementById('add-value-fr').addEventListener('click', () => { values.fr.push({ title: '', text: '' }); paintValues('fr'); });
    document.getElementById('add-timeline-en').addEventListener('click', () => { timeline.en.push({ year: '', text: '' }); paintTimeline('en'); });
    document.getElementById('add-timeline-fr').addEventListener('click', () => { timeline.fr.push({ year: '', text: '' }); paintTimeline('fr'); });

    document.getElementById('save-about').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const form = collectForm(root);
        const payload = {
          en: { ...about.en, ...form.en, values: values.en, timeline: timeline.en },
          fr: { ...about.fr, ...form.fr, values: values.fr, timeline: timeline.fr }
        };
        await api('/about', { method: 'PUT', body: JSON.stringify(payload) });
        toast('About page saved.');
      } catch (err) {
        toast(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });
  };

  // ---- Generic collection panel (projects / partners / news / faqs) ----
  function collectionPanel(name, config) {
    return async () => {
      const items = await api(`/${name}`);
      root.innerHTML = `
        <div class="admin-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <h3 style="margin:0;">${config.title}</h3>
            <button class="btn btn-gold btn-sm" id="add-item" type="button">+ Add new</button>
          </div>
          <div id="form-slot"></div>
          <div id="list-slot"></div>
        </div>
      `;
      const listSlot = document.getElementById('list-slot');
      const formSlot = document.getElementById('form-slot');

      function paintList() {
        listSlot.innerHTML = items.length ? items.map((item) => `
          <div class="admin-list-item">
            <div>
              <strong>${esc(config.label(item))}</strong>
              <div class="field-hint">${esc(config.sub ? config.sub(item) : '')}</div>
            </div>
            <div class="admin-list-actions">
              <button class="btn btn-outline btn-sm" data-edit="${item.id}" type="button">Edit</button>
              <button class="btn btn-danger btn-sm" data-del="${item.id}" type="button">Delete</button>
            </div>
          </div>`).join('') : '<div class="empty-state">Nothing here yet — add the first one.</div>';

        listSlot.querySelectorAll('[data-edit]').forEach((b) => {
          b.addEventListener('click', () => openForm(items.find((i) => i.id === b.dataset.edit)));
        });
        listSlot.querySelectorAll('[data-del]').forEach((b) => {
          b.addEventListener('click', async () => {
            if (!confirm('Delete this item? This cannot be undone.')) return;
            try {
              await api(`/${name}/${b.dataset.del}`, { method: 'DELETE' });
              const idx = items.findIndex((i) => i.id === b.dataset.del);
              items.splice(idx, 1);
              paintList();
              toast('Deleted.');
            } catch (err) { toast(err.message, true); }
          });
        });
      }

      function openForm(item) {
        formSlot.innerHTML = `<div class="admin-card" style="background:var(--paper-dim);">
          <h3>${item ? 'Edit' : 'Add'} ${config.singular}</h3>
          <div id="dynamic-fields"></div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-primary btn-sm" id="save-item" type="button">Save changes</button>
            <button class="btn btn-outline btn-sm" id="cancel-item" type="button">Cancel</button>
          </div>
        </div>`;
        const fieldsRoot = document.getElementById('dynamic-fields');
        fieldsRoot.innerHTML = config.renderFields(item || {});
        wireLangTabs(fieldsRoot);
        if (item) config.setValues && config.setValues(fieldsRoot, item);

        document.getElementById('cancel-item').addEventListener('click', () => { formSlot.innerHTML = ''; });
        document.getElementById('save-item').addEventListener('click', async (btnEvt) => {
          const btn = btnEvt.currentTarget;
          btn.disabled = true;
          try {
            const payload = collectForm(fieldsRoot);
            let saved;
            if (item) {
              saved = await api(`/${name}/${item.id}`, { method: 'PUT', body: JSON.stringify(payload) });
              Object.assign(item, saved);
            } else {
              saved = await api(`/${name}`, { method: 'POST', body: JSON.stringify(payload) });
              items.unshift(saved);
            }
            paintList();
            formSlot.innerHTML = '';
            toast('Saved.');
          } catch (err) {
            toast(err.message, true);
          } finally {
            btn.disabled = false;
          }
        });
      }

      document.getElementById('add-item').addEventListener('click', () => openForm(null));
      paintList();
    };
  }

  panels.projects = collectionPanel('projects', {
    title: 'Projects', singular: 'project',
    label: (p) => (p.title && p.title.en) || 'Untitled',
    sub: (p) => `${p.category} · ${p.status} · ${p.location}`,
    renderFields: (p) => `
      ${bilingual('title', p.title, { label: 'Title' })}
      <div class="field-row">
        <div class="field"><label>Category</label>
          <select data-field="category">
            ${['water', 'roads', 'sanitation', 'civil'].map((c) => `<option value="${c}" ${p.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Status</label>
          <select data-field="status">
            ${['completed', 'ongoing', 'planned'].map((c) => `<option value="${c}" ${p.status === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field"><label>Location</label><input data-field="location" value="${esc(p.location || '')}"></div>
        <div class="field"><label>Year</label><input data-field="year" value="${esc(p.year || '')}"></div>
      </div>
      <div class="field"><label>Card color</label>
        <select data-field="image">
          ${[1,2,3,4,5,6].map((n) => `<option value="gradient-${n}" ${p.image === `gradient-${n}` ? 'selected' : ''}>Palette ${n}</option>`).join('')}
        </select>
      </div>
      ${bilingual('description', p.description, { label: 'Description', multiline: true })}
    `,
    setValues: (root, p) => {
      root.querySelector('[data-field="title.en"]').value = p.title.en;
      root.querySelector('[data-field="title.fr"]').value = p.title.fr;
    }
  });

  panels.partners = collectionPanel('partners', {
    title: 'Partners', singular: 'partner',
    label: (p) => p.name,
    sub: (p) => p.type,
    renderFields: (p) => `
      <div class="field"><label>Name</label><input data-field="name" value="${esc(p.name || '')}"></div>
      <div class="field"><label>Type</label><input data-field="type" value="${esc(p.type || '')}" placeholder="Government, Donor, NGO…"></div>
      <div class="field"><label>Website</label><input data-field="website" value="${esc(p.website || '')}"></div>
    `
  });

  panels.news = collectionPanel('news', {
    title: 'News &amp; Events', singular: 'story',
    label: (n) => (n.title && n.title.en) || 'Untitled',
    sub: (n) => `${n.date} · ${n.category}`,
    renderFields: (n) => `
      ${bilingual('title', n.title, { label: 'Title' })}
      <div class="field-row">
        <div class="field"><label>Date</label><input type="date" data-field="date" value="${esc(n.date || '')}"></div>
        <div class="field"><label>Category</label>
          <select data-field="category">
            <option value="news" ${n.category === 'news' ? 'selected' : ''}>News</option>
            <option value="event" ${n.category === 'event' ? 'selected' : ''}>Event</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Card color</label>
        <select data-field="image">
          ${[1,2,3,4,5,6].map((i) => `<option value="gradient-${i}" ${n.image === `gradient-${i}` ? 'selected' : ''}>Palette ${i}</option>`).join('')}
        </select>
      </div>
      ${bilingual('excerpt', n.excerpt, { label: 'Short excerpt', multiline: true })}
      ${bilingual('body', n.body, { label: 'Full story', multiline: true })}
    `,
    setValues: (root, n) => {
      root.querySelector('[data-field="title.en"]').value = n.title.en;
      root.querySelector('[data-field="title.fr"]').value = n.title.fr;
    }
  });

  panels.faqs = collectionPanel('faqs', {
    title: 'FAQs', singular: 'question',
    label: (f) => (f.question && f.question.en) || 'Untitled',
    sub: () => '',
    renderFields: (f) => `
      ${bilingual('question', f.question, { label: 'Question' })}
      ${bilingual('answer', f.answer, { label: 'Answer', multiline: true })}
    `,
    setValues: (root, f) => {
      root.querySelector('[data-field="question.en"]').value = f.question.en;
      root.querySelector('[data-field="question.fr"]').value = f.question.fr;
    }
  });

  // ---- Account ----
  panels.account = async () => {
    root.innerHTML = `
      <div class="admin-card" style="max-width:440px;">
        <h3>Change password</h3>
        <div class="field"><label>Current password</label><input type="password" id="cur-pass"></div>
        <div class="field"><label>New password</label><input type="password" id="new-pass"></div>
        <button class="btn btn-primary" id="change-pass">Update password</button>
      </div>
    `;
    document.getElementById('change-pass').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await api('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({
            currentPassword: document.getElementById('cur-pass').value,
            newPassword: document.getElementById('new-pass').value
          })
        });
        toast('Password updated.');
        document.getElementById('cur-pass').value = '';
        document.getElementById('new-pass').value = '';
      } catch (err) {
        toast(err.message, true);
      } finally {
        btn.disabled = false;
      }
    });
  };

  const titles = {
    settings: 'Site settings', about: 'About page', projects: 'Projects',
    partners: 'Partners', news: 'News &amp; Events', faqs: 'FAQs', account: 'Account'
  };

  async function showPanel(name) {
    document.querySelectorAll('.admin-nav-btn[data-panel]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.panel === name)));
    titleEl.textContent = titles[name];
    root.innerHTML = '<p class="field-hint">Loading…</p>';
    try {
      await panels[name]();
    } catch (err) {
      root.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    }
  }

  document.querySelectorAll('.admin-nav-btn[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => showPanel(btn.dataset.panel));
  });

  showPanel('settings');
})();
