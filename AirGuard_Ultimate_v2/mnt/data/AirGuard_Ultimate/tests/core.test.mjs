import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatClock, exposureProxy, bestWindow, optimizeSchoolSchedule, parseNaturalQuery,
  percentReduction, sensorCsvAnalysis
} from '../core.js';

function rowsFor(date='2026-10-12'){
  const rows=[];
  for(let h=0;h<24;h++){
    const pm = h>=6 && h<=8 ? 35 : h>=15 && h<=17 ? 55 : 90;
    rows.push({time:`${date}T${String(h).padStart(2,'0')}:00`,pm25:pm,pm10:pm*1.3,aqi:100,temp:28,apparent:29,humidity:55,wind:8,rain:0,uv:h>=10&&h<=15?7:1});
  }
  return rows;
}

test('formatClock handles AM/PM boundaries',()=>{
  assert.equal(formatClock(0),'12:00 AM');
  assert.equal(formatClock(780),'1:00 PM');
  assert.equal(formatClock(1439),'11:59 PM');
});

test('exposure proxy is concentration x hours x factor',()=>{
  assert.equal(exposureProxy(60,30,1.5),45);
});

test('bestWindow finds the low-PM period inside constraints',()=>{
  const result=bestWindow(rowsFor(),{date:'2026-10-12',earliest:360,latest:720,duration:45,step:15,intent:'run'});
  assert.ok(result);
  assert.equal(result.pm25,35);
  assert.ok(result.startMinute>=360 && result.endMinute<=720);
});

test('percentReduction compares relative proxies',()=>{
  assert.equal(percentReduction(100,70),30);
});

test('natural query parser understands tomorrow, duration and range',()=>{
  const p=parseNaturalQuery('When should I run tomorrow between 6 AM and 9 AM for 45 minutes?',{today:'2026-10-12'});
  assert.equal(p.intent,'run');
  assert.equal(p.date,'2026-10-13');
  assert.equal(p.duration,45);
  assert.equal(p.earliest,360);
  assert.equal(p.latest,540);
});

test('school optimizer returns non-overlapping assignments',()=>{
  const sol=optimizeSchoolSchedule(rowsFor(),{
    date:'2026-10-12',schoolStart:420,schoolEnd:720,
    activities:[
      {id:'a',name:'Assembly',duration:30,intensity:1},
      {id:'b',name:'Recess',duration:30,intensity:1.2},
      {id:'c',name:'PE',duration:45,intensity:1.8}
    ]
  });
  assert.equal(sol.feasible,true);
  assert.equal(sol.assignments.length,3);
  for(let i=0;i<sol.assignments.length;i++){
    for(let j=i+1;j<sol.assignments.length;j++){
      const a=sol.assignments[i],b=sol.assignments[j];
      assert.ok(a.endMinute<=b.startMinute || b.endMinute<=a.startMinute);
    }
  }
});

test('sensor analysis accepts observed rows',()=>{
  const input=rowsFor().map(r=>({time:r.time,pm25:r.pm25}));
  const a=sensorCsvAnalysis(input,45);
  assert.equal(a.count,24);
  assert.ok(a.days[0].best);
  assert.equal(a.days[0].best.pm25,35);
});

test('natural query parser handles football and ventilation examples',()=>{
  const p1=parseNaturalQuery('When should my younger brother play football tomorrow between 3 PM and 6 PM for 45 minutes?',{today:'2026-10-12'});
  assert.equal(p1.intent,'children');
  assert.equal(p1.earliest,900);
  assert.equal(p1.latest,1080);
  assert.equal(p1.duration,45);
  const p2=parseNaturalQuery('When should I open the windows today for 30 minutes?',{today:'2026-10-12'});
  assert.equal(p2.intent,'ventilation');
  assert.equal(p2.duration,30);
});

test('school optimizer preserves a 20-minute activity duration',()=>{
  const sol=optimizeSchoolSchedule(rowsFor(),{
    date:'2026-10-12',schoolStart:420,schoolEnd:600,
    activities:[{id:'a',name:'Assembly',duration:20,intensity:1}]
  });
  assert.equal(sol.feasible,true);
  assert.equal(sol.assignments[0].duration,20);
  assert.equal(sol.assignments[0].endMinute-sol.assignments[0].startMinute,20);
});
