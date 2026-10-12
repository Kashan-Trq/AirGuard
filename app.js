const LAHORE = { lat: 31.5204, lon: 74.3587, label: 'Lahore, Pakistan' };
const state = { hours: [], weather: [], duration: 45, source: 'live' };

const $ = (id) => document.getElementById(id);
const fmtHour = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
const round = (v, d=0) => Number(v).toFixed(d);

function toast(message){
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2600);
}

function relativeBand(pm, values){
  const sorted=[...values].sort((a,b)=>a-b);
  const q1=sorted[Math.floor(sorted.length*.25)] ?? pm;
  const q3=sorted[Math.floor(sorted.length*.75)] ?? pm;
  if(pm<=q1) return 'Lower relative exposure';
  if(pm>=q3) return 'Higher relative exposure';
  return 'Mid-range exposure';
}

async function fetchData(){
  $('sourceStatus').textContent='Loading live data…';
  try{
    const tz='Asia/Karachi';
    const aqUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    aqUrl.search = new URLSearchParams({
      latitude: LAHORE.lat, longitude: LAHORE.lon,
      hourly: 'pm2_5,pm10,us_aqi,nitrogen_dioxide',
      current: 'pm2_5,pm10,us_aqi', timezone: tz, forecast_days: '3'
    }).toString();
    const wxUrl = new URL('https://api.open-meteo.com/v1/forecast');
    wxUrl.search = new URLSearchParams({
      latitude: LAHORE.lat, longitude: LAHORE.lon,
      hourly: 'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,surface_pressure',
      current: 'temperature_2m,relative_humidity_2m,wind_speed_10m', timezone: tz, forecast_days: '3'
    }).toString();
    const [aqRes, wxRes] = await Promise.all([fetch(aqUrl), fetch(wxUrl)]);
    if(!aqRes.ok || !wxRes.ok) throw new Error('Live data request failed');
    const [aq, wx] = await Promise.all([aqRes.json(), wxRes.json()]);
    hydrate(aq, wx);
    state.source='live';
    $('sourceStatus').textContent='Live modeled forecast';
    document.querySelector('.dot').style.background='#8ff0c9';
  } catch(err){
    console.error(err);
    hydrateDemo();
    state.source='demo';
    $('sourceStatus').textContent='Demo fallback data';
    document.querySelector('.dot').style.background='#ffcc72';
    toast('Live source unavailable — showing clearly labeled demo data.');
  }
}

function hydrate(aq, wx){
  const weatherByTime = new Map(wx.hourly.time.map((t,i)=>[t,{
    temp:wx.hourly.temperature_2m[i], humidity:wx.hourly.relative_humidity_2m[i],
    wind:wx.hourly.wind_speed_10m[i], rain:wx.hourly.precipitation[i], pressure:wx.hourly.surface_pressure[i]
  }]));
  state.hours = aq.hourly.time.map((time,i)=>({
    time, pm25:aq.hourly.pm2_5[i], pm10:aq.hourly.pm10[i], aqi:aq.hourly.us_aqi[i], no2:aq.hourly.nitrogen_dioxide[i],
    ...(weatherByTime.get(time)||{})
  })).filter(x=>Number.isFinite(x.pm25));
  const current={pm25:aq.current?.pm2_5,aqi:aq.current?.us_aqi,temp:wx.current?.temperature_2m,humidity:wx.current?.relative_humidity_2m,wind:wx.current?.wind_speed_10m};
  render(current);
}

function hydrateDemo(){
  const now=new Date(); now.setMinutes(0,0,0);
  state.hours=Array.from({length:72},(_,i)=>{
    const t=new Date(now.getTime()+i*3600000); const h=t.getHours();
    const wave=58+34*Math.cos((h-8)/24*Math.PI*2)+12*Math.sin(i/8);
    return {time:t.toISOString(),pm25:Math.max(18,Math.round(wave)),pm10:Math.max(35,Math.round(wave*1.35)),aqi:null,no2:null,temp:22+7*Math.sin((h-7)/24*Math.PI*2),humidity:55+18*Math.cos((h-5)/24*Math.PI*2),wind:7+5*Math.sin((h-11)/24*Math.PI*2),rain:0,pressure:1007};
  });
  const x=state.hours[0]; render({pm25:x.pm25,aqi:null,temp:x.temp,humidity:x.humidity,wind:x.wind});
}

function render(current){
  const vals=state.hours.slice(0,24).map(x=>x.pm25);
  $('currentPm').textContent=Number.isFinite(current.pm25)?round(current.pm25):'—';
  $('currentAqi').textContent=Number.isFinite(current.aqi)?`US AQI ${round(current.aqi)}`:'US AQI unavailable';
  $('currentTemp').textContent=Number.isFinite(current.temp)?`${round(current.temp)}°C`:'—';
  $('currentHumidity').textContent=Number.isFinite(current.humidity)?`${round(current.humidity)}%`:'—';
  $('currentWind').textContent=Number.isFinite(current.wind)?`${round(current.wind)} km/h`:'—';
  $('updatedAt').textContent=`Updated ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
  $('relativeBand').textContent=relativeBand(current.pm25, vals);
  drawChart(state.hours.slice(0,24));
  renderInsights(state.hours.slice(0,24));
  populatePlanner();
}

function renderInsights(hours){
  const low=hours.reduce((a,b)=>a.pm25<b.pm25?a:b), high=hours.reduce((a,b)=>a.pm25>b.pm25?a:b);
  $('lowestHour').textContent=fmtHour(low.time); $('lowestPm').textContent=`${round(low.pm25)} µg/m³ PM2.5`;
  $('highestHour').textContent=fmtHour(high.time); $('highestPm').textContent=`${round(high.pm25)} µg/m³ PM2.5`;
  $('variability').textContent=`${round(high.pm25-low.pm25)} µg/m³`;
  const vals=hours.map(x=>x.pm25).sort((a,b)=>a-b); const med=vals[Math.floor(vals.length/2)];
  $('chartMin').textContent=`Lowest: ${round(low.pm25)} µg/m³`;
  $('chartMax').textContent=`Highest: ${round(high.pm25)} µg/m³`;
  $('chartMedian').textContent=`Median: ${round(med)} µg/m³`;
}

function drawChart(hours){
  const canvas=$('pmChart'); const ctx=canvas.getContext('2d');
  const dpr=window.devicePixelRatio||1; const cssW=canvas.clientWidth||1000, cssH=canvas.clientHeight||320;
  canvas.width=cssW*dpr; canvas.height=cssH*dpr; ctx.scale(dpr,dpr); ctx.clearRect(0,0,cssW,cssH);
  const pad={l:44,r:14,t:18,b:34}; const w=cssW-pad.l-pad.r, h=cssH-pad.t-pad.b;
  const vals=hours.map(x=>x.pm25); const max=Math.max(...vals)*1.12, min=Math.max(0,Math.min(...vals)*.82);
  ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1; ctx.fillStyle='#78908c'; ctx.font='11px DM Sans';
  for(let i=0;i<4;i++){ const y=pad.t+h*i/3; ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+w,y);ctx.stroke(); const v=max-(max-min)*i/3;ctx.fillText(`${Math.round(v)}`,4,y+4); }
  const pts=hours.map((x,i)=>({x:pad.l+w*i/(hours.length-1),y:pad.t+h*(1-(x.pm25-min)/(max-min))}));
  const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+h);grad.addColorStop(0,'rgba(143,240,201,.25)');grad.addColorStop(1,'rgba(143,240,201,0)');
  ctx.beginPath();ctx.moveTo(pts[0].x,pad.t+h);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts[pts.length-1].x,pad.t+h);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#8ff0c9';ctx.lineWidth=2.5;ctx.stroke();
  ctx.fillStyle='#78908c';hours.forEach((x,i)=>{if(i%4===0){ctx.fillText(fmtHour(x.time),pts[i].x-16,pad.t+h+23)}});
}

function populatePlanner(){
  const dates=[...new Set(state.hours.map(x=>x.time.slice(0,10)))];
  $('activityDate').innerHTML=dates.map((d,i)=>`<option value="${d}">${i===0?'Today — ':i===1?'Tomorrow — ':''}${fmtDate(d+'T12:00:00')}</option>`).join('');
  ['startHour','endHour','plannedStart'].forEach(id=>{ $(id).innerHTML=Array.from({length:24},(_,h)=>`<option value="${h}">${String(h).padStart(2,'0')}:00</option>`).join(''); });
  $('startHour').value='7'; $('endHour').value='17'; $('plannedStart').value='9';
}

function dayRows(date){return state.hours.filter(x=>x.time.slice(0,10)===date)}
function average(arr,key){return arr.reduce((s,x)=>s+(Number(x[key])||0),0)/arr.length}

function findBestWindow(date,start,end,duration){
  const rows=dayRows(date); const durationHours=duration/60; const candidates=[];
  const steps = duration===30 ? 0.5 : durationHours;
  // Forecast data is hourly. For 30/45 min, use the containing hour as the concentration estimate.
  for(let s=start;s+durationHours<=end+1e-9;s+=steps){
    const first=Math.floor(s), last=Math.ceil(s+durationHours);
    const selected=rows.filter(x=>{const h=new Date(x.time).getHours();return h>=first&&h<last});
    if(!selected.length) continue;
    candidates.push({start:s,end:s+durationHours,pm:average(selected,'pm25'),wind:average(selected,'wind'),humidity:average(selected,'humidity'),rows:selected});
  }
  return candidates.sort((a,b)=>a.pm-b.pm)[0]||null;
}

function getWindowAt(date,start,duration){return findBestWindow(date,start,start+duration/60,duration)}
function displayDecimalHour(h){const hour=Math.floor(h)%24;const min=Math.round((h-Math.floor(h))*60);return `${String(hour).padStart(2,'0')}:${String(min).padStart(2,'0')}`}

function buildWhy(best, day){
  const dayWind=average(day,'wind'), dayHum=average(day,'humidity'), med=[...day].sort((a,b)=>a.pm25-b.pm25)[Math.floor(day.length/2)]?.pm25;
  const reasons=[`Its mean modeled PM2.5 (${round(best.pm)} µg/m³) is among the lowest available periods in your selected range.`];
  if(Number.isFinite(best.wind)&&best.wind>dayWind*1.05) reasons.push(`Forecast wind is higher than the day average, which coincides with the selected lower-concentration period.`);
  if(Number.isFinite(best.humidity)&&best.humidity<dayHum*.95) reasons.push(`Forecast humidity is lower than the day average during this window.`);
  if(best.pm < med) reasons.push(`The window sits below the day’s median modeled PM2.5 concentration.`);
  reasons.push('These are forecast associations, not proof that any weather variable caused the change.');
  return reasons;
}

$('plannerForm').addEventListener('submit',(e)=>{
  e.preventDefault(); const date=$('activityDate').value,start=+$('startHour').value,end=+$('endHour').value,planned=+$('plannedStart').value;
  if(end<=start){toast('Latest finish must be after earliest start.');return}
  const best=findBestWindow(date,start,end,state.duration); if(!best){toast('No valid forecast window found.');return}
  const plannedW=getWindowAt(date,planned,state.duration);
  $('recEmpty').classList.add('hidden'); $('recContent').classList.remove('hidden');
  $('bestWindow').textContent=`${displayDecimalHour(best.start)} – ${displayDecimalHour(best.end)}`;
  $('bestWindowPm').textContent=round(best.pm,1);
  const bestProxy=best.pm*state.duration/60; $('bestExposure').textContent=`${round(bestProxy,1)} proxy units`;
  if(plannedW){
    const plannedProxy=plannedW.pm*state.duration/60; $('plannedExposure').textContent=`${round(plannedProxy,1)} proxy units`;
    const reduction=plannedProxy>0?Math.max(0,(plannedProxy-bestProxy)/plannedProxy*100):0;
    $('reductionPct').textContent=`${round(reduction)}%`;
    $('comparisonBox').style.display='grid'; $('reductionWrap').style.display='flex';
  } else { $('comparisonBox').style.display='none'; $('reductionWrap').style.display='none'; }
  $('whyList').innerHTML=buildWhy(best,dayRows(date)).map(x=>`<li>${x}</li>`).join('');
});

document.querySelectorAll('#durationGroup button').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('#durationGroup button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');state.duration=+btn.dataset.duration;
}));
$('refreshBtn').addEventListener('click',()=>{fetchData();toast('Refreshing forecast…')});
$('exportBtn').addEventListener('click',()=>{
  const headers=['time','pm2_5','pm10','us_aqi','temperature_2m','relative_humidity_2m','wind_speed_10m','precipitation','surface_pressure'];
  const lines=[headers.join(',')].concat(state.hours.map(x=>[x.time,x.pm25,x.pm10,x.aqi??'',x.temp??'',x.humidity??'',x.wind??'',x.rain??'',x.pressure??''].join(',')));
  const blob=new Blob([lines.join('\n')],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`airguard-lahore-forecast-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);toast('Forecast CSV exported.');
});
window.addEventListener('resize',()=>state.hours.length&&drawChart(state.hours.slice(0,24)));
fetchData();
