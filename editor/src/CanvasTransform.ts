import Moveable from "moveable";

export type CanvasMode = "move" | "resize" | "reorder" | null;
export type GridResize = {row:string;column:string;tracks:string};
export type CanvasTarget = { node: HTMLElement; block: string; element: string };
type Geometry = Record<string, string | number>;

// Moveable owns pointer geometry, eight-way resizing and snap calculations.
// Only a completed gesture enters the site's validated, device-scoped model.
export class CanvasTransform {
  private engine: Moveable;
  private root: HTMLElement;
  private guides: HTMLElement;
  private picked: CanvasTarget | null = null;
  private mode: CanvasMode = null;
  private gesture: { target: CanvasTarget; style: string; x: number; y: number; width: number; height: number; last?: Geometry; grid?: {parent:HTMLElement;style:string;row:string;tracks:number[];index:number;next?:string} } | null = null;
  private snapping = true;
  constructor(private doc: Document, private getTarget: () => CanvasTarget | null,
    private coordinates: (block: string, element: string) => number[],
    private commit: (block: string, element: string, geometry: Geometry, grid?:GridResize) => void) {
    this.root=doc.createElement("div");this.root.dataset.studioRuntime="transform";doc.body.append(this.root);
    this.guides=doc.createElement("div");this.guides.dataset.studioRuntime="guides";
    this.guides.style.cssText="position:fixed;inset:0;pointer-events:none;z-index:2147483638;display:none";doc.body.append(this.guides);
    this.engine=new Moveable(this.root, {
      target:null, container:doc.body, rootContainer:doc.body, origin:false,
      zoom:1/Math.max(.2,((doc.defaultView?.frameElement as HTMLElement)?.getBoundingClientRect().width || 1)/((doc.defaultView?.frameElement as HTMLElement)?.offsetWidth || 1)),
      draggable:false, resizable:false, rotatable:false, edge:true,
      renderDirections:["nw","n","ne","w","e","sw","s","se"],
      padding:{left:-12,right:-12,top:-12,bottom:-12},
      keepRatio:false, throttleDrag:0, throttleResize:1, snappable:true,
      snapGap:true, snapDirections:{left:true,right:true,top:true,bottom:true,center:true,middle:true},
      elementSnapDirections:{left:true,right:true,top:true,bottom:true,center:true,middle:true},
      snapHorizontalThreshold:6, snapVerticalThreshold:6, isDisplaySnapDigit:true,
      useResizeObserver:true, useMutationObserver:false, hideDefaultLines:false,
    });
    this.engine.on("dragStart",e=>{
      if(this.mode!=="move" && this.mode!=="resize"){e.stop();return;}
      if(!this.gesture)this.begin();
      if(this.gesture)e.set([this.gesture.x,this.gesture.y]);
    });
    this.engine.on("drag",e=>{
      if(!this.gesture || this.mode!=="move")return;
      const [x,y]=e.beforeTranslate;this.preview({x,y});
    });
    this.engine.on("dragEnd",()=>{if(this.mode==="move")this.finish();});
    this.engine.on("resizeStart",e=>{
      if(this.mode!=="resize"){e.stop();return;}
      this.begin();
      if(this.gesture){e.setMin([16,16]);e.setMax([Math.max(16,this.picked!.node.parentElement!.clientWidth),2000]);if(e.dragStart)e.dragStart.set([this.gesture.x,this.gesture.y]);}
    });
    this.engine.on("resize",e=>{
      if(!this.gesture)return;
      const [x,y]=e.drag.beforeTranslate;
      this.preview({x,y,widthCss:Math.round(e.width)+"px",height:Math.round(e.height)});
    });
    this.engine.on("resizeEnd",()=>this.finish());
  }
  private begin(){
    if(!this.picked)return;
    const node=this.picked.node,[x,y]=this.coordinates(this.picked.block,this.picked.element),r=node.getBoundingClientRect();
    this.gesture={target:this.picked,style:node.style.cssText,x:x||0,y:y||0,width:r.width,height:r.height};
    const parent=node.parentElement!,row=parent.closest<HTMLElement>('.studio-layout-row[data-studio-block]');
    if(node.matches('.studio-layout-column') && row && parent===row.querySelector(':scope>.container')){
      const tracks=this.doc.defaultView!.getComputedStyle(parent).gridTemplateColumns.split(' ').map(parseFloat),columns=Array.from(parent.children).filter(n=>n.matches('.studio-layout-column'));
      const index=columns.indexOf(node);if(tracks.length===columns.length && tracks.length>1 && tracks.every(Number.isFinite) && index>=0)this.gesture.grid={parent,style:parent.style.cssText,row:row.dataset.studioBlock!,tracks,index};
    }
    this.guides.style.display="block";this.guides.setAttribute("data-studio-guides","");
  }
  private preview(values:Geometry){
    const g=this.gesture;if(!g)return;
    const node=g.target.node;
    const x=Math.round(Math.max(-2000,Math.min(2000,Number(values.x)||0))),y=Math.round(Math.max(-2000,Math.min(2000,Number(values.y)||0)));
    g.last={...values,x,y};
    node.style.setProperty("position","relative","important");node.style.setProperty("translate",`${x}px ${y}px`,"important");
    if(g.grid && values.widthCss){
      const grid=g.grid,tracks=[...grid.tracks],i=grid.index,j=i<tracks.length-1?i+1:i-1;
      const delta=Math.max(40-tracks[i],Math.min(tracks[j]-40,parseFloat(String(values.widthCss))-g.width));
      tracks[i]+=delta;tracks[j]-=delta;grid.next=tracks.map(n=>Math.round(n*1000)/1000+'fr').join(' ');
      grid.parent.style.setProperty('grid-template-columns',tracks.map(n=>n+'px').join(' '),'important');
      node.style.setProperty('width','100%','important');node.style.setProperty('translate','0px 0px','important');
      g.last={height:Number(values.height)||Math.round(g.height)};
    } else if(values.widthCss){
      if(this.doc.defaultView!.getComputedStyle(node.parentElement!).display==='flex'){
        Object.assign(g.last!,{flexGrow:0,flexShrink:0,flexBasisCss:values.widthCss});node.style.setProperty('flex','0 0 '+values.widthCss,'important');
      }
      node.style.setProperty("width",String(values.widthCss),"important");node.style.setProperty("max-width","none","important");node.style.setProperty("box-sizing","border-box","important");}
    if(values.height!=null)node.style.setProperty("height",values.height+"px","important");
    const status=this.doc.querySelector<HTMLElement>("[data-studio-tool-status]");if(status)status.textContent=`${this.mode==="resize"?"Resize":"Move"} · X ${x} · Y ${y} · ${Math.round(node.getBoundingClientRect().width)} × ${Math.round(node.getBoundingClientRect().height)} px · Esc cancels`;
  }
  private finish(){
    const g=this.gesture;if(!g)return;this.gesture=null;g.target.node.style.cssText=g.style;if(g.grid)g.grid.parent.style.cssText=g.grid.style;
    this.guides.style.display="none";this.guides.removeAttribute("data-studio-guides");
    if(g.last)this.commit(g.target.block,g.target.element,g.last,g.grid?.next?{row:g.grid.row,column:g.target.block,tracks:g.grid.next}:undefined);
    requestAnimationFrame(()=>this.refresh());
  }
  cancel(){
    const g=this.gesture;this.gesture=null;
    if(g){g.target.node.style.cssText=g.style;if(g.grid)g.grid.parent.style.cssText=g.grid.style;}
    this.engine.stopDrag();this.guides.style.display="none";this.guides.removeAttribute("data-studio-guides");
  }
  setMode(mode:CanvasMode){this.cancel();this.mode=mode;this.refresh();}
  setSnap(value:boolean){this.snapping=value;this.refresh();}
  refresh(){
    if(this.gesture)return;
    this.picked=this.getTarget();
    const target=this.picked?.node,parent=target?.parentElement;
    const enabled=!!target && (this.mode==="move" || this.mode==="resize");
    if(!enabled){if(this.engine.target)this.engine.setState({target:null,draggable:false,resizable:false});return;}
    this.engine.setState({target:target!,draggable:this.mode==="move",resizable:this.mode==="resize",snappable:this.snapping,
      snapContainer:parent || this.doc.body,
      bounds:this.mode==="move" && parent ? {left:0,top:0,right:parent.clientWidth,bottom:Math.max(parent.clientHeight,target?.offsetHeight || 0)} : null,
      elementGuidelines:parent?Array.from(parent.children).filter(n=>n!==target && !n.hasAttribute("data-studio-boundary") && !n.hasAttribute("data-studio-runtime")) as HTMLElement[]:[],
      verticalGuidelines:parent?[0,parent.clientWidth/2,parent.clientWidth]:[],
      horizontalGuidelines:parent?[0,parent.clientHeight/2,parent.clientHeight]:[],
    });
    if(target && parent){
      const r=parent.getBoundingClientRect(),view=this.doc.defaultView!;
      this.guides.innerHTML='';
      const line=(x:number)=>{const n=this.doc.createElement('div');n.style.cssText=`position:absolute;top:0;bottom:0;width:1px;background:#b991d177;left:${x}px`;this.guides.append(n);};
      [0,view.innerWidth/2,view.innerWidth,r.left,r.left+r.width/2,r.right].forEach(line);
      const box=this.doc.createElement('div');box.style.cssText=`position:absolute;border:1px dashed #b991d1;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;this.guides.append(box);
    }
    this.doc.querySelectorAll<HTMLElement>('.moveable-control').forEach(n=>{const direction=n.dataset.direction;if(direction){n.setAttribute('role','button');n.setAttribute('aria-label','Resize '+direction);n.style.width='12px';n.style.height='12px';}});
  }
  align(axis:string){
    this.cancel();const hit=this.getTarget();if(!hit?.node.parentElement)return;
    const r=hit.node.getBoundingClientRect(),p=hit.node.parentElement.getBoundingClientRect(),[x,y]=this.coordinates(hit.block,hit.element);
    const left=p.left+hit.node.parentElement.clientLeft,top=p.top+hit.node.parentElement.clientTop,w=hit.node.parentElement.clientWidth,h=hit.node.parentElement.clientHeight;
    const values:Geometry={x:x||0,y:y||0};
    if(axis==='left')values.x=Number(values.x)+left-r.left;
    if(axis==='center')values.x=Number(values.x)+left+w/2-r.left-r.width/2;
    if(axis==='right')values.x=Number(values.x)+left+w-r.right;
    if(axis==='top')values.y=Number(values.y)+top-r.top;
    if(axis==='middle')values.y=Number(values.y)+top+h/2-r.top-r.height/2;
    if(axis==='bottom')values.y=Number(values.y)+top+h-r.bottom;
    this.commit(hit.block,hit.element,Object.fromEntries(Object.entries(values).map(([k,v])=>[k,Math.round(Math.max(-2000,Math.min(2000,Number(v))))])));
  }
  destroy(){this.cancel();this.engine.destroy();this.root.remove();this.guides.remove();}
}
