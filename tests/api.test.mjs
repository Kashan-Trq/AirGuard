import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/air.js';
const makeResponse=()=>({code:200,headers:{},payload:null,setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(value){this.payload=value;return this;}});
test('Serverless API validates city and HTTP method without fetching data',async()=>{
 let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;throw Error('Not expected')};
 try{
  const unsupported=makeResponse();await handler({method:'GET',query:{city:'../../evil'}},unsupported);assert.equal(unsupported.code,400);
  const wrongMethod=makeResponse();await handler({method:'POST',query:{city:'lahore'}},wrongMethod);assert.equal(wrongMethod.code,405);
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;}
});
test('API returns normalized actual provider payload and cache headers',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{const parsed=new URL(url);assert.equal(parsed.searchParams.get('domains'),'cams_global');assert.equal(parsed.searchParams.get('timezone'),'Asia/Karachi');return {ok:true,json:async()=>({current:{time:'2026-10-13T16:00',us_aqi:146,pm2_5:55,pm10:110},hourly:{time:['2026-10-13T16:00'],us_aqi:[146],pm2_5:[55],pm10:[110]}})};};
 try{const res=makeResponse();await handler({method:'GET',query:{city:'lahore'}},res);assert.equal(res.code,200);assert.equal(res.payload.current.pm25,55);assert.equal(res.payload.points[0].aqi,146);assert.match(res.headers['Cache-Control'],/s-maxage/);}finally{globalThis.fetch=original;}
});
test('On upstream outage the API fails closed with no fabricated readings',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('Temporary outage')};
 const previous=console.error;console.error=()=>{};
 try{const res=makeResponse();await handler({method:'GET',query:{city:'lahore'}},res);assert.equal(res.code,503);assert.equal(res.payload.code,'UPSTREAM_UNAVAILABLE');assert.ok(!('current' in res.payload));}finally{globalThis.fetch=original;console.error=previous;}
});
