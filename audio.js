/* ════════════════════ Audio (Tone.js) ════════════════════
   Voice stand-ins built from Tone synths so the page runs standalone.
   To use real samples, replace buildKit() with Tone.Players and have
   voiceFor(name) return (time, note, level) => player.start(time).
   Exposes window.CoypuAudio.                                          */
(function (global) {

  let kitReady = false;
  const voices = {};

  function buildKit(){
    voices.bd = (() => {
      const s = new Tone.MembraneSynth({octaves:4, pitchDecay:.05}).toDestination();
      return (t, note, lvl) => {
        s.volume.value = Tone.gainToDb(lvl);
        s.triggerAttackRelease(Tone.Frequency(note,"midi"), "8n", t);
      };
    })();

    voices.snare = (() => {
      const s = new Tone.NoiseSynth({noise:{type:'white'},
        envelope:{attack:.001, decay:.13, sustain:0}}).toDestination();
      return (t, note, lvl) => {
        s.volume.value = Tone.gainToDb(lvl);
        s.triggerAttackRelease("16n", t);
      };
    })();

    voices.hat = (() => {
      const s = new Tone.MetalSynth({frequency:280,
        envelope:{attack:.001, decay:.05, release:.01},
        harmonicity:5.1, modulationIndex:32, resonance:4000, octaves:1.5}).toDestination();
      return (t, note, lvl) => {
        s.volume.value = Tone.gainToDb(lvl * 0.5);
        s.triggerAttackRelease("32n", t);
      };
    })();

    // generic fallback for any other track name
    voices._default = (() => {
      const s = new Tone.Synth().toDestination();
      return (t, note, lvl) => {
        s.volume.value = Tone.gainToDb(lvl);
        s.triggerAttackRelease(Tone.Frequency(note,"midi"), "16n", t);
      };
    })();

    kitReady = true;
  }

  const voiceFor = name => voices[name] || voices._default;
  const ready = () => kitReady;

  global.CoypuAudio = { buildKit, voiceFor, ready };

})(window);
