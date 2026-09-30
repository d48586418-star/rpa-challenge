/* engine.js — Motor genérico de avaliação.
   - Porta 1:1 de auditoria/reference_evaluator.py (classificação, targets, completion).
   - Gatilhos de feedback conforme HTML_IMPLEMENTATION_SPEC §6.5.
   - Validação de esquema e projeção para o aluno (lista branca).
   NÃO contém regras cinematográficas nem regras específicas de exercício ou take. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class DataError extends Error { constructor(msg) { super(msg); this.name = "DataError"; } }

  const KNOWN_OPS = ["length_between", "count", "count_distinct", "contains_all", "contains_none", "distinct_takes", "adjacent_any",
    "exact_sequence", "order", "immediately_after", "before", "run", "interleaved", "untrimmed", "trimmed_duration", "last_take_in", "jump_cut"];
  const KNOWN_TRIGGERS = ["pair", "pair_class", "contains_any", "contains_any_and_no_target", "first_take_in", "position_middle",
    "order_violation", "target_failed_because_contains", "distinct_violation", "equivalence_violation", "reflection_duplicate",
    "question_answer", "completion_blocked_by", "completion", "last_take_in"];
  const PAIR_CLASSES = ["valid", "alternative_valid", "known_weak", "invalid"];
  const TARGET_CLASSES = ["valid", "alternative_valid", "known_weak"];
  const CLASS_ORDER = ["valid", "alternative_valid", "known_weak"];

  const ids = v => v.map(c => c.take_id);
  const round3 = x => Math.round(x * 1000) / 1000;               // equivale a round(x, 3) do Python para estes valores
  const isNull = x => x === null || x === undefined;

  function effDur(c) {
    const out = isNull(c.trim_out) ? c.real_duration : c.trim_out;
    return round3(out - (c.trim_in || 0));
  }
  const pairEq = (p, a, b) => p[0] === a && p[1] === b;

  function ruleOk(r, v) {
    const s = ids(v);
    switch (r.op) {
      case "length_between": return s.length >= r.min && (isNull(r.max) || s.length <= r.max);
      case "count": { const n = s.filter(x => r.takes.includes(x)).length; return n >= r.min && (isNull(r.max) || n <= r.max); }
      case "count_distinct": return new Set(s.filter(x => r.set.includes(x))).size >= r.min;
      case "contains_all": return r.takes.every(t => s.includes(t));
      case "contains_none": return !r.takes.some(t => s.includes(t));
      case "distinct_takes": return s.length === new Set(s).size;
      case "adjacent_any":
        for (let i = 0; i < s.length - 1; i++) if (r.pairs.some(p => pairEq(p, s[i], s[i + 1]))) return true;
        return false;
      case "exact_sequence": return s.length === r.sequence.length && s.every((x, i) => x === r.sequence[i]);
      case "order": {
        const seq = r.sequence;
        if (r.contiguous) {
          for (let i = 0; i <= s.length - seq.length; i++) if (seq.every((t, k) => s[i + k] === t)) return true;
          return false;
        }
        let pos = 0;                                               // mesma semântica de all(t in it for t in seq)
        for (const t of seq) { const j = s.indexOf(t, pos); if (j < 0) return false; pos = j + 1; }
        return true;
      }
      case "immediately_after":
        for (let i = 0; i < s.length - 1; i++) if (s[i + 1] === r.take && r.after.includes(s[i])) return true;
        return false;
      case "before": {
        const fi = s.map((x, i) => (r.first.includes(x) ? i : -1)).filter(i => i >= 0);
        const ti = s.map((x, i) => (r.then.includes(x) ? i : -1)).filter(i => i >= 0);
        if (!fi.length) return false;
        if (!ti.length) return (r.if_then_absent || "fail") === "pass";
        return Math.min(...fi) < Math.min(...ti);
      }
      case "run": {
        let best = 0, cur = 0;
        for (const x of s) { cur = r.set.includes(x) ? cur + 1 : 0; best = Math.max(best, cur); }
        return best >= r.min;
      }
      case "interleaved": {
        const pos = s.map((x, i) => (r.set.includes(x) ? i : -1)).filter(i => i >= 0);
        if (pos.length < r.min_set) return false;
        const seps = s.map((x, i) => (r.separators.includes(x) && pos[0] < i && i < pos[pos.length - 1] ? i : -1)).filter(i => i >= 0);
        return seps.length >= r.min_separators;
      }
      case "untrimmed":
        return v.filter(c => c.take_id === r.take).every(c => Math.abs(effDur(c) - c.real_duration) <= r.tolerance_s) && s.includes(r.take);
      case "trimmed_duration": {
        const cs = v.filter(c => c.take_id === r.take);
        return cs.length > 0 && cs.every(c => r.min_s <= effDur(c) && effDur(c) <= r.max_s);
      }
      case "last_take_in": return s.length > 0 && r.takes.includes(s[s.length - 1]);
      case "jump_cut": {
        // Jump cut: dois clipes ADJACENTES do MESMO take com material removido entre eles
        // (o fim em fonte do 1º < início em fonte do 2º). Não conta corte contíguo/sem lacuna.
        const take = r.take, minGap = isNull(r.min_gap_s) ? 0.3 : r.min_gap_s;
        for (let i = 0; i < v.length - 1; i++) {
          const a = v[i], b = v[i + 1];
          if (a.take_id !== b.take_id) continue;
          if (!isNull(take) && a.take_id !== take) continue;
          const endA = isNull(a.trim_out) ? a.real_duration : a.trim_out;
          const startB = b.trim_in || 0;
          if (startB - endA >= minGap) return true;
        }
        return false;
      }
      default: throw new DataError("Operador de DSL desconhecido: " + JSON.stringify(r.op));
    }
  }

  function classifyPairs(ex, v) {
    const cat = new Map(ex.evaluation.pair_catalog.map(p => [p.a + "\u0000" + p.b, p]));
    const s = ids(v), out = [];
    for (let i = 0; i < s.length - 1; i++) {
      const p = cat.get(s[i] + "\u0000" + s[i + 1]);
      out.push({ a: s[i], b: s[i + 1], index: i, class: p ? p.class : "unmapped", source: p ? p.source : null });
    }
    return out;
  }

  /* ---------- Precedência de classificação (D6): lida de evaluation.classification_precedence ----------
     Cada passo é um predicado já definido no SPEC §6.3; o motor NÃO cria semântica nova, só executa
     os passos na ordem dos dados. Configuração ausente/desconhecida => DataError. */
  const PRECEDENCE_STEPS = {
    "invalid_pair": c => (c.pairs.some(p => p.class === "invalid") ? "invalid" : null),
    "incomplete (version_constraints)": c => (c.problems.length ? "incomplete" : null),
    "target_match": c => (c.matched.length ? c.matched.map(m => c.tclass[m]).sort((a, b) => CLASS_ORDER.indexOf(a) - CLASS_ORDER.indexOf(b))[0] : null),
    "known_weak_pair": c => (c.pairs.some(p => p.class === "known_weak") ? "known_weak" : null),
    "all_pairs_catalogued": c => (c.pairs.length && c.pairs.every(p => p.class === "valid" || p.class === "alternative_valid") ? "alternative_valid" : null),
    "unmapped": () => "unmapped"
  };
  function precedenceErrors(prec) {
    if (!Array.isArray(prec)) return ["evaluation.classification_precedence ausente ou não é uma lista"];
    const errs = [], known = Object.keys(PRECEDENCE_STEPS);
    prec.forEach(t => { if (!known.includes(t)) errs.push(`passo de precedência desconhecido: ${JSON.stringify(t)}`); });
    if (new Set(prec).size !== prec.length) errs.push("passo de precedência repetido");
    known.forEach(k => { if (!prec.includes(k)) errs.push(`passo de precedência ausente: ${k}`); });
    if (prec[prec.length - 1] !== "unmapped") errs.push("ordem desconhecida: 'unmapped' precisa ser o último passo (fallback)");
    return errs;
  }
  function assertPrecedence(ex) {
    const errs = precedenceErrors(ex.evaluation && ex.evaluation.classification_precedence);
    if (errs.length) throw new DataError(errs.join("; "));
    return ex.evaluation.classification_precedence;
  }

  function classifyVersion(ex, v) {
    const prec = assertPrecedence(ex);
    const vc = ex.version_constraints || {}, s = ids(v), problems = [];
    if (s.length < (vc.min_takes || 0)) problems.push("min_takes");
    if (vc.allow_duplicates === false && s.length !== new Set(s).size) problems.push("duplicates_not_allowed");
    if (s.some(t => !ex.take_pool.includes(t))) problems.push("take_outside_pool");
    const pairs = classifyPairs(ex, v);
    const matched = ex.evaluation.targets.filter(t => t.rules.every(r => ruleOk(r, v))).map(t => t.target_id);
    const tclass = Object.fromEntries(ex.evaluation.targets.map(t => [t.target_id, t.class]));
    const ctx = { pairs, problems, matched, tclass };
    let cls = null;
    for (const step of prec) { cls = PRECEDENCE_STEPS[step](ctx); if (cls !== null) break; }
    return {
      class: cls, matched_targets: matched, pairs, problems,
      store_for_analysis: cls === "unmapped" || pairs.some(p => p.class === "unmapped")
    };
  }

  function distinctKey(ex, v) {
    const d = ex.evaluation.completion.distinct_by;
    if (!d) return null;
    const s = ids(v);
    if (d.type === "last_take") return s.length ? s[s.length - 1] : null;
    if (d.type === "non_anchor_take") {
      const rest = s.filter(x => !d.anchor.includes(x));
      if (!rest.length) return null;
      const k = rest[0];
      for (const grp of (d.equivalence || [])) if (grp.includes(k)) return "EQ:" + [...grp].sort().join("|");
      return k;
    }
    throw new DataError("Tipo de distinct_by desconhecido: " + JSON.stringify(d.type));
  }

  /* Porta de reference_evaluator.check_completion (não avalia reflexão — ver reflectionStatus) */
  function checkCompletion(ex, versions) {
    const c = ex.evaluation.completion, res = versions.map(v => classifyVersion(ex, v));
    const requireTarget = isNull(c.any_target_required_per_version) ? true : c.any_target_required_per_version;
    const okIdx = versions.map((v, i) => i).filter(i => {
      const r = res[i];
      return (r.class === "valid" || r.class === "alternative_valid") && (!requireTarget || r.matched_targets.length > 0);
    });
    const reasons = [];
    const keys = okIdx.map(i => distinctKey(ex, versions[i]));
    let nOk;
    if (c.distinct_by) {
      const uniq = [];
      for (const k of keys) if (k !== null && !uniq.includes(k)) uniq.push(k);
      nOk = uniq.length;
      if (uniq.length < keys.length) reasons.push(keys.some(k => String(k).startsWith("EQ:")) ? "equivalence_violation" : "distinct_violation");
    } else nOk = okIdx.length;
    if (nOk < c.min_versions) reasons.push("min_versions");
    const allm = okIdx.flatMap(i => res[i].matched_targets);
    if (c.required_targets_all) {
      const miss = c.required_targets_all.filter(t => !allm.includes(t));
      if (miss.length) reasons.push("required_targets_all:" + miss.join(","));
    }
    if (c.required_targets_any) {
      const rq = c.required_targets_any;
      const n = okIdx.filter(i => res[i].matched_targets.some(m => rq.targets.includes(m))).length;
      if (n < rq.n) reasons.push("required_targets_any");
    }
    if (c.min_versions_matching) {
      const rq = c.min_versions_matching;
      const ks = new Set(okIdx.filter(i => res[i].matched_targets.some(m => rq.targets.includes(m))).map(i => distinctKey(ex, versions[i])));
      if (ks.size < rq.n) reasons.push("min_versions_matching");
    }
    return { complete: reasons.length === 0, reasons, per_version: res, counted_indices: okIdx };
  }

  /* ---------- Gatilhos de feedback (SPEC §6.5) ---------- */
  function triggerTrue(tr, ctx) {
    const s = ids(ctx.version), r = ctx.result;
    switch (tr.type) {
      case "pair": return r.pairs.some(p => p.a === tr.a && p.b === tr.b);
      case "pair_class": return r.pairs.some(p => p.class === tr.class);
      case "contains_any": return tr.takes.some(t => s.includes(t));
      case "contains_any_and_no_target": return tr.takes.some(t => s.includes(t)) && r.matched_targets.length === 0;
      case "first_take_in": return s.length > 0 && tr.takes.includes(s[0]);
      case "last_take_in": return s.length > 0 && tr.takes.includes(s[s.length - 1]);
      case "position_middle": { const i = s.indexOf(tr.take); return i > 0 && i < s.length - 1; }
      case "order_violation": {
        const present = s.filter(x => tr.sequence.includes(x));
        const expected = tr.sequence.filter(x => present.includes(x));
        return present.length >= 2 && present.some((x, i) => x !== expected[i]);
      }
      case "target_failed_because_contains": return !r.matched_targets.includes(tr.target) && tr.takes.some(t => s.includes(t));
      case "distinct_violation":
      case "equivalence_violation": {
        const k = distinctKey(ctx.exercise, ctx.version);
        if (k === null) return false;
        const clash = ctx.otherVersions.some(o => distinctKey(ctx.exercise, o.clips) === k);
        const eq = String(k).startsWith("EQ:");
        return clash && (tr.type === "equivalence_violation" ? eq : !eq);
      }
      case "reflection_duplicate": {
        const t = (ctx.reflection || "").trim();
        return t.length > 0 && ctx.otherVersions.some(o => (o.reflection || "").trim() === t);
      }
      case "question_answer": return !!ctx.questionAnswers && ctx.questionAnswers[tr.question] === tr.value;
      case "completion_blocked_by":
        return !!ctx.completion && !ctx.completion.complete && ctx.completion.reasons.some(x => x === tr.rule || x.startsWith(tr.rule + ":"));
      case "completion": return !!ctx.completion && ctx.completion.complete;
      default: throw new DataError("Tipo de gatilho desconhecido: " + JSON.stringify(tr.type));
    }
  }

  /* Mensagens de PREENCHIMENTO (não pedagógicas). Usadas porque global_feedback não define 'incomplete'. */
  function incompleteMessages(ex, problems) {
    const vc = ex.version_constraints || {}, m = [];
    if (problems.includes("min_takes")) m.push(`A montagem precisa de pelo menos ${vc.min_takes} takes.`);
    if (problems.includes("duplicates_not_allowed")) m.push("Há um take repetido na montagem.");
    if (problems.includes("take_outside_pool")) m.push("Há um take que não pertence a este exercício.");
    return m;
  }

  function feedback(ctx) {
    const ex = ctx.exercise, out = [], gf = ex.evaluation.global_feedback || {};
    if (ctx.result.class === "incomplete" && isNull(gf.incomplete)) {
      incompleteMessages(ex, ctx.result.problems).forEach(t => out.push({ id: "SYS_INCOMPLETE", text: t, kind: "system" }));
    } else if (gf[ctx.result.class]) out.push({ id: "GLOBAL_" + ctx.result.class, text: gf[ctx.result.class], kind: "global" });
    for (const f of ex.feedback_rules) {
      if (f.timing !== "on_validate" && f.timing !== "after_completion") throw new DataError("timing desconhecido: " + f.timing);
      if (f.timing === "after_completion" && !(ctx.completion && ctx.completion.complete)) continue;
      if (triggerTrue(f.trigger, ctx)) out.push({ id: f.feedback_id, text: f.message, kind: f.timing });
    }
    return out;
  }

  /* Reflexão (SPEC §6.4). Mantida SEPARADA de checkCompletion para preservar a equivalência com o avaliador de referência. */
  function reflectionStatus(ex, versions, completion, exerciseReflection) {
    const rp = ex.reflection_policy || {};
    if (!rp.required) return { required: false, ok: true };
    if (rp.scope === "per_exercise") return { required: true, scope: "per_exercise", ok: (exerciseReflection || "").trim().length > 0, missing: [] };
    const idx = completion ? completion.counted_indices : [];
    const missing = idx.filter(i => !(versions[i].reflection || "").trim());
    return { required: true, scope: "per_version", ok: idx.length > 0 && missing.length === 0, missing };
  }

  /* ---------- Validação estrutural (D7): dado desconhecido NÃO é ignorado ---------- */
  const RULE_SCHEMA = {   // parâmetros obrigatórios / opcionais por operador (tipos: ids | id | pairs | num | numOrNull | bool | passFail)
    length_between: { req: { min: "num" }, opt: { max: "numOrNull" } },
    count: { req: { takes: "ids", min: "num" }, opt: { max: "numOrNull" } },
    count_distinct: { req: { set: "ids", min: "num" }, opt: {} },
    contains_all: { req: { takes: "ids" }, opt: {} },
    contains_none: { req: { takes: "ids" }, opt: {} },
    distinct_takes: { req: {}, opt: {} },
    adjacent_any: { req: { pairs: "pairs" }, opt: {} },
    exact_sequence: { req: { sequence: "ids" }, opt: {} },
    order: { req: { sequence: "ids" }, opt: { contiguous: "bool" } },
    immediately_after: { req: { take: "id", after: "ids" }, opt: {} },
    before: { req: { first: "ids", then: "ids" }, opt: { if_then_absent: "passFail" } },
    run: { req: { set: "ids", min: "num" }, opt: {} },
    interleaved: { req: { set: "ids", separators: "ids", min_set: "num", min_separators: "num" }, opt: {} },
    untrimmed: { req: { take: "id", tolerance_s: "num" }, opt: {} },
    trimmed_duration: { req: { take: "id", min_s: "num", max_s: "num" }, opt: {} },
    jump_cut: { req: {}, opt: { take: "id", min_gap_s: "num" } },
    last_take_in: { req: { takes: "ids" }, opt: {} }
  };
  const TRIGGER_SCHEMA = {
    pair: { a: "id", b: "id" }, pair_class: { class: "pairClass" }, contains_any: { takes: "ids" }, contains_any_and_no_target: { takes: "ids" },
    first_take_in: { takes: "ids" }, last_take_in: { takes: "ids" }, position_middle: { take: "id" }, order_violation: { sequence: "ids" },
    target_failed_because_contains: { target: "target", takes: "ids" }, distinct_violation: {}, equivalence_violation: {},
    reflection_duplicate: {}, question_answer: { question: "question", value: "string" }, completion_blocked_by: { rule: "reason" }, completion: {}
  };
  const COMPLETION_REASONS = ["min_versions", "required_targets_all", "required_targets_any", "min_versions_matching", "distinct_violation", "equivalence_violation"];
  const VERSION_CLASSES = ["valid", "alternative_valid", "known_weak", "invalid", "unmapped", "incomplete"];

  function validateExercise(ex, takesById) {
    const errs = [], E = m => errs.push(m);
    const isObj = x => x !== null && typeof x === "object" && !Array.isArray(x);
    const keysOnly = (obj, allowed, where) => { if (!isObj(obj)) { E(`${where}: deveria ser um objeto`); return false; }
      Object.keys(obj).forEach(k => { if (!allowed.includes(k)) E(`${where}: chave desconhecida ${JSON.stringify(k)}`); }); return true; };
    ["title", "student_mission", "take_pool", "card_labels", "operations", "version_constraints", "evaluation",
     "feedback_rules", "reflection_policy", "audio_policy", "versions_policy"].forEach(k => { if (isNull(ex[k])) E(`campo ausente: ${k}`); });
    if (errs.length) return errs;
    const pool = ex.take_pool, inPool = t => pool.includes(t);
    pool.forEach(t => { if (!takesById[t]) E(`take do pool inexistente em takes_master: ${t}`); if (!ex.card_labels[t]) E(`card_label ausente para ${t}`); });
    const ev = ex.evaluation;
    if (!keysOnly(ev, ["pair_catalog", "targets", "completion", "classification_precedence", "global_feedback"], "evaluation")) return errs;
    precedenceErrors(ev.classification_precedence).forEach(E);
    // pair_catalog
    if (!Array.isArray(ev.pair_catalog)) E("evaluation.pair_catalog ausente ou não é lista");
    else ev.pair_catalog.forEach((p, i) => {
      keysOnly(p, ["a", "b", "class", "source", "feedback_id"], `pair_catalog[${i}]`);
      if (!PAIR_CLASSES.includes(p.class)) E(`classe de par desconhecida: ${JSON.stringify(p.class)}`);
      if (!inPool(p.a) || !inPool(p.b)) E(`par fora do pool: ${p.a}->${p.b}`);
    });
    // targets + regras
    const targetIds = [];
    const checkType = (val, type, where) => {
      const ok = { ids: Array.isArray(val) && val.every(inPool), id: inPool(val), num: typeof val === "number",
        numOrNull: val === null || typeof val === "number", bool: typeof val === "boolean", passFail: val === "pass" || val === "fail",
        pairs: Array.isArray(val) && val.every(p => Array.isArray(p) && p.length === 2 && inPool(p[0]) && inPool(p[1])),
        pairClass: PAIR_CLASSES.includes(val), target: targetIds.includes(val), string: typeof val === "string",
        question: !!ex.question && ex.question.id === val, reason: COMPLETION_REASONS.includes(val),
        ids_targets: Array.isArray(val) && val.every(t => targetIds.includes(t)) }[type];
      if (!ok) E(`${where}: valor inválido ou take fora do pool (${JSON.stringify(val)}; esperado ${type})`);
    };
    if (!Array.isArray(ev.targets)) E("evaluation.targets ausente ou não é lista");
    else ev.targets.forEach((t, i) => {
      keysOnly(t, ["target_id", "class", "rules"], `targets[${i}]`);
      if (typeof t.target_id !== "string" || targetIds.includes(t.target_id)) E(`target_id ausente ou repetido: ${JSON.stringify(t.target_id)}`);
      targetIds.push(t.target_id);
      if (!TARGET_CLASSES.includes(t.class)) E(`classe de target desconhecida: ${JSON.stringify(t.class)}`);
      if (!Array.isArray(t.rules)) { E(`targets[${i}].rules não é lista`); return; }
      t.rules.forEach((r, j) => {
        const w = `targets[${i}].rules[${j}]`, sc = RULE_SCHEMA[r.op];
        if (!sc) { E(`operador de DSL desconhecido: ${JSON.stringify(r.op)}`); return; }
        keysOnly(r, ["op", ...Object.keys(sc.req), ...Object.keys(sc.opt)], `${w} (${r.op})`);
        Object.entries(sc.req).forEach(([k, ty]) => { if (!(k in r)) E(`${w} (${r.op}): parâmetro obrigatório ausente: ${k}`); else checkType(r[k], ty, `${w}.${k}`); });
        Object.entries(sc.opt).forEach(([k, ty]) => { if (k in r) checkType(r[k], ty, `${w}.${k}`); });
      });
    });
    // completion
    const c = ev.completion;
    if (keysOnly(c, ["min_versions", "distinct_by", "required_targets_all", "required_targets_any", "min_versions_matching", "any_target_required_per_version"], "completion")) {
      if (typeof c.min_versions !== "number") E("completion.min_versions ausente ou não numérico");
      if ("any_target_required_per_version" in c && typeof c.any_target_required_per_version !== "boolean") E("completion.any_target_required_per_version deve ser booleano");
      if ("required_targets_all" in c) checkType(c.required_targets_all, "ids_targets", "completion.required_targets_all");
      ["required_targets_any", "min_versions_matching"].forEach(k => {
        if (!(k in c)) return;
        if (keysOnly(c[k], ["targets", "n"], `completion.${k}`)) {
          if (!Array.isArray(c[k].targets) || !c[k].targets.every(t => targetIds.includes(t))) E(`completion.${k}.targets com target desconhecido`);
          if (typeof c[k].n !== "number") E(`completion.${k}.n ausente ou não numérico`);
        }
      });
      if ("distinct_by" in c && c.distinct_by !== null) {
        const d = c.distinct_by;
        if (!isObj(d)) E("completion.distinct_by deveria ser um objeto");
        else if (d.type === "non_anchor_take") {
          keysOnly(d, ["type", "anchor", "equivalence"], "completion.distinct_by");
          if (!Array.isArray(d.anchor) || !d.anchor.every(inPool)) E("completion.distinct_by.anchor inválido");
          if ("equivalence" in d && !(Array.isArray(d.equivalence) && d.equivalence.every(g => Array.isArray(g) && g.every(inPool)))) E("completion.distinct_by.equivalence inválido");
        } else if (d.type === "last_take") keysOnly(d, ["type"], "completion.distinct_by");
        else E(`tipo de distinct_by desconhecido: ${JSON.stringify(d.type)}`);
      }
    }
    // global_feedback
    if (keysOnly(ev.global_feedback, VERSION_CLASSES, "global_feedback"))
      Object.values(ev.global_feedback).forEach(m => { if (typeof m !== "string") E("global_feedback com mensagem não textual"); });
    // feedback_rules
    if (!Array.isArray(ex.feedback_rules)) E("feedback_rules não é lista");
    else ex.feedback_rules.forEach((f, i) => {
      const w = `feedback_rules[${i}]`;
      keysOnly(f, ["feedback_id", "trigger", "message", "timing", "machine_executable"], w);
      if (!["on_validate", "after_completion"].includes(f.timing)) E(`${w}: timing desconhecido ${JSON.stringify(f.timing)}`);
      if (f.machine_executable !== true) E(`${w}: regra não executável (machine_executable != true)`);
      if (typeof f.message !== "string") E(`${w}: mensagem ausente`);
      const tr = f.trigger || {}, sc = TRIGGER_SCHEMA[tr.type];
      if (!sc) { E(`gatilho desconhecido: ${JSON.stringify(tr.type)}`); return; }
      keysOnly(tr, ["type", ...Object.keys(sc)], `${w}.trigger (${tr.type})`);
      Object.entries(sc).forEach(([k, ty]) => { if (!(k in tr)) E(`${w}.trigger: parâmetro ausente ${k}`); else checkType(tr[k], ty, `${w}.trigger.${k}`); });
    });
    // restrições, operações, políticas (tudo que o motor/UI executa)
    const vc = ex.version_constraints;
    if (keysOnly(vc, ["min_takes", "max_takes", "allow_duplicates"], "version_constraints")) {
      if (typeof vc.min_takes !== "number") E("version_constraints.min_takes ausente ou não numérico");
      if (typeof vc.allow_duplicates !== "boolean") E("version_constraints.allow_duplicates deve ser booleano");
      if (!isNull(vc.max_takes)) E("version_constraints.max_takes não nulo não é suportado pelo motor de referência");
    }
    const op = ex.operations;
    if (keysOnly(op, ["add", "remove", "reorder", "duplicate", "trim", "split"], "operations")) {
      ["add", "remove", "reorder", "duplicate"].forEach(k => { if (typeof op[k] !== "boolean") E(`operations.${k} deve ser booleano`); });
      if (keysOnly(op.trim, ["enabled", "takes", "mode"], "operations.trim")) {
        if (typeof op.trim.enabled !== "boolean") E("operations.trim.enabled deve ser booleano");
        if (op.trim.enabled && op.trim.mode !== "out_point") E(`operations.trim.mode desconhecido: ${JSON.stringify(op.trim.mode)}`);
        if (!op.trim.enabled && !isNull(op.trim.mode)) E("operations.trim.mode definido com trim desabilitado");
        if (!Array.isArray(op.trim.takes) || !op.trim.takes.every(inPool)) E("operations.trim.takes inválido");
      }
      if ("split" in op && op.split !== false && keysOnly(op.split, ["enabled", "takes"], "operations.split")) {
        if (typeof op.split.enabled !== "boolean") E("operations.split.enabled deve ser booleano");
        if (!Array.isArray(op.split.takes) || !op.split.takes.every(inPool)) E("operations.split.takes inválido");
      }
    }
    const rp = ex.reflection_policy;
    if (keysOnly(rp, ["required", "scope", "prompt", "min_chars", "evaluated_by"], "reflection_policy")) {
      if (!["per_version", "per_exercise"].includes(rp.scope)) E(`reflection_policy.scope desconhecido: ${JSON.stringify(rp.scope)}`);
      if (!isNull(rp.min_chars)) E("reflection_policy.min_chars não nulo não é suportado");
    }
    const vp = ex.versions_policy;
    if (keysOnly(vp, ["min_versions", "max_versions", "max_versions_DECISION_REQUIRED", "each_version_is_independent_timeline"], "versions_policy")) {
      if (!isNull(vp.max_versions)) E("versions_policy.max_versions não nulo não é suportado (decisão aberta)");
      if (c && vp.min_versions !== c.min_versions) E("versions_policy.min_versions diverge de completion.min_versions");
    }
    if (!isNull(ex.question) && keysOnly(ex.question, ["id", "prompt", "options", "expected_hidden", "blocking", "note"], "question")) {
      if (ex.question.blocking !== false) E("question.blocking != false não é suportado");
      if (!Array.isArray(ex.question.options)) E("question.options não é lista");
    }
    const ars = new Set(pool.filter(t => takesById[t]).map(t => takesById[t].aspect_ratio));
    if (ars.size > 1) E("exercício mistura proporções: " + [...ars].join(", "));
    if (!isObj(ex.audio_policy) || ex.audio_policy.policy !== "forced_mute") E("audio_policy diferente de forced_mute não é suportada pelo MVP");
    return errs;
  }
  function assertExerciseValid(ex, takesById) {
    const errs = validateExercise(ex, takesById);
    if (errs.length) throw new DataError(`Exercício ${ex.exercise_id || "?"} inválido: ` + errs.join("; "));
    return true;
  }

  /* ---------- Projeção para o aluno (lista branca). Só isto chega à interface. ---------- */
  function studentView(ex, takesById, dataRoot) {
    const cards = ex.take_pool.map((t, i) => ({
      key: i, label: ex.card_labels[t],
      video: dataRoot + takesById[t].video, thumbnail: dataRoot + takesById[t].thumbnail, duration: takesById[t].duration
    })).sort((a, b) => parseInt(a.label.replace(/\D/g, ""), 10) - parseInt(b.label.replace(/\D/g, ""), 10));
    const trim = ex.operations.trim || {};
    return {
      title: ex.title, mission: ex.student_mission, cards,
      aspect_ratio: takesById[ex.take_pool[0]].aspect_ratio,
      operations: {
        add: !!ex.operations.add, remove: !!ex.operations.remove, reorder: !!ex.operations.reorder, duplicate: !!ex.operations.duplicate,
        trimKeys: ex.take_pool.map((t, i) => (trim.enabled && (trim.takes || []).includes(t) ? i : -1)).filter(i => i >= 0)
      },
      reflection: { required: !!ex.reflection_policy.required, scope: ex.reflection_policy.scope, prompt: ex.reflection_policy.prompt },
      question: ex.question ? {
        id: ex.question.id, prompt: ex.question.prompt,
        // Decisão neutra (contradição 3 do relatório): take_id → rótulo neutro do card; id de target → "Opção n".
        options: ex.question.options.map((o, n) => ({ value: o, text: ex.card_labels[o] ? ex.card_labels[o] : (/^T_/.test(o) ? `Opção ${n + 1}` : o) }))
      } : null
    };
  }

  return { DataError, KNOWN_OPS, KNOWN_TRIGGERS, effDur, ruleOk, classifyPairs, classifyVersion, distinctKey, checkCompletion,
           triggerTrue, feedback, reflectionStatus, validateExercise, assertExerciseValid, precedenceErrors, PRECEDENCE_STEPS, studentView, incompleteMessages };
});
