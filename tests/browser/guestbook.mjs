// Full rendered app + real prepared GAS code, with Google services locally simulated.
// Actual Google network/storage is deliberately not used by this test.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createGasHarness, createEntry} from '../helpers/guestbook-gas-harness.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const out=process.env.GUESTBOOK_TEST_OUTPUT || root+'outputs/guestbook';
await fs.mkdir(out,{recursive:true});
const origin=process.env.GUESTBOOK_TEST_ORIGIN || 'http://127.0.0.1:4174';
const h=createGasHarness();h.props.setProperty('ALLOWED_ORIGINS',origin);
const setup=h.session();h.advance(2600);
const first=createEntry(h,setup,{name:'홍길동',message:'두 사람의 결혼을 진심으로 축하해요.\n앞으로도 서로를 아끼며 행복한 날들을 만들어가길 바라요.'});assert(first.ok);
h.advance(10);
const long=createEntry(h,setup,{name:'가'.repeat(20),message:'행복'.repeat(50)});assert(long.ok);
h.advance(10);
const third=createEntry(h,setup,{name:'친구',message:'새로운 시작을 축하해요!'});assert(third.ok);
const child='https://local-fixture-script.googleusercontent.com';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE || '/usr/bin/chromium',headless:true,args:['--no-sandbox'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY,bypass:'127.0.0.1,localhost'}}:{})});
const results=[];
async function fixture(width,options={},mode="messages") {
 const context=await browser.newContext({viewport:{width,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'ko-KR',...options});
 await context.tracing.start({screenshots:true,snapshots:true});
 await context.exposeBinding('__GAS_LOCAL_ADAPTER__',(_source,payload)=>h.rpc(payload));
 await context.route('https://script.google.com/**',route=>{
  if(mode==='error')return route.abort('blockedbyclient');
  const url=new URL(route.request().url());
  return route.fulfill({contentType:'text/html',body:`<!doctype html><iframe src="${child}/bridge${url.search.replaceAll('&','&amp;')}"></iframe>`});
 });
 await context.route(child+'/**',route=>{
  const url=new URL(route.request().url());const rendered=h.renderBridge(url.searchParams.get('origin'),url.searchParams.get('nonce'));assert.equal(rendered.mode,'ALLOWALL');
  const stub=`<script>window.google={script:{run:{withSuccessHandler(fn){this.success=fn;return this},withFailureHandler(fn){this.failure=fn;return this},guestbookRpc(payload){const success=this.success,failure=this.failure;window.__GAS_LOCAL_ADAPTER__(payload).then(success,failure)}}}};</script>`;
  return route.fulfill({contentType:'text/html',body:rendered.content.replace('<body>','<body>'+stub)});
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(origin+'/wedding/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(700);
 await page.getByRole('button',{name:'초대장 열기',exact:true}).tap();
 await page.locator('.inv-curtain').waitFor({state:'detached'});
 await page.locator('.inv-guestbook').scrollIntoViewIfNeeded();
 if(mode==='messages')await page.locator('.gb-slide').nth(2).waitFor();
 else if(mode==='empty')await page.getByText('아직 등록된 메시지가 없습니다.',{exact:true}).waitFor();
 else await page.locator('.gb-status [role=alert]').waitFor({timeout:25000});
 h.advance(3000);
 return {context,page,errors,width};
}
async function touchSwipe(page,dx,dy=0,edge='center') {
 const box=await page.locator('.gb-carousel').boundingBox();
 const x=edge==='left'?box.x+24:edge==='right'?box.x+box.width-24:box.x+box.width/2;
 const y=box.y+box.height*.55;
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});await page.waitForTimeout(18);}
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
 await page.waitForTimeout(420);
}
async function screenshot(page,name){await page.screenshot({path:out+'/'+name+'.png'});}
for(const width of [320,390]) {
 const c=await fixture(width),{page,context}=c;
 assert.equal(await page.locator('.inv-section').count(),10);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.locator('.inv-section').last().getAttribute('class'),'inv-section inv-ending');
 assert.equal(await page.locator('.gb-frame').first().evaluate(e=>e.complete&&e.naturalWidth===1254),true);
 assert.equal(await page.locator('.gb-author').first().textContent(),'From. 친구');
 await screenshot(page,'guestbook-'+width);
 await page.locator('.gb-slide').first().locator('.gb-card').screenshot({path:out+'/card-'+width+'.png'});
 await page.locator('.inv-guestbook').screenshot({path:out+'/section-'+width+'.png'});
 assert.equal(await page.evaluate(()=>document.fonts.check('400 16px Pretendard')&&document.fonts.check('700 32px Designhouse')),true);
 const history=await page.evaluate(()=>history.length);
 await touchSwipe(page,-85);await page.getByRole('button',{name:'가'.repeat(20)+'님의 메시지 삭제',exact:true}).waitFor();
 assert.equal(await page.locator('.gb-pagination p').textContent(),'2 / 3');
 const longInfo=await page.locator('.gb-slide').nth(1).evaluate(slide=>{
  const card=slide.querySelector('.gb-card').getBoundingClientRect(), text=slide.querySelector('.gb-card-text').getBoundingClientRect(),message=slide.querySelector('.gb-message');
  return {card:{x:card.x,y:card.y,width:card.width,height:card.height},text:{x:text.x,y:text.y,width:text.width,height:text.height},chars:Array.from(message.textContent).length,scrollHeight:message.scrollHeight,clientHeight:message.clientHeight};
 });
 assert.equal(longInfo.chars,100);assert(longInfo.clientHeight>12,'long-message reading viewport must remain usable');
 assert(longInfo.text.y+longInfo.text.height<=longInfo.card.y+longInfo.card.height*.73);
 await page.locator('.gb-slide').nth(1).locator('.gb-message').evaluate(e=>{e.scrollTop=e.scrollHeight});
 assert(await page.locator('.gb-slide').nth(1).locator('.gb-message').evaluate(e=>e.scrollTop>0));
 await screenshot(page,'guestbook-long-'+width);
 await touchSwipe(page,85,0,'left');assert.equal(await page.locator('.gb-pagination p').textContent(),'1 / 3');
 await touchSwipe(page,-70,100);assert.equal(await page.locator('.gb-pagination p').textContent(),'1 / 3');
 await page.locator('.inv-guestbook').scrollIntoViewIfNeeded();
 await touchSwipe(page,0,-100);assert.equal(await page.locator('.gb-pagination p').textContent(),'1 / 3');
 await page.locator('.inv-guestbook').scrollIntoViewIfNeeded();
 await touchSwipe(page,-12,0);assert.equal(await page.locator('.gb-pagination p').textContent(),'1 / 3');
 await touchSwipe(page,-85,0,'right');assert.equal(await page.locator('.gb-pagination p').textContent(),'2 / 3');
 assert.equal(await page.evaluate(()=>history.length),history);
 await page.getByRole('button',{name:'다음 메시지',exact:true}).tap();assert.equal(await page.locator('.gb-pagination p').textContent(),'3 / 3');
 await page.getByRole('button',{name:'이전 메시지',exact:true}).tap();
 // Use a normal short card for the write modal's saved page position.
 await page.getByRole('button',{name:'이전 메시지',exact:true}).tap();
 await page.getByRole('button',{name:'축하 메시지 남기기',exact:true}).scrollIntoViewIfNeeded();
 const scroll=await page.evaluate(()=>scrollY);
 await page.getByRole('button',{name:'축하 메시지 남기기',exact:true}).tap();
 assert.equal(await page.locator('main').getAttribute('inert'),'');
 const modal=page.getByRole('dialog',{name:'축하 메시지 남기기',exact:true});await modal.waitFor();
 await page.getByLabel('이름',{exact:false}).fill('검증'+width);
 await page.getByLabel('비밀번호',{exact:true}).fill('test-password-1234');
 await page.locator('#gb-message').fill('함께할 모든 날을 축하합니다!');
 await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'메시지 등록하기',exact:true}).evaluate(e=>e===document.activeElement),true);
 await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'축하 메시지 남기기 닫기',exact:true}).evaluate(e=>e===document.activeElement),true);
 await page.locator('#gb-message').focus();
 await screenshot(page,'guestbook-write-'+width);
 await context.setDefaultTimeout(12000);
 await page.setViewportSize({width,height:400});
 await page.getByRole('button',{name:'메시지 등록하기',exact:true}).scrollIntoViewIfNeeded();
 assert.equal(await page.getByRole('button',{name:'메시지 등록하기',exact:true}).isVisible(),true);
 await screenshot(page,'guestbook-short-viewport-'+width);
 await page.setViewportSize({width,height:780});
 const before=h.sheet().rows.length;
 await page.locator('.gb-form').evaluate(form=>{form.requestSubmit();form.requestSubmit();});
 await modal.waitFor({state:'detached'});assert.equal(h.sheet().rows.length,before+1);
 await page.getByRole('button',{name:'검증'+width+'님의 메시지 삭제',exact:true}).waitFor();
 assert(Math.abs((await page.evaluate(()=>scrollY))-scroll)<3,'modal close preserves page position');
 assert.equal(await page.locator('main').getAttribute('inert'),null);
 await page.getByRole('button',{name:'검증'+width+'님의 메시지 삭제',exact:true}).tap();
 await page.getByLabel('비밀번호',{exact:true}).fill('wrong-password');
 await page.getByRole('button',{name:'메시지 삭제하기',exact:true}).tap();
 await page.getByRole('alert').filter({hasText:'비밀번호가 일치하지 않습니다.'}).waitFor();
 assert.equal(h.sheet().rows.length,before+1);
 await screenshot(page,'guestbook-wrong-password-'+width);
 await page.getByLabel('비밀번호',{exact:true}).fill('test-password-1234');
 await page.getByRole('button',{name:'메시지 삭제하기',exact:true}).tap();
 await page.getByRole('dialog',{name:'메시지 삭제',exact:true}).waitFor({state:'detached'});assert.equal(h.sheet().rows.length,before);
 // Actual Chromium clipboard, including the existing fallback for touch emulation.
 await page.getByRole('button',{name:'주소 복사',exact:true}).scrollIntoViewIfNeeded();
 const copyBox=await page.getByRole('button',{name:'주소 복사',exact:true}).boundingBox();assert(copyBox.width>=44&&copyBox.height>=44);
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});
 await page.getByRole('button',{name:'주소 복사',exact:true}).tap();
 await page.getByText('주소가 복사되었습니다.',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'경기도 파주시 탑삭골길 260');
 await screenshot(page,'address-copy-'+width);
 // Gallery remains seven photos with its existing loop and close behavior.
 await page.locator('.inv-gallery').scrollIntoViewIfNeeded();
 await page.locator('.inv-gallery button').first().tap();
 await page.getByRole('dialog',{name:'웨딩스냅',exact:true}).waitFor();
 await page.getByRole('button',{name:'이전 사진',exact:true}).tap();assert.equal(await page.locator('.inv-lightbox-nav span').textContent(),'7 / 7');
 await page.getByRole('button',{name:'다음 사진',exact:true}).tap();assert.equal(await page.locator('.inv-lightbox-nav span').textContent(),'1 / 7');
 await page.getByRole('button',{name:'웨딩스냅 닫기',exact:true}).tap();
 assert.equal(await page.locator('audio').evaluate(e=>e.loop),true);
 await page.getByRole('button',{name:'배경음악 끄기',exact:true}).tap();assert.equal(await page.locator('audio').evaluate(e=>e.paused),true);
 await page.getByRole('button',{name:'배경음악 켜기',exact:true}).tap();
 await page.waitForFunction(()=>!document.querySelector('audio').paused);
 await page.locator('audio').evaluate(e=>{e.currentTime=e.duration-.2;});await page.waitForTimeout(800);
 assert.equal(await page.locator('audio').evaluate(e=>!e.paused&&e.currentTime<2),true);
 await page.getByRole('button',{name:'지도 바로가기',exact:true}).scrollIntoViewIfNeeded();await page.getByRole('button',{name:'지도 바로가기',exact:true}).tap();
 assert.equal(await page.locator('.inv-map-options a').count(),3);await page.getByRole('button',{name:'길 안내 닫기',exact:true}).tap();
 await page.locator('.inv-account-toggle').first().scrollIntoViewIfNeeded();await page.locator('.inv-account-toggle').first().tap();
 assert.equal(await page.locator('.inv-account-toggle').first().getAttribute('aria-expanded'),'true');
 await page.locator('.inv-account-toggle').first().tap();
 assert.equal(await page.locator('.inv-account-toggle').first().getAttribute('aria-expanded'),'false');
 const broken=await page.evaluate(()=>[...document.images].filter(e=>!e.complete||e.naturalWidth===0).map(e=>e.src));assert.deepEqual(broken,[]);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(c.errors,[]);
 results.push({width,status:'passed',storage:'LOCAL GAS/SHEETS ADAPTER',longInfo,checks:['frame original PNG and safe text bounds','100-character message scroll','center and near-edge horizontal touch','vertical/diagonal/short touch rejection','no history navigation','write and delete including wrong password; duplicate submit ignored','modal scroll restoration and inert/focus structure','400px keyboard-height simulation','actual address clipboard','existing gallery opens/closes','BGM play/pause and actual loop boundary; map modal and account accordion','no broken images/overflow/console errors']});
 await context.tracing.stop({path:out+'/guestbook-'+width+'.zip'});await context.close();
}
// Empty and failed connections must not manufacture saved messages.
h.sheet().rows.splice(1);h.context.invalidateList_();
const empty=await fixture(320,{},'empty');
assert.equal(await empty.page.locator('.gb-pagination').count(),0);
await screenshot(empty.page,'guestbook-empty-320');
await empty.context.tracing.stop({path:out+'/guestbook-empty.zip'});await empty.context.close();
const failed=await fixture(390,{},'error');
assert.equal(await failed.page.locator('.gb-author').count(),0);
assert.equal(await failed.page.getByRole('button',{name:'다시 불러오기',exact:true}).isVisible(),true);
assert.equal(h.sheet().rows.length,1);
await screenshot(failed.page,'guestbook-connection-error-390');
await failed.context.tracing.stop({path:out+'/guestbook-error.zip'});await failed.context.close();
await browser.close();await fs.writeFile(out+'/results.json',JSON.stringify({status:'passed',emptyState:'passed',connectionFailure:'passed without fake success',liveGoogle:'UNVERIFIED: environment destination policy blocks script.google.com',viewports:results},null,2));console.log(JSON.stringify({status:'passed',viewports:results.map(r=>r.width),liveGoogle:'UNVERIFIED'}));
