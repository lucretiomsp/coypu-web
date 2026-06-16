/* ════════════════════ Audio (Tone.js samples) ════════════════════
   Loads audio files described by samples/manifest.json:
     { "kick": ["a.wav","b.wav",...], "snare": [...], ... }
   A track named #kick maps to folder "kick"; index n selects the
   n-th file in that folder (positional, alphabetical — matches the
   manifest order). Index wraps within the folder's length.

   Exposes window.CoypuAudio:
     load(basePath)            -> Promise, fetches manifest + buffers
     folders()                 -> [folderName, ...]
     count(folder)             -> number of samples in a folder
     play(folder, idx, time, level, note)
     ready()                   -> bool                                */
(function (global) {

  let manifest = null;          // { folder: [filename, ...] }
  let players  = null;          // Tone.Players keyed "folder/idx"
  let isReady  = false;
  let base     = 'samples';     // base path, no trailing slash

  const key = (folder, idx) => `${folder}/${idx}`;

  async function load(basePath){
    base = (basePath || 'samples').replace(/\/+$/, '');
    // 1. fetch the manifest (GitHub Pages can't list dirs, so we need it)
    const res = await fetch(`${base}/manifest.json`, { cache: 'no-cache' });
    if(!res.ok) throw new Error(`manifest.json not found at ${base}/ (${res.status})`);
    manifest = await res.json();

    // 2. build the url map: one entry per file, keyed "folder/idx".
    //    Use raw filenames — Tone/the browser encodes once on fetch.
    const urls = {};
    for(const folder of Object.keys(manifest)){
      manifest[folder].forEach((file, idx) => {
        urls[key(folder, idx)] = `${base}/${folder}/${file}`;
      });
    }

    // 3. load buffers in small batches so we don't overwhelm the
    //    server. GitHub Pages drops connections (ERR_HTTP2_PROTOCOL_ERROR)
    //    when hit with hundreds of parallel requests. We settle each
    //    load (success or failure) and keep going so one bad/missing
    //    file can't mute everything. Players.add(name, url, cb) loads
    //    the url and fires cb when ready.
    players = new Tone.Players().toDestination();
    const entries = Object.entries(urls);
    const BATCH = 8;                       // concurrent loads at a time
    let ok = 0, failed = [];

    const loadOne = ([k, url]) => new Promise((resolve) => {
      let done = false;
      const finish = (good) => { if(done) return; done = true; good ? ok++ : failed.push(url); resolve(); };
      try {
        players.add(k, url, () => finish(true));
      } catch(e){ finish(false); return; }
      // safety timeout so a stalled request can't hang the batch forever
      setTimeout(() => finish(players.has(k)), 15000);
    });

    for(let i = 0; i < entries.length; i += BATCH){
      await Promise.all(entries.slice(i, i + BATCH).map(loadOne));
    }

    if(failed.length) console.warn(`coypu: ${failed.length} samples failed to load`, failed.slice(0, 10));
    isReady = true;
    return { folders: Object.keys(manifest).length,
             files: entries.length, loaded: ok, failed: failed.length };
  }

  function count(folder){
    return manifest && manifest[folder] ? manifest[folder].length : 0;
  }
  function folders(){ return manifest ? Object.keys(manifest) : []; }

  function play(folder, idx, time, level, note){
    if(!isReady || !manifest || !manifest[folder]) return;  // unknown track → silent
    const n = manifest[folder].length;
    const i = ((idx % n) + n) % n;                          // wrap, handle negatives
    const k = key(folder, i);
    if(!players.has(k)) return;                             // buffer failed to load → silent
    const p = players.player(k);
    p.volume.value = Tone.gainToDb(level == null ? 0.5 : level);
    // note → playback rate: 60 = original, +12 = 2x (up octave), -12 = 0.5x.
    // pitch and duration shift together (no time-stretch), like a sampler.
    p.playbackRate = Math.pow(2, ((note == null ? 60 : note) - 60) / 12);
    p.start(time);
  }

  const ready = () => isReady;

  global.CoypuAudio = { load, play, count, folders, ready };

})(window);
