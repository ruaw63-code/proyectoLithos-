/* ProyectoLithos · CÓDIGOS DEL ADMINISTRADOR
   · Generador (solo desde la zona de comandos): arma una lista de recompensas y el servidor crea el código.
   · Canje: el jugador escribe el código en «🔐 Código de acceso» (necesita sesión iniciada).
   Los códigos viven en el servidor (se pueden limitar por usos y caducidad, y cada cuenta lo canjea una sola vez).
   Necesita la variable ADMIN_KEY en Render. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ELE = [['fire', '🔥 Fuego'], ['ice', '❄️ Hielo'], ['shock', '⚡ Rayo'], ['poison', '☠️ Veneno']];
  var QN = ['Común', 'Rara', 'Épica', 'Legendaria', 'Mítica', 'Divina', 'Fundador'];
  function opts(a) { return a.map(function (x) { return Array.isArray(x) ? x : [x, x]; }); }
  function skinList(fd) { try { return SKINS.filter(function (s) { return fd || !s.fd; }).map(function (s) { return [s.id, s.name + (s.fd ? ' (Fundador)' : '')]; }); } catch (e) { return []; } }
  function tSkinList() { try { return (typeof troopSkins === 'function' ? troopSkins() : SKINS).map(function (s) { return [s.id, s.name]; }); } catch (e) { return skinList(1); } }
  /* ---------- catálogo de recompensas ---------- */
  function cats() {
    var wp = []; try { wp = DG.wpList().map(function (a) { return [a[0], a[1] + ' ' + a[2]]; }); } catch (e) { }
    var pets = []; try { pets = DG.petList().map(function (a) { return [a[0], a[1] + ' ' + a[2]]; }); } catch (e) { }
    var chests = []; try { chests = CHESTS.map(function (c) { return [c.id, c.i + ' ' + c.n]; }); } catch (e) { }
    var packs = []; try { packs = PK.map(function (p) { return [p.id, p.i + ' ' + p.n]; }); } catch (e) { }
    var kfx = []; try { kfx = Object.keys(PASE.kfx).map(function (k) { return [k, PASE.kfx[k][0] + ' ' + PASE.kfx[k][1]]; }); } catch (e) { }
    var fdw = []; try { fdw = FD_IDS.map(function (k) { return [k, k]; }); } catch (e) { }
    var tiers = []; try { tiers = TIERS.map(function (t, i) { return [String(i), i + ' · ' + t[0]]; }); } catch (e) { }
    return [
      { id: 'dm', n: '💎 Diamantes', f: [{ k: 'n', l: 'Cantidad', t: 'num', d: 500 }] },
      { id: 'vale', n: '🎫 Vale', f: [{ k: 't', l: 'Tipo', t: 'sel', o: [['r', '🎫 Revivir'], ['g', '🪙 Oro'], ['x', '⭐ XP'], ['d', '💎 Diamantes']] }, { k: 'i', l: 'Rareza', t: 'sel', o: tiers }] },
      { id: 'pack', n: '🪖 Tropas (paquete)', f: [{ k: 'id', l: 'Paquete', t: 'sel', o: packs }, { k: 'n', l: 'Cantidad de paquetes', t: 'num', d: 1 }] },
      { id: 'chest', n: '🎁 Cofre (se abre gratis)', f: [{ k: 'id', l: 'Cofre', t: 'sel', o: chests }] },
      { id: 'skin', n: '👑 Aspecto de rey', f: [{ k: 'id', l: 'Aspecto', t: 'sel', o: skinList(1) }] },
      { id: 'tskin', n: '🛡️ Aspecto de tropas', f: [{ k: 'id', l: 'Aspecto', t: 'sel', o: tSkinList() }] },
      { id: 'weapon', n: '⚔️ Arma de mazmorra', f: [{ k: 'id', l: 'Arma', t: 'sel', o: wp }, { k: 'q', l: 'Calidad', t: 'sel', o: QN.map(function (q, i) { return [String(i), i + ' · ' + q]; }) }] },
      { id: 'gear', n: '🎽 Equipo de mazmorra', f: [{ k: 'fl', l: 'Nivel de piso (1-40)', t: 'num', d: 10 }, { k: 'n', l: 'Piezas', t: 'num', d: 1 }] },
      { id: 'mod', n: '🛡️ Equipo Mod', f: [{ k: 'id', l: 'Pieza', t: 'sel', o: [['all', 'Set completo (4 piezas)'], ['helm', 'Casco Mod'], ['armor', 'Armadura Mod'], ['amulet', 'Amuleto Mod'], ['boots', 'Botas Mod']] }] },
      { id: 'fdw', n: '🏺 Arma de Fundador', f: [{ k: 'id', l: 'Arma', t: 'sel', o: fdw }] },
      { id: 'pet', n: '🐾 Mascota de mazmorra', f: [{ k: 'id', l: 'Mascota', t: 'sel', o: pets }] },
      { id: 'soul', n: '✨ Esencia de alma', f: [{ k: 'n', l: 'Cantidad', t: 'num', d: 1000 }] },
      { id: 'rune', n: '🔮 Runas', f: [{ k: 'el', l: 'Elemento', t: 'sel', o: ELE }, { k: 'q', l: 'Calidad', t: 'sel', o: QN.slice(0, 6).map(function (q, i) { return [String(i), i + ' · ' + q]; }) }, { k: 'n', l: 'Cantidad', t: 'num', d: 3 }] },
      { id: 'dxp', n: '⭐ XP de mazmorra', f: [{ k: 'n', l: 'Cantidad', t: 'num', d: 500 }] },
      { id: 'psxp', n: '🏅 XP del Pase', f: [{ k: 'n', l: 'Cantidad', t: 'num', d: 1000 }] },
      { id: 'prem', n: '👑 Desbloquear Pase Premium', f: [] },
      { id: 'kfx', n: '✨ Efecto de eliminación', f: [{ k: 'id', l: 'Efecto', t: 'sel', o: kfx }] },
      { id: 'flag', n: '🧩 Marca oculta (no se ve en el juego)', f: [{ k: 'key', l: 'Nombre de la marca', t: 'text', d: 'vip' }, { k: 'val', l: 'Valor', t: 'text', d: '1' }] },
      { id: 'msg', n: '💬 Mensaje al canjear', f: [{ k: 't', l: 'Texto (hasta 200)', t: 'text', d: '¡Gracias por jugar!' }] }
    ];
  }
  function pName(list, id) { for (var i = 0; i < list.length; i++) if (list[i][0] === String(id)) return list[i][1]; return String(id); }
  function text(r) {
    try {
      var C = cats().filter(function (c) { return c.id === r.k; })[0]; if (!C) return r.k;
      var parts = C.f.map(function (f) { var v = r[f.k]; return f.t === 'sel' ? pName(f.o, v) : v; }); return C.n + (parts.length ? ': ' + parts.join(' · ') : '');
    } catch (e) { return String(r.k); }
  }

  /* ---------- aplicar recompensas al jugador ---------- */
  function queue(r) { pref.cq = Array.isArray(pref.cq) ? pref.cq : []; pref.cq.push(r); }
  function apply1(r, quiet) {
    var n = Math.max(1, Math.min(1e7, Math.floor(+r.n) || 1));
    switch (r.k) {
      case 'dm': gain(n, 1); return '💎 +' + n + ' diamantes';
      case 'vale': giveV(r.t, Math.max(0, Math.min(8, r.i | 0))); return '🎫 Vale ' + (VK[r.t] ? VK[r.t].n : r.t) + ' · ' + TIERS[Math.max(0, Math.min(8, r.i | 0))][0];
      case 'pack': pref.pk[r.id] = (pref.pk[r.id] || 0) + Math.min(n, 999); return '🪖 ' + pName(cats()[2].f[0].o, r.id) + ' ×' + Math.min(n, 999);
      case 'chest': return PASE.grant({ k: 'chest', id: r.id }) || '🎁 Cofre';
      case 'skin': if (SKINS.some(function (s) { return s.id === r.id; }) && pref.own.indexOf(r.id) < 0) pref.own.push(r.id); return '👑 Aspecto: ' + r.id;
      case 'tskin': if (!Array.isArray(pref.tow)) pref.tow = []; if (pref.tow.indexOf(r.id) < 0) pref.tow.push(r.id); return '🛡️ Aspecto de tropas: ' + r.id;
      case 'weapon': if (DG.giveWeapon(r.id, Math.max(0, Math.min(6, r.q | 0)), null)) return '⚔️ ' + r.id + ' ' + QN[r.q | 0]; if (!quiet) queue(r); return '⚔️ Arma pendiente (mochila llena)';
      case 'gear': { var ok = 0, k = Math.min(n, 20); for (var i = 0; i < k; i++) { if (DG.giveGear(Math.max(1, Math.min(40, r.fl | 0 || 10)), .1)) ok++; else { if (!quiet) queue({ k: 'gear', fl: r.fl, n: 1 }); } } return '🎽 Equipo ×' + ok + (ok < k ? ' (resto pendiente: mochila llena)' : ''); }
      case 'mod': { var gm = DG.giveMod(r.id), tot = r.id === 'all' ? 4 : 1; if (gm < tot && !quiet) { var rest = tot - gm; if (r.id === 'all') { var have = gm; ['helm', 'armor', 'amulet', 'boots'].slice(have).forEach(function (s) { queue({ k: 'mod', id: s }); }); } else queue(r); } return '🛡️ Equipo Mod ×' + gm + (gm < tot ? ' (resto pendiente: mochila llena)' : ''); }
      case 'fdw': { var F = pref.fd = (pref.fd && typeof pref.fd === 'object') ? pref.fd : {}; F.own = F.own || {}; F.seal = F.seal || {}; if (FD_IDS.indexOf(r.id) < 0) return null; F.own[r.id] = 1; if (F.seal[r.id] === undefined) F.seal[r.id] = 0; try { DG.fdSync(); } catch (e) { } return '🏺 Arma de Fundador: ' + r.id; }
      case 'pet': return DG.unlockPet(r.id) ? '🐾 Mascota: ' + r.id : null;
      case 'soul': DG.addSouls(n); return '✨ +' + n + ' esencia';
      case 'rune': return DG.runeAdd(r.el, Math.max(0, Math.min(5, r.q | 0)), n) ? '🔮 Runas ×' + n : null;
      case 'dxp': DG.xpAdd(n); return '⭐ +' + n + ' XP de mazmorra';
      case 'psxp': PASE.setXp(PASE.state().xp + n); return '🏅 +' + n + ' XP del pase';
      case 'prem': PASE.unlockPremium(); return '👑 Pase Premium desbloqueado';
      case 'kfx': if (pref.kfo.indexOf(r.id) < 0) pref.kfo.push(r.id); return '✨ Efecto de eliminación: ' + r.id;
      case 'flag': pref.flags = (pref.flags && typeof pref.flags === 'object') ? pref.flags : {}; pref.flags[String(r.key).slice(0, 30)] = String(r.val).slice(0, 60); return null;
      case 'msg': return '💬 ' + String(r.t).slice(0, 200);
    }
    return null;
  }
  function applyAll(list) {
    var out = []; list.forEach(function (r) { try { var t = apply1(r); if (t) out.push(t); } catch (e) { } });
    try { savePref(); hud(); setMenu(); if (window.PASE) PASE.label(); } catch (e) { } return out;
  }
  function retry() {
    if (!Array.isArray(pref.cq) || !pref.cq.length || !window.DG) return; var q = pref.cq; pref.cq = []; var got = [];
    q.forEach(function (r) { var t = null; try { t = apply1(r, true); } catch (e) { } if (t && !/pendiente/.test(t)) got.push(t); else pref.cq.push(r); });
    if (got.length) { try { savePref(); toast('🎁 Código: se entregó lo que estaba pendiente'); } catch (e) { } }
  }
  setInterval(retry, 60000); setTimeout(retry, 5000);

  /* ---------- canje ---------- */
  function redeem(code) {
    if (!window.ACC || !ACC.user()) return Promise.resolve({ ok: 0, msg: '🔒 Inicia sesión (👤 en el menú) para canjear códigos.' });
    return ACC.call('POST', '/redeem', { code: code }, 70000).then(function (r) {
      if (r.status === 200) { var lines = applyAll(r.rewards || []); try { AU.sfx('win'); } catch (e) { } try { ACC.dirty(); ACC.push(false, true); } catch (e) { } return { ok: 1, msg: '✅ ¡Código canjeado!' + (lines.length ? '\n' + lines.join('\n') : '') + (r.note ? '\n📝 ' + r.note : '') }; }
      if (r.status === 0) return { ok: 0, msg: '⚠️ ' + r.err };
      return { ok: 0, bad: r.status === 404, msg: '❌ ' + (r.err || 'No se pudo canjear') };
    });
  }

  /* ---------- generador (pantalla) ---------- */
  var cfg = { key: '', us: '1', dy: '0', co: '', no: '' }, items = [], out = '', msgT = '', cat = 'dm', last = null, list = null;
  function css() {
    if ($('cgcss')) return; var s = document.createElement('style'); s.id = 'cgcss';
    s.textContent = '#cgo{position:fixed;inset:0;z-index:95;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.75);padding:8px}#cgo .tpb{width:min(96vw,480px);max-height:96vh;overflow:auto;padding:10px}' +
      '.cgout{border:3px solid #ffd84a;border-radius:12px;background:rgba(0,0,0,.4);padding:8px;text-align:center;margin-bottom:8px}.cgout .big{font:bold 24px Trebuchet MS,sans-serif;letter-spacing:2px;color:#ffe27a;word-break:break-all;user-select:all;min-height:30px}.cgout small{display:block;color:#cfe;font-size:11px;white-space:pre-wrap;text-align:left;margin-top:4px}' +
      '.cgs{border:2px solid #4a5a3a;border-radius:10px;padding:8px;margin:6px 0;background:rgba(0,0,0,.22)}.cgs h4{margin:0 0 4px;font-size:13px;color:#ffe48a}#cgo input,#cgo select{width:100%;box-sizing:border-box;margin:3px 0;padding:8px;font-size:14px;border:3px solid #1a1208;border-radius:9px;background:#fff8e0;color:#2a1a08}' +
      '#cgo label{font-size:11px;color:#cfe;display:block;margin-top:4px}#cgo .b{width:100%;margin-top:5px;padding:9px;font-size:13px}.cgi{display:flex;gap:6px;align-items:center;font-size:12px;padding:4px 6px;margin:3px 0;border-radius:8px;background:rgba(255,255,255,.07)}.cgi span{flex:1}.cgi .b,#cgo .cgi .b{width:auto;margin:0;padding:3px 9px;flex:none}' +
      '.cgrow{display:flex;gap:6px}.cgrow>div{flex:1}';
    document.head.appendChild(s);
  }
  function mk(t, c, tx) { var e = document.createElement(t); if (c) e.className = c; if (tx !== undefined) e.textContent = tx; return e; }
  function grab() { var m = { 'cg-key': 'key', 'cg-us': 'us', 'cg-dy': 'dy', 'cg-co': 'co', 'cg-no': 'no' }; for (var id in m) { var e = $(id); if (e) cfg[m[id]] = e.value; } }
  function render() {
    grab(); css(); var o = $('cgo'); if (!o) { o = mk('div'); o.id = 'cgo'; document.body.appendChild(o); } o.style.display = 'flex'; o.innerHTML = '';
    var box = mk('div', 'tpb'); o.appendChild(box);
    var x = mk('button', 'b', '✕ Cerrar'); x.style.cssText = 'width:auto;float:right;margin:0;padding:6px 10px;background:#8a2a2a'; x.onclick = function () { o.style.display = 'none'; }; box.appendChild(x);
    box.appendChild(mk('h3', '', '🎟️ Generador de códigos'));
    /* arriba: el código */
    var ob = mk('div', 'cgout'); ob.appendChild(mk('div', '', out ? 'CÓDIGO GENERADO' : 'Aquí aparece tu código')); var big = mk('div', 'big', out || '— — —'); ob.appendChild(big);
    if (out) { var cp = mk('button', 'b', '📋 Copiar código'); cp.onclick = function () { try { navigator.clipboard.writeText(out).then(function () { msgT = '📋 Copiado'; render(); }); } catch (e) { msgT = 'Cópialo a mano'; render(); } }; ob.appendChild(cp); var cp2 = mk('button', 'b', '📤 Copiar mensaje para enviar'); cp2.onclick = function () { var tx = '🎁 Código de ProyectoLithos: ' + out + '\nCanjéalo en el menú → 🔐 Código de acceso (necesitas iniciar sesión).'; try { navigator.clipboard.writeText(tx).then(function () { msgT = '📋 Mensaje copiado'; render(); }); } catch (e) { } }; ob.appendChild(cp2); if (last) ob.appendChild(mk('small', '', last)); }
    ob.appendChild(mk('small', '', msgT)); box.appendChild(ob);
    /* configuración */
    var cf = mk('div', 'cgs'); cf.appendChild(mk('h4', '', '⚙️ Ajustes del código'));
    function fld(id, lab, type, val, ph) { cf.appendChild(mk('label', '', lab)); var i = mk('input'); i.id = id; i.type = type; i.value = val; if (ph) i.placeholder = ph; i.autocomplete = 'off'; cf.appendChild(i); return i; }
    var key = fld('cg-key', 'Clave de administrador (la variable ADMIN_KEY de Render)', 'password', cfg.key || localStorage.getItem('lithos-adm') || '');
    var r1 = mk('div', 'cgrow'); var d1 = mk('div'), d2 = mk('div'); r1.appendChild(d1); r1.appendChild(d2); cf.appendChild(r1);
    d1.appendChild(mk('label', '', 'Usos máximos (0 = ilimitado)')); var us = mk('input'); us.type = 'number'; us.id = 'cg-us'; us.value = cfg.us; d1.appendChild(us);
    d2.appendChild(mk('label', '', 'Caduca en días (0 = nunca)')); var dy = mk('input'); dy.type = 'number'; dy.id = 'cg-dy'; dy.value = cfg.dy; d2.appendChild(dy);
    var cu = fld('cg-co', 'Código propio (opcional, 4-24 letras/números)', 'text', cfg.co, 'ej. BIENVENIDO'); var no = fld('cg-no', 'Nota para ti (opcional)', 'text', cfg.no, 'ej. regalo para ADAM');
    box.appendChild(cf);
    /* abajo: constructor */
    var bd = mk('div', 'cgs'); bd.appendChild(mk('h4', '', '➕ Añadir recompensas')); var C = cats(), cur = C.filter(function (c) { return c.id === cat; })[0] || C[0];
    var sel = mk('select'); C.forEach(function (c) { var op = mk('option', '', c.n); op.value = c.id; if (c.id === cur.id) op.selected = true; sel.appendChild(op); }); sel.onchange = function () { cat = sel.value; render(); }; bd.appendChild(sel);
    var inp = {}; cur.f.forEach(function (f) {
      bd.appendChild(mk('label', '', f.l)); var e; if (f.t === 'sel') { e = mk('select'); f.o.forEach(function (a) { var op = mk('option', '', a[1]); op.value = a[0]; e.appendChild(op); }); } else { e = mk('input'); e.type = f.t === 'num' ? 'number' : 'text'; e.value = f.d !== undefined ? f.d : ''; }
      inp[f.k] = e; bd.appendChild(e);
    });
    var add = mk('button', 'b', '➕ Añadir a la lista'); add.style.background = '#2a7a3a'; add.onclick = function () { var r = { k: cur.id }; cur.f.forEach(function (f) { var v = inp[f.k].value; r[f.k] = f.t === 'num' ? Math.max(0, +v || 0) : (f.k === 'i' || f.k === 'q' ? +v : v); }); items.push(r); out = ''; last = null; render(); }; bd.appendChild(add); box.appendChild(bd);
    var li = mk('div', 'cgs'); li.appendChild(mk('h4', '', '📦 Lo que dará el código (' + items.length + ')'));
    if (!items.length) li.appendChild(mk('small', '', 'Aún no añadiste nada.'));
    items.forEach(function (r, i) { var row = mk('div', 'cgi'); row.appendChild(mk('span', '', text(r))); var d = mk('button', 'b', '✕'); d.onclick = function () { items.splice(i, 1); render(); }; row.appendChild(d); li.appendChild(row); });
    var gen = mk('button', 'b', '🎟️ GENERAR CÓDIGO'); gen.style.cssText = 'background:#c98a14;font-size:15px;padding:12px'; gen.onclick = function () {
      if (!items.length) { msgT = 'Añade al menos una recompensa.'; return render(); } var k = key.value.trim(); if (!k) { msgT = 'Escribe la clave de administrador.'; return render(); }
      try { localStorage.setItem('lithos-adm', k); } catch (e) { } msgT = '⏳ Generando…'; render();
      fetch(ACC.api + '/admin/code', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': k }, body: JSON.stringify({ rewards: items, uses: +us.value || 0, days: +dy.value || 0, code: cu.value, note: no.value }) })
        .then(function (r) { return r.json().then(function (j) { j.status = r.status; return j; }); }).then(function (j) { if (j.status === 200) { out = j.code; last = items.map(text).join('\n'); msgT = '✅ Código creado'; items = []; list = null; cfg.co = ''; cfg.no = ''; } else { msgT = '❌ ' + (j.err || 'Error'); } render(); })
        .catch(function () { msgT = '⚠️ Sin conexión con el servidor (puede estar despertando; reintenta).'; render(); });
    }; li.appendChild(gen); box.appendChild(li);
    /* mis códigos */
    var ml = mk('div', 'cgs'); ml.appendChild(mk('h4', '', '📋 Mis códigos'));
    var lb = mk('button', 'b', list ? '🔄 Actualizar lista' : '📋 Ver mis códigos'); lb.onclick = function () { var k = key.value.trim(); if (!k) { msgT = 'Escribe la clave de administrador.'; return render(); } msgT = '⏳ Cargando…'; render(); fetch(ACC.api + '/admin/codes', { headers: { 'X-Admin-Key': k } }).then(function (r) { return r.json().then(function (j) { j.status = r.status; return j; }); }).then(function (j) { if (j.status === 200) { list = j.codes; msgT = ''; } else msgT = '❌ ' + (j.err || 'Error'); render(); }).catch(function () { msgT = '⚠️ Sin conexión'; render(); }); }; ml.appendChild(lb);
    (list || []).forEach(function (c) { var row = mk('div', 'cgi'); var sp = mk('span', '', c.code + ' · ' + c.used + '/' + (c.uses || '∞') + ' usos' + (c.note ? ' · ' + c.note : '') + (c.exp ? ' · vence ' + new Date(c.exp).toLocaleDateString() : '')); row.appendChild(sp);
      var cb = mk('button', 'b', '📋'); cb.onclick = function () { try { navigator.clipboard.writeText(c.code); msgT = '📋 Copiado ' + c.code; } catch (e) { } render(); }; row.appendChild(cb);
      var db = mk('button', 'b', '🗑️'); db.onclick = function () { if (!confirm('¿Borrar el código ' + c.code + '?')) return; fetch(ACC.api + '/admin/code/delete', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Key': key.value.trim() }, body: JSON.stringify({ code: c.code }) }).then(function () { list = list.filter(function (z) { return z.code !== c.code; }); render(); }); }; row.appendChild(db); ml.appendChild(row); });
    box.appendChild(ml);
  }
  window.CODES = { open: function () { if (!window.ACC) { try { toast('Falta cuenta.js'); } catch (e) { } return; } msgT = ''; render(); }, redeem: redeem, apply: applyAll, retry: retry, text: text };
})();
