/** Pure, dependency-free AirGuard domain logic. Shared by browser, API and tests. */
export const CITIES = Object.freeze([
  {id:'lahore',name:'Lahore',lat:31.5204,lon:74.3587},
  {id:'karachi',name:'Karachi',lat:24.8607,lon:67.0011},
  {id:'islamabad',name:'Islamabad',lat:33.6844,lon:73.0479},
  {id:'faisalabad',name:'Faisalabad',lat:31.4504,lon:73.1350},
  {id:'multan',name:'Multan',lat:30.1575,lon:71.5249},
  {id:'rawalpindi',name:'Rawalpindi',lat:33.5651,lon:73.0169},
  {id:'peshawar',name:'Peshawar',lat:34.0151,lon:71.5249},
  {id:'gujranwala',name:'Gujranwala',lat:32.1877,lon:74.1945},
  {id:'sialkot',name:'Sialkot',lat:32.4945,lon:74.5229},
  {id:'quetta',name:'Quetta',lat:30.1798,lon:66.9750},
  {id:'hyderabad',name:'Hyderabad',lat:25.3960,lon:68.3578},
  {id:'sargodha',name:'Sargodha',lat:32.0836,lon:72.6711}
]);
export const SOURCE = 'Open-Meteo / Copernicus CAMS Global (model forecast)';
export const TZ = 'Asia/Karachi';
export const numberOrNull = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value * 10) / 10 : null;
export const cityById = id => CITIES.find(city => city.id === String(id || '').toLowerCase()) || null;
export const aqiBand = aqi => {
  if (!Number.isFinite(aqi)) return {label:'Unavailable',tone:'unknown',description:'Forecast not available. Do not assume air is clear.'};
  if (aqi <= 50) return {label:'Good',tone:'good',description:'Air quality is generally satisfactory. Local conditions can still differ.'};
  if (aqi <= 100) return {label:'Moderate',tone:'moderate',description:'Some unusually sensitive people may wish to limit prolonged outdoor exertion.'};
  if (aqi <= 150) return {label:'Unhealthy for sensitive groups',tone:'sensitive',description:'Children, older adults, and people with heart or lung concerns should consider reducing prolonged outdoor exertion.'};
  if (aqi <= 200) return {label:'Unhealthy',tone:'unhealthy',description:'Consider reducing prolonged or strenuous outdoor activity, especially if more sensitive.'};
  if (aqi <= 300) return {label:'Very unhealthy',tone:'very',description:'Avoid prolonged outdoor exertion when feasible. Follow local public-health notices.'};
  return {label:'Hazardous',tone:'hazard',description:'Avoid outdoor exertion where possible and follow official local advisories.'};
};
/** Open-Meteo local-time ISO strings for a city in Pakistan (all same time zone). */
export const localHour = value => {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
  const parsed=Date.parse(`${value}:00+05:00`);
  // Reject invalid dates rather than letting malformed provider data crash date formatting.
  if(!Number.isFinite(parsed))return null;
  const roundTrip=new Date(parsed+5*3600000).toISOString().slice(0,16);
  return roundTrip===value?value:null;
};
export function normalizeProvider(raw,city,receivedAt=new Date().toISOString()) {
  if (!raw || !raw.hourly || !Array.isArray(raw.hourly.time) || raw.hourly.time.length < 1) throw new Error('Invalid upstream hourly forecast');
  const h=raw.hourly;
  const points=h.time.map((time,index)=>({
    time:localHour(time),aqi:numberOrNull(h.us_aqi?.[index]),pm25:numberOrNull(h.pm2_5?.[index]),pm10:numberOrNull(h.pm10?.[index]),no2:numberOrNull(h.nitrogen_dioxide?.[index]),ozone:numberOrNull(h.ozone?.[index]),dust:numberOrNull(h.dust?.[index])
  })).filter(p=>p.time);
  if (!points.length) throw new Error('No usable time values in forecast');
  const current=raw.current || {};
  // An absent `current` object is common in partial upstream responses.
  // Use only a matching hourly model value from a nearby hour, clearly marked as such.
  const currentTime=localHour(current.time);
  const currentMatches=points.find(p=>p.time===currentTime) || null;
  const closest=points.filter(p=>Math.abs(Date.parse(p.time+':00+05:00')-Date.now())<=90*60000)
    .sort((a,b)=>Math.abs(Date.parse(a.time+':00+05:00')-Date.now())-Math.abs(Date.parse(b.time+':00+05:00')-Date.now()))[0]||null;
  const supplement=!currentTime?closest:null;
  return {city:city.name,cityId:city.id,latitude:city.lat,longitude:city.lon,receivedAt,modelBased:true,source:SOURCE,timezone:TZ,
    spatialResolution:'~45 km CAMS global model; not a street-level measurement',
    current:{time:currentTime||supplement?.time||null,
      method:currentTime?'current model estimate':supplement?'nearest hourly model forecast':'unavailable',
      aqi:numberOrNull(current.us_aqi)??supplement?.aqi??null,pm25:numberOrNull(current.pm2_5)??supplement?.pm25??null,
      pm10:numberOrNull(current.pm10)??supplement?.pm10??null,no2:numberOrNull(current.nitrogen_dioxide)??supplement?.no2??null,
      ozone:numberOrNull(current.ozone)??supplement?.ozone??null},
    points};
}
export const dateAtLocalHour = iso => new Date(`${iso}:00+05:00`);
export function forecastNow(data,now=new Date()) {
  if (!data?.points?.length) return null;
  const nowMs=now.getTime();
  return data.points.find(p=>dateAtLocalHour(p.time).getTime()>=nowMs - 3600000 && p.pm25!==null) || null;
}
export function futureHours(data,horizon=72,now=new Date()) {
  if (!data?.points) return [];
  const start=now.getTime()-3600000;
  const end=now.getTime()+horizon*3600000;
  return data.points.filter(p=>{const ms=dateAtLocalHour(p.time).getTime();return ms>=start && ms<=end;});
}
export const fmtHour = (time,locale='en-PK') => {
  if (!localHour(time)) return '—';
  return new Intl.DateTimeFormat(locale,{timeZone:TZ,weekday:'short',hour:'numeric',hour12:true}).format(dateAtLocalHour(time));
};
export const fmtDate = (time,locale='en-PK') => !localHour(time)?'—':new Intl.DateTimeFormat(locale,{timeZone:TZ,weekday:'short',day:'numeric',month:'short',hour:'numeric',hour12:true}).format(dateAtLocalHour(time));
/** Illustrative ventilation assumptions, NOT personalized physiological measurements. */
export const ACTIVITIES = Object.freeze({
  errands:{label:'Errands / easy walk',ventilation:1.0},
  school:{label:'School commute',ventilation:1.0},
  exercise:{label:'Outdoor exercise',ventilation:2.0},
  work:{label:'Outdoor work',ventilation:1.5},
  rest:{label:'Seated / low effort',ventilation:0.6}
});
/** Compare equal-duration hour-aligned windows; return theoretical INHALED mass, not absorbed dose or medical risk. */
export function planWindows(data,{activity='errands',duration=1,horizon=24,now=new Date()}={}) {
  const ventilation=ACTIVITIES[activity]?.ventilation ?? ACTIVITIES.errands.ventilation;
  const hours=Math.max(1,Math.min(4,Math.floor(Number(duration)||1)));
  const bound=Math.max(6,Math.min(96,Math.floor(Number(horizon)||24)));
  const eligible=futureHours(data,bound+hours,now); // Include look-ahead points, but require the full activity to fit within the horizon.
  const output=[];
  for(let i=0;i<=eligible.length-hours;i++){
    const group=eligible.slice(i,i+hours);
    const startMs=dateAtLocalHour(group[0].time).getTime();
    if(startMs<now.getTime() || startMs+hours*3600000>now.getTime()+bound*3600000) continue;
    if(group.some((p,j)=>p.pm25===null || (j>0 && dateAtLocalHour(p.time).getTime()-dateAtLocalHour(group[j-1].time).getTime()!==3600000)))continue;
    const sum=group.reduce((acc,p)=>acc+p.pm25,0);
    const mean=sum/hours;
    const inhaledMicrograms=Math.round(sum*ventilation*10)/10;
    const maxAQI=group.some(p=>p.aqi!==null)?Math.max(...group.filter(p=>p.aqi!==null).map(p=>p.aqi)):null;
    output.push({start:group[0].time,end:new Date(startMs+hours*3600000).toISOString(),duration:hours,pm25:Math.round(mean*10)/10,inhaledMicrograms,maxAQI,activity,ventilation});
  }
  const chronological=output.slice().sort((a,b)=>a.start.localeCompare(b.start));
  const ranked=output.slice().sort((a,b)=>a.inhaledMicrograms-b.inhaledMicrograms||a.start.localeCompare(b.start));
  const baseline=chronological[0]||null;
  return {ranked,baseline,best:ranked[0]||null,assumptions:{ventilation,units:'µg = sum of hourly PM2.5 (µg/m³) × estimated m³/h',model:'illustrative inhaled mass, NOT absorbed dose or a health prediction'}};
}
export function compareWindows(best,baseline) {
  if (!best||!baseline||baseline.inhaledMicrograms<=0)return null;
  return Math.max(0,Math.round((1-best.inhaledMicrograms/baseline.inhaledMicrograms)*100));
}
export function getTrend(data,now=new Date()) {
  const next=futureHours(data,25,now).filter(p=>p.pm25!==null);
  const today=next.slice(0,Math.min(8,next.length));
  const later=next.slice(8,Math.min(24,next.length));
  if (today.length<3||later.length<3)return {direction:'unknown',difference:null};
  const a=today.reduce((s,p)=>s+p.pm25,0)/today.length;
  const b=later.reduce((s,p)=>s+p.pm25,0)/later.length;
  const diff=Math.round((b-a)*10)/10;
  return {direction:diff>3?'rising':diff< -3?'falling':'steady',difference:diff};
}
/** Answer air-quality questions conservatively. Date-specific queries use real PKT calendar dates. */
export function answerQuestion(question,data,now=new Date()) {
  const q=String(question||'').trim().toLowerCase();
  if (!q) return {title:'Ask an air-quality question',body:'Try asking about PM2.5, tomorrow’s forecast, children and outdoor activities, or how to request action from a school.',intent:'welcome'};
  const current=data?.current?.aqi;
  const desc=aqiBand(current);
  const city=data?.city||'your selected city';
  const lead=`The latest available model estimate for ${city} is ${current==null?'unavailable':`${current} US AQI (${desc.label.toLowerCase()})`}. `;
  if (/^(hi|hello|hey)\W*$/.test(q)) return {title:'Hello. Your next good decision starts here.',body:'Ask about pollution, the best time to go outdoors, care for children, tomorrow’s forecast, or what to ask a school to do.',intent:'welcome'};
  // Put explicit civic requests before school/child keyword matches.
  if (/\b(ask|write|request|letter|complain|petition|report|contact|convince|tell)\b.*\b(school|principal|workplace|government|authority|council|official|institution)\b|\b(community action|take action|campaign|petition|clean air policy)\b/.test(q)) {
    return {title:'Turn concern into a specific request',body:'Use Community Action to prepare a respectful note asking a school, workplace, or local authority for monitoring and clear, evidence-based outdoor-activity policies. Model predictions must be identified as estimates; avoid assigning unverified blame.',intent:'community'};
  }
  if (/\b(tomorrow|next day)\b/.test(q)) {
    if (!data?.points?.length) return {title:'Tomorrow’s forecast is unavailable',body:'The forecast provider is unavailable right now. AirGuard cannot compare dates without actual model data. You can still read the general protection advice or try refreshing later.',intent:'data'};
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
    const tomorrowDate=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7))-1,Number(today.slice(8,10))+1));
    const tomorrow=tomorrowDate.toISOString().slice(0,10);
    const todayMap=new Map(data.points.filter(p=>p.time?.slice(0,10)===today && p.pm25!==null && dateAtLocalHour(p.time)>now).map(p=>[p.time.slice(11,13),p.pm25]));
    const nextMap=new Map(data.points.filter(p=>p.time?.slice(0,10)===tomorrow && p.pm25!==null).map(p=>[p.time.slice(11,13),p.pm25]));
    const matched=[...todayMap.keys()].filter(hour=>nextMap.has(hour));
    if(matched.length<3)return {title:'Not enough comparable forecast hours',body:`I cannot reliably compare today with tomorrow (${tomorrow}) because fewer than three future hours have matched forecast coverage. Please check the forecast chart or try another day.`,intent:'data'};
    const avg=(values)=>values.reduce((sum,n)=>sum+n,0)/values.length;
    const todayAvg=avg(matched.map(h=>todayMap.get(h)));
    const tomorrowAvg=avg(matched.map(h=>nextMap.get(h)));
    const change=Math.abs(tomorrowAvg-todayAvg).toFixed(1);
    const relation=tomorrowAvg<todayAvg?'lower':tomorrowAvg>todayAvg?'higher':'the same';
    return {title:`Tomorrow, ${tomorrow}: a matched-hour comparison`,body:`For ${matched.length} comparable clock-hours (those still ahead today), today’s modeled mean PM2.5 is ${todayAvg.toFixed(1)} µg/m³ and tomorrow’s is ${tomorrowAvg.toFixed(1)} µg/m³. Tomorrow is modeled ${relation} by ${change} µg/m³ for those hours. This is not a full-day average or a safety guarantee; forecasts may change.`,intent:'trend'};
  }
  const family=/\b(child|children|kid|kids|school|baby|babies|elder|elderly|parent|asthma|lung|heart)\b/.test(q);
  if(family && /\b(can|safe|should|outdoor|outside|play|health|protect|risk|expos|sport)\b/.test(q)) {
    const plan=planWindows(data,{activity:'school',duration:1,horizon:48,now});
    const windowAdvice=plan.best?` For necessary one-hour activities, the lowest modeled PM2.5 window in the next 48 hours begins ${fmtDate(plan.best.start)} PKT; that does not make it safe.`:'';
    return {title:'Plan with vulnerable people in mind',body:`${lead}When pollution is high, reduce prolonged strenuous outdoor activity for children and people with heart or lung concerns when possible. Check verified local advisories and their clinician’s advice.${windowAdvice} AirGuard does not assess personal medical risk.`,intent:'family'};
  }
  if(/\b(when|best time|go outside|walk|run|jog|exercise|football|play|commute|cycling|bicycle)\b/.test(q)) {
    const plan=planWindows(data,{activity:/run|jog|exercise|football|sports/.test(q)?'exercise':family?'school':'errands',duration:1,horizon:48,now});
    return {title:'Find a better hour',body:`${lead}${plan.best?`For a one-hour activity, the lowest modeled PM2.5 window in the next 48 hours begins ${fmtDate(plan.best.start)} PKT. This is a comparison, not a guarantee of safe air.`:'There is insufficient current forecast data to identify a better hour.'} Open AirTwin to compare duration and activity type.`,intent:'plan'};
  }
  if(family)return {title:'Protect the people you care about',body:`${lead}On polluted days, consider reducing prolonged outdoor exertion for sensitive people, planning necessary travel for relatively lower-PM2.5 hours, and checking official local guidance. This tool does not diagnose a condition. Open Family Shield for a practical note.`,intent:'family'};
  if(/\b(why|cause|source|factory|traffic|smog|emission)\b/.test(q))return {title:'What the model can — and cannot — explain',body:'PM2.5 can come from transport, combustion, industry, dust-related processes and atmospheric reactions. AirGuard cannot assign today’s city pollution to a specific factory, road or person without source-apportionment measurements. Weather and seasonal conditions affect concentrations too.',intent:'science'};
  if(/\b(pm2[.,]?5|aqi|air quality index|guideline|particulate|pollutant|pollution|air quality)\b/.test(q))return {title:'Two useful air-quality measures',body:`${lead}PM2.5 means fine airborne particles no more than 2.5 micrometres in diameter, shown in µg/m³. US AQI summarizes air-pollution health concern using an index; it is not a concentration. WHO’s 2021 PM2.5 24-hour guideline is 15 µg/m³, not an hourly safe/unsafe cutoff.`,intent:'science'};
  if(/\b(help|action|community|government|petition)\b/.test(q))return {title:'Turn concern into a practical request',body:'Open Community Action for school, workplace and public-office drafts. Check official advisories, and do not claim a pollution reduction without actual evidence.',intent:'community'};
  return {title:'AirGuard only answers what it can support',body:'I can help with air quality, timing outdoor plans, practical family protection and community action using modeled forecasts. Try “When should I go for a run?”, “What does PM2.5 mean?”, “Is tomorrow better?” or “How can I ask my school to act?” I will not invent an answer.',intent:'unknown'};
}
export function createLetter({audience='school',city='Lahore',aqi=null,time=null,language='english',cached=false}={}){
 const reading=aqi===null?'currently unavailable':`approximately ${aqi} US AQI`;
 const observed=`AirGuard shows a Copernicus CAMS model estimate of ${reading} for ${city}${time?` at ${time} (Pakistan time)`:''}. It is a forecast/model estimate, not a verified ground-monitor reading.`;
 if(language==='urdu'){
  const to=audience==='school'?'اسکول انتظامیہ':audience==='work'?'ادارے کی انتظامیہ':'مقامی انتظامیہ';
  return `موضوع: صاف ہوا کے لیے عملی اقدامات کی درخواست\n\nمحترم ${to}،\n\n${city} میں فضائی آلودگی کے پیشِ نظر گزارش ہے کہ بچوں، بزرگوں اور باہر کام کرنے والے افراد کی حفاظت کے لیے واضح منصوبہ بنایا جائے۔\n\nبراہِ کرم معتبر مقامی سرکاری اعداد و شمار اور اعلانات کو دیکھیں، زیادہ آلودگی کے دنوں میں بیرونی سرگرمیوں کا وقت اور دورانیہ مناسب طور پر تبدیل کریں، اور متاثرہ افراد کو بروقت اطلاع دیں۔\n\nAirGuard کا ڈیٹا ماڈل پر مبنی تخمینہ ہے، زمینی سینسر کی تصدیق شدہ پیمائش نہیں۔${cached?' یہ محفوظ شدہ پرانا ڈیٹا ہو سکتا ہے کیونکہ تازہ ڈیٹا دستیاب نہیں تھا۔':''} کسی مخصوص ادارے یا فرد کو اس بنیاد پر ذمہ دار نہ ٹھہرایا جائے۔\n\nشکریہ۔`;
 }
 const request=audience==='school'?'Please establish a written outdoor-activity protocol for high-pollution days, consider timetabling flexible outdoor sessions, and communicate with families using verified local advisories.':audience==='work'?'Please review outdoor work timing, breaks, and reasonable protective measures for exposed staff, and communicate plans using reliable local advisories.':'Please make verified air-quality data and public-health advice easier to access and publish practical responses for high-pollution days.';
 return `Subject: Practical clean-air protection request for ${city}\n\nDear ${audience==='school'?'School Leadership':audience==='work'?'Workplace Leadership':'Local Public Office'},\n\nI am writing as a concerned community member about air pollution affecting daily life in ${city}. ${observed}\n\n${request}\n\nCould you share the person responsible for this protocol, the information source used for decisions, and how updates will be communicated? I would appreciate a response and a realistic timeline.\n\nThis message does not attribute pollution to any particular source or claim proven harm.\n\nThank you for considering a practical, evidence-based response.\n\nPrepared with AirGuard · air-quality forecast sourced from Open-Meteo / Copernicus CAMS.`;
}
