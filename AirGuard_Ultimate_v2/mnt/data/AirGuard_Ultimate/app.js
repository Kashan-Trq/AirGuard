import {
  DEFAULTS, mean, median, isoDate, isoHour, minuteOfDayFromIso, formatClock, formatDateLabel,
  aqiCategory, relativePmBand, exposureProxy, windowStats, bestWindow, percentReduction,
  oneBetterHour, ventilationWindow, intensityFactor, optimizeSchoolSchedule, parseNaturalQuery,
  englishDecisionSummary, urduDecisionSummary, sensorCsvAnalysis
} from './core.js';

const $ = id => document.getElementById(id);
const state = {
  location: loadJSON('airguard:location') || DEFAULTS.location,
  rows: [], current: {}, sourceMode: 'loading', updatedAt: null,
  lastDecision: null, betterHour: null, installPrompt: null,
  care: loadJSON('airguard:care') || null,
  impact: loadJSON('airguard:impact') || [],
  urduVisible: false,
};

function loadJSON(key){ try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null} }
function saveJSON(key,val){ try{localStorage.setItem(key,JSON.stringify(val))}catch{} }
function round(v,d=0){ return Number.isFinite(Number(v)) ? Number(v).toFixed(d) : '—'; }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function toast(msg){ const el=$('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2600); }
function todayFromRows(){ return state.rows[0]?.time?.slice(0,10) || new Date().toISOString().slice(0,10); }
function dayRows(date){ return state.rows.filter(r=>isoDate(r.time)===date); }
function labelLocation(loc=state.location){ return [loc.name, loc.country].filter(Boolean).join(', '); }
function currentMinute(){
  if(state.current?.time){ const h=Number(state.current.time.slice(11,13)),m=Number(state.current.time.slice(14,16)||0); if(Number.isFinite(h)&&Number.isFinite(m)) return h*60+Math.floor(m/15)*15; }
  const d=new Date(); return d.getHours()*60+Math.floor(d.getMinutes()/15)*15;
}

function cacheKey(loc){ return `airguard:forecast:${Number(loc.latitude).toFixed(2)},${Number(loc.longitude).toFixed(2)}`; }
function saveForecastCache(){
  saveJSON(cacheKey(state.location),{savedAt:Date.now(),rows:state.rows,current:state.current,updatedAt:state.updatedAt});
}
function loadForecastCache(){
  const c=loadJSON(cacheKey(state.location));
  if(!c?.rows?.length) return null;
  return c;
}

function buildDemoData(){
  const base=new Date(); base.setMinutes(0,0,0);
  const rows=[];
  for(let i=0;i<120;i++){
    const d=new Date(base.getTime()+i*3600000), h=d.getHours();
    const pm=Math.max(18,Math.round(82+35*Math.cos((h-8)/24*Math.PI*2)+14*Math.sin(i/7)));
    rows.push({time:d.toISOString().slice(0,13)+':00',pm25:pm,pm10:Math.round(pm*1.35),aqi:null,no2:22+8*Math.sin(i/8),ozone:42+12*Math.sin(i/11),dust:8+4*Math.cos(i/6),uv:Math.max(0,7*Math.sin((h-6)/12*Math.PI)),temp:24+7*Math.sin((h-7)/24*Math.PI*2),apparent:25+8*Math.sin((h-7)/24*Math.PI*2),humidity:58+18*Math.cos((h-5)/24*Math.PI*2),wind:8+5*Math.sin((h-11)/24*Math.PI*2),rain:0,pressure:1008});
  }
  return {rows,current:{time:rows[0].time,pm25:rows[0].pm25,pm10:rows[0].pm10,aqi:null,temp:rows[0].temp,humidity:rows[0].humidity,wind:rows[0].wind,ozone:rows[0].ozone},updatedAt:new Date().toISOString()};
}

async function fetchForecast(){
  setSource('loading','Loading live forecast…');
  $('locationLabel').textContent=labelLocation();
  const {latitude,longitude}=state.location;
  try{
    const aq=new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
    aq.search=new URLSearchParams({
      latitude,longitude,
      hourly:'pm2_5,pm10,us_aqi,nitrogen_dioxide,ozone,dust,uv_index',
      current:'pm2_5,pm10,us_aqi,nitrogen_dioxide,ozone,dust,uv_index',
      timezone:'auto',forecast_days:'5'
    }).toString();
    const wx=new URL('https://api.open-meteo.com/v1/forecast');
    wx.search=new URLSearchParams({
      latitude,longitude,
      hourly:'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,surface_pressure',
      current:'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,surface_pressure',
      timezone:'auto',forecast_days:'5'
    }).toString();
    const [ar,wr]=await Promise.all([fetch(aq,{cache:'no-store'}),fetch(wx,{cache:'no-store'})]);
    if(!ar.ok||!wr.ok) throw new Error(`Forecast request failed (${ar.status}/${wr.status})`);
    const [a,w]=await Promise.all([ar.json(),wr.json()]);
    const wmap=new Map((w.hourly?.time||[]).map((t,i)=>[t,{
      temp:w.hourly.temperature_2m?.[i], apparent:w.hourly.apparent_temperature?.[i], humidity:w.hourly.relative_humidity_2m?.[i],
      wind:w.hourly.wind_speed_10m?.[i], rain:w.hourly.precipitation?.[i], pressure:w.hourly.surface_pressure?.[i]
    }]));
    const rows=(a.hourly?.time||[]).map((t,i)=>({
      time:t,pm25:a.hourly.pm2_5?.[i],pm10:a.hourly.pm10?.[i],aqi:a.hourly.us_aqi?.[i],no2:a.hourly.nitrogen_dioxide?.[i],
      ozone:a.hourly.ozone?.[i],dust:a.hourly.dust?.[i],uv:a.hourly.uv_index?.[i],...(wmap.get(t)||{})
    })).filter(r=>Number.isFinite(r.pm25));
    if(rows.length<24) throw new Error('Insufficient forecast data');
    state.rows=rows;
    state.current={time:a.current?.time||w.current?.time,pm25:a.current?.pm2_5,pm10:a.current?.pm10,aqi:a.current?.us_aqi,no2:a.current?.nitrogen_dioxide,ozone:a.current?.ozone,dust:a.current?.dust,uv:a.current?.uv_index,temp:w.current?.temperature_2m,apparent:w.current?.apparent_temperature,humidity:w.current?.relative_humidity_2m,wind:w.current?.wind_speed_10m,rain:w.current?.precipitation,pressure:w.current?.surface_pressure};
    state.updatedAt=new Date().toISOString(); state.sourceMode='live'; saveForecastCache(); setSource('live','Live modeled forecast');
  }catch(err){
    console.error(err);
    const cached=loadForecastCache();
    if(cached){ state.rows=cached.rows;state.current=cached.current||{};state.updatedAt=cached.updatedAt||new Date(cached.savedAt).toISOString();state.sourceMode='cached';setSource('cached','Offline · last saved forecast');toast('Live data unavailable. Using the last forecast saved on this device.'); }
    else { const demo=buildDemoData();Object.assign(state,demo,{sourceMode:'demo'});setSource('demo','Demo data · not live');toast('Live data unavailable. Showing clearly labeled demo data.'); }
  }
  renderAll();
}

function setSource(mode,text){
  $('sourceBadge').textContent=text;
  $('sourceBadge').dataset.mode=mode;
}

function renderAll(){
  renderCurrent(); renderChart(); populateDateSelectors(); renderBetterHour(); renderQuickCards(); renderCare(); renderImpact();
}

function renderCurrent(){
  const c=state.current||{}, vals=state.rows.slice(0,24).map(r=>r.pm25);
  $('currentPm').textContent=round(c.pm25,0);
  $('currentTemp').textContent=Number.isFinite(c.temp)?`${round(c.temp)}°C`:'—';
  $('currentHumidity').textContent=Number.isFinite(c.humidity)?`${round(c.humidity)}%`:'—';
  $('currentWind').textContent=Number.isFinite(c.wind)?`${round(c.wind)} km/h`:'—';
  $('currentOzone').textContent=Number.isFinite(c.ozone)?`${round(c.ozone)} µg/m³`:'—';
  $('relativeBand').textContent=relativePmBand(c.pm25,vals);
  const aq=aqiCategory(Number(c.aqi));
  $('aqiPill').textContent=Number.isFinite(c.aqi)?`US AQI ${round(c.aqi)} · ${aq.label}`:'US AQI unavailable';
  $('aqiPill').dataset.tone=aq.tone;
  const stamp=state.updatedAt?new Date(state.updatedAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'—';
  $('updatedAt').textContent=`Updated ${stamp}`;
}

function renderChart(){
  const rows=state.rows.slice(0,24); if(!rows.length)return;
  const vals=rows.map(r=>r.pm25).filter(Number.isFinite), low=Math.min(...vals), high=Math.max(...vals), med=median(vals);
  const lowR=rows.reduce((a,b)=>b.pm25<a.pm25?b:a), highR=rows.reduce((a,b)=>b.pm25>a.pm25?b:a);
  $('lowHour').textContent=`Lowest: ${formatClock(isoHour(lowR.time)*60)} · ${round(lowR.pm25)} µg/m³`;
  $('highHour').textContent=`Highest: ${formatClock(isoHour(highR.time)*60)} · ${round(highR.pm25)} µg/m³`;
  $('medianPm').textContent=`Median: ${round(med)} µg/m³`;
  $('chartRange').textContent=`${round(low)}–${round(high)} µg/m³`;
  const canvas=$('forecastChart'), ctx=canvas.getContext('2d'), dpr=window.devicePixelRatio||1, w=canvas.clientWidth||900,h=canvas.clientHeight||310;
  canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const pad={l:42,r:12,t:16,b:34},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b,max=high*1.12,min=Math.max(0,low*.78),range=Math.max(1,max-min);
  ctx.font='11px system-ui';ctx.fillStyle='#76928a';ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;
  for(let i=0;i<4;i++){const y=pad.t+ch*i/3;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(pad.l+cw,y);ctx.stroke();ctx.fillText(String(Math.round(max-range*i/3)),3,y+4)}
  const pts=rows.map((r,i)=>({x:pad.l+cw*i/(rows.length-1),y:pad.t+ch*(1-(r.pm25-min)/range)}));
  const grad=ctx.createLinearGradient(0,pad.t,0,pad.t+ch);grad.addColorStop(0,'rgba(145,240,201,.26)');grad.addColorStop(1,'rgba(145,240,201,0)');
  ctx.beginPath();ctx.moveTo(pts[0].x,pad.t+ch);pts.forEach(p=>ctx.lineTo(p.x,p.y));ctx.lineTo(pts.at(-1).x,pad.t+ch);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#91f0c9';ctx.lineWidth=2.5;ctx.stroke();
  ctx.fillStyle='#76928a';rows.forEach((r,i)=>{if(i%4===0)ctx.fillText(formatClock(isoHour(r.time)*60).replace(':00',''),pts[i].x-14,pad.t+ch+22)});
}

function populateDateSelectors(){
  const dates=[...new Set(state.rows.map(r=>isoDate(r.time)))]; const today=todayFromRows();
  const options=dates.map(d=>`<option value="${d}">${escapeHtml(formatDateLabel(d,today))}</option>`).join('');
  $('plannerDate').innerHTML=options;$('schoolDate').innerHTML=options;
  const timeOpts=[]; for(let m=0;m<1440;m+=15)timeOpts.push(`<option value="${m}">${formatClock(m)}</option>`);
  for(const id of ['plannerStart','plannerEnd','plannerBaseline','schoolStart','schoolEnd']) $(id).innerHTML=timeOpts.join('');
  $('plannerStart').value='360';$('plannerEnd').value='1260';$('plannerBaseline').value='540';$('schoolStart').value='420';$('schoolEnd').value='840';
}

function renderBetterHour(){
  const date=todayFromRows(); const baseline=currentMinute(); const one=oneBetterHour(state.rows,date,baseline);state.betterHour=one;
  if(!one){$('betterHourTime').textContent='Unavailable';return}
  $('betterHourTime').textContent=`${formatClock(one.startMinute)} – ${formatClock(one.endMinute)}`;$('betterHourPm').textContent=round(one.pm25);
  if(Number.isFinite(one.reduction)&&one.reduction>1)$('betterHourCopy').textContent=`About ${Math.round(one.reduction)}% lower on the modeled concentration-time proxy than the current hour.`;
  else $('betterHourCopy').textContent='This is the lowest modeled 60-minute period AirGuard found today; nearby hours are similar.';
}

function renderQuickCards(){
  const date=todayFromRows();
  const configs={run:{duration:45,earliest:330,latest:1260,intent:'run'},children:{duration:45,earliest:420,latest:1140,intent:'children'},commute:{duration:30,earliest:360,latest:1260,intent:'commute'}};
  for(const [key,cfg] of Object.entries(configs)){
    const r=bestWindow(state.rows,{date,...cfg,step:15}); const el=$(`quick${key[0].toUpperCase()+key.slice(1)}`);if(el&&r)el.textContent=`Best: ${formatClock(r.startMinute)} · ${round(r.pm25)} µg/m³`;
  }
  const v=ventilationWindow(state.rows,{date,earliest:360,latest:1320,duration:30}); if(v)$('quickVent').textContent=`Best: ${formatClock(v.startMinute)} · ${round(v.pm25)} µg/m³`;
}

function baselineForPlan(plan){
  if(plan.baselineMinute==null) return null;
  return windowStats(dayRows(plan.date),plan.baselineMinute,plan.duration,15);
}

function showDecision(plan,result,{title='Your better window',scroll=true}={}){
  if(!result){toast('I could not find a usable forecast window for those constraints.');return}
  const baseline=baselineForPlan(plan), factor=plan.intensity||intensityFactor(plan.intent);
  const summary=englishDecisionSummary({...plan,intensity:factor},result,baseline), urdu=urduDecisionSummary({...plan,intensity:factor},result,baseline);
  $('answerSection').classList.remove('hidden');$('answerTitle').textContent=title;$('answerWindow').textContent=`${formatClock(result.startMinute)} – ${formatClock(result.endMinute)}`;$('answerDate').textContent=formatDateLabel(plan.date,todayFromRows());$('answerPm').textContent=round(result.pm25,1);$('answerSummary').textContent=summary;$('answerSummaryUrdu').textContent=urdu;
  const conf=result.confidence||{level:'—',score:'—',reason:''};$('answerConfidence').textContent=`Decision confidence: ${conf.level}${Number.isFinite(conf.score)?` · ${conf.score}/100`:''}`;$('answerConfidence').title=conf.reason||'';
  const flags=[...(result.flags||[])];if(state.sourceMode!=='live')flags.unshift({level:'caution',text:state.sourceMode==='cached'?'Using a saved forecast because live data is unavailable.':'Demo data: do not use this result for real decisions.'});$('answerFlags').innerHTML=flags.length?flags.map(f=>`<span class="flag ${f.level||''}">${escapeHtml(f.text)}</span>`).join(''):'<span class="flag">No rain/heat/UV practical flags triggered.</span>';
  const baseProxy=baseline?exposureProxy(baseline.pm25,plan.duration,factor):NaN, bestProxy=exposureProxy(result.pm25,plan.duration,factor);
  state.lastDecision={plan,result:{startMinute:result.startMinute,endMinute:result.endMinute,pm25:result.pm25,flags:result.flags||[],confidence:result.confidence||null},baseline:baseline?{pm25:baseline.pm25,startMinute:plan.baselineMinute}:null,baseProxy,bestProxy,summary,urdu,location:labelLocation(),createdAt:new Date().toISOString()};
  if(scroll)$('answerSection').scrollIntoView({behavior:'smooth',block:'center'});
}

function handleAsk(query){
  if(!state.rows.length)return;
  const plan=parseNaturalQuery(query,{today:todayFromRows()});
  let result;
  if(plan.intent==='ventilation'){
    const v=ventilationWindow(state.rows,{date:plan.date,earliest:plan.earliest,latest:plan.latest,duration:plan.duration});
    if(v) result={...v,confidence:{level:'Medium',score:65,reason:'Selected by lowest PM2.5 among dry forecast windows.'}};
  }else result=bestWindow(state.rows,{date:plan.date,earliest:plan.earliest,latest:plan.latest,duration:plan.duration,step:15,intent:plan.intent});
  showDecision(plan,result,{title:`AirGuard answer · ${plan.activity}`});
}

function plannerResultHtml(plan,result,baseline){
  const factor=intensityFactor(plan.intent), bestProxy=exposureProxy(result.pm25,plan.duration,factor), baseProxy=baseline?exposureProxy(baseline.pm25,plan.duration,factor):NaN, pct=percentReduction(baseProxy,bestProxy);
  const why=[`Lowest mean modeled PM2.5 among all ${plan.duration}-minute windows that fit your selected range.`,result.confidence?.reason||'Nearby alternatives were also evaluated.'];
  if(result.flags?.length)why.push(...result.flags.map(f=>f.text));
  return `<div class="result-hero"><div><span class="eyebrow">RECOMMENDED WINDOW</span><h3>${formatClock(result.startMinute)} – ${formatClock(result.endMinute)}</h3><p class="muted">${escapeHtml(formatDateLabel(plan.date,todayFromRows()))}</p></div><div class="result-number"><strong>${round(result.pm25,1)}</strong><small>µg/m³ mean PM2.5</small></div></div>
    ${baseline?`<div class="compare-box"><div><small>Comparison time</small><strong>${round(baseProxy,1)} proxy units</strong></div><i>→</i><div><small>AirGuard window</small><strong>${round(bestProxy,1)} proxy units${Number.isFinite(pct)&&pct>0?` · ${Math.round(pct)}% lower`:''}</strong></div></div>`:''}
    <ul class="why-list">${why.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>
    <div class="answer-actions"><button type="button" class="primary-btn" id="plannerSaveInline">Save this plan</button><button type="button" class="secondary-btn" id="plannerShareInline">Share</button></div>`;
}

function addDefaultActivities(){
  if($('activityRows').children.length)return;
  addActivityRow('Morning assembly',20,1.1);addActivityRow('Recess',30,1.25);addActivityRow('Sports / PE',45,1.8);
}
function addActivityRow(name='Outdoor activity',duration=30,intensity=1.3){
  if($('activityRows').children.length>=6){toast('School Mode supports up to 6 activities at once.');return}
  const row=document.createElement('div');row.className='activity-row';row.innerHTML=`<input class="school-activity-name" value="${escapeHtml(name)}" aria-label="Activity name"><select class="school-activity-duration" aria-label="Duration"><option ${duration===15?'selected':''}>15</option><option ${duration===20?'selected':''}>20</option><option ${duration===30?'selected':''}>30</option><option ${duration===45?'selected':''}>45</option><option ${duration===60?'selected':''}>60</option><option ${duration===90?'selected':''}>90</option></select><select class="school-activity-intensity" aria-label="Activity factor"><option value="1.0" ${intensity===1?'selected':''}>Light</option><option value="1.3" ${intensity===1.3?'selected':''}>Moderate</option><option value="1.8" ${intensity===1.8?'selected':''}>Active</option></select><button class="remove-activity" type="button" aria-label="Remove">×</button>`;
  row.querySelector('.remove-activity').addEventListener('click',()=>row.remove());$('activityRows').appendChild(row);
}

function renderSchoolResult(sol,date){
  if(!sol.feasible){$('schoolResult').innerHTML=`<div class="empty-state"><span>!</span><h3>No feasible schedule</h3><p>${escapeHtml(sol.reason||'Try a longer school day or fewer activities.')}</p></div>`;return}
  const rows=sol.assignments.map(a=>`<tr><td>${escapeHtml(a.name)}</td><td>${formatClock(a.startMinute)}–${formatClock(a.endMinute)}</td><td>${round(a.pm25,1)}</td><td>${round(a.proxy,1)}</td></tr>`).join('');
  $('schoolResult').innerHTML=`<span class="eyebrow">OPTIMIZED TIMETABLE</span><h3>${escapeHtml(formatDateLabel(date,todayFromRows()))}</h3><table class="school-table"><thead><tr><th>Activity</th><th>Time</th><th>PM2.5</th><th>Relative proxy</th></tr></thead><tbody>${rows}</tbody></table><div class="school-summary">AirGuard placed activities without overlap and minimized the total modeled concentration-time exposure proxy across the selected school day. Total proxy: <strong>${round(sol.totalProxy,1)}</strong>.</div><div class="answer-actions"><button id="exportSchoolBtn" type="button" class="secondary-btn">Export schedule CSV</button></div>`;
  $('exportSchoolBtn').addEventListener('click',()=>exportSchoolCsv(sol,date));
}

function renderCare(){
  if(state.care){$('careName').value=state.care.name||'';$('careRelation').value=state.care.relation||'someone I care about';const who=state.care.name?.trim()||state.care.relation;$('careMessage').textContent=`For ${who}, AirGuard will always try to turn a pollution number into one practical choice.`;$('careLine').textContent=`One better window for ${who}. Small decisions are still decisions worth making.`;}
  else {$('careMessage').textContent='Choose one better window for someone you care about.';$('careLine').textContent='AirGuard can’t clean the whole city today. It can help you choose one better hour.';}
}

function renderImpact(){
  const done=state.impact.filter(x=>x.status==='completed');$('impactCount').textContent=done.length;$('impactMinutes').textContent=Math.round(done.reduce((s,x)=>s+(x.duration||0),0));$('impactAvoided').textContent=round(done.reduce((s,x)=>s+(Number.isFinite(x.avoidedProxy)?Math.max(0,x.avoidedProxy):0),0),1);
  const list=$('impactList');
  if(!state.impact.length){list.innerHTML='<div class="empty-state" style="min-height:150px"><p>No plans saved yet. Save a recommendation, then mark it completed after you actually use it.</p></div>';return}
  list.innerHTML=state.impact.slice().reverse().map(x=>`<div class="impact-item"><div><strong>${escapeHtml(x.label||'AirGuard plan')} · ${escapeHtml(x.location||'')}</strong><small>${escapeHtml(x.date||'')} · ${formatClock(x.startMinute)} · ${x.duration} min · ${round(x.pm25,1)} µg/m³</small></div><span class="status-tag ${x.status==='completed'?'done':''}">${x.status==='completed'?'Completed':'Planned'}</span><div class="mini-actions">${x.status!=='completed'?`<button data-impact-action="complete" data-id="${x.id}">Mark done</button>`:''}<button data-impact-action="remove" data-id="${x.id}">Remove</button></div></div>`).join('');
  list.querySelectorAll('[data-impact-action]').forEach(btn=>btn.addEventListener('click',()=>{const id=btn.dataset.id,action=btn.dataset.impactAction;if(action==='complete'){const x=state.impact.find(e=>e.id===id);if(x){x.status='completed';x.completedAt=new Date().toISOString();}}else state.impact=state.impact.filter(e=>e.id!==id);saveJSON('airguard:impact',state.impact);renderImpact();}));
}

function saveCurrentPlan(label=null){
  if(state.sourceMode==='demo'){toast('Demo-mode decisions cannot be added to the impact log. Connect to live data first.');return}
  const d=state.lastDecision;if(!d){toast('Ask AirGuard or run the planner first.');return}
  const entry={id:`p${Date.now()}${Math.random().toString(36).slice(2,6)}`,label:label||d.plan.activity||'AirGuard plan',location:d.location,date:d.plan.date,startMinute:d.result.startMinute,duration:d.plan.duration,pm25:d.result.pm25,baselinePm:d.baseline?.pm25??null,avoidedProxy:Number.isFinite(d.baseProxy)?d.baseProxy-d.bestProxy:0,status:'planned',createdAt:new Date().toISOString()};
  state.impact.push(entry);saveJSON('airguard:impact',state.impact);renderImpact();toast('Plan saved. Mark it done after you actually use the window.');
}

function shareCurrentDecision(){
  if(!state.lastDecision){toast('No decision to share yet.');return}
  const text=`AirGuard · ${state.lastDecision.summary}\n${state.lastDecision.location}`;
  if(navigator.share)navigator.share({title:'AirGuard decision',text}).catch(()=>{});else navigator.clipboard?.writeText(text).then(()=>toast('Decision copied to clipboard.')).catch(()=>toast('Could not copy the decision.'));
}

function addDecisionToCalendar(){
  const d=state.lastDecision;if(!d){toast('No decision to add yet.');return}
  const stamp=(dateStr,minutes)=>{ const dt=new Date(`${dateStr}T00:00:00`);dt.setMinutes(minutes);const y=dt.getFullYear(),m=String(dt.getMonth()+1).padStart(2,'0'),day=String(dt.getDate()).padStart(2,'0'),h=String(dt.getHours()).padStart(2,'0'),min=String(dt.getMinutes()).padStart(2,'0');return `${y}${m}${day}T${h}${min}00`; };
  const start=stamp(d.plan.date,d.result.startMinute),end=stamp(d.plan.date,d.result.endMinute);
  const body=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//AirGuard//Decision OS//EN\r\nBEGIN:VEVENT\r\nDTSTART:${start}\r\nDTEND:${end}\r\nSUMMARY:${(d.plan.activity||'AirGuard lower-air window').replace(/[,;]/g,' ')}\r\nDESCRIPTION:${d.summary.replace(/[\r\n]/g,' ').replace(/[,;]/g,' ')}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  downloadBlob(body,'text/calendar',`airguard-${d.plan.date}.ics`);
}

function downloadBlob(text,type,name){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
function exportImpact(){
  const head=['id','status','label','location','date','start_time','duration_min','mean_pm2_5','baseline_pm2_5','modeled_proxy_avoided'];
  const rows=state.impact.map(x=>[x.id,x.status,x.label,x.location,x.date,formatClock(x.startMinute),x.duration,x.pm25,x.baselinePm??'',x.avoidedProxy??'']);downloadBlob([head,...rows].map(r=>r.map(csvCell).join(',')).join('\n'),'text/csv','airguard-impact-log.csv');
}
function csvCell(v){const s=String(v??'');return /[,"\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s}
function exportSchoolCsv(sol,date){const rows=[['date','activity','start','end','mean_pm2_5','relative_proxy'],...sol.assignments.map(a=>[date,a.name,formatClock(a.startMinute),formatClock(a.endMinute),a.pm25,a.proxy])];downloadBlob(rows.map(r=>r.map(csvCell).join(',')).join('\n'),'text/csv',`airguard-school-${date}.csv`)}

function parseCsv(text){
  const lines=text.trim().split(/\r?\n/);if(lines.length<2)return[];
  const parseLine=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++;}else q=!q;}else if(c===','&&!q){out.push(cur);cur='';}else cur+=c;}out.push(cur);return out.map(x=>x.trim())};
  const header=parseLine(lines[0]).map(h=>h.toLowerCase().replace(/\s+/g,'_'));const timeIdx=header.findIndex(h=>['time','timestamp','datetime','date_time'].includes(h));const pmIdx=header.findIndex(h=>['pm2_5','pm25','pm2.5','pm_2_5'].includes(h));if(timeIdx<0||pmIdx<0)throw new Error('Could not find time/timestamp and pm2_5/pm25 columns.');
  return lines.slice(1).map(l=>parseLine(l)).filter(r=>r.length>Math.max(timeIdx,pmIdx)).map(r=>({time:r[timeIdx],pm25:Number(r[pmIdx])})).filter(r=>r.time&&Number.isFinite(r.pm25));
}
function renderSensorAnalysis(records){
  const duration=Number($('sensorDuration').value)||45, analysis=sensorCsvAnalysis(records,duration);if(!analysis){$('sensorResult').innerHTML='<div class="empty-state"><h3>No valid rows</h3><p>Check your time and PM2.5 columns.</p></div>';return}
  const days=analysis.days.filter(d=>d.best).map(d=>`<div class="lab-day"><span>${escapeHtml(d.date)}</span><strong>${formatClock(d.best.startMinute)} · ${round(d.best.pm25,1)} µg/m³</strong></div>`).join('');
  $('sensorResult').innerHTML=`<span class="eyebrow">LOCAL SENSOR ANALYSIS</span><h3>${analysis.count} valid readings</h3><div class="lab-stat-grid"><div><small>Minimum</small><strong>${round(analysis.min,1)}</strong></div><div><small>Median</small><strong>${round(analysis.median,1)}</strong></div><div><small>Maximum</small><strong>${round(analysis.max,1)}</strong></div><div><small>Window</small><strong>${duration} min</strong></div></div><div class="lab-days">${days||'<p class="muted">No full-day windows could be calculated.</p>'}</div><p class="micro-note">Observed sensor data can support pilot validation, but sensor calibration and placement still matter.</p>`;
}

async function searchLocation(){
  const q=$('locationSearch').value.trim();if(q.length<2){toast('Type at least 2 characters.');return}
  $('locationResults').innerHTML='<p class="muted">Searching…</p>';
  try{const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:q,count:'6',language:'en',format:'json'}).toString();const res=await fetch(url);if(!res.ok)throw new Error('Location search failed');const data=await res.json();const results=data.results||[];$('locationResults').innerHTML=results.length?results.map((r,i)=>`<button class="location-result" data-i="${i}" type="button"><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml([r.admin1,r.country].filter(Boolean).join(', '))}</small></button>`).join(''):'<p class="muted">No matching place found.</p>';$('locationResults').querySelectorAll('.location-result').forEach(btn=>btn.addEventListener('click',()=>{const r=results[Number(btn.dataset.i)];selectLocation({name:r.name,admin1:r.admin1,country:r.country,latitude:r.latitude,longitude:r.longitude});}));}
  catch(err){console.error(err);$('locationResults').innerHTML='<p class="muted">Location search is unavailable right now.</p>'}
}
function selectLocation(loc){state.location=loc;saveJSON('airguard:location',loc);$('locationModal').classList.add('hidden');$('locationLabel').textContent=labelLocation();fetchForecast();}

function setupEvents(){
  $('askBtn').addEventListener('click',()=>handleAsk($('askInput').value));$('askInput').addEventListener('keydown',e=>{if(e.key==='Enter')handleAsk($('askInput').value)});$('promptChips').querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>{$('askInput').value=b.dataset.query;handleAsk(b.dataset.query)}));
  $('refreshBtn').addEventListener('click',()=>{fetchForecast();toast('Refreshing environmental forecast…')});window.addEventListener('resize',()=>state.rows.length&&renderChart());
  document.querySelectorAll('[data-quick]').forEach(btn=>btn.addEventListener('click',()=>{const q={run:'Best time for a 45 minute run today between 6 AM and 9 PM',children:'Best time for children to play outside today for 45 minutes between 7 AM and 7 PM',ventilation:'When should I open the windows today for 30 minutes?',commute:'Best time for a 30 minute commute today between 6 AM and 9 PM'}[btn.dataset.quick];$('askInput').value=q;handleAsk(q)}));
  $('plannerForm').addEventListener('submit',e=>{e.preventDefault();const plan={intent:$('activityType').value,activity:$('activityType').selectedOptions[0].textContent.toLowerCase(),date:$('plannerDate').value,earliest:Number($('plannerStart').value),latest:Number($('plannerEnd').value),duration:Number($('plannerDuration').value),baselineMinute:Number($('plannerBaseline').value)};if(plan.latest<=plan.earliest||plan.latest-plan.earliest<plan.duration){toast('The selected time range is too short for this activity.');return}let result;if(plan.intent==='ventilation'){const v=ventilationWindow(state.rows,{date:plan.date,earliest:plan.earliest,latest:plan.latest,duration:plan.duration});result=v?{...v,confidence:{level:'Medium',score:65,reason:'Selected by lowest PM2.5 among dry forecast windows.'}}:null}else result=bestWindow(state.rows,{date:plan.date,earliest:plan.earliest,latest:plan.latest,duration:plan.duration,step:15,intent:plan.intent});if(!result){toast('No usable forecast window found.');return}const baseline=baselineForPlan(plan);$('plannerResult').innerHTML=plannerResultHtml(plan,result,baseline);showDecision(plan,result,{title:'Planner result',scroll:false});$('plannerSaveInline').addEventListener('click',()=>saveCurrentPlan());$('plannerShareInline').addEventListener('click',shareCurrentDecision)});
  $('savePlanBtn').addEventListener('click',()=>saveCurrentPlan());$('shareAnswerBtn').addEventListener('click',shareCurrentDecision);$('addCalendarBtn').addEventListener('click',addDecisionToCalendar);$('urduBtn').addEventListener('click',()=>{state.urduVisible=!state.urduVisible;$('answerSummaryUrdu').classList.toggle('hidden',!state.urduVisible);$('urduBtn').textContent=state.urduVisible?'English':'اردو'});
  $('betterHourSave').addEventListener('click',()=>{const one=state.betterHour;if(!one)return;const plan={intent:'general',activity:'One Better Hour',date:todayFromRows(),earliest:360,latest:1320,duration:60,baselineMinute:currentMinute(),intensity:1};showDecision(plan,one,{title:'One Better Hour',scroll:false});saveCurrentPlan('One Better Hour')});
  $('addActivityBtn').addEventListener('click',()=>addActivityRow());$('schoolForm').addEventListener('submit',e=>{e.preventDefault();const acts=[...document.querySelectorAll('.activity-row')].map((r,i)=>({id:`a${i}`,name:r.querySelector('.school-activity-name').value.trim(),duration:Number(r.querySelector('.school-activity-duration').value),intensity:Number(r.querySelector('.school-activity-intensity').value)}));const date=$('schoolDate').value,start=Number($('schoolStart').value),end=Number($('schoolEnd').value);if(end<=start){toast('School end time must be after start time.');return}const sol=optimizeSchoolSchedule(state.rows,{date,schoolStart:start,schoolEnd:end,activities:acts});renderSchoolResult(sol,date)});
  $('saveCareBtn').addEventListener('click',()=>{state.care={name:$('careName').value.trim(),relation:$('careRelation').value};saveJSON('airguard:care',state.care);renderCare();toast('Care Circle saved on this device.');});
  $('exportImpactBtn').addEventListener('click',exportImpact);$('clearImpactBtn').addEventListener('click',()=>{if(confirm('Clear all AirGuard plans from this browser?')){state.impact=[];saveJSON('airguard:impact',[]);renderImpact();}});
  $('sensorFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const records=parseCsv(await f.text());state.sensorRecords=records;renderSensorAnalysis(records)}catch(err){toast(err.message||'Could not read that CSV.')}});$('sensorDuration').addEventListener('change',()=>state.sensorRecords&&renderSensorAnalysis(state.sensorRecords));
  $('locationBtn').addEventListener('click',()=>{$('locationModal').classList.remove('hidden');$('locationSearch').focus()});$('closeLocationBtn').addEventListener('click',()=>$('locationModal').classList.add('hidden'));$('locationModal').addEventListener('click',e=>{if(e.target===$('locationModal'))$('locationModal').classList.add('hidden')});$('searchLocationBtn').addEventListener('click',searchLocation);$('locationSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchLocation()});$('useMyLocationBtn').addEventListener('click',()=>{if(!navigator.geolocation){toast('Geolocation is not available in this browser.');return}navigator.geolocation.getCurrentPosition(pos=>selectLocation({name:'Your location',country:'',latitude:pos.coords.latitude,longitude:pos.coords.longitude}),()=>toast('Location permission was not granted.'),{enableHighAccuracy:false,timeout:8000})});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;$('installBtn').classList.remove('hidden')});$('installBtn').addEventListener('click',async()=>{if(!state.installPrompt)return;state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;$('installBtn').classList.add('hidden')});
}

async function init(){
  setupEvents();addDefaultActivities();$('locationLabel').textContent=labelLocation();renderCare();renderImpact();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  await fetchForecast();
}

init();
