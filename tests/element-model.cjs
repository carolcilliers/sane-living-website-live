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
  .find(({ e }) => e.tag === "img" && /conference room/i.test(e.label));
assert(room, "current homepage exposes a conference-room image for gallery editing");
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

const design=core.design;
assert.match(design.css({columns:2}),/display:grid/);
assert.match(design.css({direction:'row'}),/display:flex/);
assert.match(design.css({shadow:'custom',shadowColor:'#123456',shadowX:4,shadowY:6,shadowBlur:20,shadowSpread:2,shadowOpacity:30}),/4px 6px 20px 2px rgba\(18,52,86,0.3\)/);
assert.deepEqual(design.validate({background:'transparent',borderStyle:'dashed',paddingLeft:16,letterSpacing:5}),[]);
assert(design.validate({shadowBlur:151}).length);
assert(design.validate({borderStyle:'url(javascript:1)'}).length);
const extended=core.createProject(registry), extendedHome=extended.pages.find(p=>p.id==='home');extendedHome.active=true;
for(const type of ['video','list','quote','details','card','badge'])extendedHome.blocks.push(core.block(type,'insert-'+type));
assert.deepEqual(core.validate(extended,registry,resources),[]);
const extendedHTML=core.renderPage(extendedHome,extended,registry,resources);
for(const marker of ['<video controls','studio-list','studio-quote','studio-details','studio-content-card','studio-badge'])assert(extendedHTML.includes(marker),'render '+marker);
const wedding=extended.pages.find(p=>p.route==='/rent/weddings/');wedding.active=true;
const weddingDescription=core.describe(core.registryFor(wedding,registry),resources);
const policyOwner=weddingDescription.blocks.find(b=>b.elements.some(e=>e.id==='policy-cateringPolicy'));
assert(policyOwner.elements.find(e=>e.id==='policy-cateringPolicy').managed);
wedding.blocks.find(b=>b.source===policyOwner.id).elements={'policy-cateringPolicy':{responsive:{desktop:{background:'#f0e8fa',shadow:'medium',borderWidth:2}}}};
assert.deepEqual(core.validate(extended,registry,resources),[]);
const weddingHTML=core.renderPage(wedding,extended,registry,resources);
assert.match(weddingHTML,/studio-managed-parts/);assert.match(weddingHTML,/background-color:#f0e8fa/);
assert(!weddingHTML.includes('data-studio-element='));
console.log('PASS six new typed inserts, automatic grid/flex, bounded custom shadows and publishable managed policy styles');

const cardDescriptor=description.blocks.find(b=>b.elements.some(e=>e.dragOwner));
const cardImage=cardDescriptor.elements.find(e=>e.dragOwner&&e.tag==='img');
const cardRoot=cardDescriptor.elements.find(e=>e.id===cardImage.dragOwner);
assert.equal(core.cardLayout.owner(cardDescriptor,cardImage.id),cardRoot.id);
const originalAltField=cardDescriptor.fields.find(f=>f.id==='f7');
assert.equal(originalAltField.element,cardImage.id,'existing field IDs still target the original source image');
assert.equal(originalAltField.attribute,'alt');
assert.equal(originalAltField.value,cardImage.label,'field text follows the current source image description');
assert.equal(cardDescriptor.fields.filter(f=>f.kind==='text'&&f.label.startsWith('H3 ·')).length,3,'all three redesigned source cards expose their actual heading fields');
const damaged={[cardImage.id]:{parent:cardRoot.parent,order:0,x:20,gallery:['/images/hero-center.jpg'],responsive:{desktop:{width:60,color:'#123456'},phone:{y:30,shadow:'soft'}}},[cardRoot.id]:{order:2,responsive:{desktop:{height:300,borderColor:'#123456'}}},untouched:{x:90}};
const repaired=core.cardLayout.restore(cardDescriptor,damaged);
assert.equal(repaired[cardImage.id].parent,undefined);assert.equal(repaired[cardImage.id].x,undefined);assert.deepEqual(repaired[cardImage.id].responsive.desktop,{color:'#123456'});assert.deepEqual(repaired[cardImage.id].responsive.phone,{shadow:'soft'});assert.deepEqual(repaired[cardImage.id].gallery,damaged[cardImage.id].gallery);assert.equal(repaired[cardRoot.id].order,undefined);assert.deepEqual(repaired.untouched,{x:90});assert.equal(damaged[cardImage.id].parent,cardRoot.parent,'repair never mutates Undo history');
console.log('PASS stable card ownership/caption IDs and immutable frame restoration retaining content, appearance and unrelated elements');

const detachedRepair=core.cardLayout.repairDetached(cardDescriptor,damaged);assert.equal(detachedRepair.count,1);assert.deepEqual(detachedRepair.values,repaired);assert.equal(core.cardLayout.repairDetached(cardDescriptor,repaired).count,0,'automatic recovery is idempotent');assert.equal(damaged[cardImage.id].parent,cardRoot.parent);console.log('PASS detached-card recovery detection preserves original data and becomes a no-op after repair');
