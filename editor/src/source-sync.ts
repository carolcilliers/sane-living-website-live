import type {Bootstrap,Workspace} from './site-types';
const stable=(v:unknown)=>JSON.stringify(v,(_k,x)=>x && typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
export function isPublishedWork(w:Workspace|null,d:Bootstrap|null){return !!w && !!d && !w.assets.length && stable(w.project)===stable(d.project) && w.aboutText===d.resources.about && (w.settingsText || d.resources.settings)===d.resources.settings;}
export function sourceConflict(a:Bootstrap,b:Bootstrap){return a.layoutSha!==b.layoutSha || stable(a.versions)!==stable(b.versions) || stable(a.registry)!==stable(b.registry);}
