const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const create = require("./qa-server.cjs"),
  { launch } = require("./browser.cjs");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
(async () => {
  const server = await create();
  let browser, page;
  try {
    browser = await launch();
    const c = await browser.newContext({
      viewport: { width: 1720, height: 1100 },
    });
    await c.addCookies([
      { name: "sl_dash", value: server.cookie.split("=")[1], url: server.url },
    ]);
    await c.route("**/*", (r) =>
      r.request().url().startsWith(server.url) ? r.continue() : r.abort(),
    );
    page = await c.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.url + "/dash/");
    await page.locator("[data-nav=editor]").click();
    const editor = page.frameLocator("#pageEditorFrame"),
      canvas = editor.frameLocator('iframe[title="Website design canvas"]');
    await editor.locator(".studio-workspace").first().waitFor();
    assert.equal(
      await page.locator("#mainNav").isVisible(),
      true,
      "staff navigation stays visible",
    );
    assert.equal(c.pages().length, 1);
    await editor.locator(".theme-dark").waitFor();
    await editor
      .getByRole("button", { name: "Use light theme", exact: true })
      .click();
    await editor.locator(".theme-light").waitFor();
    await editor
      .getByRole("button", { name: "Use dark theme", exact: true })
      .click();
    await editor
      .getByRole("button", { name: "Switch page", exact: true })
      .click();
    await editor
      .getByRole("combobox", { name: "Find a page", exact: true })
      .fill("About");
    await page.keyboard.press("Enter");
    await canvas
      .locator('meta[name="sane-preview-route"][content="/about/"]')
      .waitFor({ state: "attached" });
    await editor
      .getByRole("button", { name: "Switch page", exact: true })
      .click();
    await editor
      .getByRole("combobox", { name: "Find a page", exact: true })
      .fill("Home");
    await page.keyboard.press("Enter");
    await canvas
      .locator('meta[name="sane-preview-route"][content="/"]')
      .waitFor({ state: "attached" });
    await canvas
      .getByRole("link", { name: "Rent the Space", exact: true })
      .click();
    await editor
      .getByLabel("Button text", { exact: true })
      .fill("Book a beautiful space");
    await canvas
      .getByRole("link", { name: "Book a beautiful space", exact: true })
      .waitFor();
    assert.equal(new URL(page.url()).hash, "#editor");
    await editor.getByLabel("X offset", { exact: true }).fill("36");
    await page.waitForTimeout(650);
    assert((await canvas.locator('a[data-site-text="homePrimaryLabel"]').evaluate(el=>getComputedStyle(el).translate)).startsWith("36px"));
    const free = canvas.getByRole("button", {
      name: "✥ Move freely",
      exact: true,
    });
    const box = await free.boundingBox();
    assert(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 20,
      box.y + box.height / 2 + 10,
      { steps: 6 },
    );
    await page.mouse.up();
    await page.waitForTimeout(400);
    assert(
      Number(
        await editor.getByLabel("X offset", { exact: true }).inputValue(),
      ) > 36,
      "pointer drag updates saved coordinates",
    );
    // Actual HTML drag/drop, followed by renderer output and an undo.
    await canvas
      .locator("h1[data-site-text]")
      .dragTo(canvas.locator('p[data-site-text="homeIntro"]'), {
        targetPosition: await canvas
          .locator('p[data-site-text="homeIntro"]')
          .evaluate((el) => ({ x: 20, y: el.clientHeight - 3 })),
      });
    await page.waitForTimeout(500);
    const ordering = await canvas
      .locator(".video-hero-content")
      .evaluate((el) => Array.from(el.children).map((n) => n.tagName));
    assert(
      ordering.indexOf("H1") !== 0,
      "direct drag changes individual element placement",
    );
    await editor.getByRole("button", { name: "Undo", exact: true }).click();
    // Hero settings are editable where the video is selected.
    await canvas
      .locator(".video-hero")
      .evaluate((el) => el.ownerDocument.defaultView.scrollTo(0, 0));
    await canvas
      .locator(".video-hero")
      .click({ position: { x: 30, y: 130 }, force: true });
    await editor
      .getByLabel("Hero video URL", { exact: true })
      .fill("/updated-hero.mp4");
    await editor
      .getByLabel("Hero poster image", { exact: true })
      .fill("/images/center-office.jpg");
    await editor
      .locator(".element-inspector .asset-picker:not(.background-upload) input[type=file]")
      .setInputFiles({
        name: "hero-poster.png",
        mimeType: "image/png",
        buffer: png,
      });
    await canvas
      .locator('[data-site-hero-video][poster^="data:image/"]')
      .waitFor({ state: "attached" });
    await editor.getByRole("button", { name: "Settings", exact: true }).click();
    await editor
      .locator(".editor-settings")
      .getByLabel("Hero video URL", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .locator("[data-nav=editor]")
        .evaluate((n) => n.classList.contains("active")),
      true,
    );
    await editor
      .locator(".editor-settings")
      .getByLabel("Hero video URL", { exact: true })
      .fill("/reviewed-hero.mp4");
    // Insert an image into the existing hero container using the palette's native drag payload.
    await editor.getByRole("button", { name: "Insert", exact: true }).click();
    const source = editor
        .locator(".block-palette")
        .getByRole("button", { name: "Image", exact: true }),
      target = canvas.locator(".video-hero-content");
    await source.scrollIntoViewIfNeeded();
    const from = await source.boundingBox(),
      to = await target.boundingBox();
    assert(from && to);
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      from.x + from.width / 2 + 10,
      from.y + from.height / 2,
      { steps: 3 },
    );
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
      steps: 20,
    });
    await page.mouse.move(to.x + to.width / 2 + 2, to.y + to.height / 2 + 2);
    await page.mouse.up();
    await canvas.locator(".video-hero-content .studio-block img").waitFor();
    await editor.locator(".studio-inspector .upload-image input[type=file]").setInputFiles({
      name: "hero-insert.png",
      mimeType: "image/png",
      buffer: png,
    });
    await editor
      .getByLabel("Image description", { exact: true })
      .fill("Inserted privately inside the hero");
    await canvas
      .locator(
        '.video-hero-content img[alt="Inserted privately inside the hero"][src^="data:image/"]',
      )
      .waitFor();
    // Turn the existing Conference Room image into a navigable gallery.
    await canvas
      .getByRole("img", { name: "Conference Room", exact: true })
      .click();
    await editor
      .getByText("Turn this image into a gallery", { exact: true })
      .waitFor();
    await editor
      .locator(".element-inspector input[type=file][multiple]")
      .setInputFiles([
        { name: "room-slide.png", mimeType: "image/png", buffer: png },
      ]);
    await canvas
      .locator(".rent-card .studio-carousel-track img")
      .nth(1)
      .waitFor();
    console.log(
      "PASS native pointer movement, hero settings, nested insertion and image gallery editing",
    );
    assert.equal(server.commits, 0, "all edits remain private");
    await editor
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await editor
      .locator(".studio-status")
      .filter({ hasText: "Saved privately" })
      .waitFor();
    const popup = c.waitForEvent("page");
    await editor
      .getByRole("button", { name: "Preview ↗", exact: true })
      .click();
    const preview = await popup;
    await preview.waitForURL("**/preview.html?snapshot=*");
    const full = preview.frameLocator(
      'iframe[title="Full-page draft preview"]',
    );
    await full
      .getByRole("link", { name: "Book a beautiful space", exact: true })
      .waitFor();
    await full
      .locator('[data-site-hero-video] source[src="/reviewed-hero.mp4"]')
      .waitFor({ state: "attached" });
    await full.locator('.rent-card [data-slide="1"]').click();
    await preview.waitForTimeout(500);
    assert(
      await full
        .locator(".rent-card .studio-carousel-track")
        .evaluate((el) => el.scrollLeft > 0),
      "carousel arrows work inside the original linked card",
    );
    assert.equal(server.commits, 0);
    await editor.getByRole("button", { name: "Publish", exact: true }).click();
    await editor
      .getByRole("dialog")
      .getByRole("button", { name: "Publish reviewed changes", exact: true })
      .click();
    await editor
      .locator(".release-status")
      .filter({ hasText: "Commit accepted" })
      .waitFor();
    assert.equal(server.commits, 1);
    assert.equal(server.uploads, 3);
    const settings = JSON.parse(
      server.records.get("public/content/settings.json").content,
    );
    assert.equal(settings.homePrimaryLabel, "Book a beautiful space");
    assert.equal(settings.homeVideoUrl, "/reviewed-hero.mp4");
    const html = fs.readFileSync(
      path.join(server.root, "public/index.html"),
      "utf8",
    );
    assert.match(html, /studio-carousel-track/);
    assert.match(html, /Inserted privately inside the hero/);
    const project = JSON.parse(
      server.records.get("content/site-layouts.json").content,
    );
    assert(
      project.pages
        .find((p) => p.id === "home")
        .blocks.some((b) => b.placement),
      "nested insertion survives atomic publishing",
    );
    await page.screenshot({
      path: path.join(__dirname, "qa-element-editor-dark.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await preview.close();
    console.log(
      "PASS persistent dashboard sidebar, dark theme, direct button/video editing, pointer positioning, native element and palette drag/drop, nested insertion, private image gallery, preview and atomic settings/layout/image publication",
    );
  } catch (e) {
    if (page)
      await page.screenshot({
        path: path.join(__dirname, "qa-elements-failure.png"),
        fullPage: true,
      });
    throw e;
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
