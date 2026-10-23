/** Materialize published data into HTML for search crawlers and resilient fallbacks. */
const fs = require('node:fs');
const path = require('node:path');
const settings = require('../public/site-config');
const content = require('../public/content-model');
const publicDir = path.resolve(__dirname,'../public');
const s = settings.normalize(JSON.parse(fs.readFileSync(path.join(publicDir,'content/settings.json'),'utf8')));
const errors = settings.validate(s);
if(errors.length) throw Error(errors.join('\n'));
const routes = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../vercel.json'),'utf8')).rewrites;
function walk(dir) {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory() ? (/^(dash|admin|vendor)$/.test(entry.name)?[]:walk(path.join(dir,entry.name))) : entry.name.endsWith('.html')?[path.join(dir,entry.name)]:[]);}
const files=walk(publicDir);
const defaultsPath=path.join(publicDir,'content/page-defaults.json');
let defaults=fs.existsSync(defaultsPath)?JSON.parse(fs.readFileSync(defaultsPath,'utf8')):{};
function unesc(value){return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function metaValue(html,key){const re=new RegExp('<meta\\s+(?:name|property)="'+key+'"\\s+content="([^"]*)"[^>]*>','i');return unesc((re.exec(html)||[])[1]||'');}
function setMeta(html,key,value,property){const tag='<meta '+(property?'property':'name')+'="'+key+'" content="'+content.esc(value)+'">';const re=new RegExp('<meta\\s+(?:name|property)="'+key+'"\\s+content="[^"]*"[^>]*>','i');return re.test(html)?html.replace(re,()=>tag):html.replace('</head>',tag+'\n</head>');}
// Share images must be absolute URLs on the domain that actually serves this deployment, otherwise link
// previews fetch them from wherever saneliving.com currently points. SITE_URL can pin it explicitly;
// otherwise Vercel's production domain is used, falling back to saneliving.com for local builds.
const rootUrl=(process.env.SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:'https://saneliving.com')).replace(/\/+$/,'');
for(const file of files){
 let html=fs.readFileSync(file,'utf8');const relative='/'+path.relative(publicDir,file).replaceAll(path.sep,'/');
 const route=relative==='/index.html'?'/':(routes.find(r=>r.destination===relative&&r.source.endsWith('/'))||{}).source || relative.replace(/\.html$/,'/');
 if(!defaults[route]) defaults[route]={title:unesc((/<title>([^<]*)<\/title>/i.exec(html)||[])[1]||s.businessName),description:metaValue(html,'description')||metaValue(html,'og:description'),image:metaValue(html,'og:image')};
 const override=s.pageMeta[route]||{},base=defaults[route];
 const title=override.title||base.title,description=override.description||s.siteDescription||base.description;
 const image=override.image||s.defaultShareImage||base.image;
 html=html.replace(/<title>[^<]*<\/title>/i,()=>'<title>'+content.esc(title)+'</title>');
 for(const key of ['og:title','twitter:title'])html=setMeta(html,key,title,key.startsWith('og:'));
 for(const key of ['description','og:description','twitter:description'])html=setMeta(html,key,description,key.startsWith('og:'));
 if(image){const absolute=new URL(image,rootUrl).href;for(const key of ['og:image','twitter:image'])html=setMeta(html,key,absolute,key.startsWith('og:'));}
 const icon='<link rel="icon" href="'+content.esc(s.faviconUrl||'/favicon.svg')+'">';
 html=/<link[^>]+rel="icon"[^>]*>/i.test(html)?html.replace(/<link[^>]+rel="icon"[^>]*>/i,()=>icon):html.replace('</head>',icon+'\n</head>');
 if(!html.includes('src="/site-content.js"'))html=html.replace('</head>','<script src="/site-config.js" defer></script>\n<script src="/site-content.js" defer></script>\n</head>');
 fs.writeFileSync(file,html);
}
fs.writeFileSync(defaultsPath,JSON.stringify(defaults,null,2)+'\n');
const aboutPath=path.join(publicDir,'about.html');
let aboutHtml=fs.readFileSync(aboutPath,'utf8');
const about=content.parseAbout(fs.readFileSync(path.join(publicDir,'content/about.md'),'utf8'));
const aboutErrors=content.validateAbout(about);if(aboutErrors.length)throw Error(aboutErrors.join('\n'));
let philosophy='';
const philosophyPath=path.resolve(__dirname,'../templates/about-philosophy.html');
const start=aboutHtml.indexOf('      <!-- United Founder & Philosophy Sections -->');
if(start!==-1){const end=aboutHtml.indexOf('      <hr class="section-divider"',start);philosophy=aboutHtml.slice(start,end);}
const existingPhilosophy=/<!-- philosophy:start -->([\s\S]*?)<!-- philosophy:end -->/.exec(aboutHtml);if(existingPhilosophy)philosophy=existingPhilosophy[1];
if(fs.existsSync(philosophyPath))philosophy=fs.readFileSync(philosophyPath,'utf8');
const blocks=require('../content-renderer/about.cjs').sections(about,philosophy);
if(aboutHtml.includes('<!-- about-managed:start -->'))aboutHtml=aboutHtml.replace(/<!-- about-managed:start -->[\s\S]*?<!-- about-managed:end -->/,()=> '<!-- about-managed:start -->\n'+blocks+'\n<!-- about-managed:end -->');
else{const a=aboutHtml.indexOf('    <div class="content-block">'),b=aboutHtml.lastIndexOf('    </div>\n  </section>');if(a===-1||b===-1)throw Error('About content container not found');aboutHtml=aboutHtml.slice(0,a)+'    <div class="content-block">\n<!-- about-managed:start -->\n'+blocks+'\n<!-- about-managed:end -->\n'+aboutHtml.slice(b);}
aboutHtml=aboutHtml.replace(/(<section class="page-hero">[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/,(_,a,b)=>a+content.esc(about.metadata.title||'About Sane Living')+b);
fs.writeFileSync(aboutPath,aboutHtml);
// A real tab icon is present even before user branding is uploaded.
const dashPath=path.join(publicDir,'dash/index.html');let dash=fs.readFileSync(dashPath,'utf8');const icon='<link rel="icon" href="'+content.esc(s.faviconUrl||'/favicon.svg')+'">';dash=/<link[^>]+rel="icon"[^>]*>/i.test(dash)?dash.replace(/<link[^>]+rel="icon"[^>]*>/i,()=>icon):dash.replace('</head>',icon+'\n</head>');fs.writeFileSync(dashPath,dash);
console.log('Built published About content, favicon and metadata for '+files.length+' public pages.');
