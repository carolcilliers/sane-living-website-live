/**
 * GET /api/callback — no longer used.
 *
 * This was the GitHub OAuth callback when the dashboard used "Login with
 * GitHub" (Oct 20, 2026). The team switched to a username + password login
 * the same day; that flow lives entirely in api/auth.js. This endpoint is
 * kept only so an old bookmark or the old OAuth App registration lands on
 * an explanation instead of an error.
 */

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(
    '<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:520px;margin:40px auto;line-height:1.5">' +
    '<h1>Sane Living Dashboard</h1>' +
    '<p>The dashboard no longer uses GitHub login. Please go to <strong>/admin/</strong> on the site and use the team username and password.</p>' +
    '</body></html>'
  );
};
