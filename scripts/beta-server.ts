import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import path from 'node:path';
import {validBuildId} from './beta-build';

const MIME:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.txt':'text/plain; charset=utf-8'};
function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function betaAsset(root:string,url:string):string|null{
 let name:string;try{name=decodeURIComponent(url.split('?')[0]);}catch{return null;}
 if(!name.startsWith('/builds/')||/[\\\0:]/.test(name)||name.split('/').some(s=>s.startsWith('.')))return null;
 const parts=name.split('/');if(!validBuildId(parts[2]))return null;
 if(name.endsWith('/'))name+='index.html';
 const file=path.resolve(root,'.'+name),rel=path.relative(root,file);
 return rel&&!rel.startsWith('..')&&!path.isAbsolute(rel)?file:null;
}
export function byteRange(value:string|undefined,size:number):{start:number;end:number}|null|false{
 if(!value)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(value);
 if(!match||(!match[1]&&!match[2]))return false;
 const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 const end=match[1]?(match[2]?Math.min(Number(match[2]),size-1):size-1):size-1;
 return Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<size&&end>=start?{start,end}:false;
}
export function createBetaHandler(root:string,key:string,port:()=>number,studioPort=5187){
 const cookieName='nuvori-beta-session',session=randomBytes(32).toString('hex');
 return async(req:IncomingMessage,res:ServerResponse)=>{
  const host=`127.0.0.1:${port()}`,origin=`http://${host}`;
  const finish=(code:number,message:string)=>{res.statusCode=code;res.end(message);};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  if(req.headers.host!==host||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??''))return finish(403,'Private beta: localhost only.');
  const route=(req.url??'/').split('?')[0];
  if(route==='/__unlock'&&req.method==='POST'){
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/json')return finish(403,'Invalid launch request.');
   let body='';for await(const chunk of req){body+=chunk.toString();if(body.length>512)return finish(413,'Launch request too large.');}
   try{if(!equal(JSON.parse(body).key??'',key))return finish(403,'Launch link expired.');}catch{return finish(400,'Invalid launch request.');}
   res.setHeader('Set-Cookie',`${cookieName}=${session}; HttpOnly; SameSite=Strict; Path=/`);return finish(200,'Ready');
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.setHeader('Allow','GET, HEAD');return finish(405,'Method not allowed.');}
  if(route==='/launch'||route==='/'){
   const nonce=randomBytes(16).toString('hex');
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors http://127.0.0.1:${studioPort}`);
   return res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nuvori · Private beta</title><body style="background:#102a28;color:#e9dfbd;font:18px system-ui;display:grid;place-items:center;min-height:90vh"><p id="message" role="status">Opening your private adventure…</p><script nonce="${nonce}">const match=/^#([a-f0-9]{64}):([a-f0-9]{12}-[a-f0-9]{12})$/.exec(location.hash);history.replaceState(null,'',location.pathname);if(!match)document.getElementById('message').textContent='Open Play Beta in your Nuvori World Studio to start.';else fetch('/__unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:match[1]})}).then(r=>{if(!r.ok)throw Error();location.replace('/builds/'+match[2]+'/');}).catch(()=>{document.getElementById('message').textContent='This launch link expired. Reopen Play Beta from the studio.';});</script></body></html>`);
  }
  const cookies=req.headers.cookie??'',provided=cookies.split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)??'';
  if(!equal(provided,session))return finish(403,'Open this game through your private Play Beta space.');
  const file=betaAsset(root,req.url??'');if(!file)return finish(404,'Not found.');
  try{
   const resolved=await realpath(file),base=await realpath(root),rel=path.relative(base,resolved);
   if(rel.startsWith('..')||path.isAbsolute(rel))return finish(404,'Not found.');
   const info=await stat(resolved);if(!info.isFile()||!MIME[path.extname(file).toLowerCase()])return finish(404,'Not found.');
   const range=byteRange(req.headers.range,info.size);
   res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Type',MIME[path.extname(file).toLowerCase()]);
   res.setHeader('Content-Security-Policy',`frame-ancestors http://127.0.0.1:${studioPort}`);
   if(range===false){res.setHeader('Content-Range',`bytes */${info.size}`);return finish(416,'Invalid byte range.');}
   if(range){res.statusCode=206;res.setHeader('Content-Range',`bytes ${range.start}-${range.end}/${info.size}`);}
   res.setHeader('Content-Length',range?range.end-range.start+1:info.size);
   if(req.method==='HEAD')return res.end();
   const stream=createReadStream(resolved,range||undefined);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch{return finish(404,'Not found.');}
 };
}
export async function startBetaServer(root:string,key:string,port=5188){
 const server=createServer((req,res)=>{void handler(req,res).catch(()=>{if(!res.headersSent)res.statusCode=500;res.end('Could not load the beta.');});});
 const handler=createBetaHandler(root,key,()=>port);
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 return server;
}
