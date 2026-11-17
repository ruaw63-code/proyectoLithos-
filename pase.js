/* ProyectoLithos · PASE DE TEMPORADA (Temporada 1 · Fundadores)
   300 niveles. La experiencia (XP) se gana en todos los modos:
     · Reino: puntos que recoges por el mapa (recursos, bajas, jefes…) y tiempo jugado
     · Mazmorra: bajas, salas limpias, jefes y pisos
   Las recompensas se reclaman a mano. Todo se guarda en pref.ps (lithos-prefs).
   Ajusta aquí los números de balance si quieres que sea más rápido o más lento. */
(function () {
  'use strict';
  var MAXL = 300;
  var XP_SCORE = 0.12;            // XP del pase por cada punto de puntuación del Reino
  var XP_MIN = 8;                 // XP por cada minuto jugado en el Reino
  var need = function (l) { return 90 + 7 * l; };   // XP para pasar del nivel l-1 al nivel l
  var CUM = [0]; for (var i = 1; i <= MAXL; i++) CUM[i] = CUM[i - 1] + need(i);

  /* ---------- datos de apoyo (nombres) ---------- */
  var WNAME = { sword: ['🗡️', 'Espada'], axe: ['🪓', 'Hacha pesada'], spear: ['🔱', 'Lanza'], bow: ['🏹', 'Arco'], staff: ['🔮', 'Bastón mágico'], dagger: ['🔪', 'Daga veloz'], hammer: ['🔨', 'Martillo sísmico'], pistol: ['🔫', 'Pistola'], shotgun: ['💥', 'Escopeta'], wand: ['🪄', 'Varita'] };
  var WIDS = Object.keys(WNAME);
  var RARN = ['Común', 'Rara', 'Épica', 'Legendaria', 'Mítica', 'Divina', 'Fundador'];
  var KFX = {
    melt: ['🫠', 'Derretimiento', 'El enemigo se derrite en un charco que se encoge y desaparece'],
    chick: ['🐥', 'Pollito', 'El enemigo se convierte en un pollito que salta y se va a los segundos'],
    confetti: ['🎊', 'Confeti', 'El enemigo estalla en confeti de colores'],
    ghost: ['👻', 'Fantasma', 'Un fantasmita sube y se desvanece'],
    flower: ['🌸', 'Flor', 'Brota una flor que se marchita sola'],
    bubbles: ['🫧', 'Burbujas', 'El enemigo se vuelve burbujas que flotan y revientan']
  };
  var KFX_AT = { 5: 'melt', 20: 'chick', 45: 'confetti', 95: 'ghost', 145: 'flower', 185: 'bubbles' };
  var SKIN_AT = { 10: 'ps_aurora', 25: 'ps_magma', 40: 'ps_storm', 55: 'ps_crystal', 60: 'founder_c', 70: 'ps_sakura', 85: 'ps_neon', 115: 'ps_void', 135: 'ps_solar', 155: 'ps_jade', 160: 'founder_e', 175: 'ps_blood', 195: 'ps_aqua', 215: 'ps_royal', 235: 'ps_obsid', 240: 'founder_s', 255: 'ps_celeste', 275: 'ps_prisma', 300: 'founder_x' };
  var FDW_AT = { 100: 1, 200: 1 };
  var VT = ['r', 'g', 'x', 'd'];

  /* ---------- estado ---------- */
  function st() {
    var p = pref.ps;
    if (!p || typeof p !== 'object' || Array.isArray(p)) p = pref.ps = {};
    if (!(p.xp >= 0)) p.xp = 0;
    if (!p.cl || typeof p.cl !== 'object' || Array.isArray(p.cl)) p.cl = {};
    if (!p.cp || typeof p.cp !== 'object' || Array.isArray(p.cp)) p.cp = {};
    if (!p.v2) { p.v2 = 1; if (Object.keys(p.cl).length) { p.own = 1; for (var k in p.cl) p.cp[k] = 1; } } /* quien ya había reclamado todo antes de dividir el pase conserva ambos */
    if (!Array.isArray(pref.kfo)) pref.kfo = [];
    if (typeof pref.kfx !== 'string') pref.kfx = '';
    if (pref.kfx && pref.kfo.indexOf(pref.kfx) < 0) pref.kfx = '';
    return p;
  }
  var PRICE = 7500; /* 💎 que cuesta el pase: cámbialo aquí */
  function owned() { return !!st().own; }
  function buy() {
    if (owned()) return true;
    if (pref.dm < PRICE) { toast('Te faltan ' + (PRICE - pref.dm) + ' 💎 para el pase'); return false; }
    pref.dm -= PRICE; st().own = 1; savePref(); try { hud(); } catch (e) { } label(); toast('👑 ¡Pase Premium desbloqueado! Ya puedes reclamar lo Premium que llevas'); render(); return true;
  }
  function levelOf(xp) { var lo = 0, hi = MAXL; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (CUM[m] <= xp) lo = m; else hi = m - 1; } return lo; }
  function level() { return levelOf(st().xp); }
  function mult() { var f = (typeof FDSK !== 'undefined' && FDSK[pref.sk]) ? FDSK[pref.sk].xp || 0 : 0; return 1 + f; }

  /* ---------- recompensas por nivel ---------- */
  function dmAmt(l) { return Math.round((10 + l * 0.5) / 5) * 5; }
  function tierV(l) { return l <= 100 ? 0 : l <= 200 ? 1 : 2; }
  function rewards(l) {
    var m = l % 10, a = [];
    if (m === 0) { if (l % 20 === 0) { a.push({ k: 'vale', t: VT[(l / 20) % 4], i: tierV(l) }); a.push({ k: 'dm', n: dmAmt(l), f: 1 }); } else a.push({ k: 'dm', n: dmAmt(l) * 2, f: 1 }); }
    else if (m === 1 || m === 8) a.push({ k: 'dm', n: dmAmt(l), f: 1 });
    else if (m === 2) a.push({ k: 'dm', n: dmAmt(l) });
    else if (m === 5) a.push({ k: 'dm', n: dmAmt(l) * 2 });
    else if (m === 3) { var ids = ['sol', 'arc', 'hea', 'bom', 'mag', 'mix']; a.push({ k: 'pack', id: ids[((l - 3) / 10) % 6 | 0], n: l > 150 ? 2 : 1, f: 1 }); }
    else if (m === 4) a.push({ k: 'weapon', id: WIDS[((l - 4) / 10) % WIDS.length | 0], q: Math.min(4, 1 + Math.floor(l / 70)) });
    else if (m === 6) a.push({ k: 'soul', n: 100 + l * 3, f: 1 });
    else if (m === 7) a.push({ k: 'chest', id: (l % 50 === 47) ? 'v3' : 'v1' });
    else if (m === 9) a.push({ k: 'gear', fl: Math.max(1, Math.min(40, Math.ceil(l / 8))) });
    if (l % 50 === 0) a.push({ k: 'dm', n: 300 * (l / 50) });
    if (l === 250) a.push({ k: 'weapon', id: 'sword', q: 5, tag: 'divina' });
    if (KFX_AT[l]) a.push({ k: 'kfx', id: KFX_AT[l], f: l <= 45 ? 1 : 0 });
    if (SKIN_AT[l]) a.push({ k: 'skin', id: SKIN_AT[l], f: (l === 10 || l === 25) ? 1 : 0 });
    if (FDW_AT[l]) a.push({ k: 'fdw' });
    return a;
  }
  function freeR(l) { return rewards(l).filter(function (r) { return r.f; }); }
  function premR(l) { return rewards(l).filter(function (r) { return !r.f; }); }
  function skinObj(id) { for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) return SKINS[i]; return null; }
  function describe(r) {
    switch (r.k) {
      case 'dm': return ['💎', r.n + ' diamantes'];
      case 'vale': return [VK[r.t].i, 'Vale de ' + (r.t === 'x' ? 'XP' : VK[r.t].n.toLowerCase()) + ' · ' + TIERS[r.i][0]];
      case 'pack': var p = PK.filter(function (x) { return x.id === r.id; })[0]; return [p ? p.i : '⚔️', 'Paquete: ' + (p ? p.n : r.id) + (r.n > 1 ? ' ×' + r.n : '')];
      case 'chest': var c = CHESTS.filter(function (x) { return x.id === r.id; })[0]; return [c ? c.i : '🎁', (c ? c.n : 'Cofre') + ' (gratis)'];
      case 'weapon': var w = WNAME[r.id] || ['⚔️', r.id]; return [w[0], w[1] + ' · ' + RARN[r.q] + (r.tag ? ' (especial)' : '') + ' · para la mazmorra'];
      case 'gear': return ['🎁', 'Equipo de mazmorra (amuleto, anillo, etc.)'];
      case 'soul': return ['✨', r.n + ' Esencia de alma'];
      case 'kfx': return [KFX[r.id][0], 'Efecto de eliminación: ' + KFX[r.id][1]];
      case 'skin': var s = skinObj(r.id); return ['👑', 'Aspecto: ' + (s ? s.name : r.id)];
      case 'fdw': return ['🏺', 'ARMA DE FUNDADOR · sube de nivel dentro de la mazmorra'];
    }
    return ['?', '?'];
  }
  function isBig(l) { return !!(SKIN_AT[l] || FDW_AT[l] || KFX_AT[l] || l % 50 === 0 || l === 250); }

  /* ---------- entrega ---------- */
  function grantFdw() {
    var F = pref.fd = (pref.fd && typeof pref.fd === 'object') ? pref.fd : {};
    F.own = F.own || {}; F.seal = F.seal || {};
    var left = FD_IDS.filter(function (id) { return !F.own[id]; });
    if (!left.length) { gain(1500, 1); return '💎 +1500 (ya tenías todas las armas de Fundador)'; }
    var id = left[Math.random() * left.length | 0]; F.own[id] = 1; if (F.seal[id] === undefined) F.seal[id] = 0;
    savePref(); try { DG.fdSync(); } catch (e) { }
    var w = WNAME[id] || ['🏺', id]; return '🏺 ' + w[1] + ' del Fundador';
  }
  function grant(r) {
    switch (r.k) {
      case 'dm': gain(r.n, 1); return '💎 +' + r.n;
      case 'vale': giveV(r.t, r.i); return describe(r).join(' ');
      case 'pack': pref.pk[r.id] = (pref.pk[r.id] || 0) + r.n; return describe(r).join(' ');
      case 'chest': { var c = CHESTS.filter(function (x) { return x.id === r.id; })[0], d0 = pref.dm; pref.dm += c.p; var o = openChest(c); if (typeof o === 'string') { pref.dm = d0; return null; } return c.i + ' ' + o.join(', '); }
      case 'weapon': return DG.giveWeapon(r.id, r.q, null) ? (WNAME[r.id][0] + ' ' + WNAME[r.id][1] + ' ' + RARN[r.q]) : null;
      case 'gear': return DG.giveGear(r.fl, .1) ? '🎁 Equipo de mazmorra' : null;
      case 'soul': DG.addSouls(r.n); return '✨ +' + r.n;
      case 'kfx': if (pref.kfo.indexOf(r.id) < 0) pref.kfo.push(r.id); return KFX[r.id][0] + ' ' + KFX[r.id][1];
      case 'skin': if (pref.own.indexOf(r.id) < 0) { pref.own.push(r.id); } else { gain(300, 1); return '💎 +300 (ya tenías ese aspecto)'; } return '👑 ' + skinObj(r.id).name;
      case 'fdw': return grantFdw();
    }
    return null;
  }
  function pendingLevels() { var L = level(), a = [], S = st(); for (var l = 1; l <= L; l++) { if ((freeR(l).length && !S.cl[l]) || (S.own && premR(l).length && !S.cp[l])) a.push(l); } return a; }
  function needBag(rs) { var n = 0; rs.forEach(function (r) { if (r.k === 'weapon' || r.k === 'gear') n++; }); return n; }
  function claim(l, quiet) {
    var S = st(); if (l > level()) return null;
    var fr = freeR(l), pr = premR(l), parts = [];
    var doF = fr.length && !S.cl[l], doP = S.own && pr.length && !S.cp[l];
    if (doF) parts = parts.concat(fr); if (doP) parts = parts.concat(pr);
    if (!parts.length) { if (!quiet && !S.own && pr.length && !S.cp[l]) toast('🔒 La recompensa Premium necesita el pase'); return null; }
    var nb = needBag(parts);
    if (nb && (!window.DG || DG.bagFree() < nb)) { if (!quiet) toast('🎒 Tu mochila de la mazmorra está llena: libera espacio para reclamar el nivel ' + l); return false; }
    var out = [];
    for (var i = 0; i < parts.length; i++) { var t = grant(parts[i]); if (t) out.push(t); }
    if (doF) S.cl[l] = 1; if (doP) S.cp[l] = 1; savePref(); try { hud(); } catch (e) { } label();
    return out;
  }
  function claimAll() {
    var got = [], blocked = 0, p = pendingLevels();
    for (var i = 0; i < p.length; i++) { var o = claim(p[i], true); if (o === false) { blocked++; continue; } if (o) got = got.concat(o); }
    if (blocked) toast('🎒 ' + blocked + ' recompensa(s) esperan: tu mochila de la mazmorra está llena');
    if (got.length) toast('🎁 Pase: ' + got.slice(0, 6).join(' · ') + (got.length > 6 ? ' … (+' + (got.length - 6) + ')' : ''));
    render(); return got.length;
  }

  /* ---------- XP ---------- */
  var pend = 0, pendAt = 0, saveT = 0, lastLv = -1;
  function xp(n) {
    if (!(n > 0)) return;
    var S = st(), g = n * mult(), L0 = levelOf(S.xp);
    if (S.xp >= CUM[MAXL]) return;
    S.xp = Math.min(CUM[MAXL], S.xp + g); pend += g;
    var L1 = levelOf(S.xp);
    if (L1 > L0) { try { toast('🏅 ¡Nivel ' + L1 + ' del Pase!' + (L1 === MAXL ? ' ¡MÁXIMO!' : '')); } catch (e) { } savePref(); label(); if ($('pase') && $('pase').style.display === 'flex') render(); }
    var now = Date.now(); if (now - saveT > 8000) { saveT = now; savePref(); }
    flush(false);
  }
  function flush(force) {
    var now = Date.now(); if (!force && now - pendAt < 3500) return; if (pend < 1) return;
    pendAt = now; var e = $('pzx'); if (!e) { e = document.createElement('div'); e.id = 'pzx'; document.body.appendChild(e); }
    e.textContent = '🏅 +' + Math.round(pend) + ' XP del Pase'; e.style.opacity = '1'; pend = 0;
    clearTimeout(e._t); e._t = setTimeout(function () { e.style.opacity = '0'; }, 1800);
  }
  var lastScore = 0, lastS = 0, lastN = 0, mins = 0;
  function tick(n) {
    if (!lastN) lastN = n; var dt = n - lastN; lastN = n; if (dt > 0 && dt < 250) { mins += dt; if (mins >= 60000) { mins = 0; xp(XP_MIN); } }
    if (n - lastS < 1000) return; lastS = n;
    if (typeof P !== 'undefined' && P) { var d = P.score - lastScore; if (d > 0 && d < 6000) xp(d * XP_SCORE); lastScore = P.score; }
  }
  function label() {
    var e = $('psb'); if (!e) return; var L = level(), n = pendingLevels().length;
    e.textContent = 'Pase Nv.' + L + (n ? ' ●' : owned() ? '' : ' 🔒');
  }

  /* ---------- interfaz (pase horizontal estilo Fortnite) ---------- */
  var tab = 'r', sel = 0, animOn = 0;
  var QCOL = { c: '#b8c4b0', r: '#4cc9f0', e: '#c46cff', l: '#ffb020', m: '#ff5a7a', h: '#ff4fd8', f: '#ffe9a8' };
  function css() {
    if ($('pzcss')) $('pzcss').remove(); var s = document.createElement('style'); s.id = 'pzcss';
    s.textContent =
      '#pase{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.62)}' +
      '#pase .tpb{width:min(98vw,980px);max-height:96vh;display:flex;flex-direction:column;overflow:hidden}' +
      '.pzh{text-align:center;margin:0 0 4px}.pzh b{font-size:17px;color:#ffe27a}.pzh small{display:block;color:#ffe48a;font-size:11px}' +
      '.pzbar{height:12px;border:2px solid #1a1208;border-radius:8px;background:#2a2a2a;margin:3px 0;overflow:hidden}.pzbar i{display:block;height:100%;background:linear-gradient(90deg,#ffd84a,#ff9a30);transition:width .4s}' +
      '.pzt{display:flex;gap:6px;margin:3px 0}.pzt .b{flex:1;font-size:13px;padding:6px}.pzt .on{outline:3px solid #ffd84a}' +
      '.pzd{display:flex;gap:10px;align-items:center;background:rgba(0,0,0,.35);border:3px solid #ffb020;border-radius:12px;padding:8px;margin:4px 0;min-height:130px}' +
      '.pzd .pv{width:118px;height:118px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:10px;background:radial-gradient(circle,rgba(255,255,255,.16),rgba(0,0,0,.2))}.pzd .pv canvas{width:118px;height:auto;max-height:118px}.pzd .pv .pe{font-size:64px;line-height:1}' +
      '.pzd .pt{flex:1;font-size:12px;line-height:1.35;min-width:0}.pzd .pt b{font-size:15px;color:#ffe27a;display:block}.pzd .pt div{margin:2px 0}.pzd .pt .b{margin-top:6px;padding:7px 12px;font-size:13px}' +
      '.pzs{display:flex;gap:6px;align-items:stretch;min-height:0}' +
      '.pzlab{width:50px;flex:none;display:flex;flex-direction:column;font-size:10px;text-align:center;color:#ffe48a;line-height:1.1}.pzlab div{display:flex;align-items:center;justify-content:center}.pzlab div:nth-child(1){height:112px;color:#ffd84a}.pzlab div:nth-child(2){height:112px;color:#9fe39f}.pzlab div:nth-child(3){height:36px}' +
      '#pztr{flex:1;overflow-x:auto;overflow-y:hidden;white-space:nowrap;-webkit-overflow-scrolling:touch;padding-bottom:6px;cursor:grab}' +
      '.pcol{display:inline-block;width:92px;vertical-align:top;white-space:normal}' +
      '.pcp{height:104px;margin:4px 3px;box-sizing:border-box;border:2px dashed #3d4a3d;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:16px;opacity:.45;background:rgba(40,30,70,.35)}.pcp small{font-size:8px;color:#b9a6ff}' +
      '.pcf{height:104px;margin:4px 3px;box-sizing:border-box;border:3px solid #555;border-radius:10px;background:linear-gradient(#2c3c2c,#141c14);position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;overflow:hidden;transition:transform .15s}' +
      '.pcf.prem{background:linear-gradient(#4a3a14,#1e1606)}.pcf.sel{outline:3px solid #fff;transform:translateY(-4px)}.pcf.ok{box-shadow:0 0 12px 2px #5ad05a}.pcf.done{filter:grayscale(.75);opacity:.72}.pcf.big{background:linear-gradient(#4a3a1a,#1c1608)}' +
      '.pcf .pe{font-size:36px;line-height:1}.pcf canvas{width:80px;height:auto;max-height:70px}' +
      '.pcf small{font-size:10px;text-align:center;line-height:1.1;margin-top:3px;padding:0 3px;color:#eef5e6;max-height:24px;overflow:hidden}' +
      '.pcf .st{position:absolute;top:2px;right:3px;font-size:13px}.pcf .ex{position:absolute;top:2px;left:3px;font-size:10px;background:#000a;border-radius:6px;padding:0 4px;color:#ffe27a}' +
      '.pcb{position:relative;height:36px;display:flex;align-items:center;justify-content:center}' +
      '.pcb .ln{position:absolute;top:15px;height:7px;background:#2a2a2a;border:1px solid #111;box-sizing:border-box}.pcb .l1{left:0;width:50%}.pcb .l2{right:0;width:50%}.pcb .ln i{display:block;height:100%;background:linear-gradient(90deg,#ffd84a,#ff9a30)}' +
      '.pcb .nd{position:relative;z-index:1;min-width:32px;height:26px;padding:0 4px;box-sizing:border-box;border-radius:13px;background:#2a2a2a;border:3px solid #555;color:#999;font:bold 12px/20px Trebuchet MS,sans-serif;text-align:center}' +
      '.pcb .nd.on{background:#ffb020;border-color:#fff3a0;color:#3a2000}.pcb .nd.cur{box-shadow:0 0 0 3px #4cc9f0}' +
      '.pznav{display:flex;gap:6px;margin-top:6px}.pznav .b{flex:1;font-size:12px;padding:7px 4px}' +
      '.pk{display:flex;align-items:center;gap:8px;padding:8px;margin:5px 0;border:3px solid #3a3a3a;border-radius:10px;background:rgba(0,0,0,.28)}.pk i{font-size:26px;font-style:normal}.pk div{flex:1;font-size:12px}.pk.on{border-color:#ffd84a}' +
      '#pzfx{flex:1;overflow:auto;-webkit-overflow-scrolling:touch}' +
      '@media(max-height:560px){#pase .tpb{overflow-y:auto}#pase .tpb>*,#pzbody>*{flex-shrink:0}#pase .tpb h3{display:none}.pzd{min-height:0;padding:4px}.pzd .pv{width:64px;height:64px}.pzd .pv canvas{width:64px}.pzd .pv .pe{font-size:38px}.pzd .pt{font-size:11px}.pzbar{height:8px}.pzh b{font-size:14px}.pzt .b{padding:3px}.pznav .b{padding:4px}}' +
      '.pzbuy{display:flex;gap:8px;align-items:center;background:rgba(255,176,32,.14);border:2px solid #ffb020;border-radius:10px;padding:6px 8px;margin:4px 0;text-align:left;font-size:11px;color:#ffe8b0}.pzbuy span{flex:1}.pzbuy .b{flex:none;padding:8px 10px;font-size:13px}' +
      '#pzx{position:fixed;top:44px;right:8px;z-index:70;background:rgba(0,0,0,.65);color:#ffe27a;font:bold 12px Trebuchet MS,sans-serif;padding:5px 9px;border-radius:12px;opacity:0;transition:opacity .4s;pointer-events:none}';
    document.head.appendChild(s);
  }
  function build() {
    css(); if ($('pase')) return;
    var d = document.createElement('div'); d.id = 'pase';
    d.innerHTML = '<div class="tpb"><button class="b xb" id="pzc">✕ Cerrar</button><h3>🏅 Pase de Temporada</h3><div class="pzh" id="pzh"></div><div class="pzt" id="pzt"></div><div id="pzbody" style="display:flex;flex-direction:column;min-height:0;flex:1"></div></div>';
    document.body.appendChild(d);
    $('pzc').onclick = close; d.addEventListener('click', function (e) { if (e.target === d) close(); });
  }
  function previewSkin(cv, id) {
    var s = skinObj(id); if (!s) return; var o = ctx; try {
      ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 160, 160);
      ctx.translate(80, 92); ctx.scale(1.5, 1.5); ctx.rotate(-Math.PI / 2); dKing(performance.now(), 1, '#4f86e6', s);
    } catch (e) { } ctx = o;
  }
  function rcolor(r) {
    switch (r.k) {
      case 'fdw': return '#ffe27a'; case 'skin': var s = skinObj(r.id); return QCOL[s ? s.q : 'c'] || '#ccc';
      case 'vale': return TIERS[r.i][1]; case 'weapon': return ['#cfd8dc', '#4cc9f0', '#c46cff', '#ffb020', '#ff5a7a', '#b8fff0', '#ffe27a'][r.q] || '#ccc';
      case 'kfx': return '#c46cff'; case 'chest': return '#c28a2a'; case 'soul': return '#b9a6ff'; case 'dm': return '#4cc9f0'; default: return '#8fb08a';
    }
  }
  function shortLbl(r) {
    switch (r.k) {
      case 'dm': return r.n + ' 💎'; case 'vale': return 'Vale ' + TIERS[r.i][0]; case 'pack': return describe(r)[1].replace('Paquete: ', '');
      case 'chest': return r.id === 'v3' ? 'Cofre grande' : 'Cofre'; case 'weapon': return (WNAME[r.id] || ['', r.id])[1]; case 'gear': return 'Equipo';
      case 'soul': return r.n + ' ✨'; case 'kfx': return KFX[r.id][1]; case 'skin': var s = skinObj(r.id); return s ? s.name : r.id; case 'fdw': return 'Arma de Fundador';
    } return '';
  }
  function visual(r, canvasW) {
    var el, now = performance.now();
    if (r.k === 'vale' || r.k === 'chest' || r.k === 'skin') {
      el = document.createElement('canvas'); el._r = r;
      if (r.k === 'vale') drawTicket(el, r.t, r.i, now); else if (r.k === 'chest') drawChestImg(el, r.id, now); else { el.width = el.height = 160; previewSkin(el, r.id); }
    } else {
      el = document.createElement('div'); el.className = 'pe';
      el.textContent = r.k === 'dm' ? '💎' : r.k === 'weapon' ? (WNAME[r.id] || ['⚔️'])[0] : r.k === 'pack' ? describe(r)[0] : r.k === 'gear' ? '🎁' : r.k === 'soul' ? '✨' : r.k === 'kfx' ? KFX[r.id][0] : r.k === 'fdw' ? '🏺' : '❓';
    }
    return el;
  }
  function mainOf(rs) { var pr = ['fdw', 'skin', 'kfx']; for (var i = 0; i < pr.length; i++) for (var j = 0; j < rs.length; j++) if (rs[j].k === pr[i]) return rs[j]; return rs[0]; }
  function header() {
    var S = st(), L = level(), h = $('pzh'), lo = CUM[L], hi = L >= MAXL ? CUM[MAXL] : CUM[L + 1], pc = L >= MAXL ? 100 : Math.floor((S.xp - lo) / Math.max(1, hi - lo) * 100), m = mult();
    h.innerHTML = '<b>Temporada 1 · Fundadores</b><small>Nivel ' + L + ' / ' + MAXL + (L >= MAXL ? ' · ¡COMPLETADO!' : ' · ' + Math.floor(S.xp - lo) + ' / ' + (hi - lo) + ' XP') + (m > 1 ? ' · bonus de aspecto ×' + m.toFixed(2) : '') + '</small><div class="pzbar"><i style="width:' + pc + '%"></i></div>';
    if (!owned()) { var bb = document.createElement('div'); bb.className = 'pzbuy'; bb.innerHTML = '<span>🎁 El carril GRATIS ya es tuyo. 👑 El carril PREMIUM (arriba) se desbloquea con el pase; lo que acumules queda guardado.</span>'; var bt2 = document.createElement('button'); bt2.className = 'b'; bt2.textContent = '👑 Premium · ' + PRICE + ' 💎'; bt2.onclick = buy; bb.appendChild(bt2); h.appendChild(bb); }
    var t = $('pzt'); t.innerHTML = '';
    [['r', '🎁 Recompensas'], ['e', '✨ Efectos de eliminación']].forEach(function (x) { var b = document.createElement('button'); b.className = 'b' + (tab === x[0] ? ' on' : ''); b.textContent = x[1]; b.onclick = function () { tab = x[0]; render(); }; t.appendChild(b); });
  }
  var selR = 'f';
  function fillDetail() {
    var box = $('pzd'); if (!box) return; var l = sel || 1, L = level(), S = st(), fr = freeR(l), pr = premR(l);
    var rs = selR === 'p' ? pr : fr; if (!rs.length) { rs = fr.length ? fr : pr; selR = fr.length ? 'f' : 'p'; }
    var main = mainOf(rs), rc = selR === 'p' ? '#ffd84a' : rcolor(main);
    var canF = fr.length && !S.cl[l] && l <= L, canP = pr.length && !S.cp[l] && l <= L && owned(), lockP = pr.length && !S.cp[l] && !owned();
    box.style.borderColor = rc; box.innerHTML = '';
    var pv = document.createElement('div'); pv.className = 'pv'; pv.appendChild(visual(main)); box.appendChild(pv);
    var pt = document.createElement('div'); pt.className = 'pt';
    var h = document.createElement('b'); h.textContent = 'Nivel ' + l + (l > L ? ' · 🔒 Bloqueado' : (canF || canP) ? ' · ¡Disponible!' : lockP ? ' · 👑 Premium bloqueado' : ' · ✔ Reclamado'); h.style.color = rc; pt.appendChild(h);
    function sect(t, arr, col, done) { if (!arr.length) return; var hd = document.createElement('div'); hd.style.cssText = 'font-size:10px;letter-spacing:1px;margin-top:3px;color:' + col; hd.textContent = t + (done ? ' · ✔ reclamado' : ''); pt.appendChild(hd);
      arr.forEach(function (r) { var d = describe(r), line = document.createElement('div'); line.textContent = d[0] + ' ' + d[1]; if (r === main) line.style.fontWeight = 'bold'; pt.appendChild(line); }); }
    sect('🎁 GRATIS', fr, '#9fe39f', !!S.cl[l]); sect('👑 PREMIUM', pr, '#ffd84a', !!S.cp[l]);
    var sk = rs.filter(function (r) { return r.k === 'skin'; })[0]; if (sk && SKFX[sk.id]) { var f = document.createElement('div'); f.style.color = '#9fe0ff'; f.textContent = '✨ ' + SKFX[sk.id]; pt.appendChild(f); }
    var fd = rs.filter(function (r) { return r.k === 'fdw'; })[0]; if (fd) { var f2 = document.createElement('div'); f2.style.color = '#ffe27a'; f2.textContent = 'Sube hasta Nv.20 al matar enemigos con ella en la mazmorra.'; pt.appendChild(f2); }
    if (canF || canP) { var b = document.createElement('button'); b.className = 'b'; b.textContent = '🎁 Reclamar' + (canF && canP ? ' todo' : canP ? ' premium' : ' gratis'); b.onclick = function () { var o = claim(l); if (o && o.length) toast('🎁 ' + o.join(' · ')); render(); }; pt.appendChild(b); }
    if (lockP && l <= L) { var b2 = document.createElement('button'); b2.className = 'b'; b2.textContent = '👑 Desbloquear Premium · ' + PRICE + ' 💎'; b2.onclick = buy; pt.appendChild(b2); }
    if (l > L) { var w = document.createElement('div'); w.style.color = '#9aa'; w.textContent = 'Te faltan ' + Math.max(0, Math.ceil(CUM[l] - S.xp)) + ' XP para el nivel ' + l + '.'; pt.appendChild(w); }
    box.appendChild(pt);
  }
  function card(l, rs, row, L, S) {
    var f = document.createElement('div');
    if (!rs.length) { f.className = 'pcp'; f.innerHTML = '<small>—</small>'; return f; }
    var main = mainOf(rs), done = row === 'p' ? !!S.cp[l] : !!S.cl[l], locked = row === 'p' && !owned(), ok = !done && l <= L && !locked;
    f.className = 'pcf' + (row === 'p' ? ' prem' : '') + (done ? ' done' : ok ? ' ok' : '') + (isBig(l) && rs.some(function (r) { return r.k === 'skin' || r.k === 'fdw' || r.k === 'kfx'; }) ? ' big' : '') + (l === sel && row === selR ? ' sel' : '');
    f.style.borderColor = row === 'p' ? '#d9a82a' : rcolor(main); f.dataset.l = l; f.dataset.r = row;
    f.appendChild(visual(main)); var sm = document.createElement('small'); sm.textContent = shortLbl(main); f.appendChild(sm);
    if (rs.length > 1) { var ex = document.createElement('span'); ex.className = 'ex'; ex.textContent = '+' + (rs.length - 1); f.appendChild(ex); }
    var stt = document.createElement('span'); stt.className = 'st'; stt.textContent = done ? '✔' : ok ? '❗' : (locked ? '👑' : '🔒'); f.appendChild(stt);
    return f;
  }
  function renderTrack(body) {
    var L = level(), S = st(); if (!sel) sel = pendingLevels()[0] || Math.min(MAXL, L + 1);
    var det = document.createElement('div'); det.className = 'pzd'; det.id = 'pzd'; body.appendChild(det);
    var wrap = document.createElement('div'); wrap.className = 'pzs';
    var lab = document.createElement('div'); lab.className = 'pzlab'; lab.innerHTML = '<div>👑<br>PREMIUM</div><div>🎁<br>GRATIS</div><div>NIVEL</div>'; wrap.appendChild(lab);
    var tr = document.createElement('div'); tr.id = 'pztr';
    var curCol = null, selCol = null;
    for (var l = 1; l <= MAXL; l++) {
      var col = document.createElement('div'); col.className = 'pcol'; col.dataset.l = l;
      col.appendChild(card(l, premR(l), 'p', L, S)); col.appendChild(card(l, freeR(l), 'f', L, S));
      var bar = document.createElement('div'); bar.className = 'pcb';
      var fl = Math.max(0, Math.min(1, (S.xp - CUM[l - 1]) / need(l))), fr = l < MAXL ? Math.max(0, Math.min(1, (S.xp - CUM[l]) / need(l + 1))) : 0;
      bar.innerHTML = '<div class="ln l1"><i style="width:' + Math.max(0, Math.min(1, (fl - .5) * 2)) * 100 + '%"></i></div><div class="ln l2"><i style="width:' + Math.max(0, Math.min(1, fr * 2)) * 100 + '%"></i></div><div class="nd' + (l <= L ? ' on' : '') + (l === L ? ' cur' : '') + '">' + l + '</div>';
      col.appendChild(bar); tr.appendChild(col); if (l === L || (L === 0 && l === 1)) curCol = col; if (l === sel) selCol = col;
    }
    tr.addEventListener('click', function (e) { var f = e.target.closest && e.target.closest('.pcf'); if (!f || tr._drag) return; selectLevel(+f.dataset.l, f.dataset.r); });
    tr.addEventListener('wheel', function (e) { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { tr.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    var dx = 0, sx = 0, dn = false;
    tr.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; dn = true; sx = e.clientX; dx = tr.scrollLeft; tr._drag = false; });
    window.addEventListener('pointermove', function (e) { if (!dn) return; var d = e.clientX - sx; if (Math.abs(d) > 4) tr._drag = true; tr.scrollLeft = dx - d; });
    window.addEventListener('pointerup', function () { dn = false; setTimeout(function () { tr._drag = false; }, 30); });
    wrap.appendChild(tr); body.appendChild(wrap);
    var nav = document.createElement('div'); nav.className = 'pznav';
    function nb(t, f) { var b = document.createElement('button'); b.className = 'b'; b.textContent = t; b.onclick = f; nav.appendChild(b); return b; }
    nb('◀', function () { tr.scrollBy({ left: -tr.clientWidth * .8, behavior: 'smooth' }); });
    nb('📍 Mi nivel', function () { goTo(Math.max(1, L)); });
    nb('⭐ Próximo premio', function () { var n = 0; for (var q = Math.max(1, sel || L) + 1; q <= MAXL; q++) if (isBig(q)) { n = q; break; } if (n) { goTo(n); selectLevel(n); } });
    nb('▶', function () { tr.scrollBy({ left: tr.clientWidth * .8, behavior: 'smooth' }); });
    var n0 = pendingLevels().length, ow = owned(), ca = nb(n0 ? '🎁 Reclamar todo (' + n0 + ')' : !ow ? '👑 Premium · ' + PRICE + ' 💎' : 'Nada por reclamar', function () { if (pendingLevels().length) claimAll(); else if (!owned()) buy(); }); ca.style.flex = '1.6'; if (ow && !n0) ca.style.opacity = '.5';
    body.appendChild(nav);
    fillDetail(); body._tr = tr; body._cur = selCol || curCol;
  }
  function goTo(l) { var tr = $('pztr'); if (!tr) return; var c = tr.querySelector('.pcol[data-l="' + l + '"]'); if (c) tr.scrollTo({ left: Math.max(0, c.offsetLeft - tr.offsetLeft - tr.clientWidth / 2 + 46), behavior: 'smooth' }); }
  function selectLevel(l, row) {
    sel = l; if (row) selR = row; var tr = $('pztr'); if (tr) { var o = tr.querySelector('.pcf.sel'); if (o) o.classList.remove('sel'); var n = tr.querySelector('.pcf[data-l="' + l + '"][data-r="' + selR + '"]') || tr.querySelector('.pcf[data-l="' + l + '"]'); if (n) n.classList.add('sel'); }
    fillDetail();
  }
  function animLoop() {
    if (!animOn) return; var e = $('pase'); if (!e || e.style.display !== 'flex' || tab !== 'r') { animOn = 0; return; }
    var cv = document.querySelector('#pzd .pv canvas'); if (cv && cv._r) { var r = cv._r, n = performance.now(); try { if (r.k === 'vale') drawTicket(cv, r.t, r.i, n); else if (r.k === 'chest') drawChestImg(cv, r.id, n); else if (r.k === 'skin') previewSkin(cv, r.id); } catch (x) { } }
    requestAnimationFrame(animLoop);
  }
  function render() {
    build(); header(); var body = $('pzbody'), tr0 = $('pztr'), keep = tr0 ? tr0.scrollLeft : -1; body.innerHTML = '';
    if (tab === 'e') { var fx = document.createElement('div'); fx.id = 'pzfx'; body.appendChild(fx); renderFx(fx); return; }
    renderTrack(body); var tr = $('pztr');
    if (keep >= 0) tr.scrollLeft = keep; else if (body._cur) tr.scrollLeft = Math.max(0, body._cur.offsetLeft - tr.offsetLeft - tr.clientWidth / 2 + 46);
    if (!animOn) { animOn = 1; requestAnimationFrame(animLoop); }
  }
  function renderFx(box) {
    var none = document.createElement('div'); none.className = 'pk' + (!pref.kfx ? ' on' : '');
    none.innerHTML = '<i>🚫</i><div><b>Sin efecto</b><br>Los enemigos desaparecen como siempre.</div>'; var nb = document.createElement('button'); nb.className = 'b'; nb.textContent = pref.kfx ? 'Quitar' : '✔'; nb.onclick = function () { pref.kfx = ''; savePref(); render(); }; none.appendChild(nb); box.appendChild(none);
    Object.keys(KFX).forEach(function (id) {
      var own = pref.kfo.indexOf(id) >= 0, at = 0; for (var l in KFX_AT) if (KFX_AT[l] === id) at = +l;
      var r = document.createElement('div'); r.className = 'pk' + (pref.kfx === id ? ' on' : ''); r.innerHTML = '<i>' + KFX[id][0] + '</i><div><b>' + KFX[id][1] + '</b><br>' + KFX[id][2] + (own ? '' : '<br><span style="color:#ffb020">Se consigue en el nivel ' + at + ' del Pase</span>') + '</div>';
      if (own) { var b = document.createElement('button'); b.className = 'b'; b.textContent = pref.kfx === id ? '✔ Equipado' : 'Equipar'; b.onclick = function () { pref.kfx = pref.kfx === id ? '' : id; savePref(); render(); }; r.appendChild(b); }
      else { var s = document.createElement('span'); s.textContent = '🔒'; r.appendChild(s); }
      box.appendChild(r);
    });
    var n = document.createElement('div'); n.className = 'vd'; n.style.margin = '8px 4px'; n.textContent = 'El efecto se ve en tus bajas del Reino y de la mazmorra. Solo es visual: desaparece solo a los pocos segundos y no estorba.'; box.appendChild(n);
  }
  function open() { build(); $('pase').style.display = 'flex'; tab = 'r'; sel = 0; selR = 'f'; var b = $('pzbody'); if (b) b.innerHTML = ''; render(); }
  function close() { var e = $('pase'); if (e) e.style.display = 'none'; animOn = 0; label(); }

  window.PASE = {
    xp: xp, tick: tick, open: open, close: close, level: level, rewards: rewards, claim: claim, claimAll: claimAll,
    grant: grant, unlockPremium: function () { st().own = 1; savePref(); label(); }, free: freeR, prem: premR, max: MAXL, need: need, cum: CUM, pending: pendingLevels, describe: describe, label: label, state: st, kfx: KFX, price: function () { return PRICE; }, owned: owned, buy: buy, setXp: function (v) { st().xp = Math.max(0, Math.min(CUM[MAXL], v | 0)); savePref(); label(); }
  };
  function init() { try { st(); label(); } catch (e) { } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setTimeout(init, 400);
})();
