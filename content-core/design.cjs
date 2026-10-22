"use strict";
// One safe style vocabulary for the inspector, private preview and published pages.
const numbers = {gridRows:[1,12],rowGap:[0,160],columnGap:[0,160],columnSpan:[1,12],rowSpan:[1,12],flexGrow:[0,10],flexShrink:[0,10],rotate:[-180,180],scale:[10,300],radiusTopLeft:[0,200],radiusTopRight:[0,200],radiusBottomLeft:[0,200],radiusBottomRight:[0,200],gradientAngle:[0,360],x:[-2000,2000],y:[-2000,2000],width:[1,100],height:[0,2000],minHeight:[0,2000],fontSize:[8,160],fontWeight:[100,900],lineHeight:[10,40],padding:[0,200],margin:[0,200],gap:[0,160],radius:[0,200],columns:[1,6],opacity:[0,100],borderWidth:[0,20],paddingTop:[0,200],paddingRight:[0,200],paddingBottom:[0,200],paddingLeft:[0,200],marginTop:[-200,200],marginRight:[-200,200],marginBottom:[-200,200],marginLeft:[-200,200],shadowX:[-100,100],shadowY:[-100,100],shadowBlur:[0,150],shadowSpread:[-50,100],backgroundOverlay:[0,100],shadowOpacity:[0,100],letterSpacing:[-20,100]};
const enums = {position:["static","relative","absolute","sticky"],overflow:["visible","hidden","clip","auto"],wrap:["nowrap","wrap","wrap-reverse"],selfAlign:["auto","stretch","flex-start","center","flex-end"],textTransform:["none","uppercase","lowercase","capitalize"],textDecoration:["none","underline","line-through"],objectPosition:["center","top","bottom","left","right"],gradient:["none","linear"],backgroundSize:["cover","contain","auto"],backgroundPosition:["center","top","bottom","left","right"],backgroundRepeat:["no-repeat","repeat","repeat-x","repeat-y"],backgroundAttachment:["scroll","fixed"],viewportHeight:["auto","full"],gridTemplate:["1fr 1fr","1fr 2fr","2fr 1fr","1fr 1fr 1fr","1fr 1fr 1fr 1fr"],shadow:['none','soft','medium','strong','custom'],borderStyle:['none','solid','dashed','dotted','double'],fontFamily:['inherit','system-ui','Georgia, serif','Arial, sans-serif'],align:['left','center','right'],display:['block','flex','grid','none'],direction:['row','column'],justify:['flex-start','center','flex-end','space-between','space-around'],items:['stretch','flex-start','center','flex-end'],objectFit:['cover','contain','fill','none'],aspectRatio:['auto','1 / 1','4 / 3','3 / 2','16 / 9','9 / 16']};
const urls=["backgroundImage","backgroundVideo"];
function safeMedia(value){return typeof value==="string" && (value==="" || /^(\/(?!\/)|https:\/\/)[^\s<>"'`\\()]*$/.test(value));}
const lengths=['widthCss','heightCss','minWidthCss','maxWidthCss','minHeightCss','maxHeightCss','topCss','rightCss','bottomCss','leftCss','flexBasisCss'];
function safeLength(v,key){return typeof v==='string' && ((['auto','none','min-content','max-content','fit-content'].includes(v) && (!key || (key.endsWith('Css') && (!/^(top|right|bottom|left)Css$/.test(key) || v==='auto') && (v!=='none' || /^max(Width|Height)Css$/.test(key)))))||/^(?:0|(?:[0-9]{1,4}(?:\.[0-9]{1,3})?)(?:px|%|rem|em|vw|vh|svh))$/.test(v));}
const colors = ['gradientFrom','gradientTo','color','background','borderColor','shadowColor'];
const keys = [...Object.keys(numbers),...Object.keys(enums),...colors,...urls,...lengths];
function validate(v) {
 if (!v || typeof v!=='object'||Array.isArray(v)) return ['Invalid design settings.'];
 const errors=[];
 for(const [k,value] of Object.entries(v)) {
  if(numbers[k]) { const [min,max]=numbers[k]; if(!Number.isInteger(value)||value<min||value>max)errors.push('Invalid '+k+' design value.'); }
  else if(lengths.includes(k)){if(!safeLength(value,k))errors.push("Use auto or a size such as 320px, 50%, 24rem or 100svh.");}
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
function validateStates(states){
 if(states==null)return [];
 if(!states || typeof states!=='object' || Array.isArray(states))return ['Invalid interaction states.'];
 return Object.entries(states).flatMap(([state,value])=>['hover','focus'].includes(state)?[...validateResponsive(value),...Object.values(value||{}).flatMap(style=>style?.backgroundVideo!=null?['Video sources belong to the normal state.']:[])]:['Unknown interaction state.']);
}
function css(v={}) {
 const result=[];
 const put=(k,value)=>result.push(k+':'+value+'!important');
 for(const [k,value] of Object.entries(v)) {
  if(validate({[k]:value}).length)continue;
  const name={paddingTop:'padding-top',paddingRight:'padding-right',paddingBottom:'padding-bottom',paddingLeft:'padding-left',marginTop:'margin-top',marginRight:'margin-right',marginBottom:'margin-bottom',marginLeft:'margin-left',borderStyle:'border-style',fontFamily:'font-family',letterSpacing:'letter-spacing',fontSize:'font-size',fontWeight:'font-weight',minHeight:'min-height',lineHeight:'line-height',radius:'border-radius',borderWidth:'border-width',borderColor:'border-color',objectFit:'object-fit',aspectRatio:'aspect-ratio',align:'text-align',direction:'flex-direction',justify:'justify-content',items:'align-items'}[k]||k;
  if(lengths.includes(k)||k.startsWith('gradient'))continue;
  const special={wrap:'flex-wrap',selfAlign:'align-self',position:'position',overflow:'overflow',textTransform:'text-transform',textDecoration:'text-decoration',objectPosition:'object-position',rowGap:'row-gap',columnGap:'column-gap',flexGrow:'flex-grow',flexShrink:'flex-shrink',radiusTopLeft:'border-top-left-radius',radiusTopRight:'border-top-right-radius',radiusBottomLeft:'border-bottom-left-radius',radiusBottomRight:'border-bottom-right-radius'};
  if(special[k]){put(special[k],value+((k.endsWith('Gap')||k.startsWith('radius'))?'px':''));continue;}
  if(k==='gridRows'){put('grid-template-rows','repeat('+value+',minmax(0,auto))');continue;}
  if(k==='columnSpan'||k==='rowSpan'){put(k==='columnSpan'?'grid-column':'grid-row','span '+value);continue;}
  if(k==='rotate'){put('rotate',value+'deg');continue;}
  if(k==='scale'){put('scale',value/100);continue;}
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
 if(v.backgroundImage!=null || v.backgroundOverlay!=null || v.gradient!=null){
  const alpha=(v.backgroundOverlay||0)/100;
  const layers=[];if(v.gradient==='linear'){const color=(x,fallback)=>/^#[a-f0-9]{6}$/i.test(x||'')?x:fallback;layers.push('linear-gradient('+(v.gradientAngle||0)+'deg,'+color(v.gradientFrom,'#392844')+','+color(v.gradientTo,'#b99bcf')+')');}if(alpha)layers.push('linear-gradient(rgba(0,0,0,'+alpha+'),rgba(0,0,0,'+alpha+'))');
  if(v.backgroundImage && safeMedia(v.backgroundImage))layers.push('url("'+v.backgroundImage+'")');
  put('background-image',layers.join(',')||'none');
  if(v.backgroundImage){if(!v.backgroundSize)put('background-size','cover');if(!v.backgroundPosition)put('background-position','center');if(!v.backgroundRepeat)put('background-repeat','no-repeat');}
 }
 for(const key of lengths)if(v[key]!=null && safeLength(v[key],key))put(key.slice(0,-3).replace(/[A-Z]/g,x=>'-'+x.toLowerCase()),v[key]);
 const shadows={none:'none',soft:'0 4px 20px rgba(25,15,40,.10)',medium:'0 10px 32px rgba(25,15,40,.18)',strong:'0 18px 48px rgba(25,15,40,.28)'};
 if(v.shadow && shadows[v.shadow])put('box-shadow',shadows[v.shadow]);
 if(v.shadow==='custom') {
  const colour=/^#[a-f0-9]{6}$/i.test(v.shadowColor||'')?v.shadowColor:'#201428';
  const rgb=[1,3,5].map(i=>parseInt(colour.slice(i,i+2),16)).join(',');
  const number=(k,defaultValue)=>!validate({[k]:v[k]}).length?v[k]:defaultValue;
  put('box-shadow',[number('shadowX',0)+'px',number('shadowY',8)+'px',number('shadowBlur',24)+'px',number('shadowSpread',0)+'px','rgba('+rgb+','+number('shadowOpacity',18)/100+')'].join(' '));
 }
 if(v.x!=null||v.y!=null){if(!v.position)put('position','relative');put('translate',(Number(v.x)||0)+'px '+(Number(v.y)||0)+'px');}
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
function rules(id,base,responsive,attribute="data-studio-style",states){
 let rootSelector='['+attribute+'="'+token(id)+'"]';
 if(attribute==='data-studio-style' && id.includes(':part:'))rootSelector='.studio-block[data-studio-layout="'+token(id.split(':part:')[0])+'"] '+rootSelector+rootSelector;
 const rule = (value,state) => {
  const selector=rootSelector+(state?':is('+(state==='focus'?':focus-visible,:has(:focus-visible)':':hover')+',[data-studio-state="'+state+'"])':'');
  const layoutKeys=['display','direction','justify','items','columns','gridTemplate','gridRows','rowGap','columnGap','wrap','gap'];
  const general=css(attribute==='data-studio-layout'?Object.fromEntries(Object.entries(value).filter(([k])=>!layoutKeys.includes(k))):value);
  if(!general && !Object.keys(value).some(k=>layoutKeys.includes(k)))return '';
  let out=selector+'{'+general+'}';
  if(value.background!=null || value.backgroundImage!=null || value.backgroundVideo || value.gradient==='linear')out+=selector+'>.video-hero-bg,'+selector+'>.video-hero-overlay{display:none!important}';
  if(attribute==='data-studio-style' && id.endsWith(':part:text')){
   const typography=css(Object.fromEntries(Object.entries(value).filter(([key])=>['fontSize','fontWeight','fontFamily','letterSpacing','lineHeight','color','align','textDecoration','textTransform'].includes(key))));
   if(typography)out+=selector+' :is(p,li,a,strong,em){'+typography+'}';
  }
  if(attribute==='data-studio-layout') {
   const pick=allowed=>Object.fromEntries(Object.entries(value).filter(([k])=>allowed.includes(k)));
   const layout=css(pick(['display','direction','justify','items','columns','gridTemplate','gridRows','rowGap','columnGap','wrap','gap']));
   const type=css(pick(['fontSize','fontWeight','fontFamily','letterSpacing','lineHeight','color','align','textDecoration','textTransform']));
   const image=css(pick(['objectFit','objectPosition','aspectRatio','height','radius']));
   if(layout)out+='.studio-block'+selector+'>.container{'+layout+'}';
   if(type)out+='.studio-block'+selector+'>.container :is(h1,h2,h3,p,a){'+type+'}';
   if(image)out+='.studio-block'+selector+' img{'+image+'}';
   // Image layer dimensions describe the visible image, not only its outer section.
   const imageRoot=selector+'[data-studio-type="image"]';
   if(value.width!=null || value.widthCss!=null || value.height!=null || value.heightCss!=null || value.viewportHeight || value.aspectRatio || value.maxWidthCss){
    out+=imageRoot+'>.container{width:100%!important;max-width:none!important;padding-inline:0!important}'+imageRoot+' figure{width:100%;margin:0}'+imageRoot+' img{display:block;width:100%!important}';
    const sizing=css(pick(['heightCss','maxHeightCss','minHeightCss']));
    if(sizing)out+=imageRoot+' img{'+sizing+'}';
    if(value.viewportHeight==='full' && !value.backgroundImage)out+=imageRoot+' img{height:100svh!important;object-fit:cover}';
   }
   if(value.backgroundImage!=null)out+=imageRoot+' img{display:'+(value.backgroundImage?'none':'block')+'!important}';
   const button=css(pick(['background','backgroundImage','backgroundSize','backgroundPosition','backgroundOverlay','gradient','gradientFrom','gradientTo','gradientAngle','padding','paddingTop','paddingRight','paddingBottom','paddingLeft','radius','radiusTopLeft','radiusTopRight','radiusBottomLeft','radiusBottomRight','borderStyle','borderWidth','borderColor','shadow','shadowX','shadowY','shadowBlur','shadowSpread','shadowOpacity','shadowColor']));
   // Composite controls style the visible card/callout surface, rather than
   // painting a second border/background around its outer layout section.
   for(const [type,surface] of [['card','.studio-content-card'],['callout','.studio-callout'],['quote','.studio-quote'],['details','.studio-details']]){
    const root=selector+'[data-studio-type="'+type+'"]';
    if(button){out+=root+'{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding-block:var(--studio-section-padding,48px)!important;padding-inline:0!important}'+root+'>.container>'+surface+'{'+button+'}';}
    if(value.backgroundVideo)out+=root+'>.container>'+surface+'{background:transparent!important}';
   }
   if(button){out+=selector+'[data-studio-type="button"]{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;padding-block:var(--studio-section-padding,48px)!important;padding-inline:0!important}';out+=selector+'[data-studio-type="button"]>.container>.btn{'+button+'}';}
   if(value.width!=null || value.widthCss!=null)out+=selector+'[data-studio-type="button"]>.container>.btn{width:100%!important;box-sizing:border-box}';
  }
  return out;
 };
 let out=base?rule(base):'';
 for(const device of Object.keys(media))if(responsive?.[device]) {const value={...responsive[device]};if(value.backgroundImage!=null || value.backgroundOverlay!=null || value.gradient!=null || value.gradientFrom!=null || value.gradientTo!=null){for(const k of ['backgroundImage','backgroundOverlay','gradient','gradientFrom','gradientTo','gradientAngle'])if(value[k]==null && base?.[k]!=null)value[k]=base[k];}out+='@media '+media[device]+'{'+rule(value)+'}';}
 if(states && !validateStates(states).length)for(const [state,devices] of Object.entries(states))for(const device of Object.keys(media))if(devices?.[device])out+='@media '+media[device]+'{'+rule(devices[device],state)+'}';
 return out;
}
module.exports={validateStates,lengths,safeLength,mediaMarkup,safeMedia,keys,numbers,enums,validate,validateResponsive,css,token,rules};
