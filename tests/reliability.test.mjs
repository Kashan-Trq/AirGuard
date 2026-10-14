import test from 'node:test';
import assert from 'node:assert/strict';
import {localHour,normalizeProvider,cityById,planWindows,answerQuestion,createLetter} from '../lib/air-core.mjs';
import {fetchForecast,validForecastPayload,ForecastFetchError} from '../lib/forecast-transport.mjs';
const raw={hourly:{time:['2026-10-13T18:00','2026-10-13T19:00','2026-10-13T20:00'],pm2_5:[50,35,20],us_aqi:[120,90,70]},current:{time:'2026-10-13T18:00',pm2_5:50,us_aqi:120}};
const city=cityById('lahore');
test('Malformed dates and time stamps are rejected instead of crashing charts',()=>{
 for(const value of ['2026-02-30T12:00','2026-13-13T17:00','2026-10-13T25:00','tomorrow','2026-01-00T01:00'])assert.equal(localHour(value),null);
 assert.equal(localHour('2026-10-13T18:00'),'2026-10-13T18:00');
 const bad={...raw,hourly:{...raw.hourly,time:['2026-02-30T12:00','2026-10-13T19:00']}};
 assert.equal(normalizeProvider(bad,city).points.length,1);
});
test('Current readings never silently inherit invalid provider values',()=>{
 const r={...raw,current:{time:'2026-10-13T18:00',pm2_5:-3,us_aqi:-10}};
 const result=normalizeProvider(r,city);
 assert.equal(result.current.aqi,null);
 assert.equal(result.current.pm25,null);
});
test('Partial hourly-only response uses a labeled forecast value and never invents a sensor',()=>{
 const now=new Date().toLocaleString('sv-SE',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).replace(' ','T')+':00';
 const data=normalizeProvider({hourly:{time:[now],pm2_5:[31],us_aqi:[81]}},city);
 assert.equal(data.current.method,'nearest hourly model forecast');assert.equal(data.current.pm25,31);
});
test('Forecast response shape validator rejects poisoned cache and unrealistic negative entries',()=>{
 const data=normalizeProvider(raw,city);
 assert.equal(validForecastPayload(data,'lahore'),true);
 assert.equal(validForecastPayload({...data,current:{...data.current,aqi:NaN}},'lahore'),false);
 assert.equal(validForecastPayload({...data,points:[{...data.points[0],pm25:-500}]},'lahore'),false);
 assert.equal(validForecastPayload({...data,receivedAt:'not a date'},'lahore'),false);
 assert.equal(validForecastPayload({...data,cityId:'karachi'},'lahore'),false);
});
test('API timeout leaves a fresh time budget for direct-provider fallback',async()=>{
 let calls=0;
 const signalLog=[];
 const normalized=await fetchForecast('lahore',{serviceTimeoutMs:15,providerTimeoutMs:90,fetchImpl:(url,{signal})=>{
  calls++;
  if(calls===1){return new Promise((_,reject)=>signal.addEventListener('abort',()=>{signalLog.push(signal.aborted);reject(new Error('service deadline'))},{once:true}));}
  return Promise.resolve(Response.json(raw));
 }});
 assert.equal(calls,2);assert.equal(normalized.delivery,'Direct Open-Meteo');assert.deepEqual(signalLog,[true]);
});
test('Already cancelled and mid-flight cancelled fetches never invoke direct fallback',async()=>{
 const ac=new AbortController();ac.abort();let calls=0;
 await assert.rejects(()=>fetchForecast('lahore',{signal:ac.signal,fetchImpl:async()=>{calls++;return Response.json(raw)}}),e=>e.code==='ABORTED');
 assert.equal(calls,0);
 const controller=new AbortController();
 const promise=fetchForecast('lahore',{signal:controller.signal,fetchImpl:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true}))});
 controller.abort();await assert.rejects(promise); 
});
test('Planner excludes windows ending after requested horizon',()=>{
 const data=normalizeProvider(raw,city);const now=new Date('2026-10-13T12:30:00Z');
 const plan=planWindows(data,{activity:'school',duration:2,horizon:6,now});
 assert.ok(plan.ranked.every(item=>new Date(item.end).getTime()<=now.getTime()+6*3600000));
});
test('Q&A does not invent data for missing forecasts',()=>{
 const r=answerQuestion('Is tomorrow less polluted?',null,new Date('2026-10-13T13:00:00Z'));
 assert.equal(r.intent,'data');assert.match(r.body,/unavailable/i);
});
test('English and Urdu institution letters disclose the modeled source',()=>{
 for(const language of ['english','urdu']){
  const result=createLetter({language,audience:'school',city:'Lahore',aqi:110,cached:true});
  assert.ok(result.includes('AirGuard'));assert.ok(result.length>180);
 }
});
