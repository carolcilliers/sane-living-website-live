"use strict";
const crypto = require("node:crypto");
const core = require('../../content-core/site.cjs');
const editorModel = require('../../public/editor-model.js');
const registry = require('../../content/page-templates.json');
const KEY = 'sane-living:studio:{website}:draft';
const HISTORY = 'sane-living:studio:{website}:history';
// A single atomic compare-and-swap: concurrent editors cannot silently overwrite a newer draft.
const SAVE = `local old=redis.call('GET',KEYS[1]); local revision=0; if old then local doc=cjson.decode(old); revision=doc.revision; if doc.requestId==ARGV[2] then if doc.requestHash~=ARGV[4] then return 'REQUEST_MISMATCH' end; return old end end; if revision~=tonumber(ARGV[1]) then return 'CONFLICT' end; local next=cjson.decode(ARGV[3]); next.revision=revision+1; next.requestId=ARGV[2]; local encoded=cjson.encode(next); if old then redis.call('LPUSH',KEYS[2],old);redis.call('LTRIM',KEYS[2],0,9) end; redis.call('SET',KEYS[1],encoded); return encoded`;
function config(){return !!(process.env.STUDIO_DRAFT_REDIS_REST_URL&&process.env.STUDIO_DRAFT_REDIS_REST_TOKEN);}
function error(status,message){return Object.assign(Error(message),{status});}
async function command(args){
 const url = new URL(process.env.STUDIO_DRAFT_REDIS_REST_URL);
 if(url.protocol!=='https:'||url.username||url.password)throw error(503,'Private draft storage configuration is invalid.');
 let response;
 try { response=await fetch(url.href,{method:'POST',headers:{Authorization:'Bearer '+process.env.STUDIO_DRAFT_REDIS_REST_TOKEN,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)}); }
 catch {throw error(503,'Team draft storage is unavailable. Your browser copy is retained.');}
 let body;try{body=await response.json();}catch{}
 if(!response.ok||body?.error||!body||!Object.prototype.hasOwnProperty.call(body,'result'))throw error(503,'Team draft storage is unavailable. Your browser copy is retained.');
 return body.result;
}
function validate(value){
 if(!value || typeof value!=='object' || !value.work || !/^[a-f0-9]{40}$/.test(value.head||'') || !value.versions || typeof value.versions!=='object')throw error(400,'Invalid team draft.');
 const w=value.work;
 if(typeof w.aboutText!=='string' || typeof w.settingsText!=='string' || !Array.isArray(w.assets) || w.assets.length>12)throw error(400,'Invalid team draft content.');
 let modelErrors;try{modelErrors=editorModel.check(w.about,true);}catch{throw error(400,'Invalid About draft.');}
 const issues=[...modelErrors,...core.validate(w.project,registry,{about:w.aboutText,settings:w.settingsText})];
 let settings;try{settings=JSON.parse(w.settingsText);}catch{throw error(400,'Invalid draft settings.');}
 issues.push(...core.settings.validate(core.settings.normalize(settings)));
 if(issues.length)throw error(400,issues.join(' '));
 let total=0;
 for(const a of w.assets){if(!a||!/^\/images\/studio-[a-f0-9-]{36}\.(png|jpe?g|webp|gif)$/.test(a.url)||typeof a.base64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(a.base64)||a.base64.length>1400000)throw error(400,'Invalid draft image.');total+=a.base64.length;}
 if(total>2800000 || Buffer.byteLength(JSON.stringify(value))>3600000)throw error(413,'This draft exceeds the private storage size limit. Download a backup.');
}
async function read(previous=null){
 if(!config())return {configured:false,record:null};
 if(previous!==null){if(!Number.isInteger(previous)||previous<0||previous>9)throw error(400,'Invalid recovery version.');const value=await command(['LINDEX',HISTORY,previous]);return {configured:true,record:value?JSON.parse(value):null};}
 const value=await command(['GET',KEY]);return {configured:true,record:value?JSON.parse(value):null};
}
async function save(body){
 if(!config())throw error(503,'Team draft storage is not configured. Your browser copy is retained.');
 if(!Number.isSafeInteger(body.expected)||body.expected<0||!/^[-a-f0-9]{36}$/.test(body.requestId||''))throw error(400,'Invalid draft revision.');
 validate(body.value);
 const requestHash=crypto.createHash('sha256').update(JSON.stringify(body.value)).digest('hex');
 const value=await command(['EVAL',SAVE,2,KEY,HISTORY,body.expected,body.requestId,JSON.stringify({value:body.value,updatedAt:Date.now(),requestHash}),requestHash]);
 if(value==='REQUEST_MISMATCH')throw error(409,'This save identifier already belongs to another draft. Your browser copy is retained.');
 if(value==='CONFLICT')throw error(409,'Another team member saved a newer draft. Your browser copy is retained. Load or download the team draft before continuing team sync.');
 return {configured:true,record:JSON.parse(value)};
}
module.exports={read,save};
