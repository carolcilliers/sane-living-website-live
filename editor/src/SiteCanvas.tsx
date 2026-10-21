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
  const assetMap: Record<string, string> = {};
  for (const a of assets) {
    if (
      !a ||
      !/^\/images\/studio-[a-f0-9-]{36}\.(png|jpe?g|webp|gif)$/.test(a.url) ||
      typeof a.base64 !== "string" ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(a.base64) ||
      a.base64.length > 1400000
    )
      continue;
    const ext = a.url.split(".").pop(),
      mime = ext === "jpg" || ext === "jpeg" ? "jpeg" : ext;
    assetMap[a.url] = "data:image/" + mime + ";base64," + a.base64;
    html = html
      .split('src="' + a.url + '"')
      .join('src="' + assetMap[a.url] + '"');
  }
  if (assets.length) {
    const map = JSON.stringify(assetMap).replace(/</g, "\\u003c");
    html = html.replace(
      "</head>",
      "<script>{const m=" +
        map +
        ';function swap(){document.querySelectorAll("img[src],video[poster]").forEach(e=>{const a=e.tagName==="VIDEO"?"poster":"src",u=e.getAttribute(a);if(m[u])e.setAttribute(a,m[u]);});document.querySelectorAll("[style]").forEach(e=>{for(const u in m)if(e.style.backgroundImage.includes(u))e.style.backgroundImage="url("+m[u]+")";});}document.addEventListener("sane:settings-ready",swap);document.addEventListener("DOMContentLoaded",swap);}</script></head>',
    );
  }
  const style =
    "<style>[data-animate],[data-animate-stagger]>*{opacity:1!important;transform:none!important;transition:none!important}" +
    (annotate
      ? "[data-studio-element]{cursor:pointer;outline-offset:-2px}[data-studio-element]:hover{outline:1px dashed #aa8bdb}[data-studio-drop]{outline:3px solid #c49bff!important;box-shadow:0 -4px #a47af2!important}[data-studio-element-selected]{outline:2px solid #b789ff!important}.video-hero-overlay{pointer-events:none!important}video{pointer-events:auto!important}[data-studio-block]{cursor:pointer;outline-offset:-2px}[data-studio-block]:hover{outline:1px solid #a181c4}[data-studio-selected]{outline:2px solid #8559ad!important}"
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
  select?: (id: string, element?: string) => void,
  move?: (from: string, to: string) => void,
  insert?: (type: string, after?: string, placement?: any) => void,
  tools?: CanvasTools,
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
  const win = frame.contentWindow!;
  const elementAt = (target: Element) => {
    if (target.matches(".video-hero,.video-hero-bg,.video-hero-overlay"))
      return (
        target
          .closest(".video-hero")
          ?.querySelector("[data-site-hero-video]") || target
      );
    const gallery = target.closest("[data-studio-carousel]");
    if (gallery && !target.hasAttribute("data-studio-element"))
      return gallery.querySelector("[data-studio-element]") || target;
    return target;
  };
  const selectedFrom = (target: Element) => {
    const el = elementAt(target);
    return {
      block:
        el.closest("[data-studio-block]")?.getAttribute("data-studio-block") ||
        "",
      element:
        el
          .closest("[data-studio-element]")
          ?.getAttribute("data-studio-element") || "",
    };
  };
  win.addEventListener(
    "click",
    (event) => {
      const e = event as MouseEvent,
        el = e.target as Element;
      const action = el
        .closest("[data-studio-action]")
        ?.getAttribute("data-studio-action");
      if (action) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const bar = d.getElementById("studio-canvas-tools")!;
        tools?.action?.(bar.dataset.block!, bar.dataset.element || "", action);
        return;
      }
      if (select) {
        const hit = selectedFrom(el);
        if (hit.block) {
          e.preventDefault();
          e.stopImmediatePropagation();
          select(hit.block, hit.element);
          return;
        }
      }
      if (!select && el.closest("[data-slide]")) return;
      const a = el.closest("a");
      if (!a) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const raw = a.getAttribute("href");
      if (!raw) return;
      try {
        const url = new URL(raw, d.baseURI);
        if (
          url.origin === location.origin &&
          url.pathname === route &&
          url.hash
        ) {
          d.getElementById(
            decodeURIComponent(url.hash.slice(1)),
          )?.scrollIntoView();
          return;
        }
        if (url.origin === location.origin) onLink(url.pathname);
        else notice("External links are inactive in draft preview.");
      } catch {
        notice("This link address is invalid.");
      }
    },
    true,
  );
  if (!select) return;
  d.querySelectorAll("[data-studio-element]").forEach((n) =>
    n.setAttribute("draggable", "true"),
  );
  let dragging: { block: string; element?: string } | null = null,
    free: any = null;
  win.addEventListener(
    "pointerdown",
    (event) => {
      const e = event as PointerEvent,
        target = e.target as Element;
      if (!target.closest("[data-studio-free]")) return;
      const bar = d.getElementById("studio-canvas-tools")!,
        element = bar.dataset.element || "";
      const el = d.querySelector<HTMLElement>(
        '[data-studio-block="' +
          bar.dataset.block +
          '"] [data-studio-element="' +
          element +
          '"]',
      );
      if (!el) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const current = (el.style.translate || "0px 0px")
        .split(" ")
        .map(parseFloat);
      free = {
        block: bar.dataset.block,
        element,
        el,
        startX: e.clientX,
        startY: e.clientY,
        x: current[0] || 0,
        y: current[1] || 0,
      };
      target.setPointerCapture?.(e.pointerId);
    },
    true,
  );
  win.addEventListener(
    "pointermove",
    (event) => {
      if (!free) return;
      const e = event as PointerEvent;
      free.dx = Math.round(e.clientX - free.startX);
      free.dy = Math.round(e.clientY - free.startY);
      free.el.style.position = "relative";
      free.el.style.translate =
        free.x + free.dx + "px " + (free.y + free.dy) + "px";
      event.preventDefault();
    },
    true,
  );
  win.addEventListener(
    "pointerup",
    () => {
      if (!free) return;
      tools?.offset?.(
        free.block,
        free.element,
        Math.max(-2000, Math.min(2000, free.x + (free.dx || 0))),
        Math.max(-2000, Math.min(2000, free.y + (free.dy || 0))),
      );
      free = null;
    },
    true,
  );
  win.addEventListener(
    "dragstart",
    (event) => {
      const e = event as DragEvent,
        target = e.target as Element,
        bar = target.closest("#studio-canvas-tools") as HTMLElement | null;
      const hit = bar
        ? {
            block: bar.dataset.block!,
            element: target.closest("[data-studio-section-drag]")
              ? ""
              : bar.dataset.element,
          }
        : selectedFrom(target);
      if (!hit.block) return;
      dragging = hit;
      e.dataTransfer?.setData(
        hit.element ? "application/sane-element" : "application/sane-section",
        JSON.stringify(hit),
      );
      if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    },
    true,
  );
  let indicator: HTMLElement | null = null;
  win.addEventListener(
    "dragover",
    (event) => {
      const e = event as DragEvent;
      e.preventDefault();
      if (e.dataTransfer)
        e.dataTransfer.dropEffect = dragging ? "move" : "copy";
      const target = (e.target as Element).closest(
        "[data-studio-element],[data-studio-block]",
      ) as HTMLElement | null;
      d.querySelectorAll("[data-studio-drop]").forEach((n) =>
        n.removeAttribute("data-studio-drop"),
      );
      if (target) {
        target.setAttribute("data-studio-drop", "");
        indicator = target;
      }
      if (e.clientY < 70) win.scrollBy(0, -18);
      else if (e.clientY > win.innerHeight - 70) win.scrollBy(0, 18);
    },
    true,
  );
  win.addEventListener(
    "drop",
    (event) => {
      const e = event as DragEvent;
      e.preventDefault();
      e.stopImmediatePropagation();
      indicator?.removeAttribute("data-studio-drop");
      const target = elementAt(e.target as Element),
        hit = selectedFrom(target),
        r = target.getBoundingClientRect(),
        after = e.clientY > r.top + r.height / 2;
      if (!dragging) {
        try {
          const data = JSON.parse(
            e.dataTransfer?.getData("application/sane-element") || "null",
          );
          if (
            data &&
            typeof data.block === "string" &&
            typeof data.element === "string"
          )
            dragging = data;
        } catch {}
      }
      const kind = e.dataTransfer?.getData("application/sane-block");
      if (kind && core.TYPES.includes(kind) && insert) {
        insert(
          kind,
          hit.block,
          tools?.placement?.(hit.block, hit.element, after),
        );
      } else if (dragging?.element && hit.element)
        tools?.reorder?.(
          dragging.block,
          dragging.element,
          hit.block,
          hit.element,
          after,
        );
      else if (dragging?.block && hit.block && move)
        move(dragging.block, hit.block);
      dragging = null;
    },
    true,
  );
  win.addEventListener(
    "dragend",
    () => {
      dragging = null;
      indicator?.removeAttribute("data-studio-drop");
    },
    true,
  );
}
export interface CanvasTools {
  action?: (block: string, element: string, action: string) => void;
  offset?: (block: string, element: string, x: number, y: number) => void;
  reorder?: (
    block: string,
    element: string,
    targetBlock: string,
    target: string,
    after: boolean,
  ) => void;
  placement?: (block: string, element: string, after: boolean) => any;
}
export function SiteCanvas({
  page,
  project,
  registry,
  resources,
  assets,
  width,
  selected,
  selectedElement,
  tools,
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
  selectedElement?: string;
  tools?: CanvasTools;
  select: (id: string, element?: string) => void;
  move: (from: string, to: string) => void;
  insert: (type: string, after?: string, placement?: any) => void;
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
  const refs = useRef({ select, move, insert, notice, onLink, tools });
  refs.current = { select, move, insert, notice, onLink, tools };
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
  const [html, setHtml] = useState(() =>
    htmlFor(page, project, registry, resources, assets, true),
  );
  const htmlRef = useRef(html);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = htmlFor(page, project, registry, resources, assets, true);
      if (next === htmlRef.current) return;
      scroll.current =
        renderedPage.current === page.id
          ? frame.current?.contentWindow?.scrollY || 0
          : 0;
      renderedPage.current = page.id;
      htmlRef.current = next;
      setReady(false);
      setFailed(false);
      setHtml(next);
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
    let cleanup: (() => void) | undefined;
    let active: Element | undefined;
    frame.current?.contentDocument
      ?.querySelectorAll("[data-studio-block]")
      .forEach((n) => {
        const hit = n.getAttribute("data-studio-block") === selected;
        n.toggleAttribute("data-studio-selected", hit);
        if (hit) active = n;
      });
    const d = frame.current?.contentDocument;
    d?.querySelectorAll("[data-studio-element-selected]").forEach((n) =>
      n.removeAttribute("data-studio-element-selected"),
    );
    d?.getElementById("studio-canvas-tools")?.remove();
    if (d && active) {
      const chosen = selectedElement
        ? active.querySelector<HTMLElement>(
            '[data-studio-element="' + selectedElement + '"]',
          )
        : null;
      (chosen || active).setAttribute("data-studio-element-selected", "");
      const bar = d.createElement("div");
      bar.id = "studio-canvas-tools";
      bar.dataset.block = selected;
      bar.dataset.element = selectedElement || "";
      bar.style.cssText =
        "position:fixed;z-index:2147483647;display:flex;flex-wrap:wrap;gap:4px;padding:5px;background:#282331;color:#fff;border:1px solid #a88ad1;border-radius:7px;box-shadow:0 4px 20px #0005;font:12px system-ui;max-width:95vw";
      bar.innerHTML =
        '<button draggable="true" data-studio-section-drag>↕ Section</button>' +
        (chosen
          ? '<button draggable="true">↕ Drag element</button><button data-studio-free title="Drag this handle to move freely on desktop">✥ Move freely</button><button data-studio-action="up" aria-label="Move element up">↑</button><button data-studio-action="down" aria-label="Move element down">↓</button><button data-studio-action="remove">Remove</button>'
          : "");
      const zoom =
        frame.current!.getBoundingClientRect().width /
          frame.current!.offsetWidth || 1;
      bar.style.fontSize = 12 / zoom + "px";
      bar
        .querySelectorAll("button")
        .forEach(
          (b) =>
            (b.style.cssText =
              "background:#3c3348;color:#fff;border:0;border-radius:4px;padding:" +
              6 / zoom +
              "px;cursor:grab;font:inherit"),
        );
      d.body.append(bar);
      const position = () => {
        const r = (chosen || active!).getBoundingClientRect();
        bar.style.top =
          Math.max(
            4,
            Math.min(
              frame.current!.contentWindow!.innerHeight - 45,
              r.top - 38,
            ),
          ) + "px";
        bar.style.left =
          Math.max(
            4,
            Math.min(
              frame.current!.contentWindow!.innerWidth - bar.offsetWidth - 4,
              r.left,
            ),
          ) + "px";
      };
      position();
      const win = frame.current?.contentWindow;
      win?.addEventListener("scroll", position, { passive: true });
      cleanup = () => win?.removeEventListener("scroll", position);
    }
    if (active && lastSelection.current !== selected) {
      active.scrollIntoView({ block: "center" });
      lastSelection.current = selected;
    }
    return cleanup;
  }
  useEffect(selection, [selected, selectedElement, ready, width, size.width]);

  function loaded() {
    const f = frame.current;
    if (!f) return;
    prepareFrame(
      f,
      page.route,
      (r) => refs.current.onLink(r),
      (s) => refs.current.notice(s),
      (id, element) => refs.current.select(id, element),
      (a, b) => refs.current.move(a, b),
      (type, after, placement) => refs.current.insert(type, after, placement),
      {
        action: (...args) => refs.current.tools?.action?.(...args),
        offset: (...args) => refs.current.tools?.offset?.(...args),
        reorder: (...args) => refs.current.tools?.reorder?.(...args),
        placement: (...args) => refs.current.tools?.placement?.(...args),
      },
    );
    f.contentWindow?.scrollTo(0, scroll.current);
    setReady(true);
    setFailed(false);
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
