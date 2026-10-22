import core from "../../content-core/site.cjs";
import type { Asset, Page } from "./site-types";

function key(node: Node): string {
  if (node.nodeType !== 1) return "";
  const el = node as Element;
  if (el.hasAttribute("data-studio-block")) return "b:" + el.getAttribute("data-studio-block");
  if (el.hasAttribute("data-studio-element")) return "e:" + el.closest("[data-studio-block]")?.getAttribute("data-studio-block") + ":" + el.getAttribute("data-studio-element");
  return el.id ? "id:" + el.id : "";
}
function compatible(a: Node, b: Node) {
  return a.nodeType === b.nodeType && (a.nodeType !== 1 || (a as Element).tagName === (b as Element).tagName);
}
function inertClone(node: Node, doc: Document): Node {
  const copy = doc.importNode(node, true);
  if (copy.nodeType === 1) {
    const el = copy as Element;
    const scripts = Array.from(el.querySelectorAll("script"));
    if (el.tagName === "SCRIPT") scripts.push(el as HTMLScriptElement);
    scripts.forEach(script => { if (script.type !== "application/json") { script.removeAttribute("src"); script.type = "application/x-studio-inert"; } });
  }
  return copy;
}

// Three-way reconciliation: compare trusted source snapshots, not runtime-generated DOM.
// Unchanged branches (calendar feeds, settings navigation, media and form state) are retained.
export function patchDocument(doc: Document, before: Document, after: Document) {
  const liveKeys = new Map<string, Node>(), oldKeys = new Map<string, Node>(), pairs = new Map<Node, Node>();
  const collect = (root: Node, map: Map<string, Node>) => {
    const visit = (n: Node) => { const id = key(n); if (id) map.set(id,n); n.childNodes.forEach(visit); };
    visit(root);
  };
  collect(doc.body,liveKeys); collect(before.body,oldKeys);
  function pair(old: Node, live: Node) {
    pairs.set(old,live);
    const used = new Set<Node>();
    Array.from(old.childNodes).forEach((child,index) => {
      const id = key(child);
      const match = id ? liveKeys.get(id) : Array.from(live.childNodes).find((n,i) => !used.has(n) && !key(n) && compatible(n,child) && (i===index || n.nodeType===child.nodeType));
      if (match) { used.add(match); pair(child,match); }
    });
  }
  pair(before.body,doc.body);
  function morph(live: Node, old: Node | undefined, next: Node): Node {
    if (old?.isEqualNode(next)) return live;
    if (!compatible(live,next)) return inertClone(next,doc);
    if (next.nodeType === 3 || next.nodeType === 8) { if(live.nodeValue!==next.nodeValue)live.nodeValue=next.nodeValue;return live; }
    if(next.nodeType !== 1)return live;
    const el=live as Element, prev=old as Element|undefined, desired=next as Element;
    if(desired.tagName==='SCRIPT')return live;
    const names=new Set([...(prev?Array.from(prev.attributes).map(a=>a.name):[]),...Array.from(desired.attributes).map(a=>a.name)]);
    for(const name of names) {
      if(name.startsWith('data-studio-') && ['data-studio-selected','data-studio-element-selected','data-studio-drop'].includes(name))continue;
      const a=prev?.getAttribute(name)??null,b=desired.getAttribute(name);
      if(a===b)continue;
      if(b===null)el.removeAttribute(name);else el.setAttribute(name,b);
    }
    const oldChildren=Array.from(old?.childNodes||[]), nextChildren=Array.from(next.childNodes);
    if(old && oldChildren.length===nextChildren.length && oldChildren.every((n,i)=>n.isEqualNode(nextChildren[i])))return live;
    const retained=new Set<Node>();let previousChild:Node|null=null;
    nextChildren.forEach((child,index)=>{
      const id=key(child), oldChild=id?oldKeys.get(id):oldChildren[index];
      let current=id?liveKeys.get(id):oldChild?pairs.get(oldChild):undefined;
      if(current && !compatible(current,child))current=undefined;
      const updated=current?morph(current,oldChild,child):inertClone(child,doc);
      retained.add(updated);
      // Recursion may move the old insertion anchor into another container.
      // Resolve the next sibling after morphing, from the already placed prefix.
      const cursor=previousChild?.parentNode===live ? previousChild.nextSibling : live.firstChild;
      if(updated!==cursor)live.insertBefore(updated,cursor);
      previousChild=updated;
    });
    Array.from(live.childNodes).forEach(n=>{if(!retained.has(n) && !(n.nodeType===1 && ((n as Element).id==='studio-canvas-tools' || (n as Element).hasAttribute('data-studio-boundary'))))live.removeChild(n);});
    return live;
  }
  morph(doc.body,before.body,after.body);
  const title=after.querySelector('title')?.textContent;if(title!=null)doc.title=title;
  updateStyles(doc,after);
}
export function updateStyles(doc: Document, source: Document) {
  let style=doc.getElementById('studio-live-base-styles') as HTMLStyleElement|null;
  if(!style){style=doc.createElement('style');style.id='studio-live-base-styles';doc.head.append(style);}
  const text=Array.from(source.head.querySelectorAll('style:not([data-studio-design-rules])')).map(n=>n.textContent).join('\n');
  // Remove only template inline styles: stylesheet links and runtime-owned styles remain intact.
  doc.head.querySelectorAll('style:not(#studio-live-base-styles):not([data-studio-design-rules]):not(#studio-live-design)').forEach(n=>n.remove());
  if(style.textContent!==text)style.textContent=text;
}
export function designStyles(doc: Document, page: Page) {
  let css='';
  for(const b of page.blocks){
    css+=core.design.rules(b.id,b.design,b.responsive,'data-studio-layout');
    for(const [id,v] of Object.entries(b.elements||{}))css+=core.design.rules(b.id+':'+id,{...Object.fromEntries(Object.entries(v).filter(([k])=>core.design.keys.includes(k))),...(v.hidden?{display:'none'}:{})},v.responsive);
  }
  doc.head.querySelectorAll('[data-studio-design-rules]').forEach(n=>n.remove());
  let style=doc.getElementById('studio-live-design') as HTMLStyleElement|null;
  if(!style){style=doc.createElement('style');style.id='studio-live-design';doc.head.append(style);}
  if(style.textContent!==css)style.textContent=css;
  doc.querySelectorAll<HTMLElement>('[data-studio-element]').forEach(el=>{
    const block=el.closest('[data-studio-block]')?.getAttribute('data-studio-block');
    if(block)el.setAttribute('data-studio-style',core.design.token(block+':'+el.dataset.studioElement));
  });
}
export function structureKey(page: Page) {
  const media=(value:Record<string,any>={})=>({backgroundVideo:value.backgroundVideo,backgroundImage:value.backgroundImage,backgroundOverlay:value.backgroundOverlay});
  // CSS-only changes do not enter reconciliation. Video sources/posters are DOM content.
  const responsiveMedia=(values:Record<string,Record<string,any>>={})=>Object.fromEntries(Object.entries(values).map(([device,value])=>[device,media(value)]));
  return JSON.stringify({...page,blocks:page.blocks.map(b=>({...b,
    design:media(b.design),responsive:responsiveMedia(b.responsive),
    elements:Object.fromEntries(Object.entries(b.elements||{}).map(([id,v])=>[id,{...v,responsive:responsiveMedia(v.responsive)}]))
  }))});
}
export function resolveAssets(doc: Document, assets: Asset[]) {
  const map=new Map(assets.filter(a=>/^\/images\/studio-[a-f0-9-]{36}\.(png|jpe?g|webp|gif)$/.test(a.url)&&/^[A-Za-z0-9+/]+={0,2}$/.test(a.base64)).map(a=>{const ext=a.url.split('.').pop();return [a.url,'data:image/'+(ext==='jpg'?'jpeg':ext)+';base64,'+a.base64];}));
  doc.querySelectorAll('style').forEach(style=>{let css=style.textContent||'';for(const [url,data] of map)css=css.split(url).join(data);if(style.textContent!==css)style.textContent=css;});
  doc.querySelectorAll('img[src],video[poster]').forEach(el=>{const attr=el.tagName==='VIDEO'?'poster':'src',url=el.getAttribute(attr)||'';if(map.has(url))el.setAttribute(attr,map.get(url)!);});
  doc.querySelectorAll<HTMLElement>('[style]').forEach(el=>{for(const [url,data] of map)if(el.style.backgroundImage.includes(url))el.style.backgroundImage='url("'+data+'")';});
}
