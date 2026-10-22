const assert = require("node:assert/strict");
const create = require("./qa-server.cjs"),
  { launch } = require("./browser.cjs");
(async () => {
  const server = await create();
  let browser;
  try {
    browser = await launch();
    const context = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      acceptDownloads: true,
    });
    await context.addCookies([
      { name: "sl_dash", value: server.cookie.split("=")[1], url: server.url },
    ]);
    await context.route("**/*", (r) =>
      r.request().url().startsWith(server.url) ? r.continue() : r.abort(),
    );
    const page = await context.newPage();
    await page.goto(server.url + "/dash/#editor");
    const editor = page.frameLocator("#pageEditorFrame");
    const frame = () =>
      page.frames().find((f) => f.url().includes("/dash/editor/index.html"));
    await editor.locator(".studio-workspace").first().waitFor();
    await editor.getByRole("button", { name: "Insert", exact: true }).click();
    await editor
      .locator(".block-palette")
      .getByRole("button", { name: "Heading", exact: true })
      .click();
    await editor
      .getByLabel("Text", { exact: true })
      .fill("Recoverable private design");
    await editor
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await editor
      .locator(".studio-status")
      .filter({ hasText: "Saved privately" })
      .waitFor();
    // A real storage failure must not clear work or falsely acknowledge the new version.
    await frame().evaluate(() => {
      indexedDB.open = () => {
        throw new DOMException("Storage quota test", "QuotaExceededError");
      };
    });
    await editor
      .getByLabel("Text", { exact: true })
      .fill("Still here when storage fails");
    await editor
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await editor
      .locator(".studio-status")
      .filter({ hasText: "Draft save failed" })
      .waitFor();
    assert.equal(
      await editor.getByLabel("Text", { exact: true }).inputValue(),
      "Still here when storage fails",
    );
    const downloadEvent = page.waitForEvent("download");
    await editor
      .getByRole("button", { name: "Download draft", exact: true })
      .click();
    const download = await downloadEvent;
    let body = "";
    for await (const chunk of await download.createReadStream()) body += chunk;
    assert.match(body, /Still here when storage fails/);
    page.once("dialog", (d) => d.accept());
    await page.reload();
    await editor.locator(".studio-workspace").first().waitFor();
    await editor.getByRole("button", { name: "Layers", exact: true }).click();
    await editor.locator(".layer-name").filter({hasText:"Heading"}).first().click();
    assert.equal(
      await editor.getByLabel("Text", { exact: true }).inputValue(),
      "Recoverable private design",
    );
    // Another browser tab saves a later revision in the same origin's real IndexedDB.
    const other = await context.newPage();
    await other.goto(server.url + "/dash/");
    await other.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("sl-studio-v2", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result,
              t = db.transaction("drafts", "readwrite"),
              s = t.objectStore("drafts"),
              r = s.get("website");
            r.onsuccess = () =>
              s.put(
                { ...r.result, revision: r.result.revision + 1 },
                "website",
              );
            t.oncomplete = () => {
              db.close();
              resolve();
            };
            t.onerror = () => reject(t.error);
          };
        }),
    );
    await editor
      .getByLabel("Text", { exact: true })
      .fill("Do not overwrite the other tab");
    await editor
      .getByRole("button", { name: "Save draft", exact: true })
      .click();
    await editor
      .locator(".studio-toast")
      .filter({ hasText: "Another tab saved a newer draft" })
      .waitFor();
    page.once("dialog", (d) => d.accept());
    await editor
      .getByRole("button", { name: "Load published", exact: true })
      .click();
    await editor
      .locator(".studio-toast")
      .filter({ hasText: "before replacing recovery" })
      .waitFor();
    assert.equal(
      await editor.getByLabel("Text", { exact: true }).inputValue(),
      "Do not overwrite the other tab",
    );
    assert.equal(server.commits, 0, "recovery checks never publish");
    console.log(
      "PASS quota failure retains downloadable work, refresh restores the saved version, newer-tab save and clear conflicts preserve recovery",
    );
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
