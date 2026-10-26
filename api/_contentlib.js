'use strict';
var REPO = 'carolcilliers/sane-living-website-live';
var BRANCH = process.env.DASH_BRANCH || 'main';
var FILES = Object.freeze({ eventStories: 'public/content/event-stories.json', gallery: 'public/content/gallery.json', weddings: 'public/content/weddings.json', pricing: 'public/content/pricing.json', partners: 'public/content/partners.json', settings: 'public/content/settings.json', about: 'public/content/about.md' });
function sectionFor(path) { return Object.keys(FILES).find(function (k) { return FILES[k] === path; }) || null; }
function draftPath(section) { return 'dashboard-drafts/' + section + '.json'; }
async function gh(path, options) {
  var opts = options || {};
  return fetch('https://api.github.com/repos/' + REPO + path, { method: opts.method || 'GET', headers: Object.assign({ Authorization: 'Bearer ' + process.env.CMS_GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'sane-living-dashboard' }, opts.headers || {}), body: opts.body });
}
async function read(path, ref) {
  var r = await gh('/contents/' + path + '?ref=' + encodeURIComponent(ref || BRANCH));
  if (r.status === 404) return null;
  if (!r.ok) { var e = new Error('GitHub could not read this content (' + r.status + ').'); e.status = 502; throw e; }
  var d = await r.json();
  if (typeof d.content !== 'string' || d.encoding !== 'base64') { var e2 = new Error('This file is too large to edit here.'); e2.status = 413; throw e2; }
  return { sha: d.sha, content: Buffer.from(d.content.replace(/\s/g,''),'base64').toString('utf8') };
}
async function write(path, content, sha, message) {
  var body = { branch: BRANCH, message: message, content: Buffer.from(content,'utf8').toString('base64') };
  if (sha) body.sha = sha;
  var r = await gh('/contents/' + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { var e = new Error(r.status === 409 || r.status === 422 ? 'This file changed while saving. Your work is kept; reload the latest version before publishing.' : 'GitHub refused the save (' + r.status + '). Check the dashboard token’s Contents write access.'); e.status = r.status === 409 || r.status === 422 ? 409 : 502; throw e; }
  return r.json();
}
module.exports = { FILES: FILES, BRANCH: BRANCH, sectionFor: sectionFor, draftPath: draftPath, gh: gh, read: read, write: write };
