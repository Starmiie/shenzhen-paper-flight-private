// Geometry helpers retained from GTA_SZ; no gameplay dependencies.
import type {V2} from './city-types.ts';
export const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function closest(x:number,z:number,a:V2,b:V2){const dx=b[0]-a[0],dz=b[1]-a[1];const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);const px=a[0]+dx*t,pz=a[1]+dz*t;return {x:px,z:pz,d:Math.hypot(x-px,z-pz),t};}
export function inRing(x:number,z:number,ring:V2[]){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
