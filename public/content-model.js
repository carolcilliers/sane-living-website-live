(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./vendor/js-yaml.min.js'), require('./site-config.js'));
  else root.SaneContent = factory(root.jsyaml, root.SaneSettings);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (yaml, config) {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function inline(s) {
    return esc(s).replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
      var url = config.safeUrl(href.replace(/&amp;/g,'&'), 'link');
      return url ? '<a href="' + esc(url) + '">' + label + '</a>' : label;
    }).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
  }
  function markdown(text) {
    var html = '', list = false;
    String(text || '').split(/\n\s*\n/).forEach(function (block) {
      block.split('\n').forEach(function (line) {
        if (/^[-*] /.test(line)) { if (!list) { html += '<ul>'; list = true; } html += '<li>' + inline(line.slice(2)) + '</li>'; }
        else { if (list) { html += '</ul>'; list = false; } if (!line.trim()) return;
          var h = /^(#{1,3}) (.+)$/.exec(line); html += h ? '<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>' : '<p>' + inline(line) + '</p>';
        }
      });
    });
    return html + (list ? '</ul>' : '');
  }
  function parseAbout(text) {
    var normalized = String(text || '').replace(/\r\n/g,'\n');
    var match = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(normalized);
    if (normalized.indexOf('---\n') === 0 && !match) throw new Error('The About page setup is incomplete. Restore the original file before editing.');
    var metadata = match ? yaml.load(match[1], { schema: yaml.JSON_SCHEMA }) : {};
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('About page setup must be an object.');
    if (metadata.sections != null && !Array.isArray(metadata.sections)) throw new Error('About sections must be a list.');
    (metadata.sections||[]).forEach(function(s){if(!s||typeof s!=='object'||Array.isArray(s))throw new Error('An About section has an invalid structure.');['heading','body','linkText','linkUrl','image'].forEach(function(k){if(s[k]!=null&&typeof s[k]!=='string')throw new Error('About section '+k+' must be text.');});});
    return { metadata: metadata, body: match ? match[2] : normalized, hasFrontmatter: !!match };
  }
  function serializeAbout(model) { return model.hasFrontmatter || Object.keys(model.metadata).length ? '---\n' + yaml.dump(model.metadata, { lineWidth: 100, noRefs: true, schema: yaml.JSON_SCHEMA }).trimEnd() + '\n---\n' + (model.body || '') : model.body; }
  function validateAbout(model) {
    var errors = [];
    (model.metadata.sections || []).forEach(function (s,i) {
      if (!s || typeof s !== 'object' || typeof s.heading !== 'string' || !s.heading.trim()) errors.push('Add a heading for section ' + (i+1) + '.');
      if (s && s.linkUrl && !config.safeUrl(s.linkUrl,'link')) errors.push('Check the link in section ' + (i+1) + '.');
      if (s && s.image && !config.safeUrl(s.image,'image')) errors.push('Check the image in section ' + (i+1) + '.');
      if (s && s.body != null && typeof s.body !== 'string') errors.push('Section ' + (i+1) + ' needs text content.');
    });
    return errors;
  }
  function aboutPreview(model) {
    return '<h1>' + esc(model.metadata.title || 'About Sane Living') + '</h1>' + (model.metadata.sections || []).filter(function(s){return s.visible!==false;}).map(function (s) {
      var url = config.safeUrl(s.linkUrl,'link');
      return '<section><h2>' + esc(s.heading) + '</h2>' + markdown(s.body) + (url && s.linkText ? '<a href="' + esc(url) + '">' + esc(s.linkText) + '</a>' : '') + '</section>';
    }).join('') + markdown(model.body);
  }
  return { esc: esc, markdown: markdown, parseAbout: parseAbout, serializeAbout: serializeAbout, validateAbout: validateAbout, aboutPreview: aboutPreview };
});
