import core from "../../content-core/site.cjs";
import type { Block, Page } from "./site-types";
import { resolveInsertLocation, type PageNode } from "./vendor/instatic/insert-location";
import { MODULE_WIRES, type WireNode } from "./vendor/instatic/module-wireframes";

export const LAYOUTS = [
  {id:"section",name:"Empty section",description:"A full-width canvas for your content",columns:1},
  {id:"two",name:"Two columns",description:"An even split, stacked on phones",columns:2},
  {id:"three",name:"Three columns",description:"A balanced row for features or cards",columns:3},
  {id:"four",name:"Four columns",description:"A compact grid for your content",columns:4},
  {id:"sidebar",name:"Sidebar + content",description:"One third / two thirds",columns:2},
  {id:"hero",name:"Hero",description:"Headline, introduction and a button",columns:1},
  {id:"features",name:"Feature cards",description:"Three image cards ready to customize",columns:3},
  {id:"story",name:"Image + story",description:"Editable image beside a text column",columns:2},
];
const containers = new Set(["section","row","column"]);

// Project the flat, validated site format into Instatic's insertion tree.
export function resolveBlockInsertion(page: Page, selected: string) {
  if(!selected)return;
  const chosen=page.blocks.find(b=>b.id===selected);
  const owner=page.blocks.find(b=>b.id===chosen?.placement?.section);
  // Source DOM containers use stable element IDs, not the typed "content" slot.
  if(chosen?.placement && owner?.source && !containers.has(chosen.type))return {...chosen.placement};
  const root="__page_root__", nodes:Record<string,PageNode> = {[root]:{id:root,moduleId:"section",children:[]}};
  for(const b of page.blocks)nodes[b.id]={id:b.id,moduleId:b.type,children:[]};
  for(const b of page.blocks)(nodes[b.placement?.section || root] || nodes[root]).children.push(b.id);
  const location=resolveInsertLocation({nodes,rootNodeId:root},selected,type=>containers.has(type));
  if(!location || location.parentId===root)return;
  return {section:location.parentId,parent:"content",...(location.index!=null && nodes[location.parentId].children[location.index] ? {before:nodes[location.parentId].children[location.index]} : {})};
}

export function makeLayout(id:string):Block[] {
  const preset=LAYOUTS.find(l=>l.id===id);if(!preset)throw new Error("Unknown layout");
  const blocks:Block[]=[];
  const create=(type:string,parent?:Block):Block=>{const b=core.block(type,crypto.randomUUID()) as Block;b.spacing=0;b.theme="white";if(parent)b.placement={section:parent.id,parent:"content"};blocks.push(b);return b;};
  const section=create("section");section.label=preset.name;section.spacing=48;
  section.design={paddingLeft:24,paddingRight:24};
  if(id==="section")return blocks;
  const row=create("row",section);row.design={display:"grid",columns:preset.columns,gap:24};row.responsive={phone:{columns:1},tablet:{columns:Math.min(2,preset.columns)}};
  if(id==="sidebar")row.design.gridTemplate="1fr 2fr";
  for(let i=0;i<preset.columns;i++){
    const col=create("column",row);col.label="Column "+(i+1);col.design={display:"flex",direction:"column",gap:16,minHeight:100};
    if(id==="hero"){section.design={...section.design,minHeight:640,background:"#eee9f2"};const h=create("heading",col);h.props={text:"Make something meaningful",level:"h1"};create("text",col);create("button",col);}
    if(id==="features")create("card",col);
    if(id==="story"){if(i===0)create("image",col);else{create("heading",col);create("text",col);create("button",col);}}
  }
  return blocks;
}

function Wire({node}:{node:WireNode}) {
  return <span className={"layout-wire-node wire-"+node.kind}>{node.children?.map((n,i)=><Wire key={i} node={n}/>)}</span>;
}
export function LayoutWire({columns}:{columns:number}) {
  return <span className="layout-wire" aria-hidden="true">{Array.from({length:columns},(_,i)=><Wire key={i} node={MODULE_WIRES["base.container"]}/>)}</span>;
}
