/* lab-panels.js — painéis do Laboratório: Planos (VER), Leitura (ASSISTIR→observar), Versões (GUARDAR/COMPARAR/EXPERIMENTAR),
   Descoberta (nomeação só DEPOIS). Usa o motor (Engine) e a leitura (Leituras) SEM alterá-los. */
(function(){
"use strict";
const CH=window.CH,{h,$,$$,esc,fmt,icon}=CH,Lab=CH.Lab,P=Lab.prototype;
const STEPS=[["ver","Ver"],["montar","Montar"],["assistir","Assistir"],["descobrir","Descobrir"],["guardar","Guardar"]];
const DEEP=[["comparar","Comparar"],["experimentar","Experimentar"]];

/* ============ referência (uma maneira possível de realizar a proposta — derivada do motor) ============ */
const REF={};
CH.referenceSeq=function(exId){
  if(exId in REF)return REF[exId];
  const ex=CH.EXF[exId];let found=null;
  if(ex&&exId!==CH.LIVRE){
    const c=[];
    ex.evaluation.pair_catalog.filter(p=>p.class==="valid"&&p.a!==p.b).forEach(p=>c.push([{id:p.a,a:0,b:1},{id:p.b,a:0,b:1}]));
    const sp=ex.operations.split;if(sp&&sp.enabled)(sp.takes||[]).forEach(t=>c.push([{id:t,a:0,b:.12},{id:t,a:.6,b:.72}]));
    for(const s of c){
      if(!s.every(x=>CH.TK[x.id]))continue;
      try{const r=Engine.classifyVersion(ex,CH.clipsOf(s));if(r.class==="valid"&&r.matched_targets.length){found=s;break}}catch(e){}
    }
  }
  return REF[exId]=found;
};
/* Enquanto a técnica não foi "descoberta", o texto não pode entregar o nome (ação → resultado → observação → NOMEAÇÃO). */
CH.neutral=function(t){
  if(!t)return t;
  const N="jump cut|elipse|plano\\/contraplano|match cut|efeito Kuleshov|corte na ação|cutaway";
  let x=String(t)
    .replace(new RegExp("\\s*[—–-]\\s*(isso é|é assim que o) (um |uma |o |a )?("+N+")( funciona)?\\.?","gi"),".")
    .replace(new RegExp("\\s*Isso é (um |uma )?("+N+")\\.","gi"),"")
    .replace(/\bdo corte na ação\b/gi,"desse tipo de corte")
    .replace(/\bo corte na ação\b/gi,"esse tipo de corte")
    .replace(/\bo match cut\b/gi,"a ligação entre as imagens")
    .replace(/\.\./g,".").trim();
  return x.replace(/(^|[.!?]\s+)([a-zà-ú])/g,(m,a,b)=>a+b.toUpperCase());
};
/* a leitura de uma montagem (motor + leituras), sem nome da técnica exposto ao aluno antes da hora */
CH.readSeq=function(exId,seq,others){
  const ex=CH.EXF[exId],clips=CH.clipsOf(seq);
  const r=Engine.classifyVersion(ex,clips);
  const L=Leituras.pick(CH.data.leituras,exId,clips,r,id=>CH.cardLabel(exId,id));
  return{clips,r,L};
};

/* ============ chips + stepper ============ */
P.renderChips=function(){
  const box=this.$("#lab-chips");if(!box)return;
  const st=CH.stage(this.exId),n=CH.store.act(this.exId).versions.length;
  box.innerHTML=`${this.free?"":`<span class="tag w">${esc(this.ex.difficulty||"")}</span>`}<span class="tag ${st>=2?"r":st?"y":"g"}">${this.free?"Exploração":CH.STAGE_LABEL[st]}</span>${n?`<span class="tag g">${n} ${n===1?"versão guardada":"versões guardadas"}</span>`:""}`;
};
P.stepState=function(){
  const a=CH.store.act(this.exId),nv=a.versions.length;
  const disc=Object.values(CH.store.discoveries()).some(d=>d.exId===this.exId);
  return{ver:!!a.viewed||this.seq.length>0||nv>0,montar:this.seq.length>0||nv>0,assistir:this.watched||!!a.watchedOnce||nv>0,
    descobrir:disc,guardar:nv>0,comparar:!!a.compared,experimentar:nv>1};
};
P.renderStepper=function(){
  this.renderChips();
  const ol=this.$("#stepper");if(!ol)return;
  const s=this.stepState();let cur=STEPS.findIndex(([k])=>!s[k]);if(cur<0)cur=STEPS.length;
  ol.innerHTML=STEPS.map(([k,l],i)=>`<li class="st ${s[k]?"done":i===cur?"now":""}" ${i===cur?'aria-current="step"':""}><span class="n">${s[k]?icon("check"):i+1}</span><span class="l">${l}</span><span class="sr">${s[k]?", feito":i===cur?", etapa atual":""}</span></li>`).join("")
   +`<li class="sep" aria-hidden="true"></li>`+DEEP.map(([k,l])=>`<li class="st deep ${s[k]?"done":""}"><span class="n">${s[k]?icon("check"):icon("plus")}</span><span class="l">${l}</span><span class="sr"> (para ir além${s[k]?", feito":""})</span></li>`).join("");
  const now=$(".now",ol);if(now&&ol.scrollWidth>ol.clientWidth){ol.scrollLeft=now.offsetLeft-ol.clientWidth/2+now.clientWidth/2}
  this.renderCoach&&this.renderCoach();
};

/* ============ PLANOS (VER) ============ */
P.buildPlanos=function(){
  const p=this.$("#p-planos");
  p.innerHTML=`
  <div class="pl-head"><h2 class="h3">Planos</h2><span class="tag g" id="pl-count"></span></div>
  <div class="seg" role="group" aria-label="Origem dos planos">
    <button type="button" data-lt="pool" aria-pressed="${this.libTab==="pool"}">${this.free?"Seleção":"Desta atividade"}</button>
    <button type="button" data-lt="all" aria-pressed="${this.libTab==="all"}">${this.free?"Todos os filmes":"Mais planos"}</button>
  </div>
  <label class="film-f" id="film-wrap" hidden><span class="sr">Filtrar por filme</span><select id="film"></select></label>
  <p class="hint" id="pl-hint"></p>
  <ul class="lib" id="lib"></ul>`;
  const sel=this.$("#film");
  sel.innerHTML='<option value="ALL">Todos os filmes</option>'+Object.entries(CH.data.films).map(([k,v])=>`<option value="${k}">${esc(v.t)}</option>`).join("");
  sel.onchange=()=>{this.film=sel.value;this.renderLibrary()};
  $$("[data-lt]",p).forEach(b=>b.onclick=()=>{this.libTab=b.dataset.lt;this.renderLibrary()});
  p.addEventListener("click",e=>{
    const li=e.target.closest(".take");if(!li)return;
    if(e.target.closest("[data-add]"))this.add(li.dataset.id);
    else if(e.target.closest("[data-ver]"))this.preview(li.dataset.id);
  });
  this.renderLibrary();
};
P.renderLibrary=function(){
  const p=this.$("#p-planos");
  $$("[data-lt]",p).forEach(b=>b.setAttribute("aria-pressed",b.dataset.lt===this.libTab));
  this.$("#film-wrap").hidden=this.libTab!=="all";
  const ids=this.libTab==="pool"?this.act.pool:CH.data.takes.filter(t=>this.film==="ALL"||t.f===this.film).map(t=>t.id);
  const list=ids.filter(i=>CH.TK[i]);
  list.sort((a,b)=>{const na=parseInt(String(CH.cardLabel(this.exId,a)).replace(/\D/g,""),10),nb=parseInt(String(CH.cardLabel(this.exId,b)).replace(/\D/g,""),10);return this.libTab==="pool"&&!isNaN(na)&&!isNaN(nb)?na-nb:0});
  this.$("#pl-count").textContent=list.length+" planos";
  this.$("#pl-hint").innerHTML=this.libTab==="pool"
    ? `Toque em <b>Ver</b> para assistir ao plano inteiro antes de montar. Depois, <b>Adicionar</b>.`
    : (this.free?"Planos de todos os filmes do projeto. Combine como quiser.":"Estes planos não fazem parte desta atividade. Você pode experimentar com eles, mas a atividade só avalia os planos dela.");
  this.$("#lib").innerHTML=list.map(id=>{
    const t=CH.TK[id],f=CH.data.films[t.f]||{},lab=this.libTab==="pool"&&CH.EXF[this.exId].card_labels[id]?CH.EXF[this.exId].card_labels[id]:id;
    return `<li class="take" data-id="${id}" data-film="${t.f}" style="--fc:var(--f-${t.f})">
      <button type="button" class="take-thumb" data-ver aria-label="Ver ${esc(lab)} inteiro, ${t.d.toFixed(1)} segundos${t.vid?"":" (sem vídeo)"}">
        <img src="${t.th}" alt="" loading="lazy" width="160" height="${t.ar==="4:3"?120:90}">
        <span class="pbadge">${icon("play")}Ver</span><span class="dur mono">${t.d.toFixed(1)}s</span>${t.vid?"":'<span class="novid">sem vídeo</span>'}
      </button>
      <div class="take-meta"><span class="tag" data-film="${t.f}" style="--fc:var(--f-${t.f})" title="${esc(f.t||"")}">${t.f}</span><b>${esc(lab)}</b><small>${esc(t.s)}</small></div>
      <button type="button" class="btn sm pri" data-add aria-label="Adicionar ${esc(lab)} à timeline">${icon("plus")}Adicionar</button>
    </li>`}).join("");
};

/* pré-visualização: vídeo REAL do take inteiro (controles próprios, sem som) */
P.preview=function(id){
  const t=CH.TK[id],f=CH.data.films[t.f]||{},lab=this.libTab==="pool"&&CH.EXF[this.exId].card_labels[id]?CH.EXF[this.exId].card_labels[id]:id;
  CH.store.act(this.exId).viewed=true;CH.store.save();this.renderStepper&&this.renderStepper();
  const dlg=h("dialog.pv",{"aria-labelledby":"pv-t"});
  dlg.innerHTML=`<div class="pv-in">
    <div class="pv-head"><div><span class="eyebrow">Plano inteiro · ${t.d.toFixed(1)} s</span><h2 class="h3" id="pv-t">${esc(lab)}</h2><p class="muted pv-s">${esc(t.s)} · cena de <i>${esc(f.t||"")}</i>${f.d?`, direção de ${esc(f.d)}`:""}</p></div>
      <button class="btn ghost sm icon-only" type="button" data-x aria-label="Fechar">${icon("x")}</button></div>
    <div class="monitor pv-mon" style="--ar:${CH.ratioCss(t.ar||"16:9")}">${t.vid&&CH.webm?`<video class="pv-v" src="${t.vid}" muted playsinline preload="auto" poster="${t.th}" aria-label="Vídeo: ${esc(lab)}"></video>`:`<img class="pv-v" src="${t.th}" alt=""><p class="mv-note">${CH.webm?"Este plano não tem arquivo de vídeo — mostramos só um quadro.":"Este navegador não reproduz o formato de vídeo do laboratório (WebM)."}</p>`}</div>
    <div class="pv-ctl"><button class="btn ink sm" type="button" data-pp>${icon("play")}<span>Reproduzir</span></button><input type="range" min="0" max="${t.d}" step="0.05" value="0" aria-label="Posição no plano" ${t.vid?"":"disabled"}><span class="mono tnum pv-tc">00:00.0</span></div>
    <div class="pv-act"><button class="btn pri" type="button" data-add>${icon("plus")}Adicionar à montagem</button><button class="btn ghost" type="button" data-x>Fechar</button></div>
  </div>`;
  document.body.append(dlg);
  const v=$("video.pv-v",dlg),rng=$("input",dlg),tc=$(".pv-tc",dlg),pp=$("[data-pp]",dlg);
  const setpp=on=>{pp.innerHTML=icon(on?"pause":"play")+"<span>"+(on?"Pausar":"Reproduzir")+"</span>"};
  if(v){
    v.muted=true;
    pp.onclick=()=>v.paused?v.play():v.pause();
    v.onplay=()=>setpp(true);v.onpause=()=>setpp(false);v.onended=()=>setpp(false);
    v.ontimeupdate=()=>{rng.value=v.currentTime;tc.textContent=fmt(v.currentTime)};
    rng.oninput=()=>{v.currentTime=+rng.value};
    v.onclick=()=>pp.click();
    v.play().catch(()=>{});
  }else{pp.disabled=true}
  const close=()=>{v&&v.pause();dlg.close()};
  dlg.addEventListener("click",e=>{if(e.target===dlg||e.target.closest("[data-x]"))close();if(e.target.closest("[data-add]")){close();this.add(id)}});
  dlg.addEventListener("close",()=>{dlg.remove()});
  dlg.showModal();
  (this.overlays=this.overlays||[]).push(dlg);
};
P.closeOverlays=function(){(this.overlays||[]).forEach(d=>{try{d.open&&d.close()}catch(e){}d.remove()});this.overlays=[]};

/* ============ LEITURA (ASSISTIR → observar) ============ */
P.buildLeitura=function(){
  this.$("#p-leitura").innerHTML=`<div id="rd-body"></div>`;
  this.$("#p-leitura").addEventListener("click",e=>{
    if(e.target.closest("[data-play]"))this.togglePlay();
    if(e.target.closest("[data-ref]"))this.openCompare("draft","ref");
    if(e.target.closest("[data-tab-v]"))this.setTab("versoes");
  });
  this.$("#p-leitura").addEventListener("change",e=>{
    const r=e.target.closest('input[name="q"]');if(!r)return;
    CH.store.setAnswer(this.exId,r.value);this.renderReadout();CH.say("Resposta registrada. Ela não é avaliada.");
  });
};
P.resetReadout=function(){this.read=null;this.renderReadout&&this.renderReadout()};
P.readClear=function(){};
P.afterWatch=function(){
  if(!this.seq.length)return;
  const A=CH.store.act(this.exId);if(!A.watchedOnce){A.watchedOnce=true;CH.store.save()}
  this.computeRead();
  const R=this.read,first=[];
  if(R&&R.L&&R.L.nome&&R.L.situacao==="proposta"&&CH.store.discover(R.L.nome,this.exId)){
    R.novo=true;
    CH.store.addNote({kind:"descoberta",exId:this.exId,text:"Descobri: "+R.L.nome+"."});
  }
  this.renderReadout();this.renderStepper();this.renderVersionsDraft();this.renderSaveState&&this.renderSaveState();
  const dot=this.$("#t-leitura .dot");if(this.tab!=="leitura"&&!this.wide()){dot.hidden=false}
  if(!this._autoSwitched&&!this.wide()){this._autoSwitched=true;this.setTab("leitura")}
  this.updateTabs&&this.updateTabs();
  CH.say(R&&R.novo?"Descoberta revelada: "+R.L.nome:"Montagem assistida. A leitura está pronta.");
};
P.computeRead=function(){
  const seq=this.seq;
  if(this.free){this.read={free:true};return}
  try{
    const {clips,r,L}=CH.readSeq(this.exId,seq);
    this.read={clips,r,L,pairs:this.pairFx(seq)};
  }catch(err){console.warn(err);this.read={error:true}}
};
P.pairFx=function(seq){
  const fx=this.act.fx||{},o=[];
  for(let i=0;i<seq.length-1;i++){const e=fx[seq[i].id+"→"+seq[i+1].id];if(e)o.push({i,text:e})}
  return o;
};
P.prompts=function(clips,r){
  const ex=this.ex,a=CH.store.act(this.exId);
  try{
    const others=a.versions.filter(v=>JSON.stringify(v.seq)!==JSON.stringify(this.seq)).map(v=>({clips:v.clips,reflection:v.reflection}));
    const comp=Engine.checkCompletion(ex,[...a.versions.map(v=>v.clips)]);
    const qa=ex.question&&a.answer?{[ex.question.id]:a.answer}:null;
    const fb=Engine.feedback({exercise:ex,version:clips,result:r,otherVersions:others,reflection:"",questionAnswers:qa,completion:comp});
    return fb.filter(f=>f.kind==="on_validate"||f.kind==="after_completion"||f.kind==="system");
  }catch(err){console.warn(err);return[]}
};
P.renderReadout=function(){
  const body=this.$("#rd-body");if(!body)return;
  if(!this.seq.length){body.innerHTML=this.emptyRead("Comece escolhendo planos","Monte uma sequência na timeline. O que você perceber vem depois de assistir.",false);return}
  if(!this.watched||!this.read){body.innerHTML=this.emptyRead("Assista à sua montagem","Primeiro a percepção, depois a explicação. Toque em Assistir e observe.",true);return}
  const R=this.read;
  if(R.error){body.innerHTML=`<div class="rd-card"><p>Não foi possível ler esta montagem agora.</p></div>`;return}
  if(R.free){body.innerHTML=this.freeRead();return}
  const {L,r,clips}=R,a=CH.store.act(this.exId),ped=CH.data.pedagogia[this.exId]||{};
  const disc=CH.store.discoveries();
  const open=L.nome?!!disc[L.nome]:Object.values(disc).some(d=>d.exId===this.exId);
  const mk=t=>open?t:CH.neutral(t);
  const prompts=this.prompts(clips,r);
  const omit=this.omittedHTML();
  body.innerHTML=`
  ${open&&L.nome&&L.situacao==="proposta"?this.discHTML(L,R):this.otherHTML(L)}
  ${ped.depois?`<div class="rd-block rd-ask"><span class="eyebrow">Percebeu?</span><p class="rd-q">${esc(ped.depois)}</p></div>`:""}
  ${omit}
  ${this.recapHTML()}
  <article class="rd-card s-${L.situacao}">
    <div class="rd-ic" aria-hidden="true">${icon(CH.gIcon(L.situacao))}</div>
    <div class="rd-tx"><span class="eyebrow">O que a sua montagem faz</span><h2 class="h3">${esc(L.titulo)}</h2>
      <p class="rd-o">${esc(mk(L.o_que||""))}</p>${L.por_que?`<p class="rd-p">${esc(mk(L.por_que))}</p>`:""}
      ${L.experimente?`<p class="rd-e"><b>Experimente:</b> ${esc(mk(L.experimente))}</p>`:""}</div>
  </article>
  ${R.pairs&&R.pairs.length?`<div class="rd-block"><span class="eyebrow">O que essa passagem pode fazer sentir</span><ul class="rd-pairs">${R.pairs.map(p=>`<li><span class="mono">Plano ${p.i+1} → ${p.i+2}</span><em>${esc(p.text)}</em></li>`).join("")}</ul></div>`:""}
  ${prompts.length?`<div class="rd-block"><span class="eyebrow">Repare</span><ul class="rd-prompts">${prompts.map(f=>`<li>${esc(mk(f.text).replace(/^Repare:\s*/i,""))}</li>`).join("")}</ul></div>`:""}
  ${this.questionHTML(a)}
  ${this.contrastLink()}
  <div class="rd-block rd-actions">
    <button class="btn pri" type="button" data-save-quick ${this.saveBlock()?"disabled":""}>${icon("save")}Guardar esta versão</button>
    <button class="btn" type="button" data-exp>${icon("spark")}Quer ir além? Experimente outra combinação</button>
  </div>`;
};
P.emptyRead=function(t,d,btn){
  return `<div class="rd-empty"><span class="strip"><i></i><i class="on"></i><i></i><i></i></span><h2 class="h3">${esc(t)}</h2><p class="muted">${esc(d)}</p>${btn&&this.seq.length?`<button class="btn ink" type="button" data-play>${icon("play")}Assistir agora</button>`:""}</div>`;
};
P.freeRead=function(){
  const seq=this.seq,T=CH.total(seq),films=[...new Set(seq.map(s=>CH.TK[s.id].f))];
  const sug=[];
  if(seq.length===1)sug.push("Adicione um segundo plano. O que um plano faz com o outro?");
  else{sug.push("Troque a ordem de dois planos e assista de novo. O que muda?");sug.push("Tire um plano. A história ainda se entende?");sug.push("Encurte um plano. Como o ritmo muda?")}
  return `<article class="rd-card s-free"><div class="rd-ic" aria-hidden="true">${icon("circle")}</div><div class="rd-tx"><span class="eyebrow">Laboratório livre</span><h2 class="h3">Sem certo ou errado</h2>
    <p class="rd-o">${seq.length} ${seq.length===1?"plano":"planos"}, ${T.toFixed(1)} s, ${Math.max(0,seq.length-1)} ${seq.length===2?"corte":"cortes"}${films.length>1?`, ${films.length} filmes diferentes`:""}.</p>
    <p class="rd-p">O sentido é você quem decide. Descreva o que percebeu em uma frase — é assim que uma montagem vira autoria.</p></div></article>
    <div class="rd-block"><span class="eyebrow">Experimente</span><ul class="rd-prompts">${sug.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div>
    <div class="rd-block rd-actions"><button class="btn sm" type="button" data-tab-v>${icon("save")}Guardar esta versão</button></div>`;
};
P.contrastLink=function(){
  if(!["EX_JUMPCUT_NL01","EX_ELIPSE_NL01","EX_CORTE_002"].includes(this.exId))return"";
  return `<a class="contrast-link" href="#/contraste"><span class="eyebrow">Para sentir a diferença</span><b>Tirar um pedaço nem sempre soa igual.</b><span>Compare duas montagens lado a lado e diga o que percebeu.</span><span class="go">Abrir comparação ${icon("next")}</span></a>`;
};
P.questionHTML=function(a){
  const q=this.ex.question;if(!q)return"";
  const opt=o=>{
    const t=CH.TK[o];const lab=t?CH.cardLabel(this.exId,o):(/^T_/.test(o)?o:o);
    return `<label class="q-opt${a.answer===o?" on":""}"><input type="radio" name="q" value="${esc(o)}" ${a.answer===o?"checked":""}>${t?`<img src="${t.th}" alt="" width="72" height="54">`:""}<span>${esc(lab)}</span></label>`};
  return `<fieldset class="rd-block q-card"><legend class="eyebrow">Pergunta para observar <span class="tag g">opcional · sem nota</span></legend><p class="q-p">${esc(q.prompt)}</p><div class="q-opts">${q.options.map(opt).join("")}</div></fieldset>`;
};

/* ============ DESCOBERTA (nomeação depois) ============ */
P.unlocked=function(v){return true};
P.otherHTML=function(L){
  return `<section class="disc other"><span class="eyebrow">Exploração diferente</span><p>${icon("compare")}<span>Você encontrou outra possibilidade. Ela funciona como experiência, mas não é o efeito que estamos investigando nesta atividade.${CH.referenceSeq(this.exId)?" Quer ver o que a atividade investiga? Abra <b>Aprofundar → Comparar</b>.":""}</span></p></section>`;
};
P.discHTML=function(L,R){
  const c=CH.cartiLine(this.exId),ato=c.ato,ped=CH.data.pedagogia[this.exId]||{};
  const fx=this.act.fx||{};
  return `<section class="disc open" aria-labelledby="disc-h">
    <span class="eyebrow">${R&&R.novo?"Descoberta revelada":"Descoberta desta atividade"}</span>
    <p class="disc-pre">Você acabou de experimentar</p>
    <h2 class="disc-name display" id="disc-h">${esc(L.nome)}</h2>
    <p class="disc-def">${esc(L.por_que||L.o_que||"")}</p>
    <ul class="disc-gain" aria-label="O que você ganhou">
      <li>${icon("frame")}<span>Fotograma revelado na sua folha de contato</span></li>
      <li>${icon("key")}<span>Conceito na sua <a class="link" href="#/conceitos">biblioteca de descobertas</a></span></li>
      <li>${icon("pencil")}<span>Nova entrada no <a class="link" href="#/caderno">Caderno</a></span></li>
    </ul>
    <p class="disc-carti">${icon("book")}<span>Na cartilha: <b>${esc(c.text||"volte ao ato correspondente")}</b>${ato?` — <em>${esc(ato.titulo)}</em>`:""}.${c.pdf?` <a class="link" href="${esc(c.pdf)}" target="_blank" rel="noopener">Voltar para a cartilha</a>`:""}</span></p>
  </section>`;
};
/* Kuleshov: MESMO ROSTO + IMAGEM DIFERENTE = LEITURA DIFERENTE, com os próprios frames da atividade */
P.recapHTML=function(){
  if((this.ex.category||"")!=="kuleshov"||this.seq.length<2)return"";
  const A=CH.store.act(this.exId),fx=this.act.fx||{};
  const pairs=[];
  const add=(seq)=>{if(seq.length<2)return;const f=seq[0].id,i=seq[1].id;if(!pairs.some(p=>p.f===f&&p.i===i))pairs.push({f,i,t:fx[f+"→"+i]||""})};
  add(this.seq);A.versions.slice().reverse().forEach(v=>add(v.seq));
  const P3=pairs.slice(0,3);
  const fr=id=>{const t=CH.TK[id];return `<figure class="rc-f"><img src="${t.th}" alt="${esc(CH.cardLabel(this.exId,id))}: ${esc(t.s)}" width="160" height="${t.ar==="4:3"?120:90}"></figure>`};
  return `<section class="rd-block recap" aria-label="Mesmo rosto, imagens diferentes">
    <span class="eyebrow">O que mudou</span>
    <div class="rc-head" aria-hidden="true"><b>Mesmo rosto</b><span>+</span><b>Imagem diferente</b><span>=</span><b>Leitura diferente</b></div>
    <ul class="rc-list">${P3.map(p=>`<li>${fr(p.f)}<span class="rc-op" aria-hidden="true">+</span>${fr(p.i)}<span class="rc-op" aria-hidden="true">=</span><span class="rc-read">${p.t?esc(p.t):"—"}</span></li>`).join("")}</ul>
    ${P3.length<2?`<p class="muted rc-hint">Troque só a segunda imagem e assista de novo: o rosto continua o mesmo.</p>`:""}
  </section>`;
};
/* Elipse × jump cut: a pergunta pedagógica é outra — mostramos o tempo omitido */
P.omittedHTML=function(){
  if(!["EX_ELIPSE_NL01","EX_JUMPCUT_NL01"].includes(this.exId))return"";
  /* tempo omitido = lacunas ENTRE trechos consecutivos do mesmo plano (o que some "no meio") */
  let om=0;for(let i=0;i<this.seq.length-1;i++){const a=this.seq[i],b=this.seq[i+1];if(a.id===b.id&&b.a>a.b)om+=(b.a-a.b)*CH.TK[a.id].d}
  const total=CH.TK[this.seq[0].id].d,kept=Math.max(0,total-om);
  if(om<=0)return`<div class="rd-block omit"><span class="eyebrow">${this.exId==="EX_ELIPSE_NL01"?"Tempo da ação":"Na imagem"}</span><p class="muted">Nada foi retirado do meio ainda: as pontas estão coladas, então o corte quase não se nota. Corte duas vezes e remova o trecho do meio.</p></div>`;
  if(this.exId==="EX_ELIPSE_NL01")return `<div class="rd-block omit"><span class="eyebrow">Tempo da ação</span><p class="omit-n"><b class="display">${om.toFixed(0)} s</b> <span>de ${total.toFixed(0)} s desapareceram</span></p><div class="omit-bar" aria-hidden="true"><i style="width:${(kept/total*100).toFixed(1)}%"></i></div><p class="muted">Você não viu esse tempo passar. Mas entendeu que ele passou.</p></div>`;
  return `<div class="rd-block omit"><span class="eyebrow">Na imagem</span><p class="omit-n"><b class="display">${om.toFixed(0)} s</b> <span>retirados do meio do mesmo plano</span></p><p class="muted">Olhe o quadro logo antes e logo depois do corte: o que saltou?</p></div>`;
};
P.checkDiscoveries=function(){
  const a=CH.store.act(this.exId);let novo=null;
  a.versions.forEach(v=>{if(v.nome&&this.unlocked(v)&&CH.store.discover(v.nome,this.exId))novo=v.nome});
  if(novo){CH.toast("Descoberta: "+novo+" — o nome dessa técnica entrou no seu percurso.",4200)}
  return novo;
};

/* ============ VERSÕES (GUARDAR / COMPARAR / EXPERIMENTAR) ============ */
P.buildVersoes=function(){
  const rp=this.rp(),free=this.free,req=!!rp.required,per=rp.scope;
  const p=this.$("#p-versoes");
  const reflLabel=free?"Nota sobre esta versão":"O que você percebeu";
  p.innerHTML=`
  <div class="vs-draft card-flat" id="vs-draft"></div>
  <form class="vs-form" id="vs-form" novalidate>
    ${per==="per_exercise"&&!free?"":`
    <div class="fld">
      <div class="fld-top"><label for="refl" class="fld-l">${reflLabel}</label><span class="tag ${req?"y":"g"}">${req?"Para aprofundar":"Opcional"}</span></div>
      <p class="fld-p" id="refl-p">${esc(this.promptFor())}</p>
      ${this.ex.exercise_id&&/^EX_MURCH/.test(this.exId)?`<fieldset class="chips" id="murch"><legend class="sr">Você escolheu esse plano por causa de quê?</legend>${["Emoção","História","Ritmo","Olhar","Plano 2D","Espaço 3D"].map(c=>`<label class="chip"><input type="checkbox" value="${c}"><span>${c}</span></label>`).join("")}</fieldset>`:""}
      <textarea id="refl" rows="3" maxlength="600" ${req?'aria-required="true"':""} aria-describedby="refl-p refl-err" placeholder="${free?"Em uma frase…":"Escreva com suas palavras…"}"></textarea>
      <p class="fld-err" id="refl-err" role="alert" hidden></p>
    </div>`}
    <button class="btn pri" type="submit" id="b-save">${icon("save")}<span>Guardar versão</span></button>
    <p class="save-why" id="save-why" aria-live="polite"></p>
  </form>
  ${per==="per_exercise"&&!free?`
  <div class="vs-exrefl card-flat" id="vs-exrefl">
    <div class="fld-top"><label for="refl-ex" class="fld-l">Reflexão da atividade</label><span class="tag ${req?"y":"g"}">${req?"Para aprofundar":"Opcional"}</span></div>
    <p class="fld-p" id="rex-p">${esc(rp.prompt||"")} Uma reflexão para a atividade toda.</p>
    <textarea id="refl-ex" rows="3" maxlength="800" ${req?'aria-required="true"':""} aria-describedby="rex-p"></textarea>
    <div class="row rex-row"><button class="btn sm ink" type="button" id="b-rex">${icon("check")}<span>Registrar reflexão</span></button><span class="muted" id="rex-st"></span></div>
  </div>`:""}
  <div class="vs-prog" id="vs-prog"></div>
  <div class="vs-list-h"><h2 class="h3">Versões guardadas</h2><button class="btn sm" type="button" id="b-cmp">${icon("compare")}Comparar</button></div>
  <ul class="vlist" id="vlist"></ul>`;
  const f=this.$("#vs-form"),rf=this.$("#refl");
  f.addEventListener("submit",e=>{e.preventDefault();this.saveVersion()});
  rf&&rf.addEventListener("input",()=>{this.renderSaveState();const er=this.$("#refl-err");if(rf.value.trim())er.hidden=true});
  const rx=this.$("#refl-ex");
  if(rx){rx.value=CH.store.act(this.exId).reflection||"";rx.addEventListener("input",()=>{CH.store.act(this.exId).reflectionDraft=rx.value;this.renderRexState()});
    this.$("#b-rex").onclick=()=>this.registerExReflection()}
  this.$("#b-cmp").onclick=()=>this.openCompare();
  p.addEventListener("click",e=>{
    const b=e.target.closest("[data-vact]");
    if(b){const id=b.closest("[data-vid]").dataset.vid;this.versionAction(b.dataset.vact,id)}
    if(e.target.closest("[data-note-disc]")){const nm=e.target.closest("[data-note-disc]").dataset.noteDisc;this.noteDiscovery(nm)}
  });
  this.$("#p-leitura").addEventListener("click",e=>{
    const b=e.target.closest("[data-note-disc]");if(b)this.noteDiscovery(b.dataset.noteDisc);
    if(e.target.closest("[data-exp]")){this.setTab("planos");const n=this.$("#b-play");n&&n.focus()}
  });
  this.renderVersionsDraft();this.renderVersionList();this.renderProgress();this.renderRexState();
};
P.renderVersionsDraft=function(){
  const d=this.$("#vs-draft");if(!d)return;
  const n=this.seq.length,T=CH.total(this.seq);
  d.innerHTML=`<span class="eyebrow">Sua montagem agora</span>${n?`<div class="mstrip">${this.stripHTML(this.seq)}</div><p class="mono tnum">${n} ${n===1?"plano":"planos"} · ${T.toFixed(1)} s${this.fromVersion?` · a partir da versão ${(CH.store.act(this.exId).versions.find(v=>v.id===this.fromVersion)||{}).n||""}`:""}</p>`:`<p class="muted">Ainda vazia. Escolha planos em <b>Planos</b>.</p>`}`;
  this.renderSaveState();
};
P.stripHTML=function(seq){
  const T=Math.max(CH.total(seq),.1);
  return seq.map(s=>{const t=CH.TK[s.id];return `<i data-film="${t.f}" style="flex:${(CH.dur(s)/T).toFixed(3)};--fc:var(--f-${t.f});background-image:url(${t.th})" title="${esc(CH.cardLabel(this.exId,s.id))} · ${CH.dur(s).toFixed(1)}s"></i>`}).join("");
};
P.saveBlock=function(){
  const a=CH.store.act(this.exId);
  if(!this.seq.length)return"Adicione planos à timeline para guardar uma versão.";
  if(!this.free&&!this.watched)return"Assista à montagem até o fim para poder guardá-la.";
  const last=a.versions[a.versions.length-1];
  if(last&&JSON.stringify(last.seq)===JSON.stringify(this.seq))return"Esta versão já está guardada. Mude algo para guardar outra.";
  return"";
};
/* perguntas curtas e concretas; a carga de escrita varia de uma versão para outra */
P.promptFor=function(){
  const n=CH.store.act(this.exId).versions.length+1,rp=this.rp();
  if(this.free)return"Em uma frase: o que mudou quando você montou assim?";
  if(/^EX_MURCH/.test(this.exId))return"Você escolheu esse plano por causa de quê? Marque e, se quiser, escreva.";
  if(n===1)return rp.prompt||"O que você percebeu nesta versão?";
  if(n===2)return"Mudou alguma coisa em relação à primeira? O quê?";
  return"Qual versão funciona melhor para você? Por quê?";
};
P.renderSaveState=function(){
  const b=this.$("#b-save");if(!b)return;
  const why=this.saveBlock();b.disabled=!!why;b.setAttribute("aria-disabled",!!why);
  this.$("#save-why").textContent=why;
};
P.saveVersion=function(){
  const why=this.saveBlock();
  if(why)return CH.toast(why);
  const rf=this.$("#refl"),ch=$$("#murch input:checked",this.el).map(x=>x.value);
  let refl=rf?rf.value.trim():"";if(ch.length)refl=("Escolhi por: "+ch.join(", ")+"."+(refl?" "+refl:""));
  let meta={};
  if(!this.free){try{const {clips,r,L}=CH.readSeq(this.exId,this.seq);meta={cls:r.class,matched:r.matched_targets,situacao:L.situacao,titulo:L.titulo,nome:L.nome||null,porque:L.por_que||null}}catch(e){}}
  const before=CH.progress(this.exId).status;
  const v=CH.store.addVersion(this.exId,Object.assign({seq:JSON.parse(JSON.stringify(this.seq)),clips:CH.clipsOf(this.seq),reflection:refl,dur:CH.total(this.seq),from:this.fromVersion||null},meta));
  if(refl)CH.store.addNote({kind:"reflexao",exId:this.exId,vid:v.id,vn:v.n,text:refl});
  if(rf)rf.value="";$$("#murch input:checked",this.el).forEach(x=>x.checked=false);
  this.fromVersion=v.id;this.dirty=false;this.saveDraftNow();
  const novo=this.checkDiscoveries();
  const after=this.completionCheck();
  CH.toast(after&&before!=="concluida"?"Você aprofundou esta atividade.":"Versão "+v.n+" guardada.",3200);
  this.renderVersionList();this.renderProgress();this.renderSaveState();this.renderStepper();this.renderReadout();this.renderVersionsDraft();
  this.$("#cnt-v").textContent=CH.store.act(this.exId).versions.length;
};
P.completionCheck=function(){
  if(this.free)return false;
  const pr=CH.progress(this.exId);CH.store.markDone(this.exId,pr.done);return pr.done;
};
P.renderRexState=function(){
  const rx=this.$("#refl-ex");if(!rx)return;
  const a=CH.store.act(this.exId),v=rx.value.trim(),b=this.$("#b-rex"),saved=(a.reflection||"").trim();
  b.disabled=!v||v===saved;
  this.$("#rex-st").textContent=saved&&v===saved?"Registrada":(!v&&this.rp().required?"Escreva para registrar e aprofundar.":"");
};
P.registerExReflection=function(){
  const rx=this.$("#refl-ex"),t=rx.value.trim();if(!t)return CH.toast("Escreva sua reflexão para registrar.");
  CH.store.setReflection(this.exId,t);
  CH.store.addNote({kind:"reflexao",exId:this.exId,vn:null,text:t});
  this.checkDiscoveries();const done=this.completionCheck();
  CH.toast(done?"Você aprofundou esta atividade.":"Reflexão registrada.",3200);
  this.renderRexState();this.renderProgress();this.renderStepper();this.renderReadout();
};
P.renderProgress=function(){
  const box=this.$("#vs-prog");if(!box)return;
  if(this.free){box.innerHTML=`<p class="muted">Aqui não há meta: guarde as versões que quiser. Elas vão para o <a class="link" href="#/caderno">Caderno</a>.</p>`;return}
  const pr=CH.progress(this.exId),ex=this.ex,c=ex.evaluation.completion,items=[];
  const nv=(pr.counted?pr.counted.length:0),st=CH.stage(this.exId);
  if(pr.done){
    const nx=nextAfter(this.exId);
    box.innerHTML=`<div class="done-card"><div class="done-fr" aria-hidden="true">${CH.frameSVG(CH.atoDe(this.exId)?CH.atoDe(this.exId).cor:"#d8000f",3)}</div><div><span class="eyebrow">Aprofundou</span><h3 class="h3">Você foi além do primeiro experimento</h3><p class="muted">Comparou caminhos e registrou o que percebeu. Siga quando quiser.</p>
    <div class="wrap">${nx?`<a class="btn pri sm" href="#/lab/${nx}">Próxima: ${esc(CH.ACT[nx].t)}${icon("next")}</a>`:""}<a class="btn sm" href="#/percurso">Ver percurso</a></div></div></div>`;return}
  pr.reasons.forEach(r=>{
    if(r==="min_versions")items.push(`Guarde mais versões <b>diferentes</b> (${nv} de ${c.min_versions} por enquanto).`);
    else if(r.startsWith("required_targets"))items.push("Falta experimentar outra relação entre os planos — veja <b>Experimente</b> na Leitura.");
    else if(r==="min_versions_matching")items.push("Algumas versões precisam seguir a proposta da atividade.");
    else if(r==="distinct_violation")items.push("Duas versões usam a mesma imagem: troque por uma bem diferente.");
    else if(r==="equivalence_violation")items.push("Duas versões dizem quase a mesma coisa. Tente uma imagem bem diferente.");
  });
  if(pr.complete&&!pr.refl.ok)items.push(pr.refl.scope==="per_exercise"?"Falta <b>registrar o que você percebeu</b> (reflexão da atividade).":"Falta anotar o que você percebeu nas versões.");
  if(!pr.n)items.unshift(`Guarde ${c.min_versions>1?"pelo menos "+c.min_versions+" versões":"uma versão"} para aprofundar.`);
  box.innerHTML=`<div class="prog-card"><span class="eyebrow">Para aprofundar ${st>=2?"(você já descobriu o conceito)":""}</span><ul>${items.map(i=>`<li>${i}</li>`).join("")||"<li>Continue experimentando.</li>"}</ul><p class="muted">Isso é opcional: você pode seguir para a próxima atividade a qualquer momento.</p></div>`;
};
function nextAfter(exId){
  const flat=[];CH.data.atos.atos.forEach(a=>CH.atividadesDoAto(a).forEach(i=>flat.push(i)));
  const i=flat.indexOf(exId);return flat.slice(i+1).find(x=>CH.stage(x)<2)||null;
}
P.renderVersionList=function(){
  const a=CH.store.act(this.exId),ul=this.$("#vlist");if(!ul)return;
  this.$("#cnt-v").textContent=a.versions.length;
  this.$("#b-cmp").disabled=!(a.versions.length+(this.seq.length?1:0)>=2)&&!CH.referenceSeq(this.exId);
  if(!a.versions.length){ul.innerHTML=`<li class="v-empty muted">Nenhuma versão guardada ainda. Monte, assista e guarde — cada versão vira um ponto de comparação.</li>`;return}
  ul.innerHTML=[...a.versions].reverse().map(v=>{
    const nm=v.nome&&this.unlocked(v);
    return `<li class="vitem" data-vid="${v.id}"><div class="v-top"><b class="v-n">Versão ${v.n}</b><span class="mono muted">${CH.fmt(v.dur)} · ${CH.ago(v.at)}</span></div>
    <div class="mstrip">${this.stripHTML(v.seq)}</div>
    ${v.titulo&&!this.free?`<p class="v-t">${icon(CH.gIcon(v.situacao),"tiny")}<span>${esc(v.titulo)}</span></p>`:""}
    ${nm?`<p class="v-name"><span class="tag r">Descoberta</span> ${esc(v.nome)}</p>`:""}
    ${v.reflection?`<blockquote class="v-r">${esc(v.reflection)}</blockquote>`:""}
    <div class="wrap v-act"><button class="btn sm" type="button" data-vact="open">${icon("copy")}Duplicar e experimentar</button><button class="btn sm ghost" type="button" data-vact="cmp">${icon("compare")}Comparar</button><button class="btn sm ghost" type="button" data-vact="note">${icon("pencil")}Anotar</button><button class="btn sm ghost" type="button" data-vact="del" aria-label="Excluir versão ${v.n}">${icon("trash")}</button></div></li>`}).join("");
};
P.versionAction=function(act,id){
  const a=CH.store.act(this.exId),v=a.versions.find(x=>x.id===id);if(!v)return;
  if(act==="open"){
    this.push();this.seq=JSON.parse(JSON.stringify(v.seq));this.sel=-1;this.fromVersion=v.id;this.watched=false;this.read=null;this.t=0;
    this.player.setSeq(this.seq);this.afterChange();this.saveDraft();this.setTab("planos");
    this.sel=0;this.updateSelUI();this.player.seek(0);
    CH.toast("Versão "+v.n+" aberta como nova tentativa. Mude algo e assista.");this.$("#b-play").focus();
  }else if(act==="cmp"){this.openCompare("v:"+id,"draft")}
  else if(act==="note"){
    const t=prompt("O que você percebeu nesta versão?",v.reflection||"");
    if(t!==null&&t.trim()){CH.store.updateVersion(this.exId,id,{reflection:t.trim()});CH.store.addNote({kind:"reflexao",exId:this.exId,vid:id,vn:v.n,text:t.trim()});this.checkDiscoveries();this.completionCheck();this.renderVersionList();this.renderProgress();this.renderStepper();CH.toast("Anotação guardada.")}
  }
  else if(act==="del"){if(confirm("Excluir a versão "+v.n+"? Isso não pode ser desfeito.")){CH.store.delVersion(this.exId,id);this.renderVersionList();this.renderProgress();this.renderStepper();this.renderReadout();CH.toast("Versão excluída.")}}
};
P.noteDiscovery=function(nome){
  CH.store.addNote({kind:"descoberta",exId:this.exId,text:"Descobri o nome: "+nome+". "});
  CH.toast("Anotação criada no Caderno. Abra o Caderno para continuar escrevendo.",3400);
};

/* ============ COMPARAR A/B — dois vídeos reais ao mesmo tempo ============ */
P.cmpOptions=function(){
  const a=CH.store.act(this.exId),o=[];
  if(this.seq.length)o.push({k:"draft",l:"Sua montagem agora",seq:this.seq});
  [...a.versions].reverse().forEach(v=>o.push({k:"v:"+v.id,l:"Versão "+v.n,seq:v.seq,v}));
  const r=CH.referenceSeq(this.exId);if(r)o.push({k:"ref",l:"Referência (uma forma de realizar a proposta)",seq:r,ref:true});
  return o;
};
P.openCompare=function(ka,kb){
  const opts=this.cmpOptions();
  if(opts.length<2)return CH.toast("Guarde ou monte pelo menos duas montagens para comparar.");
  this.player.pause();
  let A=opts.find(o=>o.k===ka)||opts[0],B=opts.find(o=>o.k===kb&&o!==A)||opts.find(o=>o!==A);
  const dlg=h("dialog.cmp",{"aria-labelledby":"cmp-t"});
  const optHTML=cur=>opts.map(o=>`<option value="${o.k}" ${o===cur?"selected":""}>${esc(o.l)}</option>`).join("");
  dlg.innerHTML=`<div class="cmp-in">
   <div class="cmp-head"><div><span class="eyebrow">${esc(this.act.t)}</span><h2 class="h2" id="cmp-t">Comparar</h2></div><button class="btn ghost sm icon-only" type="button" data-x aria-label="Fechar comparação">${icon("x")}</button></div>
   <p class="lead cmp-lead">Assista às duas ao mesmo tempo. Preste atenção no momento do corte: o que muda de uma para a outra?</p>
   <div class="cmp-grid">
     ${["A","B"].map((s,i)=>`<section class="cmp-col" data-s="${s}"><div class="cmp-top"><span class="cmp-l">${s}</span><label class="sr" for="sel-${s}">Montagem ${s}</label><select id="sel-${s}" data-sel="${s}">${optHTML(i?B:A)}</select></div>${CH.monitorHTML(this.ar)}<div class="mstrip" data-strip></div><p class="cmp-info mono tnum" data-info></p><blockquote class="v-r" data-refl hidden></blockquote></section>`).join("")}
   </div>
   <div class="cmp-ctl"><button class="btn ink" type="button" data-play>${icon("play")}<span>Assistir as duas</span></button><button class="btn ghost" type="button" data-stop>${icon("stop")}Parar</button></div>
   <div class="fld cmp-note"><label for="cmp-txt" class="fld-l">O que mudou entre A e B?</label><p class="fld-p">Escreva com suas palavras. Fica guardado no Caderno.</p><textarea id="cmp-txt" rows="3" maxlength="600"></textarea><button class="btn sm" type="button" data-save>${icon("pencil")}Guardar no Caderno</button></div>
  </div>`;
  document.body.append(dlg);(this.overlays=this.overlays||[]).push(dlg);
  const pl={};let played=0;
  const setCol=(s,o)=>{
    const col=$(`[data-s="${s}"]`,dlg);
    if(pl[s])pl[s].destroy();
    pl[s]=new CH.SeqPlayer($(".monitor",col),{onTime:t=>{$(".mv-tc",col).textContent=fmt(t)+" / "+fmt(pl[s].total)},onEnd:()=>{played++;if(played>=2){const a=CH.store.act(this.exId);a.compared=true;CH.store.save();this.renderStepper&&this.renderStepper()}}});
    pl[s].setSeq(o.seq);
    $("[data-strip]",col).innerHTML=this.stripHTML(o.seq);
    $("[data-info]",col).textContent=o.seq.length+" planos · "+CH.total(o.seq).toFixed(1)+" s";
    const bq=$("[data-refl]",col);bq.hidden=!(o.v&&o.v.reflection);bq.textContent=o.v?o.v.reflection:"";
  };
  setCol("A",A);setCol("B",B);
  dlg.addEventListener("change",e=>{const s=e.target.dataset&&e.target.dataset.sel;if(!s)return;const o=opts.find(x=>x.k===e.target.value);if(s==="A")A=o;else B=o;setCol(s,o);played=0});
  dlg.addEventListener("click",e=>{
    if(e.target===dlg||e.target.closest("[data-x]")){Object.values(pl).forEach(p=>p.destroy());dlg.close()}
    if(e.target.closest("[data-play]")){played=0;Object.values(pl).forEach(p=>p.stop(true));pl.A.play(0);pl.B.play(0)}
    if(e.target.closest("[data-stop]"))Object.values(pl).forEach(p=>p.pause());
    if(e.target.closest("[data-save]")){const t=$("#cmp-txt",dlg).value.trim();if(!t)return CH.toast("Escreva o que você percebeu para guardar.");
      CH.store.addNote({kind:"comparacao",exId:this.exId,text:`${A.l} × ${B.l}: ${t}`});CH.toast("Comparação guardada no Caderno.");$("#cmp-txt",dlg).value=""}
  });
  dlg.addEventListener("close",()=>{Object.values(pl).forEach(p=>p.destroy());dlg.remove()});
  dlg.showModal();
};

/* fotograma (gamificação sem pontos): 0 vazio · 1 experimentou · 2 descobriu · 3 aprofundou */
CH.frameSVG=function(cor,lv){
  lv=lv===true?2:(lv||0);
  const fill=lv>=2?cor:"#fff";
  const body=lv>=2?`<path d="M1 34 22 18l14 10 10-8 17 14v13H1z" fill="#0b0b0b" opacity=".2"/><circle cx="46" cy="13" r="5" fill="#fff" opacity=".9"/>`
    :lv===1?`<rect x="1" y="30" width="62" height="17" rx="0" fill="${cor}" opacity=".45"/><path d="M20 30l10-12 8 8 6-5 8 9" fill="none" stroke="#0b0b0b" stroke-width="2"/>`
    :`<path d="M20 34l10-12 8 8 6-5 8 9" fill="none" stroke="#cfcfc9" stroke-width="2"/>`;
  const badge=lv===3?`<circle cx="54" cy="38" r="8" fill="#0b0b0b"/><path d="m50 38 3 3 6-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`:"";
  return `<svg viewBox="0 0 64 48" class="fr lv${lv}" aria-hidden="true"><rect x="1" y="1" width="62" height="46" rx="4" fill="${fill}" stroke="#0b0b0b" stroke-width="2"/>${body}${badge}</svg>`;
};

/* ============ primeira experiência: a própria atividade ensina o laboratório ============ */
P.coachStep=function(){
  if(this.free||CH.store.flag("tutorialDone"))return -1;
  const a=CH.store.act(this.exId),disc=Object.values(CH.store.discoveries()).some(d=>d.exId===this.exId);
  if(disc)return 4;if(this.watched)return 3;if(this.seq.length)return 2;if(a.viewed)return 1;return 0;
};
const COACH=[
  ["Toque em <b>Ver</b> num plano para assistir a ele inteiro.","Planos"],
  ["Agora toque em <b>Adicionar</b> para colocá-lo na timeline. Depois adicione outro.","Planos"],
  ["Toque em <b>Assistir</b> e observe a sua montagem.","Monitor"],
  ["Leia a descoberta. É o que a sua montagem acabou de mostrar.","Leitura"],
  ["Pronto: você já sabe usar o laboratório. Guarde a versão ou siga em frente.","Pronto"]];
P.renderCoach=function(){
  const box=this.$("#coach");if(!box)return;
  const k=this.coachStep();
  if(k<0){box.hidden=true;return}
  if(k===4&&!this._coachDone){this._coachDone=true;setTimeout(()=>{CH.store.flag("tutorialDone",true);this.renderCoach()},6000)}
  box.hidden=false;
  box.innerHTML=`<span class="coach-n mono">${Math.min(k+1,4)}/4</span><p>${COACH[k][0]}</p>${k<4?`<button class="btn ghost sm" type="button" data-coach-skip>Pular guia</button>`:""}`;
};
P.updateTabs=function(){
  const a=CH.store.act(this.exId),on=this.free||this.watched||a.watchedOnce||a.versions.length>0;
  const t=this.$("#t-versoes");if(t)t.hidden=!on;
  this.updateToolsVis&&this.updateToolsVis();
};
})();
