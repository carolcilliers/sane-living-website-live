/* Shared About body renderer. The legacy build remains the route owner. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(
      require("./content-model"),
      require("./site-config"),
    );
  else root.SaneAboutRenderer = factory(root.SaneContent, root.SaneSettings);
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function (content, settings) {
    "use strict";
    var images = {
      "Sane Living Center": "/images/about-center-exterior.jpg",
      "Founder — Aubrey Balkind": "/images/about-aubrey.jpg",
      "Sane Living Farm": "/images/about-farm.jpg",
      "HIP VGN": "/images/about-hipvegan.jpg",
    };
    function imageFor(section) {
      return settings.safeUrl(
        section.image || images[section.heading] || "",
        "image",
      );
    }
    function sections(model, philosophy, annotate) {
      return (
        (model.metadata.sections || [])
          .filter(function (s) {
            return s.visible !== false;
          })
          .map(function (s, i) {
            var image = s.layout === "text-only" ? "" : imageFor(s),
              link = settings.safeUrl(s.linkUrl, "link");
            var prose =
              "<div><h2>" +
              content.esc(s.heading) +
              "</h2>" +
              content.markdown(s.body) +
              (link && s.linkText
                ? '<a class="btn btn-outline" href="' +
                  content.esc(link) +
                  '"' +
                  (s.external
                    ? ' target="_blank" rel="noopener noreferrer"'
                    : "") +
                  ">" +
                  content.esc(s.linkText) +
                  "</a>"
                : "") +
              "</div>";
            var picture = image
              ? '<img src="' +
                content.esc(image) +
                '" alt="' +
                content.esc(s.imageAlt == null ? s.heading : s.imageAlt) +
                '" style="width:100%;border-radius:8px;">'
              : "";
            var left = s.layout === "image-left" || (!s.layout && i % 2);
            return (
              "<div" +
              (annotate ? ' data-editor-id="' + content.esc(s.id) + '"' : "") +
              ' data-animate class="about-managed-section ' +
              (image ? "split-grid" : "") +
              '">' +
              (left ? picture + prose : prose + picture) +
              "</div>" +
              (s.editorRole === "founder" ||
              (s.editorRole == null && s.heading.indexOf("Founder") === 0)
                ? "<!-- philosophy:start -->" +
                  (philosophy || "") +
                  "<!-- philosophy:end -->"
                : "")
            );
          })
          .join("\n") + content.markdown(model.body)
      );
    }
    function documentHtml(template, model, philosophy, annotate) {
      if (
        !template.includes("<!-- about-managed:start -->") ||
        !template.includes("<!-- about-managed:end -->")
      )
        throw Error(
          "The About preview template needs its managed content markers.",
        );
      var html = template.replace(
        /<!-- about-managed:start -->[\s\S]*?<!-- about-managed:end -->/,
        function () {
          return (
            "<!-- about-managed:start -->\n" +
            sections(model, philosophy, annotate) +
            "\n<!-- about-managed:end -->"
          );
        },
      );
      return html.replace(
        /(<section class="page-hero">[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/,
        function (_, a, b) {
          return (
            a + content.esc(model.metadata.title || "About Sane Living") + b
          );
        },
      );
    }
    return {
      sections: sections,
      documentHtml: documentHtml,
      imageFor: imageFor,
    };
  },
);
