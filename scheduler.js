/* ════════════════════ Polymetric scheduler ════════════════════
   One Tone.Transport.scheduleRepeat per track at "16n".
   steps[] drives WHEN a track fires; notes/level advance per HIT
   (a separate counter), each cycling at its own length independently
   of the rhythm length. Patterns realign only at their LCM.
   Calls onStep(trackIndex, stepIndex, time) so the UI can draw a cursor.
   Exposes window.CoypuScheduler.                                       */
(function (global) {

  const A = global.CoypuAudio;
  let scheduled = [];

  function clear(){
    scheduled.forEach(id => Tone.Transport.clear(id));
    scheduled = [];
  }

  function schedule(tracks, onStep){
    clear();
    tracks.forEach((t, idx) => {
      let step = 0, hit = 0;     // step = rhythm position; hit = nth active event
      const id = Tone.Transport.scheduleRepeat((time) => {
        const i = step % t.steps.length;
        if(t.steps[i]){
          const note  = t.notes[hit % t.notes.length];
          const level = t.level[hit % t.level.length];
          A.voiceFor(t.sample)(time, note, level);
          hit++;
        }
        if(onStep) Tone.Draw.schedule(() => onStep(idx, i, time), time);
        step++;
      }, "16n");
      scheduled.push(id);
    });
  }

  // least common multiple of all track lengths → when everything realigns
  function realignSteps(tracks){
    const gcd = (a,b) => b ? gcd(b, a%b) : a;
    const lcm = (a,b) => a/gcd(a,b)*b;
    return tracks.map(t => t.steps.length).reduce(lcm, 1);
  }

  global.CoypuScheduler = { schedule, clear, realignSteps };

})(window);
