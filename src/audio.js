/* ════════════════════ Audio (Tone.js samples, lazy) ════════════════════
   Loads audio files described by manifest.json:
     { "kick": ["a.m4a","b.m4a",...], "snare": [...], ... }
   A track named #kick maps to folder "kick"; index n selects the
   n-th file in that folder (positional, alphabetical — matches the
   manifest order). Index wraps within the folder's length.

   LAZY LOADING: load() only fetches the manifest (instant). Each sample's
   audio buffer is fetched on demand the first time it's actually played,
   then cached so subsequent hits are instant. The very first trigger of a
   not-yet-loaded sample is skipped silently while it loads — in a looping
   pattern it starts sounding a cycle later. (Same behaviour as Strudel.)

   Exposes window.CoypuAudio:
     load(basePath)            -> Promise, fetches manifest only
     folders()                 -> [folderName, ...]
     count(folder)             -> number of samples in a folder
     play(folder, idx, time, level, note)
     ready()                   -> bool                                */
(function (global) {

  let manifest = null;          // { folder: [filename, ...] }
  let players  = null;          // Tone.Players, buffers added on demand
  let isReady  = false;
  let base     = 'samples';     // base path, no trailing slash

  // per-buffer load state, keyed "folder/idx":
  //   undefined = never requested, 'loading', 'loaded', 'failed'
  const state = {};

  const key = (folder, idx) => `${folder}/${idx}`;
  const urlFor = (folder, i) => `${base}/${folder}/${manifest[folder][i]}`;

  async function load(basePath){
    base = (basePath || 'samples').replace(/\/+$/, '');
    // fetch only the manifest — GitHub Pages can't list dirs, so we need it.
    // Audio buffers are loaded lazily, on first play (see ensureBuffer).
    const res = await fetch(`${base}/manifest.json`, { cache: 'no-cache' });
    if(!res.ok) throw new Error(`manifest.json not found at ${base}/ (${res.status})`);
    manifest = await res.json();
    players = new Tone.Players().toDestination();
    isReady = true;
    const files = Object.values(manifest).reduce((n,a)=>n+a.length, 0);
    return { folders: Object.keys(manifest).length, files, lazy: true };
  }

  // Kick off loading one buffer if we haven't already. Non-blocking:
  // returns nothing; play() just checks state on each hit.
  function ensureBuffer(folder, i){
    const k = key(folder, i);
    if(state[k]) return;                  // already loading / loaded / failed
    state[k] = 'loading';
    try {
      players.add(k, urlFor(folder, i), () => { state[k] = 'loaded'; });
    } catch(e){
      state[k] = 'failed';
    }
  }

  function count(folder){
    return manifest && manifest[folder] ? manifest[folder].length : 0;
  }
  function folders(){ return manifest ? Object.keys(manifest) : []; }

  // Fetch the manifest just to read folder names + counts (for the
  // reference panel), without setting up players or marking ready.
  // Safe to call before load(); reuses the manifest if already fetched.
  async function peekManifest(basePath){
    if(manifest) return manifest;
    const b = (basePath || base).replace(/\/+$/, '');
    const res = await fetch(`${b}/manifest.json`, { cache: 'no-cache' });
    if(!res.ok) throw new Error(`manifest.json not found at ${b}/ (${res.status})`);
    manifest = await res.json();
    return manifest;
  }

  // Prefetch exactly the buffers a set of tracks will use, so the pattern
  // is audible from the first cycle (no silent first hit) while still not
  // loading the hundreds of unused samples. Called by app.js after compile.
  function prefetch(tracks){
    if(!isReady || !manifest) return;
    for(const t of tracks){
      if(!manifest[t.sample]) continue;
      const n = manifest[t.sample].length;
      if(n === 0) continue;
      // load every index this track references via its index: array
      const idxs = (t.index && t.index.length) ? t.index : [0];
      for(const raw of idxs){
        const i = ((raw % n) + n) % n;
        ensureBuffer(t.sample, i);
      }
    }
  }

  function play(folder, idx, time, level, note){
    if(!isReady || !manifest || !manifest[folder]) return;  // unknown track → silent
    const n = manifest[folder].length;
    if(n === 0) return;
    const i = ((idx % n) + n) % n;                          // wrap, handle negatives
    const k = key(folder, i);

    if(state[k] !== 'loaded'){
      ensureBuffer(folder, i);   // start loading; this hit is silent
      return;                    // next time it fires (a cycle later) it'll play
    }
    const p = players.player(k);
    p.volume.value = Tone.gainToDb(level == null ? 0.5 : level);
    // note → playback rate: 60 = original, +12 = 2x (up octave), -12 = 0.5x.
    // pitch and duration shift together (no time-stretch), like a sampler.
    p.playbackRate = Math.pow(2, ((note == null ? 60 : note) - 60) / 12);
    p.start(time);
  }

  const ready = () => isReady;

  global.CoypuAudio = { load, play, count, folders, ready, prefetch, peekManifest };

})(window);
