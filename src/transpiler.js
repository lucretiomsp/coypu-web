/* ════════════════════ Coypu transpiler ════════════════════
   Two statement kinds:
     (1) rhythm  → "<head> to: #name"     builds steps[], creates track
     (2) cascade → "#name p: v; q: v ..." sets notes/durations/level
   Defaults: note 60, duration 1 step, level 0.5.
   Exposes window.CoypuTranspiler.transpile(src) -> [track, ...]
   where track = {sample, steps, notes, durs, level}.                 */
(function (global) {

  const R = global.CoypuRhythms;

  function parseArray(str){
    // "#(38 38 40)"  or  single number "36"
    str = str.trim();
    const m = str.match(/^#\(([^)]*)\)$/);
    if(m) return m[1].trim().split(/\s+/).map(Number);
    const n = Number(str);
    if(!Number.isNaN(n)) return [n];
    throw new Error(`bad value: ${str}`);
  }

  function buildSteps(head){
    let m;
    if((m = head.match(/^(\d+)\s+downbeats$/)))  return R.downbeats(+m[1]);
    if((m = head.match(/^(\d+)\s+upbeats$/)))    return R.upbeats(+m[1]);
    if((m = head.match(/^(\d+)\s+quavers$/)))    return R.quavers(+m[1]);
    if((m = head.match(/^(\d+)\s+(?:trigs|semiquavers)$/))) return R.trigs(+m[1]);
    if((m = head.match(/^(\d+)\s+rests$/)))      return R.rests(+m[1]);

    // "N name" → tile named base pattern to length N
    if((m = head.match(/^(\d+)\s+(\w+)$/))){
      const n = +m[1], name = m[2];
      if(R.BASE[name])     return R.tile(R.BASE[name], n);
      if(R.HEXRHYTHM[name]) return R.hexbeat(R.HEXRHYTHM[name]); // jungle*
      throw new Error(`unknown rhythm: ${name}`);
    }
    // "#name asRhythm" → named rhythm at fixed 16 steps (16 perform: name)
    if((m = head.match(/^#(\w+)\s+asRhythm$/))){
      const name = m[1];
      if(R.BASE[name]) return R.tile(R.BASE[name], 16);
      return R.rests(16);              // unknown → 16 rests, per source
    }
    // "'hex' hexbeat"
    if((m = head.match(/^'([0-9a-fA-F]+)'\s+hexbeat$/))) return R.hexbeat(m[1]);

    throw new Error(`can't parse: "${head}"`);
  }

  function transpile(src){
    const tracks = {};       // name → track
    const order = [];        // preserve declaration order

    // A statement terminator is a '.' that is NOT a decimal point.
    // Split on '.' unless it is immediately followed by a digit (decimal).
    const stmts = src.split(/\.(?![0-9])/).map(s=>s.trim()).filter(Boolean);

    for(const stmt of stmts){
      // cascade?  starts with "#name" and contains no " to: #"
      const casc = stmt.match(/^#(\w+)\s+(.+)$/s);
      if(casc && !/\bto:\s*#/.test(stmt)){
        const name = casc[1];
        const t = tracks[name];
        if(!t) throw new Error(`#${name} has no rhythm yet`);
        for(const part of casc[2].split(';')){
          const kv = part.trim().match(/^(notes|durations|level|index):\s*(.+)$/);
          if(!kv) throw new Error(`bad cascade: "${part.trim()}"`);
          const [,sel,val] = kv;
          if(sel==='notes')     t.notes = parseArray(val);
          if(sel==='durations') t.durs  = parseArray(val);
          if(sel==='level')     t.level = parseArray(val);
          if(sel==='index')     t.index = parseArray(val);
        }
        continue;
      }
      // rhythm statement: "<head> to: #sample"
      const m = stmt.match(/^(.+?)\s+to:\s*#(\w+)$/s);
      if(!m) throw new Error(`can't parse: "${stmt}"`);
      const head = m[1].trim(), sample = m[2];
      const steps = buildSteps(head);
      if(!tracks[sample]) order.push(sample);
      tracks[sample] = {sample, steps, notes:[60], durs:[1], level:[0.5], index:[0]};
    }
    return order.map(n => tracks[n]);
  }

  global.CoypuTranspiler = { transpile, buildSteps, parseArray };

})(window);
