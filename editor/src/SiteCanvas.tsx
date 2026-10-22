import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { patchDocument, updateStyles, designStyles, structureKey, resolveAssets } from "./live-canvas";
import core from "../../content-core/site.cjs";
import { LAYOUTS } from "./LayoutLibrary";
import type { Page, Project, Registry, Asset } from "./site-types";
// Workspace preferences are independent of draft content and published layouts.
const toolbarKey = "sane-studio-toolbar-v1";
type ToolbarLayout = { x?: number; y?: number; hidden?: boolean };
function toolbarLayout(): ToolbarLayout {
  try {
    const value = JSON.parse(localStorage.getItem(toolbarKey) || "{}");
    return { x: Number.isFinite(value.x) ? value.x : undefined, y: Number.isFinite(value.y) ? value.y : undefined, hidden: value.hidden === true };
  } catch { return {}; }
}
function saveToolbarLayout(change: ToolbarLayout) {
  try { localStorage.setItem(toolbarKey, JSON.stringify({...toolbarLayout(), ...change})); } catch { /* Session positioning still works when storage is unavailable. */ }
}
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
    // Background rules live in a stylesheet, not an inline style attribute.
    for(const [url,data] of Object.entries(assetMap))html=html.split('url("'+url+'")').join('url("'+data+'")');
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
      ? "[data-studio-tool=move] :is([data-studio-element],[data-studio-block],[data-studio-part]){cursor:move!important}[data-studio-tool=resize] :is([data-studio-element],[data-studio-block],[data-studio-part]){cursor:nwse-resize!important}#studio-canvas-tools button[aria-pressed=true]{background:#725582!important;color:white!important}[data-studio-boundary][aria-pressed=true]{opacity:1!important;filter:brightness(1.2)}[data-studio-boundary]:hover{opacity:1!important}[data-studio-part]{transition:none!important;animation:none!important}[data-studio-element]{cursor:pointer;outline-offset:-2px;transition:none!important;animation:none!important}[data-studio-block]{transition:none!important;animation:none!important}[data-studio-element]:hover{outline:1px dashed #aa8bdb}[data-studio-drop=before-x]{box-shadow:-4px 0 #c49bff!important}[data-studio-drop=after-x]{box-shadow:4px 0 #c49bff!important}[data-studio-drop=inside]{outline:2px solid #c49bff!important}[data-studio-drop=before]{box-shadow:0 -3px #a47af2!important}[data-studio-drop=after]{box-shadow:0 3px #a47af2!important}[data-studio-element-selected]{outline:2px solid #b789ff!important}.video-hero-overlay{pointer-events:none!important}video{pointer-events:auto!important}[data-studio-block]{cursor:pointer;outline-offset:-2px}[data-studio-block]:hover{outline:1px solid #a181c4}[data-studio-selected]{outline:2px solid #8559ad!important}"
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
          ?.querySelector("[data-site-hero-video],video") || target
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
    const owner=el.closest("[data-studio-block]"), part=el.closest("[data-studio-part]"), element=el.closest("[data-studio-element]");
    return {block:owner?.getAttribute("data-studio-block") || "",element:el===owner ? "" : part?.closest("[data-studio-block]")===owner ? "part:"+part.getAttribute("data-studio-part") : element?.closest("[data-studio-block]")===owner ? element.getAttribute("data-studio-element") || "" : ""};
  };
  win.addEventListener(
    "click",
    (event) => {
      const e = event as MouseEvent,
        el = e.target as Element;
      const boundary = el.closest("[data-studio-boundary]") as HTMLElement | null;
      if (boundary && select) {
        e.preventDefault(); e.stopImmediatePropagation();
        d.querySelectorAll('[data-studio-boundary][aria-pressed="true"]').forEach(n=>n.setAttribute("aria-pressed","false"));
        boundary.setAttribute("aria-pressed","true");
        tools?.pickInsert?.(boundary.dataset.block!, boundary.dataset.scope==="nested" ? tools?.placement?.(boundary.dataset.block!,"",boundary.dataset.studioBoundary==="after",false) : {boundary:boundary.dataset.studioBoundary});
        return;
      }
      if(el.closest(".studio-empty-layout")){
        const owner=el.closest<HTMLElement>("[data-studio-block]");if(owner){e.preventDefault();e.stopImmediatePropagation();select?.(owner.dataset.studioBlock!);tools?.pickInsert?.(owner.dataset.studioBlock!,{section:owner.dataset.studioBlock!,parent:"content"});return;}
      }
      if(el.closest("[data-studio-toolbar-close],[data-studio-toolbar-grip]")) return;
      const toolButton=el.closest("[data-studio-free],[data-studio-resize],[data-studio-select-tool]");
      if(toolButton){e.preventDefault();e.stopImmediatePropagation();const next=toolButton.hasAttribute("data-studio-free")?"move":toolButton.hasAttribute("data-studio-resize")?"resize":null;setTool(activeTool===next?null:next);return;}
      const action = el
        .closest("[data-studio-action]")
        ?.getAttribute("data-studio-action");
      const mediaAction = el.closest("[data-studio-media-play]");
      if(mediaAction){e.preventDefault();e.stopImmediatePropagation();const bar=d.getElementById("studio-canvas-tools")!;const owner=d.querySelector('[data-studio-block="'+bar.dataset.block+'"]');const video=owner?.querySelector<HTMLVideoElement>('video');if(video){if(!video.paused)video.pause();else {video.muted=true;void video.play().catch(()=>notice("This video could not play. Check its direct MP4/WebM address and file format."));}}return;}
      if (action) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const bar = d.getElementById("studio-canvas-tools")!;
        setTool(null);
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
    free: any = null, activeTool: "move" | "resize" | null = null;
  function setTool(tool: "move"|"resize"|null){
    activeTool=tool;
    const done=d!.querySelector<HTMLElement>('[data-studio-select-tool]');
    if(done){done.textContent=tool ? "✓ Done · Esc" : "↖ Select";done.title="Stop moving or resizing (Escape)";}
    if(tool)d!.body.dataset.studioTool=tool;else delete d!.body.dataset.studioTool;
    d!.querySelectorAll("[data-studio-free],[data-studio-resize],[data-studio-select-tool]").forEach(n=>n.setAttribute("aria-pressed",String(n.hasAttribute("data-studio-free")?tool==="move":n.hasAttribute("data-studio-resize")?tool==="resize":tool===null)));
  }
  d.addEventListener("studio:stop-tool",()=>{clearGuides();setTool(null);});
  function clearGuides(){d?.querySelectorAll('[data-studio-guides]').forEach(n=>n.remove());}
  function showGuides(activeX?:number,activeY?:number){
    if(!d)return;
    let guide=d.querySelector<HTMLElement>('[data-studio-guides]');
    if(!guide){guide=d.createElement('div');guide.setAttribute('data-studio-guides','');guide.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483640';d.body.append(guide);}
    guide.replaceChildren();
    const line=(axis:string,value:number,active=false)=>{const n=d.createElement('div');n.style.cssText='position:absolute;pointer-events:none;background:'+(active?'#ef8cff':'#856a9c88')+';'+(axis==='x'?'top:0;bottom:0;width:1px;left:':'left:0;right:0;height:1px;top:')+value+'px';guide!.append(n);};
    [1,win.innerWidth/2,win.innerWidth-1].forEach(x=>line('x',x));
    const r=free.parentRect,box=d.createElement('div');box.style.cssText='position:absolute;border:1px dashed #9674b4;left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px';guide.append(box);
    if(activeX!=null)line('x',activeX,true);if(activeY!=null)line('y',activeY,true);
    const label=d.createElement('span');label.textContent='Page centre · Container bounds · Alt: move without snapping';label.style.cssText='position:absolute;bottom:12px;left:12px;padding:7px 10px;border-radius:6px;background:#29232f;color:#fff;font:12px system-ui';guide.append(label);
  }
  function snapAxis(start:number,size:number,delta:number,targets:number[]){
    let adjustment=Infinity,hit:number|undefined;
    for(const point of [start+delta,start+size/2+delta,start+size+delta])for(const target of targets){const diff=target-point;if(Math.abs(diff)<=6 && Math.abs(diff)<Math.abs(adjustment)){adjustment=diff;hit=target;}}
    return {delta:delta+(hit==null?0:adjustment),hit};
  }
  win.addEventListener(
    "pointerdown",
    (event) => {
      const e = event as PointerEvent,
        target = e.target as Element;
      const grip = target.closest("[data-studio-toolbar-grip]");
      if(grip){const bar=grip.closest<HTMLElement>("#studio-canvas-tools")!;const r=bar.getBoundingClientRect();free={toolbar:true,bar,startX:e.clientX,startY:e.clientY,x:r.left,y:r.top,originalStyle:bar.style.cssText};target.setPointerCapture?.(e.pointerId);e.preventDefault();e.stopImmediatePropagation();return;}
      const direct=!!activeTool && !target.closest("#studio-canvas-tools,[data-studio-boundary]") && !!target.closest("[data-studio-block]");
      // Tool buttons choose a mode; only a gesture on the canvas moves content.
      if(!direct)return;
      const hit=selectedFrom(target);
      if(!hit.block)return;
      const blockID=hit.block,element=hit.element || "";
      if(direct)select?.(blockID,element);
      const picked = element.startsWith("part:") ? d.querySelector<HTMLElement>('[data-studio-block="'+blockID+'"] [data-studio-part="'+element.slice(5)+'"]') : element ? d.querySelector<HTMLElement>(
        '[data-studio-block="' + blockID + '"][data-studio-element="' + element + '"], [data-studio-block="' + blockID + '"] [data-studio-element="' + element + '"]',
      ) : d.querySelector<HTMLElement>('[data-studio-block="'+blockID+'"]');
      if (!picked) return;
      const owner=picked.closest<HTMLElement>('[data-studio-block]'),independent=element.startsWith('part:') && !!core.PARTS[owner?.dataset.studioType || '']?.[element.slice(5)];
      const el=independent?picked:element.startsWith("part:") ? owner! : movementUnit(picked), movementID=independent?element:el.getAttribute("data-studio-element") || element;
      e.preventDefault();
      e.stopImmediatePropagation();
      const current = tools?.coordinates?.(blockID!,movementID) || (win.getComputedStyle(el).translate || "0px 0px").split(" ").map(parseFloat);
      free = {
        block: blockID,
        element:movementID,
        el,
        startX: e.clientX,
        startY: e.clientY,
        x: current[0] || 0,
        y: current[1] || 0,
        originalStyle: el.style.cssText,
        resize: activeTool==="resize",
        width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height,
        parentWidth: el.parentElement?.getBoundingClientRect().width || win.innerWidth,
        rect:el.getBoundingClientRect(),parentRect:el.parentElement?.getBoundingClientRect() || d.body.getBoundingClientRect(),
        peers:Array.from(el.parentElement?.children || []).filter(n=>n!==el && !n.hasAttribute("data-studio-boundary") && win.getComputedStyle(n).display!=="none").map(n=>n.getBoundingClientRect()),
      };
      target.setPointerCapture?.(e.pointerId);
      showGuides();
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
      if(!free.resize){
        const p=free.parentRect,rects=[p,...free.peers];
        const xs=[0,win.innerWidth/2,win.innerWidth,...rects.flatMap(r=>[r.left,r.left+r.width/2,r.right])],ys=rects.flatMap(r=>[r.top,r.top+r.height/2,r.bottom]);
        const x=e.altKey?{delta:free.dx,hit:undefined}:snapAxis(free.rect.left,free.rect.width,free.dx,xs),y=e.altKey?{delta:free.dy,hit:undefined}:snapAxis(free.rect.top,free.rect.height,free.dy,ys);
        free.dx=x.delta;free.dy=y.delta;showGuides(x.hit,y.hit);
      }
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
  win.addEventListener("keydown",event=>{if(event.key!=="Escape")return;if(free){if(!free.toolbar)free.el.style.cssText=free.originalStyle;free=null;}clearGuides();setTool(null);},true);
  win.addEventListener("pointercancel", () => { clearGuides();if(free){(free.toolbar?free.bar:free.el).style.cssText=free.originalStyle;free=null;} },true);
  win.addEventListener(
    "pointerup",
    () => {
      if (!free) return;
      clearGuides();
      if(free.toolbar){saveToolbarLayout({x:parseFloat(free.bar.style.left),y:parseFloat(free.bar.style.top)});free=null;return;}
      free.el.style.cssText=free.originalStyle;
      if(Math.abs(free.dx||0)<2 && Math.abs(free.dy||0)<2){free=null;return;}
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
      if(activeTool && !bar){e.preventDefault();return;}
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
      const card=movingCard(), target=card ? movementUnit(e.target as Element) : ((e.target as Element).closest("[data-studio-element],[data-studio-block]") || elementAt(e.target as Element)), hit=selectedFrom(target), r=target.getBoundingClientRect();
      const after=card && horizontalCard(target as HTMLElement) ? e.clientX>r.left+r.width/2 : e.clientY>r.top+r.height/2;
      const inside=!card && e.clientY>r.top+r.height*.25 && e.clientY<r.bottom-r.height*.25;
      const kind = e.dataTransfer?.getData("application/sane-block");
      const destination = boundary ? (boundary.dataset.scope==="nested" ? tools?.placement?.(boundary.dataset.block!,"",boundary.dataset.studioBoundary==="after",false) : {boundary:boundary.dataset.studioBoundary}) : tools?.placement?.(hit.block, hit.element, after, inside);
      const destinationBlock = boundary?.dataset.block || hit.block;
      const targetAfter = boundary ? boundary.dataset.studioBoundary === "after" : after;
      let sectionDrag: any = null;
      try {sectionDrag = JSON.parse(e.dataTransfer?.getData("application/sane-section") || "null");}catch{}
      if (kind && (core.TYPES.includes(kind) || /^pattern:[a-f0-9-]{36}$/.test(kind) || /^layout:grid-[1-6]-[1-6]$/.test(kind) || LAYOUTS.some(l=>"layout:"+l.id===kind)) && insert) {
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
    d.querySelectorAll("[data-studio-element],[data-studio-block],[data-studio-part]").forEach(n=>n.setAttribute("draggable","true"));
    d.querySelectorAll("[data-studio-boundary]").forEach(n=>n.remove());
    const blocks=Array.from(d.querySelectorAll<HTMLElement>("[data-studio-block]")).filter(n=>!n.parentElement?.closest("[data-studio-block]"));
    const entries=blocks.map(target=>({target,after:false,nested:false}));if(blocks.length)entries.push({target:blocks[blocks.length-1],after:true,nested:false});
    const selected=d.querySelector<HTMLElement>('[data-studio-element-selected]');
    const selectedBlock=selected?.closest<HTMLElement>('[data-studio-block]');
    const container=selectedBlock?.matches('.studio-layout-section,.studio-layout-row,.studio-layout-column') ? selectedBlock : selectedBlock?.parentElement?.closest<HTMLElement>('.studio-layout-section,.studio-layout-row,.studio-layout-column');
    if(container){
      const children=Array.from(container.querySelectorAll<HTMLElement>('[data-studio-block]')).filter(n=>n.parentElement?.closest('[data-studio-block]')===container);
      children.forEach(target=>entries.push({target,after:false,nested:true}));if(children.length)entries.push({target:children[children.length-1],after:true,nested:true});
    }
    for(const {target,after,nested} of entries){
      const el=d.createElement("button"),r=target.getBoundingClientRect();el.type="button";el.dataset.studioBoundary=after?"after":"before";el.dataset.block=target.dataset.studioBlock;if(nested)el.dataset.scope="nested";
      el.setAttribute("aria-label",(after?"Insert after ":"Insert before ")+target.dataset.studioBlock);
      el.innerHTML='<span style="display:inline-block;background:#493659;color:#fff;padding:3px 12px;border-radius:9px">+ Insert here</span>';
      el.style.cssText="position:absolute;left:12px;right:12px;z-index:2147483600;height:22px;border:0;background:linear-gradient(#ab8bce,#ab8bce) center/100% 1px no-repeat;color:white;font:14px system-ui;cursor:copy;opacity:.6;top:"+Math.max(0,win.scrollY+(after?r.bottom:r.top)-12)+"px";if(nested){el.style.left=(r.left+win.scrollX+8)+"px";el.style.width=Math.max(60,r.width-16)+"px";el.style.right="auto";}d.body.append(el);
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
  placement?: (block: string, element: string, after: boolean, inside?: boolean) => any;
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
        f.contentDocument.querySelectorAll('video').forEach(video=>{video.controls=video.hasAttribute('controls');video.loop=video.hasAttribute('loop');video.muted=video.hasAttribute('muted') || video.hasAttribute('autoplay');});
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
    d?.querySelectorAll("#studio-canvas-tools").forEach(n=>{if(n!==previousBar)n.remove();});
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
      const layout = toolbarLayout();
      if(previousBar?.dataset.pinned && !sameBar){layout.x=parseFloat(previousBar.style.left);layout.y=parseFloat(previousBar.style.top);}
      if(layout.x!==undefined && layout.y!==undefined)bar.dataset.pinned="true";
      bar.dataset.block = selected;
      bar.dataset.element = selectedElement || "";
      if(!sameBar)bar.style.cssText =
        "position:fixed;z-index:2147483647;display:flex;flex-wrap:wrap;gap:4px;padding:5px;background:#29262e;color:#f5f2f7;border:1px solid #514a5b;border-radius:10px;box-shadow:0 8px 24px #0003;font:12px system-ui;max-width:95vw;box-sizing:border-box";
      const added=page.blocks.find(b=>b.id===selected && !b.source),imageSelected=chosen?.tagName==="IMG" || added?.type==="image";
      const type=selectedElement?.startsWith("part:") && core.PARTS[added?.type || ""] ? chosen?.tagName?.toLowerCase() || added?.type || "section" : added?.type || chosen?.tagName?.toLowerCase() || "section";
      const settingsLabel=imageSelected?"Image settings":["section","row","column"].includes(type)?"Layout settings":type==="a" || type==="button"?"Button settings":/^(h[1-6]|p|text|heading|span)$/.test(type)?"Text settings":type==="video"?"Video settings":"Edit settings";
      if(!sameBar)bar.innerHTML =
        '<button data-studio-toolbar-grip aria-label="Move toolbar" title="Drag to move this toolbar. Its position stays fixed while you edit." style="flex-basis:100%">⠿ Move toolbar</button><button data-studio-select-tool aria-label="Select tool">↖ Select</button><button data-studio-action="edit" title="Open settings for this selection">'+settingsLabel+'</button><button data-studio-action="insert">＋ Insert</button><button data-studio-action="up" aria-label="Move selected layer up">↑</button><button data-studio-action="down" aria-label="Move selected layer down">↓</button>'+(!chosen && !added ? '<button draggable="true" data-studio-section-drag>↕ Section</button>' : '') +
        (chosen || added
          ? '<button draggable="true">↕ '+(chosen?.dataset.studioDragOwner?'Drag card':imageSelected?'Drag image':'Drag element')+'</button><button data-studio-free title="Click to enable, then drag an element. Click again or press Escape to stop.">✥ Move freely</button><button data-studio-resize title="Click to enable, then drag an element to resize. Click again or press Escape to stop.">⤡ Resize</button><button data-studio-action="remove">'+(imageSelected?'Remove image':'Remove')+'</button>'
          : "") + ((chosen?.tagName === "VIDEO" || (chosen || active)?.querySelector("video")) ? '<button data-studio-media-play aria-label="Play / pause video">▶ / Ⅱ Video</button>' : '') + '<button data-studio-toolbar-close aria-label="Close element toolbar" title="Hide controls; your selection stays active">×</button>';
      if(selectedElement?.startsWith('part:') && core.PARTS[added?.type || '']){
        const name=selectedElement.slice(5),remove=bar.querySelector<HTMLButtonElement>('[data-studio-action="remove"]');
        if(remove)remove.textContent=(added?.elements?.[selectedElement]?.hidden?'Restore ':'Remove ')+name;
        bar.querySelectorAll<HTMLButtonElement>('[data-studio-action="up"],[data-studio-action="down"]').forEach(button=>{button.title='Move whole '+added?.type+' '+button.dataset.studioAction;});
        const reorder=bar.querySelector<HTMLButtonElement>('[draggable="true"]');if(reorder)reorder.textContent='↕ Reorder '+added?.type;
      }
      bar.querySelector<HTMLButtonElement>("[data-studio-toolbar-close]")!.onclick=()=>{bar.hidden=true;bar.style.display="none";saveToolbarLayout({hidden:true});d.dispatchEvent(new Event("studio:stop-tool"));};
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
              "px;cursor:"+(b.hasAttribute("data-studio-toolbar-grip") || b.draggable ? "grab":"pointer")+";font:inherit;touch-action:none"),
        );
      const tool=d.body.dataset.studioTool;
      bar.querySelector<HTMLElement>("[data-studio-select-tool]")!.textContent=tool ? "✓ Done · Esc" : "↖ Select";
      bar.querySelectorAll('[data-studio-free],[data-studio-resize],[data-studio-select-tool]').forEach(n=>n.setAttribute('aria-pressed',String(n.hasAttribute('data-studio-free')?tool==='move':n.hasAttribute('data-studio-resize')?tool==='resize':!tool)));
      if(!sameBar)d.body.append(bar);
      d.dispatchEvent(new Event("studio:layout-updated"));
      bar.hidden=layout.hidden === true;
      bar.style.display=bar.hidden ? "none" : "flex";
      const grip=bar.querySelector<HTMLElement>("[data-studio-toolbar-grip]")!;
      grip.style.flexBasis="100%";grip.style.textAlign="left";
      grip.style.color="#dac8e6";grip.style.background="#29262e";
      const position = () => {
        const view=frame.current!.contentWindow!;
        // Selection, scrolling and live edits never choose a new toolbar position.
        // A newly created toolbar inherits the last workspace position.
        const x=bar.dataset.pinned ? (bar.dataset.positioned ? parseFloat(bar.style.left) : layout.x ?? 8) : 8;
        const y=bar.dataset.pinned ? (bar.dataset.positioned ? parseFloat(bar.style.top) : layout.y ?? 8) : Math.max(4,view.innerHeight-bar.offsetHeight-12);
        bar.style.left=Math.max(4,Math.min(view.innerWidth-bar.offsetWidth-4,x))+"px";
        bar.style.top=Math.max(4,Math.min(view.innerHeight-bar.offsetHeight-4,y))+"px";
        bar.dataset.positioned="true";
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
      {selected ? <button className="canvas-show-tools" onClick={()=>{const bar=frame.current?.contentDocument?.getElementById("studio-canvas-tools");if(bar){saveToolbarLayout({hidden:false});bar.hidden=false;bar.style.display="flex";bar.ownerDocument.dispatchEvent(new Event("studio:layout-updated"));}}}>Element controls</button> : null}
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
