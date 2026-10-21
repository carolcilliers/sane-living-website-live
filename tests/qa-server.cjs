const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),os=require('node:os');
const {execFileSync}=require('node:child_process');
module.exports=async function createServer(){
 const root=path.resolve(__dirname,'..'),output=fs.mkdtempSync(path.join(os.tmpdir(),'sane-studio-'));
 fs.cpSync(path.join(root,'public'),path.join(output,'public'),{recursive:true});fs.cpSync(path.join(root,'scripts'),path.join(output,'scripts'),{recursive:true});fs.copyFileSync(path.join(root,'vercel.json'),path.join(output,'vercel.json'));fs.cpSync(path.join(root,'templates'),path.join(output,'templates'),{recursive:true});
 fs.cpSync(path.join(root,'content-renderer'),path.join(output,'content-renderer'),{recursive:true});
 const content=require('../api/_contentlib');
 const records=new Map(Object.values(content.FILES).map(file=>[file,{content:fs.readFileSync(path.join(root,file),'utf8')} ]));
 function sha(text){return crypto.createHash('sha1').update(text).digest('hex');}for(const record of records.values())record.sha=sha(record.content);
 const controls={failNext:null,delayNext:0,uploads:0,commits:0,records,root:output};
 const realFetch=global.fetch;
 global.fetch=async function(url,opts={}){
  if(!String(url).startsWith('https://api.github.com/repos/carolcilliers/sane-living-website-live/contents/'))return realFetch(url,opts);
  if(opts.headers.Authorization!=='Bearer test-only-cms-token')throw Error('Authorization dropped');
  const parsed=new URL(url),file=decodeURIComponent(parsed.pathname.split('/contents/')[1]),method=opts.method||'GET';
  const json=(status,data)=>({status,ok:status>=200&&status<300,json:async()=>data,text:async()=>JSON.stringify(data)});
  if(controls.failNext===file&&method!=='GET'){controls.failNext=null;return json(500,{message:'simulated failure'});}
  if(controls.delayNext&&method!=='GET'){const delay=controls.delayNext;controls.delayNext=0;await new Promise(r=>setTimeout(r,delay));}
  const record=records.get(file);
  if(method==='GET')return record?json(200,{sha:record.sha,encoding:'base64',content:Buffer.from(record.content).toString('base64')}):json(404,{message:'Not found'});
  const body=JSON.parse(opts.body);
  if((record&&record.sha||undefined)!==body.sha)return json(409,{message:'sha mismatch'});
  controls.commits++;
  if(method==='DELETE'){records.delete(file);return json(200,{commit:{sha:'delete-'+controls.commits}});}
  if(method==='PUT'){
   const text=Buffer.from(body.content,'base64').toString('utf8'),record={content:text,sha:sha(text)};records.set(file,record);
   if(file.startsWith('public/content/')){fs.writeFileSync(path.join(output,file),text);execFileSync(process.execPath,[path.join(output,'scripts/build-content.cjs')]);}
   if(file.startsWith('public/images/'))controls.uploads++;
   return json(200,{content:{sha:record.sha},commit:{sha:'commit-'+controls.commits}});
  }
  return json(405,{});
 };
 process.env.CMS_GITHUB_TOKEN='test-only-cms-token';process.env.CMS_LOGIN_PASSWORD='test-only-password';
 const login=require('../api/_dashlib'),read=require('../api/dash-content'),save=require('../api/dash-save');
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
   if(u.pathname==='/api/dash-login')return res.json({loggedIn:login.isLoggedIn(req)});
   if(u.pathname==='/api/dash-events'){
    if(!login.requireLogin(req,res))return;
    if(req.method==='POST'){const event={...req.body,id:'rec-test-'+events.length};events.push(event);return res.json({event});}
    if(req.method==='PATCH'){let event=events.find(e=>e.id===req.body.id);Object.assign(event,req.body);return res.json({event});}
    return res.json({events,count:events.length,readOnly:false});
   }
   let relative=u.pathname==='/'?'/index.html':u.pathname==='/dash/'?'/dash/index.html':u.pathname;
   const rewrite=routes.find(r=>r.source===relative);if(rewrite)relative=rewrite.destination;
   const file=path.join(output,'public',relative);
   if(!file.startsWith(path.join(output,'public')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return res.end('Not found');}
   const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.md':'text/plain','.svg':'image/svg+xml'})[ext]||'application/octet-stream');res.end(fs.readFileSync(file));
  }catch(e){console.error(e);res.statusCode=500;res.end(JSON.stringify({error:e.message}));}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));controls.url='http://127.0.0.1:'+server.address().port;controls.cookie=cookie;controls.close=async()=>{global.fetch=realFetch;await new Promise(r=>server.close(r));fs.rmSync(output,{recursive:true,force:true});};return controls;
};
