import { useEffect, useRef } from "react";

const defaults={left:230,right:316};
const limits={left:[184,440],right:[260,560]};

/** Panel preferences stay separate from the website draft and its undo history. */
export function PanelResizer({side}:{side:"left"|"right"}) {
  const handle=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=handle.current!, workspace=el.closest<HTMLElement>('.studio-workspace')!;
    const key='sl-studio-panel-v1-'+side, variable='--studio-'+side;
    const current=()=>parseFloat(workspace.style.getPropertyValue(variable))||defaults[side];
    const update=(size:number,persist=false)=>{
      const other=side==='left'?'right':'left';
      const otherSize=parseFloat(workspace.style.getPropertyValue('--studio-'+other))||defaults[other];
      const max=Math.max(limits[side][0],Math.min(limits[side][1],workspace.clientWidth-52-12-260-otherSize));
      const next=Math.round(Math.max(limits[side][0],Math.min(max,size)));
      workspace.style.setProperty(variable,next+'px');
      el.setAttribute('aria-valuenow',String(next));el.setAttribute('aria-valuemax',String(Math.round(max)));
      if(persist)try{localStorage.setItem(key,String(next));}catch{}
    };
    try{const saved=Number(localStorage.getItem(key));update(saved>0?saved:defaults[side]);}catch{update(defaults[side]);}
    let origin=0,start=0,active=false;
    const stop=()=>{if(!active)return;active=false;workspace.classList.remove('resizing-panels');update(current(),true);};
    const down=(e:PointerEvent)=>{if(e.button!==0)return;e.preventDefault();origin=e.clientX;start=current();active=true;el.setPointerCapture(e.pointerId);workspace.classList.add('resizing-panels');};
    const move=(e:PointerEvent)=>{if(active)update(start+(e.clientX-origin)*(side==='left'?1:-1));};
    const keys=(e:KeyboardEvent)=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();update(e.key==='Home'?limits[side][0]:e.key==='End'?limits[side][1]:current()+(e.key==='ArrowRight'?1:-1)*(side==='left'?1:-1)*(e.shiftKey?40:10),true);}};
    const reset=()=>update(defaults[side],true);
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',stop);el.addEventListener('pointercancel',stop);el.addEventListener('lostpointercapture',stop);el.addEventListener('keydown',keys);el.addEventListener('dblclick',reset);
    const observer=new ResizeObserver(()=>{if(workspace.clientWidth>950)update(current());});observer.observe(workspace);
    return()=>{stop();observer.disconnect();el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',stop);el.removeEventListener('pointercancel',stop);el.removeEventListener('lostpointercapture',stop);el.removeEventListener('keydown',keys);el.removeEventListener('dblclick',reset);};
  },[side]);
  return <div ref={handle} className={'panel-resizer panel-resizer-'+side} role="separator" aria-label={side==='left'?'Resize blocks and layers panel':'Resize inspector panel'} aria-orientation="vertical" aria-valuemin={limits[side][0]} aria-valuenow={defaults[side]} tabIndex={0} title="Drag to resize · double-click to reset · arrow keys to adjust"/>;
}
