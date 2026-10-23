"use strict";
const crypto = require("node:crypto"),
  repo = require("../_contentlib"),
  core = require("../../content-core/site.cjs"),
  registry = require("../../content/page-templates.json"),
  content = require("../../public/content-model"),
  settings = require("../../public/site-config");
const LAYOUT = "content/site-layouts.json";
function error(message, status = 400) {
  const e = Error(message);
  e.status = status;
  throw e;
}
async function gh(path, options) {
  const r = await repo.gh(path, options);
  if (!r.ok) {
    let message = "";
    try {
      message = (await r.json()).message || "";
    } catch {}
    error(
      "GitHub " +
        (options?.method || "GET") +
        " refused (" +
        r.status +
        "): " +
        message,
      r.status === 409 || r.status === 422 ? 409 : 502,
    );
  }
  return r.json();
}
async function head() {
  return (await gh("/git/ref/heads/main")).object.sha;
}
async function read(path, ref) {
  const r = await repo.gh(
    "/contents/" + path + "?ref=" + encodeURIComponent(ref),
  );
  if (r.status === 404) return null;
  if (!r.ok)
    error(
      "Could not load the website source from GitHub (" + r.status + ").",
      502,
    );
  const d = await r.json();
  if (d.encoding !== "base64" || typeof d.content !== "string")
    error("A source file exceeds the editable size.", 413);
  return {
    content: Buffer.from(d.content.replace(/\s/g, ""), "base64").toString(
      "utf8",
    ),
    sha: d.sha,
  };
}
async function bootstrap() {
  const ref = await head(),
    keys = Object.keys(repo.FILES),
    files = await Promise.all([
      read(LAYOUT, ref),
      ...keys.map((k) => read(repo.FILES[k], ref)),
    ]);
  const templateFile = await read("content/page-templates.json", ref);
  if (
    !templateFile ||
    JSON.stringify(JSON.parse(templateFile.content)) !==
      JSON.stringify(registry)
  )
    error(
      "The deployed editor is older than the current website templates. Wait for the latest deployment before editing.",
      503,
    );
  const resources = {},
    versions = {};
  keys.forEach((k, i) => {
    if (!files[i + 1])
      error("The " + k + " source is missing; editing is blocked.", 503);
    resources[k] = files[i + 1].content;
    versions[k] = files[i + 1].sha;
  });
  try {
    for (const key of [
      "settings",
      "gallery",
      "pricing",
      "partners",
      "weddings",
    ]) {
      const value = JSON.parse(resources[key]);
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw Error(key + " must be an object");
      const list = { gallery: "photos", pricing: "rows", partners: "partners" }[
        key
      ];
      if (
        list &&
        (!Array.isArray(value[list]) ||
          value[list].some(
            (x) => !x || typeof x !== "object" || Array.isArray(x),
          ))
      )
        throw Error(key + " has an invalid list");
      if (key === "settings") {
        const problems = settings.validate(settings.normalize(value));
        if (problems.length) throw Error(problems.join(" "));
      }
    }
    const problems = content.validateAbout(content.parseAbout(resources.about));
    if (problems.length) throw Error(problems.join(" "));
  } catch (e) {
    error("Published content needs repair before editing: " + e.message, 503);
  }
  let project = core.createProject(registry);
  if (files[0]) {
    try {
      project = JSON.parse(files[0].content);
    } catch {
      error("The published website layout is unreadable.", 503);
    }
  }
  const errors = core.validate(project, registry, resources);
  if (errors.length)
    error("The published design needs repair: " + errors.join(" "), 503);
  const commit = await gh("/git/commits/" + ref),
    tree = await gh("/git/trees/" + commit.tree.sha + "?recursive=1");
  if (tree.truncated)
    error("The source tree is too large for a safe editor load.", 503);
  for (const entry of registry) {
    if (
      !project.pages.find((p) => p.id === entry.id)?.active &&
      tree.tree.find((p) => p.path === entry.output)?.sha !== entry.sourceSha
    )
      error(
        "The " +
          entry.name +
          " source changed outside the editor. Refresh its registered template before editing; existing drafts are retained.",
        503,
      );
  }

  let legacyAboutDraft = null;
  const legacy = await read(repo.draftPath("about"), ref);
  if (legacy) {
    try {
      const value = JSON.parse(legacy.content);
      if (typeof value.content === "string")
        legacyAboutDraft = { ...value, sha: legacy.sha };
    } catch {}
  }
  let lastRelease = null;
  if (project.lastReleaseId) {
    const record = await read(
      "content/releases/" + project.lastReleaseId + ".json",
      ref,
    );
    if (record) {
      const commits = await gh(
        "/commits?path=" +
          encodeURIComponent(
            "content/releases/" + project.lastReleaseId + ".json",
          ) +
          "&sha=" +
          ref +
          "&per_page=1",
      );
      lastRelease = {
        id: project.lastReleaseId,
        commit: commits[0]?.sha || ref,
        state: "Commit accepted · checking live deployment",
      };
    }
  }
  const result = {
    version: 2,
    lastRelease,
    head: ref,
    project,
    resources,
    versions,
    layoutSha: files[0]?.sha || null,
    registry,
    media: tree.tree.filter(e=>e.type==='blob' && /^public\/.+\.(png|jpe?g|webp|gif|avif|svg)$/i.test(e.path) && !/^public\/(dash|vendor)\//i.test(e.path)).map(e=>({url:e.path.slice(6).split("/").map(part=>encodeURIComponent(part).replace(/[!'()*]/g,c=>"%"+c.charCodeAt(0).toString(16))).join("/"),sha:e.sha})),
    legacyAboutDraft,
    storage: "browser-private",
  };
  Object.defineProperty(result, "sourceTree", {
    value: new Map(tree.tree.map((e) => [e.path, e.sha])),
  });
  return result;
}
function sha(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
function assetFiles(assets, project, resources) {
  if (!Array.isArray(assets) || assets.length > 12)
    error("Use at most 12 staged images per release.");
  let total = 0;
  const names = new Set();
  const used =
    JSON.stringify(project) +
    "\n" +
    resources.about +
    "\n" +
    resources.settings;
  return assets
    .filter((a) => used.includes(a?.url))
    .map((a) => {
      if (
        !a ||
        typeof a.url !== "string" ||
        !/^\/images\/studio-[a-f0-9-]{36}\.(png|jpg|jpeg|webp|gif)$/.test(
          a.url,
        ) ||
        names.has(a.url) ||
        typeof a.base64 !== "string" ||
        !/^[a-zA-Z0-9+/]+={0,2}$/.test(a.base64) ||
        a.base64.length % 4
      )
        error("Invalid staged image.");
      names.add(a.url);
      const b = Buffer.from(a.base64, "base64");
      total += b.length;
      if (!b.length || b.length > 1024 * 1024 || total > 2 * 1024 * 1024)
        error("Use images up to 1 MB each and 2 MB total per release.", 413);
      const ext = a.url.split(".").pop(),
        ok =
          ext === "png"
            ? b
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : ext === "gif"
              ? /^GIF8[79]a$/.test(b.subarray(0, 6).toString())
              : ext === "webp"
                ? b.subarray(0, 4).toString() === "RIFF" &&
                  b.subarray(8, 12).toString() === "WEBP"
                : b[0] === 255 && b[1] === 216 && b[2] === 255;
      if (!ok) error("An image does not match its file type.");
      return { path: "public" + a.url, base64: a.base64 };
    });
}
async function publish(body) {
  if (repo.BRANCH !== "main")
    error("Website publication is restricted to main.", 503);
  if (
    !body ||
    body.version !== 2 ||
    typeof body.expectedHead !== "string" ||
    !/^[a-f0-9]{40}$/.test(body.expectedHead) ||
    typeof body.releaseId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(body.releaseId)
  )
    error("Reload the editor before publishing.");
  if (
    Object.keys(body).some(
      (k) =>
        ![
          "version",
          "expectedHead",
          "releaseId",
          "project",
          "about",
          "settings",
          "assets",
        ].includes(k),
    )
  )
    error("Unknown publication fields.");
  if (Buffer.byteLength(JSON.stringify(body)) > 3500000)
    error("The publication exceeds 3.5 MB. Use fewer/smaller images.", 413);
  // The immutable release ID/body hash makes a retried or lost-response publication safe.
  const requestHash = sha(JSON.stringify(body)),
    releasePath = "content/releases/" + body.releaseId + ".json";
  let ref = await head(),
    existing = await read(releasePath, ref);
  if (existing) {
    const record = JSON.parse(existing.content);
    if (record.requestHash !== requestHash)
      error("This release ID was already used for another snapshot.", 409);
    const commits = await gh(
      "/commits?path=" +
        encodeURIComponent(releasePath) +
        "&sha=" +
        ref +
        "&per_page=1",
    );
    return {
      ok: true,
      commit: commits[0]?.sha || ref,
      releaseId: body.releaseId,
      state: "committed",
      replayed: true,
    };
  }
  if (ref !== body.expectedHead)
    error(
      "The website changed since you opened the editor. Your private draft is retained. Reload the latest published version before publishing.",
      409,
    );
  const data = await bootstrap();
  if (data.head !== ref)
    error("The website changed during validation. Retry after reloading.", 409);
  if (typeof body.about !== "string" || Buffer.byteLength(body.about) > 262144)
    error("Invalid About document.");
  let settingsText = data.resources.settings;
  if (body.settings != null) {
    if (
      typeof body.settings !== "string" ||
      Buffer.byteLength(body.settings) > 262144
    )
      error("Invalid site settings.");
    let value;
    try {
      value = JSON.parse(body.settings);
    } catch {
      error("Site settings must be valid JSON.");
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
      error("Invalid site settings.");
    const issues = settings.validate(settings.normalize(value));
    if (issues.length) error(issues.join(" "));
    settingsText = body.settings;
  }
  const resources = {
      ...data.resources,
      about: body.about,
      settings: settingsText,
    },
    errors = core.validate(body.project, registry, resources);
  try {
    errors.push(...content.validateAbout(content.parseAbout(body.about)));
  } catch (e) {
    errors.push(e.message);
  }
  if (errors.length) error([...new Set(errors)].join(" "));
  const project = JSON.parse(JSON.stringify(body.project));
  project.lastReleaseId = body.releaseId;
  // Only user-changed pages take over rendering. Existing inactive pages keep their original owner.
  for (const page of project.pages) {
    const old = data.project.pages.find((p) => p.id === page.id);
    if (
      !old ||
      JSON.stringify({ ...page, active: false }) !==
        JSON.stringify({ ...old, active: false })
    )
      page.active = true;
    if (page.id === "about" && body.about !== data.resources.about)
      page.active = true;
  }
  const assets = assetFiles(body.assets || [], project, resources);
  const entries = [];
  for (const a of assets) {
    const existingImage = data.sourceTree.get(a.path);
    if (existingImage) {
      const bytes = Buffer.from(a.base64, "base64"),
        blobHash = crypto
          .createHash("sha1")
          .update(
            Buffer.concat([Buffer.from("blob " + bytes.length + "\0"), bytes]),
          )
          .digest("hex");
      if (existingImage !== blobHash)
        error("A staged image filename is already in use.", 409);
      continue;
    }
    const blob = await gh("/git/blobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: a.base64, encoding: "base64" }),
    });
    entries.push({ path: a.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const configFile = await read("vercel.json", ref);
  if (!configFile) error("Routing configuration is missing.", 503);
  const config = JSON.parse(configFile.content);
  for (const page of project.pages.filter(
    (p) => !registry.some((r) => r.id === p.id),
  )) {
    const names = ["/" + page.slug, "/" + page.slug + "/"];
    for (const source of names) {
      const collision = config.rewrites.find((r) => r.source === source),
        redirect = config.redirects?.find((r) => r.source === source);
      const destination = "/site-pages/" + page.slug + ".html";
      if (redirect || (collision && collision.destination !== destination))
        error("That page URL already has a redirect or another owner.", 409);
      if (!collision) config.rewrites.push({ source, destination });
    }
  }
  // Preflight uses the identical renderer used by the build and private preview.
  for (const page of project.pages) {
    const html = core.renderPage(page, project, registry, resources, {
      release: body.releaseId,
    });
    if (!html.includes('id="site-nav"') || !html.includes('id="site-footer"'))
      error("The page scaffold is incomplete.");
  }
  const descriptor = {
    version: 2,
    id: body.releaseId,
    requestHash,
    parent: ref,
    createdAt: new Date().toISOString(),
    pages: project.pages
      .filter((p) => p.active)
      .map((p) => ({ id: p.id, route: p.route })),
    templateRevision: project.templateRevision,
    sourceVersions: data.versions,
    assets: assets.map((a) => a.path),
    layoutHash: sha(JSON.stringify(project)),
    aboutHash: sha(body.about),
    settingsHash: sha(settingsText),
  };
  entries.push(
    {
      path: LAYOUT,
      mode: "100644",
      type: "blob",
      content: JSON.stringify(project, null, 2) + "\n",
    },
    {
      path: releasePath,
      mode: "100644",
      type: "blob",
      content: JSON.stringify(descriptor, null, 2) + "\n",
    },
  );
  if (body.about !== data.resources.about)
    entries.push({
      path: repo.FILES.about,
      mode: "100644",
      type: "blob",
      content: body.about,
    });
  if (settingsText !== data.resources.settings)
    entries.push({
      path: repo.FILES.settings,
      mode: "100644",
      type: "blob",
      content: settingsText,
    });
  if (JSON.stringify(config) !== JSON.stringify(JSON.parse(configFile.content)))
    entries.push({
      path: "vercel.json",
      mode: "100644",
      type: "blob",
      content: JSON.stringify(config, null, 2) + "\n",
    });
  const parent = await gh("/git/commits/" + ref),
    tree = await gh("/git/trees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_tree: parent.tree.sha, tree: entries }),
    });
  const commit = await gh("/git/commits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Website editor: publish " + body.releaseId,
      tree: tree.sha,
      parents: [ref],
    }),
  });
  if ((await head()) !== ref)
    error(
      "A newer commit arrived during publication. Your draft is retained; reload before publishing.",
      409,
    );
  try {
    await gh("/git/refs/heads/main", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha: commit.sha, force: false }),
    });
  } catch (e) {
    const latest = await head();
    if (latest !== commit.sha) {
      let accepted = false;
      try {
        const comparison = await gh("/compare/" + commit.sha + "..." + latest);
        accepted = ["ahead", "identical"].includes(comparison.status);
      } catch {}
      if (!accepted) throw e;
    }
  }
  return {
    ok: true,
    commit: commit.sha,
    releaseId: body.releaseId,
    state: "committed",
    project,
  };
}
async function revision(){return {head:await head(),deployment:process.env.VERCEL_GIT_COMMIT_SHA || null};}
module.exports = { bootstrap, publish, revision, LAYOUT, sha };
