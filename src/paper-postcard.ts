export const MAX_NOTE=140;
export const cleanNote=(value:string)=>Array.from(value.replace(/\r/g,'')).slice(0,MAX_NOTE).join('').trim();
export function wrapNote(text:string,maxWidth:number,measure:(s:string)=>number){
 const lines:string[]=[];
 for(const paragraph of cleanNote(text).split('\n')){let line='';for(const char of Array.from(paragraph)){if(line&&measure(line+char)>maxWidth){lines.push(line);line=char;}else line+=char;}lines.push(line);}
 return lines;
}
export async function composePostcard(base:Blob,note:string,name:string,clock:string){
 const bitmap=await createImageBitmap(base);const canvas=document.createElement('canvas');canvas.width=bitmap.width;
 const ctx=canvas.getContext('2d')!,font=Math.max(15,Math.round(bitmap.width*.014));ctx.font=`${font}px sans-serif`;
 const pad=Math.round(bitmap.width*.035),lines=cleanNote(note)?wrapNote(note,bitmap.width-pad*2,s=>ctx.measureText(s).width):[];
 const band=Math.max(75,Math.round(bitmap.height*.10))+lines.length*font*1.65;
 canvas.height=bitmap.height+Math.ceil(band);ctx.drawImage(bitmap,0,0);bitmap.close();
 ctx.fillStyle='#f6f2e7';ctx.fillRect(0,canvas.height-band,canvas.width,band);ctx.fillStyle='#334f49';ctx.font=`${font}px sans-serif`;
 const top=canvas.height-band;ctx.fillText(`先抵达 / ${name}`,pad,top+font*1.8);
 ctx.font=`${Math.max(11,font*.73)}px sans-serif`;ctx.fillStyle='#7a8677';ctx.fillText(`游戏时间 ${clock}`,pad,top+font*3.1);
 ctx.font=`${font}px sans-serif`;ctx.fillStyle='#42594e';lines.forEach((line,i)=>ctx.fillText(line,pad,top+font*(4.8+i*1.65)));
 return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('image encoding failed')),'image/jpeg',.94));
}
