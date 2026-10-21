import {
  StrictMode,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  Component,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { Layers } from "./Layers";
import { Inspector } from "./Inspector";
import { Preview } from "./Preview";
import type { About } from "./types";
import "./style.css";
const KEY = "sl_editor_about_v1";
interface History {
  now: About | null;
  past: About[];
  future: About[];
  group: string;
}
type Action =
  | { type: "load"; model: About }
  | { type: "edit"; model: About; group: string }
  | { type: "undo" }
  | { type: "redo" };
function reducer(s: History, a: Action): History {
  if (a.type === "load")
    return { now: a.model, past: [], future: [], group: "" };
  if (a.type === "edit")
    return {
      now: a.model,
      past:
        s.now && a.group !== s.group ? [...s.past, s.now].slice(-50) : s.past,
      future: [],
      group: a.group,
    };
  if (a.type === "undo" && s.now && s.past.length)
    return {
      now: s.past.at(-1)!,
      past: s.past.slice(0, -1),
      future: [s.now, ...s.future],
      group: "",
    };
  if (a.type === "redo" && s.now && s.future.length)
    return {
      now: s.future[0],
      past: [...s.past, s.now].slice(-50),
      future: s.future.slice(1),
      group: "",
    };
  return s;
}
function App() {
  const [history, dispatch] = useReducer(reducer, {
    now: null,
    past: [],
    future: [],
    group: "",
  });
  const model = history.now;
  const [selected, select] = useState("");
  const [width, setWidth] = useState(1024);
  const [clean, setClean] = useState(false);
  const [tab, setTab] = useState<"sections" | "canvas" | "edit">("canvas");
  const [template, setTemplate] = useState("");
  const [sourceSha, setSha] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [saveState, setSaveState] = useState("Not saved yet");
  const [stale, setStale] = useState(false);
  const [recoveryBlocked, setRecoveryBlocked] = useState(false);
  const [publishedSha, setPublishedSha] = useState("");
  const current = useRef({ model, sourceSha, recoveryBlocked });
  current.current = { model, sourceSha, recoveryBlocked };
  const lastSaved = useRef("");
  const knownStorage = useRef<string | null>(null);
  const loadId = useRef(0);
  const importInput = useRef<HTMLInputElement>(null);
  const saveLocal = useCallback(() => {
    const { model: m, sourceSha: sha } = current.current;
    if (!m || !sha) return;
    if (current.current.recoveryBlocked) {
      setSaveState(
        "Older recovery retained — download it before starting over",
      );
      return;
    }
    try {
      const text = JSON.stringify(window.SaneEditorModel.exportDraft(m, sha));
      const existing = localStorage.getItem(KEY);
      if (existing !== knownStorage.current && existing !== text) {
        setRecoveryBlocked(true);
        setSaveState(
          "Another browser tab changed this draft — recovery retained",
        );
        return;
      }
      localStorage.setItem(KEY, text);
      knownStorage.current = text;
      lastSaved.current = text;
      setSaveState("Saved on this browser");
    } catch {
      setSaveState("Browser save failed — download your draft");
    }
  }, []);
  const load = useCallback(async (reset = false) => {
    const id = ++loadId.current;
    setLoading(true);
    setLoadError("");
    try {
      const [response, page] = await Promise.all([
        fetch("/api/dash-content?section=about", { cache: "no-store" }),
        fetch("/about/", { cache: "no-store" }),
      ]);
      if (!response.ok)
        throw Error(
          response.status === 401
            ? "Sign in to the dashboard to load the About page."
            : "The About source could not be loaded. Retry before editing.",
        );
      if (!page.ok)
        throw Error("The public About preview template could not be loaded.");
      const data = await response.json(),
        html = await page.text();
      if (!data.published?.content || !data.published.sha)
        throw Error(
          "The published About source is missing. Nothing has been replaced.",
        );
      let m = window.SaneEditorModel.fromSource(data.published.content, () =>
          crypto.randomUUID(),
        ),
        base = data.published.sha,
        recovered = false,
        isStale = false,
        blocked = false;
      if (!html.includes("<!-- about-managed:start -->"))
        throw Error(
          "The About preview template is incompatible. The public site has not been changed.",
        );
      if (!reset) {
        let stored: string | null = null;
        try {
          stored = localStorage.getItem(KEY);
          knownStorage.current = stored;
        } catch {
          setMessage(
            "Browser recovery is unavailable. Download a draft to keep your work.",
          );
        }
        if (stored) {
          try {
            const recovery = window.SaneEditorModel.importDraft(
              JSON.parse(stored),
            );
            m = recovery.model;
            base = recovery.sourceSha;
            isStale = base !== data.published.sha;
            recovered = true;
          } catch {
            blocked = true;
            setMessage(
              "An older browser draft could not be opened. It has been left intact; use Import draft with a compatible file.",
            );
          }
        }
      }
      if (id !== loadId.current) return;
      setTemplate(html);
      setSha(base);
      setPublishedSha(data.published.sha);
      setRecoveryBlocked(blocked);
      setStale(isStale);
      dispatch({ type: "load", model: m });
      select(m.metadata.sections?.[0]?.id || "");
      setSaveState(
        recovered ? "Recovered browser draft" : "Published copy loaded",
      );
      if (reset) {
        try {
          localStorage.removeItem(KEY);
          knownStorage.current = null;
        } catch {}
        setMessage(
          "Loaded the current published copy. Your website is unchanged.",
        );
      }
    } catch (e) {
      if (id === loadId.current) setLoadError((e as Error).message);
    } finally {
      if (id === loadId.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      loadId.current++;
    };
  }, [load]);
  useEffect(() => {
    if (!model || loading) return;
    if (recoveryBlocked) {
      setSaveState(
        "Older recovery retained — download it before starting over",
      );
      return;
    }
    setSaveState("Saving on this browser…");
    const t = setTimeout(saveLocal, 600);
    return () => clearTimeout(t);
  }, [model, sourceSha, loading, recoveryBlocked, saveLocal]);
  useEffect(() => {
    function flush(e: MessageEvent) {
      if (
        e.origin === location.origin &&
        e.source === window.parent &&
        e.data?.type === "sane-editor:flush"
      )
        saveLocal();
    }
    function leave(e: BeforeUnloadEvent) {
      const v = current.current;
      if (
        v.model &&
        v.sourceSha &&
        lastSaved.current !==
          JSON.stringify(
            window.SaneEditorModel.exportDraft(v.model, v.sourceSha),
          )
      ) {
        saveLocal();
        if (
          lastSaved.current !==
          JSON.stringify(
            window.SaneEditorModel.exportDraft(v.model, v.sourceSha),
          )
        ) {
          e.preventDefault();
          e.returnValue = "";
        }
      }
    }
    window.addEventListener("message", flush);
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("message", flush);
      window.removeEventListener("beforeunload", leave);
    };
  }, [saveLocal]);
  function change(fn: (m: About) => void, group: string = crypto.randomUUID()) {
    if (!model) return;
    const next = structuredClone(model);
    fn(next);
    dispatch({ type: "edit", model: next, group });
  }
  function add() {
    const id = crypto.randomUUID();
    change((m) => {
      (m.metadata.sections ??= []).push({
        id,
        heading: "New section",
        body: "Tell your story here.",
        visible: true,
      });
    });
    select(id);
    setTab("edit");
  }
  function move(from: number, to: number) {
    const list = model?.metadata.sections || [];
    if (from < 0 || to < 0 || to >= list.length || from === to) return;
    change((m) => {
      const a = m.metadata.sections!;
      a.splice(to, 0, a.splice(from, 1)[0]);
    });
    setMessage("Section order updated in your browser draft.");
  }
  function duplicate() {
    if (!model) return;
    const i = model.metadata.sections!.findIndex((s) => s.id === selected);
    if (i < 0) return;
    const copy = structuredClone(model.metadata.sections![i]);
    copy.id = crypto.randomUUID();
    copy.heading += " (copy)";
    copy.editorRole = "none";
    change((m) => {
      m.metadata.sections!.splice(i + 1, 0, copy);
    });
    select(copy.id);
  }
  function remove() {
    if (
      !model ||
      !confirm(
        "Remove this section from your browser draft? You can undo this.",
      )
    )
      return;
    const list = model.metadata.sections || [],
      i = list.findIndex((s) => s.id === selected);
    change((m) => {
      m.metadata.sections = m.metadata.sections!.filter(
        (s) => s.id !== selected,
      );
    });
    select(list[i + 1]?.id || list[i - 1]?.id || "");
  }
  function download() {
    if (!model) return;
    const blob = new Blob(
      [
        JSON.stringify(
          window.SaneEditorModel.exportDraft(model, sourceSha),
          null,
          2,
        ) + "\n",
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "sane-living-about-draft.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Draft downloaded. This does not publish anything.");
  }
  async function importFile(file: File) {
    try {
      if (file.size > 300000)
        throw Error("Choose a draft smaller than 300 KB.");
      const d = window.SaneEditorModel.importDraft(
        JSON.parse(await file.text()),
      );
      if (
        !confirm(
          "Replace this browser draft with the imported file? Download your current draft first if you want to keep both.",
        )
      )
        return;
      setStale(d.sourceSha !== publishedSha);
      try {
        knownStorage.current = localStorage.getItem(KEY);
      } catch {}
      setRecoveryBlocked(false);
      setSha(d.sourceSha);
      dispatch({ type: "load", model: d.model });
      select(d.model.metadata.sections?.[0]?.id || "");
      setMessage("Draft imported and saved on this browser.");
    } catch (e) {
      setMessage("Import failed: " + (e as Error).message);
    } finally {
      if (importInput.current) importInput.current.value = "";
    }
  }
  const sections = model?.metadata.sections || [],
    section = sections.find((s) => s.id === selected),
    errors = model ? window.SaneEditorModel.check(model) : [];
  return (
    <div
      className="editor-app"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          saveLocal();
        }
      }}
    >
      <header className="editor-header">
        <div>
          <span className="eyebrow">SANE LIVING · CONTENT STUDIO</span>
          <h1>
            Page editor <span className="pilot">About pilot</span>
          </h1>
          <p>A quieter space to shape your story.</p>
        </div>
        <a
          href="/about/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-link"
        >
          View live page ↗
        </a>
      </header>
      <div className="pilot-note">
        <span className="note-icon">✦</span>
        <div>
          <strong>Your live website stays untouched.</strong>
          <p>
            Edit, arrange and preview a copy of About. Drafts save on this
            browser. Team saving and publishing will unlock after private
            storage and release checks are ready.
          </p>
        </div>
      </div>
      <div className="toolbar">
        <div className="page-choice">
          <span className="tiny-label">PAGE</span>
          <strong>About Sane Living</strong>
          <span>/about/</span>
        </div>
        <div className="history-actions">
          <button
            aria-label="Undo"
            disabled={!history.past.length || loading}
            onClick={() => dispatch({ type: "undo" })}
          >
            ↶ Undo
          </button>
          <button
            aria-label="Redo"
            disabled={!history.future.length || loading}
            onClick={() => dispatch({ type: "redo" })}
          >
            ↷ Redo
          </button>
        </div>
        <div className="toolbar-actions">
          <button disabled={!model || loading} onClick={saveLocal}>
            Save on this browser
          </button>
          <button
            className="primary"
            disabled={!model || loading}
            aria-pressed={clean}
            onClick={() => {
              setClean(!clean);
              setTab("canvas");
            }}
          >
            {clean ? "Back to editing" : "Preview"}
          </button>
          <button
            disabled
            title="Publishing unlocks after private team drafts and release verification are integrated."
          >
            Publish
          </button>
        </div>
      </div>
      <div className="status-row">
        <span role="status" aria-live="polite">
          {loading
            ? "Loading About…"
            : loadError
              ? "Source unavailable"
              : saveState}
        </span>
        <span>
          {clean ? "Preview mode" : sections.length + " sections"} · {width}px
        </span>
      </div>
      {loadError ? (
        <div className="error-box" role="alert">
          <h2>We couldn’t open this page</h2>
          <p>{loadError}</p>
          <button onClick={() => void load()}>Retry loading</button>
        </div>
      ) : null}
      {!loading && !loadError && model ? (
        <>
          {recoveryBlocked ? (
            <div className="warning" role="alert">
              An incompatible older recovery is still stored. Download it before
              loading the published copy or importing a replacement.{" "}
              <button
                onClick={() => {
                  const raw = localStorage.getItem(KEY);
                  if (!raw) return;
                  const u = URL.createObjectURL(
                    new Blob([raw], { type: "application/json" }),
                  );
                  const a = document.createElement("a");
                  a.href = u;
                  a.download = "sane-living-older-recovery.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(u), 1000);
                }}
              >
                Download older recovery
              </button>
            </div>
          ) : null}
          {stale ? (
            <div className="warning" role="alert">
              This browser draft is based on an older published version.
              Download it before loading the current copy. Publishing is
              unavailable in this pilot.
            </div>
          ) : null}
          {errors.length ? (
            <div className="warning" role="alert">
              {errors.join(" ")} Your browser draft is retained while you
              correct it.
            </div>
          ) : null}
          <nav className="mobile-tabs" aria-label="Editor panels">
            {(["sections", "canvas", "edit"] as const).map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => setTab(t)}
              >
                {t === "canvas"
                  ? "Canvas"
                  : t === "edit"
                    ? "Edit content"
                    : "Sections"}
              </button>
            ))}
          </nav>
          <div className={"workspace active-" + tab + (clean ? " clean" : "")}>
            {!clean ? (
              <Layers
                sections={sections}
                selected={selected}
                select={(id) => {
                  select(id);
                  setTab("edit");
                }}
                move={move}
                add={add}
              />
            ) : null}
            <main className="canvas">
              <div className="canvas-toolbar">
                <span>{clean ? "PAGE PREVIEW" : "LIVE DRAFT PREVIEW"}</span>
                <div role="group" aria-label="Preview width">
                  {[
                    [375, "Phone"],
                    [768, "Tablet"],
                    [1024, "Desktop"],
                    [1440, "Wide"],
                  ].map(([n, label]) => (
                    <button
                      key={n}
                      aria-pressed={width === n}
                      onClick={() => setWidth(Number(n))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <Preview
                model={model}
                template={template}
                width={width}
                selected={selected}
                select={(id) => {
                  select(id);
                  setTab("edit");
                }}
                clean={clean}
              />
              <p className="preview-note">
                Same About renderer as the website build. Navigation and forms
                are inactive in preview. Shared header/footer stay managed by
                the website.
              </p>
            </main>
            {!clean ? (
              <Inspector
                model={model}
                section={section}
                change={change}
                remove={remove}
                duplicate={duplicate}
              />
            ) : null}
          </div>
          <footer className="editor-footer">
            <div>
              <strong>Keep a portable copy</strong>
              <p>
                Download a draft to keep it outside this browser. Browser drafts
                are cleared on logout. Download to keep a copy.
              </p>
            </div>
            <div>
              <button onClick={download}>Download draft</button>
              <button onClick={() => importInput.current?.click()}>
                Import draft
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Load the published copy? Download this draft first if you want to keep it.",
                    )
                  )
                    void load(true);
                }}
              >
                Load published copy
              </button>
            </div>
            <input
              ref={importInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) void importFile(e.target.files[0]);
              }}
            />
          </footer>
          <details className="next-steps">
            <summary>What’s included, and what comes next?</summary>
            <p>
              This first stage follows E01–E03 of the dev plan: About content
              editing, section reordering, undo/redo, browser recovery and a
              shared-renderer preview. Existing About Page and Settings
              workflows continue separately. Private team drafts, individual
              roles and verified publishing must pass G2–G4 before this editor
              can change the live website.
            </p>
          </details>
        </>
      ) : null}
      {message ? (
        <div className="editor-message" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="error-box">
        <h1>The editor needs to reload</h1>
        <p>
          Your saved browser draft has been retained. The public website has not
          changed.
        </p>
        <button onClick={() => location.reload()}>Reload editor</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>,
);
