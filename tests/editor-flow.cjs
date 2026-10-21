const assert = require("node:assert/strict"),
  path = require("node:path"),
  fs = require("node:fs");
const createServer = require("./qa-server.cjs"),
  { launch } = require("./browser.cjs");
(async () => {
  const server = await createServer();
  let browser;
  try {
    browser = await launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      acceptDownloads: true,
    });
    await context.addCookies([
      { name: "sl_dash", value: server.cookie.split("=")[1], url: server.url },
    ]);
    await context.route("**/*", (r) =>
      r.request().url().startsWith(server.url) ? r.continue() : r.abort(),
    );
    const page = await context.newPage(),
      errors = [],
      writes = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (r.method() !== "GET" && r.url().startsWith(server.url + "/api/"))
        writes.push(r.url());
    });
    await page.goto(server.url + "/dash/");
    await page.locator("[data-nav=editor]").waitFor();
    assert.equal(
      await page.locator("#pageEditorFrame").count(),
      0,
      "editor loads only when opened",
    );
    await page.locator("[data-nav=editor]").click();
    let e = page.frameLocator("#pageEditorFrame");
    await e.getByLabel("Page heading", { exact: true }).waitFor();
    assert.equal(
      await e
        .getByRole("button", { name: "Review & publish →", exact: true })
        .isEnabled(),
      true,
    );
    await e
      .getByLabel("Section heading", { exact: true })
      .fill("A clearer About story");
    await e
      .getByLabel("Story", { exact: true })
      .fill("A welcoming **community** in Ojai.");
    await e
      .getByRole("button", { name: "Save on this browser", exact: true })
      .click();
    await page.waitForFunction(
      () => !!localStorage.getItem("sl_editor_about_v1"),
    );
    assert.match(
      await e.locator(".status-row [role=status]").textContent(),
      /Saved on this browser/,
    );
    await e.getByRole("button", { name: "Undo", exact: true }).click();
    assert.notEqual(
      await e.getByLabel("Story", { exact: true }).inputValue(),
      "A welcoming **community** in Ojai.",
    );
    await e.getByRole("button", { name: "Redo", exact: true }).click();
    await page.waitForTimeout(750);
    await page.reload();
    await e.getByLabel("Section heading", { exact: true }).waitFor();
    assert.equal(
      await e.getByLabel("Section heading", { exact: true }).inputValue(),
      "A clearer About story",
    );
    assert.equal(
      await e.getByLabel("Story", { exact: true }).inputValue(),
      "A welcoming **community** in Ojai.",
    );
    const preview = e.frameLocator('iframe[title="About page preview"]');
    await preview.locator("strong").filter({hasText:"community"}).waitFor();
    assert.equal(
      await preview.locator("strong").filter({ hasText: "community" }).count(),
      1,
    );
    await preview.locator("#site-nav .nav-logo img").waitFor();
    await preview.locator("#site-footer .footer-links").waitFor();
    assert.equal(await preview.locator("[data-animate-stagger] .card").first().evaluate(el=>getComputedStyle(el).opacity),"1","philosophy cards are visible");
    // Browsing current pages is real, but unconverted pages are explicitly preview-only.
    for(const [route, label] of [["/","Sane Living"],["/rent/","Rent"],["/rent/weddings/","Weddings"],["/gallery/","Gallery"],["/events/","Events"],["/contact/","Contact"]]) {
      await e.getByLabel("Website page").selectOption(route);
      await preview.locator("#site-footer .footer-links").waitFor();
      assert.match(await preview.locator("body").textContent(),new RegExp(label,"i"));
      assert.equal(await e.getByRole("button",{name:"Review & publish →",exact:true}).isDisabled(),true);
    }
    await e.getByLabel("Website page").selectOption("/about/");
    await preview.locator("strong").filter({hasText:"community"}).waitFor();
    await preview.locator('.footer-links a[href="/dash/"]').click();
    assert.equal(await page.locator('#panel-editor.active').count(),1,"canvas links cannot navigate to the dashboard");
    assert.equal(server.commits,0,"preview never writes");
    await e.getByRole("button",{name:"Full screen",exact:true}).click();
    await e.getByRole("button",{name:"Exit full screen",exact:true}).waitFor();
    await e.getByRole("button",{name:"Exit full screen",exact:true}).click();
    await e.getByRole("button",{name:"Full screen",exact:true}).waitFor();
    const sectionOrder = () => e.locator(".layer-name span").allTextContents();
    const initial = await sectionOrder();
    await e
      .getByRole("button", {
        name: "Move A clearer About story down",
        exact: true,
      })
      .click();
    let order = await sectionOrder();
    assert.equal(order[1], initial[0]);
    await e.getByRole("button", { name: "Undo", exact: true }).click();
    assert.deepEqual(await sectionOrder(), initial);
    // Exercise the same dnd-kit sensor path as a mouse drag.
    const handles = e.locator(".drag"),
      first = await handles.nth(0).boundingBox(),
      third = await handles.nth(2).boundingBox();
    await page.mouse.move(first.x + 8, first.y + 8);
    await page.mouse.down();
    await page.mouse.move(third.x + 8, third.y + third.height - 3, {
      steps: 18,
    });
    await page.mouse.up();
    await page.waitForTimeout(250);
    assert.notDeepEqual(await sectionOrder(), initial);
    await e.getByRole("button", { name: "Undo", exact: true }).click();
    // Keyboard sensor is independent of the move buttons.
    await page.waitForTimeout(350);
    await handles.nth(0).focus();
    await page.keyboard.press("Space");
    await page.waitForTimeout(100);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(150);
    await page.keyboard.press("Space");
    await page.waitForTimeout(250);
    assert.notDeepEqual(await sectionOrder(), initial);
    await e.getByRole("button", { name: "Undo", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await e
      .getByRole("button", { name: "Download draft", exact: true })
      .click();
    const download = await downloadPromise;
    const downloaded = JSON.parse(
      fs.readFileSync(await download.path(), "utf8"),
    );
    assert.equal(downloaded.kind, "sane-about-pilot");
    assert.match(downloaded.content, /A clearer About story/);
    page.once("dialog", (d) => d.accept());
    await e
      .locator("input[type=file]")
      .setInputFiles({
        name: "roundtrip.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(downloaded)),
      });
    await page.waitForTimeout(250);
    assert.equal(
      await e.getByLabel("Section heading", { exact: true }).inputValue(),
      "A clearer About story",
    );
    const all = await sectionOrder();
    await e
      .getByRole("button", { name: "Add a story section", exact: false })
      .click();
    assert.equal((await sectionOrder()).length, all.length + 1);
    page.once("dialog", (d) => d.accept());
    await e.getByRole("button", { name: "Remove", exact: true }).click();
    assert.equal((await sectionOrder()).length, all.length);
    // A failed browser save must not claim success; recovery download remains available.
    const frame = page
      .frames()
      .find((f) => f.url().includes("/dash/editor/index.html"));
    await frame.evaluate(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException("denied");
      };
    });
    await e
      .getByRole("button", { name: "Save on this browser", exact: true })
      .click();
    assert.match(
      await e.locator(".status-row [role=status]").textContent(),
      /save failed/,
    );
    assert.equal(
      await e
        .getByRole("button", { name: "Download draft", exact: true })
        .isEnabled(),
      true,
    );
    await page.reload();
    await e.getByLabel("Page heading", { exact: true }).waitFor();
    await e.frameLocator('iframe[title="About page preview"]').locator("#site-footer .footer-links").waitFor();
    for (const width of [375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1050 });
      await page.waitForTimeout(120);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "dashboard overflow " + width,
      );
      const frame = page
        .frames()
        .find((f) => f.url().includes("/dash/editor/index.html"));
      assert.equal(
        await frame.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "editor overflow " + width,
      );
      for (const [label, expected] of [
        ["Phone", 375],
        ["Tablet", 768],
        ["Desktop", 1024],
        ["Wide", 1440],
      ]) {
        await e.getByRole("button", { name: label, exact: true }).click();
        const inner = frame.childFrames()[0];
        assert.equal(
          await inner.evaluate(() => innerWidth),
          expected,
          "actual iframe viewport",
        );
      }
      if (width === 375 || width === 1440)
        await page.screenshot({
          path: path.join(__dirname, "qa-editor-" + width + ".png"),
          fullPage: true,
        });
    }
    await page.locator("[data-nav=about]").click();
    await page.locator("#aboutTitle").fill("Original About editor still works");
    assert.match(
      await page.locator("#savebar-about .msg").textContent(),
      /Unsaved/,
    );
    assert.equal(server.commits, 0);
    assert.deepEqual(writes, [], "the pilot never mutates production APIs");
    await page.locator("[data-nav=editor]").click();
    await e.getByRole("button", { name: "Preview", exact: true }).click();
    assert.equal(await e.locator(".layers").count(), 0);
    await e
      .getByRole("button", { name: "Back to editing", exact: true })
      .click();
    // Explicit transfer opens the existing About form, without an automatic write.
    page.once("dialog",d=>d.accept());
    await e.getByRole("button",{name:"Review & publish →",exact:true}).click();
    await page.locator("#panel-about.active").waitFor();
    assert.equal(await page.locator('[data-about-field="heading"]').first().inputValue(),"A clearer About story");
    assert.equal(server.commits,0,"transfer itself does not write");
    await page.locator('[data-draft="about"]').click();
    await page.waitForFunction(()=>document.querySelector('#savebar-about .msg').textContent.startsWith('Draft saved'));
    assert.match(JSON.parse(server.records.get('dashboard-drafts/about.json').content).content,/A clearer About story/);
    assert.doesNotMatch(server.records.get('public/content/about.md').content,/A clearer About story/);
    await page.locator('[data-save="about"]').click();
    await page.waitForFunction(()=>document.querySelector('#savebar-about .msg').textContent.startsWith('Published ·'));
    assert.match(server.records.get('public/content/about.md').content,/A clearer About story/);
    const published=await context.newPage();await published.goto(server.url+'/about/');
    assert.equal(await published.getByRole('heading',{name:'A clearer About story',exact:true}).count(),1);await published.close();
    // A stale visual draft must not overwrite the newly published source.
    await page.locator('[data-nav=editor]').click();
    await e.getByRole("button",{name:"Review & publish →",exact:true}).click();
    await e.locator('.editor-message').filter({hasText:'About changed since'}).waitFor();
    assert.equal(await page.locator('#panel-editor.active').count(),1);
    await page.locator("#logoutBtn").click();
    await page.locator("#loginView").waitFor({ state: "visible" });
    assert.equal(await page.locator("#pageEditorFrame").count(), 0);
    assert.equal(
      await page.evaluate(() => localStorage.getItem("sl_editor_about_v1")),
      null,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS lazy dashboard integration, editing, pointer/keyboard sorting, undo/redo, recovery, import/export, real-width preview, storage failures, mobile layout, isolation, review handoff, real-handler save/publish, stale-write protection and logout",
    );
    // An incompatible recovery must not be overwritten by hydration/autosave.
    const older = await context.newPage();
    await older.goto(server.url + "/dash/editor/index.html");
    await older.getByLabel("Page heading", { exact: true }).waitFor();
    const incompatible = JSON.stringify({
      schemaVersion: 999,
      content: "recover me",
    });
    await older.evaluate(
      (value) => localStorage.setItem("sl_editor_about_v1", value),
      incompatible,
    );
    older.once("dialog", d => d.accept());
    await older.reload();
    await older
      .getByRole("button", { name: "Download older recovery", exact: true })
      .waitFor();
    await older.waitForTimeout(900);
    assert.equal(
      await older.evaluate(() => localStorage.getItem("sl_editor_about_v1")),
      incompatible,
    );
    await older.close();
    // Source errors cannot become an empty editable page.
    const unauth = await browser.newContext();
    const denied = await unauth.newPage();
    await denied.goto(server.url + "/dash/editor/index.html");
    await denied
      .getByRole("heading", { name: "We couldn’t open this page" })
      .waitFor();
    assert.equal(
      await denied.getByLabel("Page heading", { exact: true }).count(),
      0,
    );
    await unauth.close();
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
