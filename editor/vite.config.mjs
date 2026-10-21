import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const target = process.env.EDITOR_API_ORIGIN || "http://127.0.0.1:3000";
const proxy = Object.fromEntries(
  [
    "/api/",
    "/about/",
    "^/\\?editor-preview=",
    "/script.js",
    "/site-content.js",
    "/content/",
    "/rent/",
    "/gallery/",
    "/events/",
    "/contact/",
    "/site-config.js",
    "/vendor/",
    "/content-model.js",
    "/editor-model.js",
    "/about-renderer.js",
    "/style.css",
    "/subpage.css",
    "/images/",
  ].flatMap((prefix) => {
    const entry = {
      target,
      headers: process.env.EDITOR_FIXTURE_COOKIE
        ? { Cookie: process.env.EDITOR_FIXTURE_COOKIE }
        : {},
    };
    return [
      [prefix, entry],
      [
        "/dash/editor" + prefix,
        { ...entry, rewrite: (p) => p.replace(/^\/dash\/editor/, "") },
      ],
    ];
  }),
);
export default defineConfig({
  root,
  base: "/dash/editor/",
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: path.resolve(root, "../public/dash/editor"),
    emptyOutDir: true,
  },
  server: { host: "127.0.0.1", proxy },
});
