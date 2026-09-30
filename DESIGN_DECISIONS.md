# CORTANDO HISTÓRIAS — Laboratório de Montagem
## DESIGN_DECISIONS.md (escrito antes da implementação)

> **Aviso de fonte.** O ZIP recebido (`laboratorio_v7_final.zip`) continha **apenas** o laboratório
> (`ABRIR_AQUI.html` + `simulador/laboratorio_v7.html`, 15 MB, com vídeos e imagens embutidos em base64).
> **A cartilha impressa, a capa e os créditos institucionais NÃO vieram no pacote.**
> Só foram recebidas 4 imagens de referência. Por isso:
> * a identidade visual abaixo é **derivada do que existe** (paleta e linguagem do laboratório v7 + as 4 referências),
>   e está toda concentrada em **tokens** (`css/tokens.css`) para ser ajustada à cartilha em minutos;
> * os **4 Atos** estão em `data/atos.json` marcados como `"fonte": "provisória"`, derivados das 9 etapas que já
>   existiam no motor (`data/etapas.json`). **Devem ser conferidos/substituídos pela estrutura real da cartilha.**
> * nenhuma página, instituição ou crédito da cartilha foi inventado (campos `pagina: null` ficam vazios até serem preenchidos).

---

## 1. Auditoria do que existe (preservar)

| Parte | Estado | Decisão |
|---|---|---|
| `engine.js` (motor DSL, 462 linhas) | Sólido: classes `valid / alternative_valid / known_weak / invalid / unmapped / incomplete`, precedência, `checkCompletion`, `reflectionStatus`, gatilhos, validação estrutural | **Copiado byte a byte.** Não alterado. |
| `leituras.js` + `leituras.json` | Leitura relacional (proposta / outro_efeito / falta / quebra / diferente / incompleta), sem "certo/errado" | **Copiado byte a byte.** É a base da linguagem de feedback. |
| 15 exercícios (`EXF`), 90 takes, 8 filmes, 9 etapas | Dados completos | Preservados integralmente em `data/*.json`. |
| Vídeos | 93 WebM (VP8) reais embutidos em base64 | Extraídos para `assets/video/*.webm` — **arquivos de vídeo reais**, reproduzidos com `<video>`. |
| Thumbnails | 90 JPG base64 | Extraídos para `assets/img/*.jpg`. |
| Modelo de montagem `{id, a, b}` (fração do take) e `clipsOf()` | Converte para `{take_id, trim_in, trim_out, real_duration}` | **Mantido igual.** |
| UI antiga | Landing page (hero, marquee, cards, stats, CTA) + 3 abas + XP/níveis/confete; **não usava** reflexão, versões, pergunta nem conclusão do motor | Redesenhada como **aplicação**. |

### Defeitos encontrados no v7 (corrigidos)
1. **21 vídeos quebrados**: `DBWEBM` de `DF_*`, `MC_005`, `SC_104…118` já vinha com prefixo `data:video/webm;base64,` e `vurl()` prefixava de novo. Agora todos são arquivos reais.
2. **Reflexão nunca era pedida**, embora 12 de 15 exercícios a exijam (`reflection_policy.required`). Agora a interface lê a política do motor e **bloqueia salvar vazio** quando obrigatória.
3. **Sem versões / comparação / guardar**, embora 9 exercícios exijam ≥ 2 versões (`completion.min_versions`). Criado: Guardar versão, Duplicar, Comparar A/B com dois vídeos reais.
4. **`question` do motor ignorada** (EX_KULESHOV_002, EX_CORTE_001). Agora aparece, **não bloqueante**, como no contrato (`blocking:false`).
5. **Botão "Som"** contradizia `audio_policy: forced_mute` (áudio não verificado, professor não pode reativar). Removido; a faixa A1 é identificada como **silenciada**.
6. **XP / níveis (Aprendiz → Cineasta) / confete / "resposta correta"**: detectados por regex no texto do feedback — frágil e contrário à filosofia do projeto. Removidos; substituídos por **Descobertas** (ver §7).
7. `MC_007`: o dado diz 2,13 s, o arquivo tem 7,17 s. A reprodução respeita a duração declarada (2,13 s). **Sinalizado em `README.md` para conferência.**
8. `DL_022`: existe só a imagem, **não há vídeo**. Só aparece no Laboratório Livre, com aviso explícito "sem vídeo" (nunca finge ser vídeo).

---

## 2. Identidade visual (provisória, por tokens)

**Conceito: "claquete, fita e corte".** Um laboratório de ilha de edição impresso em papel: fundo **branco**, tinta **preta**, **amarelo de claquete** como cor de ação, e cores de **fita de etiqueta** para identificar de que filme é cada plano (as 8 cores do v7: `BH` azul, `NZ` verde, `SC` laranja, `DF` roxo, `DL` âmbar, `MC` rosa, `ST` ciano, `NL` amarelo).

**Extraído das referências (e adaptado, não copiado):**
| Referência | O que funciona | O que conversa com o projeto | Adaptação | Descartado |
|---|---|---|---|---|
| **1 – Osmo / Matter.js** (cartões rotacionados sobre preto) | Objetos "caídos" com rotação; sensação física | Frames como objetos físicos soltos | Capa: frames de vídeo real rotacionados em camadas com parallax | Fundo preto (o projeto pede branco); cartões genéricos |
| **2 – Netflix "Clip a Moment"** | **Filmstrip com alças verde (início) e vermelha (fim)**; tempos Start/End grandes | É literalmente a ação de aparar | Timeline com alças Entrada (verde) / Saída (vermelha), timecodes em mono | Chrome escuro do player |
| **3 – Editor de vídeo (alças lime, faixa roxa, playhead)** | Timeline clara, playhead com cabeça, régua | Legibilidade de timeline em fundo claro | Régua + playhead com cabeça preta; faixas com cantos firmes | Gradiente/ícones de IA (✦) |
| **4 – BUMAGA** | Tipografia gigante, **fita amarela/preta diagonal**, etiquetas-pílula coloridas, papel, blocos de cor | É o mais próximo de "editorial + experimental + contemporâneo" | Fita diagonal (marquee) com os nomes das técnicas; etiquetas-pílula como rótulos de filme; títulos enormes em caixa alta | Stickers de pixel-art e emojis; excesso de cor numa tela só |
| **Apple (apple.com/br)** *(citada no pedido)* | Rolagem coreografada, tipografia que revela por máscara, profundidade por camadas, muito ar | Storytelling conduzido por scroll | Capa + "Abertura" com cenas fixas (*sticky*) guiadas pelo scroll | Produto-hero/hardware; brilho e vidro |

> **Não foi possível navegar** Godly/Awwwards/Refero/21st.dev nem gerar assets com Higgsfield neste ambiente. Todo o visual é CSS/SVG + os **vídeos e frames reais** do projeto — o que também mantém o peso baixo e o caráter audiovisual.

### Tipografia (fontes livres, OFL, **auto-hospedadas** em `fonts/`)
* **Archivo (variável, eixo de largura)** — títulos. Usado **condensado e pesado** (`wdth 62–75, wght 800–900`), caixa alta, tracking negativo: lembra título de cartaz/claquete. Substituto livre para a fonte da capa (desconhecida).
* **Inter (variável)** — texto corrido, botões, leitura. Legível em 360 px.
* **JetBrains Mono** — timecodes, rótulos técnicos, nomes de take. Reforça "ilha de edição".
* Escala fluida com `clamp()`; corpo mínimo 16 px em mobile (evita zoom automático do iOS nos campos).

### Cor (tokens)
`--papel #FFFFFF` · `--tinta #0B0B0B` · `--cinza-1…4` · `--claquete #F5C518` (ação/foco) · `--entrada #12B76A` / `--saida #F04438` (alças de aparar, como a ref. 2) · cores de filme para clipes (clareadas para texto preto ≥ 4,5:1, verificadas com axe-core). **Nunca só cor**: todo clipe tem sigla de texto; estados têm ícone + texto.
Contraste: texto `#0B0B0B` sobre branco 19,8:1; texto sobre amarelo 12:1; cinza de apoio `#595959` (7:1).

### Formas e elementos gráficos
Fita diagonal amarelo/preto · etiqueta-pílula (filme/plano) ligeiramente rotacionada · **perfuração de película** (furos) nas tiras · **linha de corte** tracejada com ✂ · marcas de registro nos cantos · bloco de cor chapada para os Atos. **Sem** sombras grandes, vidro, gradientes decorativos.

---

## 3. Arquitetura de navegação (aplicação, não landing page)

Barra persistente (inferior no mobile, superior no desktop):

| Destino | Rota | Função |
|---|---|---|
| **Início** | `#/inicio` | Capa viva + **Continuar de onde parou** + portas para Percurso, Exercícios, Laboratório Livre, Caderno, Meu espaço + **Abertura** (storytelling por scroll) |
| **Percurso** | `#/percurso` | 4 Atos, atividades de cada ato, estado de cada uma (não iniciada / em andamento / concluída), descobertas |
| **Laboratório** | `#/lab/:id` | A atividade: Ver → Montar → Assistir → Comparar → Guardar → Experimentar → Descobrir |
| **Livre** | `#/livre` | Laboratório Livre (`EX_LAB_LIVRE`): sem meta, sem avaliação, sem prova |
| **Caderno** | `#/caderno` | Reflexões, descobertas, versões e anotações do aluno (local) |
| **Meu espaço** | `#/eu` | Nome, progresso, descobertas, acessibilidade, **créditos**, apagar dados |
| Créditos | `#/creditos` | Autoria, IA declarada, instituições **somente se fornecidas** |

Sem ranking, sem pontos competitivos, sem streak, sem vidas, sem XP.

## 4. Os 4 Atos (PROVISÓRIO — conferir com a cartilha)
Derivados **sem inventar conteúdo**, agrupando as 9 etapas já existentes no motor por afinidade pedagógica:

1. **Ato 1 — O que um plano faz com o outro** (etapa 1): Kuleshov ×2, "Na estrada".
2. **Ato 2 — Movimento, olhar e continuidade** (etapas 2, 4, 9): corte na ação, cutaway, plano/contraplano, match cut.
3. **Ato 3 — O tempo** (etapas 3, 6, 7): **jump cut × elipse** ("O salto", "O cofre", "A professora", "O tempo que sumiu").
4. **Ato 4 — Decisões de montador** (etapas 5, 8 + Livre): Murch, sequência e sentido, Laboratório Livre.

## 5. Mobile-first
* Projetado em **360 × 640** e **390 × 844** primeiro; toque antes de mouse.
* Barra inferior fixa (alvo ≥ 48 px, respeita `safe-area-inset`).
* Laboratório em mobile: **monitor fixo no topo (sticky)**, timeline logo abaixo, ações em barra rolável, biblioteca e leitura em **painéis (abas)** sob a timeline — nada de 3 colunas encolhidas.
* Timeline por toque: tocar o clipe seleciona; arrastar o **playhead** percorre o vídeo real; alças de aparar com área de toque de 44 px.
* `100dvh`, sem rolagem horizontal da página, zoom e texto grande suportados.

## 6. Desktop / tablet
Mesma estrutura expandida: ≥ 768 px biblioteca ao lado; ≥ 1100 px três zonas (atividade · monitor+timeline · biblioteca/leitura), sem mudar o modelo de interação. Comparar A/B fica lado a lado.

## 7. Gamificação (sem competição)
Substitui XP/níveis por **Descobertas** e **Folha de contato**:
* Cada técnica descoberta (nome revelado **depois** de experimentar) "revela" um quadro numa **tira de negativos** no Meu espaço.
* Cada atividade concluída pelo contrato do motor (`checkCompletion` + reflexão) "revela" o seu fotograma no Percurso.
* Sem pontos, sem ordem de melhor/pior, sem tempo, sem perda.

## 8. Pedagogia na interface
* **Ver → Montar → Assistir → Comparar → Guardar → Experimentar → Descobrir** é o trilho fixo no topo do Laboratório (marca o que já foi feito).
* **Ação → resultado → observação → nomeação**: a *leitura relacional* (motor) descreve o efeito **sem o nome da técnica**; o nome só aparece no cartão **Descoberta**, depois de assistir e de refletir/comparar (`nome` vindo de `leituras.json`).
* **Linguagem**: "Essa combinação produz outro efeito.", "A relação entre esses planos muda.", "Você montou de um jeito diferente do que a atividade propunha. Compare os dois resultados." Nunca "errado". `invalid` do motor vira "Algo salta neste corte" (texto já existente em `leituras.json`).
* **Reflexão**: lida de `reflection_policy`. Obrigatória → rótulo "Obrigatória", botão "Guardar versão" desabilitado com vazio e mensagem clara. Opcional → rótulo "Opcional". Escopo `per_version` (por versão) ou `per_exercise` (uma para a atividade).
* **Jump cut × Elipse** (Ato 3): mesma operação (remover o meio de um plano), sensações diferentes.
  * *Jump cut*: ruptura **perceptível** na continuidade de um mesmo plano/ação — **a emenda se nota**.
  * *Elipse*: **omite um intervalo** para a narrativa avançar — **o tempo passa, a emenda não atrapalha**.
  * Tela **"Sinta a diferença"** (`#/contraste`) reúne "O salto", "O tempo que sumiu" e "O cofre" (A/B), com pergunta aberta antes do nome e nota no Caderno. Não se decora definição: compara-se o efeito.

## 9. Tratamento dos vídeos
* `<video>` real (`playsinline`, `muted`, `preload`), dois elementos alternados no monitor para **trocar de plano sem piscar**.
* O relógio da montagem segue o **`currentTime` real do vídeo** (não uma simulação): se o vídeo demora a carregar, o tempo espera.
* Duração declarada em `takes.json` (`d`) é a fonte para cortes/aparar (contrato do motor); duração real do arquivo validada na auditoria.
* Proporção por atividade lida do arquivo (16:9 ou 4:3); o motor já proíbe misturar proporções num exercício.
* Miniaturas só na biblioteca/timeline como **capa**; o monitor sempre toca vídeo.
* Comparação A/B: dois monitores tocando as duas versões **ao mesmo tempo**.

## 10. Animação com função
Corte seco (`steps`), *wipe* por `clip-path`, revelação de título por máscara, parallax só na capa e na Abertura, playhead que segue o tempo real, entrada de clipes na timeline, alças que "encaixam". `prefers-reduced-motion` e a opção "Reduzir movimento" (Meu espaço) desligam parallax, scroll encenado e transições — o conteúdo final aparece estático.

## 11. Componentes principais
App shell · Tab bar · Capa viva · Dock "Continuar" · Abertura (cenas sticky) · Cartão de Ato · Fotograma de atividade · Stepper VER→DESCOBRIR · Monitor (2 vídeos) · Timeline (régua, faixa V1, faixa A1 silenciada, playhead, alças) · Biblioteca de planos com pré-visualização em vídeo · Leitura da montagem · Campo de reflexão · Versões + Comparar A/B · Cartão Descoberta · Caderno · Tira de negativos · Créditos.

## 12. Principais mudanças
Landing → aplicação · single-file 15 MB → projeto com assets reais · XP → Descobertas · reflexão/versões/pergunta/conclusão ligadas ao motor · vídeos quebrados corrigidos · mobile-first · persistência local única (`localStorage` `ch:v1`), sem conta e sem coleta.

---

## 13. Como ficou (registro da implementação)

* **Capa viva** (`#/inicio`): título em duas linhas que se separam pelo scroll, linha de corte com tesoura, 5 quadros de **vídeo real** em 3 profundidades (parallax diferente por camada), fita, botão *Continuar de onde parou*.
* **Abertura** (4 cenas *sticky* guiadas pelo scroll, ~8 s de rolagem): (1) o plano — o **vídeo real anda conforme você rola**; (2) o corte — *wipe* entre dois vídeos com linha de corte; (3) dois planos, um sentido — rosto + 3 imagens (toque para trocar); (4) a timeline monta-se sozinha. Cada cena tem numeral de fundo, tira de película e títulos com máscara em camadas próprias. Sem nomear técnicas.
* **Laboratório**: monitor com 2 `<video>` alternados; relógio = `currentTime` real; scrub arrastando o playhead mostra o **quadro real** do vídeo; alça SAÍDA (vermelha, como a ref. 2) para aparar; *Cortar aqui* no playhead; A1 silenciada; versões com reflexão obrigatória/opcional lida do motor; comparação A/B com dois vídeos simultâneos; referência derivada do motor (8 atividades).
* **Mobile**: dock fixo compacto (monitor ≈ 25 % da altura + timeline), transporte sobre o monitor, ferramentas em grade 3×2, biblioteca/leitura/versões em abas; `scroll-padding` compensa o dock para o foco nunca ficar escondido.
* **Desktop ≥ 1100 px**: atividade + monitor/timeline à esquerda, biblioteca fixa à direita.
* **Testado** em 360 / 390 / 768 / 1024 / 1440 px: 0 erros de console, 0 rolagem horizontal, 0 asset quebrado, axe-core sem violações críticas após ajustes; fluxos: entrada → percurso → atividade → vídeo → montagem → leitura → reflexão → guardar → descoberta → duplicar → comparar A/B → caderno → perfil → recarregar/retomar → `file://`.

---

## 14. Revisão 2 — o que mudou e por quê (substitui onde houver conflito com as seções acima)

**Fonte visual nova:** a capa impressa (miniatura). Identidade passou de "branco + amarelo de claquete" para **vermelho `#d8000f` + branco + preto + película sépia**; amarelo ficou só como marcador. Capa digital reproduz a da cartilha (letras espaçadas C O R / T A N / D O, HISTÓRIAS, tira de película com **vídeo real em sépia**). Duotone feito em CSS (`.duo`). Sem emojis; glifos viraram SVG.

**Pedagogia**
* **Descoberta nasce da ação** (assistir), não de texto. Substitui a regra "reflexão obrigatória para guardar": guardar é 1 toque; a anotação é opcional e curta (perguntas variam: v1 perceber · v2 "mudou o quê?" · v3 "qual funciona melhor?"; Murch: chips "por causa de quê?").
* **Trilha essencial** (Ver · Montar · Assistir · Descobrir · Guardar) × **aprofundamento** (Comparar · Experimentar · versões · anotar) — comparar nunca bloqueia.
* Estágios sem competição: **Experimentou → Descobriu → Aprofundou** (`CH.stage`); "Aprofundou" = contrato do motor (`checkCompletion` + reflexão exigida).
* **Descoberta**: "Você acabou de experimentar X" + o que ganhou (fotograma, conceito, Caderno) + "Na cartilha". Combinações fora da proposta = **"Exploração diferente"**, sem julgamento.
* **Kuleshov**: bloco "Mesmo rosto + imagem diferente = leitura diferente" com os próprios quadros.
* **Jump cut × elipse**: perguntas distintas (`pedagogia.json › depois`) e métrica própria: elipse mostra **tempo omitido** ("Você não viu esse tempo passar. Mas entendeu que ele passou"); jump cut pergunta **o que saltou na imagem**.
* **A professora**: o conceito exibido é "o mesmo lugar, outro tempo" (passagem de tempo), não "match cut".
* **Murch**: pergunta de decisão ("por causa de quê?") em vez de resposta correta.
* **Revelação progressiva**: 1ª atividade com guia de 4 passos; ferramentas só aparecem quando há o que fazer; aba Aprofundar só após assistir.
* **Nome protegido**: textos de leitura e feedback são neutralizados até a descoberta (`CH.neutral`).

**Conteúdo e cartilha**: Biblioteca de descobertas (`#/conceitos`: fundamentos do glossário do v7 + técnicas reveladas, cada uma com exemplo em vídeo, atividade e cartilha); Jornada do Editor (7 estações). Ponte com a cartilha em `data/cartilha.json` (campos a preencher); IDs de atividade estáveis + `npm run qr`.

**Ritmo / respiro**: missão vira bloco editorial com filete vermelho; caixas amarelas removidas; ferramentas ocultas até serem úteis; `Mover/Limpar` só com ≥ 2 planos.

### Autoauditoria honesta (o que fiz × o que só a cartilha resolve)

| Categoria | Situação | Limite real |
|---|---|---|
| Conceito pedagógico, didática, clareza p/ iniciante, atividades, progressão | Corrigidos os pontos apontados (descoberta pela ação, guia, Faça/Observe, exploração diferente, jump cut × elipse, Murch) e cobertos por `npm test` | Não foi testado com pessoas reais; isso é o próximo teste |
| UX / UI / linguagem / identidade | Capa da cartilha reinterpretada; emojis removidos; respiro revisto; axe sem violações | Fonte original da cartilha desconhecida |
| Acessibilidade | axe AA limpo; teclado; reduced motion; texto maior | Sem leitor de tela real testado |
| Gamificação | Folha de contato + descobertas + jornada, sem competição | — |
| **Cartilha ↔ laboratório** | Estrutura, campos, links condicionais e QR prontos | **Páginas/seções/PDF e "Quem foi?" dependem da cartilha (não chegou)** — por isso a nota aqui não chega a 9,5 |
| Coerência audiovisual / qualidade técnica | Vídeo real em tudo; 15 atividades em regressão; 0 erros de console | MP4/iOS não testados em aparelho real (WebM preservado; fallback documentado) |
