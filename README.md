# coypu-web
A browser playground that transpiles [Coypu](https://lucretiomsp.github.io/musicwithpharo/coypuFloss/index.html) live-coding syntax into a polymetric step sequencer, played with [Tone.js](https://tonejs.github.io/).
## About Coypu and Pharo

[Coypu](https://github.com/lucretiomsp/Coypu) is a live-coding library for
[Pharo](https://pharo.org), created by Domenico Cipriani (lucretiomsp). It turns
the Pharo environment into a tool for programming music on-the-fly: you write
short, iconic statements that build rhythmic patterns and play them in real time.
Originally designed as a client for Symbolic Sound's Kyma, it was later extended
to drive OSC servers such as SuperCollider, Pure Data, and ChucK, plus MIDI
hardware and the SuperDirt engine. Its pattern syntax is heavily inspired by
TidalCycles and Mercury.

Pharo is a fully open-source, dynamic, pure object-oriented language in the
Smalltalk family, with an immersive live IDE — which is what makes on-the-fly
coding natural: you change a running program while it runs. Coypu leans into
that, and doubles as a friendly on-ramp to Smalltalk for people coming from
music rather than software.

## About this implementation

This project is **not** Coypu itself and does not run Pharo. It's a small
browser companion that reimplements a *subset* of Coypu's pattern syntax in
plain JavaScript and plays it with [Tone.js](https://tonejs.github.io/) over the
Web Audio API — no server, no install, just a static page.

The rhythm vocabulary here (the named patterns like `rumba`, `bossa`, `clave`,
and the generators `downbeats`, `hexbeat`, `asRhythm`) is transcribed from
Coypu's own source, so a statement like `#rumba asRhythm to: #snare` produces
the same step pattern it would in Pharo. The goal is a zero-setup way to try the
syntax and hear results in a browser, not a replacement for the real
environment. For the full system — synthesis, OSC, MIDI, the live Pharo IDE —
see the [Coypu repository](https://github.com/lucretiomsp/Coypu).

