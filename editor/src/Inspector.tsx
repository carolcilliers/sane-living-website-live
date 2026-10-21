import { useRef } from "react";
import type { About, Section } from "./types";
interface Props {
  model: About;
  section: Section | undefined;
  change: (f: (m: About) => void, group: string) => void;
  remove: () => void;
  duplicate: () => void;
}
export function Inspector({
  model,
  section,
  change,
  remove,
  duplicate,
}: Props) {
  const group = useRef("");
  const body = useRef<HTMLTextAreaElement>(null);
  function begin() {
    group.current = crypto.randomUUID();
  }
  function field(key: string, value: string | boolean) {
    change(
      (m) => {
        const s = m.metadata.sections?.find((x) => x.id === section?.id);
        if (s) s[key] = value;
      },
      typeof value === "boolean"
        ? crypto.randomUUID()
        : group.current || crypto.randomUUID(),
    );
  }
  function format(mark: "bold" | "italic" | "list") {
    const t = body.current;
    if (!t || !section) return;
    const start = t.selectionStart,
      end = t.selectionEnd,
      text = t.value.slice(start, end) || "your text";
    const value =
      mark === "bold"
        ? "**" + text + "**"
        : mark === "italic"
          ? "*" + text + "*"
          : text
              .split("\n")
              .map((x) => "- " + x)
              .join("\n");
    change((m) => {
      m.metadata.sections!.find((s) => s.id === section.id)!.body =
        t.value.slice(0, start) + value + t.value.slice(end);
    }, crypto.randomUUID());
    requestAnimationFrame(() => {
      t.focus();
      t.setSelectionRange(start, start + value.length);
    });
  }
  return (
    <aside className="inspector">
      <div className="panel-label">
        <h2>Content & layout</h2>
      </div>
      <label className="field">
        Page heading
        <input
          aria-label="Page heading"
          maxLength={160}
          value={model.metadata.title}
          onFocus={begin}
          onChange={(e) =>
            change((m) => {
              m.metadata.title = e.target.value;
            }, group.current)
          }
        />
      </label>
      {section ? (
        <>
          <div className="section-heading">
            <span className="tiny-label">SELECTED SECTION</span>
            <h3>{section.heading || "Untitled section"}</h3>
          </div>
          <label className="field">
            Section heading
            <input
              maxLength={160}
              value={section.heading}
              onFocus={begin}
              onChange={(e) => field("heading", e.target.value)}
            />
          </label>
          <div className="field">
            <label htmlFor="story">Story</label>
            <div
              className="text-tools"
              role="group"
              aria-label="Text formatting"
            >
              <button onClick={() => format("bold")} title="Bold">
                <b>B</b>
              </button>
              <button onClick={() => format("italic")} title="Italic">
                <i>I</i>
              </button>
              <button onClick={() => format("list")}>List</button>
            </div>
            <textarea
              id="story"
              ref={body}
              rows={8}
              value={section.body || ""}
              onFocus={begin}
              onChange={(e) => field("body", e.target.value)}
            />
            <small>
              Formatting is preserved in the original Markdown. No pasted HTML
              is executed.
            </small>
          </div>
          <label className="field">
            Image URL
            <input
              placeholder="/images/photo.jpg or https://…"
              value={section.image || ""}
              maxLength={2048}
              onFocus={begin}
              onChange={(e) => field("image", e.target.value)}
            />
          </label>
          <label className="field">
            Image description
            <input
              value={section.imageAlt ?? section.heading}
              maxLength={500}
              onFocus={begin}
              onChange={(e) => field("imageAlt", e.target.value)}
            />
          </label>
          <label className="field">
            Layout
            <select
              value={section.layout || "alternating"}
              onChange={(e) =>
                change((m) => {
                  const s = m.metadata.sections!.find(
                    (x) => x.id === section.id,
                  )!;
                  if (e.target.value === "alternating") delete s.layout;
                  else s.layout = e.target.value as Section["layout"];
                }, crypto.randomUUID())
              }
            >
              <option value="alternating">Original alternating layout</option>
              <option value="image-left">Image on the left</option>
              <option value="image-right">Image on the right</option>
              <option value="text-only">Text only</option>
            </select>
          </label>
          <details>
            <summary>Link options</summary>
            <label className="field">
              Link label
              <input
                value={section.linkText || ""}
                maxLength={160}
                onFocus={begin}
                onChange={(e) => field("linkText", e.target.value)}
              />
            </label>
            <label className="field">
              Destination
              <input
                value={section.linkUrl || ""}
                maxLength={2048}
                onFocus={begin}
                onChange={(e) => field("linkUrl", e.target.value)}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={!!section.external}
                onChange={(e) => field("external", e.target.checked)}
              />
              Open in a new tab
            </label>
          </details>
          <label className="check">
            <input
              type="checkbox"
              checked={section.visible !== false}
              onChange={(e) => field("visible", e.target.checked)}
            />
            Show this section
          </label>
          {section.editorRole === "founder" ? (
            <p className="hint">
              The philosophy section stays attached here, even if the heading
              changes.
            </p>
          ) : null}
          <div className="section-actions">
            <button onClick={duplicate}>Duplicate</button>
            <button className="danger" onClick={remove}>
              Remove
            </button>
          </div>
        </>
      ) : (
        <p className="hint">Choose a section to edit its story and layout.</p>
      )}
      <details className="extra">
        <summary>Additional page text</summary>
        <label className="field">
          Preserved Markdown after the sections
          <textarea
            rows={6}
            value={model.body}
            onFocus={begin}
            onChange={(e) =>
              change((m) => {
                m.body = e.target.value;
              }, group.current)
            }
          />
        </label>
      </details>
    </aside>
  );
}
