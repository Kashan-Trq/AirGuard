"""Optional browser smoke suite. Requires Python Playwright + installed Chromium.
Runs entirely offline by mounting app source into a sandboxed about:blank document.
It cannot validate live Vercel routing or external provider connectivity.
"""
from pathlib import Path
import json,re
from datetime import datetime,timedelta,timezone
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
NOW=datetime.now(timezone(timedelta(hours=5)))
POINTS=[]
for h in range(96):
 t=(NOW.replace(minute=0,second=0,microsecond=0)+timedelta(hours=h))
 POINTS.append({'time':t.strftime('%Y-%m-%dT%H:%M'),'pm2_5':34+h%7,'us_aqi':90+h%8,'pm10':55,'nitrogen_dioxide':15,'ozone':28,'dust':5})
RAW={'hourly':{name:[p[name] for p in POINTS] for name in ['pm2_5','us_aqi','pm10','nitrogen_dioxide','ozone','dust']}|{'time':[p['time'] for p in POINTS]},'current':{'time':POINTS[0]['time'],'pm2_5':32,'us_aqi':90,'pm10':48,'nitrogen_dioxide':15,'ozone':28}}

def build(page):
 html=(ROOT/'index.html').read_text().replace('<link rel="stylesheet" href="/app.css">','<style>'+(ROOT/'app.css').read_text()+'</style>').replace('<script type="module" src="/app.js"></script>','')
 page.set_content(html)
 page.evaluate('''() => {window.open=()=>({closed:false}); window.scrollTo=()=>{};
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}}});
  Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(){}}});}''')
 sources=[]
 for f in ['lib/air-core.mjs','lib/forecast-transport.mjs','app.js']:
  s=(ROOT/f).read_text()
  s=re.sub(r'^import [^;]+;\s*','',s,flags=re.M)
  s=re.sub(r'\bexport (?=(?:const|class|function|async function)\b)','',s)
  sources.append(s)
 return '\n'.join(sources)

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 count=0
 for scenario in ('html_fallback','total_outage','malformed_provider','retry_after_outage'):
  page=browser.new_page(viewport={'width':390,'height':844})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  script=build(page)
  page.evaluate('(raw)=>{window.__RAW=raw;window.__UP=false}',RAW)
  page.evaluate('''(scenario)=>{window.__SCENARIO=scenario;window.__CALLS=[];
  window.fetch=async(url)=>{
   const u=String(url);window.__CALLS.push(u);
   if(u.startsWith('/api/'))return new Response('A server error has occurred',{status:500,headers:{'content-type':'text/html'}});
   if(window.__SCENARIO==='html_fallback'||(window.__SCENARIO==='retry_after_outage'&&window.__UP))return new Response(JSON.stringify(window.__RAW),{status:200,headers:{'content-type':'application/json'}});
   if(window.__SCENARIO==='malformed_provider')return new Response('{broken',{status:200,headers:{'content-type':'application/json'}});
   return new Response('provider down',{status:500,headers:{'content-type':'text/html'}})
  }}''',scenario)
  page.add_script_tag(content=script)
  page.wait_for_function('!document.getElementById("source-state").textContent.includes("Updating")',timeout=4500)
  source=page.locator('#source-state').inner_text()
  if scenario=='html_fallback':
   assert source=='Direct provider data',source
   page.evaluate('document.querySelector("[data-view=airtwin]").click()')
   assert page.locator('#plan-form button[type="submit"]').is_enabled()
  else:
   assert source=='Source unavailable',source
   assert page.locator('#retry-forecast').count()==1
   page.evaluate('document.querySelector("[data-view=airtwin]").click()')
   assert not page.locator('#plan-form button[type="submit"]').is_enabled()
   if scenario=='retry_after_outage':
    page.evaluate('window.__UP=true')
    page.evaluate('document.querySelector("#refresh-btn").click()')
    page.wait_for_function('document.getElementById("source-state").textContent==="Direct provider data"',timeout=4500)
    assert page.locator('#plan-form button[type="submit"]').is_enabled()
  assert not errors,errors
  assert page.evaluate('window.__CALLS.length')>=2
  count+=1
  print('PASS',scenario,flush=True)
  page.close()
 browser.close()
print('Browser recovery scenarios passed:',count)
