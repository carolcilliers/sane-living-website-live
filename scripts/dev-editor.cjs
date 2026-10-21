// Local-only proof server. Real handler behavior uses isolated in-memory Git fixtures.
// No production credential, GitHub mutation or Airtable mutation is used.
const path = require("node:path");
(async () => {
  const fixture = await require("../tests/qa-server.cjs")();
  process.env.EDITOR_API_ORIGIN = fixture.url;
  process.env.EDITOR_FIXTURE_COOKIE = fixture.cookie;
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: path.resolve(__dirname, "../editor/vite.config.mjs"),
  });
  await vite.listen();
  console.log("Local About editor proof — fixture data only.");
  vite.printUrls();
  async function close() {
    await vite.close();
    await fixture.close();
    process.exit(0);
  }
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
