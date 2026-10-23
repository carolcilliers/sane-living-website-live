import { createContext, useContext, useState } from "react";
export const MediaContext=createContext<{url:string;sha:string}[]>([]);
export function MediaLibrary({select}:{select:(url:string)=>void}){
 const media=useContext(MediaContext),[search,setSearch]=useState(''),[open,setOpen]=useState(false);
 if(!media.length)return null;
 const items=media.filter(m=>m.url.toLowerCase().includes(search.toLowerCase())).slice(0,60);
 return <section className="repository-media"><button onClick={()=>setOpen(v=>!v)} aria-expanded={open}>Choose existing website image</button>{open?<div><label className="field">Find a website image<input aria-label="Find a website image" value={search} onChange={e=>setSearch(e.target.value)}/></label><small>{media.length} repository images · includes uploads from GitHub</small><div className="repository-media-grid">{items.map(m=><button key={m.url} title={m.url} onClick={()=>{select(m.url);setOpen(false);}}><img loading="lazy" src={m.url+'?v='+m.sha} alt=""/><span>{m.url.split('/').pop()}</span></button>)}</div>{!items.length?<p>No matching images.</p>:null}</div>:null}</section>;
}
