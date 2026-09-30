/* player.js — reprodução REAL de uma montagem.
   Dois <video> alternados (A/B): enquanto um toca, o seguinte já está posicionado no ponto de entrada.
   O relógio da montagem segue o currentTime real do vídeo (se o arquivo demora, o tempo espera).
   Takes sem arquivo de vídeo (DL_022) são mostrados como quadro parado com aviso — nunca fingindo ser vídeo. */
(function(){
"use strict";
const CH=window.CH;

class SeqPlayer{
  /* stage: elemento .monitor contendo .mv-a, .mv-b, .mv-poster, .mv-note */
  constructor(stage,opts={}){
    this.stage=stage;this.o=opts;
    this.v=[stage.querySelector(".mv-a"),stage.querySelector(".mv-b")];
    this.poster=stage.querySelector(".mv-poster");
    this.note=stage.querySelector(".mv-note");
    this.v.forEach(v=>{v.muted=true;v.defaultMuted=true;v.playsInline=true;v.setAttribute("muted","");v.setAttribute("playsinline","");v.preload="auto";v.controls=false;v.disablePictureInPicture=true});
    this.front=0;this.segs=[];this.T=0;this.t=0;this.playing=false;this.raf=0;this.tok=0;this.idx=0;this.still=null;this.lastAdv=0;
  }
  /* ---- montagem ---- */
  setSeq(seq){
    this.stop(true);
    let x=0;
    this.segs=seq.map(s=>{const tk=CH.TK[s.id],d=tk.d*(s.b-s.a),g={id:s.id,start:x,dur:d,srcIn:tk.d*s.a,srcOut:tk.d*s.b,url:CH.vsrc(tk),th:tk.th,tk};x+=d;return g});
    this.T=x;this.t=0;this.idx=0;
    this.v.forEach(v=>{v.dataset.u="";v.classList.remove("on")});
    this.paintFrame(0);
  }
  get total(){return this.T}
  segAt(t){
    const S=this.segs;if(!S.length)return -1;
    for(let i=0;i<S.length;i++){if(t<S[i].start+S[i].dur-1e-6)return i}
    return S.length-1;
  }
  /* ---- carregamento ---- */
  _ready(v){return new Promise(res=>{if(v.readyState>=1)return res();const f=()=>{v.removeEventListener("loadedmetadata",f);v.removeEventListener("error",f);res()};v.addEventListener("loadedmetadata",f);v.addEventListener("error",f)})}
  async _load(v,seg,at){
    if(!seg.url){v.dataset.u="";return false}
    if(v.dataset.u!==seg.url){v.dataset.u=seg.url;v.src=seg.url;v.load()}
    await this._ready(v);
    if(v.error)return false;
    try{v.currentTime=Math.min(Math.max(0,at),Math.max(0,(v.duration||seg.tk.d)-0.04))}catch(e){}
    return true;
  }
  _seeked(v){return new Promise(res=>{if(!v.seeking&&v.readyState>=2)return res();const f=()=>{v.removeEventListener("seeked",f);v.removeEventListener("loadeddata",f);res()};v.addEventListener("seeked",f);v.addEventListener("loadeddata",f);setTimeout(res,1500)})}
  _show(i){this.v.forEach((v,k)=>v.classList.toggle("on",k===i))}
  _setNote(seg,ok){
    if(this.note){this.note.hidden=!!ok||!seg;if(!ok&&seg)this.note.textContent=(CH.webm||CH.vsrc(seg.tk))?"Este plano não tem arquivo de vídeo — mostramos só um quadro.":"Este navegador não reproduz o formato de vídeo do laboratório (WebM). Atualize o sistema ou abra no Chrome/Firefox."}
    if(this.poster){this.poster.style.backgroundImage=seg?`url(${seg.th})`:"";this.poster.classList.toggle("on",!ok)}
  }
  /* mostra o quadro REAL do vídeo no instante t (parado) */
  async paintFrame(t){
    const tok=++this.tok;this.t=t;
    if(!this.segs.length){this.v.forEach(v=>v.classList.remove("on"));this._setNote(null,true);if(this.poster){this.poster.style.backgroundImage="";this.poster.classList.remove("on")}this._tick();return}
    const i=this.segAt(t),seg=this.segs[i];this.idx=i;
    const at=seg.srcIn+Math.max(0,Math.min(seg.dur,t-seg.start));
    if(this.poster){this.poster.style.backgroundImage=`url(${seg.th})`;this.poster.classList.add("on")}
    const v=this.v[this.front];this.v[1-this.front].pause();
    const ok=await this._load(v,seg,at);
    if(tok!==this.tok)return;
    if(ok){await this._seeked(v);if(tok!==this.tok)return;this._show(this.front);if(this.poster)this.poster.classList.remove("on")}
    else this.v.forEach(x=>x.classList.remove("on"));
    this._setNote(seg,ok);
    this._tick();
  }
  seek(t){this.stopLoop();this.playing=false;this.paintFrame(Math.max(0,Math.min(this.T,t)))}
  /* ---- reprodução ---- */
  async play(from){
    if(!this.segs.length)return;
    if(from==null)from=(this.t>=this.T-0.05)?0:this.t;
    this.stopLoop();const tok=++this.tok;this.playing=true;this.t=from;
    this.o.onState&&this.o.onState("loading");
    const i=this.segAt(from),seg=this.segs[i];this.idx=i;
    const at=seg.srcIn+Math.max(0,from-seg.start);
    const v=this.v[this.front];this.v[1-this.front].pause();
    const ok=await this._load(v,seg,at);
    if(tok!==this.tok)return;
    if(ok){await this._seeked(v);if(tok!==this.tok)return;this._show(this.front);if(this.poster)this.poster.classList.remove("on");try{await v.play()}catch(e){}}
    else{this.v.forEach(x=>x.classList.remove("on"))}
    this._setNote(seg,ok);
    this.still=ok?null:{t0:performance.now(),from:from-seg.start};
    this._prefetch(i+1);
    this.lastAdv=performance.now();this.lastV=-1;
    this.o.onState&&this.o.onState("playing");
    const loop=()=>{
      if(tok!==this.tok||!this.playing)return;
      const seg=this.segs[this.idx],v=this.v[this.front];
      let local;
      if(this.still){local=this.still.from+(performance.now()-this.still.t0)/1000}
      else{
        local=v.currentTime-seg.srcIn;
        if(v.currentTime!==this.lastV){this.lastV=v.currentTime;this.lastMove=performance.now()}
        /* fim do trecho, fim do arquivo, ou travado >2,5 s => avança (não trava a montagem) */
        if(v.ended)local=seg.dur;
        if(performance.now()-(this.lastMove||performance.now())>2500)local=seg.dur;
      }
      if(local>=seg.dur-0.02){
        if(this.idx>=this.segs.length-1){this.t=this.T;this._tick();this._finish();return}
        this._advance();
      }else{this.t=seg.start+Math.max(0,local);}
      this._tick();
      this.raf=requestAnimationFrame(loop);
    };
    this.raf=requestAnimationFrame(loop);
  }
  async _prefetch(i){
    const seg=this.segs[i];if(!seg)return;
    const b=this.v[1-this.front];
    if(!seg.url)return;
    await this._load(b,seg,seg.srcIn);
  }
  _advance(){
    const i=this.idx+1,seg=this.segs[i],b=this.v[1-this.front],cur=this.v[this.front];
    this.idx=i;
    if(seg.url&&b.dataset.u===seg.url){
      this.front=1-this.front;
      b.muted=true;b.play().catch(()=>{});
      this._show(this.front);cur.pause();
      if(this.poster)this.poster.classList.remove("on");
      this._setNote(seg,true);this.still=null;
    }else if(seg.url){
      /* não deu tempo de pré-carregar: carrega agora (o relógio espera o vídeo) */
      this.front=1-this.front;const v=this.v[this.front];cur.pause();
      this._load(v,seg,seg.srcIn).then(()=>{if(this.idx===i&&this.playing){this._show(this.front);v.play().catch(()=>{});this._setNote(seg,true)}});
      this.still=null;
    }else{
      cur.pause();this.v.forEach(x=>x.classList.remove("on"));this._setNote(seg,false);this.still={t0:performance.now(),from:0};
    }
    this.lastMove=performance.now();this.lastV=-1;
    this.o.onCut&&this.o.onCut(i);
    this._prefetch(i+1);
  }
  _finish(){
    this.playing=false;this.stopLoop();this.v.forEach(v=>v.pause());
    this.o.onState&&this.o.onState("ended");this.o.onEnd&&this.o.onEnd();
  }
  _tick(){this.o.onTime&&this.o.onTime(this.t,this.idx)}
  stopLoop(){cancelAnimationFrame(this.raf);this.raf=0}
  pause(){if(!this.playing)return;this.playing=false;this.stopLoop();this.v.forEach(v=>v.pause());this.tok++;this.o.onState&&this.o.onState("paused")}
  stop(quiet){this.playing=false;this.stopLoop();this.tok++;this.v.forEach(v=>v.pause());if(!quiet)this.o.onState&&this.o.onState("paused")}
  destroy(){this.stop(true);this.v.forEach(v=>{v.removeAttribute("src");v.load()})}
}
CH.SeqPlayer=SeqPlayer;

/* HTML do monitor (2 vídeos reais + poster de carregamento) */
CH.monitorHTML=(ar)=>`<div class="monitor" style="--ar:${CH.ratioCss(ar)};--arn:${ar==="4:3"?1.3333:1.7778}"><video class="mv-a" muted playsinline aria-hidden="true"></video><video class="mv-b" muted playsinline aria-hidden="true"></video><div class="mv-poster"></div><p class="mv-note" hidden></p><div class="mv-empty"><span class="mv-strip"><i></i><i class="on"></i><i></i><i></i><i></i></span><span>Adicione planos e assista</span></div><span class="mv-tc mono">00:00.0 / 00:00.0</span></div>`;
})();
