import {Mesh,VertexData,VertexBuffer,StandardMaterial,Color3,Vector3,RawTexture,Texture,Engine,type Scene,type TransformNode} from '@babylonjs/core';
type Mote={origin:Vector3;drift:Vector3;age:number;life:number;size:number};
/** Fixed particle pool. New motes hug each wing's path, older ones drift and dissolve. */
export class PaperTrail {
 private motes:Mote[]=[];private mesh:Mesh;private count=1024;private carry=0;private seed=42;
 private last:Vector3[]|null=null;
 private positions=new Float32Array(this.count*12);private colors=new Float32Array(this.count*16);
 constructor(scene:Scene){
  const data=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){const r=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5),i=(y*32+x)*4;data.set([255,255,255,Math.round(255*Math.max(0,1-r)**2)],i);}
  const texture=RawTexture.CreateRGBATexture(data,32,32,scene,true,false,Texture.TRILINEAR_SAMPLINGMODE);
  texture.hasAlpha=true;
  const material=new StandardMaterial('paper-particle-light',scene);material.disableLighting=true;material.emissiveColor=new Color3(3.1,2.1,.85);material.diffuseTexture=texture;material.useAlphaFromDiffuseTexture=true;material.alphaMode=Engine.ALPHA_ADD;material.disableDepthWrite=true;material.backFaceCulling=false;
  this.mesh=new Mesh('paper-particles',scene);const vd=new VertexData();vd.positions=this.positions;vd.colors=this.colors;vd.indices=[];vd.uvs=[];
  for(let i=0;i<this.count;i++){const n=i*4;vd.indices.push(n,n+1,n+2,n,n+2,n+3);vd.uvs.push(0,0,1,0,1,1,0,1);}
  vd.applyToMesh(this.mesh,true);this.mesh.material=material;this.mesh.hasVertexAlpha=true;this.mesh.isPickable=false;this.mesh.alwaysSelectAsActiveMesh=true;
 }
 private random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 reset(){this.motes.length=0;this.last=null;this.carry=0;this.colors.fill(0);this.mesh.updateVerticesData(VertexBuffer.ColorKind,this.colors);}
 update(dt:number,plane:TransformNode,camera:Vector3,emit:boolean,hidden:boolean){
  this.mesh.setEnabled(!hidden);if(hidden){this.reset();return;}
  dt=Math.min(.1,Math.max(0,dt));plane.computeWorldMatrix(true);
  const tips=[-3.05,3.05].map(x=>Vector3.TransformCoordinates(new Vector3(x,.14,-1.9),plane.getWorldMatrix()));
  if(this.last&&Vector3.Distance(this.last[0],tips[0])>60)this.reset();
  for(const m of this.motes)m.age+=dt;this.motes=this.motes.filter(m=>m.age<m.life);
  if(emit){this.carry+=dt*180;const count=Math.floor(this.carry);this.carry-=count;
   for(let i=0;i<count;i++)for(let side=0;side<2;side++){
    const origin=Vector3.Lerp(this.last?.[side]??tips[side],tips[side],(i+.5)/Math.max(1,count));
    origin.addInPlace(new Vector3((this.random()-.5)*.12,(this.random()-.5)*.12,(this.random()-.5)*.12));
    this.motes.push({origin,drift:new Vector3((this.random()-.5)*2.2,this.random()*1.2,(this.random()-.5)*2.2),age:0,life:1.65+this.random()*.8,size:.07+this.random()*.10});
   }
  }else this.carry=0;
  if(this.motes.length>this.count)this.motes.splice(0,this.motes.length-this.count);this.last=tips;
  this.colors.fill(0);
  this.motes.forEach((m,i)=>{
   const t=m.age/m.life,p=m.origin.add(m.drift.scale(m.age*m.age*.8));
   const view=camera.subtract(p).normalize(),right=Vector3.Cross(Vector3.Up(),view);if(right.lengthSquared()<.001)right.set(1,0,0);right.normalize();const up=Vector3.Cross(view,right).normalize();
   const size=m.size*(1+t*.9),alpha=(1-t)**1.7*.9;
   [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([x,y],j)=>{const v=p.add(right.scale(x*size)).add(up.scale(y*size));this.positions.set(v.asArray(),i*12+j*3);this.colors.set([1,1,1,alpha],i*16+j*4);});
  });
  this.mesh.updateVerticesData(VertexBuffer.PositionKind,this.positions);this.mesh.updateVerticesData(VertexBuffer.ColorKind,this.colors);
 }
 get stats(){return {active:this.motes.length,capacity:this.count};}
}
