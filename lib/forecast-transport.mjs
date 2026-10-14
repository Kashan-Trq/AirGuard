import {cityById,normalizeProvider} from './air-core.mjs';

export const API_PATH='/api/air';
export const PROVIDER_ORIGIN='https://air-quality-api.open-meteo.com';

export function providerURL(city) {
  const known=cityById(city?.id);
  if(!known) throw new Error('Unknown city');
  const url=new URL('/v1/air-quality',PROVIDER_ORIGIN);
  url.searchParams.set('latitude',String(known.lat));
  url.searchParams.set('longitude',String(known.lon));
  url.searchParams.set('hourly','us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,dust');
  url.searchParams.set('current','us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone');
  url.searchParams.set('forecast_days','5');
  url.searchParams.set('timezone','Asia/Karachi');
  url.searchParams.set('domains','cams_global');
  return url;
}

export class ForecastFetchError extends Error {
 constructor(message,code='FETCH_FAILED',status=0){super(message);this.name='ForecastFetchError';this.code=code;this.status=status;}
}

export async function readJsonResponse(response,{label='Forecast service'}={}){
  const contentType=response.headers?.get?.('content-type')||'';
  const status=Number(response.status)||0;
  if(!contentType.toLowerCase().includes('json')) {
    // HTML error pages must never be fed to JSON.parse() or displayed as raw HTML.
    throw new ForecastFetchError(`${label} returned ${status||'an error'} instead of JSON.`,`NON_JSON_RESPONSE`,status);
  }
  let json;
  try {json=await response.json();}
  catch {throw new ForecastFetchError(`${label} returned malformed JSON.`,`INVALID_JSON`,status);}
  if(!response.ok) {
    const permittedMessage=typeof json?.error==='string'?json.error.slice(0,220):`${label} responded with HTTP ${status}.`;
    throw new ForecastFetchError(permittedMessage,typeof json?.code==='string'?json.code:'HTTP_ERROR',status);
  }
  if(!json || typeof json!=='object')throw new ForecastFetchError(`${label} returned an invalid data object.`,'INVALID_SHAPE',status);
  return json;
}

/** Use separate time budgets for API and direct-provider requests.
 * A failed first attempt must not consume the second attempt's timeout. */
async function attemptFetch(fetchImpl,url,{signal,timeoutMs,force}) {
  const controller=new AbortController();
  const onAbort=()=>controller.abort(signal?.reason);
  if(signal?.aborted)onAbort();
  else signal?.addEventListener('abort',onAbort,{once:true});
  const timer=setTimeout(()=>controller.abort(new Error('Request timed out')),timeoutMs);
  try {return await fetchImpl(url,{signal:controller.signal,cache:force?'no-store':'default',headers:{Accept:'application/json'}});}
  finally {clearTimeout(timer);signal?.removeEventListener('abort',onAbort);}
}

export function validForecastPayload(json,cityId){
  if(json?.modelBased!==true||json?.cityId!==cityId||!Array.isArray(json.points)||!json.current) return false;
  if(typeof json.receivedAt!=='string'||!Number.isFinite(Date.parse(json.receivedAt)))return false;
  if(!['aqi','pm25','pm10','no2','ozone'].every(k=>json.current[k]===null||json.current[k]===undefined||(typeof json.current[k]==='number'&&Number.isFinite(json.current[k])&&json.current[k]>=0)))return false;
  if(json.current.time!==null&&json.current.time!==undefined&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(json.current.time))return false;
  if(!json.points.some(p=>p && typeof p.time==='string' && (Number.isFinite(p.pm25)||Number.isFinite(p.aqi))))return false;
  return json.points.every(p=>p && typeof p.time==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(p.time) &&
    ['pm25','pm10','no2','ozone','dust','aqi'].every(k=>p[k]===null||p[k]===undefined||(typeof p[k]==='number'&&Number.isFinite(p[k])&&p[k]>=0)));
}

/** Prefer our server function, then fall back to direct Open-Meteo.
 * Both routes use genuine forecast data; neither substitutes fake observations. */
export async function fetchForecast(cityId,{fetchImpl=globalThis.fetch,signal,force=false,serviceTimeoutMs=6500,providerTimeoutMs=9500}={}){
  const city=cityById(cityId);
  if(!city)throw new ForecastFetchError('The selected city is not supported.','UNKNOWN_CITY');
  if(signal?.aborted)throw new ForecastFetchError('Forecast request cancelled.','ABORTED');
  let serviceError;
  try {
    const path=`${API_PATH}?city=${encodeURIComponent(cityId)}`;
    const response=await attemptFetch(fetchImpl,path,{signal,timeoutMs:serviceTimeoutMs,force});
    const json=await readJsonResponse(response,{label:'AirGuard data service'});
    if(!validForecastPayload(json,cityId))throw new ForecastFetchError('AirGuard data service returned incomplete forecast data.','INVALID_SHAPE');
    return {...json,delivery:'AirGuard service',fallbackReason:null};
  }catch(error){if(signal?.aborted)throw error;serviceError=error;}
  try {
    const response=await attemptFetch(fetchImpl,providerURL(city),{signal,timeoutMs:providerTimeoutMs,force});
    const raw=await readJsonResponse(response,{label:'Open-Meteo data source'});
    const normalized=normalizeProvider(raw,city);
    if(!validForecastPayload(normalized,cityId))throw new ForecastFetchError('The provider returned no usable pollutant readings.','NO_DATA');
    return {...normalized,delivery:'Direct Open-Meteo',fallbackReason:serviceError?.code||'SERVICE_UNAVAILABLE'};
  }catch(error){
    if(signal?.aborted)throw error;
    throw new ForecastFetchError('Forecast temporarily unavailable through both the AirGuard service and Open-Meteo. Check your connection or retry shortly.','BOTH_SOURCES_UNAVAILABLE');
  }
}
