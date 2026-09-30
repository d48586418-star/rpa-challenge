/* views-me.js — Caderno de Montagem, Meu espaço (perfil), Créditos */
(function(){
"use strict";
const CH=window.CH,{h,$,$$,esc,icon}=CH;
CH.views=CH.views||{};

const KIND={reflexao:["Reflexão","pencil"],descoberta:["Descoberta","spark"],comparacao:["Comparação","compare"],nota:["Nota","book"]};

/* nomes possíveis de descoberta (sem revelar os que ainda não foram achados) */
function allNames(){
  const s=new Set();Object.values(CH.data.leituras.atividades).forEach(l=>l.forEach(r=>{if(r.nome)s.add(r.nome)}));return[...s];
}

/* ---------------- Caderno ---------------- */
CH.views.notebook=function(root){
  let filter="tudo";
  root.innerHTML=`
<div class="page nb">
  <header class="page-head"><span class="eyebrow">Caderno de montagem</span><h1 class="h2" id="page-title" tabindex="-1">O que você pensou</h1>
  <p class="lead">Suas reflexões, descobertas e versões ficam aqui. É pessoal: só existe neste aparelho.</p></header>
  <form class="nb-new card-flat" id="nb-new"><label class="fld-l" for="nb-txt">Nova anotação</label>
    <textarea id="nb-txt" rows="3" maxlength="800" placeholder="O que você percebeu, tentou ou quer tentar?"></textarea>
    <div class="nb-new-row"><label class="sr" for="nb-ex">Atividade relacionada</label><select id="nb-ex"><option value="">Sem atividade</option>${CH.data.activities.map(a=>`<option value="${a.id}">${esc(a.t)}</option>`).join("")}</select><button class="btn sm pri" type="submit">${icon("plus")}Guardar anotação</button></div></form>
  <div class="seg nb-f" role="group" aria-label="Filtrar o caderno">${[["tudo","Tudo"],["reflexao","Reflexões"],["descoberta","Descobertas"],["comparacao","Comparações"],["nota","Notas"],["versoes","Versões"]].map(([k,l])=>`<button type="button" data-f="${k}" aria-pressed="${k===filter}">${l}</button>`).join("")}</div>
  <div id="nb-list"></div>
</div>`;
  const list=$("#nb-list",root);
  function render(){
    $$(".nb-f [data-f]",root).forEach(b=>b.setAttribute("aria-pressed",b.dataset.f===filter));
    let html="";
    if(filter==="tudo"||filter==="versoes"){
      const vers=[];CH.data.activities.forEach(a=>{(CH.store.state.act[a.id]||{versions:[]}).versions.forEach(v=>vers.push({a,v}))});
      vers.sort((x,y)=>y.v.at-x.v.at);
      if(filter==="versoes"||vers.length&&filter==="tudo"){
        if(filter==="versoes"&&!vers.length)html+=`<p class="empty">Nenhuma versão guardada ainda. Monte, assista e guarde no <a class="link" href="#/percurso">Laboratório</a>.</p>`;
        html+=vers.length?`<h2 class="h3 nb-h">Versões</h2><ul class="nb-vers">${vers.slice(0,filter==="tudo"?6:999).map(({a,v})=>`<li class="nbv"><div class="mstrip">${v.seq.map(s=>{const t=CH.TK[s.id];return `<i data-film="${t.f}" style="flex:${(CH.dur(s)/Math.max(.1,CH.total(v.seq))).toFixed(3)};--fc:var(--f-${t.f});background-image:url(${t.th})"></i>`}).join("")}</div><div class="nbv-tx"><b>${esc(a.t)} · Versão ${v.n}</b><span class="mono muted">${CH.fmt(v.dur)} · ${CH.date(v.at)}</span>${v.reflection?`<p>${esc(v.reflection)}</p>`:""}</div><a class="btn sm ghost" href="#/${a.id===CH.LIVRE?"livre":"lab/"+a.id}">Abrir</a></li>`).join("")}</ul>`:"";
      }
    }
    if(filter!=="versoes"){
      const notes=CH.store.notes().filter(n=>filter==="tudo"||n.kind===filter);
      html+=`<h2 class="h3 nb-h">${filter==="tudo"?"Anotações":"Anotações"}</h2>`;
      html+=notes.length?`<ul class="nb-notes">${notes.map(n=>{const k=KIND[n.kind]||KIND.nota,a=n.exId&&CH.ACT[n.exId];
        return `<li class="nn" data-id="${n.id}"><div class="nn-top"><span class="tag ${n.kind==="descoberta"?"y":"g"}">${icon(k[1],"tiny")}${k[0]}</span>${a?`<a class="nn-a" href="#/${a.id===CH.LIVRE?"livre":"lab/"+a.id}">${esc(a.t)}${n.vn?" · v"+n.vn:""}</a>`:""}<span class="mono muted">${CH.date(n.at)}</span></div>
        <p class="nn-t">${esc(n.text)}</p><div class="wrap"><button class="btn sm ghost" type="button" data-edit>${icon("pencil")}Editar</button><button class="btn sm ghost" type="button" data-del aria-label="Excluir anotação">${icon("trash")}</button></div></li>`}).join("")}</ul>`
        :`<p class="empty">${filter==="tudo"?"Ainda não há anotações. Reflexões e descobertas do laboratório aparecem aqui sozinhas.":"Nada nesta categoria ainda."}</p>`;
    }
    list.innerHTML=html;
  }
  render();
  root.addEventListener("click",e=>{
    const f=e.target.closest("[data-f]");if(f){filter=f.dataset.f;render();return}
    const li=e.target.closest(".nn");if(!li)return;const id=li.dataset.id;
    if(e.target.closest("[data-del]")){if(confirm("Excluir esta anotação?")){CH.store.delNote(id);render()}}
    if(e.target.closest("[data-edit]")){
      const n=CH.store.notes().find(x=>x.id===id),p=$(".nn-t",li);
      const ta=h("textarea",{rows:4,maxlength:800,"aria-label":"Editar anotação"});ta.value=n.text;
      const ok=h("button.btn.sm.pri",{type:"button",html:icon("check")+"Salvar",onclick:()=>{const v=ta.value.trim();if(!v)return CH.toast("A anotação não pode ficar vazia.");CH.store.editNote(id,v);render()}});
      p.replaceWith(ta);e.target.closest("[data-edit]").replaceWith(ok);ta.focus();
    }
  });
  $("#nb-new",root).addEventListener("submit",e=>{
    e.preventDefault();const t=$("#nb-txt",root).value.trim();if(!t)return CH.toast("Escreva algo para guardar.");
    CH.store.addNote({kind:"nota",exId:$("#nb-ex",root).value||null,text:t});$("#nb-txt",root).value="";CH.toast("Anotação guardada.");render();
  });
  return{title:"Caderno"};
};

/* ---------------- Meu espaço ---------------- */
CH.views.me=function(root){
  const all=[];CH.data.atos.atos.forEach(a=>CH.atividadesDoAto(a).forEach(i=>all.push(i)));
  const prog=Object.fromEntries(all.map(i=>[i,CH.progress(i)]));
  const done=all.filter(i=>CH.stage(i)>=2).length;
  const disc=CH.store.discoveries(),names=allNames(),found=Object.keys(disc);
  const st=CH.store.state,pf=st.prefs;
  const nVer=Object.values(st.act).reduce((a,x)=>a+x.versions.length,0);
  root.innerHTML=`
<div class="page me">
  <header class="page-head"><span class="eyebrow">Meu espaço</span><h1 class="h2" id="page-title" tabindex="-1">${CH.store.name()?esc(CH.store.name()):"Você"}</h1>
  <p class="lead">Tudo aqui fica só neste aparelho. Sem conta, sem envio de dados.</p></header>
  ${CH.store.volatile?`<p class="warn" role="alert">Seu navegador não deixa salvar dados. O progresso será perdido ao fechar a página.</p>`:""}

  <section class="me-blk" aria-labelledby="me-n">
    <h2 class="h3" id="me-n">Seu nome</h2>
    <form class="me-name" id="me-name"><label class="sr" for="nm">Como você quer ser chamado?</label><input id="nm" type="text" maxlength="40" autocomplete="nickname" placeholder="Como você quer ser chamado?" value="${esc(CH.store.name())}"><button class="btn sm pri" type="submit">Salvar</button></form>
  </section>

  <section class="me-blk" aria-labelledby="me-p">
    <h2 class="h3" id="me-p">Seu percurso</h2>
    <div class="me-nums"><div><b class="display">${done}</b><span>de ${all.length} atividades com descoberta</span></div><div><b class="display">${nVer}</b><span>versões guardadas</span></div><div><b class="display">${st.notes.length}</b><span>anotações</span></div></div>
    <ol class="contact-strip small">${all.map(id=>{const a=CH.atoDe(id),lv=CH.stage(id);return `<li class="cs lv${lv}"><a href="#/lab/${id}" aria-label="${esc(CH.ACT[id].t)}: ${CH.STAGE_LABEL[lv]}">${CH.frameSVG(a?a.cor:"#d8000f",lv)}</a></li>`}).join("")}</ol>
    <a class="btn sm" href="#/percurso">Abrir percurso${icon("next")}</a>
  </section>
  <section class="me-blk">${CH.jornadaHTML(true)}<a class="btn sm" href="#/conceitos">${icon("key")}Biblioteca de descobertas</a></section>

  <section class="me-blk" aria-labelledby="me-d">
    <h2 class="h3" id="me-d">Descobertas <span class="mono muted">${found.length} de ${names.length}</span></h2>
    <p class="muted">Uma técnica só ganha nome depois de você experimentá-la. Cada nome revelado vira um negativo aqui.</p>
    <ul class="neg">${found.map(n=>`<li class="neg-f on"><span class="mono">${esc(disc[n].exId?(CH.ACT[disc[n].exId]||{}).t||"":"")}</span><b class="display">${esc(n)}</b></li>`).join("")}${Array.from({length:Math.max(0,names.length-found.length)},()=>`<li class="neg-f"><span class="mono">a descobrir</span><b class="display" aria-hidden="true">?</b></li>`).join("")}</ul>
  </section>

  <section class="me-blk" aria-labelledby="me-a">
    <h2 class="h3" id="me-a">Acessibilidade</h2>
    <div class="me-prefs">
      <div class="pref"><label for="pf-m"><b>Movimento</b><span>Automático segue o seu aparelho. “Reduzido” desliga animações e a rolagem encenada.</span></label><select id="pf-m"><option value="auto" ${pf.motion==="auto"?"selected":""}>Automático</option><option value="off" ${pf.motion==="off"?"selected":""}>Reduzido</option><option value="on" ${pf.motion==="on"?"selected":""}>Completo</option></select></div>
      <div class="pref"><label for="pf-t"><b>Texto maior</b><span>Aumenta todos os textos em cerca de 18%.</span></label><input type="checkbox" id="pf-t" role="switch" ${pf.bigtext?"checked":""}></div>
      <div class="pref"><label for="pf-c"><b>Mais contraste</b><span>Escurece cinzas e contornos.</span></label><input type="checkbox" id="pf-c" role="switch" ${pf.contrast?"checked":""}></div>
    </div>
  </section>

  <section class="me-blk" aria-labelledby="me-x">
    <h2 class="h3" id="me-x">Seus dados</h2>
    <p class="muted">Ficam no armazenamento local deste navegador. Você pode levar uma cópia para outro aparelho.</p>
    <div class="wrap"><button class="btn sm" type="button" id="b-exp">${icon("download")}Baixar cópia (.json)</button><label class="btn sm" for="f-imp">${icon("plus")}Importar cópia</label><input type="file" id="f-imp" accept="application/json,.json" class="sr"><button class="btn sm ghost" type="button" id="b-rst">${icon("trash")}Apagar tudo</button></div>
  </section>
  <p><a class="link" href="#/creditos">Créditos e uso de inteligência artificial</a></p>
</div>`;
  $("#me-name",root).addEventListener("submit",e=>{e.preventDefault();CH.store.setName($("#nm",root).value);CH.who();CH.toast("Nome salvo.");$("#page-title",root).textContent=CH.store.name()||"Você"});
  $("#pf-m",root).onchange=e=>CH.store.setPref("motion",e.target.value);
  $("#pf-t",root).onchange=e=>CH.store.setPref("bigtext",e.target.checked);
  $("#pf-c",root).onchange=e=>CH.store.setPref("contrast",e.target.checked);
  $("#b-exp",root).onclick=()=>{const b=new Blob([CH.store.exportJSON()],{type:"application/json"}),a=h("a",{href:URL.createObjectURL(b),download:"cortando-historias-"+new Date().toISOString().slice(0,10)+".json"});document.body.append(a);a.click();a.remove()};
  $("#f-imp",root).onchange=async e=>{const f=e.target.files[0];if(!f)return;try{CH.store.importJSON(await f.text());CH.applyPrefs();CH.toast("Cópia importada.");location.reload()}catch(err){CH.toast("Esse arquivo não parece ser uma cópia do laboratório.")}};
  $("#b-rst",root).onclick=()=>{if(confirm("Apagar TUDO (nome, versões, anotações, descobertas)? Isso não pode ser desfeito.")){CH.store.reset();CH.applyPrefs();CH.toast("Tudo apagado.");location.hash="#/inicio";location.reload()}};
  return{title:"Meu espaço"};
};

/* ---------------- Créditos ---------------- */
CH.views.credits=function(root){
  const C=CH.data.creditos||{},F=CH.data.films;
  root.innerHTML=`
<div class="page cred">
  <a class="back" href="#/eu">${icon("back")}Meu espaço</a>
  <header class="page-head"><span class="eyebrow">Créditos</span><h1 class="h2" id="page-title" tabindex="-1">${esc(C.projeto||"Cortando Histórias — Laboratório de Montagem")}</h1></header>
  <dl class="cred-dl">
    ${(C.papeis||[]).map(p=>`<div><dt class="eyebrow">${esc(p.papel)}</dt><dd class="display">${esc(p.nome)}</dd></div>`).join("")}
    <div><dt class="eyebrow">Programa</dt><dd class="display">${esc(C.programa||"")}</dd></div>
    ${(C.instituicoes||[]).length?`<div><dt class="eyebrow">Instituições</dt><dd><ul>${C.instituicoes.map(i=>`<li><b class="display">${esc(i.nome)}</b></li>`).join("")}</ul></dd></div>`:""}
  </dl>
  <section class="cred-ia"><h2 class="h3">Uso de inteligência artificial</h2><p>${esc(C.ia||"")}</p><h3 class="h3 cred-h3">Imagens</h3><p>${esc(C.politica_imagens||"")}</p></section>
  <section class="cred-f"><h2 class="h3">Filmes dos planos</h2><p class="muted">${esc(C.filmes_nota||"")}</p>
    <ul>${Object.entries(F).map(([k,f])=>`<li><span class="tag" data-film="${k}" style="--fc:var(--f-${k})">${k}</span><b>${esc(f.t)}</b>${f.d?`<span class="muted"> — ${esc(f.d)}</span>`:""}</li>`).join("")}</ul></section>
  <section class="cred-f"><h2 class="h3">Fontes</h2><p class="muted">Archivo, Inter e JetBrains Mono — todas sob licença SIL Open Font License 1.1, distribuídas junto com o projeto em <span class="mono">fonts/</span>.</p></section>
</div>`;
  return{title:"Créditos"};
};
})();

/* ---------------- Jornada do Editor: linha de montagem, não nível ---------------- */
CH.jornadaHTML=function(compact){
  const J=CH.data.jornada.estacoes;
  const items=J.map((e,i)=>{
    const st=e.atividades.map(id=>CH.stage(id)),lit=st.some(x=>x>=2),seen=st.some(x=>x>=1);
    return `<li class="jn ${lit?"lit":seen?"seen":""}"><span class="jn-n mono">${String(i+1).padStart(2,"0")}</span><b>${CH.esc(e.titulo)}</b>${compact?"":`<span class="jn-f">${CH.esc(e.frase)}</span>`}<span class="sr">${lit?", descoberto":seen?", experimentado":", ainda não"}</span></li>`}).join("");
  const n=J.filter(e=>e.atividades.some(id=>CH.stage(id)>=2)).length;
  return `<section class="jornada" aria-labelledby="jn-h"><div class="jn-top"><h2 class="h3" id="jn-h">Sua jornada do editor</h2><span class="mono">${n} de ${J.length} estações</span></div>
    <p class="muted jn-lead">Você está aprendendo a olhar como editor. Cada estação acende quando você descobre algo nela.</p>
    <ol class="jn-line" tabindex="0" aria-label="Estações da jornada do editor">${items}</ol><div class="sprockets" aria-hidden="true"></div></section>`;
};

/* ---------------- Biblioteca de descobertas ---------------- */
CH.views.concepts=function(root){
  const F=CH.data.fundamentos.itens;
  const byName={};
  Object.entries(CH.data.leituras.atividades).forEach(([ex,l])=>l.forEach(r=>{if(r.nome){(byName[r.nome]=byName[r.nome]||{ex:[],por:null});if(!byName[r.nome].ex.includes(ex))byName[r.nome].ex.push(ex);if(!byName[r.nome].por&&r.situacao==="proposta")byName[r.nome].por=r.por_que||r.o_que}}));
  const disc=CH.store.discoveries(),names=Object.keys(byName);
  const cap=n=>n.charAt(0).toUpperCase()+n.slice(1);
  root.innerHTML=`
<div class="page conc">
  <header class="page-head"><span class="eyebrow">Biblioteca de descobertas</span><h1 class="h2" id="page-title" tabindex="-1">O que você já sabe ver</h1>
  <p class="lead">Ideias de montagem, cada uma com exemplo em vídeo. Os conceitos de técnica só aparecem aqui depois de você experimentá-los.</p></header>

  <section aria-labelledby="c-f"><h2 class="h3" id="c-f">Fundamentos</h2>
  <ul class="fund">${F.map((f,i)=>`<li class="fd" id="f-${f.id}"><div class="fd-v">${f.veja.length?`<div class="fd-strip duo">${f.veja.map(id=>CH.TK[id]?`<img src="${CH.TK[id].th}" alt="" width="120" height="90" loading="lazy">`:"").join("")}</div>`:`<div class="fd-tl" aria-hidden="true"><i></i><i></i><i></i></div>`}</div>
    <div class="fd-t"><span class="eyebrow">${String(i+1).padStart(2,"0")}</span><h3 class="h3">${CH.esc(f.titulo)}</h3><p class="fd-i">${CH.esc(f.ideia)}</p>
    <details><summary>Entenda</summary><p>${CH.esc(f.entenda)}</p><p class="muted">${CH.esc(f.exemplo)}</p></details></div></li>`).join("")}</ul></section>

  <section aria-labelledby="c-t"><h2 class="h3" id="c-t">Técnicas descobertas <span class="mono muted">${names.filter(n=>disc[n]).length} de ${names.length}</span></h2>
  <ul class="tec">${names.map(n=>{
    const d=byName[n],on=!!disc[n],ex=d.ex[0],ref=CH.referenceSeq(ex),c=CH.carti("conceitos",n),ato=CH.atoDe(ex);
    if(!on)return `<li class="tc lock"><span class="eyebrow">A descobrir</span><b class="display" aria-hidden="true">?</b><span class="muted">Sai de: <a class="link" href="#/lab/${ex}">${CH.esc(CH.ACT[ex].t)}</a></span></li>`;
    return `<li class="tc on"><span class="eyebrow">Descoberta</span><h3 class="display">${CH.esc(cap(n))}</h3>
      <p>${CH.esc(d.por||"")}</p>
      ${ref?`<div class="tc-v"><div class="monitor tc-mon" data-ref="${ex}" style="--ar:${CH.ratioCss(CH.ratioOf(ex))};--arn:${CH.ratioOf(ex)==="4:3"?1.3333:1.7778}"><video class="mv-a" muted playsinline></video><video class="mv-b" muted playsinline></video><div class="mv-poster"></div><p class="mv-note" hidden></p></div><button class="btn sm" type="button" data-play="${ex}">${CH.icon("play")}Ver exemplo</button></div>`:""}
      <p class="tc-l">${CH.icon("pencil","tiny")}<b>Experimente:</b> ${d.ex.map(e=>`<a class="link" href="#/lab/${e}">${CH.esc(CH.ACT[e].t)}</a>`).join(", ")}</p>
      <p class="tc-l">${CH.icon("book","tiny")}<b>Na cartilha:</b> ${ato?"Ato "+ato.n:""}${c.pagina?" · p. "+c.pagina:""}${c.pdf?` · <a class="link" href="${CH.esc(c.pdf)}" target="_blank" rel="noopener">abrir</a>`:""}</p></li>`}).join("")}</ul></section>
</div>`;
  const pl={};
  root.addEventListener("click",e=>{
    const b=e.target.closest("[data-play]");if(!b)return;
    const ex=b.dataset.play,mon=root.querySelector(`.tc-mon[data-ref="${ex}"]`);
    if(!pl[ex]){pl[ex]=new CH.SeqPlayer(mon,{onEnd:()=>{b.lastChild.textContent="Ver de novo"}});pl[ex].setSeq(CH.referenceSeq(ex))}
    Object.entries(pl).forEach(([k,p])=>{if(k!==ex)p.pause()});
    pl[ex].playing?pl[ex].pause():pl[ex].play(0);
  });
  return{title:"Biblioteca de descobertas",destroy(){Object.values(pl).forEach(p=>p.destroy())}};
};
