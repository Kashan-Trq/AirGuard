import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const file = async p => readFile(new URL('../'+p, import.meta.url),'utf8');
test('No third-party advertising integrations or marketing blocks',async()=>{
  const html=await file('index.html'); const js=await file('app.js');
  for(const pattern of [/googlesyndication/i,/googleads/i,/doubleclick/i,/adservice/i,/ad-slot/i,/<iframe/i,/<script[^>]+src=["']https?:\/\//i]){
   assert.equal(pattern.test(html+'\n'+js),false,`Unexpected ad or embedded remote resource: ${pattern}`);
  }
  assert.doesNotMatch(html,/side-quote|CORE<\/span>|Built for people, not pageviews/);
  assert.doesNotMatch(js,/feature-panel|story-strip|Search engines find pages/);
  assert.match(js,/PM2\.5 concentration/);
  assert.match(js,/DATASET INFORMATION/);
});
test('Vercel CSP forbids third party script and frames',async()=>{
 const config=JSON.parse(await file('vercel.json'));
 const csp=config.headers.flatMap(h=>h.headers).find(h=>h.key==='Content-Security-Policy')?.value||'';
 assert.match(csp,/script-src 'self'/);assert.match(csp,/frame-src 'none'/);assert.match(csp,/connect-src 'self'/);
 assert.doesNotMatch(csp,/script-src[^;]*unsafe-inline/);
});
test('Service worker uses the new versioned cache',async()=>{
 assert.match(await file('sw.js'),/airguard-shell-v3-0/);
});
