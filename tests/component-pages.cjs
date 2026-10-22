const assert=require('node:assert/strict'),fs=require('node:fs'),core=require('../content-core/site.cjs'),controls=require('../content-core/editor-controls.cjs'),registry=require('../content/page-templates.json'),create=require('./qa-server.cjs'),{launch}=require('./browser.cjs');
const resources=Object.fromEntries(['about','settings','gallery','weddings','pricing','partners'].map(k=>[k,fs.readFileSync('public/content/'+k+(k==='about'?'.md':'.json'),'utf8')]));
(async()=>{const s=await create();let browser;try{browser=await launch();const context=await browser.newContext({viewport:{width:1800,height:1100}});context.setDefaultTimeout(12000);await context.addCookies([{name:'sl_dash',value:s.cookie.split('=')[1],url:s.url}]);await context.route('**/*',r=>r.request().url().startsWith(s.url)?r.continue():r.abort());const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(s.url+'/dash/#editor');const e=page.frameLocator('#pageEditorFrame'),c=e.frameLocator('iframe[title="Website design canvas"]');await c.locator('[data-studio-boundary]').first().waitFor();let checked=0;const reports=[];
for(const entry of registry){
 await e.getByRole('button',{name:'Switch page',exact:true}).click();await e.getByRole('option').filter({has:e.locator('small').getByText(entry.route,{exact:true})}).click();await c.locator('meta[name="sane-preview-route"]').waitFor({state:'attached'});const frame=page.frames().find(f=>f.url()==='about:srcdoc'&&f.parentFrame()?.url().includes('/dash/editor/index.html'));await frame.waitForFunction(route=>document.querySelector('meta[name="sane-preview-route"]')?.getAttribute('content')===route,entry.route);
 await e.getByRole('button',{name:'Layers',exact:true}).click();let count=0;
 for(const block of core.describe(entry,resources).blocks){
  if(block.type!=='legacy')continue;
  await e.locator('[data-layer-id="'+block.id+'"] .layer-name').click();
  for(const element of block.elements){
   await e.locator('[data-editor-element="'+element.id+'"]').click();
   assert.equal(await e.locator('.element-title code').innerText(),element.tag,entry.route+' '+element.id+' selection');
   const role=controls.profile(element.tag);
   if(['image','video','embed'].includes(role))assert.equal(await e.getByLabel('Font size',{exact:true}).count(),0,'irrelevant typography is hidden for '+element.tag);
   assert.equal(await c.locator('#studio-canvas-tools').count()<=1,true,'one toolbar');checked++;count++;
  }
 }
 assert((await e.locator('.layer-list .layer').count())>0);reports.push({route:entry.route,selected:count});console.log('PASS page controls',entry.route,count);
}
assert.equal(reports.length,25);assert(checked>700);assert.equal(s.commits,0);assert.deepEqual(errors,[]);fs.writeFileSync('tests/qa-page-control-results.json',JSON.stringify(reports,null,2));console.log('PASS actual layer-tree selection and appropriate inspectors for',checked,'original elements across all 25 pages; no draft publication');
}finally{await browser?.close();await s.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
