import {Mesh,VertexData,VertexBuffer,StandardMaterial,Color3,Vector3,type Scene,type TransformNode} from '@babylonjs/core';
/** Two bounded, world-space ribbons. History expires while hovering; no frame-dependent length. */
export class PaperTrail {
 private time=0;
 private paths:{p:Vector3;t:number}[][]=[[],[]];
 private meshes:Mesh[]=[];
 private count=64;
 constructor(scene:Scene){
  const material=new StandardMaterial('paper-trail-light',scene);material.disableLighting=true;material.emissiveColor=new Color3(3.2,2.15,.85);material.backFaceCulling=false;material.disableDepthWrite=true;
  for(let side=0;side<2;side++){
   const mesh=new Mesh('paper-flow-'+side,scene),data=new VertexData();data.positions=new Array(this.count*6).fill(0);data.colors=new Array(this.count*8).fill(0);data.indices=[];
   for(let i=0;i<this.count-1;i++){const n=i*2;data.indices.push(n,n+1,n+2,n+1,n+3,n+2);}
   data.applyToMesh(mesh,true);mesh.material=material;mesh.hasVertexAlpha=true;mesh.isPickable=false;mesh.alwaysSelectAsActiveMesh=true;this.meshes.push(mesh);
  }
 }
 update(dt:number,plane:TransformNode,camera:Vector3,emit:boolean,hidden:boolean){
  this.time+=dt;plane.computeWorldMatrix(true);
  for(let s=0;s<2;s++){
   const path=this.paths[s],mesh=this.meshes[s];mesh.setEnabled(!hidden);
   if(hidden){path.length=0;continue;}
   const tip=Vector3.TransformCoordinates(new Vector3(s?3.05:-3.05,.14,-1.9),plane.getWorldMatrix());
   if(emit&&(!path.length||Vector3.DistanceSquared(tip,path[0].p)>.12))path.unshift({p:tip,t:this.time});
   while(path.length&&(this.time-path[path.length-1].t>1.65||path.length>this.count))path.pop();
   const positions:number[]=[],colors:number[]=[];
   for(let i=0;i<this.count;i++){
    const sample=path[Math.min(i,path.length-1)],p=sample?.p??tip,life=sample?Math.max(0,1-(this.time-sample.t)/1.65):0;
    const tangent=path[Math.max(0,i-1)]?.p.subtract(path[Math.min(i+1,path.length-1)]?.p??p)??Vector3.Forward();
    const across=Vector3.Cross(tangent,camera.subtract(p)).normalize().scale(.075*life+.008);
    positions.push(...p.add(across).asArray(),...p.subtract(across).asArray());
    const alpha=i<path.length-1?life*life*.72:0;colors.push(1,1,1,alpha,1,1,1,alpha);
   }
   mesh.updateVerticesData(VertexBuffer.PositionKind,positions);mesh.updateVerticesData(VertexBuffer.ColorKind,colors);
  }
 }
}
