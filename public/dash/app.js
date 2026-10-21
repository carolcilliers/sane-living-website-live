/* Sane Living — Team Dashboard (custom, single page)
   Content sections save to /content/*.json via /api/dash-save.
   Events live in Airtable and are managed via /api/dash-events. */
(function () {
  'use strict';

  /* ---------------- helpers ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  var toastTimer = null;
  function toast(msg, isErr) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = isErr ? 'err show' : 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, 4200);
  }
  async function api(path, options) {
    var resp = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {}));
    var data = {};
    try { data = await resp.json(); } catch (e) { /* non-JSON */ }
    if (resp.status === 401) { showLogin('Your session ended — please log in again.'); throw new Error('unauthorized'); }
    if (!resp.ok) {
      var err = new Error(data.error || ('Request failed (' + resp.status + ')'));
      err.code = data.code; err.detail = data.detail;
      throw err;
    }
    return data;
  }
  function todayStr() {
    var n = new Date();
    return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
  }
  function fmtDateLong(yyyyMmDd) {
    if (!yyyyMmDd) return '';
    var p = yyyyMmDd.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  /* ---------------- state ---------------- */
  var state = {
    section: 'home',
    dirty: {},           // section -> bool (unsaved JSON edits)
    data: {},            // section -> parsed content object
    aboutText: '',
    events: null,        // null = not loaded
    eventsStatus: null,  // {kind: ok|warn|err, msg}
    editingEventId: null,
    readOnly: false,     // true when events come from the live-site feed (no Airtable keys yet)
    calCursor: null,     // Date: month shown on the Home calendar
    calSelected: '',     // YYYY-MM-DD selected on the Home calendar
  };

  var SECTIONS = [
    { id: 'home', label: 'Home', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>' },
    { id: 'events', label: 'Events', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>' },
    { id: 'gallery', label: 'Photo Gallery', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>' },
    { id: 'weddings', label: 'Weddings Page', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.3 5 5.7 5c2 0 3.4 1.1 4.3 2.4h4c.9-1.3 2.3-2.4 4.3-2.4 3.4 0 5.3 3.6 3.7 6.7C19.5 16.3 12 21 12 21z" transform="scale(0.92) translate(1,0)"/></svg>' },
    { id: 'pricing', label: 'Pricing & Rates', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 6.5c-.6-1-2.6-1.5-5-1.5-3 0-5 1.3-5 3.2 0 4.4 10 2.4 10 6.6 0 1.9-2 3.2-5 3.2-2.4 0-4.4-.6-5-1.6"/></svg>' },
    { id: 'partners', label: 'Partners', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>' },
    { id: 'settings', label: 'Settings', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/></svg>' },
    { id: 'about', label: 'About Page', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' },
  ];

  /* ---------------- login ---------------- */
  function showLogin(msg) {
    $('#appView').style.display = 'none';
    $('#loginView').style.display = 'flex';
    if (msg) {
      var e = $('#loginErr');
      e.textContent = msg;
      e.style.display = 'block';
    }
  }
  function showApp() {
    $('#loginView').style.display = 'none';
    $('#appView').style.display = 'block';
  }
  $('#loginForm').addEventListener('submit', async function (ev) {
    ev.preventDefault();
    var btn = $('#loginBtn');
    var errBox = $('#loginErr');
    errBox.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Logging in…';
    try {
      await api('/api/dash-login', {
        method: 'POST',
        body: JSON.stringify({ username: $('#li-user').value.trim(), password: $('#li-pass').value }),
      });
      $('#li-pass').value = '';
      enterApp();
    } catch (e) {
      errBox.textContent = e.message || 'Login failed.';
      errBox.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Log in';
    }
  });
  $('#logoutBtn').addEventListener('click', async function () {
    try { await api('/api/dash-login', { method: 'DELETE' }); } catch (e) { /* ignore */ }
    showLogin();
  });

  /* ---------------- navigation ---------------- */
  function buildNav() {
    var nav = $('#mainNav');
    nav.innerHTML = SECTIONS.map(function (s) {
      return '<button type="button" data-nav="' + s.id + '">' + s.icon + '<span>' + s.label + '</span><span class="dot">unsaved</span></button>';
    }).join('');
    $$('#mainNav [data-nav]').forEach(function (b) {
      b.addEventListener('click', function () { goTo(b.getAttribute('data-nav')); });
    });
  }
  function goTo(id) {
    if (state.dirty[state.section] && state.section !== id) {
      if (!window.confirm('You have unsaved changes in "' + state.section + '". Leave without saving?')) return;
      setDirty(state.section, false);
    }
    state.section = id;
    $$('#mainNav [data-nav]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-nav') === id); });
    $$('#panels .panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + id); });
    window.scrollTo({ top: 0 });
  }
  function setDirty(section, on) {
    state.dirty[section] = !!on;
    var btn = $('#mainNav [data-nav="' + section + '"]');
    if (btn) btn.classList.toggle('dirty', !!on);
    var bar = $('#savebar-' + section);
    if (bar) bar.classList.toggle('show', !!on);
  }

  /* ---------------- generic JSON section machinery ---------------- */
  var JSON_SECTIONS = {
    gallery: { file: 'public/content/gallery.json', load: '/content/gallery.json' },
    weddings: { file: 'public/content/weddings.json', load: '/content/weddings.json' },
    pricing: { file: 'public/content/pricing.json', load: '/content/pricing.json' },
    partners: { file: 'public/content/partners.json', load: '/content/partners.json' },
    settings: { file: 'public/content/settings.json', load: '/content/settings.json' },
  };
  async function loadJsonSection(id) {
    var resp = await fetch(JSON_SECTIONS[id].load, { cache: 'no-store' });
    if (!resp.ok) throw new Error('Could not load ' + id + ' content.');
    state.data[id] = await resp.json();
    try {
      var stash = JSON.parse(sessionStorage.getItem('sl_stash_' + id) || 'null');
      if (stash && Date.now() - stash.t < 180000) state.data[id] = stash.data;
    } catch (e) {}
  }
  async function saveJsonSection(id, btn) {
    var original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…'; }
    try {
      await api('/api/dash-save', {
        method: 'POST',
        body: JSON.stringify({ path: JSON_SECTIONS[id].file, content: JSON.stringify(state.data[id], null, 2) + '\n' }),
      });
      setDirty(id, false);
      try { sessionStorage.setItem('sl_stash_' + id, JSON.stringify({ t: Date.now(), data: state.data[id] })); } catch (e2) {}
      toast('Saved & published — the website updates within about a minute.');
      return true;
    } catch (e) {
      toast('Save failed: ' + e.message, true);
      return false;
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
  }
  function savebarHtml(id, label) {
    return '<div class="savebar" id="savebar-' + id + '"><span class="msg">Unsaved changes in ' + label + '</span>' +
      '<button type="button" class="btn btn-primary" data-save="' + id + '">Save &amp; Publish</button></div>';
  }
  function bindSavebars(root) {
    $$('[data-save]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-save');
        if (id === 'about') saveAbout(b);
        else saveJsonSection(id, b);
      });
    });
  }
  function fieldHtml(label, name, value, opts) {
    opts = opts || {};
    var idAttr = 'f-' + name.replace(/[^a-z0-9]/gi, '-');
    var inner;
    if (opts.textarea) {
      inner = '<textarea id="' + idAttr + '" data-field="' + esc(name) + '" rows="' + (opts.rows || 4) + '">' + esc(value) + '</textarea>';
    } else {
      inner = '<input id="' + idAttr + '" data-field="' + esc(name) + '" value="' + esc(value) + '"' + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + '>';
    }
    return '<div class="field"><label for="' + idAttr + '">' + esc(label) + '</label>' + inner +
      (opts.hint ? '<div class="hint">' + esc(opts.hint) + '</div>' : '') + '</div>';
  }
  // Bind all [data-field] inputs inside a container to state.data[section][field]
  function bindFields(section, root) {
    $$('[data-field]', root).forEach(function (input) {
      input.addEventListener('input', function () {
        state.data[section][input.getAttribute('data-field')] = input.value;
        setDirty(section, true);
      });
    });
  }

  /* ---------------- panels: skeleton ---------------- */
  var VIEW_PATHS = { home: '/', events: '/events/', gallery: '/gallery/', weddings: '/rent/weddings/', pricing: '/rent/pricing/', partners: '/partners/', about: '/about/' };
  function panelShell(id, title, sub, inner) {
    var view = VIEW_PATHS[id] ? '<a class="btn btn-ghost btn-small" href="' + VIEW_PATHS[id] + '" target="_blank" rel="noopener">View on the website ↗</a>' : '';
    return '<section class="panel" id="panel-' + id + '">' +
      '<div class="page-head"><h2>' + esc(title) + '</h2>' + view + '</div>' +
      (sub ? '<p class="page-sub">' + esc(sub) + '</p>' : '') + inner + '</section>';
  }

  /* ---------------- HOME (with venue calendar) ---------------- */
  function eventsByDate() {
    var map = {};
    (state.events || []).forEach(function (e) {
      if (!e.date) return;
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }
  function calGridHtml() {
    var cur = state.calCursor || new Date();
    var year = cur.getFullYear();
    var month = cur.getMonth();
    var first = new Date(year, month, 1);
    var startDay = first.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var daysInPrev = new Date(year, month, 0).getDate();
    var byDate = eventsByDate();
    var today = todayStr();
    var monthName = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    var cells = '';
    var totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
    for (var i = 0; i < totalCells; i++) {
      var dayNum, cellDate, dim = false;
      if (i < startDay) { dayNum = daysInPrev - startDay + 1 + i; var pd = new Date(year, month - 1, dayNum); cellDate = pd.getFullYear() + '-' + String(pd.getMonth() + 1).padStart(2, '0') + '-' + String(pd.getDate()).padStart(2, '0'); dim = true; }
      else if (i >= startDay + daysInMonth) { dayNum = i - startDay - daysInMonth + 1; var nd = new Date(year, month + 1, dayNum); cellDate = nd.getFullYear() + '-' + String(nd.getMonth() + 1).padStart(2, '0') + '-' + String(nd.getDate()).padStart(2, '0'); dim = true; }
      else { dayNum = i - startDay + 1; cellDate = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(dayNum).padStart(2, '0'); }
      var evs = byDate[cellDate] || [];
      var chips = evs.slice(0, 2).map(function (e) { return '<span class="cal-chip">' + esc(e.title) + '</span>'; }).join('');
      if (evs.length > 2) chips += '<span class="cal-more">+' + (evs.length - 2) + ' more</span>';
      cells += '<button type="button" class="cal-cell' + (dim ? ' dim' : '') + (evs.length ? ' has-events' : '') + (cellDate === today ? ' today' : '') + (cellDate === state.calSelected ? ' selected' : '') + '" data-cal-day="' + cellDate + '">' +
        '<span class="cal-dnum">' + dayNum + '</span>' + chips + '</button>';
    }
    var dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) { return '<div class="cal-dow">' + d + '</div>'; }).join('');
    return '<div class="cal-head"><button type="button" class="icon-btn" data-cal-nav="-1" title="Previous month">‹</button>' +
      '<div class="cal-title">' + monthName + '</div>' +
      '<button type="button" class="icon-btn" data-cal-nav="1" title="Next month">›</button>' +
      '<button type="button" class="btn btn-ghost btn-small" data-cal-today>Today</button></div>' +
      '<div class="cal-dows">' + dows + '</div><div class="cal-grid">' + cells + '</div>';
  }
  function calDayListHtml() {
    var evs = (state.events || []).filter(function (e) { return e.date && e.date >= todayStr(); })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var sel = state.calSelected;
    var list = sel ? evs.filter(function (e) { return e.date === sel; }) : evs.slice(0, 5);
    var head = sel ? ('Events on ' + fmtDateLong(sel)) : 'Coming up next';
    if (!list.length) {
      return '<h3 class="block-title">' + head + '</h3><p style="color:var(--muted)">' + (sel ? 'Nothing scheduled that day.' : 'No upcoming events right now.') + '</p>';
    }
    return '<h3 class="block-title">' + head + '</h3>' + list.map(function (e) {
      return '<div class="up-row"><div class="up-date">' + esc(fmtDateLong(e.date)) + '</div>' +
        '<div class="up-main"><strong>' + esc(e.title) + '</strong>' +
        '<span>' + esc([e.startTime ? (e.startTime + (e.endTime ? ' – ' + e.endTime : '')) : '', e.location || ''].filter(Boolean).join(' · ')) + '</span></div></div>';
    }).join('');
  }
  function renderHome() {
    var photos = state.data.gallery && state.data.gallery.photos ? state.data.gallery.photos.length : '—';
    var partners = state.data.partners && state.data.partners.partners ? state.data.partners.partners.length : '—';
    var evCount = state.events ? state.events.filter(function (e) { return e.date && e.date >= todayStr(); }).length : '—';
    var cards = SECTIONS.filter(function (x) { return x.id !== 'home'; }).map(function (x) {
      var blurb = {
        events: 'Add and edit events — saved straight into the Airtable calendar the website reads.',
        gallery: 'Photos organized by where they appear on the website. Add, caption, reorder.',
        weddings: 'Heading, highlights, prices and policies on the Weddings page.',
        pricing: 'The rental rate table and booking notes on the Pricing page.',
        partners: 'Local partners shown on the Partners page.',
        settings: 'Phone, email, address, hours and social links used across the site.',
        about: 'The text of the About page.',
      }[x.id];
      return '<button type="button" class="shortcut" data-goto="' + x.id + '"><h3>' + x.label + '</h3><p>' + blurb + '</p></button>';
    }).join('');
    var calInner;
    if (state.events === null) {
      calInner = '<div class="empty-note">Loading the venue calendar…</div>';
    } else {
      calInner = '<div id="homeCal">' + calGridHtml() + '</div><div id="homeCalList" style="margin-top:18px">' + calDayListHtml() + '</div>' +
        (state.readOnly ? '<p style="color:var(--muted);font-size:.88rem;margin-top:12px">Read-only view from the live website — event editing unlocks when the Airtable keys are added.</p>' : '');
    }
    return panelShell('home', 'Welcome', 'Everything here updates the Sane Living website. Pick a section on the left — press Save & Publish in a section and the site updates within about a minute.',
      '<div class="grid grid-3" style="margin-bottom:18px">' +
      '<div class="card stat-card"><div class="num">' + evCount + '</div><div class="lbl">upcoming events</div></div>' +
      '<div class="card stat-card"><div class="num">' + photos + '</div><div class="lbl">photos in the gallery</div></div>' +
      '<div class="card stat-card"><div class="num">' + partners + '</div><div class="lbl">partners listed</div></div></div>' +
      '<div class="card" style="margin-bottom:18px"><h3 class="block-title" style="margin-bottom:14px">What\'s on at the venue</h3>' + calInner + '</div>' +
      '<div class="grid grid-2">' + cards + '</div>');
  }
  function bindHome() {
    var root = $('#panel-home');
    if (!root) return;
    $$('#panel-home [data-cal-nav]').forEach(function (b) {
      b.addEventListener('click', function () {
        var cur = state.calCursor || new Date();
        state.calCursor = new Date(cur.getFullYear(), cur.getMonth() + (+b.getAttribute('data-cal-nav')), 1);
        refreshPanel('home');
      });
    });
    var todayBtn = $('#panel-home [data-cal-today]');
    if (todayBtn) todayBtn.addEventListener('click', function () {
      state.calCursor = new Date();
      state.calSelected = todayStr();
      refreshPanel('home');
    });
    $$('#panel-home [data-cal-day]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.calSelected = state.calSelected === b.getAttribute('data-cal-day') ? '' : b.getAttribute('data-cal-day');
        refreshPanel('home');
      });
    });
  }

  /* ---------------- EVENTS (Airtable) ---------------- */
  function syncBanner() {
    var s = state.eventsStatus;
    if (!s) return '<div class="sync-banner sync-warn"><span class="dotp"></span><div>Loading the calendar…</div></div>';
    var cls = s.kind === 'ok' ? 'sync-ok' : (s.kind === 'warn' ? 'sync-warn' : 'sync-err');
    return '<div class="sync-banner ' + cls + '"><span class="dotp"></span><div>' + s.msg + '</div></div>';
  }
  function eventCard(e) {
    var past = e.date && e.date < todayStr();
    var p = (e.date || '').split('-');
    var d = p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null;
    var dow = d ? d.toLocaleDateString('en-US', { weekday: 'short' }) : '—';
    var mon = d ? d.toLocaleDateString('en-US', { month: 'short' }) : '';
    var dnum = d ? d.getDate() : '?';
    var badge = past ? '<span class="badge badge-past">Past</span>' : (e.publish ? '<span class="badge badge-live">On the website</span>' : '<span class="badge badge-draft">Draft — hidden</span>');
    var meta = [e.startTime ? (e.startTime + (e.endTime ? ' – ' + e.endTime : '')) : '', e.location || ''].filter(Boolean).join(' · ');
    return '<div class="card event-card" style="margin-bottom:14px">' +
      '<div class="event-date"><div class="dow">' + esc(dow) + '</div><div class="dnum">' + dnum + '</div><div class="dmon">' + esc(mon) + '</div></div>' +
      '<div class="event-main"><h3>' + esc(e.title || '(untitled)') + ' ' + badge + '</h3>' +
      (meta ? '<div class="event-meta">' + esc(meta) + '</div>' : '') +
      (e.description ? '<div class="event-desc">' + esc(e.description) + '</div>' : '') + '</div>' +
      (state.readOnly
        ? '<div class="event-actions"><span class="badge badge-past">In Airtable</span></div>'
        : '<div class="event-actions">' +
          '<button type="button" class="btn btn-ghost btn-small" data-ev-edit="' + esc(e.id) + '">Edit</button>' +
          '<button type="button" class="btn btn-ghost btn-small" data-ev-toggle="' + esc(e.id) + '">' + (e.publish ? 'Unpublish' : 'Publish') + '</button>' +
          '<button type="button" class="btn btn-danger btn-small" data-ev-del="' + esc(e.id) + '">Delete</button>' +
          '</div>') +
      '</div>';
  }
  function eventFormHtml(e) {
    e = e || {};
    var v = function (k, dflt) { return e[k] !== undefined ? e[k] : (dflt || ''); };
    return '<div class="card editor-card" id="eventEditor" style="margin-bottom:18px">' +
      '<h3 style="color:var(--plum);margin-bottom:12px">' + (e.id ? 'Edit event' : 'New event') + '</h3>' +
      '<div class="form-row">' +
      '<div class="field"><label for="ev-title">Title</label><input id="ev-title" value="' + esc(v('title')) + '"></div>' +
      '<div class="field"><label for="ev-date">Date</label><input id="ev-date" type="date" value="' + esc(v('date')) + '"></div></div>' +
      '<div class="form-row">' +
      '<div class="field"><label for="ev-start">Start time</label><input id="ev-start" value="' + esc(v('startTime')) + '" placeholder="7:00 PM"></div>' +
      '<div class="field"><label for="ev-end">End time</label><input id="ev-end" value="' + esc(v('endTime')) + '" placeholder="9:00 PM"></div></div>' +
      '<div class="form-row">' +
      '<div class="field"><label for="ev-loc">Location</label><input id="ev-loc" value="' + esc(v('location')) + '" placeholder="Sane Living Center"></div>' +
      '<div class="field"><label for="ev-type">Type</label><input id="ev-type" value="' + esc(v('type')) + '" placeholder="Free"></div></div>' +
      '<div class="form-row">' +
      '<div class="field"><label for="ev-price">Price</label><input id="ev-price" value="' + esc(v('price')) + '" placeholder="$10 suggested donation"></div>' +
      '<div class="field"><label for="ev-rsvp">RSVP / tickets link</label><input id="ev-rsvp" value="' + esc(v('rsvpUrl')) + '" placeholder="https://…"></div></div>' +
      '<div class="field"><label for="ev-desc">Description</label><textarea id="ev-desc" rows="4">' + esc(v('description')) + '</textarea></div>' +
      '<div class="field"><label style="text-transform:none;letter-spacing:0;font-size:.95rem"><input type="checkbox" id="ev-publish" ' + (e.publish ? 'checked' : '') + ' style="width:auto;margin-right:8px">Show on the website (published)</label>' +
      '<div class="hint">Unticked events are drafts — saved in Airtable but hidden from the website.</div></div>' +
      '<div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn btn-primary" id="ev-save">' + (e.id ? 'Save changes' : 'Add event') + '</button>' +
      '<button type="button" class="btn btn-ghost" id="ev-cancel">Cancel</button></div></div>';
  }
  function renderEvents() {
    var inner = '<div id="syncSlot">' + syncBanner() + '</div>';
    inner += '<div style="margin-bottom:18px"><button type="button" class="btn btn-primary" id="ev-add">+ Add an event</button></div>';
    inner += '<div id="eventEditorSlot"></div><div id="eventList">';
    if (state.events === null) {
      inner += '<div class="empty-note">Loading events…</div>';
    } else if (state.events.length === 0) {
      inner += '<div class="empty-note">No events in the calendar yet. Add the first one above.</div>';
    } else {
      inner += state.events.map(eventCard).join('');
    }
    inner += '</div>';
    return panelShell('events', 'Events', 'These events live in the Airtable calendar — the same one the public website reads. Anything you add or change here shows on the website (allow up to ~5 minutes) and in Airtable itself.', inner);
  }
  async function loadEvents(showToast) {
    try {
      var data = await api('/api/dash-events');
      state.events = data.events || [];
      state.readOnly = data.readOnly === true;
      var addBtn0 = $('#ev-add');
      if (addBtn0) addBtn0.style.display = state.readOnly ? 'none' : '';
      if (state.readOnly) {
        state.eventsStatus = { kind: 'warn', msg: '<strong>Showing the live website\'s published events</strong> (read from saneliving.com). Viewing works without the Airtable keys — to add or change events here, the keys (AIRTABLE_API_TOKEN + AIRTABLE_BASE_ID) still need to be added in Vercel. ' + data.count + ' upcoming event' + (data.count === 1 ? '' : 's') + ' · loaded ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '.' };
      } else {
        state.eventsStatus = { kind: 'ok', msg: '<strong>Connected to Airtable.</strong> ' + data.count + ' event' + (data.count === 1 ? '' : 's') + ' in the calendar · loaded ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '.' };
      }
      if (showToast) toast('Calendar reloaded.');
      var homePanel = $('#panel-home');
      if (homePanel) refreshPanel('home');
    } catch (e) {
      state.events = state.events || [];
      if (e.code === 'AIRTABLE_NOT_CONFIGURED') {
        state.eventsStatus = { kind: 'warn', msg: '<strong>Airtable is not connected yet.</strong> The calendar keys (AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID) still need to be added in Vercel — once they are, this page manages the real calendar. Nothing here can change events until then.' };
      } else if (e.message !== 'unauthorized') {
        state.eventsStatus = { kind: 'err', msg: '<strong>Could not reach Airtable.</strong> ' + esc(e.message) + ' <button type="button" class="btn btn-ghost btn-small" id="ev-retry">Retry</button>' };
      }
    }
    var slot = $('#syncSlot');
    if (slot) {
      slot.innerHTML = syncBanner();
      var list = $('#eventList');
      if (list) list.innerHTML = state.events.length ? state.events.map(eventCard).join('') : '<div class="empty-note">No events in the calendar yet. Add the first one above.</div>';
      bindEventButtons();
      var retry = $('#ev-retry');
      if (retry) retry.addEventListener('click', function () { loadEvents(true); });
    }
  }
  function bindEventButtons() {
    $$('#panel-events [data-ev-edit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var e = state.events.find(function (x) { return x.id === b.getAttribute('data-ev-edit'); });
        openEventEditor(e);
      });
    });
    $$('#panel-events [data-ev-toggle]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var e = state.events.find(function (x) { return x.id === b.getAttribute('data-ev-toggle'); });
        if (!e) return;
        b.disabled = true;
        try {
          var r = await api('/api/dash-events', { method: 'PATCH', body: JSON.stringify({ id: e.id, publish: !e.publish }) });
          var i = state.events.findIndex(function (x) { return x.id === e.id; });
          if (i >= 0) state.events[i] = r.event;
          $('#eventList').innerHTML = state.events.map(eventCard).join('');
          bindEventButtons();
          toast(r.event.publish ? 'Published — it will appear on the website within ~5 minutes.' : 'Unpublished — hidden from the website, kept in Airtable.');
        } catch (err) { toast('Could not update: ' + err.message, true); b.disabled = false; }
      });
    });
    $$('#panel-events [data-ev-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var e = state.events.find(function (x) { return x.id === b.getAttribute('data-ev-del'); });
        if (!e) return;
        if (!window.confirm('Delete "' + (e.title || 'this event') + '" from the calendar permanently?\n\nTip: "Unpublish" hides it from the website but keeps it in Airtable.')) return;
        b.disabled = true;
        try {
          await api('/api/dash-events', { method: 'DELETE', body: JSON.stringify({ id: e.id }) });
          state.events = state.events.filter(function (x) { return x.id !== e.id; });
          $('#eventList').innerHTML = state.events.length ? state.events.map(eventCard).join('') : '<div class="empty-note">No events in the calendar yet.</div>';
          bindEventButtons();
          toast('Event deleted from Airtable.');
        } catch (err) { toast('Delete failed: ' + err.message, true); b.disabled = false; }
      });
    });
    var add = $('#ev-add');
    if (add && !add.dataset.bound) {
      add.dataset.bound = '1';
      add.addEventListener('click', function () { openEventEditor(null); });
    }
  }
  function openEventEditor(e) {
    state.editingEventId = e ? e.id : null;
    var slot = $('#eventEditorSlot');
    slot.innerHTML = eventFormHtml(e || {});
    slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#ev-cancel').addEventListener('click', function () { slot.innerHTML = ''; state.editingEventId = null; });
    $('#ev-save').addEventListener('click', async function () {
      var btn = this;
      var payload = {
        title: $('#ev-title').value.trim(),
        date: $('#ev-date').value,
        startTime: $('#ev-start').value.trim(),
        endTime: $('#ev-end').value.trim(),
        location: $('#ev-loc').value.trim(),
        type: $('#ev-type').value.trim(),
        price: $('#ev-price').value.trim(),
        rsvpUrl: $('#ev-rsvp').value.trim(),
        description: $('#ev-desc').value,
        publish: $('#ev-publish').checked,
      };
      if (!payload.title) { toast('Give the event a title first.', true); return; }
      if (!payload.date || !payload.startTime) { toast('Give the event a date and a start time.', true); return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Saving…';
      try {
        if (state.editingEventId) {
          payload.id = state.editingEventId;
          var r = await api('/api/dash-events', { method: 'PATCH', body: JSON.stringify(payload) });
          var i = state.events.findIndex(function (x) { return x.id === payload.id; });
          if (i >= 0) state.events[i] = r.event;
          toast('Event updated in Airtable.');
        } else {
          var c = await api('/api/dash-events', { method: 'POST', body: JSON.stringify(payload) });
          state.events.push(c.event);
          state.events.sort(function (a, b) { return (a.date || '9999') < (b.date || '9999') ? -1 : 1; });
          toast('Event added to Airtable.');
        }
        slot.innerHTML = '';
        state.editingEventId = null;
        $('#eventList').innerHTML = state.events.map(eventCard).join('');
        bindEventButtons();
        loadEvents(false);
      } catch (err) {
        toast('Save failed: ' + err.message, true);
        btn.disabled = false;
        btn.textContent = state.editingEventId ? 'Save changes' : 'Add event';
      }
    });
  }

  /* ---------------- GALLERY (grouped by website section) ---------------- */
  var SECTION_DEFS = [
    { id: 'venue', title: 'The Venue', where: 'Gallery page → “The Venue” filter · also the Rent page photo viewer', blurb: 'Main Hall, auditorium, conference room and other inside spaces.' },
    { id: 'weddings', title: 'Weddings', where: 'Gallery page → “Weddings” filter', blurb: 'Ceremonies, receptions and wedding setups.' },
    { id: 'outdoor', title: 'Outdoor Spaces', where: 'Gallery page → “Outdoor” filter', blurb: 'Sculpture area, patio and outdoor gatherings.' },
  ];
  function photoCard(p, idx, total) {
    var sections = SECTION_DEFS.map(function (sd) {
      return '<option value="' + sd.id + '"' + (p.section === sd.id ? ' selected' : '') + '>' + sd.title + '</option>';
    }).join('');
    return '<div class="photo-card">' +
      '<img src="' + esc(p.image) + '" alt="' + esc(p.alt || '') + '" loading="lazy" onerror="this.style.opacity=0.25">' +
      '<div class="pc-body">' +
      (p.draft ? '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px"><span style="background:#fdf0d5;color:#8a6d00;border:1px solid #ecd28a;border-radius:999px;padding:2px 10px;font-size:.76rem;font-weight:700">\u25CF NOT PUBLISHED</span><button type="button" class="btn btn-primary" style="padding:6px 14px;font-size:.85rem" data-ph-publish="' + idx + '">Publish to website</button></div>' : '') +
      '<input data-ph="caption" data-idx="' + idx + '" value="' + esc(p.caption || '') + '" placeholder="Caption (shown under the photo)">' +
      '<input data-ph="alt" data-idx="' + idx + '" value="' + esc(p.alt || '') + '" placeholder="Describe the photo (for accessibility)">' +
      '<label class="pc-section-label">Website section<select data-ph="section" data-idx="' + idx + '">' + sections + '</select></label>' +
      '<div class="pc-actions">' +
      '<button type="button" class="icon-btn" data-ph-move="-1" data-idx="' + idx + '" title="Move earlier" ' + (idx === 0 ? 'disabled' : '') + '>↑</button>' +
      '<button type="button" class="icon-btn" data-ph-move="1" data-idx="' + idx + '" title="Move later" ' + (idx === total - 1 ? 'disabled' : '') + '>↓</button>' +
      '<span style="flex:1"></span>' +
      '<button type="button" class="icon-btn danger" data-ph-del="' + idx + '" title="Remove from gallery">✕</button>' +
      '</div></div></div>';
  }
  function groupsHtml() {
    var photos = (state.data.gallery && state.data.gallery.photos) || [];
    return SECTION_DEFS.map(function (sd) {
      var mine = [];
      photos.forEach(function (p, i) { if ((p.section || 'venue') === sd.id) mine.push([p, i]); });
      var cards = mine.length
        ? '<div class="photo-grid">' + mine.map(function (pair) { return photoCard(pair[0], pair[1], photos.length); }).join('') + '</div>'
        : '<div class="empty-note">No photos in this section yet — add the first one.</div>';
      return '<div class="group-block" id="gal-group-' + sd.id + '">' +
        '<div class="group-head"><div><h3>' + sd.title + ' <span class="group-count">' + mine.length + ' photo' + (mine.length === 1 ? '' : 's') + '</span></h3>' +
        '<p>' + sd.blurb + '<br><span class="where">Appears: ' + sd.where + '</span></p></div>' +
        '<label class="btn btn-primary btn-small" style="margin:0">+ Add photos<input type="file" class="gal-upload-group" data-section="' + sd.id + '" accept="image/*" multiple hidden></label></div>' +
        cards + '</div>';
    }).join('');
  }
  function renderGallery() {
    var photos = (state.data.gallery && state.data.gallery.photos) || [];
    var strip = '<div class="grid grid-3" style="margin-bottom:20px">' + SECTION_DEFS.map(function (sd) {
      var n = photos.filter(function (p) { return (p.section || 'venue') === sd.id; }).length;
      return '<a class="card where-card" href="#gal-group-' + sd.id + '" data-jump="gal-group-' + sd.id + '"><div class="num">' + n + '</div><div class="lbl">' + sd.title + '</div><p>' + sd.where + '</p></a>';
    }).join('') + '</div>';
    var inner = strip +
      '<div style="margin-bottom:18px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      '<button type="button" class="btn btn-ghost" id="gal-add-url">Add a photo from a link</button>' +
      '<span style="color:var(--muted);font-size:.9rem">Every photo below sits in exactly one website section. Change a photo\'s section with its dropdown; order inside a section follows the ↑ ↓ arrows.</span></div>' +
      '<div id="photoGroups">' + groupsHtml() + '</div>' +
      savebarHtml('gallery', 'gallery');
    return panelShell('gallery', 'Photo Gallery', 'New photos are saved here right away as NOT PUBLISHED \u2014 only you can see them. Press a photo\u2019s Publish button when it should appear on the website.', inner);
  }
  function bindGallery() {
    var wrap = $('#photoGroups');
    if (!wrap) return;
    function rerender() {
      wrap.innerHTML = groupsHtml();
      bindGallery();
    }
    $$('#photoGroups [data-ph]').forEach(function (input) {
      var evt = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(evt, function () {
        var idx = +input.getAttribute('data-idx');
        state.data.gallery.photos[idx][input.getAttribute('data-ph')] = input.value;
        setDirty('gallery', true);
        if (input.getAttribute('data-ph') === 'section') rerender();
      });
    });
    $$('#photoGroups [data-ph-move]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.getAttribute('data-idx');
        var to = idx + (+b.getAttribute('data-ph-move'));
        var arr = state.data.gallery.photos;
        if (to < 0 || to >= arr.length) return;
        var tmp = arr[idx]; arr[idx] = arr[to]; arr[to] = tmp;
        setDirty('gallery', true);
        rerender();
      });
    });
    $$('#photoGroups [data-ph-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var idx = +b.getAttribute('data-ph-del');
        var cap = state.data.gallery.photos[idx].caption || 'this photo';
        if (!window.confirm('Remove "' + cap + '" from the gallery? (The photo file itself stays on the website.)')) return;
        var wasDraft = !!state.data.gallery.photos[idx].draft;
        state.data.gallery.photos.splice(idx, 1);
        setDirty('gallery', true);
        rerender();
        if (wasDraft) { await saveJsonSection('gallery', null); toast('Removed and saved.'); }
      });
    });
    $$('#photoGroups [data-ph-publish]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var idx = +b.getAttribute('data-ph-publish');
        state.data.gallery.photos[idx].draft = false;
        b.disabled = true; b.textContent = 'Publishing\u2026';
        var okSave = await saveJsonSection('gallery', null);
        if (okSave === false) { state.data.gallery.photos[idx].draft = true; rerender(); return; }
        rerender();
        toast('Published \u2014 the photo goes live on the website within about a minute.');
      });
    });
    $$('#panel-gallery [data-jump]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var el = document.getElementById(a.getAttribute('data-jump'));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    function fileToDataUrl(file) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(r.result); };
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }
    // Shrink every photo before upload (max 1920px, JPEG quality 82; PNG
    // kept only for real transparency): fast uploads, a lean repository,
    // and quick page loads on the website.
    async function compressImageFile(file) {
      var dataUrl = await fileToDataUrl(file);
      if (/image\/(gif|svg)/.test(file.type) || /\.(gif|svg)$/i.test(file.name)) return { name: file.name, base64: String(dataUrl).split(',')[1], from: file.size, to: file.size };
      try {
        var url = URL.createObjectURL(file);
        var img = await new Promise(function (resolve, reject) { var i = new Image(); i.onload = function () { resolve(i); }; i.onerror = reject; i.src = url; });
        var MAX = 1920;
        var scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.max(1, Math.round(img.naturalWidth * scale));
        var h = Math.max(1, Math.round(img.naturalHeight * scale));
        var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
        var hasAlpha = false;
        if (file.type !== 'image/jpeg') { try { var px = cx.getImageData(0, 0, w, h).data; for (var p = 3; p < px.length; p += 1604) { if (px[p] < 250) { hasAlpha = true; break; } } } catch (e) {} }
        var out = hasAlpha ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', 0.82);
        URL.revokeObjectURL(url);
        if (out.length >= String(dataUrl).length) return { name: file.name, base64: String(dataUrl).split(',')[1], from: file.size, to: file.size };
        var stem = file.name.replace(/\.[^.]+$/, '') || 'photo';
        return { name: stem + (hasAlpha ? '.png' : '.jpg'), base64: out.split(',')[1], from: file.size, to: Math.round(out.length * 0.75) };
      } catch (e) {
        if (/heic|heif|tiff/.test(file.type) || /\.(heic|heif|tif|tiff)$/i.test(file.name)) throw new Error('this photo is in a format this browser cannot read (HEIC/TIFF) - please export it as JPEG and try again');
        return { name: file.name, base64: String(dataUrl).split(',')[1], from: file.size, to: file.size };
      }
    }
    async function handleUploads(fileInput, section) {
      var files = Array.prototype.slice.call(fileInput.files || []);
      if (!files.length) return;
      toast('Preparing ' + files.length + ' photo' + (files.length === 1 ? '' : 's') + '…');
      var shrunk = 0;
      for (var i = 0; i < files.length; i++) {
        var f = files[i];
        try {
          var prep = await compressImageFile(f);
          if (prep.base64.length > 5500000) throw new Error('photo is too large even after shrinking');
          if (prep.to < prep.from) shrunk++;
          var safeName = prep.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
          await api('/api/dash-save', { method: 'POST', body: JSON.stringify({ path: 'public/images/' + safeName, contentBase64: prep.base64 }) });
          state.data.gallery.photos.push({ image: '/images/' + safeName, caption: '', alt: '', section: section, draft: true });
        } catch (e) {
          toast('Upload failed for ' + f.name + ': ' + e.message, true);
        }
      }
      rerender();
      await saveJsonSection('gallery', null);
      toast('Photos saved in the dashboard as NOT PUBLISHED \u2014 safe here even if you refresh. Press \u201CPublish to website\u201D on a photo when you are ready for everyone to see it.');
      fileInput.value = '';
    }
    $$('#photoGroups .gal-upload-group').forEach(function (input) {
      input.addEventListener('change', function () { handleUploads(input, input.getAttribute('data-section')); });
    });
    var addUrl = $('#gal-add-url');
    if (addUrl) addUrl.addEventListener('click', async function () {
      var url = window.prompt('Paste the photo link (it should start with /images/ or https://):');
      if (!url) return;
      state.data.gallery.photos.push({ image: url.trim(), caption: '', alt: '', section: 'venue', draft: true });
      rerender();
      await saveJsonSection('gallery', null);
      toast('Photo saved as NOT PUBLISHED \u2014 press its Publish button when it should go live.');
    });
  }

  /* ---------------- WEDDINGS ---------------- */
  function renderWeddings() {
    var w = state.data.weddings || {};
    var highlights = (w.highlights || []).map(function (h, i) {
      return '<div class="list-row"><input data-hl="' + i + '" value="' + esc(h) + '"><button type="button" class="icon-btn danger" data-hl-del="' + i + '" title="Remove">✕</button></div>';
    }).join('');
    var inner = '<div class="card form-card">' +
      fieldHtml('Page heading', 'heading', w.heading) +
      fieldHtml('Top photo (path or link)', 'heroImage', w.heroImage, { hint: 'Example: /images/rent-center.jpg — the photo at the top of the Weddings page.' }) +
      '<img class="thumb-preview" src="' + esc(w.heroImage || '') + '" alt="" onerror="this.style.display=\'none\'">' +
      fieldHtml('Intro text', 'intro', w.intro, { textarea: true, rows: 5 }) +
      '<div class="field"><label>Highlights (the checklist with purple ticks)</label><div class="list-editor" id="hlList">' + highlights + '</div>' +
      '<button type="button" class="btn btn-ghost btn-small" id="hl-add" style="margin-top:10px">+ Add a highlight</button></div>' +
      fieldHtml('Pricing text', 'pricingText', w.pricingText, { textarea: true, rows: 3 }) +
      fieldHtml('What\'s included', 'includesText', w.includesText, { textarea: true, rows: 3 }) +
      fieldHtml('Catering policy', 'cateringPolicy', w.cateringPolicy, { textarea: true, rows: 3 }) +
      fieldHtml('Alcohol policy', 'alcoholPolicy', w.alcoholPolicy, { textarea: true, rows: 3 }) +
      fieldHtml('Parking note', 'parkingNote', w.parkingNote, { textarea: true, rows: 2 }) +
      '<div class="form-row">' + fieldHtml('Phone shown on the page', 'phoneDisplay', w.phoneDisplay) +
      fieldHtml('Availability note', 'availabilityNote', w.availabilityNote) + '</div>' +
      '</div>' + savebarHtml('weddings', 'weddings page');
    return panelShell('weddings', 'Weddings Page', 'Everything on the public Weddings page — heading, photo, highlights, pricing and policies.', inner);
  }
  function bindWeddings() {
    bindFields('weddings', $('#panel-weddings'));
    function bindHl() {
      $$('#panel-weddings [data-hl]').forEach(function (input) {
        input.addEventListener('input', function () {
          state.data.weddings.highlights[+input.getAttribute('data-hl')] = input.value;
          setDirty('weddings', true);
        });
      });
      $$('#panel-weddings [data-hl-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          state.data.weddings.highlights.splice(+b.getAttribute('data-hl-del'), 1);
          setDirty('weddings', true);
          refreshPanel('weddings');
        });
      });
    }
    bindHl();
    var add = $('#hl-add');
    if (add) add.addEventListener('click', function () {
      state.data.weddings.highlights.push('');
      setDirty('weddings', true);
      refreshPanel('weddings');
    });
  }

  /* ---------------- PRICING ---------------- */
  function renderPricing() {
    var p = state.data.pricing || {};
    var rows = (p.rows || []).map(function (r, i) {
      return '<tr><td><input data-row="' + i + '" data-col="label" value="' + esc(r.label) + '"><input data-row="' + i + '" data-col="sublabel" value="' + esc(r.sublabel) + '" style="margin-top:6px"></td>' +
        '<td><input data-row="' + i + '" data-col="monThu" value="' + esc(r.monThu) + '"></td>' +
        '<td><input data-row="' + i + '" data-col="friday" value="' + esc(r.friday) + '"></td>' +
        '<td><input data-row="' + i + '" data-col="saturday" value="' + esc(r.saturday) + '"></td>' +
        '<td><input data-row="' + i + '" data-col="sunday" value="' + esc(r.sunday) + '"></td></tr>';
    }).join('');
    var inner = '<div class="card form-card">' +
      '<div class="field"><label>Rental rates</label>' +
      '<div style="overflow-x:auto"><table class="rate-table"><thead><tr><th>Session</th><th>Mon–Thu</th><th>Friday</th><th>Saturday</th><th>Sunday</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="hint">Type prices exactly as they should appear, e.g. $400.</div></div>' +
      '<div class="form-row">' + fieldHtml('Rates as-of date', 'noteDate', p.noteDate) + fieldHtml('Hours line', 'hoursHeader', p.hoursHeader) + '</div>' +
      fieldHtml('Note under the table', 'noteText', p.noteText) +
      fieldHtml('Weddings note', 'weddingsNote', p.weddingsNote, { textarea: true, rows: 2 }) +
      fieldHtml('Availability note', 'availabilityNote', p.availabilityNote) +
      '<div class="form-row">' + fieldHtml('Booking card heading', 'ctaHeading', p.ctaHeading) + fieldHtml('Booking card text', 'ctaText', p.ctaText) + '</div>' +
      '</div>' + savebarHtml('pricing', 'pricing');
    return panelShell('pricing', 'Pricing & Rates', 'The rate table and notes on the public Pricing page.', inner);
  }
  function bindPricing() {
    bindFields('pricing', $('#panel-pricing'));
    $$('#panel-pricing [data-row]').forEach(function (input) {
      input.addEventListener('input', function () {
        state.data.pricing.rows[+input.getAttribute('data-row')][input.getAttribute('data-col')] = input.value;
        setDirty('pricing', true);
      });
    });
  }

  /* ---------------- PARTNERS ---------------- */
  function renderPartners() {
    var d = state.data.partners || {};
    var cards = (d.partners || []).map(function (p, i) {
      return '<div class="card form-card" style="margin-bottom:14px">' +
        '<div class="form-row"><div class="field"><label>Business name</label><input data-pt="' + i + '" data-k="name" value="' + esc(p.name || '') + '"></div>' +
        '<div class="field"><label>Category</label><input data-pt="' + i + '" data-k="category" value="' + esc(p.category || '') + '" placeholder="Catering, Flowers, Photography…"></div></div>' +
        '<div class="field"><label>Short description</label><textarea data-pt="' + i + '" data-k="blurb" rows="2">' + esc(p.blurb || '') + '</textarea></div>' +
        '<div class="form-row"><div class="field"><label>Website</label><input data-pt="' + i + '" data-k="website" value="' + esc(p.website || '') + '" placeholder="https://…"></div>' +
        '<div class="field"><label>Photo (path or link)</label><input data-pt="' + i + '" data-k="image" value="' + esc(p.image || '') + '" placeholder="/images/…"></div></div>' +
        '<div><button type="button" class="btn btn-danger btn-small" data-pt-del="' + i + '">Remove this partner</button></div></div>';
    }).join('');
    var inner = '<div class="card form-card" style="margin-bottom:18px">' +
      fieldHtml('Intro text (top of the Partners page)', 'intro', d.intro, { textarea: true, rows: 4 }) + '</div>' +
      '<div id="partnerList">' + (cards || '<div class="empty-note">No partners listed yet — add the first one below. Only add a business after they have agreed to be listed.</div>') + '</div>' +
      '<button type="button" class="btn btn-primary" id="pt-add">+ Add a partner</button>' +
      savebarHtml('partners', 'partners');
    return panelShell('partners', 'Partners', 'Local businesses shown on the Partners page. Reminder of the house rule: mutual referrals only — no referral fees, ever.', inner);
  }
  function bindPartners() {
    bindFields('partners', $('#panel-partners'));
    $$('#panel-partners [data-pt]').forEach(function (input) {
      input.addEventListener('input', function () {
        state.data.partners.partners[+input.getAttribute('data-pt')][input.getAttribute('data-k')] = input.value;
        setDirty('partners', true);
      });
    });
    $$('#panel-partners [data-pt-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!window.confirm('Remove this partner from the page?')) return;
        state.data.partners.partners.splice(+b.getAttribute('data-pt-del'), 1);
        setDirty('partners', true);
        refreshPanel('partners');
      });
    });
    var add = $('#pt-add');
    if (add) add.addEventListener('click', function () {
      state.data.partners.partners.push({ name: '', category: '', blurb: '', website: '', image: '' });
      setDirty('partners', true);
      refreshPanel('partners');
    });
  }

  /* ---------------- SETTINGS ---------------- */
  function settingsCard(title, blurb, fieldsHtml) {
    return '<div class="card form-card" style="margin-bottom:18px"><h3 class="block-title">' + title + '</h3>' +
      (blurb ? '<p style="color:var(--muted);margin-bottom:12px">' + blurb + '</p>' : '') + fieldsHtml + '</div>';
  }
  function renderSettings() {
    var x = state.data.settings || {};
    var inner =
      settingsCard('Contact details', 'Shown in the website footer and on the Contact page.',
        '<div class="form-row">' + fieldHtml('Business name', 'businessName', x.businessName) + fieldHtml('Email', 'email', x.email) + '</div>' +
        '<div class="form-row">' + fieldHtml('Phone (shown)', 'phoneDisplay', x.phoneDisplay) + fieldHtml('Phone (tap-to-call link)', 'phoneLink', x.phoneLink, { hint: 'Format: tel:+18056466000' }) + '</div>' +
        fieldHtml('Address', 'address', x.address) +
        fieldHtml('Hours', 'hours', x.hours)) +
      settingsCard('Booking & availability', 'Where the booking buttons point, and the Airtable availability calendar embedded on the Pricing and Weddings pages.',
        fieldHtml('Booking page link', 'bookingPageUrl', x.bookingPageUrl) +
        fieldHtml('Availability calendar embed link (Airtable)', 'availabilityEmbedUrl', x.availabilityEmbedUrl, { hint: 'Change only if the Airtable share link changes — the calendar itself is managed in Airtable.' })) +
      settingsCard('Social links', 'Leave blank to hide an icon.',
        '<div class="form-row">' + fieldHtml('Instagram link', 'instagramUrl', x.instagramUrl) + fieldHtml('Facebook link', 'facebookUrl', x.facebookUrl) + '</div>') +
      savebarHtml('settings', 'settings');
    return panelShell('settings', 'Settings', 'Contact details and links used across the website, grouped by job.', inner);
  }
  function bindSettings() {
    bindFields('settings', $('#panel-settings'));
  }
  /* ---------------- ABOUT ---------------- */
  function mdToHtml(md) {
    var body = String(md || '');
    // Strip YAML frontmatter for preview only
    body = body.replace(/^---\n[\s\S]*?\n---\n?/, '');
    var lines = body.split('\n');
    var html = '';
    var inList = false;
    function inline(t) {
      return esc(t)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }
    lines.forEach(function (line) {
      var t = line.trim();
      if (/^[-*] /.test(t)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + inline(t.slice(2)) + '</li>';
        return;
      }
      if (inList) { html += '</ul>'; inList = false; }
      if (/^### /.test(t)) html += '<h3>' + inline(t.slice(4)) + '</h3>';
      else if (/^## /.test(t)) html += '<h2>' + inline(t.slice(3)) + '</h2>';
      else if (/^# /.test(t)) html += '<h1>' + inline(t.slice(2)) + '</h1>';
      else if (t === '') html += '';
      else html += '<p>' + inline(t) + '</p>';
    });
    if (inList) html += '</ul>';
    return html;
  }
  function renderAbout() {
    var words = state.aboutText.trim() ? state.aboutText.trim().split(/\s+/).length : 0;
    var inner = '<div class="about-wrap">' +
      '<div class="card form-card"><div class="field" style="margin-bottom:0"><label for="aboutText">About page text (Markdown)</label>' +
      '<textarea id="aboutText">' + esc(state.aboutText) + '</textarea>' +
      '<div class="hint">The block between the --- lines at the top is page setup — leave it as is and edit the text below it.</div>' +
      '<div class="hint" style="margin-top:8px"><span id="aboutWords">' + words + '</span> words · the preview updates as you type</div></div></div>' +
      '<div><div class="card"><h3 class="block-title" style="margin-bottom:10px">Website preview</h3><div class="md-preview" id="aboutPreview">' + mdToHtml(state.aboutText) + '</div></div></div></div>' +
      savebarHtml('about', 'About page');
    return panelShell('about', 'About Page', 'The story text on the About page.', inner);
  }
  async function saveAbout(btn) {
    var original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…'; }
    try {
      await api('/api/dash-save', { method: 'POST', body: JSON.stringify({ path: 'public/content/about.md', content: state.aboutText }) });
      setDirty('about', false);
      toast('Saved & published — the website updates within about a minute.');
    } catch (e) {
      toast('Save failed: ' + e.message, true);
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
  }
  function bindAbout() {
    var ta = $('#aboutText');
    if (!ta) return;
    ta.addEventListener('input', function () {
      state.aboutText = ta.value;
      setDirty('about', true);
      $('#aboutPreview').innerHTML = mdToHtml(ta.value);
      var w = $('#aboutWords');
      if (w) w.textContent = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
    });
  }

  /* ---------------- render / bind orchestration ---------------- */
  var RENDER = { home: renderHome, events: renderEvents, gallery: renderGallery, weddings: renderWeddings, pricing: renderPricing, partners: renderPartners, settings: renderSettings, about: renderAbout };
  var BIND = { home: bindHome, events: bindEventButtons, gallery: bindGallery, weddings: bindWeddings, pricing: bindPricing, partners: bindPartners, settings: bindSettings, about: bindAbout };
  function renderAll() {
    $('#panels').innerHTML = SECTIONS.map(function (s) { return RENDER[s.id](); }).join('');
    SECTIONS.forEach(function (s) { if (BIND[s.id]) BIND[s.id](); });
    bindSavebars($('#panels'));
    $$('#panels [data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { goTo(b.getAttribute('data-goto')); });
    });
  }
  function refreshPanel(id) {
    var old = $('#panel-' + id);
    if (!old) return;
    var wasActive = old.classList.contains('active');
    var tmp = document.createElement('div');
    tmp.innerHTML = RENDER[id]();
    var fresh = tmp.firstChild;
    if (wasActive) fresh.classList.add('active');
    old.replaceWith(fresh);
    if (BIND[id]) BIND[id]();
    bindSavebars(fresh);
    $$('[data-goto]', fresh).forEach(function (b) {
      b.addEventListener('click', function () { goTo(b.getAttribute('data-goto')); });
    });
    if (state.dirty[id]) {
      var bar = $('#savebar-' + id);
      if (bar) bar.classList.add('show');
      var navBtn = $('#mainNav [data-nav="' + id + '"]');
      if (navBtn) navBtn.classList.add('dirty');
    }
  }

  /* ---------------- enter ---------------- */
  var entered = false;
  async function enterApp() {
    showApp();
    if (entered) return;
    entered = true;
    buildNav();
    try {
      await Promise.all(Object.keys(JSON_SECTIONS).map(loadJsonSection));
    } catch (e) {
      toast('Some content could not be loaded: ' + e.message, true);
    }
    try {
      var r = await fetch('/content/about.md', { cache: 'no-store' });
      if (r.ok) state.aboutText = await r.text();
    } catch (e) { /* about stays blank; saving will recreate */ }
    renderAll();
    goTo('home');
    loadEvents(false);
  }

  /* ---------------- boot ---------------- */
  (async function boot() {
    try {
      var data = await api('/api/dash-login');
      if (data.loggedIn) enterApp();
    } catch (e) { /* stay on login */ }
  })();
})();
