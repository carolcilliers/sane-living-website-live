'use strict';
// Prior canvas snapping stored subpixel offsets, although the schema requires
// integer CSS pixels. Repair only that known shape; never loosen validation.
function repairFractionalOffsets(project) {
 let count=0;
 function design(v){if(!v || typeof v!=='object' || Array.isArray(v))return;for(const key of ['x','y'])if(typeof v[key]==='number' && Number.isFinite(v[key]) && v[key]>=-2000 && v[key]<=2000 && !Number.isInteger(v[key])){v[key]=Math.round(v[key]);count++;}for(const group of ['responsive','states'])if(v[group] && typeof v[group]==='object')Object.values(v[group]).forEach(design);}
 function block(b){if(!b || typeof b!=='object')return;design(b.design);design({responsive:b.responsive,states:b.states});if(b.elements && typeof b.elements==='object')Object.values(b.elements).forEach(design);}
 if(Array.isArray(project?.pages))project.pages.forEach(p=>{if(Array.isArray(p?.blocks))p.blocks.forEach(block);});
 if(Array.isArray(project?.patterns))project.patterns.forEach(p=>{if(Array.isArray(p?.blocks))p.blocks.forEach(block);});
 return count;
}
module.exports={repairFractionalOffsets};
