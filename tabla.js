/* ProyectoLithos · CLASIFICACIÓN por modo de juego (Reino clásico · Modo Castillo · Mazmorra)
   Los datos viven en el servidor (/api/top). Solo aparecen jugadores con cuenta. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var MODES = [['classic', '⚔️ Reino clásico'], ['castle', '🏰 Castillo'], ['dungeon', '🗝️ Mazmorra']], mode = 'classic', cache = {}, loading = 0, errTxt = '';
  var MEDAL = ['🥇', '🥈', '🥉'], COL = ['#ffd84a', '#d5dbe6', '#e0975a'];
  function fmt(m, s) { return m === 'dungeon' ? 'Piso ' + Math.floor(s / 10000) + ' · ' + (s % 10000).toLocaleString('es') + ' bajas' : s.toLocaleString('es') + ' pts'; }
  function unit(m) { return m === 'dungeon' ? 'pisos' : 'puntos'; }
  function gapTxt(m, d) { return m === 'dungeon' ? (Math.floor(d / 10000) + 1) + ' piso' + (Math.floor(d / 10000) ? 's' : '') : d.toLocaleString('es') + ' puntos'; }
  function css() {
    if ($('topcss')) return; var s = document.createElement('style'); s.id = 'topcss';
    s.textContent = '#topo{position:fixed;inset:0;z-index:85;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.7);padding:10px}' +
      '#topo .tpb{width:min(96vw,460px);max-height:96vh;display:flex;flex-direction:column;overflow:hidden;padding:10px}' +
      '#topo h3{margin:0 0 6px;text-align:center}.topt{display:flex;gap:5px;margin-bottom:6px}.topt .b{flex:1;font-size:12px;padding:7px 2px}.topt .on{outline:3px solid #ffd84a}' +
      '.toppod{display:flex;align-items:flex-end;justify-content:center;gap:6px;margin:4px 0 8px}.podc{flex:1;border:3px solid;border-radius:12px 12px 4px 4px;text-align:center;padding:6px 3px;background:linear-gradient(#2b3d2b,#142014);position:relative;min-width:0}' +
      '.podc.p1{padding-top:14px;padding-bottom:14px;box-shadow:0 0 18px 2px rgba(255,216,74,.55);animation:podg 2s infinite alternate}@keyframes podg{from{box-shadow:0 0 8px 0 rgba(255,216,74,.4)}to{box-shadow:0 0 22px 4px rgba(255,216,74,.75)}}' +
      '.podc .md{font-size:28px;line-height:1}.podc.p1 .md{font-size:36px}.podc .nm{font:bold 13px Trebuchet MS,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}.podc .sc{font-size:11px;color:#ffe9a8}.podc.free{opacity:.55;border-style:dashed}' +
      '.topl{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;min-height:80px}.topr{display:flex;align-items:center;gap:8px;padding:6px 8px;margin:3px 0;border-radius:9px;background:rgba(0,0,0,.28);border:2px solid transparent;font-size:13px}' +
      '.topr .rk{width:34px;text-align:center;font-weight:bold;color:#ffe48a}.topr .nm{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.topr .sc{font-size:11px;color:#cfe;white-space:nowrap}.topr.me{border-color:#ffd84a;background:rgba(255,216,74,.16);animation:podg 1.6s infinite alternate}' +
      '.topr .bar{display:block;height:3px;border-radius:2px;background:#ffb020;margin-top:2px}.topm{margin:6px 0;padding:8px;border-radius:10px;background:rgba(255,176,32,.16);border:2px solid #ffb020;font-size:12px;text-align:center;line-height:1.35}' +
      '.topf{display:flex;gap:6px;margin-top:6px}.topf .b{flex:1;padding:8px;font-size:12px}';
    document.head.appendChild(s);
  }
  function load(m, force) {
    if (!window.ACC) { errTxt = 'Falta cuenta.js'; return render(); }
    if (cache[m] && !force && Date.now() - cache[m].at < 20000) return render();
    loading = 1; errTxt = ''; render();
    ACC.call('GET', '/top?mode=' + m + '&u=' + encodeURIComponent(ACC.user()), null, 70000).then(function (r) {
      loading = 0; if (r.status === 200) cache[m] = { d: r, at: Date.now() }; else errTxt = r.err || 'No se pudo cargar la clasificación'; render();
    });
  }
  function render() {
    css(); var o = $('topo'); if (!o) { o = document.createElement('div'); o.id = 'topo'; o.addEventListener('click', function (e) { if (e.target === o) close(); }); document.body.appendChild(o); }
    o.style.display = 'flex'; var d = cache[mode] && cache[mode].d, user = window.ACC ? ACC.user() : '';
    var h = '<div class="tpb"><button class="b xb" id="top-x" style="position:static;margin:0 0 4px auto;display:block">✕ Cerrar</button><h3>🏆 Clasificación</h3><div class="topt">' + MODES.map(function (a) { return '<button class="b' + (a[0] === mode ? ' on' : '') + '" data-m="' + a[0] + '">' + a[1] + '</button>'; }).join('') + '</div>';
    if (!d) h += '<div class="topm">' + (loading ? '⏳ Cargando… (la primera vez puede tardar hasta 1 minuto)' : '❌ ' + (errTxt || 'Sin datos')) + '</div>';
    else {
      var L = d.list, pod = [1, 0, 2];
      h += '<div class="toppod">' + pod.map(function (i) {
        var e = L[i]; if (!e) return '<div class="podc free p' + (i + 1) + '" style="border-color:' + COL[i] + '"><div class="md">' + MEDAL[i] + '</div><div class="nm">¿Tú?</div><div class="sc">Puesto libre</div></div>';
        return '<div class="podc p' + (i + 1) + '" style="border-color:' + COL[i] + '"><div class="md">' + (i === 0 ? '👑' : MEDAL[i]) + '</div><div class="nm" style="color:' + COL[i] + '">' + esc(e.u) + (e.u === user ? ' (tú)' : '') + '</div><div class="sc">' + fmt(mode, e.s) + '</div></div>';
      }).join('') + '</div>';
      var me = d.me, msg = '';
      if (!user) msg = '🔒 <b>Inicia sesión</b> para aparecer en la clasificación y competir por el top 3.';
      else if (!me) msg = '🎮 Aún no tienes puntuación en este modo. ¡Juega una partida y entra al ranking!';
      else if (me.r === 1) msg = '👑 ¡Eres el <b>#1</b>! Defiende tu corona: todos te van a perseguir.';
      else if (me.r <= 3) msg = '🔥 Estás en el <b>podio (#' + me.r + ')</b>. Te faltan <b>' + gapTxt(mode, me.up - me.s + (mode === 'dungeon' ? 0 : 1)) + '</b> para subir al #' + (me.r - 1) + '.';
      else msg = '📈 Vas en el puesto <b>#' + me.r + '</b> de ' + d.total + '. Para entrar al <b>TOP 3</b> te faltan <b>' + gapTxt(mode, Math.max(1, me.up3 - me.s + 1)) + '</b>' + (me.up ? ' · para superar al #' + (me.r - 1) + ': ' + gapTxt(mode, Math.max(1, me.up - me.s + 1)) : '') + '.';
      h += '<div class="topm">' + msg + '</div><div class="topl">';
      var top1 = L[0] ? L[0].s : 1;
      for (var i = 3; i < L.length; i++) { var e = L[i]; h += '<div class="topr' + (e.u === user ? ' me' : '') + '"><span class="rk">#' + e.r + '</span><span class="nm">' + esc(e.u) + (e.u === user ? ' · tú' : '') + '<i class="bar" style="width:' + Math.max(4, Math.round(e.s / top1 * 100)) + '%"></i></span><span class="sc">' + fmt(mode, e.s) + '</span></div>'; }
      if (L.length <= 3) h += '<div class="topm" style="opacity:.8">Todavía no hay más jugadores. ¡Sé de los primeros!</div>';
      if (me && me.r > L.length) h += '<div class="topr me"><span class="rk">#' + me.r + '</span><span class="nm">' + esc(user) + ' · tú</span><span class="sc">' + fmt(mode, me.s) + '</span></div>';
      h += '</div>';
    }
    h += '<div class="topf"><button class="b" id="top-r">🔄 Actualizar</button>' + (window.ACC && !user ? '<button class="b" id="top-a" style="background:#2a7a3a">👤 Iniciar sesión</button>' : '') + '</div></div>';
    o.innerHTML = h;
    $('top-x').onclick = close; $('top-r').onclick = function () { load(mode, true); };
    var ab = $('top-a'); if (ab) ab.onclick = function () { close(); ACC.open(); };
    o.querySelectorAll('.topt .b').forEach(function (b) { b.onclick = function () { mode = b.dataset.m; load(mode); }; });
  }
  function esc(t) { return String(t).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  function close() { var o = $('topo'); if (o) o.style.display = 'none'; }
  function open(m) { if (m) mode = m; load(mode, true); }
  window.TOP = { open: open, close: close };
})();
