"use strict";
// One safe style vocabulary for the inspector, private preview and published pages.
const numbers = {x:[-2000,2000],y:[-2000,2000],width:[1,100],height:[0,2000],minHeight:[0,2000],fontSize:[8,160],fontWeight:[100,900],lineHeight:[10,40],padding:[0,200],margin:[0,200],gap:[0,160],radius:[0,200],columns:[1,6],opacity:[0,100],borderWidth:[0,20]};
const enums = {align:['left','center','right'],display:['block','flex','grid','none'],direction:['row','column'],justify:['flex-start','center','flex-end','space-between','space-around'],items:['stretch','flex-start','center','flex-end'],objectFit:['cover','contain','fill','none'],aspectRatio:['auto','1 / 1','4 / 3','3 / 2','16 / 9','9 / 16']};
const colors = ['color','background','borderColor'];
const keys = [...Object.keys(numbers),...Object.keys(enums),...colors];
function validate(v) {
 if (!v || typeof v!=='object'||Array.isArray(v)) return ['Invalid design settings.'];
 const errors=[];
 for(const [k,value] of Object.entries(v)) {
  if(numbers[k]) { const [min,max]=numbers[k]; if(!Number.isInteger(value)||value<min||value>max)errors.push('Invalid '+k+' design value.'); }
  else if(enums[k]) {if(!enums[k].includes(value))errors.push('Invalid '+k+' design value.');}
  else if(colors.includes(k)) {if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))errors.push('Use a six-digit hex colour.');}
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
  const name={fontSize:'font-size',fontWeight:'font-weight',minHeight:'min-height',lineHeight:'line-height',radius:'border-radius',borderWidth:'border-width',borderColor:'border-color',objectFit:'object-fit',aspectRatio:'aspect-ratio',align:'text-align',direction:'flex-direction',justify:'justify-content',items:'align-items'}[k]||k;
  if(k==='x'||k==='y')continue;
  if(k==='columns')put('grid-template-columns','repeat('+value+',minmax(0,1fr))');
  else if(k==='lineHeight')put(name,value/10);
  else if(k==='opacity')put(name,value/100);
  else if(k==='width'){put('width',value+'%');put('max-width','100%');}
  else if(['height','minHeight','fontSize','padding','margin','gap','radius','borderWidth'].includes(k))put(name,value+'px');
  else put(name,value);
  if(k==='borderWidth')put('border-style','solid');
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
   const type=css(pick(['fontSize','fontWeight','lineHeight','color','align']));
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
