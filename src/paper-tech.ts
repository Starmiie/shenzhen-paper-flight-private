import {MeshBuilder,Mesh,PBRMaterial,Color3,Vector3,Quaternion,VertexBuffer,type Scene,type AbstractMesh} from '@babylonjs/core';
import type {Place} from './paper-world.ts';
export const TECH_PLACES:Place[]=[
 {id:'dji',name:'大疆创新 · 天空之城',lon:113.9379775,lat:22.580384325,x:-5370.158475,z:2964.5178354,height:127.2,area:'南山 · 留仙洞',excludeRadius:95,arrival:[-5160,2740],yaw:0},
 {id:'bytedance',name:'字节跳动 · 后海中心',lon:113.93626998333333,lat:22.515175366666668,x:-5475.5293285,z:-1390.9189096,height:90,area:'南山 · 后海',excludeRadius:32,arrival:[-5335,-1580],yaw:0}
];
export const PARK_IDS=new Set(['talent','baypark','lianhua','xiangmi']);
export const isTravelPlace=(p:Place)=>PARK_IDS.has(p.id)||['tencent','dji','bytedance','bamboo','civic','pingan','kk100','diwang'].includes(p.id);
/** Remove only triangles in the replacement site's footprint, including future facade tiles. */
export function clearTechFootprint(meshes:AbstractMesh[]){
 const p=TECH_PLACES[1];
 for(const mesh of meshes){if(!mesh.name.startsWith('block_')&&!mesh.name.startsWith('facade_'))continue;
  const b=mesh.getBoundingInfo().boundingBox;if(b.maximumWorld.x<p.x-23||b.minimumWorld.x>p.x+23||b.maximumWorld.z<p.z-25||b.minimumWorld.z>p.z+25)continue;
  const positions=mesh.getVerticesData(VertexBuffer.PositionKind),indices=mesh.getIndices();if(!positions||!indices)continue;const kept:number[]=[],matrix=mesh.getWorldMatrix();
  for(let i=0;i<indices.length;i+=3){const c=Vector3.Zero();for(let j=0;j<3;j++)c.addInPlace(Vector3.TransformCoordinates(Vector3.FromArray(positions,indices[i+j]*3),matrix));c.scaleInPlace(1/3);
   if(Math.abs(c.x-p.x)<23&&Math.abs(c.z-p.z)<25)continue;kept.push(indices[i],indices[i+1],indices[i+2]);
  }if(kept.length!==indices.length)mesh.setIndices(kept,null);
 }
}
/** Authored massing studies from architect descriptions; not survey-grade replicas. */
export function createTechBuildings(scene:Scene,heightAt:(x:number,z:number)=>number){
 const meshes:Mesh[]=[];
 const mat=(name:string,color:Color3,metallic=0)=>{const m=new PBRMaterial(name,scene);m.albedoColor=color;m.roughness=.58;m.metallic=metallic;m.enableSpecularAntiAliasing=true;return m;};
 const glass=mat('tech-muted-glass',new Color3(.18,.33,.37),.08),frame=mat('tech-satin-frame',new Color3(.69,.73,.7),.35),stone=mat('tech-warm-stone',new Color3(.54,.57,.5)),green=mat('tech-garden',new Color3(.18,.30,.20));
 function box(id:string,role:string,x:number,y:number,z:number,w:number,h:number,d:number,m:PBRMaterial){const mesh=MeshBuilder.CreateBox('detail_'+id+'_'+role,{width:w,height:h,depth:d},scene);mesh.position.set(x,y+h/2,z);mesh.material=m;mesh.receiveShadows=true;mesh.isPickable=false;mesh.freezeWorldMatrix();meshes.push(mesh);return mesh;}
 function beam(id:string,a:Vector3,b:Vector3,r=.7){const delta=b.subtract(a),mesh=MeshBuilder.CreateCylinder('detail_'+id+'_truss',{height:delta.length(),diameter:r*2,tessellation:6},scene);mesh.position.copyFrom(a.add(b).scale(.5));mesh.rotationQuaternion=Quaternion.FromUnitVectorsToRef(Vector3.Up(),delta.normalize(),new Quaternion());mesh.material=frame;mesh.isPickable=false;mesh.freezeWorldMatrix();meshes.push(mesh);}
 for(const p of TECH_PLACES){const base=heightAt(p.x,p.z);
  if(p.id==='dji'){
   box(p.id,'campus',p.x,base-3,p.z,380,3,440,green);box(p.id,'plaza',p.x,base,p.z,165,2,120,stone);
   for(const [side,height] of [[-1,116.4],[1,127.2]]){const x=p.x+side*43,z=p.z+side*13;
    box(p.id,'core',x,base+2,z,13,height,19,stone);
    for(let i=0;i<3;i++){const y=base+19+i*34,w=36+i*2,d=36,offset=(i%2?1:-1)*12;
     box(p.id,'floating-volume',x+offset,y,z,w,27,d,glass);box(p.id,'garden-roof',x+offset,y+27,z,w,1.2,d,green);
     for(const dz of [-d/2-.4,d/2+.4]){beam(p.id,new Vector3(x+offset-w/2,y+27,z+dz),new Vector3(x+offset,y,z+dz));beam(p.id,new Vector3(x+offset,y,z+dz),new Vector3(x+offset+w/2,y+27,z+dz));}
     for(let j=-2;j<=2;j++)box(p.id,'frame',x+offset+j*w/5,y,z,w*.018,27,d+.4,frame);
    }
   }
   box(p.id,'skybridge',p.x,base+63,p.z,76,1.6,5,stone);
   for(const dz of [-2.8,2.8]){for(let i=0;i<12;i++){const x1=p.x-40+i*80/12,x2=x1+80/12;const y=(x:number)=>base+66+8*((x-p.x)/40)**2;beam(p.id,new Vector3(x1,y(x1),p.z+dz),new Vector3(x2,y(x2),p.z+dz),.28);beam(p.id,new Vector3(x1,base+64,p.z+dz),new Vector3(x1,y(x1),p.z+dz),.14);}}
  }else{
   box(p.id,'podium',p.x,base,p.z,42,7,44,stone);
   for(let i=0;i<6;i++){const offset=i%2===0?-2:2,y=base+7+i*13.7;
    box(p.id,'tower',p.x+offset,y,p.z,32,13.7,32,glass);
    box(p.id,'terrace',p.x+offset,y+12.8,p.z,35,1,35,frame);
    for(const side of [-1,1])for(let j=-2;j<=2;j++)box(p.id,'eco-frame',p.x+offset+j*7,y,p.z+side*17,1.25,13.7,1.25,frame);
   }
   for(const x of [-18,18])for(const z of [-18,18])box(p.id,'outer-frame',p.x+x,base+7,p.z+z,1.8,83,1.8,frame);
  }
 }
 return meshes;
}
