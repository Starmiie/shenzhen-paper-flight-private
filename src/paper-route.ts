import {Vector3,MeshBuilder,Color3,StandardMaterial,Mesh,type Scene} from '@babylonjs/core';
export type RoutePoint=[number,number,number];
/** Climb first, cruise above the corridor's surveyed game geometry, descend at the view point. */
export function makeRoute(start:RoutePoint,end:RoutePoint,roofAt:(x:number,z:number)=>number):RoutePoint[]{
 const distance=Math.hypot(end[0]-start[0],end[2]-start[2]);const n=Math.max(2,Math.ceil(distance/35));let height=Math.max(start[1],end[1]);
 for(let i=0;i<=n;i++){const t=i/n;height=Math.max(height,roofAt(start[0]+(end[0]-start[0])*t,start[2]+(end[2]-start[2])*t)+45);}
 height=Math.min(1400,height+25);
 const dx=end[0]-start[0],dz=end[2]-start[2];
 const climb=Math.min(.3,(height-start[1])/Math.max(1,distance*.7));
 const descent=Math.min(.3,(height-end[1])/Math.max(1,distance*.7));
 const points:RoutePoint[]=[start,[start[0]+dx*climb,height,start[2]+dz*climb],[end[0]-dx*descent,height,end[2]-dz*descent],end];
 return points;
}
export class PaperRoute{
 private meshes:Mesh[]=[];private beads:Mesh[]=[];private material:StandardMaterial;private time=0;points:Vector3[]=[];
 constructor(private scene:Scene){this.material=new StandardMaterial('paper-route-glow',scene);this.material.disableLighting=true;this.material.emissiveColor=new Color3(1.8,1.5,.7);this.material.alpha=.4;}
 clear(){for(const m of this.meshes)m.dispose();this.meshes=[];this.beads=[];this.points=[];}
 set(points:RoutePoint[]){this.clear();this.points=points.map(p=>Vector3.FromArray(p));
  for(let i=1;i<this.points.length;i++){
   const a=this.points[i-1],b=this.points[i],distance=Vector3.Distance(a,b);if(distance<1)continue;
   const tube=MeshBuilder.CreateTube('paper-route-path',{path:[a,b],radius:.16,tessellation:6,cap:Mesh.CAP_ALL},this.scene);tube.material=this.material;tube.isPickable=false;this.meshes.push(tube);
   const n=Math.min(80,Math.max(1,Math.floor(distance/45)));
   for(let j=0;j<n;j++){const mote=MeshBuilder.CreateSphere('paper-route-waypoint',{diameter:1.5,segments:4},this.scene);mote.position.copyFrom(Vector3.Lerp(a,b,j/n));mote.material=this.material;mote.isPickable=false;this.meshes.push(mote);this.beads.push(mote);}
  }
 }
 update(dt:number,hidden:boolean){this.time+=dt;for(const m of this.meshes)m.setEnabled(!hidden);this.beads.forEach((m,i)=>m.scaling.setAll(.75+.3*Math.sin(this.time*2-i*.5)));}
}
