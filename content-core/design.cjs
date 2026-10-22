"use strict";
// One safe style vocabulary for the inspector, private preview and published pages.
const numbers = {x:[-2000,2000],y:[-2000,2000],width:[1,100],height:[0,2000],minHeight:[0,2000],fontSize:[8,160],fontWeight:[100,900],lineHeight:[10,40],padding:[0,200],margin:[0,200],gap:[0,160],radius:[0,200],columns:[1,6],opacity:[0,100],borderWidth:[0,20],paddingTop:[0,200],paddingRight:[0,200],paddingBottom:[0,200],paddingLeft:[0,200],marginTop:[-200,200],marginRight:[-200,200],marginBottom:[-200,200],marginLeft:[-200,200],shadowX:[-100,100],shadowY:[-100,100],shadowBlur:[0,150],shadowSpread:[-50,100],backgroundOverlay:[0,100],shadowOpacity:[0,100],letterSpacing:[-20,100]};
const enums = {backgroundSize:["cover","contain","auto"],backgroundPosition:["center","top","bottom","left","right"],backgroundRepeat:["no-repeat","repeat","repeat-x","repeat-y"],backgroundAttachment:["scroll","fixed"],viewportHeight:["auto","full"],gridTemplate:["1fr 1fr","1fr 2fr","2fr 1fr","1fr 1fr 1fr","1fr 1fr 1fr 1fr"],shadow:['none','soft','medium','strong','custom'],borderStyle:['none','solid','dashed','dotted','double'],fontFamily:['inherit','system-ui','Georgia, serif','Arial, sans-serif'],align:['left','center','right'],display:['block','flex','grid','none'],direction:['row','column'],justify:['flex-start','center','flex-end','space-between','space-around'],items:['stretch','flex-start','center','flex-end'],objectFit:['cover','contain','fill','none'],aspectRatio:['auto','1 / 1','4 / 3','3 / 2','16 / 9','9 / 16']};
const urls=["backgroundImage","backgroundVideo"];
function safeMedia(value){return typeof value==="string" && (value==="" || /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\()]*$/.test(value));}
const colors = ['color','background','borderColor','shadowColor'];
const keys = [...Object.keys(numbers),...Object.keys(enums),...colors,...urls];
function validate(v) {
 if (!v || typeof v!=='object'||Array.isArray(v)) return ['Invalid design settings.'];
 const errors=[];
 for(const [k,value] of Object.entries(v)) {
  if(numbers[k]) { const [min,max]=numbers[k]; if(!Number.isInteger(value)||value<min||value>max)errors.push('Invalid '+k+' design value.'); }
  else if(enums[k]) {if(!enums[k].includes(value))errors.push('Invalid '+k+' design value.');}
  else if(urls.includes(k)) {if(!safeMedia(value))errors.push("Use a local path or HTTPS media URL.");}
  else if(colors.includes(k)) {if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value) && !(k==='background' && value==='transparent'))errors.push('Use a six-digit hex colour.');}
  else errors.push('Unknown design setting: '+k+'.');
 }
 return errors;
}
function validateResponsive(v) {
 if(v==null)return [];
 if(!v||typeof v!=='object'||Array.isArray(v))return ['Invalid responsive settings.'];
 return Object.entries(v).flatMap(([k,x])=>['desktop','tablet','phone'].includes(k)?validate(x):['Invalid responsive device.']);
}
function css(v={}) {
 const result=[];
 const put=(k,value)=>result.push(k+':'+value+'!important');
 for(const [k,value] of Object.entries(v)) {
  if(validate({[k]:value}).length)continue;
  const name={paddingTop:'padding-top',paddingRight:'padding-right',paddingBottom:'padding-bottom',paddingLeft:'padding-left',marginTop:'margin-top',marginRight:'margin-right',marginBottom:'margin-bottom',marginLeft:'margin-left',borderStyle:'border-style',fontFamily:'font-family',letterSpacing:'letter-spacing',fontSize:'font-size',fontWeight:'font-weight',minHeight:'min-height',lineHeight:'line-height',radius:'border-radius',borderWidth:'border-width',borderColor:'border-color',objectFit:'object-fit',aspectRatio:'aspect-ratio',align:'text-align',direction:'flex-direction',justify:'justify-content',items:'align-items'}[k]||k;
  if(k==='x'||k==='y'||k.startsWith('shadow')||urls.includes(k)||k==='backgroundOverlay')continue;
  if(k==='background') {put('background-color',value);continue;}
  if(k==='viewportHeight'){put('min-height',value==='full'?'100svh':'0');continue;}
  if(k==='gridTemplate'){put('grid-template-columns',value);continue;}
  if(k.startsWith('background')){put(k.replace(/[A-Z]/g,x=>'-'+x.toLowerCase()),value);continue;}
  if(k==='columns'){if(!v.display)put('display','grid');put('grid-template-columns','repeat('+value+',minmax(0,1fr))');}else if(k==='direction'){if(!v.display)put('display','flex');put(name,value);}
  else if(k==='lineHeight')put(name,value/10);
  else if(k==='letterSpacing')put(name,value/10+'px');
  else if(k==='opacity')put(name,value/100);
  else if(k==='width'){put('width',value+'%');put('max-width','100%');}
  else if(['height','minHeight','fontSize','padding','margin','gap','radius','borderWidth'].includes(k)||/^(padding|margin)(Top|Right|Bottom|Left)$/.test(k))put(name,value+'px');
  else put(name,value);
  if(k==='borderWidth' && !v.borderStyle)put('border-style','solid');
 }
 if(v.backgroundImage!=null || v.backgroundOverlay!=null){
  const alpha=(v.backgroundOverlay||0)/100;
  const layers=[];if(alpha)layers.push('linear-gradient(rgba(0,0,0,'+alpha+'),rgba(0,0,0,'+alpha+'))');
  if(v.backgroundImage && safeMedia(v.backgroundImage))layers.push('url("'+v.backgroundImage+'")');
  put('background-image',layers.join(',')||'none');
  if(v.backgroundImage){if(!v.backgroundSize)put('background-size','cover');if(!v.backgroundPosition)put('background-position','center');if(!v.backgroundRepeat)put('background-repeat','no-repeat');}
 }
 const shadows={none:'none',soft:'0 4px 20px rgba(25,15,40,.10)',medium:'0 10px 32px rgba(25,15,40,.18)',strong:'0 18px 48px rgba(25,15,40,.28)'};
 if(v.shadow && shadows[v.shadow])put('box-shadow',shadows[v.shadow]);
 if(v.shadow==='custom') {
  const colour=/^#[a-f0-9]{6}$/i.test(v.shadowColor||'')?v.shadowColor:'#201428';
  const rgb=[1,3,5].map(i=>parseInt(colour.slice(i,i+2),16)).join(',');
  const number=(k,defaultValue)=>!validate({[k]:v[k]}).length?v[k]:defaultValue;
  put('box-shadow',[number('shadowX',0)+'px',number('shadowY',8)+'px',number('shadowBlur',24)+'px',number('shadowSpread',0)+'px','rgba('+rgb+','+number('shadowOpacity',18)/100+')'].join(' '));
 }
 if(v.x!=null||v.y!=null){put('position','relative');put('translate',(Number(v.x)||0)+'px '+(Number(v.y)||0)+'px');}
 return result.join(';');
}
function mediaMarkup(id,base={},responsive={}) {
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
 return ['desktop','tablet','phone'].map(device=>{
  const value={...base,...responsive?.[device]};
  if(!value.backgroundVideo || !safeMedia(value.backgroundVideo))return '';
  return '<video data-studio-background-video="'+token(id)+'-'+device+'" style="filter:brightness('+ (1-(value.backgroundOverlay||0)/100) +')" class="studio-background-video studio-bg-'+device+'" autoplay muted loop playsinline preload="metadata" aria-hidden="true" tabindex="-1" src="'+esc(value.backgroundVideo)+'"'+(value.backgroundImage?' poster="'+esc(value.backgroundImage)+'"':'')+'></video>';
 }).join('');
}
function token(id){return Array.from(String(id)).map(x=>x.charCodeAt(0).toString(16)).join('-');}
const media={desktop:'(min-width:1025px)',tablet:'(min-width:601px) and (max-width:1024px)',phone:'(max-width:600px)'};
function rules(id,base,responsive,attribute="data-studio-style"){
 const selector='['+attribute+'="'+token(id)+'"]';
 const rule = value => {
  const layoutKeys=['display','direction','justify','items','columns','gridTemplate','gap'];
  const general=css(attribute==='data-studio-layout'?Object.fromEntries(Object.entries(value).filter(([k])=>!layoutKeys.includes(k))):value);
  if(!general && !Object.keys(value).some(k=>layoutKeys.includes(k)))return '';
  let out=selector+'{'+general+'}';
  if(value.background!=null || value.backgroundImage!=null || value.backgroundVideo)out+=selector+'>.video-hero-bg,'+selector+'>.video-hero-overlay{display:none!important}';
  if(attribute==='data-studio-layout') {
   const pick=allowed=>Object.fromEntries(Object.entries(value).filter(([k])=>allowed.includes(k)));
   const layout=css(pick(['display','direction','justify','items','columns','gridTemplate','gap']));
   const type=css(pick(['fontSize','fontWeight','fontFamily','letterSpacing','lineHeight','color','align']));
   const image=css(pick(['objectFit','aspectRatio','height','radius']));
   if(layout)out+='.studio-block'+selector+'>.container{'+layout+'}';
   if(type)out+='.studio-block'+selector+'>.container :is(h1,h2,h3,p,a){'+type+'}';
   if(image)out+='.studio-block'+selector+' img{'+image+'}';
  }
  return out;
 };
 let out=base?rule(base):'';
 for(const device of Object.keys(media))if(responsive?.[device]) {const value={...responsive[device]};if(value.backgroundImage!=null || value.backgroundOverlay!=null){for(const k of ['backgroundImage','backgroundOverlay'])if(value[k]==null && base?.[k]!=null)value[k]=base[k];}out+='@media '+media[device]+'{'+rule(value)+'}';}
 return out;
}
module.exports={mediaMarkup,safeMedia,keys,numbers,enums,validate,validateResponsive,css,token,rules};
