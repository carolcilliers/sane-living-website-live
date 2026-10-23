'use strict';
var login = require('./_dashlib');
var content = require('./_contentlib');
module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!login.requireLogin(req,res)) return;
  if (!process.env.CMS_GITHUB_TOKEN) return res.status(503).json({ error: 'Content editing is not configured (CMS_GITHUB_TOKEN missing).' });
  var section = req.query && req.query.section;
  if (!Object.prototype.hasOwnProperty.call(content.FILES,section)) return res.status(400).json({ error: 'Unknown content section.' });
  var ref=req.query && req.query.ref;
  if(ref && !/^[a-f0-9]{40}$/.test(ref))return res.status(400).json({error:'Invalid source revision.'});
  try {
    var files = await Promise.all([content.read(content.FILES[section],ref),content.read(content.draftPath(section),ref)]);
    var draft = files[1] ? JSON.parse(files[1].content) : null;
    if (draft) draft.sha = files[1].sha;
    return res.status(200).json({ published: files[0], draft: draft });
  } catch (e) { return res.status(e.status || 500).json({ error: e.message || 'Content could not be loaded.' }); }
};
