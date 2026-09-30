#!/usr/bin/env bash
# Gera MP4/H.264 a partir dos WebM (compatibilidade com Safari/iOS antigos). Requer ffmpeg com libx264.
# Uso: scripts/to-mp4.sh   → cria assets/video/*.mp4 e grava "mp4" em data/takes.json (os WebM permanecem).
set -e
cd "$(dirname "$0")/.."
for f in assets/video/*.webm; do
  o="${f%.webm}.mp4"; [ -f "$o" ] || ffmpeg -y -loglevel error -i "$f" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -an "$o"
done
node -e "
const fs=require('fs');const t=JSON.parse(fs.readFileSync('data/takes.json','utf8'));
t.forEach(x=>{const m='assets/video/'+x.id+'.mp4';if(fs.existsSync(m))x.mp4=m});
fs.writeFileSync('data/takes.json',JSON.stringify(t));"
node scripts/build-data.js
