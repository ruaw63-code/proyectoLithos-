/* Uso:  node subir-version.js 1.1.1 "qué cambió"
   Sube el número de versión en version.js, version.json y sw.js a la vez (el build sube de 1 en 1). */
const fs = require('fs');
const v = process.argv[2], n = process.argv.slice(3).join(' ') || '';
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.log('Uso: node subir-version.js 1.1.1 "qué cambió"'); process.exit(1); }
const j = JSON.parse(fs.readFileSync('version.json', 'utf8')), b = j.b + 1;
fs.writeFileSync('version.json', JSON.stringify({ v, b, n }) + '\n');
let s = fs.readFileSync('version.js', 'utf8'); s = s.replace(/var LOCAL = \{ v: '[^']*', b: \d+ \};/, "var LOCAL = { v: '" + v + "', b: " + b + ' };'); fs.writeFileSync('version.js', s);
let w = fs.readFileSync('sw.js', 'utf8'); w = w.replace(/lithos-v\d+/, 'lithos-v' + b); fs.writeFileSync('sw.js', w);
console.log('Versión ' + v + ' (build ' + b + ') lista. Sube: version.js, version.json, sw.js y los archivos que cambiaste.');
