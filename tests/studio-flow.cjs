const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {launch}=require('./browser.cjs');
const createServer=require('./qa-server.cjs');
(async()=>{
 const server=await createServer();let browser;
 try{
 browser=await launch();
 const context=await browser.newContext();await context.addCookies([{name:'sl_dash',value:server.cookie.split('=')[1],url:server.url}]);
 await context.route('**/*',route=>route.request().url().startsWith(server.url)?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.url+'/dash/');await page.locator('[data-nav="settings"]').waitFor();
 assert.equal(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.length-new Set(ids).size;}),0,'unique field IDs');
 assert.deepEqual(await page.locator('#mainNav [data-nav]').evaluateAll(nodes=>nodes.slice(-2).map(n=>n.dataset.nav)),['editor','settings']);
 for(const width of [375,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  for(const id of ['home','events','gallery','weddings','pricing','partners','settings']){
   await page.locator('[data-nav="'+id+'"]').click();await page.waitForTimeout(280);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,id+' overflow '+width);
   if(['settings','weddings'].includes(id)&&(width===375||width===1440))await page.screenshot({path:path.join(__dirname,'qa-'+id+'-'+width+'.png'),fullPage:true});
  }
  console.log('PASS all dashboard sections at '+width+'px');
 }
 await page.locator('[data-nav="settings"]').click();
 await page.getByRole('tab',{name:'Contact & social',exact:true}).click();
 await page.locator('#f-settings-email').fill('staff@example.com');
 assert.match(await page.locator('#savebar-settings .msg').textContent(),/Unsaved/);
 await page.reload();await page.locator('[data-nav="settings"]').click();await page.getByRole('tab',{name:'Contact & social',exact:true}).click();
 assert.equal(await page.locator('#f-settings-email').inputValue(),'staff@example.com');
 assert.match(await page.locator('#savebar-settings .msg').textContent(),/Recovered/);
 await page.locator('[data-draft="settings"]').click();await page.waitForFunction(()=>document.querySelector('#savebar-settings .msg').textContent.startsWith('Draft saved'));
 assert.equal(JSON.parse(server.records.get('public/content/settings.json').content).email,'info@saneliving.com');
 assert.equal(JSON.parse(JSON.parse(server.records.get('dashboard-drafts/settings.json').content).content).email,'staff@example.com');
 console.log('PASS refresh recovery and shared draft save leaves published content unchanged');
 const other=await browser.newContext();await other.addCookies([{name:'sl_dash',value:server.cookie.split('=')[1],url:server.url}]);await other.route('**/*',r=>r.request().url().startsWith(server.url)?r.continue():r.abort());const second=await other.newPage();await second.goto(server.url+'/dash/');await second.locator('[data-nav="settings"]').click();await second.getByRole('tab',{name:'Contact & social',exact:true}).click();assert.equal(await second.locator('#f-settings-email').inputValue(),'staff@example.com');await other.close();
 await page.locator('[data-save="settings"]').click();await page.waitForFunction(()=>document.querySelector('#savebar-settings .msg').textContent.startsWith('Published ·'));
 assert.equal(JSON.parse(server.records.get('public/content/settings.json').content).email,'staff@example.com');assert(!server.records.has('dashboard-drafts/settings.json'));
 const publicPage=await context.newPage();await publicPage.goto(server.url+'/contact/');await publicPage.locator('[data-site-email]').waitFor();await publicPage.waitForFunction(()=>document.querySelector('[data-site-email]').textContent==='staff@example.com');assert.equal(await publicPage.locator('.footer-contact a[href="mailto:staff@example.com"]').count(),1);
 console.log('PASS another team session reads shared draft; publish updates footer and Contact page');
 await page.getByRole('tab',{name:'Branding',exact:true}).click();
 await page.locator('#f-settings-businessName').fill('Sane Living Studio');server.failNext='dashboard-drafts/settings.json';await page.locator('[data-draft="settings"]').click();await page.locator('#feedback-settings').waitFor({state:'visible'});assert.match(await page.locator('#feedback-settings').textContent(),/refused/i);assert.equal(await page.locator('#f-settings-businessName').inputValue(),'Sane Living Studio');
 await page.locator('[data-draft="settings"]').click();await page.waitForFunction(()=>document.querySelector('#savebar-settings .msg').textContent.startsWith('Draft saved'));
 console.log('PASS failed save remains visible, preserves edits and can be retried');
 // About authoring, private preview and publication are exercised by site-editor-flow.cjs.
 await page.locator('[data-nav="settings"]').click();await page.getByRole('tab',{name:'Contact & social',exact:true}).click();await page.locator('#f-settings-email').fill('conflict@example.com');
 const record=server.records.get('public/content/settings.json');server.records.set('public/content/settings.json',{...record,sha:'teammate-new-sha'});
 await page.locator('[data-save="settings"]').click();await page.locator('#feedback-settings').waitFor({state:'visible'});assert.match(await page.locator('#feedback-settings').textContent(),/newer version/);assert.equal(await page.locator('#f-settings-email').inputValue(),'conflict@example.com');assert(await page.locator('[data-save="settings"]').isDisabled());
 console.log('PASS stale published revision blocks overwrite and keeps local work');
 assert.deepEqual(errors,[]);console.log('PASS no browser JavaScript errors');
 }finally{if(browser)await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
