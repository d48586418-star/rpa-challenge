/* app.js — roteador por hash + casca do aplicativo (navegação persistente). */
(function(){
"use strict";
const CH=window.CH,{h,$,icon}=CH;
const NAV=[
  {k:"inicio",href:"#/inicio",l:"Início",i:"home"},
  {k:"percurso",href:"#/percurso",l:"Percurso",i:"path"},
  {k:"livre",href:"#/livre",l:"Livre",i:"film"},
  {k:"caderno",href:"#/caderno",l:"Caderno",i:"book"},
  {k:"eu",href:"#/eu",l:"Meu espaço",i:"user"}
];
const ROUTES=[
  [/^\/inicio$/,"inicio",(c,m)=>CH.views.home(c,m)],
  [/^\/percurso$/,"percurso",(c,m)=>CH.views.path(c,m)],
  [/^\/lab\/([A-Z0-9_]+)$/,"percurso",(c,m)=>CH.views.lab(c,m[1])],
  [/^\/livre$/,"livre",(c,m)=>CH.views.lab(c,CH.LIVRE)],
  [/^\/contraste$/,"percurso",(c,m)=>CH.views.contraste(c,m)],
  [/^\/caderno$/,"caderno",(c,m)=>CH.views.notebook(c,m)],
  [/^\/eu$/,"eu",(c,m)=>CH.views.me(c,m)],
  [/^\/creditos$/,"eu",(c,m)=>CH.views.credits(c,m)],
  [/^\/conceitos$/,"percurso",(c,m)=>CH.views.concepts(c,m)]
];
CH.views=CH.views||{};
let cur=null;

function buildNav(){
  $("#topnav").innerHTML=NAV.map(n=>`<a href="${n.href}" data-k="${n.k}">${n.l}</a>`).join("");
  $("#tabbar").innerHTML=NAV.map(n=>`<a href="${n.href}" data-k="${n.k}">${icon(n.i)}<span>${n.l}</span></a>`).join("");
}
function setCurrent(k){
  document.querySelectorAll("#topnav a,#tabbar a").forEach(a=>{if(a.dataset.k===k)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
}
function who(){const n=CH.store.name();$("#who").textContent=n?"Olá, "+n:""}
CH.who=who;

function route(){
  const app=$("#app");
  let path=location.hash.replace(/^#/,"")||"/inicio";
  if(!path.startsWith("/"))path="/inicio";
  let hit=null;for(const r of ROUTES){const m=path.match(r[0]);if(m){hit=[r,m];break}}
  if(!hit){location.hash="#/inicio";return}
  if(cur&&cur.destroy){try{cur.destroy()}catch(e){console.warn(e)}}
  document.querySelectorAll("dialog[open]").forEach(d=>{try{d.close()}catch(e){}});
  CH.scroll&&CH.scroll.teardown();
  app.innerHTML="";
  const holder=h("div.view");app.append(holder);
  window.scrollTo(0,0);
  try{cur=hit[0][2](holder,hit[1])||{}}catch(err){console.error(err);holder.innerHTML=`<div class="page"><h1 class="h2">Algo não abriu</h1><p class="lead">Volte ao <a class="link" href="#/inicio">início</a> e tente de novo.</p></div>`;cur={}}
  setCurrent(hit[0][1]);who();
  document.title=(cur.title?cur.title+" · ":"")+"Cortando Histórias";
  const hd=$("#page-title",holder)||$("h1",holder);
  if(hd){hd.setAttribute("tabindex","-1");hd.focus({preventScroll:true})}
  CH.say((cur.title||"Início")+", página carregada");
}
window.addEventListener("hashchange",route);
window.addEventListener("pagehide",()=>{if(cur&&cur.destroy)try{cur.destroy()}catch(e){}});
let started=false;
function start(){if(started)return;started=true;buildNav();route()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
