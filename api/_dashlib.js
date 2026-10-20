/**
 * Shared helpers for the custom team dashboard endpoints.
 * (Underscore-prefixed: Vercel does not route this file as an endpoint.)
 *
 * Login model: same team username/password as the Decap login
 * (CMS_LOGIN_USER / CMS_LOGIN_PASSWORD Vercel env vars). A successful login
 * sets a signed, HttpOnly session cookie. The signing secret is derived from
 * server-side env vars only — nothing secret ever reaches the browser.
 */
var crypto = require('crypto');

function sha256(str) {
  return crypto.createHash('sha256').update(String(str), 'utf8').digest();
}

function safeEqualStr(a, b) {
  var ha = sha256(a == null ? '' : a);
  var hb = sha256(b == null ? '' : b);
  return crypto.timingSafeEqual(ha, hb);
}

function sessionSecret() {
  return String(process.env.CMS_GITHUB_TOKEN || '') + '|' + String(process.env.CMS_LOGIN_PASSWORD || '');
}

function sign(payload) {
  return crypto.createHmac('sha256', sessionSecret()).update(payload).digest('hex');
}

var COOKIE_NAME = 'sl_dash';
var SESSION_DAYS = 7;

function makeSessionCookie() {
  var exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 3600;
  var payload = 'v1.' + exp;
  var value = payload + '.' + sign(payload);
  return COOKIE_NAME + '=' + value + '; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=' + (SESSION_DAYS * 24 * 3600);
}

function clearSessionCookie() {
  return COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0';
}

function parseCookies(req) {
  var out = {};
  var raw = (req.headers && (req.headers.cookie || req.headers.Cookie)) || '';
  raw.split(';').forEach(function(part) {
    var i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

function isLoggedIn(req) {
  try {
    var value = parseCookies(req)[COOKIE_NAME];
    if (!value) return false;
    var parts = value.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') return false;
    var exp = parseInt(parts[1], 10);
    if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
    var expected = sign(parts[0] + '.' + parts[1]);
    var a = Buffer.from(expected, 'utf8');
    var b = Buffer.from(parts[2], 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

function checkCredentials(username, password) {
  var expectedUser = process.env.CMS_LOGIN_USER || 'saneliving';
  var expectedPass = process.env.CMS_LOGIN_PASSWORD || '';
  if (!expectedPass) return false;
  return safeEqualStr(username, expectedUser) && safeEqualStr(password, expectedPass);
}

function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch (e) { return {}; }
}

function requireLogin(req, res) {
  if (!isLoggedIn(req)) {
    res.status(401).json({ error: 'Not logged in' });
    return false;
  }
  return true;
}

module.exports = {
  COOKIE_NAME: COOKIE_NAME,
  makeSessionCookie: makeSessionCookie,
  clearSessionCookie: clearSessionCookie,
  isLoggedIn: isLoggedIn,
  checkCredentials: checkCredentials,
  readJsonBody: readJsonBody,
  requireLogin: requireLogin,
};
