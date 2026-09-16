import test from 'node:test';
import assert from 'node:assert/strict';
import {NullEngine,Scene,TransformNode,Vector3,VertexBuffer} from '@babylonjs/core';
import {PaperTrail} from '../src/paper-trail.ts';
test('Wing trails stay bounded, expire at rest, and clear in photo mode',()=>{
 const engine=new NullEngine(),scene=new Scene(engine),plane=new TransformNode('plane',scene),trail=new PaperTrail(scene);
 const camera=new Vector3(0,9,-28);
 for(let i=0;i<600;i++){plane.position.z=i*.8;trail.update(1/60,plane,camera,true,false);}
 assert.equal(scene.meshes.length,2);
 for(const mesh of scene.meshes){assert.equal(mesh.getTotalVertices(),128);assert.ok(mesh.getVerticesData(VertexBuffer.ColorKind)!.some((v,i)=>i%4===3&&v>0));assert.ok(mesh.getVerticesData(VertexBuffer.PositionKind)!.every(Number.isFinite));}
 for(let i=0;i<120;i++)trail.update(1/60,plane,camera,false,false);
 for(const mesh of scene.meshes)assert.ok(mesh.getVerticesData(VertexBuffer.ColorKind)!.every((v,i)=>i%4!==3||v===0));
 trail.update(.016,plane,camera,true,true);
 assert.ok(scene.meshes.every(m=>!m.isEnabled()));
 trail.update(.016,plane,camera,false,false);
 assert.ok(scene.meshes.every(m=>m.getVerticesData(VertexBuffer.ColorKind)!.every((v,i)=>i%4!==3||v===0)));
 scene.dispose();engine.dispose();
});
