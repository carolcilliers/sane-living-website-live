const assert = require("node:assert/strict"),
  fs = require("node:fs");
const core = require("../content-core/about.cjs"),
  content = require("../public/content-model"),
  renderer = require("../content-renderer/about.cjs");
let n = 0;
const id = () => `10000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const source =
  "---\ntitle: About\ncustomMetadata: preserved\nsections:\n  - heading: Founder — Test\n    body: Original **story**\n    customField: keep me\n  - heading: Hidden\n    body: Keep hidden\n    visible: false\n---\n\n## Additional story\nOriginal suffix\n";
const m = core.fromSource(source, id);
assert.deepEqual(core.check(m), []);
const founderId = m.metadata.sections[0].id;
m.metadata.sections[0].heading = "A different heading";
const roundtrip = core.importDraft(core.exportDraft(m, "a".repeat(40))).model;
assert.equal(roundtrip.metadata.customMetadata, "preserved");
assert.equal(roundtrip.metadata.sections[0].customField, "keep me");
assert.equal(roundtrip.metadata.sections[0].id, founderId);
assert.equal(roundtrip.body, "\n## Additional story\nOriginal suffix\n");
const duplicated = structuredClone(roundtrip.metadata.sections[0]);
duplicated.heading = "Founder copy";
duplicated.editorRole = "none";
assert.doesNotMatch(
  renderer.sections(
    { metadata: { sections: [duplicated] }, body: "" },
    "<p>Philosophy attachment</p>",
  ),
  /Philosophy attachment/,
);
const html = renderer.sections(roundtrip, "<p>Philosophy attachment</p>");
assert.match(html, /Philosophy attachment/);
assert.doesNotMatch(html, /Keep hidden/);
assert.match(html, /<strong>story<\/strong>/);
let bad = structuredClone(m);
bad.metadata.sections[1].id = founderId;
assert(core.check(bad).some((e) => /unique/.test(e)));
bad = structuredClone(m);
bad.metadata.sections[0].layout = "arbitrary";
assert(core.check(bad).some((e) => /layout/.test(e)));
bad = structuredClone(m);
bad.metadata.sections[0].linkUrl = "javascript:alert(1)";
assert(core.check(bad).some((e) => /link/.test(e)));
assert.doesNotMatch(renderer.sections(bad, ""), /href="javascript:/);
bad = structuredClone(m);
bad.metadata.sections[0].body = "<script>alert(1)</script>";
assert.doesNotMatch(renderer.sections(bad, ""), /<script>/);
const exported = core.exportDraft(m, "a".repeat(40));
exported.page.nodes[0].bindings.headline.key = "constructor";
assert.throws(() => core.importDraft(exported), /binding/);
const future = core.exportDraft(m, "a".repeat(40));
future.schemaVersion = 2;
assert.throws(() => core.importDraft(future), /exported/);
const incomplete = structuredClone(m);
incomplete.metadata.title = "";
incomplete.metadata.sections[0].heading = "";
assert.doesNotThrow(() =>
  core.importDraft(core.exportDraft(incomplete, "a".repeat(40))),
);
const template = fs.readFileSync("public/about.html", "utf8"),
  p =
    /<!-- philosophy:start -->([\s\S]*?)<!-- philosophy:end -->/.exec(
      template,
    )?.[1] || "";
const plain = content.parseAbout(
  fs.readFileSync("public/content/about.md", "utf8"),
);
const rendered = renderer.documentHtml(template, plain, p, false);
assert.match(rendered, /about-managed:start/);
assert.doesNotMatch(renderer.sections(plain, p), /data-editor-id/);
console.log(
  "PASS About adapter preservation, stable IDs, hidden content, founder attachment, binding/version/URL/layout rejection and shared renderer",
);
