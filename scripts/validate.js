// Valida dados + assets com o PRÓPRIO motor do v7. Rodar: node scripts/validate.js
const fs=require('fs'),path=require('path');
const R=p=>path.join(__dirname,'..',p),J=f=>JSON.parse(fs.readFileSync(R('data/'+f),'utf8'));
const Engine=require(R('js/engine.js')),Leituras=require(R('js/leituras.js'));
const takes=J('takes.json'),EXF=J('exercises_engine.json'),LR=J('leituras.json'),ACT=J('activities.json');
const TK={};takes.forEach(t=>TK[t.id]=t);
let bad=0;const fail=m=>{bad++;console.log('✗',m)};
for(const [k,e] of Object.entries(EXF)){const errs=Engine.validateExercise(e,TK);errs.forEach(x=>fail(k+': '+x))}
try{Leituras.validate(LR,EXF,TK)}catch(e){fail('leituras: '+e.message)}
let semVideo=[];
takes.forEach(t=>{
  if(!fs.existsSync(R(t.th)))fail('thumbnail ausente '+t.id);
  if(!t.vid)semVideo.push(t.id);else if(!fs.existsSync(R(t.vid)))fail('vídeo ausente '+t.id);
});
ACT.forEach(a=>a.pool.forEach(i=>{if(!TK[i])fail(a.id+': take fora de takes.json '+i)}));
console.log(`${Object.keys(EXF).length} exercícios · ${takes.length} takes · ${takes.length-semVideo.length} com vídeo real`);
if(semVideo.length)console.log('ⓘ sem arquivo de vídeo (só imagem):',semVideo.join(', '));
console.log(bad?`${bad} problema(s)`:'OK — dados e assets consistentes');process.exit(bad?1:0);
