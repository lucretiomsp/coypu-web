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

  let laneEls = [];   // [trackIndex] → [stepDiv, ...]

  function renderLanes(tracks){
    const root = $('lanes'); root.innerHTML = ''; laneEls = [];
    tracks.forEach(t => {
      const lane = document.createElement('div'); lane.className = 'lane';

      const head = document.createElement('div'); head.className = 'head';
      const name = document.createElement('span'); name.className = 'name';
      name.textContent = '#' + t.sample;
      const meta = document.createElement('span'); meta.className = 'meta';
      meta.textContent = `${t.steps.length} steps · notes ${t.notes.join(',')} · `
                       + `dur ${t.durs.join(',')} · lvl ${t.level.join(',')}`;
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
      const tracks = transpile($('code').value);
      renderLanes(tracks);
      return tracks;
    } catch(e){
      setStatus(e.message, true);
      return null;
    }
  }

  $('play').addEventListener('click', async () => {
    await Tone.start();                 // unlock audio on user gesture
    if(!Audio.ready()) Audio.buildKit();
    const tracks = compile(); if(!tracks) return;
    Tone.Transport.bpm.value = +$('bpm').value || 110;
    Scheduler.schedule(tracks, moveCursor);
    Tone.Transport.start();
    setStatus(`playing · ${tracks.length} tracks · `
            + `realign every ${Scheduler.realignSteps(tracks)} steps`);
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

  $('code').addEventListener('input', () => { compile(); });

  // initial render (no audio until first play)
  compile();

})();
