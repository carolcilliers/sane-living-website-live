"use strict";
const { parse } = require("parse5");
const design = require("./design.cjs");
const content = require("../public/content-model.js"),
  settings = require("../public/site-config.js"),
  aboutRenderer = require("../public/about-renderer.js");
const esc = content.esc;
const TYPES = [
  "heading",
  "text",
  "image",
  "split",
  "button",
  "spacer",
  "divider",
  "callout",
  "gallery",
  "events",
  "pricing",
  "partners",
  "booking",
  "newsletter",
  "slideshow",
  "video",
  "list",
  "quote",
  "details",
  "card",
  "badge",
  "row",
  "column",
];
const BASE = [
  "id",
  "type",
  "source",
  "label",
  "hidden",
  "theme",
  "align",
  "spacing",
  "props",
  "edits",
  "elements",
  "placement",
  "design",
  "responsive",
];
const PROPS = {
  video: ["src", "poster", "caption"],
  list: ["items", "style"],
  quote: ["text", "citation"],
  details: ["summary", "text"],
  card: ["heading", "text", "src", "alt", "buttonText", "url"],
  badge: ["text"],
  row: [],
  column: [],
  heading: ["text", "level"],
  text: ["text"],
  image: ["src", "alt", "caption"],
  split: ["heading", "text", "src", "alt", "side"],
  button: ["text", "url"],
  spacer: ["height"],
  divider: [],
  callout: ["heading", "text"],
  gallery: ["section", "heading"],
  events: ["heading"],
  pricing: ["heading"],
  partners: ["heading"],
  booking: ["heading", "kind"],
  newsletter: ["heading"],
  slideshow: ["heading", "images"],
};
const MENU = [
  "/events/",
  "/rent/",
  "/rent/weddings/",
  "/sculpture/",
  "/about/",
  "/contact/",
];
function attr(n, key) {
  return (n.attrs || []).find((a) => a.name === key)?.value || "";
}
function walk(n, f) {
  f(n);
  (n.childNodes || []).forEach((c) => walk(c, f));
}
function text(n) {
  return n.nodeName === "#text"
    ? n.value
    : (n.childNodes || []).map(text).join("");
}
function registryFor(page, registry) {
  return (
    registry.find((r) => r.id === page.id) || {
      id: page.id,
      route: page.route,
      name: page.name,
      output: "public/site-pages/" + page.slug + ".html",
      html: generic(page.name),
    }
  );
}
function generic(name) {
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    esc(name) +
    ' — Sane Living</title><link rel="stylesheet" href="/style.css"><script src="/site-config.js" defer></script><script src="/site-content.js" defer></script></head><body><nav id="site-nav"></nav><main><section class="page-hero"><div class="container"><h1>' +
    esc(name) +
    '</h1></div></section></main><footer id="site-footer"></footer><script src="/script.js"></script></body></html>'
  );
}
function prepared(entry, resources) {
  let html = entry.html;
  if (entry.route === "/about/" && resources?.about) {
    const m = content.parseAbout(resources.about);
    const philosophy =
      /<!-- philosophy:start -->([\s\S]*?)<!-- philosophy:end -->/.exec(
        html,
      )?.[1] || "";
    html = aboutRenderer.documentHtml(html, m, philosophy, false);
  }
  return html;
}
const descriptionCache = new WeakMap();
function describe(entry, resources) {
  const key = entry.route === "/about/" ? resources?.about || "" : "";
  const cached = descriptionCache.get(entry);
  if (cached?.key === key) return cached.value;
  const value = describeSource(entry, resources);
  descriptionCache.set(entry, { key, value });
  return value;
}
function describeSource(entry, resources) {
  const html = prepared(entry, resources),
    doc = parse(html, { sourceCodeLocationInfo: true });
  let body;
  walk(doc, (n) => {
    if (n.tagName === "body") body = n;
  });
  const nodes = (body?.childNodes || []).filter(
    (n) =>
      n.sourceCodeLocation &&
      /^(section|main|article|div|header|h1|h2|p)$/.test(n.tagName || "") &&
      !["site-nav", "site-footer", "site-announcement"].includes(
        attr(n, "id"),
      ) &&
      !/modal|lightbox/i.test(attr(n, "id") + " " + attr(n, "class")),
  );
  const blocks = nodes.map((node, i) => {
    const loc = node.sourceCodeLocation,
      raw = html.slice(loc.startOffset, loc.endOffset);
    let heading = "";
    walk(node, (n) => {
      if (!heading && /^h[1-3]$/.test(n.tagName || ""))
        heading = text(n).trim();
    });
    const ownedIds = new Set(
      [...html.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(
        (m) => m[1],
      ),
    );
    const fields = [];
    walk(node, (n) => {
      let owner = n;
      while (owner) {
        if (
          ownedIds.has(attr(owner, "id")) ||
          attr(owner, "data-site-text") ||
          attr(owner, "data-site-src") ||
          (entry.id === "rent--pricing" &&
            attr(owner, "class").split(" ").includes("pricing-cta"))
        )
          return;
        owner = owner.parentNode;
      }
      if (entry.id === "rent--weddings" && n.tagName === "h1") return;
      const l = n.sourceCodeLocation;
      if (
        !l ||
        !n.tagName ||
        ["script", "style", "iframe", "option", "textarea", "input"].includes(
          n.tagName,
        )
      )
        return;
      // Integrations and settings keep their canonical owners. Only simple semantic leaf text is editable.
      if (
        /^(h[1-6]|p|figcaption|a|li|span)$/.test(n.tagName) &&
        !(n.childNodes || []).some((c) => c.tagName) &&
        text(n).trim() &&
        !attr(n, "data-site-text") &&
        !attr(n, "data-site-email") &&
        !attr(n, "data-site-href")
      ) {
        if (l.startTag && l.endTag)
          fields.push({
            id: "f" + fields.length,
            kind: "text",
            label:
              n.tagName.toUpperCase() + " · " + text(n).trim().slice(0, 55),
            value: text(n),
            start: l.startTag.endOffset - loc.startOffset,
            end: l.endTag.startOffset - loc.startOffset,
          });
      }
      for (const key of n.tagName === "img"
        ? ["src", "alt"]
        : n.tagName === "a"
          ? ["href"]
          : []) {
        if (
          (key === "src" && attr(n, "data-site-src")) ||
          (key === "href" &&
            (attr(n, "data-site-booking") ||
              attr(n, "data-site-href") ||
              attr(n, "data-site-email")))
        )
          continue;
        const a = l.attrs?.[key];
        if (!a) continue;
        fields.push({
          id: "f" + fields.length,
          kind: key === "src" ? "image" : key === "href" ? "link" : "text",
          attribute: key,
          label:
            (key === "src"
              ? "Image"
              : key === "alt"
                ? "Image description"
                : "Link") +
            " · " +
            (attr(n, "alt") || text(n).trim() || n.tagName).slice(0, 50),
          value: attr(n, key),
          start: a.startOffset - loc.startOffset,
          end: a.endOffset - loc.startOffset,
        });
      }
    });
    const elements = [];
    walk(node, (n) => {
      const l = n.sourceCodeLocation;
      if (
        !l?.startTag ||
        !/^(section|main|article|div|header|h[1-6]|p|a|img|video|button|figure|figcaption|span|ul|ol|li|blockquote|iframe)$/.test(
          n.tagName || "",
        )
      )
        return;
      let parent = n.parentNode;
      while (
        parent &&
        parent !== node.parentNode &&
        !elements.some(
          (e) =>
            e.start ===
            parent.sourceCodeLocation?.startOffset - loc.startOffset,
        )
      )
        parent = parent.parentNode;
      let owner = n,
        managed = false;
      while (owner && owner !== node.parentNode) {
        if (ownedIds.has(attr(owner, "id"))) managed = true;
        owner = owner.parentNode;
      }
      const start = l.startOffset - loc.startOffset,
        end = l.endOffset - loc.startOffset;
      const bindings = [];
      for (const [attribute, kind] of [
        ["data-site-text", "text"],
        ["data-site-href", "link"],
        ["data-site-src", "image"],
      ]) {
        const key = attr(n, attribute);
        if (key) bindings.push({ key, kind, label: key });
      }
      if (
        (n.attrs || []).some((a) => a.name === "data-site-hero-video") ||
        attr(n, "class").split(" ").includes("video-hero-bg")
      ) {
        bindings.push(
          { key: "homeVideoUrl", kind: "video", label: "Hero video URL" },
          { key: "homePosterUrl", kind: "image", label: "Hero poster image" },
        );
      }
      const el = {
        id: "e" + start,
        tag: n.tagName,
        label:
          n.tagName === "img"
            ? attr(n, "alt") || "Image"
            : n.tagName === "video"
              ? "Hero video"
              : text(n).trim().slice(0, 65) ||
                attr(n, "class").split(" ")[0] ||
                n.tagName,
        parent: parent?.sourceCodeLocation
          ? "e" + (parent.sourceCodeLocation.startOffset - loc.startOffset)
          : "",
        start,
        end,
        open: l.startTag.endOffset - loc.startOffset,
        close: l.endTag ? l.endTag.startOffset - loc.startOffset : null,
        bindings,
        managed,
      };
      elements.push(el);
    });
    if(entry.route === "/rent/weddings/") {
      const owner=elements.find(e=>raw.slice(e.start,e.open).includes('id="wedding-details"'));
      if(owner)for(const [key,label] of [["includesText","What's included"],["cateringPolicy","Catering policy"],["alcoholPolicy","Alcohol policy"],["parkingNote","Parking note"]])elements.push({id:"policy-"+key,tag:"p",label,parent:owner.id,start:0,end:0,open:0,close:null,bindings:[],managed:true,virtual:true,contentKey:key});
    }
    for (const f of fields)
      f.element = elements
        .filter((e) => f.start >= e.start && f.end <= e.end)
        .at(-1)?.id;
    return {
      elements,
      id: "original-" + i,
      type:
        entry.route === "/about/" && raw.includes("about-managed:start")
          ? "about"
          : entry.route === "/about/" &&
              attr(node, "class").split(" ").includes("page-hero")
            ? "aboutHero"
            : "legacy",
      label: heading || "Website section " + (i + 1),
      raw,
      start: loc.startOffset,
      end: loc.endOffset,
      fields,
    };
  });
  return {
    html,
    blocks,
    start: blocks[0]?.start || 0,
    end: blocks.at(-1)?.end || 0,
  };
}
function templateRevision(registry) {
  return registry.map((r) => r.id + ":" + (r.revision || "generic")).join("|");
}
function createProject(registry) {
  const ordered = [...registry].sort((a, b) => {
    const rank = (r) =>
      r.route === "/"
        ? -1
        : MENU.includes(r.route)
          ? MENU.indexOf(r.route)
          : 100 + registry.indexOf(r);
    return rank(a) - rank(b);
  });
  return {
    version: 2,
    templateRevision: templateRevision(registry),
    pages: ordered.map((r) => ({
      id: r.id,
      name: r.name,
      route: r.route,
      menu: MENU.includes(r.route),
      active: false,
      blocks: describe(r).blocks.map((b) => ({
        id: b.id,
        type: b.type,
        source: b.id,
        label: b.label,
        edits: {},
      })),
    })),
  };
}
function block(type, id) {
  const props = {
    video: {src:"/hero-video.mp4",poster:"/images/homepage-hero.jpg",caption:""},
    list: {items:"First item\nSecond item\nThird item",style:"bullets"},
    quote: {text:"A place to connect, create and celebrate.",citation:"Sane Living"},
    details: {summary:"Frequently asked question",text:"Add a helpful answer here."},
    card: {heading:"A welcoming space",text:"Describe what makes this special.",src:"/images/about-center-exterior.jpg",alt:"Sane Living",buttonText:"Learn more",url:"/contact/"},
    badge: {text:"A special place"},
    heading: { text: "A new heading", level: "h2" },
    text: { text: "Share your story. Make this space your own." },
    image: {
      src: "/images/about-center-exterior.jpg",
      alt: "Sane Living",
      caption: "",
    },
    split: {
      heading: "A place to connect",
      text: "Write something that welcomes your visitors.",
      src: "/images/about-center-exterior.jpg",
      alt: "Sane Living",
      side: "right",
    },
    button: { text: "Get in touch", url: "/contact/" },
    spacer: { height: 48 },
    divider: {},
    callout: {
      heading: "Come together",
      text: "Add a meaningful message for your community.",
    },
    gallery: { section: "venue", heading: "Our space" },
    events: { heading: "Upcoming events" },
    pricing: { heading: "Rates & availability" },
    partners: { heading: "Our partners" },
    booking: { heading: "Plan your visit", kind: "rental" },
    newsletter: { heading: "Stay connected" },
    slideshow: {
      heading: "Image gallery",
      images: "/images/about-center-exterior.jpg",
    },
  };
  return {
    id,
    type,
    label: type[0].toUpperCase() + type.slice(1),
    theme: "white",
    align: "left",
    spacing: 48,
    props: props[type] || {},
  };
}
function validate(project, registry, resources) {
  const errors = [],
    ids = new Set(),
    routes = new Set();
  if (
    new TextEncoder().encode(JSON.stringify(project, null, 2) || "").length >
    700000
  )
    return ["The website layout is too large (maximum 700 KB)."];
  if (
    !project ||
    project.version !== 2 ||
    !Array.isArray(project.pages) ||
    project.pages.length < registry.length ||
    project.pages.length > 50
  )
    return ["Unsupported website document."];
  if (
    project.lastReleaseId != null &&
    (typeof project.lastReleaseId !== "string" ||
      !/^[a-f0-9-]{36}$/.test(project.lastReleaseId))
  )
    errors.push("Invalid publication marker.");
  if (project.templateRevision !== templateRevision(registry))
    errors.push(
      "The website templates changed. Keep this draft and load a compatible version before publishing.",
    );
  if (
    Object.keys(project).some(
      (k) =>
        !["version", "templateRevision", "lastReleaseId", "pages"].includes(k),
    )
  )
    errors.push("Unknown website fields.");
  for (const page of project.pages) {
    if (!page || typeof page !== "object") {
      errors.push("Invalid page.");
      continue;
    }
    if (
      Object.keys(page).some(
        (k) =>
          !["id", "name", "route", "slug", "menu", "active", "blocks"].includes(
            k,
          ),
      )
    )
      errors.push("Unknown page fields.");
    const original = registry.find((r) => r.id === page.id);
    if (
      typeof page.name !== "string" ||
      !page.name.trim() ||
      page.name.length > 120
    )
      errors.push("Give each page a name (up to 120 characters).");
    if (
      typeof page.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,80}$/.test(page.id) ||
      ids.has(page.id)
    )
      errors.push("Duplicate or invalid page ID.");
    ids.add(page.id);
    if (original) {
      if (page.route !== original.route)
        errors.push("Existing page URLs cannot change here.");
      if (page.menu !== MENU.includes(original.route))
        errors.push("Use Settings to change existing navigation visibility.");
    } else if (
      typeof page.slug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) ||
      page.slug.length > 60 ||
      page.route !== "/" + page.slug + "/" ||
      page.id !== "custom--" + page.slug ||
      registry.some((r) => r.route.split("/")[1] === page.slug) ||
      [
        "api",
        "dash",
        "admin",
        "content",
        "images",
        "site-pages",
        "wp-admin",
        "wp-content",
        "wp-includes",
        "sane-events",
        "bush",
        "ted-talks",
      ].includes(page.slug)
    )
      errors.push("This new page URL is reserved or invalid.");
    if (routes.has(page.route)) errors.push("Duplicate page URL.");
    routes.add(page.route);
    if (typeof page.menu !== "boolean" || typeof page.active !== "boolean")
      errors.push("Invalid page visibility.");
    if (!Array.isArray(page.blocks) || page.blocks.length > 100) {
      errors.push("Use at most 100 sections per page.");
      continue;
    }
    let descriptors = [];
    try {
      descriptors = describe(registryFor(page, registry), resources).blocks;
    } catch {
      errors.push("Page template could not be read.");
    }
    const sources = new Set(),
      blockIds = new Set();
    for (const b of page.blocks) {
      if (!b || typeof b !== "object") {
        errors.push("Invalid block.");
        continue;
      }
      if (Object.keys(b).some((k) => !BASE.includes(k)))
        errors.push("Unknown block fields.");
      if (
        typeof b.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(b.id) ||
        blockIds.has(b.id)
      )
        errors.push("Invalid or duplicate section ID.");
      blockIds.add(b.id);
      if (b.hidden != null && typeof b.hidden !== "boolean")
        errors.push("Invalid section visibility.");
      if (
        b.theme != null &&
        !["white", "soft", "accent", "dark"].includes(b.theme)
      )
        errors.push("Unknown section surface.");
      if (b.align != null && !["left", "center", "right"].includes(b.align))
        errors.push("Unknown text alignment.");
      if (
        b.spacing != null &&
        (!Number.isInteger(b.spacing) || b.spacing < 0 || b.spacing > 120)
      )
        errors.push("Section spacing must be between 0 and 120.");
      if (
        b.label != null &&
        (typeof b.label !== "string" || b.label.length > 160)
      )
        errors.push("Section names must be short text.");
      if (b.design != null) errors.push(...design.validate(b.design));
      errors.push(...design.validateResponsive(b.responsive));
      if (["legacy", "about", "aboutHero"].includes(b.type)) {
        const d = descriptors.find(
          (x) => x.id === b.source && x.type === b.type,
        );
        if (!d || sources.has(b.source)) {
          errors.push(
            "Original sections must retain their template references.",
          );
          continue;
        }
        sources.add(b.source);
        errors.push(...validateElements(d, b.elements));
        if (b.props != null)
          errors.push("Original section properties are not supported.");
        if (!b.edits || typeof b.edits !== "object" || Array.isArray(b.edits)) {
          errors.push("Invalid original section fields.");
          continue;
        }
        for (const [key, value] of Object.entries(b.edits)) {
          const f = d.fields.find((x) => x.id === key);
          if (!f || typeof value !== "string" || value.length > 20000)
            errors.push("Unknown or oversized text/image field.");
          else if (
            f.kind !== "text" &&
            value &&
            !settings.safeUrl(value, f.kind === "image" ? "image" : "link")
          )
            errors.push("Use a safe image or page URL.");
        }
      } else {
        if (
          !TYPES.includes(b.type) ||
          b.source != null ||
          b.edits != null ||
          b.elements != null
        ) {
          errors.push("Unsupported block type.");
          continue;
        }
        if (
          !b.props ||
          typeof b.props !== "object" ||
          Array.isArray(b.props) ||
          Object.keys(b.props).some((k) => !PROPS[b.type].includes(k))
        ) {
          errors.push("Unsupported block properties.");
          continue;
        }
        for (const [key, v] of Object.entries(b.props)) {
          if (key === "height") {
            if (!Number.isInteger(v) || v < 8 || v > 240)
              errors.push("Spacer height must be between 8 and 240.");
          } else if (typeof v !== "string" || v.length > 20000)
            errors.push(
              "Block content must be text (maximum 20,000 characters).",
            );
        }
        if (
          b.type === "slideshow" &&
          (String(b.props.images || "")
            .split("\n")
            .filter(Boolean).length > 12 ||
            String(b.props.images || "")
              .split("\n")
              .filter(Boolean)
              .some((u) => !settings.safeUrl(u, "image")))
        )
          errors.push("Use up to 12 safe image URLs.");
        for (const [key, kind] of [
          ["src", "image"],
          ["url", "link"],
          ["poster", "image"],
        ])
          if (b.props[key] && !settings.safeUrl(b.props[key], kind))
            errors.push("Use a safe image or page URL.");
        if (b.type === "list" && !["bullets","numbered"].includes(b.props.style))errors.push("Choose a list style.");
        if (b.props.level && !["h1", "h2", "h3"].includes(b.props.level))
          errors.push("Choose a supported heading level.");
        if (b.props.side && !["left", "right"].includes(b.props.side))
          errors.push("Choose a supported image position.");
        if (
          b.props.section &&
          !["all", "venue", "weddings", "outdoor"].includes(b.props.section)
        )
          errors.push("Choose an existing gallery section.");
        if (
          b.props.kind &&
          !["rental", "contact", "availability"].includes(b.props.kind)
        )
          errors.push("Choose an existing booking integration.");
      }
    }
    for (const b of page.blocks) {
      if (!b?.placement) continue;
      const at=b.placement, owner=page.blocks.find(x=>x.id===at.section), d=descriptors.find(x=>x.id===owner?.source), parent=d?.elements.find(e=>e.id===at.parent);
      const layout = owner && ['row','column'].includes(owner.type);
      const before = !at.before || (layout ? page.blocks.some(x=>x.id===at.before && x.placement?.section===owner.id) : d?.elements.some(e=>e.id===at.before && (owner.elements?.[e.id]?.parent ?? e.parent)===parent?.id));
      if(b.source || !at || typeof at!=='object' || Object.keys(at).some(k=>!['section','parent','before'].includes(k)) || !before || (layout ? at.parent!=='content' : owner?.type!=='legacy' || !parent || parent.managed || !/^(div|section|main|article|figure)$/.test(parent.tag)))errors.push('Invalid nested block placement.');
      const seen=new Set([b.id]);let node=owner,depth=0;
      while(node){if(seen.has(node.id)||depth++>10){errors.push('A block cannot contain itself or exceed ten nested containers.');break;}seen.add(node.id);node=page.blocks.find(x=>x.id===node.placement?.section);}
    }
    // Original DOM must stay available to its existing integration scripts. Hiding is supported.
    if (descriptors.some((d) => !sources.has(d.id)))
      errors.push(
        "Keep original sections; use Hide to remove one from view safely.",
      );
  }
  if (registry.some((r) => !ids.has(r.id)))
    errors.push("Existing pages cannot be deleted.");
  if (!project.pages.some((p) => p && p.menu))
    errors.push("Keep at least one navigation item.");
  return [...new Set(errors)];
}
function validateElements(d, values) {
  if (values == null) return [];
  if (
    typeof values !== "object" ||
    Array.isArray(values) ||
    Object.keys(values).length > 500
  )
    return ["Invalid element overrides."];
  const errors = [];
  for (const [id, v] of Object.entries(values)) {
    const e = d.elements.find((e) => e.id === id);
    if (
      !e ||
      !v ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      Object.keys(v).some(
        (k) =>
          ![
            "x",
            "y",
            "width",
            "align",
            "hidden",
            "parent",
            "order",
            "gallery",
            "fontSize",
            "color",
            "background",
            "padding",
            "gap",
            "radius",
            "responsive",
            ...design.keys,
          ].includes(k),
      )
    ) {
      errors.push("Invalid element properties.");
      continue;
    }
    const styleValues = Object.fromEntries(Object.entries(v).filter(([k]) => design.keys.includes(k)));
    // Existing zero-size legacy values remain valid for old drafts.
    errors.push(...design.validate(Object.fromEntries(Object.entries(styleValues).filter(([k,val]) => !(k === "fontSize" && val === 0)))));
    errors.push(...design.validateResponsive(v.responsive));
    if (v.hidden != null && typeof v.hidden !== "boolean")
      errors.push("Invalid element visibility.");
    if (
      v.order != null &&
      (!Number.isInteger(v.order) || v.order < 0 || v.order > 100000)
    )
      errors.push("Invalid element order.");
    if (
      v.gallery != null &&
      (e.tag !== "img" ||
        !Array.isArray(v.gallery) ||
        v.gallery.length > 12 ||
        v.gallery.some(
          (u) => typeof u !== "string" || !settings.safeUrl(u, "image"),
        ))
    )
      errors.push("Use up to 12 safe gallery image URLs.");
    if (v.parent != null) {
      const p = d.elements.find((x) => x.id === v.parent);
      if (
        !e.parent ||
        !p ||
        p.managed ||
        e.managed ||
        !/^(div|section|main|article|figure|ul|ol)$/.test(p.tag)
      )
        errors.push("Invalid element container.");
    }
    let parent = v.parent ?? e.parent;
    const seen = new Set([id]);
    while (parent) {
      if (seen.has(parent)) {
        errors.push("An element cannot contain itself.");
        break;
      }
      seen.add(parent);
      const next = d.elements.find((x) => x.id === parent);
      parent = values[parent]?.parent ?? next?.parent;
    }
  }
  return errors;
}
function originalHtml(d, b, annotate, nested = [], resources = {}, blocks = []) {
  d={...d,elements:d.elements.filter(e=>!e.virtual)};
  const overrides = b.elements || {},
    nodes = new Map(d.elements.map((e) => [e.id, e]));
  function range(start, end) {
    let html = d.raw.slice(start, end);
    const replacements = [];
    for (const [id, value] of Object.entries(b.edits || {})) {
      const f = d.fields.find((x) => x.id === id);
      if (!f || f.start < start || f.end > end) continue;
      const safe =
        f.kind === "image"
          ? settings.safeUrl(value, "image")
          : f.kind === "link"
            ? settings.safeUrl(value, "link")
            : value;
      replacements.push({
        start: f.start - start,
        end: f.end - start,
        value: f.attribute ? f.attribute + '="' + esc(safe) + '"' : esc(safe),
      });
    }
    replacements
      .sort((a, b) => b.start - a.start)
      .forEach((r) => {
        html = html.slice(0, r.start) + r.value + html.slice(r.end);
      });
    return html;
  }
  function render(e) {
    const v = overrides[e.id] || {};
    let open = range(e.start, e.open),
      close = e.close == null ? "" : range(e.close, e.end);
    if (v.responsive || Object.keys(v).some(k => design.keys.includes(k)))
      open = open.replace(/^<([\w-]+)/, '<$1 data-studio-style="' + design.token(b.id + ":" + e.id) + '"');
    if (annotate)
      open = open.replace(
        /^<([\w-]+)/,
        '<$1 data-studio-element="' + e.id + '"',
      );
    const style = [];
    if (v.x || v.y)
      style.push(
        "position:relative",
        "translate:" + Number(v.x || 0) + "px " + Number(v.y || 0) + "px",
        "z-index:2",
      );
    if (v.width)
      style.push(
        "width:" + Math.max(10, Math.min(100, Number(v.width) || 100)) + "%",
        "max-width:100%",
      );
    if (["left", "center", "right"].includes(v.align))
      style.push("text-align:" + v.align);
    for (const [key, css] of [
      ["fontSize", "font-size"],
      ["padding", "padding"],
      ["gap", "gap"],
      ["radius", "border-radius"],
    ])
      if (v[key] != null)
        style.push(
          css + ":" + Math.max(0, Math.min(160, Number(v[key]) || 0)) + "px",
        );
    for (const key of ["color", "background"])
      if (/^#[0-9a-fA-F]{6}$/.test(v[key] || ""))
        style.push(key + ":" + v[key]);
    if (style.length) {
      const joined = style.join(";");
      open = /\sstyle=["']/.test(open)
        ? open.replace(
            /(\sstyle=)(["'])(.*?)\2/s,
            (_, a, q, s) => a + q + esc(s + ";" + joined) + q,
          )
        : open.replace(/>$/, ' style="' + joined + '">');
      if (v.x || v.y)
        open = open.replace(/^<([\w-]+)/, "<$1 data-studio-offset");
    }
    if (v.hidden)
      open = open.replace(/^<([\w-]+)/, "<$1 hidden data-studio-hidden");
    if (e.close == null) {
      const html = open;
      return e.tag === "img" && v.gallery?.length
        ? carousel(
            html,
            v.gallery.map(
              (u) =>
                '<img src="' +
                esc(settings.safeUrl(u, "image")) +
                '" alt="Gallery image" loading="lazy">',
            ),
          )
        : html;
    }
    const original = d.elements
      .filter((x) => x.parent === e.id)
      .sort((a, b) => a.start - b.start);
    // Keep trusted non-element gaps (including scripts) once, while structured elements can move.
    let gaps = "",
      cursor = e.open;
    for (const child of original) {
      gaps += range(cursor, child.start);
      cursor = child.end;
    }
    gaps += range(cursor, e.close);
    const children = d.elements
      .filter((x) => (overrides[x.id]?.parent ?? x.parent) === e.id)
      .sort(
        (a, b) =>
          (overrides[a.id]?.order ?? a.start) -
          (overrides[b.id]?.order ?? b.start),
      );
    const hasStructural =
      children.length !== original.length ||
      children.some((x, i) => x.id !== original[i]?.id);
    const inserts = nested.filter((x) => x.placement.parent === e.id);
    let body = "";
    if (!hasStructural && !inserts.length) {
      cursor = e.open;
      for (const child of original) {
        body += range(cursor, child.start) + render(child);
        cursor = child.end;
      }
      body += range(cursor, e.close);
    } else {
      for (const child of children) {
        body +=
          inserts
            .filter((x) => x.placement.before === child.id)
            .map((x) => renderBlock(x, resources, annotate, blocks))
            .join("") + render(child);
      }
      body +=
        inserts
          .filter(
            (x) =>
              !x.placement.before ||
              !children.some((c) => c.id === x.placement.before),
          )
          .map((x) => renderBlock(x, resources, annotate, blocks))
          .join("") + gaps;
    }
    return open + body + close;
  }
  let html = render(d.elements[0]);
  const attrs =
    ' data-studio-layout="' + design.token(b.id) + '"' +
    (annotate ? ' data-studio-block="' + esc(b.id) + '"' : "") +
    (b.hidden ? " hidden data-studio-hidden" : "");
  return html.replace(/^<([\w-]+)/, "<$1" + attrs);
}
function carousel(first, others) {
  return (
    '<div class="studio-carousel" data-studio-carousel><div class="studio-carousel-track">' +
    first +
    others.join("") +
    '</div><div class="studio-carousel-controls"><button type="button" data-slide="-1" aria-label="Previous image">←</button><button type="button" data-slide="1" aria-label="Next image">→</button></div></div>'
  );
}
function jsonResources(resources, key) {
  try {
    return JSON.parse(resources[key] || "{}");
  } catch {
    return {};
  }
}
function renderBlock(b, resources, annotate, blocks = [], depth = 0) {
  if (depth > 10) return "";
  const p = b.props || {},
    s = settings.normalize(jsonResources(resources, "settings"));
  let inner = "";
  if (["row", "column"].includes(b.type)) {
    const children = blocks.filter(x=>x.placement?.section===b.id);
    inner = children.map(child=>renderBlock(child,resources,annotate,blocks,depth+1)).join("");
    if(!inner && annotate)inner='<div class="studio-empty-layout">Drop elements into this '+b.type+'</div>';
  }
  const img = () =>
    '<img src="' +
    esc(settings.safeUrl(p.src, "image")) +
    '" alt="' +
    esc(p.alt || "") +
    '" loading="lazy">';
  if (b.type === "video") inner='<figure><video controls playsinline preload="metadata" poster="'+esc(settings.safeUrl(p.poster,"image"))+'" src="'+esc(settings.safeUrl(p.src,"url"))+'"></video>'+(p.caption?'<figcaption>'+esc(p.caption)+'</figcaption>':'')+'</figure>';
  if (b.type === "list") {const tag=p.style==='numbered'?'ol':'ul';inner='<'+tag+' class="studio-list">'+String(p.items||'').split('\n').filter(Boolean).map(x=>'<li>'+esc(x)+'</li>').join('')+'</'+tag+'>';}
  if (b.type === "quote") inner='<blockquote class="studio-quote"><p>'+esc(p.text||'')+'</p>'+(p.citation?'<cite>'+esc(p.citation)+'</cite>':'')+'</blockquote>';
  if (b.type === "details") inner='<details class="studio-details"><summary>'+esc(p.summary||'Details')+'</summary>'+content.markdown(p.text||'')+'</details>';
  if (b.type === "badge") inner='<span class="studio-badge">'+esc(p.text||'')+'</span>';
  if (b.type === "card") inner='<article class="studio-content-card">'+(p.src?img():'')+'<h2>'+esc(p.heading||'')+'</h2>'+content.markdown(p.text||'')+(p.buttonText?'<a class="btn btn-primary" href="'+esc(settings.safeUrl(p.url,"link")||'#')+'">'+esc(p.buttonText)+'</a>':'')+'</article>';
  if (b.type === "heading")
    inner =
      "<" +
      (p.level || "h2") +
      ">" +
      esc(p.text || "") +
      "</" +
      (p.level || "h2") +
      ">";
  if (b.type === "slideshow")
    inner =
      (p.heading ? "<h2>" + esc(p.heading) + "</h2>" : "") +
      carousel(
        "",
        String(p.images || "")
          .split("\n")
          .filter(Boolean)
          .map(
            (u) =>
              '<img src="' +
              esc(settings.safeUrl(u, "image")) +
              '" alt="Gallery image" loading="lazy">',
          ),
      );
  if (b.type === "text") inner = content.markdown(p.text || "");
  if (b.type === "image")
    inner =
      "<figure>" +
      img() +
      (p.caption ? "<figcaption>" + esc(p.caption) + "</figcaption>" : "") +
      "</figure>";
  if (b.type === "split")
    inner =
      '<div class="studio-split ' +
      (p.side === "left" ? "image-first" : "") +
      '"><div><h2>' +
      esc(p.heading || "") +
      "</h2>" +
      content.markdown(p.text || "") +
      "</div>" +
      img() +
      "</div>";
  if (b.type === "button")
    inner =
      '<a class="btn btn-primary" href="' +
      esc(settings.safeUrl(p.url, "link") || "#") +
      '">' +
      esc(p.text || "Learn more") +
      "</a>";
  if (b.type === "divider") inner = "<hr>";
  if (b.type === "spacer")
    inner =
      '<div style="height:' +
      (Number(p.height) || 48) +
      'px" aria-hidden="true"></div>';
  if (b.type === "callout")
    inner =
      '<div class="studio-callout"><h2>' +
      esc(p.heading || "") +
      "</h2>" +
      content.markdown(p.text || "") +
      "</div>";
  if (b.type === "gallery") {
    const photos = (jsonResources(resources, "gallery").photos || []).filter(
      (x) =>
        !x.draft &&
        (p.section === "all" || (x.section || "venue") === p.section),
    );
    inner =
      "<h2>" +
      esc(p.heading || "Gallery") +
      '</h2><div class="studio-gallery-grid">' +
      photos
        .map(
          (x) =>
            '<figure><img src="' +
            esc(settings.safeUrl(x.image, "image")) +
            '" alt="' +
            esc(x.alt || "") +
            '" loading="lazy"><figcaption>' +
            esc(x.caption || "") +
            "</figcaption></figure>",
        )
        .join("") +
      "</div>";
  }
  if (b.type === "events")
    inner =
      "<h2>" +
      esc(p.heading || "Upcoming events") +
      '</h2><div class="studio-events" data-studio-events role="status">Loading published events…</div>';
  if (b.type === "pricing") {
    const rows = jsonResources(resources, "pricing").rows || [];
    inner =
      "<h2>" +
      esc(p.heading || "Rates") +
      '</h2><div class="studio-rate-wrap"><table class="studio-rate-table"><thead><tr><th>Rental period</th><th>Mon–Thu</th><th>Friday</th><th>Saturday</th><th>Sunday</th></tr></thead><tbody>' +
      rows
        .map(
          (x) =>
            "<tr><th>" +
            esc(x.label || "") +
            "<small>" +
            esc(x.sublabel || "") +
            "</small></th>" +
            ["monThu", "friday", "saturday", "sunday"]
              .map((k) => "<td>" + esc(x[k] || "") + "</td>")
              .join("") +
            "</tr>",
        )
        .join("") +
      "</tbody></table></div>";
  }
  if (b.type === "partners") {
    const rows = jsonResources(resources, "partners").partners || [];
    inner =
      "<h2>" +
      esc(p.heading || "Partners") +
      '</h2><div class="studio-collection">' +
      rows
        .map(
          (x) =>
            "<article><h3>" +
            esc(x.name || "Partner") +
            "</h3><p>" +
            esc(x.description || "") +
            "</p></article>",
        )
        .join("") +
      "</div>";
  }
  if (b.type === "booking") {
    const url =
      p.kind === "contact"
        ? s.contactFormUrl
        : p.kind === "availability"
          ? s.availabilityEmbedUrl
          : s.rentalFormUrl;
    inner =
      "<h2>" +
      esc(p.heading || "Get in touch") +
      "</h2>" +
      (settings.safeUrl(url, "airtable")
        ? '<iframe title="' +
          esc(p.heading || "Inquiry form") +
          '" src="' +
          esc(settings.safeUrl(url, "airtable")) +
          '" loading="lazy" class="studio-booking"></iframe>'
        : "<p>Add the form address in Settings → Booking.</p>");
  }
  if (b.type === "newsletter")
    inner =
      "<h2>" +
      esc(p.heading || "Stay connected") +
      "</h2>" +
      (s.newsletterEnabled && settings.safeUrl(s.newsletterUrl, "newsletter")
        ? '<form action="' +
          esc(s.newsletterUrl) +
          '" method="post" target="_blank"><label>Email address <input name="EMAIL" type="email" required></label><button type="submit" class="btn btn-primary">Subscribe</button></form>'
        : "<p>Enable newsletter signup in Settings → Newsletter.</p>");
  return (
    '<section class="studio-block studio-' +
    esc(b.theme || "white") +
    (["row", "column"].includes(b.type) ? " studio-layout-" + b.type : "") +
    " studio-align-" +
    esc(b.align || "left") +
    '"' +
    ' data-studio-layout="' + design.token(b.id) + '"' +
    (annotate ? ' data-studio-block="' + esc(b.id) + '"' : "") +
    (b.hidden ? " hidden data-studio-hidden" : "") +
    ' style="padding-block:' +
    (b.type === "spacer"
      ? 0
      : Math.max(0, Math.min(120, Number(b.spacing ?? 48) || 0))) +
    'px"><div class="container"' + (annotate && ["row", "column"].includes(b.type) ? ' data-studio-element="content"' : "") + '>' +
    inner +
    "</div></section>"
  );
}
function renderPage(page, project, registry, resources, options = {}) {
  const entry = registryFor(page, registry),
    parts = describe(entry, resources);
  let html = parts.html;
  if (page.active || options.draft) {
    const byId = new Map(parts.blocks.map((b) => [b.id, b]));
    const first = page.blocks.find(b=>!b.placement && !b.hidden);
    let blocks = page.blocks
      .filter((b) => !b.placement)
      .map((b) => {
        const output = byId.has(b.source)
          ? originalHtml(
              byId.get(b.source),
              b,
              options.annotate,
              page.blocks.filter((x) => x.placement?.section === b.id),
              resources,
              page.blocks,
            )
          : renderBlock(b, resources, options.annotate, page.blocks);
        return b.id===first?.id && !b.source ? output.replace(/^<section/, "<section data-studio-first") : output;
      })
      .join("\n");
    // Preserve any non-section markup in the body region, including integration scripts/modals.
    let gaps = "",
      cursor = parts.start;
    for (const b of parts.blocks) {
      gaps += html.slice(cursor, b.start);
      cursor = b.end;
    }
    gaps += html.slice(cursor, parts.end);
    html = html.slice(0, parts.start) + blocks + gaps + html.slice(parts.end);
  }
  if (!entry.id.startsWith("custom--") && !page.active && !options.draft)
    return html;
  const nav = project.pages
    .filter((p) => p.id.startsWith("custom--") && p.menu)
    .map((p) => ({ route: p.route, label: p.name }));
  const jsJson = (x) => JSON.stringify(x).replace(/</g, "\\u003c");
  let assets =
    '<link rel="stylesheet" href="/studio-blocks.css"><script id="studio-nav-data" type="application/json">' +
    jsJson(nav) +
    '</script><script src="/studio-runtime.js" defer></script>';
  if (options.snapshot) {
    const map = {};
    for (const key of [
      "settings",
      "gallery",
      "weddings",
      "pricing",
      "partners",
    ])
      map["/content/" + key + ".json"] = jsonResources(resources, key);
    assets +=
      "<script>window.__SANE_PREVIEW__=true;{const m=window.__SANE_PREVIEW_RESOURCES__=" +
      jsJson(map) +
      ',f=window.fetch.bind(window);window.fetch=(u,o)=>{const p=new URL(typeof u==="string"?u:u.url,document.baseURI).pathname;return (!o||!o.method||o.method==="GET")&&Object.prototype.hasOwnProperty.call(m,p)?Promise.resolve(new Response(JSON.stringify(m[p]),{headers:{"Content-Type":"application/json"}})):f(u,o);};}</script>';
  }
  let styles = "";
  for (const b of page.blocks) {
    styles += design.rules(b.id, b.design, b.responsive, "data-studio-layout");
    for (const [id, v] of Object.entries(b.elements || {}))
      styles += design.rules(b.id + ":" + id, {...Object.fromEntries(Object.entries(v).filter(([k]) => design.keys.includes(k))),...(v.hidden?{display:"none"}:{})}, v.responsive);
  }
  const partsMap=[];
  for(const b of page.blocks){const descriptor=parts.blocks.find(d=>d.id===b.source);for(const e of descriptor?.elements||[])if(e.virtual)partsMap.push({key:e.contentKey,style:design.token(b.id+":"+e.id),block:b.id,element:e.id,annotate:!!options.annotate});}
  if(partsMap.length)assets+='<script id="studio-managed-parts" type="application/json">'+jsJson(partsMap)+'</script>';
  if (styles) assets += '<style data-studio-design-rules>' + styles + "</style>";
  html = html.replace("</head>", assets + "\n</head>");
  if (options.release)
    html = html.replace(
      "</head>",
      '<meta name="sane-release" content="' +
        esc(options.release) +
        '">\n</head>',
    );
  return html;
}
module.exports = {
  TYPES,
  settings,
  design,
  templateRevision,
  block,
  createProject,
  describe,
  registryFor,
  validate,
  renderPage,
  renderBlock,
  generic,
};
