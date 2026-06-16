/* ════════════════════ Coypu transpiler ════════════════════
   Statement kinds:
     (1) dirtstr  → "'pat' asDirtNotes/asDirtIndex to: #name"
     (2) rhythm   → "<head> to: #name"     builds steps[], creates track
     (3) cascade  → "#name p: v; q: v ..." sets notes/durations/level
   Defaults: note 60, duration 1 step, level 0.5.
   Exposes window.CoypuTranspiler.transpile(src) -> [track, ...]
   where track = {sample, steps, notes, durs, level, index}.          */
(function (global) {
  const R = global.CoypuRhythms;

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
    const oct = parseInt(m[3]);
    return Math.max(0, Math.min(127, (oct + 1) * 12 + base + acc));
  }

  function parseDirtString(pattern, method, sample) {
    const tokens = pattern.split(',').map(s => s.trim()).filter(Boolean);
    const gates = [], values = [], durs = [];
    for (const tok of tokens) {
      if (tok.includes('*')) {
        const [val, nStr] = tok.split('*');
        const n = parseInt(nStr);
        const isRest = val.trim() === '~' || val.trim() === '-';
        for (let i = 0; i < n; i++) {
          gates.push(isRest ? 0 : 1);
          if (!isRest) values.push(parseValue(val.trim(), method));
          durs.push(1);
        }
      } else if (tok.includes('/')) {
        const [val, nStr] = tok.split('/');
        const divisor = parseInt(nStr);
        const isRest = val.trim() === '~' || val.trim() === '-';
        gates.push(isRest ? 0 : 1);
        if (!isRest) values.push(parseValue(val.trim(), method));
        durs.push(divisor);
      } else {
        const isRest = tok === '~' || tok === '-';
        gates.push(isRest ? 0 : 1);
        if (!isRest) values.push(parseValue(tok, method));
        durs.push(1);
      }
    }
    const track = { sample, steps: gates, notes:[60], durs, level:[0.5], index:[0] };
    if (method === 'asDirtNotes') track.notes = values.length ? values : [60];
    if (method === 'asDirtIndex') track.index = values.length ? values : [0];
    return track;
  }

  function parseValue(str, method) {
    if (method === 'asDirtIndex') return parseInt(str);
    return asMidiNote(str);
  }

  function randomTrigs(n) {
    return Array.from({length: n}, () => Math.random() < 0.5 ? 1 : 0);
  }

  function randomTrigsWithProbability(n, prob) {
    const p = prob / 100;
    return Array.from({length: n}, () => Math.random() < p ? 1 : 0);
  }

  function buildSteps(head){
    let m;
    if((m = head.match(/^(\d+)\s+downbeats$/)))  return R.downbeats(+m[1]);
    if((m = head.match(/^(\d+)\s+upbeats$/)))    return R.upbeats(+m[1]);
    if((m = head.match(/^(\d+)\s+quavers$/)))    return R.quavers(+m[1]);
    if((m = head.match(/^(\d+)\s+(?:trigs|semiquavers)$/))) return R.trigs(+m[1]);
    if((m = head.match(/^(\d+)\s+rests$/)))      return R.rests(+m[1]);
    if((m = head.match(/^(\d+)\s+randomTrigs$/))) return randomTrigs(+m[1]);
    if((m = head.match(/^(\d+)\s+randomTrigsWithProbability:\s*(\d+)$/)))
      return randomTrigsWithProbability(+m[1], +m[2]);
    if((m = head.match(/^(\d+)\s+(\w+)$/))){
      const n = +m[1], name = m[2];
      if(R.BASE[name])      return R.tile(R.BASE[name], n);
      if(R.HEXRHYTHM[name]) return R.hexbeat(R.HEXRHYTHM[name]);
      throw new Error(`unknown rhythm: ${name}`);
    }
    if((m = head.match(/^#(\w+)\s+asRhythm$/))){
      const name = m[1];
      if(R.BASE[name]) return R.tile(R.BASE[name], 16);
      return R.rests(16);
    }
    if((m = head.match(/^'([0-9a-fA-F]+)'\s+hexbeat$/))) return R.hexbeat(m[1]);
    throw new Error(`can't parse: "${head}"`);
  }

  function transpile(src){
    const tracks = {};
    const order = [];
    const stmts = src.split(/\.(?![0-9])/).map(s=>s.trim()).filter(Boolean);

    for(const stmt of stmts){

      // ── (1) dirt string: 'pat' asDirtNotes/asDirtIndex to: #name ──
      const dirtM = stmt.match(/^'([^']*)'\s+(asDirtNotes|asDirtIndex)\s+to:\s*#(\w+)$/s);
      if(dirtM){
        const [, pattern, method, sample] = dirtM;
        const track = parseDirtString(pattern, method, sample);
        if(!tracks[sample]) order.push(sample);
        tracks[sample] = track;
        continue;
      }

      // ── (2) cascade: #name sel: val; sel: val ... ──
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

      // ── (3) rhythm: <head> to: #sample ──
      // Split on LAST "to: #" to handle "randomTrigsWithProbability: N to: #name"
      const toIdx = stmt.lastIndexOf(' to: #');
      if(toIdx === -1) throw new Error(`can't parse: "${stmt}"`);
      const head = stmt.slice(0, toIdx).trim();
      const sample = stmt.slice(toIdx + 6).trim();  // skip " to: #"
      const steps = buildSteps(head);
      if(!tracks[sample]) order.push(sample);
      tracks[sample] = {sample, steps, notes:[60], durs:[1], level:[0.5], index:[0]};
    }
    return order.map(n => tracks[n]);
  }

  global.CoypuTranspiler = { transpile, buildSteps, parseArray };
})(window);
