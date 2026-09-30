# Cortando Histórias — Laboratório de Montagem

Experiência educacional interativa de introdução à edição e à montagem audiovisual, extensão digital da cartilha *Cortando Histórias* (Cinema na Comunidade).
Princípio: **ver → fazer → perceber → descobrir → nomear → experimentar**. A técnica só ganha nome depois que a pessoa a experimenta.

## Abrir

* Duplo clique em `index.html` (funciona sem servidor e sem internet) **ou** `npm run serve` → <http://localhost:8765>.
* HTML/CSS/JS puros. Sem build, sem CDN. Fontes, vídeos e imagens estão no projeto.

## Comandos

```bash
npm install                       # playwright, http-server, qrcode (dev)
npx playwright install chromium   # uma vez, para os testes e2e
npm run validate                  # motor + 15 exercícios + leituras + assets (sem navegador)
npm test                          # e2e: rotas × 5 viewports, 15 atividades, jornada, persistência
npm run build:data                # regenera data/data.js depois de editar data/*.json
npm run qr                        # links + QR (SVG) por atividade  (BASE_URL=https://.../index.html)
```
Sem Chrome do Playwright? `CHROMIUM_PATH=/caminho/do/chrome npm test`.

## Estrutura

```
index.html · css/ (tokens, base, shell, home, telas, lab, brand) · js/ · data/ · assets/ · fonts/ · scripts/ · tests/
js/engine.js js/leituras.js   motor e leitura do v7 — IDÊNTICOS byte a byte (não alterar)
js/lab.js lab-panels.js       monitor, timeline, leitura, descoberta, versões, comparação A/B
js/views-*.js                 Início, Percurso, Conceitos, Caderno, Meu espaço, Créditos, "Sinta a diferença"
data/*.json                   dados do v7 + pedagogia, jornada, fundamentos, cartilha, atos, créditos
```

## Como a experiência funciona

| Etapa | O que acontece |
|---|---|
| **Faça / Observe** | Instrução curta + uma pista perceptiva. Na 1ª atividade, um guia de 4 passos ensina o próprio laboratório; as ferramentas aparecem só quando servem. |
| **Montar → Assistir** | Vídeos reais, sem som (política do motor). |
| **Descobrir** | Ao **assistir** uma montagem que realiza a proposta, o nome é revelado (“Você acabou de experimentar …”) com o que a pessoa ganhou: fotograma, conceito na Biblioteca, entrada no Caderno, link para a cartilha. **Não depende de digitar nada.** Outras combinações viram *exploração diferente*, não erro. |
| **Guardar** | Um toque. A anotação do que percebeu é opcional (perguntas curtas que variam por versão; em Murch, chips “por causa de quê?”). |
| **Aprofundar** (opcional) | Comparar A/B com dois vídeos simultâneos, criar versões, anotar. **Nunca bloqueia** seguir adiante. |

Estágios da folha de contato (sem pontos, sem ranking): **Experimentou → Descobriu → Aprofundou** (este último = contrato completo do motor: versões distintas + reflexão exigida pela atividade).
Jornada do Editor: Olhar · Relacionar · Cortar · Organizar · Manipular o tempo · Criar sentido · Fazer escolhas.

## ⚠ O que não pude fechar (dependia da cartilha, que não chegou)

Recebi **só a miniatura da capa** (imagem) — não as páginas. Da capa extraí: vermelho chapado + branco, letras brancas espaçadas “C O R / T A N / D O”, tira de película em sépia, duotone e o subtítulo “Introdução à edição e montagem audiovisual”. Por isso ainda faltam:

1. **Páginas, seções e PDF da cartilha** → `data/cartilha.json` (todos os campos `null`; a interface só mostra “p. X” / “Voltar para a cartilha” quando preenchidos — nada foi inventado). Depois: `npm run build:data`.
2. **Os 4 Atos** (`data/atos.json`) e as **7 estações da Jornada** (`data/jornada.json`) foram derivados das atividades reais e estão marcados como provisórios. Conferir nomes com a cartilha.
3. **“Quem foi?” (autores/história)**: não foi implementado — exige conteúdo e imagens com procedência que só a cartilha fornece.
4. **Fundamentos** (edição, montagem, plano, corte, timeline, enquadramento, cena): vêm do glossário do v7, resumidos; conferir com a cartilha.
5. **Fonte tipográfica da cartilha**: desconhecida. Usei Archivo + Inter + JetBrains Mono (OFL).
6. **Créditos institucionais**: só “UESC” constava nos arquivos (`data/creditos.json`).

## Observações sobre os dados do v7 (mantidos)

* `MC_007`: dado 2,13 s × arquivo 7,17 s → reprodução respeita 2,13 s.
* `DL_022`: só imagem, sem vídeo (aparece só no Livre, com aviso).
* Leitura `jc_done` diz “a câmera não se mexeu”, mas `NL_047` é “plano geral → aproximação até close”. Revisar.
* `EX_CORTE_003` (“A professora”): o dado interno fala em “match cut temporal”, mas o que o aluno vê é **“o mesmo lugar, outro tempo”** (passagem de tempo), coerente com a experiência; “match cut” só aparece em `EX_MATCHCUT_MC01`.

## Vídeo e compatibilidade

Os 93 vídeos são **WebM/VP8** (originais, preservados). Chrome, Edge, Firefox, Android e Safari recente tocam. Se o navegador não tocar WebM, o laboratório **avisa** (não simula vídeo). Para MP4/H.264 (Safari/iOS antigo): `scripts/to-mp4.sh` (precisa de ffmpeg com libx264) gera `.mp4` ao lado e registra em `data/takes.json`; o player usa MP4 só como reserva. Não consegui gerar MP4 neste ambiente (ffmpeg sem libx264) nem testar em iPhone real.

## Privacidade

Nada sai do aparelho: progresso, versões, anotações e nome ficam em `localStorage` (`ch:v1`). Em *Meu espaço*: exportar/importar `.json`, apagar tudo. Sem conta, sem backend.

## Acessibilidade

Skip link · foco visível · teclado (timeline: setas; alça SAÍDA: setas, Shift = 1 s) · alvos ≥ 44 px · `aria-live` · `prefers-reduced-motion` + opção “Movimento” (Abertura vira sequência estática) · texto maior · mais contraste · nunca só cor · axe-core (WCAG 2.1 AA) sem violações nas 10 rotas em 390 e 1280 px.

## Créditos, IA e imagens

Ver `data/creditos.json` e a tela Créditos. Resumo: concepção/projeto/execução — Débora Augusta Alves Santos; desenvolvimento — colaboração de IA (Claude Code, Anthropic). **Nenhuma imagem/vídeo foi gerado por IA**: só frames dos curtas listados. Ícones, película, duotone: SVG/CSS com assistência de IA. Fontes: SIL OFL 1.1. Detalhes em `ASSETS_LICENSES.md`.
