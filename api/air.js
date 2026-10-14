import {CITIES,cityById,normalizeProvider} from '../lib/air-core.mjs';
import {providerURL,readJsonResponse} from '../lib/forecast-transport.mjs';

const json=(body,status=200,cache='no-store')=>Response.json(body,{status,headers:{'Cache-Control':cache,'X-Content-Type-Options':'nosniff'}});

// Vercel's native Web Request / Response function format. Every handled response is JSON.
export async function GET(request){
 try{
  const url=new URL(request.url);
  const cityId=url.searchParams.get('city')||'lahore';
  const city=cityById(cityId);
  if(!city)return json({error:`Unknown city. Choose from: ${CITIES.map(c=>c.id).join(', ')}`,code:'UNKNOWN_CITY'},400);
  const signal=AbortSignal.timeout(8500);
  try{
   const upstream=await fetch(providerURL(city),{headers:{Accept:'application/json'},signal});
   const raw=await readJsonResponse(upstream,{label:'Open-Meteo data source'});
   const result=normalizeProvider(raw,city);
   if(!result.points.some(p=>p.pm25!==null||p.aqi!==null))return json({error:'Provider returned no usable readings.',code:'NO_DATA'},503);
   return json(result,200,'public, s-maxage=900, stale-while-revalidate=900');
  }catch(error){
   console.error('AirGuard provider error:',error?.code||error?.name||'UNKNOWN');
   return json({error:'The forecast source is temporarily unavailable. No readings have been invented.',code:'UPSTREAM_UNAVAILABLE'},503);
  }
 }catch{
  return json({error:'Unable to process forecast request.',code:'REQUEST_ERROR'},500);
 }
}
export function POST(){return json({error:'Only GET is supported.',code:'METHOD_NOT_ALLOWED'},405);}
