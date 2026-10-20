/**
 * /api/auth — Team dashboard login (username + password)
 *
 * Decap CMS is configured (public/admin/config.yml) with the GitHub backend
 * and auth_endpoint "api/auth", so clicking "Login" in /admin opens this
 * page in a popup. Flow:
 *
 *   GET  /api/auth  -> shows the username/password form
 *   POST /api/auth  -> checks the form against Vercel environment variables:
 *                        CMS_LOGIN_USER     (default: "saneliving")
 *                        CMS_LOGIN_PASSWORD (set by Carol in Vercel)
 *
 * SECURITY CHANGE (Oct 20, 2026): this endpoint USED to hand the repo editing
 * token (CMS_GITHUB_TOKEN) to the browser via Decap's postMessage handshake —
 * meaning anyone with the team password could extract the full token and use
 * it outside the dashboard. That handoff is REMOVED. The old Decap editor at
 * /admin is retired; the team dashboard at /dash is the supported editor and
 * it keeps the token strictly server-side. After a correct password this page
 * simply directs the user to /dash (where they sign in again — the dashboard
 * issues its own session).
 *
 * Nothing secret lives in the code or the repo: the password exists only as
 * a Vercel environment variable. See TEAM-DASHBOARD-SETUP.md.
 */

var crypto = require('crypto');

function digest(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest();
}

function safeEqual(a, b) {
  return crypto.timingSafeEqual(digest(a), digest(b));
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pageShell(title, inner) {
  return (
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml(title) + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">' +
    '<style>' +
    'body{font-family:Nunito,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:linear-gradient(160deg,#f8f4fc 0%,#efe4f8 100%);margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}' +
    '.card{position:relative;background:#fff;border-radius:18px;box-shadow:0 18px 44px rgba(42,26,51,.16);padding:40px 36px 34px;max-width:350px;width:90%;text-align:center;overflow:hidden}' +
    '.card::before{content:"";position:absolute;top:0;left:0;right:0;height:7px;background:linear-gradient(90deg,#2a1a33,#5b3573,#a678c4)}' +
    '.card img{height:58px;margin-bottom:8px}' +
    'h1{font-size:1.3rem;font-weight:800;margin:6px 0 18px;color:#2a1a33}' +
    'label{display:block;text-align:left;font-size:.88rem;font-weight:700;color:#4a3560;margin:15px 0 6px}' +
    'input{width:100%;box-sizing:border-box;font-size:1.05rem;padding:13px 14px;border:1.5px solid #d9cbe8;border-radius:12px;background:#fdfbff}' +
    'input:focus{border-color:#8a56a0;box-shadow:0 0 0 3px rgba(138,86,160,.25);outline:none}' +
    'button{width:100%;margin-top:24px;font-size:1.05rem;font-weight:800;padding:14px;border:0;border-radius:999px;background:linear-gradient(120deg,#5b3573,#8a56a0);color:#fff;cursor:pointer;box-shadow:0 8px 20px rgba(138,86,160,.35);transition:all .2s ease}' +
    'button:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(138,86,160,.42)}' +
    '.err{background:#fdecec;color:#8a1f1f;border:1px solid #f3c2c2;border-radius:10px;padding:10px;font-size:.9rem;margin-bottom:6px}' +
    '.note{color:#777;font-size:.83rem;margin-top:18px;line-height:1.5}' +
    '</style></head><body><div class="card">' + inner + '</div></body></html>'
  );
}

function loginForm(state, errorMessage) {
  var inner =
    '<img src="/images/logo.png" alt="Sane Living">' +
    '<h1>Team Dashboard Login</h1>' +
    (errorMessage ? '<div class="err">' + escapeHtml(errorMessage) + '</div>' : '') +
    '<form method="POST" action="/api/auth">' +
    '<input type="hidden" name="state" value="' + escapeHtml(state) + '">' +
    '<label for="u">Username</label>' +
    '<input id="u" name="username" autocomplete="username" required>' +
    '<label for="p">Password</label>' +
    '<input id="p" name="password" type="password" autocomplete="current-password" required>' +
    '<button type="submit">Log in</button>' +
    '</form>' +
    '<p class="note">Team members only. If you were given the team username and password, use those here — no GitHub account needed.</p>';
  return pageShell('Sane Living — Team Dashboard Login', inner);
}

function notConfiguredPage() {
  var inner =
    '<img src="/images/logo.png" alt="Sane Living">' +
    '<h1>Login not set up yet</h1>' +
    '<p class="note" style="font-size:.92rem;color:#555">The dashboard password and editing key have not been added in Vercel yet. Carol: see TEAM-DASHBOARD-SETUP.md in the repo (CMS_LOGIN_PASSWORD and CMS_GITHUB_TOKEN).</p>';
  return pageShell('Sane Living — Login not set up', inner);
}

function successPage() {
  // No token is sent to the browser here — see the security note at the top
  // of this file. The team dashboard at /dash keeps CMS_GITHUB_TOKEN
  // server-side at all times.
  return (
    '<!DOCTYPE html><html><body style="font-family:Nunito,-apple-system,sans-serif;color:#2a1a33;max-width:480px;margin:40px auto;padding:0 20px">' +
    '<h1 style="font-size:1.3rem">You\'re signed in — editing has moved</h1>' +
    '<p>The old editor is retired for security. Please use the team dashboard instead — it never exposes the editing key to a browser:</p>' +
    '<p><a href="/dash/" style="display:inline-block;background:#8a56a0;color:#fff;padding:12px 26px;border-radius:999px;text-decoration:none;font-weight:700">Open the team dashboard</a></p>' +
    '<p style="color:#666;font-size:.92rem">Sign in there with the same team username and password.</p>' +
    '</body></html>'
  );
}

function readBody(req) {
  return new Promise(function (resolve) {
    if (req.body && typeof req.body === 'object') return resolve(req.body);
    if (typeof req.body === 'string') return resolve(Object.fromEntries(new URLSearchParams(req.body)));
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      try { resolve(Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')))); }
      catch (e) { resolve({}); }
    });
    req.on('error', function () { resolve({}); });
  });
}

module.exports = async function handler(req, res) {
  var expectedUser = process.env.CMS_LOGIN_USER || 'saneliving';
  var expectedPassword = process.env.CMS_LOGIN_PASSWORD || '';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!expectedPassword) {
    return res.status(500).send(notConfiguredPage());
  }

  if (req.method === 'GET') {
    var state = crypto.randomBytes(16).toString('hex');
    res.setHeader('Set-Cookie', 'cms_login_state=' + state + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600');
    return res.status(200).send(loginForm(state, null));
  }

  if (req.method === 'POST') {
    var body = await readBody(req);
    var cookies = req.headers.cookie || '';
    var match = cookies.match(/(?:^|;\s*)cms_login_state=([^;]+)/);
    var storedState = match ? match[1] : '';

    var stateOk = storedState && body.state && safeEqual(body.state, storedState);
    var userOk = safeEqual(String(body.username || '').trim(), expectedUser);
    var passOk = safeEqual(body.password || '', expectedPassword);

    if (!stateOk || !userOk || !passOk) {
      await new Promise(function (r) { setTimeout(r, 800); });
      var freshState = crypto.randomBytes(16).toString('hex');
      res.setHeader('Set-Cookie', 'cms_login_state=' + freshState + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600');
      return res.status(401).send(loginForm(freshState, 'Username or password did not match. Please try again.'));
    }

    res.setHeader('Set-Cookie', 'cms_login_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
    return res.status(200).send(successPage());
  }

  return res.status(405).send('Method not allowed');
};
