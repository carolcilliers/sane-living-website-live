const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const create = require("./qa-server.cjs"),
  { launch } = require("./browser.cjs");
(async () => {
  const server = await create();
  let browser;
  try {
    browser = await launch();
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1100 },
      acceptDownloads: true,
    });
    await context.addCookies([
      { name: "sl_dash", value: server.cookie.split("=")[1], url: server.url },
    ]);
    await context.route("**/*", (r) =>
      r.request().url().startsWith(server.url) ? r.continue() : r.abort(),
    );
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.url + "/dash/");
    assert.equal(
      await page.locator("[data-nav=about]").count(),
      0,
      "About is consolidated",
    );
    await page.locator("[data-nav=editor]").click();
    const e = page.frameLocator("#pageEditorFrame");
    await e
      .getByRole("button", { name: "Home /", exact: false })
      .first()
      .waitFor();
    const frame = () =>
      page.frames().find((f) => f.url().includes("/dash/editor/index.html"));
    await e.getByRole("button", { name: "Insert", exact: true }).click();
    await e
      .locator(".block-palette")
      .getByRole("button", { name: "Heading", exact: true })
      .click();
    await e
      .getByLabel("Text", { exact: true })
      .fill("A freshly designed Sane Living");
    await e.getByRole("button", { name: "Save draft", exact: true }).click();
    await e
      .locator(".studio-status [role=status]")
      .filter({ hasText: "Saved privately" })
      .waitFor();
    assert.equal(server.commits, 0, "private draft saving never commits");
    const canvas = e.frameLocator('iframe[title="Website design canvas"]');
    await canvas
      .getByRole("heading", {
        name: "A freshly designed Sane Living",
        exact: true,
      })
      .waitFor();
    await canvas.locator("#site-nav .nav-logo img").waitFor();
    await canvas.locator("#site-footer .footer-links").waitFor();
    const popupPromise = context.waitForEvent("page");
    await e.getByRole("button", { name: "Preview ↗", exact: true }).click();
    const preview = await popupPromise;
    await preview.waitForURL("**/dash/editor/preview.html?snapshot=*");
    await preview.getByRole("button", { name: "Close preview" }).waitFor();
    const full = preview.frameLocator(
      'iframe[title="Full-page draft preview"]',
    );
    await full
      .getByRole("heading", {
        name: "A freshly designed Sane Living",
        exact: true,
      })
      .waitFor();
    assert.equal(server.commits, 0, "full-page preview never publishes");
    await e.getByLabel("Text", { exact: true }).fill("A newer local design");
    await full
      .getByRole("heading", {
        name: "A freshly designed Sane Living",
        exact: true,
      })
      .waitFor();
    assert.equal(
      await full.getByText("A newer local design", { exact: true }).count(),
      0,
      "preview snapshot is immutable",
    );
    await e.getByRole("button", { name: "Undo", exact: true }).click();
    await e.getByRole("button", { name: "Redo", exact: true }).click();
    assert.equal(
      await e.getByLabel("Text", { exact: true }).inputValue(),
      "A newer local design",
    );
    await e.getByRole("button", { name: "Save draft", exact: true }).click();
    await e
      .locator(".studio-status [role=status]")
      .filter({ hasText: "Saved privately" })
      .waitFor();
    await page.reload();
    await e
      .getByRole("button", { name: "Home /", exact: false })
      .first()
      .waitFor();
    await e.getByRole("button", { name: "Layers", exact: true }).click();
    await e
      .locator(".layer-name")
      .filter({ hasText: "Heading" })
      .last()
      .click();
    assert.equal(
      await e.getByLabel("Text", { exact: true }).inputValue(),
      "A newer local design",
    );
    const before = await e.locator(".layer-name span").allTextContents();
    await e.getByRole("button", { name: "Move ↑", exact: true }).click();
    const after = await e.locator(".layer-name span").allTextContents();
    assert.notDeepEqual(after, before);
    await e.getByRole("button", { name: "Undo", exact: true }).click();
    assert.deepEqual(
      await e.locator(".layer-name span").allTextContents(),
      before,
    );
    // Every existing page can be opened in the actual renderer, preserving its integration scripts.
    await e.getByRole("button", { name: "Pages", exact: true }).click();
    const buttons = e.locator(".page-row>button");
    assert.equal(await buttons.count(), 25);
    for (let i = 0; i < 25; i++) {
      const route = await buttons.nth(i).locator("small").textContent();
      await buttons.nth(i).click();
      await canvas
        .locator('meta[name="sane-preview-route"][content="' + route + '"]')
        .waitFor({ state: "attached" });
      await canvas.locator("#site-nav .nav-logo").waitFor();
    }
    // Existing editorial text is editable without replacing its page scaffold.
    await e
      .locator(".page-row>button")
      .filter({ hasText: "Evo3" })
      .first()
      .click();
    await e.getByRole("button", { name: "Layers", exact: true }).click();
    await e.locator(".layer-name").first().click();
    await e
      .getByRole("textbox", { name: /^H3 · Bio Ego Algo/ })
      .fill("EVO 3 — a new chapter");
    await canvas
      .getByRole("heading", { name: "EVO 3 — a new chapter", exact: true })
      .waitFor();
    await e.getByRole("button", { name: "Pages", exact: true }).click();
    // About edits live in the same studio and the same canonical source.
    await e
      .locator(".page-row>button")
      .filter({ hasText: "About" })
      .first()
      .click();
    await e.getByRole("button", { name: "Layers", exact: true }).click();
    await e
      .locator(".layer-name")
      .filter({ hasText: "Sane Living Center" })
      .first()
      .click();
    await e.getByLabel("Section heading", { exact: true }).waitFor();
    await e
      .getByLabel("Section heading", { exact: true })
      .fill("One unified About editor");
    // Add a real route and a connected gallery block.
    await e.getByRole("button", { name: "Pages", exact: true }).click();
    await e.getByRole("button", { name: "Create page", exact: true }).click();
    await e
      .getByLabel("Page name", { exact: true })
      .last()
      .fill("Team retreat");
    await e
      .getByRole("dialog")
      .getByRole("button", { name: "Create page", exact: true })
      .click();
    await e.getByRole("button", { name: "Insert", exact: true }).click();
    await e
      .locator(".block-palette")
      .getByRole("button", { name: "Gallery", exact: true })
      .click();
    await e.getByLabel("Heading", { exact: true }).fill("Our venue collection");
    await canvas
      .getByRole("heading", { name: "Our venue collection", exact: true })
      .waitFor();
    assert((await canvas.locator(".studio-gallery-grid img").count()) > 0);
    // Image bytes stay private until the single reviewed release.
    await e.getByRole("button", { name: "Insert", exact: true }).click();
    await e
      .locator(".block-palette")
      .getByRole("button", { name: "Image", exact: true })
      .click();
    await e
      .locator(".studio-inspector input[type=file]")
      .setInputFiles({
        name: "staged.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    await e
      .getByLabel("Image description", { exact: true })
      .fill("Private staged image");
    await canvas
      .locator('img[alt="Private staged image"][src^="data:image/"]')
      .waitFor();
    assert.equal(
      server.uploads,
      0,
      "staged image has not been uploaded publicly",
    );
    // Exercise actual dnd-kit keyboard movement, independently of move buttons.
    const orderBefore = await e.locator(".layer-name span").allTextContents();
    const handles = e.locator(".drag");
    await handles.last().focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(150);
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);
    assert.notDeepEqual(
      await e.locator(".layer-name span").allTextContents(),
      orderBefore,
    );
    await e.getByRole("button", { name: "Undo", exact: true }).click();
    // Save/review/commit/build/live verification is one user-visible workflow.
    await e.getByRole("button", { name: "Publish", exact: true }).click();
    await e
      .getByRole("dialog")
      .getByRole("button", { name: "Publish reviewed changes", exact: true })
      .click();
    await e
      .locator(".release-status")
      .filter({ hasText: "Commit accepted" })
      .waitFor();
    assert.equal(
      server.commits,
      1,
      "layout, About, release descriptor and new route use one commit",
    );
    assert.match(
      server.records.get("public/content/about.md").content,
      /One unified About editor/,
    );
    assert(server.records.has("content/site-layouts.json"));
    assert.equal(
      server.uploads,
      1,
      "referenced staged image is promoted in the same commit",
    );
    assert(
      ![...server.records.keys()].some((k) =>
        k.startsWith("dashboard-drafts/"),
      ),
    );
    const published = await context.newPage();
    await published.goto(server.url + "/team-retreat/");
    await published
      .getByRole("heading", { name: "Our venue collection", exact: true })
      .waitFor();
    assert((await published.locator(".studio-gallery-grid img").count()) > 0);
    await published.close();
    await e
      .locator(".release-status")
      .filter({ hasText: "Live on the website" })
      .waitFor({ timeout: 15000 });
    // Return to the dashboard and confirm that gallery collection cards contain their images.
    await e
      .getByRole("button", { name: "Return to dashboard", exact: true })
      .click();
    await page.locator("[data-nav=gallery]").click();
    assert.equal(await page.locator(".gallery-section-card").count(), 3);
    for (const id of ["venue", "weddings", "outdoor"]) {
      const group = page.locator("#gal-group-" + id);
      assert.equal(await group.locator(".group-head").count(), 1);
      assert.equal(await group.locator(".gallery-section-photos").count(), 1);
      assert.equal(
        await group.locator(".photo-card").count(),
        JSON.parse(
          server.records.get("public/content/gallery.json").content,
        ).photos.filter((p) => (p.section || "venue") === id).length,
      );
    }
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.locator("[data-nav=editor]").click();
      await e
        .getByRole("button", { name: "Canvas", exact: true })
        .click()
        .catch(() => {});
      assert.equal(
        await frame().evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "editor horizontal overflow " + width,
      );
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: path.join(__dirname, "qa-website-studio-" + width + ".png"),
          fullPage: true,
        });
      await e
        .getByRole("button", { name: "Return to dashboard", exact: true })
        .click();
    }
    await preview.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS unified About, all 25 pages, private saves/recovery, immutable full-tab previews, block editing/reordering, new routes, connected gallery, atomic publishing, verified live marker, grouped gallery cards and responsive studio",
    );
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
