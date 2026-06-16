/* ════════════════════ Coypu base rhythms ════════════════════
   Base patterns transcribed verbatim from Coypu's Integer.extension.st.
   A named rhythm of length N tiles its base pattern (i rem size).
   Exposes window.CoypuRhythms for the other modules.                 */
(function (global) {

  // base patterns from Integer.extension.st
  const BASE = {
    adowa:[0,0,0,1,0,1,0,1], sikyi:[0,0,0,1,0,1,0,1],
    aksak:[1,0,1,0,0,0,1,0,0,0],
    trueAksak:[1,0,1,0,1,0,1,0,0,1,0,1,0],
    banda:[1,0,1,1,0,1,1,0],
    bembe:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],
    bomba:[1,0,0,1,1,1,1,0],
    bossa:[1,0,0,1,0,0,1,0,0,1,0,0,1,0,0,0],
    claveSon:[1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0],
    cumbiaClave:[1,0,0,0,1,0,1,0,1,0,0,0,1,0,1,0],
    gahu:[1,0,0,1,0,0,1,0,0,0,1,0,0,0,1,0],
    plena:[1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0],
    rumba:[1,0,0,1,0,0,0,1,0,0,1,0,1,0,0,0],
    shiko:[1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0],
    soukous:[1,0,0,1,0,0,1,0,0,0,1,1,0,0,0,0],
    tresillo:[1,0,0,1,0,0,1,0],
    tumbao:[1,0,0,1,1,0,1,0],
  };

  // hexbeat one-shot rhythms (stored as hex strings)
  const HEXRHYTHM = {
    jungleKick:'88000000', jungleRim:'00145145', jungleSnare:'00820820',
  };

  const tile = (base, n) => Array.from({length:n}, (_,i) => base[i % base.length]);

  // Integer >> downbeats / upbeats / quavers  (i is 1-based, "i rem 4")
  const downbeats = n => Array.from({length:n}, (_,k) => (((k+1)%4)===1)?1:0);
  const upbeats   = n => Array.from({length:n}, (_,k) => (((k+1)%4)===3)?1:0);
  const quavers   = n => Array.from({length:n}, (_,k) => (((k+1)%4)===1||((k+1)%4)===3)?1:0);
  const trigs     = n => Array(n).fill(1);   // semiquavers / trigs
  const rests     = n => Array(n).fill(0);

  function hexbeat(hex){
    const out=[];
    for(const ch of hex){
      const v=parseInt(ch,16); if(Number.isNaN(v)) continue;
      out.push((v>>3)&1,(v>>2)&1,(v>>1)&1,v&1);
    }
    return out;
  }

  global.CoypuRhythms = {
    BASE, HEXRHYTHM, tile, downbeats, upbeats, quavers, trigs, rests, hexbeat,
  };

})(window);
