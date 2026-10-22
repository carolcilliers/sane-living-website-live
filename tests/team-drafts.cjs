const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const core=require('../content-core/site.cjs'),registry=require('../content/page-templates.json'),model=require('../public/editor-model'),endpoint=require('../api/studio-draft'),login=require('../api/_dashlib');
const env={url:process.env.STUDIO_DRAFT_REDIS_REST_URL,token:process.env.STUDIO_DRAFT_REDIS_REST_TOKEN,pass:process.env.CMS_LOGIN_PASSWORD,cms:process.env.CMS_GITHUB_TOKEN};
const realFetch=global.fetch;let current=null,history=[],calls=0,fail=false;
const about=fs.readFileSync('public/content/about.md','utf8');
const value={head:'a'.repeat(40),versions:{about:'b'.repeat(40),settings:'c'.repeat(40)},layoutSha:null,baseAbout:about,baseSettings:fs.readFileSync('public/content/settings.json','utf8'),work:{project:core.createProject(registry),about:model.fromSource(about,crypto.randomUUID),aboutText:about,settingsText:fs.readFileSync('public/content/settings.json','utf8'),assets:[]}};
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(s){this.statusCode=s;return this},json(b){this.body=b;return this}};}
async function call(method,body={},headers={},query={}){const res=response();await endpoint({method,body,headers,query},res);return res;}
(async()=>{try{
 process.env.CMS_LOGIN_PASSWORD='test-only-draft-pass';process.env.CMS_GITHUB_TOKEN='test-only-cms';delete process.env.STUDIO_DRAFT_REDIS_REST_URL;delete process.env.STUDIO_DRAFT_REDIS_REST_TOKEN;
 const headers={host:'localhost',origin:'http://localhost',cookie:login.makeSessionCookie().split(';')[0]};
 let r=await call('GET');assert.equal(r.statusCode,401);
 r=await call('GET',{},headers);assert.equal(r.body.configured,false);assert.equal(r.headers['Cache-Control'],'private, no-store');
 r=await call('POST',{}, {...headers,origin:'https://untrusted.example'});assert.equal(r.statusCode,403);
 process.env.STUDIO_DRAFT_REDIS_REST_URL='https://private-test.upstash.io';process.env.STUDIO_DRAFT_REDIS_REST_TOKEN='test-only-redis';
 // Isolated REST fixture verifies the handler's command contract and expected-version conflict handling.
 global.fetch=async(url,options)=>{
  calls++;assert.equal(new URL(url).origin,'https://private-test.upstash.io');assert.equal(options.headers.Authorization,'Bearer test-only-redis');if(fail)throw Error('offline');
  const args=JSON.parse(options.body);let result;
  if(args[0]==='GET')result=current?JSON.stringify(current):null;
  else if(args[0]==='LINDEX')result=history[args[2]]?JSON.stringify(history[args[2]]):null;
  else {assert.equal(args[0],'EVAL');assert(args[1].includes("revision~=tonumber(ARGV[1])"));assert(args[1].includes("redis.call('LTRIM',KEYS[2],0,9)"));assert.equal(args[2],2);
   const [, , , key,hist,expected,id,doc,hash]=args;assert(key.includes('{website}'));assert(hist.includes('{website}'));
   if(current?.requestId===id)result=current.requestHash===hash?JSON.stringify(current):'REQUEST_MISMATCH';
   else if((current?.revision||0)!==expected)result='CONFLICT';
   else{if(current)history.unshift(current);history=history.slice(0,10);current={...JSON.parse(doc),revision:expected+1,requestId:id};result=JSON.stringify(current);}
  }
  return {ok:true,json:async()=>({result})};
 };
 const id=crypto.randomUUID();r=await call('POST',{expected:0,requestId:id,value},headers);assert.equal(r.statusCode,200);assert.equal(r.body.record.revision,1);
 r=await call('POST',{expected:0,requestId:id,value},headers);assert.equal(r.body.record.revision,1,'lost-response retry is idempotent');
 const different=structuredClone(value);different.work.project.pages[0].name='Different payload';r=await call('POST',{expected:0,requestId:id,value:different},headers);assert.equal(r.statusCode,409,'save IDs cannot acknowledge another payload');
 const next=structuredClone(value);next.work.project.pages[0].name='A newer team draft';r=await call('POST',{expected:1,requestId:crypto.randomUUID(),value:next},headers);assert.equal(r.body.record.revision,2);
 r=await call('POST',{expected:1,requestId:crypto.randomUUID(),value},headers);assert.equal(r.statusCode,409);assert.equal(current.value.work.project.pages[0].name,'A newer team draft');
 r=await call('GET',{},headers,{previous:'0'});assert.equal(r.body.record.revision,1);
 r=await call('GET',{},headers,{previous:'100'});assert.equal(r.statusCode,400);
 const invalid=structuredClone(value);invalid.work.project.pages[0].blocks[0].responsive={phone:{background:'url(javascript:evil)'}};const count=calls;
 r=await call('POST',{expected:2,requestId:crypto.randomUUID(),value:invalid},headers);assert.equal(r.statusCode,400);assert.equal(calls,count,'invalid settings never reach private storage');
 fail=true;r=await call('POST',{expected:2,requestId:crypto.randomUUID(),value},headers);assert.equal(r.statusCode,503);assert(!JSON.stringify(r.body).includes('test-only-redis'));
 console.log('PASS private team draft endpoint auth, origin enforcement, optional configuration, REST contract, revision conflicts, idempotent retry, prior-version read, validation and offline failure');
}finally{global.fetch=realFetch;for(const [key,v] of Object.entries({STUDIO_DRAFT_REDIS_REST_URL:env.url,STUDIO_DRAFT_REDIS_REST_TOKEN:env.token,CMS_LOGIN_PASSWORD:env.pass,CMS_GITHUB_TOKEN:env.cms})){if(v===undefined)delete process.env[key];else process.env[key]=v;}}})().catch(e=>{console.error(e);process.exitCode=1;});
