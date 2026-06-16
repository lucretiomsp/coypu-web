/* ════════════════════ Coypu transpiler ════════════════════
   Statement kinds:
     (1) dirtstr  → "'pat' asDirtNotes/asDirtIndex to: #name"
     (2) rhythm   → "<head> to: #name"  head may be comma-joined segments
     (3) cascade  → "#name p: v; q: v ..."
   Dirt string segments: comma-separated, "subpat * N" repeats subpattern.
   Rhythm head concatenation: "16 downbeats , 16 rumba" → 32 steps.
   Exposes window.CoypuTranspiler.transpile(src) -> [track, ...]       */
(function (global) {
  const R = global.CoypuRhythms;

  // ── helpers ──────────────────────────────────────────────────────────

  function parseArray(str){
    str = str.trim();
    const m = str.match(/^#\(([^)]*)\)$/);
    if(m) return m[1].trim().split(/\s+/).map(Number);
    const n = Number(str);
    if(!Number.isNaN(n)) return [n];
    throw new Error(`bad value: ${str}`);
  }

  function asMidiNote(str) {
    str = str.trim().toLowerCase();
    if(/^\d+$/.test(str)) return Math.min(127, parseInt(str));
    const noteMap = {c:0,d:2,e:4,f:5,g:7,a:9,b:11};
    const m = str.match(/^([a-g])(#{1,2}|x|ss|bb?|ff?|s|f)?(-?\d+)$/);
    if(!m) throw new Error(`bad note: ${str}`);
    const base = noteMap[m[1]];
    const accMap = {'##':2,'x':2,'ss':2,'#':1,'s':1,'bb':-2,'ff':-2,'b':-1,'f':-1};
    const acc = m[2] ? (accMap[m[2]] ?? 0) : 0;
    return Math.max(0, Math.min(127, (parseInt(m[3]) + 1) * 12 + base + acc));
  }

  function parseValue(str, method) {
    return method === 'asDirtIndex' ? parseInt(str) : asMidiNote(str);
  }

  // ── dirt string parsing ───────────────────────────────────────────────
  // Comma separates independent segments.
  // Within a segment, "tokens * N" at the end repeats the whole subpattern:
  //   "~ 42 * 2"  → ~ 42 ~ 42
  //   "65 * 3"    → 65 65 65
  //   "~ * 3"     → ~ ~ ~
  // token/N stretches a single token across N steps.

  function expandSegment(seg) {
    seg = seg.trim();
    const starM = seg.match(/^(.*?)\s*\*\s*(\d+)\s*$/);
    if (starM) {
      const subTokens = starM[1].trim().split(/\s+/).filter(Boolean);
      const n = parseInt(starM[2]);
      const out = [];
      for (let i = 0; i < n; i++) out.push(...subTokens);
      return out;
    }
    return seg.split(/\s+/).filter(Boolean);
  }

  function parseDirtString(pattern, method, sample) {
    const gates = [], values = [], durs = [];
    for (const seg of pattern.split(',')) {
      for (const tok of expandSegment(seg)) {
        if (tok.includes('/')) {
          const [val, nStr] = tok.split('/');
          const isRest = val === '~' || val === '-';
          gates.push(isRest ? 0 : 1);
          if (!isRest) values.push(parseValue(val, method));
          durs.push(parseInt(nStr));
        } else {
          const isRest = tok === '~' || tok === '-';
          gates.push(isRest ? 0 : 1);
          if (!isRest) values.push(parseValue(tok, method));
          durs.push(1);
        }
      }
    }
    const track = { sample, steps: gates, notes:[60], durs, level:[0.5], index:[0] };
    if (method === 'asDirtNotes') track.notes = values.length ? values : [60];
    if (method === 'asDirtIndex') track.index = values.length ? values : [0];
    return track;
  }

  // ── rhythm head → steps[] ─────────────────────────────────────────────
  // Head may be comma-joined: "16 downbeats , 16 rumba" → concatenated steps.
  // Note: rhythm-head comma is " , " (spaces) to avoid clash with dirt strings.

  function buildOneRhythm(expr) {
    expr = expr.trim();
    let m;
    if((m = expr.match(/^(\d+)\s+downbeats$/)))   return R.downbeats(+m[1]);
    if((m = expr.match(/^(\d+)\s+upbeats$/)))     return R.upbeats(+m[1]);
    if((m = expr.match(/^(\d+)\s+quavers$/)))     return R.quavers(+m[1]);
    if((m = expr.match(/^(\d+)\s+(?:trigs|semiquavers)$/))) return R.trigs(+m[1]);
    if((m = expr.match(/^(\d+)\s+rests$/)))       return R.rests(+m[1]);
    if((m = expr.match(/^(\d+)\s+randomTrigs$/)))
      return Array.from({length:+m[1]}, () => Math.random() < 0.5 ? 1 : 0);
    if((m = expr.match(/^(\d+)\s+randomTrigsWithProbability:\s*(\d+)$/)))
      return Array.from({length:+m[1]}, () => Math.random() < +m[2]/100 ? 1 : 0);
    if((m = expr.match(/^#(\w+)\s+asRhythm$/))){
      const name = m[1];
      return R.BASE[name] ? R.tile(R.BASE[name], 16) : R.rests(16);
    }
    if((m = expr.match(/^'([0-9a-fA-F]+)'\s+hexbeat$/))) return R.hexbeat(m[1]);
    if((m = expr.match(/^(\d+)\s+(\w+)$/))){
      const [, n, name] = m;
      if(R.BASE[name])      return R.tile(R.BASE[name], +n);
      if(R.HEXRHYTHM[name]) return R.hexbeat(R.HEXRHYTHM[name]);
      throw new Error(`unknown rhythm: "${name}"`);
    }
    throw new Error(`can't parse rhythm: "${expr}"`);
  }

  function buildSteps(head) {
    // split on " , " (space-comma-space) to avoid ambiguity with dirt strings
    return head.split(/\s+,\s+/).reduce((acc, part) => acc.concat(buildOneRhythm(part)), []);
  }

  // ── statement dispatcher ──────────────────────────────────────────────

  function parseStatement(stmt) {
    // (1) dirt string
    const dirtM = stmt.match(/^'([^']*)'\s+(asDirtNotes|asDirtIndex)\s+to:\s*#(\w+)$/s);
    if(dirtM) return { kind:'dirt', pattern:dirtM[1], method:dirtM[2], sample:dirtM[3] };

    // (2) cascade — starts with #name, no "to: #" anywhere
    const cascM = stmt.match(/^#(\w+)\s+(.+)$/s);
    if(cascM && !/\bto:\s*#/.test(stmt)) return { kind:'cascade', name:cascM[1], body:cascM[2] };

    // (3) rhythm — split on last " to: #" to handle keyword selectors with colons
    const toIdx = stmt.lastIndexOf(' to: #');
    if(toIdx === -1) throw new Error(`can't parse: "${stmt}"`);
    return { kind:'rhythm', head: stmt.slice(0, toIdx).trim(), sample: stmt.slice(toIdx + 6).trim() };
  }

  // ── main entry point ──────────────────────────────────────────────────

  function transpile(src){
    const tracks = {};
    const order  = [];
    const stmts  = src.split(/\.(?![0-9])/).map(s => s.trim()).filter(Boolean);

    for(const stmt of stmts){
      const p = parseStatement(stmt);

      if(p.kind === 'dirt'){
        const track = parseDirtString(p.pattern, p.method, p.sample);
        if(!tracks[p.sample]) order.push(p.sample);
        tracks[p.sample] = track;

      } else if(p.kind === 'cascade'){
        const t = tracks[p.name];
        if(!t) throw new Error(`#${p.name} has no rhythm yet`);
        for(const part of p.body.split(';')){
          const kv = part.trim().match(/^(notes|durations|level|index):\s*(.+)$/);
          if(!kv) throw new Error(`bad cascade: "${part.trim()}"`);
          const [,sel,val] = kv;
          if(sel==='notes')     t.notes = parseArray(val);
          if(sel==='durations') t.durs  = parseArray(val);
          if(sel==='level')     t.level = parseArray(val);
          if(sel==='index')     t.index = parseArray(val);
        }

      } else {
        const steps = buildSteps(p.head);
        if(!tracks[p.sample]) order.push(p.sample);
        tracks[p.sample] = {sample:p.sample, steps, notes:[60], durs:[1], level:[0.5], index:[0]};
      }
    }
    return order.map(n => tracks[n]);
  }

  global.CoypuTranspiler = { transpile, buildSteps, parseArray };
})(window);
