// Gera data/data.js (window.CH_DATA) a partir dos JSON de data/. Rodar: node scripts/build-data.js
// Usamos <script> clássico (não fetch) para o projeto abrir também por duplo clique (file://).
const fs=require('fs'),path=require('path');
const D=path.join(__dirname,'..','data');
const rd=f=>JSON.parse(fs.readFileSync(path.join(D,f),'utf8'));
const takes=rd('takes.json');
const out={
  takes, activities:rd('activities.json'), exf:rd('exercises_engine.json'), films:rd('films.json'),
  etapas:rd('etapas.json'), leituras:rd('leituras.json'), atos:rd('atos.json'), pedagogia:rd('pedagogia.json'),
  creditos:fs.existsSync(path.join(D,'creditos.json'))?rd('creditos.json'):null
};
fs.writeFileSync(path.join(D,'data.js'),'/* GERADO por scripts/build-data.js — não editar à mão. */\nwindow.CH_DATA='+JSON.stringify(out)+';\n');
console.log('data.js',(fs.statSync(path.join(D,'data.js')).size/1024).toFixed(0)+' KB');
