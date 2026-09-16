import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoute} from '../src/paper-route.ts';
import {wrapNote,cleanNote} from '../src/paper-postcard.ts';
import {TECH_PLACES,isTravelPlace} from '../src/paper-tech.ts';
import {smoothFade} from '../src/paper-stability.ts';
test('Route clears intervening high rooftops and preserves start and viewing endpoint',()=>{
 const start:[number,number,number]=[0,80,0],end:[number,number,number]=[1200,100,0];
 const route=makeRoute(start,end,(x)=>x>480&&x<520?310:0);
 assert.deepEqual(route[0],start);assert.deepEqual(route.at(-1),end);assert.ok(route[1][1]>=355);assert.ok(route.every(p=>p.every(Number.isFinite)));
});
test('Caption layout preserves unicode and explicit newlines within the output width',()=>{
 const input='在这里，慢下来。\n风会记得🌿';const lines=wrapNote(input,6,s=>Array.from(s).length);
 assert.equal(lines.join(''),input.replace(/\n/g,''));assert.ok(lines.every(s=>Array.from(s).length<=6));assert.equal(Array.from(cleanNote('🌿'.repeat(150))).length,140);
});
test('Added company locations use the same WGS84 conversion and malls are not destinations',()=>{
 for(const p of TECH_PLACES){assert.ok(Math.abs(p.x-(p.lon!-114.025)*102850*.6)<.001);assert.ok(Math.abs(p.z-(p.lat!-22.536)*111320*.6)<.001);assert.ok(isTravelPlace(p));}
 assert.equal(isTravelPlace({id:'mixc-world'} as any),false);
});
test('Detail LOD smoothly and monotonically retires subpixel geometry',()=>{let previous=1;for(let d=0;d<600;d++){const a=smoothFade(d,150,450);assert.ok(a<=previous&&a>=0&&a<=1);previous=a;}assert.equal(smoothFade(451,150,450),0);});
