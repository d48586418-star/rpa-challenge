/* Testes automatizados. Uso:
     npm install && npx playwright install chromium
     npm run validate     # motor + dados + assets (sem navegador)
     npm test             # e2e (sobe o servidor sozinho, porta 8766)
   Variável opcional: CHROMIUM_PATH=/caminho/do/chrome */
const path=require('path'),fs=require('fs'),assert=require('assert');
const root=path.join(__dirname,'..');
const {chromium}=require('playwright');
const hs=require('http-server');
const PORT=8766,BASE=`http://localhost:${PORT}/index.html`;
let fails=0;const ok=(m)=>console.log('  ✓',m);const bad=(m,e)=>{fails++;console.log('  ✗',m,e&&e.message?'\n     '+e.message.split('\n')[0]:'')};
const t=async(name,fn)=>{try{await fn();ok(name)}catch(e){bad(name,e)}};

(async()=>{
  const server=hs.createServer({root,cache:-1});await new Promise(r=>server.listen(PORT,r));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--autoplay-policy=no-user-gesture-required']});
  const newPage=async(w=390,h=844)=>{const ctx=await browser.newContext({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700});const p=await ctx.newPage();p.errs=[];
    p.on('pageerror',e=>p.errs.push(e.message));p.on('console',m=>{if(m.type()==='error')p.errs.push(m.text())});
    p.on('response',r=>{if(r.status()>=400)p.errs.push('HTTP '+r.status()+' '+r.url())});return p};
  const go=async(p,hash)=>{await p.goto(BASE+hash);await p.waitForTimeout(900)};
  const done=async(p)=>{await p.waitForFunction(()=>document.querySelector('#b-play-t').textContent.includes('de novo'),null,{timeout:70000})};
  const add=(p,id)=>p.locator(`#lib .take[data-id="${id}"] [data-add]`).dispatchEvent('click');

  console.log('\n[1] rotas × viewports (erros de console, rede, rolagem horizontal)');
  const routes=['#/inicio','#/percurso','#/lab/EX_KULESHOV_001','#/lab/EX_JUMPCUT_NL01','#/livre','#/caderno','#/eu','#/creditos','#/contraste','#/conceitos'];
  for(const [w,h] of [[360,640],[390,844],[768,1024],[1024,768],[1440,900]]){
    await t(`${w}×${h}`,async()=>{const p=await newPage(w,h);
      for(const r of routes){await go(p,r);const o=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,w:document.documentElement.clientWidth}));assert(o.sw<=o.w,`overflow em ${r}: ${o.sw}>${o.w}`)}
      assert.deepStrictEqual([...new Set(p.errs)],[],'erros: '+p.errs.join(' | '));await p.context().close()});
  }

  console.log('\n[2] regressão das 15 atividades (motor + leitura + interface)');
  {
    const p=await newPage(390,844);await go(p,'#/inicio');
    const ids=await p.evaluate(()=>Object.keys(CH.EXF));
    for(const id of ids){
      await t(id,async()=>{
        const r=await p.evaluate(id=>{
          const ex=CH.EXF[id],out={};
          out.valid=!Engine.validateExercise(ex,CH.TK).length;
          const ref=id===CH.LIVRE?null:CH.referenceSeq(id);
          if(ref){const x=CH.readSeq(id,ref);out.cls=x.r.class;out.sit=x.L.situacao}
          out.vid=CH.data.activities.find(a=>a.id===id).pool.every(i=>!CH.TK[i]||CH.TK[i].vid||i==='DL_022');
          return out},id);
        assert(r.valid,'exercício inválido no motor');
        if(r.cls)assert.strictEqual(r.cls,'valid');
        if(r.sit)assert.strictEqual(r.sit,'proposta');
        assert(r.vid,'take sem vídeo fora da exceção conhecida');
        await go(p,'#/lab/'+id);
        assert(await p.locator('#lib .take').count()>0,'biblioteca vazia');
      });
    }
    assert.deepStrictEqual([...new Set(p.errs)],[],p.errs.join(' | '));await p.context().close();
  }

  console.log('\n[3] jornada principal: descobrir SEM digitar, guardar, persistir');
  await t('Kuleshov: assistir → descoberta → guardar → recarregar',async()=>{
    const p=await newPage(390,844);await go(p,'#/lab/EX_KULESHOV_001');
    assert(await p.locator('#tools').isHidden(),'ferramentas deveriam estar ocultas no início');
    assert(await p.locator('#coach').isVisible(),'guia da 1ª atividade ausente');
    await add(p,'SC_026');await add(p,'SC_013');await p.waitForTimeout(500);
    assert(!/Kuleshov/i.test(await p.locator('#p-leitura').innerText()),'nome vazou antes de assistir');
    await p.click('#b-play');await done(p);await p.waitForTimeout(500);
    const txt=await p.locator('.disc.open').innerText();assert(/Kuleshov/i.test(txt),'descoberta não apareceu');
    assert(await p.locator('.recap').count()===1,'recap "mesmo rosto" ausente');
    assert.strictEqual(await p.evaluate(()=>CH.stage('EX_KULESHOV_001')),2);
    await p.click('[data-save-quick]');await p.waitForTimeout(400);
    assert.strictEqual(await p.evaluate(()=>CH.store.act('EX_KULESHOV_001').versions.length),1,'versão não guardada sem reflexão');
    await p.reload();await p.waitForTimeout(900);
    assert.strictEqual(await p.evaluate(()=>CH.store.act('EX_KULESHOV_001').versions.length),1,'persistência falhou');
    assert.deepStrictEqual(p.errs,[],p.errs.join(' | '));await p.context().close()});

  await t('Jump cut: cortar, remover, aparar (teclado), assistir; nome só depois',async()=>{
    const p=await newPage(1440,900);await go(p,'#/lab/EX_JUMPCUT_NL01');
    await p.locator('#lib .take [data-add]').click();await p.waitForTimeout(400);
    await p.click('#b-cut');await p.locator('.cp:not(.au)').nth(0).click();await p.click('#b-cut');
    await p.locator('.cp:not(.au)').nth(1).click();await p.click('#b-rm');
    await p.locator('.cp:not(.au)').nth(1).click();await p.locator('.trim-h').focus();
    for(let i=0;i<24;i++)await p.keyboard.press('Shift+ArrowLeft');
    await p.click('#b-play');await done(p);await p.waitForTimeout(500);
    const rd=await p.locator('#p-leitura').innerText();
    assert(/Tempo da ação|Na imagem/i.test(rd),'métrica de tempo omitido ausente');
    assert.strictEqual(await p.evaluate(()=>CH.stage('EX_JUMPCUT_NL01')),2);
    assert.deepStrictEqual(p.errs,[],p.errs.join(' | '));await p.context().close()});

  await t('Livre, Caderno, Meu espaço, exportar',async()=>{
    const p=await newPage(390,844);await go(p,'#/livre');
    await p.locator('#lib .take [data-add]').nth(0).dispatchEvent('click');
    await p.click('#t-versoes');await p.click('#b-save');await p.waitForTimeout(400);
    await go(p,'#/caderno');assert(await p.locator('.nbv').count()>=1,'versão livre ausente do Caderno');
    await go(p,'#/eu');const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#b-exp')]);assert(/\.json$/.test(dl.suggestedFilename()));
    assert.deepStrictEqual(p.errs,[],p.errs.join(' | '));await p.context().close()});

  await t('movimento reduzido: Abertura estática',async()=>{
    const p=await newPage(390,844);await go(p,'#/eu');await p.selectOption('#pf-m','off');await go(p,'#/inicio');
    assert(await p.evaluate(()=>!!document.querySelector('.story.is-static')));await p.context().close()});

  await browser.close();server.close();
  console.log(fails?`\n${fails} FALHA(S)`:'\nTODOS OS TESTES PASSARAM');process.exit(fails?1:0);
})();
