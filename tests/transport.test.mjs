import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchForecast,readJsonResponse,providerURL,ForecastFetchError} from '../lib/forecast-transport.mjs';
import {cityById,normalizeProvider} from '../lib/air-core.mjs';

const hourly={time:['2026-10-13T16:00','2026-10-13T17:00'],pm2_5:[55,48],us_aqi:[145,138],pm10:[83,78]};
const raw={hourly,current:{time:'2026-10-13T16:00',us_aqi:145,pm2_5:55,pm10:83}};
const normalized=normalizeProvider(raw,cityById('lahore'));

test('Proxy success uses server data without direct provider calls',async()=>{
 let attempts=0;
 const data=await fetchForecast('lahore',{fetchImpl:async path=>{attempts++;assert.match(String(path),/^\/api\/air/);return Response.json(normalized)}});
 assert.equal(attempts,1);assert.equal(data.delivery,'AirGuard service');assert.equal(data.current.aqi,145);
});

test('HTML error page at /api/air falls back to real upstream data',async()=>{
 const seen=[];
 const data=await fetchForecast('lahore',{fetchImpl:async path=>{
  seen.push(String(path));
  if(seen.length===1)return new Response('A server error has occurred',{status:500,headers:{'content-type':'text/plain'}});
  return Response.json(raw);
 }});
 assert.equal(seen.length,2);
 assert.match(seen[1],/^https:\/\/air-quality-api.open-meteo.com\//);
 assert.equal(data.delivery,'Direct Open-Meteo');assert.equal(data.fallbackReason,'NON_JSON_RESPONSE');assert.equal(data.current.pm25,55);
});

test('404 HTML on API route is recoverable via provider',async()=>{
 const data=await fetchForecast('lahore',{fetchImpl:async path=>String(path).startsWith('/api/')?
  new Response('<!doctype html>not found',{status:404,headers:{'content-type':'text/html'}}):Response.json(raw)});
 assert.equal(data.delivery,'Direct Open-Meteo');
});

test('Malformed JSON never appears as an unhandled SyntaxError',async()=>{
 const response=new Response('bad json',{status:500,headers:{'content-type':'application/json'}});
 await assert.rejects(()=>readJsonResponse(response),e=>e instanceof ForecastFetchError&&e.code==='INVALID_JSON');
});

test('Both providers failing gives a clear error and never invents forecast',async()=>{
 await assert.rejects(()=>fetchForecast('lahore',{fetchImpl:async()=>new Response('<html>error</html>',{status:502,headers:{'content-type':'text/html'}})}),
  error=>error.code==='BOTH_SOURCES_UNAVAILABLE'&&!/Unexpected token|<html>/.test(error.message));
});

test('Direct provider request uses globally supported CAMS data variables',()=>{
 const url=providerURL(cityById('lahore'));
 assert.equal(url.searchParams.get('domains'),'cams_global');
 assert.match(url.searchParams.get('hourly'),/pm2_5/);
 assert.equal(url.searchParams.get('timezone'),'Asia/Karachi');
});

test('Rejects unsupported city without making network request',async()=>{
 await assert.rejects(()=>fetchForecast('../anything',{fetchImpl:async()=>{throw Error('Should not run')}}),e=>e.code==='UNKNOWN_CITY');
});
