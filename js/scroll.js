/* scroll.js — "scrollcraft": cenas fixas guiadas pelo scroll, camadas com profundidade, revelações de texto.
   Sem bibliotecas. Respeita reduced-motion (CH.reduced()): tudo vira estático, sem parallax nem suavização. */
(function(){
"use strict";
const CH=window.CH;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
let st=null;

function wrapWords(el){
  let i=0;
  const walk=n=>{
    Array.from(n.childNodes).forEach(c=>{
      if(c.nodeType===3){
        const parts=c.textContent.split(/(\s+)/);const f=document.createDocumentFragment();
        parts.forEach(p=>{if(!p)return;if(/^\s+$/.test(p)){f.append(document.createTextNode(" "));return}
          const m=document.createElement("span");m.className="wm";const w=document.createElement("span");w.className="wi";w.style.setProperty("--i",i++);w.textContent=p;m.append(w);f.append(m)});
        c.replaceWith(f);
      }else if(c.nodeType===1&&!c.classList.contains("wm"))walk(c);
    });
  };
  walk(el);el.dataset.split="1";
}

const S=CH.scroll={
  init(root){
    S.teardown();
    st={root,stages:[],par:[],rev:[],auto:[],raf:0,io:null,ticking:false,reduced:CH.reduced()};
    root.querySelectorAll("[data-reveal]").forEach(el=>{if(!el.dataset.split)wrapWords(el);st.rev.push(el)});
    st.io=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.target.matches("[data-reveal],[data-in]")){if(e.isIntersecting){e.target.classList.add("is-in")}}
      if(e.target.matches("video[data-auto]")){const v=e.target;if(e.isIntersecting&&!st.reduced){v.play().catch(()=>{})}else v.pause()}
    }),{threshold:.18});
    root.querySelectorAll("[data-reveal],[data-in]").forEach(el=>st.io.observe(el));
    st.auto=[...root.querySelectorAll("video[data-auto]")];
    st.exit=[...root.querySelectorAll("[data-exit]")];
    st.auto.forEach(v=>{v.muted=true;v.playsInline=true;if(st.reduced){v.removeAttribute("loop")}st.io.observe(v)});
    st.par=[...root.querySelectorAll("[data-par]")].map(el=>({el,k:parseFloat(el.dataset.par)||0,host:el.closest("[data-par-host]")||el.parentElement}));
    st.stages=[...root.querySelectorAll("[data-stage]")].map(el=>({el,stick:el.querySelector(".stick"),scenes:[...el.querySelectorAll(".scene")],p:0,sp:0,on:-1,hook:el._hook||null}));
    if(st.reduced){root.classList.add("is-static");st.stages.forEach(s=>{s.el.classList.add("is-static");s.el.style.setProperty("--p","1");s.scenes.forEach(sc=>{sc.style.setProperty("--sp","1");sc.style.setProperty("--in","1");sc.style.setProperty("--out","0")});s.hook&&s.hook(1,{static:true,idx:0,scenes:s.scenes})})}
    st.onScroll=()=>S.req();st.onResize=()=>S.req();
    window.addEventListener("scroll",st.onScroll,{passive:true});window.addEventListener("resize",st.onResize);
    S.req();
  },
  /* registra um gancho por estágio: hook(p,{idx,scenes,local[]}) chamado a cada frame */
  hook(stageEl,fn){stageEl._hook=fn;if(st){const s=st.stages.find(x=>x.el===stageEl);if(s)s.hook=fn;if(st.reduced)fn(1,{static:true,idx:0,local:[1,1,1,1],scenes:[]})}},
  req(){if(!st||st.ticking)return;st.ticking=true;st.raf=requestAnimationFrame(S.tick)},
  tick(){
    if(!st)return;st.ticking=false;
    const vh=window.innerHeight;let again=false;
    if(!st.reduced){
      st.par.forEach(o=>{
        const r=o.host.getBoundingClientRect();if(r.bottom<-200||r.top>vh+200)return;
        const off=(r.top+r.height/2-vh/2);o.el.style.setProperty("--ty",(-off*o.k).toFixed(1)+"px");
      });
      st.exit.forEach(el=>{const r=el.getBoundingClientRect();el.style.setProperty("--cp",clamp(-r.top/Math.max(1,r.height*.8)).toFixed(3))});
      st.stages.forEach(s=>{
        const r=s.el.getBoundingClientRect(),stickTop=s.stick?parseFloat(getComputedStyle(s.stick).top)||0:0;
        const sh=s.stick?s.stick.offsetHeight:vh;
        const p=clamp((stickTop-r.top)/Math.max(1,r.height-sh));
        s.p=p;s.sp+=(p-s.sp)*.16;if(Math.abs(p-s.sp)<.0005)s.sp=p;else again=true;
        if(r.bottom<-50||r.top>vh+50)return;
        s.el.style.setProperty("--p",s.sp.toFixed(4));
        const n=s.scenes.length;let idx=clamp(Math.floor(s.sp*n),0,n-1);
        const local=s.scenes.map((sc,i)=>{const v=clamp(s.sp*n-i);sc.style.setProperty("--sp",v.toFixed(4));sc.style.setProperty("--in",clamp(v/.24).toFixed(3));sc.style.setProperty("--out",(i===n-1?0:clamp((v-.76)/.24)).toFixed(3));return v});
        if(idx!==s.on){s.on=idx;s.scenes.forEach((sc,i)=>{sc.classList.toggle("on",i===idx);sc.classList.toggle("past",i<idx)});s.el.dataset.scene=idx}
        s.hook&&s.hook(s.sp,{idx,local,scenes:s.scenes,static:false});
      });
    }
    if(again)S.req();
  },
  teardown(){
    if(!st)return;
    cancelAnimationFrame(st.raf);window.removeEventListener("scroll",st.onScroll);window.removeEventListener("resize",st.onResize);
    st.io&&st.io.disconnect();st.auto.forEach(v=>{v.pause();v.removeAttribute("src");v.load()});st=null;
  }
};
})();
