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
  objectFit: "Image fit", aspectRatio: "Aspect ratio",
};
const optionsLabels: Record<string, string> = {
  "flex-start": "Start", "flex-end": "End", "space-between": "Space between",
  "space-around": "Space around", flex: "Row / column", grid: "Columns",
  block: "Normal flow", none: "Hidden", row: "Horizontal", column: "Vertical",
};
const groups = [
  { title: "Size & position", keys: ["width", "height", "minHeight", "x", "y", "aspectRatio", "objectFit"] },
  { title: "Rows, columns & spacing", keys: ["display", "direction", "columns", "justify", "items", "gap", "padding", "margin"] },
  { title: "Typography & appearance", keys: ["fontSize", "fontWeight", "lineHeight", "align", "color", "background", "opacity", "radius", "borderWidth", "borderColor"] },
];

export function DesignInspector({ value, inherited = {}, device, change, reset, optimize }: {
  value: Design;
  inherited?: Design;
  device: Device;
  change: (fn: (v: Design) => void) => void;
  reset: () => void;
  optimize: () => void;
}) {
  return (
    <section className="responsive-design">
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
      {groups.map(group => (
        <details className="design-options" open key={group.title}>
          <summary>{group.title}</summary>
          <div className="element-coordinates">
            {group.keys.map(key => {
              const limits = core.design.numbers[key], options = core.design.enums[key];
              const scale = key === "lineHeight" ? 10 : 1;
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
