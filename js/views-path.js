/* views-path.js — Meu percurso: 4 Atos, atividades, folha de contato (progresso sem pontos) */
(function(){
"use strict";
const CH=window.CH,{h,$,$$,esc,icon}=CH;
CH.views=CH.views||{};

const SIC=["circle","half","check","check"];

CH.views.path=function(root){
  const all=[];CH.data.atos.atos.forEach(a=>CH.atividadesDoAto(a).forEach(i=>all.push(i)));
  const prog=Object.fromEntries(all.map(i=>[i,{st:CH.stage(i),n:CH.store.act(i).versions.length}]));
  const done=all.filter(i=>prog[i].st>=2).length;
  const started=all.filter(i=>prog[i].st>=1).length;
  const last=CH.store.state.last,lastOk=last&&CH.ACT[last.exId]&&last.exId!==CH.LIVRE;
  const nxt=CH.nextActivity();
  const cont=lastOk?last.exId:nxt;

  root.innerHTML=`
<div class="page path">
  <header class="page-head">
    <span class="eyebrow">Percurso · 4 atos</span>
    <h1 class="h2" id="page-title" tabindex="-1">Minha jornada</h1>
    <p class="lead">Aqui ninguém compete. Você experimenta, descobre e, se quiser, aprofunda. Cada descoberta revela um fotograma da sua folha de contato.</p>
  </header>

  <section class="contact" aria-labelledby="ct-h">
    <div class="contact-top"><h2 class="h3" id="ct-h">Sua folha de contato</h2><span class="mono">${done} de ${all.length} descobertas · ${started} experimentadas</span></div>
    <ol class="contact-strip" aria-label="Fotogramas por atividade">
      ${all.map(id=>{const a=CH.atoDe(id),lv=prog[id].st;return `<li class="cs lv${lv}"><a href="#/lab/${id}" aria-label="${esc(CH.ACT[id].t)}: ${CH.STAGE_LABEL[lv]}">${CH.frameSVG(a?a.cor:"#d8000f",lv)}</a></li>`}).join("")}
    </ol>
    <div class="sprockets" aria-hidden="true"></div>
    <p class="cs-key" aria-hidden="true"><span>${CH.frameSVG("#888",0)}Não iniciada</span><span>${CH.frameSVG("#888",1)}Experimentou</span><span>${CH.frameSVG("#888",2)}Descobriu</span><span>${CH.frameSVG("#888",3)}Aprofundou</span></p>
    ${cont?`<a class="btn pri path-cont" href="#/lab/${cont}">${lastOk?"Continuar":"Começar"}: ${esc(CH.ACT[cont].t)}${icon("next")}</a>`:`<p class="muted">Você concluiu todas as atividades. Que tal voltar ao <a class="link" href="#/livre">Laboratório livre</a>?</p>`}
  </section>

  ${CH.jornadaHTML()}
  <div id="atos" class="atos">
  ${CH.data.atos.atos.map(a=>{
    const ids=CH.atividadesDoAto(a),dn=ids.filter(i=>prog[i].st>=2).length;
    return `<section class="ato" style="--ac:${a.cor}" aria-labelledby="ato-${a.n}">
      <header class="ato-h"><span class="ato-n display" aria-hidden="true">${a.n}</span>
        <div><span class="eyebrow">Ato ${a.n} · ${dn} de ${ids.length}</span><h2 class="h2" id="ato-${a.n}">${esc(a.titulo)}</h2><p class="ato-r">${esc(a.resumo)}</p></div></header>
      <ol class="acts">
        ${ids.map((id,k)=>{const ex=CH.ACT[id],pr=prog[id];
          return `<li class="act lv${pr.st}"><a href="#/lab/${id}"><span class="act-fr" aria-hidden="true">${CH.frameSVG(a.cor,pr.st)}</span>
            <span class="act-tx"><b>${esc(ex.t)}</b><span class="mono">${esc(CH.EXF[id].difficulty)}${pr.n?` · ${pr.n} ${pr.n===1?"versão":"versões"}`:""}</span></span>
            <span class="act-st">${CH.icon(SIC[pr.st],"tiny")}${CH.STAGE_LABEL[pr.st]}</span></a></li>`}).join("")}
      </ol>
      ${a.n===3?`<a class="contrast-link" href="#/contraste"><span class="eyebrow">Para sentir a diferença</span><b>Tirar um pedaço do meio: o que você percebeu?</b><span>Compare duas montagens lado a lado e diga com as suas palavras.</span><span class="go">Abrir ${icon("next")}</span></a>`:""}
      ${a.n===1?`<a class="contrast-link" href="#/conceitos"><span class="eyebrow">Antes ou durante</span><b>O que é edição?</b><span>Ideias curtas de montagem, cada uma com um exemplo em vídeo.</span><span class="go">Abrir biblioteca ${icon("next")}</span></a>`:""}
      ${a.livre?`<a class="contrast-link lv" href="#/livre"><span class="eyebrow">Fecha o percurso</span><b>Laboratório livre</b><span>Escolha planos de qualquer filme e monte o que quiser.</span><span class="go">Abrir ${icon("next")}</span></a>`:""}
      <p class="ato-carti">${icon("book")}<span>Na cartilha: <b>Ato ${a.n}</b>${CH.carti("atos",a.n).pagina?` · p. ${CH.carti("atos",a.n).pagina}`:""}.${CH.carti("atos",a.n).pdf?` <a class="link" href="${CH.esc(CH.carti("atos",a.n).pdf)}" target="_blank" rel="noopener">Voltar para a cartilha</a>`:""}</span></p>
    </section>`}).join("")}
  </div>
</div>`;
  if(sessionStorage.getItem("ch:scroll")==="lista"){sessionStorage.removeItem("ch:scroll");setTimeout(()=>{const t=document.getElementById("atos");t&&t.scrollIntoView({behavior:CH.reduced()?"auto":"smooth"})},60)}
  return{title:"Meu percurso"};
};
})();
