/** Developer-only capture for a currently legacy-owned page. Never writes Git itself. */
"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  core = require("../content-core/site.cjs");
const root = path.resolve(__dirname, ".."),
  file = path.join(root, "content/page-templates.json"),
  registry = JSON.parse(fs.readFileSync(file, "utf8")),
  id = process.argv[2],
  entry = registry.find((p) => p.id === id);
if (!entry)
  throw Error(
    "Pass one registered page ID, such as home or lifestyle--ai-algo.",
  );
const layoutFile = path.join(root, "content/site-layouts.json"),
  project = fs.existsSync(layoutFile)
    ? JSON.parse(fs.readFileSync(layoutFile, "utf8"))
    : null;
if (project?.pages.find((p) => p.id === id)?.active)
  throw Error(
    "This page is editor-owned. Migrate its template and field bindings together; automatic capture is intentionally blocked.",
  );
entry.html = fs.readFileSync(path.join(root, entry.output), "utf8");
entry.revision = crypto.createHash("sha256").update(entry.html).digest("hex");
const bytes = Buffer.from(entry.html);
entry.sourceSha = crypto
  .createHash("sha1")
  .update(Buffer.concat([Buffer.from("blob " + bytes.length + "\0"), bytes]))
  .digest("hex");
if (project) {
  project.templateRevision = core.templateRevision(registry);
  const page = project.pages.find((p) => p.id === id);
  page.blocks = core.createProject([entry]).pages[0].blocks;
  const errors = core.validate(project, registry, {});
  if (errors.length) throw Error(errors.join("\n"));
  fs.writeFileSync(layoutFile, JSON.stringify(project, null, 2) + "\n");
}
fs.writeFileSync(file, JSON.stringify(registry, null, 2) + "\n");
console.log(
  "Captured " +
    id +
    ". Review the source/template diff, run verification, and commit both together. Older private drafts remain recoverable but may need migration.",
);
