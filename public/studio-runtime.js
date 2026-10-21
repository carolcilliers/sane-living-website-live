/* Approved public block behavior. Never receives private authoring state. */
(function () {
  "use strict";
  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function safe(s) {
    try {
      var u = new URL(s, document.baseURI);
      return ["http:", "https:"].includes(u.protocol) ? u.href : "";
    } catch (e) {
      return "";
    }
  }
  function navigation() {
    var data = document.getElementById("studio-nav-data"),
      list = document.getElementById("nav-links");
    if (!data || !list) return;
    var pages;
    try {
      pages = JSON.parse(data.textContent);
    } catch (e) {
      return;
    }
    var items = Array.from(list.children),
      used = new Set();
    pages.forEach(function (p) {
      var li = items.find(function (n) {
        return n.querySelector("a")?.getAttribute("href") === p.route;
      });
      if (!li) {
        li = document.createElement("li");
        var a = document.createElement("a");
        a.href = p.route;
        a.textContent = p.label;
        li.append(a);
      }
      used.add(li);
      list.append(li);
    });
  }
  function events() {
    document
      .querySelectorAll("[data-studio-events]")
      .forEach(async function (el) {
        try {
          var r = await fetch("/api/calendar-events");
          if (!r.ok) throw Error();
          var d = await r.json(),
            rows = Array.isArray(d) ? d : d.events || [];
          el.innerHTML = rows.length
            ? rows
                .map(function (e) {
                  var url = safe(e.rsvpUrl);
                  return (
                    "<article><p>" +
                    esc(e.date || "") +
                    "</p><h3>" +
                    esc(e.title) +
                    "</h3><p>" +
                    esc(e.blurb || e.description || "") +
                    "</p>" +
                    (url
                      ? '<a class="btn btn-outline" href="' +
                        esc(url) +
                        '" target="_blank" rel="noopener noreferrer">Event details</a>'
                      : "") +
                    "</article>"
                  );
                })
                .join("")
            : "<p>No published events are scheduled right now.</p>";
        } catch (e) {
          el.textContent =
            "Events are temporarily unavailable. Please check back soon.";
        }
      });
  }
  function run() {
    navigation();
    events();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", run);
  else run();
  document.addEventListener("sane:settings-ready", navigation);
})();
