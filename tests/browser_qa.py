from playwright.sync_api import sync_playwright
from datetime import datetime,timedelta,timezone
import sys
import json, traceback
URL='https://airguard.test/'
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
now=datetime.now(timezone(timedelta(hours=5)))
start=now.replace(minute=0,second=0,microsecond=0)
pts=[]
for i in range(122):
 t=start+timedelta(hours=i)
 pts.append(dict(time=t.strftime('%Y-%m-%dT%H:%M'),aqi=100+i%31,pm25=30+(i%14),pm10=60+(i%19),no2=19+(i%5),ozone=42,dust=11))
DATA={'city':'Lahore','cityId':'lahore','latitude':31.5204,'longitude':74.3587,'receivedAt':datetime.now(timezone.utc).isoformat(),'modelBased':True,'source':'Open-Meteo / CAMS Global','timezone':'Asia/Karachi','spatialResolution':'45 km','current':{'time':start.strftime('%Y-%m-%dT%H:%M'),'aqi':125,'pm25':38,'pm10':75,'no2':23,'ozone':42},'points':pts}
failures=[];pass_count=0

def check(name,fn):
 global pass_count
 try:
  fn();pass_count+=1;print('PASS',name)
 except Exception as e:
  failures.append((name,str(e)));print('FAIL',name,str(e)[:200])

def screen_suite(browser,size):
 global pass_count
 context=browser.new_context(viewport=size,accept_downloads=True,service_workers='block')
 page=context.new_page(); page.set_default_timeout(1000); errs=[]
 page.on('pageerror',lambda e:errs.append(str(e)))
 def handler(route):
  from urllib.parse import urlparse, parse_qs
  parsed=urlparse(route.request.url)
  if parsed.path=='/api/air':
   cid=parse_qs(parsed.query).get('city',['lahore'])[0]
   route.fulfill(status=200,content_type='application/json',body=json.dumps({**DATA,'cityId':cid,'city':cid.title()}))
   return
  file=ROOT/(parsed.path.lstrip('/') or 'index.html')
  if file.is_file() and file.resolve().is_relative_to(ROOT):
   ct={'.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.md':'text/plain'}.get(file.suffix,'application/octet-stream')
   route.fulfill(status=200,content_type=ct,body=file.read_bytes());return
  route.fulfill(status=404,body='Not found')
 # Browser network navigation is restricted here; load real UI sources into an isolated document.
 import re
 html=(ROOT/'index.html').read_text()
 html=re.sub(r'<link rel="stylesheet" href="/app.css">','<style>'+ (ROOT/'app.css').read_text()+'</style>',html)
 html=html.replace('<script type="module" src="/app.js"></script>','')
 page.goto('about:blank')
 page.set_content(html,wait_until='domcontentloaded')
 page.evaluate('''() => {window.open=()=>({closed:false}); window.scrollTo=()=>{}; Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},speak(){}}});Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}}});}''')
 def strip_imports_exports(src):
  src=re.sub(r'^import [^;]+;\s*','',src,flags=re.M)
  src=re.sub(r'\bexport (?=(?:const|class|function|async function)\b)','',src)
  return src
 combined='\n'.join(strip_imports_exports((ROOT/f).read_text()) for f in ['lib/air-core.mjs','lib/forecast-transport.mjs','app.js'])
 page.evaluate('window.fetch=(async (path)=>{ const city=new URL(String(path),"https://airguard.test").searchParams.get("city")||"lahore"; const fixture=window.__FIXTURE;return new Response(JSON.stringify({...fixture,cityId:city,city:city.charAt(0).toUpperCase()+city.slice(1)}),{status:200,headers:{"Content-Type":"application/json"}})})')
 page.evaluate('(data)=>{window.__FIXTURE=data}',DATA)
 page.add_script_tag(content=combined)
 page.wait_for_selector('.forecast-svg', timeout=10000)
 check('dashboard stats / graph',lambda: (asserts(page.locator('.forecast-svg').count()==2,'graph count'),asserts('125' in page.locator('.aqi-number').inner_text(),'aqi number')))
 check('chart 24,48,72 controls',lambda: [page.locator(f'[data-chart="{v}"]').click() for v in [48,72,24]])
 check('CSV download',lambda: try_download(page,'#export-csv'))
 check('navigation links',lambda: [nav_check(page,n,heading) for n,heading in [('ask','Air quality'),('community','Community action'),('science','Methods'),('family','Family Shield'),('airtwin','Compare')]])
 page.evaluate('document.querySelector("[data-view=airtwin]").click()')
 check('planner duration/activity/horizon',lambda: (page.locator('#plan-duration').select_option('2'),page.locator('#plan-horizon').select_option('48'),page.locator('#plan-activity').select_option('exercise'),page.locator('#plan-form button[type="submit"]').click(),asserts(page.locator('.result-grid').count()==1,'result grid')))
 check('plan copy button',lambda:page.locator('#share-plan').click())
 check('save plan',lambda:(page.locator('#save-plan').click(),asserts(page.locator('.saved-plan-card').count()==1,'saved plan card')))
 check('hide/show saved plan',lambda:(page.locator('#saved-plan-btn').click(),asserts(page.locator('.saved-plan-card').count()==0,'hidden'),page.locator('#saved-plan-btn').click(),asserts(page.locator('.saved-plan-card').count()==1,'shown')))
 check('remove saved plan',lambda:(page.locator('#remove-saved-plan').click(),asserts(page.locator('#saved-plan-btn').count()==0,'removed')))
 page.evaluate('document.querySelector("[data-view=ask]").click()')
 check('preset questions',lambda: [question_preset(page,i) for i in range(5)])
 check('user question + copy',lambda:(page.locator('#ask-input').fill('What does PM2.5 mean?'),page.locator('#ask-form button[type="submit"]').click(),asserts(page.locator('.answer-box').count()==1,'answer'),page.locator('#copy-answer').click()))
 page.evaluate('document.querySelector("[data-view=family]").click()')
 check('family groups',lambda:[page.locator(f'[data-family="{v}"]').check() for v in ['elders','outdoor']])
 check('family share / copy / read',lambda:(page.locator('#copy-family').click(),page.locator('#share-family').click(),page.locator('#speak-family').click()))
 check('english and Urdu letters',lambda:(page.locator('#letter-audience').select_option('authority'),page.locator('#letter-language').select_option('urdu'),asserts('موضوع' in page.locator('#letter-output').inner_text(),'urdu'),page.evaluate('document.querySelector("#copy-letter").click()'),try_download(page,'#download-letter'),page.locator('#speak-letter').click(),page.locator('#letter-language').select_option('english'),asserts('Subject' in page.locator('#letter-output').inner_text(),'english')))
 page.evaluate('document.querySelector("[data-view=community]").click()')
 check('community draft links',lambda: [community_letter(page,v) for v in ['school','work','authority']])
 page.evaluate('document.querySelector("[data-view=community]").click()')
 check('community pledges',lambda:[page.locator('[data-pledge]').nth(i).check() for i in range(4)])
 page.evaluate('document.querySelector("[data-view=science]").click()')
 check('science CSV',lambda:try_download(page,'#export-science'))
 check('city change',lambda:(page.locator('#city-select').select_option('karachi'),page.wait_for_timeout(300),asserts('Karachi' in page.locator('#source-state').inner_text() or 'Karachi' in page.locator('#app-view').inner_text(),'city')))
 check('refresh button',lambda:page.locator('#refresh-btn').click())
 check('no runtime JS errors',lambda:asserts(not errs,str(errs)))
 if size['width']<900:
  check('mobile no horizontal overflow',lambda:asserts(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),'horizontal overflow '+str(page.evaluate('document.documentElement.scrollWidth'))))
 else:
  check('desktop no horizontal overflow',lambda:asserts(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),'horizontal overflow'))
 page.screenshot(path=str(ROOT/f'tests/qa_{size["width"]}.png'),full_page=False,timeout=10000,animations='disabled')
 context.close()

def asserts(c,msg):
 if not c:raise AssertionError(msg)
def try_download(page,selector):
 with page.expect_download(timeout=3000) as result:page.locator(selector).click()
 d=result.value;asserts(bool(d.suggested_filename),'no file')
def nav_check(page,id,heading):
 page.evaluate('(id)=>document.querySelector(`[data-view=${id}]`).click()',id);asserts(heading.lower() in page.locator('#app-view').inner_text().lower(),f'no {heading}')
def question_preset(page,i):
 page.locator('[data-prompt]').nth(i).click();asserts(page.locator('.answer-box').count()==1,'no answer')
def community_letter(page,audience):
 page.locator('[data-letter-to="'+audience+'"]').click();asserts(page.locator('#letter-audience').input_value()==audience,'wrong letter audience');page.evaluate('document.querySelector("[data-view=community]").click()')

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in ([(1380,900),(768,900),(390,844),(320,680)] if '--all' in sys.argv else [(390,844)]):
  screen_suite(browser,{'width':width,'height':height})
 browser.close()
print('RESULT',pass_count,'passed',len(failures),'failed')
for item in failures:print('ERROR',*item)
if failures:raise SystemExit(1)
