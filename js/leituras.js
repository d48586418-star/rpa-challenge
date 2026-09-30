/* leituras.js — Leitura relacional da montagem (mostrada DEPOIS de assistir).
   Não classifica nada: usa o resultado do motor (classe, targets casados) e o próprio DSL do motor (Engine.ruleOk)
   para escolher, nos DADOS (dados/leituras.json), a explicação do que a montagem faz. Carregável no Node (testes). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./engine.js"));
  else root.Leituras = factory(root.Engine);
})(typeof self !== "undefined" ? self : this, function (Engine) {
  "use strict";
  const CLASSES = ["valid", "alternative_valid", "known_weak", "invalid", "unmapped", "incomplete"];
  const FIELDS = ["id", "situacao", "quando", "o_que", "por_que", "nome", "experimente"];
  /* A leitura nunca contradiz o motor: cada classe só aceita situações compatíveis. */
  const COMPATIVEL = { valid: ["proposta"], alternative_valid: ["outro_efeito"], known_weak: ["falta"], invalid: ["quebra"],
    unmapped: ["diferente", "outro_efeito", "falta"], incomplete: ["incompleta"] };

  /* Validação estrita: as regras passam pelo validador do próprio motor (operador/parâmetro desconhecido = erro). */
  function validate(L, exercisesById, takesById) {
    const errs = [];
    if (!L || L.schema !== 1) errs.push("leituras.json: schema desconhecido");
    const sit = Object.keys(L.situacoes || {});
    CLASSES.forEach(c => { const f = (L.fallback_por_classe || {})[c]; if (!f || !sit.includes(f.situacao)) errs.push("leituras: fallback ausente/ inválido para " + c); });
    for (const [id, list] of Object.entries(L.atividades || {})) {
      const ex = exercisesById[id]; if (!ex) { errs.push("leituras: atividade inexistente " + id); continue; }
      const tids = ex.evaluation.targets.map(t => t.target_id);
      list.forEach((r, i) => {
        const w = `${id}[${r.id || i}]`;
        Object.keys(r).forEach(k => { if (!FIELDS.includes(k)) errs.push(`${w}: campo desconhecido ${k}`); });
        if (!sit.includes(r.situacao)) errs.push(`${w}: situação desconhecida ${r.situacao}`);
        const q = r.quando || {};
        Object.keys(q).forEach(k => { if (!["classes", "targets_any", "rules"].includes(k)) errs.push(`${w}: condição desconhecida ${k}`); });
        (q.classes || []).forEach(c => { if (!CLASSES.includes(c)) errs.push(`${w}: classe desconhecida ${c}`); });
        (q.targets_any || []).forEach(t => { if (!tids.includes(t)) errs.push(`${w}: target inexistente ${t}`); });
        if (q.rules) {
          const probe = JSON.parse(JSON.stringify(ex)); probe.evaluation.targets.push({ target_id: "__PROBE__", class: "valid", rules: q.rules });
          Engine.validateExercise(probe, takesById).forEach(e => errs.push(`${w}: ${e}`));
        }
        [r.o_que, r.por_que, r.experimente].filter(Boolean).forEach(t => (t.match(/\{plano:([A-Z0-9_]+)\}/g) || []).forEach(m => {
          const tk = m.slice(7, -1); if (!ex.take_pool.includes(tk)) errs.push(`${w}: {plano:${tk}} fora do pool`); }));
      });
    }
    if (errs.length) throw new Engine.DataError(errs.join("; "));
    return true;
  }

  function matches(r, clips, result) {
    const q = r.quando || {};
    if (q.classes && !q.classes.includes(result.class)) return false;
    if (q.targets_any && !q.targets_any.some(t => result.matched_targets.includes(t))) return false;
    if (q.rules && !q.rules.every(rule => Engine.ruleOk(rule, clips))) return false;
    return true;
  }

  /* labelOf(take_id) → rótulo neutro ("Plano 3"). Devolve a leitura pronta para exibir. */
  function pick(L, exId, clips, result, labelOf) {
    const list = (L.atividades || {})[exId] || [];
    let r = result.class === "incomplete" ? null : list.find(x => COMPATIVEL[result.class].includes(x.situacao) && matches(x, clips, result));
    const src = r || { id: "fallback_" + result.class, ...L.fallback_por_classe[result.class] };
    const fill = t => (t ? t.replace(/\{plano:([A-Z0-9_]+)\}/g, (_, id) => labelOf(id)) : null);
    const s = L.situacoes[src.situacao];
    return { id: src.id, situacao: src.situacao, titulo: s.titulo, icone: s.icone, o_que: fill(src.o_que), por_que: fill(src.por_que),
      nome: src.nome || null, experimente: fill(src.experimente), especifica: !!r };
  }
  return { validate, pick, matches, COMPATIVEL };
});
