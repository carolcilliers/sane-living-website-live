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
  elements?: Record<string, ElementChange>;
  states?: Partial<Record<"hover"|"focus",Partial<Record<Device,Design>>>>;
  design?: Design;
  responsive?: Partial<Record<Device, Design>>;
  placement?: { section: string; parent: string; before?: string };
}
export type Device = "desktop" | "tablet" | "phone";
export type Design = Record<string, string | number>;
export interface ElementChange {
  responsive?: Partial<Record<Device, Design>>;
  [key: string]: any;
  x?: number;
  y?: number;
  width?: number;
  align?: string;
  hidden?: boolean;
  parent?: string;
  order?: number;
  gallery?: string[];
  fontSize?: number;
  color?: string;
  background?: string;
  padding?: number;
  gap?: number;
  radius?: number;
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
  patterns?: {id:string;name:string;blocks:Block[]}[];
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
  settingsText?: string;
  assets: Asset[];
}
export interface Bootstrap {
  media?: {url:string;sha:string}[];
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
  baseSettings?: string;
}
export interface Snapshot {
  work: Workspace;
  registry: Registry[];
  resources: Record<string, string>;
  pageId: string;
}
