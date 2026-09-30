/* core.js — namespace, utilitários, ícones, dados derivados. Sem dependências. */
(function(){
"use strict";
const CH=window.CH=window.CH||{};
const D=CH.data=window.CH_DATA;

/* ---------- DOM ---------- */
CH.$=(s,r=document)=>r.querySelector(s);
CH.$$=(s,r=document)=>Array.from(r.querySelectorAll(s));
CH.esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* h("div.a.b#id",{attrs},children...) */
CH.h=function(sel,attrs,...kids){
  const m=sel.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
  const el=document.createElement(m&&m[1]||"div");
  (m&&m[2]||"").replace(/([.#])([\w-]+)/g,(_,t,n)=>{t=="."?el.classList.add(n):el.id=n});
  if(attrs&&(typeof attrs!=="object"||attrs.nodeType||Array.isArray(attrs)||typeof attrs==="string")){kids.unshift(attrs);attrs=null}
  for(const k in (attrs||{})){const v=attrs[k];if(v==null||v===false)continue;
    if(k==="html")el.innerHTML=v;else if(k==="text")el.textContent=v;
    else if(k.startsWith("on")&&typeof v==="function")el.addEventListener(k.slice(2),v);
    else if(k==="style"&&typeof v==="object")Object.assign(el.style,v);
    else if(k==="dataset")Object.assign(el.dataset,v);
    else el.setAttribute(k,v===true?"":v)}
  kids.flat(9).forEach(c=>{if(c==null||c===false)return;el.append(c.nodeType?c:document.createTextNode(c))});
  return el;
};
CH.clear=el=>{while(el.firstChild)el.removeChild(el.firstChild);return el};

/* ---------- tempo ---------- */
CH.fmt=t=>{t=Math.max(0,t||0);const m=Math.floor(t/60),s=t-m*60;return String(m).padStart(2,"0")+":"+s.toFixed(1).padStart(4,"0")};
CH.uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
CH.ago=ts=>{const s=(Date.now()-ts)/1000;if(s<60)return"agora";if(s<3600)return Math.floor(s/60)+" min";if(s<86400)return Math.floor(s/3600)+" h";return Math.floor(s/86400)+" d"};
CH.date=ts=>new Date(ts).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});

/* ---------- dados derivados ---------- */
CH.TK={};D.takes.forEach(t=>CH.TK[t.id]=t);
CH.ACT={};D.activities.forEach(a=>CH.ACT[a.id]=a);
CH.EXF=D.exf;
CH.LIVRE="EX_LAB_LIVRE";
CH.filmColor=f=>getComputedStyle(document.documentElement).getPropertyValue("--f-"+f).trim()||"#0b0b0b";
CH.cardLabel=(exId,takeId)=>((CH.EXF[exId]||{}).card_labels||{})[takeId]||takeId;
CH.ratioOf=exId=>{const a=CH.ACT[exId];const t=a&&a.pool.map(i=>CH.TK[i]).find(x=>x&&x.ar);return(t&&t.ar)||"16:9"};
CH.ratioCss=ar=>ar==="4:3"?"4/3":"16/9";
CH.etapa=n=>D.etapas.find(e=>e.n===n);
CH.atoDe=exId=>{
  for(const ato of D.atos.atos){
    for(const n of ato.etapas){const e=CH.etapa(n);if(e&&e.a.includes(exId))return ato}
  }
  return exId===CH.LIVRE?D.atos.atos[D.atos.atos.length-1]:null;
};
CH.atividadesDoAto=ato=>{
  const out=[];ato.etapas.forEach(n=>{const e=CH.etapa(n);if(e)e.a.forEach(id=>{if(CH.ACT[id]&&!out.includes(id))out.push(id)})});return out};

/* Modelo de montagem {id,a,b} -> clipes do motor (IDÊNTICO ao v7) */
CH.dur=s=>CH.TK[s.id].d*(s.b-s.a);
CH.total=seq=>seq.reduce((a,s)=>a+CH.dur(s),0);
CH.clipsOf=seq=>seq.map(s=>{const d=CH.TK[s.id].d;return{take_id:s.id,trim_in:Math.round(s.a*d*100)/100,trim_out:s.b>=.999?null:Math.round(s.b*d*100)/100,real_duration:d}});

/* suporte a WebM/VP8 (formato real dos vídeos do projeto) */
CH.webm=!!document.createElement("video").canPlayType('video/webm; codecs="vp8"');

/* ---------- a11y ---------- */
let live;
CH.say=msg=>{live=live||CH.$("#live");if(!live)return;live.textContent="";setTimeout(()=>live.textContent=msg,30)};
let tt;
CH.toast=(msg,ms=2600)=>{const t=CH.$("#toast");if(!t)return;t.textContent=msg;t.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("show"),ms);CH.say(msg)};
CH.reduced=()=>{const r=document.documentElement.dataset.motion;if(r==="off")return true;if(r==="on")return false;return matchMedia("(prefers-reduced-motion: reduce)").matches};

/* ---------- ícones (traço 2px, 24px) ---------- */
const P={
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6h4v6"/>',
  path:'<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18h6.3a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7h6.3"/>',
  film:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  book:'<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  user:'<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.8-4 3.6-6 7.5-6s6.7 2 7.5 6"/>',
  play:'<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
  pause:'<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/>',
  back:'<path d="M15 5 8 12l7 7"/>',
  next:'<path d="M9 5l7 7-7 7"/>',
  left:'<path d="m11 6-6 6 6 6M19 6l-6 6 6 6"/>',
  right:'<path d="m13 6 6 6-6 6M5 6l6 6-6 6"/>',
  scissors:'<circle cx="6" cy="6.5" r="2.6"/><circle cx="6" cy="17.5" r="2.6"/><path d="M8 8 20 18M8 16 20 6"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
  undo:'<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2" transform="translate(0 -5)"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="m4.5 12.5 5 5 10-11"/>',
  x:'<path d="m6 6 12 12M18 6 6 18"/>',
  eye:'<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  rewind:'<path d="M4 5v14M20 5 9 12l11 7z" fill="currentColor"/>',
  compare:'<rect x="3" y="5" width="8" height="14" rx="1.5"/><rect x="13" y="5" width="8" height="14" rx="1.5"/>',
  save:'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  spark:'<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  down:'<path d="m6 9 6 6 6-6"/>',
  up:'<path d="m6 15 6-6 6 6"/>',
  download:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  pencil:'<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/>',
  flag:'<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>',
  mute:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 4 6M21 9l-4 6"/>'
};
CH.icon=(n,cls="")=>`<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[n]||""}</svg>`;
CH.iconEl=(n,cls)=>{const t=document.createElement("template");t.innerHTML=CH.icon(n,cls).trim();return t.content.firstChild};
CH.brandMark=()=>`<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M3 3h20L3 23z" fill="#0b0b0b"/><path d="M29 9v20H9z" fill="#0b0b0b"/><path d="M25 3h4v2.2L5.4 29H3v-2.6z" fill="#f5c518"/></svg>`;
})();
