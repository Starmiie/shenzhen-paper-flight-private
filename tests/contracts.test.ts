import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {closest,inRing} from '../src/paper-geometry.ts';
const read=(p:string)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('All retained upstream city assets are hydrated and match the delivery hashes',()=>{
 const manifest=JSON.parse(read('provenance/asset-inventory.json'));
 for(const a of manifest.assets){const b=readFileSync(new URL('../public/'+a.file,import.meta.url));assert.equal(b.length,a.bytes,a.file);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256,a.file);assert.ok(!b.toString('utf8',0,80).startsWith('version https://git-lfs'),a.file);}
});
test('All original 10 places and added landmark records retain original map coordinates',()=>{
 const data=JSON.parse(read('public/city/city.json')),detail=JSON.parse(read('public/city/landmark-detail.json'));
 assert.equal(data.landmarks.length,10);const ps=new Map(data.landmarks.map((p:any)=>[p.id,p]));for(const p of detail.landmarks)ps.set(p.id,p);
 assert.ok(ps.size===13);
 for(const p of ps.values() as Iterable<any>){assert.ok(Number.isFinite(p.lon)&&Number.isFinite(p.lat),p.id);assert.ok(Math.abs((p.lon-114.025)*102850*.6-p.x)<2,p.id+' east');assert.ok(Math.abs((p.lat-22.536)*111320*.6-p.z)<2,p.id+' north');}
});
test('No driving, human, traffic, combat or life-system modules ship in the source entry graph',()=>{
 const files=readdirSync(new URL('../src/',import.meta.url));assert.ok(files.includes('paper-world.ts'));
 for(const f of files){assert.doesNotMatch(f,/^(driving|traffic|pedestrians|city-(?:walk|flight|tank|rider|life|career|cafe|cockpit|vehicle|autopilot|audio))/);const code=read('src/'+f);assert.doesNotMatch(code,/import[^\n]*['"]\.\/(?:driving|traffic|pedestrians|city-(?:walk|flight|tank|rider|life|career|cafe|vehicle|autopilot))/);}
 for(const p of ['car.glb','traffic-car.glb','floatplane.glb','pedestrian.glb','tank','rider','life-hub','bamboo-cafe'])assert.equal(existsSync(new URL('../public/city/'+p,import.meta.url)),false,p);
});
test('Pure retained geometry helpers handle degenerate road segments and polygon containment',()=>{
 assert.deepEqual(closest(4,3,[0,0],[0,0]),{x:0,z:0,d:5,t:0});assert.equal(closest(5,3,[0,0],[10,0]).d,3);
 assert.equal(inRing(2,2,[[0,0],[4,0],[4,4],[0,4]]),true);assert.equal(inRing(7,2,[[0,0],[4,0],[4,4],[0,4]]),false);
});

test('Landscape and facade manifests resolve to packaged model files',()=>{
 for(const dir of ['landscape','open-vegetation'])for(const m of JSON.parse(read('public/city/'+dir+'/manifest.json')).models)assert.ok(existsSync(new URL('../public/city/'+dir+'/'+m.file,import.meta.url)),m.file);
 for(const t of JSON.parse(read('public/city/facade-tiles.json')).tiles)assert.ok(existsSync(new URL('../public/city/facade-tiles/'+t.id+'.glb',import.meta.url)),t.id);
});
