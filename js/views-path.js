/* views-path.js — Meu percurso: 4 Atos, atividades, folha de contato (progresso sem pontos) */
(function(){
"use strict";
const CH=window.CH,{h,$,$$,esc,icon}=CH;
CH.views=CH.views||{};

const STATUS={nova:["Não iniciada","○"],andamento:["Em andamento","◐"],concluida:["Concluída","✓"]};

CH.views.path=function(root){
  const all=[];CH.data.atos.atos.forEach(a=>CH.atividadesDoAto(a).forEach(i=>all.push(i)));
  const prog=Object.fromEntries(all.map(i=>[i,CH.progress(i)]));
  const done=all.filter(i=>prog[i].status==="concluida").length;
  const started=all.filter(i=>prog[i].status!=="nova").length;
  const last=CH.store.state.last,lastOk=last&&CH.ACT[last.exId]&&last.exId!==CH.LIVRE;
  const nxt=CH.nextActivity();
  const cont=lastOk?last.exId:nxt;

  root.innerHTML=`
<div class="page path">
  <header class="page-head">
    <span class="eyebrow">Meu percurso</span>
    <h1 class="h2" id="page-title" tabindex="-1">Quatro atos de experimentação</h1>
    <p class="lead">Aqui ninguém compete. Você avança, volta, refaz. Cada atividade concluída revela um fotograma da sua folha de contato.</p>
  </header>

  <section class="contact" aria-labelledby="ct-h">
    <div class="contact-top"><h2 class="h3" id="ct-h">Sua folha de contato</h2><span class="mono">${done} de ${all.length} reveladas · ${started} iniciadas</span></div>
    <ol class="contact-strip" aria-label="Fotogramas por atividade">
      ${all.map(id=>{const a=CH.atoDe(id),on=prog[id].status==="concluida";return `<li class="cs ${on?"on":""}" title="${esc(CH.ACT[id].t)} — ${STATUS[prog[id].status][0]}"><a href="#/lab/${id}" aria-label="${esc(CH.ACT[id].t)}: ${STATUS[prog[id].status][0]}">${CH.frameSVG(a?a.cor:"#f5c518",on)}</a></li>`}).join("")}
    </ol>
    <div class="sprockets" aria-hidden="true"></div>
    ${cont?`<a class="btn pri path-cont" href="#/lab/${cont}">${lastOk?"Continuar":"Começar"}: ${esc(CH.ACT[cont].t)}${icon("next")}</a>`:`<p class="muted">Você concluiu todas as atividades. Que tal voltar ao <a class="link" href="#/livre">Laboratório livre</a>?</p>`}
  </section>

  <div id="atos" class="atos">
  ${CH.data.atos.atos.map(a=>{
    const ids=CH.atividadesDoAto(a),dn=ids.filter(i=>prog[i].status==="concluida").length;
    return `<section class="ato" style="--ac:${a.cor}" aria-labelledby="ato-${a.n}">
      <header class="ato-h"><span class="ato-n display" aria-hidden="true">${a.n}</span>
        <div><span class="eyebrow">Ato ${a.n} · ${dn} de ${ids.length}</span><h2 class="h2" id="ato-${a.n}">${esc(a.titulo)}</h2><p class="ato-r">${esc(a.resumo)}</p></div></header>
      <ol class="acts">
        ${ids.map((id,k)=>{const ex=CH.ACT[id],pr=prog[id],st=STATUS[pr.status];
          return `<li class="act s-${pr.status}"><a href="#/lab/${id}"><span class="act-fr" aria-hidden="true">${CH.frameSVG(a.cor,pr.status==="concluida")}</span>
            <span class="act-tx"><b>${esc(ex.t)}</b><span class="mono">${esc(CH.EXF[id].difficulty)}${pr.n?` · ${pr.n} ${pr.n===1?"versão":"versões"}`:""}</span></span>
            <span class="act-st"><i aria-hidden="true">${st[1]}</i>${st[0]}</span></a></li>`}).join("")}
      </ol>
      ${a.n===3?`<a class="contrast-link" href="#/contraste"><span class="eyebrow">Para sentir a diferença</span><b>Tirar um pedaço do meio: o que você percebeu?</b><span>Compare duas montagens lado a lado e diga com as suas palavras.</span><span class="go">Abrir ${icon("next")}</span></a>`:""}
      ${a.livre?`<a class="contrast-link lv" href="#/livre"><span class="eyebrow">Fecha o percurso</span><b>Laboratório livre</b><span>Escolha planos de qualquer filme e monte o que quiser.</span><span class="go">Abrir ${icon("next")}</span></a>`:""}
      <p class="ato-carti">${icon("book")}<span>Na cartilha: volte ao <b>Ato ${a.n}</b>${a.cartilha&&a.cartilha.pagina?`, página ${a.cartilha.pagina}`:""}.</span></p>
    </section>`}).join("")}
  </div>
</div>`;
  if(sessionStorage.getItem("ch:scroll")==="lista"){sessionStorage.removeItem("ch:scroll");setTimeout(()=>{const t=document.getElementById("atos");t&&t.scrollIntoView({behavior:CH.reduced()?"auto":"smooth"})},60)}
  return{title:"Meu percurso"};
};
})();
