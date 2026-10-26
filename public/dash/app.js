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
    var resp = await fetch(path, Object.assign({ cache:'no-store', headers: { 'Content-Type': 'application/json' } }, options || {}));
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
    if(window.SaneEvents)return SaneEvents.today();
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

  var homeView={content:false},overviewPublishedSettings=null;
  var galleryView={query:'',filter:'all',pages:{},open:{venue:true},photoOpen:new Set()};
  var galleryKeys=new WeakMap(),galleryKeyNumber=0,settingsOpen={};
  var weddingMediaView={query:"",page:0};
  function photoKey(photo){if(!galleryKeys.has(photo))galleryKeys.set(photo,'photo-'+(++galleryKeyNumber));return galleryKeys.get(photo);}
  function revealPhoto(photo){var section=photo.section||'venue',photos=state.data.gallery.photos.filter(function(p){return (p.section||'venue')===section;});galleryView.query='';galleryView.filter='all';galleryView.open[section]=true;galleryView.pages[section]=Math.floor(photos.indexOf(photo)/12);galleryView.photoOpen.add(photoKey(photo));}

  var eventWorkspace=SaneEventWorkspace.create({state:state,esc:esc,dirty:setDirty,toast:toast,request:api,goto:goTo,refreshEvents:function(){refreshPanel('events');},bindCalendar:bindEventButtons,eventCard:eventCard,openCalendar:openEventEditor,saveDraft:function(id){return saveSection(id,'draft');},uploading:function(value){state.uploading=value;Object.keys(state.versions).forEach(updateSaveUI);}});

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
    if(id==='home' && $('#panel-home'))refreshPanel('home');
    if(id==='weddings')updateWeddingCollection();
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
    if (detail) detail.textContent = id==='eventStories'&&state.eventStoryPublication&&!state.unsaved[id]?'Approved story changes were published. Unapproved planning and archive drafts are kept for the team.':state.busy[id] ? 'You can keep editing while this version saves.' : state.unsaved[id] ? (state.storageOk ? 'Recovered on this device after refresh. Save draft to share it with the team.' : 'Device recovery is unavailable. Save a shared draft before leaving.') : state.dirty[id] ? 'Shared draft saved. The public website has not changed.' : 'Publish changes when you want to update the website.';
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
    eventStories:{file:'public/content/event-stories.json',load:'/content/event-stories.json'},
    gallery: { file: 'public/content/gallery.json', load: '/content/gallery.json' },
    weddings: { file: 'public/content/weddings.json', load: '/content/weddings.json' },
    pricing: { file: 'public/content/pricing.json', load: '/content/pricing.json' },
    partners: { file: 'public/content/partners.json', load: '/content/partners.json' },
    settings: { file: 'public/content/settings.json', load: '/content/settings.json' }
  };
  async function loadContentSection(id, publishedOnly, supplied) {
    var response = supplied || await api('/api/dash-content?section=' + encodeURIComponent(id));
    if (!response.published) throw new Error('The published content is missing. Ask an administrator to restore this section.');
    var published = response.published.content;
    // Validate before replacing local state; bad remote content cannot erase a recovered draft.
    if (id === 'about') SaneContent.parseAbout(published); else JSON.parse(published);
    if(id==='eventStories'){var storyErrors=SaneEvents.validate(JSON.parse(published),false);if(storyErrors.length)throw Error('Event stories could not be loaded: '+storyErrors.join(' '));}
    state.versions[id] = { sha: response.published.sha, draftSha: response.draft ? response.draft.sha : null, published: published };
    if(id==='settings'){overviewPublishedSettings=published;applyDashboardBranding(JSON.parse(published));}
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
    if (id === 'eventStories') return SaneEvents.validate(state.data.eventStories,true);
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
          if(!state.dirty[id]||id==='eventStories'&&state.eventStoryPublication&&!state.unsaved[id]){state.saveStates[id]=id==='eventStories'?'Approved stories live · planning drafts kept':'Live on the website';updateSaveUI(id);}return;
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
      state.dirty[id] = action === 'draft' || newerEdits || !!result.retainedDraft;
      if(id==='eventStories')state.eventStoryPublication=action==='publish';
      state.unsaved[id] = newerEdits;
      state.saveStates[id] = newerEdits ? 'New changes since the last save' : action === 'draft' ? 'Draft saved · '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}) : 'Published · deployment updating';
      if(action === 'publish') { version.published = result.publishedContent||snapshot; if(id==='settings'){overviewPublishedSettings=snapshot;applyDashboardBranding(JSON.parse(snapshot));} watchPublication(id,version.published); }
      if (newerEdits||result.warning) cacheWork(id); else try { localStorage.removeItem(RECOVERY_PREFIX+id); } catch(e) {}
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
      '<header class="dashboard-page-heading"><div class="page-head"><h2>' + esc(title) + '</h2>' + view + '</div>' +
      (sub ? '<p class="page-sub">' + esc(sub) + '</p>' : '') + '</header>' + inner + '</section>';
  }

  /* ---------------- HOME (with venue calendar) ---------------- */
  function eventsByDate() {
    var map = {};
    eventWorkspace.calendarItems().forEach(function (e) {
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
      var chips = evs.slice(0, 2).map(function (e) { return '<span class="cal-chip">' + esc((e.planning?'Planning: ':'')+e.title) + '</span>'; }).join('');
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
    var evs = eventWorkspace.calendarItems().filter(function (e) { return e.date && (state.calSelected?e.date===state.calSelected:e.date>=todayStr()); })
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
        '<span>' + esc([e.planning?'Planning draft':'',e.startTime ? (e.startTime + (e.endTime ? ' – ' + e.endTime : '')) : '', e.location || ''].filter(Boolean).join(' · ')) + '</span><button type="button" class="btn btn-ghost btn-small" data-home-event="'+esc(e.id)+'">'+(e.planning?'Edit planning draft':state.readOnly?'View event':'Edit event')+'</button></div></div>';
    }).join('');
  }
  function contentState(id){
    if(state.loadErrors[id]||state.conflicts[id]||state.errors[id])return {label:'Needs review',tone:'review',detail:state.loadErrors[id]||state.conflicts[id]||state.errors[id]};
    if(!state.loaded[id])return {label:'Unavailable',tone:'review',detail:'This section has not loaded. Open it to retry before editing.'};
    if(state.unsaved[id])return {label:'Unsaved changes',tone:'review',detail:'Changes are kept on this device. Save a draft to share them.'};
    if(state.dirty[id])return {label:'Draft saved',tone:'draft',detail:'Unpublished changes are waiting for review.'};
    return {label:'Published content',tone:'quiet',detail:'No unpublished changes in this loaded section.'};
  }
  function renderHome() {
    var ids=Object.keys(JSON_SECTIONS),photos=state.data.gallery&&state.data.gallery.photos||[],draftPhotos=photos.filter(function(p){return p.draft;}).length;
    var drafts=ids.filter(function(id){return state.dirty[id];}).length;
    var upcoming=state.events===null||state.eventsStatus&&(state.eventsStatus.kind==='err'||state.eventsStatus.kind==='warn'&&!state.readOnly)?'—':state.events.filter(function(e){return e.date&&e.date>=todayStr();}).length;
    var attention=ids.filter(function(id){return !state.loaded[id]||state.loadErrors[id]||state.conflicts[id]||state.errors[id]||state.dirty[id];}).map(function(id){var status=contentState(id),section=SECTIONS.find(function(x){return x.id===id;})||{id:'events',label:'Event details'};return '<button type="button" class="attention-row" data-goto="'+(id==='eventStories'?'events':id)+'"><span class="attention-copy"><strong>'+esc(section.label)+'</strong><span>'+esc(status.detail)+'</span></span><span class="status-chip status-'+status.tone+'">'+esc(status.label)+'</span><span aria-hidden="true">↗</span></button>';}).join('');
    if(draftPhotos)attention+='<button type="button" class="attention-row" data-home-gallery="draft"><span class="attention-copy"><strong>'+draftPhotos+' photo'+(draftPhotos===1?'':'s')+' marked not published</strong><span>Review these photos in the gallery before publishing.</span></span><span class="status-chip status-review">Photo review</span><span aria-hidden="true">↗</span></button>';
    var eventDrafts=state.readOnly?0:(state.events||[]).filter(function(e){return e.publish===false;}).length;
    if(eventDrafts)attention+='<button type="button" class="attention-row" data-goto="events"><span class="attention-copy"><strong>'+eventDrafts+' unpublished event'+(eventDrafts===1?'':'s')+'</strong><span>Saved in the calendar, hidden from the website.</span></span><span class="status-chip status-draft">Event drafts</span><span aria-hidden="true">↗</span></button>';
    var unfinishedEvent=false;try{unfinishedEvent=!!localStorage.getItem(RECOVERY_PREFIX+'event');}catch(e){}
    if(unfinishedEvent)attention+='<button type="button" class="attention-row" data-goto="events"><span class="attention-copy"><strong>Unfinished event on this device</strong><span>Open Events and choose Resume editing.</span></span><span class="status-chip status-review">Unsaved event</span><span aria-hidden="true">↗</span></button>';
    if(state.eventsStatus&&state.eventsStatus.kind==='err')attention+='<button type="button" class="attention-row" data-goto="events"><span class="attention-copy"><strong>Calendar could not be loaded</strong><span>Open Events to review the connection and retry.</span></span><span class="status-chip status-review">Needs review</span><span aria-hidden="true">↗</span></button>';
    if(state.eventsStatus&&state.eventsStatus.kind==='warn')attention+='<button type="button" class="attention-row" data-goto="events"><span class="attention-copy"><strong>'+(state.readOnly?'Calendar is read-only':'Calendar needs setup')+'</strong><span>'+(state.readOnly?'Published events can be viewed. Open Events for editing and connection details.':'Open Events for connection details before relying on the calendar.')+'</span></span><span class="status-chip status-review">Calendar status</span><span aria-hidden="true">↗</span></button>';
    if(!attention)attention='<div class="overview-clear"><strong>No content changes waiting for review</strong><p>Your content sections have no unfinished edits. Design drafts stay in Page Editor.</p></div>';
    var published=null;try{if(overviewPublishedSettings||state.versions.settings)published=SaneSettings.normalize(JSON.parse(overviewPublishedSettings||state.versions.settings.published));}catch(e){}
    var details=published?'<dl class="website-detail-list">'+[['Business',published.businessName],['Phone',published.phoneDisplay],['Email',published.email],['Address',published.address],['Hours',published.hours]].map(function(pair){return '<div><dt>'+pair[0]+'</dt><dd>'+esc(pair[1]||'Not set')+'</dd></div>';}).join('')+'</dl><div class="overview-actions"><button type="button" class="btn btn-ghost btn-small" data-home-settings="contact">Edit contact details</button><button type="button" class="btn btn-ghost btn-small" data-home-settings="booking">Booking settings</button></div>':'<p class="empty-note">Published website details could not be loaded. Open Settings to review the source.</p>';
    var contentRows=ids.map(function(id){var status=contentState(id),section=SECTIONS.find(function(x){return x.id===id;})||{id:'events',label:'Event details'},data=state.data[id],detail=id==='gallery'&&data?data.photos.length+' photos':id==='partners'&&data?data.partners.length+' partners':id==='pricing'&&data?data.rows.length+' rate sessions':id==='weddings'&&data?(data.highlights||[]).length+' highlights':id==='settings'?'Brand, contact and site-wide settings':'Content section';return '<button type="button" class="content-status-row" data-goto="'+(id==='eventStories'?'events':id)+'"><span><strong>'+esc(section.label)+'</strong><small>'+esc(detail)+'</small></span><span class="status-chip status-'+status.tone+'">'+esc(status.label)+'</span><span aria-hidden="true">↗</span></button>';}).join('');
    var calendarError=state.eventsStatus&&(state.eventsStatus.kind==='err'||state.eventsStatus.kind==='warn'&&!state.readOnly);
    var calendar=(calendarError?'<p class="section-help">The live calendar is unavailable. You can still prepare shared planning drafts below.</p>':'')+'<div id="homeCal">'+calGridHtml()+'</div>'+(state.readOnly?'<p class="section-help">Published events are read-only until Airtable is connected. Planning drafts can be added and saved now.</p>':'');
    return panelShell('home','Website overview','See what needs attention, check your published details and plan what comes next. Editing stays in each dedicated page.',
      '<div class="grid grid-3 home-metrics"><div class="card stat-card"><div class="metric-copy"><div class="num">'+upcoming+'</div><div class="lbl">upcoming events</div></div><span class="metric-symbol" aria-hidden="true">'+SECTIONS[1].icon+'</span></div><div class="card stat-card"><div class="metric-copy"><div class="num">'+(state.loaded.gallery?photos.length:'—')+'</div><div class="lbl">photos in the gallery</div></div><span class="metric-symbol" aria-hidden="true">'+SECTIONS[2].icon+'</span></div><div class="card stat-card"><div class="metric-copy"><div class="num">'+drafts+'</div><div class="lbl">sections with drafts</div></div><span class="metric-symbol" aria-hidden="true">'+SECTIONS[6].icon+'</span></div></div>'+
      '<div class="dashboard-overview-layout"><div class="overview-column overview-main-column"><section class="card overview-calendar"><div class="overview-card-head"><span class="workspace-eyebrow">Plan your next gathering</span><h3>Venue calendar</h3><p>Choose a day to see events or plan something new.</p><button type="button" class="btn btn-primary btn-small" data-home-add-event>+ Add event'+(state.calSelected?' on '+esc(state.calSelected):'')+'</button></div>'+calendar+'</section><section class="card overview-upcoming"><div id="homeCalList">'+(calendarError?'<h3 class="block-title">Upcoming events unavailable</h3><p>Open Events to review the connection and retry.</p>':state.events===null?'<p>Loading upcoming events…</p>':calDayListHtml())+'</div>'+(state.calSelected?'<button type="button" class="btn btn-ghost btn-small" data-home-clear-day>Show all upcoming events</button>':'')+'<div class="overview-actions"><button type="button" class="btn btn-ghost btn-small" data-goto="events">Manage events</button></div></section><div class="overview-secondary"><details class="card overview-disclosure" data-home-disclosure="content" '+(homeView.content?'open':'')+'><summary><span><strong>Content status</strong><small>Check counts and publication status for each section.</small></span><span class="disclosure-chevron" aria-hidden="true">⌄</span></summary><div class="content-status-list">'+contentRows+'</div></details></div></div><div class="overview-column overview-side-column"><section class="card overview-attention"><div class="overview-card-head"><span class="workspace-eyebrow">Your next steps</span><h3>Needs your attention</h3><p>Unfinished edits and unpublished content, together in one place.</p></div><div class="attention-list">'+attention+'</div><div class="overview-footnote">Design any page, preview your changes and publish when ready in <button type="button" class="inline-action" data-goto="editor">Page Editor ↗</button>.</div></section><section class="card overview-details"><div class="overview-card-head"><span class="workspace-eyebrow">Published details</span><h3>Your website at a glance</h3><p>These values come from published Settings. Draft changes stay separate.</p></div>'+details+'</section></div></div>');
  }
  function bindHome() {
    var root = $('#panel-home');
    if (!root) return;
    $$('[data-home-event]',root).forEach(function(b){b.onclick=function(){var id=b.dataset.homeEvent,e=eventWorkspace.calendarItems().find(function(x){return x.id===id;});goTo('events');if(e&&e.planning){eventWorkspace.openStory(id);}else if(e&&eventWorkspace.connected())openEventEditor(e);};});
    var quick=$('[data-home-add-event]',root);if(quick)quick.onclick=function(){goTo('events');openEventEditor({date:state.calSelected||todayStr()});};
    $$('[data-home-disclosure]',root).forEach(function(d){d.ontoggle=function(){homeView[d.dataset.homeDisclosure]=d.open;};});
    $$('[data-home-settings]',root).forEach(function(b){b.onclick=function(){goTo('settings');selectSettingsTab(b.dataset.homeSettings);var group=$('[data-settings-group]',$('#settings-'+b.dataset.homeSettings));if(group){group.open=true;settingsOpen[group.dataset.settingsGroup]=true;$('summary',group).focus({preventScroll:true});}};});
    $$('[data-home-gallery]',root).forEach(function(b){b.onclick=function(){galleryView.filter=b.dataset.homeGallery;galleryView.query='';galleryView.pages={};goTo('gallery');refreshPanel('gallery');};});
    var clear=$('[data-home-clear-day]',root);if(clear)clear.onclick=function(){state.calSelected='';refreshPanel('home');};
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
      eventWorkspace.calendarDetailsHtml(e)+'</div>';
  }
  function eventFormHtml(e) {
    e = e || {};
    var v = function (k, dflt) { return e[k] !== undefined ? e[k] : (dflt || ''); };
    return '<div class="card editor-card" id="eventEditor" style="margin-bottom:18px">' +
      '<div class="event-editor-heading"><span class="workspace-eyebrow">Calendar entry</span><h3>'+(e.id?'Edit event':'New event')+'</h3><p>Start with the essentials, then add the details guests need.</p></div><section class="event-form-group" aria-labelledby="event-basics-title"><div class="subsection-heading"><h4 id="event-basics-title">Event essentials</h4><p>The name, date and time shown in the calendar.</p></div>' +
      '<div class="form-row">' +
      '<div class="field"><label for="ev-title">Title</label><input id="ev-title" value="' + esc(v('title')) + '"></div>' +
      '<div class="field"><label for="ev-date">Date</label><input id="ev-date" type="date" value="' + esc(v('date')) + '"></div></div>' +
      '<div class="form-row">' +
      '<div class="field"><label for="ev-start">Start time</label><input id="ev-start" value="' + esc(v('startTime')) + '" placeholder="7:00 PM"></div>' +
      '<div class="field"><label for="ev-end">End time</label><input id="ev-end" value="' + esc(v('endTime')) + '" placeholder="9:00 PM"></div></div>' +
      '</section><section class="event-form-group" aria-labelledby="event-details-title"><div class="subsection-heading"><h4 id="event-details-title">Location &amp; guest information</h4><p>Where it happens, what it costs and how guests can join.</p></div><div class="form-row">' +
      '<div class="field"><label for="ev-loc">Location</label><input id="ev-loc" value="' + esc(v('location')) + '" placeholder="Sane Living Center"></div>' +
      '<div class="field"><label for="ev-type">Type</label><input id="ev-type" value="' + esc(v('type')) + '" placeholder="Free"></div></div>' +
      '<div class="form-row">' +
      '<div class="field"><label for="ev-price">Price</label><input id="ev-price" value="' + esc(v('price')) + '" placeholder="$10 suggested donation"></div>' +
      '<div class="field"><label for="ev-rsvp">RSVP / tickets link</label><input id="ev-rsvp" value="' + esc(v('rsvpUrl')) + '" placeholder="https://…"></div></div>' +
      '<div class="field"><label for="ev-desc">Description</label><textarea id="ev-desc" rows="4">' + esc(v('description')) + '</textarea></div>' +
      '</section><section class="event-form-group event-publication" aria-labelledby="event-publication-title"><div class="subsection-heading"><h4 id="event-publication-title">Website visibility</h4><p>Keep an event unpublished while you prepare it.</p></div><div class="field"><label style="text-transform:none;letter-spacing:0;font-size:.95rem"><input type="checkbox" id="ev-publish" ' + (e.publish ? 'checked' : '') + ' style="width:auto;margin-right:8px">Show on the website (published)</label>' +
      '<div class="hint">Unticked events are drafts — saved in Airtable but hidden from the website.</div></div>' +
      '</section><p class="event-work-status" id="ev-work-status" role="status">Save this event to keep it in Airtable. The checkbox above controls whether it appears on the website.</p>'+
      '<div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap">' +
      '<button type="button" class="btn btn-primary" id="ev-save">' + (!eventWorkspace.connected()?'Save planning draft':e.publish ? 'Publish event changes' : 'Save unpublished event') + '</button>' +
      '<button type="button" class="btn btn-ghost" id="ev-cancel">Cancel</button></div></div>';
  }
  function renderEvents() {
    var inner = '<div id="syncSlot">' + syncBanner() + '</div>';
    inner += '<div class="workspace-list-heading"><div><span class="workspace-eyebrow">Venue calendar</span><h3>Your events</h3><p>Each card keeps the date, guest details and publication controls together.</p></div><button type="button" class="btn btn-primary" id="ev-add">+ Add an event</button></div>';
    var recoveredEvent = null; try { recoveredEvent = JSON.parse(localStorage.getItem(RECOVERY_PREFIX+'event') || 'null'); } catch(e){}
    if(recoveredEvent) inner += '<div class="event-recovery-note" id="eventRecovery">There is unfinished event work on this device. <button type="button" class="btn btn-ghost btn-small" id="ev-restore">Resume editing</button></div>';
    inner += eventWorkspace.toolbarHtml()+'<div id="eventEditorSlot"></div><div id="eventList">';
    inner += eventWorkspace.listHtml()+'</div><section class="event-details-save"><h3>Event details &amp; story publication</h3><p>Save a shared draft to keep planning work private. Publish changes updates approved stories; calendar visibility is controlled in Airtable.</p>'+savebarHtml('eventStories')+'</section>';
    return panelShell('events', 'Events', 'Plan events, workshops and wedding stories. Airtable controls the public calendar; the shared story library holds hosts, photos, recordings and archive details.', inner);
  }
  async function loadEvents(showToast) {
    try {
      var data = await api('/api/dash-events');
      state.events = data.events || [];
      state.readOnly = data.readOnly === true;
      var addBtn0 = $('#ev-add');
      if (addBtn0) addBtn0.style.display = '';
      if (state.readOnly) {
        state.eventsStatus = { kind: 'warn', msg: '<strong>Showing the live website\'s published events</strong> (read from saneliving.com). Viewing works without the Airtable keys — to add or change events here, the keys (AIRTABLE_API_TOKEN + AIRTABLE_BASE_ID) still need to be added in Vercel. ' + data.count + ' upcoming event' + (data.count === 1 ? '' : 's') + ' · loaded ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '.' };
      } else {
        state.eventsStatus = { kind: 'ok', msg: '<strong>Connected to Airtable.</strong> ' + data.count + ' event' + (data.count === 1 ? '' : 's') + ' in the calendar · loaded ' + new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '.' };
      }
      if (showToast) toast('Calendar reloaded.');

    } catch (e) {
      state.events = state.events || [];
      if (e.code === 'AIRTABLE_NOT_CONFIGURED') {
        state.eventsStatus = { kind: 'warn', msg: '<strong>Airtable is not connected yet.</strong> The calendar keys (AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID) still need to be added in Vercel — once they are, this page manages the real calendar. Nothing here can change events until then.' };
      } else if (e.message !== 'unauthorized') {
        state.eventsStatus = { kind: 'err', msg: '<strong>Could not reach Airtable.</strong> ' + esc(e.message) + ' <button type="button" class="btn btn-ghost btn-small" id="ev-retry">Retry</button>' };
      }
    }
    if($('#panel-home'))refreshPanel('home');
    var slot = $('#syncSlot');
    if (slot) {
      slot.innerHTML = syncBanner();
      var list = $('#eventList');
      if (list) list.innerHTML = eventWorkspace.listHtml();
      bindEventButtons();
      var retry = $('#ev-retry');
      if (retry) retry.addEventListener('click', function () { loadEvents(true); });
    }
  }
  function bindEventButtons() {
    eventWorkspace.bind();
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
          var r = await api('/api/dash-events', { method: 'PATCH', body: JSON.stringify({ id: e.id, publish: !e.publish,expectedVersion:e.version }) });
          var i = state.events.findIndex(function (x) { return x.id === e.id; });
          if (i >= 0) state.events[i] = r.event;
          $('#eventList').innerHTML = eventWorkspace.listHtml();
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
          await api('/api/dash-events', { method: 'DELETE', body: JSON.stringify({ id: e.id,expectedVersion:e.version }) });
          state.events = state.events.filter(function (x) { return x.id !== e.id; });
          $('#eventList').innerHTML = eventWorkspace.listHtml();
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
    slot.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    $('#ev-title').focus({preventScroll:true});
    var captureEvent=function(){var work={id:state.editingEventId,title:$('#ev-title').value,date:$('#ev-date').value,startTime:$('#ev-start').value,endTime:$('#ev-end').value,location:$('#ev-loc').value,type:$('#ev-type').value,price:$('#ev-price').value,rsvpUrl:$('#ev-rsvp').value,description:$('#ev-desc').value,publish:$('#ev-publish').checked};state.unsaved.events=true;try{localStorage.setItem(RECOVERY_PREFIX+'event',JSON.stringify(work));}catch(e){}var eventStatus=$('#ev-work-status');if(eventStatus)eventStatus.textContent='Unsaved event changes · kept on this device until you save.';$('#ev-save').textContent=!eventWorkspace.connected()?'Save planning draft':work.publish?'Publish event changes':'Save unpublished event';};
    $$('input,textarea',slot).forEach(function(input){input.addEventListener('input',captureEvent);input.addEventListener('change',captureEvent);});
    $('#ev-cancel').addEventListener('click', function () { if(state.unsaved.events&&!confirm('Discard the unfinished event changes on this device?'))return;slot.innerHTML = ''; state.editingEventId = null;state.unsaved.events=false;try{localStorage.removeItem(RECOVERY_PREFIX+'event');}catch(e){}var notice=$('#eventRecovery');if(notice)notice.remove(); });
    var planningId='';
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
        if(!eventWorkspace.connected()){
          if(!state.loaded.eventStories)throw Error('The shared event library has not loaded. Reload before saving.');
          var planning=planningId&&state.data.eventStories.stories.find(function(x){return x.id===planningId;});
          if(!planning){planning=SaneEvents.create(Object.assign({},payload,{summary:payload.description,published:false,period:payload.date<todayStr()?'past':'upcoming'}));planningId=planning.id;state.data.eventStories.stories.unshift(planning);}else Object.assign(planning,payload,{published:false});
          setDirty('eventStories',true);var saved=await saveSection('eventStories','draft');if(!saved)throw Error(state.errors.eventStories||'Planning draft could not be saved.');
          state.unsaved.events=false;try{localStorage.removeItem(RECOVERY_PREFIX+'event');}catch(storageError){}slot.innerHTML='';state.editingEventId=null;eventWorkspace.openStory(planning.id);refreshPanel('home');toast('Planning draft saved. It has not been added to Airtable or the website.');return;
        }
        if (state.editingEventId) {
          payload.id = state.editingEventId;
          var original=state.events.find(function(event){return event.id===payload.id;});if(original&&original.version)payload.expectedVersion=original.version;
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
        $('#eventList').innerHTML = eventWorkspace.listHtml();
        bindEventButtons();
        loadEvents(false);
      } catch (err) {
        toast('Save failed: ' + err.message, true);
        btn.disabled = false;
        $$('input,textarea,button',slot).forEach(function(control){control.disabled=false;});
        btn.textContent = !eventWorkspace.connected()?'Save planning draft':$('#ev-publish').checked ? 'Publish event changes' : 'Save unpublished event';
      }
    });
  }

  /* ---------------- GALLERY (grouped by website section) ---------------- */
  var SECTION_DEFS = [
    { id: 'venue', title: 'The Venue', where: 'Gallery page → Auditorium stories (pick each photo’s group) · also the Rent page photo viewer', blurb: 'Main Hall, auditorium, conference room and other inside spaces.' },
    { id: 'weddings', title: 'Weddings', where: 'Gallery page → “Weddings” section', blurb: 'Ceremonies, receptions and wedding setups.' },
    { id: 'outdoor', title: 'Outdoor Spaces', where: 'Gallery page → “Outdoor spaces” section', blurb: 'Sculpture area, patio and outdoor gatherings.' },
  ];
  // Venue photos can also be placed in one of the Auditorium stories on the Gallery page.
  // These ids must match CHAPTERS in public/gallery.html.
  var GROUP_DEFS = [
    { id: '', title: 'Around the venue (general)' },
    { id: 'talks', title: 'Talks & workshops' },
    { id: 'wellness', title: 'Wellness & circles' },
    { id: 'receptions', title: 'Receptions & gatherings' },
    { id: 'performances', title: 'Concerts & performances' },
    { id: 'meetings', title: 'Meetings & classes' },
  ];
  function galleryNeighbor(index,direction){var photos=state.data.gallery.photos,section=photos[index].section||'venue';for(var i=index+direction;i>=0&&i<photos.length;i+=direction)if((photos[i].section||'venue')===section)return i;return -1;}
  function galleryMatches(photo){var query=galleryView.query.trim().toLowerCase(),text=[photo.caption,photo.alt,photo.image,GROUP_DEFS.find(function(g){return g.id===(photo.group||'');})?.title].join(' ').toLowerCase();return (!query||text.includes(query))&&(galleryView.filter==='all'||galleryView.filter==='draft'&&photo.draft||galleryView.filter==='included'&&!photo.draft||galleryView.filter==='description'&&!String(photo.alt||'').trim());}
  function photoCard(p,idx,total){
    var key=photoKey(p),sections=SECTION_DEFS.map(function(sd){return '<option value="'+sd.id+'"'+((p.section||'venue')===sd.id?' selected':'')+'>'+sd.title+'</option>';}).join('');
    var groups=GROUP_DEFS.map(function(gd){return '<option value="'+gd.id+'"'+((p.group||'')===gd.id?' selected':'')+'>'+gd.title+'</option>';}).join('');
    var filtered=galleryView.query.trim()||galleryView.filter!=='all';
    return '<article class="photo-card" data-photo-card="'+key+'"><img src="'+esc(p.image)+'" alt="'+esc(p.alt||'')+'" loading="lazy" onerror="this.style.opacity=0.25"><div class="pc-body"><div class="photo-card-overview"><strong data-photo-title>'+esc(p.caption||'Untitled photo')+'</strong><span class="status-chip status-'+(p.draft?'review':'quiet')+'">'+(p.draft?'Not published':'In gallery')+'</span></div>'+
      (p.draft?'<div class="photo-publication-actions"><button type="button" class="btn btn-primary btn-small" data-ph-publish="'+idx+'">Publish to website</button></div>':'')+
      '<details class="photo-editor" data-photo-key="'+key+'" '+(galleryView.photoOpen.has(key)?'open':'')+'><summary aria-haspopup="dialog"><span>Edit photo details</span><span aria-hidden="true">↗</span></summary><dialog class="photo-details-panel" aria-labelledby="photo-panel-title-'+key+'"><header class="photo-panel-head"><div><span class="gallery-section-eyebrow">Photo settings</span><h3 id="photo-panel-title-'+key+'">Edit photo details</h3></div><button type="button" class="btn btn-ghost btn-small" data-photo-close aria-label="Close photo details">Close ×</button></header><div class="photo-panel-scroll"><img class="photo-panel-preview" src="'+esc(p.image)+'" alt="'+esc(p.alt||'')+'"><p class="photo-panel-help">Edit this photo without rearranging your gallery. Changes stay in your working gallery until you save or publish.</p><div class="photo-editor-fields"><label class="photo-field"><span>Caption</span><input data-ph="caption" data-idx="'+idx+'" value="'+esc(p.caption||'')+'" placeholder="Caption (shown under the photo)"></label><label class="photo-field"><span>Photo description</span><textarea data-ph="alt" data-idx="'+idx+'" rows="2" placeholder="Describe the photo (for accessibility)">'+esc(p.alt||'')+'</textarea></label><label class="pc-section-label">Website section<select data-ph="section" data-idx="'+idx+'">'+sections+'</select></label>'+((p.section||'venue')==='venue'?'<label class="pc-section-label">Gallery page group<select data-ph="group" data-idx="'+idx+'">'+groups+'</select></label>':'')+'<div class="pc-actions"><button type="button" class="icon-btn" data-ph-move="-1" data-idx="'+idx+'" title="Move earlier" '+(filtered||galleryNeighbor(idx,-1)<0?'disabled':'')+'>↑</button><button type="button" class="icon-btn" data-ph-move="1" data-idx="'+idx+'" title="Move later" '+(filtered||galleryNeighbor(idx,1)<0?'disabled':'')+'>↓</button><button type="button" class="btn btn-danger btn-small" data-ph-del="'+idx+'">Remove photo</button></div>'+(filtered?'<p class="photo-order-hint">Clear search and filters to reorder this collection.</p>':'')+'</div></div><footer class="photo-panel-foot"><button type="button" class="btn btn-primary" data-photo-save>Save gallery draft</button><button type="button" class="btn btn-ghost" data-photo-close>Done editing</button><span role="status" data-photo-save-status></span></footer></dialog></details></div></article>';
  }
  function groupsHtml(){
    var photos=state.data.gallery&&state.data.gallery.photos||[],filtering=galleryView.query.trim()||galleryView.filter!=='all';
    return SECTION_DEFS.map(function(sd){
      var all=[],mine=[];photos.forEach(function(p,i){if((p.section||'venue')===sd.id){all.push([p,i]);if(galleryMatches(p))mine.push([p,i]);}});
      var pages=Math.max(1,Math.ceil(mine.length/12)),page=Math.max(0,Math.min(galleryView.pages[sd.id]||0,pages-1));galleryView.pages[sd.id]=page;
      var shown=mine.slice(page*12,page*12+12),drafts=all.filter(function(pair){return pair[0].draft;}).length;
      return '<details class="group-block gallery-section-card gallery-collection" id="gal-group-'+sd.id+'" data-gallery-collection="'+sd.id+'" '+((filtering?mine.length>0:galleryView.open[sd.id])?'open':'')+'><summary class="collection-summary"><span class="collection-summary-copy"><span class="gallery-section-eyebrow">Gallery collection</span><strong id="gallery-title-'+sd.id+'">'+sd.title+'</strong><small>'+all.length+' photo'+(all.length===1?'':'s')+(filtering?' · '+mine.length+' matching':'')+(drafts?' · '+drafts+' not published':'')+'</small></span><span class="disclosure-chevron" aria-hidden="true">⌄</span></summary><div class="gallery-collection-body"><div class="collection-context"><div><p>'+sd.blurb+'</p><p class="where">Appears: '+sd.where+'</p></div><label class="btn btn-primary btn-small">+ Add photos<input type="file" class="gal-upload-group" data-section="'+sd.id+'" accept="image/*" multiple></label></div><div class="gallery-section-photos">'+(shown.length?'<div class="photo-grid">'+shown.map(function(pair){return photoCard(pair[0],pair[1],photos.length);}).join('')+'</div>':'<div class="empty-note">'+(all.length?'No photos match this search or filter. Clear filters to see the collection.':'No photos in this section yet — add the first one.')+'</div>')+'<div class="gallery-page-controls"><span>'+ (mine.length?(page*12+1)+'–'+Math.min((page+1)*12,mine.length)+' of '+mine.length+' photos':'0 photos')+'</span><div><button type="button" class="btn btn-ghost btn-small" data-gallery-page="'+sd.id+'" data-step="-1" '+(page===0?'disabled':'')+'>Previous</button><span class="gallery-page-number">Page '+(page+1)+' of '+pages+'</span><button type="button" class="btn btn-ghost btn-small" data-gallery-page="'+sd.id+'" data-step="1" '+(page===pages-1?'disabled':'')+'>Next</button></div></div></div></div></details>';
    }).join('');
  }
  function renderGallery(){
    var photos=state.data.gallery&&state.data.gallery.photos||[],nav=SECTION_DEFS.map(function(sd){var count=photos.filter(function(p){return (p.section||'venue')===sd.id;}).length;return '<a href="#gal-group-'+sd.id+'" data-jump="gal-group-'+sd.id+'">'+sd.title+' <span>'+count+'</span></a>';}).join('');
    return panelShell('gallery','Photo Gallery','Choose a collection, find a photo and open its details in the side panel. Your photos stay in place while you edit. Your full gallery stays organized as it grows.',
      '<nav class="gallery-collection-nav" aria-label="Gallery collections">'+nav+'</nav><div class="card gallery-toolbar"><div class="gallery-find-fields"><div class="field"><label for="gallery-search">Find a photo</label><input type="search" id="gallery-search" value="'+esc(galleryView.query)+'" placeholder="Search your photos"></div><div class="field"><label for="gallery-filter">Show</label><select id="gallery-filter"><option value="all">All photos</option><option value="draft">Marked not published</option><option value="included">In gallery</option><option value="description">No photo description</option></select></div><button type="button" class="btn btn-ghost" id="gallery-clear">Clear filters</button></div><div class="gallery-toolbar-bottom"><p id="gallery-result-count" role="status"></p><button type="button" class="btn btn-ghost btn-small" id="gal-add-url">Add a photo from a link</button></div><p class="gallery-save-help">Photo badges describe the gallery you are editing. Save draft to keep changes unpublished, or Publish changes to update the website.</p></div><div id="photoGroups">'+groupsHtml()+'</div>'+savebarHtml('gallery','gallery'));
  }
  function bindGallery() {
    var wrap = $('#photoGroups');
    if (!wrap) return;
    function rerender(){wrap.innerHTML=groupsHtml();bindGallery();}
    var search=$('#gallery-search'),filter=$('#gallery-filter'),clear=$('#gallery-clear');
    if(search){search.value=galleryView.query;search.oninput=function(){galleryView.query=this.value;galleryView.pages={};rerender();};}
    if(filter){filter.value=galleryView.filter;filter.onchange=function(){galleryView.filter=this.value;galleryView.pages={};rerender();};}
    if(clear)clear.onclick=function(){galleryView.query='';galleryView.filter='all';galleryView.pages={};rerender();search.focus();};
    var photos=state.data.gallery.photos,matched=photos.filter(galleryMatches).length,count=$('#gallery-result-count');if(count)count.textContent=matched+' of '+photos.length+' photos · up to 12 per collection page';
    $$('[data-gallery-collection]',wrap).forEach(function(d){d.ontoggle=function(){if(!galleryView.query.trim()&&galleryView.filter==='all')galleryView.open[d.dataset.galleryCollection]=d.open;};});
    $$('[data-photo-key]',wrap).forEach(function(d){
      var trigger=$('summary',d),panel=$('dialog',d);
      function closePanel(restoreFocus){panel.close();d.open=false;galleryView.photoOpen.delete(d.dataset.photoKey);trigger.setAttribute('aria-expanded','false');if(restoreFocus)trigger.focus({preventScroll:true});}
      function openPanel(){
        $$('[data-photo-key]',wrap).forEach(function(other){if(other!==d){other.open=false;$('dialog',other).close();$('summary',other).setAttribute('aria-expanded','false');}});
        galleryView.photoOpen.clear();galleryView.photoOpen.add(d.dataset.photoKey);d.open=true;trigger.setAttribute('aria-expanded','true');
        // Non-modal: the grid, navigation and page-level Save/Publish controls stay usable.
        if(!panel.open){var scrollY=window.scrollY;panel.show();window.scrollTo(window.scrollX,scrollY);}
      }
      trigger.onclick=function(ev){ev.preventDefault();if(panel.open)closePanel(true);else openPanel();};
      panel.addEventListener('keydown',function(ev){if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();closePanel(true);}});
      panel.oncancel=function(ev){ev.preventDefault();closePanel(true);};
      $$('[data-photo-close]',panel).forEach(function(b){b.onclick=function(){closePanel(true);};});
      $('[data-photo-save]',panel).onclick=async function(){var b=this;b.disabled=true;var status=$('[data-photo-save-status]',panel);status.textContent='Saving gallery draft…';try{var ok=await saveJsonSection('gallery',null,'draft');status.textContent=ok===false?'Draft not saved. Check the gallery save message and retry.':'Gallery draft saved. Website unchanged.';}finally{b.disabled=false;}};
      // Reordering/section changes can rebuild cards; reopen the same photo without shifting the grid.
      if(d.open)openPanel();else trigger.setAttribute('aria-expanded','false');
    });
    $$('[data-gallery-page]',wrap).forEach(function(b){b.onclick=function(){var section=b.dataset.galleryPage,step=+b.dataset.step;galleryView.pages[section]=(galleryView.pages[section]||0)+step;rerender();var collection=$('#gal-group-'+section);var button=$('[data-gallery-page][data-step="'+step+'"]',collection);if(button&&!button.disabled)button.focus();else $('summary',collection).focus();};});
    $$('#photoGroups [data-ph]').forEach(function (input) {
      var evt = input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(evt, function () {
        var idx = +input.getAttribute('data-idx');
        state.data.gallery.photos[idx][input.getAttribute('data-ph')] = input.value;
        setDirty('gallery', true);
        var photo=state.data.gallery.photos[idx];var title=input.closest('.photo-card').querySelector('[data-photo-title]');if(title&&input.dataset.ph==='caption')title.textContent=photo.caption||'Untitled photo';
        if (input.getAttribute('data-ph') === 'section'){revealPhoto(photo);rerender();}
      });
    });
    $$('#photoGroups [data-ph-move]').forEach(function (b) {
      b.addEventListener('click', function () {
        var idx = +b.getAttribute('data-idx');
        var to = galleryNeighbor(idx,+b.getAttribute('data-ph-move'));
        var arr = state.data.gallery.photos;
        if (to < 0 || to >= arr.length) return;
        var tmp = arr[idx]; arr[idx] = arr[to]; arr[to] = tmp;
        revealPhoto(arr[to]);setDirty('gallery', true);
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
      a.onclick=function(ev){ev.preventDefault();var id=a.dataset.jump,section=id.replace('gal-group-','');galleryView.query='';galleryView.filter='all';galleryView.open[section]=true;rerender();var el=document.getElementById(id);if(el){el.open=true;el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});$('summary',el).focus({preventScroll:true});}};
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
          var added={image:'/images/'+safeName,caption:'',alt:'',section:section,draft:true};state.data.gallery.photos.push(added);revealPhoto(added);
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
      var added={image:url.trim(),caption:'',alt:'',section:'venue',draft:true};state.data.gallery.photos.push(added);revealPhoto(added);
      rerender();
      setDirty('gallery',true);
      var saved = await saveJsonSection('gallery', null, 'draft');
      if(saved) toast('Photo saved as NOT PUBLISHED \u2014 press its Publish button when it should go live.');
    };
  }

  /* ---------------- WEDDINGS ---------------- */
  function editorialHeading(step,title,description) {
    return '<div class="form-section-heading editorial-heading"><span class="editorial-step" aria-hidden="true">'+step+'</span><div><h3>'+title+'</h3><p>'+description+'</p></div></div>';
  }
  function updateWeddingCollection(){
    var collection=$('.wedding-collection-link');if(!collection)return;
    var photos=(state.data.gallery&&state.data.gallery.photos||[]).filter(function(p){return p.section==='weddings';});
    $('p',collection).textContent=photos.length+' photos in your working gallery. Manage their order, captions and publication in the wedding collection.';
    $('.wedding-collection-strip',collection).innerHTML=photos.slice(0,4).map(function(photo){return '<img src="'+esc(SaneSettings.safeUrl(photo.image,'image'))+'" alt="" loading="lazy">';}).join('');
  }
  function renderWeddings() {
    var w=state.data.weddings||{},photos=(state.data.gallery&&state.data.gallery.photos||[]).filter(function(p){return p.section==='weddings';});
    var highlights=(w.highlights||[]).map(function(h,i){return '<div class="list-row"><span class="highlight-number" aria-hidden="true">'+String(i+1).padStart(2,'0')+'</span><textarea aria-label="Highlight '+(i+1)+'" data-hl="'+i+'" rows="2">'+esc(h)+'</textarea><button type="button" class="icon-btn danger" data-hl-del="'+i+'" aria-label="Remove highlight '+(i+1)+'" title="Remove highlight '+(i+1)+'">✕</button></div>';}).join('');
    var hero=SaneSettings.safeUrl(w.heroImage,'image');
    var inner='<nav class="editorial-jumps" aria-label="Weddings page sections"><a href="#wedding-story" data-form-jump="wedding-story">Photo &amp; introduction</a><a href="#wedding-highlights-editor" data-form-jump="wedding-highlights-editor">Highlights</a><a href="#wedding-policies" data-form-jump="wedding-policies">Packages &amp; policies</a><a href="#wedding-contact" data-form-jump="wedding-contact">Contact</a></nav><div class="dashboard-form-stack wedding-workspace">'+
      '<section id="wedding-story" class="card form-card form-section">'+editorialHeading('01','First impressions','Your main wedding photo, page heading and welcome message.')+'<div class="wedding-story-grid"><div class="wedding-media-editor"><div class="wedding-photo-stage"><img id="wedding-main-preview" src="'+esc(hero)+'" alt="Main wedding photo preview" '+(!hero?'hidden':'')+'><span id="wedding-image-empty" '+(hero?'hidden':'')+'>Choose a main wedding photo</span><span class="image-role-label">Main page photo</span></div><div class="wedding-photo-actions"><label class="btn btn-primary">Upload photo<input type="file" id="wedding-photo-upload" accept=".png,.jpg,.jpeg,.webp,.gif" aria-label="Upload main wedding photo"></label><button type="button" class="btn btn-ghost" id="wedding-photo-choose">Choose from gallery</button></div><p id="wedding-photo-status" class="media-feedback" role="status">Upload a photo or choose an existing gallery image. Maximum 4 MB.</p><details class="image-path-options"><summary>Image link &amp; restore options</summary>'+fieldHtml('Main photo link','heroImage',w.heroImage,{hint:'Use a local image path or an HTTPS image URL.'})+'<button type="button" class="btn btn-text btn-small" id="wedding-photo-restore">Restore published photo</button></details></div><div class="wedding-story-fields">'+fieldHtml('Page heading','heading',w.heading)+fieldHtml('Intro text','intro',w.intro,{textarea:true,rows:7,hint:'Separate paragraphs with a blank line.'})+'<div class="wedding-collection-link"><span class="workspace-eyebrow">Wedding photo collection</span><h4>More moments from the venue</h4><p>'+photos.length+' photos in your working gallery. Manage their order, captions and publication in the wedding collection.</p><div class="wedding-collection-strip">'+photos.slice(0,4).map(function(photo){return '<img src="'+esc(SaneSettings.safeUrl(photo.image,'image'))+'" alt="" loading="lazy">';}).join('')+'</div><button type="button" class="btn btn-ghost btn-small" id="wedding-open-gallery">Edit wedding gallery ↗</button></div></div></div></section>'+
      '<section id="wedding-highlights-editor" class="card form-card form-section">'+editorialHeading('02','Venue highlights','The checklist guests read when considering the venue.')+'<div class="highlight-field field"><div class="list-editor" id="hlList">'+highlights+'</div><button type="button" class="btn btn-ghost btn-small" id="hl-add">+ Add a highlight</button></div></section>'+
      '<section id="wedding-policies" class="card form-card form-section">'+editorialHeading('03','Packages &amp; policies','Keep your wedding offer clear, then explain the practical details.')+'<div class="wedding-policy-grid"><div class="policy-group"><h4>Wedding package</h4>'+fieldHtml('Pricing text','pricingText',w.pricingText,{textarea:true,rows:4})+fieldHtml("What's included",'includesText',w.includesText,{textarea:true,rows:3})+'</div><div class="policy-group"><h4>Venue guidelines</h4>'+fieldHtml('Catering policy','cateringPolicy',w.cateringPolicy,{textarea:true,rows:3})+fieldHtml('Alcohol policy','alcoholPolicy',w.alcoholPolicy,{textarea:true,rows:3})+fieldHtml('Parking note','parkingNote',w.parkingNote,{textarea:true,rows:2})+'</div></div></section>'+
      '<section id="wedding-contact" class="card form-card form-section">'+editorialHeading('04','Contact &amp; availability','The phone label and calendar note shown on the Weddings page.')+'<div class="form-row">'+fieldHtml('Phone shown on the page','phoneDisplay',w.phoneDisplay)+fieldHtml('Availability note','availabilityNote',w.availabilityNote)+'</div><p class="section-context">The call destination uses the phone link in Settings → Contact &amp; social.</p></section></div>'+eventWorkspace.weddingsHtml()+savebarHtml('weddings')+
      '<dialog id="wedding-photo-picker" class="dashboard-media-dialog" aria-labelledby="wedding-picker-title"><div class="media-dialog-header"><div><span class="workspace-eyebrow">Photo library</span><h3 id="wedding-picker-title">Choose your main photo</h3></div><button type="button" class="icon-btn" id="wedding-picker-close" aria-label="Close photo library">✕</button></div><p class="section-context">Select a gallery photo for this page. Your published photo stays in place until you publish Weddings.</p><label class="field picker-search"><span>Search gallery photos</span><input type="search" id="wedding-picker-search" placeholder="Search by caption, description or filename"></label><div id="wedding-picker-results"></div></dialog>';
    return panelShell('weddings','Weddings Page','Shape the first impression. Update your photography, tell your story and keep every detail clear.',inner);
  }
  function bindEditorialJumps(root){$$('[data-form-jump]',root).forEach(function(a){a.onclick=function(e){e.preventDefault();var target=$('#'+a.dataset.formJump,root);target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({block:'start'});};});}
  function bindWeddings() {
    var root=$('#panel-weddings'),photoInput=$('[data-field="heroImage"]',root),preview=$('#wedding-main-preview'),empty=$('#wedding-image-empty'),status=$('#wedding-photo-status'),dialog=$('#wedding-photo-picker');
    bindFields('weddings',root);bindEditorialJumps(root);eventWorkspace.bindWeddings();
    function showPhoto(url,local){var safe=local||SaneSettings.safeUrl(url,'image');preview.hidden=!safe;preview.src=safe;empty.hidden=!!safe;}
    function selectPhoto(url,message){state.data.weddings.heroImage=url;photoInput.value=url;setDirty('weddings',true);showPhoto(url);status.textContent=message;}
    preview.onerror=function(){preview.hidden=true;empty.hidden=false;empty.textContent='This photo could not be loaded. Choose another image or check its link.';};
    preview.onload=function(){preview.hidden=false;empty.hidden=true;};
    photoInput.addEventListener('input',function(){showPhoto(photoInput.value);status.textContent='Photo changed on this device. Save a draft or publish when ready.';});
    $('#wedding-photo-restore').onclick=function(){try{selectPhoto(JSON.parse(state.versions.weddings.published).heroImage||'','Published photo restored in your working copy. Save or publish to keep this choice.');}catch(e){status.textContent='Published photo is unavailable. Reload the page before restoring.';}};
    $('#wedding-open-gallery').onclick=function(){galleryView.query='';galleryView.filter='all';galleryView.open.weddings=true;goTo('gallery');refreshPanel('gallery');var collection=$('#gal-group-weddings');collection.scrollIntoView({block:'start'});$('summary',collection).focus({preventScroll:true});};
    $('#wedding-photo-upload').onchange=async function(){var input=this,file=input.files[0];if(!file)return;if(state.uploading){status.textContent='Another upload is in progress. Try again when it finishes.';input.value='';return;}
      if(file.size>4*1024*1024||! /\.(png|jpe?g|webp|gif)$/i.test(file.name)){status.textContent='Choose a PNG, JPEG, WebP or GIF smaller than 4 MB.';input.value='';return;}
      var controls=$$('#wedding-photo-upload,#wedding-photo-choose,#wedding-photo-restore,#hl-add,[data-hl-del],[data-field="heroImage"]',root);
      state.uploading=true;controls.forEach(function(control){control.disabled=true;});Object.keys(state.versions).forEach(updateSaveUI);status.textContent='Uploading your photo…';
      try{var encoded=await new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(String(reader.result).split(',')[1]);};reader.onerror=function(){reject(Error('The image could not be read.'));};reader.readAsDataURL(file);});
        var ext=file.name.split('.').pop().toLowerCase(),result=await api('/api/dash-save',{method:'POST',body:JSON.stringify({path:'public/images/wedding-main-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.'+ext,contentBase64:encoded})});
        selectPhoto(result.url,'Uploaded. Save draft to share your choice, or Publish changes to use it on the website.');
        var local=URL.createObjectURL(file);showPhoto(result.url,local);
        function release(){URL.revokeObjectURL(local);preview.removeEventListener('load',release);preview.removeEventListener('error',release);}
        preview.addEventListener('load',release);preview.addEventListener('error',release);
      }catch(e){status.textContent='Upload failed: '+e.message+' Your previous photo is kept.';}finally{state.uploading=false;controls.forEach(function(control){control.disabled=false;});input.value='';Object.keys(state.versions).forEach(updateSaveUI);}
    };
    function renderPicker(){var query=weddingMediaView.query.trim().toLowerCase(),photos=(state.data.gallery&&state.data.gallery.photos||[]).filter(function(p){return SaneSettings.safeUrl(p.image,'image')&&(!query||[p.caption,p.alt,p.image].join(' ').toLowerCase().includes(query));}),pages=Math.max(1,Math.ceil(photos.length/24));weddingMediaView.page=Math.min(weddingMediaView.page,pages-1);var start=weddingMediaView.page*24;
      $('#wedding-picker-results').innerHTML='<p class="picker-result-count" role="status">'+photos.length+' photo'+(photos.length===1?'':'s')+' · Page '+(weddingMediaView.page+1)+' of '+pages+'</p><div class="media-choice-grid">'+photos.slice(start,start+24).map(function(p,i){return '<button type="button" class="media-choice" data-wedding-choice="'+(start+i)+'"><img src="'+esc(SaneSettings.safeUrl(p.image,'image'))+'" alt="" loading="lazy"><span>'+esc(p.caption||p.alt||p.image.split('/').pop())+'</span></button>';}).join('')+'</div>'+(!photos.length?'<p class="empty-note">No matching gallery photos. Try another search or upload a photo.</p>':'')+'<div class="media-picker-paging"><button type="button" class="btn btn-ghost btn-small" data-picker-page="-1" '+(!weddingMediaView.page?'disabled':'')+'>Previous photos</button><button type="button" class="btn btn-ghost btn-small" data-picker-page="1" '+(weddingMediaView.page===pages-1?'disabled':'')+'>Next photos</button></div>';
      $$('[data-wedding-choice]',dialog).forEach(function(b){b.onclick=function(){selectPhoto(photos[+b.dataset.weddingChoice].image,'Photo selected. Save a draft or publish Weddings to use it.');dialog.close();};});$$('[data-picker-page]',dialog).forEach(function(b){b.onclick=function(){weddingMediaView.page+=+b.dataset.pickerPage;renderPicker();$('#wedding-picker-search').focus({preventScroll:true});};});
    }
    $('#wedding-photo-choose').onclick=function(){weddingMediaView.query='';weddingMediaView.page=0;$('#wedding-picker-search').value='';renderPicker();dialog.showModal();$('#wedding-picker-search').focus();};
    $('#wedding-picker-close').onclick=function(){dialog.close();};
    dialog.addEventListener('close',function(){$('#wedding-photo-choose').focus({preventScroll:true});});
    $('#wedding-picker-search').oninput=function(){weddingMediaView.query=this.value;weddingMediaView.page=0;renderPicker();};
    $$('[data-hl]',root).forEach(function(input){input.oninput=function(){state.data.weddings.highlights[+input.dataset.hl]=input.value;setDirty('weddings',true);};});
    $$('[data-hl-del]',root).forEach(function(b){b.onclick=function(){state.data.weddings.highlights.splice(+b.dataset.hlDel,1);setDirty('weddings',true);refreshPanel('weddings');var next=$('[data-hl="'+b.dataset.hlDel+'"]')||$('#hl-add');next.focus();};});
    $('#hl-add').onclick=function(){(state.data.weddings.highlights||(state.data.weddings.highlights=[])).push('');setDirty('weddings',true);refreshPanel('weddings');$$('[data-hl]',$('#panel-weddings')).slice(-1)[0].focus();};
  }

  /* ---------------- PRICING ---------------- */
  function renderPricing() {
    var p=state.data.pricing||{};
    var sessions=(p.rows||[]).map(function(r,i){return '<article class="rate-session" aria-labelledby="rate-title-'+i+'"><header class="rate-session-head"><span class="workspace-eyebrow">Rental session '+String(i+1).padStart(2,'0')+'</span><h4 id="rate-title-'+i+'" data-rate-title="'+i+'">'+esc(r.label||'Untitled session')+'</h4><p data-rate-time="'+i+'">'+esc(r.sublabel)+'</p></header><div class="rate-session-body"><div class="session-description"><label class="field"><span>Session name</span><input aria-label="Session name" data-row="'+i+'" data-col="label" value="'+esc(r.label)+'"></label><label class="field"><span>Session hours</span><input aria-label="Session detail" data-row="'+i+'" data-col="sublabel" value="'+esc(r.sublabel)+'"></label></div><div class="session-rate-grid">'+[['monThu','Mon–Thu'],['friday','Friday'],['saturday','Saturday'],['sunday','Sunday']].map(function(pair){return '<label class="rate-amount field"><span>'+pair[1]+'</span><input aria-label="'+pair[1]+' rate" data-row="'+i+'" data-col="'+pair[0]+'" value="'+esc(r[pair[0]])+'"></label>';}).join('')+'</div></div></article>';}).join('');
    var inner='<nav class="editorial-jumps" aria-label="Pricing page sections"><a href="#pricing-rates" data-form-jump="pricing-rates">Rental sessions</a><a href="#pricing-notes" data-form-jump="pricing-notes">Rate details</a><a href="#pricing-booking" data-form-jump="pricing-booking">Booking information</a></nav><div class="dashboard-form-stack pricing-workspace"><section id="pricing-rates" class="card form-card form-section">'+editorialHeading('01','Rental sessions','Set each day’s rate for each session. Values appear exactly as you enter them, including currency symbols.')+'<div class="rate-session-grid">'+sessions+'</div><div id="pricing-notes" class="rate-notes"><div class="subsection-heading"><h4>Rate details</h4><p>The date, opening hours and note displayed with the rates.</p></div><div class="form-row">'+fieldHtml('Rates as-of date','noteDate',p.noteDate)+fieldHtml('Hours line','hoursHeader',p.hoursHeader)+'</div>'+fieldHtml('Note under the table','noteText',p.noteText)+'</div></section><section id="pricing-booking" class="card form-card form-section">'+editorialHeading('02','Booking information','Give guests a clear next step after reviewing your rates.')+'<div class="pricing-booking-grid"><div>'+fieldHtml('Weddings note','weddingsNote',p.weddingsNote,{textarea:true,rows:3})+fieldHtml('Availability note','availabilityNote',p.availabilityNote)+'</div><div class="booking-message-editor"><h4>Booking card message</h4><p class="section-context">The heading and text on the public booking card.</p>'+fieldHtml('Booking card heading','ctaHeading',p.ctaHeading)+fieldHtml('Booking card text','ctaText',p.ctaText,{textarea:true,rows:3})+'</div></div></section></div>'+savebarHtml('pricing');
    return panelShell('pricing','Pricing & Rates','A clear rate for every session. Keep rental prices, practical details and your booking message in one place.',inner);
  }
  function bindPricing() {
    var root=$('#panel-pricing');bindFields('pricing',root);bindEditorialJumps(root);
    $$('[data-row]',root).forEach(function(input){input.oninput=function(){var row=+input.dataset.row,col=input.dataset.col;state.data.pricing.rows[row][col]=input.value;setDirty('pricing',true);var title=$('[data-rate-'+(col==='label'?'title':'time')+'="'+row+'"]',root);if((col==='label'||col==='sublabel')&&title)title.textContent=input.value;};});
  }

  /* ---------------- PARTNERS ---------------- */
  function renderPartners() {
    var d = state.data.partners || {};
    var cards = (d.partners || []).map(function (p, i) {
      return '<article class="card form-card partner-editor-card"><div class="partner-card-heading"><span class="partner-avatar" aria-hidden="true">'+SECTIONS[5].icon+'</span><div><span class="workspace-eyebrow">Partner '+String(i+1).padStart(2,'0')+'</span><h4 data-partner-title="'+i+'">'+esc(p.name||'New partner')+'</h4></div></div><div class="partner-photo-frame"><img data-partner-preview="'+i+'" src="'+esc(SaneSettings.safeUrl(p.image,'image'))+'" alt="Partner photo preview" '+(!SaneSettings.safeUrl(p.image,'image')?'hidden':'')+'><span data-partner-empty="'+i+'" '+(SaneSettings.safeUrl(p.image,'image')?'hidden':'')+'>Add a photo link below to preview it here</span></div>' +
        '<div class="form-row"><div class="field"><label for="partner-name-' + i + '">Business name</label><input id="partner-name-' + i + '" data-pt="' + i + '" data-k="name" value="' + esc(p.name || '') + '"></div>' +
        '<div class="field"><label for="partner-category-' + i + '">Category</label><input id="partner-category-' + i + '" data-pt="' + i + '" data-k="category" value="' + esc(p.category || '') + '" placeholder="Catering, Flowers, Photography…"></div></div>' +
        '<div class="field"><label for="partner-description-' + i + '">Short description</label><textarea id="partner-description-' + i + '" data-pt="' + i + '" data-k="description" rows="2">' + esc(p.description != null ? p.description : p.blurb || '') + '</textarea></div>' +
        '<div class="form-row"><div class="field"><label for="partner-website-' + i + '">Website</label><input id="partner-website-' + i + '" data-pt="' + i + '" data-k="website" value="' + esc(p.website || '') + '" placeholder="https://…"></div>' +
        '<div class="field"><label for="partner-image-' + i + '">Photo (path or link)</label><input id="partner-image-' + i + '" data-pt="' + i + '" data-k="image" value="' + esc(p.image || '') + '" placeholder="/images/…"></div></div>' +
        '<div><button type="button" class="btn btn-danger btn-small" data-pt-del="' + i + '">Remove this partner</button></div></article>';
    }).join('');
    var inner = '<div class="card form-card partners-intro"><div class="form-section-heading"><h3>Introduce your community</h3><p>The introduction guests read before exploring local partners.</p></div>' +
      fieldHtml('Intro text (top of the Partners page)', 'intro', d.intro, { textarea: true, rows: 4, hint: 'This introduction appears above the partner directory on the website.' }) + '</div>' +
      '<div class="workspace-list-heading"><div><span class="workspace-eyebrow">Local connections</span><h3>Partner directory</h3><p>One business per card. Contact details, descriptions and photos stay together.</p></div></div><div id="partnerList">' + (cards || '<div class="empty-note">No partners listed yet — add the first one below. Only add a business after they have agreed to be listed.</div>') + '</div>' +
      '<button type="button" class="btn btn-primary" id="pt-add">+ Add a partner</button>' +
      savebarHtml('partners', 'partners');
    return panelShell('partners', 'Partners', 'Local businesses shown on the Partners page. Reminder of the house rule: mutual referrals only — no referral fees, ever.', inner);
  }
  function bindPartners() {
    bindFields('partners', $('#panel-partners'));
    $$('[data-partner-preview]').forEach(function(image){var empty=$('[data-partner-empty="'+image.dataset.partnerPreview+'"]');image.onerror=function(){image.hidden=true;empty.hidden=false;empty.textContent='This photo could not be loaded. Check the image link below.';};image.onload=function(){image.hidden=false;empty.hidden=true;};});
    $$('#panel-partners [data-pt]').forEach(function (input) {
      input.addEventListener('input', function () {
        state.data.partners.partners[+input.getAttribute('data-pt')][input.getAttribute('data-k')] = input.value;
        setDirty('partners', true);
        var index=input.dataset.pt;if(input.dataset.k==='name')$('[data-partner-title="'+index+'"]').textContent=input.value||'New partner';
        if(input.dataset.k==='image'){var image=$('[data-partner-preview="'+index+'"]'),empty=$('[data-partner-empty="'+index+'"]'),url=SaneSettings.safeUrl(input.value,'image');image.hidden=!url;image.src=url;empty.hidden=!!url;}
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
      var nameFields=$$('#partnerList [data-k="name"]');if(nameFields.length)nameFields[nameFields.length-1].focus();
    });
  }

  /* ---------------- SETTINGS ---------------- */
  function settingsField(f, value) {
    if(f.type === 'boolean') return '<label class="switch-field"><span><strong>'+esc(f.label)+'</strong></span><input type="checkbox" data-setting-toggle="'+f.key+'" '+(value?'checked':'')+'><span class="switch-track" aria-hidden="true"></span></label>';
    var html = fieldHtml(f.label,f.key,value,{textarea:f.type==='textarea',rows:3,hint:f.hint,placeholder:f.type==='image'||f.type==='icon'?'Upload an image or enter /images/…':''});
    if(f.type === 'image' || f.type === 'icon') html = '<div class="asset-field">'+html+'<div class="asset-controls"><div class="asset-preview"><img data-asset-preview="'+f.key+'" src="'+esc(SaneSettings.safeUrl(value,'image'))+'" alt="'+esc(f.label)+' preview" '+(!value?'hidden':'')+'></div><label class="btn btn-ghost btn-small">Upload '+(f.type==='icon'?'icon':'image')+'<input type="file" data-asset="'+f.key+'" accept="'+(f.type==='icon'?'.png,.ico':'.png,.jpg,.jpeg,.webp,.gif')+'"></label><span class="asset-upload-status" data-asset-status="'+f.key+'" role="status">Maximum 4 MB</span></div></div>';
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
  var SETTINGS_CONTEXT={brand:'Set the business name, website logo, browser tab icon and footer note.',contact:'Update the phone, email, venue address, hours and social links displayed to guests.',home:'Update the opening headline, main button and hero image or video.',booking:'Choose booking destinations, the rental inquiry form and availability calendar.',newsletter:'Control the footer signup, its message and the existing signup form destination.',announcement:'Show or hide a short notice across the website.',sharing:'Choose the descriptions and images used when people search for or share your pages.',navigation:'Choose the labels, order and visibility of the website menu.'};
  var SETTINGS_SECTIONS={
    brand:[['identity','Logo & business name','The identity used across the website.',['businessName','logoUrl','logoAlt']],['icon','Browser tab icon','The small icon guests see in their browser tabs.',['faviconUrl']],['footer','Footer note','The short message at the bottom of the website.',['footerText']]],
    contact:[['contact','Phone & email','The main ways guests can contact the team.',['email','phoneDisplay','phoneLink']],['location','Address & opening hours','The venue details displayed to guests.',['address','hours']],['social','Social profiles','Links to the business’s social pages.',['instagramUrl','facebookUrl']],['maps','Directions, map & inquiry form','Destinations and embedded tools on the Contact page.',['directionsUrl','mapEmbedUrl','contactFormUrl']]],
    home:[['message','Hero message','The headline and introduction at the top of the homepage.',['homeHeading','homeIntro']],['button','Main button','The button label and where it takes guests.',['homePrimaryLabel','homePrimaryUrl']],['media','Hero image & video','The image, poster and optional video used by the homepage.',['homePosterUrl','homeVideoUrl']]],
    booking:[['destination','Booking page','Where booking links take guests.',['bookingPageUrl']],['inquiry','Rental inquiry form','The form guests use to ask about renting the venue.',['rentalFormUrl']],['calendar','Availability calendar','The calendar embedded on the website. Event synchronization is unchanged.',['availabilityEmbedUrl']]],
    newsletter:[['message','Signup visibility & message','Choose whether the signup is shown and what guests read.',['newsletterEnabled','newsletterTitle','newsletterDescription']],['destination','Subscribe button & destination','The button label and existing newsletter form destination.',['newsletterButton','newsletterUrl']]],
    announcement:[['message','Visibility & message','An optional site-wide notice for guests.',['announcementEnabled','announcementText']],['link','Optional announcement link','Add a destination only when the notice needs one.',['announcementLinkLabel','announcementLinkUrl']]],
    sharing:[['description','Default search description','The fallback description used when a page has no override.',['siteDescription']],['image','Default sharing image','The image used when the website is shared.',['defaultShareImage']]]
  };
  function settingsGroup(group,id,title,description,body,count,index){var key=group+'-'+id,open=Object.prototype.hasOwnProperty.call(settingsOpen,key)?settingsOpen[key]:index===0;return '<details class="settings-field-group" id="settings-group-'+key+'" data-settings-group="'+key+'" '+(open?'open':'')+'><summary><span><strong>'+title+'</strong><small>'+description+'</small></span><span class="field-count">'+count+' field'+(count===1?'':'s')+'</span><span class="disclosure-chevron" aria-hidden="true">⌄</span></summary><div class="settings-group-fields">'+body+'</div></details>';}
  function settingsFields(group,value){
    if(group.id==='navigation')return '<div class="settings-context-note">Change a menu label, its visibility or its order. The page address stays the same.</div>'+navigationEditor();
    var used=new Set(),sections=SETTINGS_SECTIONS[group.id]||[],html=sections.map(function(section,index){var fields=group.fields.filter(function(f){return section[3].includes(f.key);});fields.forEach(function(f){used.add(f.key);});return fields.length?settingsGroup(group.id,section[0],section[1],section[2],fields.map(function(f){return settingsField(f,value[f.key]);}).join(''),fields.length,index):'';}).join('');
    var extra=group.fields.filter(function(f){return !used.has(f.key);});if(extra.length)html+=settingsGroup(group.id,'additional','Additional settings','Other controls available in this category.',extra.map(function(f){return settingsField(f,value[f.key]);}).join(''),extra.length,sections.length);
    if(group.id==='sharing')html+=settingsGroup(group.id,'pages','Individual page overrides','Choose a page to give it its own search and sharing details.',metadataEditor(),4,sections.length);
    return html;
  }
  function renderSettings() {
    var x=state.data.settings||SaneSettings.normalize({});
    var tabs='<div class="settings-tabs" role="tablist" aria-label="Website settings categories">'+SaneSettings.groups.map(function(g){var active=state.settingsTab===g.id;return '<button type="button" role="tab" id="tab-'+g.id+'" aria-controls="settings-'+g.id+'" aria-selected="'+active+'" tabindex="'+(active?'0':'-1')+'" data-settings-tab="'+g.id+'">'+esc(g.label)+'</button>';}).join('')+'</div>';
    var panels=SaneSettings.groups.map(function(g){return '<div role="tabpanel" aria-labelledby="tab-'+g.id+'" id="settings-'+g.id+'" class="settings-tab-panel '+(state.settingsTab===g.id?'is-active':'')+'"><div class="card settings-card"><div class="workspace-card-head"><div><span class="workspace-eyebrow">Website settings</span><h3>'+esc(g.label)+'</h3><p>'+esc(SETTINGS_CONTEXT[g.id]||g.intro)+'</p></div>'+(g.id!=='navigation'?'<button type="button" class="btn btn-ghost btn-small" data-settings-expand="'+g.id+'">Show all fields</button>':'')+'</div><div class="settings-fields">'+settingsFields(g,x)+'</div></div></div>';}).join('');
    return panelShell('settings','Settings','Choose a category, then open the section you need. Save a draft to review changes with the team, or publish when ready.',tabs+panels+savebarHtml('settings'));
  }
  function selectSettingsTab(id, focus) {
    state.settingsTab=id;
    $$('#panel-settings [role="tab"]').forEach(function(b){var active=b.dataset.settingsTab===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;if(active&&focus)b.focus();});
    $$('#panel-settings [role="tabpanel"]').forEach(function(p){p.classList.toggle('is-active',p.id==='settings-'+id);});
  }
  function orientSettingsTabs(){var tabs=$('#panel-settings [role=tablist]');if(tabs)tabs.setAttribute('aria-orientation',matchMedia('(min-width:1100px)').matches?'vertical':'horizontal');}
  window.addEventListener('resize',orientSettingsTabs);
  function bindSettings() {
    orientSettingsTabs();
    var root=$('#panel-settings');
    bindFields('settings',root);
    function updateSectionButton(id){var panel=$('#settings-'+id),button=$('[data-settings-expand]',panel),groups=$$('[data-settings-group]',panel),open=groups.length&&groups.every(function(d){return d.open;});if(button){button.textContent=open?'Collapse fields':'Show all fields';button.setAttribute('aria-expanded',String(!!open));button.setAttribute('aria-controls',groups.map(function(d){return d.id;}).join(' '));}}
    $$('[data-settings-group]',root).forEach(function(d){d.ontoggle=function(){settingsOpen[d.dataset.settingsGroup]=d.open;updateSectionButton(d.closest('[role=tabpanel]').id.replace('settings-',''));};});
    $$('[data-settings-expand]',root).forEach(function(b){var id=b.dataset.settingsExpand;updateSectionButton(id);b.onclick=function(){var groups=$$('[data-settings-group]',$('#settings-'+id)),open=groups.some(function(d){return !d.open;});groups.forEach(function(d){d.open=open;settingsOpen[d.dataset.settingsGroup]=open;});updateSectionButton(id);};});
    $$('[data-settings-tab]',root).forEach(function(b){b.onclick=function(){selectSettingsTab(b.dataset.settingsTab);};b.onkeydown=function(e){var tabs=$$('[data-settings-tab]',root),i=tabs.indexOf(b);if(['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].indexOf(e.key)===-1)return;e.preventDefault();var next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1)+tabs.length)%tabs.length;selectSettingsTab(tabs[next].dataset.settingsTab,true);};});
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
    if(id==='eventStories')id='events';
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
  var logo=$('#dashboardHomeLogo');if(logo)logo.onclick=function(e){e.preventDefault();goTo('home');};
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
    void checkWebsiteSource(true);
  }

  var sourceHead='',sourceBusy=false,sourceLast=0,sourcePending={};
  function sourceStatus(message){var node=$('#dashboardSourceStatus');if(!node){node=document.createElement('div');node.id='dashboardSourceStatus';node.setAttribute('role','status');node.className='dashboard-source-status';$('#panels').before(node);}node.hidden=!message;node.textContent=message;}
  function versionPanelImages(id,revision){var panel=$('#panel-'+id);if(!panel)return;$$('img[src]',panel).forEach(function(img){var url=new URL(img.getAttribute('src'),location.origin);if(url.origin===location.origin && /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url.pathname) && !/^\/(api|dash|vendor)\//i.test(url.pathname)){url.searchParams.set('site-rev',revision);img.src=url.pathname+url.search;}});}
  async function checkWebsiteSource(force){
    if(!entered || $('#appView').style.display==='none' || sourceBusy || document.hidden || (!force && Date.now()-sourceLast<5000))return;
    sourceBusy=true;sourceLast=Date.now();
    try{
      var revision=await api('/api/studio?revision=1');
      if(revision.deployment && revision.deployment!==revision.head){sourceStatus('GitHub updates detected · waiting for the website deployment. Your work is kept.');return;}
      var changed=revision.head!==sourceHead;
      if(!changed && !Object.keys(sourcePending).length)return;
      var protectedSections=[],homeChanged=false;
      for(var id of Object.keys(state.versions)){
        if(!state.loaded[id] || (!changed && !sourcePending[id]))continue;
        var focused=$('#panel-'+(id==='eventStories'?'events':id)),editing=focused && (focused.querySelector('dialog[open]') || focused.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
        if(state.busy[id] || state.uploading || editing){sourcePending[id]=true;continue;}
        if(!changed && (state.unsaved[id] || state.dirty[id])){protectedSections.push(id);continue;}
        var before=contentText(id),old=state.versions[id],remote=await api('/api/dash-content?section='+encodeURIComponent(id)+'&ref='+encodeURIComponent(revision.head));
        if(state.versions[id]!==old){sourcePending[id]=true;continue;}
        if(id==='settings'&&remote.published){overviewPublishedSettings=remote.published.content;homeChanged=true;}
        var same=remote.published && old.sha===remote.published.sha && old.draftSha===(remote.draft?remote.draft.sha:null);
        if(same){versionPanelImages(id,revision.head);delete sourcePending[id];continue;}
        if(state.unsaved[id] || state.dirty[id] || state.busy[id] || contentText(id)!==before){sourcePending[id]=true;protectedSections.push(id);state.conflicts[id]='The website or shared draft changed externally. Your work is kept; load the latest version when you are ready.';updateSaveUI(id);continue;}
        if(focused && (focused.querySelector('dialog[open]') || focused.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName))){sourcePending[id]=true;continue;}
        await loadContentSection(id,false,remote);refreshPanel(id);versionPanelImages(id,revision.head);updateSaveUI(id);delete sourcePending[id];
        homeChanged=true;
      }
      if(homeChanged&&state.section==='home')refreshPanel('home');
      sourceHead=revision.head;
      sourceStatus(protectedSections.length?'Website updates available · your unpublished '+protectedSections.join(', ')+' work is protected.':Object.keys(sourcePending).length?'Website updates waiting until you finish the active field.':'Website content is up to date · checked '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));
    }catch(e){if(e.message!=='unauthorized')sourceStatus('Update check paused · '+e.message+' Your work is kept.');}
    finally{sourceBusy=false;}
  }
  setInterval(function(){void checkWebsiteSource(false);},30000);
  window.addEventListener('focus',function(){void checkWebsiteSource(false);});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)void checkWebsiteSource(false);});
  window.addEventListener('studio:check-source',function(){void checkWebsiteSource(true);});
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


