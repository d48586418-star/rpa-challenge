// Gera links e QR Codes estáveis por atividade (ponte cartilha → laboratório).
// Uso: BASE_URL=https://seu-endereco/laboratorio/ npm run qr   → qr/links.csv + qr/<ID>.svg
// O identificador da atividade (ex.: EX_KULESHOV_001) é estável: a rota é  <BASE_URL>#/lab/<ID>
const fs=require('fs'),path=require('path');
const base=(process.env.BASE_URL||'http://localhost:8765/index.html').replace(/#.*$/,'');
const acts=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','activities.json'),'utf8'));
const out=path.join(__dirname,'..','qr');fs.mkdirSync(out,{recursive:true});
let QR;try{QR=require('qrcode')}catch(e){console.log('(instale "qrcode" com npm install para gerar os SVG; o CSV sai mesmo assim)')}
const rows=['id;titulo;url'];
(async()=>{
  for(const a of acts){
    const url=a.id==='EX_LAB_LIVRE'?base+'#/livre':base+'#/lab/'+a.id;
    rows.push([a.id,a.t,url].join(';'));
    if(QR)fs.writeFileSync(path.join(out,a.id+'.svg'),await QR.toString(url,{type:'svg',margin:1}));
  }
  fs.writeFileSync(path.join(out,'links.csv'),rows.join('\n')+'\n');console.log(rows.length-1,'atividades →',out);
})();
