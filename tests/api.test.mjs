import test from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../api/air.js';
import {GET as HEALTH} from '../api/health.js';
const request=city=>new Request(`https://airguard.example/api/air?city=${encodeURIComponent(city)}`);
const provider={current:{time:'2026-10-13T16:00',us_aqi:146,pm2_5:55,pm10:110},hourly:{time:['2026-10-13T16:00'],us_aqi:[146],pm2_5:[55],pm10:[110]}};

test('Vercel GET route validates city and returns JSON with no upstream request',async()=>{
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Unexpected network call')};
 try{
  const response=await GET(request('../evil'));assert.equal(response.status,400);assert.match(response.headers.get('content-type'),/json/);
  assert.equal((await response.json()).code,'UNKNOWN_CITY');
  const method=POST();assert.equal(method.status,405);assert.equal((await method.json()).code,'METHOD_NOT_ALLOWED');
  assert.equal(calls,0);
 }finally{globalThis.fetch=previous;}
});

test('Vercel GET produces genuine normalized forecast and server cache headers',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async(url)=>{
  const params=new URL(url).searchParams;
  assert.equal(params.get('domains'),'cams_global');assert.equal(params.get('timezone'),'Asia/Karachi');
  return Response.json(provider);
 };
 try{
  const response=await GET(request('lahore'));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/s-maxage/);
  const payload=await response.json();assert.equal(payload.current.pm25,55);assert.equal(payload.points[0].aqi,146);
  assert.equal(payload.modelBased,true);
 }finally{globalThis.fetch=previous;}
});

test('Vercel returns JSON 503 when upstream fails or sends HTML',async()=>{
 const previous=globalThis.fetch,logger=console.error;console.error=()=>{};
 try{
  for(const scenario of [async()=>{throw Error('Network unreachable')},async()=>new Response('<html>error</html>',{status:500,headers:{'content-type':'text/html'}})]){
   globalThis.fetch=scenario;
   const response=await GET(request('lahore'));assert.equal(response.status,503);
   assert.match(response.headers.get('content-type'),/json/);
   const body=await response.json();assert.equal(body.code,'UPSTREAM_UNAVAILABLE');assert.equal('current' in body,false);
  }
 }finally{globalThis.fetch=previous;console.error=logger;}
});

test('Health API is accessible without third-party data',async()=>{
 const result=await HEALTH();assert.equal(result.status,200);
 const json=await result.json();assert.equal(json.status,'ok');assert.equal(json.apiRoute,'ready');
});
