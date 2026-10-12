export const DEFAULTS = {
  location: { name: 'Lahore', admin1: 'Punjab', country: 'Pakistan', latitude: 31.5204, longitude: 74.3587 },
  activityDuration: 45,
  stepMinutes: 15,
};

export function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
export function mean(values) {
  const nums = values.filter(Number.isFinite);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : NaN;
}
export function median(values) {
  const nums = values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if (!nums.length) return NaN;
  const m = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[m] : (nums[m - 1] + nums[m]) / 2;
}
export function percentile(values, p) {
  const nums = values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if (!nums.length) return NaN;
  const idx = clamp((nums.length - 1) * p, 0, nums.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx), t = idx - lo;
  return nums[lo] * (1 - t) + nums[hi] * t;
}

export function isoDate(iso) { return iso?.slice(0, 10) || ''; }
export function isoHour(iso) { return Number(iso?.slice(11, 13)); }
export function isoMinute(iso) { return Number(iso?.slice(14, 16) || 0); }
export function minuteOfDayFromIso(iso) { return isoHour(iso) * 60 + isoMinute(iso); }

export function formatClock(mins) {
  let m = Math.round(mins);
  m = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(mm).padStart(2,'0')} ${suffix}`;
}

export function formatDateLabel(dateStr, todayStr = null) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00Z`);
  const label = d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:'UTC' });
  if (todayStr) {
    const today = new Date(`${todayStr}T12:00:00Z`);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return `Today · ${label}`;
    if (diff === 1) return `Tomorrow · ${label}`;
  }
  return label;
}

export function aqiCategory(aqi) {
  if (!Number.isFinite(aqi)) return { label:'AQI unavailable', tone:'neutral' };
  if (aqi <= 50) return { label:'Good', tone:'good' };
  if (aqi <= 100) return { label:'Moderate', tone:'moderate' };
  if (aqi <= 150) return { label:'Unhealthy for sensitive groups', tone:'caution' };
  if (aqi <= 200) return { label:'Unhealthy', tone:'unhealthy' };
  if (aqi <= 300) return { label:'Very unhealthy', tone:'very-unhealthy' };
  return { label:'Hazardous', tone:'hazardous' };
}

export function relativePmBand(pm, values) {
  if (!Number.isFinite(pm)) return 'Unknown';
  const q1 = percentile(values, .25), q3 = percentile(values, .75);
  if (!Number.isFinite(q1) || !Number.isFinite(q3)) return 'Current';
  if (pm <= q1) return 'Lower than most nearby hours';
  if (pm >= q3) return 'Higher than most nearby hours';
  return 'Mid-range for nearby hours';
}

export function exposureProxy(pm25, durationMinutes, intensity = 1) {
  if (![pm25, durationMinutes, intensity].every(Number.isFinite)) return NaN;
  return pm25 * (durationMinutes / 60) * intensity;
}

function rowAtMinute(dayRows, minute) {
  const hour = Math.floor(clamp(minute, 0, 1439) / 60);
  return dayRows.find(r => isoHour(r.time) === hour) || null;
}

export function windowStats(dayRows, startMinute, durationMinutes, stepMinutes = 15) {
  if (!dayRows?.length || durationMinutes <= 0) return null;
  const pieces = [];
  for (let m = startMinute; m < startMinute + durationMinutes - 1e-9; m += stepMinutes) {
    const segment = Math.min(stepMinutes, startMinute + durationMinutes - m);
    const row = rowAtMinute(dayRows, m + segment / 2);
    if (!row || !Number.isFinite(row.pm25)) return null;
    pieces.push({ row, minutes: segment });
  }
  const weighted = key => {
    const valid = pieces.filter(p => Number.isFinite(p.row[key]));
    if (!valid.length) return NaN;
    const denom = valid.reduce((s,p)=>s+p.minutes,0);
    return valid.reduce((s,p)=>s+p.row[key]*p.minutes,0) / denom;
  };
  return {
    startMinute,
    endMinute: startMinute + durationMinutes,
    durationMinutes,
    pm25: weighted('pm25'),
    pm10: weighted('pm10'),
    aqi: weighted('aqi'),
    temp: weighted('temp'),
    apparent: weighted('apparent'),
    humidity: weighted('humidity'),
    wind: weighted('wind'),
    rain: weighted('rain'),
    uv: weighted('uv'),
    dust: weighted('dust'),
    no2: weighted('no2'),
    ozone: weighted('ozone'),
  };
}

export function practicalFlags(window, intent = 'general') {
  const flags = [];
  if (!window) return flags;
  if (Number.isFinite(window.rain) && window.rain >= 0.6) flags.push({type:'weather', level:'caution', text:'Rain is forecast during this window.'});
  if (Number.isFinite(window.apparent) && window.apparent >= 36) flags.push({type:'heat', level:'caution', text:'High apparent temperature may make outdoor activity uncomfortable.'});
  if (Number.isFinite(window.apparent) && window.apparent <= 5) flags.push({type:'cold', level:'caution', text:'Low apparent temperature may make outdoor activity uncomfortable.'});
  if (intent !== 'ventilation' && Number.isFinite(window.uv) && window.uv >= 8) flags.push({type:'uv', level:'caution', text:'UV is forecast to be high during this window.'});
  return flags;
}

export function candidateWindows(rows, { date, earliest = 360, latest = 1200, duration = 45, step = 15, intent = 'general' } = {}) {
  const day = rows.filter(r => isoDate(r.time) === date);
  const out = [];
  for (let start = earliest; start + duration <= latest + 1e-9; start += step) {
    const stats = windowStats(day, start, duration, step);
    if (!stats) continue;
    const flags = practicalFlags(stats, intent);
    out.push({ ...stats, flags, proxy: exposureProxy(stats.pm25, duration) });
  }
  return out;
}

export function bestWindow(rows, options = {}) {
  const candidates = candidateWindows(rows, options);
  if (!candidates.length) return null;
  candidates.sort((a,b)=>{
    if (a.pm25 !== b.pm25) return a.pm25 - b.pm25;
    const ar = Number.isFinite(a.rain) ? a.rain : 0;
    const br = Number.isFinite(b.rain) ? b.rain : 0;
    if (ar !== br) return ar - br;
    return a.startMinute - b.startMinute;
  });
  const best = candidates[0];
  const second = candidates[1] || null;
  return { ...best, candidates, confidence: decisionConfidence(best, second, candidates) };
}

export function decisionConfidence(best, second, candidates = []) {
  if (!best) return { level:'Low', score:0, reason:'No usable forecast window.' };
  const completeness = candidates.length ? candidates.filter(c=>Number.isFinite(c.pm25)).length / candidates.length : 0;
  const gap = second && best.pm25 > 0 ? (second.pm25 - best.pm25) / best.pm25 : 0;
  const spreadValues = candidates.map(c=>c.pm25).filter(Number.isFinite);
  const spread = spreadValues.length ? (Math.max(...spreadValues) - Math.min(...spreadValues)) / Math.max(1, median(spreadValues)) : 0;
  let score = 50 * completeness + 25 * clamp(gap / .12, 0, 1) + 25 * clamp(spread / .35, 0, 1);
  score = Math.round(clamp(score, 0, 100));
  const level = score >= 78 ? 'High' : score >= 55 ? 'Medium' : 'Low';
  const reason = level === 'High' ? 'The preferred window is clearly separated from nearby alternatives.' : level === 'Medium' ? 'Several nearby windows are fairly similar, so timing can remain flexible.' : 'The forecast windows are similar or data coverage is limited.';
  return { level, score, reason };
}

export function percentReduction(baselineProxy, betterProxy) {
  if (!Number.isFinite(baselineProxy) || baselineProxy <= 0 || !Number.isFinite(betterProxy)) return NaN;
  return (baselineProxy - betterProxy) / baselineProxy * 100;
}

export function oneBetterHour(rows, date, baselineMinute = null) {
  const choice = bestWindow(rows, { date, earliest: 360, latest: 1320, duration: 60, step: 15, intent:'general' });
  if (!choice) return null;
  const day = rows.filter(r=>isoDate(r.time)===date);
  const baseline = baselineMinute == null ? null : windowStats(day, baselineMinute, 60, 15);
  const reduction = baseline ? percentReduction(exposureProxy(baseline.pm25,60), exposureProxy(choice.pm25,60)) : NaN;
  return { ...choice, baseline, reduction };
}

export function ventilationWindow(rows, {date, earliest=360, latest=1320, duration=30} = {}) {
  const candidates = candidateWindows(rows,{date,earliest,latest,duration,step:15,intent:'ventilation'})
    .filter(c => !Number.isFinite(c.rain) || c.rain < 0.6);
  if (!candidates.length) return null;
  candidates.sort((a,b)=>a.pm25-b.pm25 || (a.humidity??999)-(b.humidity??999));
  return candidates[0];
}

export function intensityFactor(kind='general') {
  const map = { general:1, walk:1.15, commute:1.15, children:1.25, school:1.3, cycling:1.65, run:1.9, sport:1.8 };
  return map[kind] || 1;
}

export function optimizeSchoolSchedule(rows, { date, schoolStart = 420, schoolEnd = 840, activities = [] } = {}) {
  const clean = activities
    .filter(a => a?.name && Number.isFinite(a.duration) && a.duration > 0)
    .slice(0, 6)
    .map((a,i)=>({ id:a.id ?? `a${i}`, name:a.name, duration:a.duration, intensity:Number.isFinite(a.intensity)?a.intensity:1.3 }));
  if (!clean.length) return { assignments:[], totalProxy:0, feasible:true };
  const totalSlots = Math.floor((schoolEnd - schoolStart) / 15);
  if (totalSlots <= 0 || totalSlots > 64) return { assignments:[], totalProxy:NaN, feasible:false, reason:'School day range is invalid.' };
  const day = rows.filter(r=>isoDate(r.time)===date);
  const candidateMap = new Map();
  for (const a of clean) {
    const slotsNeeded = Math.ceil(a.duration/15);
    const list = [];
    for (let s=0; s+slotsNeeded<=totalSlots; s++) {
      const startMinute = schoolStart + s*15;
      const stats = windowStats(day,startMinute,a.duration,15);
      if (!stats) continue;
      const mask = ((1n << BigInt(slotsNeeded)) - 1n) << BigInt(s);
      list.push({activity:a,startMinute,endMinute:startMinute+a.duration,stats,mask,cost:exposureProxy(stats.pm25,a.duration,a.intensity)});
    }
    list.sort((x,y)=>x.cost-y.cost);
    candidateMap.set(a.id,list);
  }
  if ([...candidateMap.values()].some(v=>!v.length)) return { assignments:[], totalProxy:NaN, feasible:false, reason:'Forecast coverage is insufficient for one or more activities.' };
  const ordered = clean.slice().sort((a,b)=>candidateMap.get(a.id).length-candidateMap.get(b.id).length || (b.duration*b.intensity)-(a.duration*a.intensity));
  const memo = new Map();
  function solve(i, usedMask) {
    if (i >= ordered.length) return { cost:0, picks:[] };
    const key = `${i}|${usedMask.toString()}`;
    if (memo.has(key)) return memo.get(key);
    const a = ordered[i];
    let best = null;
    for (const c of candidateMap.get(a.id)) {
      if ((c.mask & usedMask) !== 0n) continue;
      const rest = solve(i+1, usedMask | c.mask);
      if (!rest) continue;
      const total = c.cost + rest.cost;
      if (!best || total < best.cost) best = { cost:total, picks:[c, ...rest.picks] };
    }
    memo.set(key,best);
    return best;
  }
  const solution = solve(0,0n);
  if (!solution) return { assignments:[], totalProxy:NaN, feasible:false, reason:'The activities cannot fit in the selected school day without overlap.' };
  const assignments = solution.picks
    .sort((a,b)=>a.startMinute-b.startMinute)
    .map(p=>({ id:p.activity.id, name:p.activity.name, duration:p.activity.duration, intensity:p.activity.intensity, startMinute:p.startMinute, endMinute:p.endMinute, pm25:p.stats.pm25, proxy:p.cost, flags:practicalFlags(p.stats,'school') }));
  return { assignments, totalProxy:solution.cost, feasible:true };
}

function to24Hour(hour, minute=0, meridiem=null) {
  let h = Number(hour);
  if (!Number.isFinite(h)) return null;
  if (meridiem) {
    const m = meridiem.toLowerCase();
    if (m === 'pm' && h < 12) h += 12;
    if (m === 'am' && h === 12) h = 0;
  }
  if (h > 23) return null;
  return h*60 + Number(minute || 0);
}

function normalizeLooseTime(rawHour, rawMinute, meridiem, contextWord='') {
  let mins = to24Hour(rawHour, rawMinute, meridiem);
  if (mins == null) return null;
  if (!meridiem && Number(rawHour) <= 12) {
    const h = Number(rawHour);
    const ctx = contextWord.toLowerCase();
    if (/evening|afternoon|night/.test(ctx) && h < 12) mins += 12*60;
  }
  return mins;
}

export function parseNaturalQuery(query, { today = new Date().toISOString().slice(0,10) } = {}) {
  const q = String(query || '').trim();
  const lower = q.toLowerCase();
  let intent = 'general';
  let activity = 'outdoor activity';
  if (/window|ventilat|fresh air|air out/.test(lower)) { intent='ventilation'; activity='open the windows'; }
  else if (/assembly|recess|school|p\.e\.|\bpe\b/.test(lower)) { intent='school'; activity='school outdoor activity'; }
  else if (/run|jog/.test(lower)) { intent='run'; activity='run'; }
  else if (/football|cricket|sport|play/.test(lower)) { intent=/child|kid|son|daughter|brother|sister/.test(lower)?'children':'sport'; activity=/football/.test(lower)?'football':'outdoor sport'; }
  else if (/cycle|cycling|bike/.test(lower)) { intent='cycling'; activity='cycle'; }
  else if (/walk/.test(lower)) { intent='walk'; activity='walk'; }
  else if (/commute|office|work|college|university|school run/.test(lower)) { intent='commute'; activity='commute'; }

  let dayOffset = /day after tomorrow/.test(lower) ? 2 : /tomorrow/.test(lower) ? 1 : 0;
  const base = new Date(`${today}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dayOffset);
  const date = base.toISOString().slice(0,10);

  let duration = intent==='ventilation'?30:intent==='school'?30:intent==='run'?45:intent==='sport'?60:intent==='children'?45:intent==='commute'?30:45;
  let m = lower.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|hr)\b/);
  if (m) duration = Math.round(Number(m[1]) * 60);
  m = lower.match(/(\d+)\s*(minutes?|mins?|min)\b/);
  if (m) duration = Number(m[1]);
  duration = clamp(duration,15,180);

  let earliest = intent==='school'?420:intent==='run'?330:intent==='ventilation'?360:360;
  let latest = intent==='school'?840:intent==='run'?1260:intent==='ventilation'?1320:1320;
  let baselineMinute = null;

  const rangeRx = /(?:between|from)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:and|to|\-|–)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const rm = q.match(rangeRx);
  if (rm) {
    const sharedMeridiem = rm[3] || rm[6] || null;
    earliest = normalizeLooseTime(rm[1],rm[2],rm[3]||sharedMeridiem,lower) ?? earliest;
    latest = normalizeLooseTime(rm[4],rm[5],rm[6]||sharedMeridiem,lower) ?? latest;
    if (!rm[3] && !rm[6] && latest <= earliest && Number(rm[4]) <= 12) latest += 12*60;
  }

  const after = q.match(/after\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (after && !rm) earliest = normalizeLooseTime(after[1],after[2],after[3],lower) ?? earliest;
  const before = q.match(/before\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (before && !rm) latest = normalizeLooseTime(before[1],before[2],before[3],lower) ?? latest;

  const at = q.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (at) baselineMinute = normalizeLooseTime(at[1],at[2],at[3],lower);
  if (/\bnow\b/.test(lower)) {
    const now = new Date();
    baselineMinute = now.getHours()*60 + Math.floor(now.getMinutes()/15)*15;
    if (dayOffset === 0) earliest = Math.max(earliest, baselineMinute);
  }

  earliest = clamp(Math.round(earliest/15)*15,0,1425);
  latest = clamp(Math.round(latest/15)*15,15,1440);
  if (latest - earliest < duration) latest = clamp(earliest + duration,15,1440);
  return { raw:q, intent, activity, date, duration, earliest, latest, baselineMinute, intensity:intensityFactor(intent) };
}

export function englishDecisionSummary(plan, result, baseline = null) {
  if (!result) return 'I could not find a usable forecast window for that request.';
  const activity = plan?.activity || 'activity';
  let s = `For your ${activity}, the lowest modeled PM2.5 window I found is ${formatClock(result.startMinute)}–${formatClock(result.endMinute)} at about ${Math.round(result.pm25)} µg/m³.`;
  if (baseline && Number.isFinite(baseline.pm25)) {
    const b = exposureProxy(baseline.pm25, plan.duration, plan.intensity || 1);
    const r = exposureProxy(result.pm25, plan.duration, plan.intensity || 1);
    const pct = percentReduction(b,r);
    if (Number.isFinite(pct) && pct > 1) s += ` That is about ${Math.round(pct)}% lower on AirGuard’s relative concentration-time exposure proxy than the comparison time.`;
    else s += ' The comparison time is very similar, so shifting may not make much difference today.';
  }
  s += ' This is forecast-based planning guidance, not a medical safety guarantee.';
  return s;
}

export function urduDecisionSummary(plan, result, baseline = null) {
  if (!result) return 'اس درخواست کے لیے قابلِ استعمال پیش گوئی کا وقت نہیں ملا۔';
  let s = `آپ کی منتخب سرگرمی کے لیے نسبتاً کم ماڈل شدہ PM2.5 والا وقت ${formatClock(result.startMinute)} سے ${formatClock(result.endMinute)} ہے، جہاں اندازاً PM2.5 ${Math.round(result.pm25)} µg/m³ ہے۔`;
  if (baseline && Number.isFinite(baseline.pm25)) {
    const b = exposureProxy(baseline.pm25, plan.duration, plan.intensity || 1);
    const r = exposureProxy(result.pm25, plan.duration, plan.intensity || 1);
    const pct = percentReduction(b,r);
    if (Number.isFinite(pct) && pct > 1) s += ` یہ موازنہ کیے گئے وقت کے مقابلے میں AirGuard کے نسبتی exposure proxy پر تقریباً ${Math.round(pct)}٪ کم ہے۔`;
  }
  s += ' یہ پیش گوئی پر مبنی منصوبہ بندی ہے، طبی حفاظت کی ضمانت نہیں۔';
  return s;
}

export function sensorCsvAnalysis(records, duration = 45) {
  const clean = records
    .filter(r=>r && r.time && Number.isFinite(Number(r.pm25)))
    .map(r=>({time:String(r.time),pm25:Number(r.pm25)}))
    .sort((a,b)=>String(a.time).localeCompare(String(b.time)));
  if (!clean.length) return null;
  const values = clean.map(r=>r.pm25);
  const byDate = [...new Set(clean.map(r=>r.time.slice(0,10)))];
  const days = byDate.map(date=>{
    const rows = clean.filter(r=>r.time.slice(0,10)===date).map(r=>({time:r.time,pm25:r.pm25}));
    const best = bestWindow(rows,{date,earliest:0,latest:1440,duration,step:15,intent:'general'});
    return {date,best};
  });
  return { count:clean.length, min:Math.min(...values), max:Math.max(...values), median:median(values), days };
}
