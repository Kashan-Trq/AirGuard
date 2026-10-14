import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GET,POST} from '../api/air.js';
import {GET as HEALTH} from '../api/health.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.txt':'text/plain; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/air'||url.pathname==='/api/health'){
  const request=new Request('http://127.0.0.1:'+ (process.env.PORT||3000) + req.url,{method:req.method});
  const out=url.pathname==='/api/health'?await HEALTH(request):req.method==='GET'?await GET(request):await POST(request);
  res.writeHead(out.status,Object.fromEntries(out.headers));res.end(await out.text());return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method not allowed');return;}
 try{
  let requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const absolute=path.resolve(root,'.'+requested);
  if(absolute!==root&&!absolute.startsWith(root+path.sep))throw new Error('Disallowed path');
  const fileStat=await stat(absolute);if(!fileStat.isFile())throw new Error('Not a file');
  res.setHeader('Content-Type',types[path.extname(absolute)]||'application/octet-stream');
  res.setHeader('Cache-Control','no-cache');
  if(req.method==='HEAD'){res.end();return;}
  res.end(await readFile(absolute));
 }catch{res.writeHead(404,{'content-type':'text/plain'});res.end('Not found');}
});
const port=Number(process.env.PORT)||3000;
server.listen(port,'127.0.0.1',()=>console.log(`AirGuard at http://127.0.0.1:${port}`));
