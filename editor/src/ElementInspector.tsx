import type { Asset, Block, ElementChange } from "./site-types";
import { DesignInspector } from "./DesignInspector";
import type { Device, Design } from "./site-types";
import core from "../../content-core/site.cjs";
type Upload = (file: File, set: (url: string) => void) => Promise<void>;
export function ElementTree({
  descriptor,
  block,
  selected,
  choose,
  move,
}: {
  descriptor: any;
  block: Block;
  selected: string;
  choose: (id: string) => void;
  move: (from: string, to: string, after: boolean) => void;
}) {
  const original = descriptor?.elements || [];
  const items: any[] = [];
  function visit(parent: string | null) {
    original.filter((e: any) => (block.elements?.[e.id]?.parent ?? e.parent) === parent)
      .sort((a: any,b: any) => (block.elements?.[a.id]?.order ?? a.start) - (block.elements?.[b.id]?.order ?? b.start))
      .forEach((e: any) => { if(items.some(x=>x.id===e.id))return; items.push(e); visit(e.id); });
  }
  visit(null);
  if(!items.length)items.push(...original);
  return (
    <div className="element-tree" aria-label="Elements in section">
      <p>Click an element, or drag its canvas handle.</p>
      {items.map((e: any) => {
        let depth = 0,
          parent = block.elements?.[e.id]?.parent ?? e.parent;
        while (parent && depth < 8) {
          depth++;
          parent = block.elements?.[parent]?.parent ?? items.find((x: any) => x.id === parent)?.parent;
        }
        return (
          <button
            key={e.id}
            draggable={!e.managed && !!e.parent}
            onDragStart={(event) => {
              event.dataTransfer.setData(
                "application/sane-element",
                JSON.stringify({ block: block.id, element: e.id }),
              );
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              try {
                const value = JSON.parse(
                  event.dataTransfer.getData("application/sane-element"),
                );
                if (value.block === block.id)
                  move(
                    value.element,
                    e.id,
                    event.clientY >
                      event.currentTarget.getBoundingClientRect().top +
                        event.currentTarget.clientHeight / 2,
                  );
              } catch {}
            }}
            aria-pressed={selected === e.id}
            style={{ paddingLeft: 8 + depth * 10 }}
            onClick={() => choose(e.id)}
          >
            <code>{e.tag}</code>
            <span>{e.label}</span>
            {block.elements?.[e.id]?.hidden ? <small>Removed</small> : null}
          </button>
        );
      })}
    </div>
  );
}
function ImageUpload({
  upload,
  set,
  multiple = false,
}: {
  upload: Upload;
  set: (u: string) => void;
  multiple?: boolean;
}) {
  return (
    <label className="asset-picker">
      {multiple ? "Add images" : "Upload image"}
      <input
        type="file"
        multiple={multiple}
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={async (e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = "";
          for (const file of files) await upload(file, set);
        }}
      />
    </label>
  );
}
export function ElementInspector({
  descriptor,
  block,
  id,
  change,
  field,
  setting,
  settings,
  upload,
  action,
  assets,
  device,
  openContent,
}: {
  descriptor: any;
  block: Block;
  id: string;
  change: (fn: (v: ElementChange) => void) => void;
  field: (id: string, value: string) => void;
  setting: (key: string, value: any) => void;
  settings: Record<string, any>;
  upload: Upload;
  action: (s: string) => void;
  assets: Asset[];
  device: Device;
  openContent?: () => void;
}) {
  const e = descriptor.elements.find((e: any) => e.id === id);
  if (!e) return null;
  const v = block.elements?.[id] || {},
    fields = descriptor.fields.filter((f: any) => f.element === id);
  return (
    <section className="element-inspector">
      <div className="element-title">
        <code>{e.tag}</code>
        <h3>{e.label}</h3>
      </div>
      {e.tag === "img" ? <div className="selection-actions"><button onClick={()=>action("remove")}>{v.hidden ? "Restore image" : "Remove image"}</button><small>Removes only this image from the page. The frame, caption and surrounding section stay. Undo restores it.</small></div> : null}
      {descriptor.elements.some((part:any)=>part.dragOwner) ? <div className="binding-note"><p>Drag an image to reorder its whole card. Its frame and caption stay together. Click the image to edit it.</p><button onClick={()=>action("restore-cards")}>Restore image card layout</button><small>Restores this row’s frames and positions, keeping image choices, captions and other page edits. Undo is available.</small></div> : null}
      {e.virtual ? <div className="binding-note"><p>This paragraph is connected to the Weddings content. Its appearance can be styled here.</p><button onClick={openContent}>Edit wedding policy text</button></div> : null}
      {e.bindings.map((b: any) => (
        <label className="field" key={b.key}>
          {(
            {
              homePrimaryLabel: "Button text",
              homePrimaryUrl: "Button destination",
              homeHeading: "Hero headline",
              homeIntro: "Hero introduction",
            } as Record<string, string>
          )[b.key] || b.label}
          <input
            aria-label={b.key === "homePrimaryLabel" ? "Button text" : b.label}
            value={String(settings[b.key] || "")}
            onChange={(event) => setting(b.key, event.target.value)}
          />
          {b.kind === "image" ? (
            <ImageUpload upload={upload} set={(url) => setting(b.key, url)} />
          ) : null}
          {b.kind === "video" ? (
            <small>
              Use a direct MP4 URL or existing /file.mp4 path. Leave blank for
              an image hero.
            </small>
          ) : null}
        </label>
      ))}
      {fields.map((f: any) => (
        <label className="field" key={f.id}>
          {f.label}
          {f.kind === "text" && !f.attribute ? (
            <textarea
              rows={3}
              value={block.edits?.[f.id] ?? f.value}
              onChange={(event) => field(f.id, event.target.value)}
            />
          ) : (
            <input
              value={block.edits?.[f.id] ?? f.value}
              onChange={(event) => field(f.id, event.target.value)}
            />
          )}{" "}
          {f.kind === "image" ? (
            <ImageUpload upload={upload} set={(url) => field(f.id, url)} />
          ) : null}
        </label>
      ))}
      {!fields.length && !e.bindings.length ? (
        <p className="binding-note">
          {e.managed
            ? "This collection is generated by its connected content source. Its markup stays connected."
            : "This is a layout container. Select its text, image or button in the element list to edit the content."}
        </p>
      ) : null}
      <DesignInspector
        upload={upload}
        device={device}
        value={v.responsive?.[device] || {}}
        inherited={Object.fromEntries(Object.entries(v).filter(([k]) => core.design.keys.includes(k))) as Design}
        change={(fn) => change(x => { x.responsive ||= {}; x.responsive[device] ||= {}; fn(x.responsive[device]!); })}
        reset={() => change(x => { if(x.responsive) delete x.responsive[device]; })}
        optimize={() => change(x => { x.responsive ||= {}; x.responsive[device] = { ...x.responsive[device], x:0,y:0,width:100, ...(e.tag === "img" ? {objectFit:"cover"} : {}), ...(device !== "desktop" && /^(div|section|article|main)$/.test(e.tag) ? {display:"flex",direction:"column",gap:16,columns:1} : {}) }; delete x.responsive[device]!.height; })}
      />
      <div className="block-actions">
        <button onClick={() => action("up")}>Element ↑</button>
        <button onClick={() => action("down")}>Element ↓</button>
        <button onClick={() => action("remove")}>{v.hidden ? "Restore element" : "Remove element"}</button>
      </div>
      {e.tag === "img" ? (
        <details open className="design-options">
          <summary>Turn this image into a gallery</summary>
          <p className="sidebar-help">
            The existing image stays first. Add more slides, then use the arrows
            in Preview or on the published page.
          </p>
          <ImageUpload
            upload={upload}
            multiple
            set={(url) =>
              change((x) => {
                x.gallery = [...(x.gallery || []), url].slice(0, 12);
              })
            }
          />
          {(v.gallery || []).map((u, i) => (
            <div className="slide-row" key={i}>
              <img
                src={(() => {
                  const asset = assets.find((a) => a.url === u);
                  const ext = u.split(".").pop();
                  return asset
                    ? "data:image/" +
                        (ext === "jpg" || ext === "jpeg" ? "jpeg" : ext) +
                        ";base64," +
                        asset.base64
                    : u;
                })()}
                alt=""
              />
              <input
                aria-label={"Slide " + (i + 2) + " URL"}
                value={u}
                onChange={(event) =>
                  change((x) => {
                    x.gallery![i] = event.target.value;
                  })
                }
              />
              <button
                aria-label={"Remove slide " + (i + 2)}
                onClick={() =>
                  change((x) => {
                    x.gallery!.splice(i, 1);
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
        </details>
      ) : null}
    </section>
  );
}
export function EditorSettings({
  value,
  set,
  upload,
}: {
  value: Record<string, any>;
  set: (key: string, value: any) => void;
  upload: Upload;
}) {
  return (
    <div className="editor-settings">
      <p className="sidebar-help">
        These use the existing site settings. Save privately or Publish with the
        toolbar above.
      </p>
      {core.settings.groups.map((g: any) => (
        <details key={g.id} open={g.id === "home"}>
          <summary>{g.label}</summary>
          {g.fields.map((f: any) => (
            <label className="field" key={f.key}>
              {f.type === "boolean" ? (
                <>
                  <input
                    type="checkbox"
                    aria-label={f.label}
                    checked={!!value[f.key]}
                    onChange={(e) => set(f.key, e.target.checked)}
                  />
                  {f.label}
                </>
              ) : (
                <>
                  {f.label}
                  {f.type === "textarea" ? (
                    <textarea
                      aria-label={f.label}
                      value={value[f.key] || ""}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  ) : (
                    <input
                      aria-label={f.label}
                      value={value[f.key] || ""}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                  )}{" "}
                  {["image", "icon"].includes(f.type) ? (
                    <ImageUpload
                      upload={upload}
                      set={(url) => set(f.key, url)}
                    />
                  ) : null}
                  {f.hint ? <small>{f.hint}</small> : null}
                </>
              )}
            </label>
          ))}
          {g.id === "navigation"
            ? (value.navigation || []).map((n: any, i: number) => (
                <div className="editor-nav-row" key={n.route}>
                  <input
                    aria-label={"Menu label " + n.route}
                    value={n.label}
                    onChange={(e) =>
                      set(
                        "navigation",
                        value.navigation.map((x: any, j: number) =>
                          j === i ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={n.visible}
                      onChange={(e) =>
                        set(
                          "navigation",
                          value.navigation.map((x: any, j: number) =>
                            j === i ? { ...x, visible: e.target.checked } : x,
                          ),
                        )
                      }
                    />
                    Show
                  </label>
                  <button
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...value.navigation];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      set("navigation", next);
                    }}
                  >
                    ↑
                  </button>
                </div>
              ))
            : null}
        </details>
      ))}
    </div>
  );
}
