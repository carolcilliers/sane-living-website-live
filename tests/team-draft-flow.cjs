const assert=require('node:assert/strict'),create=require('./qa-server.cjs'),{launch}=require('./browser.cjs');
(async()=>{const server=await create();let browser;try{
 browser=await launch();let record=null,offline=false;
 async function open(){const context=await browser.newContext({viewport:{width:1650,height:1100}});context.setDefaultTimeout(15000);await context.addCookies([{name:'sl_dash',value:server.cookie.split('=')[1],url:server.url}]);
  await context.route('**/*',async r=>{
   if(!r.request().url().startsWith(server.url))return r.abort();
   if(new URL(r.request().url()).pathname!='/api/studio-draft')return r.continue();
   const reply=(status,json)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(json)});
   if(offline)return reply(503,{error:'Team draft storage is unavailable. Your browser copy is retained.'});
   if(r.request().method()==='GET')return reply(200,{configured:true,record});
   const body=r.request().postDataJSON();
   if((record?.revision||0)!==body.expected)return reply(409,{error:'Another team member saved a newer draft. Your browser copy is retained.'});
   // Redis Lua may change object key order; equivalent data must not produce a false conflict on reload.
   const reverse=v=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):Array.isArray(v)?v.map(reverse):v;
   record={revision:(record?.revision||0)+1,value:reverse(body.value),updatedAt:Date.now()};return reply(200,{configured:true,record});
  });
  const page=await context.newPage();await page.goto(server.url+'/dash/#editor');const editor=page.frameLocator('#pageEditorFrame');await editor.locator('.page-row').first().waitFor();return {context,page,editor};
 }
 const a=await open();await a.editor.locator('.team-draft-status').filter({hasText:'backed up privately'}).waitFor();
 await a.editor.getByRole('button',{name:'Insert',exact:true}).click();await a.editor.locator('.block-palette').getByRole('button',{name:'Heading',exact:true}).click();await a.editor.getByLabel('Text',{exact:true}).fill('Shared private team design');
 await a.editor.locator('.team-draft-status').filter({hasText:'backed up privately'}).waitFor();
 const b=await open();await b.editor.getByRole('button',{name:'Layers',exact:true}).click();await b.editor.locator('.layer-name').first().click();assert.equal(await b.editor.getByLabel('Text',{exact:true}).inputValue(),'Shared private team design','second browser loads private team draft');
 await b.page.reload();await b.editor.locator('.page-row').first().waitFor();await b.editor.locator('.team-draft-status').filter({hasText:'backed up privately'}).waitFor();assert.equal(await b.editor.getByRole('button',{name:'Load team draft',exact:true}).count(),0,'object-key order does not cause conflict');
 await b.editor.getByRole('button',{name:'Layers',exact:true}).click();await b.editor.locator('.layer-name').first().click();
 await a.editor.getByLabel('Text',{exact:true}).fill('First editor saved newer work');await a.editor.locator('.team-draft-status').filter({hasText:'backed up privately'}).waitFor();
 await b.editor.getByLabel('Text',{exact:true}).fill('Second editor must keep these changes');await b.editor.locator('.team-draft-status').filter({hasText:'Another team member'}).waitFor();assert.equal(await b.editor.getByLabel('Text',{exact:true}).inputValue(),'Second editor must keep these changes');assert.equal(record.value.work.project.pages[0].blocks[0].props.text,'First editor saved newer work');
 offline=true;await a.editor.getByLabel('Text',{exact:true}).fill('Still saved locally while offline');await a.editor.locator('.team-draft-status').filter({hasText:'unavailable'}).waitFor();await a.editor.locator('.studio-status').filter({hasText:'Saved privately'}).waitFor();
 assert.equal(server.commits,0,'private team autosaves never publish or commit');
 console.log('PASS separate-browser private draft recovery, stable cloud comparisons, concurrent team conflict retains both designs, offline local autosave and no Git publication');
}finally{await browser?.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
