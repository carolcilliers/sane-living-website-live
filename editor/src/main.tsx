import { LAYOUTS, makeLayout, LayoutWire, resolveBlockInsertion } from "./LayoutLibrary";
import {
  StrictMode,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
  Component,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import core from "../../content-core/site.cjs";
import { DesignInspector } from "./DesignInspector";
import { PageSwitcher } from "./PageSwitcher";
import { Inspector } from "./Inspector";
import { Layers } from "./Layers";
import {
  ElementTree,
  ElementInspector,
  EditorSettings,
} from "./ElementInspector";
import { SiteCanvas } from "./SiteCanvas";
import { readRecord, saveDraft, snapshot, clearDraft, draftHistory } from "./storage";
import type {
  Workspace,
  Block,
  Page,
  Bootstrap,
  Saved,
  Snapshot,
  Device,
} from "./site-types";
import type { About } from "./types";
import "./style.css";
import "./site-style.css";
import "./workspace-polish.css";
const LABELS: Record<string, string> = {
  section: "Section",
  row: "Row",
  column: "Column",
  video: "Video",
  list: "List",
  quote: "Quote",
  details: "FAQ / Details",
  card: "Card",
  badge: "Badge",
  heading: "Heading",
  text: "Text",
  image: "Image",
  split: "Image + text",
  button: "Button",
  spacer: "Spacer",
  divider: "Divider",
  callout: "Callout",
  gallery: "Gallery",
  events: "Live events",
  pricing: "Pricing",
  partners: "Partners",
  booking: "Booking form",
  newsletter: "Newsletter",
  slideshow: "Image slideshow",
};
const SYMBOLS: Record<string, string> = {
  section: "▣",
  row: "▤",
  column: "▥",
  video: "▶", list: "≡", quote: "❝", details: "?", card: "▣", badge: "◉",
  heading: "H",
  text: "T",
  image: "▧",
  split: "◧",
  button: "↗",
  spacer: "↕",
  divider: "—",
  callout: "❝",
  gallery: "▦",
  events: "□",
  pricing: "$",
  partners: "♧",
  booking: "▤",
  newsletter: "✉",
  slideshow: "▦",
};
const FIELD_LABELS: Record<string, string> = {
  text: "Text",
  heading: "Heading",
  items: "List items (one per line)", style:"List style", citation:"Attribution", summary:"Question / summary", poster:"Video poster", buttonText:"Button text",
  level: "Heading level",
  src: "Image URL",
  alt: "Image description",
  caption: "Caption",
  url: "Destination",
  side: "Image position",
  height: "Height",
  section: "Gallery section",
  kind: "Connected form",
  images: "Images (one URL per line)",
};
function settingsState(text: string) {
  try {
    const value = core.settings.normalize(JSON.parse(text));
    return { value, errors: core.settings.validate(value) };
  } catch {
    return {
      value: core.settings.normalize({}),
      errors: [
        "The settings draft is unreadable. Import a valid draft or load the published version.",
      ],
    };
  }
}
function download(value: unknown, name = "sane-living-website-draft.json") {
  const u = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
async function api(url: string, body?: unknown) {
  const r = await fetch(url, {
    cache: "no-store",
    ...(body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const d = await r.json();
  if (!r.ok)
    throw Error(
      r.status === 401
        ? "Your team session ended. Sign in again; your private draft is retained."
        : d.error || "The website could not be loaded.",
    );
  return d;
}
function fingerprint(value: unknown) {
 return JSON.stringify(value,(_key,v)=>v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v);
}
function downloadSaved(value: Saved, name: string) {
 download({kind:"sane-website-draft",version:2,baseLayoutSha:value.layoutSha,baseVersions:value.versions,baseAbout:value.baseAbout,baseSettings:value.baseSettings,work:value.work},name);
}
function sourceBase(d: Bootstrap | Saved) {
  return {head:d.head,versions:d.versions,layoutSha:d.layoutSha,
    baseAbout:"resources" in d ? d.resources.about : d.baseAbout,
    baseSettings:"resources" in d ? d.resources.settings : d.baseSettings};
}
function App() {
  const [data, setData] = useState<Bootstrap | null>(null),
    [history, setHistory] = useState<{
      now: Workspace | null;
      past: Workspace[];
      future: Workspace[];
      group: string;
    }>({ now: null, past: [], future: [], group: "" });
  const work = history.now;
  const workJSON = useMemo(()=>work ? JSON.stringify(work) : "",[work]);
  const workFingerprint = useMemo(()=>fingerprint(work),[work]);
  const workRef = useRef(work);
  workRef.current = work;
  const [pageId, setPageId] = useState(
      new URLSearchParams(location.search).get("page") || "home",
    ),
    [selected, setSelected] = useState(""),
    [storyId, setStoryId] = useState(""),
    [leftTab, setLeftTab] = useState<
      "insert" | "layers" | "settings"
    >("layers");
  const [elementId, setElementId] = useState("");
  const [previewURL, setPreviewURL] = useState("");
  const [recoveryVersions, setRecoveryVersions] = useState<any[] | null>(null);
  const autoSaveFailed = useRef(false);
  const draftBase = useRef<ReturnType<typeof sourceBase> | null>(null);
  const cloudRevision = useRef(0), cloudLastSaved = useRef(""), cloudLock = useRef(false);
  const [cloud, setCloud] = useState<"loading" | "local" | "ready" | "saving" | "conflict" | "error">("loading");
  const [cloudMessage, setCloudMessage] = useState("");
  const insertionTarget = useRef<{block: string; placement?: any} | null>(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("sl_studio_theme") || "dark";
    } catch {
      return "dark";
    }
  });
  function select(id: string, element = "") {
    setSelected(id);
    setElementId(element);
  }
  useEffect(() => {
    if (parent !== window)
      parent.postMessage({ type: "studio:theme", theme }, location.origin);
  }, [theme]);
  const [mobile, setMobile] = useState<"left" | "canvas" | "right">("canvas"),
    [width, setWidth] = useState(() => (innerWidth < 850 ? 375 : 1440)),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("Loading website…"),
    [message, notice] = useState(""),
    [loadError, setLoadError] = useState(""),
    [stale, setStale] = useState(false),
    [saved, setSaved] = useState(""),
    [saving, setSaving] = useState(false),
    [review, setReview] = useState(false),
    [publishing, setPublishing] = useState(false),
    [release, setRelease] = useState<{
      id: string;
      commit: string;
      state: string;
    } | null>(null),
    [newPage, setNewPage] = useState(false),
    [newName, setNewName] = useState(""),
    [slug, setSlug] = useState(""),
    [uploading, setUploading] = useState(false);
  const [aboutRecovery, setAboutRecovery] = useState<{
    content: string;
    baseSha: string;
  } | null>(null);
  const revision = useRef(0),
    savingLock = useRef(false),
    recoveryBlocked = useRef(false),
    pendingRelease = useRef<{ text: string; id: string } | null>(null),
    loadVersion = useRef(0),
    input = useRef<HTMLInputElement>(null),
    fieldGroup = useRef("");
  const [cardRecovery,setCardRecovery]=useState(0);
  function replace(w: Workspace) {
    setHistory({ now: w, past: [], future: [], group: "" });
    select("");
  }
  const load = useCallback(async (reset = false) => {
    const version = ++loadVersion.current;
    setLoadError("");
    setStatus("Loading website…");
    try {
      const d: Bootstrap = await api("/api/studio");
      if (version !== loadVersion.current) return;
      let w: Workspace = {
        project: d.project,
        about: window.SaneEditorModel.fromSource(d.resources.about, () =>
          crypto.randomUUID(),
        ),
        aboutText: d.resources.about,
        settingsText: d.resources.settings,
        assets: [],
      };
      let recovered = false,
        conflict = false;
      let stored: any;
      try {
        stored = await readRecord("drafts", "website");
      } catch {
        notice(
          "Private browser storage is unavailable. You can edit and download a draft, but recovery cannot be saved here.",
        );
      }
      let teamRecord: any = null;
      try {
        const remote = await api("/api/studio-draft");
        if(version !== loadVersion.current) return;
        if(remote.configured) {
          teamRecord = remote.record;
          cloudRevision.current = teamRecord?.revision || 0;
          cloudLastSaved.current = teamRecord ? fingerprint(teamRecord.value.work) : "";
          setCloud("ready");
          // Adopt the private team draft only when there is no browser draft to overwrite.
          if(!stored && teamRecord && !reset) stored = {revision:0,value:teamRecord.value};
          else if(stored && teamRecord && fingerprint(stored.value.work)!==cloudLastSaved.current) {
            setCloud("conflict");setCloudMessage("A different team draft is available. Your browser draft is retained. Download or load the team version before resuming sync.");
          }
        } else setCloud("local");
      } catch {setCloud("error");setCloudMessage("Team storage could not be reached. Browser autosave remains available.");}
      revision.current = stored?.revision || 0;
      recoveryBlocked.current = false;
      autoSaveFailed.current = false;
      if (!reset && stored) {
        const old = stored.value as Saved;
        const errors = core.validate(old?.work?.project, d.registry, {
          ...d.resources,
          about: old?.work?.aboutText,
        });
        if (!old?.work || errors.length) {
          recoveryBlocked.current = true;
          notice(
            "An incompatible older draft was retained. Download it before loading a fresh copy.",
          );
        } else {
          w = old.work;
          const settingsEdited =
            old.baseSettings != null && w.settingsText !== old.baseSettings;
          if (!w.settingsText || !settingsEdited)
            w.settingsText = d.resources.settings;
          recovered = true;
          conflict =
            old.layoutSha !== d.layoutSha ||
            (old.versions.settings !== d.versions.settings && settingsEdited) ||
            (old.versions.about !== d.versions.about &&
              w.aboutText !== old.baseAbout);
          if (!conflict && old.versions.about !== d.versions.about) {
            w = {
              ...w,
              aboutText: d.resources.about,
              about: window.SaneEditorModel.fromSource(d.resources.about, () =>
                crypto.randomUUID(),
              ),
            };
          }
        }
      }
      // Preserve compatible browser recovery from the previous About pilot.
      if (!reset && !stored) {
        try {
          const raw = localStorage.getItem("sl_editor_about_v1");
          if (raw) {
            const old = window.SaneEditorModel.importDraft(JSON.parse(raw));
            if (old.sourceSha === d.versions.about) {
              w.about = old.model;
              w.aboutText = window.SaneContent.serializeAbout(old.model);
              w.project = {
                ...w.project,
                pages: w.project.pages.map((p) =>
                  p.id === "about" ? { ...p, active: true } : p,
                ),
              };
              recovered = true;
              notice(
                "Your previous About browser draft has been brought into the website editor.",
              );
            }
          }
        } catch {
          notice(
            "The previous About recovery is retained and can still be downloaded from Draft tools.",
          );
        }
      }
      let olderAbout = d.legacyAboutDraft || null;
      try {
        const local = JSON.parse(
          localStorage.getItem("sl_studio_v1_about") || "null",
        );
        if (local?.content) olderAbout = local;
      } catch {}
      setAboutRecovery(olderAbout);
      draftBase.current = sourceBase(conflict && stored ? stored.value : d);
      let detachedCount=0;
      const beforeRepair=structuredClone(w);
      w=structuredClone(w);
      for(const p of w.project.pages){
        const descriptors=core.describe(core.registryFor(p,d.registry),{...d.resources,about:w.aboutText}).blocks;
        for(const b of p.blocks){const descriptor=descriptors.find((part:any)=>part.id===b.source);if(!descriptor)continue;
          const repair=core.cardLayout.repairDetached(descriptor,b.elements);
          if(repair.count){b.elements=repair.values;p.active=true;detachedCount+=repair.count;}
        }
      }
      setCardRecovery(detachedCount);
      setData(d);
      if(detachedCount){setHistory({now:w,past:[beforeRepair],future:[],group:""});select("");}
      else replace(w);
      setStale(conflict);
      setSaved(recovered && revision.current > 0 ? JSON.stringify(detachedCount ? beforeRepair : w) : "");
      setStatus(
        conflict
          ? "Older draft · publication blocked"
          : recovered
            ? "Recovered private browser draft"
            : "Published website loaded",
      );
      setRelease(d.lastRelease || null);
    } catch (e) {
      if (version === loadVersion.current) {
        setLoadError((e as Error).message);
        setStatus("Source unavailable");
      }
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      loadVersion.current++;
    };
  }, [load]);
  const save = useCallback(async () => {
    const w = workRef.current;
    if (!w || !data || savingLock.current) return;
    if (recoveryBlocked.current) {
      notice(
        "Older recovery retained. Download it before replacing this browser draft.",
      );
      return;
    }
    autoSaveFailed.current = false;
    savingLock.current = true;
    setSaving(true);
    const text = JSON.stringify(w);
    try {
      revision.current = await saveDraft(
        {
          ...(draftBase.current || sourceBase(data)),
          work: w,
        } satisfies Saved,
        revision.current,
      );
      setSaved(text);
      setStatus(
        "Saved privately on this browser · " +
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          }),
      );
    } catch (e) {
      autoSaveFailed.current = true;
      notice((e as Error).message);
      setStatus("Draft save failed · download to keep your work");
      recoveryBlocked.current = /Another tab/.test((e as Error).message);
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }, [data]);
  useEffect(() => {
    if (!work || !data || workJSON === saved || autoSaveFailed.current) return;
    const t = setTimeout(() => void save(), 800);
    return () => clearTimeout(t);
  }, [work, workJSON, data, saved, save, saving]);
  useEffect(() => {
    if (!work || !data || (cloud !== "ready" && cloud !== "error") || saved !== workJSON || cloudLastSaved.current === workFingerprint || cloudLock.current) return;
    // Offline/failed cloud saves require an explicit retry; never spin or overwrite a conflicting team draft.
    if(cloud === "error")return;
    const timer=setTimeout(async()=>{
      cloudLock.current=true;setCloud("saving");
      try {
        const result=await api("/api/studio-draft",{expected:cloudRevision.current,requestId:crypto.randomUUID(),value:{...(draftBase.current || sourceBase(data)),work}});
        cloudRevision.current=result.record.revision;cloudLastSaved.current=fingerprint(work);setCloudMessage("");setCloud("ready");
      }catch(e){const message=(e as Error).message;setCloudMessage(message);setCloud(message.includes("Another team member")?"conflict":"error");}
      finally{cloudLock.current=false;}
    },2000);
    return ()=>clearTimeout(timer);
  },[work,workJSON,workFingerprint,data,saved,cloud]);
  useEffect(() => {
    const flush = () => { if(document.visibilityState === "hidden") void save(); };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", flush); window.removeEventListener("pagehide", flush); };
  }, [save]);
  useEffect(() => {
    // Ask the browser to protect stored drafts from routine storage eviction when supported.
    void navigator.storage?.persist?.().catch(() => false);
  }, []);
  useEffect(() => {
    function logout(e: StorageEvent) {
      if (e.key === "sl_studio_logout") {
        setData(null);
        setHistory({ now: null, past: [], future: [], group: "" });
        setLoadError("Your team session ended. Sign in to open the editor.");
      }
    }
    window.addEventListener("storage", logout);
    return () => window.removeEventListener("storage", logout);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => notice(""), 10000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    function leave(e: BeforeUnloadEvent) {
      if (workRef.current && JSON.stringify(workRef.current) !== saved) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [saved]);
  useEffect(() => {
    function receive(e: MessageEvent) {
      const previewFrame = document.querySelector<HTMLIFrameElement>('iframe[title="Draft preview fallback"]');
      if(e.origin === location.origin && e.source === previewFrame?.contentWindow && e.data?.type === "studio:close-preview") {setPreviewURL("");return;}
      if (e.origin !== location.origin || e.source !== parent) return;
      if (e.data?.type === "sane-editor:flush") void save();
      if (e.data?.type === "studio:select-about") setPageId("about");
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [save]);
  useEffect(() => {
    if (!release || release.state === "Live on the website") return;
    let stopped = false,
      attempts = 0;
    const tick = async () => {
      try {
        const page = workRef.current?.project.pages.find(
          (p) => p.id === pageId,
        );
        const r = await fetch(
          (page?.route || "/") + "?studio-release=" + release.id,
          { cache: "no-store" },
        );
        if (
          r.ok &&
          (await r.text()).includes(
            'name="sane-release" content="' + release.id + '"',
          )
        ) {
          if (!stopped)
            setRelease((v) => (v ? { ...v, state: "Live on the website" } : v));
          return;
        }
      } catch {}
      if (!stopped && ++attempts < 18) timer = setTimeout(tick, 7000);
      else if (!stopped)
        setRelease((v) =>
          v
            ? { ...v, state: "Commit accepted · live deployment not verified" }
            : v,
        );
    };
    let timer = setTimeout(tick, 4000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [release?.id, pageId]);
  function edit(
    fn: (w: Workspace) => void,
    group: string = crypto.randomUUID(),
  ) {
    setHistory((h) => {
      if (!h.now) return h;
      const next: Workspace = {
        ...h.now,
        project: structuredClone(h.now.project),
        about: structuredClone(h.now.about),
        assets: [...h.now.assets],
      };
      fn(next);
      return {
        now: next,
        past: h.group === group ? h.past : [...h.past, h.now].slice(-50),
        future: [],
        group,
      };
    });
  }
  function undo() {
    setHistory((h) =>
      h.now && h.past.length
        ? {
            now: h.past.at(-1)!,
            past: h.past.slice(0, -1),
            future: [h.now, ...h.future],
            group: "",
          }
        : h,
    );
  }
  function redo() {
    setHistory((h) =>
      h.now && h.future.length
        ? {
            now: h.future[0],
            past: [...h.past, h.now].slice(-50),
            future: h.future.slice(1),
            group: "",
          }
        : h,
    );
  }
  useEffect(()=>{document.querySelector<HTMLElement>(".studio-inspector")?.scrollTo({top:0});},[selected,elementId,pageId]);
  const page =
      work?.project.pages.find((p) => p.id === pageId) ||
      work?.project.pages[0],
    block = page?.blocks.find((b) => b.id === selected);
  const resources = useMemo(() => data && work ? {...data.resources, about:work.aboutText, settings:work.settingsText || data.resources.settings} : {}, [data,work?.aboutText,work?.settingsText]);
  const errors =
    data && work
      ? ([
          ...core.validate(work.project, data.registry, resources),
          ...window.SaneEditorModel.check(work.about),
          ...settingsState(work.settingsText || data.resources.settings).errors,
        ] as string[])
      : [];
  const descriptors =
    page && data
      ? core.describe(core.registryFor(page, data.registry), resources).blocks
      : [];
  function pageEdit(fn: (p: Page) => void, group?: string) {
    if (!page) return;
    edit((w) => {
      const p = w.project.pages.find((p) => p.id === page.id)!;
      fn(p);
      p.active = true;
    }, group);
  }
  function blockEdit(fn: (b: Block) => void, group?: string) {
    pageEdit((p) => {
      const b = p.blocks.find((b) => b.id === selected);
      if (b) fn(b);
    }, group);
  }
  const device: Device = width <= 600 ? "phone" : width <= 1024 ? "tablet" : "desktop";
  const layerBlocks: Block[] = [];
  function visitLayers(parent?: string) {
    page?.blocks.filter(b=>parent ? b.placement?.section === parent : !b.placement).forEach(b=>{if(layerBlocks.some(x=>x.id===b.id))return;layerBlocks.push(b);visitLayers(b.id);});
  }
  visitLayers();
  const selectedDescriptor = descriptors.find(
    (d: any) => d.id === block?.source,
  );
  const settingsValue = settingsState(
    work?.settingsText || data?.resources.settings || "{}",
  ).value;
  function settingEdit(key: string, value: any) {
    edit((w) => {
      const next = JSON.parse(w.settingsText || data!.resources.settings);
      next[key] = value;
      w.settingsText = JSON.stringify(next, null, 2) + "\n";
    });
  }
  function elementEdit(
    fn: (v: any) => void,
    blockID = selected,
    id = elementId,
  ) {
    pageEdit((p) => {
      const b = p.blocks.find((b) => b.id === blockID);
      if (!b || !id) return;
      b.elements ||= {};
      b.elements[id] ||= {};
      fn(b.elements[id]);
    });
  }
  function targetDesignEdit(blockID: string, id: string, values: Record<string, number>) {
    const owner=page?.blocks.find(b=>b.id===blockID);
    if(!owner)return;
    if(owner.source && id)elementEdit(v=>{v.responsive ||= {};v.responsive[device] ||= {};Object.assign(v.responsive[device],values);},blockID,id);
    else pageEdit(p=>{const b=p.blocks.find(b=>b.id===blockID)!;b.responsive ||= {};b.responsive[device] ||= {};Object.assign(b.responsive[device],values);});
  }
  function placementFor(blockID: string, id: string, after: boolean) {
    const owner = page?.blocks.find((b) => b.id === blockID),
      d = descriptors.find((d: any) => d.id === owner?.source),
      e = id ? d?.elements.find((x: any) => x.id === id) : d?.elements[0];
    if(owner && ["section", "row", "column"].includes(owner.type)) return {section:owner.id,parent:"content"};
    if(owner?.placement) return after ? resolveBlockInsertion(page!, owner.id) : {...owner.placement,before:owner.id};
    if (!e || owner?.type !== "legacy") return;
    const isContainer =
      /^(div|section|main|article|figure)$/.test(e.tag) && !e.managed;
    const parent = isContainer
      ? e
      : d.elements.find(
          (x: any) => x.id === (owner.elements?.[e.id]?.parent ?? e.parent),
        );
    if (
      !parent ||
      parent.managed ||
      !/^(div|section|main|article|figure)$/.test(parent.tag)
    )
      return;
    const siblings = d.elements
      .filter(
        (x: any) => (owner.elements?.[x.id]?.parent ?? x.parent) === parent.id,
      )
      .sort(
        (a: any, b: any) =>
          (owner.elements?.[a.id]?.order ?? a.start) -
          (owner.elements?.[b.id]?.order ?? b.start),
      );
    return {
      section: blockID,
      parent: parent.id,
      ...(!isContainer
        ? { before: after ? siblings[siblings.indexOf(e) + 1]?.id : e.id }
        : {}),
    };
  }
  function reorderElement(
    blockID: string,
    id: string,
    targetBlock: string,
    target: string,
    after: boolean,
    intoContainer = true,
  ) {
    if (blockID !== targetBlock) {
      notice(
        "Move the whole section between sections. Elements can move between containers inside their own section.",
      );
      return;
    }
    const owner = page?.blocks.find((b) => b.id === blockID),
      d = descriptors.find((d: any) => d.id === owner?.source),
      e0 = d?.elements.find((x: any) => x.id === id),
      t0 = d?.elements.find((x: any) => x.id === target);
    if(e0?.dragOwner){
      if(!t0?.dragOwner || d.elements.find((x:any)=>x.id===e0.dragOwner)?.parent !== d.elements.find((x:any)=>x.id===t0.dragOwner)?.parent){notice("Drop beside another image card in this row. Images and captions move together.");return;}
      id=e0.dragOwner;target=t0.dragOwner;intoContainer=false;
    } else if(t0?.dragOwner){notice("Drop outside the image card. Its image and caption stay together.");return;}
    const e=d?.elements.find((x:any)=>x.id===id), t=d?.elements.find((x:any)=>x.id===target);
    if (!e?.parent || !t || id === target) return;
    const into =
      intoContainer &&
      /^(div|section|main|article|figure|ul|ol)$/.test(t.tag) &&
      !t.managed;
    const parent = into ? t.id : owner?.elements?.[target]?.parent || t.parent;
    if (!parent) return;
    if(e.virtual || (e.managed && parent !== (owner?.elements?.[id]?.parent ?? e.parent))){notice("This connected collection stays in its source container. Reorder its container, use Move freely or open its content editor.");return;}
    const siblings = d.elements
      .filter(
        (x: any) =>
          (owner?.elements?.[x.id]?.parent ?? x.parent) === parent &&
          x.id !== id,
      )
      .sort(
        (a: any, b: any) =>
          (owner?.elements?.[a.id]?.order ?? a.start) -
          (owner?.elements?.[b.id]?.order ?? b.start),
      );
    const at = into
      ? after
        ? siblings.length
        : 0
      : Math.max(
          0,
          siblings.findIndex((x: any) => x.id === target) + (after ? 1 : 0),
        );
    siblings.splice(at, 0, e);
    const candidate = structuredClone(work!.project),
      next = candidate.pages.find((p) => p.id === page!.id)!,
      edited = next.blocks.find((b) => b.id === blockID)!;
    edited.elements ||= {};
    siblings.forEach((x: any, i: number) => {
      edited.elements![x.id] = {
        ...(edited.elements![x.id] || {}),
        ...(x.parent !== parent ? {parent} : {}),
        order: i,
      };
      if(x.parent === parent)delete edited.elements![x.id].parent;
    });
    const issues = core.validate(candidate, data!.registry, resources);
    if (issues.length) {
      notice(issues.some((x:string)=>x.includes("container")||x.includes("itself")) ? "Drop beside a supported container, away from connected content or the element’s own children." : issues.join(" "));
      return;
    }
    pageEdit((p) => {
      p.blocks.find((b) => b.id === blockID)!.elements = edited.elements;
    });
    select(blockID, id);
  }
  function restoreImageCards(blockID?: string) {
    pageEdit(p=>{for(const b of p.blocks){if(blockID && b.id!==blockID)continue;const descriptor=descriptors.find((d:any)=>d.id===b.source);if(descriptor?.elements.some((e:any)=>e.dragOwner))b.elements=core.cardLayout.restore(descriptor,b.elements);}});
    notice("Image card layout restored. Image choices, captions and other page edits are kept. You can Undo this.");
  }
  function elementAction(blockID: string, id: string, action: string) {
    const targetBlock = page?.blocks.find(b=>b.id===blockID);
    if(targetBlock && !targetBlock.source) {
      if(action === "remove" && id === "part:image" && ["split","card"].includes(targetBlock.type)) {
        pageEdit(p=>{p.blocks.find(b=>b.id===blockID)!.props!.src="";});select(blockID);notice("Image removed. The section and its other content are kept. Undo restores it.");return;
      }
      if(action === "remove") {
        pageEdit(p=>{const ids=new Set([blockID]);for(let i=0;i<10;i++)p.blocks.forEach(b=>{if(b.placement && ids.has(b.placement.section))ids.add(b.id);});p.blocks=p.blocks.filter(b=>!ids.has(b.id));});select("");
      } else {
        const siblings=page!.blocks.filter(b=>b.placement?.section===targetBlock.placement?.section);
        const next=siblings[siblings.indexOf(targetBlock)+(action === "up"?-1:1)];
        if(next)pageEdit(p=>{const from=p.blocks.findIndex(b=>b.id===blockID),to=p.blocks.findIndex(b=>b.id===next.id);p.blocks.splice(to,0,p.blocks.splice(from,1)[0]);});
      }
      return;
    }
    if(action === "restore-cards") {
      restoreImageCards(blockID);return;
    }
    select(blockID, id);
    if (action === "remove") {
      elementEdit(
        (v) => {
          v.hidden = !v.hidden;
        },
        blockID,
        id,
      );
      return;
    }
    const owner = page?.blocks.find((b) => b.id === blockID),
      d = descriptors.find((d: any) => d.id === owner?.source),
      e = d?.elements.find((x: any) => x.id === core.cardLayout.owner(d,id));
    if (!e) return;
    id=e.id;
    const parent = owner?.elements?.[id]?.parent ?? e.parent;
    const siblings = d.elements
      .filter(
        (x: any) => (owner?.elements?.[x.id]?.parent ?? x.parent) === parent,
      )
      .sort(
        (a: any, b: any) =>
          (owner?.elements?.[a.id]?.order ?? a.start) -
          (owner?.elements?.[b.id]?.order ?? b.start),
      );
    const next = siblings[siblings.indexOf(e) + (action === "up" ? -1 : 1)];
    if (next)
      reorderElement(blockID, id, blockID, next.id, action === "down", false);
  }
  function choose(id: string) {
    insertionTarget.current = null;
    setPageId(id);
    select("");
    setMobile("canvas");
  }
  function add(type: string, after?: string, placement?: any) {
    if (!page) return;
    const inserted = type.startsWith("layout:") ? makeLayout(type.slice(7)) : [core.block(type, crypto.randomUUID()) as Block];
    const b = inserted[0];
    const target = after ? {block: after, placement} : insertionTarget.current || {
      block: selected, placement: block?.source ? placementFor(selected, elementId, true) : resolveBlockInsertion(page, selected)
    };
    if (target.placement && !target.placement.boundary) b.placement = target.placement;
    const candidate=structuredClone(work!.project), next=candidate.pages.find(p=>p.id===page.id)!;
    const at=next.blocks.findIndex(x=>x.id===target.block);
    let index=at<0?0:at+(target.placement?.boundary==="before"?0:1);
    // Container selection appends children; leaf selection keeps sibling-after.
    if(b.placement?.section===target.block && !b.placement.before){
      const descendants=new Set([target.block]);
      for(let depth=0;depth<10;depth++)next.blocks.forEach(child=>{if(child.placement && descendants.has(child.placement.section))descendants.add(child.id);});
      next.blocks.forEach((child,i)=>{if(descendants.has(child.id))index=Math.max(index,i+1);});
    }
    next.blocks.splice(index,0,...inserted);
    const issues=core.validate(candidate,data!.registry,resources);
    if(issues.length){notice(issues.join(" "));return;}
    pageEdit(p=>{p.blocks=next.blocks;});
    insertionTarget.current = null;
    select(b.id);
    setLeftTab("layers");
    setMobile("right");
    notice((LAYOUTS.find(x=>"layout:"+x.id===type)?.name || LABELS[type] || type) + " added to " + page.name + ".");
  }
  function placeBlock(from: string, target: string, after: boolean, placement?: any) {
    const moving = page?.blocks.find(b => b.id === from);
    if (!moving || from === target) return;
    if (moving.source && placement && !placement.boundary) {
      notice("Original sections move as a whole between section lines. Their connected elements stay inside the section."); return;
    }
    const candidate = structuredClone(work!.project);
    const p = candidate.pages.find(x=>x.id===page!.id)!;
    {
      const index = p.blocks.findIndex(b=>b.id===from);
      const [b] = p.blocks.splice(index,1);
      if (placement && !placement.boundary && !b.source) b.placement = placement;
      else delete b.placement;
      const at = p.blocks.findIndex(x=>x.id===target);
      p.blocks.splice(at<0?p.blocks.length:at+(after?1:0),0,b);
      p.blocks.forEach(child=>{
        if(child.placement?.before===from)delete child.placement.before;
        const owner=p.blocks.find(x=>x.id===child.placement?.section);
        if(owner && ["section","row","column"].includes(owner.type) && child.placement)delete child.placement.before;
      });
    }
    const issues = core.validate(candidate,data!.registry,resources);
    if(issues.length){notice(issues.join(" "));return;}
    pageEdit(next=>{next.blocks=p.blocks;});
    select(from);
  }
  function move(from: string, to: string) {
    if (!page || from===to) return;
    const moving=page.blocks.find(b=>b.id===from),target=page.blocks.find(b=>b.id===to);
    if(!moving || !target)return;
    const peers=page.blocks.filter(b=>b.placement?.section===moving.placement?.section && b.placement?.parent===moving.placement?.parent);
    const after=peers.indexOf(moving)<peers.indexOf(target);
    // Layer sorting changes sibling order; it never silently detaches a column.
    if(moving.placement?.section!==target.placement?.section || moving.placement?.parent!==target.placement?.parent){notice("Drop on a canvas container to change parents. Layer sorting keeps elements in their current container.");return;}
    placeBlock(from,to,after,target.placement ? {...target.placement} : undefined);
  }
  function arrow(delta: number) {
    if (!block || !page) return;
    const peers=page.blocks.filter(b=>b.placement?.section===block.placement?.section && b.placement?.parent===block.placement?.parent);
    const next=peers[peers.indexOf(block)+delta];
    if(next)move(block.id,next.id);
  }
  function aboutEdit(fn: (m: About) => void, group: string) {
    edit((w) => {
      fn(w.about);
      w.aboutText = window.SaneContent.serializeAbout(w.about);
      w.project.pages.find((p) => p.id === "about")!.active = true;
    }, group);
  }
  function remove() {
    if (!block) return;
    if (block.source) {
      blockEdit((b) => {
        b.hidden = !b.hidden;
      });
      notice(
        block.hidden
          ? "Original section is visible."
          : "Original section hidden. Its integration markup is retained.",
      );
      return;
    }
    pageEdit((p) => {
      const removeIDs = new Set([selected]);
      for(let i=0;i<10;i++)p.blocks.forEach(b=>{if(b.placement && removeIDs.has(b.placement.section))removeIDs.add(b.id);});
      p.blocks = p.blocks.filter((b) => !removeIDs.has(b.id));
      p.blocks.forEach(b=>{if(b.placement?.before && removeIDs.has(b.placement.before))delete b.placement.before;});
    });
    select("");
  }
  function duplicate() {
    if (!block || block.source) return;
    const ids = new Map<string,string>([[block.id,crypto.randomUUID()]]);
    for(let i=0;i<10;i++)page!.blocks.forEach(b=>{if(b.placement && ids.has(b.placement.section) && !ids.has(b.id))ids.set(b.id,crypto.randomUUID());});
    const copies = page!.blocks.filter(b=>ids.has(b.id)).map(source=>{
      const b=structuredClone(source);b.id=ids.get(source.id)!;
      if(source.id===block.id)b.label+=" copy";
      if(b.placement && ids.has(b.placement.section))b.placement.section=ids.get(b.placement.section)!;
      if(b.placement?.before && ids.has(b.placement.before))b.placement.before=ids.get(b.placement.before)!;
      return b;
    });
    const candidate=structuredClone(work!.project),next=candidate.pages.find(p=>p.id===page!.id)!;
    next.blocks.splice(next.blocks.findIndex(b=>b.id===selected)+1,0,...copies);
    const issues=core.validate(candidate,data!.registry,resources);if(issues.length){notice(issues.join(" "));return;}
    pageEdit(p=>{p.blocks=next.blocks;});select(ids.get(block.id)!);
  }
  function openSource(section: string, tab?: string) {
    if (section === "settings") {
      setLeftTab("settings");
      setMobile("left");
      return;
    }
    if (parent === window) {
      location.href = "/dash/#" + section;
      return;
    }
    parent.postMessage(
      { type: "studio:open-section", section, tab },
      location.origin,
    );
  }
  async function preview() {
    if (!work || !data) return;
    if (errors.length) {
      notice(errors.join(" "));
      return;
    }
    let popup: Window | null = null;
    try { popup = window.open("about:blank", "_blank"); } catch {}
    if (popup) popup.opener = null;
    try {
      const id = await snapshot({
        work: structuredClone(work),
        registry: data.registry,
        resources: {
          ...data.resources,
          about: work.aboutText,
          settings: work.settingsText || data.resources.settings,
        },
        pageId: page!.id,
      } satisfies Snapshot);
      const url = "/dash/editor/preview.html?snapshot=" + id;
      if (popup) popup.location.replace(url);
      else setPreviewURL(url);
    } catch {
      popup?.close();
      notice(
        "The private preview could not be saved. Download your draft to keep it.",
      );
    }
  }
  function create() {
    if (!work || !data) return;
    const id = "custom--" + slug,
      entry = {
        id,
        name: newName.trim(),
        route: "/" + slug + "/",
        output: "public/site-pages/" + slug + ".html",
        html: core.generic(newName.trim()),
      };
    const next = core.createProject([entry]).pages[0] as Page;
    next.slug = slug;
    next.menu = true;
    next.active = true;
    const candidate = structuredClone(work.project);
    candidate.pages.push(next);
    const issues = core.validate(candidate, data.registry, resources);
    if (issues.length) {
      notice(issues.join(" "));
      return;
    }
    edit((w) => (w.project = candidate));
    setPageId(id);
    select(next.blocks[0]?.id || "");
    setNewPage(false);
    setLeftTab("layers");
  }
  async function upload(file: File, set: (url: string) => void) {
    if (!work) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (
      !["png", "jpg", "jpeg", "webp", "gif"].includes(extension || "") ||
      file.size > 1024 * 1024
    ) {
      notice("Choose a PNG, JPG, WebP or GIF image up to 1 MB.");
      return;
    }
    if (
      work.assets.length >= 12 ||
      work.assets.reduce((n, a) => n + atob(a.base64).length, 0) + file.size >
        2 * 1024 * 1024
    ) {
      notice("Keep staged images under 2 MB total per release.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const url = "/images/studio-" + crypto.randomUUID() + "." + extension;
      edit((w) => {
        w.assets.push({ url, base64, name: file.name });
      });
      set(url);
      notice(
        "Image staged privately. It becomes public only when you publish.",
      );
    } catch {
      notice("The image could not be opened.");
    } finally {
      setUploading(false);
    }
  }
  async function publish() {
    if (!data || !work) return;
    setPublishing(true);
    const current = structuredClone(work),
      payloadText = JSON.stringify({
        project: current.project,
        about: current.aboutText,
        settings: current.settingsText || data.resources.settings,
        assets: current.assets,
      });
    if (pendingRelease.current?.text !== payloadText)
      pendingRelease.current = { text: payloadText, id: crypto.randomUUID() };
    const releaseId = pendingRelease.current.id;
    try {
      const result = await api("/api/studio", {
        version: 2,
        expectedHead: data.head,
        releaseId,
        project: current.project,
        about: current.aboutText,
        settings: current.settingsText || data.resources.settings,
        assets: current.assets,
      });
      setRelease({
        id: releaseId,
        commit: result.commit,
        state: "Commit accepted · deployment updating",
      });
      setReview(false);
      notice(
        "Published to GitHub main. The website is live only after deployment verification.",
      );
      // Re-read acknowledged sources, preserving any typing done while the release was in flight.
      let fresh: Bootstrap;
      try {
        fresh = await api("/api/studio");
      } catch {
        setStatus("Commit accepted · source refresh needs attention");
        notice(
          "Your design was committed. Keep this draft and reload the published source before your next release.",
        );
        return;
      }
      draftBase.current=sourceBase(fresh);
      setData(fresh);
      setStale(false);
      if (JSON.stringify(workRef.current) === JSON.stringify(current)) {
        const next = {
          ...current,
          project: result.project || fresh.project,
          assets: [],
        };
        replace(next);
        setStatus("Published to main · deployment updating");
        setSaved("");
      } else
        notice(
          "The reviewed snapshot was committed. Newer local edits are retained for your next release.",
        );
    } catch (e) {
      notice((e as Error).message);
      setStatus("Publication needs attention · private draft retained");
    } finally {
      setPublishing(false);
    }
  }
  async function importFile(file: File) {
    try {
      if (file.size > 4000000) throw Error("Choose a draft smaller than 4 MB.");
      const value = JSON.parse(await file.text());
      let w: Workspace;
      if (value.kind === "sane-about-pilot") {
        const old = window.SaneEditorModel.importDraft(value);
        if (old.sourceSha !== data?.versions.about)
          throw Error(
            "This About draft is based on an older published source.",
          );
        w = structuredClone(work!);
        w.about = old.model;
        w.aboutText = window.SaneContent.serializeAbout(old.model);
        w.project.pages.find((p) => p.id === "about")!.active = true;
      } else {
        if (
          value.kind !== "sane-website-draft" ||
          value.version !== 2 ||
          value.baseLayoutSha !== data?.layoutSha
        )
          throw Error(
            "This draft is incompatible or based on a different published layout.",
          );
        w = value.work;
        if (
          value.baseVersions?.settings !== data?.versions.settings &&
          w.settingsText &&
          w.settingsText !== value.baseSettings
        )
          throw Error(
            "Site settings changed. Keep this draft and reconcile its settings before importing.",
          );
        if (!w.settingsText || w.settingsText === value.baseSettings)
          w.settingsText = data!.resources.settings;
        if (value.baseVersions?.about !== data?.versions.about) {
          if (w.aboutText === value.baseAbout) {
            w.aboutText = data!.resources.about;
            w.about = window.SaneEditorModel.fromSource(w.aboutText, () =>
              crypto.randomUUID(),
            );
          } else
            throw Error(
              "About changed since this draft was saved. Keep the draft and reconcile its About text before importing.",
            );
        }
      }
      const issues = core.validate(w.project, data!.registry, {
        ...data!.resources,
        about: w.aboutText,
      });
      if (issues.length) throw Error(issues.join(" "));
      if (
        !confirm(
          "Replace this private working draft? Download your current copy first if you want to keep it.",
        )
      )
        return;
      recoveryBlocked.current = false;
      autoSaveFailed.current = false;
      draftBase.current=sourceBase(data!);
      setStale(false);
      replace(w);
      setSaved("");
      notice("Draft imported. It has not been published.");
    } catch (e) {
      notice("Import failed: " + (e as Error).message);
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  useEffect(() => {
    if (!review && !newPage) return;
    const prior = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector(
      ".studio-modal",
    ) as HTMLElement | null;
    dialog?.querySelector<HTMLElement>("input,button")?.focus();
    function keys(e: KeyboardEvent) {
      if (e.key === "Escape" && !publishing) {
        setReview(false);
        setNewPage(false);
      }
      if (e.key === "Tab" && dialog) {
        const items = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input,select,textarea,a[href]",
          ),
        );
        if (!items.length) return;
        const first = items[0],
          last = items.at(-1)!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", keys);
    return () => {
      document.removeEventListener("keydown", keys);
      prior?.focus();
    };
  }, [review, newPage, publishing]);
  const exportDraft = () => {
    if (work && data)
      download({
        kind: "sane-website-draft",
        version: 2,
        baseLayoutSha: draftBase.current ? draftBase.current.layoutSha : data.layoutSha,
        baseVersions: draftBase.current?.versions || data.versions,
        baseAbout: draftBase.current?.baseAbout ?? data.resources.about,
        baseSettings: draftBase.current?.baseSettings ?? data.resources.settings,
        work,
      });
  };
  const settingsChanged =
    !!work &&
    !!data &&
    !!work.settingsText &&
    work.settingsText !== data.resources.settings;
  const orderChanged =
    !!work &&
    !!data &&
    work.project.pages.map((p) => p.id).join(",") !==
      data.project.pages.map((p) => p.id).join(",");
  const changed =
    work && data
      ? work.project.pages.filter((p) => {
          const old = data.project.pages.find((x) => x.id === p.id);
          return (
            JSON.stringify(p) !== JSON.stringify(old) ||
            (p.id === "about" && work.aboutText !== data.resources.about)
          );
        })
      : [];
  const aboutSections = work?.about.metadata.sections || [],
    story = aboutSections.find((s) => s.id === storyId) || aboutSections[0];
  const start = () => {
    fieldGroup.current = crypto.randomUUID();
  };
  return (
    <div
      className={"studio-app theme-" + theme}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          void save();
        }
      }}
    >
      <header className="studio-top">
        <div className="studio-brand">
          <button
            className="studio-back"
            aria-label="Return to dashboard"
            onClick={() => openSource("home")}
          >
            ‹
          </button>
          <span className="studio-monogram">Sl</span>
          <div>
            <strong>Sane Living</strong>
            <small>Website studio</small>
          </div>
        </div>
        <PageSwitcher
          pages={work?.project.pages || []}
          current={page}
          choose={choose}
          create={() => {setNewName("");setSlug("");setNewPage(true);}}
        />
        <div className="device-switch" role="group" aria-label="Canvas device">
          {[
            [1440, "Desktop"],
            [1280, "Laptop"],
            [768, "Tablet"],
            [375, "Phone"],
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
        <div className="studio-actions">
          <button
            aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
            onClick={() => {
              const next = theme === "dark" ? "light" : "dark";
              setTheme(next);
              try {
                localStorage.setItem("sl_studio_theme", next);
              } catch {}
            }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            aria-label="Undo"
            disabled={!history.past.length}
            onClick={undo}
          >
            ↶
          </button>
          <button
            aria-label="Redo"
            disabled={!history.future.length}
            onClick={redo}
          >
            ↷
          </button>
          <button disabled={!work || saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button disabled={!work || !data} onClick={() => void preview()}>
            Preview ↗
          </button>
          <button
            className="publish-action"
            disabled={
              !work ||
              publishing ||
              stale ||
              (!changed.length && !orderChanged && !settingsChanged) ||
              !!errors.length
            }
            onClick={() => setReview(true)}
          >
            Publish
          </button>
        </div>
      </header>
      <div className="studio-status">
        <span role="status">{saving ? "Saving private draft…" : work && saved !== workJSON && !recoveryBlocked.current && !autoSaveFailed.current ? "Unsaved changes · autosave pending" : status}</span>
        <span>
          {page?.route || "Website"} · {page?.blocks.length || 0} sections
        </span>
      </div>
      {recoveryVersions ? <div className="recovery-dialog" role="dialog" aria-modal="true" aria-label="Draft recovery history"><h2>Previous autosaves</h2><p>Restore a previous save into the editor. Review it before publishing.</p>{recoveryVersions.length ? recoveryVersions.map(record=><div className="recovery-version" key={record.revision}><span>{new Date(record.updatedAt).toLocaleString()} · Save {record.revision}</span><button onClick={()=>downloadSaved(record.value,"sane-living-recovery-"+record.revision+".json")}>Download</button><button onClick={()=>{
        const w=record.value?.work;
        if(!w || !data || core.validate(w.project,data.registry,{...data.resources,about:w.aboutText}).length){notice("This version needs importing and reconciliation. Download it first.");return;}
        draftBase.current=sourceBase(record.value);
        edit(next=>Object.assign(next,structuredClone(w)));
        setStale(record.value.layoutSha!==data.layoutSha || (w.aboutText!==record.value.baseAbout && record.value.versions.about!==data.versions.about) || (w.settingsText!==record.value.baseSettings && record.value.versions.settings!==data.versions.settings));
        autoSaveFailed.current=false;setRecoveryVersions(null);notice("Previous autosave restored privately. Use Undo to return to your latest work.");
      }}>Restore</button></div>):<p>Previous versions appear after your next autosaves.</p>}<button onClick={()=>setRecoveryVersions(null)}>Close recovery</button></div> : null}
      {previewURL ? <div className="preview-overlay" role="dialog" aria-modal="true" aria-label="Draft preview">
        <header><strong>Draft preview · not published</strong><a href={previewURL} target="_blank" rel="noopener noreferrer">Open preview in new tab ↗</a><button onClick={() => setPreviewURL("")}>Back to editor</button></header>
        <iframe title="Draft preview fallback" src={previewURL}/>
      </div> : null}
      {aboutRecovery ? (
        <div className="about-recovery">
          <span>An earlier About draft is available.</span>
          <button
            onClick={() => {
              if (aboutRecovery.baseSha !== data?.versions.about) {
                notice(
                  "This older About draft needs reconciliation. Download it to keep its text.",
                );
                return;
              }
              if (
                !confirm(
                  "Bring this earlier About draft into Page Editor? Your current private About working copy will be replaced.",
                )
              )
                return;
              edit((w) => {
                w.about = window.SaneEditorModel.fromSource(
                  aboutRecovery.content,
                  () => crypto.randomUUID(),
                );
                w.aboutText = aboutRecovery.content;
                w.project.pages.find((p) => p.id === "about")!.active = true;
              });
              setPageId("about");
              setAboutRecovery(null);
              notice(
                "Earlier About draft imported privately. Nothing is published yet.",
              );
            }}
          >
            Bring into editor
          </button>
          <button
            onClick={() => download(aboutRecovery, "previous-about-draft.json")}
          >
            Download copy
          </button>
          <button
            aria-label="Dismiss earlier About draft"
            onClick={() => setAboutRecovery(null)}
          >
            ×
          </button>
        </div>
      ) : null}
      {cardRecovery>0 ? <div className="card-recovery-notice" role="status"><div><strong>Image cards recovered</strong><span>Reattached {cardRecovery} image or caption parts from the older draft. Your content is kept; Undo and recovery history retain the previous layout.</span></div><button onClick={()=>setCardRecovery(0)} aria-label="Dismiss image recovery notice">×</button></div> : null}
      {cloud !== "local" && cloud !== "loading" ? <div className="team-draft-status" role="status"><span>{cloud === "saving" ? "Backing up private team draft…" : cloud === "ready" ? cloudLastSaved.current === workFingerprint ? "Team draft backed up privately" : "Team backup pending" : cloudMessage}</span>
        <button onClick={async()=>{try{const remote=await api("/api/studio-draft");if(!remote.configured){setCloud("local");return;}if(remote.record){downloadSaved(remote.record.value,"sane-living-team-draft.json");}else notice("No team draft has been saved yet.");}catch(e){notice((e as Error).message);}}}>Download team draft</button>
        <button disabled={cloud === "saving"} onClick={async()=>{
          try {const remote=await api("/api/studio-draft");if(!remote.configured){setCloud("local");return;}const record=remote.record;
            if(record && fingerprint(record.value.work)!==fingerprint(work)) {
              if(!confirm("Load the shared team draft? Your current browser draft will be downloaded first."))return;
              exportDraft(); const next=record.value as Saved;
              if(core.validate(next.work.project,data!.registry,{...data!.resources,about:next.work.aboutText}).length)throw Error("The team draft needs reconciliation. Download it to retain it.");
              draftBase.current=sourceBase(next);
              edit(w=>Object.assign(w,structuredClone(next.work)));
              setStale(next.layoutSha!==data!.layoutSha || (next.work.aboutText!==next.baseAbout && next.versions.about!==data!.versions.about) || (next.work.settingsText!==next.baseSettings && next.versions.settings!==data!.versions.settings));
            }
            cloudRevision.current=record?.revision||0;cloudLastSaved.current=record?fingerprint(record.value.work):"";setCloud("ready");setCloudMessage("");
          }catch(e){notice((e as Error).message);}
        }}>{cloud === "conflict" ? "Load team draft" : "Reconnect team backup"}</button>
      </div>:null}
      {release ? (
        <div className="release-status">
          <strong>{release.state}</strong>
          <a
            href={
              "https://github.com/carolcilliers/sane-living-website-live/commit/" +
              release.commit
            }
            target="_blank"
            rel="noopener noreferrer"
          >
            Commit {release.commit.slice(0, 7)} ↗
          </a>
        </div>
      ) : null}
      <nav className="studio-mobile" aria-label="Editor panels">
        {(["left", "canvas", "right"] as const).map((t) => (
          <button
            key={t}
            aria-pressed={mobile === t}
            onClick={() => setMobile(t)}
          >
            {t === "left"
              ? "Blocks & layers"
              : t === "right"
                ? "Inspector"
                : "Canvas"}
          </button>
        ))}
      </nav>
      {loadError ? (
        <div className="error-box" role="alert">
          <h2>We couldn’t load the website</h2>
          <p>{loadError}</p>
          <button onClick={() => void load()}>Retry loading</button>
        </div>
      ) : null}
      {data && work && page ? (
        <div className={"studio-workspace mobile-" + mobile}>
          <nav className="studio-rail" aria-label="Studio navigation">
            {(
              [
                ["insert", "+", "Insert"],
                ["layers", "▱", "Layers"],
              ] as const
            ).map(([tab, icon, label]) => (
              <button
                key={tab}
                aria-pressed={leftTab === tab}
                onClick={() => {
                  setLeftTab(tab);
                  setMobile("left");
                }}
              >
                <span aria-hidden="true">{icon}</span>
                <small>{label}</small>
              </button>
            ))}
            <button
              className="rail-settings"
              aria-label="Settings"
              onClick={() => {
                setLeftTab("settings");
                setMobile("left");
              }}
            >
              <span>⚙</span>
              <small>Settings</small>
            </button>
          </nav>
          <aside className="studio-sidebar">
            <div className="sidebar-heading">
              <h2>
                {leftTab === "insert" ? "Insert a block" : leftTab === "settings" ? "Site settings" : "Layers"}
              </h2>
            </div>
            {leftTab === "settings" ? (
              <EditorSettings
                value={settingsValue}
                set={settingEdit}
                upload={upload}
              />
            ) : null}
            {leftTab === "insert" ? (
              <>
                <label className="field">Find an element<input aria-label="Find an insert" value={search} placeholder="Image, card, video, columns…" onChange={e=>setSearch(e.target.value)}/></label>
                <p className="sidebar-help">
                  Select a section, row or column to insert inside it. Select an element to insert after it. Drag onto a section line for an exact position.
                </p>
                <div className="insertion-context" role="status">Inserting {block ? (["section","row","column"].includes(block.type) || block.source && !elementId ? "inside " : "after ") + block.label : "at the top of the page"}</div>
                <h3 className="palette-heading">Layouts</h3>
                <div className="layout-library">{LAYOUTS.filter(l=>(l.name+" "+l.description).toLowerCase().includes(search.toLowerCase())).map(layout=><button key={layout.id} draggable onDragStart={e=>e.dataTransfer.setData("application/sane-block","layout:"+layout.id)} onClick={()=>add("layout:"+layout.id)}><LayoutWire columns={layout.columns}/><strong>{layout.name}</strong><small>{layout.description}</small></button>)}</div>
                <h3 className="palette-heading">Elements</h3>
                <div className="block-palette">
                  {core.TYPES.filter(
                    (t: string) =>
                      (LABELS[t] || t).toLowerCase().includes(search.toLowerCase()) && ![
                        "gallery",
                        "events",
                        "pricing",
                        "partners",
                        "booking",
                        "newsletter",
                      ].includes(t),
                  ).map((type: string) => (
                    <button
                      key={type}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("application/sane-block", type)
                      }
                      onClick={() => add(type)}
                    >
                      <span aria-hidden="true">{SYMBOLS[type]}</span>
                      {LABELS[type]}
                    </button>
                  ))}
                </div>
                <h3 className="palette-heading">Connected to your website</h3>
                <div className="block-palette">
                  {[
                    "gallery",
                    "events",
                    "pricing",
                    "partners",
                    "booking",
                    "newsletter",
                  ].filter(type=>(LABELS[type]||type).toLowerCase().includes(search.toLowerCase())).map((type) => (
                    <button
                      key={type}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("application/sane-block", type)
                      }
                      onClick={() => add(type)}
                    >
                      <span aria-hidden="true">{SYMBOLS[type]}</span>
                      {LABELS[type]}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
            {leftTab === "layers" ? (
              <>
                <Layers
                  sections={layerBlocks.map((b) => ({
                    id: b.id,
                    heading: b.label,
                    visible: !b.hidden,
                    depth: (()=>{let depth=0,parent=b.placement?.section;while(parent&&depth<10){depth++;parent=page.blocks.find(x=>x.id===parent)?.placement?.section;}return depth;})(),
                    kindLabel: b.source
                      ? "Original website section"
                      : LABELS[b.type] || b.type,
                  }))}
                  selected={selected}
                  select={(id) => {
                    select(id);
                    setMobile("right");
                  }}
                  move={(a, b) => move(layerBlocks[a].id, layerBlocks[b].id)}
                  add={() => setLeftTab("insert")}
                />
                {block?.type === "legacy" && selectedDescriptor ? (
                  <ElementTree
                    descriptor={selectedDescriptor}
                    block={block}
                    selected={elementId}
                    move={(from, to, after) =>
                      reorderElement(block.id, from, block.id, to, after)
                    }
                    choose={(id) => {
                      setElementId(id);
                      setMobile("right");
                    }}
                  />
                ) : null}
                {block?.type === "about" ? (
                  <div className="about-layer-list">
                    <h3>About story sections</h3>
                    {aboutSections.map((s) => (
                      <button
                        key={s.id}
                        aria-pressed={story?.id === s.id}
                        onClick={() => {
                          setStoryId(s.id);
                          setMobile("right");
                        }}
                      >
                        {s.heading}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </aside>
          <main
            className="studio-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const type = e.dataTransfer.getData("application/sane-block");
              if (core.TYPES.includes(type)) {
                e.preventDefault();
                add(type);
              }
            }}
          >
            <div className="studio-page-bar">
              <div>
                <strong>{page.name}</strong>
                <span>{page.route}</span>
              </div>
              <div>
                {page.id === "home" ? (
                  <button
                    onClick={() => {
                      const d = descriptors[0],
                        el = d?.elements.find((e: any) =>
                          e.bindings.some((b: any) => b.key === "homeVideoUrl"),
                        );
                      if (el) {
                        select(page.blocks[0].id, el.id);
                        setLeftTab("layers");
                        setMobile("right");
                      }
                    }}
                  >
                    Hero media
                  </button>
                ) : null}
                {descriptors.some((d:any)=>d.elements.some((e:any)=>e.dragOwner)) ? <button onClick={()=>restoreImageCards()} title="Restore image frames and card positions without discarding your content edits">Restore image cards</button> : null}
                <button
                  onClick={() => {
                    setLeftTab("insert");
                    setMobile("left");
                  }}
                >
                  + Add block
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (document.fullscreenElement)
                        await document.exitFullscreen();
                      else await document.documentElement.requestFullscreen();
                    } catch {
                      notice("Full screen is unavailable in this browser.");
                    }
                  }}
                >
                  Full screen
                </button>
                <a href={page.route} target="_blank" rel="noopener noreferrer">
                  View live ↗
                </a>
              </div>
            </div>
            <SiteCanvas
              page={page}
              project={work.project}
              registry={data.registry}
              resources={resources}
              assets={work.assets}
              width={width}
              selected={selected}
              selectedElement={elementId}
              tools={{
                coordinates: (b,id) => {const owner=page.blocks.find(x=>x.id===b),base=owner?.source ? owner.elements?.[id] || {} : owner?.design || {},scoped=owner?.source ? owner.elements?.[id]?.responsive?.[device] || {} : owner?.responsive?.[device] || {};return [Number(scoped.x ?? (device === "phone" ? 0 : base.x)) || 0,Number(scoped.y ?? (device === "phone" ? 0 : base.y)) || 0];},
                placement: placementFor,
                placeBlock,
                resize: (b,id,width,height) => targetDesignEdit(b,id,{width,height}),
                pickInsert: (block, placement) => {
                  insertionTarget.current = {block, placement};
                  setLeftTab("insert"); setMobile("left");
                },
                reorder: reorderElement,
                offset: (b,id,x,y) => targetDesignEdit(b,id,{x,y}),
                action: elementAction,
              }}
              select={(id, element) => {
                select(id, element);
                setLeftTab("layers");
                setMobile("right");
              }}
              move={move}
              insert={add}
              notice={notice}
              onLink={(route) => {
                const next = work.project.pages.find(
                  (p) =>
                    p.route === route || p.route.replace(/\/$/, "") === route,
                );
                if (next) choose(next.id);
                else
                  notice("This destination is outside the editable page list.");
              }}
            />
            <div className="studio-canvas-note">
              Draft canvas · saved privately on this browser · Preview opens a
              full-page snapshot in a new tab
            </div>
          </main>
          <aside className="studio-inspector">
            <div className="sidebar-heading">
              <h2>{block ? "Section inspector" : "Page settings"}</h2>
              <span className="scope-chip">
                {block?.source ? "Existing section" : "This page"}
              </span>
            </div>
            {!block ? (
              <>
                <label className="field">
                  Page name
                  <input
                    aria-label="Page name"
                    value={page.name}
                    onFocus={start}
                    onChange={(e) =>
                      pageEdit(
                        (p) => (p.name = e.target.value),
                        fieldGroup.current,
                      )
                    }
                  />
                </label>
                <div className="inspector-empty">
                  <span>↖</span>
                  <h3>Select something to edit</h3>
                  <p>
                    Click a section on the page, choose a layer, or add a block
                    from Insert.
                  </p>
                  <button
                    onClick={() => {
                      setLeftTab("insert");
                      setMobile("left");
                    }}
                  >
                    Explore blocks
                  </button>
                </div>
                {page.id.startsWith("custom--") ? (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={page.menu}
                      onChange={(e) =>
                        pageEdit((p) => (p.menu = e.target.checked))
                      }
                    />
                    Show this new page in navigation
                  </label>
                ) : (
                  <p className="sidebar-help">
                    Global navigation and branding remain in Settings.
                  </p>
                )}
                <button
                  onClick={() => {
                    setLeftTab("settings");
                    setMobile("left");
                  }}
                >
                  Open site settings
                </button>
              </>
            ) : (
              <>
                <nav className="selection-path" aria-label="Selected layer context">
                  <button onClick={()=>select("")}>{page.name}</button>
                  {block.placement ? <button onClick={()=>select(block.placement!.section)}>↑ Parent container</button> : null}
                  {elementId ? <button onClick={()=>select(block.id)}>↑ {block.label}</button> : null}
                  <strong>{elementId ? "Selected element" : block.label}</strong>
                </nav>
                <div className="selection-context-actions">
                  <button onClick={()=>{insertionTarget.current={block:block.id,placement:placementFor(block.id,elementId,true)};setLeftTab("insert");setMobile("left");}}>＋ Insert here</button>
                  <button onClick={()=>{select(block.id);setTimeout(()=>{const group=document.querySelector<HTMLElement>('.studio-inspector [data-design-group="3"]');group?.scrollIntoView({block:"start",behavior:"smooth"});},0);}}>Section background</button>
                </div>
                {!block.source && ["image","split","card"].includes(block.type) && block.props?.src ? <div className="selection-actions"><strong>{block.type === "image" ? "Image" : "Image in this section"}</strong><button onClick={()=>elementAction(block.id,"part:image","remove")}>Remove image</button><small>{block.type === "image" ? "Removes this image element. Its parent row or section stays." : "Removes only the image; keeps the text, buttons and section."} Undo restores it.</small></div> : null}
                <label className="field">
                  Section name
                  <input
                    value={block.label}
                    onFocus={start}
                    onChange={(e) =>
                      blockEdit(
                        (b) => (b.label = e.target.value),
                        fieldGroup.current,
                      )
                    }
                  />
                </label>
                {["about", "aboutHero"].includes(block.type) ? (
                  <>
                    <p className="binding-note">
                      Connected to the existing About source. Text, images and
                      section order save and publish together.
                    </p>
                    {block.type === "about" ? (
                      <label className="field">
                        Story section
                        <select
                          value={story?.id || ""}
                          onChange={(e) => setStoryId(e.target.value)}
                        >
                          {aboutSections.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.heading}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <Inspector
                      model={work.about}
                      section={block.type === "about" ? story : undefined}
                      change={aboutEdit}
                      remove={() => {
                        if (
                          !story ||
                          !confirm("Remove this About story section?")
                        )
                          return;
                        aboutEdit((m) => {
                          m.metadata.sections = m.metadata.sections!.filter(
                            (s) => s.id !== story.id,
                          );
                        }, crypto.randomUUID());
                      }}
                      duplicate={() => {
                        if (!story) return;
                        const copy = structuredClone(story);
                        copy.id = crypto.randomUUID();
                        copy.heading += " copy";
                        copy.editorRole = "none";
                        aboutEdit((m) => {
                          m.metadata.sections!.push(copy);
                        }, crypto.randomUUID());
                        setStoryId(copy.id);
                      }}
                    />
                    {block.type === "about" ? (
                      <label className="upload-image">
                        Upload story image
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          hidden
                          disabled={uploading || !story}
                          onChange={(e) => {
                            if (e.target.files?.[0] && story)
                              void upload(e.target.files[0], (url) =>
                                aboutEdit((m) => {
                                  const s = m.metadata.sections!.find(
                                    (s) => s.id === story.id,
                                  );
                                  if (s) s.image = url;
                                }, crypto.randomUUID()),
                              );
                          }}
                        />
                      </label>
                    ) : null}
                    {block.type === "about" ? (
                      <div className="about-story-actions">
                        <button
                          onClick={() => {
                            if (!story) return;
                            const i = aboutSections.indexOf(story);
                            if (i > 0)
                              aboutEdit((m) => {
                                m.metadata.sections!.splice(
                                  i - 1,
                                  0,
                                  m.metadata.sections!.splice(i, 1)[0],
                                );
                              }, crypto.randomUUID());
                          }}
                        >
                          Story ↑
                        </button>
                        <button
                          onClick={() => {
                            if (!story) return;
                            const i = aboutSections.indexOf(story);
                            if (i < aboutSections.length - 1)
                              aboutEdit((m) => {
                                m.metadata.sections!.splice(
                                  i + 1,
                                  0,
                                  m.metadata.sections!.splice(i, 1)[0],
                                );
                              }, crypto.randomUUID());
                          }}
                        >
                          Story ↓
                        </button>
                        <button
                          onClick={() => {
                            const id = crypto.randomUUID();
                            aboutEdit((m) => {
                              (
                                m.metadata.sections ||
                                (m.metadata.sections = [])
                              ).push({
                                id,
                                heading: "New story",
                                body: "Write your story here.",
                                editorRole: "none",
                              });
                            }, crypto.randomUUID());
                            setStoryId(id);
                          }}
                        >
                          + Story
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : null}
                {block.type === "legacy" && elementId && selectedDescriptor ? (
                  <ElementInspector
                    descriptor={selectedDescriptor}
                    block={block}
                    assets={work.assets}
                    id={elementId}
                    device={device}
                    openContent={() => openSource("weddings")}
                    change={elementEdit}
                    field={(id, value) =>
                      blockEdit((b) => {
                        b.edits = { ...b.edits, [id]: value };
                      })
                    }
                    setting={settingEdit}
                    settings={settingsValue}
                    upload={upload}
                    action={(action) =>
                      elementAction(block.id, elementId, action)
                    }
                  />
                ) : null}
                {block.type === "legacy" && !elementId ? (
                  <>
                    <p className="binding-note">
                      Edit supported text, images and links. Forms, collections
                      and settings retain their existing connections.
                    </p>
                    {descriptors
                      .find((d: any) => d.id === block.source)
                      ?.fields.map((f: any) => (
                        <label className="field" key={f.id}>
                          {f.label}
                          {f.kind === "text" && f.value.length > 100 ? (
                            <textarea
                              rows={5}
                              value={block.edits?.[f.id] ?? f.value}
                              onFocus={start}
                              onChange={(e) =>
                                blockEdit((b) => {
                                  b.edits = {
                                    ...b.edits,
                                    [f.id]: e.target.value,
                                  };
                                }, fieldGroup.current)
                              }
                            />
                          ) : (
                            <input
                              value={block.edits?.[f.id] ?? f.value}
                              onFocus={start}
                              onChange={(e) =>
                                blockEdit((b) => {
                                  b.edits = {
                                    ...b.edits,
                                    [f.id]: e.target.value,
                                  };
                                }, fieldGroup.current)
                              }
                            />
                          )}{" "}
                          {f.kind === "image" ? (
                            <label className="upload-image">
                              Replace image
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                disabled={uploading}
                                hidden
                                onChange={(e) => {
                                  if (e.target.files?.[0])
                                    void upload(e.target.files[0], (url) =>
                                      blockEdit((b) => {
                                        b.edits = { ...b.edits, [f.id]: url };
                                      }),
                                    );
                                }}
                              />
                            </label>
                          ) : null}
                        </label>
                      ))}
                    {[
                      "gallery",
                      "events",
                      "rent--weddings",
                      "rent--pricing",
                      "partners",
                      "contact",
                      "home",
                      "rent",
                    ].includes(page.id) ? (
                      <button
                        className="source-action"
                        onClick={() =>
                          openSource(
                            (
                              {
                                gallery: "gallery",
                                events: "events",
                                "rent--weddings": "weddings",
                                "rent--pricing": "pricing",
                                partners: "partners",
                              } as Record<string, string>
                            )[page.id] || "settings",
                            page.id === "home"
                              ? "home"
                              : page.id === "contact"
                                ? "contact"
                                : "booking",
                          )
                        }
                      >
                        Edit connected content →
                      </button>
                    ) : null}
                  </>
                ) : null}
                {!block.source
                  ? Object.entries(block.props || {}).map(([key, value]) => (
                      <label className="field" key={key}>
                        {FIELD_LABELS[key] || key}
                        {["text", "images", "items"].includes(key) ? (
                          <textarea
                            aria-label={FIELD_LABELS[key] || key}
                            rows={6}
                            value={value}
                            onFocus={start}
                            onChange={(e) =>
                              blockEdit((b) => {
                                b.props![key] = e.target.value;
                              }, fieldGroup.current)
                            }
                          />
                        ) : ["level", "side", "section", "kind", "style"].includes(
                            key,
                          ) ? (
                          <select
                            aria-label={FIELD_LABELS[key] || key}
                            value={value}
                            onChange={(e) =>
                              blockEdit((b) => {
                                b.props![key] = e.target.value;
                              })
                            }
                          >
                            {(key === "style" ? ["bullets","numbered"] : key === "level"
                              ? ["h1", "h2", "h3"]
                              : key === "side"
                                ? ["left", "right"]
                                : key === "section"
                                  ? ["venue", "weddings", "outdoor", "all"]
                                  : ["rental", "contact", "availability"]
                            ).map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label={FIELD_LABELS[key] || key}
                            type={key === "height" ? "number" : "text"}
                            value={value}
                            onFocus={start}
                            onChange={(e) =>
                              blockEdit((b) => {
                                b.props![key] =
                                  key === "height"
                                    ? Number(e.target.value)
                                    : e.target.value;
                              }, fieldGroup.current)
                            }
                          />
                        )}{" "}
                        {(key === "src" && block.type !== "video") || key === "poster" ? (
                          <label className="upload-image">
                            Upload replacement
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              hidden
                              disabled={uploading}
                              onChange={(e) => {
                                if (e.target.files?.[0])
                                  void upload(e.target.files[0], (url) =>
                                    blockEdit((b) => {
                                      b.props![key] = url;
                                    }),
                                  );
                              }}
                            />
                          </label>
                        ) : null}
                      </label>
                    ))
                  : null}
                {block.type === "slideshow" ? (
                  <label className="asset-picker">
                    Add gallery images
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        e.target.value = "";
                        for (const file of files)
                          await upload(file, (url) =>
                            blockEdit((b) => {
                              b.props!.images = [b.props!.images, url]
                                .filter(Boolean)
                                .join("\n");
                            }),
                          );
                      }}
                    />
                  </label>
                ) : null}
                {!block.source ? <details className="design-options"><summary>Shared section defaults</summary><p className="design-help">These presets affect every screen size. Use the device controls below for size-specific changes.</p><label className="field">Colour preset<select aria-label="Shared colour preset" value={block.theme || "white"} onChange={e=>blockEdit(b=>{b.theme=e.target.value;})}>{["white","soft","accent","dark"].map(v=><option key={v}>{v}</option>)}</select></label><label className="field">Section padding (all sizes)<input type="number" min={0} max={120} value={block.spacing ?? 48} onChange={e=>blockEdit(b=>{b.spacing=Math.max(0,Math.min(120,Number(e.target.value)));})}/></label></details> : null}
                {!elementId || block.type !== "legacy" ? <DesignInspector
                  upload={upload}
                  device={device}
                  value={block.responsive?.[device] || {}}
                  inherited={block.design || {}}
                  change={fn => blockEdit(b => { b.responsive ||= {}; b.responsive[device] ||= {}; fn(b.responsive[device]!); })}
                  reset={() => blockEdit(b => { if(b.responsive) delete b.responsive[device]; })}
                  optimize={() => blockEdit(b => { b.responsive ||= {}; b.responsive[device] = {...b.responsive[device], x:0,y:0,width:100,padding:device === "phone" ? 16 : 32}; })}
                /> : null}
                <div className="block-actions">
                  <button onClick={() => arrow(-1)}>Move ↑</button>
                  <button onClick={() => arrow(1)}>Move ↓</button>
                  {!block.source ? (
                    <button onClick={duplicate}>Duplicate</button>
                  ) : null}
                  <button onClick={remove}>
                    {block.source
                      ? block.hidden
                        ? "Restore section"
                        : "Remove section"
                      : "Remove block"}
                  </button>
                </div>
              </>
            )}
          </aside>
        </div>
      ) : null}
      <footer className="studio-draft-tools">
        <span>
          {stale
            ? "A newer published design needs reconciliation."
            : saving
              ? "Saving your private draft…"
              : "Private draft · this browser only"}
        </span>
        <div>
          {recoveryBlocked.current ? (
            <button
              onClick={async () => {
                try {
                  download(
                    await readRecord("drafts", "website"),
                    "sane-older-recovery.json",
                  );
                } catch {
                  notice("The stored recovery could not be read.");
                }
              }}
            >
              Download older recovery
            </button>
          ) : null}
          <button disabled={!work} onClick={async()=>{try{setRecoveryVersions(await draftHistory());}catch{notice("Recovery history could not be read. Download your current draft.");}}}>Recovery history</button>
          <button disabled={!work} onClick={exportDraft}>
            Download draft
          </button>
          <button disabled={!data} onClick={() => input.current?.click()}>
            Import
          </button>
          <button
            onClick={async () => {
              if (
                !confirm(
                  "Load the current published website? Download your private draft first if you want to keep it.",
                )
              )
                return;
              try {
                await clearDraft(revision.current);
                revision.current = 0;
                recoveryBlocked.current = false;
                await load(true);
              } catch (error) {
                notice((error as Error).message);
              }
            }}
          >
            Load published
          </button>
          <input
            type="file"
            ref={input}
            hidden
            accept="application/json,.json"
            onChange={(e) => {
              if (e.target.files?.[0]) void importFile(e.target.files[0]);
            }}
          />
        </div>
      </footer>
      {errors.length ? (
        <div className="studio-validation" role="alert">
          {errors.join(" ")}
        </div>
      ) : null}
      {message ? (
        <div className="studio-toast" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => notice("")}>
            ×
          </button>
        </div>
      ) : null}
      {newPage ? (
        <div className="studio-modal-backdrop">
          <section
            className="studio-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
          >
            <h2 id="create-title">Create a page</h2>
            <p>
              A new page uses the same Sane Living header, footer and design
              system.
            </p>
            <label className="field">
              Page name
              <input
                autoFocus
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
                }}
              />
            </label>
            <label className="field">
              URL slug
              <input value={slug} onChange={(e) => setSlug(e.target.value)} />
              <small>/{slug}/</small>
            </label>
            <div>
              <button onClick={() => setNewPage(false)}>Cancel</button>
              <button
                className="publish-action"
                disabled={!newName.trim() || !slug}
                onClick={create}
              >
                Create page
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {review ? (
        <div className="studio-modal-backdrop">
          <section
            className="studio-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-title"
          >
            <h2 id="publish-title">Publish your website changes</h2>
            <p>
              This will commit the reviewed design to GitHub main. Vercel then
              builds the website. Other content remains on its existing sources.
            </p>
            <ul>
              {orderChanged ? <li>Page list order</li> : null}
              {settingsChanged ? (
                <li>Site settings, hero media and button changes</li>
              ) : null}
              {changed.map((p) => (
                <li key={p.id}>
                  {p.name} <small>{p.route}</small>
                </li>
              ))}
            </ul>
            <p>
              {work?.assets.length || 0} staged images · About content included
              only when edited
            </p>
            <div>
              <button disabled={publishing} onClick={() => setReview(false)}>
                Keep editing
              </button>
              <button
                className="publish-action"
                disabled={publishing || !!errors.length}
                onClick={() => void publish()}
              >
                {publishing ? "Publishing…" : "Publish reviewed changes"}
              </button>
            </div>
          </section>
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
        <h2>The editor needs to reload</h2>
        <p>Your saved private draft is retained.</p>
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
