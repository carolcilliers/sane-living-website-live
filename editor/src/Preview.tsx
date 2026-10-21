import { useEffect, useMemo, useRef, useState } from "react";
import type { About } from "./types";
export function Preview({
  model,
  template,
  width,
  selected,
  select,
  clean,
}: {
  model: About;
  template: string;
  width: number;
  selected: string;
  select: (s: string) => void;
  clean: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(500);
  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(() =>
      setAvailable(node.clientWidth - 36),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const scale = Math.min(1, Math.max(240, available) / width);
  const html = useMemo(() => {
    const philosophy =
      /<!-- philosophy:start -->([\s\S]*?)<!-- philosophy:end -->/.exec(
        template,
      )?.[1] || "";
    const rendered = window.SaneAboutRenderer.documentHtml(
      template,
      model,
      philosophy,
      true,
    );
    const doc = new DOMParser().parseFromString(rendered, "text/html");
    doc
      .querySelectorAll("script,base,meta[http-equiv],iframe,object,embed")
      .forEach((el) => el.remove());
    // Trusted template + escaped content only. The frame permits DOM inspection, never scripts/forms/navigation.
    doc.querySelectorAll("*").forEach((el) => {
      for (const a of Array.from(el.attributes))
        if (a.name.startsWith("on")) el.removeAttribute(a.name);
    });
    doc.querySelectorAll("a").forEach((el) => {
      el.removeAttribute("href");
      el.removeAttribute("target");
    });
    doc.querySelectorAll("form").forEach((el) => el.removeAttribute("action"));
    const base = doc.createElement("base");
    base.href = location.origin + "/";
    doc.head.prepend(base);
    const style = doc.createElement("style");
    style.textContent =
      "[data-animate]{opacity:1!important;transform:none!important}body{min-width:0!important} [data-editor-id]{cursor:pointer;outline-offset:5px} [data-editor-id]:hover{outline:1px solid #9a87a3} [data-editor-selected]{outline:2px solid #755b83!important} input,button,form{pointer-events:none}" +
      (clean ? "[data-editor-id]{outline:0!important;cursor:default}" : "");
    doc.head.append(style);
    return "<!doctype html>" + doc.documentElement.outerHTML;
  }, [model, template, clean]);
  useEffect(() => {
    const d = frame.current?.contentDocument;
    if (!d) return;
    d.querySelectorAll("[data-editor-id]").forEach((el) =>
      el.toggleAttribute(
        "data-editor-selected",
        !clean && el.getAttribute("data-editor-id") === selected,
      ),
    );
  }, [selected, clean, html]);
  function loaded() {
    const d = frame.current?.contentDocument;
    if (!d) return;
    d.querySelectorAll("[data-editor-id]").forEach((el) => {
      el.toggleAttribute(
        "data-editor-selected",
        !clean && el.getAttribute("data-editor-id") === selected,
      );
      if (!clean)
        el.addEventListener("click", () =>
          select(el.getAttribute("data-editor-id")!),
        );
    });
  }
  return (
    <div className="canvas-scroll" ref={viewport}>
      <div
        className="canvas-fit"
        style={{ width: width * scale, height: 1281 * scale }}
      >
        <div
          className="canvas-size"
          style={{
            width,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div className="canvas-caption">
            <span className="browser-dots">● ● ●</span>
            <span>
              saneliving.com/about/ · {width}px · fit {Math.round(scale * 100)}%
            </span>
          </div>
          <iframe
            ref={frame}
            title="About page preview"
            sandbox="allow-same-origin"
            srcDoc={html}
            onLoad={loaded}
          />
        </div>
      </div>
    </div>
  );
}
