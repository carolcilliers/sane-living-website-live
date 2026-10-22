import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import core from "../../content-core/site.cjs";
import { readRecord } from "./storage";
import { htmlFor, prepareFrame } from "./SiteCanvas";
import type { Snapshot } from "./site-types";
import "./preview.css";
function Preview() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [pageId, setPageId] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const auth = await fetch("/api/dash-login", { cache: "no-store" }).then(
          (r) => r.json(),
        );
        if (!auth.loggedIn)
          throw Error(
            "Sign in to the team dashboard to open this private preview.",
          );
        const id = new URLSearchParams(location.search).get("snapshot");
        if (!id || !/^[a-f0-9-]{36}$/.test(id))
          throw Error("This preview address is invalid.");
        const record = await readRecord("snapshots", id),
          s = record?.value as Snapshot;
        if (!s)
          throw Error(
            "This preview belongs to another browser or was cleared on logout. Open a new preview from Page Editor.",
          );
        const errors = core.validate(s.work.project, s.registry, {
          ...s.resources,
          about: s.work.aboutText,
        });
        if (errors.length)
          throw Error(
            "The preview snapshot is incompatible. Return to the editor and create a new preview.",
          );
        if (active) {
          setSnapshot(s);
          setPageId(s.pageId);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    function check() {
      void fetch("/api/dash-login", { cache: "no-store" })
        .then((r) => r.json())
        .then((a) => {
          if (!a.loggedIn) {
            setSnapshot(null);
            setError("Your dashboard session ended. Sign in again to preview.");
          }
        })
        .catch(() => {});
    }
    function logout(e: StorageEvent) {
      if (e.key === "sl_studio_logout") {
        setSnapshot(null);
        setError("Your dashboard session ended. Sign in again to preview.");
      }
    }
    window.addEventListener("focus", check);
    window.addEventListener("storage", logout);
    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", logout);
    };
  }, []);
  useEffect(() => {
    setReady(false);
  }, [pageId]);
  if (error)
    return (
      <main className="preview-error">
        <h1>Private preview unavailable</h1>
        <p>{error}</p>
        <a href="/dash/#editor">Open Page Editor</a>
      </main>
    );
  if (!snapshot)
    return <main className="preview-error">Opening your private preview…</main>;
  const page =
    snapshot.work.project.pages.find((p) => p.id === pageId) ||
    snapshot.work.project.pages[0];
  const html = htmlFor(
    page,
    snapshot.work.project,
    snapshot.registry,
    { ...snapshot.resources, about: snapshot.work.aboutText },
    snapshot.work.assets,
    false,
  );
  return (
    <div className="private-preview">
      <header>
        <strong>
          Draft preview <span>Not published</span>
        </strong>
        <select
          aria-label="Preview page"
          value={page.id}
          onChange={(e) => setPageId(e.target.value)}
        >
          {snapshot.work.project.pages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.route}
            </option>
          ))}
        </select>
        <button onClick={() => { if(parent !== window) parent.postMessage({type:"studio:close-preview"},location.origin); else window.close(); }}>Close preview</button>
      </header>
      {!ready ? (
        <div className="preview-loading" role="status">
          Loading page…
        </div>
      ) : null}
      <iframe
        title="Full-page draft preview"
        ref={frame}
        sandbox="allow-same-origin allow-scripts"
        srcDoc={html}
        style={{ visibility: ready ? "visible" : "hidden" }}
        onLoad={() => {
          if (!frame.current) return;
          prepareFrame(
            frame.current,
            page.route,
            (route) => {
              const p = snapshot.work.project.pages.find(
                (p) =>
                  p.route === route || p.route.replace(/\/$/, "") === route,
              );
              if (p) setPageId(p.id);
              else setMessage("This link is outside this preview snapshot.");
            },
            setMessage,
          );
          setReady(true);
        }}
      />
      {message ? (
        <div className="preview-notice" role="status">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      ) : null}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
