const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),os=require('node:os');
const {execFileSync}=require('node:child_process');
module.exports=async function createServer(){
 const root=path.resolve(__dirname,'..'),output=fs.mkdtempSync(path.join(os.tmpdir(),'sane-studio-'));
 fs.cpSync(path.join(root,'public'),path.join(output,'public'),{recursive:true});fs.cpSync(path.join(root,'scripts'),path.join(output,'scripts'),{recursive:true});fs.copyFileSync(path.join(root,'vercel.json'),path.join(output,'vercel.json'));fs.cpSync(path.join(root,'templates'),path.join(output,'templates'),{recursive:true});
 fs.cpSync(path.join(root,'content-renderer'),path.join(output,'content-renderer'),{recursive:true});
 fs.cpSync(path.join(root,'content-core'),path.join(output,'content-core'),{recursive:true});fs.cpSync(path.join(root,'content'),path.join(output,'content'),{recursive:true});fs.symlinkSync(path.join(root,'node_modules'),path.join(output,'node_modules'),'dir');
 const content=require('../api/_contentlib');
 const records=new Map(Object.values(content.FILES).map(file=>[file,{content:fs.readFileSync(path.join(root,file),'utf8')} ]));
 function sha(text){return crypto.createHash('sha1').update(text).digest('hex');}for(const record of records.values())record.sha=sha(record.content);
 const controls={failNext:null,delayNext:0,uploads:0,commits:0,records,root:output,head:sha('initial-head'),loseRefResponse:false,conflictBeforeRef:false};
 records.set('vercel.json',{content:fs.readFileSync(path.join(root,'vercel.json'),'utf8')});records.set('content/page-templates.json',{content:fs.readFileSync(path.join(root,'content/page-templates.json'),'utf8')});for(const record of records.values())record.sha=sha(record.content);
 for(const page of require('../content/page-templates.json'))records.set(page.output,{content:page.html,sha:page.sourceSha});
 const history=new Map(),parents=new Map(),trees=new Map(),prepared=new Map(),blobs=new Map();let objects=0;
 function checkpoint(){history.set(controls.head,new Map([...records].map(([k,v])=>[k,{...v}])));}
 checkpoint();
 function materialize(){for(const [file,record] of records){const target=path.join(output,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,record.bytes||record.content);}execFileSync(process.execPath,[path.join(output,'scripts/build-pages.cjs')]);execFileSync(process.execPath,[path.join(output,'scripts/build-content.cjs')]);}
 function advance(label){const previous=controls.head;controls.head=sha(label+'-'+controls.commits);parents.set(controls.head,previous);checkpoint();}
 controls.commitFile=function(file,text){records.set(file,{content:text,sha:sha(text)});controls.commits++;advance(file);materialize();};
 const realFetch=global.fetch;
 global.fetch=async function(url,opts={}){
  if(!String(url).startsWith('https://api.github.com/repos/carolcilliers/sane-living-website-live/'))return realFetch(url,opts);
  if(opts.headers.Authorization!=='Bearer test-only-cms-token')throw Error('Authorization dropped');
  const parsed=new URL(url),file=decodeURIComponent(parsed.pathname.split('/contents/')[1]),method=opts.method||'GET';
  const json=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data,text:async()=>JSON.stringify(data)});
  if(controls.failNext===file&&method!=='GET'){controls.failNext=null;return json(500,{message:'simulated failure'});}
  if(controls.delayNext&&method!=='GET'){const delay=controls.delayNext;controls.delayNext=0;await new Promise(r=>setTimeout(r,delay));}
  const apiPath=parsed.pathname.split('/sane-living-website-live')[1];
  if(apiPath.startsWith('/git/')||apiPath.startsWith('/compare/')||apiPath==='/commits'){
   if(apiPath==='/git/ref/heads/main')return json(200,{object:{sha:controls.head}});
   if(apiPath.startsWith('/git/trees/')&&method==='GET')return json(200,{truncated:false,tree:[...records].map(([path,r])=>({path,type:'blob',sha:r.sha}))});
   if(apiPath.startsWith('/git/commits/')&&method==='GET'){const ref=apiPath.split('/').pop();return json(200,{sha:ref,tree:{sha:sha('tree-'+ref)}});}
   if(apiPath==='/git/blobs'&&method==='POST'){const body=JSON.parse(opts.body),id=sha('blob-'+body.content);blobs.set(id,Buffer.from(body.content,'base64'));return json(201,{sha:id});}
   if(apiPath==='/git/trees'&&method==='POST'){const body=JSON.parse(opts.body),id=sha('tree-obj-'+(++objects));trees.set(id,body.tree);return json(201,{sha:id});}
   if(apiPath==='/git/commits'&&method==='POST'){const body=JSON.parse(opts.body),id=sha('commit-obj-'+(++objects));prepared.set(id,body);parents.set(id,body.parents[0]);return json(201,{sha:id});}
   if(apiPath==='/git/refs/heads/main'&&method==='PATCH'){
    const body=JSON.parse(opts.body),commit=prepared.get(body.sha);if(body.force)return json(400,{message:'force not permitted'});
    if(controls.conflictBeforeRef){controls.conflictBeforeRef=false;controls.commits++;advance('concurrent-writer');}
    if(!commit||commit.parents[0]!==controls.head)return json(422,{message:'Update is not a fast forward'});
    for(const entry of trees.get(commit.tree)){const bytes=entry.sha?blobs.get(entry.sha):null,text=bytes?bytes.toString('utf8'):entry.content;records.set(entry.path,{content:text,bytes:bytes||undefined,sha:bytes?crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex'):sha(text)});if(entry.path.startsWith('public/images/'))controls.uploads++;}
    controls.commits++;controls.head=body.sha;checkpoint();materialize();
    if(controls.loseRefResponse){controls.loseRefResponse=false;return json(500,{message:'lost response after accepted ref'});}return json(200,{object:{sha:body.sha}});
   }
   if(apiPath.startsWith('/compare/')){const [from,to]=apiPath.slice('/compare/'.length).split('...');let cursor=to,count=0;while(cursor&&cursor!==from&&count++<100)cursor=parents.get(cursor);return json(200,{status:from===to?'identical':cursor===from?'ahead':'diverged'});}
   if(apiPath==='/commits'){const target=parsed.searchParams.get('path');let cursor=controls.head;while(cursor){const record=prepared.get(cursor);if(record&&trees.get(record.tree).some(e=>e.path===target))return json(200,[{sha:cursor}]);cursor=parents.get(cursor);}return json(200,[]);}
   throw Error('Unexpected fixture Git request: '+method+' '+apiPath);
  }
  const ref=parsed.searchParams.get('ref'),source=ref&&ref!=='main'?history.get(ref):records;
  const record=source?.get(file);
  if(method==='GET')return record?json(200,{sha:record.sha,encoding:'base64',content:(record.bytes||Buffer.from(record.content)).toString('base64')}):json(404,{message:'Not found'});
  const body=JSON.parse(opts.body);
  if((record&&record.sha||undefined)!==body.sha)return json(409,{message:'sha mismatch'});
  controls.commits++;
  if(method==='DELETE'){records.delete(file);advance('delete-'+file);return json(200,{commit:{sha:controls.head}});}
  if(method==='PUT'){
   const text=Buffer.from(body.content,'base64').toString('utf8'),record={content:text,sha:sha(text)};records.set(file,record);
   if(file.startsWith('public/content/')){fs.writeFileSync(path.join(output,file),text);materialize();}advance(file);
   if(file.startsWith('public/images/'))controls.uploads++;
   return json(200,{content:{sha:record.sha},commit:{sha:controls.head}});
  }
  return json(405,{});
 };
 process.env.CMS_GITHUB_TOKEN='test-only-cms-token';process.env.CMS_LOGIN_PASSWORD='test-only-password';
 const login=require('../api/_dashlib'),read=require('../api/dash-content'),save=require('../api/dash-save'),studio=require('../api/studio');
 const cookie=login.makeSessionCookie().split(';')[0];
 const routes=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'))).rewrites;
 let events=[];
 const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');req.query=Object.fromEntries(u.searchParams);let body='';for await(const part of req)body+=part;
  try{req.body=body?JSON.parse(body):{};}catch(e){res.writeHead(400);res.end('{}');return;}
  res.status=function(status){res.statusCode=status;return res;};res.json=function(value){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));return res;};
  try{
   if(u.pathname==='/api/dash-content')return await read(req,res);
   if(u.pathname==='/api/dash-save')return await save(req,res);
   if(u.pathname==='/api/studio')return await studio(req,res);
   if(u.pathname==='/api/calendar-events'||u.pathname==='/api/calendar-events-past')return res.json({events:[{id:'public-fixture',title:'Community gathering',date:'2026-11-20',blurb:'A published fixture event',rsvpUrl:'https://example.com/event'}]});
   if(u.pathname==='/api/dash-login'){if(req.method==='DELETE'){res.setHeader('Set-Cookie',login.clearSessionCookie());return res.json({loggedIn:false});}return res.json({loggedIn:login.isLoggedIn(req)});}
   if(u.pathname==='/api/dash-events'){
    if(!login.requireLogin(req,res))return;
    if(req.method==='POST'){const event={...req.body,id:'rec-test-'+events.length};events.push(event);return res.json({event});}
    if(req.method==='PATCH'){let event=events.find(e=>e.id===req.body.id);Object.assign(event,req.body);return res.json({event});}
    return res.json({events,count:events.length,readOnly:false});
   }
   let relative=u.pathname==='/'?'/index.html':u.pathname==='/dash/'?'/dash/index.html':u.pathname;
   const latestRoutes=JSON.parse(fs.readFileSync(path.join(output,'vercel.json'))).rewrites;const rewrite=latestRoutes.find(r=>r.source===relative);if(rewrite)relative=rewrite.destination;
   const file=path.join(output,'public',relative);
   if(!file.startsWith(path.join(output,'public')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end('Not found');}
   const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.md':'text/plain','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file));
  }catch(e){console.error(e);res.statusCode=500;res.end(JSON.stringify({error:e.message}));}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));controls.url='http://127.0.0.1:'+server.address().port;controls.cookie=cookie;controls.close=async()=>{global.fetch=realFetch;await new Promise(r=>server.close(r));fs.rmSync(output,{recursive:true,force:true});};return controls;
};
