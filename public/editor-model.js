(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(
      require("./content-model"),
      require("./site-config"),
    );
  else root.SaneEditorModel = factory(root.SaneContent, root.SaneSettings);
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function (content, settings) {
    "use strict";
    var uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    function check(model, incomplete) {
      var errors = content.validateAbout(model),
        seen = new Set(),
        sections = model.metadata.sections || [];
      if (sections.length > 50) errors.push("Use at most 50 sections.");
      if (
        typeof model.metadata.title !== "string" ||
        (!incomplete && !model.metadata.title.trim()) ||
        model.metadata.title.length > 160
      )
        errors.push("Add a page title (up to 160 characters).");
      sections.forEach(function (s) {
        if (!uuid.test(s.id) || seen.has(s.id))
          errors.push("Each section needs a unique, stable ID.");
        seen.add(s.id);
        if (
          s.layout != null &&
          !["image-left", "image-right", "text-only"].includes(s.layout)
        )
          errors.push("Choose a supported section layout.");
        if (s.imageAlt != null && typeof s.imageAlt !== "string")
          errors.push("Image descriptions must be text.");
        if (s.editorRole != null && !["founder", "none"].includes(s.editorRole))
          errors.push("Unsupported section attachment.");
        if (s.visible != null && typeof s.visible !== "boolean")
          errors.push("Section visibility must be true or false.");
        if (s.external != null && typeof s.external !== "boolean")
          errors.push("Link behavior must be true or false.");
      });
      if (
        new TextEncoder().encode(content.serializeAbout(model)).length >
        256 * 1024
      )
        errors.push("This draft exceeds 256 KB.");
      return incomplete
        ? errors.filter(function (e) {
            return !e.startsWith("Add a heading for section");
          })
        : errors;
    }
    function fromSource(text, makeId) {
      var m = content.parseAbout(text);
      m.metadata.title = m.metadata.title || "About Sane Living";
      (m.metadata.sections || []).forEach(function (s) {
        // IDs/attachment are assigned only to this working copy, never to the live source.
        if (!s.id) s.id = makeId();
        if (!s.image) {
          var fallback = {
            "Sane Living Center": "/images/about-center-exterior.jpg",
            "Founder — Aubrey Balkind": "/images/about-aubrey.jpg",
            "Sane Living Farm": "/images/about-farm.jpg",
            "HIP VGN": "/images/about-hipvegan.jpg",
          };
          if (fallback[s.heading]) s.image = fallback[s.heading];
        }
        if (!s.editorRole && s.heading.indexOf("Founder") === 0)
          s.editorRole = "founder";
      });
      return m;
    }
    function page(model) {
      return {
        schemaVersion: 1,
        id: "919b0d7d-9a5a-4378-9ea8-59b59ad97135",
        route: "/about/",
        title: model.metadata.title,
        templateVersion: "sane-about@1",
        nodes: [
          {
            id: "095747e9-e942-4764-a135-9554a09aef82",
            type: "sane.hero",
            componentVersion: 1,
            variant: "existing",
            props: {},
            bindings: { headline: { resource: "about", key: "title" } },
          },
          {
            id: "3fbdb748-7a48-4223-89c6-54a6dd16d4d8",
            type: "sane.aboutSections",
            componentVersion: 1,
            variant: "existing",
            props: {},
            bindings: { sections: { resource: "about", key: "sections" } },
          },
        ],
      };
    }
    function canonical(x) {
      if (Array.isArray(x)) return "[" + x.map(canonical).join(",") + "]";
      if (x && typeof x === "object")
        return (
          "{" +
          Object.keys(x)
            .sort()
            .map(function (k) {
              return JSON.stringify(k) + ":" + canonical(x[k]);
            })
            .join(",") +
          "}"
        );
      return JSON.stringify(x);
    }
    function validatePage(p, m) {
      if (!p || canonical(p) !== canonical(page(m)))
        throw Error(
          "Unsupported page structure or binding. Use this About pilot’s exported draft format.",
        );
    }
    function exportDraft(model, sourceSha) {
      return {
        kind: "sane-about-pilot",
        schemaVersion: 1,
        sourceSha: sourceSha,
        page: page(model),
        content: content.serializeAbout(model),
      };
    }
    function importDraft(value) {
      if (
        !value ||
        value.kind !== "sane-about-pilot" ||
        value.schemaVersion !== 1 ||
        typeof value.sourceSha !== "string" ||
        !/^[a-f0-9]{40}$/.test(value.sourceSha) ||
        typeof value.content !== "string"
      )
        throw Error("Choose an About editor draft exported by this pilot.");
      if (
        Object.keys(value).some(function (k) {
          return ![
            "kind",
            "schemaVersion",
            "sourceSha",
            "page",
            "content",
          ].includes(k);
        })
      )
        throw Error("This draft contains unsupported fields.");
      var m = content.parseAbout(value.content),
        errors = check(m, true);
      if (errors.length) throw Error(errors.join(" "));
      validatePage(value.page, m);
      return { model: m, sourceSha: value.sourceSha };
    }
    return {
      check: check,
      fromSource: fromSource,
      page: page,
      validatePage: validatePage,
      exportDraft: exportDraft,
      importDraft: importDraft,
    };
  },
);
