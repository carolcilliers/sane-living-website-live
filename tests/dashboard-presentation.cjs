// Dashboard-only presentation QA. Uses isolated GitHub/Airtable fixtures, never live writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const create=require('./qa-server.cjs'),{launch}=require('./browser.cjs');
(async()=>{const s=await create();let browser;const evidence=process.env.DASHBOARD_QA_DIR;if(evidence)fs.mkdirSync(evidence,{recursive:true});try{
 await fetch(s.url+'/api/dash-events',{method:'POST',headers:{Cookie:s.cookie,'Content-Type':'application/json'},body:JSON.stringify({title:'Dashboard QA event with a longer title',date:'2026-11-20',description:'An isolated fixture for checking readable event cards and responsive action controls.',startTime:'6:00 PM',endTime:'8:00 PM',location:'Sane Living',publish:false})});
 browser=await launch();const context=await browser.newContext({viewport:{width:1440,height:1050},colorScheme:'light'});
 if(process.env.DASHBOARD_THEME)await context.addInitScript(theme=>localStorage.setItem('sane-dashboard-appearance',theme),process.env.DASHBOARD_THEME);
 await context.addCookies([{name:'sl_dash',value:s.cookie.split('=')[1],url:s.url}]);
 await context.route('**/*',r=>r.request().url().startsWith(s.url)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await page.goto(s.url+'/dash/');await page.locator('#panel-home.active').waitFor();await page.evaluate(()=>document.fonts.ready);
 const sections=['home','events','gallery','weddings','pricing','partners','settings'];
 assert.equal(await page.locator('.dashboard-page-heading').count(),7);assert.equal(await page.locator('#panel-weddings .form-section').count(),4);assert.equal(await page.locator('#panel-pricing .form-section').count(),2);
 async function shot(name){await page.waitForTimeout(180);if(evidence)await page.screenshot({path:path.join(evidence,name+'.png')});}
 async function bounds(id,width){const problems=await page.locator('#panel-'+id).evaluate(panel=>{
   const out=[],root=document.documentElement;
   if(root.scrollWidth>innerWidth+1)out.push('document overflow '+root.scrollWidth+' > '+innerWidth);
   for(const n of panel.querySelectorAll('input:not([type=file]):not([type=checkbox]),select,textarea,.btn,.icon-btn')){
    if(!n.getClientRects().length)continue;
    const r=n.getBoundingClientRect(),style=getComputedStyle(n);
    if(r.width && (r.left< -1 || r.right>innerWidth+1))out.push((n.id||n.dataset.field||n.tagName)+' outside viewport');
    if(n.matches('input,textarea,select')&&parseFloat(style.fontSize)<15.9)out.push('small field '+n.id);
    if(n.matches('.btn,.icon-btn')&&r.height<43.9)out.push('small target '+n.textContent.trim());
   }return out;
 });assert.deepEqual(problems,[],id+' at '+width);}
 for(const width of [320,390,768,1024,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(100);
  for(const id of sections){await page.locator('[data-nav="'+id+'"]').click();await page.locator('#panel-'+id+'.active').waitFor();if(width===1440 && ['gallery','weddings','pricing','events'].includes(id))await shot(id+'-desktop');await bounds(id,width);
   if(id==='settings'){assert.equal(await page.locator('.settings-tabs').getAttribute('aria-orientation'),width>=1100?'vertical':'horizontal');}if(id==='settings')for(const tab of await page.locator('[data-settings-tab]').all()){await tab.click();var expand=page.locator('#panel-settings [role=tabpanel].is-active [data-settings-expand]');if(await expand.count()&&await expand.textContent()==='Show all fields')await expand.click();await bounds(id,width);assert.equal(await tab.getAttribute('aria-selected'),'true');}
  }
  await shot('settings-'+width);
  console.log('PASS dashboard layout and all settings categories at '+width+'px');
 }
 for(const width of [390,1024]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize='200%');for(const id of sections){await page.locator('[data-nav="'+id+'"]').click();await bounds(id,'200% text at '+width);}await page.evaluate(()=>document.documentElement.style.fontSize='');}console.log('PASS 200% text resizing at phone and laptop widths');
 await page.setViewportSize({width:390,height:844});await page.locator('[data-nav="pricing"]').click();
 assert.equal(await page.locator('.rate-session').count(),3);
 assert.deepEqual(await page.locator('.rate-session').first().locator('.rate-amount>span').allTextContents(),['Mon–Thu','Friday','Saturday','Sunday']);assert.equal(await page.locator('.rate-session').first().getByLabel('Saturday rate',{exact:true}).isVisible(),true);await shot('rates-phone');
 await page.locator('[data-nav="gallery"]').click();await page.locator('#gal-group-venue .photo-editor>summary').first().click();const caption=page.getByLabel('Caption',{exact:true}).first();await caption.fill('Private presentation QA');await caption.blur();
 const bar=page.locator('#savebar-gallery');assert(await bar.evaluate(n=>n.classList.contains('has-changes')));assert.equal(await bar.evaluate(n=>getComputedStyle(n).position),'sticky');assert((await bar.boundingBox()).height<=180,'compact mobile save bar');
 await page.getByRole('button',{name:'Done editing',exact:true}).click();await page.locator('[data-nav="weddings"]').click();await page.locator('[data-nav="gallery"]').click();assert.equal(await caption.inputValue(),'Private presentation QA');
 const upload=page.locator('.gal-upload-group').first();await upload.focus();assert(await upload.evaluate(n=>document.activeElement===n&&!n.hidden),'native file upload is keyboard reachable');await page.locator('#gal-group-venue .photo-editor>summary').first().click();await caption.scrollIntoViewIfNeeded();await shot('gallery-phone');await page.getByRole('button',{name:'Done editing',exact:true}).click();
 await page.locator('[data-nav="settings"]').click();await page.getByRole('tab',{name:'Contact & social',exact:true}).click();const email=page.getByLabel('Contact email',{exact:true});await email.fill('presentation-qa@example.com');await email.focus();assert.notEqual(await email.evaluate(n=>getComputedStyle(n).outlineStyle),'none');assert(await email.evaluate(n=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===n;}),'save bar does not cover the focused field');
 await page.getByRole('tab',{name:'Navigation',exact:true}).focus();await page.keyboard.press('Home');assert.equal(await page.getByRole('tab',{name:'Branding',exact:true}).getAttribute('aria-selected'),'true');
 await page.setViewportSize({width:1440,height:1050});
 await page.locator('[data-nav="partners"]').click();await page.locator('#pt-add').click();assert.equal(await page.locator('#panel-partners').getByLabel('Business name',{exact:true}).count(),1);await bounds('partners',1440);await shot('partners-card');
 if(process.env.AXE_CORE_PATH){
  await page.addScriptTag({path:process.env.AXE_CORE_PATH});
  const violations=[];
  async function audit(id){const result=await page.evaluate(async()=>await axe.run({include:[['#appView']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));for(const v of result.violations)violations.push({page:id,id:v.id,nodes:v.nodes.map(n=>n.target)});}
  for(const id of sections){await page.locator('[data-nav="'+id+'"]').click();await audit(id);if(id==='settings')for(const tab of await page.locator('[data-settings-tab]').all()){await tab.click();await audit('settings '+await tab.textContent());}}
  assert.deepEqual(violations,[],'dashboard accessibility');
  console.log('PASS axe WCAG A/AA dashboard checks');
 }
 await page.locator('[data-nav="editor"]').click();const editor=page.frameLocator('#pageEditorFrame');await editor.locator('.studio-workspace').waitFor();
 for(const width of [390,1024,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'editor host overflow');assert.equal(await page.locator('#mainNav').isVisible(),true);}
 await editor.getByRole('button',{name:'Return to dashboard',exact:true}).click();await page.locator('[data-nav="home"]').click();if(process.env.AXE_CORE_PATH){const result=await page.evaluate(async()=>await axe.run('#mainNav',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));assert.deepEqual(result.violations.map(v=>v.id),[],'navigation contrast after leaving the dark editor');}await shot('home-desktop');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.btn').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');
 const guest=await browser.newContext({viewport:{width:320,height:844}}),login=await guest.newPage();await guest.route('**/*',r=>r.request().url().startsWith(s.url)?r.continue():r.abort());await login.goto(s.url+'/dash/');await login.locator('#li-pass').waitFor();assert.equal(await login.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await login.getByLabel('Password',{exact:true}).focus();await guest.close();
 assert.equal(s.commits,0,'presentation checks never publish or save shared content');assert.deepEqual(errors,[]);
 console.log('PASS labelled fields, keyboard uploads/tabs, private edit retention, compact save actions, editor host, login and reduced motion; zero repository writes');
}finally{await browser?.close();await s.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
