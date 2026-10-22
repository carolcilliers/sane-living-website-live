import { useEffect, useRef, useState } from "react";
import controls from "../../content-core/editor-controls.cjs";
import core from "../../content-core/site.cjs";
import type { Design, Device } from "./site-types";

const labels: Record<string, string> = {
  widthCss:"Advanced width",heightCss:"Advanced height",minWidthCss:"Minimum width",maxWidthCss:"Maximum width",minHeightCss:"Advanced minimum height",maxHeightCss:"Maximum height",topCss:"Top inset",rightCss:"Right inset",bottomCss:"Bottom inset",leftCss:"Left inset",flexBasisCss:"Flex basis",
  position:"Positioning",overflow:"Overflow",wrap:"Wrap",selfAlign:"Self alignment",columnSpan:"Column span",rowSpan:"Row span",gridRows:"Grid rows",rowGap:"Row gap",columnGap:"Column gap",flexGrow:"Flex grow",flexShrink:"Flex shrink",rotate:"Rotation (degrees)",scale:"Scale (%)",radiusTopLeft:"Top left radius",radiusTopRight:"Top right radius",radiusBottomLeft:"Bottom left radius",radiusBottomRight:"Bottom right radius",gradient:"Background fill",gradientFrom:"Gradient start",gradientTo:"Gradient end",gradientAngle:"Gradient angle",textTransform:"Text case",textDecoration:"Text decoration",objectPosition:"Image focal position",
  x: "X offset", y: "Y offset", width: "Width (%)", height: "Height (px)",
  minHeight: "Minimum height", fontSize: "Font size", fontWeight: "Font weight",
  lineHeight: "Line height", padding: "Padding", margin: "Margin", gap: "Gap",
  radius: "Corner radius", columns: "Columns", opacity: "Opacity (%)",
  borderWidth: "Border width", color: "Text colour", background: "Background colour",
  borderColor: "Border colour", align: "Alignment", display: "Layout",
  direction: "Direction", justify: "Horizontal distribution", items: "Cross-axis alignment",
  objectFit: "Image fit", aspectRatio: "Aspect ratio", fontFamily:"Font",letterSpacing:"Letter spacing",borderStyle:"Border style",
  paddingTop:"Top padding",paddingRight:"Right padding",paddingBottom:"Bottom padding",paddingLeft:"Left padding",
  marginTop:"Top margin",marginRight:"Right margin",marginBottom:"Bottom margin",marginLeft:"Left margin",
  backgroundImage:"Background image URL",backgroundVideo:"Background video URL",backgroundSize:"Image scaling",backgroundPosition:"Image position",backgroundRepeat:"Image repeat",backgroundAttachment:"Background scrolling",backgroundOverlay:"Dark overlay (%)",viewportHeight:"Section height",gridTemplate:"Column proportions",
  shadow:"Shadow",shadowX:"Shadow X",shadowY:"Shadow Y",shadowBlur:"Blur",shadowSpread:"Spread",shadowOpacity:"Shadow opacity (%)",shadowColor:"Shadow colour",
};
const optionsLabels: Record<string, string> = {
  fixed:"Fixed / parallax effect",scroll:"Scroll with page",full:"Full screen",auto:"Automatic",
  "flex-start": "Start", "flex-end": "End", "space-between": "Space between",
  "space-around": "Space around", flex: "Row / column", grid: "Columns",
  block: "Normal flow", none: "Hidden", row: "Horizontal", column: "Vertical",
};
const groups = [
  { title: "Size & position", nav:"Size", help:"Move freely keeps this element in its current container. Reorder changes its place in the layer tree.", keys: ["width", "height", "minHeight", "viewportHeight", "x", "y", "aspectRatio", "objectFit", "objectPosition", "position", "overflow"] },
  { title: "Layout & spacing", nav:"Layout", help:"Columns creates a grid. Direction creates a horizontal or vertical flow. Padding is inside; margin is outside.", keys: ["display", "direction", "columns", "gridTemplate", "gridRows", "columnSpan", "rowSpan", "rowGap", "columnGap", "wrap", "selfAlign", "flexGrow", "flexShrink", "justify", "items", "gap", "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft"] },
  { title: "Text & typography", nav:"Text", help:"Typography applies to this element at the selected screen size.", keys: ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "align", "color", "textTransform", "textDecoration"] },
  { title: "Background media", nav:"Background", help:"Use a local image path or HTTPS URL. Background video is muted and loops; the image is its poster and reduced-motion fallback. Fixed backgrounds create a parallax effect where supported by the device.", keys:["background","backgroundImage","backgroundVideo","backgroundSize","backgroundPosition","backgroundRepeat","backgroundAttachment","backgroundOverlay","gradient","gradientFrom","gradientTo","gradientAngle"] },
  { title: "Borders & shadow", nav:"Style", help:"Use a six-digit colour such as #8a56a0, or transparent for the background. Choose Custom to adjust a shadow in detail.", keys: ["opacity", "radius", "borderStyle", "borderWidth", "borderColor", "shadow", "shadowX", "shadowY", "shadowBlur", "shadowSpread", "shadowOpacity", "shadowColor","radiusTopLeft","radiusTopRight","radiusBottomLeft","radiusBottomRight"] },
  {title:"Advanced dimensions",nav:"Units",help:"Override basic sizing with px, %, rem, em, vw, vh or svh. Clear a field to return to the basic control or original size. Values apply on Enter or when leaving the field.",keys:["widthCss","heightCss","minWidthCss","maxWidthCss","minHeightCss","maxHeightCss","flexBasisCss","topCss","rightCss","bottomCss","leftCss"]},
  {title:"Transforms",nav:"Transform",help:"Rotation and scale retain this element’s place in its row. Choose the screen size above before adjusting.",keys:["rotate","scale"]},
];

function ValidatedDesignInput({property,name,value,commit}:{property:string;name:string;value:string;commit:(value:string)=>void}){
  const [text,setText]=useState(value),[error,setError]=useState("");
  useEffect(()=>{setText(value);setError("");},[value]);
  const apply=()=>{const issues=text?core.design.validate({[property]:text}):[];if(issues.length){setError(issues[0]+" This value has not been applied.");return;}setError("");commit(text);};
  return <><input aria-label={name} aria-invalid={!!error} value={text} placeholder={core.design.lengths.includes(property)?"Original / basic size":"Original"} onChange={e=>{const next=e.target.value;setText(next);if(!next || !core.design.validate({[property]:next}).length){setError("");commit(next);}}} onBlur={apply} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply();}if(e.key==='Escape'){setText(value);setError("");}}}/>{error?<small className="field-error" role="alert">{error}</small>:null}</>;
}

export function DesignInspector({ kind="layout", value:normalValue, inherited:normalInherited = {}, device, change:changeDefault, reset:resetDefault, optimize, upload, states, stateChange, target }: {
  kind?: string;
  target?: {block:string;element?:string};
  states?: Partial<Record<"hover"|"focus",Partial<Record<Device,Design>>>>;
  stateChange?: (state:"hover"|"focus",fn:(value:Design)=>void)=>void;
  upload?: (file: File, done: (url: string) => void) => Promise<void>;
  value: Design;
  inherited?: Design;
  device: Device;
  change: (fn: (v: Design) => void) => void;
  reset: () => void;
  optimize: () => void;
}) {
  const role=controls.profile(kind);
  const [showAll,setShowAll]=useState(false);
  const relevant=(key:string)=>showAll || controls.supports(role,key,kind);
  const shownGroups=groups.filter(g=>g.keys.some(relevant));
  const [mode,setMode]=useState<"normal"|"hover"|"focus">("normal");
  const value=mode==='normal'?normalValue:states?.[mode]?.[device]||{};
  const inherited=mode==='normal'?normalInherited:{...normalInherited,...normalValue};
  const change=mode==='normal'?changeDefault:(fn:(v:Design)=>void)=>stateChange?.(mode,fn);
  const reset=mode==='normal'?resetDefault:()=>stateChange?.(mode,v=>{for(const key of Object.keys(v))delete v[key];});
  useEffect(()=>{
    const frame=document.querySelector<HTMLIFrameElement>('iframe[title="Website design canvas"]'),doc=frame?.contentDocument;
    if(!doc || !target)return;
    doc.querySelectorAll('[data-studio-state]').forEach(el=>el.removeAttribute('data-studio-state'));
    let chosen:Element|null|undefined;
    const apply=()=>{
      const owner=doc.querySelector('[data-studio-block="'+target.block+'"]');
      chosen=target.element?.startsWith('part:') ? owner?.querySelector('[data-studio-part="'+target.element.slice(5)+'"]') : target.element ? (owner?.getAttribute('data-studio-element')===target.element?owner:owner?.querySelector('[data-studio-element="'+target.element+'"]')) : owner;
      if(mode!=='normal' && chosen?.getAttribute('data-studio-state')!==mode)chosen?.setAttribute('data-studio-state',mode);
    };
    apply();
    const observer=new MutationObserver(apply);if(mode!=='normal')observer.observe(doc.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();chosen?.removeAttribute('data-studio-state');};
  },[mode,target?.block,target?.element]);
  const root = useRef<HTMLElement>(null);
  return (
    <section className="responsive-design" ref={root}>
      {stateChange ? <label className="field interaction-picker">Editing state<select aria-label="Editing state" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="normal">Normal</option><option value="hover">Hover</option><option value="focus">Keyboard focus</option></select><small>State styling applies only on {device}. Preview highlights the selected state.</small></label> : null}
      <div className="design-scope">
        <strong>Editing {device} {mode==='normal'?'layout':mode+' state'}</strong>
        <small>Only this size changes. Content, additions, removals and layer order stay shared.</small>
      </div>
      <div className="block-actions">
        <button disabled={mode!=="normal"} onClick={optimize}>Optimize for {device}</button>
        <button onClick={() => change(v => {
          if (v.display === "none") delete v.display;
          else v.display = "none";
        })}>
          {value.display === "none" ? "Restore on " : "Hide on "}{device}
        </button>
        <button onClick={reset}>Reset {device} overrides</button>
      </div>
      <label className="check control-depth"><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/>Show all design controls</label>
      <nav className="design-navigation" aria-label="Inspector sections">{shownGroups.map(g=>{const i=groups.indexOf(g);return <button key={g.nav} onClick={()=>{const target=root.current?.querySelector<HTMLDetailsElement>('[data-design-group="'+i+'"]');if(!target)return;target.open=true;const panel=root.current?.closest<HTMLElement>('.studio-inspector');if(panel)panel.scrollTo({top:panel.scrollTop+target.getBoundingClientRect().top-panel.getBoundingClientRect().top-58,behavior:'smooth'});}}>{g.nav}</button>;})}</nav>
      {shownGroups.map(group => {const i=groups.indexOf(group);return (
        <details className="design-options" data-design-group={i} open={i<5} key={group.title}>
          <summary>{group.title}</summary>
          <p className="design-help">{group.help}</p>
          {group.nav === "Background" ? <>
            {value.backgroundImage && core.design.safeMedia(value.backgroundImage) ? <div className="background-preview" style={{backgroundImage:`url("${value.backgroundImage}")`}}/> : null}
            <div className="background-tools">
              {upload ? <label className="asset-picker background-upload">Upload background<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(file)await upload(file,url=>change(v=>{v.backgroundImage=url;}));}}/></label> : null}
              <button onClick={()=>change(v=>{v.backgroundImage="";if(mode==='normal')v.backgroundVideo="";v.backgroundOverlay=0;})}>Clear media</button>
              <button onClick={()=>change(v=>{v.viewportHeight="full";v.backgroundSize="cover";v.backgroundPosition="center";})}>Fill screen</button>
            </div>
          </> : null}
          <div className="element-coordinates">
            {group.keys.filter(key=>relevant(key) && (mode==='normal' || key!=='backgroundVideo') && (!key.startsWith("shadow") || key === "shadow" || value.shadow === "custom") && (!key.startsWith("gradient") || key === "gradient" || value.gradient === "linear")).map(key => {
              const limits = core.design.numbers[key], options = core.design.enums[key];
              const scale = ["lineHeight","letterSpacing"].includes(key) ? 10 : 1;
              return (
                <label className={"field"+(["backgroundImage","backgroundVideo"].includes(key)?" background-field":"")} key={key}>
                  {labels[key]}
                  {core.design.lengths.includes(key) ? <ValidatedDesignInput property={key} name={labels[key]} value={String(value[key] ?? "")} commit={text=>change(v=>{if(text)v[key]=text;else delete v[key];})}/> : options ? (
                    <select aria-label={labels[key]} value={value[key] ?? ""}
                      onChange={event => change(v => {
                        if(["columns","gridTemplate","display"].includes(key))delete v.gridTracks;
                        if (event.target.value) v[key] = event.target.value;
                        else delete v[key];
                      })}>
                      <option value="">Inherit original</option>
                      {options.map((option: string) => (
                        <option key={option} value={option}>{option === "none" ? (key === "display" ? "Hidden" : key === "shadow" ? "No shadow" : key === "borderStyle" ? "No border" : "None") : optionsLabels[option] || option}</option>
                      ))}
                    </select>
                  ) : !limits ? <ValidatedDesignInput property={key} name={labels[key]} value={String(value[key] ?? "")} commit={text=>change(v=>{if(text)v[key]=text;else delete v[key];})}/> : (
                    <input aria-label={labels[key]} type={limits ? "number" : "text"}
                      min={limits ? limits[0] / scale : undefined}
                      max={limits ? limits[1] / scale : undefined}
                      step={1 / scale}
                      value={value[key] != null && limits ? Number(value[key]) / scale : value[key] ?? ""}
                      placeholder={inherited[key] != null ? "Inherited: " + inherited[key] : "Original"}
                      onChange={event => change(v => {
                        if(["columns","gridTemplate","display"].includes(key))delete v.gridTracks;
                        if (event.target.value === "") delete v[key];
                        else v[key] = limits
                          ? Math.max(limits[0], Math.min(limits[1], Math.round(Number(event.target.value) * scale || 0)))
                          : event.target.value;
                      })}
                    />
                  )}
                </label>
              );
            })}
          </div>
        </details>
      );})}
    </section>
  );
}
