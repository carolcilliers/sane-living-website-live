import type { About } from "./types";
export interface Block {
  id: string;
  type: string;
  source?: string;
  label: string;
  hidden?: boolean;
  theme?: string;
  align?: string;
  spacing?: number;
  props?: Record<string, string | number>;
  edits?: Record<string, string>;
}
export interface Page {
  id: string;
  name: string;
  route: string;
  slug?: string;
  menu: boolean;
  active: boolean;
  blocks: Block[];
}
export interface Project {
  version: 2;
  templateRevision: string;
  lastReleaseId?: string;
  pages: Page[];
}
export interface Asset {
  url: string;
  base64: string;
  name: string;
}
export interface Workspace {
  project: Project;
  about: About;
  aboutText: string;
  assets: Asset[];
}
export interface Bootstrap {
  version: 2;
  head: string;
  project: Project;
  resources: Record<string, string>;
  versions: Record<string, string>;
  layoutSha: string | null;
  registry: Registry[];
  lastRelease?: { id: string; commit: string; state: string } | null;
  legacyAboutDraft?: {
    content: string;
    baseSha: string;
    sha: string;
    updatedAt: string;
  } | null;
}
export interface Registry {
  id: string;
  name: string;
  route: string;
  output: string;
  html: string;
}
export interface Saved {
  work: Workspace;
  head: string;
  versions: Record<string, string>;
  layoutSha: string | null;
  baseAbout?: string;
}
export interface Snapshot {
  work: Workspace;
  registry: Registry[];
  resources: Record<string, string>;
  pageId: string;
}
