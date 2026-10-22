import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { patchDocument, updateStyles, designStyles, structureKey, resolveAssets } from "./live-canvas";
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
      ? "[data-studio-element]{cursor:pointer;outline-offset:-2px;transition:none!important;animation:none!important}[data-studio-block]{transition:none!important;animation:none!important}[data-studio-element]:hover{outline:1px dashed #aa8bdb}[data-studio-drop=before-x]{box-shadow:-4px 0 #c49bff!important}[data-studio-drop=after-x]{box-shadow:4px 0 #c49bff!important}[data-studio-drop=inside]{outline:2px solid #c49bff!important}[data-studio-drop=before]{box-shadow:0 -3px #a47af2!important}[data-studio-drop=after]{box-shadow:0 3px #a47af2!important}[data-studio-element-selected]{outline:2px solid #b789ff!important}.video-hero-overlay{pointer-events:none!important}video{pointer-events:auto!important}[data-studio-block]{cursor:pointer;outline-offset:-2px}[data-studio-block]:hover{outline:1px solid #a181c4}[data-studio-selected]{outline:2px solid #8559ad!important}"
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
    Array.from(n.attributes).filter(a=>a.name.startsWith("data-studio-") || a.name==="style").forEach(a=>el.setAttribute(a.name,a.value));
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
  const movementUnit = (target: Element): HTMLElement => {
    const part=target.closest<HTMLElement>("[data-studio-element]") || target as HTMLElement;
    const owner=part.dataset.studioDragOwner,block=part.closest("[data-studio-block]");
    return owner ? (block?.querySelector<HTMLElement>('[data-studio-element="'+owner+'"]') || part) : part;
  };
  const movingCard = () => {
    if(!dragging?.element)return false;
    return !!d.querySelector('[data-studio-block="'+dragging.block+'"] [data-studio-element="'+dragging.element+'"][data-studio-drag-owner]');
  };
  const horizontalCard = (target: HTMLElement) => {
    const parent=target.parentElement;if(!parent)return false;
    const style=win.getComputedStyle(parent);
    return (style.display==='grid' && style.gridTemplateColumns.split(' ').length>1) || (style.display==='flex' && style.flexDirection==='row');
  };
  const selectedFrom = (target: Element) => {
    const el = elementAt(target);
    return {
      block:
        el.closest("[data-studio-block]")?.getAttribute("data-studio-block") ||
        "",
      element: el.closest("[data-studio-part]") ? "part:"+el.closest("[data-studio-part]")!.getAttribute("data-studio-part") :
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
      const boundary = el.closest("[data-studio-boundary]") as HTMLElement | null;
      if (boundary && select) {
        e.preventDefault(); e.stopImmediatePropagation();
        tools?.pickInsert?.(boundary.dataset.block!, {boundary:boundary.dataset.studioBoundary});
        return;
      }
      if(el.closest("[data-studio-toolbar-close],[data-studio-toolbar-grip]")) return;
      const action = el
        .closest("[data-studio-action]")
        ?.getAttribute("data-studio-action");
      const mediaAction = el.closest("[data-studio-media-play]");
      if(mediaAction){e.preventDefault();e.stopImmediatePropagation();const bar=d.getElementById("studio-canvas-tools")!;const owner=d.querySelector('[data-studio-block="'+bar.dataset.block+'"]');const video=owner?.querySelector<HTMLVideoElement>('video');if(video){if(!video.paused)video.pause();else {video.muted=true;void video.play().catch(()=>notice("This video could not play. Check its direct MP4/WebM address and file format."));}}return;}
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
          const bar=d.getElementById("studio-canvas-tools");
          if(bar?.dataset.selection===hit.block+":"+hit.element){bar.hidden=false;bar.style.display="flex";}
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
      const grip = target.closest("[data-studio-toolbar-grip]");
      if(grip){const bar=grip.closest<HTMLElement>("#studio-canvas-tools")!;const r=bar.getBoundingClientRect();free={toolbar:true,bar,startX:e.clientX,startY:e.clientY,x:r.left,y:r.top,originalStyle:bar.style.cssText};target.setPointerCapture?.(e.pointerId);e.preventDefault();e.stopImmediatePropagation();return;}
      if (!target.closest("[data-studio-free],[data-studio-resize]")) return;
      const bar = d.getElementById("studio-canvas-tools")!,
        element = bar.dataset.element || "";
      const picked = element.startsWith("part:") ? d.querySelector<HTMLElement>('[data-studio-block="'+bar.dataset.block+'"] [data-studio-part="'+element.slice(5)+'"]') : element ? d.querySelector<HTMLElement>(
        '[data-studio-block="' + bar.dataset.block + '"][data-studio-element="' + element + '"], [data-studio-block="' + bar.dataset.block + '"] [data-studio-element="' + element + '"]',
      ) : d.querySelector<HTMLElement>('[data-studio-block="'+bar.dataset.block+'"]');
      if (!picked) return;
      const el=element.startsWith("part:") ? picked.closest<HTMLElement>("[data-studio-block]")! : movementUnit(picked), movementID=el.getAttribute("data-studio-element") || element;
      e.preventDefault();
      e.stopImmediatePropagation();
      const current = tools?.coordinates?.(bar.dataset.block!,movementID) || (win.getComputedStyle(el).translate || "0px 0px").split(" ").map(parseFloat);
      free = {
        block: bar.dataset.block,
        element:movementID,
        el,
        startX: e.clientX,
        startY: e.clientY,
        x: current[0] || 0,
        y: current[1] || 0,
        originalStyle: el.style.cssText,
        resize: !!target.closest("[data-studio-resize]"),
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        parentWidth: el.parentElement?.getBoundingClientRect().width || win.innerWidth,
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
      if(free.toolbar){free.bar.style.left=Math.max(4,Math.min(win.innerWidth-free.bar.offsetWidth-4,free.x+e.clientX-free.startX))+"px";free.bar.style.top=Math.max(4,Math.min(win.innerHeight-free.bar.offsetHeight-4,free.y+e.clientY-free.startY))+"px";free.bar.dataset.pinned="true";event.preventDefault();return;}
      free.dx = Math.round(e.clientX - free.startX);
      free.dy = Math.round(e.clientY - free.startY);
      if (free.resize) {
        free.el.style.setProperty("width", Math.max(1,Math.min(100,Math.round((free.width + free.dx)/free.parentWidth*100))) + "%", "important");
        free.el.style.setProperty("height", Math.max(0,Math.min(2000,free.height+free.dy)) + "px", "important");
        event.preventDefault(); return;
      }
      free.el.style.setProperty("position", "relative", "important");
      free.el.style.setProperty("translate", free.x + free.dx + "px " + (free.y + free.dy) + "px", "important");
      event.preventDefault();
    },
    true,
  );
  win.addEventListener("pointercancel", () => { if(free){(free.toolbar?free.bar:free.el).style.cssText=free.originalStyle;free=null;} },true);
  win.addEventListener(
    "pointerup",
    () => {
      if (!free) return;
      if(free.toolbar){free=null;return;}
      free.el.style.cssText=free.originalStyle;
      if (free.resize) {
        tools?.resize?.(free.block,free.element,Math.max(1,Math.min(100,Math.round((free.width+(free.dx||0))/free.parentWidth*100))),Math.round(Math.max(0,Math.min(2000,free.height+(free.dy||0)))));
        free = null; return;
      }
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
      if(hit.element) {
        const selected=d.querySelector('[data-studio-block="'+hit.block+'"] [data-studio-element="'+hit.element+'"]');
        if(selected)hit.element=movementUnit(selected).dataset.studioElement;
      }
      if(hit.element === "content" || hit.element?.startsWith("part:"))hit.element="";
      dragging = hit;
      const toolbar=d.getElementById("studio-canvas-tools");if(toolbar)toolbar.style.pointerEvents="none";
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
      let target = (e.target as Element).closest(
        "[data-studio-element],[data-studio-block]",
      ) as HTMLElement | null;
      if(target && movingCard())target=movementUnit(target);
      const boundary = (e.target as Element).closest("[data-studio-boundary]");
      d.querySelectorAll("[data-studio-drop]").forEach((n) =>
        n.removeAttribute("data-studio-drop"),
      );
      if (boundary || target) {
        const r=(boundary || target)!.getBoundingClientRect();
        const edge=target && movingCard() ? (horizontalCard(target) ? (e.clientX<r.left+r.width/2?'before-x':'after-x') : (e.clientY<r.top+r.height/2?'before':'after')) : e.clientY<r.top+r.height*.25?'before':e.clientY>r.bottom-r.height*.25?'after':'inside';
        (boundary || target)!.setAttribute("data-studio-drop", boundary?boundary.getAttribute('data-studio-boundary') || edge:edge);
        indicator = (boundary || target) as HTMLElement;
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
      const boundary = (e.target as Element).closest("[data-studio-boundary]") as HTMLElement | null;
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
      const card=movingCard(), target=card ? movementUnit(e.target as Element) : elementAt(e.target as Element), hit=selectedFrom(target), r=target.getBoundingClientRect();
      const after=card && horizontalCard(target as HTMLElement) ? e.clientX>r.left+r.width/2 : e.clientY>r.top+r.height/2;
      const inside=!card && e.clientY>r.top+r.height*.25 && e.clientY<r.bottom-r.height*.25;
      const kind = e.dataTransfer?.getData("application/sane-block");
      const destination = boundary ? {boundary:boundary.dataset.studioBoundary} : tools?.placement?.(hit.block, hit.element, after);
      const destinationBlock = boundary?.dataset.block || hit.block;
      const targetAfter = boundary ? boundary.dataset.studioBoundary === "after" : after;
      let sectionDrag: any = null;
      try {sectionDrag = JSON.parse(e.dataTransfer?.getData("application/sane-section") || "null");}catch{}
      if (kind && core.TYPES.includes(kind) && insert) {
        insert(
          kind,
          destinationBlock,
          destination,
        );
      } else if ((sectionDrag?.block || (dragging?.block && !dragging.element)) && destinationBlock) {
        tools?.placeBlock?.(sectionDrag?.block || dragging!.block, destinationBlock, targetAfter, destination);
      } else if (dragging?.element && hit.element)
        tools?.reorder?.(
          dragging.block,
          dragging.element,
          hit.block,
          hit.element,
          after,
          inside,
        );
      else if (dragging?.block && hit.block && move)
        move(dragging.block, hit.block);
      dragging = null;
      const toolbar=d.getElementById("studio-canvas-tools");if(toolbar)toolbar.style.pointerEvents="";
    },
    true,
  );
  const refreshLines = () => {
    d.querySelectorAll("[data-studio-boundary]").forEach(n=>n.remove());
    const blocks=Array.from(d.querySelectorAll<HTMLElement>("[data-studio-block]")).filter(n=>!n.parentElement?.closest("[data-studio-block]"));
    const entries=blocks.map(target=>({target,after:false}));if(blocks.length)entries.push({target:blocks[blocks.length-1],after:true});
    for(const {target,after} of entries){
      const el=d.createElement("button"),r=target.getBoundingClientRect();el.type="button";el.dataset.studioBoundary=after?"after":"before";el.dataset.block=target.dataset.studioBlock;
      el.setAttribute("aria-label",(after?"Insert after ":"Insert before ")+target.dataset.studioBlock);
      el.innerHTML='<span style="display:inline-block;background:#493659;color:#fff;padding:3px 12px;border-radius:9px">+ Insert here</span>';
      el.style.cssText="position:absolute;left:12px;right:12px;z-index:2147483600;height:22px;border:0;background:linear-gradient(#ab8bce,#ab8bce) center/100% 1px no-repeat;color:white;font:14px system-ui;cursor:copy;opacity:.6;top:"+Math.max(0,win.scrollY+(after?r.bottom:r.top)-12)+"px";d.body.append(el);
    }
  };
  refreshLines();d.addEventListener("studio:layout-updated",refreshLines);
  win.addEventListener("resize",refreshLines);win.addEventListener("load",refreshLines);
  let resizeFrame=0;const observer=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(refreshLines);});observer.observe(d.body);
  win.addEventListener("pagehide",()=>{observer.disconnect();cancelAnimationFrame(resizeFrame);},{once:true});
  win.addEventListener(
    "dragend",
    () => {
      dragging = null;
      const toolbar=d.getElementById("studio-canvas-tools");if(toolbar)toolbar.style.pointerEvents="";
      indicator?.removeAttribute("data-studio-drop");
    },
    true,
  );
}
export interface CanvasTools {
  coordinates?: (block:string,element:string) => number[];
  pickInsert?: (block:string, placement:any) => void;
  placeBlock?: (from:string,target:string,after:boolean,placement?:any) => void;
  resize?: (block:string,element:string,width:number,height:number) => void;
  action?: (block: string, element: string, action: string) => void;
  offset?: (block: string, element: string, x: number, y: number) => void;
  reorder?: (
    block: string,
    element: string,
    targetBlock: string,
    target: string,
    after: boolean,
    inside?: boolean,
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
  const [paint, setPaint] = useState(0);
  const liveState = useRef<{structure:string;resources:string;assets:string;nav:string} | null>(null);
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
  const [html, setHtml] = useState(() => htmlFor(page, project, registry, resources, assets, true));
  const htmlRef = useRef(html);
  const latest = useRef({page,project,registry,resources,assets});
  latest.current={page,project,registry,resources,assets};
  const stateFor = () => ({structure:structureKey(page),resources:JSON.stringify(resources),assets:JSON.stringify(assets),nav:JSON.stringify(project.pages.filter(p=>p.id.startsWith("custom--")).map(p=>({route:p.route,name:p.name,menu:p.menu}))) });
  useLayoutEffect(() => {
    if(renderedPage.current !== page.id) {
      renderedPage.current=page.id;scroll.current=0;liveState.current=null;
      const next=htmlFor(page,project,registry,resources,assets,true);htmlRef.current=next;setReady(false);setFailed(false);setHtml(next);return;
    }
    const doc=frame.current?.contentDocument;
    if(!ready || !doc?.body)return;
    const nextState=stateFor(), previous=liveState.current;
    if(previous && previous.structure===nextState.structure && previous.resources===nextState.resources && previous.assets===nextState.assets && previous.nav===nextState.nav) {
      designStyles(doc,page);doc.dispatchEvent(new Event("studio:layout-updated"));return;
    }
    const timer=setTimeout(()=>{
      const f=frame.current;if(!f?.contentDocument || !f.contentWindow)return;
      const next=htmlFor(page,project,registry,resources,assets,true);
      if(next!==htmlRef.current){
        const oldDocument=new DOMParser().parseFromString(htmlRef.current,"text/html"),nextDocument=new DOMParser().parseFromString(next,"text/html"),y=f.contentWindow.scrollY;
        patchDocument(f.contentDocument,oldDocument,nextDocument);
        f.contentDocument.querySelectorAll("iframe,object,embed").forEach(n=>{const p=f.contentDocument!.createElement("div");Array.from(n.attributes).filter(a=>a.name.startsWith("data-studio-")||a.name==="style").forEach(a=>p.setAttribute(a.name,a.value));p.className="studio-preview-integration";p.textContent=(n.getAttribute("title")||"Embedded form or media")+" · preview only";n.replaceWith(p);});
        const win=f.contentWindow as any;
        const map=win.__SANE_PREVIEW_RESOURCES__;
        if(map)for(const k of ["settings","gallery","weddings","pricing","partners"])try{map['/content/'+k+'.json']=JSON.parse(resources[k]||'{}');}catch{}
        if(previous?.resources!==nextState.resources || previous?.structure!==nextState.structure)win.SaneSite?.apply(core.settings.normalize(JSON.parse(resources.settings||"{}")));
        resolveAssets(f.contentDocument,assets);designStyles(f.contentDocument,page);
        f.contentDocument.dispatchEvent(new Event("sane:studio-updated"));f.contentDocument.dispatchEvent(new Event("studio:layout-updated"));
        f.contentWindow.scrollTo(0,y);htmlRef.current=next;
      }
      liveState.current=nextState;setPaint(n=>n+1);
    },60);
    return ()=>clearTimeout(timer);
  },[page,project,registry,resources,assets,ready]);
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
    const previousBar = d?.getElementById("studio-canvas-tools");
    const sameBar = previousBar?.dataset.selection === selected+":"+(selectedElement || "");
    if(!sameBar)previousBar?.remove();
    if (d && active) {
      const selector = selectedElement?.startsWith("part:") ? '[data-studio-part="'+selectedElement.slice(5)+'"]' : '[data-studio-element="' + selectedElement + '"]';
      const chosen = selectedElement
        ? active.matches(selector) ? active as HTMLElement : active.querySelector<HTMLElement>(selector)
        : null;
      (chosen || active).setAttribute("data-studio-element-selected", "");
      const bar = sameBar ? previousBar! : d.createElement("div");
      bar.id = "studio-canvas-tools";
      bar.dataset.selection=selected+":"+(selectedElement || "");
      bar.dataset.block = selected;
      bar.dataset.element = selectedElement || "";
      if(!sameBar)bar.style.cssText =
        "position:fixed;z-index:2147483647;display:flex;flex-wrap:wrap;gap:4px;padding:5px;background:#29262e;color:#f5f2f7;border:1px solid #514a5b;border-radius:10px;box-shadow:0 8px 24px #0003;font:12px system-ui;max-width:95vw";
      const added=page.blocks.find(b=>b.id===selected && !b.source),imageSelected=chosen?.tagName==="IMG" || added?.type==="image";
      if(!sameBar)bar.innerHTML =
        '<button data-studio-toolbar-grip aria-label="Move toolbar" title="Drag this grip to move the toolbar">⠿</button>'+(!chosen && !added ? '<button draggable="true" data-studio-section-drag>↕ Section</button>' : '') +
        (chosen || added
          ? '<button draggable="true">↕ '+(chosen?.dataset.studioDragOwner?'Drag card':imageSelected?'Drag image':'Drag element')+'</button><button data-studio-free title="Drag to move on the current device layout">✥ Move freely</button><button data-studio-resize title="Drag to resize on the current device layout">⤡ Resize</button><button data-studio-action="remove">'+(imageSelected?'Remove image':'Remove')+'</button>'
          : "") + ((chosen?.tagName === "VIDEO" || (chosen || active)?.querySelector("video")) ? '<button data-studio-media-play aria-label="Play / pause video">▶ / Ⅱ Video</button>' : '') + '<button data-studio-toolbar-close aria-label="Close element toolbar" title="Hide controls; your selection stays active">×</button>';
      bar.querySelector<HTMLButtonElement>("[data-studio-toolbar-close]")!.onclick=()=>{bar.hidden=true;bar.style.display="none";};
      const zoom =
        frame.current!.getBoundingClientRect().width /
          frame.current!.offsetWidth || 1;
      bar.style.fontSize = 12 / zoom + "px";
      bar
        .querySelectorAll("button")
        .forEach(
          (b) =>
            (b.style.cssText =
              "background:#37323e;color:#f5f2f7;border:0;border-radius:6px;padding:" +
              6 / zoom +
              "px;cursor:grab;font:inherit;touch-action:none"),
        );
      if(!sameBar)d.body.append(bar);
      const position = () => {
        if(bar.dataset.pinned)return;
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
      d.addEventListener("studio:layout-updated",position);
      cleanup = () => {win?.removeEventListener("scroll", position);d.removeEventListener("studio:layout-updated",position);};
    }
    if (active && lastSelection.current !== selected) {
      active.scrollIntoView({ block: "center" });
      lastSelection.current = selected;
    }
    return cleanup;
  }
  useEffect(selection, [selected, selectedElement, ready, width, size.width, paint]);

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
        coordinates: (...args) => refs.current.tools?.coordinates?.(...args) || [0,0],
        action: (...args) => refs.current.tools?.action?.(...args),
        resize: (...args) => refs.current.tools?.resize?.(...args),
        placeBlock: (...args) => refs.current.tools?.placeBlock?.(...args),
        pickInsert: (...args) => refs.current.tools?.pickInsert?.(...args),
        offset: (...args) => refs.current.tools?.offset?.(...args),
        reorder: (...args) => refs.current.tools?.reorder?.(...args),
        placement: (...args) => refs.current.tools?.placement?.(...args),
      },
    );
    updateStyles(f.contentDocument!,new DOMParser().parseFromString(htmlRef.current,"text/html"));
    designStyles(f.contentDocument!,latest.current.page);
    liveState.current=stateFor();
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
      {selected ? <button className="canvas-show-tools" onClick={()=>{const bar=frame.current?.contentDocument?.getElementById("studio-canvas-tools");if(bar){bar.hidden=false;bar.style.display="flex";}}}>Element controls</button> : null}
      <div
        className="site-viewport"
        style={{ width: width * scale, height: size.height }}
      >
        <iframe
          ref={frame}
          title="Website design canvas"
          sandbox="allow-same-origin allow-scripts"
          allow="autoplay; fullscreen; picture-in-picture"
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
