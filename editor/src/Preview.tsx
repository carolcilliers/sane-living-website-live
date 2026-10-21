import { useCallback, useEffect, useRef, useState } from "react";
import type { About } from "./types";
export const PAGES = [
  { path: "/about/", name: "About" }, { path: "/", name: "Home" },
  { path: "/rent/", name: "Rent the space" }, { path: "/rent/weddings/", name: "Weddings" },
  { path: "/gallery/", name: "Gallery" }, { path: "/events/", name: "Events" },
  { path: "/contact/", name: "Contact" },
];
export function Preview({ model, template, width, selected, select, clean, route, move, notice }: {
  model: About; template: string; width: number; selected: string;
  select: (s: string) => void; clean: boolean; route: string;
  move: (from: number, to: number) => void; notice: (s: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null), viewport = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(600), [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false), [reload, setReload] = useState(0);
  const [height, setHeight] = useState(760);
  const current = useRef({model, selected, clean, select, move, notice});
  current.current = {model, selected, clean, select, move, notice};
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(() => { setAvailable(Math.max(240, node.clientWidth - 48)); setHeight(Math.max(180, node.clientHeight - 48)); });
    observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => { setReady(false); setFailed(false); },[route,reload]);
  useEffect(()=>{if(ready)return;const t=setTimeout(()=>setFailed(true),20000);return ()=>clearTimeout(t);},[ready,route,reload]);
  const scale = Math.min(1, available / width);
  const render = useCallback(() => {
    const d = frame.current?.contentDocument;
    if (!d || route !== "/about/") return;
    const marker = d.createTreeWalker(d.body, NodeFilter.SHOW_COMMENT);
    let start: Node | null=null, end: Node | null=null;
    while (marker.nextNode()) {
      if (marker.currentNode.nodeValue?.trim()==="about-managed:start") start=marker.currentNode;
      if (marker.currentNode.nodeValue?.trim()==="about-managed:end") end=marker.currentNode;
    }
    if (!start || !end) { setFailed(true); return; }
    const y=frame.current!.contentWindow!.scrollY;
    const philosophy=/<!-- philosophy:start -->([\s\S]*?)<!-- philosophy:end -->/.exec(template)?.[1] || "";
    const fragment=d.createElement("template");
    // Only escaped text and validated URLs from the canonical renderer enter the page.
    fragment.innerHTML=window.SaneAboutRenderer.sections(model, philosophy, true);
    const range=d.createRange();range.setStartAfter(start);range.setEndBefore(end);range.deleteContents();range.insertNode(fragment.content);
    const heading=d.querySelector(".page-hero h1");if(heading)heading.textContent=model.metadata.title;
    frame.current!.contentWindow!.scrollTo(0,y);
  },[model,template,route]);
  useEffect(()=>{if(ready)render();},[render,ready]);
  useEffect(()=>{
    const d=frame.current?.contentDocument;if(!d?.body)return;
    d.body.classList.toggle("editor-clean",clean);
    d.querySelectorAll("[data-editor-id]").forEach(el=>el.toggleAttribute("data-editor-selected",!clean&&el.getAttribute("data-editor-id")===selected));
  },[selected,clean,model,ready]);
  const scrolledSelection=useRef("");
  useEffect(()=>{
    if(!ready||route!=="/about/"||!selected)return;
    if(!scrolledSelection.current){scrolledSelection.current=selected;return;}
    if(scrolledSelection.current===selected)return;scrolledSelection.current=selected;
    const d=frame.current?.contentDocument;
    const el=Array.from(d?.querySelectorAll("[data-editor-id]")||[]).find(x=>x.getAttribute("data-editor-id")===selected);
    if(el)el.scrollIntoView({block:"nearest"});
  },[selected,route,ready]);
  function loaded() {
    const d=frame.current?.contentDocument;
    if(!d?.body || !d.querySelector(".page-hero,.hero,.section")){setFailed(true);return;}
    const style=d.createElement("style");style.textContent=`
      [data-animate], [data-animate-stagger] > * {opacity:1!important;transform:none!important;transition:none!important}
      [data-editor-id]{position:relative;cursor:pointer;outline-offset:-2px}
      [data-editor-id]:hover{outline:1px solid #9974bc}
      [data-editor-selected]{outline:2px solid #7c50a0!important}
      body:not(.editor-clean) [data-editor-selected]::before{content:"Selected section · drag to move";position:absolute;top:0;left:0;z-index:20;background:#7c50a0;color:white;padding:5px 10px;font:12px system-ui;pointer-events:none}
      .editor-clean [data-editor-id]{outline:none!important;cursor:default}
      body{min-width:0!important}html{scroll-behavior:auto!important}
    `;d.head.append(style);
    d.querySelectorAll("iframe,object,embed").forEach(el=>{const placeholder=d.createElement("div");placeholder.textContent="Embedded form or media · preview only · open the live page to use";placeholder.style.cssText="padding:32px;background:#f5f3f7;border:1px solid #ddd;border-radius:12px;text-align:center";el.replaceWith(placeholder);});
    // Only allowlisted public pages run their existing scripts. Block real interactions.
    d.addEventListener("submit",e=>{e.preventDefault();e.stopImmediatePropagation();current.current.notice("Forms are preview-only. Use View live page to submit a real form.");},true);
    d.addEventListener("click",e=>{
      const target=e.target as Element, section=target.closest("[data-editor-id]");
      if(section&&!current.current.clean)current.current.select(section.getAttribute("data-editor-id")!);
      if(target.closest("a,button,input,select,textarea")){
        e.preventDefault();e.stopImmediatePropagation();
        if(!section)current.current.notice("Website links and forms are inactive in the canvas. Use View live page to interact with the website.");
      }
    },true);
    let dragged="";
    d.addEventListener("dragstart",e=>{
      const el=(e.target as Element).closest("[data-editor-id]");
      if(!el||current.current.clean){e.preventDefault();return;}
      dragged=el.getAttribute("data-editor-id")!; e.dataTransfer?.setData("text/plain",dragged);
    });
    d.addEventListener("dragover",e=>{if(dragged)e.preventDefault();});
    d.addEventListener("drop",e=>{
      e.preventDefault();const id=(e.target as Element).closest("[data-editor-id]")?.getAttribute("data-editor-id");
      const list=current.current.model.metadata.sections||[];
      if(id&&dragged)current.current.move(list.findIndex(s=>s.id===dragged),list.findIndex(s=>s.id===id));dragged="";
    });
    d.addEventListener("dragend",()=>{dragged="";});
    setFailed(false);setReady(true);render();
  }
  useEffect(()=>{const d=frame.current?.contentDocument;d?.querySelectorAll("[data-editor-id]").forEach(el=>el.setAttribute("draggable",String(!clean)));},[model,clean,ready]);
  return <div className="canvas-scroll" ref={viewport}>
    {!ready&&!failed?<div className="canvas-loading" role="status">Loading the current website…</div>:null}
    {failed?<div className="canvas-error" role="alert">The website preview could not load. Your edits are retained. <button onClick={()=>setReload(n=>n+1)}>Retry preview</button></div>:null}
    <div className="canvas-fit" style={{width:width*scale,height}}>
      <div className="canvas-size" style={{width,transform:`scale(${scale})`,transformOrigin:"top left"}}>
        <div className="canvas-caption"><span className="browser-dots">● ● ●</span><span>{location.host}{route} · {width}px · {Math.round(scale*100)}%</span></div>
        <iframe key={route+reload} ref={frame} title="About page preview" sandbox="allow-same-origin allow-scripts" src={route+"?editor-preview="+reload}
          style={{height:Math.max(180,(height-31*scale)/scale),visibility:ready?"visible":"hidden"}} onLoad={loaded}/>
      </div>
    </div>
  </div>;
}
