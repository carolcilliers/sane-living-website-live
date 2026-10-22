import { useRef } from "react";
import core from "../../content-core/site.cjs";
import type { Design, Device } from "./site-types";

const labels: Record<string, string> = {
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
  shadow:"Shadow",shadowX:"Shadow X",shadowY:"Shadow Y",shadowBlur:"Blur",shadowSpread:"Spread",shadowOpacity:"Shadow opacity (%)",shadowColor:"Shadow colour",
};
const optionsLabels: Record<string, string> = {
  "flex-start": "Start", "flex-end": "End", "space-between": "Space between",
  "space-around": "Space around", flex: "Row / column", grid: "Columns",
  block: "Normal flow", none: "Hidden", row: "Horizontal", column: "Vertical",
};
const groups = [
  { title: "Size & position", nav:"Size", help:"Move freely keeps this element in its current container. Reorder changes its place in the layer tree.", keys: ["width", "height", "minHeight", "x", "y", "aspectRatio", "objectFit"] },
  { title: "Layout & spacing", nav:"Layout", help:"Columns creates a grid. Direction creates a horizontal or vertical flow. Padding is inside; margin is outside.", keys: ["display", "direction", "columns", "justify", "items", "gap", "padding", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "margin", "marginTop", "marginRight", "marginBottom", "marginLeft"] },
  { title: "Text & typography", nav:"Text", help:"Typography applies to this element at the selected screen size.", keys: ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "align", "color"] },
  { title: "Background, borders & shadow", nav:"Style", help:"Use a six-digit colour such as #8a56a0, or transparent for the background. Choose Custom to adjust a shadow in detail.", keys: ["background", "opacity", "radius", "borderStyle", "borderWidth", "borderColor", "shadow", "shadowX", "shadowY", "shadowBlur", "shadowSpread", "shadowOpacity", "shadowColor"] },
];

export function DesignInspector({ value, inherited = {}, device, change, reset, optimize }: {
  value: Design;
  inherited?: Design;
  device: Device;
  change: (fn: (v: Design) => void) => void;
  reset: () => void;
  optimize: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  return (
    <section className="responsive-design" ref={root}>
      <div className="design-scope">
        <strong>Editing {device} layout</strong>
        <small>Only this size changes. Content, additions, removals and layer order stay shared.</small>
      </div>
      <div className="block-actions">
        <button onClick={optimize}>Optimize for {device}</button>
        <button onClick={() => change(v => {
          if (v.display === "none") delete v.display;
          else v.display = "none";
        })}>
          {value.display === "none" ? "Restore on " : "Hide on "}{device}
        </button>
        <button onClick={reset}>Reset {device} overrides</button>
      </div>
      <nav className="design-navigation" aria-label="Inspector sections">{groups.map((g,i)=><button key={g.nav} onClick={()=>{const target=root.current?.querySelector<HTMLDetailsElement>('[data-design-group="'+i+'"]');if(!target)return;target.open=true;const panel=root.current?.closest<HTMLElement>('.studio-inspector');if(panel)panel.scrollTo({top:panel.scrollTop+target.getBoundingClientRect().top-panel.getBoundingClientRect().top-58,behavior:'smooth'});}}>{g.nav}</button>)}</nav>
      {groups.map((group,i) => (
        <details className="design-options" data-design-group={i} open key={group.title}>
          <summary>{group.title}</summary>
          <p className="design-help">{group.help}</p>
          <div className="element-coordinates">
            {group.keys.filter(key=>!key.startsWith("shadow") || key === "shadow" || value.shadow === "custom").map(key => {
              const limits = core.design.numbers[key], options = core.design.enums[key];
              const scale = ["lineHeight","letterSpacing"].includes(key) ? 10 : 1;
              return (
                <label className="field" key={key}>
                  {labels[key]}
                  {options ? (
                    <select aria-label={labels[key]} value={value[key] ?? ""}
                      onChange={event => change(v => {
                        if (event.target.value) v[key] = event.target.value;
                        else delete v[key];
                      })}>
                      <option value="">Inherit original</option>
                      {options.map((option: string) => (
                        <option key={option} value={option}>{optionsLabels[option] || option}</option>
                      ))}
                    </select>
                  ) : (
                    <input aria-label={labels[key]} type={limits ? "number" : "text"}
                      min={limits ? limits[0] / scale : undefined}
                      max={limits ? limits[1] / scale : undefined}
                      step={1 / scale}
                      value={value[key] != null && limits ? Number(value[key]) / scale : value[key] ?? ""}
                      placeholder={inherited[key] != null ? "Inherited: " + inherited[key] : "Original"}
                      onChange={event => change(v => {
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
      ))}
    </section>
  );
}
