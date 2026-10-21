const NAME = "sl-studio-v2";
export function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(NAME, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("drafts");
      r.result.createObjectStore("snapshots");
    };
    r.onsuccess = () => {
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
    r.onerror = () => reject(r.error);
  });
}
export async function readRecord(store: string, key: string): Promise<any> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, "readonly"),
      r = t.objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => db.close();
  });
}
export async function saveDraft(
  value: unknown,
  expected: number,
): Promise<number> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const t = db.transaction("drafts", "readwrite"),
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
