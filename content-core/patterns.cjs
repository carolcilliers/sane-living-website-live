"use strict";
// Reusable layouts contain only typed blocks; original source IDs remain unique.
function collect(page,id){
 const ids=new Set([id]);
 for(let depth=0;depth<10;depth++)for(const b of page.blocks)if(b.placement && ids.has(b.placement.section))ids.add(b.id);
 const blocks=page.blocks.filter(b=>ids.has(b.id));
 if(!blocks.length || blocks.some(b=>b.source))throw Error('Original connected sections keep their unique IDs. Save a newly created section or layout instead.');
 const result=structuredClone(blocks),root=result.find(b=>b.id===id);
 result.splice(result.indexOf(root),1);result.unshift(root);delete root.placement;
 for(const b of result)if(b.placement?.before && !ids.has(b.placement.before))delete b.placement.before;
 return result;
}
function instantiate(blocks,newID){
 const ids=new Map(blocks.map(b=>[b.id,newID()]));
 return structuredClone(blocks).map((b,index)=>{
  const prior=b.id;b.id=ids.get(prior);
  if(index===0)delete b.placement;
  else if(b.placement){b.placement.section=ids.get(b.placement.section);if(b.placement.before)b.placement.before=ids.get(b.placement.before);}
  return b;
 });
}
module.exports={collect,instantiate};
