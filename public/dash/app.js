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
      toast('Saved & published — the website updates within about a minute.');
    } catch (e) {
      toast('Save failed: ' + e.message, true);
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
    return panelShell('gallery', 'Photo Gallery', 'Photos are organized by where they appear on the website. Add photos inside a section, caption them, then Save & Publish.', inner);
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
      b.addEventListener('click', function () {
        var idx = +b.getAttribute('data-ph-del');
        var cap = state.data.gallery.photos[idx].caption || 'this photo';
        if (!window.confirm('Remove "' + cap + '" from the gallery? (The photo file itself stays on the website.)')) return;
        state.data.gallery.photos.splice(idx, 1);
        setDirty('gallery', true);
        rerender();
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
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return { name: file.name, base64: String(dataUrl).split(',')[1], from: file.size, to: file.size };
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
          state.data.gallery.photos.push({ image: '/images/' + safeName, caption: '', alt: '', section: section });
        } catch (e) {
          toast('Upload failed for ' + f.name + ': ' + e.message, true);
        }
      }
      setDirty('gallery', true);
      rerender();
      toast('Photos uploaded' + (shrunk ? ' (web-sized for fast loading)' : '') + ' into the section. Add captions, then Save & Publish.');
      fileInput.value = '';
    }
    $$('#photoGroups .gal-upload-group').forEach(function (input) {
      input.addEventListener('change', function () { handleUploads(input, input.getAttribute('data-section')); });
    });
    var addUrl = $('#gal-add-url');
    if (addUrl) addUrl.addEventListener('click', function () {
      var url = window.prompt('Paste the photo link (it should start with /images/ or https://):');
      if (!url) return;
      state.data.gallery.photos.push({ image: url.trim(), caption: '', alt: '', section: 'venue' });
      setDirty('gallery', true);
      rerender();
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
      '<div class="card form-card" style="margin-bottom:18px"><h3 class="block-title">One-time setup — photos &amp; videos</h3>' +
      '<p style="color:var(--muted);margin-bottom:12px">Copies all ' + 100 + ' photos and videos from the original website into this new home, checking every file matches the original exactly. Runs entirely on the server — nothing to download. Takes a few minutes; keep this page open.</p>' +
      '<button type="button" class="btn btn-primary" id="importBtn">Import photos &amp; videos now</button>' +
      '<div id="importLog" style="margin-top:12px;font-size:.9rem;color:var(--muted);max-height:220px;overflow:auto;white-space:pre-wrap"></div></div>' +
      savebarHtml('settings', 'settings');
    return panelShell('settings', 'Settings', 'Contact details and links used across the website, grouped by job.', inner);
  }
  var IMPORT_MANIFEST = [{"path":"public/IMG_0197.jpg","sha":"99f77b410cffba87016f5976baf82f19c9554466","size":441642},{"path":"public/IMG_0201.jpg","sha":"4517fe400116f10afe7449488b0c4ea4c63b9ec5","size":435414},{"path":"public/IMG_0207.jpg","sha":"c2f354d88dc34dbcdebc270c12deecaf7525dbde","size":963276},{"path":"public/IMG_0208.jpg","sha":"317f73b5eb466b6b452df84c949ccf0428ea4893","size":912008},{"path":"public/IMG_0216.jpg","sha":"31fd8c9caa38bdf5d934e34a506d9e89412894a4","size":505309},{"path":"public/IMG_0217.jpg","sha":"02e33475d74b7f4464f1e2d414f1c4240f3e5ea8","size":469242},{"path":"public/hero-video.mp4","sha":"74aeed3dbfd66ee9b74332363f00033c16f97b8d","size":1889770},{"path":"public/images/about-aubrey.jpg","sha":"e8ad0f4b9432ccd7135bdd225a3bffdefa6c32d5","size":235850},{"path":"public/images/about-center-exterior.jpg","sha":"7f74a1dd6cc7bd1f289bf43be35e4b7151e0eceb","size":554200},{"path":"public/images/about-center.jpg","sha":"efa91281939a4ec9a8d4890c352b51d2ff09bb3e","size":258844},{"path":"public/images/about-farm.jpg","sha":"e36a19a7497b1195c584acb2a9877af577aafadc","size":1474110},{"path":"public/images/about-founder.jpg","sha":"e8ad0f4b9432ccd7135bdd225a3bffdefa6c32d5","size":235850},{"path":"public/images/about-hipvegan.jpg","sha":"f4471a4f0ede24d5cfbc5bbbef19fe80eec429b1","size":1244738},{"path":"public/images/about-hipvgn.jpg","sha":"f4471a4f0ede24d5cfbc5bbbef19fe80eec429b1","size":1244738},{"path":"public/images/about-sunset.jpg","sha":"e36a19a7497b1195c584acb2a9877af577aafadc","size":1474110},{"path":"public/images/badge-go.png","sha":"428ca77ab5930fe6aaa9eeb744d4eedaa47d28dd","size":26737},{"path":"public/images/badge-me.png","sha":"4cd39e67d69dff031653c2dfee76ee65c3a08992","size":6219},{"path":"public/images/badge-we.png","sha":"b24b76d855d55699d7ca00c0ff4f7994dea9e92b","size":6326},{"path":"public/images/center-office.jpg","sha":"da6857dd610468216bfae1f2a23a2ee30365bc87","size":469205},{"path":"public/images/contact-exterior.jpg","sha":"a297c1e5e112420948648de2e45ed1519e2c45d5","size":682092},{"path":"public/images/events-past/3EventPage_print-compressed_1.jpg","sha":"b961563cbef15c4b3231bd4c42d46030d8065cdd","size":191689},{"path":"public/images/events-past/Amma-2024-Ojai-Flyer-new-9.jpg","sha":"77b465aec20828355af24c4144f33152e9aafae2","size":411437},{"path":"public/images/events-past/Amma-2026-Ojai-Flyer-web-2.jpg","sha":"0f49fc776723b411cc741b5f8ad918111498834f","size":376691},{"path":"public/images/events-past/Amma-Aug-20205.jpg","sha":"d76eb103d390d9927ac379a14b9626ac6031e32e","size":168512},{"path":"public/images/events-past/Ammonite-85X11-FINAL-USE-THIS-ONE.jpg","sha":"093573f88122b10792205c6b00c3806ddeab70dc","size":97369},{"path":"public/images/events-past/Archtypes-of-Mary-Magdalene.jpg","sha":"48fdd61204777eb0159cd0d6491adf35a5546c7d","size":187393},{"path":"public/images/events-past/BIRTHDAY-SHOW-yes.jpg","sha":"6bd2345c6dafbda35ff614e4b40d8af9f7fd82b6","size":251474},{"path":"public/images/events-past/Biggest-8.5x11_Final.jpg","sha":"cc84eb4113ca68d365f7fdbfd03ffc2b6433ca83","size":146878},{"path":"public/images/events-past/CABRINI.jpg","sha":"54bd2faecb3c39e2a809db92e507c0e92e8eb453","size":145828},{"path":"public/images/events-past/CLOWN-WORKSHOP-NEW-FLYER.jpg","sha":"0001b1c90ffb5dce780262dddd21e6157c7b36bc","size":122116},{"path":"public/images/events-past/Chamber-1-28-26.jpg","sha":"d50214fba3be40450cffa904120679ba82d6a7c1","size":190693},{"path":"public/images/events-past/Coexist-9-11.jpg","sha":"4bcbfa273915b97271dc755dac5b944cd95119c8","size":120507},{"path":"public/images/events-past/Constellation-June-15-2024.png","sha":"f58b8154eda7de9d0cc37cbdf74b3863ae1466df","size":194616},{"path":"public/images/events-past/Constellation-March_23_2024.png","sha":"8b6d82c6b327f0627d181175b01f9472ca24378e","size":197089},{"path":"public/images/events-past/Crawdads-8.5x11_1-GOOD-ONE.jpg","sha":"af82fd9e19b7733859b464abf016edfd9a7a035a","size":317818},{"path":"public/images/events-past/Deep-Listening-and-sound-healing-concert.jpg","sha":"1c71b9a233ee2f5c9b7a0d1980fc0d3a0d2a97aa","size":372376},{"path":"public/images/events-past/Donna-August-2025.jpg","sha":"9931b1505173b12bf9d1a052fd9a4098b609c88a","size":151161},{"path":"public/images/events-past/Donna-Sacred.jpg","sha":"243196b84ffdf6e1c3cd68c6be6bf5f1c0ef7443","size":125662},{"path":"public/images/events-past/DrGruennFamilyConstellationJanuary13-2024.png","sha":"ad3c3d9a710325a92def12d5775412c6915ca20f","size":212787},{"path":"public/images/events-past/FLOW-FINAL.jpg","sha":"9a6cd8c634b52e66da6de76bb1dd8080a158eb21","size":153711},{"path":"public/images/events-past/FOX_Revise-8.5-x-11-_4-TAGLINE-Removed.jpg","sha":"97f594d877affaffeccb17c0280fe18dfc623f04","size":214943},{"path":"public/images/events-past/Final-Tahi-Film-Premier-Flyer.jpeg","sha":"919ab5924d46ed839920af44562e724aaafd0d9f","size":424430},{"path":"public/images/events-past/Grof-Breathwork-flyer.jpg","sha":"449bda73a9958e570ca6b1caa304408f4e99a95c","size":236499},{"path":"public/images/events-past/IMG_5354.jpeg","sha":"2e2d2e02e78d7bd00e0dedec5fac489b1170db1b","size":82911},{"path":"public/images/events-past/Joss-Jaffe.jpeg","sha":"a39684df46e5fe5cdcdfddc482b82eb0cf3c18d6","size":89401},{"path":"public/images/events-past/Kalbeliya-1-30-26.jpg","sha":"eac1972d3596c0d8910f31a391fb33b8300e4893","size":231049},{"path":"public/images/events-past/Kirtin-PosterRev1-scaled.jpg","sha":"5df525c60734963d255508c9e9c8f65ceb6057bc","size":402059},{"path":"public/images/events-past/LAURA-postcard-5inx7in-v-FRONT.jpg","sha":"469e9263701043cbb9003411c3a8bdf13a0c819f","size":353243},{"path":"public/images/events-past/Leland-1-31-26.jpg","sha":"436daa2189520438141db4de6f23776d905ec8a0","size":159411},{"path":"public/images/events-past/Living-Promise.jpg","sha":"b5a77037730dda602e0d61c974a96ec75b5827b9","size":250466},{"path":"public/images/events-past/Love-Heals-Poster-plusInfo.jpg","sha":"e1ca6cc6016e4311a22b1649ca0002901d26d5ed","size":170794},{"path":"public/images/events-past/Michael-8.5-x-11-FINAL_2_cropped-pdf.jpg","sha":"0bb6ed689cc3815c97948f5e2836f9cfa6a0efa7","size":515429},{"path":"public/images/events-past/MudLotus.jpg","sha":"0edc69ad1797f6061a129f3dfac8b2921ee2ce3b","size":517496},{"path":"public/images/events-past/Oh-My-Word-poster.jpeg","sha":"f5dc34264e42ba415bf41bb23b878f8ea5e66e27","size":303353},{"path":"public/images/events-past/Ojai-Community-event.jpg","sha":"8740ec20e9b1eaa79b4923a8bcd9878594871fef","size":146466},{"path":"public/images/events-past/PATH-TO-LOVE.jpg","sha":"06fa5b101d51ef658d1e890f38d23a5ceb80e0d5","size":162357},{"path":"public/images/events-past/Paranadyn.jpg","sha":"3d5a0a44a38cacbaf3f061912d211fc4dfd92d30","size":270386},{"path":"public/images/events-past/REMATRIATION.jpeg","sha":"e635bd3ce3b58a64b84a5715ed5715b2d57bbbae","size":172294},{"path":"public/images/events-past/Rug-Ad.jpg","sha":"01a44c15b01c344e38202d5de6c85acdc222c0fc","size":355983},{"path":"public/images/events-past/SOUL-MOTION.png","sha":"ba310e6ad1a19be342131b3ddbd5e0edda2c64cb","size":255723},{"path":"public/images/events-past/Sat-Nam-Rasayan.jpg","sha":"46e8f19a30e92374ae1a9c9fa4fbf12299ef1339","size":139423},{"path":"public/images/events-past/Soul-Motion-Poster.jpg","sha":"71b1440cc2ceafc12c0e2ba19125e156b20bdebb","size":207684},{"path":"public/images/events-past/St-Nam-Rasayan_2025.jpg","sha":"b8b171b29a0f7892a2f27125ae815cf703451571","size":240878},{"path":"public/images/events-past/Tahi-1000082920.jpg","sha":"b478ad9499b8ed9ef42bcafdc644ea4c0c98180b","size":135215},{"path":"public/images/events-past/Tahi-screening-Ojai-12-8-23.jpg","sha":"f619ee7925cb0e270e5f910fdcb349c14766632e","size":458251},{"path":"public/images/events-past/Valentine-donation.jpg","sha":"f8a7791edb36b646a4bf864fd7de5b7f19c96e96","size":98953},{"path":"public/images/events-past/Viz-Med-Small_2_cropped-scaled.jpg","sha":"def94451aa26b5ebbc06f03612d31907a269ef50","size":800984},{"path":"public/images/events-past/WORLD-WITHOUT-COWS.jpg","sha":"dae6ae87bd191557e1e8727e5a143143646c8896","size":98256},{"path":"public/images/events-past/kiora-fox_C-No-Ph-1-Feb-Mar-2022-dates-150px.jpg","sha":"675857231527207b38b2f4b74e0aead991034541","size":251133},{"path":"public/images/events-past/sane-living-logo.png","sha":"a8e9a256569a0c6609bd7a74318d8288af40257b","size":23885},{"path":"public/images/events-past/unnamed-5.jpg","sha":"a0a84515f5244d3db7947bebd121f52266264f4d","size":140001},{"path":"public/images/evo3-algo.png","sha":"f426404d50d9c2d2c3feb5746e64b4aaf38ae906","size":21775},{"path":"public/images/evo3-bg.jpeg","sha":"c606e84d9e7672e5f5faecfde56e65b995d8de35","size":552741},{"path":"public/images/evo3-bio.png","sha":"0c56bfe559ac20ed795abf239320db03528631fd","size":26559},{"path":"public/images/evo3-ego.png","sha":"637be08a562e098c4400f34f942f19fa6a99a1a0","size":25573},{"path":"public/images/evo3-logo.png","sha":"8a9c1719416d718d19e8e2dc2858573c4c2febde","size":43669},{"path":"public/images/evo3-sculpture.jpg","sha":"f9aea144e9ebe4bc7487ecf87ad7aff24cb9223f","size":773225},{"path":"public/images/evo3-title.png","sha":"8a9c1719416d718d19e8e2dc2858573c4c2febde","size":43669},{"path":"public/images/hero-center.jpg","sha":"35bf255324dd34d791499a744be302d12dcb08b4","size":352067},{"path":"public/images/homepage-hero.jpg","sha":"f9aea144e9ebe4bc7487ecf87ad7aff24cb9223f","size":773225},{"path":"public/images/lifestyle-hero.png","sha":"32b0b092d97b4c45f6e96d4e4d5ecd20aec5dccd","size":38354},{"path":"public/images/lifestyle-speeds.png","sha":"09d0323947f20c95b611b88c81fb8376f1ed32bf","size":30320},{"path":"public/images/lifestyle-stories.png","sha":"c6735249d45de07c1e2b8ebd736653a9bec1fc54","size":29740},{"path":"public/images/lifestyle-video.svg","sha":"f84cf991f7a0b7a87a17ff2e979f6fa26cf376a5","size":1296},{"path":"public/images/lifestyle-we-dna.png","sha":"ce1668da127d70015e017239f055ff8015039ba9","size":32808},{"path":"public/images/logo.png","sha":"a8e9a256569a0c6609bd7a74318d8288af40257b","size":23885},{"path":"public/images/pov-attenborough.jpeg","sha":"5d621b9f654ba2f55f03e704679de6ff09639003","size":59678},{"path":"public/images/pov-elon-musk.jpg","sha":"45e6958665d76582a668426d86ba28fa3877029c","size":368572},{"path":"public/images/pov-evo3.jpg","sha":"01acdd1d2f807dcf5cb4931a89bc086059e040af","size":625087},{"path":"public/images/pov-harari.jpg","sha":"585179935d882775ae1407b6f6b130226ed40578","size":84055},{"path":"public/images/pov-ocean.jpg","sha":"adde6aef7b360fc753ae5104449d01154077da39","size":439705},{"path":"public/images/pov-play-button.svg","sha":"4bc5544a0b0d6ac3b7ea3c112f609d1d9364a095","size":1957},{"path":"public/images/pov-sam-harris.jpg","sha":"4186af939b46982228f7c540581e8de9739da123","size":384714},{"path":"public/images/pov-ted-talks.jpg","sha":"1aabc4e6a88ef9079dd44ddc79932fe6ac6eefc7","size":28672},{"path":"public/images/pov-zach-bush.jpg","sha":"ad60b251e16b0b11e989aa7d72e18431373262ea","size":343375},{"path":"public/images/rent-center.jpg","sha":"01a181b800ef2da1cbfc8c4ea053d01a855d309f","size":553913},{"path":"public/images/self-heal-hero.png","sha":"0f53611e8e797387819bb489a3d061251b1cd63c","size":64214},{"path":"public/rent-farm-hero-v4.mp4","sha":"67701d9b2edffd693c5bafb058a569f3f1f3d5d8","size":13832986},{"path":"public/rent-farm-hero-v6.mp4","sha":"67701d9b2edffd693c5bafb058a569f3f1f3d5d8","size":13832986},{"path":"assets/sculpture-qr.png","sha":"3218a88b0de52a6ca813a41fffd14f9ff1987c85","size":889}];
  function bindSettings() {
    bindFields('settings', $('#panel-settings'));
    var btn = $('#importBtn');
    if (!btn) return;
    btn.addEventListener('click', async function () {
      var log = $('#importLog');
      btn.disabled = true;
      btn.textContent = 'Importing…';
      function line(t) { log.textContent += t + '\n'; log.scrollTop = log.scrollHeight; }
      var ok = [];
      var failed = [];
      line('Starting — ' + IMPORT_MANIFEST.length + ' files to copy and verify…');
      for (var i = 0; i < IMPORT_MANIFEST.length; i++) {
        var e = IMPORT_MANIFEST[i];
        try {
          var r = await api('/api/import-media', { method: 'POST', body: JSON.stringify({ action: 'blob', path: e.path, sha: e.sha }) });
          ok.push({ path: e.path, sha: r.sha });
          if ((i + 1) % 10 === 0 || i === IMPORT_MANIFEST.length - 1) line('Copied & verified ' + (i + 1) + ' of ' + IMPORT_MANIFEST.length + '…');
        } catch (err) {
          failed.push(e.path + ' (' + err.message + ')');
          line('FAILED: ' + e.path + ' — ' + err.message);
        }
      }
      if (ok.length) {
        try {
          line('Saving all files to the website (one commit)…');
          var c = await api('/api/import-media', { method: 'POST', body: JSON.stringify({ action: 'commit', entries: ok }) });
          line('Done — ' + c.count + ' files committed. The site redeploys automatically in about a minute.');
          toast('Media import complete: ' + c.count + ' files.');
        } catch (err2) {
          line('Commit failed: ' + err2.message + ' — press the button again to retry (copied files are remembered).');
          toast('Import commit failed: ' + err2.message, true);
        }
      }
      if (failed.length) {
        line(failed.length + ' file(s) did not copy — press the button again to retry just those.');
        btn.disabled = false;
        btn.textContent = 'Retry import';
      } else {
        btn.textContent = 'Import complete ✓';
      }
    });
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
