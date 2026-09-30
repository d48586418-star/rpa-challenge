/* lab.js — o Laboratório (atividade + Laboratório Livre): monitor, timeline, ferramentas, rascunho.
   Preserva o modelo do v7: seq=[{id,a,b}] (fração do take), sel, cutAt, hist, regras canSplit/canTrim/noDup. */
(function(){
"use strict";
const CH=window.CH,{h,$,$$,esc,fmt,icon}=CH;
const MAXCLIPS=8,MINW=64,MIN_DUR=0.6;

class Lab{
  constructor(root,exId,opts={}){
    this.root=root;this.exId=exId;this.free=exId===CH.LIVRE;this.ex=CH.EXF[exId];this.act=CH.ACT[exId];
    this.ar=CH.ratioOf(exId);
    this.seq=[];this.sel=-1;this.cutAt=.5;this.hist=[];this.t=0;
    this.watched=false;this.tab=this.free?"planos":"planos";this.libTab=this.free?"all":"pool";this.film="ALL";
    this.read=null;this.fromVersion=null;this.dirty=false;this.nowIdx=-1;this.destroyed=false;
    CH.store.touch(exId);
    this.build();
    this.restore();
    this.bind();
    this.refresh();
  }

  /* ---------- regras herdadas do v7 ---------- */
  ops(){return this.ex.operations||{}}
  canSplit(id){const s=this.ops().split;return !!(s&&s.enabled&&(!s.takes||!s.takes.length||s.takes.includes(id)))}
  canTrim(id){const t=this.ops().trim;return !!(t&&t.enabled&&(t.takes||[]).includes(id))}
  noDup(){return (this.ex.version_constraints||{}).allow_duplicates===false}
  rp(){return this.ex.reflection_policy||{}}
  push(){this.hist.push(JSON.stringify({seq:this.seq,sel:this.sel}))}

  /* ---------- esqueleto ---------- */
  build(){
    const ato=CH.atoDe(this.exId),ex=this.ex,free=this.free,ped=CH.data.pedagogia[this.exId]||{};
    const back=free?`<a class="back" href="#/inicio">${icon("back")}Início</a>`:`<a class="back" href="#/percurso">${icon("back")}Percurso</a>`;
    this.root.innerHTML=`
<div class="lab" data-panel="planos" data-free="${free?1:0}">
  <header class="lab-head">
    ${back}
    <div class="lab-title">
      <span class="eyebrow">${free?"Sem meta · sem avaliação":ato?`Ato ${ato.n} · ${esc(ato.titulo)}`:""}</span>
      <h1 class="h2" id="page-title" tabindex="-1">${esc(this.act.t)}</h1>
      <div class="wrap" id="lab-chips"></div>
    </div>
  </header>

  ${free?"":`<ol class="stepper" id="stepper" tabindex="0" aria-label="Etapas da experimentação"></ol>`}

  <section class="mission" aria-labelledby="ms-h">
    <div class="ms-top"><span class="eyebrow" id="ms-h">${free?"Laboratório livre":"Seu desafio"}</span>${free?"":`<span class="tag ${this.rp().required?"y":"g"}" id="refl-tag">Reflexão ${this.rp().required?"obrigatória":"opcional"}</span>`}</div>
    <p class="ms-text">${esc(ex.student_mission)}</p>
    ${ped.ver&&!free?`<p class="ms-ver"><b>Antes de montar:</b> ${esc(ped.ver)}</p>`:""}
    ${free?"":`<p class="ms-carti">${icon("book")}<span>Na cartilha: volte ao Ato ${ato?ato.n:""} — <em>${ato?esc(ato.titulo):""}</em>.</span></p>`}
  </section>

  <div class="dock">
    <div class="dock-in">
      <div class="mon-wrap" style="--arn:${this.ar==="4:3"?1.3333:1.7778}">
        ${CH.monitorHTML(this.ar)}
        <div class="transport">
          <button class="btn ink sm" id="b-play" type="button"><span class="ic-slot">${icon("play")}</span><span id="b-play-t">Assistir</span></button>
          <button class="btn sm icon-only" id="b-start" type="button" aria-label="Voltar ao início">${icon("rewind")}</button>
          <span class="tc mono tnum" id="tc" aria-hidden="true">00:00.0 / 00:00.0</span>
          <span class="muted-note" title="Este laboratório reproduz sem som">${icon("mute")}<span>sem som</span></span>
        </div>
      </div>
      <p class="cr" id="cr" aria-live="polite">Adicione planos para ver a prévia.</p>
      <div class="tl" id="tl">
        <div class="tl-head"><span class="eyebrow">Timeline</span><span class="mono tnum" id="tl-dur">00:00.0</span></div>
        <div class="tl-body"><div class="tl-lanes" aria-hidden="true"><i class="r"></i><b class="lb">V1</b><b class="lb b">A1</b></div>
        <div class="tl-scroll" id="tl-scroll" tabindex="0" role="group" aria-label="Timeline. Use as setas para mover o ponto de leitura; Shift move de 1 em 1 segundo.">
          <div class="tl-inner" id="tl-inner"></div>
        </div></div>
        <p class="tl-legend"><span><i class="lg v"></i>V1 vídeo</span><span><i class="lg a"></i>A1 som (silenciado)</span><span id="tl-hint" class="tl-hint"></span></p>
      </div>
    </div>
  </div>
  <div class="tools" id="tools" role="toolbar" aria-label="Ferramentas de montagem">
        <button class="btn sm" id="b-left" type="button">${icon("left")}Mover</button>
        <button class="btn sm" id="b-right" type="button">Mover${icon("right")}</button>
        <button class="btn sm" id="b-cut" type="button">${icon("scissors")}<span id="b-cut-t">Cortar aqui</span></button>
        <button class="btn sm" id="b-rm" type="button">${icon("trash")}Remover</button>
        <button class="btn sm ghost" id="b-undo" type="button">${icon("undo")}Desfazer</button>
        <button class="btn sm ghost" id="b-clear" type="button">${icon("x")}Limpar</button>
      </div>

  <div class="ptabs" role="tablist" aria-label="Painéis do laboratório">
    <button role="tab" id="t-planos" aria-controls="p-planos" aria-selected="true" data-tab="planos">Planos</button>
    <button role="tab" id="t-leitura" aria-controls="p-leitura" aria-selected="false" data-tab="leitura">Leitura<i class="dot" hidden></i></button>
    <button role="tab" id="t-versoes" aria-controls="p-versoes" aria-selected="false" data-tab="versoes">Versões<b class="cnt" id="cnt-v">0</b></button>
  </div>
  <div class="panels">
    <section class="panel" id="p-planos" role="tabpanel" aria-labelledby="t-planos"></section>
    <section class="panel" id="p-leitura" role="tabpanel" aria-labelledby="t-leitura" hidden></section>
    <section class="panel" id="p-versoes" role="tabpanel" aria-labelledby="t-versoes" hidden></section>
  </div>
</div>`;
    this.el=this.root.firstElementChild;
    this.$=s=>$(s,this.el);
    this.player=new CH.SeqPlayer(this.$(".monitor"),{
      onTime:(t,i)=>this.onTime(t,i),onEnd:()=>this.onEnd(),onState:s=>this.onState(s),onCut:i=>{this.nowIdx=i;this.markNow()}});
    this.buildPlanos();this.buildLeitura();this.buildVersoes();
  }

  /* ---------- rascunho (retomar atividade) ---------- */
  restore(){
    const a=CH.store.act(this.exId);
    if(a.draft&&a.draft.seq&&a.draft.seq.length&&a.draft.seq.every(s=>CH.TK[s.id])){
      this.seq=a.draft.seq;this.sel=-1;this.watched=!!a.draft.watched;this.fromVersion=a.draft.from||null;
      this.resumed=true;
    }
    if(a.versions.length)this.tab="planos";
  }
  saveDraft(){
    clearTimeout(this._sd);
    this._sd=setTimeout(()=>{CH.store.setDraft(this.exId,this.seq.length?{seq:this.seq,watched:this.watched,from:this.fromVersion}:null)},250);
  }

  /* ---------- eventos ---------- */
  bind(){
    this.$("#b-play").onclick=()=>this.togglePlay();
    this.$("#b-start").onclick=()=>{this.player.stop();this.t=0;this.seekTo(0);this.setPlayBtn("stopped")};
    this.$("#b-left").onclick=()=>this.move(-1);
    this.$("#b-right").onclick=()=>this.move(1);
    this.$("#b-cut").onclick=()=>this.cut();
    this.$("#b-rm").onclick=()=>this.remove();
    this.$("#b-undo").onclick=()=>this.undo();
    this.$("#b-clear").onclick=()=>this.clear();
    $$("[data-tab]",this.el).forEach(b=>{b.onclick=()=>this.setTab(b.dataset.tab);b.onkeydown=e=>{
      const tabs=$$("[data-tab]",this.el).filter(x=>!x.hidden&&x.offsetParent!==null),i=tabs.indexOf(b);
      if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();const n=tabs[(i+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length];n.focus();this.setTab(n.dataset.tab)}}});
    this.bindTimeline();
    this._ro=new ResizeObserver(()=>{if(!this.destroyed&&this._lastW!==this.$("#tl-scroll").clientWidth)this.renderTL()});
    this._ro.observe(this.$("#tl-scroll"));
    this._key=e=>{
      if(e.target.closest("input,textarea,select,dialog"))return;
      if(e.key===" "&&e.target===document.body){e.preventDefault();this.togglePlay()}};
    document.addEventListener("keydown",this._key);
  }
  destroy(){document.documentElement.style.removeProperty("--dock-pad");this.destroyed=true;this.saveDraftNow();this.player.destroy();this._ro&&this._ro.disconnect();document.removeEventListener("keydown",this._key);this.closeOverlays&&this.closeOverlays()}
  saveDraftNow(){clearTimeout(this._sd);CH.store.setDraft(this.exId,this.seq.length?{seq:this.seq,watched:this.watched,from:this.fromVersion}:null)}

  dockPad(){
    const r=document.documentElement,on=this.tab==="planos"&&!matchMedia("(min-width:900px)").matches;
    const d=this.$(".dock");r.style.setProperty("--dock-pad",on&&d?d.offsetHeight+"px":"0px");
  }
  setTab(t){
    this.tab=t;this.el.dataset.panel=t;
    ["planos","leitura","versoes"].forEach(k=>{const on=k===t;const p=this.$("#p-"+k);p.hidden=!on&&!(k==="planos"&&this.wide());this.$("#t-"+k).setAttribute("aria-selected",on)});
    if(t==="leitura")this.$("#t-leitura .dot").hidden=true;
    this.applyWide();this.dockPad();
  }
  wide(){return matchMedia("(min-width:1100px)").matches}
  applyWide(){ /* ≥1100: biblioteca sempre visível na coluna lateral */
    const w=this.wide();this.$("#t-planos").hidden=w;
    if(w){this.$("#p-planos").hidden=false;if(this.tab==="planos"){this.tab="leitura";this.$("#t-leitura").setAttribute("aria-selected","true");this.$("#p-leitura").hidden=false;this.el.dataset.panel="leitura"}}
    else{this.$("#p-planos").hidden=this.tab!=="planos"}
  }

  /* ---------- reprodução ---------- */
  togglePlay(){
    if(!this.seq.length)return CH.toast("Adicione ao menos um plano para assistir.");
    const p=this.player;
    if(p.playing){p.pause();return}
    this.readClear();
    p.play(this.t>=p.total-.05?0:this.t);
  }
  onState(s){this.setPlayBtn(s);this.el.classList.toggle("is-playing",s==="playing")}
  setPlayBtn(s){
    const b=this.$("#b-play"),t=this.$("#b-play-t"),ic=this.$(".ic-slot",b);
    const m={playing:["pause","Pausar"],loading:["pause","Carregando…"],ended:["play","Assistir de novo"],paused:["play","Assistir"],stopped:["play","Assistir"]};
    const [i,l]=m[s]||m.paused;ic.innerHTML=icon(i);t.textContent=l;b.setAttribute("aria-pressed",s==="playing")
  }
  onTime(t,i){
    this.t=t;this.paintTime(t);
    if(this.nowIdx!==i){this.nowIdx=i;this.markNow()}
  }
  paintTime(t){
    const T=this.player.total;
    const s=fmt(t)+" / "+fmt(T);this.$("#tc").textContent=s;const tv=this.$(".mv-tc");if(tv)tv.textContent=s;
    this.placePlayhead(t);
  }
  onEnd(){
    this.watched=true;this.saveDraft();this.afterWatch();
  }
  markNow(){$$(".cp",this.el).forEach(c=>c.classList.toggle("now",+c.dataset.i===this.nowIdx&&this.player.playing))}
  seekTo(t){
    this.t=Math.max(0,Math.min(this.player.total,t));this.paintTime(this.t);this.player.seek(this.t);
    this.syncSel();
  }
  /* seleciona o clipe sob o playhead e calcula o ponto de corte */
  syncSel(){
    const i=this.player.segAt(this.t);if(i<0){this.sel=-1;return}
    const g=this.player.segs[i];this.sel=i;this.cutAt=Math.min(.95,Math.max(.05,(this.t-g.start)/g.dur));
    this.updateSelUI();
  }

  /* ---------- operações de montagem (mesma lógica do v7) ---------- */
  add(id,silent){
    if(this.seq.length>=MAXCLIPS)return CH.toast("Cada versão aceita até "+MAXCLIPS+" planos.");
    if(this.noDup()&&this.seq.some(s=>s.id===id))return CH.toast("Esta atividade não permite repetir o mesmo plano.");
    this.push();this.seq.push({id,a:0,b:1});this.changed();
    const last=this.seq.length-1;this.sel=last;this.cutAt=.5;
    this.player.setSeq(this.seq);
    this.t=this.player.segs[last].start;this.player.seek(this.t);
    this.afterChange(true);
    CH.store.act(this.exId).viewed=true;
    if(!silent)CH.say("Plano adicionado à timeline. Posição "+this.seq.length+".");
  }
  move(dir){
    const i=this.sel,j=i+dir;if(i<0||j<0||j>=this.seq.length)return;
    this.push();[this.seq[i],this.seq[j]]=[this.seq[j],this.seq[i]];this.sel=j;this.changed();this.reseq(true);
    CH.say("Plano movido para a posição "+(j+1));
  }
  remove(){
    if(this.sel<0)return;this.push();this.seq.splice(this.sel,1);this.sel=Math.min(this.sel,this.seq.length-1);this.changed();this.reseq(true);
  }
  clear(){if(!this.seq.length)return;this.push();this.seq=[];this.sel=-1;this.t=0;this.changed();this.reseq(true)}
  undo(){if(!this.hist.length)return;const o=JSON.parse(this.hist.pop());this.seq=o.seq;this.sel=o.sel;this.changed();this.reseq(true)}
  cut(){
    const s=this.seq[this.sel];if(!s)return CH.toast("Toque num plano da timeline para selecioná-lo.");
    if(CH.dur(s)<MIN_DUR)return CH.toast("Este trecho é curto demais para cortar.");
    const m=s.a+(s.b-s.a)*this.cutAt;
    if(this.canSplit(s.id)){this.push();this.seq.splice(this.sel,1,{id:s.id,a:s.a,b:m},{id:s.id,a:m,b:s.b});CH.say("Plano dividido em dois.")}
    else if(this.canTrim(s.id)){this.push();s.b=m;CH.say("Plano encurtado até o ponto marcado.")}
    else return CH.toast("Nesta atividade este plano não pode ser cortado.");
    this.changed();this.reseq(true);
  }
  trimTo(i,dur){ /* alça de Saída: nova duração do clipe i (segundos) */
    const s=this.seq[i],d=CH.TK[s.id].d;let nb=s.a+dur/d;nb=Math.max(s.a+.3/d,Math.min(nb,1));s.b=nb;
  }
  changed(){this.watched=false;this.dirty=true;this.fromVersionChanged=true;this.saveDraft();this.resetReadout&&this.resetReadout()}
  reseq(keepT){
    const t=this.t;this.player.setSeq(this.seq);
    this.t=Math.min(keepT?t:0,this.player.total);
    if(this.sel>=0&&this.seq[this.sel]){const g=this.player.segs[this.sel];this.t=Math.min(g.start+g.dur*this.cutAt,this.player.total)}
    this.player.seek(this.t);this.paintTime(this.t);this.afterChange();
  }
  afterChange(skipSeek){
    this.renderTL();this.updateButtons();this.renderStepper&&this.renderStepper();this.renderVersionsDraft&&this.renderVersionsDraft();this.renderReadout&&this.renderReadout();
    const n=this.seq.length;this.$(".monitor").classList.toggle("empty",!n);
    this.$("#cr").textContent=n?"":"Adicione planos para ver a prévia.";
    this.paintCredit();this.dockPad();
  }
  paintCredit(){
    if(!this.seq.length)return;const i=this.sel>=0?this.sel:0,s=this.seq[i],f=CH.data.films[CH.TK[s.id].f]||{};
    this.$("#cr").innerHTML=`Plano ${i+1} de ${this.seq.length} · cena de <i>${esc(f.t||"")}</i>${f.d?`, direção de ${esc(f.d)}`:""}`;
  }

  /* ---------- timeline ---------- */
  layout(){
    const W=this.$("#tl-scroll").clientWidth||320,T=Math.max(this.player.total,.1),pad=2;
    const n=this.seq.length;let pps=(W-pad)/T;
    let widths=this.seq.map(s=>Math.max(MINW,CH.dur(s)*pps));
    let sum=widths.reduce((a,b)=>a+b,0);
    if(sum<W-pad){const k=(W-pad)/sum;widths=widths.map(w=>w*k);sum=W-pad}
    let x=0;const pos=widths.map(w=>{const l=x;x+=w;return{l,w}});
    return{W,total:Math.max(sum,W),pos,pps};
  }
  tToX(t){
    const L=this.lay;if(!L||!L.pos.length)return 0;const i=this.player.segAt(t),g=this.player.segs[i],p=L.pos[i];
    return p.l+Math.max(0,Math.min(1,(t-g.start)/g.dur))*p.w;
  }
  xToT(x){
    const L=this.lay;if(!L||!L.pos.length)return 0;
    let i=L.pos.findIndex(p=>x<p.l+p.w);if(i<0)i=L.pos.length-1;const p=L.pos[i],g=this.player.segs[i];
    return g.start+Math.max(0,Math.min(1,(x-p.l)/p.w))*g.dur;
  }
  renderTL(){
    const box=this.$("#tl-inner");if(!box)return;
    this._lastW=this.$("#tl-scroll").clientWidth;
    if(!this.seq.length){
      box.style.width="100%";box.innerHTML=`<div class="tl-empty"><span class="strip"><i></i><i></i><i></i><i></i></span><p>A timeline começa vazia.<br>Escolha um plano em <b>Planos</b> para montar.</p></div>`;
      this.lay=null;this.$("#tl-dur").textContent="00:00.0";this.$("#tl-hint").textContent="";return;
    }
    const L=this.lay=this.layout();box.style.width=L.total+"px";
    const T=this.player.total;
    /* régua */
    const step=T>60?10:T>24?5:T>10?2:1;let rul="";
    const segs=this.player.segs;
    for(let s=0;s<=T+1e-6;s+=step){rul+=`<i class="tk" style="left:${this.tToX(Math.min(s,T-1e-6))}px"><b>${Math.round(s)}s</b></i>`}
    /* faixa de vídeo + áudio silenciado */
    let v="",a="";
    this.seq.forEach((s,i)=>{
      const tk=CH.TK[s.id],p=L.pos[i],d=CH.dur(s),f=tk.f;
      const trim=this.canTrim(s.id)&&i===this.sel,lab=CH.cardLabel(this.exId,s.id);
      v+=`<button type="button" class="cp${i===this.sel?" act":""}" data-i="${i}" data-film="${f}" style="left:${p.l}px;width:${p.w}px;--fc:var(--f-${f});background-image:url(${tk.th})" aria-label="Plano ${i+1}: ${esc(lab)}, ${d.toFixed(1)} segundos${i===this.sel?", selecionado":""}" aria-pressed="${i===this.sel}">
        <span class="cp-n">${i+1}</span><span class="cp-l">${esc(lab)}</span><span class="cp-d mono">${d.toFixed(1)}s</span></button>`;
      a+=`<div class="cp au" style="left:${p.l}px;width:${p.w}px" aria-hidden="true">${wave(s)}</div>`;
      if(i<this.seq.length-1)v+=`<i class="cutmark" style="left:${p.l+p.w}px" aria-hidden="true"></i>`;
    });
    let hdl="";
    if(this.sel>=0&&this.canTrim(this.seq[this.sel].id)){
      const p=L.pos[this.sel];
      hdl=`<button type="button" class="trim-h" role="slider" style="left:${p.l+p.w}px" aria-label="Saída do plano ${this.sel+1}" aria-valuemin="0.3" aria-valuemax="${CH.TK[this.seq[this.sel].id].d.toFixed(1)}" aria-valuenow="${CH.dur(this.seq[this.sel]).toFixed(1)}" aria-valuetext="${CH.dur(this.seq[this.sel]).toFixed(1)} segundos"><i></i><span class="mono">SAÍDA</span></button>`;
    }
    const cutL=this.sel>=0?`<i class="cutline-v" style="left:${L.pos[this.sel].l+L.pos[this.sel].w*this.cutAt}px"></i>`:"";
    box.innerHTML=`<div class="tl-ruler" aria-hidden="true">${rul}</div><div class="tl-row vid">${v}${hdl}</div><div class="tl-row aud">${a}</div>${cutL}<i class="tl-ph" id="tl-ph"><b></b></i>`;
    this.$("#tl-dur").textContent=fmt(T);
    this.$("#tl-hint").textContent=this.sel>=0?(this.canSplit(this.seq[this.sel].id)?"Arraste o ponto de leitura e use Cortar aqui":this.canTrim(this.seq[this.sel].id)?"Arraste a alça SAÍDA para aparar o final":""):"Toque num plano para selecionar";
    this.placePlayhead(this.t);
    this.nowIdx=-1;
  }
  placePlayhead(t){
    const ph=this.$("#tl-ph");if(!ph||!this.lay)return;
    const x=this.tToX(t);ph.style.transform=`translateX(${x}px)`;
    if(this.player.playing){const sc=this.$("#tl-scroll"),vis=sc.scrollLeft,W=sc.clientWidth;if(x>vis+W-24||x<vis)sc.scrollLeft=Math.max(0,x-W*.3)}
  }
  updateSelUI(){
    $$(".cp:not(.au)",this.el).forEach(c=>{const on=+c.dataset.i===this.sel;c.classList.toggle("act",on);c.setAttribute("aria-pressed",on)});
    const cl=this.$(".cutline-v");if(this.lay&&this.sel>=0){const p=this.lay.pos[this.sel];
      if(cl)cl.style.left=(p.l+p.w*this.cutAt)+"px";else this.renderTL()}
    this.updateButtons();this.paintCredit();
  }
  bindTimeline(){
    const sc=this.$("#tl-scroll");let drag=null,trim=null;
    const xOf=e=>{const r=this.$("#tl-inner").getBoundingClientRect();return e.clientX-r.left};
    sc.addEventListener("pointerdown",e=>{
      if(!this.seq.length)return;
      const th=e.target.closest(".trim-h");
      if(th){trim={i:this.sel,x0:e.clientX,d0:CH.dur(this.seq[this.sel]),pps:this.lay.pps,moved:false};sc.setPointerCapture(e.pointerId);e.preventDefault();this.player.pause();return}
      drag={x0:e.clientX,moved:false};sc.setPointerCapture(e.pointerId);
      this.player.pause();this.scrub(xOf(e));
    });
    sc.addEventListener("pointermove",e=>{
      if(trim){
        const dx=e.clientX-trim.x0;
        if(!trim.moved){if(Math.abs(dx)<3)return;trim.moved=true;this.push()}
        this.trimTo(trim.i,Math.max(.3,trim.d0+dx/trim.pps));
        this.watched=false;this.player.setSeq(this.seq);this.renderTL();
        const g=this.player.segs[trim.i];this.t=g.start+g.dur;this.t=Math.max(g.start,this.t-.05);this.paintTime(this.t);
        return}
      if(!drag)return;if(Math.abs(e.clientX-drag.x0)>4)drag.moved=true;
      this.scrub(xOf(e));
    });
    const up=e=>{
      if(trim){if(trim.moved){this.changed();this.reseq(true);CH.say("Plano encurtado para "+CH.dur(this.seq[trim.i]).toFixed(1)+" segundos")}trim=null;return}
      if(drag){this.syncSel();this.renderTL();this.updateButtons();drag=null}
    };
    sc.addEventListener("pointerup",up);sc.addEventListener("pointercancel",up);
    /* teclado: setas movem o ponto de leitura; trim-h tem setas próprias */
    sc.addEventListener("keydown",e=>{
      const th=e.target.closest(".trim-h");
      if(th&&(e.key==="ArrowLeft"||e.key==="ArrowRight")){e.preventDefault();const s=this.seq[this.sel];this.push();this.trimTo(this.sel,CH.dur(s)+(e.key==="ArrowRight"?.1:-.1)*(e.shiftKey?10:1));this.changed();this.reseq(true);const n=this.$(".trim-h");n&&n.focus();return}
      if(e.target.classList&&e.target.classList.contains("cp")&&(e.key==="Enter"||e.key===" ")){e.preventDefault();this.selectClip(+e.target.dataset.i);return}
      if(e.key==="ArrowLeft"||e.key==="ArrowRight"){
        if(!this.seq.length)return;e.preventDefault();this.player.pause();
        this.seekTo(this.t+(e.key==="ArrowRight"?1:-1)*(e.shiftKey?1:.1));this.renderTL();
      }
    });
  }
  scrub(x){
    const t=this.xToT(x);this.t=t;this.paintTime(t);
    if(this._scr)return;this._scr=requestAnimationFrame(()=>{this._scr=0;this.player.seek(this.t)});
    const i=this.player.segAt(t);if(i!==this.sel){this.sel=i;this.updateSelUI()}
    const g=this.player.segs[i];if(g)this.cutAt=Math.min(.95,Math.max(.05,(t-g.start)/g.dur));
  }
  selectClip(i){
    this.player.pause();const g=this.player.segs[i];if(!g)return;this.sel=i;this.cutAt=.5;this.t=g.start+g.dur*.5;this.player.seek(this.t);this.paintTime(this.t);this.renderTL();this.updateButtons();this.paintCredit();
  }

  updateButtons(){
    const n=this.seq.length,s=this.sel>=0?this.seq[this.sel]:null;
    this.$("#b-play").disabled=!n;this.$("#b-start").disabled=!n;
    this.$("#b-left").disabled=!s||this.sel<1;this.$("#b-right").disabled=!s||this.sel>=n-1;
    const can=s&&(this.canSplit(s.id)||this.canTrim(s.id));
    const bc=this.$("#b-cut");bc.disabled=!s||!can;
    this.$("#b-cut-t").textContent=s&&!this.canSplit(s.id)&&this.canTrim(s.id)?"Aparar até aqui":"Cortar aqui";
    bc.title=s&&!can?"Nesta atividade este plano não pode ser cortado.":"";
    this.$("#b-rm").disabled=!s;this.$("#b-undo").disabled=!this.hist.length;this.$("#b-clear").disabled=!n;
    const ops=this.ops();
    /* esconde ferramentas que a atividade não oferece */
    this.$("#b-cut").hidden=!(ops.trim&&ops.trim.enabled)&&!(ops.split&&ops.split.enabled);
    this.$("#b-left").hidden=this.$("#b-right").hidden=!ops.reorder;
    this.$("#b-rm").hidden=!ops.remove;
  }
  refresh(){
    this.player.setSeq(this.seq);this.t=0;
    this.afterChange();this.setTab(this.tab);this.renderChips&&this.renderChips();
    if(this.seq.length){this.sel=0;this.player.seek(0);this.updateSelUI()}
    this.applyWide();
    this._mq=matchMedia("(min-width:1100px)");this._mq.addEventListener&&this._mq.addEventListener("change",()=>this.applyWide());
    if(this.resumed)CH.toast("Retomamos de onde você parou.");
  }
}

/* forma de onda (faixa A1 silenciada) — dado `pk` do v7 */
function wave(s){
  const p=CH.TK[s.id].pk||[];if(!p.length)return"";
  let o='<svg preserveAspectRatio="none" viewBox="0 0 96 20">';
  for(let k=0;k<32;k++){const v=(p[Math.min(p.length-1,Math.floor((s.a+(s.b-s.a)*k/32)*p.length))]||6)/100,hh=2+16*v;o+=`<rect x="${k*3}" y="${10-hh/2}" width="1.6" height="${hh}" rx=".8"/>`}
  return o+"</svg>";
}
CH.Lab=Lab;CH.labWave=wave;
})();
