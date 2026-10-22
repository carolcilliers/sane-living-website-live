"use strict";
// One safe style vocabulary for the inspector, private preview and published pages.
const numbers = {x:[-2000,2000],y:[-2000,2000],width:[1,100],height:[0,2000],minHeight:[0,2000],fontSize:[8,160],fontWeight:[100,900],lineHeight:[10,40],padding:[0,200],margin:[0,200],gap:[0,160],radius:[0,200],columns:[1,6],opacity:[0,100],borderWidth:[0,20],paddingTop:[0,200],paddingRight:[0,200],paddingBottom:[0,200],paddingLeft:[0,200],marginTop:[-200,200],marginRight:[-200,200],marginBottom:[-200,200],marginLeft:[-200,200],shadowX:[-100,100],shadowY:[-100,100],shadowBlur:[0,150],shadowSpread:[-50,100],shadowOpacity:[0,100],letterSpacing:[-20,100]};
const enums = {shadow:['none','soft','medium','strong','custom'],borderStyle:['none','solid','dashed','dotted','double'],fontFamily:['inherit','system-ui','Georgia, serif','Arial, sans-serif'],align:['left','center','right'],display:['block','flex','grid','none'],direction:['row','column'],justify:['flex-start','center','flex-end','space-between','space-around'],items:['stretch','flex-start','center','flex-end'],objectFit:['cover','contain','fill','none'],aspectRatio:['auto','1 / 1','4 / 3','3 / 2','16 / 9','9 / 16']};
const colors = ['color','background','borderColor','shadowColor'];
const keys = [...Object.keys(numbers),...Object.keys(enums),...colors];
function validate(v) {
 if (!v || typeof v!=='object'||Array.isArray(v)) return ['Invalid design settings.'];
 const errors=[];
 for(const [k,value] of Object.entries(v)) {
  if(numbers[k]) { const [min,max]=numbers[k]; if(!Number.isInteger(value)||value<min||value>max)errors.push('Invalid '+k+' design value.'); }
  else if(enums[k]) {if(!enums[k].includes(value))errors.push('Invalid '+k+' design value.');}
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
  if(k==='x'||k==='y'||k.startsWith('shadow'))continue;
  if(k==='columns'){if(!v.display)put('display','grid');put('grid-template-columns','repeat('+value+',minmax(0,1fr))');}else if(k==='direction'){if(!v.display)put('display','flex');put(name,value);}
  else if(k==='lineHeight')put(name,value/10);
  else if(k==='letterSpacing')put(name,value/10+'px');
  else if(k==='opacity')put(name,value/100);
  else if(k==='width'){put('width',value+'%');put('max-width','100%');}
  else if(['height','minHeight','fontSize','padding','margin','gap','radius','borderWidth'].includes(k)||/^(padding|margin)(Top|Right|Bottom|Left)$/.test(k))put(name,value+'px');
  else put(name,value);
  if(k==='borderWidth' && !v.borderStyle)put('border-style','solid');
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
function token(id){return Array.from(String(id)).map(x=>x.charCodeAt(0).toString(16)).join('-');}
const media={desktop:'(min-width:1025px)',tablet:'(min-width:601px) and (max-width:1024px)',phone:'(max-width:600px)'};
function rules(id,base,responsive,attribute="data-studio-style"){
 const selector='['+attribute+'="'+token(id)+'"]';
 const rule = value => {
  const general=css(value);if(!general)return '';
  let out=selector+'{'+general+'}';
  if(attribute==='data-studio-layout') {
   const pick=allowed=>Object.fromEntries(Object.entries(value).filter(([k])=>allowed.includes(k)));
   const layout=css(pick(['display','direction','justify','items','columns','gap']));
   const type=css(pick(['fontSize','fontWeight','fontFamily','letterSpacing','lineHeight','color','align']));
   const image=css(pick(['objectFit','aspectRatio','height','radius']));
   if(layout)out+='.studio-block'+selector+'>.container{'+layout+'}';
   if(type)out+='.studio-block'+selector+'>.container :is(h1,h2,h3,p,a){'+type+'}';
   if(image)out+='.studio-block'+selector+' img{'+image+'}';
  }
  return out;
 };
 let out=base?rule(base):'';
 for(const device of Object.keys(media))if(responsive?.[device])out+='@media '+media[device]+'{'+rule(responsive[device])+'}';
 return out;
}
module.exports={keys,numbers,enums,validate,validateResponsive,css,token,rules};
