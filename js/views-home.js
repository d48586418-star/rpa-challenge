/* views-home.js — Início: capa viva + Continuar + portas + Abertura (storytelling por scroll) */
(function(){
"use strict";
const CH=window.CH,{h,$,$$,esc,icon}=CH;
CH.views=CH.views||{};

const COVER=[ /* frames REAIS (vídeo) da capa, em 3 profundidades */
  {id:"SC_026",cls:"cf1 d2",rot:-7,par:-.10},
  {id:"NZ_016",cls:"cf2 d1",rot:6,par:-.04},
  {id:"BH_015",cls:"cf3 d3",rot:-4,par:-.20},
  {id:"DF_ele_a",cls:"cf4 d1",rot:8,par:-.06},
  {id:"NL_047",cls:"cf5 d2",rot:-9,par:-.12}
];
function frame(c){
  const t=CH.TK[c.id];if(!t)return"";
  return `<figure class="cf ${c.cls}" style="--rot:${c.rot}deg" data-par="${c.par}"><div class="cf-in" style="--ar:${CH.ratioCss(t.ar)}"><video data-auto muted loop playsinline preload="metadata" poster="${t.th}" src="${t.vid}" tabindex="-1" aria-hidden="true"></video></div><figcaption class="tag" data-film="${t.f}" style="--fc:var(--f-${t.f})">${t.f}</figcaption></figure>`;
}
function stats(){
  const all=[];CH.data.atos.atos.forEach(a=>CH.atividadesDoAto(a).forEach(i=>all.push(i)));
  const done=all.filter(i=>CH.progress(i).status==="concluida").length;
  const st=CH.store.state;
  const free=CH.store.act(CH.LIVRE).versions.length;
  return{total:all.length,done,notes:st.notes.length,disc:Object.keys(st.disc).length,free};
}

CH.views.home=function(root){
  const s=stats(),last=CH.store.state.last,next=CH.nextActivity();
  let cont;
  const lastValid=last&&CH.ACT[last.exId];
  if(lastValid){
    const ex=CH.ACT[last.exId],pr=CH.progress(last.exId),ato=CH.atoDe(last.exId);
    cont={href:last.exId===CH.LIVRE?"#/livre":"#/lab/"+last.exId,eye:"Continuar de onde parou",t:ex.t,
      meta:(last.exId===CH.LIVRE?"Laboratório livre":ato?"Ato "+ato.n:"")+` · ${pr.n} ${pr.n===1?"versão":"versões"} · ${CH.ago(last.at)}`};
  }else{
    const id=next||CH.atividadesDoAto(CH.data.atos.atos[0])[0],ato=CH.atoDe(id);
    cont={href:"#/lab/"+id,eye:"Comece por aqui",t:CH.ACT[id].t,meta:ato?`Ato ${ato.n} · ${ato.titulo}`:""};
  }
  const nome=CH.store.name();
  root.innerHTML=`
<div class="home" data-par-host>
  <section class="cover" aria-labelledby="page-title" data-exit>
    <div class="cv-grid" aria-hidden="true"></div>
    <i class="crop tl" aria-hidden="true"></i><i class="crop tr" aria-hidden="true"></i><i class="crop bl" aria-hidden="true"></i><i class="crop br" aria-hidden="true"></i>
    <div class="cv-frames" data-par-host aria-hidden="true">${COVER.map(frame).join("")}</div>
    <div class="cv-center">
      <p class="eyebrow cv-eye">Cinema na Comunidade · Laboratório de Montagem</p>
      <h1 class="display cv-title" id="page-title" tabindex="-1"><span class="l l1" data-cut="-1">Cortando</span><span class="cv-scissor" aria-hidden="true">${icon("scissors")}<i></i></span><span class="l l2" data-cut="1"><em>Histórias</em></span></h1>
      <p class="cv-sub">Uma introdução à edição e à montagem audiovisual.<br>Monte com planos de filmes de verdade, assista, compare — e descubra o que o corte faz.</p>
    </div>
    <div class="cv-foot">
      <a class="cv-dock" href="${cont.href}"><span class="eyebrow">${esc(cont.eye)}${nome?" · "+esc(nome):""}</span><b class="cv-dock-t">${esc(cont.t)}</b><span class="mono cv-dock-m">${esc(cont.meta)}</span><span class="cv-go" aria-hidden="true">${icon("next")}</span></a>
      <a class="cv-down" href="#abertura" data-jump="abertura">A abertura <span aria-hidden="true">↓</span></a>
    </div>
  </section>

  <section class="doors" aria-label="Áreas do laboratório">
    <ul class="door-list">
      <li><a class="door" href="#/percurso" style="--dc:#2f6bff"><span class="door-n mono">${s.done}/${s.total}</span><b class="door-t">Meu percurso</b><span class="door-d">4 atos de experimentação. Veja onde você está.</span>${icon("path","door-i")}</a></li>
      <li><a class="door" href="#/percurso" data-flash="lista" style="--dc:#00a866"><span class="door-n mono">${s.total}</span><b class="door-t">Atividades</b><span class="door-d">Todas as atividades, na ordem do percurso.</span>${icon("film","door-i")}</a></li>
      <li><a class="door" href="#/livre" style="--dc:#ff5c35"><span class="door-n mono">${s.free}</span><b class="door-t">Laboratório livre</b><span class="door-d">Sem meta, sem prova. Só você e os planos.</span>${icon("spark","door-i")}</a></li>
      <li><a class="door" href="#/caderno" style="--dc:#a44fff"><span class="door-n mono">${s.notes}</span><b class="door-t">Caderno</b><span class="door-d">Reflexões, descobertas e versões.</span>${icon("book","door-i")}</a></li>
      <li><a class="door" href="#/eu" style="--dc:#f08a00"><span class="door-n mono">${s.disc}</span><b class="door-t">Meu espaço</b><span class="door-d">Nome, descobertas e acessibilidade.</span>${icon("user","door-i")}</a></li>
    </ul>
  </section>

  <div class="tape" aria-hidden="true"><div class="tape-track">${[0,1].map(()=>["CORTAR","JUNTAR","OLHAR","ESPERAR","SALTAR","REVELAR","REPETIR","OMITIR","ESCOLHER","MONTAR"].map(w=>`<span>${w}</span>`).join("")).join("")}</div></div>

  <section class="story" id="abertura" data-stage aria-labelledby="ab-h">
    <h2 class="sr" id="ab-h">Abertura: como um corte cria sentido</h2>
    <div class="stick">
      <div class="st-bg" aria-hidden="true"><b class="st-num" data-par="0.18">01</b><span class="st-strip s-a" data-par="-.06"></span><span class="st-strip s-b" data-par="-.14"></span></div>
      <div class="st-prog" aria-hidden="true"><i></i><i></i><i></i><i></i></div>

      <article class="scene sc1"><div class="sc-txt"><p class="eyebrow">01 · O plano</p><h3 class="display sc-h"><span class="ln"><span>Um plano sozinho</span></span><span class="ln"><span>é só uma imagem.</span></span></h3><p class="sc-p">Ele existe. Mas ainda não significa nada.</p></div>
        <div class="sc-vis"><div class="mon sc-mon" style="--ar:4/3"><video class="v1" data-scrub muted playsinline preload="auto" src="${CH.TK.SC_026.vid}" poster="${CH.TK.SC_026.th}" aria-label="Plano de um rosto, reproduzido conforme você rola a página"></video><span class="mon-tag tag" data-film="SC" style="--fc:var(--f-SC)">PLANO 1</span><span class="mon-tc mono tnum">00:00.0</span></div></div></article>

      <article class="scene sc2"><div class="sc-txt"><p class="eyebrow">02 · O corte</p><h3 class="display sc-h"><span class="ln"><span>Dois planos</span></span><span class="ln"><span>viram <em>uma ideia.</em></span></span></h3><p class="sc-p">O espectador cria a conexão. Isso é montagem.</p></div>
        <div class="sc-vis"><div class="mon sc-mon wipe" style="--ar:4/3"><video class="va" muted playsinline loop preload="auto" src="${CH.TK.SC_026.vid}" poster="${CH.TK.SC_026.th}" aria-hidden="true"></video><video class="vb" muted playsinline loop preload="auto" src="${CH.TK.SC_013.vid}" poster="${CH.TK.SC_013.th}" aria-hidden="true"></video><i class="wipe-line"><span>${icon("scissors")}</span></i><span class="mon-tag tag" data-film="SC" style="--fc:var(--f-SC)">PLANO 1 | PLANO 2</span></div></div></article>

      <article class="scene sc3"><div class="sc-txt"><p class="eyebrow">03 · Dois planos, um sentido</p><h3 class="display sc-h"><span class="ln"><span>O rosto</span></span><span class="ln"><span>não mudou.</span></span></h3><p class="sc-p">Mas a imagem ao lado muda o que você sente ao vê-lo. Toque para trocar.</p><p class="sc-cap" id="kcap" aria-live="polite">Ele parece lembrar de alguém.</p></div>
        <div class="sc-vis kvis" data-k="0"><div class="kpair"><div class="mon sc-mon kface" style="--ar:4/3"><video muted playsinline loop preload="auto" src="${CH.TK.SC_026.vid}" poster="${CH.TK.SC_026.th}" aria-hidden="true"></video><span class="mon-tag tag" data-film="SC" style="--fc:var(--f-SC)">ROSTO</span></div><span class="kplus mono" aria-hidden="true">+</span><div class="mon sc-mon kreply" style="--ar:4/3">${["SC_013","SC_029","SC_030"].map((id,i)=>`<video class="kr kr${i}" muted playsinline loop preload="auto" src="${CH.TK[id].vid}" poster="${CH.TK[id].th}" aria-hidden="true"></video>`).join("")}<span class="mon-tag tag" data-film="SC" style="--fc:var(--f-SC)">IMAGEM</span></div></div>
          <div class="kopts" role="group" aria-label="Imagem ao lado do rosto">
            ${[["SC_013","Ele parece lembrar de alguém."],["SC_029","Ele parece inquieto, perturbado."],["SC_030","Ele parece esperar algo."]].map(([id,c],i)=>`<button type="button" class="kopt${i?"":" on"}" data-cap="${esc(c)}" data-i="${i}" aria-pressed="${i===0}"><img src="${CH.TK[id].th}" alt="Imagem ${i+1}: ${esc(CH.TK[id].s)}" width="120" height="90"><span class="mono">${i+1}</span></button>`).join("")}
          </div></div></article>

      <article class="scene sc4"><div class="sc-txt"><p class="eyebrow">04 · A timeline</p><h3 class="display sc-h"><span class="ln"><span>Agora é</span></span><span class="ln"><span>a sua vez.</span></span></h3><p class="sc-p">Cada plano ocupa um espaço no tempo. Você decide a ordem — e o que o corte diz.</p><a class="btn pri sc-cta" href="#/lab/${next||CH.atividadesDoAto(CH.data.atos.atos[0])[0]}">Montar agora ${icon("next")}</a></div>
        <div class="sc-vis"><div class="mtl" aria-hidden="true"><div class="mtl-ruler"><i></i><i></i><i></i><i></i><i></i></div>
          <div class="mtl-row">${[["SC_026",1.3],["SC_013",.9],["SC_029",1.1]].map(([id,f],i)=>`<span class="mtl-c" style="--f:${f};--i:${i};--fc:var(--f-SC);background-image:url(${CH.TK[id].th})"><b class="mono">${i+1}</b></span>`).join("")}</div>
          <div class="mtl-row a"><span class="mtl-w"></span></div><i class="mtl-ph"><b></b></i></div></div></article>
    </div>
  </section>

  <section class="loop" aria-labelledby="lp-h">
    <p class="eyebrow">Cartilha e laboratório são um projeto só</p>
    <h2 class="h2" id="lp-h" data-reveal>A cartilha mostra.<br>O laboratório deixa você fazer.</h2>
    <ol class="loop-steps">
      <li data-in><span class="mono">1</span><b>Cartilha</b><span>conceitos, exemplos, provocações</span></li>
      <li data-in><span class="mono">2</span><b>Experimentação</b><span>monte com planos reais e assista</span></li>
      <li data-in><span class="mono">3</span><b>Cartilha</b><span>volte ao impresso com o que viu</span></li>
      <li data-in><span class="mono">4</span><b>Nova experimentação</b><span>refaça, compare, descubra mais</span></li>
    </ol>
    <ul class="loop-atos">${CH.data.atos.atos.map(a=>`<li style="--ac:${a.cor}"><a href="#/percurso"><span class="mono">Ato ${a.n}</span><b>${esc(a.titulo)}</b></a></li>`).join("")}</ul>
  </section>

  <footer class="home-foot">
    <p class="mono">Cortando Histórias — Laboratório de Montagem · Concepção e execução: Débora Augusta</p>
    <p><a class="link" href="#/creditos">Créditos e uso de IA</a></p>
  </footer>
</div>`;

  /* ——— interações ——— */
  root.addEventListener("click",e=>{
    const f=e.target.closest("[data-flash]");if(f)sessionStorage.setItem("ch:scroll",f.dataset.flash);
    const j=e.target.closest("[data-jump]");if(j){e.preventDefault();const t=document.getElementById(j.dataset.jump);t&&t.scrollIntoView({behavior:CH.reduced()?"auto":"smooth"})}
  });
  const cap=$("#kcap",root),kopts=$$(".kopt",root);let kSel=0,manual=false;
  const setK=i=>{kSel=i;kopts.forEach((b,k)=>{b.classList.toggle("on",k===i);b.setAttribute("aria-pressed",k===i)});cap.textContent=kopts[i].dataset.cap;const r=$(".kvis",root);r.dataset.k=i};
  kopts.forEach((b,i)=>b.addEventListener("click",()=>{manual=true;setK(i)}));
  const v1=$("video.v1",root),tc=$(".mon-tc",root),st=$("#abertura",root);
  let scrubWait=false;
  const vas=$$("video",st).filter(v=>!v.classList.contains("v1"));
  CH.scroll.init(root);
  const hook=(p,info)=>{
    const {idx,local}=info;
    $(".st-num",st).textContent="0"+(idx+1);
    $$(".st-prog i",st).forEach((i,k)=>i.style.setProperty("--f",k<idx?1:k===idx?local[k]:0));
    /* cena 1: o vídeo REAL anda conforme o scroll */
    if(v1&&v1.readyState>=1&&!scrubWait){
      const tt=(info.static?0:(local[0]))*Math.min(CH.TK.SC_026.d-.1,CH.TK.SC_026.d);
      scrubWait=true;requestAnimationFrame(()=>{scrubWait=false;try{v1.currentTime=tt}catch(e){}});
      tc.textContent=CH.fmt(tt);
    }
    /* cenas 2–3: vídeos tocam só quando a cena está ativa */
    vas.forEach(v=>{const sc=v.closest(".scene"),on=sc&&sc.classList.contains("on");if(on&&!CH.reduced())v.play().catch(()=>{});else v.pause()});
    if(idx===2&&!manual&&!info.static){const k=Math.min(2,Math.floor(local[2]*3.2));if(k!==kSel)setK(k)}
  };
  CH.scroll.hook(st,hook);
  return{title:"Início",destroy(){CH.scroll.teardown()}};
};
})();
