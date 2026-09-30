# Cortando Histórias — Laboratório de Montagem

Experiência educacional interativa de introdução à edição e à montagem audiovisual.
É a **parte digital** da cartilha *Cortando Histórias* (projeto Cinema na Comunidade):
a cartilha apresenta; o laboratório deixa o aluno **experimentar** com planos de filmes reais; o aluno volta à cartilha com o que descobriu.

## Como abrir

* **Duplo clique em `index.html`** funciona (não precisa de servidor nem de internet).
* Ou, com servidor local (recomendado para celular na mesma rede):
  `python3 -m http.server 8765` → <http://localhost:8765>
* Tudo é HTML/CSS/JS puro — sem build, sem dependências, sem CDN. Fontes e vídeos estão no projeto.

## Estrutura

```
index.html            casca do app (navegação persistente)
css/                  tokens (cores, tipografia), base, shell, home, telas, laboratório
js/engine.js          MOTOR do v7 (idêntico byte a byte) — classificação, completude, reflexão, feedback
js/leituras.js        leitura relacional do v7 (idêntico byte a byte)
js/core.js store.js   utilitários · persistência local (localStorage "ch:v1")
js/player.js          reprodução REAL da montagem (2 <video> alternados, sem piscar)
js/lab.js lab-panels.js  Laboratório: monitor, timeline, versões, reflexão, descoberta, comparação A/B
js/scroll.js          "scrollcraft": cenas fixas guiadas pelo scroll, camadas, revelação de texto
js/views-*.js app.js  telas e roteador (#/inicio, #/percurso, #/lab/ID, #/livre, #/caderno, #/eu, #/creditos, #/contraste)
data/*.json           dados do v7 (exercícios, takes, leituras, etapas, filmes) + atos/pedagogia/créditos
data/data.js          GERADO: node scripts/build-data.js
assets/video/*.webm   93 vídeos reais   ·   assets/img/*.jpg  90 miniaturas
fonts/                Archivo, Inter, JetBrains Mono (SIL OFL 1.1)
scripts/              build-data.js · validate.js (motor + assets) · smoke.js (Playwright)
DESIGN_DECISIONS.md   análise e decisões
```

Depois de editar qualquer `data/*.json`: `node scripts/build-data.js` e `node scripts/validate.js`.

## O que foi preservado do v7

* Motor (`engine.js`) e leitura (`leituras.js`): **idênticos**. Nenhuma regra cinematográfica foi movida para a interface.
* Os 15 exercícios, 90 takes, 8 filmes, 9 etapas, regras de avaliação, classes de resultado (`valid / alternative_valid / known_weak / invalid / unmapped / incomplete`), durações, proporções e o modelo de montagem `{id,a,b}` → `clipsOf()`.
* `node scripts/validate.js` confirma que os 15 exercícios e as leituras passam na **validação estrutural do próprio motor** e que não há asset quebrado.

## O que mudou

Landing page → **aplicação** (Início · Percurso · Laboratório · Livre · Caderno · Meu espaço · Créditos). Jornada no Laboratório: **Ver → Montar → Assistir → Comparar → Guardar → Experimentar → Descobrir**. Detalhes em `DESIGN_DECISIONS.md`.

Defeitos do v7 corrigidos: 21 vídeos quebrados (prefixo `data:` duplicado) · reflexão obrigatória nunca era pedida · sem versões/comparação/guardar · `question` do motor ignorada · botão "Som" contrariava `audio_policy: forced_mute` · XP/níveis detectados por regex no texto · nome da técnica vazava antes da hora (8 trechos das leituras + 1 feedback).

## ⚠ Pendências que dependem de você (não inventei)

1. **A cartilha, a capa e os créditos institucionais não vieram no ZIP.** A identidade visual é *provisória* (derivada do v7 + referências) e está em `css/tokens.css`. Os **4 Atos** (`data/atos.json`, `"fonte":"provisória"`) foram agrupados a partir das 9 etapas existentes — **confira com a estrutura real da cartilha**; `cartilha.pagina`/`secao` estão `null` (a interface só mostra a página quando preenchida).
2. **Créditos**: só a sigla **UESC** constava nos arquivos (rodapé do v7). Acrescente os demais em `data/creditos.json` (`instituicoes`). Autoria (Débora Augusta) e o aviso de uso de IA foram escritos conforme o pedido.
3. **`MC_007`**: o dado diz 2,13 s, o arquivo tem 7,17 s. A reprodução respeita os **2,13 s declarados**. Confirme qual é o correto.
4. **`DL_022`** só existe como imagem (sem vídeo). Aparece apenas no Laboratório Livre, com aviso "sem vídeo".
5. **Leitura de "O salto" (`jc_done`)** diz "a câmera não se mexeu", mas o take `NL_047` é descrito como *plano geral → aproximação até close*. Texto mantido (é dado seu) — vale revisar.
6. **Formato de vídeo**: os assets recebidos são **WebM (VP8)**, não MP4. Funciona em Chrome/Edge/Firefox/Android e Safari recente; em Safari/iOS antigo o laboratório avisa em vez de fingir vídeo. Para MP4: `ffmpeg -i X.webm -c:v libx264 -pix_fmt yuv420p -an X.mp4` e ajustar `vid` em `data/takes.json`.
7. **Não usei Higgsfield, Godly, Awwwards, Refero nem 21st.dev** (sem acesso a esses serviços neste ambiente). O visual é CSS/SVG + os próprios vídeos do projeto.
8. **Gamificação**: XP/níveis/confete foram **removidos** (contrariam "sem pontuação competitiva") e trocados por *Folha de contato* (fotograma revelado por atividade concluída) e *Descobertas* (técnicas nomeadas só depois de experimentar). Se quiser outra mecânica, é um ponto de decisão.

## Privacidade

Nenhum dado sai do aparelho. Progresso, versões, reflexões e nome ficam em `localStorage` (`ch:v1`). Em *Meu espaço* é possível baixar/importar uma cópia `.json` ou apagar tudo.

## Acessibilidade

Foco sempre visível · navegação por teclado (timeline: setas; alça SAÍDA: setas, Shift = 1 s) · alvos ≥ 44 px · `prefers-reduced-motion` + opção "Movimento" (a Abertura vira sequência estática) · texto maior · mais contraste · estado nunca só por cor · `aria-live` para avisos · contraste auditado com axe-core (WCAG 2.1 AA).

## Licenças

Código do projeto: conforme o projeto Cinema na Comunidade. Fontes: SIL OFL 1.1 (`fonts/LICENSES.txt`). Os planos pertencem aos curtas-metragens listados em *Créditos* e são usados com finalidade educacional.
