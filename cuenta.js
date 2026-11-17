/* ProyectoLithos · CUENTA (inicio de sesión + guardado en la nube)
   Sube/baja tu progreso (todo lo que vive en `pref`: diamantes, compras, skins, pase, mazmorra…)
   al servidor, para entrar desde otro dispositivo o si borras los datos del navegador.
   La sesión se queda abierta en este dispositivo (token guardado en localStorage). */
(function () {
  'use strict';
  var API = 'https://lithos-peerserver.onrender.com/api', KEY = 'lithos-acc', PUSH_MS = 15000;
  var S = { u: '', tok: '', rev: 0, dirty: 0, last: 0, sent: '' };
  try { var raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && typeof raw === 'object') { S = Object.assign(S, raw); delete S.lock; } } catch (e) { }
  var recUser = '', recMode = 'code', recStep = 1, secInfo = null, status = S.tok ? 'idle' : 'out', T = 0, busy = 0, dv = 0, pausedUntil = 0, msg = '', ui = 'login', modalOpen = 0;
  var $ = function (id) { return document.getElementById(id); };
  function saveS() { try { var c = Object.assign({}, S); delete c.lock; localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { } }
  function say(t) { try { toast(t); } catch (e) { } }
  function exportPref() { var o = {}; for (var k in pref) if (k !== 'bs') o[k] = pref[k]; return o; }
  function hasProgress(p) { try { return (p.dm | 0) > 10 || (p.own || []).length > 2 || (p.dg && p.dg.best > 0) || (p.ps && p.ps.xp > 0) || (p.pn | 0) > 0 || Object.keys(p.vc || {}).length > 0; } catch (e) { return false; } }
  function summary(p) { try { return '💎 ' + (p.dm | 0) + ' · 🎨 ' + (p.own || []).length + ' aspectos · 🏰 piso récord ' + ((p.dg && p.dg.best) | 0) + ' · 🏅 ' + ((p.ps && p.ps.xp) | 0) + ' XP de pase'; } catch (e) { return ''; } }
  function ago(ts) { if (!ts) return ''; var s = Math.max(0, (Date.now() - ts) / 1000 | 0); return s < 60 ? 'hace unos segundos' : s < 3600 ? 'hace ' + (s / 60 | 0) + ' min' : s < 86400 ? 'hace ' + (s / 3600 | 0) + ' h' : 'hace ' + (s / 86400 | 0) + ' días'; }

  /* ---------- red ---------- */
  function req(method, path, body, ms) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = ctl ? setTimeout(function () { ctl.abort(); }, ms || 70000) : 0;
    var h = { 'Content-Type': 'application/json' }; if (S.tok) { h.Authorization = 'Bearer ' + S.tok; h['X-Lithos-User'] = S.u; }
    return fetch(API + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(to); return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); })
      .catch(function (e) { clearTimeout(to); return { status: 0, err: 'Sin conexión con el servidor (puede estar despertando; reintenta en un minuto).' }; });
  }

  /* ---------- aplicar datos de la nube a este dispositivo ---------- */
  function applyCloud(data, rev) {
    S.lock = 1; clearTimeout(T);
    try { Object.keys(pref).forEach(function (k) { delete pref[k]; }); Object.assign(pref, data); localStorage.setItem('lithos-prefs', JSON.stringify(pref)); } catch (e) { }
    S.rev = rev; S.dirty = 0; S.sent = JSON.stringify(data); saveS();
    try { localStorage.removeItem('lithos-save-v1'); } catch (e) { }
    say('☁️ Progreso de tu cuenta cargado'); setTimeout(function () { location.reload(); }, 600);
  }

  /* ---------- subir ---------- */
  function push(force, quiet) {
    if (!S.tok || busy || S.lock) return Promise.resolve();
    var data = exportPref(), js = JSON.stringify(data);
    if (!force && js === S.sent) { S.dirty = 0; status = 'ok'; saveS(); refresh(); return Promise.resolve(); }
    busy = 1; var mark = dv; status = 'sync'; refresh();
    return req('PUT', '/save', { rev: S.rev, data: data, force: force ? 1 : 0 }).then(function (r) {
      busy = 0;
      if (r.status === 200) { S.rev = r.rev; S.sent = js; S.last = Date.now(); if (mark === dv) S.dirty = 0; status = 'ok'; saveS(); refresh(); if (!quiet && modalOpen) msg = '☁️ Guardado en tu cuenta'; if (S.dirty) sched(); return; }
      if (r.status === 409) { status = 'conflict'; refresh(); if (Date.now() > pausedUntil) conflictUI(r, 'Otro dispositivo guardó cambios en tu cuenta.'); return; }
      if (r.status === 401) { S.tok = ''; saveS(); status = 'out'; refresh(); say('🔒 Tu sesión expiró: vuelve a entrar para seguir guardando'); return; }
      status = 'offline'; refresh(); if (r.status === 0 || r.status >= 500) { clearTimeout(T); T = setTimeout(function () { T = 0; push(); }, 30000); }
      if (!quiet && modalOpen) msg = r.err || 'No se pudo guardar'; refresh();
    });
  }
  function sched() { if (!S.tok || T || S.lock) return; T = setTimeout(function () { T = 0; push(); }, PUSH_MS); }
  function dirty() { if (!S.tok || S.lock) return; dv++; S.dirty = 1; sched(); }
  function flushLeave() {
    if (!S.tok || S.lock || !S.dirty || busy) return;
    var data = exportPref(), js = JSON.stringify(data); if (js === S.sent) return;
    try { if (js.length < 55000) { fetch(API + '/save', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.tok, 'X-Lithos-User': S.u }, body: JSON.stringify({ rev: S.rev, data: data }) }); } else push(); } catch (e) { }
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushLeave(); });
  window.addEventListener('pagehide', flushLeave);

  /* ---------- conflicto: ¿qué progreso se queda? ---------- */
  function conflictUI(cloud, why, done) {
    closeAny(); var d = document.createElement('div'); d.id = 'accc'; d.className = 'accov';
    var cd = cloud.data || {}, me = exportPref();
    d.innerHTML = '<div class="tpb"><h3>☁️ ¿Qué progreso quieres usar?</h3><p class="accp">' + why + '</p>' +
      '<div class="acck"><b>☁️ Tu cuenta</b><small>' + summary(cd) + (cloud.ts ? '<br>Guardado ' + ago(cloud.ts) : '') + '</small><button class="b" id="acc-c">Usar el de la cuenta</button></div>' +
      '<div class="acck"><b>📱 Este dispositivo</b><small>' + summary(me) + '</small><button class="b" id="acc-l">Usar el de este dispositivo</button></div>' +
      '<p class="accp" style="font-size:11px">El que no elijas se reemplaza. Si dudas, usa el que tenga más 💎 y más aspectos.</p><button class="b" id="acc-n" style="background:#4a4a4a">Decidir después</button></div>';
    document.body.appendChild(d);
    $('acc-c').onclick = function () { d.remove(); applyCloud(cd, cloud.rev); if (done) done(); };
    $('acc-l').onclick = function () { d.remove(); S.rev = cloud.rev; saveS(); push(true).then(function () { if (done) done(); }); };
    $('acc-n').onclick = function () { d.remove(); pausedUntil = Date.now() + 5 * 60e3; if (done) done(); };
  }
  function closeAny() { var o = $('accc'); if (o) o.remove(); }

  /* ---------- registro / entrada / salida ---------- */
  function afterAuth(r, u) {
    S.u = r.u || u; S.tok = r.tok; S.rev = r.rev | 0; S.dirty = 0; S.lock = 0; saveS(); status = 'ok'; refresh();
    var cloud = r.data;
    if (!cloud) { S.rev = r.rev | 0; return push(true); }
    var mine = exportPref(), same = JSON.stringify(mine) === JSON.stringify(cloud);
    if (same) { S.sent = JSON.stringify(cloud); S.last = Date.now(); saveS(); return Promise.resolve(); }
    if (!hasProgress(mine)) { applyCloud(cloud, r.rev | 0); return Promise.resolve(); }
    return new Promise(function (ok) { closeModal(); conflictUI({ data: cloud, rev: r.rev | 0, ts: r.ts }, 'Esta cuenta ya tiene progreso guardado y este dispositivo también.', ok); });
  }
  function doLogin(u, p) {
    u = String(u || '').trim(); if (!u || !p) { msg = 'Escribe tu usuario y contraseña.'; return render(); }
    msg = '⏳ Entrando… (la primera vez puede tardar hasta 1 minuto)'; render();
    req('POST', '/login', { u: u, p: p }).then(function (r) {
      if (r.status !== 200) { msg = '❌ ' + (r.err || 'No se pudo entrar'); return render(); }
      msg = ''; afterAuth(r, u).then(function () { if (!S.lock) { say('✅ Sesión iniciada: ' + S.u); render(); } });
    });
  }
  function doRegister(u, p, p2, em) {
    u = String(u || '').trim(); if (p !== p2) { msg = 'Las contraseñas no coinciden.'; return render(); }
    msg = '⏳ Creando cuenta… (la primera vez puede tardar hasta 1 minuto)'; render();
    req('POST', '/register', { u: u, p: p, email: String(em || '').trim(), data: exportPref() }).then(function (r) {
      if (r.status !== 200) { msg = '❌ ' + (r.err || 'No se pudo crear la cuenta'); return render(); }
      S.u = r.u; S.tok = r.tok; S.rev = r.rev | 0; S.dirty = 0; S.last = Date.now(); S.sent = JSON.stringify(exportPref()); saveS(); status = 'ok'; S.pendingCode = r.code || ''; saveS(); msg = ''; ui = 'code'; say('🎉 Cuenta creada'); render(); label();
    });
  }
  function doLogout() {
    if (!confirm('¿Cerrar sesión en este dispositivo? Tu progreso sigue guardado en la cuenta y en este dispositivo.')) return;
    flushLeaveSync(function () { req('POST', '/logout', {}, 8000); S.tok = ''; S.u = ''; S.rev = 0; S.dirty = 0; S.sent = ''; S.pendingCode = ''; saveS(); status = 'out'; msg = ''; ui = 'login'; render(); label(); });
  }
  function flushLeaveSync(cb) { if (S.tok && S.dirty) push(false, true).then(cb); else cb(); }
  function doPull() {
    msg = '⏳ Buscando tu progreso…'; render();
    req('GET', '/save').then(function (r) {
      if (r.status === 401) { S.tok = ''; saveS(); status = 'out'; msg = '🔒 Sesión expirada: entra de nuevo'; return render(); }
      if (r.status !== 200) { msg = '❌ ' + (r.err || 'Sin conexión'); return render(); }
      if (!r.data) { msg = 'La nube no tiene guardado todavía.'; return render(); }
      if (!confirm('Esto reemplaza el progreso de ESTE dispositivo por el de tu cuenta:\n\n' + summary(r.data) + '\n\n¿Continuar?')) { msg = ''; return render(); }
      applyCloud(r.data, r.rev);
    });
  }
  var mailOn = null;
  function pingMail(cb) { if (mailOn !== null) return cb(); req('GET', '/ping', null, 20000).then(function (r) { mailOn = !!r.mail; cb(); }); }
  function finishRecovery(r, u) {
    S.pendingCode = r.code || ''; msg = '';
    afterAuth(r, u).then(function () { if (S.lock) return; ui = S.pendingCode ? 'code' : 'in'; msg = S.pendingCode ? '' : '✅ Contraseña cambiada. Sesión iniciada.'; say('✅ Cuenta recuperada'); render(); label(); });
  }
  function doRecCode(u, code, np) {
    msg = '⏳ Verificando…'; render();
    req('POST', '/recover/code', { u: u, code: code, new: np }).then(function (r) { if (r.status !== 200) { msg = '❌ ' + (r.err || 'No se pudo recuperar'); return render(); } finishRecovery(r, u); });
  }
  function doRecAsk(u) {
    msg = '⏳ Enviando código… (puede tardar hasta 1 minuto)'; render();
    req('POST', '/recover/request', { u: u }).then(function (r) { recStep = r.status === 200 ? 2 : 1; msg = r.status === 200 ? '📧 ' + r.msg : '❌ ' + (r.err || 'No se pudo enviar'); render(); });
  }
  function doRecMail(u, code, np) {
    msg = '⏳ Verificando…'; render();
    req('POST', '/recover/confirm', { u: u, code: code, new: np }).then(function (r) { if (r.status !== 200) { msg = '❌ ' + (r.err || 'No se pudo recuperar'); return render(); } finishRecovery(r, u); });
  }
  function doEmail(em) {
    req('POST', '/email', { email: em }).then(function (r) { msg = r.status === 200 ? (r.email ? '✅ Correo guardado: ' + r.email : '✅ Correo quitado') : '❌ ' + (r.err || 'No se pudo'); secInfo = null; render(); });
  }
  function doNewCode(pw) {
    req('POST', '/recoverycode', { p: pw }).then(function (r) { if (r.status !== 200) { msg = '❌ ' + (r.err || 'No se pudo'); return render(); } S.pendingCode = r.code; saveS(); msg = ''; ui = 'code'; render(); });
  }
  function doPass(o, n) {
    req('POST', '/password', { old: o, new: n }).then(function (r) { msg = r.status === 200 ? '✅ Contraseña cambiada (las demás sesiones se cerraron)' : '❌ ' + (r.err || 'No se pudo'); ui = 'in'; render(); });
  }

  /* ---------- al abrir el juego: ¿hay algo más nuevo en la nube? ---------- */
  function startup() {
    if (!S.tok) return;
    setTimeout(function () {
      req('GET', '/save').then(function (r) {
        if (r.status === 401) { S.tok = ''; saveS(); status = 'out'; label(); return; }
        if (r.status !== 200) { status = 'offline'; label(); sched(); return; }
        if (!r.data && hasProgress(pref)) { S.rev = r.rev | 0; saveS(); push(true, true); return; }          /* el servidor perdió los datos: se restauran desde este dispositivo */
        if ((r.rev | 0) > S.rev) {
          if (!S.dirty && r.data) { applyCloud(r.data, r.rev); return; }
          if (r.data) conflictUI(r, 'Tu cuenta tiene cambios de otro dispositivo y este también tiene cambios sin subir.'); return;
        }
        if ((r.rev | 0) < S.rev) { S.rev = r.rev | 0; saveS(); push(true, true); return; }                 /* servidor reiniciado con datos viejos */
        if (S.dirty) push(false, true); else { status = 'ok'; S.sent = S.sent || JSON.stringify(r.data || {}); label(); }
      });
    }, 2500);
  }

  /* ---------- interfaz ---------- */
  function css() {
    if ($('acccss')) return; var s = document.createElement('style'); s.id = 'acccss';
    s.textContent = '.accov{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.68);padding:12px}' +
      '.accov .tpb{width:min(94vw,420px);max-height:94vh;overflow:auto;text-align:center}.accov h3{margin:0 0 6px}' +
      '.accp{font-size:12px;line-height:1.35;margin:6px 2px;color:#f0e6c0}.accv input{display:block;width:100%;box-sizing:border-box;margin:6px 0;padding:10px;font-size:16px;border:3px solid #1a1208;border-radius:10px;background:#fff8e0;color:#2a1a08;text-align:center}' +
      '.accv .b,.accov .b{width:100%;margin-top:6px;padding:10px;font-size:14px}.acct{display:flex;gap:6px}.acct .b{margin-top:0;font-size:13px}.acct .on{outline:3px solid #ffd84a}' +
      '.accm{min-height:34px;font-size:12px;color:#ffe48a;margin:6px 0;white-space:pre-wrap}.acck{border:3px solid #6a5a2a;border-radius:10px;background:rgba(0,0,0,.28);padding:8px;margin:8px 0}.acck b{display:block;font-size:15px;color:#ffe27a}.acck small{display:block;font-size:11px;margin:4px 0;color:#e8ddb0}' +
      '.accst{font-size:12px;margin:4px 0 8px;padding:6px;border-radius:8px;background:rgba(0,0,0,.3)}';
    document.head.appendChild(s);
  }
  function stTxt() {
    if (!S.tok) return '🔒 Sin sesión';
    return status === 'sync' ? '⏳ Guardando…' : status === 'offline' ? '⚠️ Sin conexión: se guardará cuando vuelva' : status === 'conflict' ? '⚠️ Hay cambios de otro dispositivo' : S.dirty ? '⏳ Cambios pendientes de subir' : '☁️ Guardado' + (S.last ? ' ' + ago(S.last) : '');
  }
  function label() { var e = $('accb'); if (e) e.textContent = S.tok ? S.u + (S.dirty ? ' ⏳' : ' ☁️') : 'Iniciar sesión'; }
  function refresh() { label(); if (modalOpen) render(); }
  function input(type, ph, id, ac) { var i = document.createElement('input'); i.type = type; i.placeholder = ph; i.id = id; i.autocomplete = ac || 'off'; i.autocapitalize = 'off'; i.spellcheck = false; return i; }
  function btn(t, f, st) { var b = document.createElement('button'); b.type = 'button'; b.className = 'b'; b.textContent = t; b.onclick = f; if (st) b.style.cssText = st; return b; }
  function render() {
    css(); var o = $('acc'); if (!o) { o = document.createElement('div'); o.id = 'acc'; o.className = 'accov'; o.addEventListener('click', function (e) { if (e.target === o) closeModal(); }); document.body.appendChild(o); }
    o.style.display = 'flex'; modalOpen = 1; o.innerHTML = ''; var box = document.createElement('div'); box.className = 'tpb accv'; o.appendChild(box);
    var h = document.createElement('h3'); h.textContent = '👤 Cuenta'; box.appendChild(h);
    var x = btn('✕ Cerrar', closeModal, 'width:auto;float:right;margin:0;padding:6px 10px;font-size:12px;background:#8a2a2a'); box.insertBefore(x, h);
    var m = document.createElement('div'); m.className = 'accm'; m.textContent = msg;
    if (S.tok && S.pendingCode) ui = 'code';
    if (ui === 'code' && S.tok) {
      var cp = document.createElement('p'); cp.className = 'accp'; cp.textContent = '🛟 Este es tu CÓDIGO DE RECUPERACIÓN. Si olvidas tu contraseña, con él (y tu usuario) recuperas la cuenta. Se muestra una sola vez: anótalo o tómale captura y guárdalo en un lugar seguro.'; box.appendChild(cp);
      var cd = document.createElement('div'); cd.className = 'acck'; cd.innerHTML = '<b style="font-size:24px;letter-spacing:2px;user-select:all"></b>'; cd.querySelector('b').textContent = S.pendingCode || '(ya guardado)'; box.appendChild(cd);
      if (S.pendingCode) { box.appendChild(btn('📋 Copiar código', function () { try { navigator.clipboard.writeText(S.pendingCode).then(function () { say('📋 Código copiado'); }); } catch (e) { say('Cópialo a mano'); } })); }
      box.appendChild(btn('✅ Ya lo guardé', function () { S.pendingCode = ''; saveS(); ui = 'in'; msg = ''; render(); }, 'background:#2a7a3a'));
      var cw = document.createElement('p'); cw.className = 'accp'; cw.style.fontSize = '11px'; cw.textContent = 'Si lo pierdes, entra a tu cuenta y genera uno nuevo en «🛟 Recuperación».'; box.appendChild(cw); return;
    }
    if (!S.tok && ui === 'rec') {
      if (mailOn === null) pingMail(function () { if (ui === 'rec' && !S.tok) render(); });
      var rt = document.createElement('div'); rt.className = 'acct';
      [['code', '🛟 Con mi código'], ['mail', '📧 Por correo']].forEach(function (a) { var b = btn(a[1], function () { recMode = a[0]; recStep = 1; msg = ''; render(); }); if (recMode === a[0]) b.className += ' on'; rt.appendChild(b); }); box.appendChild(rt);
      var rf = document.createElement('form'); rf.onsubmit = function (e) { e.preventDefault(); }; var ru = input('text', 'Tu usuario', 'acc-ru', 'username'); ru.value = recUser; ru.oninput = function () { recUser = ru.value; }; rf.appendChild(ru);
      if (recMode === 'code') {
        var tp = document.createElement('p'); tp.className = 'accp'; tp.textContent = 'Escribe el código de recuperación que te dimos al crear tu cuenta (XXXX-XXXX-XXXX) y elige una contraseña nueva.'; rf.appendChild(tp);
        var rc = input('text', 'Código de recuperación', 'acc-rc'); rc.style.textTransform = 'uppercase'; var rn = input('password', 'Contraseña nueva', 'acc-rn', 'new-password'); rf.appendChild(rc); rf.appendChild(rn);
        var g1 = btn('🔓 Recuperar mi cuenta', function () { doRecCode(ru.value, rc.value, rn.value); }, 'background:#2a7a3a'); g1.type = 'submit'; rf.appendChild(g1);
      } else if (mailOn === false) {
        var np0 = document.createElement('p'); np0.className = 'accp'; np0.textContent = 'La recuperación por correo no está activada en este servidor. Usa tu código de recuperación.'; rf.appendChild(np0);
      } else if (recStep === 1) {
        var tp2 = document.createElement('p'); tp2.className = 'accp'; tp2.textContent = 'Te enviamos un código de 6 dígitos al correo que registraste en tu cuenta.'; rf.appendChild(tp2);
        var g2 = btn('📧 Enviarme el código', function () { doRecAsk(ru.value); }, 'background:#2a7a3a'); g2.type = 'submit'; rf.appendChild(g2);
      } else {
        var rc2 = input('text', 'Código de 6 dígitos', 'acc-rc2'); rc2.inputMode = 'numeric'; var rn2 = input('password', 'Contraseña nueva', 'acc-rn2', 'new-password'); rf.appendChild(rc2); rf.appendChild(rn2);
        var g3 = btn('🔓 Cambiar contraseña y entrar', function () { doRecMail(ru.value, rc2.value, rn2.value); }, 'background:#2a7a3a'); g3.type = 'submit'; rf.appendChild(g3);
      }
      box.appendChild(rf); box.appendChild(m); box.appendChild(btn('← Volver', function () { ui = 'login'; msg = ''; render(); }, 'background:#4a4a4a')); return;
    }
    if (S.tok && ui === 'sec') {
      if (!secInfo) { secInfo = { email: '…' }; req('GET', '/me').then(function (r) { secInfo = r.status === 200 ? r : { email: '', hasCode: 0 }; if (ui === 'sec') render(); }); }
      var sp = document.createElement('p'); sp.className = 'accp'; sp.innerHTML = '📧 Correo de recuperación: <b></b>'; sp.querySelector('b').textContent = secInfo.email ? secInfo.email : 'ninguno'; box.appendChild(sp);
      var sf = document.createElement('form'); sf.onsubmit = function (e) { e.preventDefault(); }; var se = input('email', 'Tu correo (opcional)', 'acc-e', 'email'); sf.appendChild(se);
      var sg = btn('💾 Guardar correo', function () { doEmail(se.value); }, 'background:#2a7a3a'); sg.type = 'submit'; sf.appendChild(sg); box.appendChild(sf);
      var cp2 = document.createElement('p'); cp2.className = 'accp'; cp2.textContent = '🛟 Código de recuperación: genera uno nuevo (el anterior deja de servir). Pide tu contraseña.'; box.appendChild(cp2);
      var sf2 = document.createElement('form'); sf2.onsubmit = function (e) { e.preventDefault(); }; var spw = input('password', 'Tu contraseña actual', 'acc-sp', 'current-password'); sf2.appendChild(spw);
      var sg2 = btn('🛟 Generar código nuevo', function () { doNewCode(spw.value); }); sg2.type = 'submit'; sf2.appendChild(sg2); box.appendChild(sf2); box.appendChild(m);
      box.appendChild(btn('← Volver', function () { ui = 'in'; msg = ''; render(); }, 'background:#4a4a4a')); return;
    }
    if (!S.tok) {
      var p = document.createElement('p'); p.className = 'accp'; p.textContent = 'Crea una cuenta o entra con tu usuario y contraseña para guardar tu progreso en la nube. Así no pierdes tus compras, diamantes ni aspectos si borras los datos del navegador, y puedes jugar desde otro dispositivo.'; box.appendChild(p);
      var t = document.createElement('div'); t.className = 'acct';
      [['login', 'Entrar'], ['reg', 'Crear cuenta']].forEach(function (a) { var b = btn(a[1], function () { ui = a[0]; msg = ''; render(); }); if (ui === a[0]) b.className += ' on'; t.appendChild(b); }); box.appendChild(t);
      var f = document.createElement('form'); f.onsubmit = function (e) { e.preventDefault(); }; var u = input('text', 'Usuario (3-16 letras, números o _)', 'acc-u', 'username'), pw = input('password', 'Contraseña', 'acc-p', ui === 'reg' ? 'new-password' : 'current-password'); f.appendChild(u); f.appendChild(pw);
      var pw2 = null, em = null; if (ui === 'reg') { pw2 = input('password', 'Repite la contraseña', 'acc-p2', 'new-password'); f.appendChild(pw2); em = input('email', 'Correo (opcional, para recuperar la cuenta)', 'acc-e', 'email'); f.appendChild(em); }
      var go = btn(ui === 'reg' ? '✅ Crear cuenta y subir mi progreso' : '🔑 Entrar', function () { ui === 'reg' ? doRegister(u.value, pw.value, pw2.value, em.value) : doLogin(u.value, pw.value); }, 'background:#2a7a3a'); go.type = 'submit'; f.appendChild(go); box.appendChild(f); box.appendChild(m);
      if (ui === 'reg') { var w = document.createElement('p'); w.className = 'accp'; w.style.fontSize = '11px'; w.textContent = 'Al crear la cuenta te daremos un código de recuperación. Con él (o con tu correo) podrás recuperarla si olvidas la contraseña.'; box.appendChild(w); }
      if (ui === 'login') box.appendChild(btn('¿Olvidaste tu contraseña?', function () { ui = 'rec'; recStep = 1; msg = ''; render(); }, 'background:none;border:none;box-shadow:none;text-decoration:underline;font-size:12px;color:#ffe48a'));
      setTimeout(function () { try { u.focus(); } catch (e) { } }, 50);
    } else if (ui === 'pass') {
      var f2 = document.createElement('form'); f2.onsubmit = function (e) { e.preventDefault(); }; var a = input('password', 'Contraseña actual', 'acc-o', 'current-password'), b = input('password', 'Contraseña nueva', 'acc-n', 'new-password'); f2.appendChild(a); f2.appendChild(b);
      var g = btn('Cambiar contraseña', function () { doPass(a.value, b.value); }, 'background:#2a7a3a'); g.type = 'submit'; f2.appendChild(g); f2.appendChild(btn('Cancelar', function () { ui = 'in'; msg = ''; render(); }, 'background:#4a4a4a')); box.appendChild(f2); box.appendChild(m);
    } else {
      var inf = document.createElement('div'); inf.className = 'accst'; inf.innerHTML = '✅ Sesión iniciada como <b></b><br>' + stTxt(); inf.querySelector('b').textContent = S.u; box.appendChild(inf);
      var p3 = document.createElement('p'); p3.className = 'accp'; p3.textContent = 'Tu progreso se guarda solo cada pocos segundos. Si cambias de dispositivo, entra con tu usuario y contraseña.'; box.appendChild(p3);
      box.appendChild(btn('☁️ Guardar ahora', function () { msg = '⏳ Guardando…'; render(); push(false).then(function () { if (status === 'ok') msg = '☁️ Guardado en tu cuenta'; render(); }); }, 'background:#2a7a3a'));
      box.appendChild(btn('⬇️ Restaurar desde la nube', doPull));
      box.appendChild(btn('🔑 Cambiar contraseña', function () { ui = 'pass'; msg = ''; render(); }));
      box.appendChild(btn('🛟 Recuperación (correo y código)', function () { ui = 'sec'; msg = ''; secInfo = null; render(); }));
      box.appendChild(btn('🚪 Cerrar sesión', doLogout, 'background:#7a3a2a')); box.appendChild(m);
    }
  }
  function closeModal() { var o = $('acc'); if (o) o.style.display = 'none'; modalOpen = 0; }
  function open() { if (S.tok) ui = S.pendingCode ? 'code' : 'in'; else if (ui === 'in' || ui === 'pass' || ui === 'code' || ui === 'sec') ui = 'login'; msg = ''; render(); }

  /* ---------- clasificación: envío de puntuaciones ---------- */
  var scT = 0;
  function flushScores() {
    if (!S.tok || !S.ps) return; var modes = Object.keys(S.ps);
    modes.forEach(function (m) { var v = S.ps[m]; req('POST', '/score', { mode: m, score: v }, 30000).then(function (r) { if (r.status === 200 || r.status === 400) { if (S.ps && S.ps[m] === v) { delete S.ps[m]; saveS(); } } }); });
  }
  function score(mode, val) {
    val = Math.floor(+val); if (!(val >= 0)) return; if (!S.tok) return;
    S.ps = S.ps || {}; if (!(S.ps[mode] >= val)) S.ps[mode] = val; saveS(); clearTimeout(scT); scT = setTimeout(flushScores, 2500);
  }
  window.ACC = { score: score, call: req, user: function () { return S.tok ? S.u : ''; }, open: open, close: closeModal, dirty: dirty, push: push, state: function () { return { u: S.u, tok: !!S.tok, rev: S.rev, dirty: S.dirty, status: status }; }, api: API };
  function init() { label(); startup(); if (S.tok) setTimeout(function () { try { var b = pref.dg && pref.dg.best | 0; if (b > 0) score('dungeon', b * 10000); } catch (e) { } flushScores(); }, 6000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
