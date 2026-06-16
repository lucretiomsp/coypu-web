/* ════════════════════ App wiring ════════════════════
   Connects the textarea → transpiler → lanes UI → scheduler/audio.   */
(function () {

  const { transpile }   = window.CoypuTranspiler;
  const Audio           = window.CoypuAudio;
  const Scheduler       = window.CoypuScheduler;

  const $ = id => document.getElementById(id);
  const setStatus = (m, err=false) => {
    const s = $('status'); s.textContent = m; s.classList.toggle('err', err);
  };

  // The code editor may be a CodeMirror instance (window.coypuEditor)
  // or a plain <textarea> fallback. Read through one accessor.
  const getCode = () =>
    window.coypuEditor ? window.coypuEditor.getValue() : $('code').value;
  const onCodeChange = (fn) => {
    if(window.coypuEditor) window.coypuEditor.on('change', fn);
    else $('code').addEventListener('input', fn);
  };

  let laneEls = [];   // [trackIndex] → [stepDiv, ...]

  function renderLanes(tracks){
    const root = $('lanes'); root.innerHTML = ''; laneEls = [];
    tracks.forEach(t => {
      const lane = document.createElement('div'); lane.className = 'lane';

      const head = document.createElement('div'); head.className = 'head';
      const name = document.createElement('span'); name.className = 'name';
      name.textContent = '#' + t.sample;
      const meta = document.createElement('span'); meta.className = 'meta';
      meta.textContent = `${t.steps.length} steps · index ${t.index.join(',')} · `
                       + `notes ${t.notes.join(',')} · lvl ${t.level.join(',')}`;
      head.append(name, meta);

      const steps = document.createElement('div'); steps.className = 'steps';
      const els = [];
      t.steps.forEach(v => {
        const s = document.createElement('div');
        s.className = 'step' + (v ? ' on' : '');
        steps.appendChild(s); els.push(s);
      });

      lane.append(head, steps);
      root.appendChild(lane);
      laneEls.push(els);
    });
  }

  function moveCursor(trackIdx, stepIdx){
    const els = laneEls[trackIdx]; if(!els) return;
    els.forEach((el, k) => el.classList.toggle('cursor', k === stepIdx));
  }

  function compile(){
    try {
      const tracks = transpile(getCode());
      renderLanes(tracks);
      return tracks;
    } catch(e){
      setStatus(e.message, true);
      return null;
    }
  }

  let loadingStarted = false;

  async function ensureSamples(){
    if(Audio.ready()) return true;
    if(loadingStarted) return false;       // already loading, ignore re-clicks
    loadingStarted = true;
    setStatus('loading…');
    try {
      const info = await Audio.load('turboSamplesWeb');
      setStatus(`ready · ${info.files} samples across ${info.folders} folders (loaded on demand)`);
      return true;
    } catch(e){
      loadingStarted = false;              // allow retry
      setStatus(`sample load failed: ${e.message}`, true);
      return false;
    }
  }

  $('play').addEventListener('click', async () => {
    await Tone.start();                    // unlock audio on user gesture
    const ok = await ensureSamples();
    if(!ok) return;
    const tracks = compile(); if(!tracks) return;
    Audio.prefetch(tracks);                // load just the samples this pattern uses
    // warn about tracks whose folder has no samples
    const missing = tracks.filter(t => Audio.count(t.sample) === 0).map(t => '#'+t.sample);
    Tone.Transport.bpm.value = +$('bpm').value || 110;
    Scheduler.schedule(tracks, moveCursor);
    Tone.Transport.start();
    let msg = `playing · ${tracks.length} tracks · `
            + `realign every ${Scheduler.realignSteps(tracks)} steps`;
    if(missing.length) msg += ` · no samples for ${missing.join(' ')}`;
    setStatus(msg);
  });

  $('stop').addEventListener('click', () => {
    Tone.Transport.stop();
    Scheduler.clear();
    laneEls.flat().forEach(el => el.classList.remove('cursor'));
    setStatus('stopped');
  });

  $('bpm').addEventListener('input', () => {
    Tone.Transport.bpm.value = +$('bpm').value || 110;
  });

  onCodeChange(() => { compile(); });

  // ── reference panels ──────────────────────────────────────────────
  function populateRhythmPanel(){
    const R = window.CoypuRhythms;
    const el = $('rhythmList'); if(!el || !R) return;
    const section = (label, items, render) =>
      `<div class="group">${label}</div>` +
      items.map(render).join('');
    el.innerHTML =
      section('generators', R.generators,
        g => `<div><span class="nm">N ${g}</span></div>`) +
      section('named (tiled to N, or asRhythm = 16)', R.namedRhythms,
        n => `<div><span class="nm">${n}</span></div>`) +
      (R.hexRhythms.length ? section('hexbeat presets', R.hexRhythms,
        n => `<div><span class="nm">${n}</span></div>`) : '');
  }

  async function populateSamplePanel(){
    const list = $('sampleList'); if(!list) return;
    try {
      const m = await Audio.peekManifest('turboSamplesWeb');
      const names = Object.keys(m).sort();
      list.innerHTML = names.map(f =>
        `<li><span class="nm">${f}</span><span class="ct">${m[f].length}</span></li>`
      ).join('');
      const total = names.reduce((n, f) => n + m[f].length, 0);
      const hint = $('samplesHint');
      if(hint) hint.textContent = `· ${names.length} folders, ${total} files`;
    } catch(e){
      list.innerHTML = `<li class="muted">couldn't load list</li>`;
    }
  }

  populateRhythmPanel();
  populateSamplePanel();

  // initial render (no audio until first play)
  compile();

})();
