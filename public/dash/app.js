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
      err.code = data.code; err.detail = data.detail; err.status = resp.status;
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
    versions: {}, loaded: {}, loadErrors: {}, errors: {}, conflicts: {}, unsaved: {}, saveStates: {}, busy: {}, storageOk: true, settingsTab: 'brand', aboutDocument: null,
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
    { id: 'editor', label: 'Page Editor', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12m4-8h4m-4 4h4"/></svg>' },
    { id: 'settings', label: 'Settings', icon: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/></svg>' },
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
    var frame=document.getElementById('pageEditorFrame');if(frame)frame.remove();
    try{localStorage.removeItem('sl_editor_about_v1');}catch(e){}
    document.body.classList.remove('page-editor-open');try{localStorage.setItem('sl_studio_logout',String(Date.now()));indexedDB.deleteDatabase('sl-studio-v2');}catch(e){}
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
    var aboutAlias=id==='about';if(aboutAlias)id='editor';
    if (!SECTIONS.some(function(s){return s.id===id;})) return;
    var editorFrame=document.getElementById('pageEditorFrame');
    if(editorFrame&&state.section==='editor'&&id!=='editor')editorFrame.contentWindow.postMessage({type:'sane-editor:flush'},location.origin);
    state.section = id;
    document.body.classList.toggle('page-editor-open',id==='editor');
    history.replaceState(null,'','#'+id);
    if(id==='editor'&&!editorFrame){var host=document.getElementById('pageEditorHost');if(host){var frame=document.createElement('iframe');frame.id='pageEditorFrame';frame.title='Sane Living page editor';frame.src='/dash/editor/index.html'+(aboutAlias?'?page=about':'');frame.allow='autoplay; fullscreen; picture-in-picture';frame.style.cssText='width:100%;height:100dvh;min-height:690px;border:0;border-radius:0;background:#f7f8fa;display:block';host.appendChild(frame);}}
    $$('#mainNav [data-nav]').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-nav') === id); });
    $$('#panels .panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + id); });
    if(aboutAlias){var current=document.getElementById('pageEditorFrame');if(current){current.contentWindow.postMessage({type:'studio:select-about'},location.origin);current.addEventListener('load',function(){current.contentWindow.postMessage({type:'studio:select-about'},location.origin);},{once:true});}}
    window.scrollTo({ top: 0 });
  }
  // The editor publishes through its authenticated gateway; messages only navigate the dashboard.
  window.addEventListener('message',function(e){
    var frame=document.getElementById('pageEditorFrame'),data=e.data;
    if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow||!data)return;
    if(data.type==='studio:theme'&&['light','dark'].indexOf(data.theme)!==-1)document.body.setAttribute('data-studio-theme',data.theme);
    if(data.type==='studio:open-section'&&['home','events','gallery','weddings','pricing','partners','settings'].indexOf(data.section)!==-1){
      goTo(data.section);
      if(data.section==='settings'&&SaneSettings.groups.some(function(g){return g.id===data.tab;}))selectSettingsTab(data.tab);
    }
  });
  var RECOVERY_PREFIX = 'sl_studio_v1_';
  function contentText(id) { return id === 'about' ? state.aboutText : JSON.stringify(state.data[id], null, 2) + '\n'; }
  function applyDashboardBranding(value) {
    var published=SaneSettings.normalize(value);
    $$('.brand .logo-chip img,.login-card img').forEach(function(img){img.src=SaneSettings.safeUrl(published.logoUrl,'image')||SaneSettings.defaults.logoUrl;img.alt=published.logoAlt||published.businessName;});
    var icon=document.querySelector('link[rel="icon"]')||document.head.appendChild(document.createElement('link'));icon.rel='icon';icon.href=SaneSettings.safeUrl(published.faviconUrl,'icon')||'/favicon.svg';
  }
  function putContent(id, text) {
    if (id === 'about') { state.aboutText = text; state.aboutDocument = SaneContent.parseAbout(text); }
    else {
      var value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('This section has an invalid content structure.');
      var listKey={gallery:'photos',pricing:'rows',partners:'partners'}[id];if(listKey&&!Array.isArray(value[listKey]))throw new Error('This section’s list could not be loaded.');
      if(id==='settings'){value=SaneSettings.normalize(value);if(!Array.isArray(value.navigation)||!value.navigation.every(function(n){return n&&typeof n==='object';})||!value.pageMeta||typeof value.pageMeta!=='object'||Array.isArray(value.pageMeta))throw new Error('Settings structure needs repair before editing.');}
      state.data[id]=value;
    }
  }
  function cacheWork(id) {
    try {
      localStorage.setItem(RECOVERY_PREFIX + id, JSON.stringify({ content: contentText(id), baseSha: (state.versions[id] || {}).sha, draftSha: (state.versions[id] || {}).draftSha, updatedAt: Date.now() }));
      state.storageOk = true;
    } catch (e) { state.storageOk = false; }
  }
  function updateSaveUI(id) {
    var status = state.saveStates[id] || 'Published version loaded';
    var bar = $('#savebar-' + id);
    if (!bar) return;
    bar.classList.add('show');
    bar.classList.toggle('has-changes', !!state.dirty[id]);
    var msg = $('.msg',bar);
    if (msg) msg.textContent = state.busy[id] ? 'Saving…' : status;
    var detail = $('.save-detail',bar);
    if (detail) detail.textContent = state.busy[id] ? 'You can keep editing while this version saves.' : state.unsaved[id] ? (state.storageOk ? 'Recovered on this device after refresh. Save draft to share it with the team.' : 'Device recovery is unavailable. Save a shared draft before leaving.') : state.dirty[id] ? 'Shared draft saved. The public website has not changed.' : 'Publish changes when you want to update the website.';
    $$('[data-save],[data-draft],[data-discard]',bar).forEach(function (button) { button.disabled = !!state.busy[id] || !!state.uploading || !state.loaded[id] || !!state.conflicts[id]; });
    var feedback = $('#feedback-' + id);
    if (feedback) {
      var error = state.loadErrors[id] || state.conflicts[id] || state.errors[id] || '';
      feedback.hidden = !error;
      $('.feedback-text',feedback).textContent = error;
    }
    var nav = $('#mainNav [data-nav="'+id+'"]');
    if (nav) nav.classList.toggle('dirty',!!state.dirty[id]);
  }
  function setDirty(section, on) {
    state.dirty[section] = !!on;
    if (on) { state.unsaved[section] = true; state.saveStates[section] = 'Unsaved changes'; cacheWork(section); }
    else state.unsaved[section] = false;
    updateSaveUI(section);
  }
  var JSON_SECTIONS = {
    gallery: { file: 'public/content/gallery.json', load: '/content/gallery.json' },
    weddings: { file: 'public/content/weddings.json', load: '/content/weddings.json' },
    pricing: { file: 'public/content/pricing.json', load: '/content/pricing.json' },
    partners: { file: 'public/content/partners.json', load: '/content/partners.json' },
    settings: { file: 'public/content/settings.json', load: '/content/settings.json' }
  };
  async function loadContentSection(id, publishedOnly) {
    var response = await api('/api/dash-content?section=' + encodeURIComponent(id));
    if (!response.published) throw new Error('The published content is missing. Ask an administrator to restore this section.');
    var published = response.published.content;
    // Validate before replacing local state; bad remote content cannot erase a recovered draft.
    if (id === 'about') SaneContent.parseAbout(published); else JSON.parse(published);
    state.versions[id] = { sha: response.published.sha, draftSha: response.draft ? response.draft.sha : null, published: published };
    if(id==='settings')applyDashboardBranding(JSON.parse(published));
    state.loaded[id] = true; state.loadErrors[id] = ''; state.errors[id] = ''; state.conflicts[id] = '';
    var draft = !publishedOnly && response.draft && response.draft.content !== published ? response.draft : null;
    putContent(id, draft ? draft.content : published);
    state.dirty[id] = !!draft; state.unsaved[id] = false;
    state.saveStates[id] = draft ? 'Shared draft loaded' : 'Published version loaded';
    if (draft && draft.baseSha !== response.published.sha) state.conflicts[id] = 'This shared draft was based on an older published version. Copy any text you need, then load the latest published version before saving.';
    var local = null;
    try { local = JSON.parse(localStorage.getItem(RECOVERY_PREFIX+id) || 'null'); } catch(e) {}
    var remoteTime = draft ? Date.parse(draft.updatedAt) : 0;
    if (!publishedOnly && local && typeof local.content === 'string' && local.updatedAt > remoteTime && local.content !== contentText(id)) {
      putContent(id,local.content); state.dirty[id] = true; state.unsaved[id] = true; state.saveStates[id] = 'Recovered changes from this device';
      if(local.draftSha !== (response.draft ? response.draft.sha : null))state.conflicts[id]='A newer shared draft exists alongside your recovered changes. Copy any text you need before loading the latest published version.';
      if (local.baseSha !== response.published.sha) state.conflicts[id] = 'Your recovered changes are based on an older published version. Copy any text you need, then load the latest published version before saving.';
    }
    if (publishedOnly) { try { localStorage.removeItem(RECOVERY_PREFIX+id); } catch(e) {} }
  }
  async function loadJsonSection(id) {
    try { await loadContentSection(id); }
    catch(e) {
      state.loadErrors[id] = e.message; state.loaded[id] = false;
      state.data[id] = { photos: [], rows: [], partners: [], highlights: [] };
      if(id === 'settings') state.data[id] = SaneSettings.normalize({});
    }
  }
  function validationErrors(id) {
    if (id === 'settings') return SaneSettings.validate(state.data.settings);
    if (id === 'about') { try { return SaneContent.validateAbout(SaneContent.parseAbout(state.aboutText)); } catch(e) { return [e.message]; } }
    return [];
  }
  function watchPublication(id, snapshot) {
    var attempts=0;
    async function check() {
      if(!state.versions[id] || state.versions[id].published!==snapshot) return;
      try {
        var url=id==='about'?'/content/about.md':JSON_SECTIONS[id].load;
        var response=await fetch(url+'?studio-check='+Date.now(),{cache:'no-store'});
        if(response.ok && await response.text()===snapshot) {
          if(!state.dirty[id]){state.saveStates[id]='Live on the website';updateSaveUI(id);}return;
        }
      } catch(e) {}
      if(++attempts<10)setTimeout(check,6000);
      else if(!state.dirty[id]){state.saveStates[id]='Published · website deployment still updating';updateSaveUI(id);}
    }
    setTimeout(check,3000);
  }
  async function saveSection(id, action) {
    if (state.busy[id]) return false;
    if (!state.loaded[id] || state.conflicts[id]) { toast('Load the latest version before saving.',true); return false; }
    if(action === 'publish') { var errors = validationErrors(id); if(errors.length) { state.errors[id] = errors.join(' '); updateSaveUI(id); toast(errors[0],true); return false; } }
    var snapshot = contentText(id), version = state.versions[id];
    state.busy[id] = true; state.errors[id] = ''; updateSaveUI(id);
    try {
      var result = await api('/api/dash-save',{ method:'POST',body:JSON.stringify({ path:id==='about' ? 'public/content/about.md' : JSON_SECTIONS[id].file, content:snapshot, action:action, expectedSha:version.sha, expectedDraftSha:version.draftSha }) });
      version.sha = result.sha; version.draftSha = result.draftSha;
      var newerEdits = contentText(id) !== snapshot;
      state.dirty[id] = action === 'draft' || newerEdits;
      state.unsaved[id] = newerEdits;
      state.saveStates[id] = newerEdits ? 'New changes since the last save' : action === 'draft' ? 'Draft saved · '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : 'Published · deployment updating';
      if(action === 'publish') { version.published = snapshot; if(id==='settings')applyDashboardBranding(JSON.parse(snapshot)); watchPublication(id,snapshot); }
      if (newerEdits) cacheWork(id); else try { localStorage.removeItem(RECOVERY_PREFIX+id); } catch(e) {}
      if(result.warning) { state.conflicts[id] = result.warning; toast(result.warning,true); }
      else toast(action === 'draft' ? 'Draft saved. Ready to review.' : 'Published. The website updates after deployment, usually within a minute.');
      return true;
    } catch(e) {
      cacheWork(id); state.errors[id] = e.message;
      if(e.status === 409) state.conflicts[id] = e.message;
      toast('Save failed: '+e.message,true); return false;
    } finally { state.busy[id] = false; updateSaveUI(id); }
  }
  async function saveJsonSection(id, btn, action) { return saveSection(id,action || 'publish'); }
  function savebarHtml(id) {
    return '<div class="editor-feedback" id="feedback-'+id+'" role="alert" hidden><span class="feedback-text"></span><button type="button" data-reload="'+id+'">Load latest published version</button></div>'+
      '<div class="savebar show" id="savebar-'+id+'"><div class="save-status" role="status" aria-live="polite"><span class="msg">Published version loaded</span><span class="save-detail">Save a draft or publish when ready.</span></div><div class="save-actions">'+
      '<button type="button" class="btn btn-text btn-small" data-discard="'+id+'">Revert</button><button type="button" class="btn btn-ghost" data-draft="'+id+'">Save draft</button><button type="button" class="btn btn-primary" data-save="'+id+'">Publish changes</button></div></div>';
  }
  function bindSavebars(root) {
    $$('[data-save]',root).forEach(function(b){ b.onclick=function(){saveSection(b.dataset.save,'publish');}; });
    $$('[data-draft]',root).forEach(function(b){ b.onclick=function(){saveSection(b.dataset.draft,'draft');}; });
    $$('[data-reload]',root).forEach(function(b){ b.onclick=async function(){
      var id=b.dataset.reload;
      if(!confirm('Load the current published version? Copy any text you want to keep first. Your current work will be backed up on this device.')) return;
      try { try{localStorage.setItem(RECOVERY_PREFIX+'backup_'+id,contentText(id));}catch(storageError){} await loadContentSection(id,true); refreshPanel(id); updateSaveUI(id); }
      catch(e){toast(e.message,true);}
    }; });
    $$('[data-discard]',root).forEach(function(b){ b.onclick=async function(){
      var id=b.dataset.discard;
      if(!confirm('Discard your working changes and the shared draft for this section, and restore the published version?')) return;
      state.busy[id]=true;updateSaveUI(id);
      try {
        try{localStorage.setItem(RECOVERY_PREFIX+'backup_'+id,contentText(id));}catch(storageError){}
        var v=state.versions[id];
        await api('/api/dash-save',{method:'POST',body:JSON.stringify({path:id==='about'?'public/content/about.md':JSON_SECTIONS[id].file,action:'discard',expectedSha:v.sha,expectedDraftSha:v.draftSha})});
        await loadContentSection(id,true);refreshPanel(id);toast('Restored the published version.');
      } catch(e){toast(e.message,true);} finally{state.busy[id]=false;updateSaveUI(id);}
    }; });
    Object.keys(state.versions).forEach(updateSaveUI);
  }
  var fieldScope = '';
  function fieldHtml(label, name, value, opts) {
    opts = opts || {};
    var idAttr = 'f-' + fieldScope + '-' + name.replace(/[^a-z0-9]/gi, '-');
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
        editor: 'Design any page, preview your changes and publish when ready.',
        about: 'Edit the About page’s sections, story and links.',
      }[x.id];
      return '<button type="button" class="shortcut" data-goto="' + x.id + '"><span class="shortcut-copy"><h3>' + x.label + '</h3><p>' + blurb + '</p></span><span class="shortcut-arrow" aria-hidden="true">↗</span></button>';
    }).join('');
    var calInner;
    if (state.events === null) {
      calInner = '<div class="empty-note">Loading the venue calendar…</div>';
    } else {
      calInner = '<div id="homeCal">' + calGridHtml() + '</div><div id="homeCalList" style="margin-top:18px">' + calDayListHtml() + '</div>' +
        (state.readOnly ? '<p style="color:var(--muted);font-size:.88rem;margin-top:12px">Read-only view from the live website — event editing unlocks when the Airtable keys are added.</p>' : '');
    }
    return panelShell('home', 'Welcome', 'Everything here updates the Sane Living website. Pick a section on the left — save a draft to review, or publish changes when they are ready.',
      '<div class="grid grid-3 home-metrics" style="margin-bottom:24px">' +
      '<div class="card stat-card"><div class="num">' + evCount + '</div><div class="lbl">upcoming events</div></div>' +
      '<div class="card stat-card"><div class="num">' + photos + '</div><div class="lbl">photos in the gallery</div></div>' +
      '<div class="card stat-card"><div class="num">' + partners + '</div><div class="lbl">partners listed</div></div></div>' +
      '<div class="home-workbench"><div class="card home-calendar" style="margin-bottom:18px"><h3 class="block-title" style="margin-bottom:14px">What\'s on at the venue</h3>' + calInner + '</div>' +
      '<div class="home-tools"><div class="workspace-section-heading"><h3>Manage your website</h3><p>Choose what you want to work on.</p></div><div class="grid grid-2 home-shortcuts">' + cards + '</div></div></div>');
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
      '<p class="event-work-status" id="ev-work-status" role="status">Save this event to keep it in Airtable. The checkbox above controls whether it appears on the website.</p>'+
      '<div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn btn-primary" id="ev-save">' + (e.publish ? 'Publish event changes' : 'Save unpublished event') + '</button>' +
      '<button type="button" class="btn btn-ghost" id="ev-cancel">Cancel</button></div></div>';
  }
  function renderEvents() {
    var inner = '<div id="syncSlot">' + syncBanner() + '</div>';
    inner += '<div style="margin-bottom:18px"><button type="button" class="btn btn-primary" id="ev-add">+ Add an event</button></div>';
    var recoveredEvent = null; try { recoveredEvent = JSON.parse(localStorage.getItem(RECOVERY_PREFIX+'event') || 'null'); } catch(e){}
    if(recoveredEvent) inner += '<div class="event-recovery-note" id="eventRecovery">There is unfinished event work on this device. <button type="button" class="btn btn-ghost btn-small" id="ev-restore">Resume editing</button></div>';
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
    var restore=$('#ev-restore');if(restore)restore.onclick=function(){try{var work=JSON.parse(localStorage.getItem(RECOVERY_PREFIX+'event'));if(work)openEventEditor(work);}catch(e){toast('The saved event could not be read.',true);}};
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
    var captureEvent=function(){var work={id:state.editingEventId,title:$('#ev-title').value,date:$('#ev-date').value,startTime:$('#ev-start').value,endTime:$('#ev-end').value,location:$('#ev-loc').value,type:$('#ev-type').value,price:$('#ev-price').value,rsvpUrl:$('#ev-rsvp').value,description:$('#ev-desc').value,publish:$('#ev-publish').checked};state.unsaved.events=true;try{localStorage.setItem(RECOVERY_PREFIX+'event',JSON.stringify(work));}catch(e){}var eventStatus=$('#ev-work-status');if(eventStatus)eventStatus.textContent='Unsaved event changes · kept on this device until you save.';$('#ev-save').textContent=work.publish?'Publish event changes':'Save unpublished event';};
    $$('input,textarea',slot).forEach(function(input){input.addEventListener('input',captureEvent);input.addEventListener('change',captureEvent);});
    $('#ev-cancel').addEventListener('click', function () { if(state.unsaved.events&&!confirm('Discard the unfinished event changes on this device?'))return;slot.innerHTML = ''; state.editingEventId = null;state.unsaved.events=false;try{localStorage.removeItem(RECOVERY_PREFIX+'event');}catch(e){}var notice=$('#eventRecovery');if(notice)notice.remove(); });
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
      $$('input,textarea,button',slot).forEach(function(control){control.disabled=true;});
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
        state.unsaved.events=false;try{localStorage.removeItem(RECOVERY_PREFIX+'event');}catch(e){}var notice=$('#eventRecovery');if(notice)notice.remove();
        slot.innerHTML = '';
        state.editingEventId = null;
        $('#eventList').innerHTML = state.events.map(eventCard).join('');
        bindEventButtons();
        loadEvents(false);
      } catch (err) {
        toast('Save failed: ' + err.message, true);
        btn.disabled = false;
        $$('input,textarea,button',slot).forEach(function(control){control.disabled=false;});
        btn.textContent = $('#ev-publish').checked ? 'Publish event changes' : 'Save unpublished event';
      }
    });
  }

  /* ---------------- GALLERY (grouped by website section) ---------------- */
  var SECTION_DEFS = [
    { id: 'venue', title: 'The Venue', where: 'Gallery page → Main Hall stories (pick each photo’s group) · also the Rent page photo viewer', blurb: 'Main Hall, auditorium, conference room and other inside spaces.' },
    { id: 'weddings', title: 'Weddings', where: 'Gallery page → “Weddings” section', blurb: 'Ceremonies, receptions and wedding setups.' },
    { id: 'outdoor', title: 'Outdoor Spaces', where: 'Gallery page → “Outdoor spaces” section', blurb: 'Sculpture area, patio and outdoor gatherings.' },
  ];
  // Venue photos can also be placed in one of the Main Hall stories on the Gallery page.
  // These ids must match CHAPTERS in public/gallery.html.
  var GROUP_DEFS = [
    { id: '', title: 'Around the venue (general)' },
    { id: 'talks', title: 'Talks & workshops' },
    { id: 'wellness', title: 'Wellness & circles' },
    { id: 'receptions', title: 'Receptions & gatherings' },
    { id: 'performances', title: 'Concerts & performances' },
    { id: 'meetings', title: 'Meetings & classes' },
  ];
  function photoCard(p, idx, total) {
    var sections = SECTION_DEFS.map(function (sd) {
      return '<option value="' + sd.id + '"' + (p.section === sd.id ? ' selected' : '') + '>' + sd.title + '</option>';
    }).join('');
    var groups = GROUP_DEFS.map(function (gd) {
      return '<option value="' + gd.id + '"' + ((p.group || '') === gd.id ? ' selected' : '') + '>' + gd.title + '</option>';
    }).join('');
    var groupPicker = (p.section || 'venue') === 'venue'
      ? '<label class="pc-section-label">Gallery page group<select data-ph="group" data-idx="' + idx + '">' + groups + '</select></label>'
      : '';
    return '<div class="photo-card">' +
      '<img src="' + esc(p.image) + '" alt="' + esc(p.alt || '') + '" loading="lazy" onerror="this.style.opacity=0.25">' +
      '<div class="pc-body">' +
      (p.draft ? '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px"><span style="background:#fdf0d5;color:#8a6d00;border:1px solid #ecd28a;border-radius:999px;padding:2px 10px;font-size:.76rem;font-weight:700">\u25CF NOT PUBLISHED</span><button type="button" class="btn btn-primary" style="padding:6px 14px;font-size:.85rem" data-ph-publish="' + idx + '">Publish to website</button></div>' : '') +
      '<input data-ph="caption" data-idx="' + idx + '" value="' + esc(p.caption || '') + '" placeholder="Caption (shown under the photo)">' +
      '<input data-ph="alt" data-idx="' + idx + '" value="' + esc(p.alt || '') + '" placeholder="Describe the photo (for accessibility)">' +
      '<label class="pc-section-label">Website section<select data-ph="section" data-idx="' + idx + '">' + sections + '</select></label>' +
      groupPicker +
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
      return '<section class="group-block gallery-section-card" aria-labelledby="gallery-title-'+sd.id+'" id="gal-group-' + sd.id + '">' +
        '<div class="group-head"><div><span class="gallery-section-eyebrow">Gallery collection</span><h3 id="gallery-title-'+sd.id+'">' + sd.title + ' <span class="group-count">' + mine.length + ' photo' + (mine.length === 1 ? '' : 's') + '</span></h3>' +
        '<p>' + sd.blurb + '<br><span class="where">Appears: ' + sd.where + '</span></p></div>' +
        '<label class="btn btn-primary btn-small" style="margin:0">+ Add photos<input type="file" class="gal-upload-group" data-section="' + sd.id + '" accept="image/*" multiple hidden></label></div>' +
        '<div class="gallery-section-photos">'+cards+'</div></section>';
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
    return panelShell('gallery', 'Photo Gallery', 'Each collection below matches one section on the website. Edit photos together, save a draft, then publish your gallery changes when ready.', inner);
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
        if (wasDraft) { await saveJsonSection('gallery', null, 'draft'); }
      });
    });
    $$('#photoGroups [data-ph-publish]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var idx = +b.getAttribute('data-ph-publish');
        if(state.unsaved.gallery && !confirm('Publish this photo together with your current gallery changes?')) return;
        state.data.gallery.photos[idx].draft = false;
        setDirty('gallery',true);
        b.disabled = true; b.textContent = 'Publishing\u2026';
        var okSave = await saveJsonSection('gallery', null);
        if (okSave === false) { state.data.gallery.photos[idx].draft = true; setDirty('gallery',true); rerender(); return; }
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
          var safeName = Date.now() + '-' + Math.random().toString(36).slice(2,7) + '-' + prep.name.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
          await api('/api/dash-save', { method: 'POST', body: JSON.stringify({ path: 'public/images/' + safeName, contentBase64: prep.base64 }) });
          state.data.gallery.photos.push({ image: '/images/' + safeName, caption: '', alt: '', section: section, draft: true });
        } catch (e) {
          toast('Upload failed for ' + f.name + ': ' + e.message, true);
        }
      }
      rerender();
      setDirty('gallery',true);
      var saved = await saveJsonSection('gallery', null, 'draft');
      if(saved) toast('Photos saved in the dashboard as NOT PUBLISHED \u2014 safe here even if you refresh. Press \u201CPublish to website\u201D on a photo when you are ready for everyone to see it.');
      fileInput.value = '';
    }
    $$('#photoGroups .gal-upload-group').forEach(function (input) {
      input.addEventListener('change', function () { handleUploads(input, input.getAttribute('data-section')); });
    });
    var addUrl = $('#gal-add-url');
    if (addUrl) addUrl.onclick = async function () {
      var url = window.prompt('Paste the photo link (it should start with /images/ or https://):');
      if (!url) return;
      state.data.gallery.photos.push({ image: url.trim(), caption: '', alt: '', section: 'venue', draft: true });
      rerender();
      setDirty('gallery',true);
      var saved = await saveJsonSection('gallery', null, 'draft');
      if(saved) toast('Photo saved as NOT PUBLISHED \u2014 press its Publish button when it should go live.');
    };
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
        '<div class="field"><label>Short description</label><textarea data-pt="' + i + '" data-k="description" rows="2">' + esc(p.description != null ? p.description : p.blurb || '') + '</textarea></div>' +
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
      state.data.partners.partners.push({ name: '', category: '', description: '', website: '', image: '' });
      setDirty('partners', true);
      refreshPanel('partners');
    });
  }

  /* ---------------- SETTINGS ---------------- */
  function settingsField(f, value) {
    if(f.type === 'boolean') return '<label class="switch-field"><span><strong>'+esc(f.label)+'</strong></span><input type="checkbox" data-setting-toggle="'+f.key+'" '+(value?'checked':'')+'><span class="switch-track" aria-hidden="true"></span></label>';
    var html = fieldHtml(f.label,f.key,value,{textarea:f.type==='textarea',rows:3,hint:f.hint,placeholder:f.type==='image'||f.type==='icon'?'Upload an image or enter /images/…':''});
    if(f.type === 'image' || f.type === 'icon') html = '<div class="asset-field">'+html+'<div class="asset-controls"><div class="asset-preview"><img data-asset-preview="'+f.key+'" src="'+esc(SaneSettings.safeUrl(value,'image'))+'" alt="'+esc(f.label)+' preview" '+(!value?'hidden':'')+'></div><label class="btn btn-ghost btn-small">Upload '+(f.type==='icon'?'icon':'image')+'<input type="file" data-asset="'+f.key+'" accept="'+(f.type==='icon'?'.png,.ico':'.png,.jpg,.jpeg,.webp,.gif')+'" hidden></label><span class="asset-upload-status" data-asset-status="'+f.key+'" role="status">Maximum 4 MB</span></div></div>';
    return html;
  }
  var PAGE_CHOICES = [['/','Homepage'],['/about/','About'],['/contact/','Contact'],['/events/','Upcoming events'],['/events/past/','Past events'],['/rent/','Rent'],['/rent/pricing/','Rates & availability'],['/rent/weddings/','Weddings'],['/rent/farm/','Farm'],['/gallery/','Gallery'],['/partners/','Partners'],['/sculpture/','Sculpture'],['/evo3/','EVO 3'],['/lifestyle/','Lifestyle'],['/inspiration/','Inspiration'],['/self-heal/','Self 2 Heal'],['/lifestyle/natures-bio/','Nature’s Bio'],['/lifestyle/sapiens-ego/','Sapiens Ego'],['/lifestyle/ai-algo/','AI Algo'],['/lifestyle/evo3/','Lifestyle EVO 3'],['/self-heal/eat/','Eat'],['/self-heal/move/','Move'],['/self-heal/detox/','Detox'],['/self-heal/destress/','Destress']];
  function metadataEditor() {
    var route = state.metaRoute || '/', meta = (state.data.settings.pageMeta || {})[route] || {};
    return '<div class="metadata-editor"><h4>Individual page overrides</h4><p class="section-help">Leave a field blank to keep that page’s existing default.</p><div class="field"><label for="meta-route">Choose a page</label><select id="meta-route">'+PAGE_CHOICES.map(function(p){return '<option value="'+p[0]+'" '+(p[0]===route?'selected':'')+'>'+p[1]+'</option>';}).join('')+'</select></div>'+['title','description','image'].map(function(key){return '<div class="field"><label for="meta-'+key+'">'+({title:'Search title',description:'Search description',image:'Sharing image URL'})[key]+'</label><input id="meta-'+key+'" data-meta-input="'+key+'" value="'+esc(meta[key] || '')+'"></div>';}).join('')+'</div>';
  }
  function navigationEditor() {
    return '<div class="navigation-editor">'+state.data.settings.navigation.map(function(n,i){return '<div class="navigation-row"><div class="nav-order">'+(i+1)+'</div><div class="field"><label for="nav-label-'+i+'">Menu label</label><input id="nav-label-'+i+'" data-menu-label="'+i+'" value="'+esc(n.label)+'"><span class="hint">'+esc(n.route)+'</span></div><label class="menu-visible"><input type="checkbox" data-menu-visible="'+i+'" '+(n.visible?'checked':'')+'> Visible</label><div class="reorder-actions"><button type="button" class="icon-btn" data-menu-move="'+i+'" data-direction="-1" aria-label="Move '+esc(n.label)+' up" '+(i===0?'disabled':'')+'>↑</button><button type="button" class="icon-btn" data-menu-move="'+i+'" data-direction="1" aria-label="Move '+esc(n.label)+' down" '+(i===state.data.settings.navigation.length-1?'disabled':'')+'>↓</button></div></div>';}).join('')+'</div>';
  }
  function renderSettings() {
    var x = state.data.settings || SaneSettings.normalize({});
    var tabs = '<div class="settings-tabs" role="tablist" aria-label="Website settings categories">'+SaneSettings.groups.map(function(g){var active=state.settingsTab===g.id;return '<button type="button" role="tab" id="tab-'+g.id+'" aria-controls="settings-'+g.id+'" aria-selected="'+active+'" tabindex="'+(active?'0':'-1')+'" data-settings-tab="'+g.id+'">'+esc(g.label)+'</button>';}).join('')+'</div>';
    var panels = SaneSettings.groups.map(function(g){return '<div role="tabpanel" aria-labelledby="tab-'+g.id+'" id="settings-'+g.id+'" class="settings-tab-panel '+(state.settingsTab===g.id?'is-active':'')+'"><div class="card settings-card"><div class="workspace-card-head"><div><span class="workspace-eyebrow">Website settings</span><h3>'+esc(g.label)+'</h3><p>'+esc(g.intro)+'</p></div></div><div class="settings-fields">'+g.fields.map(function(f){return settingsField(f,x[f.key]);}).join('')+(g.id==='sharing'?metadataEditor():'')+(g.id==='navigation'?navigationEditor():'')+'</div></div></div>';}).join('');
    return panelShell('settings','Settings','Shared site controls, ready for the next design. Save a draft to review with the team, or publish changes to the website.',tabs+panels+savebarHtml('settings'));
  }
  function selectSettingsTab(id, focus) {
    state.settingsTab=id;
    $$('#panel-settings [role="tab"]').forEach(function(b){var active=b.dataset.settingsTab===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();});
    $$('#panel-settings [role="tabpanel"]').forEach(function(p){p.classList.toggle('is-active',p.id==='settings-'+id);});
  }
  function bindSettings() {
    var root=$('#panel-settings');
    bindFields('settings',root);
    $$('[data-settings-tab]',root).forEach(function(b){b.onclick=function(){selectSettingsTab(b.dataset.settingsTab);};b.onkeydown=function(e){var tabs=$$('[data-settings-tab]',root),i=tabs.indexOf(b);if(['ArrowRight','ArrowLeft','Home','End'].indexOf(e.key)===-1)return;e.preventDefault();var next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectSettingsTab(tabs[next].dataset.settingsTab,true);};});
    $$('[data-setting-toggle]',root).forEach(function(b){b.onchange=function(){state.data.settings[b.dataset.settingToggle]=b.checked;setDirty('settings',true);};});
    $$('[data-menu-label]',root).forEach(function(b){b.oninput=function(){state.data.settings.navigation[+b.dataset.menuLabel].label=b.value;setDirty('settings',true);};});
    $$('[data-menu-visible]',root).forEach(function(b){b.onchange=function(){state.data.settings.navigation[+b.dataset.menuVisible].visible=b.checked;setDirty('settings',true);};});
    $$('[data-menu-move]',root).forEach(function(b){b.onclick=function(){var i=+b.dataset.menuMove,j=i+(+b.dataset.direction),arr=state.data.settings.navigation;if(j<0||j>=arr.length)return;var item=arr.splice(i,1)[0];arr.splice(j,0,item);setDirty('settings',true);refreshPanel('settings');};});
    var route=$('#meta-route');
    if(route)route.onchange=function(){state.metaRoute=route.value;refreshPanel('settings');};
    $$('[data-meta-input]',root).forEach(function(input){input.oninput=function(){var r=state.metaRoute||'/';var map=state.data.settings.pageMeta||(state.data.settings.pageMeta={});var entry=map[r]||(map[r]={});entry[input.dataset.metaInput]=input.value;setDirty('settings',true);};});
    $$('[data-asset-preview]',root).forEach(function(img){var input=$('#f-settings-'+img.dataset.assetPreview);if(input)input.addEventListener('input',function(){var url=SaneSettings.safeUrl(input.value,'image');img.hidden=!url;img.src=url;});img.onerror=function(){img.hidden=true;};});
    $$('[data-asset]',root).forEach(function(input){input.onchange=async function(){
      var file=input.files[0],key=input.dataset.asset,status=$('[data-asset-status="'+key+'"]',root);if(!file)return;
      if(file.size>4*1024*1024){toast('Choose an image smaller than 4 MB.',true);input.value='';return;}
      var ext=file.name.split('.').pop().toLowerCase();if(!/^(png|jpe?g|webp|gif|ico)$/.test(ext)){toast('Use PNG, JPEG, WebP, GIF or ICO.',true);return;}
      input.disabled=true;state.uploading=true;updateSaveUI('settings');status.textContent='Uploading…';
      try {
        var encoded=await new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(String(reader.result).split(',')[1]);};reader.onerror=reject;reader.readAsDataURL(file);});
        var path='public/images/'+key.toLowerCase()+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)+'.'+ext;
        var result=await api('/api/dash-save',{method:'POST',body:JSON.stringify({path:path,contentBase64:encoded})});
        state.data.settings[key]=result.url;setDirty('settings',true);
        var field=$('#f-settings-'+key);field.value=result.url;var image=$('[data-asset-preview="'+key+'"]',root);var previewUrl=URL.createObjectURL(file);image.src=previewUrl;image.hidden=false;image.onload=function(){URL.revokeObjectURL(previewUrl);};
        status.textContent='Uploaded. Save draft or publish to use it.';toast('Uploaded. Your published image stays in place until you publish settings.');
      }catch(e){status.textContent='Upload failed. Try again.';toast(e.message,true);}finally{state.uploading=false;updateSaveUI('settings');input.disabled=false;input.value='';}
    };});
  }
  /* ---------------- ABOUT: structured source, friendly editor ---------------- */
  function aboutSectionEditor(section,index,total) {
    return '<details class="about-section-card card" '+((state.aboutOpen==null?0:state.aboutOpen)===index?'open':'')+'><summary><span class="chapter-number">'+String(index+1).padStart(2,'0')+'</span><span data-chapter-title="'+index+'">'+esc(section.heading||'Untitled section')+'</span><span class="section-chevron" aria-hidden="true">⌄</span></summary><div class="about-section-fields">'+
      '<div class="field"><label for="about-heading-'+index+'">Section heading</label><input id="about-heading-'+index+'" data-about-field="heading" data-section-index="'+index+'" value="'+esc(section.heading)+'"></div>'+
      '<div class="field"><label for="about-body-'+index+'">Story text</label><div class="writing-toolbar" role="group" aria-label="Text formatting">'+formattingButtons('about-body-'+index)+'</div><textarea id="about-body-'+index+'" class="story-text" data-about-field="body" data-section-index="'+index+'" rows="6">'+esc(section.body||'')+'</textarea></div>'+
      '<details class="section-options"><summary>Image &amp; link options</summary><div class="form-row">'+['linkText','linkUrl','image'].map(function(k){return '<div class="field"><label for="about-'+k+'-'+index+'">'+({linkText:'Link label',linkUrl:'Link destination',image:'Section image URL'})[k]+'</label><input id="about-'+k+'-'+index+'" data-about-field="'+k+'" data-section-index="'+index+'" value="'+esc(section[k]||'')+'"></div>';}).join('')+'</div><label class="check-label"><input type="checkbox" data-about-external="'+index+'" '+(section.external?'checked':'')+'> Open section link in a new tab</label></details>'+
      '<label class="check-label" style="margin-bottom:18px"><input type="checkbox" data-about-visible="'+index+'" '+(section.visible!==false?'checked':'')+'> Show this section on the website</label>'+
      '<div class="section-tools"><div><button type="button" class="btn btn-ghost btn-small" data-about-move="'+index+'" data-direction="-1" '+(index===0?'disabled':'')+'>Move up</button> <button type="button" class="btn btn-ghost btn-small" data-about-move="'+index+'" data-direction="1" '+(index===total-1?'disabled':'')+'>Move down</button></div><button type="button" class="btn btn-text btn-small danger-text" data-about-remove="'+index+'">Remove section</button></div></div></details>';
  }
  function formattingButtons(target) { return [['bold','Bold'],['italic','Italic'],['list','List'],['link','Link']].map(function(item){return '<button type="button" data-format="'+item[0]+'" data-target="'+target+'">'+item[1]+'</button>';}).join(''); }
  function renderAbout() {
    var documentModel;
    try { documentModel=SaneContent.parseAbout(state.aboutText); }catch(e){return panelShell('about','About page','Content needs attention.','<div class="editor-feedback"><p>'+esc(e.message)+'</p></div>'+savebarHtml('about'));}
    state.aboutDocument=documentModel;
    var sections=documentModel.metadata.sections||[];
    var html='<div class="about-toolbar"><div><span class="workspace-eyebrow">Page editor</span><p>Write naturally. Use the preview to review your changes before publishing.</p></div><div class="segmented-control" role="group" aria-label="About workspace"><button type="button" data-about-mode="edit" aria-pressed="true">Edit</button><button type="button" data-about-mode="preview" aria-pressed="false">Preview</button></div></div>'+
      '<div id="aboutEdit"><div class="card about-title-card"><div class="field"><label for="aboutTitle">Page title</label><input id="aboutTitle" value="'+esc(documentModel.metadata.title||'About Sane Living')+'"></div></div><div id="aboutSections">'+sections.map(function(s,i){return aboutSectionEditor(s,i,sections.length);}).join('')+'</div>'+
      '<button type="button" class="btn btn-ghost add-section" id="aboutAdd">+ Add a section</button>'+
      '<div class="card about-additional '+(!documentModel.body.trim()&&!sections.length?'':'is-optional')+'"><details '+(!sections.length||documentModel.body.trim()?'open':'')+'><summary>Additional page text</summary><div class="field"><label for="aboutArticle">Text after the main sections</label><div class="writing-toolbar">'+formattingButtons('aboutArticle')+'</div><textarea id="aboutArticle" class="story-text" rows="6">'+esc(documentModel.body)+'</textarea></div></details></div></div>'+
      '<div class="card about-reading-preview" id="aboutRead" hidden><div class="preview-label">Draft preview · not published</div><div class="md-preview" id="aboutPreview">'+SaneContent.aboutPreview(documentModel)+'</div></div>'+
      '<div class="about-editor-count" id="aboutWords">'+aboutWordCount(documentModel)+' words</div>'+savebarHtml('about');
    return panelShell('about','About page','Tell the Sane Living story. Edit each section below, save a shared draft, then publish when it is ready.',html);
  }
  function aboutWordCount(doc) {var text=(doc.metadata.sections||[]).map(function(s){return s.heading+' '+s.body;}).join(' ')+' '+doc.body;return text.trim()?text.trim().split(/\s+/).length:0;}
  function aboutChanged() {
    state.aboutText=SaneContent.serializeAbout(state.aboutDocument);setDirty('about',true);
    var preview=$('#aboutPreview');if(preview)preview.innerHTML=SaneContent.aboutPreview(state.aboutDocument);
    var count=$('#aboutWords');if(count)count.textContent=aboutWordCount(state.aboutDocument)+' words';
  }
  async function saveAbout(btn) {return saveSection('about','publish');}
  function bindAbout() {
    var root=$('#panel-about');if(!$('#aboutTitle'))return;
    $('#aboutTitle').oninput=function(){state.aboutDocument.metadata.title=this.value;aboutChanged();};
    $$('[data-about-field]',root).forEach(function(input){input.oninput=function(){var i=+input.dataset.sectionIndex,key=input.dataset.aboutField;state.aboutDocument.metadata.sections[i][key]=input.value;if(key==='heading')$('[data-chapter-title="'+i+'"]',root).textContent=input.value||'Untitled section';aboutChanged();};});
    $$('[data-about-external]',root).forEach(function(input){input.onchange=function(){state.aboutDocument.metadata.sections[+input.dataset.aboutExternal].external=input.checked;aboutChanged();};});
    $$('[data-about-visible]',root).forEach(function(input){input.onchange=function(){state.aboutDocument.metadata.sections[+input.dataset.aboutVisible].visible=input.checked;aboutChanged();};});
    $('#aboutArticle').oninput=function(){state.aboutDocument.body=this.value;aboutChanged();};
    $('#aboutAdd').onclick=function(){if(!state.aboutDocument.metadata.sections)state.aboutDocument.metadata.sections=[];state.aboutDocument.metadata.sections.push({heading:'New section',body:'',linkText:'',linkUrl:'',external:false});state.aboutOpen=state.aboutDocument.metadata.sections.length-1;aboutChanged();refreshPanel('about');var fields=$$('[data-about-field="heading"]');fields[fields.length-1].focus();};
    $$('[data-about-remove]',root).forEach(function(b){b.onclick=function(){if(!confirm('Remove this section from your draft?'))return;state.aboutDocument.metadata.sections.splice(+b.dataset.aboutRemove,1);state.aboutOpen=0;aboutChanged();refreshPanel('about');};});
    $$('[data-about-move]',root).forEach(function(b){b.onclick=function(){var i=+b.dataset.aboutMove,j=i+(+b.dataset.direction),arr=state.aboutDocument.metadata.sections;if(j<0||j>=arr.length)return;var item=arr.splice(i,1)[0];arr.splice(j,0,item);state.aboutOpen=j;aboutChanged();refreshPanel('about');};});
    $$('[data-about-mode]',root).forEach(function(b){b.onclick=function(){var preview=b.dataset.aboutMode==='preview';$('#aboutEdit').hidden=preview;$('#aboutRead').hidden=!preview;$$('[data-about-mode]',root).forEach(function(button){button.setAttribute('aria-pressed',String(button===b));});};});
    $$('[data-format]',root).forEach(function(b){b.onclick=function(){var ta=$('#'+b.dataset.target),start=ta.selectionStart,end=ta.selectionEnd,selection=ta.value.slice(start,end)||'your text',text=selection;if(b.dataset.format==='bold')text='**'+selection+'**';if(b.dataset.format==='italic')text='*'+selection+'*';if(b.dataset.format==='list')text=selection.split('\n').map(function(line){return '- '+line;}).join('\n');if(b.dataset.format==='link'){var url=prompt('Link destination (https://… or /page/):','/');if(!url)return;if(!SaneSettings.safeUrl(url,'link')){toast('Use an HTTPS link or a /page/ path.',true);return;}text='['+selection+']('+url+')';}ta.setRangeText(text,start,end,'select');ta.dispatchEvent(new Event('input',{bubbles:true}));ta.focus();};});
  }

  /* ---------------- render / bind orchestration ---------------- */
  function renderEditor(){return '<section class="panel" id="panel-editor"><div id="pageEditorHost"></div></section>';}
  var RENDER = { editor:renderEditor, home: renderHome, events: renderEvents, gallery: renderGallery, weddings: renderWeddings, pricing: renderPricing, partners: renderPartners, settings: renderSettings, about: renderAbout };
  var BIND = { home: bindHome, events: bindEventButtons, gallery: bindGallery, weddings: bindWeddings, pricing: bindPricing, partners: bindPartners, settings: bindSettings, about: bindAbout };
  function renderAll() {
    $('#panels').innerHTML = SECTIONS.map(function (s) { fieldScope=s.id; return RENDER[s.id](); }).join('');
    SECTIONS.forEach(function (s) { if (BIND[s.id]) BIND[s.id](); });
    bindSavebars($('#panels'));
    Object.keys(state.versions).forEach(updateSaveUI);
    $$('#panels [data-goto]').forEach(function (b) {
      b.addEventListener('click', function () { goTo(b.getAttribute('data-goto')); });
    });
  }
  function refreshPanel(id) {
    var old = $('#panel-' + id);
    if (!old) return;
    var wasActive = old.classList.contains('active');
    var tmp = document.createElement('div');
    fieldScope=id;
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
    try { await loadContentSection('about'); } catch(e) { state.loadErrors.about=e.message; state.loaded.about=false; state.aboutText=''; }
    renderAll();
    goTo(location.hash==='#about'?'about':SECTIONS.some(function(s){return '#'+s.id===location.hash;})?location.hash.slice(1):'home');
    loadEvents(false);
  }

  window.addEventListener('beforeunload',function(e){ if(state.uploading || Object.keys(state.unsaved).some(function(k){return state.unsaved[k];})){e.preventDefault();e.returnValue='';} });

  window.addEventListener('hashchange',function(){if(entered)goTo(location.hash.slice(1));});
  /* ---------------- boot ---------------- */
  fetch('/content/settings.json',{cache:'no-cache'}).then(function(r){return r.ok?r.json():null;}).then(function(s){if(s)applyDashboardBranding(s);}).catch(function(){});
  (async function boot() {
    try {
      var data = await api('/api/dash-login');
      if (data.loggedIn) enterApp();
    } catch (e) { /* stay on login */ }
  })();
})();


