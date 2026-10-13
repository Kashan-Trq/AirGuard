import {CITIES,cityById,normalizeProvider} from '../lib/air-core.mjs';
const allowCorsHost = () => undefined; // Same-origin API; no permissive CORS needed.
export default async function handler(req,res){
 if(req.method!=='GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'Method not allowed'});}
 const cityId=typeof req.query?.city==='string'?req.query.city:'lahore';
 const city=cityById(cityId);
 if(!city)return res.status(400).json({error:`Unknown city. Choose from: ${CITIES.map(c=>c.id).join(', ')}`});
 const api=new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
 api.searchParams.set('latitude',String(city.lat));api.searchParams.set('longitude',String(city.lon));
 api.searchParams.set('hourly','us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,dust');
 api.searchParams.set('current','us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone');
 api.searchParams.set('forecast_days','5');api.searchParams.set('timezone','Asia/Karachi');api.searchParams.set('domains','cams_global');
 try{
  const upstream=await fetch(api,{signal:AbortSignal.timeout(12000),headers:{'Accept':'application/json'}});
  if(!upstream.ok)throw new Error(`Provider returned ${upstream.status}`);
  const body=await upstream.json();const response=normalizeProvider(body,city);
  res.setHeader('Cache-Control','public, s-maxage=900, stale-while-revalidate=900');
  res.setHeader('X-Content-Type-Options','nosniff');
  return res.status(200).json(response);
 }catch(err){
  console.error('AirGuard upstream failure:',err instanceof Error?err.message:'unknown');
  res.setHeader('Cache-Control','no-store');
  return res.status(503).json({error:'Forecast source temporarily unavailable. AirGuard will not invent readings.',code:'UPSTREAM_UNAVAILABLE'});
 }
}
