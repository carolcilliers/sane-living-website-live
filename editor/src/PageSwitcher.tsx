import { useEffect, useRef, useState } from "react";
import type { Page } from "./site-types";
export function PageSwitcher({
  pages,
  current,
  choose,
}: {
  pages: Page[];
  current?: Page;
  choose: (id: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null),
    search = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const items = pages.filter((p) =>
    (p.name + " " + p.route).toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(
        Math.max(
          0,
          pages.findIndex((p) => p.id === current?.id),
        ),
      );
      requestAnimationFrame(() => search.current?.focus());
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    function outside(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    const blur = () => setOpen(false);
    window.addEventListener("pointerdown", outside);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("blur", blur);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      root.current
        ?.querySelector("#studio-page-option-" + active)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  function pick(id: string) {
    choose(id);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      className="header-page-switcher"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
        if (open && ["ArrowDown", "ArrowUp"].includes(e.key)) {
          e.preventDefault();
          setActive((n) =>
            Math.max(
              0,
              Math.min(items.length - 1, n + (e.key === "ArrowDown" ? 1 : -1)),
            ),
          );
        }
        if (open && e.key === "Enter" && items[active]) {
          e.preventDefault();
          pick(items[active].id);
        }
        if (e.key === "Tab") setOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        className="header-page-trigger"
        aria-label="Switch page"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="header-page-icon" aria-hidden="true">
          ▤
        </span>
        <span>
          <small>EDITING PAGE</small>
          <strong>{current?.name || "Choose a page"}</strong>
        </span>
        <span className="header-page-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {open ? (
        <div className="header-page-menu">
          <div className="header-page-search">
            <span aria-hidden="true">⌕</span>
            <input
              ref={search}
              role="combobox"
              aria-label="Find a page"
              aria-expanded={open}
              aria-controls="studio-page-options"
              aria-activedescendant={
                items[active] ? "studio-page-option-" + active : undefined
              }
              placeholder="Find a page…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
            />
          </div>
          <div
            id="studio-page-options"
            role="listbox"
            aria-label="Website pages"
          >
            {items.map((p, i) => (
              <button
                type="button"
                role="option"
                id={"studio-page-option-" + i}
                aria-selected={current?.id === p.id}
                className={i === active ? "keyboard-active" : ""}
                key={p.id}
                onPointerMove={() => setActive(i)}
                onClick={() => pick(p.id)}
              >
                <span className="header-option-icon" aria-hidden="true">
                  {p.route === "/" ? "⌂" : "▤"}
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.route}</small>
                </span>
                {current?.id === p.id ? (
                  <span className="header-option-check" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </button>
            ))}
            {!items.length ? <p>No pages match “{query}”.</p> : null}
          </div>
          <footer>
            {pages.length} pages <span>↑ ↓ to browse · Enter to open</span>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
