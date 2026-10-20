/**
 * Team dashboard login.
 *   GET    /api/dash-login  -> { loggedIn: boolean }
 *   POST   /api/dash-login  -> { username, password } sets session cookie
 *   DELETE /api/dash-login  -> clears the session cookie
 * Uses the same CMS_LOGIN_USER / CMS_LOGIN_PASSWORD env vars as /api/auth.
 */
var lib = require('./_dashlib');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ loggedIn: lib.isLoggedIn(req) });
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', lib.clearSessionCookie());
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.CMS_LOGIN_PASSWORD) {
    return res.status(503).json({ error: 'Dashboard login is not configured yet (CMS_LOGIN_PASSWORD missing).' });
  }
  var body = lib.readJsonBody(req);
  // Small delay on failure makes password guessing impractical.
  if (!lib.checkCredentials(body.username || '', body.password || '')) {
    await new Promise(function(r) { setTimeout(r, 700); });
    return res.status(401).json({ error: 'Username or password did not match.' });
  }
  res.setHeader('Set-Cookie', lib.makeSessionCookie());
  return res.status(200).json({ ok: true });
};
