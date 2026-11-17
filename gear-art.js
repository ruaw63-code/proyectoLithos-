/* ProyectoLithos · ARTE DE EQUIPO (cascos, armaduras, amuletos, botas y el set Mod)
   Dibuja cada pieza en un canvas (con degradados, brillos y bordes) y la devuelve como imagen (data URL, con caché).
   window.GEARART.icon(clave, colorDeRareza, px) → 'data:image/png;base64,…'   ·  window.GEARART.keys */
(function () {
  'use strict';
  var OL = '#14141f', cache = {};
  function lg(c, x0, y0, x1, y1, st) { var g = c.createLinearGradient(x0, y0, x1, y1); st.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function rg(c, x, y, r0, r1, st) { var g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach(function (s) { g.addColorStop(s[0], s[1]); }); return g; }
  function P(c, f) { c.beginPath(); f(c); }
  function fs(c, fill, w) { c.fillStyle = fill; c.fill(); c.lineWidth = w || 4; c.strokeStyle = OL; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  function rivet(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r || 2.2, 0, 7); c.fillStyle = col || '#e8eef5'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = OL; c.stroke(); }
  function shine(c, f, a) { c.save(); c.globalAlpha = a || .5; c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); f(c); c.stroke(); c.restore(); }
  function glow(c, x, y, r, col) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(c, x, y, 0, r, [[0, col], [1, 'rgba(0,0,0,0)']]); c.globalAlpha = .75; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
  function gem(c, x, y, r, col) { P(c, function () { c.moveTo(x, y - r); c.lineTo(x + r * .85, y - r * .2); c.lineTo(x + r * .55, y + r * .9); c.lineTo(x - r * .55, y + r * .9); c.lineTo(x - r * .85, y - r * .2); c.closePath(); }); fs(c, lg(c, x - r, y - r, x + r, y + r, [[0, '#fff'], [.35, col], [1, '#1a1a2a']]), 2.5); shine(c, function () { c.moveTo(x - r * .4, y - r * .3); c.lineTo(x, y - r * .7); }, .8); }
  var METAL = function (c, a, b) { return lg(c, a, 0, b, 128, [[0, '#f1f5f9'], [.3, '#b4c0cc'], [.7, '#6b7886'], [1, '#3b4552']]); };
  var GOLD = function (c) { return lg(c, 20, 10, 108, 118, [[0, '#fff3b0'], [.35, '#f2b92e'], [.7, '#b9791a'], [1, '#6b3f0c']]); };
  function chainArc(c, x0, y0, x1, y1, sag) { c.save(); c.lineWidth = 4; c.strokeStyle = OL; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(64, sag, x1, y1); c.stroke(); c.lineWidth = 2; c.strokeStyle = '#d9c27a'; c.setLineDash([4, 3]); c.stroke(); c.restore(); }

  var D = {};
  /* ---------- CASCOS ---------- */
  D.helm_iron = function (c, k) {
    P(c, function () { c.moveTo(24, 92); c.bezierCurveTo(20, 40, 44, 14, 64, 14); c.bezierCurveTo(84, 14, 108, 40, 104, 92); c.lineTo(92, 100); c.lineTo(92, 78); c.lineTo(36, 78); c.lineTo(36, 100); c.closePath(); }); fs(c, METAL(c, 20, 108));
    P(c, function () { c.moveTo(24, 78); c.lineTo(104, 78); c.lineTo(104, 92); c.lineTo(24, 92); c.closePath(); }); fs(c, GOLD(c), 3);
    P(c, function () { c.moveTo(40, 56); c.lineTo(88, 56); c.lineTo(86, 70); c.lineTo(66, 70); c.lineTo(66, 98); c.lineTo(62, 98); c.lineTo(62, 70); c.lineTo(42, 70); c.closePath(); }); fs(c, '#0d0d16', 3);
    glow(c, 52, 63, 14, k); glow(c, 76, 63, 14, k);
    P(c, function () { c.moveTo(64, 14); c.lineTo(64, 56); }); c.lineWidth = 3; c.strokeStyle = 'rgba(20,20,31,.55)'; c.stroke();
    shine(c, function () { c.moveTo(34, 62); c.bezierCurveTo(34, 38, 48, 24, 60, 22); }, .7); [34, 94].forEach(function (x) { rivet(c, x, 85); }); rivet(c, 64, 85);
  };
  D.helm_hunter = function (c, k) {
    P(c, function () { c.moveTo(22, 108); c.bezierCurveTo(14, 60, 40, 22, 70, 8); c.bezierCurveTo(78, 34, 108, 50, 106, 108); c.lineTo(88, 100); c.lineTo(40, 100); c.closePath(); }); fs(c, lg(c, 20, 10, 108, 110, [[0, '#7fa35a'], [.5, '#4d6b34'], [1, '#2a3d1d']]));
    P(c, function () { c.ellipse(64, 70, 24, 28, 0, 0, 7); }); fs(c, '#10131a', 3); glow(c, 54, 66, 10, k); glow(c, 74, 66, 10, k);
    P(c, function () { c.moveTo(70, 8); c.bezierCurveTo(96, 0, 116, 20, 112, 40); c.bezierCurveTo(100, 26, 86, 22, 70, 8); }); fs(c, lg(c, 70, 0, 116, 40, [[0, '#fff'], [1, k]]), 3);
    P(c, function () { c.moveTo(36, 98); c.lineTo(92, 98); c.lineTo(88, 110); c.lineTo(40, 110); c.closePath(); }); fs(c, lg(c, 0, 98, 0, 110, [[0, '#8b5a2b'], [1, '#4a2c12']]), 3); rivet(c, 64, 104, 3, '#ffd166');
    shine(c, function () { c.moveTo(30, 84); c.bezierCurveTo(30, 54, 44, 34, 58, 24); }, .35);
  };
  D.helm_crown = function (c, k) {
    P(c, function () { c.moveTo(18, 96); c.lineTo(10, 38); c.lineTo(38, 62); c.lineTo(50, 22); c.lineTo(64, 56); c.lineTo(78, 22); c.lineTo(90, 62); c.lineTo(118, 38); c.lineTo(110, 96); c.closePath(); }); fs(c, GOLD(c));
    P(c, function () { c.moveTo(16, 82); c.lineTo(112, 82); c.lineTo(110, 100); c.lineTo(18, 100); c.closePath(); }); fs(c, lg(c, 0, 82, 0, 100, [[0, '#ffe27a'], [1, '#a8690f']]), 3);
    [[10, 36], [50, 20], [78, 20], [118, 36]].forEach(function (p) { rivet(c, p[0], p[1], 4.5, '#fff7d0'); }); gem(c, 64, 62, 12, k); gem(c, 34, 91, 6, '#ff5a7a'); gem(c, 94, 91, 6, '#4cc9f0'); gem(c, 64, 91, 6, '#5ad05a');
    shine(c, function () { c.moveTo(24, 70); c.lineTo(16, 48); }, .7);
  };
  /* ---------- ARMADURAS ---------- */
  function torso(c, fill, trim) {
    P(c, function () { c.moveTo(36, 14); c.lineTo(52, 22); c.quadraticCurveTo(64, 30, 76, 22); c.lineTo(92, 14); c.lineTo(122, 30); c.lineTo(112, 62); c.lineTo(98, 56); c.lineTo(98, 112); c.lineTo(30, 112); c.lineTo(30, 56); c.lineTo(16, 62); c.lineTo(6, 30); c.closePath(); }); fs(c, fill);
    P(c, function () { c.moveTo(30, 98); c.lineTo(98, 98); c.lineTo(98, 112); c.lineTo(30, 112); c.closePath(); }); fs(c, trim, 3);
  }
  D.armor_chain = function (c, k) {
    torso(c, lg(c, 0, 14, 0, 112, [[0, '#cdd6df'], [.5, '#8793a0'], [1, '#4a5560']]), lg(c, 0, 98, 0, 112, [[0, '#8b5a2b'], [1, '#3e240e']]));
    c.save(); P(c, function () { c.moveTo(36, 14); c.lineTo(92, 14); c.lineTo(122, 30); c.lineTo(112, 62); c.lineTo(98, 56); c.lineTo(98, 112); c.lineTo(30, 112); c.lineTo(30, 56); c.lineTo(16, 62); c.lineTo(6, 30); c.closePath(); }); c.clip();
    c.strokeStyle = 'rgba(20,20,31,.45)'; c.lineWidth = 1.6; for (var y = 18; y < 112; y += 8) for (var x = (y / 8 % 2) ? 4 : 8; x < 128; x += 8) { c.beginPath(); c.arc(x, y, 4, 0, Math.PI); c.stroke(); } c.restore();
    P(c, function () { c.moveTo(52, 22); c.quadraticCurveTo(64, 34, 76, 22); c.lineTo(70, 40); c.lineTo(58, 40); c.closePath(); }); fs(c, '#20242c', 2.5); rivet(c, 64, 105, 3, '#ffd166'); gem(c, 64, 62, 7, k);
  };
  D.armor_mantle = function (c, k) {
    P(c, function () { c.moveTo(64, 8); c.bezierCurveTo(30, 12, 22, 40, 14, 118); c.lineTo(40, 104); c.lineTo(52, 118); c.lineTo(64, 106); c.lineTo(76, 118); c.lineTo(88, 104); c.lineTo(114, 118); c.bezierCurveTo(106, 40, 98, 12, 64, 8); }); fs(c, lg(c, 14, 8, 114, 118, [[0, '#7a5cc2'], [.5, '#3c2a73'], [1, '#150f2e']]));
    P(c, function () { c.moveTo(40, 22); c.bezierCurveTo(46, 52, 82, 52, 88, 22); c.bezierCurveTo(78, 40, 50, 40, 40, 22); }); fs(c, '#0f0b22', 3);
    [[38, 60, 30, 112], [64, 50, 64, 106], [90, 60, 98, 112]].forEach(function (f) { c.beginPath(); c.moveTo(f[0], f[1]); c.quadraticCurveTo((f[0] + f[2]) / 2 + 4, (f[1] + f[3]) / 2, f[2], f[3]); c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 3; c.stroke(); });
    gem(c, 64, 40, 8, k); P(c, function () { c.arc(64, 40, 12, 0, 7); }); c.lineWidth = 3; c.strokeStyle = '#d9c27a'; c.stroke();
  };
  D.armor_plate = function (c, k) {
    torso(c, lg(c, 0, 14, 0, 112, [[0, '#f4f7fa'], [.35, '#aab6c3'], [.75, '#5f6c7a'], [1, '#2f3945']]), GOLD(c));
    P(c, function () { c.moveTo(64, 28); c.lineTo(88, 44); c.lineTo(84, 84); c.lineTo(64, 96); c.lineTo(44, 84); c.lineTo(40, 44); c.closePath(); }); fs(c, lg(c, 40, 28, 88, 96, [[0, '#dbe3ea'], [1, '#6a7785']]), 3);
    P(c, function () { c.moveTo(64, 28); c.lineTo(64, 96); }); c.lineWidth = 2.5; c.strokeStyle = 'rgba(20,20,31,.6)'; c.stroke(); gem(c, 64, 58, 9, k);
    [[22, 34], [106, 34], [40, 106], [88, 106]].forEach(function (p) { rivet(c, p[0], p[1], 3); }); shine(c, function () { c.moveTo(14, 32); c.lineTo(22, 52); }, .7);
  };
  /* ---------- AMULETOS ---------- */
  function pendant(c, k, inner) {
    chainArc(c, 22, 8, 106, 8, 72); P(c, function () { c.arc(64, 78, 30, 0, 7); }); fs(c, GOLD(c), 4); P(c, function () { c.arc(64, 78, 22, 0, 7); }); fs(c, rg(c, 58, 70, 2, 24, [[0, '#2b2f45'], [1, '#0d0f1c']]), 2.5);
    P(c, function () { c.moveTo(64, 38); c.lineTo(56, 50); c.lineTo(72, 50); c.closePath(); }); fs(c, GOLD(c), 2.5); inner(c, 64, 78);
  }
  D.am_vamp = function (c, k) { pendant(c, k, function (c, x, y) { glow(c, x, y, 22, '#ff3050'); P(c, function () { c.moveTo(x, y - 16); c.bezierCurveTo(x + 18, y + 2, x + 12, y + 18, x, y + 18); c.bezierCurveTo(x - 12, y + 18, x - 18, y + 2, x, y - 16); }); fs(c, lg(c, x - 14, y - 16, x + 14, y + 18, [[0, '#ff9aa8'], [.5, '#e01838'], [1, '#6a0016']]), 2.5); shine(c, function () { c.moveTo(x - 7, y - 2); c.lineTo(x - 3, y - 9); }, .8); }); };
  D.am_fortune = function (c, k) { pendant(c, k, function (c, x, y) { glow(c, x, y, 22, '#5ad05a'); [[0, -10], [10, 0], [0, 10], [-10, 0]].forEach(function (d) { c.beginPath(); c.arc(x + d[0], y + d[1], 8, 0, 7); c.fillStyle = lg(c, x - 14, y - 14, x + 14, y + 14, [[0, '#b8ff9a'], [1, '#1f8a2e']]); c.fill(); c.lineWidth = 2; c.strokeStyle = OL; c.stroke(); }); c.beginPath(); c.arc(x, y, 4, 0, 7); c.fillStyle = '#ffe27a'; c.fill(); c.stroke(); }); };
  D.am_power = function (c, k) { pendant(c, k, function (c, x, y) { glow(c, x, y, 24, k); gem(c, x, y - 2, 17, '#4cc9f0'); }); };
  D.am_speed = function (c, k) { pendant(c, k, function (c, x, y) { glow(c, x, y, 22, '#ffd84a'); c.lineWidth = 3; c.strokeStyle = '#ffe27a'; c.beginPath(); c.arc(x, y, 15, 0, 7); c.stroke(); P(c, function () { c.moveTo(x - 9, y - 13); c.lineTo(x + 9, y - 13); c.lineTo(x, y); c.lineTo(x + 9, y + 13); c.lineTo(x - 9, y + 13); c.lineTo(x, y); c.closePath(); }); fs(c, lg(c, x - 9, y - 13, x + 9, y + 13, [[0, '#fff3b0'], [1, '#e8a017']]), 2); }); };
  D.am_precision = function (c, k) { pendant(c, k, function (c, x, y) { glow(c, x, y, 22, '#ff5a5a'); c.lineWidth = 3; c.strokeStyle = '#ff6a6a'; [16, 9].forEach(function (r) { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); }); c.beginPath(); c.moveTo(x - 22, y); c.lineTo(x + 22, y); c.moveTo(x, y - 22); c.lineTo(x, y + 22); c.stroke(); c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fillStyle = '#fff'; c.fill(); }); };
  D.am_vigor = function (c, k) { pendant(c, k, function (c, x, y) { glow(c, x, y, 22, '#ff4060'); P(c, function () { c.moveTo(x, y + 16); c.bezierCurveTo(x - 26, y - 2, x - 14, y - 22, x, y - 8); c.bezierCurveTo(x + 14, y - 22, x + 26, y - 2, x, y + 16); }); fs(c, lg(c, x - 20, y - 16, x + 20, y + 16, [[0, '#ffb0c0'], [.5, '#e8203f'], [1, '#6a0016']]), 2.5); shine(c, function () { c.moveTo(x - 12, y - 4); c.lineTo(x - 8, y - 10); }, .8); }); };
  /* ---------- BOTAS ---------- */
  function boot(c, body, sole, cuff) {
    P(c, function () { c.moveTo(38, 10); c.lineTo(78, 10); c.lineTo(80, 70); c.bezierCurveTo(96, 74, 116, 84, 116, 100); c.lineTo(116, 112); c.lineTo(22, 112); c.lineTo(22, 100); c.lineTo(34, 70); c.closePath(); }); fs(c, body);
    P(c, function () { c.moveTo(20, 100); c.lineTo(118, 100); c.lineTo(118, 114); c.lineTo(20, 114); c.closePath(); }); fs(c, sole, 3);
    P(c, function () { c.moveTo(36, 10); c.lineTo(80, 10); c.lineTo(80, 24); c.lineTo(36, 24); c.closePath(); }); fs(c, cuff, 3);
  }
  D.boots_swift = function (c, k) {
    boot(c, lg(c, 0, 10, 0, 112, [[0, '#d19a5a'], [1, '#6e431c']]), '#2a1a0c', lg(c, 0, 10, 0, 24, [[0, '#f2e3c3'], [1, '#b89a68']]));
    P(c, function () { c.moveTo(34, 50); c.bezierCurveTo(10, 40, 4, 22, 8, 8); c.bezierCurveTo(22, 14, 30, 24, 40, 34); c.closePath(); }); fs(c, lg(c, 8, 8, 40, 50, [[0, '#fff'], [1, k]]), 2.5);
    P(c, function () { c.moveTo(36, 62); c.bezierCurveTo(16, 56, 10, 44, 14, 32); c.bezierCurveTo(26, 38, 32, 46, 40, 54); c.closePath(); }); fs(c, lg(c, 14, 32, 40, 62, [[0, '#fff'], [1, k]]), 2.5);
    rivet(c, 58, 40, 3, '#ffd166'); rivet(c, 58, 56, 3, '#ffd166');
  };
  D.boots_wind = function (c, k) {
    boot(c, lg(c, 0, 10, 0, 112, [[0, '#8fd0c4'], [1, '#2c6b66']]), '#16322f', lg(c, 0, 10, 0, 24, [[0, '#e6fffb'], [1, '#7cc9bd']]));
    c.strokeStyle = k; c.lineWidth = 4; c.lineCap = 'round'; [[8, 40, 40], [12, 56, 34], [6, 74, 44]].forEach(function (s) { c.beginPath(); c.moveTo(s[0], s[1]); c.bezierCurveTo(s[0] + 20, s[1] - 12, s[0] + s[2], s[1] + 10, s[0] + s[2] + 14, s[1] - 2); c.stroke(); });
    glow(c, 56, 84, 16, k); rivet(c, 58, 44, 3, '#fff');
  };
  D.boots_war = function (c, k) {
    boot(c, lg(c, 0, 10, 0, 112, [[0, '#c3ccd6'], [.5, '#76828f'], [1, '#363f4a']]), lg(c, 0, 100, 0, 114, [[0, '#585f69'], [1, '#1a1d24']]), GOLD(c));
    [[50, 30], [50, 50], [50, 70]].forEach(function (p, i) { P(c, function () { c.moveTo(34, p[1] - 5); c.lineTo(80, p[1] - 5); c.lineTo(80, p[1] + 5); c.lineTo(34, p[1] + 5); c.closePath(); }); fs(c, '#8b5a2b', 2); rivet(c, 72, p[1], 2.4, '#ffd166'); });
    P(c, function () { c.moveTo(108, 100); c.lineTo(126, 96); c.lineTo(112, 112); c.closePath(); }); fs(c, '#d9e1e8', 2.5); gem(c, 58, 17, 4, k); shine(c, function () { c.moveTo(42, 44); c.lineTo(42, 86); }, .6);
  };
  /* ---------- SET «MOD» (negro, dorado y núcleo de energía) ---------- */
  var BLK = function (c) { return lg(c, 0, 0, 128, 128, [[0, '#4a5163'], [.45, '#20242f'], [1, '#0b0d14']]); };
  var CY = '#59f3ff';
  D.mod_helm = function (c) {
    P(c, function () { c.moveTo(20, 96); c.bezierCurveTo(14, 38, 40, 12, 64, 12); c.bezierCurveTo(88, 12, 114, 38, 108, 96); c.lineTo(94, 106); c.lineTo(88, 84); c.lineTo(40, 84); c.lineTo(34, 106); c.closePath(); }); fs(c, BLK(c));
    P(c, function () { c.moveTo(60, 8); c.lineTo(68, 8); c.lineTo(72, 46); c.lineTo(56, 46); c.closePath(); }); fs(c, GOLD(c), 3);
    P(c, function () { c.moveTo(30, 54); c.lineTo(98, 54); c.lineTo(92, 74); c.lineTo(36, 74); c.closePath(); }); fs(c, '#06121a', 3); glow(c, 64, 64, 40, CY);
    P(c, function () { c.moveTo(36, 61); c.lineTo(92, 61); c.lineTo(90, 67); c.lineTo(38, 67); c.closePath(); }); c.fillStyle = '#d9fdff'; c.fill();
    [[22, 80, 34, 100], [106, 80, 94, 100]].forEach(function (s) { c.beginPath(); c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.lineWidth = 4; c.strokeStyle = '#f2b92e'; c.stroke(); });
    c.strokeStyle = '#f2b92e'; c.lineWidth = 2.5; for (var i = 0; i < 3; i++) { c.beginPath(); c.moveTo(42 + i * 7, 22 + i * 3); c.lineTo(34 + i * 6, 44); c.stroke(); c.beginPath(); c.moveTo(86 - i * 7, 22 + i * 3); c.lineTo(94 - i * 6, 44); c.stroke(); }
    shine(c, function () { c.moveTo(28, 52); c.bezierCurveTo(30, 34, 42, 22, 54, 18); }, .5);
  };
  D.mod_armor = function (c) {
    P(c, function () { c.moveTo(34, 12); c.lineTo(52, 20); c.quadraticCurveTo(64, 28, 76, 20); c.lineTo(94, 12); c.lineTo(124, 28); c.lineTo(114, 60); c.lineTo(98, 54); c.lineTo(98, 112); c.lineTo(30, 112); c.lineTo(30, 54); c.lineTo(14, 60); c.lineTo(4, 28); c.closePath(); }); fs(c, BLK(c));
    [[4, 28, 34, 12, 40, 40, 12, 50], [124, 28, 94, 12, 88, 40, 116, 50]].forEach(function (s) { P(c, function () { c.moveTo(s[0], s[1]); c.lineTo(s[2], s[3]); c.lineTo(s[4], s[5]); c.lineTo(s[6], s[7]); c.closePath(); }); fs(c, GOLD(c), 3); });
    P(c, function () { c.moveTo(64, 30); c.lineTo(84, 42); c.lineTo(84, 66); c.lineTo(64, 78); c.lineTo(44, 66); c.lineTo(44, 42); c.closePath(); }); fs(c, '#08141c', 3); glow(c, 64, 54, 34, CY);
    P(c, function () { c.moveTo(64, 38); c.lineTo(77, 46); c.lineTo(77, 62); c.lineTo(64, 70); c.lineTo(51, 62); c.lineTo(51, 46); c.closePath(); }); c.fillStyle = '#d9fdff'; c.fill(); c.lineWidth = 2; c.strokeStyle = CY; c.stroke();
    P(c, function () { c.moveTo(30, 96); c.lineTo(98, 96); c.lineTo(98, 112); c.lineTo(30, 112); c.closePath(); }); fs(c, GOLD(c), 3);
    c.strokeStyle = CY; c.lineWidth = 2.5; c.beginPath(); c.moveTo(64, 78); c.lineTo(64, 96); c.moveTo(44, 54); c.lineTo(34, 54); c.lineTo(34, 90); c.moveTo(84, 54); c.lineTo(94, 54); c.lineTo(94, 90); c.stroke();
    shine(c, function () { c.moveTo(12, 30); c.lineTo(20, 46); }, .6);
  };
  D.mod_amulet = function (c) {
    chainArc(c, 22, 8, 106, 8, 70); glow(c, 64, 80, 40, CY);
    c.save(); c.translate(64, 80); c.strokeStyle = '#f2b92e'; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 0, 40, 14, -.5, 0, 7); c.stroke(); c.rotate(.9); c.beginPath(); c.ellipse(0, 0, 40, 14, 0, 0, 7); c.stroke(); c.restore();
    P(c, function () { for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 - Math.PI / 2, x = 64 + 30 * Math.cos(a), y = 80 + 30 * Math.sin(a); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }); fs(c, GOLD(c), 4);
    P(c, function () { for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 - Math.PI / 2, x = 64 + 22 * Math.cos(a), y = 80 + 22 * Math.sin(a); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); }); fs(c, '#08141c', 2.5);
    gem(c, 64, 78, 15, CY); P(c, function () { c.moveTo(64, 38); c.lineTo(56, 48); c.lineTo(72, 48); c.closePath(); }); fs(c, GOLD(c), 2.5);
  };
  D.mod_boots = function (c) {
    boot(c, BLK(c), lg(c, 0, 100, 0, 114, [[0, '#59f3ff'], [1, '#1b7e8a']]), GOLD(c));
    glow(c, 70, 108, 40, CY);
    P(c, function () { c.moveTo(38, 30); c.lineTo(78, 30); c.lineTo(78, 40); c.lineTo(38, 40); c.closePath(); }); fs(c, GOLD(c), 2.5);
    c.strokeStyle = CY; c.lineWidth = 2.5; c.beginPath(); c.moveTo(48, 48); c.lineTo(48, 84); c.lineTo(86, 90); c.stroke(); gem(c, 58, 60, 5, CY);
    P(c, function () { c.moveTo(106, 98); c.lineTo(124, 90); c.lineTo(112, 112); c.closePath(); }); fs(c, GOLD(c), 2.5);
  };

  var MAP = { 'Casco de hierro': 'helm_iron', 'Yelmo del cazador': 'helm_hunter', 'Corona de guerra': 'helm_crown', 'Cota de malla': 'armor_chain', 'Manto sombrío': 'armor_mantle', 'Coraza reforzada': 'armor_plate',
    'Amuleto vampírico': 'am_vamp', 'Amuleto de fortuna': 'am_fortune', 'Amuleto de poder': 'am_power', 'Amuleto de celeridad': 'am_speed', 'Amuleto de precisión': 'am_precision', 'Amuleto de vigor': 'am_vigor',
    'Botas veloces': 'boots_swift', 'Botas del viento': 'boots_wind', 'Botas de guerra': 'boots_war', 'Casco Mod': 'mod_helm', 'Armadura Mod': 'mod_armor', 'Amuleto Mod': 'mod_amulet', 'Botas Mod': 'mod_boots' };
  function icon(key, col, px) {
    key = MAP[key] || key; if (!D[key]) return ''; var id = key + '|' + col + '|' + (px || 96); if (cache[id]) return cache[id];
    var cv = document.createElement('canvas'); cv.width = cv.height = px || 96; var c = cv.getContext('2d'); c.scale(cv.width / 128, cv.height / 128);
    c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 4; c.shadowOffsetY = 2;
    try { D[key](c, col || '#4cc9f0'); } catch (e) { return ''; } return (cache[id] = cv.toDataURL('image/png'));
  }
  window.GEARART = { icon: icon, keys: Object.keys(D), map: MAP, has: function (n) { return !!(MAP[n] || D[n]); } };
})();
