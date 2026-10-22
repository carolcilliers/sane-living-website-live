"use strict";
// Source image cards are layout units. Their images/captions remain editable parts.
function owner(descriptor, id) {
  const element=descriptor?.elements.find(e=>e.id===id);
  return element?.dragOwner || id;
}
function restore(descriptor, values={}) {
  const next=structuredClone(values);
  const layoutKeys=['parent','order','x','y','width','height','minHeight','objectFit','aspectRatio','display','direction','columns','gap','padding','paddingTop','paddingRight','paddingBottom','paddingLeft','margin','marginTop','marginRight','marginBottom','marginLeft'];
  for(const element of descriptor.elements) {
    if(!element.dragOwner || !next[element.id])continue;
    const value=next[element.id];
    for(const key of layoutKeys)delete value[key];
    for(const device of ['desktop','tablet','phone'])if(value.responsive?.[device]){
      for(const key of layoutKeys)delete value.responsive[device][key];
      if(!Object.keys(value.responsive[device]).length)delete value.responsive[device];
    }
    if(value.responsive && !Object.keys(value.responsive).length)delete value.responsive;
    if(!Object.keys(value).length)delete next[element.id];
  }
  return next;
}
module.exports={owner,restore};
