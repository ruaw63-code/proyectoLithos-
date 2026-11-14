/* ProyectoLithos · transporte ONLINE para la web (GitHub Pages)
   Implementa la misma interfaz que el puente nativo de la APK (window.LANB), pero con WebRTC (PeerJS):
   el anfitrión crea una sala con un CÓDIGO y los demás entran escribiéndolo. Sin servidor propio.
   - La APK sigue usando su red local nativa (si window.LANB ya existe, este archivo no hace nada).
   - Si quieres más fiabilidad en datos móviles, pon un servidor TURN propio en TURN (abajo). */
(function () {
  if (window.LANB) return;
  var PEERJS_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
  var PREFIX = 'lithos-';
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  /* Servidores ICE. STUN gratis de Google + un TURN público de reserva (puede dejar de funcionar).
     Para jugar bien en datos móviles consigue uno propio gratis (metered.ca / Cloudflare Calls) y añádelo aquí. */
  var TURN_USER = '22c9d1c534f43a7303a69c32', TURN_PASS = '7MoCvAKt3MIflRmV';
  var TURN = [
    { urls: 'turn:global.relay.metered.ca:80', username: TURN_USER, credential: TURN_PASS },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: TURN_USER, credential: TURN_PASS },
    { urls: 'turn:global.relay.metered.ca:443', username: TURN_USER, credential: TURN_PASS },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: TURN_USER, credential: TURN_PASS }
  ];
  var ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun.relay.metered.ca:80' }].concat(TURN);
  /* Servidor de salas PROPIO. Pon aquí solo el dominio, sin https://  (ej. 'lithos-peer.onrender.com').
     Si lo dejas vacío usa el servidor público gratis de PeerJS (a veces se cae). */
  var PEER_HOST = 'lithos-peerserver.onrender.com';
  var CFG = { debug: 0, config: { iceServers: ICE, iceCandidatePoolSize: 4 } };
  if (PEER_HOST) { CFG.host = PEER_HOST; CFG.port = 443; CFG.secure = true; CFG.path = '/'; }
  var HI_WATER = 96 * 1024;   // si el canal acumula más de esto, los mensajes "descartables" (instantáneas) se omiten
  var PING_MS = 2500, DEAD_MS = 12000;

  var ev = function (k, a, b) { try { window.LAN && window.LAN.ev(k, a, b); } catch (e) { console.error(e); } };
  var loading = null;
  function loadLib() {
    if (window.Peer) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = PEERJS_URL; s.async = true;
      s.onload = function () { window.Peer ? ok() : no(new Error('PeerJS no cargó')); };
      s.onerror = function () { loading = null; no(new Error('Sin conexión a internet (no se pudo cargar PeerJS)')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function newCode() { var c = ''; for (var i = 0; i < 5; i++) c += ALPHA[Math.floor(Math.random() * ALPHA.length)]; return c; }
  function clean(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); }
  function busy(dc) { try { return dc && dc.dataChannel && dc.dataChannel.bufferedAmount > HI_WATER; } catch (e) { return false; } }
  function sendRaw(conn, txt) { try { if (conn && conn.open) conn.send(txt); } catch (e) { } }

  /* ----- estado ----- */
  var H = null;   // anfitrión: {peer, code, max, conns:Map id->{c,last}, nid, tick, dead}
  var C = null;   // cliente:   {peer, conn, last, tick, dead}

  function hostStop() {
    var h = H; H = null; api.code = ''; if (!h) return;
    h.dead = true; clearInterval(h.tick);
    h.conns.forEach(function (o) { try { o.c.close(); } catch (e) { } });
    try { h.peer.destroy(); } catch (e) { }
  }
  function clientStop() {
    var c = C; C = null; if (!c) return;
    c.dead = true; clearInterval(c.tick);
    try { c.conn && c.conn.close(); } catch (e) { }
    try { c.peer.destroy(); } catch (e) { }
  }

  function hostOpen(h, tries) {
    var code = newCode(); api.code = code; h.code = code;
    var peer = new window.Peer(PREFIX + code, CFG); h.peer = peer;
    peer.on('open', function () { if (H === h) ev('code', code, ''); });
    peer.on('connection', function (c) {
      if (H !== h) { try { c.close(); } catch (e) { } return; }
      var id = ++h.nid, o = { c: c, last: Date.now() };
      h.conns.set(id, o);
      c.on('open', function () { if (H === h) ev('peer', id, 'online'); });
      c.on('data', function (d) {
        o.last = Date.now(); if (d === 'P') return;
        if (typeof d !== 'string') return;
        if (H === h) ev('msg', id, d);
      });
      var gone = function () { if (h.conns.get(id) === o) { h.conns.delete(id); if (H === h) ev('left', id, ''); } };
      c.on('close', gone); c.on('error', gone);
    });
    peer.on('disconnected', function () { if (H === h && !h.dead) try { peer.reconnect(); } catch (e) { } });
    peer.on('error', function (err) {
      if (H !== h) return;
      var t = err && err.type;
      if (t === 'unavailable-id' && tries < 6) { try { peer.destroy(); } catch (e) { } hostOpen(h, tries + 1); return; }
      if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return; // se reintenta solo
      ev('hosterr', t || 'error', '');
    });
  }

  var api = {
    web: true, code: '',
    /* ---- anfitrión ---- */
    host: function (room, max) {
      hostStop();
      var h = H = { peer: null, code: '', max: max || 4, conns: new Map(), nid: 0, dead: false };
      loadLib().then(function () {
        if (H !== h) return;
        hostOpen(h, 0);
        h.tick = setInterval(function () {
          var now = Date.now();
          h.conns.forEach(function (o, id) {
            sendRaw(o.c, 'P');
            if (now - o.last > DEAD_MS) { try { o.c.close(); } catch (e) { } if (h.conns.get(id) === o) { h.conns.delete(id); ev('left', id, ''); } }
          });
        }, PING_MS);
      }).catch(function (e) { if (H === h) ev('hosterr', String(e && e.message || e), ''); });
      return 'ok';
    },
    setInfo: function () { },
    ips: function () { return '[]'; },
    stopHost: function () { hostStop(); },
    kick: function (id) { if (!H) return; var o = H.conns.get(+id); if (o) { H.conns.delete(+id); try { o.c.close(); } catch (e) { } ev('left', +id, ''); } },
    sendPeer: function (id, msg, drop) {
      if (!H) return; var o = H.conns.get(+id); if (!o || !o.c.open) return;
      if (drop && busy(o.c)) return;
      sendRaw(o.c, msg);
    },
    /* ---- cliente ---- */
    scan: function () { }, stopScan: function () { },
    join: function (code) {
      clientStop();
      code = clean(code);
      var c = C = { peer: null, conn: null, last: Date.now(), dead: false, tick: 0 };
      var fail = function (m) { if (C === c && !c.dead) { c.dead = true; ev('conn', 'fail', m); clientStop(); } };
      if (code.length < 4) { setTimeout(function () { fail('Código no válido'); }, 0); return; }
      loadLib().then(function () {
        if (C !== c) return;
        var peer = c.peer = new window.Peer(undefined, CFG);
        var stage = 'signal';
        var to = setTimeout(function () { fail(stage === 'signal' ? 'No se pudo contactar el servidor de salas (PeerJS). Revisa tu internet e intenta otra vez' : 'Se encontró la sala pero no se pudo abrir la conexión entre los dos (red/TURN). Prueba con WiFi o revisa el TURN'); }, 45000);
        peer.on('error', function (err) {
          clearTimeout(to);
          var t = err && err.type;
          if (c.conn && c.conn.open) return;
          fail(t === 'peer-unavailable' ? 'No existe una sala con ese código' : t === 'network' || t === 'socket-error' ? 'Sin conexión a internet' : 'Error de red: ' + (t || 'desconocido'));
        });
        peer.on('open', function () {
          stage = 'room';
          var conn = c.conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'none' });
          setTimeout(function () { try { var pc = conn.peerConnection; if (pc) pc.addEventListener('iceconnectionstatechange', function () { console.log('[lithos] ICE:', pc.iceConnectionState); }); } catch (e) { } }, 300);
          conn.on('open', function () {
            clearTimeout(to); c.last = Date.now();
            c.tick = setInterval(function () {
              sendRaw(conn, 'P');
              if (Date.now() - c.last > DEAD_MS && !c.dead) { c.dead = true; ev('closed', '', ''); clientStop(); }
            }, PING_MS);
            ev('conn', 'ok', '');
          });
          conn.on('data', function (d) { c.last = Date.now(); if (d === 'P' || typeof d !== 'string') return; ev('msg', '', d); });
          conn.on('close', function () { if (C === c && !c.dead) { c.dead = true; ev('closed', '', ''); clientStop(); } });
          conn.on('error', function () { if (C === c && !c.dead) { c.dead = true; ev('closed', '', ''); clientStop(); } });
        });
      }).catch(function (e) { fail(String(e && e.message || e)); });
    },
    sendHost: function (msg, drop) {
      if (!C || !C.conn || !C.conn.open) return;
      if (drop && busy(C.conn)) return;
      sendRaw(C.conn, msg);
    },
    leave: function () { clientStop(); }
  };
  window.LANB = api;
})();
