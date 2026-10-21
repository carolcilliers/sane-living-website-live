const fs = require('node:fs');
const path = require('node:path');
let playwright;
try { playwright = require('playwright'); }
catch (e) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw e;
  playwright = require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
}
exports.launch = () => playwright.chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || (fs.existsSync('/tmp/sane-chromium') ? '/tmp/sane-chromium' : undefined),
  args: ['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--no-zygote'],
  headless: true
});
