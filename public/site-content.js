/* Frontend adapter for the stable /content/settings.json contract.
   New layouts can reuse data-site-text/href/src hooks and SaneSite.ready. */
(function () {
  'use strict';
  var cfg = window.SaneSettings;
  if (!cfg) return;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function all(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }
  function text(selector,value) { all(selector).forEach(function(el){el.textContent=value;}); }
  function href(selector,value,kind) { var url=cfg.safeUrl(value,kind||'link');if(url)all(selector).forEach(function(el){el.setAttribute('href',url);}); }
  function src(selector,value,kind) { var url=cfg.safeUrl(value,kind||'image');all(selector).forEach(function(el){if(url){el.setAttribute('src',url);el.hidden=false;}else if(value===''){el.hidden=true;}}); }
  function footer(s) {
    var action=cfg.safeUrl(s.newsletterUrl,'newsletter'),signup='';
    if(s.newsletterEnabled && action){
      var u=new URL(action),honeypot='b_'+u.searchParams.get('u')+'_'+u.searchParams.get('id');
      signup='<div class="mc-signup mc-signup-footer"><h4>'+esc(s.newsletterTitle)+'</h4>'+(s.newsletterDescription?'<p class="footer-newsletter-description">'+esc(s.newsletterDescription)+'</p>':'')+
        '<form action="'+esc(action)+'" method="post" target="_blank" novalidate><label class="visually-hidden" for="footer-email">Email address</label><input id="footer-email" type="email" name="EMAIL" placeholder="Email address" required><div class="signup-honeypot" aria-hidden="true"><input name="'+esc(honeypot)+'" type="text" tabindex="-1" value=""></div><button type="submit">'+esc(s.newsletterButton)+'</button></form></div>';
    }
    var phone=cfg.safeUrl(s.phoneLink,'tel');
    var email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)?s.email:'';
    var social=['instagramUrl','facebookUrl'].map(function(key){var url=cfg.safeUrl(s[key],'url');return url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+(key==='instagramUrl'?'Instagram':'Facebook')+'</a>':'';}).join(' ');
    return '<div class="container">'+signup+'<p class="footer-address">'+esc(s.businessName)+(s.address?' · '+esc(s.address):'')+'</p>'+
      '<p class="footer-contact">'+(phone?'<a href="'+esc(phone)+'">'+esc(s.phoneDisplay)+'</a>':esc(s.phoneDisplay))+(email?' · <a href="mailto:'+esc(email)+'">'+esc(email)+'</a>':'')+'</p>'+
      (s.hours?'<p class="footer-hours">'+esc(s.hours)+'</p>':'')+
      '<nav class="footer-links" aria-label="Footer navigation"><a href="/rent/">Rent</a><a href="/events/">Events</a><a href="/contact/">Contact</a><a href="/dash/">Team Login</a></nav>'+
      (social?'<div class="footer-social">'+social+'</div>':'')+(s.footerText?'<p class="footer-note">'+esc(s.footerText)+'</p>':'')+'<p class="footer-copy">© '+new Date().getFullYear()+' '+esc(s.businessName)+'</p></div>';
  }
  function navigation(s) {
    var list=document.getElementById('nav-links');if(!list)return;
    var items=Array.prototype.slice.call(list.children);
    (s.navigation||[]).forEach(function(n){var li=items.find(function(item){var a=item.querySelector('a');return a&&a.getAttribute('href')===n.route;});if(!li)return;li.hidden=!n.visible;li.querySelector('a').textContent=n.label;list.appendChild(li);});
  }
  function apply(s) {
    all('[data-site-text]').forEach(function(el){var key=el.dataset.siteText;if(Object.prototype.hasOwnProperty.call(s,key)&&typeof s[key]==='string')el.textContent=s[key];});
    all('[data-site-href]').forEach(function(el){var url=cfg.safeUrl(s[el.dataset.siteHref],el.dataset.siteHref==='phoneLink'?'tel':'link');if(url)el.href=url;});
    all('[data-site-src]').forEach(function(el){var url=cfg.safeUrl(s[el.dataset.siteSrc],'image');if(url)el.src=url;});
    src('.nav-logo img,[data-site-logo]',s.logoUrl);all('.nav-logo img,[data-site-logo]').forEach(function(el){el.alt=s.logoAlt||s.businessName;});
    var favicon=document.querySelector('link[rel="icon"]')||document.head.appendChild(document.createElement('link'));favicon.rel='icon';favicon.href=cfg.safeUrl(s.faviconUrl,'icon')||'/favicon.svg';favicon.removeAttribute('type');
    navigation(s);
    var foot=document.getElementById('site-footer');if(foot){foot.classList.add('site-footer');foot.innerHTML=footer(s);}
    src('[data-site-availability]',s.availabilityEmbedUrl,'airtable');
    src('[data-site-map]',s.mapEmbedUrl,'map');src('[data-site-rental-inquiry]',s.rentalFormUrl,'airtable');src('[data-site-inquiry]',s.contactFormUrl,'airtable');
    href('[data-site-booking]',s.bookingPageUrl);
    all('[data-site-email]').forEach(function(el){if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)){el.href='mailto:'+s.email;el.textContent=s.email;}});
    text('[data-site-text="homeHeading"]',s.homeHeading);text('[data-site-text="homeIntro"]',s.homeIntro);
    var video=document.querySelector('[data-site-hero-video]');
    if(video){var url=cfg.safeUrl(s.homeVideoUrl,'url'),poster=cfg.safeUrl(s.homePosterUrl,'image');if(poster)video.poster=poster;if(url){video.muted=true;video.defaultMuted=true;video.playsInline=true;var source=video.querySelector('source');if(source&&source.getAttribute('src')!==url){source.src=url;video.load();}video.hidden=false;var playback=video.play();if(playback&&playback.catch)playback.catch(function(){});}else{video.hidden=true;video.pause();}var bg=video.parentElement;if(poster){bg.style.backgroundImage='url("'+poster+'")';bg.style.backgroundSize='cover';bg.style.backgroundPosition='center';}}
    var banner=document.getElementById('site-announcement');
    if(s.announcementEnabled&&s.announcementText){
      if(!banner){banner=document.createElement('div');banner.id='site-announcement';banner.className='site-announcement';banner.setAttribute('role','region');banner.setAttribute('aria-label','Announcement');document.body.prepend(banner);}
      var link=cfg.safeUrl(s.announcementLinkUrl,'link');banner.innerHTML='<span>'+esc(s.announcementText)+'</span>'+(link&&s.announcementLinkLabel?' <a href="'+esc(link)+'">'+esc(s.announcementLinkLabel)+'</a>':'');
      document.body.classList.add('has-announcement');var resize=function(){document.documentElement.style.setProperty('--site-announcement-height',banner.offsetHeight+'px');};resize();if(window.ResizeObserver)new ResizeObserver(resize).observe(banner);
    }
    document.dispatchEvent(new CustomEvent('sane:settings-ready',{detail:s}));
  }
  var ready=fetch('/content/settings.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error('settings unavailable');return r.json();}).then(function(data){var normalized=cfg.normalize(data);if(cfg.validate(normalized).length)throw Error('settings validation failed');return normalized;}).catch(function(){return cfg.normalize({});});
  window.SaneSite={ready:ready,apply:apply};
  function run(){ready.then(apply);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
