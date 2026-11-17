/* ProyectoLithos · NÚMERO DE VERSIÓN + aviso de actualización
   Para publicar una versión nueva usa:  node subir-version.js 1.1.1 "qué cambió"
   (cambia a la vez version.js, version.json y sw.js; no los edites a mano por separado) */
(function () {
  'use strict';
  var LOCAL = { v: '1.3.0', b: 85 };          /* ← versión de ESTE archivo (la que tiene el jugador cargada) */
  window.LITHOS_VER = LOCAL;
  var $ = function (id) { return document.getElementById(id); }, busy = 0, bannerOn = 0;

  function css() {
    if ($('vercss')) return; var s = document.createElement('style'); s.id = 'vercss';
    s.textContent = '#vertag{text-align:center;margin-top:2px;font:bold 11px Trebuchet MS,sans-serif;color:rgba(255,255,255,.75);pointer-events:auto;z-index:3}' +
      '#vertag b{color:#ffe27a}#vertag button{background:none;border:0;color:#9fe0ff;text-decoration:underline;font:inherit;padding:2px 4px}' +
      '#verban{position:fixed;left:8px;right:8px;top:calc(8px + env(safe-area-inset-top,0px));z-index:200;background:#c98a14;border:3px solid #2a2a2a;border-radius:12px;padding:8px 10px;color:#fff;font:bold 13px Trebuchet MS,sans-serif;display:flex;gap:8px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,.5)}' +
      '#verban span{flex:1;line-height:1.3}#verban small{display:block;font-weight:normal;font-size:11px;opacity:.95}#verban button{background:#2f6f2a;border:3px solid #2a2a2a;border-bottom-width:5px;color:#fff;border-radius:9px;font:bold 13px Trebuchet MS,sans-serif;padding:7px 10px}';
    document.head.appendChild(s);
  }
  function tag() {
    var m = $('menu'); if (!m) return; css(); var t = $('vertag');
    if (!t) { t = document.createElement('div'); t.id = 'vertag'; m.appendChild(t); }
    t.innerHTML = 'Versión <b>' + LOCAL.v + '</b> (build ' + LOCAL.b + ') · <button id="verbtn" type="button">🔄 Buscar actualización</button><span id="vermsg"></span>';
    $('verbtn').onclick = function () { check(true); };
  }
  function msg(t) { var e = $('vermsg'); if (e) { e.textContent = ' ' + t; clearTimeout(msg.t); msg.t = setTimeout(function () { e.textContent = ''; }, 6000); } }

  /* borra cachés y service workers y recarga: así se baja TODO de nuevo */
  function hardUpdate() {
    var jobs = [];
    try { if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })); } catch (e) { }
    try { if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) { }
    Promise.all(jobs).catch(function () { }).then(function () { location.replace(location.pathname + '?v=' + Date.now()); });
  }
  function banner(text, sub, btn, fn) {
    css(); var b = $('verban'); if (b) b.remove(); b = document.createElement('div'); b.id = 'verban'; bannerOn = 1;
    b.innerHTML = '<span></span><button type="button"></button>'; b.firstChild.textContent = text;
    if (sub) { var s = document.createElement('small'); s.textContent = sub; b.firstChild.appendChild(s); }
    b.lastChild.textContent = btn; b.lastChild.onclick = fn; document.body.appendChild(b);
  }
  function check(manual) {
    if (busy) return; busy = 1; if (manual) msg('Buscando…');
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (r) {
      busy = 0;
      if (r && r.b > LOCAL.b) { banner('🔄 Hay una versión nueva: ' + r.v + ' (tú tienes ' + LOCAL.v + ')', r.n || '', 'Actualizar', hardUpdate); if (manual) msg('Hay una versión nueva'); }
      else if (manual) msg('✅ Tienes la última versión (' + LOCAL.v + ')');
    }).catch(function () { busy = 0; if (manual) msg('No se pudo comprobar (¿sin internet?)'); });
  }

  /* cuando el navegador instala una versión nueva mientras juegas */
  try {
    if (navigator.serviceWorker) {
      var had = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', function () { if (had && !bannerOn) banner('✅ Se instaló una actualización', 'Toca para recargar y usarla', 'Recargar', function () { location.reload(); }); had = true; });
      navigator.serviceWorker.getRegistration().then(function (r) { if (r) { var up = function () { try { r.update(); } catch (e) { } }; setInterval(up, 5 * 60e3); up(); } }).catch(function () { });
    }
  } catch (e) { }

  function init() { tag(); setTimeout(function () { check(false); }, 4000); setInterval(function () { check(false); }, 10 * 60e3); document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(false); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.LITHOS_UPDATE = { check: check, hard: hardUpdate };
})();
