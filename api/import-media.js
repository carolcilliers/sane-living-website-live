/**
 * POST /api/import-media — ONE-TIME media migration helper (team login required).
 *
 * Transfers the site's photos/videos from the old deployment into THIS
 * repository, server-side, with integrity checks:
 *   { action: "blob", path, sha }  -> fetches the file from the old site's
 *      public deployment, verifies its git blob SHA-1 matches the expected
 *      `sha`, creates the blob in this repo, returns the blob sha.
 *   { action: "commit", entries: [{path, sha}] } -> creates ONE commit on
 *      main adding all blobs (tree built on top of the current main tree).
 *
 * The GitHub token (CMS_GITHUB_TOKEN) never leaves the server. Remove this
 * file once the migration is verified complete.
 */
var crypto = require('crypto');
var lib = require('./_dashlib');

var REPO = 'carolcilliers/sane-living-website-live';
var BRANCH = 'main';
var SOURCE_BASE = 'https://saneliving-website-one.vercel.app/';
var MANIFEST = [{"path":"public/IMG_0197.jpg","sha":"99f77b410cffba87016f5976baf82f19c9554466","size":441642},{"path":"public/IMG_0201.jpg","sha":"4517fe400116f10afe7449488b0c4ea4c63b9ec5","size":435414},{"path":"public/IMG_0207.jpg","sha":"c2f354d88dc34dbcdebc270c12deecaf7525dbde","size":963276},{"path":"public/IMG_0208.jpg","sha":"317f73b5eb466b6b452df84c949ccf0428ea4893","size":912008},{"path":"public/IMG_0216.jpg","sha":"31fd8c9caa38bdf5d934e34a506d9e89412894a4","size":505309},{"path":"public/IMG_0217.jpg","sha":"02e33475d74b7f4464f1e2d414f1c4240f3e5ea8","size":469242},{"path":"public/hero-video.mp4","sha":"74aeed3dbfd66ee9b74332363f00033c16f97b8d","size":1889770},{"path":"public/images/about-aubrey.jpg","sha":"e8ad0f4b9432ccd7135bdd225a3bffdefa6c32d5","size":235850},{"path":"public/images/about-center-exterior.jpg","sha":"7f74a1dd6cc7bd1f289bf43be35e4b7151e0eceb","size":554200},{"path":"public/images/about-center.jpg","sha":"efa91281939a4ec9a8d4890c352b51d2ff09bb3e","size":258844},{"path":"public/images/about-farm.jpg","sha":"e36a19a7497b1195c584acb2a9877af577aafadc","size":1474110},{"path":"public/images/about-founder.jpg","sha":"e8ad0f4b9432ccd7135bdd225a3bffdefa6c32d5","size":235850},{"path":"public/images/about-hipvegan.jpg","sha":"f4471a4f0ede24d5cfbc5bbbef19fe80eec429b1","size":1244738},{"path":"public/images/about-hipvgn.jpg","sha":"f4471a4f0ede24d5cfbc5bbbef19fe80eec429b1","size":1244738},{"path":"public/images/about-sunset.jpg","sha":"e36a19a7497b1195c584acb2a9877af577aafadc","size":1474110},{"path":"public/images/badge-go.png","sha":"428ca77ab5930fe6aaa9eeb744d4eedaa47d28dd","size":26737},{"path":"public/images/badge-me.png","sha":"4cd39e67d69dff031653c2dfee76ee65c3a08992","size":6219},{"path":"public/images/badge-we.png","sha":"b24b76d855d55699d7ca00c0ff4f7994dea9e92b","size":6326},{"path":"public/images/center-office.jpg","sha":"da6857dd610468216bfae1f2a23a2ee30365bc87","size":469205},{"path":"public/images/contact-exterior.jpg","sha":"a297c1e5e112420948648de2e45ed1519e2c45d5","size":682092},{"path":"public/images/events-past/3EventPage_print-compressed_1.jpg","sha":"b961563cbef15c4b3231bd4c42d46030d8065cdd","size":191689},{"path":"public/images/events-past/Amma-2024-Ojai-Flyer-new-9.jpg","sha":"77b465aec20828355af24c4144f33152e9aafae2","size":411437},{"path":"public/images/events-past/Amma-2026-Ojai-Flyer-web-2.jpg","sha":"0f49fc776723b411cc741b5f8ad918111498834f","size":376691},{"path":"public/images/events-past/Amma-Aug-20205.jpg","sha":"d76eb103d390d9927ac379a14b9626ac6031e32e","size":168512},{"path":"public/images/events-past/Ammonite-85X11-FINAL-USE-THIS-ONE.jpg","sha":"093573f88122b10792205c6b00c3806ddeab70dc","size":97369},{"path":"public/images/events-past/Archtypes-of-Mary-Magdalene.jpg","sha":"48fdd61204777eb0159cd0d6491adf35a5546c7d","size":187393},{"path":"public/images/events-past/BIRTHDAY-SHOW-yes.jpg","sha":"6bd2345c6dafbda35ff614e4b40d8af9f7fd82b6","size":251474},{"path":"public/images/events-past/Biggest-8.5x11_Final.jpg","sha":"cc84eb4113ca68d365f7fdbfd03ffc2b6433ca83","size":146878},{"path":"public/images/events-past/CABRINI.jpg","sha":"54bd2faecb3c39e2a809db92e507c0e92e8eb453","size":145828},{"path":"public/images/events-past/CLOWN-WORKSHOP-NEW-FLYER.jpg","sha":"0001b1c90ffb5dce780262dddd21e6157c7b36bc","size":122116},{"path":"public/images/events-past/Chamber-1-28-26.jpg","sha":"d50214fba3be40450cffa904120679ba82d6a7c1","size":190693},{"path":"public/images/events-past/Coexist-9-11.jpg","sha":"4bcbfa273915b97271dc755dac5b944cd95119c8","size":120507},{"path":"public/images/events-past/Constellation-June-15-2024.png","sha":"f58b8154eda7de9d0cc37cbdf74b3863ae1466df","size":194616},{"path":"public/images/events-past/Constellation-March_23_2024.png","sha":"8b6d82c6b327f0627d181175b01f9472ca24378e","size":197089},{"path":"public/images/events-past/Crawdads-8.5x11_1-GOOD-ONE.jpg","sha":"af82fd9e19b7733859b464abf016edfd9a7a035a","size":317818},{"path":"public/images/events-past/Deep-Listening-and-sound-healing-concert.jpg","sha":"1c71b9a233ee2f5c9b7a0d1980fc0d3a0d2a97aa","size":372376},{"path":"public/images/events-past/Donna-August-2025.jpg","sha":"9931b1505173b12bf9d1a052fd9a4098b609c88a","size":151161},{"path":"public/images/events-past/Donna-Sacred.jpg","sha":"243196b84ffdf6e1c3cd68c6be6bf5f1c0ef7443","size":125662},{"path":"public/images/events-past/DrGruennFamilyConstellationJanuary13-2024.png","sha":"ad3c3d9a710325a92def12d5775412c6915ca20f","size":212787},{"path":"public/images/events-past/FLOW-FINAL.jpg","sha":"9a6cd8c634b52e66da6de76bb1dd8080a158eb21","size":153711},{"path":"public/images/events-past/FOX_Revise-8.5-x-11-_4-TAGLINE-Removed.jpg","sha":"97f594d877affaffeccb17c0280fe18dfc623f04","size":214943},{"path":"public/images/events-past/Final-Tahi-Film-Premier-Flyer.jpeg","sha":"919ab5924d46ed839920af44562e724aaafd0d9f","size":424430},{"path":"public/images/events-past/Grof-Breathwork-flyer.jpg","sha":"449bda73a9958e570ca6b1caa304408f4e99a95c","size":236499},{"path":"public/images/events-past/IMG_5354.jpeg","sha":"2e2d2e02e78d7bd00e0dedec5fac489b1170db1b","size":82911},{"path":"public/images/events-past/Joss-Jaffe.jpeg","sha":"a39684df46e5fe5cdcdfddc482b82eb0cf3c18d6","size":89401},{"path":"public/images/events-past/Kalbeliya-1-30-26.jpg","sha":"eac1972d3596c0d8910f31a391fb33b8300e4893","size":231049},{"path":"public/images/events-past/Kirtin-PosterRev1-scaled.jpg","sha":"5df525c60734963d255508c9e9c8f65ceb6057bc","size":402059},{"path":"public/images/events-past/LAURA-postcard-5inx7in-v-FRONT.jpg","sha":"469e9263701043cbb9003411c3a8bdf13a0c819f","size":353243},{"path":"public/images/events-past/Leland-1-31-26.jpg","sha":"436daa2189520438141db4de6f23776d905ec8a0","size":159411},{"path":"public/images/events-past/Living-Promise.jpg","sha":"b5a77037730dda602e0d61c974a96ec75b5827b9","size":250466},{"path":"public/images/events-past/Love-Heals-Poster-plusInfo.jpg","sha":"e1ca6cc6016e4311a22b1649ca0002901d26d5ed","size":170794},{"path":"public/images/events-past/Michael-8.5-x-11-FINAL_2_cropped-pdf.jpg","sha":"0bb6ed689cc3815c97948f5e2836f9cfa6a0efa7","size":515429},{"path":"public/images/events-past/MudLotus.jpg","sha":"0edc69ad1797f6061a129f3dfac8b2921ee2ce3b","size":517496},{"path":"public/images/events-past/Oh-My-Word-poster.jpeg","sha":"f5dc34264e42ba415bf41bb23b878f8ea5e66e27","size":303353},{"path":"public/images/events-past/Ojai-Community-event.jpg","sha":"8740ec20e9b1eaa79b4923a8bcd9878594871fef","size":146466},{"path":"public/images/events-past/PATH-TO-LOVE.jpg","sha":"06fa5b101d51ef658d1e890f38d23a5ceb80e0d5","size":162357},{"path":"public/images/events-past/Paranadyn.jpg","sha":"3d5a0a44a38cacbaf3f061912d211fc4dfd92d30","size":270386},{"path":"public/images/events-past/REMATRIATION.jpeg","sha":"e635bd3ce3b58a64b84a5715ed5715b2d57bbbae","size":172294},{"path":"public/images/events-past/Rug-Ad.jpg","sha":"01a44c15b01c344e38202d5de6c85acdc222c0fc","size":355983},{"path":"public/images/events-past/SOUL-MOTION.png","sha":"ba310e6ad1a19be342131b3ddbd5e0edda2c64cb","size":255723},{"path":"public/images/events-past/Sat-Nam-Rasayan.jpg","sha":"46e8f19a30e92374ae1a9c9fa4fbf12299ef1339","size":139423},{"path":"public/images/events-past/Soul-Motion-Poster.jpg","sha":"71b1440cc2ceafc12c0e2ba19125e156b20bdebb","size":207684},{"path":"public/images/events-past/St-Nam-Rasayan_2025.jpg","sha":"b8b171b29a0f7892a2f27125ae815cf703451571","size":240878},{"path":"public/images/events-past/Tahi-1000082920.jpg","sha":"b478ad9499b8ed9ef42bcafdc644ea4c0c98180b","size":135215},{"path":"public/images/events-past/Tahi-screening-Ojai-12-8-23.jpg","sha":"f619ee7925cb0e270e5f910fdcb349c14766632e","size":458251},{"path":"public/images/events-past/Valentine-donation.jpg","sha":"f8a7791edb36b646a4bf864fd7de5b7f19c96e96","size":98953},{"path":"public/images/events-past/Viz-Med-Small_2_cropped-scaled.jpg","sha":"def94451aa26b5ebbc06f03612d31907a269ef50","size":800984},{"path":"public/images/events-past/WORLD-WITHOUT-COWS.jpg","sha":"dae6ae87bd191557e1e8727e5a143143646c8896","size":98256},{"path":"public/images/events-past/kiora-fox_C-No-Ph-1-Feb-Mar-2022-dates-150px.jpg","sha":"675857231527207b38b2f4b74e0aead991034541","size":251133},{"path":"public/images/events-past/sane-living-logo.png","sha":"a8e9a256569a0c6609bd7a74318d8288af40257b","size":23885},{"path":"public/images/events-past/unnamed-5.jpg","sha":"a0a84515f5244d3db7947bebd121f52266264f4d","size":140001},{"path":"public/images/evo3-algo.png","sha":"f426404d50d9c2d2c3feb5746e64b4aaf38ae906","size":21775},{"path":"public/images/evo3-bg.jpeg","sha":"c606e84d9e7672e5f5faecfde56e65b995d8de35","size":552741},{"path":"public/images/evo3-bio.png","sha":"0c56bfe559ac20ed795abf239320db03528631fd","size":26559},{"path":"public/images/evo3-ego.png","sha":"637be08a562e098c4400f34f942f19fa6a99a1a0","size":25573},{"path":"public/images/evo3-logo.png","sha":"8a9c1719416d718d19e8e2dc2858573c4c2febde","size":43669},{"path":"public/images/evo3-sculpture.jpg","sha":"f9aea144e9ebe4bc7487ecf87ad7aff24cb9223f","size":773225},{"path":"public/images/evo3-title.png","sha":"8a9c1719416d718d19e8e2dc2858573c4c2febde","size":43669},{"path":"public/images/hero-center.jpg","sha":"35bf255324dd34d791499a744be302d12dcb08b4","size":352067},{"path":"public/images/homepage-hero.jpg","sha":"f9aea144e9ebe4bc7487ecf87ad7aff24cb9223f","size":773225},{"path":"public/images/lifestyle-hero.png","sha":"32b0b092d97b4c45f6e96d4e4d5ecd20aec5dccd","size":38354},{"path":"public/images/lifestyle-speeds.png","sha":"09d0323947f20c95b611b88c81fb8376f1ed32bf","size":30320},{"path":"public/images/lifestyle-stories.png","sha":"c6735249d45de07c1e2b8ebd736653a9bec1fc54","size":29740},{"path":"public/images/lifestyle-video.svg","sha":"f84cf991f7a0b7a87a17ff2e979f6fa26cf376a5","size":1296},{"path":"public/images/lifestyle-we-dna.png","sha":"ce1668da127d70015e017239f055ff8015039ba9","size":32808},{"path":"public/images/logo.png","sha":"a8e9a256569a0c6609bd7a74318d8288af40257b","size":23885},{"path":"public/images/pov-attenborough.jpeg","sha":"5d621b9f654ba2f55f03e704679de6ff09639003","size":59678},{"path":"public/images/pov-elon-musk.jpg","sha":"45e6958665d76582a668426d86ba28fa3877029c","size":368572},{"path":"public/images/pov-evo3.jpg","sha":"01acdd1d2f807dcf5cb4931a89bc086059e040af","size":625087},{"path":"public/images/pov-harari.jpg","sha":"585179935d882775ae1407b6f6b130226ed40578","size":84055},{"path":"public/images/pov-ocean.jpg","sha":"adde6aef7b360fc753ae5104449d01154077da39","size":439705},{"path":"public/images/pov-play-button.svg","sha":"4bc5544a0b0d6ac3b7ea3c112f609d1d9364a095","size":1957},{"path":"public/images/pov-sam-harris.jpg","sha":"4186af939b46982228f7c540581e8de9739da123","size":384714},{"path":"public/images/pov-ted-talks.jpg","sha":"1aabc4e6a88ef9079dd44ddc79932fe6ac6eefc7","size":28672},{"path":"public/images/pov-zach-bush.jpg","sha":"ad60b251e16b0b11e989aa7d72e18431373262ea","size":343375},{"path":"public/images/rent-center.jpg","sha":"01a181b800ef2da1cbfc8c4ea053d01a855d309f","size":553913},{"path":"public/images/self-heal-hero.png","sha":"0f53611e8e797387819bb489a3d061251b1cd63c","size":64214},{"path":"public/rent-farm-hero-v4.mp4","sha":"67701d9b2edffd693c5bafb058a569f3f1f3d5d8","size":13832986},{"path":"public/rent-farm-hero-v6.mp4","sha":"67701d9b2edffd693c5bafb058a569f3f1f3d5d8","size":13832986}];
var BY_PATH = {};
MANIFEST.forEach(function (e) { BY_PATH[e.path] = e; });
// One tiny file is embedded: assets/ is not served by the old deployment.
// (Unreferenced by site code; included so the migration is complete.)
var EMBEDDED = { 'assets/sculpture-qr.png': { sha: '3218a88b0de52a6ca813a41fffd14f9ff1987c85', data: 'iVBORw0KGgoAAAANSUhEUgAAAzQAAAM0AQAAAABFCVraAAADQElEQVR42u3dTW7jMAwGUGEuoPvf0jdwi7aIfki5XcwUkOZpESRN4rfIoh9oiir3r6yrcDgcDofD4XA4HA6Hw+FwOBwOh8PhcDgcDofD+R+cMq/6eqO+3q2f3/pcH8++XtaHC7x/5E/5ncXhcDgcDucvrD4f1D469FlgyAfLq+QXkA84HA6Hw9k9H/QxYMgHrWrQSgftGw8XkA84HA6HwzkuH6TVgLFqMHxDPuBwOBwO5/R8kH/4Kml7hHzA4XA4HM6Z+SDrP2hlgtaQGFoTq/4DDofD4XCOzAfTGv7v/+ghXkA+4HA4HA5n63zwcMugVRLaQ7bxcb2P0u/D4XA4HM6++aD9bSoihFRQHz8sH3A4HA6Hc0Q++Hq53NDYT1UqfZPilXxNfyKHw+FwOOfUD7LdCFPp4AcDE6eX8gGHw+FwOPvWD6aBSHe+GyH+8w+lA/sXOBwOh8M5pn6w2K3YAkFfTsgebv0HHA6Hw+EcWD8IexWy4DDFhTtvYZQPOBwOh8M5pH4QdihkMSA2KS6HJMkHHA6Hw+GcUD8o+b6E5zFI7dl0OoN8wOFwOBzO/vngYbdieb0xPcsOabK/kcPhcDicI/JB1j4QKgQlaUwY4kI+U1E+4HA4HA5n13wwHcKwqB+EM5uy3oXi/gKHw+FwOCfkg2X7QHu5DARhbMKlfsDhcDgczjH5oM8CsRcxu/sQ9yqM0UA+4HA4HA7nkHxwjS0FJbQmTic2ZKMT1Q84HA6Hw9k/Hzwc7bwcfbAYguD+AofD4XA4x+SDp9aDrGoQhi1eeTlBPuBwOBwOZ9d8kPcfxK2N/cpmJqkfcDgcDodzUv3g6SbDsrmgTwX2N3I4HA6Hc1z9oKyKA9lcxGEwwsPoRPmAw+FwOJyt80ENpYOwZfEKuxvyiYtDTUE+4HA4HA5n63wwVQOyaQYhAVzfXVk+4HA4HA7npHwQZiLE6kJ/lelgBvUDDofD4XDOzAdDrSCMQ5jOZ6r5rQr5gMPhcDicrfNBXiGoydSDOznz+V42MPh9OBwOh8PZNB9Mq64KC9OzkkxkVj/gcDgcDueIfPAv18XhcDgcDofD4XA4HA6Hw+FwOBwOh8PhcDgcDudc5w3FI8MsEAOxsgAAAABJRU5ErkJggg==' } };

function ghHeaders() {
  return {
    'Authorization': 'Bearer ' + process.env.CMS_GITHUB_TOKEN,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sane-living-media-import',
    'Content-Type': 'application/json',
  };
}
async function gh(path, method, bodyObj) {
  return fetch('https://api.github.com/repos/' + REPO + path, {
    method: method || 'GET',
    headers: ghHeaders(),
    body: bodyObj ? JSON.stringify(bodyObj) : undefined,
  });
}
function gitBlobSha(buf) {
  var head = Buffer.from('blob ' + buf.length + '\0', 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([head, buf])).digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!lib.requireLogin(req, res)) return;
  if (!process.env.CMS_GITHUB_TOKEN) {
    return res.status(503).json({ error: 'CMS_GITHUB_TOKEN is not configured in this project.' });
  }
  var body = lib.readJsonBody(req);

  try {
    if (body.action === 'blob') {
      var entry = BY_PATH[String(body.path || '')];
      var embedded = EMBEDDED[String(body.path || '')];
      if (!entry && !embedded) return res.status(400).json({ error: 'Path is not in the migration manifest.' });
      var expected = entry ? entry.sha : embedded.sha;
      if (String(body.sha || '') !== expected) return res.status(400).json({ error: 'SHA mismatch with manifest.' });
      var buf;
      if (embedded) {
        buf = Buffer.from(embedded.data, 'base64');
      } else {
        var src = SOURCE_BASE + entry.path.replace(/^public\//, '');
        var fResp = await fetch(src);
        if (!fResp.ok) return res.status(502).json({ error: 'Source fetch failed (' + fResp.status + ') for ' + entry.path });
        buf = Buffer.from(await fResp.arrayBuffer());
      }
      var actual = gitBlobSha(buf);
      if (actual !== expected) {
        return res.status(502).json({ error: 'Integrity check failed for ' + (entry ? entry.path : body.path) + ' — bytes do not match the expected SHA. Not imported.' });
      }
      var bResp = await gh('/git/blobs', 'POST', { content: buf.toString('base64'), encoding: 'base64' });
      if (!bResp.ok) {
        var bErr = await bResp.text();
        return res.status(502).json({ error: 'GitHub refused the file upload.', detail: bErr.slice(0, 300) });
      }
      var blob = await bResp.json();
      if (blob.sha !== expected) return res.status(502).json({ error: 'GitHub stored a different blob SHA than expected for ' + body.path });
      return res.status(200).json({ ok: true, path: body.path, sha: blob.sha, size: buf.length });
    }

    if (body.action === 'commit') {
      var entries = Array.isArray(body.entries) ? body.entries : [];
      if (!entries.length) return res.status(400).json({ error: 'No files to commit.' });
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var m = BY_PATH[e.path] || (EMBEDDED[e.path] ? { sha: EMBEDDED[e.path].sha } : null);
        if (!m || m.sha !== e.sha) return res.status(400).json({ error: 'Entry not in manifest or SHA mismatch: ' + e.path });
      }
      var refResp = await gh('/git/ref/heads/' + BRANCH);
      if (!refResp.ok) return res.status(502).json({ error: 'Could not read the main branch.' });
      var ref = await refResp.json();
      var headSha = ref.object.sha;
      var cResp = await gh('/git/commits/' + headSha);
      var headCommit = await cResp.json();
      var tResp = await gh('/git/trees', 'POST', {
        base_tree: headCommit.tree.sha,
        tree: entries.map(function (x) { return { path: x.path, mode: '100644', type: 'blob', sha: x.sha }; }),
      });
      if (!tResp.ok) { var tErr = await tResp.text(); return res.status(502).json({ error: 'Could not create the file tree.', detail: tErr.slice(0, 300) }); }
      var tree = await tResp.json();
      var nResp = await gh('/git/commits', 'POST', {
        message: 'Media migration: import ' + entries.length + ' photos/videos from the original site (SHA-verified)',
        tree: tree.sha,
        parents: [headSha],
      });
      if (!nResp.ok) { var nErr = await nResp.text(); return res.status(502).json({ error: 'Could not create the commit.', detail: nErr.slice(0, 300) }); }
      var newCommit = await nResp.json();
      var uResp = await gh('/git/refs/heads/' + BRANCH, 'PATCH', { sha: newCommit.sha });
      if (!uResp.ok) { var uErr = await uResp.text(); return res.status(502).json({ error: 'Could not update main.', detail: uErr.slice(0, 300) }); }
      return res.status(200).json({ ok: true, commit: newCommit.sha, count: entries.length });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  } catch (err) {
    console.error('import-media error:', err);
    return res.status(500).json({ error: 'Import step failed unexpectedly: ' + err.message });
  }
};
