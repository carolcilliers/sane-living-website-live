/* Shared content contract. Keep these keys stable when redesigning the website. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SaneSettings = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var navigation = [
    { route: '/', label: 'Home', visible: true },
    { route: '/events/', label: 'Events', visible: true },
    { route: '/rent/', label: 'Rent', visible: true },
    { route: '/rent/weddings/', label: 'Weddings', visible: true },
    { route: '/gallery/', label: 'Gallery', visible: true },
    { route: '/sculpture/', label: 'Sculpture', visible: true },
    { route: '/about/', label: 'About', visible: true },
    { route: '/contact/', label: 'Contact', visible: true }
  ];
  var defaults = {
    schemaVersion: 1, businessName: 'Sane Living Center',
    phoneDisplay: '+1 (805) 646-6000', phoneLink: 'tel:+18056466000', email: 'info@saneliving.com',
    address: '316 E Matilija St, Ojai, CA 93023', hours: '7 am – 12 midnight',
    logoUrl: '/images/logo.png', logoAlt: 'Sane Living', faviconUrl: '/favicon.svg', footerText: '',
    bookingPageUrl: '/rent/pricing/', availabilityEmbedUrl: 'https://airtable.com/embed/appQOArJhzGuz5qBY/shr0WP23ZzLYTGw7E',
    instagramUrl: '', facebookUrl: '',
    homeHeading: "Downtown Ojai's Premiere Event Space", homeIntro: 'A beautiful auditorium and gathering venue in the heart of Ojai, California',
    homePrimaryLabel: 'Rent the Space', homePrimaryUrl: '/rent/', homeVideoUrl: '/hero-video.mp4', homePosterUrl: '/images/homepage-hero.jpg',
    announcementEnabled: false, announcementText: '', announcementLinkLabel: '', announcementLinkUrl: '',
    newsletterEnabled: true, newsletterTitle: 'Subscribe for updates', newsletterDescription: '', newsletterButton: 'Subscribe',
    newsletterUrl: 'https://saneliving.us19.list-manage.com/subscribe/post?u=b3bc47585c00a4e19f7c3841d&id=590b76d0aa',
    rentalFormUrl: 'https://airtable.com/embed/shr45BrcrP6gderXF?backgroundColor=cyan',
    contactFormUrl: 'https://airtable.com/embed/appQOArJhzGuz5qBY/pag6FRmZdGDyHkrc4/form',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3290.121544860756!2d-119.24323109999999!3d34.449062399999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80e9a5375bb93e5f%3A0x9ea225831ba53217!2sSane%20Living!5e0!3m2!1sen!2sus!4v1689800927855!5m2!1sen!2sus',
    directionsUrl: 'https://maps.google.com/?q=316+E+Matilija+St+Ojai+CA',
    defaultShareImage: '/images/share-auditorium.jpg', siteDescription: '', navigation: navigation, pageMeta: {}
  };
  function field(key, label, type, hint) { return { key: key, label: label, type: type || 'text', hint: hint || '' }; }
  var groups = [
    { id: 'brand', label: 'Branding', intro: 'Your identity, wherever the design takes it.', fields: [field('businessName','Business name'),field('logoUrl','Site logo','image','Upload a PNG, JPEG or WebP. Transparent PNG works well.'),field('logoAlt','Logo description'),field('faviconUrl','Browser tab icon','icon','Use a square PNG or ICO. This also updates the dashboard tab.'),field('footerText','Footer note','textarea')] },
    { id: 'contact', label: 'Contact & social', intro: 'The details guests use to find and contact you.', fields: [field('email','Contact email','email'),field('phoneDisplay','Phone displayed on the site'),field('phoneLink','Tap-to-call link','tel','Example: tel:+18056466000'),field('address','Street address'),field('hours','Opening hours'),field('instagramUrl','Instagram link','url'),field('facebookUrl','Facebook link','url'),field('directionsUrl','Directions link','url'),field('mapEmbedUrl','Map embed link','map'),field('contactFormUrl','Inquiry form embed link','airtable')] },
    { id: 'home', label: 'Homepage', intro: 'Content for the homepage hero. Layout stays with the website design.', fields: [field('homeHeading','Main headline'),field('homeIntro','Introduction','textarea'),field('homePrimaryLabel','Main button label'),field('homePrimaryUrl','Main button destination','link'),field('homePosterUrl','Hero image / video poster','image'),field('homeVideoUrl','Hero video URL','url','Use an existing /file.mp4 path or an HTTPS video link. Leave blank for an image hero.')] },
    { id: 'booking', label: 'Booking', intro: 'Booking destinations and the existing Airtable availability calendar.', fields: [field('bookingPageUrl','Booking page destination','link'),field('rentalFormUrl','Rental inquiry form embed','airtable'),field('availabilityEmbedUrl','Availability calendar embed','airtable','This changes the embed destination, not the event-sync source.')] },
    { id: 'newsletter', label: 'Newsletter', intro: 'The signup displayed in the footer.', fields: [field('newsletterEnabled','Show newsletter signup','boolean'),field('newsletterTitle','Signup heading'),field('newsletterDescription','Short description','textarea'),field('newsletterButton','Subscribe button label'),field('newsletterUrl','Mailchimp form action URL','newsletter','Use the subscribe/post action from your Mailchimp embedded form.')] },
    { id: 'announcement', label: 'Announcement', intro: 'An optional site-wide note for opening updates or special events.', fields: [field('announcementEnabled','Show announcement','boolean'),field('announcementText','Announcement text','textarea'),field('announcementLinkLabel','Optional link label'),field('announcementLinkUrl','Optional link destination','link')] },
    { id: 'sharing', label: 'Search & sharing', intro: 'Published titles and descriptions are written into page HTML during deployment.', fields: [field('siteDescription','Default description','textarea','Used on pages without their own description override.'),field('defaultShareImage','Default sharing image','image')] },
    { id: 'navigation', label: 'Navigation', intro: 'Rename, reorder or hide the existing main menu items. Page URLs stay the same.', fields: [] }
  ];
  function normalize(value) { var result=JSON.parse(JSON.stringify(defaults)); Object.keys(value||{}).forEach(function(key){if(['__proto__','constructor','prototype'].indexOf(key)===-1)result[key]=value[key];}); return result; }
  function safeUrl(value, kind) {
    if (!value) return '';
    var s = String(value).trim();
    if (/[\u0000-\u0020<>"'\\]/.test(s)) return '';
    if (s[0] === '/' && s[1] !== '/' && kind !== 'airtable' && kind !== 'map' && kind !== 'newsletter') return s;
    if (kind === 'tel' && /^tel:\+?[\d().-]+$/.test(s)) return s;
    try {
      var u = new URL(s);
      if (u.protocol !== 'https:' || u.username || u.password) return '';
      if (kind === 'airtable' && !(u.hostname === 'airtable.com' && u.pathname.indexOf('/embed/') === 0)) return '';
      if (kind === 'map' && !(/(^|\.)google\.com$/.test(u.hostname) && u.pathname.indexOf('/maps/embed') === 0)) return '';
      if (kind === 'newsletter' && !(/\.list-manage\.com$/.test(u.hostname) && u.pathname === '/subscribe/post' && u.searchParams.get('u') && u.searchParams.get('id'))) return '';
      return s;
    } catch (e) { return ''; }
  }
  function validate(settings) {
    var errors = [];
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return ['Settings must be an object.'];
    groups.forEach(function (group) { group.fields.forEach(function (f) {
      var v = settings[f.key];
      if (v == null) return;
      if (f.type === 'boolean') { if (typeof v !== 'boolean') errors.push(f.label + ' must be on or off.'); return; }
      if (typeof v !== 'string' || v.length > 10000) { errors.push(f.label + ' must be text (up to 10,000 characters).'); return; }
      if (v && ['url','link','image','icon','airtable','map','newsletter','tel'].indexOf(f.type) !== -1 && !safeUrl(v, f.type)) errors.push('Check the URL for ' + f.label + '.');
      if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push('Enter a valid contact email.');
    }); });
    if (!String(settings.businessName || '').trim()) errors.push('Business name is required.');
    if (settings.announcementEnabled && !String(settings.announcementText || '').trim()) errors.push('Add announcement text before enabling the banner.');
    if (settings.newsletterEnabled && !safeUrl(settings.newsletterUrl, 'newsletter')) errors.push('Add a valid Mailchimp action before enabling signup.');
    if (settings.navigation != null) {
      if (!Array.isArray(settings.navigation) || settings.navigation.length !== navigation.length) errors.push('Keep every navigation entry; hide items with their visibility switch.');
      else {
        var seen = {};
        settings.navigation.forEach(function (item) {
          if (!item || !navigation.some(function (n) { return n.route === item.route; }) || seen[item.route]) { errors.push('Navigation contains an unknown or duplicate page.'); return; }
          seen[item.route] = true;
          if (typeof item.visible !== 'boolean' || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 60) errors.push('Each menu item needs a label and a visibility setting.');
        });
        if (!settings.navigation.some(function (n) { return n.visible; })) errors.push('Keep at least one navigation item visible.');
      }
    }
    if (settings.pageMeta != null) {
      if (typeof settings.pageMeta !== 'object' || Array.isArray(settings.pageMeta)) errors.push('Page sharing settings must be an object.');
      else Object.keys(settings.pageMeta).forEach(function (route) {
        var meta = settings.pageMeta[route];
        if (!/^\/[a-z0-9/-]*$/.test(route) || !meta || typeof meta !== 'object' || Array.isArray(meta)) { errors.push('Invalid page metadata.'); return; }
        ['title','description','image'].forEach(function (key) { if (meta[key] != null && (typeof meta[key] !== 'string' || meta[key].length > 2000)) errors.push('Check page ' + key + ' for ' + route); });
        if (meta.image && !safeUrl(meta.image,'image')) errors.push('Check the sharing image for ' + route);
      });
    }
    return errors;
  }
  return { version: 1, defaults: defaults, groups: groups, normalize: normalize, safeUrl: safeUrl, validate: validate };
});
