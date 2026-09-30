/* store.js — persistência LOCAL (localStorage). Sem conta, sem rede, sem coleta. */
(function(){
"use strict";
const CH=window.CH,KEY="ch:v1";
const fresh=()=>({v:1,profile:{name:"",created:Date.now()},prefs:{motion:"auto",bigtext:false,contrast:false},
  act:{},notes:[],disc:{},last:null,story:{seen:false},flags:{}});
let S,mem=false;
function load(){
  try{const r=localStorage.getItem(KEY);S=r?Object.assign(fresh(),JSON.parse(r)):fresh()}catch(e){S=fresh();mem=true}
  S.prefs=Object.assign(fresh().prefs,S.prefs||{});S.flags=S.flags||{};
}
function save(){if(mem)return;try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){mem=true}}
load();

const A=id=>S.act[id]||(S.act[id]={versions:[],reflection:"",answer:null,draft:null,done:false,doneAt:null,started:null,last:null});

CH.store={
  get state(){return S},
  get volatile(){return mem},
  save,
  reset(){S=fresh();save()},
  exportJSON(){return JSON.stringify(S,null,2)},
  importJSON(txt){const o=JSON.parse(txt);if(!o||o.v!==1)throw new Error("Arquivo não reconhecido");S=Object.assign(fresh(),o);save()},

  /* perfil / preferências */
  name(){return S.profile.name},
  setName(n){S.profile.name=(n||"").trim().slice(0,40);save()},
  prefs(){return S.prefs},
  setPref(k,v){S.prefs[k]=v;save();CH.applyPrefs()},

  /* atividade */
  act:A,
  has(id){return !!S.act[id]},
  touch(id){const a=A(id);if(!a.started)a.started=Date.now();a.last=Date.now();S.last={exId:id,at:Date.now()};save();return a},
  setDraft(id,d){A(id).draft=d;save()},
  addVersion(id,v){const a=A(id);v.id=CH.uid();v.at=Date.now();v.n=a.versions.length?Math.max(...a.versions.map(x=>x.n||0))+1:1;a.versions.push(v);a.last=Date.now();S.last={exId:id,at:Date.now()};save();return v},
  delVersion(id,vid){const a=A(id);a.versions=a.versions.filter(v=>v.id!==vid);a.done=false;save()},
  setReflection(id,t){A(id).reflection=t;save()},
  setAnswer(id,v){A(id).answer=v;save()},
  updateVersion(id,vid,patch){const v=A(id).versions.find(x=>x.id===vid);if(v){Object.assign(v,patch);save()}},
  flag(k,v){if(v===undefined)return !!S.flags[k];S.flags[k]=!!v;save()},
  markDone(id,yes){const a=A(id);if(yes&&!a.done){a.done=true;a.doneAt=Date.now()}else if(!yes){a.done=false}save()},

  /* caderno */
  notes(){return S.notes},
  addNote(n){n.id=CH.uid();n.at=Date.now();S.notes.unshift(n);save();return n},
  editNote(id,text){const n=S.notes.find(x=>x.id===id);if(n){n.text=text;n.edited=Date.now();save()}},
  delNote(id){S.notes=S.notes.filter(x=>x.id!==id);save()},

  /* descobertas (técnicas nomeadas DEPOIS de experimentar) */
  discover(nome,exId){if(!nome)return false;if(S.disc[nome])return false;S.disc[nome]={at:Date.now(),exId};save();return true},
  discoveries(){return S.disc},

  /* história (Abertura) */
  storySeen(){S.story.seen=true;save()}
};

/* Situação derivada — SEMPRE calculada pelo motor, nunca guardada à mão */
CH.progress=function(exId){
  const a=S.act[exId],ex=CH.EXF[exId];
  const out={exId,status:"nova",n:0,complete:false,reasons:[],refl:{required:false,ok:true},done:false};
  if(!a||!ex)return out;
  out.n=a.versions.length;
  if(!(a.versions.length||a.draft||a.started))return out;
  out.status="andamento";
  if(exId===CH.LIVRE){out.status=a.versions.length?"andamento":"andamento";return out}
  try{
    const vs=a.versions.map(v=>v.clips);
    const c=Engine.checkCompletion(ex,vs);
    out.complete=c.complete;out.reasons=c.reasons;out.counted=c.counted_indices;
    const r=Engine.reflectionStatus(ex,a.versions.map(v=>({reflection:v.reflection})),c,a.reflection);
    out.refl=r;
    if(c.complete&&r.ok){out.done=true;out.status="concluida"}
  }catch(e){console.warn("progress",exId,e)}
  return out;
};
CH.nextActivity=function(){
  /* primeira atividade (na ordem do Percurso) que ainda não foi concluída */
  for(const ato of CH.data.atos.atos)for(const id of CH.atividadesDoAto(ato)){if(CH.stage(id)<2)return id}
  return null};
CH.applyPrefs=function(){
  const p=S.prefs,r=document.documentElement;
  r.dataset.motion=p.motion==="auto"?"auto":p.motion;
  r.dataset.bigtext=p.bigtext?"1":"0";r.dataset.contrast=p.contrast?"1":"0";
};
CH.applyPrefs();
})();

/* Estágio de aprendizagem de uma atividade — NÃO é competição:
   0 não iniciada · 1 experimentou · 2 descobriu (nome revelado) · 3 aprofundou (contrato completo do motor) */
CH.stage=function(exId){
  const a=CH.store.state.act[exId];
  if(!a||!(a.versions.length||a.watchedOnce||a.draft||a.started))return 0;
  if(exId===CH.LIVRE)return a.versions.length?2:1;
  const disc=Object.values(CH.store.discoveries()).some(d=>d.exId===exId);
  if(CH.progress(exId).done)return 3;
  return disc?2:(a.watchedOnce||a.versions.length?1:0);
};
CH.STAGE_LABEL=["Não iniciada","Experimentou","Descobriu","Aprofundou"];
