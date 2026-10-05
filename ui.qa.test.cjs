const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
// Run with an existing Playwright installation; no production dependency is needed.
const launch={headless:true};
if(process.env.PLAYWRIGHT_CHROME_PATH)launch.executablePath=process.env.PLAYWRIGHT_CHROME_PATH;
(async()=>{
 const browser=await chromium.launch(launch),measurements=[];
 try{
  for(const width of [1280,390,320]){
   const context=await browser.newContext({viewport:{width,height:844},offline:true}),page=await context.newPage(),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
   await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
   const main=page.locator('#standardCalculator');
   const measure=async(mode,root)=>{
    const first=await root.locator('[data-panel="0"]').evaluate(el=>({top:el.getBoundingClientRect().top+scrollY,bottom:el.getBoundingClientRect().bottom+scrollY}));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
    assert.equal(overflow,false,mode+' overflow '+width);
    if(width<800)assert.ok(first.bottom<650,mode+' first input '+first.bottom);
    measurements.push({width,mode,firstInputTop:Math.round(first.top)});
    const rects=await root.locator('.partyrow button,.slotconfig select').evaluateAll(els=>els.map(el=>({left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right})));
    assert.ok(rects.every(r=>r.left>=0&&r.right<=width),'controls fit '+mode+' '+width);
    if(process.env.QA_SCREENSHOTS_DIR){await page.keyboard.press('Control+Home');await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS_DIR,'qa-'+mode+'-'+width+'.png')});}
   };
   await measure('46',main);
   assert.ok((await main.locator('[data-party-slot="0"] .slot-note').first().innerText()).includes('활성 시'));
   const validateInput=async(root,prefix)=>{
    const input=root.locator('[data-panel="0"]'),output=root.locator('#'+prefix+'aha'),error=root.locator('#'+prefix+'errors');
    const baseline=await output.innerText();
    await input.fill('');assert.equal(await error.innerText(),'슬롯 1: 마을 속도를 입력해 주세요.');
    await input.fill('0');assert.equal(await error.innerText(),'슬롯 1: 마을 속도는 0보다 커야 합니다.');
    await input.fill('');await input.press('1');await input.press('e');assert.equal(await error.innerText(),'슬롯 1: 마을 속도를 올바른 숫자로 입력해 주세요.');
    await input.fill('200');assert.equal(await error.isVisible(),false);assert.equal(await output.innerText(),baseline);
   };
   await validateInput(main,'');
   const autoEvents=async(root,prefix,types)=>{
    await page.locator('#'+prefix+'toggleAdvanced').click();await root.locator('[data-tab="turns"]').click();
    await root.locator('#'+prefix+'addEvent').click();
    const kind=root.locator('[data-field="type"]'),value=root.locator('[data-field="value"]'),time=root.locator('[data-field="time"]'),error=root.locator('#'+prefix+'errors');
    for(const type of types){
     await kind.selectOption('advance');await value.fill('');assert.equal(await error.isVisible(),true);
     await kind.selectOption(type);assert.equal(await value.isDisabled(),true);assert.equal(await error.isVisible(),false,type+' recovered');
     assert.ok((await root.locator('#'+prefix+'log').textContent()).length>0,JSON.stringify({type,summary:await root.locator('#'+prefix+'simSummary').textContent(),hidden:await root.locator('#'+prefix+'turns').isVisible()}));
     await time.fill('');assert.equal(await error.isVisible(),true);await time.fill('-1');assert.equal(await error.isVisible(),true);
     await time.fill('0');assert.equal(await error.isVisible(),false);
    }
    await kind.selectOption('advance');assert.equal(await value.inputValue(),'');assert.equal(await error.isVisible(),true);
    await value.fill('10');assert.equal(await error.isVisible(),false);
    await root.locator('[data-remove="0"]').click();
    await page.locator('#'+prefix+'toggleAdvanced').click();
   };
   await autoEvents(main,'',['yao','pearl','bonus']);
   await main.locator('[data-panel="0"]').fill('210.123');
   const original=await page.evaluate(()=>AhaApp.getConfig()),originalOutput=await main.locator('#aha').innerText();
   await page.locator('#toggleRumor').press('Enter');
   const rumor=page.locator('#rumorCalculator');
   assert.equal(await page.locator('#toggleRumor').getAttribute('aria-expanded'),'true');
   assert.equal(await page.locator('#rumorComparisonDetails').evaluate(el=>el.open),false);
   assert.deepEqual((await page.evaluate(()=>AhaRumorApp.getConfig())).slots,original.slots);
   await page.locator('#rumor-reset').click();await measure('47',rumor);await validateInput(rumor,'rumor-');
   await autoEvents(rumor,'rumor-',['yao','pearl','bonus','ahaBonus']);
   await page.locator('#rumorOwned').selectOption('0');
   await rumor.locator('[data-slot="3"]').selectOption('aeon');
   assert.equal(await page.locator('#rumorOwnedControl').isVisible(),false);
   assert.equal(await page.locator('#rumorOwnedStatus').innerText(),'아하 편성 중 · 기초항 94.000');
   await rumor.locator('[data-party-slot="3"] [data-key="signature"]').selectOption('1');
   assert.equal(await page.locator('#rumorOwnedStatus').innerText(),'아하 편성 중 · 기초항 106.000');
   await rumor.locator('[data-slot="3"]').selectOption('pearl');
   assert.equal(await page.locator('#rumorOwned').inputValue(),'0');assert.ok((await rumor.locator('#rumor-formula').innerText()).startsWith('80 +'));
   await rumor.locator('[data-panel="0"]').fill('220.5');
   await page.locator('#rumorPanel').press('Escape');
   assert.equal(await page.locator('#toggleRumor').getAttribute('aria-expanded'),'false');
   assert.equal(await page.locator('#toggleRumor').evaluate(el=>el===document.activeElement),true);
   assert.deepEqual(await page.evaluate(()=>AhaApp.getConfig()),original);assert.equal(await main.locator('#aha').innerText(),originalOutput);
   await page.locator('#toggleRumor').press('Enter');assert.equal(await rumor.locator('[data-panel="0"]').inputValue(),'220.5');
   await page.locator('#importRumor').click();assert.deepEqual((await page.evaluate(()=>AhaRumorApp.getConfig())).slots,original.slots);
   await page.locator('#rumor-reset').click();assert.deepEqual(await page.evaluate(()=>AhaApp.getConfig()),original);
   await page.locator('#rumorComparisonDetails summary').press('Enter');assert.equal(await page.locator('#rumorComparisonDetails').evaluate(el=>el.open),true);
   assert.ok((await page.locator('#rumorComparison').innerText()).includes('151.350'));
   await page.locator('#showRumorInfo').press('Enter');assert.ok((await page.locator('#rumorInformation').innerText()).includes('v4.6.51'));
   assert.ok((await page.locator('#rumorInformation').innerText()).includes('미검증'));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('#closeRumor').click();await page.locator('#reset').click();assert.equal(await main.locator('#aha').innerText(),'151.350');
   assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);await context.close();
  }
  console.log('PASS QA: auto event transitions, error recovery, ownership restoration, state isolation/import/reset, keyboard and offline');
  console.log(JSON.stringify(measurements));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
