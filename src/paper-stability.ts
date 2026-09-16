import {Vector3,type AbstractMesh,type Scene} from '@babylonjs/core';
export const smoothFade=(distance:number,near:number,far:number)=>{const t=Math.max(0,Math.min(1,(distance-near)/(far-near)));return 1-t*t*(3-2*t);};
/** Fine added geometry has a solid base below it. Keep it only where the projected detail resolves. */
export function applyFlightLOD(meshes:AbstractMesh[],camera:Vector3,height:number){
 for(const m of meshes){if(!m.getTotalVertices()||!m.isEnabled())continue;
  const facade=m.name.startsWith('facade_');
  const fineLandmark=/^landmark_bamboo_(silver|steel|lampwarm)$/.test(m.name);
  if(!facade&&!fineLandmark)continue;
  const distance=Vector3.Distance(camera,m.getBoundingInfo().boundingSphere.centerWorld);
  const alpha=facade?smoothFade(distance,150,450)*smoothFade(height,55,155):smoothFade(distance,110,360);
  m.visibility=alpha<.015?0:alpha;
 }
}
export function enableStableDepth(scene:Scene){
 // Keep overlays just in front of their opaque shell, avoiding coplanar depth fights.
 for(const m of scene.meshes)if(/^facade_/.test(m.name)&&m.material){m.material.zOffset=-1;m.material.zOffsetUnits=-1;}
}
