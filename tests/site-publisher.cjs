const assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  fs = require("node:fs"),
  path = require("node:path");
const create = require("./qa-server.cjs");
const { execFileSync } = require("node:child_process");
(async () => {
  const s = await create();
  try {
    const call = async (body, auth = true) => {
      const r = await fetch(s.url + "/api/studio", {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          ...(auth ? { Cookie: s.cookie } : {}),
        },
        body: body && JSON.stringify(body),
      });
      return { status: r.status, data: await r.json() };
    };
    assert.equal((await call(undefined, false)).status, 401);
    let { data } = await call();
    assert.equal(data.project.pages.length, 25);
    const project = structuredClone(data.project),
      home = project.pages.find((p) => p.id === "home"),
      core = require("../content-core/site.cjs");
    home.blocks.push(core.block("heading", crypto.randomUUID()));
    home.blocks.at(-1).props.text = "A test-only publication";
    home.active = true;
    const video=core.block("video","publication-video");home.blocks.push(video);
    const wedding=project.pages.find(p=>p.route==="/rent/weddings/");wedding.active=true;
    const details=core.describe(core.registryFor(wedding,data.registry),data.resources).blocks.find(b=>b.elements.some(e=>e.id==="policy-cateringPolicy"));
    wedding.blocks.find(b=>b.source===details.id).elements={"policy-cateringPolicy":{responsive:{desktop:{background:"#f0e8fa",borderWidth:2,shadow:"medium"}}}};

    const body = {
      version: 2,
      expectedHead: data.head,
      releaseId: crypto.randomUUID(),
      project,
      about: data.resources.about,
      assets: [],
    };
    const invalid = structuredClone(body);
    invalid.project.pages[0].blocks.push({
      id: "unsafe",
      type: "script",
      props: { html: "<script>alert(1)</script>" },
    });
    assert.equal((await call(invalid)).status, 400);
    assert.equal(s.commits, 0);
    const invalidSettings = structuredClone(body);
    invalidSettings.settings = JSON.stringify({
      ...JSON.parse(data.resources.settings),
      homeVideoUrl: "javascript:alert(1)",
    });
    assert.equal((await call(invalidSettings)).status, 400);
    assert.equal(s.commits, 0);
    s.loseRefResponse = true;
    const result = await call(body);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(
      s.commits,
      1,
      "one atomic commit even when the ref response is lost",
    );
    assert.equal(result.data.commit, s.head);
    assert.match(
      fs.readFileSync(path.join(s.root, "public/index.html"), "utf8"),
      /A test-only publication/,
    );
    assert.match(
      fs.readFileSync(path.join(s.root, "public/index.html"), "utf8"),
      new RegExp("sane-release.*" + body.releaseId),
    );
    const publishedWedding=fs.readFileSync(path.join(s.root,"public/rent-weddings.html"),"utf8");
    assert.match(publishedWedding,/background-color:#f0e8fa/);assert.match(publishedWedding,/studio-managed-parts/);
    assert(!publishedWedding.includes('data-studio-element='));
    assert.match(fs.readFileSync(path.join(s.root,"public/index.html"),"utf8"),/<video controls/);
    // Rebuilding the published snapshot twice must be stable for active and untouched pages.
    const outputs = require("../content/page-templates.json").map(
      (p) => p.output,
    );
    const before = new Map(
      outputs.map((p) => [p, fs.readFileSync(path.join(s.root, p), "utf8")]),
    );
    execFileSync(process.execPath, [
      path.join(s.root, "scripts/build-pages.cjs"),
    ]);
    execFileSync(process.execPath, [
      path.join(s.root, "scripts/build-content.cjs"),
    ]);
    for (const p of outputs)
      assert.equal(
        fs.readFileSync(path.join(s.root, p), "utf8"),
        before.get(p),
        "repeatable output " + p,
      );
    const resumed = (await call()).data;
    assert.equal(
      resumed.lastRelease.commit,
      result.data.commit,
      "release identity survives refresh",
    );
    const retry = await call(body);
    assert.equal(retry.status, 200);
    assert.equal(retry.data.commit, result.data.commit);
    assert.equal(s.commits, 1, "idempotent retry does not republish");
    assert.equal(
      (await call({ ...body, releaseId: crypto.randomUUID() })).status,
      409,
    );
    const updated = (await call()).data,
      newProject = structuredClone(updated.project);
    const generic = {
      id: "custom--team-retreat",
      name: "Team retreat",
      route: "/team-retreat/",
      slug: "team-retreat",
      menu: true,
      active: true,
      blocks: core
        .describe({
          id: "custom--team-retreat",
          name: "Team retreat",
          route: "/team-retreat/",
          html: core.generic("Team retreat"),
        })
        .blocks.map((b) => ({
          id: b.id,
          type: b.type,
          source: b.id,
          label: b.label,
          edits: {},
        })),
    };
    generic.blocks.push(core.block("text", crypto.randomUUID()));
    newProject.pages.push(generic);
    let next = {
      version: 2,
      expectedHead: updated.head,
      releaseId: crypto.randomUUID(),
      project: newProject,
      about: updated.resources.about,
      assets: [],
    };
    let published = await call(next);
    assert.equal(published.status, 200, JSON.stringify(published.data));
    assert.equal(s.commits, 2);
    const route = await fetch(s.url + "/team-retreat/");
    assert.equal(route.status, 200);
    assert.match(await route.text(), /Team retreat/);
    const config = JSON.parse(s.records.get("vercel.json").content);
    assert(
      config.rewrites.some(
        (r) =>
          r.source === "/team-retreat/" &&
          r.destination === "/site-pages/team-retreat.html",
      ),
    );
    data = (await call()).data;
    next = {
      version: 2,
      expectedHead: data.head,
      releaseId: crypto.randomUUID(),
      project: data.project,
      about: data.resources.about,
      assets: [],
    };
    s.conflictBeforeRef = true;
    const conflict = await call(next);
    assert.equal(
      conflict.status,
      409,
      "concurrent main update blocks a non-force ref advance",
    );
    assert.equal(s.commits, 3, "only the concurrent writer committed");
    assert.equal(
      [...s.records.keys()].filter((p) => p.startsWith("dashboard-drafts/"))
        .length,
      0,
      "new editor creates no public drafts",
    );
    console.log(
      "PASS authenticated bootstrap, all 25 pages, unsafe schema rejection, atomic publication, lost-response recovery, idempotency, new-page routes and concurrent-head protection",
    );
  } finally {
    await s.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
