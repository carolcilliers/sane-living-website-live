/** Authenticated publishing, shared drafts and unreferenced image uploads. */
'use strict';
var login = require('./_dashlib');
var repo = require('./_contentlib');
var settings = require('../public/site-config');
var model = require('../public/content-model');
function conflict(message) { var e = new Error(message); e.status = 409; throw e; }
function validate(section, text) {
  if (Buffer.byteLength(text,'utf8') > 750000) return 'Content is too large (maximum 750 KB).';
  if (section === 'about') {
    try { return model.validateAbout(model.parseAbout(text)).join(' '); } catch(e) { return 'About content could not be read: ' + e.message; }
  }
  var data;
  try { data = JSON.parse(text); } catch(e) { return 'The content is not valid JSON — nothing was saved.'; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Content must be an object.';
  if (section === 'settings') return settings.validate(settings.normalize(data)).join(' ');
  if (section === 'gallery' && !Array.isArray(data.photos)) return 'Gallery photos must be a list.';
  if (section === 'pricing' && !Array.isArray(data.rows)) return 'Pricing rows must be a list.';
  if (section === 'partners' && !Array.isArray(data.partners)) return 'Partners must be a list.';
  return '';
}
module.exports = async function (req, res) {
  res.setHeader('Cache-Control','private, no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!login.requireLogin(req,res)) return;
  if (!process.env.CMS_GITHUB_TOKEN) return res.status(503).json({ error: 'Saving is not configured (CMS_GITHUB_TOKEN missing).' });
  var body = login.readJsonBody(req);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'Send a content object.' });
  var path = String(body.path || ''), section = repo.sectionFor(path);
  var image = /^public\/images\/[A-Za-z0-9][A-Za-z0-9._-]*\.(jpg|jpeg|png|webp|gif|ico)$/i.exec(path);
  if (!section && !image) return res.status(400).json({ error: 'That file is not editable from the dashboard.' });
  try {
    if (image) {
      var base64 = body.contentBase64;
      if (typeof base64 !== 'string' || !base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) return res.status(400).json({ error: 'No valid image data received.' });
      var bytes = Buffer.from(base64,'base64');
      if (bytes.length > 4 * 1024 * 1024) return res.status(413).json({ error: 'Image is too large (max 4 MB).' });
      var ext = image[1].toLowerCase();
      var valid = ext === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
        /jpe?g/.test(ext) ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 :
        ext === 'gif' ? /^GIF8[79]a$/.test(bytes.subarray(0,6).toString()) :
        ext === 'webp' ? bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP' : bytes.subarray(0,4).equals(Buffer.from([0,0,1,0]));
      if (!valid) return res.status(400).json({ error: 'The file contents do not match the image extension.' });
      var existing = await repo.read(path);
      if (existing) return res.status(409).json({ error: 'This filename already exists. Upload with a new filename.' });
      var response = await repo.gh('/contents/' + path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:repo.BRANCH,message:'Dashboard: upload '+path.split('/').pop(),content:base64})});
      if (!response.ok) return res.status(502).json({ error: 'GitHub refused the image upload (' + response.status + ').' });
      var uploaded = await response.json();
      return res.status(200).json({ok:true,commit:uploaded.commit && uploaded.commit.sha,url:path.slice(6)});
    }
    var action = body.action || 'publish';
    if (['draft','publish','discard'].indexOf(action) === -1) return res.status(400).json({ error: 'Unknown save action.' });
    if (!Object.prototype.hasOwnProperty.call(body,'expectedSha') || !Object.prototype.hasOwnProperty.call(body,'expectedDraftSha')) return res.status(400).json({ error: 'Reload the dashboard before saving so content versions can be checked.' });
    var current = await Promise.all([repo.read(path),repo.read(repo.draftPath(section))]);
    var published = current[0], draft = current[1];
    if ((published && published.sha || null) !== body.expectedSha) conflict('Someone published a newer version. Your changes are kept on this device. Reload the latest version before publishing.');
    if ((draft && draft.sha || null) !== body.expectedDraftSha) conflict('A teammate saved a newer shared draft. Your changes are kept on this device. Reload before saving.');
    if (action === 'discard') {
      if (draft) {
        var deleted = await repo.gh('/contents/'+repo.draftPath(section),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:repo.BRANCH,message:'Dashboard: discard '+section+' draft',sha:draft.sha})});
        if (!deleted.ok) conflict('The shared draft changed. Reload before discarding it.');
      }
      return res.status(200).json({ok:true,sha:published && published.sha || null,draftSha:null});
    }
    if (typeof body.content !== 'string') return res.status(400).json({ error: 'No content received.' });
    if (Buffer.byteLength(body.content,'utf8') > 750000) return res.status(413).json({error:'Content is too large (maximum 750 KB).'});
    var error = validate(section,body.content);
    if (error && (action === 'publish' || !body.content || (section !== 'settings' && section !== 'about'))) return res.status(400).json({ error:error });
    if (action === 'draft') {
      try { if(section === 'about') model.parseAbout(body.content); else { var parsed=JSON.parse(body.content); if(!parsed || typeof parsed!=='object' || Array.isArray(parsed)) throw Error('object required'); } } catch(e) { return res.status(400).json({error:'Draft content is not readable.'}); }
      var updatedAt = new Date().toISOString();
      var result = await repo.write(repo.draftPath(section),JSON.stringify({version:1,baseSha:body.expectedSha,content:body.content,updatedAt:updatedAt},null,2)+'\n',draft && draft.sha,'Dashboard: save '+section+' draft');
      return res.status(200).json({ok:true,action:'draft',sha:body.expectedSha,draftSha:result.content.sha,updatedAt:updatedAt,commit:result.commit.sha});
    }
    var result = await repo.write(path,body.content,published && published.sha,'Dashboard: publish '+section);
    var warning = '';
    if (draft) {
      var cleaned = await repo.gh('/contents/'+repo.draftPath(section),{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({branch:repo.BRANCH,message:'Dashboard: clear published '+section+' draft',sha:draft.sha})});
      if (!cleaned.ok) warning = 'Published, but the shared draft could not be cleared. Reload to see its latest state.';
    }
    return res.status(200).json({ok:true,action:'publish',sha:result.content.sha,draftSha:warning ? draft && draft.sha : null,commit:result.commit.sha,warning:warning});
  } catch(e) { return res.status(e.status || 500).json({error:e.message || 'Saving failed. Your changes are kept on this device.'}); }
};

