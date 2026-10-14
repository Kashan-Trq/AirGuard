import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('Static entrypoint references files shipped in package',async()=>{
 const html=await readFile(path.join(ROOT,'index.html'),'utf8');
 for(const file of ['app.css','app.js','manifest.webmanifest','assets/favicon.svg','assets/logo.svg']){
  assert.ok(html.includes(file),`${file} not referenced by HTML`);
  assert.ok((await readFile(path.join(ROOT,file))).length>0,`${file} missing or empty`);
 }
 assert.ok(html.includes('Skip to content'));assert.ok(html.includes('lang="en"'));
});

test('Actual frontend module initializes and renders major workflows without JS runtime errors',async()=>{
 const handlers=new Map(),map=new Map(),nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){}},options:{length:0},addEventListener:(event,fn)=>handlers.set(id+':'+event,fn),scrollIntoView(){}});return nodes.get(id)}
 const original={document:globalThis.document,location:globalThis.location,localStorage:globalThis.localStorage,window:globalThis.window,navigator:globalThis.navigator,fetch:globalThis.fetch};
 const base=new Date();const pkDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit'}).format(base);
 const provider={city:'Lahore',cityId:'lahore',current:{time:`${pkDate}T10:00`,aqi:145,pm25:65,pm10:80,no2:25},receivedAt:base.toISOString(),modelBased:true,points:Array.from({length:110},(_,i)=>{const millis=base.getTime()+i*3600000+3600000;const iso=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).format(new Date(millis)).replace(' ','T')+':00';return {time:iso,aqi:Math.round(120+i%25),pm25:35+(i%10),pm10:60+(i%15),no2:30};})};
 try{
  globalThis.document={querySelector:node,querySelectorAll:()=>[],addEventListener:(event,fn)=>handlers.set(event,fn)};
  globalThis.location={hash:'',protocol:'http:'};
  globalThis.localStorage={getItem:key=>map.get(key)||null,setItem:(key,val)=>map.set(key,val),removeItem:key=>map.delete(key)};
  globalThis.window={addEventListener:(event,fn)=>handlers.set(event,fn),scrollTo(){},open(){}};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
  globalThis.fetch=async()=>Response.json(provider);
  await import('../app.js?smoke=1');
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.match(node('#app-view').innerHTML,/Air quality/);
  assert.match(node('#app-view').innerHTML,/145/);
  assert.match(node('#app-view').innerHTML,/forecast-svg/);
  assert.equal(node('#source-state').textContent,'Model forecast');
  globalThis.location.hash='#airtwin';handlers.get('hashchange')();
  assert.match(node('#app-view').innerHTML,/Calculate my AirTwin/);
  const previousFormData=globalThis.FormData;
  globalThis.FormData=class{constructor(){this.info={activity:'school',duration:'2',horizon:'24'}}get(key){return this.info[key]}};
  handlers.get('submit')({target:{id:'plan-form'},preventDefault(){}});
  assert.match(node('#app-view').innerHTML,/Your lowest modeled PM2.5 window/);
  globalThis.location.hash='#ask';handlers.get('hashchange')();
  const askForm=globalThis.FormData;
  globalThis.FormData=class{get(){return 'When should I walk?'}};
  handlers.get('submit')({target:{id:'ask-form'},preventDefault(){}});
  assert.match(node('#app-view').innerHTML,/Find a better hour/);
  globalThis.FormData=previousFormData;
  globalThis.location.hash='#family';handlers.get('hashchange')();
  assert.match(node('#app-view').innerHTML,/letter-output/);
  assert.match(node('#app-view').innerHTML,/Read aloud/);
  globalThis.location.hash='#community';handlers.get('hashchange')();
  assert.match(node('#app-view').innerHTML,/Personal action checklist/);
  globalThis.location.hash='#science';handlers.get('hashchange')();
  assert.match(node('#app-view').innerHTML,/Provenance record/);
 }finally{
  for(const key of ['document','location','localStorage','window','fetch']){
   if(original[key]===undefined)delete globalThis[key];else globalThis[key]=original[key];
  }
  if(original.navigator===undefined)delete globalThis.navigator;else Object.defineProperty(globalThis,'navigator',{configurable:true,value:original.navigator});
 }
});
