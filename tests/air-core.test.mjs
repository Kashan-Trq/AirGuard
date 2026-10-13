import test from 'node:test';
import assert from 'node:assert/strict';
import {CITIES,cityById,normalizeProvider,aqiBand,planWindows,compareWindows,answerQuestion,createLetter,getTrend,fmtDate} from '../lib/air-core.mjs';
const now=new Date('2026-10-13T06:20:00.000Z'); // 11:20 in Pakistan
const sample=(concentrations=[100,80,60,40,20,30,35,50,80,100])=>({city:'Lahore',cityId:'lahore',current:{aqi:158,pm25:80,time:'2026-10-13T11:00'},points:concentrations.map((pm25,i)=>({time:`2026-10-13T${String(12+i).padStart(2,'0')}:00`,pm25,aqi:Math.round(pm25*2)}))});

test('City allowlist has unique known locations and rejects unexpected names',()=>{
 assert.equal(cityById('lahore')?.name,'Lahore');assert.equal(cityById('LAHORE')?.name,'Lahore');
 assert.equal(cityById('https://evil.test'),null);assert.equal(new Set(CITIES.map(c=>c.id)).size,CITIES.length);
});
test('AQI category boundaries',()=>{
 assert.equal(aqiBand(50).label,'Good');assert.equal(aqiBand(51).label,'Moderate');assert.equal(aqiBand(100).label,'Moderate');
 assert.equal(aqiBand(101).label,'Unhealthy for sensitive groups');assert.equal(aqiBand(151).label,'Unhealthy');
 assert.equal(aqiBand(301).label,'Hazardous');assert.equal(aqiBand(null).label,'Unavailable');
});
test('Provider response normalization does not invent missing or negative values',()=>{
 const city=cityById('lahore');const response=normalizeProvider({current:{time:'2026-10-13T12:00',us_aqi:110,pm2_5:null},hourly:{time:['2026-10-13T12:00','bad-time'],pm2_5:[54,-1],us_aqi:[140,null]}},city,'2026-10-13T07:00:00Z');
 assert.equal(response.points.length,1);assert.equal(response.points[0].pm25,54);assert.equal(response.current.pm25,null);
 assert.equal(response.points[0].aqi,140);assert.equal(response.source.includes('CAMS'),true);
 assert.throws(()=>normalizeProvider({hourly:{time:[]}},city));
});
test('Planner chooses lowest PM2.5 window and makes comparison transparent',()=>{
 const result=planWindows(sample(),{activity:'school',duration:2,horizon:8,now});
 assert.equal(result.best.start,'2026-10-13T16:00');
 assert.equal(result.best.pm25,25);
 assert.equal(result.best.inhaledMicrograms,50);
 assert.equal(result.baseline.inhaledMicrograms,180);
 assert.equal(compareWindows(result.best,result.baseline),72);
 assert.equal(result.assumptions.ventilation,1);
});
test('Planner respects activity rate and refuses missing/interrupted readings',()=>{
 const original=sample();original.points[2].pm25=null;
 const result=planWindows(original,{activity:'exercise',duration:2,horizon:7,now});
 assert.ok(result.ranked.every(p=>p.inhaledMicrograms===p.pm25*2*2));
 assert.ok(result.ranked.every(p=>p.start!=='2026-10-13T13:00' && p.start!=='2026-10-13T14:00'));
 const broken=sample([null,null,null]);assert.equal(planWindows(broken,{activity:'school',duration:2,horizon:8,now}).best,null);
});
test('Planner does not mix unequal comparison durations',()=>{
 const one=planWindows(sample(),{duration:1,horizon:6,now});const two=planWindows(sample(),{duration:3,horizon:6,now});
 assert.ok(one.ranked.every(x=>x.duration===1));assert.ok(two.ranked.every(x=>x.duration===3));
 assert.equal(compareWindows(null,two.baseline),null);
});
test('Answers handle air questions but decline unsupported topics',()=>{
 assert.equal(answerQuestion('When should I walk?',sample(),now).intent,'plan');
 assert.equal(answerQuestion('What is PM2.5?',sample(),now).intent,'science');
 assert.equal(answerQuestion('What is the capital of Argentina?',sample(),now).intent,'unknown');
 assert.equal(answerQuestion('Can my child play outside?',sample(),now).intent,'family'); // family safety intent takes priority
});
test('Family letters are usable and always distinguish model from measurements',()=>{
 const english=createLetter({city:'Lahore',aqi:160,time:'Tue 1 PM',audience:'school'});
 assert.match(english,/CAMS model estimate/);assert.match(english,/not a verified ground-monitor reading/);
 assert.match(english,/Dear School Leadership/);
 const urdu=createLetter({city:'Lahore',language:'urdu'});
 assert.match(urdu,/زمینی سینسر/);
});
test('Times display in the Pakistan timezone without server locale dependence',()=>{
 assert.match(fmtDate('2026-10-13T15:00'),/3\s?PM/i);
 assert.equal(getTrend(sample(),now).direction==='unknown',true); // fewer than 12 later points
});

test('All planned activity hours fit inside the requested horizon',()=>{
 const start=new Date('2026-10-13T06:00:00Z');
 const points=Array.from({length:20},(_,i)=>({time:`2026-10-13T${String(11+i).padStart(2,'0')}:00`,pm25:i===7?0:30,aqi:100}));
 // Use dates on both sides of midnight so the horizon test covers midnight too.
 const actual=points.map((p,i)=>({...p,time:new Date(start.getTime()+i*3600000).toLocaleString('sv-SE',{timeZone:'Asia/Karachi',hourCycle:'h23'}).replace(' ','T').slice(0,16)}));
 const result=planWindows({points:actual},{duration:3,horizon:6,now:start});
 assert.ok(result.best);
 for(const window of result.ranked){
  const begin=new Date(window.start+':00+05:00').getTime();
  assert.ok(begin+window.duration*3600000<=start.getTime()+6*3600000,`${window.start} ends beyond horizon`);
 }
});

test('Questions correctly distinguish tomorrow, action requests, vulnerable people and general guidance',()=>{
 assert.equal(answerQuestion('How do I ask my school to act?',sample(),now).intent,'community');
 assert.equal(answerQuestion('Is tomorrow less polluted?',null,now).intent,'data');
 assert.equal(answerQuestion('What is PM2.5?',null,now).intent,'science');
 assert.equal(answerQuestion('Can children play outside?',null,now).intent,'family');
 assert.equal(answerQuestion('When should I go for a run?',null,now).intent,'plan');
});

test('Tomorrow comparison uses the Pakistan calendar and matched hours, not generic next 12 hours',()=>{
 const hours=[];
 const date='2026-10-13';
 for(let i=12;i<24;i++)hours.push({time:`${date}T${String(i).padStart(2,'0')}:00`,pm25:100,aqi:160});
 for(let i=0;i<24;i++)hours.push({time:`2026-10-14T${String(i).padStart(2,'0')}:00`,pm25:20,aqi:70});
 const answer=answerQuestion('Is tomorrow less polluted?',{city:'Lahore',points:hours,current:{aqi:160}},now);
 assert.equal(answer.intent,'trend');
 assert.match(answer.title,/2026-10-14/);
 assert.match(answer.body,/modeled lower/);
 assert.match(answer.body,/matched|comparable/i);
});
