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

    // 2. build the url map: one entry per file, keyed "folder/idx"
    const urls = {};
    for(const folder of Object.keys(manifest)){
      manifest[folder].forEach((file, idx) => {
        urls[key(folder, idx)] = `${base}/${folder}/${encodeURIComponent(file)}`;
      });
    }

    // 3. load every buffer into one Tone.Players; resolve when ready
    await new Promise((resolve) => {
      players = new Tone.Players(urls, resolve).toDestination();
    });

    isReady = true;
    return { folders: Object.keys(manifest).length,
             files: Object.values(manifest).reduce((n,a)=>n+a.length, 0) };
  }

  function count(folder){
    return manifest && manifest[folder] ? manifest[folder].length : 0;
  }
  function folders(){ return manifest ? Object.keys(manifest) : []; }

  function play(folder, idx, time, level, note){
    if(!isReady || !manifest || !manifest[folder]) return;  // unknown track → silent
    const n = manifest[folder].length;
    const i = ((idx % n) + n) % n;                          // wrap, handle negatives
    const p = players.player(key(folder, i));
    p.volume.value = Tone.gainToDb(level == null ? 0.5 : level);
    // note → playback rate: 60 = original, +12 = 2x (up octave), -12 = 0.5x.
    // pitch and duration shift together (no time-stretch), like a sampler.
    p.playbackRate = Math.pow(2, ((note == null ? 60 : note) - 60) / 12);
    p.start(time);
  }

  const ready = () => isReady;

  global.CoypuAudio = { load, play, count, folders, ready };

})(window);
