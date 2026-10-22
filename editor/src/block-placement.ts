import type { Block, Page } from './site-types';
export const isContainer = (b?: Block) => !!b && ['section','row','column'].includes(b.type);
export function siblings(page: Page, block: Block) {
  const result=page.blocks.filter(b=>b.placement?.section===block.placement?.section && b.placement?.parent===block.placement?.parent);
  // Match the renderer's explicit sibling anchors before normalising to array order.
  for(const b of [...result]){const anchor=result.find(x=>x.id===b.placement?.before);if(anchor && anchor!==b){result.splice(result.indexOf(b),1);result.splice(result.indexOf(anchor),0,b);}}
  return result;
}
export function subtree(page: Page, id: string) {
  const ids=new Set([id]);for(let i=0;i<10;i++)page.blocks.forEach(b=>{if(b.placement && ids.has(b.placement.section))ids.add(b.id);});return ids;
}
export function normaliseOrder(page: Page) {
  for(const owner of page.blocks.filter(isContainer)){
    const children=page.blocks.filter(b=>b.placement?.section===owner.id);
    if(!children.length)continue;
    const ordered=siblings(page,children[0]), slots=page.blocks.map((b,i)=>children.includes(b)?i:-1).filter(i=>i>=0);
    slots.forEach((slot,i)=>{page.blocks[slot]=ordered[i];delete ordered[i].placement!.before;});
  }
}
// Move the complete subtree, retaining its internal relationships. The destination is
// either a page boundary, a typed content slot, or a trusted original DOM slot.
export function relocate(page: Page, from: string, target: string, after: boolean, placement?: any) {
  const moving=page.blocks.find(b=>b.id===from);if(!moving || from===target)return false;
  const ids=subtree(page,from);if(ids.has(target) || ids.has(placement?.section))throw Error('A layout cannot be moved into itself or its children.');
  if(moving.source && placement && !placement.boundary)throw Error('Move original sections between section lines.');
  normaliseOrder(page);
  const group=page.blocks.filter(b=>ids.has(b.id));page.blocks=page.blocks.filter(b=>!ids.has(b.id));
  if(placement && !placement.boundary)moving.placement={...placement};else delete moving.placement;
  const at=page.blocks.findIndex(b=>b.id===target);let index=at<0?page.blocks.length:at+(after?1:0);
  if(after || (placement?.section===target && !placement.before)){
    const descendants=subtree(page,target);page.blocks.forEach((b,i)=>{if(descendants.has(b.id))index=Math.max(index,i+1);});
  }
  page.blocks.splice(index,0,...group);
  for(const b of page.blocks)if(!ids.has(b.id) && b.placement?.before===from)delete b.placement.before;
  normaliseOrder(page);return true;
}
