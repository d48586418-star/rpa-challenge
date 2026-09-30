// Teste de fumaça (requer Playwright + Chromium). Sobe o site em http://localhost:8765 (ex.: npx http-server -p 8765 .)
// e confere: sem erros de console, sem rolagem horizontal, em 360/390/768/1024/1440, em todas as rotas.
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch();let bad=0;
  const routes=['#/inicio','#/percurso','#/lab/EX_KULESHOV_001','#/lab/EX_JUMPCUT_NL01','#/livre','#/caderno','#/eu','#/creditos','#/contraste'];
  for(const [w,h,m] of [[360,640,1],[390,844,1],[768,1024,1],[1024,768,0],[1440,900,0]]){
    const ctx=await b.newContext({viewport:{width:w,height:h},isMobile:!!m,hasTouch:!!m}),p=await ctx.newPage(),errs=[];
    p.on('pageerror',e=>errs.push(e.message));p.on('console',x=>{if(x.type()==='error')errs.push(x.text())});
    p.on('response',r=>{if(r.status()>=400)errs.push('HTTP '+r.status()+' '+r.url())});
    for(const r of routes){
      await p.goto('http://localhost:8765/index.html'+r);await p.waitForTimeout(700);
      const o=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,w:document.documentElement.clientWidth}));
      if(o.sw>o.w){bad++;console.log('✗ overflow',w,r,o)}
    }
    if(errs.length){bad++;console.log('✗ erros em',w,[...new Set(errs)])}
    await ctx.close();
  }
  console.log(bad?'FALHOU':'OK');await b.close();process.exit(bad?1:0);
})();
