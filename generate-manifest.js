#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const AUDIO_EXT = new Set(['.wav', '.mp3', '.ogg', '.flac', '.aac', '.m4a']);
const root = path.resolve(process.argv[2] || 'samples');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`not a directory: ${root}`);
  process.exit(1);
}
const manifest = {};
let folders = 0, files = 0;
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const folder = entry.name;
  const list = fs.readdirSync(path.join(root, folder))
    .filter(f => AUDIO_EXT.has(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (list.length === 0) continue;
  manifest[folder] = list;
  folders++; files += list.length;
}
const out = path.join(root, 'manifest.json');
fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${out}`);
console.log(`${folders} folders, ${files} files`);
for (const k of Object.keys(manifest).sort())
  console.log(`  ${k.padEnd(12)} ${manifest[k].length}`);
