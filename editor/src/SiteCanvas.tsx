import { useEffect, useRef, useState } from "react";
import core from "../../content-core/site.cjs";
import type { Page, Project, Registry, Asset } from "./site-types";
export function htmlFor(
  page: Page,
  project: Project,
  registry: Registry[],
  resources: Record<string, string>,
  assets: Asset[],
  annotate: boolean,
) {
  let html = core.renderPage(page, project, registry, resources, {
    draft: true,
    snapshot: true,
    annotate,
  });
  // The base is trusted and fixed; staged bytes never become public until an explicit release.
  html = html.replace("<head>", '<head><base href="' + location.origin + '/">');
  for (const a of assets) {
    const ext = a.url.split(".").pop(),
      mime = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext;
    html = html.split(a.url).join("data:image/" + mime + ";base64," + a.base64);
  }
  const style =
    "<style>[data-animate],[data-animate-stagger]>*{opacity:1!important;transform:none!important;transition:none!important}" +
    (annotate
      ? "[data-studio-block]{cursor:pointer;outline-offset:-2px}[data-studio-block]:hover{outline:1px solid #a181c4}[data-studio-selected]{outline:2px solid #8559ad!important}"
      : "") +
    "</style>";
  return html.replace(
    "</head>",
    style +
      '<meta name="sane-preview-route" content="' +
      page.route +
      '"></head>',
  );
}
export function prepareFrame(
  frame: HTMLIFrameElement,
  route: string,
  onLink: (route: string) => void,
  notice: (message: string) => void,
  select?: (id: string) => void,
  move?: (from: string, to: string) => void,
  insert?: (type: string, after?: string) => void,
) {
  const d = frame.contentDocument;
  if (!d?.body) return;
  d.querySelectorAll("#site-nav a.active").forEach((n) =>
    n.classList.remove("active"),
  );
  d.querySelectorAll("#site-nav a[href]").forEach((n) => {
    if (n.getAttribute("href") === route) n.classList.add("active");
  });
  d.querySelectorAll("iframe,object,embed").forEach((n) => {
    const el = d.createElement("div");
    el.className = "studio-preview-integration";
    el.textContent =
      (n.getAttribute("title") || "Embedded form or media") + " · preview only";
    n.replaceWith(el);
  });
  d.addEventListener(
    "submit",
    (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      notice("Forms are disabled in draft preview. Nothing was submitted.");
    },
    true,
  );
  d.addEventListener(
    "click",
    (e) => {
      const el = e.target as Element,
        block = el.closest("[data-studio-block]");
      if (select && block) {
        e.preventDefault();
        e.stopImmediatePropagation();
        select(block.getAttribute("data-studio-block")!);
        return;
      }
      const a = el.closest("a");
      if (a) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const raw = a.getAttribute("href");
        if (raw) {
          if (raw.startsWith("#")) {
            d.getElementById(
              decodeURIComponent(raw.slice(1)),
            )?.scrollIntoView();
            return;
          }
          const url = new URL(raw, location.origin);
          if (url.pathname === route && url.hash) {
            d.getElementById(
              decodeURIComponent(url.hash.slice(1)),
            )?.scrollIntoView();
            return;
          }
          if (url.origin === location.origin) onLink(url.pathname);
          else notice("External links are inactive in draft preview.");
        }
      }
    },
    true,
  );
  let dragging = "";
  if (move) {
    d.querySelectorAll("[data-studio-block]").forEach((n) =>
      n.setAttribute("draggable", "true"),
    );
    d.addEventListener("dragstart", (e) => {
      const el = (e.target as Element).closest("[data-studio-block]");
      if (!el) {
        e.preventDefault();
        return;
      }
      dragging = el.getAttribute("data-studio-block")!;
      e.dataTransfer?.setData("text/plain", dragging);
    });
    d.addEventListener("dragover", (e) => e.preventDefault());
    d.addEventListener("drop", (e) => {
      e.preventDefault();
      const target = (e.target as Element)
        .closest("[data-studio-block]")
        ?.getAttribute("data-studio-block");
      const kind = e.dataTransfer?.getData("application/sane-block");
      if (kind && core.TYPES.includes(kind) && insert)
        insert(kind, target || undefined);
      else if (target && dragging) move(dragging, target);
      dragging = "";
    });
    d.addEventListener("dragend", () => {
      dragging = "";
    });
  }
}
export function SiteCanvas({
  page,
  project,
  registry,
  resources,
  assets,
  width,
  selected,
  select,
  move,
  insert,
  notice,
  onLink,
}: {
  page: Page;
  project: Project;
  registry: Registry[];
  resources: Record<string, string>;
  assets: Asset[];
  width: number;
  selected: string;
  select: (id: string) => void;
  move: (from: string, to: string) => void;
  insert: (type: string, after?: string) => void;
  notice: (s: string) => void;
  onLink: (s: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    host = useRef<HTMLDivElement>(null),
    scroll = useRef(0),
    renderedPage = useRef(page.id),
    lastSelection = useRef("");
  const [size, setSize] = useState({ width: 700, height: 650 }),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const refs = useRef({ select, move, insert, notice, onLink });
  refs.current = { select, move, insert, notice, onLink };
  useEffect(() => {
    const n = host.current;
    if (!n) return;
    const o = new ResizeObserver(() =>
      setSize({
        width: Math.max(200, n.clientWidth - 40),
        height: Math.max(200, n.clientHeight - 40),
      }),
    );
    o.observe(n);
    return () => o.disconnect();
  }, []);
  // Render after typing settles; large staged image strings stay out of urgent input work.
  const [html, setHtml] = useState(() => htmlFor(page, project, registry, resources, assets, true));
  const htmlRef = useRef(html);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = htmlFor(page, project, registry, resources, assets, true);
      if (next === htmlRef.current) return;
      scroll.current = renderedPage.current === page.id ? frame.current?.contentWindow?.scrollY || 0 : 0;
      renderedPage.current = page.id;
      htmlRef.current = next;
      setReady(false);setFailed(false);setHtml(next);
    }, 280);
    return () => clearTimeout(t);
  }, [page, project, registry, resources, assets]);
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setFailed(true), 20000);
    return () => clearTimeout(t);
  }, [html, ready]);
  const scale = Math.min(1, size.width / width);
  function selection() {
    let active: Element | undefined;
    frame.current?.contentDocument
      ?.querySelectorAll("[data-studio-block]")
      .forEach((n) => {
        const hit = n.getAttribute("data-studio-block") === selected;
        n.toggleAttribute("data-studio-selected", hit);
        if (hit) active = n;
      });
    if (active && lastSelection.current !== selected) {
      active.scrollIntoView({ block: "center" });
      lastSelection.current = selected;
    }
  }
  useEffect(selection, [selected, ready]);

  function loaded() {
    const f = frame.current;
    if (!f) return;
    prepareFrame(
      f,
      page.route,
      (r) => refs.current.onLink(r),
      (s) => refs.current.notice(s),
      (id) => refs.current.select(id),
      (a, b) => refs.current.move(a, b),
      (type, after) => refs.current.insert(type, after),
    );
    f.contentWindow?.scrollTo(0, scroll.current);
    setReady(true);
    setFailed(false);
    selection();
  }
  return (
    <div className="site-canvas" ref={host}>
      {!ready ? (
        <div className="canvas-state" role="status">
          {failed
            ? "The preview is taking longer than expected. Your draft is retained."
            : "Rendering your page…"}
        </div>
      ) : null}
      <div
        className="site-viewport"
        style={{ width: width * scale, height: size.height }}
      >
        <iframe
          ref={frame}
          title="Website design canvas"
          sandbox="allow-same-origin allow-scripts"
          srcDoc={html}
          onLoad={loaded}
          style={{
            width,
            height: size.height / scale,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            visibility: ready ? "visible" : "hidden",
          }}
        />
      </div>
    </div>
  );
}
