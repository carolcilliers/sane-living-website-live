const assert=require('node:assert/strict'),core=require('../content-core/site.cjs'),{repairFractionalOffsets}=require('../content-core/geometry.cjs');
const p={pages:[{blocks:[{design:{x:1.375,y:-2.625},responsive:{phone:{x:4.2}},elements:{a:{responsive:{desktop:{x:6.8,y:8}}}}}]}],patterns:[{blocks:[{design:{x:9.1}}]}]};
assert.equal(repairFractionalOffsets(p),5);assert.deepEqual(p.pages[0].blocks[0].design,{x:1,y:-3});assert.equal(repairFractionalOffsets(p),0);
const unsafe={pages:[{blocks:[{design:{x:2001.5,y:'12.5'}}]}]};assert.equal(repairFractionalOffsets(unsafe),0);assert(core.design.validate(unsafe.pages[0].blocks[0].design).length);
for(const bad of ['1fr;display:none','url(evil)','0fr 1fr','-1fr 2fr','1fr '.repeat(7).trim()])assert(core.design.validate({gridTracks:bad}).length,bad);
assert.deepEqual(core.design.validate({gridTracks:'240.125fr 311.875fr'}),[]);
assert.match(core.design.rules('row',{}, {desktop:{gridTracks:'240.125fr 311.875fr'}},'data-studio-layout'),/grid-template-columns:240.125fr 311.875fr/);
console.log('PASS narrow fractional-offset recovery, idempotence, unsafe values still rejected and bounded responsive grid-track CSS');
