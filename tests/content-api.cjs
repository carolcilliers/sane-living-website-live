const assert=require('node:assert/strict'),createServer=require('./qa-server.cjs');
(async()=>{
 const server=await createServer();
 try{
  const call=async(method,route,body,authenticated=true)=>{const response=await fetch(server.url+route,{method,headers:{'Content-Type':'application/json',...(authenticated?{Cookie:server.cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,cache:response.headers.get('cache-control'),data:await response.json()};};
  assert.equal((await call('GET','/api/dash-content?section=settings',undefined,false)).status,401);
  assert.equal((await call('POST','/api/dash-save',{path:'public/content/settings.json',content:'{}'},false)).status,401);
  assert.equal((await call('GET','/api/dash-content?section=constructor')).status,400);
  for(const path of ['constructor','__proto__','public/images/../bad.png','package.json'])assert.equal((await call('POST','/api/dash-save',{path,content:'{}'})).status,400);
  assert.equal((await call('POST','/api/dash-save',null)).status,400);
  let r=await call('GET','/api/dash-content?section=settings');assert.equal(r.cache,'private, no-store');
  let base=r.data.published.sha,draftSha=null;const published=JSON.parse(r.data.published.content);const text=JSON.stringify({...published,businessName:'Working draft'});
  const request=(action,content=text)=>({path:'public/content/settings.json',action,content,expectedSha:base,expectedDraftSha:draftSha});
  r=await call('POST','/api/dash-save',request('draft'));assert.equal(r.status,200);draftSha=r.data.draftSha;
  assert.equal(JSON.parse(server.records.get('public/content/settings.json').content).businessName,published.businessName);
  assert.equal((await call('POST','/api/dash-save',{...request('draft'),expectedDraftSha:null})).status,409);
  assert.equal((await call('POST','/api/dash-save',request('publish',JSON.stringify({...published,homePrimaryUrl:'javascript:alert(1)'})))).status,400);
  assert.equal((await call('POST','/api/dash-save',request('publish','{bad'))).status,400);
  r=await call('POST','/api/dash-save',request('publish'));assert.equal(r.status,200);base=r.data.sha;draftSha=null;assert(!server.records.has('dashboard-drafts/settings.json'));
  r=await call('POST','/api/dash-save',request('draft'));assert.equal(r.status,200);draftSha=r.data.draftSha;
  r=await call('POST','/api/dash-save',request('discard'));assert.equal(r.status,200);assert(!server.records.has('dashboard-drafts/settings.json'));
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  assert.equal((await call('POST','/api/dash-save',{path:'public/images/test-icon.png',contentBase64:Buffer.from('not an image').toString('base64')})).status,400);
  r=await call('POST','/api/dash-save',{path:'public/images/test-icon.png',contentBase64:png});assert.equal(r.status,200);assert.equal(r.data.url,'/images/test-icon.png');
  assert.equal((await call('POST','/api/dash-save',{path:'public/images/test-icon.png',contentBase64:png})).status,409);
  console.log('PASS auth, path whitelist, non-cacheable reads, shared draft isolation, stale-draft protection, invalid publish rejection, publish cleanup, revert, image validation and unique-upload protection.');
 }finally{await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
