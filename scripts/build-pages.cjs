"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  core = require("../content-core/site.cjs"),
  registry = require("../content/page-templates.json");
const root = path.resolve(__dirname, ".."),
  layout = path.join(root, "content/site-layouts.json");
if (fs.existsSync(layout)) {
  const project = JSON.parse(fs.readFileSync(layout, "utf8")),
    resources = {};
  for (const key of [
    "about",
    "settings",
    "gallery",
    "weddings",
    "pricing",
    "partners",
  ])
    resources[key] = fs.readFileSync(
      path.join(
        root,
        "public/content/" + key + (key === "about" ? ".md" : ".json"),
      ),
      "utf8",
    );
  const errors = core.validate(project, registry, resources);
  if (errors.length) throw Error(errors.join("\n"));
  const release = project.lastReleaseId || "";
  for (const page of project.pages) {
    const entry = core.registryFor(page, registry),
      output = path.join(root, entry.output);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    if (page.active || page.id.startsWith("custom--"))
      fs.writeFileSync(
        output,
        core.renderPage(page, project, registry, resources, { release }),
      );
    else {
      // Untouched bodies remain developer-owned; only shared page navigation/release hooks are added.
      let html = fs
        .readFileSync(output, "utf8")
        .replace(
          /<!-- studio-shared:start -->[\s\S]*?<!-- studio-shared:end -->/g,
          "",
        )
        .replace(/<link rel="stylesheet" href="\/studio-blocks.css">/g, "")
        .replace(
          /<script id="studio-nav-data" type="application\/json">[\s\S]*?<\/script>/g,
          "",
        )
        .replace(/<script src="\/studio-runtime.js" defer><\/script>/g, "")
        .replace(/<meta name="sane-release" content="[^"]*">/g, "");
      const nav = JSON.stringify(
        project.pages
          .filter((p) => p.id.startsWith("custom--") && p.menu)
          .map((p) => ({ route: p.route, label: p.name })),
      ).replace(/</g, "\\u003c");
      html = html.replace(
        "</head>",
        '<!-- studio-shared:start --><link rel="stylesheet" href="/studio-blocks.css"><script id="studio-nav-data" type="application/json">' +
          nav +
          '</script><script src="/studio-runtime.js" defer></script><meta name="sane-release" content="' +
          release +
          '"><!-- studio-shared:end --></head>',
      );
      fs.writeFileSync(output, html);
    }
  }
  console.log(
    "Built " +
      project.pages.filter((p) => p.active).length +
      " edited pages; existing integrations and route ownership retained.",
  );
}
