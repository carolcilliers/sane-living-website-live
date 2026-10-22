const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  core = require("../content-core/site.cjs"),
  registry = require("../content/page-templates.json");
const resources = Object.fromEntries(
  ["about", "settings", "gallery", "weddings", "pricing", "partners"].map(
    (k) => [
      k,
      fs.readFileSync(
        "public/content/" + k + (k === "about" ? ".md" : ".json"),
        "utf8",
      ),
    ],
  ),
);
const project = core.createProject(registry),
  home = project.pages.find((p) => p.id === "home"),
  entry = registry.find((r) => r.id === "home"),
  description = core.describe(entry, resources),
  hero = home.blocks[0],
  d = description.blocks[0];
const button = d.elements.find((e) =>
    e.bindings.some((b) => b.key === "homePrimaryLabel"),
  ),
  heading = d.elements.find((e) => e.tag === "h1");
hero.elements = {
  [button.id]: { x: 50, y: 20, width: 70, color: "#ffffff" },
  [heading.id]: { parent: button.parent, order: 0 },
};
home.active = true;
assert.deepEqual(core.validate(project, registry, resources), []);
let html = core.renderPage(home, project, registry, resources);
assert.match(html, /translate:50px 20px/);
assert.match(html, /data-studio-offset/);
assert(
  !html.includes("data-studio-element="),
  "editing annotations never leak to public HTML",
);
const bad = structuredClone(project);
bad.pages.find((p) => p.id === "home").blocks[0].elements[heading.id].parent =
  heading.id;
assert(
  core.validate(bad, registry, resources).some((x) => x.includes("itself")),
);
const css = structuredClone(project);
css.pages.find((p) => p.id === "home").blocks[0].elements[
  button.id
].background = "url(javascript:alert(1))";
assert(core.validate(css, registry, resources).length);
const nested = core.block("image", "nested-image");
nested.placement = {
  section: hero.id,
  parent: button.parent,
  before: heading.id,
};
home.blocks.push(nested);
assert.deepEqual(core.validate(project, registry, resources), []);
html = core.renderPage(home, project, registry, resources);
assert(
  html.indexOf('class="studio-block') < html.indexOf("<h1"),
  "nested block renders at its exact insertion point",
);
const room = description.blocks
  .flatMap((b) => b.elements.map((e) => ({ b, e })))
  .find(({ e }) => e.tag === "img" && e.label === "Conference Room");
const owner = home.blocks.find((b) => b.id === room.b.id);
owner.elements = { [room.e.id]: { gallery: ["/images/hero-center.jpg"] } };
html = core.renderPage(home, project, registry, resources);
assert.match(html, /data-studio-carousel/);
owner.elements[room.e.id].gallery = ["javascript:alert(1)"];
assert(core.validate(project, registry, resources).length);
console.log(
  "PASS element positioning, safe style validation, cyclic-parent rejection, nested block insertion and safe existing-image galleries",
);

const { parse } = require("parse5");
function bodyCounts(html) {
  const result = {};
  let body;
  function walk(n, f) {
    f(n);
    (n.childNodes || []).forEach((c) => walk(c, f));
  }
  walk(parse(html), (n) => {
    if (n.tagName === "body") body = n;
  });
  walk(body, (n) => {
    if (n.tagName) result[n.tagName] = (result[n.tagName] || 0) + 1;
  });
  return result;
}
const baseline = core.createProject(registry);
for (const page of baseline.pages) {
  const entry = core.registryFor(page, registry);
  assert.deepEqual(
    bodyCounts(
      core.renderPage(page, baseline, registry, resources, { draft: true }),
    ),
    bodyCounts(core.describe(entry, resources).html),
    "unmodified body structure " + page.route,
  );
}
console.log(
  "PASS body structure preserved across all 25 source pages, including void image elements",
);

const responsive=core.createProject(registry), rp=responsive.pages.find(p=>p.id==='home');rp.active=true;
rp.blocks[0].elements={[button.id]:{responsive:{desktop:{fontSize:36,width:70},phone:{fontSize:17,width:100,objectFit:'cover'}}}};
assert.deepEqual(core.validate(responsive,registry,resources),[]);
let responsiveHTML=core.renderPage(rp,responsive,registry,resources);
assert.match(responsiveHTML,/@media \(min-width:1025px\)/);assert.match(responsiveHTML,/@media \(max-width:600px\)/);
const unsafe=structuredClone(responsive);unsafe.pages.find(p=>p.id==='home').blocks[0].elements[button.id].responsive.phone.background='</style><script>alert(1)</script>';
assert(core.validate(unsafe,registry,resources).length);assert(!core.renderPage(unsafe.pages.find(p=>p.id==='home'),unsafe,registry,resources).includes('<script>alert(1)</script>'));
const row=core.block('row','layout-row'),child=core.block('text','row-child');child.placement={section:row.id,parent:'content'};rp.blocks.push(row,child);
assert.deepEqual(core.validate(responsive,registry,resources),[]);assert.match(core.renderPage(rp,responsive,registry,resources),/studio-layout-row/);
row.placement={section:row.id,parent:'content'};assert(core.validate(responsive,registry,resources).length);
console.log('PASS scoped responsive style rules, CSS/HTML injection rejection, nested rows and container-cycle rejection');
