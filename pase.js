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
    if (!Array.isArray(pref.kfo)) pref.kfo = [];
    if (typeof pref.kfx !== 'string') pref.kfx = '';
    if (pref.kfx && pref.kfo.indexOf(pref.kfx) < 0) pref.kfx = '';
    return p;
  }
  function levelOf(xp) { var lo = 0, hi = MAXL; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (CUM[m] <= xp) lo = m; else hi = m - 1; } return lo; }
  function level() { return levelOf(st().xp); }
  function mult() { var f = (typeof FDSK !== 'undefined' && FDSK[pref.sk]) ? FDSK[pref.sk].xp || 0 : 0; return 1 + f; }

  /* ---------- recompensas por nivel ---------- */
  function dmAmt(l) { return Math.round((10 + l * 0.5) / 5) * 5; }
  function tierV(l) { return l <= 100 ? 0 : l <= 200 ? 1 : 2; }
  function rewards(l) {
    var m = l % 10, a = [];
    if (m === 0) { if (l % 20 === 0) a.push({ k: 'vale', t: VT[(l / 20) % 4], i: tierV(l) }); else a.push({ k: 'dm', n: dmAmt(l) * 2 }); }
    else if (m === 1 || m === 2 || m === 8) a.push({ k: 'dm', n: dmAmt(l) });
    else if (m === 5) a.push({ k: 'dm', n: dmAmt(l) * 2 });
    else if (m === 3) { var ids = ['sol', 'arc', 'hea', 'bom', 'mag', 'mix']; a.push({ k: 'pack', id: ids[((l - 3) / 10) % 6 | 0], n: l > 150 ? 2 : 1 }); }
    else if (m === 4) a.push({ k: 'weapon', id: WIDS[((l - 4) / 10) % WIDS.length | 0], q: Math.min(4, 1 + Math.floor(l / 70)) });
    else if (m === 6) a.push({ k: 'soul', n: 100 + l * 3 });
    else if (m === 7) a.push({ k: 'chest', id: (l % 50 === 47) ? 'v3' : 'v1' });
    else if (m === 9) a.push({ k: 'gear', fl: Math.max(1, Math.min(40, Math.ceil(l / 8))) });
    if (l % 50 === 0) a.push({ k: 'dm', n: 300 * (l / 50) });
    if (l === 250) a.push({ k: 'weapon', id: 'sword', q: 5, tag: 'divina' });
    if (KFX_AT[l]) a.push({ k: 'kfx', id: KFX_AT[l] });
    if (SKIN_AT[l]) a.push({ k: 'skin', id: SKIN_AT[l] });
    if (FDW_AT[l]) a.push({ k: 'fdw' });
    return a;
  }
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
  function pendingLevels() { var L = level(), a = []; for (var l = 1; l <= L; l++) if (!st().cl[l]) a.push(l); return a; }
  function needBag(rs) { var n = 0; rs.forEach(function (r) { if (r.k === 'weapon' || r.k === 'gear') n++; }); return n; }
  function claim(l, quiet) {
    var S = st(); if (l > level() || S.cl[l]) return null;
    var rs = rewards(l), nb = needBag(rs);
    if (nb && (!window.DG || DG.bagFree() < nb)) { if (!quiet) toast('🎒 Tu mochila de la mazmorra está llena: libera espacio para reclamar el nivel ' + l); return false; }
    var out = [];
    for (var i = 0; i < rs.length; i++) { var t = grant(rs[i]); if (t) out.push(t); }
    S.cl[l] = 1; savePref(); try { hud(); } catch (e) { } label();
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
    e.textContent = 'Pase Nv.' + L + (n ? ' ●' : '');
  }

  /* ---------- interfaz ---------- */
  var tab = 'r';
  function css() {
    if ($('pzcss')) return; var s = document.createElement('style'); s.id = 'pzcss';
    s.textContent =
      '#pase{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6)}' +
      '#pase .tpb{width:min(96vw,520px);max-height:94vh;display:flex;flex-direction:column;overflow:hidden}' +
      '.pzh{text-align:center;margin:2px 0 6px}.pzh b{font-size:18px;color:#ffe27a}.pzh small{display:block;color:#ffe48a;font-size:11px}' +
      '.pzbar{height:14px;border:2px solid #1a1208;border-radius:8px;background:#2a2a2a;margin:4px 0;overflow:hidden}.pzbar i{display:block;height:100%;background:linear-gradient(90deg,#ffd84a,#ff9a30);transition:width .4s}' +
      '.pzt{display:flex;gap:6px;margin:4px 0}.pzt .b{flex:1;font-size:13px;padding:6px}.pzt .on{outline:3px solid #ffd84a}' +
      '#pzl{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;padding:2px 2px 8px;min-height:120px}' +
      '.pr{display:flex;align-items:center;gap:8px;padding:6px 8px;margin:5px 0;border:3px solid #3a3a3a;border-radius:10px;background:rgba(0,0,0,.28)}' +
      '.pr.ok{border-color:#5ad05a;background:rgba(40,90,40,.4)}.pr.done{opacity:.55}.pr.big{border-color:#ffb020;background:linear-gradient(90deg,rgba(90,60,10,.55),rgba(0,0,0,.25))}' +
      '.pr.cur{box-shadow:0 0 0 3px #4cc9f0}.pn{min-width:44px;text-align:center;font-weight:bold;font-size:13px;color:#ffe27a}' +
      '.pi{flex:1;font-size:12px;line-height:1.3}.pi div{margin:1px 0}.pi canvas{width:60px;height:60px;display:block;float:left;margin-right:6px}' +
      '.pa{min-width:78px;text-align:center}.pa .b{padding:6px 8px;font-size:12px}.pa span{font-size:11px;color:#9aa}' +
      '.pk{display:flex;align-items:center;gap:8px;padding:8px;margin:5px 0;border:3px solid #3a3a3a;border-radius:10px;background:rgba(0,0,0,.28)}.pk i{font-size:26px;font-style:normal}.pk div{flex:1;font-size:12px}.pk.on{border-color:#ffd84a}' +
      '#pzx{position:fixed;top:44px;right:8px;z-index:70;background:rgba(0,0,0,.65);color:#ffe27a;font:bold 12px Trebuchet MS,sans-serif;padding:5px 9px;border-radius:12px;opacity:0;transition:opacity .4s;pointer-events:none}';
    document.head.appendChild(s);
  }
  function build() {
    css(); if ($('pase')) return;
    var d = document.createElement('div'); d.id = 'pase';
    d.innerHTML = '<div class="tpb"><button class="b xb" id="pzc">✕ Cerrar</button><h3>🏅 Pase de Temporada</h3><div class="pzh" id="pzh"></div><div class="pzt" id="pzt"></div><div id="pzl"></div><button class="b" id="pza" style="width:100%;margin-top:6px"></button></div>';
    document.body.appendChild(d);
    $('pzc').onclick = close; d.addEventListener('click', function (e) { if (e.target === d) close(); });
  }
  function previewSkin(cv, id) {
    var s = skinObj(id); if (!s) return; var o = ctx; try {
      ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, 160, 160);
      ctx.translate(80, 92); ctx.scale(1.5, 1.5); ctx.rotate(-Math.PI / 2); dKing(performance.now(), 1, '#4f86e6', s); 
    } catch (e) { } ctx = o;
  }
  function header() {
    var S = st(), L = level(), h = $('pzh'), lo = CUM[L], hi = L >= MAXL ? CUM[MAXL] : CUM[L + 1], pc = L >= MAXL ? 100 : Math.floor((S.xp - lo) / Math.max(1, hi - lo) * 100);
    var m = mult();
    h.innerHTML = '<b>Temporada 1 · Fundadores</b><small>Nivel ' + L + ' / ' + MAXL + (L >= MAXL ? ' · ¡COMPLETADO!' : ' · ' + Math.floor(S.xp - lo) + ' / ' + (hi - lo) + ' XP') + (m > 1 ? ' · bonus de aspecto ×' + m.toFixed(2) : '') + '</small><div class="pzbar"><i style="width:' + pc + '%"></i></div><small>Gana XP en todos los modos: puntos del Reino (recursos, bajas, jefes), tiempo jugado y la mazmorra.</small>';
    var t = $('pzt'); t.innerHTML = '';
    [['r', '🎁 Recompensas'], ['e', '✨ Efectos de eliminación']].forEach(function (x) { var b = document.createElement('button'); b.className = 'b' + (tab === x[0] ? ' on' : ''); b.textContent = x[1]; b.onclick = function () { tab = x[0]; render(); }; t.appendChild(b); });
    var n = pendingLevels().length, a = $('pza');
    if (tab === 'r') { a.style.display = 'block'; a.textContent = n ? '🎁 Reclamar todo (' + n + ')' : 'Nada por reclamar'; a.style.opacity = n ? '1' : '.5'; a.onclick = function () { if (n) claimAll(); }; } else a.style.display = 'none';
  }
  function render() {
    build(); header(); var box = $('pzl'), keep = box.scrollTop; box.innerHTML = '';
    if (tab === 'e') { renderFx(box); return; }
    var L = level(), S = st(), first = 0, curRow = null;
    for (var l = 1; l <= MAXL; l++) {
      var rs = rewards(l), done = !!S.cl[l], ok = !done && l <= L, row = document.createElement('div');
      row.className = 'pr' + (done ? ' done' : ok ? ' ok' : '') + (isBig(l) ? ' big' : '') + (l === L ? ' cur' : '');
      var n = document.createElement('div'); n.className = 'pn'; n.textContent = 'Nv ' + l; row.appendChild(n);
      var it = document.createElement('div'); it.className = 'pi';
      rs.forEach(function (r) { var d = describe(r), line = document.createElement('div'); line.textContent = d[0] + ' ' + d[1]; if (r.k === 'fdw' || r.k === 'skin' && /^founder/.test(r.id)) line.style.color = '#ffe27a'; if (r.k === 'skin') { var cv = document.createElement('canvas'); cv.width = cv.height = 160; it.appendChild(cv); cv._sid = r.id; } it.appendChild(line); });
      row.appendChild(it);
      var a = document.createElement('div'); a.className = 'pa';
      if (done) a.innerHTML = '<span>✔ Reclamado</span>'; else if (ok) { var b = document.createElement('button'); b.className = 'b'; b.textContent = 'Reclamar'; (function (ll) { b.onclick = function () { var o = claim(ll); if (o && o.length) toast('🎁 ' + o.join(' · ')); render(); }; })(l); a.appendChild(b); if (!first) first = l; } else a.innerHTML = '<span>🔒</span>';
      row.appendChild(a); box.appendChild(row); if (l === L || (L === 0 && l === 1)) curRow = row;
    }
    box.querySelectorAll('canvas').forEach(function (cv) { if (cv._sid) previewSkin(cv, cv._sid); });
    if (keep) box.scrollTop = keep; else if (curRow) box.scrollTop = Math.max(0, curRow.offsetTop - 90);
  }
  function renderFx(box) {
    var S = st(), none = document.createElement('div'); none.className = 'pk' + (!pref.kfx ? ' on' : '');
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
  function open() { build(); $('pase').style.display = 'flex'; tab = 'r'; $('pzl').scrollTop = 0; render(); }
  function close() { var e = $('pase'); if (e) e.style.display = 'none'; label(); }

  window.PASE = {
    xp: xp, tick: tick, open: open, close: close, level: level, rewards: rewards, claim: claim, claimAll: claimAll,
    max: MAXL, need: need, cum: CUM, pending: pendingLevels, describe: describe, label: label, state: st, kfx: KFX, setXp: function (v) { st().xp = Math.max(0, Math.min(CUM[MAXL], v | 0)); savePref(); label(); }
  };
  function init() { try { st(); label(); } catch (e) { } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  setTimeout(init, 400);
})();
