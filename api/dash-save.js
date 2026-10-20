/**
 * POST /api/dash-save — save dashboard content (team login required).
 *
 * Body (JSON content):  { path: "public/content/gallery.json", content: "<file text>" }
 * Body (image upload):  { path: "public/images/<file>.jpg", contentBase64: "<base64>" }
 *
 * Writes are git commits to the dashboard branch via the GitHub API, using
 * CMS_GITHUB_TOKEN (server-side only). Only whitelisted paths are writable.
 * JSON files are parse-checked before saving so a bad save can't break the
 * website. BRANCH flips to "main" at merge time (or set DASH_BRANCH).
 */
var lib = require('./_dashlib');

var REPO = 'carolcilliers/saneliving-website';
var BRANCH = process.env.DASH_BRANCH || 'main';

var CONTENT_FILES = {
  'public/content/gallery.json': 'json',
  'public/content/weddings.json': 'json',
  'public/content/pricing.json': 'json',
  'public/content/partners.json': 'json',
  'public/content/settings.json': 'json',
  'public/content/about.md': 'text',
};

function classify(path) {
  if (CONTENT_FILES[path]) return CONTENT_FILES[path];
  if (/^public\/images\/[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp|gif)$/i.test(path)) return 'image';
  return null;
}

async function gh(path, options) {
  var resp = await fetch('https://api.github.com/repos/' + REPO + path, Object.assign({
    headers: {
      'Authorization': 'Bearer ' + process.env.CMS_GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sane-living-dashboard',
    },
  }, options || {}));
  return resp;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!lib.requireLogin(req, res)) return;
  if (!process.env.CMS_GITHUB_TOKEN) {
    return res.status(503).json({ error: 'Saving is not configured yet (CMS_GITHUB_TOKEN missing).' });
  }
  var body = lib.readJsonBody(req);
  var path = String(body.path || '');
  var kind = classify(path);
  if (!kind) return res.status(400).json({ error: 'That file is not editable from the dashboard.' });

  var contentBase64;
  if (kind === 'image') {
    if (!body.contentBase64) return res.status(400).json({ error: 'No image data received.' });
    var approxBytes = Math.floor(String(body.contentBase64).length * 0.75);
    if (approxBytes > 4 * 1024 * 1024) return res.status(400).json({ error: 'Image is too large (max about 4 MB).' });
    contentBase64 = String(body.contentBase64);
  } else {
    if (typeof body.content !== 'string') return res.status(400).json({ error: 'No content received.' });
    if (kind === 'json') {
      try { JSON.parse(body.content); } catch (e) {
        return res.status(400).json({ error: 'The content is not valid JSON — nothing was saved.' });
      }
    }
    contentBase64 = Buffer.from(body.content, 'utf8').toString('base64');
  }

  try {
    var sha = null;
    var getResp = await gh('/contents/' + path + '?ref=' + encodeURIComponent(BRANCH));
    if (getResp.ok) {
      var existing = await getResp.json();
      sha = existing.sha || null;
    } else if (getResp.status !== 404) {
      var gErr = await getResp.text();
      return res.status(502).json({ error: 'Could not read the current file from GitHub.', detail: gErr.slice(0, 300) });
    }
    var putBody = {
      message: 'Dashboard: update ' + path.split('/').pop(),
      content: contentBase64,
      branch: BRANCH,
    };
    if (sha) putBody.sha = sha;
    var putResp = await gh('/contents/' + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(putBody),
    });
    if (!putResp.ok) {
      var pErr = await putResp.text();
      return res.status(502).json({ error: 'GitHub refused the save.', detail: pErr.slice(0, 300) });
    }
    var result = await putResp.json();
    return res.status(200).json({ ok: true, commit: result.commit && result.commit.sha });
  } catch (err) {
    console.error('dash-save error:', err);
    return res.status(500).json({ error: 'Save failed unexpectedly.' });
  }
};
