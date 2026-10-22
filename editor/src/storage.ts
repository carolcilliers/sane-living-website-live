const NAME = "sl-studio-v2";
export function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(NAME, 1);
    let failed = false;
    const timer = setTimeout(() => { failed=true;reject(Error("Private storage did not open. Close older dashboard tabs and download a backup.")); },8000);
    r.onblocked = () => {failed=true;clearTimeout(timer);reject(Error("Another tab is blocking private storage. Close older dashboard tabs and retry."));};
    r.onupgradeneeded = () => {
      r.result.createObjectStore("drafts");
      r.result.createObjectStore("snapshots");
    };
    r.onsuccess = () => {
      clearTimeout(timer);
      if(failed){r.result.close();return;}
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
    r.onerror = () => {clearTimeout(timer);reject(r.error);};
  });
}
export async function readRecord(store: string, key: string): Promise<any> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, "readonly"),
      r = t.objectStore(store).get(key);
    let result: any;
    r.onsuccess = () => { result = r.result; };
    r.onerror = () => reject(r.error);
    t.oncomplete = () => { db.close(); resolve(result); };
    t.onabort = () => { db.close(); reject(t.error || Error("Private storage read interrupted.")); };
  });
}
export async function saveDraft(
  value: unknown,
  expected: number,
): Promise<number> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const t = db.transaction("drafts", "readwrite", {durability:"strict"}),
      s = t.objectStore("drafts"),
      r = s.get("website");
    let revision = expected + 1,
      conflict = false;
    r.onsuccess = () => {
      if ((r.result?.revision || 0) !== expected) {
        conflict = true;
        t.abort();
        return;
      }
      if (r.result) s.put(r.result, "history:" + Date.now() + ":" + expected);
      // Keep ten previous saves across draft resets, atomically with the new draft.
      const versions: {key: IDBValidKey; updatedAt:number}[] = [], cursor=s.openCursor();
      cursor.onsuccess=()=>{const c=cursor.result;if(c){if(String(c.key).startsWith("history:"))versions.push({key:c.key,updatedAt:c.value.updatedAt});c.continue();}else versions.sort((a,b)=>b.updatedAt-a.updatedAt).slice(10).forEach(v=>s.delete(v.key));};
      s.put({ revision, value, updatedAt: Date.now() }, "website");
    };
    t.oncomplete = () => {
      db.close();
      resolve(revision);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
    t.onabort = () => {
      db.close();
      reject(
        Error(
          conflict
            ? "Another tab saved a newer draft. Download your work before reopening the editor."
            : "The private browser draft could not be saved. Download your work to keep it.",
        ),
      );
    };
  });
}
export async function snapshot(value: unknown): Promise<string> {
  const id = crypto.randomUUID(),
    db = await database();
  return new Promise((resolve, reject) => {
    const t = db.transaction("snapshots", "readwrite");
    t.objectStore("snapshots").add({ value, createdAt: Date.now() }, id);
    t.oncomplete = () => {
      db.close();
      resolve(id);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}
export async function clearDraft(expected: number) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction("drafts", "readwrite");
    const store = t.objectStore("drafts"),
      read = store.get("website");
    let conflict = false;
    read.onsuccess = () => {
      if ((read.result?.revision || 0) !== expected) {
        conflict = true;
        t.abort();
        return;
      }
      store.delete("website");
    };
    t.onabort = () => {
      db.close();
      reject(
        Error(
          conflict
            ? "Another tab saved a newer draft. Download your work and reopen the editor before replacing recovery."
            : "The private draft could not be cleared.",
        ),
      );
    };
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

export async function draftHistory(): Promise<any[]> {
 const db = await database();
 return new Promise((resolve,reject) => {
  const t=db.transaction("drafts","readonly"), r=t.objectStore("drafts").openCursor();
  const values:any[]=[];
  r.onsuccess=()=>{const c=r.result;if(c){if(String(c.key).startsWith("history:"))values.push(c.value);c.continue();}};
  t.oncomplete=()=>{db.close();resolve(values.sort((a,b)=>b.revision-a.revision));};
  t.onabort=t.onerror=()=>{db.close();reject(t.error);};
 });
}
