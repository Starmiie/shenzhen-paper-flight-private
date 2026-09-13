import {Engine,Scene,Vector3,Color3,Color4,FreeCamera,HemisphericLight,DirectionalLight,ShadowGenerator,MeshBuilder,Mesh,StandardMaterial,PBRMaterial,Quaternion,ImportMeshAsync,DefaultRenderingPipeline,MirrorTexture,Plane,MeshoptCompression,VertexData,TransformNode,Ray,type AbstractMesh} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import './city-gltf-streaming.ts';
import {loadLandmarkDetails} from './landmark-details.ts';
import {createArchitectureMaterials} from './city-architecture-materials.ts';
import {createFacadeDiversity} from './city-facade-diversity.ts';
import {CityFacadeStream} from './city-facade-stream.ts';
import {CityLandscape,applyLandscapeSurfaces} from './city-landscape.ts';
import {loadCityMountains} from './city-mountains.ts';
import {loadCityGroundRelief} from './city-ground-relief.ts';
import {loadCoastalInfrastructure} from './city-coastal-infrastructure.ts';
import {loadLandmarkSignage} from './landmark-signage.ts';
import {attachCityBuildingSigns} from './city-building-signs.ts';
import {createPublicLighting} from './city-public-lighting.ts';
import {createBayWater} from './city-bay-water.ts';
import {createCoastalHorizon} from './city-coastal-horizon.ts';
import {createCinematicLook,applyAntiAliasing} from './city-cinematic.ts';
import {createBambooLook} from './city-bamboo-look.ts';
import {createBayparkLook} from './city-baypark-look.ts';
import {setLandscapeLightingMode} from './city-landscape-lighting.ts';
import {CityStreetFurniture} from './city-street-furniture.ts';
import {keepSkyInReflections} from './city-sky-reflection.ts';
import type {CityData,Landmark} from './city-types.ts';
export type Place=Landmark&{lon?:number;lat?:number};
export type Period='dawn'|'day'|'sunset'|'night';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
MeshoptCompression.Configuration={decoder:{url:'/city/meshopt_decoder.js'}};
export class PaperWorld{
 engine:Engine;scene:Scene;camera:FreeCamera;sun:DirectionalLight;hemi:HemisphericLight;pipeline:DefaultRenderingPipeline;shadows:ShadowGenerator;
 data!:CityData;places:Place[]=[];ready=false;started=false;photo=false;hover=false;minutes=17*60+20;elapsed=0;period:Period='sunset';
 position=new Vector3(-4900,200,-1800);yaw=-.35;pitch=0;speed=28;bank=0;keys=new Set<string>();photoYaw=0;photoPitch=.18;photoDistance=32;
 plane:TransformNode;onTick:()=>void=()=>{};onNotice:(s:string)=>void=()=>{};
 architecture;diversity;facades:CityFacadeStream|null=null;landscape:CityLandscape|null=null;furniture:CityStreetFurniture|null=null;
 cinematic:Awaited<ReturnType<typeof createCinematicLook>>|null=null;
 water:ReturnType<typeof createBayWater>|null=null;lighting:ReturnType<typeof createPublicLighting>|null=null;
 signs:Awaited<ReturnType<typeof loadLandmarkSignage>>|null=null;buildingSigns:Awaited<ReturnType<typeof attachCityBuildingSigns>>|null=null;
 bamboo:ReturnType<typeof createBambooLook>|null=null;baypark:ReturnType<typeof createBayparkLook>|null=null;
 heightAt:(x:number,z:number)=>number=()=>0;waterMirror:MirrorTexture;staticMeshes:AbstractMesh[]=[];blocks:{mesh:AbstractMesh;x:number;z:number;road:boolean}[]=[];
 lastDetail=new Vector3(1e9,0,1e9);private collidable:AbstractMesh[]=[];private cycleTick=0;private qaNext=10;
 constructor(public canvas:HTMLCanvasElement){
  this.engine=new Engine(canvas,true,{stencil:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.resize();
  this.scene=new Scene(this.engine);this.scene.clearColor=new Color4(.65,.64,.65,1);this.scene.fogMode=Scene.FOGMODE_EXP2;
  this.camera=new FreeCamera('paper-camera',this.position.clone(),this.scene);this.camera.inputs.clear();this.camera.minZ=.6;this.camera.maxZ=21000;this.camera.fov=.88;
  this.hemi=new HemisphericLight('sky-bounce',Vector3.Up(),this.scene);this.hemi.intensity=.65;
  this.sun=new DirectionalLight('travelling-sun',new Vector3(.95,-.3,.18),this.scene);this.sun.intensity=1.4;
  this.sun.orthoLeft=this.sun.orthoBottom=-850;this.sun.orthoRight=this.sun.orthoTop=850;this.sun.shadowMinZ=1;this.sun.shadowMaxZ=3000;
  this.shadows=new ShadowGenerator(1024,this.sun);this.shadows.usePercentageCloserFiltering=true;this.shadows.bias=.0005;this.shadows.normalBias=.15;this.shadows.getShadowMap()!.refreshRate=8;
  this.pipeline=new DefaultRenderingPipeline('paper-optics',true,this.scene,[this.camera]);
  const sky=MeshBuilder.CreateSphere('atmosphere',{diameter:36000,segments:24},this.scene);sky.infiniteDistance=true;sky.isPickable=false;sky.applyFog=false;
  const mat=new StandardMaterial('fallback-sky',this.scene);mat.backFaceCulling=false;mat.disableDepthWrite=true;mat.disableLighting=true;mat.emissiveColor=new Color3(.7,.65,.65);sky.material=mat;keepSkyInReflections(sky);
  this.architecture=createArchitectureMaterials(this.scene);this.diversity=createFacadeDiversity(this.scene);
  this.waterMirror=new MirrorTexture('bay-reflection',256,this.scene,true);this.waterMirror.mirrorPlane=new Plane(0,-1,0,-.35);this.waterMirror.refreshRate=6;this.waterMirror.blurKernel=3;
  this.plane=this.makePlane();this.bindControls();window.addEventListener('resize',()=>this.resize());
  this.engine.runRenderLoop(()=>{if(!this.ready||document.hidden)return;const dt=Math.min(this.engine.getDeltaTime()/1000,.06);this.update(dt);this.scene.render();this.onTick();});
 }
 resize(){this.engine?.setHardwareScalingLevel(1/Math.min(devicePixelRatio||1,1.3,Math.sqrt(1600*1000/(innerWidth*innerHeight))));this.engine?.resize();}
 private makePlane(){
  const root=new TransformNode('paper-airplane',this.scene);
  const vertices=[0,0,3.6,-3.2,.12,-2,0,.38,-1.3, 0,0,3.6,0,.38,-1.3,3.2,.12,-2, 0,0,3.6,0,-.75,-1.5,0,.38,-1.3];
  const mesh=new Mesh('folded-paper',this.scene),vd=new VertexData();vd.positions=vertices;vd.indices=[0,1,2,3,4,5,6,7,8];const normals:number[]=[];VertexData.ComputeNormals(vertices,vd.indices,normals);vd.normals=normals;vd.applyToMesh(mesh);
  const paper=new StandardMaterial('warm-ivory-paper',this.scene);paper.diffuseColor=new Color3(.98,.93,.80);paper.emissiveColor=new Color3(.65,.60,.48);paper.specularColor.setAll(.05);paper.backFaceCulling=false;mesh.material=paper;mesh.parent=root;mesh.isPickable=false;
  const seam=MeshBuilder.CreateLines('paper-crease',{points:[new Vector3(0,0,3.6),new Vector3(0,.38,-1.3)]},this.scene);seam.color=new Color3(.64,.56,.44);seam.parent=root;return root;
 }
 private async load(name:string){
  const result=await ImportMeshAsync('/city/'+name+'.glb',this.scene);result.meshes[0].rotationQuaternion=Quaternion.Identity();
  for(const m of result.meshes){m.isPickable=false;m.receiveShadows=true;if(m.material instanceof PBRMaterial){m.material.maxSimultaneousLights=4;m.material.forceIrradianceInFragment=true;}if(m.getTotalVertices()){m.freezeWorldMatrix();this.staticMeshes.push(m);}}
  this.architecture.applyMeshes(result.meshes,name);this.diversity.applyMeshes(result.meshes,name);return result.meshes;
 }
 async init(progress:(s:string)=>void){
  progress('展开深圳的海岸与街道');this.data=await fetch('/city/city.json').then(r=>r.json());const detail=await loadLandmarkDetails(this.data);if(detail)this.heightAt=detail.heightAt;
  const mountains=await loadCityMountains(this.heightAt);this.heightAt=mountains.heightAt;
  const relief=await loadCityGroundRelief(this.heightAt,undefined,false);this.heightAt=relief.heightAt;
  const coastal=await loadCoastalInfrastructure(this.data,this.heightAt);this.heightAt=coastal.heightAt;
  await this.load('terrain');const roads=await this.load('roads');mountains.drapePaths(roads);
  for(const name of ['coastal-bridges','coastal-shoreline','opposite-shore']){const part=await this.load(name);if(name==='opposite-shore')for(const m of part.filter(m=>m.getTotalVertices()))createCoastalHorizon(this.scene,m,coastal.manifest.waterHeight);}
  progress('让南山、福田、罗湖慢慢浮现');const buildings=await this.load('buildings');await this.load('landmarks');
  if(detail){for(const m of [...this.scene.meshes])if(detail.manifest.replacedMeshPrefixes.some(p=>m.name.startsWith(p)))m.dispose(false,false);await this.load('landmark-detail');}
  this.staticMeshes=this.staticMeshes.filter(m=>!m.isDisposed());
  for(const m of this.staticMeshes){const match=m.name.match(/(?:block|roads)_(-?\d+)_(-?\d+)_/);if(match)this.blocks.push({mesh:m,x:(+match[1]+.5)*640,z:(+match[2]+.5)*640,road:m.name.startsWith('roads')});}
  this.collidable=this.staticMeshes.filter(m=>/block_|landmark_|detail_/.test(m.name));
  this.signs=await loadLandmarkSignage(this.scene);this.buildingSigns=await attachCityBuildingSigns(this.scene,buildings,this.data);
  this.facades=new CityFacadeStream(this.scene,()=>this.detail(),(ms,n)=>this.architecture.applyMeshes(ms,n));await this.facades.init(this.position.x,this.position.z);
  progress('种下榕树、棕榈与海边的草');this.landscape=new CityLandscape(this.scene,this.heightAt);await this.landscape.init();this.landscape.configureRoadside(this.data,{collisionFootprints:detail?.manifest.collisionFootprints,bridgeCrossings:coastal.manifest.crossings});
  this.furniture=new CityStreetFurniture(this.scene,this.heightAt);await this.furniture.init();applyLandscapeSurfaces(this.scene);mountains.attachVisuals(this.scene);relief.attachVisuals(this.scene);
  const lamps=await fetch('/city/lamps.json').then(r=>r.json());const poles=await this.load('park-floodlight');this.lighting=createPublicLighting(this.scene,lamps,coastal.manifest.parkLights,poles,this.heightAt);
  this.water=createBayWater(this.scene,this.waterMirror,this.scene.meshes.filter(m=>m.name==='terrain_water'),coastal.manifest);
  progress('把黄昏折进一架纸飞机');this.cinematic=await createCinematicLook(this);this.bamboo=createBambooLook(this.scene);this.baypark=createBayparkLook(this.scene);
  this.places=this.data.landmarks as Place[];this.setPeriod('sunset');this.detail();this.updateCamera(1);progress('让最后一束光落在城市上');await this.scene.whenReadyAsync();this.ready=true;
 }
 setPeriod(period:Period,setClock=true){
  this.period=period;if(setClock)this.minutes={dawn:6*60+20,day:14*60,sunset:17*60+20,night:23*60}[period];
  const mode=period==='dawn'?'day':period;this.cinematic?.setMode(mode);this.architecture.setMode(mode);this.diversity.setMode(mode);this.signs?.setMode(mode);this.buildingSigns?.setNight(mode==='night');this.lighting?.setMode(mode);this.water?.setMode(mode);this.bamboo?.setMode(mode);this.baypark?.setMode(mode);setLandscapeLightingMode(this.scene,mode);
  applyAntiAliasing(this.pipeline,true);this.pipeline.grainEnabled=false;this.pipeline.chromaticAberrationEnabled=false;this.pipeline.bloomWeight=mode==='night'?.22:.09;
  this.scene.imageProcessingConfiguration.contrast=1.02;
  if(period==='dawn'){this.sun.direction.set(-.8,-.22,.2);this.sun.diffuse.set(1,.78,.58);this.sun.intensity=1.7;this.scene.fogColor.set(.72,.70,.68);this.scene.fogDensity=.000085;this.scene.imageProcessingConfiguration.exposure=1.1;}
  this.detail();
 }
 private detail(){
  const p=this.position;this.lastDetail.copyFrom(p);this.facades?.update(p.x,p.z,true,0);
  for(const b of this.blocks)b.mesh.setEnabled(Math.hypot(b.x-p.x,b.z-p.z)<(b.road?7200:14000));
  this.landscape?.update(p.x,p.z,p.y>150,true);this.furniture?.update(p.x,p.z,p.y>150);this.lighting?.update(p.x,p.z,true);
  this.sun.position.set(p.x-this.sun.direction.x*1500,700,p.z-this.sun.direction.z*1500);
  this.shadows.getShadowMap()!.renderList=[...this.staticMeshes.filter(m=>m.isEnabled()&&Vector3.Distance(m.getBoundingInfo().boundingSphere.centerWorld,p)<1100),...(this.landscape?.casters??[]),...(this.facades?.shadowMeshes??[])];
  this.waterMirror.renderList=this.scene.meshes.filter(m=>m.isEnabled()&&m.getTotalVertices()>0&&m.name!=='terrain_water'&&!m.material?.hasTexture(this.waterMirror)&&(!m.name.includes('paper'))&&Vector3.Distance(m.getBoundingInfo().boundingSphere.centerWorld,p)<5000);
  const sky=this.scene.getMeshByName('atmosphere');if(sky)this.waterMirror.renderList.push(sky);
 }
 private bindControls(){
  const active=()=>document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLSelectElement;
  window.addEventListener('keydown',e=>{if(active()||!this.started)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();this.keys.add(e.code);if(!e.repeat&&e.code==='Space'&&!this.photo){this.hover=!this.hover;this.onNotice(this.hover?'已悬停 · 空格继续飞行':'顺着风，继续飞');}});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.keys.clear());document.addEventListener('visibilitychange',()=>this.keys.clear());
  let pointer:number|null=null,x=0,y=0;
  this.canvas.addEventListener('pointerdown',e=>{pointer=e.pointerId;x=e.clientX;y=e.clientY;this.canvas.setPointerCapture(e.pointerId);});
  this.canvas.addEventListener('pointermove',e=>{if(pointer!==e.pointerId||!this.started||!e.buttons)return;const dx=e.clientX-x,dy=e.clientY-y;x=e.clientX;y=e.clientY;if(this.photo){this.photoYaw+=dx*.004;this.photoPitch=clamp(this.photoPitch+dy*.003,-.9,1.2);}else{this.yaw+=dx*.003;this.pitch=clamp(this.pitch-dy*.002,-.7,.7);}});
  const up=()=>{pointer=null;};this.canvas.addEventListener('pointerup',up);this.canvas.addEventListener('pointercancel',up);this.canvas.addEventListener('lostpointercapture',up);
  this.canvas.addEventListener('wheel',e=>{if(this.photo){e.preventDefault();this.camera.fov=clamp(this.camera.fov+e.deltaY*.0005,.3,1.3);}},{passive:false});
 }
 setPhoto(v:boolean){this.photo=v;this.keys.clear();this.plane.setEnabled(!v);if(v){this.photoYaw=this.yaw+Math.PI;this.photoPitch=.12;this.photoDistance=32;}else this.camera.fov=.88;}
 private updateCamera(dt:number){
  const dir=new Vector3(Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),Math.cos(this.yaw)*Math.cos(this.pitch));
  if(this.photo){const c=Math.cos(this.photoPitch);this.camera.position.copyFrom(this.position.add(new Vector3(Math.sin(this.photoYaw)*c,Math.sin(this.photoPitch),Math.cos(this.photoYaw)*c).scale(this.photoDistance)));this.camera.setTarget(this.position.add(new Vector3(0,2,0)));}
  else{const target=this.position.subtract(dir.scale(28)).add(new Vector3(0,9,0));this.camera.position=Vector3.Lerp(this.camera.position,target,1-Math.exp(-dt*5));this.camera.setTarget(this.position.add(dir.scale(35)));}
  const boom=this.camera.position.subtract(this.position),distance=boom.length();if(distance>1){const hit=this.scene.pickWithRay(new Ray(this.position,boom.normalize(),distance),m=>this.collidable.includes(m),false);if(hit?.hit)this.camera.position.copyFrom(this.position.add(boom.scale(Math.max(1,hit.distance-3))));}
 }
 private update(dt:number){
  if(this.started&&!this.photo){
   const turn=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'));
   const climb=Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'));
   this.yaw+=turn*dt*.65;this.pitch=clamp(this.pitch+climb*dt*.42,-.65,.65);if(!climb)this.pitch*=Math.exp(-dt*.35);
   this.bank+=(turn*.38-this.bank)*(1-Math.exp(-dt*3));const desired=this.hover?0:this.keys.has('ShiftLeft')||this.keys.has('ShiftRight')?180:32;this.speed+=(desired-this.speed)*(1-Math.exp(-dt*1.3));
   const direction=new Vector3(Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),Math.cos(this.yaw)*Math.cos(this.pitch));
   const step=direction.scale(this.speed*dt),next=this.position.add(step);const hit=this.scene.pickWithRay(new Ray(this.position,direction,Math.max(14,step.length()+10)),m=>this.collidable.includes(m),true);
   if(!hit?.hit)this.position.copyFrom(next);else{this.speed=0;this.position.y+=dt*12;this.onNotice('轻轻抬升，绕过眼前的建筑');}
   const ground=this.heightAt(this.position.x,this.position.z);this.position.y=clamp(this.position.y,ground+12,1500);
   const [xmin,zmin,xmax,zmax]=this.data.meta.extent;const oldX=this.position.x,oldZ=this.position.z;this.position.x=clamp(oldX,xmin+30,xmax-30);this.position.z=clamp(oldZ,zmin+30,zmax-30);if(oldX!==this.position.x||oldZ!==this.position.z){this.yaw+=dt*.8;this.onNotice('来到原场景边缘，轻转方向继续旅行');}
   this.elapsed+=dt;this.minutes=(this.minutes+dt/12)%1440;this.cycleTick+=dt;
   if(this.cycleTick>1){this.cycleTick=0;const h=this.minutes/60;const next:Period=h>=5&&h<9?'dawn':h>=9&&h<16.5?'day':h>=16.5&&h<19.5?'sunset':'night';if(next!==this.period)this.setPeriod(next,false);this.sun.direction.y=-Math.max(.12,Math.sin((h-6)/12*Math.PI)*.8);}
  }
  if(new URLSearchParams(location.search).has('qa')&&this.elapsed>=this.qaNext){this.qaNext=this.elapsed+10;console.info('PAPER_QA',JSON.stringify(this.diagnostics()));}
  this.plane.position.copyFrom(this.position);this.plane.rotation.set(-this.pitch,this.yaw,-this.bank);this.water?.update(this.elapsed);
  if(Vector3.Distance(this.lastDetail,this.position)>45)this.detail();this.updateCamera(dt);
 }
 get clock(){return `${String(Math.floor(this.minutes/60)).padStart(2,'0')}:${String(Math.floor(this.minutes%60)).padStart(2,'0')}`;}
 nearest(){return [...this.places].sort((a,b)=>Math.hypot(a.x-this.position.x,a.z-this.position.z)-Math.hypot(b.x-this.position.x,b.z-this.position.z))[0];}
 diagnostics(){return {ready:this.ready,position:this.position.asArray(),clock:this.clock,photo:this.photo,period:this.period,meshes:this.scene.meshes.length,facades:this.facades?.stats,fps:this.engine.getFps(),places:this.places.length};}
}
