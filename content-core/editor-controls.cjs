'use strict';
// Capabilities describe existing typed blocks and trusted source elements; they never
// grant arbitrary markup, script access, or ownership of a connected data source.
const textTags=/^(h[1-6]|p|span|li|figcaption|blockquote)$/;
function profile(type){
 if(['card','split','callout','details'].includes(type))return 'composite';
 if(type==='image'||type==='img')return 'image';
 if(type==='video')return 'video';
 if(type==='button'||type==='a')return 'button';
 if(type==='iframe')return 'embed';
 if(['events','gallery','pricing','partners','booking','newsletter'].includes(type))return 'connected';
 if(textTags.test(type)||['heading','text','badge','quote','list'].includes(type))return 'text';
 if(type==='divider'||type==='spacer')return 'spacing';
 return 'layout';
}
const titles={image:'Image',video:'Video',button:'Button & link',embed:'Embedded media / form',connected:'Connected content',text:'Text',spacing:'Spacing',layout:'Layout',composite:'Content block'};
const textKeys=['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','align','color','textTransform','textDecoration'];
const imageKeys=['objectFit','objectPosition','aspectRatio'];
const containerKeys=['display','direction','columns','gridTemplate','gridRows','rowGap','columnGap','wrap','justify','items','gap'];
function supports(role,key,kind){
 if(kind==='img' && /^(background|gradient)/.test(key))return false;
 if(key==='backgroundVideo')return ['layout','composite','connected'].includes(role);
 if(role==='embed' && /^(background|gradient)/.test(key))return false;
 if(imageKeys.includes(key))return role==='image'||role==='video'||role==='composite';
 if(textKeys.includes(key))return !['image','video','spacing','embed'].includes(role);
 if(containerKeys.includes(key))return ['layout','connected','button','composite'].includes(role);
 if(['backgroundVideo','backgroundImage','backgroundAttachment','viewportHeight'].includes(key))return ['layout','image','connected','composite'].includes(role);
 return true;
}
function connection(pageId,element){
 if(element?.connection)return element.connection;
 if(element?.virtual)return {section:'weddings',label:'Wedding content',reason:'Policy text is shared with the Weddings page.'};
 if(element?.bindings?.length)return {section:'settings',label:'Site settings',reason:'This element uses shared website settings.'};
 if(element?.managed){const section=({home:'events',events:'events',gallery:'gallery','rent--weddings':'weddings','rent--pricing':'pricing',partners:'partners'})[pageId]||'settings';return {section,label:section==='events'?'Events calendar':section[0].toUpperCase()+section.slice(1),reason:'This collection is rendered from its connected content. Edit entries at the source; style and position its container here.'};}
 return null;
}
function imagePreset(mode){
 const v={width:100,padding:0,radius:0,x:0,y:0,position:'relative',display:'block',objectFit:mode==='Natural size'?'contain':'cover'};
 if(mode==='Fill / crop')Object.assign(v,{height:480,overflow:'hidden'});
 if(mode==='Small card')Object.assign(v,{maxWidthCss:'24rem',aspectRatio:'4 / 3',radius:16,overflow:'hidden'});
 if(mode==='Full screen')Object.assign(v,{viewportHeight:'full',heightCss:'100svh',overflow:'hidden'});
 return v;
}
const imageReset=['height','heightCss','widthCss','maxWidthCss','minHeight','viewportHeight','aspectRatio','backgroundImage','backgroundAttachment','backgroundSize','backgroundPosition','overflow'];
module.exports={profile,titles,supports,connection,imagePreset,imageReset};
