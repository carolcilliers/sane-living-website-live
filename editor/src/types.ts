export interface Section {
  id: string;
  heading: string;
  body?: string;
  image?: string;
  imageAlt?: string;
  linkText?: string;
  linkUrl?: string;
  external?: boolean;
  visible?: boolean;
  layout?: "image-left" | "image-right" | "text-only";
  editorRole?: "founder" | "none";
  [key: string]: unknown;
}
export interface About {
  metadata: { title: string; sections?: Section[]; [key: string]: unknown };
  body: string;
  hasFrontmatter: boolean;
}
export interface Draft {
  kind: string;
  schemaVersion: number;
  sourceSha: string;
  page: unknown;
  content: string;
}
declare global {
  interface Window {
    SaneContent: {
      serializeAbout(m: About): string;
      parseAbout(s: string): About;
      esc(s: unknown): string;
    };
    SaneEditorModel: {
      fromSource(s: string, id: () => string): About;
      check(m: About, incomplete?: boolean): string[];
      exportDraft(m: About, sha: string): Draft;
      importDraft(d: unknown): { model: About; sourceSha: string };
    };
    SaneAboutRenderer: {
      documentHtml(t: string, m: About, p: string, annotate: boolean): string;
      sections(m: About, p: string, annotate?: boolean): string;
    };
  }
}
