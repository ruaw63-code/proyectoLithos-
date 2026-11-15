/* ============================================================================
   MAZMORRA (v23) — modo estilo Soul Knight dentro de ProyectoLithos
   Se carga después del script principal y reutiliza sus globales (cv, dp, pref, AU, toast, gain, VK, TIERS, giveV…).
   Piezas: generador de pisos (salas + pasillos + puertas-barrera), físicas 2D con colisión contra casillas,
   personajes "vivos" (resortes, squash/stretch, capa verlet, armas con anticipación, empuje, hit-stop),
   enemigos con ataques avisados, jefe, cofres con cartas, portal al siguiente piso, HUD táctil.
   ============================================================================ */
(()=>{'use strict';
const T=40,WH=12,TAU=Math.PI*2,$=id=>document.getElementById(id);
const rnd=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rnd(a,b+.999)),clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,pick=a=>a[Math.floor(Math.random()*a.length)];
const ad=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;else if(d<-Math.PI)d+=TAU;return d};
const eo=t=>1-Math.pow(1-clamp(t,0,1),3),eio=t=>{t=clamp(t,0,1);return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2};
const OLC='#161622';
const D=window.DG={on:false,t:0};
/* v39: diagnóstico persistente (sobrevive a un cierre del juego). Se lee con el comando de mazmorra «errores». */
D.diag=[];try{D.diag=JSON.parse(localStorage.getItem('lithos-diag')||'[]').slice(-30)}catch(e){}
D.logDiag=function(m){try{const r=new Date().toTimeString().slice(0,8)+' '+m;if(D.diag[D.diag.length-1]&&D.diag[D.diag.length-1].slice(9)===m)return;D.diag.push(r);if(D.diag.length>30)D.diag.shift();localStorage.setItem('lithos-diag',JSON.stringify(D.diag))}catch(e){}};
window.addEventListener('error',e=>D.logDiag('ERR '+(e.message||'')+' @'+String(e.filename||'').split('/').pop()+':'+e.lineno));
window.addEventListener('unhandledrejection',e=>D.logDiag('PROMESA '+(e.reason&&e.reason.message||e.reason)));
document.addEventListener('visibilitychange',()=>{if(D.on)D.logDiag(document.hidden?'segundo plano':'vuelve a primer plano')});
let g,map,MW,MH,rooms,doors,E,PR,PT,PK,NUM,MK,FX,hero,cam,keys={},joy={x:0,y:0,id:null,bx:0,by:0},inp={atk:0},zoom=1,lastN=0,th;
const THEMES=[
 {n:'Catacumbas',f1:'#3a4258',f2:'#343c52',w:'#586079',wt:'#6e7794',wf:'#2a3044',bg:'#0a0c15',acc:'#6ac6ff'},
 {n:'Cavernas de lava',f1:'#4a3030',f2:'#432a2a',w:'#6a4038',wt:'#86513f',wf:'#34201e',bg:'#120707',acc:'#ff8a3a'},
 {n:'Glaciar',f1:'#3b566b',f2:'#355068',w:'#5f87a3',wt:'#86b0cc',wf:'#2c4458',bg:'#08121c',acc:'#bff0ff'}];
/* ---------- armas y mejoras ---------- */
const WP={
 sword:{n:'Espada',i:'🗡️',k:'melee',dm:14,cd:340,rg:74,arc:2.2,kb:7,len:34},
 axe:{n:'Hacha pesada',i:'🪓',k:'melee',dm:27,cd:640,rg:82,arc:2.7,kb:12,len:36,heavy:1},
 spear:{n:'Lanza',i:'🔱',k:'thrust',dm:19,cd:430,rg:118,arc:.5,kb:8,len:52},
 bow:{n:'Arco',i:'🏹',k:'bow',dm:12,cd:400,sp:11,kb:3,pierce:1},
 staff:{n:'Bastón mágico',i:'🔮',k:'magic',dm:9,cd:560,sp:7.5,kb:2,burst:3},
 dagger:{n:'Daga veloz',i:'🔪',k:'melee',dm:8,cd:190,rg:56,arc:1.7,kb:3,len:22},
 hammer:{n:'Martillo sísmico',i:'🔨',k:'melee',dm:34,cd:960,rg:80,arc:3,kb:16,len:34,slam:1},
 pistol:{n:'Pistola',i:'🔫',k:'gun',dm:9,cd:280,sp:14,kb:2,len:20,ch:70},
 shotgun:{n:'Escopeta',i:'💥',k:'gun',dm:6,cd:820,sp:12,kb:5,len:30,pellets:5,spread:.5,life:420,ch:90},
 wand:{n:'Varita',i:'🪄',k:'magic',dm:7,cd:260,sp:9.5,kb:2,burst:1,ch:90,homing:1}};
const RAR=[{n:'Común',c:'#cfd8dc',m:1},{n:'Rara',c:'#4cc9f0',m:1.25},{n:'Épica',c:'#c46cff',m:1.55},{n:'Legendaria',c:'#ffb020',m:1.9},{n:'Mítica',c:'#ff5a7a',m:2.3},{n:'Divina',c:'#b8fff0',m:2.8},{n:'Fundador',c:'#ffe27a',m:3.4}];
const ELS={fire:{n:'Fuego',i:'🔥',c:'#ff8a2a',k:'burn'},ice:{n:'Hielo',i:'❄️',c:'#7fdcff',k:'frost'},shock:{n:'Rayo',i:'⚡',c:'#ffe45a',k:'shock'},poison:{n:'Veneno',i:'☠️',c:'#7be07b',k:'poison'}},ELK=Object.keys(ELS);
const winst=(id,q,el,elq)=>({id,q:q||0,el:el||null,elq:el?(elq==null?q||0:elq):0,lv:0});const elP=t=>Math.min(.9,.35+.1*(t||0));
const WC=new WeakMap();const wFull=i=>{const k=i.q+'|'+i.lv;let c=WC.get(i);if(!c||c.k!==k){c={k,f:Object.assign({},WP[i.id],{dm:WP[i.id].dm*RAR[i.q].m*(1+.2*i.lv),id:i.id,inst:i})};WC.set(i,c)}return c.f};
const wName=i=>i.fd?WP[i.id].n+' del Fundador'+(i.lv?' +'+i.lv:''):WP[i.id].n+(i.el?' de '+ELS[i.el].n:i.fx==='explode'?' explosiva':i.fx==='bounce'?' rebotante':'')+(i.lv?' +'+i.lv:'');
const isR=w=>w.k==='bow'||w.k==='magic'||w.k==='gun';
const GT=[
 {t:'helm',n:'Casco de hierro',i:'🪖',m:{max:20}},{t:'helm',n:'Yelmo del cazador',i:'🪖',m:{crit:.1}},{t:'helm',n:'Corona de guerra',i:'👑',m:{dmgM:.1,max:10}},
 {t:'armor',n:'Cota de malla',i:'🦺',m:{shMax:1,max:15}},{t:'armor',n:'Manto sombrío',i:'🧥',m:{spdM:.08,dashM:-.15}},{t:'armor',n:'Coraza reforzada',i:'🛡️',m:{shMax:2,max:10}},
 {t:'amulet',n:'Amuleto vampírico',i:'📿',m:{vamp:2}},{t:'amulet',n:'Amuleto de fortuna',i:'🍀',m:{goldM:.3}},{t:'amulet',n:'Amuleto de poder',i:'💠',m:{dmgM:.12}},{t:'amulet',n:'Amuleto de celeridad',i:'⏱️',m:{rateM:.1}},{t:'amulet',n:'Amuleto de precisión',i:'🎯',m:{crit:.1}},{t:'amulet',n:'Amuleto de vigor',i:'❤️',m:{max:25}},
 {t:'boots',n:'Botas veloces',i:'👢',m:{spdM:.12}},{t:'boots',n:'Botas del viento',i:'🥾',m:{dashM:-.25,spdM:.05}},{t:'boots',n:'Botas de guerra',i:'👢',m:{dmgM:.1,max:10}}];
const GSLOT={helm:'Casco',armor:'Armadura',amulet:'Amuleto',boots:'Botas'},GXT=[{crit:.06},{regenH:1},{dmgM:.05},{spdM:.05},{max:10},{shMax:1},{goldM:.15},{rateM:.05}];
const GOLD_NM={'Corona ardiente':['Corona de guerra','👑'],'Coraza helada':['Coraza reforzada','🛡️'],'Amuleto explosivo':['Amuleto de poder','💠'],'Amuleto del rayo':['Amuleto de celeridad','⏱️'],'Amuleto venenoso':['Amuleto de precisión','🎯']},BAD_MODS=['burn','frost','shock','poison','explode','bounce','pierce','multi','wave'];
function cleanGear(g){if(!g||!g.m)return g;let ch=false;for(const k of BAD_MODS)if(k in g.m){delete g.m[k];ch=true}if(GOLD_NM[g.n]){g.i=GOLD_NM[g.n][1];g.n=GOLD_NM[g.n][0]}if(ch&&!Object.keys(g.m).length)g.m={dmgM:.05};return g}
const MT={rateM:v=>'+'+Math.round(v*100)+'% vel. de ataque',max:v=>'+'+v+' vida',shMax:v=>'+'+v+' escudo',spdM:v=>'+'+Math.round(v*100)+'% velocidad',dmgM:v=>'+'+Math.round(v*100)+'% daño',dashM:v=>'Esquiva '+Math.round(-v*100)+'% más rápida',crit:v=>'+'+Math.round(v*100)+'% crítico',vamp:v=>'Curas '+v+' al matar',goldM:v=>'+'+Math.round(v*100)+'% monedas',burn:v=>'Prende fuego (+'+v*30+'%)',frost:v=>'Ralentiza (+'+v*30+'%)',shock:v=>'Rayo encadenado (+'+v*30+'%)',poison:v=>'Envenena (+'+v*30+'%)',explode:v=>'Enemigos explotan',pierce:v=>'Atraviesa +'+v,multi:v=>'+'+v+' proyectil',regenH:v=>'Regeneras vida'};
const RAR_W=[40,35,15,5,2,1];
/* ---- dificultad y escala de los enemigos por piso (ajustables) ---- */
const DIFFS=[{n:'Fácil',i:'🟢',hp:.7,dm:.7,rw:.8,d:'Enemigos con menos vida y daño. Menos diamantes.'},{n:'Normal',i:'🟡',hp:1,dm:1,rw:1,d:'La experiencia equilibrada.'},{n:'Difícil',i:'🟠',hp:1.5,dm:1.3,rw:1.4,d:'Enemigos más duros. Más diamantes.'},{n:'Pesadilla',i:'🔴',hp:2.2,dm:1.7,rw:2,d:'Solo para valientes. El doble de diamantes.'}];
const dfx=()=>{const b=DIFFS[D.diff==null?1:D.diff]||DIFFS[1];if(D.co&&D.co.hs){const m=coMul();return Object.assign({},b,{hp:b.hp*m,dm:b.dm*m})}return b};
const HPC={a:.28,b:.012},DMC={a:.18,b:.004};
const hpScale=fl=>{const k=fl-1;return(1+k*HPC.a+k*k*HPC.b)*dfx().hp};
const dmScale=fl=>{const k=fl-1;return(1+k*DMC.a+k*k*DMC.b)*dfx().dm};
function rollRar(){let r=Math.random()*RAR_W.reduce((a,b)=>a+b,0);for(let q=0;q<RAR_W.length;q++){r-=RAR_W[q];if(r<0)return q}return 0}
function rollWeapon(fl,b){const q=rollRar(fl,b);return winst(pick(Object.keys(WP)),q,((q>=1&&Math.random()<.55)||Math.random()<.05)?pick(ELK):null)}
function rollGear(fl,b){const q=rollRar(fl,b),T=pick(GT),m={};for(const k in T.m){const v=T.m[k]*RAR[q].m;m[k]=Number.isInteger(T.m[k])?Math.max(1,Math.round(v)):Math.round(v*100)/100}
 if(q>=2&&Math.random()<.75){const x=pick(GXT),k=Object.keys(x)[0];m[k]=(m[k]||0)+x[k]}return{t:T.t,n:T.n,i:T.i,q,m}}
function applyMods(m,s){const h=hero;for(const k in m){h[k]=(h[k]||0)+s*m[k];if(k==='max'){if(s>0)h.hp+=m[k];h.hp=Math.min(h.hp,h.max)}if(k==='shMax')h.sh=Math.min(h.shMax,h.sh+(s>0?m[k]:0))}}
const BUFFS=[
 {id:'dmg',i:'💪',n:'Fuerza',d:'+15% de daño',q:0,max:8,f:h=>h.dmgM+=.15},
 {id:'hp',i:'❤️',n:'Vitalidad',d:'+25 de vida máxima y curación total',q:0,max:8,f:h=>{h.max+=25;h.hp=h.max}},
 {id:'spd',i:'👟',n:'Botas ligeras',d:'+10% de velocidad',q:0,max:3,f:h=>h.spdM+=.10},
 {id:'shd',i:'🛡️',n:'Escudo extra',d:'+1 de escudo',q:0,max:5,f:h=>{h.shMax+=1;h.sh=h.shMax}},
 {id:'rate',i:'⚡',n:'Frenesí',d:'+12% de velocidad de ataque',q:1,max:5,f:h=>h.rateM+=.12},
 {id:'vamp',i:'🧛',n:'Vampirismo',d:'Curas 2 de vida al matar',q:1,max:3,f:h=>h.vamp+=2},
 {id:'dash',i:'🌀',n:'Esquiva veloz',d:'Esquiva recarga 20% más rápido',q:0,max:3,f:h=>h.dashM*=.8},
 {id:'multi',i:'🏹',n:'Disparo múltiple',d:'Arcos, pistolas y varitas lanzan +1 proyectil',q:2,max:2,rng:1,f:h=>h.multi++},
 {id:'pierce',i:'🎯',n:'Perforación',d:'Tus proyectiles atraviesan +1 enemigo',q:1,max:2,rng:1,f:h=>h.pierce++},
 {id:'wave',i:'🌊',n:'Onda de ataque',d:'Tus golpes cuerpo a cuerpo lanzan una onda que llega más lejos',q:2,max:1,mel:1,f:h=>h.wave++},
 {id:'crit',i:'💥',n:'Golpe crítico',d:'+10% de crítico (x2 de daño)',q:1,max:4,f:h=>h.crit+=.10},
 {id:'gold',i:'🍀',n:'Suerte',d:'+30% de monedas',q:0,max:3,f:h=>h.goldM+=.3},
 {id:'regen',i:'💗',n:'Regeneración',d:'Recuperas 1 de vida cada 3 s',q:1,max:3,f:h=>h.regenH++},
 /* efectos de arma: CAMBIAN el efecto del arma que llevas en la mano (un arma = un solo efecto) */
 {id:'burn',i:'🔥',n:'Hoja ardiente',d:'Tu arma actual pasa a prender fuego. Reemplaza su efecto; si ya quemaba, sube la probabilidad',q:1,fx:1,f:h=>setWFx('fire')},
 {id:'frost',i:'❄️',n:'Toque helado',d:'Tu arma actual pasa a ralentizar. Reemplaza su efecto; si ya helaba, sube la probabilidad',q:1,fx:1,f:h=>setWFx('ice')},
 {id:'shock',i:'⚡',n:'Rayo encadenado',d:'Tu arma actual pasa a lanzar rayos entre enemigos. Reemplaza su efecto; si ya electrocutaba, sube la probabilidad',q:2,fx:1,f:h=>setWFx('shock')},
 {id:'poison',i:'☠️',n:'Veneno',d:'Tu arma actual pasa a envenenar. Reemplaza su efecto; si ya envenenaba, sube la probabilidad',q:1,fx:1,f:h=>setWFx('poison')},
 {id:'explode',i:'🧨',n:'Muerte explosiva',d:'Los enemigos que mate tu arma actual explotan. Reemplaza su efecto',q:2,fx:1,f:h=>setWFx('explode')},
 {id:'bounce',i:'↩️',n:'Rebote',d:'Los proyectiles de tu arma actual rebotan en las paredes. Reemplaza su efecto',q:1,fx:1,rng:1,f:h=>setWFx('bounce')}];
const curI=()=>hero.wps[hero.wi]||hero.wps[0]||hero.wps[1];
function setWFx(type){const w=curI();if(!w)return;if(!w.b0)w.b0={el:w.el,elq:w.elq,fx:w.fx||null};
 if(ELS[type]){if(w.el===type)w.elq=Math.min(5,(w.elq||0)+1);else{w.el=type;w.elq=Math.min(5,w.q||0)}w.fx=null}else{w.fx=type;w.el=null;w.elq=0}}
function restoreFx(){const fix=w=>{if(w&&w.b0){w.el=w.b0.el;w.elq=w.b0.elq;w.fx=w.b0.fx;delete w.b0}};try{hero.wps.forEach(fix)}catch(e){}const L=pref.dgi;if(L){(L.eq&&L.eq.w||[]).forEach(fix);(L.bag||[]).forEach(it=>it&&it.k==='w'&&fix(it.w));for(const id in(L.fdw||{}))fix(L.fdw[id])}}
function buffOk(b){const h=hero,w=curI(),wd=w&&WP[w.id];if(b.max&&((h.picks||{})[b.id]||0)>=b.max)return false;if(b.rng&&!(wd&&isR(wd)))return false;if(b.mel&&wd&&isR(wd))return false;return true}
function applyBuff(b){const h=hero;h.picks=h.picks||{};h.picks[b.id]=(h.picks[b.id]||0)+1;b.f(h)}
/* ---------- efectos elementales y estados ---------- */
const nearestTo=(x,y,rg)=>{let b=null,bd=rg*rg;for(const e of E){if(e.dead||e.spawn>D.t)continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<bd){bd=d;b=e}}return b};
function applyElems(e,dmg,el,elq){if(!el||(el!=='water'&&Math.random()>=elP(elq)))return;
 if(el==='water'){e.wetT=D.t+3500;e.frzT=Math.max(e.frzT||0,D.t+1300);if(e.burnT>D.t){e.burnT=0;sparks(e.x,e.y-e.r,'#bfe8ff',8,2)}for(let i=0;i<4;i++)part(e.x+rnd(-8,8),e.y-e.r,rnd(-.6,.6),-1,380,'#4fc3ff',2.6,.004,'dust')}
 else if(el==='fire'){e.burnT=D.t+3000;e.burnD=Math.max(e.burnD||0,1+dmg*.06);if(!(e.burnN>D.t))e.burnN=D.t+400}
 else if(el==='ice')e.frzT=D.t+2200;
 else if(el==='poison'){e.poiT=D.t+4200;e.poiD=Math.max(e.poiD||0,1+dmg*.035);if(!(e.poiN>D.t))e.poiN=D.t+600}
 else if(el==='shock'&&!D.chain){D.chain=1;let n=0;e.shkT=D.t+300;for(const o of E){if(o===e||o.dead||o.spawn>D.t||n>=2)continue;if(Math.hypot(o.x-e.x,o.y-e.y)<120){n++;D.bolts.push({x1:e.x,y1:e.y-10,x2:o.x,y2:o.y-10,t:D.t});o.shkT=D.t+300;hitEnemy(o,dmg*.4,Math.atan2(o.y-e.y,o.x-e.x),1,false,true)}}D.chain=0}}
function dotHit(e,d,c){if(e.dead||e.shield)return;e.hp-=d;num(e.x+rnd(-6,6),e.y-e.r-14,Math.max(1,Math.round(d)),c);if(e.hp<=0){e.lastFx=null;killEnemy(e)}}
function statusTick(e,now){if(e.burnT>now){if(now>e.burnN){e.burnN=now+500;dotHit(e,e.burnD,'#ff9a30')}if(Math.random()<.2)part(e.x+rnd(-6,6),e.y-e.r,rnd(-.2,.2),-.7,420,'#ff9a30',2.4,-.003,'ember')}
 if(e.poiT>now){if(now>e.poiN){e.poiN=now+600;dotHit(e,e.poiD,'#7be07b')}if(Math.random()<.12)part(e.x+rnd(-6,6),e.y-e.r,0,-.4,500,'#7be07b',2.4,-.002,'dust')}
 if(e.frzT>now&&Math.random()<.1)part(e.x+rnd(-8,8),e.y-e.r,0,.2,500,'#bff0ff',2.6,.0006,'flake');
 if(e.wetT>now&&Math.random()<.12)part(e.x+rnd(-7,7),e.y-e.r*.6,0,.7,420,'#4fc3ff',2.2,.003,'dust')}
function boom(e){const r=75,d=Math.max(6,e.max*.25);D.exp=1;for(const o of E){if(o===e||o.dead||o.spawn>D.t)continue;if(Math.hypot(o.x-e.x,o.y-e.y)<r+o.r)hitEnemy(o,d,Math.atan2(o.y-e.y,o.x-e.x),6,false,true)}D.exp=0;D.rings.push({x:e.x,y:e.y,t:D.t,R:r,c:'#ff9a30'});sparks(e.x,e.y-8,'#ffb040',14,5);shake(4);sfx('crumble')}
function spawnWv(w,ang){const h=hero,n=h.wave;PR.push({x:h.x+Math.cos(ang)*24,y:h.y-16+Math.sin(ang)*24,vx:Math.cos(ang)*7.5,vy:Math.sin(ang)*7.5,r:13+n*4,dm:w.dm*h.dmgM*(.55+.1*n),crit:false,kb:5,from:'h',oi:HI(),arrow:false,wave:true,life:380+130*n,pierce:99,bounce:0,hit:new Set(),col:DGART.accent(),a:ang,el:w.inst.el,elq:w.inst.elq,fx:w.inst.fx})}
function slamHit(w,a,hitSet){const h=hero,x=h.x+Math.cos(h.aim)*72,y=h.y+Math.sin(h.aim)*72;D.rings.push({x,y,t:D.t,R:105,c:'#ffd28a'});shake(10);dust(x,y,16,'#b8a888');sfx('crumble');for(const e of E){if(e.dead||e.spawn>D.t||hitSet.has(e))continue;if(Math.hypot(e.x-x,e.y-y)<105+e.r)hitEnemy(e,w.dm*h.dmgM*.6,Math.atan2(e.y-y,e.x-x),8,false)}}
/* ---------- botín: cofres, armas, equipo, cartas, mesa de encantamiento ---------- */
const boxEl=()=>$('dgp');
function closeMenu(){boxEl().style.display='none';D.paused=false;D.shopping=0;lastN=performance.now()}
const rc=q=>RAR[q].c;
function wCard(i){const f=wFull(i),cdv=(1000/(f.cd/((D.on&&hero)?hero.rateM:1))).toFixed(1),el=i.el?ELS[i.el]:null;return'<div class="dgi"><i>'+wImg(i,46)+'</i><div><b style="color:'+rc(i.q)+'">'+wName(i)+'</b><small>'+RAR[i.q].n+' · '+(f.k==='melee'?'Cuerpo a cuerpo':f.k==='thrust'?'Estocada':f.k==='bow'?'Arco':f.k==='gun'?'Arma de fuego':'Magia')+'</small><small>Daño '+Math.round(f.dm)+(f.pellets?' x'+f.pellets:'')+' · '+cdv+' ataques/s</small>'+(el?'<small style="color:'+el.c+'">'+el.i+' '+el.n+': '+Math.round(elP(i.elq)*100)+'% de activarse</small>':'')+(i.fx?'<small style="color:#ffb347">'+(i.fx==='explode'?'🧨 Los enemigos que mata explotan':'↩️ Sus proyectiles rebotan')+'</small>':'')+(i.fd?'<small style="color:#ffe27a">🏺 Arma de Fundador · si se pierde, regresa en 10 min</small>':'')+(f.slam?'<small>Golpe sísmico en área</small>':'')+(f.homing?'<small>Proyectiles teledirigidos</small>':'')+'</div></div>'}
function gCard(g){let m='';for(const k in g.m)m+='<small>'+(MT[k]?MT[k](g.m[k]):k)+'</small>';return'<div class="dgi"><i>'+g.i+'</i><div><b style="color:'+rc(g.q)+'">'+g.n+'</b><small>'+GSLOT[g.t]+' · '+RAR[g.q].n+'</small>'+m+'</div></div>'}
function lootStart(c){const h=hero,q=c.q||0,fl=D.floor;if(q>=1)soulGain(q>=3?60:q===2?15:8);const gold=Math.round(ri(10,18)*(1+fl*.5)*(1+q*.7)*h.goldM);h.coins+=gold;D.coinsT+=gold;sfx('coin');num(h.x,h.y-52,'+'+gold+' 🪙','#ffd84a',true);
 const Q=[];if(Math.random()<.7+q*.1)Q.push({t:'w',w:rollWeapon(fl,q*.12)});if(Math.random()<.4+q*.1)Q.push({t:'g',g:rollGear(fl,q*.12)});if(!Q.length)Q.push({t:'w',w:rollWeapon(fl,q*.12)});if(Math.random()<.28+q*.2)Q.push({t:'r'});if(c.cards)Q.push({t:'c'});
 D.paused=true;D.lootQ=Q;nextLoot(gold)}
function nextLoot(g0){const it=D.lootQ.shift();if(!it){closeMenu();return}if(it.t==='w')weaponMenu(it.w,g0);else if(it.t==='g')gearMenu(it.g,g0);else if(it.t==='r')runeMenu();else cardMenu(g0)}
function equipW(s,i){const h=hero;{const o=h.wps[s];if(o&&o.fd&&o!==i&&!D.cheated)fdSeal(o.id,o)}h.wps[s]=i;h.wi=s;h.atk=null;h.wo=0;h.pull=0;h.cd=D.t+200;toast(WP[i.id].i+' '+wName(i));sparks(h.x,h.y-16,rc(i.q),14,4);sfx('upgrade')}
function slotHtml(s){const i=hero.wps[s];return'<small>ARMA '+(s+1)+(s===hero.wi?' (en mano)':'')+'</small>'+(i?'<i>'+wImg(i,40)+'</i><b style="color:'+rc(i.q)+'">'+wName(i)+'</b>':'<i>➕</i><b>Vacío</b>')}
function weaponMenu(inst,g0,cb){if(!cb){cb=()=>nextLoot();cb.loot=1}const b=boxEl(),h=hero;
 b.innerHTML='<div class="tpb dgc"><h3>'+(D.shopping?'🛒 Comprar':'🎁 ¡Cofre abierto!')+'</h3>'+(g0?'<div class="dgg">+'+g0+' 🪙</div>':'')+'<div class="dgit" style="border-color:'+rc(inst.q)+'">'+wCard(inst)+'</div><p class="dgq">¿En cuál espacio quieres guardar esta arma?</p><div class="dgsl"><button class="dgslb" data-s="0">'+slotHtml(0)+'</button><button class="dgslb" data-s="1">'+slotHtml(1)+'</button></div>'+(D.shopping?'<button class="b dgno">↩️ No comprar</button>':(cb.loot&&pouchFree()>0?'<button class="b dgpk">🎒 Guardar en el botín</button>':'')+'<button class="b dgno">🗑️ Descartar</button>')+'</div>';b.style.display='flex';
 const pk=b.querySelector('.dgpk');if(pk)pk.onclick=()=>{if(pouchAdd({k:'w',w:inst}))toast('🎒 Guardada en tu botín');cb(false)};b.querySelector('.dgno').onclick=()=>cb(false);
 b.querySelectorAll('.dgslb').forEach(btn=>btn.onclick=()=>{const s=+btn.dataset.s,old=h.wps[s];if(!old){equipW(s,inst);cb(true);return}
  b.innerHTML='<div class="tpb dgc"><h3>⚠️ ¿Estás seguro?</h3><p class="dgq">Si cambias de arma por esta, <b>se perderá</b> el arma del espacio '+(s+1)+' y conservarás la nueva.</p><div class="dgit dgold">'+wCard(old)+'</div><div class="dgar">⬇️</div><div class="dgit" style="border-color:'+rc(inst.q)+'">'+wCard(inst)+'</div><button class="b dgyes">✅ Sí, cambiar</button><button class="b dgno2">↩️ No, volver</button></div>';
  b.querySelector('.dgyes').onclick=()=>{equipW(s,inst);cb(true)};b.querySelector('.dgno2').onclick=()=>weaponMenu(inst,g0,cb)})}
function gearMenu(g,g0,cb){if(!cb){cb=()=>nextLoot();cb.loot=1}const b=boxEl(),h=hero,old=h.gear[g.t];
 b.innerHTML='<div class="tpb dgc"><h3>🎁 '+(g0?'¡Cofre abierto!':'Equipo encontrado')+'</h3>'+(g0?'<div class="dgg">+'+g0+' 🪙</div>':'')+'<div class="dgit" style="border-color:'+rc(g.q)+'">'+gCard(g)+'</div>'+(old?'<p class="dgq">Ya llevas en '+GSLOT[g.t]+':</p><div class="dgit dgold">'+gCard(old)+'</div>':'<p class="dgq">Tienes libre el espacio de '+GSLOT[g.t]+'.</p>')+'<button class="b dgyes">'+(old?'🔁 Reemplazar':'✅ Equipar')+'</button>'+(D.shopping?'<button class="b dgno">↩️ No comprar</button>':(cb.loot&&pouchFree()>0?'<button class="b dgpk">🎒 Guardar en el botín</button>':'')+'<button class="b dgno">🗑️ Descartar</button>')+'</div>';b.style.display='flex';
 const pk=b.querySelector('.dgpk');if(pk)pk.onclick=()=>{if(pouchAdd({k:'g',g}))toast('🎒 Guardado en tu botín');cb(false)};b.querySelector('.dgno').onclick=()=>cb(false);
 b.querySelector('.dgyes').onclick=()=>{if(!old){equipG(g);cb(true);return}
  b.innerHTML='<div class="tpb dgc"><h3>⚠️ ¿Estás seguro?</h3><p class="dgq">Si cambias el equipo, <b>se perderá</b> el actual y conservarás el nuevo.</p><div class="dgit dgold">'+gCard(old)+'</div><div class="dgar">⬇️</div><div class="dgit" style="border-color:'+rc(g.q)+'">'+gCard(g)+'</div><button class="b dgyes2">✅ Sí, cambiar</button><button class="b dgno2">↩️ No, volver</button></div>';
  b.querySelector('.dgyes2').onclick=()=>{equipG(g);cb(true)};b.querySelector('.dgno2').onclick=()=>gearMenu(g,g0,cb)}}
function equipG(g){const h=hero,old=h.gear[g.t];if(old)applyMods(old.m,-1);h.gear[g.t]=g;applyMods(g.m,1);toast(g.i+' '+g.n);sparks(h.x,h.y-16,rc(g.q),14,4);sfx('upgrade')}
function cardMenu(g0){const b=boxEl(),h=hero,pool=BUFFS.filter(buffOk),opts=[];while(opts.length<3&&pool.length){let k=Math.floor(Math.random()*pool.length);if(pool[k].q>0&&Math.random()<.4)k=Math.floor(Math.random()*pool.length);opts.push(pool.splice(k,1)[0])}
 b.innerHTML='<div class="tpb dgc"><h3>✨ Elige una mejora</h3><div class="dgcg"></div></div>';b.style.display='flex';const gg=b.querySelector('.dgcg');
 opts.forEach(o=>{const d=document.createElement('button');d.className='dgcard';d.style.borderColor=rc(Math.min(3,o.q+1));d.innerHTML='<i>'+o.i+'</i><b>'+o.n+'</b><small>'+o.d+'</small><em>'+['Común','Rara','Épica'][o.q]+'</em>';d.onclick=()=>{applyBuff(o);toast('✨ '+o.n);sparks(h.x,h.y-16,'#ffd84a',14,4);nextLoot()};gg.append(d)})}
function openChest(c){if(D.co){coChest(c);return}D.paused=true;sfx('upgrade');lootStart(c)}
const ENC_COST=(fl)=>40+15*fl,UP_COST=(i,fl)=>25*(i.lv+1)+10*fl;
function tableMenu(tb){D.paused=true;enchPick(tb)}
function enchPick(tb){const b=boxEl(),h=hero;b.innerHTML='<div class="tpb dgc"><h3>🔮 Mesa de encantamiento</h3><div class="dgg">🪙 '+h.coins+'</div><p class="dgq">¿Qué arma quieres encantar?</p><div class="dgsl"><button class="dgslb" data-s="0">'+slotHtml(0)+'</button><button class="dgslb" data-s="1">'+slotHtml(1)+'</button></div><button class="b dgno">🚪 Salir</button></div>';b.style.display='flex';
 b.querySelector('.dgno').onclick=()=>{tb.armed=false;closeMenu()};b.querySelectorAll('.dgslb').forEach(btn=>btn.onclick=()=>{const s=+btn.dataset.s;if(h.wps[s])enchOpts(tb,s)})}
function enchOpts(tb,s){const b=boxEl(),h=hero,i=h.wps[s],fl=D.floor,ec=Math.round(20+8*fl),uc=UP_COST(i,fl),R=DI().runes;
 let btns='',any=false;ELK.forEach(k=>R[k].forEach((n,t)=>{if(n>0){any=true;btns+='<button class="b dgel" data-k="'+k+'" data-t="'+t+'" style="border-color:'+rc(t)+'">'+ELS[k].i+' Runa de '+ELS[k].n+' · <b style="color:'+rc(t)+'">'+RAR[t].n+'</b> ×'+n+' — '+ec+' 🪙 (activa '+Math.round(elP(t)*100)+'%)</button>'}}));
 if(!any)btns='<p class="dgq">🔮 No tienes runas elementales.<br>Búscalas en cofres, élites y jefes.</p>';
 b.innerHTML='<div class="tpb dgc"><h3>🔮 Encantar</h3><div class="dgg">🪙 '+h.coins+'</div><div class="dgit" style="border-color:'+rc(i.q)+'">'+wCard(i)+'</div>'+btns+(i.lv<5?'<button class="b dgup">⬆️ Mejorar a +'+(i.lv+1)+' (+20% daño) — '+uc+' 🪙</button>':'<small>Nivel máximo</small>')+(i.el?'<small>Una runa nueva reemplaza el elemento anterior.</small>':'')+'<button class="b dgno">↩️ Volver</button></div>';
 b.querySelector('.dgno').onclick=()=>enchPick(tb);
 const pay=c=>{if(h.coins<c){toast('🪙 No te alcanza');return false}h.coins-=c;return true},done=()=>{sfx('upgrade');sparks(h.x,h.y-16,'#c8a0ff',20,5);dust(tb.x,tb.y,10,'#c8a0ff');enchOpts(tb,s)};
 b.querySelectorAll('.dgel').forEach(bt=>bt.onclick=()=>{const k=bt.dataset.k,t=+bt.dataset.t;if(!(R[k][t]>0)||!pay(ec))return;R[k][t]--;i.el=k;i.elq=t;try{savePref()}catch(e){}done()});
 const up=b.querySelector('.dgup');if(up)up.onclick=()=>{if(!pay(uc))return;i.lv++;WC.delete(i);done()}}
/* ---------- mascotas aliadas ---------- */
const PET={
 wolf:{n:'Lobo',i:'🐺',hp:70,dm:9,sp:3.5,rg:30,cd:560,k:'melee',r:10,d:'Rápido: muerde sin parar'},
 knight:{n:'Caballero',i:'🛡️',hp:110,dm:13,sp:2.6,rg:40,cd:760,k:'melee',r:11,d:'Tanque con tu misma vida'},
 mage:{n:'Aprendiz mago',i:'🧙',hp:60,dm:8,sp:2.6,rg:240,cd:700,k:'ranged',r:10,d:'Lanza chispas mágicas'},
 phoenix:{n:'Fénix del Fundador',i:'🔥',hp:130,dm:12,sp:3.2,rg:230,cd:640,k:'ranged',r:10,d:'Fuego sagrado: quema a distancia',el:'fire',fd:1},
 gfire:{n:'Golem de Fuego',i:'🌋',hp:150,dm:11,sp:2.1,rg:38,cd:900,k:'melee',r:12,d:'Puños de lava: sus golpes queman',el:'fire'},
 gice:{n:'Golem de Hielo',i:'🧊',hp:160,dm:10,sp:2,rg:38,cd:920,k:'melee',r:12,d:'Puños helados: sus golpes congelan',el:'ice'},
 gshock:{n:'Golem de Rayo',i:'⚡',hp:140,dm:11,sp:2.3,rg:38,cd:860,k:'melee',r:12,d:'Puños eléctricos: su golpe salta entre enemigos',el:'shock'},
 gpoison:{n:'Golem de Veneno',i:'☣️',hp:155,dm:9,sp:2.1,rg:38,cd:900,k:'melee',r:12,d:'Puños tóxicos: sus golpes envenenan',el:'poison'},
 gwater:{n:'Golem de Agua',i:'💧',hp:170,dm:9,sp:2.1,rg:38,cd:900,k:'melee',r:12,d:'Puños de agua: mojan, frenan y apagan el fuego',el:'water'},
 otter:{n:'Sr. Nutria',i:'🦦',hp:90,dm:8,sp:3,rg:210,cd:760,k:'ranged',r:10,d:'Burbujas de agua que mojan y frenan; apagan el fuego',el:'water'},
 dragon:{n:'Dragoncito',i:'🐲',hp:80,dm:7,sp:2.9,rg:200,cd:880,k:'ranged',r:10,d:'Escupe fuego que quema',el:'fire'},
 firefly:{n:'Luciérnaga del Fundador',i:'🪲',hp:70,dm:0,sp:3.4,rg:0,cd:99999,k:'support',r:8,d:'Recoge las monedas cercanas. No ataca.',fd:1}};
const petMul=lv=>1+.12*(lv-1);
function mkPet(k,lv){const d=PET[k],m=petMul(lv),h=hero;return{k,x:h.x+rnd(-18,18),y:h.y+rnd(18,30),vx:0,vy:0,r:d.r,hp:Math.round(d.hp*m),max:Math.round(d.hp*m),dm:d.dm*m,lv,ph:rnd(0,6),face:1,sq:0,sqv:0,flash:0,cd:D.t+500,atk:0,aim:0,inv:0,down:0,rst:0,hurtT:-9999,rg:0,healT:0}}
function addPet(k){const p=mkPet(k,D.floor);D.pets.push(p);sparks(p.x,p.y-10,'#7be07b',16,4);D.rings.push({x:p.x,y:p.y,t:D.t,R:50,c:'#7be07b'})}
function petLvl(p){const d=PET[p.k],m=petMul(++p.lv);p.max=Math.round(d.hp*m);p.dm=d.dm*m;p.hp=Math.min(p.max,p.hp+p.max*.4)}
function petHeal(p){const a=Math.round(p.max*.4);p.hp=Math.min(p.max,p.hp+a);p.healT=D.t;num(p.x,p.y-34,'+'+a,'#7be07b');sparks(p.x,p.y-10,'#7be07b',10,2.5)}
function petRevive(p,f){p.down=0;p.hp=Math.max(p.hp,Math.round(p.max*f));p.inv=D.t+1200;p.healT=D.t;sparks(p.x,p.y-10,'#7be07b',14,3);D.rings.push({x:p.x,y:p.y,t:D.t,R:44,c:'#7be07b'});num(p.x,p.y-34,'¡De vuelta!','#7be07b')}
function petHurt(p,d,fx,fy){if(p.down||D.t<p.inv)return;d*=.75;p.inv=D.t+600;p.hp-=d;p.hurtT=D.t;p.flash=D.t+140;const a=Math.atan2(p.y-fy,p.x-fx);p.vx+=Math.cos(a)*4;p.vy+=Math.sin(a)*4;p.sqv+=.4;num(p.x,p.y-30,'-'+Math.round(d),'#ff9a9a');sparks(p.x,p.y-10,'#ff6a6a',5,3);
 if(p.hp<=0){p.hp=0;p.down=1;p.rst=0;sparks(p.x,p.y-10,'#ffffff',12,3);num(p.x,p.y-38,'💫','#fff');sfx('hurtP')}}
function heartTarget(k){const h=hero,c=[];if(h.hp<h.max)c.push(h);for(const p of D.pets)if(!p.down&&p.hp<p.max)c.push(p);if(!c.length)return h;let b=c[0],bd=1e9;for(const o of c){const d=Math.hypot(o.x-k.x,o.y-k.y);if(d<bd){bd=d;b=o}}return b}
function updPets(dt){const h=hero,now=D.t;if(h.dead)return;const live=E.some(e=>!e.dead&&e.spawn<=now);
 D.pets.forEach((p,pi)=>{const d=PET[p.k];
  p.sqv+=(-p.sq*.3)*dt;p.sqv*=Math.pow(.72,dt);p.sq=clamp(p.sq+p.sqv*dt,-.4,.5);
  if(p.down){p.vx*=.8;p.vy*=.8;p.rst+=dt*16.67;if(p.rst>14000&&!live)petRevive(p,.4);return}
  if(d.k==='support')for(const q of PK)if(q.t==='coin'&&!q.got){const mx=h.x-q.x,my=h.y-q.y,md=Math.hypot(mx,my);if(md<150&&md>8){q.x+=mx/md*3.2*dt;q.y+=my/md*3.2*dt}}
  if(p.hp<p.max&&now-p.hurtT>4000&&!live){p.rg+=dt*16.67;if(p.rg>1400){p.rg=0;p.hp=Math.min(p.max,p.hp+2)}}
  let tx=h.x-h.face*26+Math.sin(now/700+pi*2)*14,ty=h.y+16+(pi-1)*18,sp=d.sp,mode='follow';
  let heart=null;if(p.hp<p.max*.7){let bd=260*260;for(const k of PK)if(k.t==='heart'&&!k.got){const dd=(k.x-p.x)**2+(k.y-p.y)**2;if(dd<bd){bd=dd;heart=k}}}
  let en=null;{const R=d.k==='ranged'?300:240;let bd=R*R;for(const e of E){if(e.dead||e.spawn>now)continue;const dd=(e.x-p.x)**2+(e.y-p.y)**2;if(dd<bd&&Math.hypot(e.x-h.x,e.y-h.y)<340){bd=dd;en=e}}}
  if(d.k==='support')en=null;
  if(heart){tx=heart.x;ty=heart.y;mode='heart';sp*=1.25}
  else if(en){mode='fight';const dist=Math.hypot(en.x-p.x,en.y-p.y);p.aim=Math.atan2(en.y-p.y,en.x-p.x);
   if(d.k==='melee'){tx=en.x;ty=en.y;if(dist<d.rg*.7+en.r)sp=0;
    if(dist<d.rg+en.r+p.r&&now>p.cd){p.cd=now+d.cd;p.atk=now;p.vx+=Math.cos(p.aim)*3;p.vy+=Math.sin(p.aim)*3;p.sqv-=.3;hitEnemy(en,p.dm*(1+(h.dmgM-1)*.5),p.aim,p.k==='knight'?7:d.el?6:4,false,!d.el,d.el,3);if(d.el)D.rings.push({x:en.x,y:en.y,t:D.t,R:44,c:d.el==='water'?'#4fc3ff':ELS[d.el].c});sfx('hit')}}
   else{if(dist<130){tx=p.x-Math.cos(p.aim)*80;ty=p.y-Math.sin(p.aim)*80}else if(dist>d.rg*.8){tx=en.x;ty=en.y}else sp=0;
    if(dist<d.rg+40&&now>p.cd&&los(p.x,p.y,en.x,en.y)){p.cd=now+d.cd;p.atk=now;const sp2=7.5,ec=d.el==='water'?'#4fc3ff':d.el?ELS[d.el].c:'#c46cff';PR.push({x:p.x,y:p.y-14,vx:Math.cos(p.aim)*sp2,vy:Math.sin(p.aim)*sp2,r:5,dm:p.dm*(1+(h.dmgM-1)*.5),kb:2,from:'h',oi:HI(),arrow:false,life:900,pierce:0,bounce:0,hit:new Set(),col:ec,a:p.aim,pet:1,noel:!d.el,el:d.el,elq:2});p.vx-=Math.cos(p.aim)*1.2;p.vy-=Math.sin(p.aim)*1.2;p.sqv+=.2;sfx('magic')}}}
  const dx=tx-p.x,dy=ty-p.y,dd=Math.hypot(dx,dy)||1;let want=sp*Math.min(1,dd/40);if(mode==='follow'&&dd<22)want=0;
  p.vx+=(dx/dd*want-p.vx)*.14*dt;p.vy+=(dy/dd*want-p.vy)*.14*dt;
  if(mode!=='heart'&&Math.hypot(p.x-h.x,p.y-h.y)>340){p.x=h.x+rnd(-20,20);p.y=h.y+rnd(16,30);p.vx=p.vy=0;sparks(p.x,p.y-10,'#7be07b',8,3)}
  moveBody(p,dt,0,.2);const spd=Math.hypot(p.vx,p.vy);p.ph+=spd*.2*dt;
  if(mode==='fight')p.face=Math.cos(p.aim)>=0?1:-1;else if(Math.abs(p.vx)>.3)p.face=p.vx>0?1:-1;
  for(const e of E){if(e.dead||e.spawn>now)continue;
   if((e.st==='hop'||e.st==='dash'||e.st==='swoop'||e.st==='rush')&&Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r+4)petHurt(p,e.dm,e.x,e.y);
   if(e.ring){const R=(now-e.ring)/520*190;if(Math.abs(Math.hypot(p.x-e.rx,p.y-e.ry)-R)<22)petHurt(p,e.dm*.8,e.rx,e.ry)}}})}
function dropChest(R,q,cards,pos){let cx,cy,n=0;if(pos){cx=pos.x;cy=pos.y}else do{cx=R.px+rnd(-70,70);cy=R.py+rnd(-40,40);n++}while(Math.hypot(cx-hero.x,cy-hero.y)<80&&n<14);D.chests.push({x:cx,y:cy,open:0,q,cards,drop:D.t});sparks(cx,cy-10,q>1?'#ffd84a':'#cfd8dc',10,3)}
/* ---------- tienda del mercader ---------- */
function mkShop(x,y){const fl=D.floor,pr=(b,q)=>Math.round(b*(1+q*.8)*(1+fl*.12)),items=[];
 const w1=rollWeapon(fl,.08),w2=rollWeapon(fl,0),g1=rollGear(fl,.08),g2=rollGear(fl,0),b=pick(BUFFS.filter(buffOk));
 items.push({t:'w',w:w1,p:pr(220,w1.q)},{t:'w',w:w2,p:pr(220,w2.q)},{t:'g',g:g1,p:pr(180,g1.q)},{t:'g',g:g2,p:pr(180,g2.q)},{t:'c',b,p:Math.round((160+b.q*80)*(1+fl*.1))},{t:'p',p:Math.round(110+30*fl)},{t:'pet',k:pick(Object.keys(PET).filter(k=>!PET[k].fd)),p:Math.round(2200+60*fl)});
 return{k:'shop',x,y,armed:true,items}}
function shopMenu(s){D.paused=true;D.shopping=1;sfx('upgrade');shopShow(s)}
function shopShow(s){const b=boxEl(),h=hero;D.shopping=1;
 let html='<div class="tpb dgc"><h3>🛒 Tienda del mercader</h3><div class="dgg">🪙 '+h.coins+'</div><p class="dgq">Toca lo que quieras comprar</p><div class="dgsg">';
 s.items.forEach((it,i)=>{let ic,nm,ds,bc='#cfd8dc';
  if(it.t==='w'){const f=wFull(it.w);ic=f.i;nm=wName(it.w);ds=RAR[it.w.q].n+' · Daño '+Math.round(f.dm)+(f.pellets?'x'+f.pellets:'');bc=rc(it.w.q)}
  else if(it.t==='g'){ic=it.g.i;nm=it.g.n;ds=GSLOT[it.g.t]+' · '+Object.keys(it.g.m).map(k=>MT[k]?MT[k](it.g.m[k]):k).join(', ');bc=rc(it.g.q)}
  else if(it.t==='c'){ic=it.b.i;nm=it.b.n;ds=it.b.d;bc=rc(Math.min(3,it.b.q+1))}
  else if(it.t==='p'){ic='🧪';nm='Poción';ds='Cura toda tu vida y recarga el escudo';bc='#ff7a8a'}
  else{const d=PET[it.k];ic=d.i;nm=d.n+' (mascota)';ds=d.d+' · ❤ '+Math.round(d.hp*petMul(D.floor))+' · ⏳ Solo dura esta incursión (no se desbloquea)';bc='#7be07b'}
  html+='<button class="dgsi'+(it.sold?' sold':h.coins<it.p?' no':'')+'" data-i="'+i+'" style="border-color:'+bc+'"><i>'+ic+'</i><b style="color:'+bc+'">'+nm+'</b><small>'+ds+'</small><em>'+(it.sold?'VENDIDO':it.p+' 🪙')+'</em></button>'});
 html+='</div><button class="b dgno">🚪 Salir de la tienda</button></div>';b.innerHTML=html;b.style.display='flex';
 b.querySelector('.dgno').onclick=()=>closeMenu();
 b.querySelectorAll('.dgsi').forEach(bt=>bt.onclick=()=>{const it=s.items[+bt.dataset.i];if(it.sold)return;if(h.coins<it.p){toast('🪙 No te alcanza');sfx('click');return}
  const ok=()=>{h.coins-=it.p;it.sold=1;sfx('coin');shopShow(s)};
  if(it.t==='w')weaponMenu(it.w,0,r=>{if(r)ok();else shopShow(s)});
  else if(it.t==='g')gearMenu(it.g,0,r=>{if(r)ok();else shopShow(s)});
  else if(it.t==='c'){applyBuff(it.b);toast('✨ '+it.b.n);sparks(h.x,h.y-16,'#ffd84a',14,4);ok()}
  else if(it.t==='p'){if(h.hp>=h.max&&h.sh>=h.shMax){toast('Ya estás al máximo');return}healHero(h.max-h.hp);h.sh=h.shMax;ok()}
  else{if(D.pets.length>=3){toast('🐾 Ya tienes 3 mascotas');return}addPet(it.k);D.pets[D.pets.length-1].tmp=1;toast(PET[it.k].i+' ¡'+PET[it.k].n+' se une a ti! (solo esta incursión)');ok()}})}
/* ---------- panel de equipo (pausa) ---------- */
function eqPanel(){const h=hero;let s='<div class="dgeqp">';
 for(let i=0;i<2;i++)s+='<div class="dgit" style="border-color:'+(h.wps[i]?rc(h.wps[i].q):'#555')+'">'+(h.wps[i]?'<small>ARMA '+(i+1)+(i===h.wi?' (en mano)':'')+'</small>'+wCard(h.wps[i]):'<div class="dgi"><i>➕</i><div><b>Arma '+(i+1)+' vacía</b></div></div>')+'</div>';
 for(const k in h.gear){const g=h.gear[k];if(g)s+='<div class="dgit" style="border-color:'+rc(g.q)+'">'+gCard(g)+'</div>'}
 for(const p of D.pets)s+='<div class="dgit" style="border-color:#7be07b"><div class="dgi"><i>'+PET[p.k].i+'</i><div><b>'+PET[p.k].n+' Nv.'+p.lv+'</b><small>❤ '+Math.round(p.hp)+'/'+p.max+' · Daño '+Math.round(p.dm)+(p.down?' · 💫 caído (revive pronto)':'')+'</small></div></div></div>';
 return s+'<small>🎒 Botín '+D.pouch.length+'/'+POUCH_CAP+' · Punto de salida al superar el piso '+(Math.floor((D.floor-1)/10)+1)*10+'</small><br><small>Daño x'+h.dmgM.toFixed(2)+' · Crítico '+Math.round(h.crit*100)+'%'+(h.multi?' · +'+h.multi+' proyectil':'')+(h.wave?' · Onda '+h.wave:'')+'</small></div>'}
/* ---------- mochila persistente, runas, forja y preparación (v27) ---------- */
function DI(){let L=pref.dgi;if(!L||typeof L!=='object')L=pref.dgi={};
 if(!Array.isArray(L.bag))L.bag=[];if(!L.eq||typeof L.eq!=='object')L.eq={w:[winst('sword',0,null),null],g:{}};if(!Array.isArray(L.eq.w))L.eq.w=[null,null];if(!L.eq.g)L.eq.g={};
 for(const k in GSLOT)if(L.eq.g[k]===undefined)L.eq.g[k]=null;
 if(!L.runes)L.runes={};ELK.forEach(k=>{if(!Array.isArray(L.runes[k]))L.runes[k]=[0,0,0,0,0,0];while(L.runes[k].length<6)L.runes[k].push(0)});if(!L.fdw||typeof L.fdw!=='object')L.fdw={};L.cap=42;if(!Array.isArray(L.store))L.store=[];if(!Array.isArray(L.pets))L.pets=[];L.souls=Math.max(0,Math.floor(+L.souls)||0);if(!Array.isArray(L.hang))L.hang=[];while(L.hang.length<6)L.hang.push(null);
 L.bag.forEach(it=>{if(it&&it.k==='g')cleanGear(it.g);if(it&&it.k==='w'&&it.w.b0){it.w.el=it.w.b0.el;it.w.elq=it.w.b0.elq;it.w.fx=it.w.b0.fx;delete it.w.b0}});for(const k in L.eq.g)cleanGear(L.eq.g[k]);if(!(D.on&&!D.over&&!D.hub))L.eq.w.forEach(w=>{if(w&&w.b0){w.el=w.b0.el;w.elq=w.b0.elq;w.fx=w.b0.fx;delete w.b0}});return L}
const wImg=(i,px)=>{px=px||38;const u=DGART.wIcon(i.id,Object.assign({id:i.id},WP[i.id]),i.q,i.el,rc(i.q));return u?'<img class="wic" width="'+px+'" height="'+px+'" src="'+u+'" alt="">':WP[i.id].i};
const bagFree=()=>DI().cap-DI().bag.length;
function bagAdd(it){const L=DI();if(L.bag.length>=L.cap)return false;L.bag.push(it);try{savePref()}catch(e){}return true}
function applyLoadout(){const L=DI(),h=hero;h.wps=[L.eq.w[0]||null,L.eq.w[1]||null];if(!h.wps[0]&&!h.wps[1])h.wps[0]=winst('sword',0,null);h.wi=h.wps[0]?0:1;
 for(const k in GSLOT){const g=L.eq.g[k];if(g){h.gear[k]=g;applyMods(g.m,1)}}h.hp=h.max;h.sh=h.shMax}
function saveLoadout(){if(D.cheated)return;try{const L=DI();L.eq.w=hero.wps.slice(0,2);while(L.eq.w.length<2)L.eq.w.push(null);for(const k in GSLOT)L.eq.g[k]=hero.gear[k]||null;savePref()}catch(e){}}
function grantRune(b){const k=pick(ELK),t=rollRar(D.floor,b||0);DI().runes[k][t]++;try{savePref()}catch(e){}return{k,t}}
function runeMenu(){const r=grantRune(.05),b=boxEl();sfx('gem');
 b.innerHTML='<div class="tpb dgc"><h3>🔮 ¡Runa encontrada!</h3><div class="dgit" style="border-color:'+rc(r.t)+'"><div class="dgi"><i>'+ELS[r.k].i+'</i><div><b style="color:'+rc(r.t)+'">Runa de '+ELS[r.k].n+'</b><small>'+RAR[r.t].n+' · se activa el '+Math.round(elP(r.t)*100)+'%</small><small>Úsala en una Mesa de encantamiento. Se guarda en tu mochila.</small></div></div></div><button class="b dgyes">✅ Guardar runa</button></div>';b.style.display='flex';b.querySelector('.dgyes').onclick=()=>nextLoot()}
/* ---------- forja: minijuego del martillo ---------- */
const UPC=[.8,.65,.45,.3,.18];
const FGC=i=>Math.round((50+45*i.q)*(1+D.floor*.1));
function forgeMenu(f){D.paused=true;sfx('upgrade');forgePick(f)}
function forgePick(f){const b=boxEl(),h=hero;
 b.innerHTML='<div class="tpb dgc"><h3>🔨 Forja del herrero</h3><div class="dgg">🪙 '+h.coins+'</div><p class="dgq">Golpea el yunque en el momento exacto para mejorar la calidad de un arma.</p><div class="dgsl"><button class="dgslb" data-s="0">'+slotHtml(0)+'</button><button class="dgslb" data-s="1">'+slotHtml(1)+'</button></div><button class="b dgno">🚪 Salir</button></div>';b.style.display='flex';
 b.querySelector('.dgno').onclick=()=>{f.armed=false;closeMenu()};b.querySelectorAll('.dgslb').forEach(bt=>bt.onclick=()=>{const s=+bt.dataset.s;if(h.wps[s])forgeOpts(f,s)})}
function forgeOpts(f,s,msg){const b=boxEl(),h=hero,i=h.wps[s],mx=i.q>=5;
 b.innerHTML='<div class="tpb dgc"><h3>🔨 Forja</h3><div class="dgg">🪙 '+h.coins+'</div>'+(msg||'')+'<div class="dgit" style="border-color:'+rc(i.q)+'">'+wCard(i)+'</div>'+(mx?'<p class="dgq">¡Esta arma ya tiene la calidad máxima!</p>':'<p class="dgq">Mejorar a <b style="color:'+rc(i.q+1)+'">'+RAR[i.q+1].n+'</b><br>Probabilidad máxima: <b>'+Math.round(UPC[i.q]*100)+'%</b><br><small>Cada golpe fallado la reduce. Si fallas, no pierdes el arma.</small></p><button class="b dgfgo">🔨 Forjar — '+FGC(i)+' 🪙</button>')+'<button class="b dgno">↩️ Volver</button></div>';b.style.display='flex';
 b.querySelector('.dgno').onclick=()=>forgePick(f);const go=b.querySelector('.dgfgo');if(go)go.onclick=()=>forgeGame(f,s)}
function forgeGame(f,s){const b=boxEl(),h=hero,i=h.wps[s],q=i.q,cost=FGC(i);if(h.coins<cost){toast('🪙 No te alcanza');sfx('click');return}h.coins-=cost;
 b.innerHTML='<div class="tpb dgc"><h3>🔨 ¡Golpea en el momento justo!</h3><canvas id="dgfg" width="340" height="235" style="display:block;margin:0 auto;height:min(235px,46vh);width:auto;max-width:100%;border-radius:12px;touch-action:none"></canvas><button class="b dgfb">🔨 ¡GOLPEAR!</button></div>';b.style.display='flex';
 const cv=$('dgfg'),x=cv.getContext('2d'),N=5,W=340,H=235,w1=Math.max(.03,.06-.005*q),w2=Math.max(.08,.14-.012*q),HA=Math.atan2(78,-92),IA=HA+1.05;
 const G=D.fg={res:[],p:Math.random(),dir:1,ctr:.5,phase:'play',hitT:-1e9,sp:[],pop:[],shk:0,heat:1,last0:0,ok:false,ch:0};
 const newCtr=()=>{G.ctr=.22+Math.random()*.56};newCtr();
 G.tap=()=>{if(G.phase!=='play')return;const d=Math.abs(G.p-G.ctr),r=d<w1?'p':d<w2?'g':'m';G.res.push(r);G.phase='hit';G.hitT=performance.now();G.lastR=r;G.hitSp=0;
  G.pop.push({txt:r==='p'?'¡PERFECTO!':r==='g'?'¡Bien!':'¡Fallo!',c:r==='p'?'#7be07b':r==='g'?'#ffd84a':'#ff6a6a',t:performance.now()});sfx(r==='m'?'click':'hit')};
 cv.onpointerdown=e=>{e.preventDefault();G.tap()};b.querySelector('.dgfb').onpointerdown=e=>{e.preventDefault();G.tap()};
 const heatC=k=>'rgb('+Math.round(216+39*k)+','+Math.round(221-131*k)+','+Math.round(230-210*k)+')';
 const finish=()=>{const P=G.res.filter(r=>r==='p').length,Gd=G.res.filter(r=>r==='g').length;D.fg=null;
  let m;if(G.ok){i.q=q+1;WC.delete(i);sfx('upgrade');sparks(h.x,h.y-16,rc(i.q),24,5);m='<div class="dgres ok">✨ ¡ÉXITO!<br>Ahora es <b style="color:'+rc(i.q)+'">'+RAR[i.q].n+'</b></div>'}
  else{sfx('hurtP');m='<div class="dgres no">💥 No se mejoró esta vez<br><small>Tu arma sigue igual. ¡Inténtalo de nuevo!</small></div>'}
  m+='<small class="dgq">Golpes: '+P+' perfectos · '+Gd+' buenos · '+(N-P-Gd)+' fallos → '+Math.round(G.ch*100)+'%</small>';forgeOpts(f,s,m)};
 const draw=now=>{x.save();x.clearRect(0,0,W,H);const sk=G.shk>.3?(Math.random()-.5)*G.shk:0;G.shk*=.85;x.translate(sk,sk*.6);
  let gr=x.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#1b1424');gr.addColorStop(1,'#3a1a14');x.fillStyle=gr;x.fillRect(-10,-10,W+20,H+20);
  gr=x.createRadialGradient(170,205,10,170,205,200);gr.addColorStop(0,'rgba(255,120,30,.5)');gr.addColorStop(1,'rgba(255,120,30,0)');x.fillStyle=gr;x.fillRect(0,0,W,H);
  const poly=(p,c)=>{x.beginPath();p.forEach((q2,k)=>k?x.lineTo(q2[0],q2[1]):x.moveTo(q2[0],q2[1]));x.closePath();x.fillStyle=c;x.fill();x.lineWidth=2;x.strokeStyle='#161622';x.lineJoin='round';x.stroke()};
  poly([[128,198],[212,198],[200,176],[140,176]],'#444a5c');poly([[148,178],[192,178],[188,160],[152,160]],'#565d72');
  gr=x.createLinearGradient(0,146,0,162);gr.addColorStop(0,'#aab2c8');gr.addColorStop(1,'#565d72');poly([[60,156],[96,148],[250,148],[244,162],[120,162],[96,161]],gr);
  const hc=(G.phase==='end'&&G.ok&&now-G.endT>1200)?rc(q+1):heatC(G.heat);
  x.save();x.shadowColor=hc;x.shadowBlur=14+G.heat*14;x.beginPath();x.moveTo(116,147);x.lineTo(116,139);x.lineTo(222,141);x.lineTo(246,145);x.lineTo(222,147);x.closePath();x.fillStyle=hc;x.fill();x.restore();
  x.lineWidth=2;x.strokeStyle='#161622';x.stroke();x.fillStyle='#6a4a2a';x.fillRect(86,142,30,6);x.fillStyle='#e0a020';x.fillRect(114,135,6,16);
  // chispas
  const dt=Math.min(.05,(now-(G.last0||now))/1000);G.last0=now;
  for(const p of G.sp){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=420*dt;p.l-=dt;x.globalAlpha=Math.max(0,p.l/p.m);x.fillStyle=p.c;x.fillRect(p.x-1.5,p.y-1.5,3,3)}x.globalAlpha=1;G.sp=G.sp.filter(p=>p.l>0);
  // martillo
  let a=IA+Math.sin(now/300)*.04;const e=now-G.hitT;if(G.phase==='hit'||e<520){if(e<120)a=IA+(HA-IA)*(1-Math.pow(1-e/120,3));else if(e<520){const k=(e-120)/400;a=HA+(IA-HA)*(k*k*(3-2*k))}}
  const px=262,py=62,L=120,hx=px+Math.cos(a)*L,hy=py+Math.sin(a)*L;x.lineCap='round';x.beginPath();x.moveTo(px,py);x.lineTo(hx,hy);x.lineWidth=11;x.strokeStyle='#161622';x.stroke();x.lineWidth=7;x.strokeStyle='#8a5a2b';x.stroke();
  x.save();x.translate(hx,hy);x.rotate(a+Math.PI/2);gr=x.createLinearGradient(-22,0,22,0);gr.addColorStop(0,'#cfd8dc');gr.addColorStop(1,'#59606e');x.fillStyle=gr;x.beginPath();x.roundRect?x.roundRect(-24,-14,48,28,4):x.rect(-24,-14,48,28);x.fill();x.lineWidth=2.4;x.strokeStyle='#161622';x.stroke();x.fillStyle='#e0a020';x.fillRect(-4,-14,8,28);x.restore();
  if(G.phase==='hit'&&!G.hitSp&&e>110){G.hitSp=1;const r=G.lastR;G.shk=r==='m'?3:10;const n=r==='p'?30:r==='g'?16:5;for(let k=0;k<n;k++){const an=-Math.PI*(.05+Math.random()*.9),sp=60+Math.random()*200;G.sp.push({x:170,y:142,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,l:.7,m:.7,c:r==='p'?'#fff1a0':'#ffb040'})}G.heat=Math.max(.12,G.heat-(r==='p'?.17:r==='g'?.1:.03));x.fillStyle='rgba(255,255,255,.35)';x.fillRect(0,0,W,H)}
  // golpes
  for(let k=0;k<N;k++){const r=G.res[k];x.beginPath();x.arc(20+k*22,20,8,0,6.3);x.fillStyle=r==='p'?'#7be07b':r==='g'?'#ffd84a':r==='m'?'#ff6a6a':'#2a2a3a';x.fill();x.lineWidth=2;x.strokeStyle='#161622';x.stroke()}
  // barra de tiempo
  const bx=20,by=196,bw=300,bh=16;x.beginPath();x.roundRect?x.roundRect(bx-2,by-2,bw+4,bh+4,8):x.rect(bx-2,by-2,bw+4,bh+4);x.fillStyle='#10101c';x.fill();
  if(G.phase==='play'||G.phase==='hit'){x.fillStyle='rgba(255,216,74,.6)';x.fillRect(bx+(G.ctr-w2)*bw,by,2*w2*bw,bh);x.fillStyle='#4ae04a';x.fillRect(bx+(G.ctr-w1)*bw,by,2*w1*bw,bh);const cx=bx+G.p*bw;x.fillStyle='#fff';x.fillRect(cx-2,by-5,4,bh+10);x.beginPath();x.moveTo(cx-6,by-10);x.lineTo(cx+6,by-10);x.lineTo(cx,by-3);x.fill()}
  x.font='900 12px Trebuchet MS,sans-serif';x.textAlign='center';x.fillStyle='#fff';x.fillText('Calidad actual: '+RAR[q].n+'  →  '+(RAR[q+1]?RAR[q+1].n:''),170,H-5);
  for(const p of G.pop){const ag=(now-p.t)/900;if(ag>1)continue;x.globalAlpha=1-ag;x.font='900 22px Georgia,serif';x.lineWidth=5;x.strokeStyle='#000';x.strokeText(p.txt,170,110-ag*30);x.fillStyle=p.c;x.fillText(p.txt,170,110-ag*30)}x.globalAlpha=1;
  if(G.phase==='roll'||G.phase==='end'){x.fillStyle='rgba(0,0,0,.45)';x.fillRect(0,40,W,60);x.font='900 20px Georgia,serif';x.fillStyle='#ffe27a';const dots='.'.repeat(1+Math.floor(now/250)%3);x.fillText('Probabilidad de mejora: '+Math.round(G.ch*100)+'%',170,66);x.font='900 15px Trebuchet MS,sans-serif';x.fillStyle='#fff';x.fillText(now-G.endT>1200?(G.ok?'¡Se mejoró!':'No se mejoró'):'Forjando'+dots,170,90)}
  x.restore()};
 const loop=now=>{if(D.fg!==G)return;
  if(G.phase==='play'){const v=.85+.16*G.res.length+.06*q,dt=Math.min(.05,(now-(G.pl||now))/1000);G.p+=G.dir*v*dt;if(G.p>1){G.p=1;G.dir=-1}if(G.p<0){G.p=0;G.dir=1}}G.pl=now;
  if(G.phase==='hit'&&now-G.hitT>520){if(G.res.length<N){G.phase='play';newCtr()}else{G.phase='end';G.endT=now;const P=G.res.filter(r=>r==='p').length,Gd=G.res.filter(r=>r==='g').length;G.ch=UPC[q]*(P+Gd*.6)/N;G.ok=Math.random()<G.ch}}
  if(G.phase==='end'&&now-G.endT>1900){G.phase='done';finish();return}
  draw(now);requestAnimationFrame(loop)};
 requestAnimationFrame(loop)}
/* ---------- preparación: personaje + equipo + mochila (menú principal) ---------- */
const LDS=[['helm','Casco'],['armor','Armadura'],['boots','Botas'],['w0','Arma 1'],['w1','Arma 2'],['amulet','Amuleto']];
let LD={sel:null,confirm:0},LH=null,LA=0;
const petImg=(k,px)=>{px=px||62;try{const u=DGART.petIcon(k,px);if(u)return'<img class="wic" width="'+px+'" height="'+px+'" src="'+u+'" alt="">'}catch(e){}return PET[k].i};
const itCard=it=>it.k==='w'?wCard(it.w):gCard(it.g),itIcon=(it,px)=>it.k==='w'?wImg(it.w,px||38):it.g.i,itQ=it=>it.k==='w'?it.w.q:it.g.q,itEl=it=>it.k==='w'&&it.w.el?'<u>'+ELS[it.w.el].i+'</u>':'';
function eqGet(k){const L=DI();if(k==='w0'||k==='w1'){const w=L.eq.w[+k[1]];return w?{k:'w',w}:null}const g=L.eq.g[k];return g?{k:'g',g}:null}
function eqSet(k,it){const L=DI();if(k==='w0'||k==='w1')L.eq.w[+k[1]]=it?it.w:null;else L.eq.g[k]=it?it.g:null}
function openLoadout(){if(D.on)return;try{fdSync()}catch(e){}openLoadoutX('bag',null)}
function openLoadoutX(tab,flt,st){let o=$('dgl');if(!o){o=document.createElement('div');o.id='dgl';$('stage').append(o)}LD={sel:null,confirm:0,tab:tab||'bag',filter:flt||null,st:st||null};o.style.display='flex';ldRender();ldAnim()}
function closeLoadout(){const o=$('dgl');if(o)o.style.display='none';cancelAnimationFrame(LA);if(D.hub&&D.on){D.paused=false;lastN=performance.now();try{hubPets()}catch(e){}try{const L=DI();hero.wps=[L.eq.w[0]||null,L.eq.w[1]||null];if(!hero.wps[0]&&!hero.wps[1])hero.wps[0]=winst('sword',0,null);hero.wi=hero.wps[0]?0:1}catch(e){}}}
function ldRender(){const o=$('dgl'),L=DI(),bag=L.bag,F=pref.fd,hasFd=!!(F&&F.own&&Object.keys(F.own).length),FDI=Object.keys(FDEL),now0=Date.now();
 if(!LD.tab||(LD.tab==='fd'&&!hasFd))LD.tab='bag';
 const ST=LD.st||null,SLN={weapons:['w0','w1'],armor:['helm','armor','boots','amulet']},STT={weapons:'⚔️ Armería',armor:'🛡️ Armadura',pets:'🐾 Mascotas',store:'📦 Almacén'};
 let slots='';LDS.forEach(([k,lab])=>{if(ST&&!(SLN[ST]||[]).includes(k))return;const it=eqGet(k),sel=LD.sel&&LD.sel.f==='eq'&&LD.sel.k===k,ga=ST?'':'grid-area:'+(k==='helm'?'1/1':k==='armor'?'2/1':k==='boots'?'3/1':k==='w0'?'1/3':k==='w1'?'2/3':'3/3')+';';slots+='<button class="lds'+(sel?' sel':'')+'" data-k="'+k+'" style="'+ga+(it?'border-color:'+rc(itQ(it)):'')+'"><small>'+lab+'</small><i>'+(it?itIcon(it,40):'＋')+'</i>'+(it?itEl(it):'')+'</button>'});
 const mk=(tab,flt)=>{let main='';
 if(tab==='bag'){let grid='';const mf=it=>!flt||(flt==='w'?it.k==='w':it.k==='g'),idx=[];for(let n=0;n<L.cap;n++)if(!flt||(bag[n]&&mf(bag[n])))idx.push(n);if(flt)while(idx.length<12)idx.push(-1);
  for(const n of idx){const it=n>=0?bag[n]:null;if(it){const sel=LD.sel&&LD.sel.f==='bag'&&LD.sel.i===n;grid+='<button class="ldc'+(sel?' sel':'')+'" data-i="'+n+'" style="border-color:'+rc(itQ(it))+'">'+itIcon(it)+itEl(it)+'</button>'}else grid+='<div class="ldc e"></div>'}
  main='<div class="ldhd"><b>'+(flt==='w'?'⚔️ Armería · armas':flt==='g'?'🛡️ Armadura · equipo':'Mochila')+'</b><small>'+bag.length+' / '+L.cap+'</small></div><div class="ldbg">'+grid+'</div>'}
 else if(tab==='runes'){let tot=0;main='<div class="ldhd"><b>Runas</b><small>no ocupan espacio de mochila</small></div>';
  ELK.forEach(k=>{let row='<div class="rnr"><span class="rne">'+ELS[k].i+'<small>'+ELS[k].n+'</small></span>';L.runes[k].forEach((n,t)=>{tot+=n;row+='<span class="ldrn'+(n?'':' z')+'" style="border-color:'+rc(t)+'" title="'+RAR[t].n+'"><b style="color:'+rc(t)+'">'+n+'</b></span>'});main+=row+'</div>'});
  main+='<small class="ldhint">'+(tot?'Se usan en la mesa de encantamiento 🔮 de la mazmorra. De izquierda a derecha: Común → Divina.':'Aún no tienes runas (las dan cofres, élites y jefes).')+'</small>'}
 else if(tab==='store'){let grid='';for(let n=0;n<STORE_CAP;n++){const it=L.store[n];if(it){const sel=LD.sel&&LD.sel.f==='store'&&LD.sel.i===n;grid+='<button class="ldc'+(sel?' sel':'')+'" data-s="'+n+'" style="border-color:'+rc(itQ(it))+'">'+itIcon(it)+itEl(it)+'</button>'}else grid+='<div class="ldc e"></div>'}
  main='<div class="ldhd"><b>📦 Almacén extra</b><small>'+L.store.length+' / '+STORE_CAP+'</small></div><small class="ldhint">Guarda aquí lo que no te quepa en la mochila. Lo del almacén no se lleva a la mazmorra.</small><div class="ldbg">'+grid+'</div>'}
 else if(tab==='pets'){let cards='',fxOn=!!(pref.fd&&pref.fd.pet&&!pref.fd.petOff);if(pref.fd&&pref.fd.pet)cards+='<button class="ptc'+(fxOn?' on':'')+'" data-p="phoenix"><i>'+petImg('phoenix')+'</i><b>Fénix del Fundador</b><small>'+PET.phoenix.d+'</small><em>'+(fxOn?'✅ Te acompaña':'Toca para llevarlo')+'</em></button>';if(pref.fd&&pref.fd.o&&pref.fd.o.pet){const f2=!(pref.fd.off&&pref.fd.off.pet);cards+='<button class="ptc'+(f2?' on':'')+'" data-p="firefly"><i>'+petImg('firefly')+'</i><b>Luciérnaga del Fundador</b><small>'+PET.firefly.d+'</small><em>'+(f2?'✅ Te acompaña':'Toca para llevarla')+'</em></button>'}
  L.pets.forEach(k=>{const p=PET[k];if(!p)return;const on=L.petSel===k;cards+='<button class="ptc'+(on?' on':'')+'" data-p="'+k+'"><i>'+petImg(k)+'</i><b>'+p.n+'</b><small>'+p.d+'</small><em>'+(on?'✅ Te acompaña':'Toca para llevarla')+'</em></button>'});
  main='<div class="ldhd"><b>🐾 Mascotas</b><small>'+((L.petSel?1:0)+(fxOn?1:0)?((L.petSel?1:0)+(fxOn?1:0))+' elegida'+((L.petSel?1:0)+(fxOn?1:0)>1?'s':''):'ninguna elegida')+'</small></div>'+(cards?'<div class="ptg">'+cards+'</div>':'')+'<small class="ldhint">'+(L.pets.length||fxOn||(pref.fd&&pref.fd.pet)?'Toca una mascota para llevarla contigo; vuelve a tocarla para dejarla en casa.':'Aún no tienes mascotas: cómpralas en las tiendas de la mazmorra y se guardarán aquí al terminar la partida.')+'</small>'}
 else{let g='';FDI.forEach(id=>{const home=L.fdw[id],eqi=L.eq.w.findIndex(w=>w&&w.fd&&w.id===id),sl=F.seal&&F.seal[id],sealed=!home&&eqi<0&&sl!==undefined&&sl>now0,sel=LD.sel&&LD.sel.f==='fd'&&LD.sel.id===id,tmp=home||fdWeapon(id);
   let st=home?'Disponible':eqi>=0?'En Arma '+(eqi+1):sealed?'<span data-fdt="'+id+'">⏳ '+Math.floor(Math.ceil((sl-now0)/1000)/60)+':'+String(Math.ceil((sl-now0)/1000)%60).padStart(2,'0')+'</span>':'Pendiente';
   g+='<button class="fds'+((sealed||!(F.own&&F.own[id]))?' off':'')+(sel?' sel':'')+'" data-fd="'+id+'">'+wImg(tmp,40)+'<span>'+WP[id].n+'</span><em>'+st+'</em></button>'});
  main='<small id="fdt" class="ldhint" style="font-size:12px">'+fdText()+'</small><div class="fdg">'+g+'</div>'}
 return main};
 let main=ST==='weapons'?mk('bag','w')+(hasFd?mk('fd'):''):ST==='armor'?mk('bag','g'):ST==='pets'?mk('pets'):ST==='store'?mk('store')+mk('bag',null):mk(LD.tab,LD.filter);
 let det='<small class="ldhint">Toca un objeto o una casilla del equipo para ver sus detalles.</small>';const s=LD.sel;
 if(s){const it=s.f==='bag'?bag[s.i]:s.f==='store'?L.store[s.i]:s.f==='fd'?(L.fdw[s.id]?{k:'w',w:L.fdw[s.id]}:null):eqGet(s.k);if(it){det='<div class="dgit" style="border-color:'+rc(itQ(it))+'">'+itCard(it)+'</div><div class="ldbt">';
  if(s.f==='bag'){det+=it.k==='w'?'<button class="b" data-a="w0">⚔️ Arma 1</button><button class="b" data-a="w1">⚔️ Arma 2</button>':'<button class="b" data-a="eq">✅ Equipar</button>';det+='<button class="b" data-a="tostore">📦 Al almacén</button><button class="b ldtr" data-a="del">'+(LD.confirm?'¿Seguro? Toca otra vez':'🗑️ Tirar')+'</button>'}
  else if(s.f==='store')det+='<button class="b" data-a="tobag">🎒 A la mochila</button><button class="b ldtr" data-a="del">'+(LD.confirm?'¿Seguro? Toca otra vez':'🗑️ Tirar')+'</button>';
  else if(s.f==='fd')det+='<button class="b" data-a="w0">⚔️ Arma 1</button><button class="b" data-a="w1">⚔️ Arma 2</button>';
  else det+='<button class="b" data-a="un">'+(it.k==='w'&&it.w.fd?'🏺 Guardar en la Armería':'🎒 Guardar en mochila')+'</button>';det+='</div>'}}
 const tab=(k,l)=>'<button class="ldtab'+(LD.tab===k?' on':'')+'" data-t="'+k+'">'+l+'</button>';
 if(ST)o.innerHTML='<div class="ldh"><b>'+STT[ST]+'</b><button class="ldx">✕ Cerrar</button></div><div class="ldb one"><div class="ldr">'+(slots?'<div class="ldeqs">'+slots+'</div>':'')+main+'<div class="lddt">'+det+'</div></div></div><button class="b ldgo">↩️ Volver a la sala</button>';
 else o.innerHTML='<div class="ldh"><b>'+(D.hub?'🏠 Sala del héroe':'🎒 Preparar la mazmorra')+'</b><small>'+xpTxt()+'</small><button class="ldx">✕ Cerrar</button></div><div class="ldb"><div class="ldl"><div class="ldeq">'+slots+'<canvas id="ldc" width="300" height="400"></canvas></div></div><div class="ldr"><div class="ldtabs">'+tab('bag','🎒 Mochila')+tab('runes','🔮 Runas')+tab('store','📦 Almacén')+tab('pets','🐾 Mascotas')+(hasFd?tab('fd','🏺 Fundador'):'')+'</div>'+main+'<div class="lddt">'+det+'</div></div></div><button class="b ldgo">'+(D.hub?'↩️ Volver a la sala':'⚔️ ¡Entrar a la mazmorra!')+'</button>';
 o.querySelector('.ldx').onclick=closeLoadout;
 o.querySelector('.ldgo').onclick=()=>{if(D.hub){closeLoadout();return}const L2=DI();if(!L2.eq.w[0]&&!L2.eq.w[1]){L2.eq.w[0]=winst('sword',0,null);toast('🗡️ Llevas una espada básica')}try{savePref()}catch(e){}closeLoadout();diffMenu(()=>start(),()=>openLoadout())};
 o.querySelectorAll('.ldtab').forEach(bt=>bt.onclick=()=>{LD.tab=bt.dataset.t;LD.sel=null;LD.confirm=0;ldRender()});
 o.querySelectorAll('.lds').forEach(bt=>bt.onclick=()=>{LD.sel={f:'eq',k:bt.dataset.k};LD.confirm=0;ldRender()});
 o.querySelectorAll('.ldc[data-s]').forEach(bt=>bt.onclick=()=>{LD.sel={f:'store',i:+bt.dataset.s};LD.confirm=0;ldRender()});
 o.querySelectorAll('.ptc[data-p]').forEach(bt=>bt.onclick=()=>{if(bt.dataset.p==='phoenix'){if(pref.fd)pref.fd.petOff=pref.fd.petOff?0:1}else if(bt.dataset.p==='firefly'){const F=pref.fd;if(F){F.off=F.off||{};F.off.pet=F.off.pet?0:1}}else L.petSel=L.petSel===bt.dataset.p?null:bt.dataset.p;try{savePref()}catch(e){}sfx('pick');ldRender()});
 o.querySelectorAll('.ldc[data-i]').forEach(bt=>bt.onclick=()=>{LD.sel={f:'bag',i:+bt.dataset.i};LD.confirm=0;ldRender()});
 o.querySelectorAll('.fds[data-fd]').forEach(bt=>bt.onclick=()=>{const id=bt.dataset.fd,ei=L.eq.w.findIndex(w=>w&&w.fd&&w.id===id);if(L.fdw[id])LD.sel={f:'fd',id};else if(ei>=0)LD.sel={f:'eq',k:'w'+ei};else{toast('🏺 Esta arma está sellada: regresa sola a tu Armería');return}LD.confirm=0;ldRender()});
 o.querySelectorAll('[data-a]').forEach(bt=>bt.onclick=()=>{const a=bt.dataset.a,s2=LD.sel;if(!s2)return;
  if(s2.f==='fd'){const it=L.fdw[s2.id];if(!it)return;const sl=a==='w1'?1:0,old=L.eq.w[sl];
   if(old){if(old.fd)L.fdw[old.id]=old;else{if(bag.length>=L.cap){toast('🎒 La mochila está llena');return}bag.push({k:'w',w:old})}}
   L.eq.w[sl]=it;delete L.fdw[s2.id];LD.sel=null;sfx('pick')}
  else if(s2.f==='store'){const it=L.store[s2.i];if(!it)return;if(a==='tobag'){if(bag.length>=L.cap){toast('🎒 La mochila está llena');return}bag.push(it);L.store.splice(s2.i,1);LD.sel=null;sfx('pick')}else if(a==='del'){if(!LD.confirm){LD.confirm=1;ldRender();return}L.store.splice(s2.i,1);LD.sel=null;LD.confirm=0}}
  else if(s2.f==='bag'){const it=bag[s2.i];if(!it)return;
   if(a==='w0'||a==='w1'){const old=eqGet(a);eqSet(a,it);if(old)bag[s2.i]=old;else bag.splice(s2.i,1);LD.sel=null;sfx('pick')}
   else if(a==='eq'){const old=eqGet(it.g.t);eqSet(it.g.t,it);if(old)bag[s2.i]=old;else bag.splice(s2.i,1);LD.sel=null;sfx('pick')}
   else if(a==='tostore'){if(L.store.length>=STORE_CAP){toast('📦 El almacén está lleno');return}L.store.push(it);bag.splice(s2.i,1);LD.sel=null;sfx('pick')}
   else if(a==='del'){if(!LD.confirm){LD.confirm=1;ldRender();return}{const x=bag[s2.i];if(x&&x.k==='w'&&x.w.fd)fdSeal(x.w.id,x.w)}bag.splice(s2.i,1);LD.sel=null;LD.confirm=0}}
  else if(a==='un'){const it=eqGet(s2.k);if(!it)return;if(it.k==='w'&&it.w.fd){L.fdw[it.w.id]=it.w}else{if(bag.length>=L.cap){toast('🎒 La mochila está llena');return}bag.push(it)}eqSet(s2.k,null);LD.sel=null;sfx('pick')}
  try{savePref()}catch(e){}ldRender()})}
function ldAnim(){cancelAnimationFrame(LA);const loop=()=>{const o=$('dgl');if(!o||o.style.display!=='flex')return;ldDraw();fdTick();LA=requestAnimationFrame(loop)};loop()}
function ldDraw(){const c=$('ldc');if(!c)return;const x=c.getContext('2d'),now=performance.now(),L=DI(),dpr=2,S=2.2,cx=56,fy=168;
 x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,c.width,c.height);x.setTransform(dpr,0,0,dpr,0,0);
 let gr=x.createRadialGradient(cx,100,10,cx,100,95);gr.addColorStop(0,'rgba(120,140,255,.28)');gr.addColorStop(1,'rgba(120,140,255,0)');x.fillStyle=gr;x.fillRect(0,0,150,200);
 x.save();x.translate(cx,fy+3);x.scale(1,.3);gr=x.createRadialGradient(0,0,6,0,0,58);gr.addColorStop(0,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.beginPath();x.arc(0,0,58,0,6.3);x.fill();x.strokeStyle='rgba(180,200,255,.5)';x.lineWidth=3;x.beginPath();x.arc(0,0,44,0,6.3);x.stroke();x.restore();
 x.setTransform(dpr*S,0,0,dpr*S,dpr*cx,dpr*fy);
 if(!LH){LH=mkHero(0,0,null);LH.sw=winst('sword',0,null)}const h=LH;h.x=0;h.y=0;h.vx=h.vy=0;h.flash=0;h.inv=0;h.dashT=0;h.face=1;h.aim=0;h.atk=null;h.pull=0;h.wo=0;h.wa=.2+Math.sin(now/900)*.05;h.hx=0;h.hy=0;h.lean=0;h.ph=0;
 h.cape[0].x=-3;h.cape[0].y=-25;for(let i=1;i<h.cape.length;i++){h.cape[i].x=-3-i*1.3+Math.sin(now/330+i*.7)*(.8+i*.5);h.cape[i].y=-25+i*5.2}
 const wi=L.eq.w[0]||L.eq.w[1]||h.sw,f=wFull(wi);DGART.begin(x,now,THEMES[0],0);DGART.setEl(wi.el,wi.q);DGART.hero(h,f,f.id);DGART.setEl(null,0)}
/* ---------- enemigos ---------- */
const EN={
 slime:{n:'Limo',hp:28,r:13,m:1,col:'#5ad05a',coin:[1,2]},
 mini:{n:'Limito',hp:10,r:8,m:.6,col:'#7fe07f',coin:[0,1]},
 bat:{n:'Murciélago',hp:15,r:9,m:.5,col:'#8a5ad0',coin:[1,2],fly:1},
 gob:{n:'Goblin',hp:34,r:11,m:1,col:'#6fae3a',coin:[1,3]},
 skel:{n:'Esqueleto arquero',hp:26,r:11,m:1,col:'#e8e2c8',coin:[1,3]},
 ogre:{n:'Ogro',hp:520,r:30,m:6,col:'#8a9a4a',coin:[20,28],boss:1},
 wolf:{n:'Hombre lobo',hp:440,r:22,m:4,col:'#8a7a68',coin:[22,28],boss:1},
 slimeking:{n:'Slime gigante',hp:640,r:40,m:8,col:'#5ad05a',coin:[22,30],boss:1},
 golem:{n:'Golem de piedra',hp:780,r:36,m:9,col:'#8a8f9a',coin:[24,32],boss:1},
 spider:{n:'Araña reina',hp:480,r:26,m:3,col:'#4a3a5a',coin:[22,28],boss:1},
 lich:{n:'Rey Lich',hp:850,r:26,m:6,col:'#7a3ab0',coin:[60,80],boss:1},
 arch:{n:'El Arquitecto',hp:1200,r:30,m:8,col:'#35c8ff',coin:[90,110],boss:1},
 coil:{n:'Bobina',hp:110,r:15,m:80,col:'#5ae0ff',coin:[3,5]},
 spiderling:{n:'Arañita',hp:12,r:8,m:.5,col:'#6a4a7a',coin:[0,1]},
 egg:{n:'Huevo',hp:14,r:10,m:50,col:'#efe6c8',coin:[0,0]}};
/* ====================== generación del piso ====================== */
function gen(fl){const GW=6,GH=4,CW=30,CH=22;MW=GW*CW;MH=GH*CH;map=new Uint8Array(MW*MH);rooms=[];doors=[];
 const n=Math.min(8,4+fl);let path=null;
 for(let tr=0;tr<80&&!path;tr++){const used=new Set(),p=[[0,ri(0,GH-1)]];used.add(p[0].join());
  while(p.length<n){const[x,y]=p[p.length-1],o=[[1,0],[1,0],[0,-1],[0,1]].map(d=>[x+d[0],y+d[1]]).filter(c=>c[0]>=0&&c[0]<GW&&c[1]>=0&&c[1]<GH&&!used.has(c.join()));if(!o.length)break;const c=pick(o);used.add(c.join());p.push(c)}
  if(p.length===n)path=p}
 if(!path){path=[];for(let i=0;i<Math.min(n,GW);i++)path.push([i,1])}
 path.forEach((c,i)=>{const last=i===path.length-1,type=i===0?'start':last?'boss':(i===2&&path.length>=5)?'treasure':'combat';
  const w=type==='start'?11:type==='boss'?21:type==='treasure'?9:ri(13,19),h=type==='start'?9:type==='boss'?15:type==='treasure'?7:ri(9,13);
  const x0=c[0]*CW+((CW-w)>>1),y0=c[1]*CH+((CH-h)>>1),r={i,type,cx:c[0],cy:c[1],x0,y0,w,h,doors:[],state:type==='start'||type==='treasure'?'done':'idle',wave:0,waves:type==='boss'?1:fl>=3?3:2,visited:0,px:(x0+w/2)*T,py:(y0+h/2)*T};
  for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)map[y*MW+x]=1;rooms.push(r)});
 for(let i=0;i<rooms.length-1;i++){const A=rooms[i],B=rooms[i+1],dx=B.cx-A.cx,dy=B.cy-A.cy;
  if(dx){const cr=A.cy*CH+(CH>>1),xa=dx>0?A.x0+A.w:A.x0-1,xb=dx>0?B.x0-1:B.x0+B.w,lo=Math.min(xa,xb),hi=Math.max(xa,xb);
   for(let x=lo;x<=hi;x++)for(let y=cr-1;y<=cr;y++)map[y*MW+x]=1;
   [[A,xa],[B,xb]].forEach(([R,x])=>{const d={room:R,tiles:[[x,cr-1],[x,cr]]};R.doors.push(d);doors.push(d)})}
  else{const cc=A.cx*CW+(CW>>1),ya=dy>0?A.y0+A.h:A.y0-1,yb=dy>0?B.y0-1:B.y0+B.h,lo=Math.min(ya,yb),hi=Math.max(ya,yb);
   for(let y=lo;y<=hi;y++)for(let x=cc-1;x<=cc;x++)map[y*MW+x]=1;
   [[A,ya],[B,yb]].forEach(([R,y])=>{const d={room:R,tiles:[[cc-1,y],[cc,y]]};R.doors.push(d);doors.push(d)})}}
 addInterior();rooms[0].visited=1}
const tile=(x,y)=>x<0||y<0||x>=MW||y>=MH?0:map[y*MW+x],solidT=(x,y)=>{const v=tile(x,y);return v===0||v===3};
const setDoors=(R,closed)=>R.doors.forEach(d=>d.tiles.forEach(([x,y])=>{map[y*MW+x]=closed?3:1}));
/* ---- paredes y pilares dentro de los cuartos (nunca bloquean puertas ni dejan zonas aisladas) ---- */
function roomConnected(R){const seen=new Set(),q=[[R.x0+(R.w>>1),R.y0+(R.h>>1)]],key=(x,y)=>y*MW+x;seen.add(key(q[0][0],q[0][1]));
 while(q.length){const[x,y]=q.pop();for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<R.x0-1||nx>R.x0+R.w||ny<R.y0-1||ny>R.y0+R.h)continue;const k=key(nx,ny);if(seen.has(k)||map[k]!==1)continue;seen.add(k);q.push([nx,ny])}}
 for(let y=R.y0;y<R.y0+R.h;y++)for(let x=R.x0;x<R.x0+R.w;x++)if(map[y*MW+x]===1&&!seen.has(key(x,y)))return false;
 return R.doors.every(dr=>dr.tiles.every(([x,y])=>seen.has(key(x,y))))}
function addInterior(){for(const R of rooms){if(R.type==='start'||R.type==='treasure')continue;
  const cx=R.x0+(R.w>>1),cy=R.y0+(R.h>>1),doorT=R.doors.flatMap(d=>d.tiles),shapes=[],want=R.type==='boss'?4:ri(2,4),
   near=(x,y)=>doorT.some(([dx,dy])=>Math.abs(dx-x)<=3&&Math.abs(dy-y)<=3),
   ok=(x,y)=>x>=R.x0+2&&x<R.x0+R.w-2&&y>=R.y0+2&&y<R.y0+R.h-2&&map[y*MW+x]===1&&!near(x,y)&&!(Math.abs(x-cx)<=3&&Math.abs(y-cy)<=2);
  for(let t=0;t<60&&shapes.length<want;t++){const k=R.type==='boss'?0:pick([0,0,1,2]),w=k===0?2:k===1?4:1,h=k===0?2:k===1?1:(R.h>=11?4:3),x=ri(R.x0+2,R.x0+R.w-2-w),y=ri(R.y0+2,R.y0+R.h-2-h),cells=[];
   for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)cells.push([xx,yy]);
   if(!cells.every(([xx,yy])=>ok(xx,yy)))continue;
   if(shapes.some(s=>s.some(([sx,sy])=>cells.some(([xx,yy])=>Math.abs(sx-xx)<=2&&Math.abs(sy-yy)<=2))))continue;
   cells.forEach(([xx,yy])=>map[yy*MW+xx]=0);
   if(!roomConnected(R)){cells.forEach(([xx,yy])=>map[yy*MW+xx]=1);continue}
   shapes.push(cells)}}}
/* ====================== partículas y efectos ====================== */
const part=(x,y,vx,vy,life,c,s,gr,sh)=>{if(PT.length<320)PT.push({x,y,vx,vy,l:life,m:life,c,s,g:gr||0,sh})};
const dust=(x,y,n,c)=>{if(D.co&&D.co.role==='host')coEv(['d',Math.round(x),Math.round(y),Math.min(n,14),c||null]);for(let i=0;i<n;i++){const a=rnd(0,TAU),s=rnd(.3,1.6);part(x,y,Math.cos(a)*s,Math.sin(a)*s*.5-.2,rnd(260,520),c||'#9aa3b8',rnd(1.5,3.2),-.002)}};
const sparks=(x,y,c,n,sp)=>{if(D.co&&D.co.role==='host')coEv(['p',Math.round(x),Math.round(y),c,Math.min(n,18),sp||4]);for(let i=0;i<n;i++){const a=rnd(0,TAU),s=rnd(1,sp||4);part(x,y,Math.cos(a)*s,Math.sin(a)*s,rnd(160,380),c,rnd(1.5,3),.01)}};
const num=(x,y,txt,c,big)=>{NUM.push({x,y,txt,c,big,t:D.t,vy:-1.1});if(D.co&&D.co.role==='host')coEv(['n',Math.round(x),Math.round(y),txt,c,big?1:0])};
const shake=a=>{D.shk=Math.max(D.shk||0,a);if(D.co&&D.co.role==='host'&&a>=8)coEv(['k',a])},freeze=ms=>{if(!D.co)D.frz=Math.max(D.frz||0,ms)};
const sfx=n=>{try{AU.sfx(n)}catch(e){}if(D.co&&D.co.role==='host')coEv(['f',n])};
/* ====================== físicas 2D: colisión círculo-casillas ====================== */
function collide(b,bounce){let hit=false;const r=b.r,tx0=Math.floor((b.x-r)/T),tx1=Math.floor((b.x+r)/T),ty0=Math.floor((b.y-r)/T),ty1=Math.floor((b.y+r)/T);
 for(let ty=ty0;ty<=ty1;ty++)for(let tx=tx0;tx<=tx1;tx++){if(!solidT(tx,ty))continue;
  const nx=clamp(b.x,tx*T,tx*T+T),ny=clamp(b.y,ty*T,ty*T+T);let dx=b.x-nx,dy=b.y-ny,d=Math.hypot(dx,dy);
  if(d<r){if(d<1e-4){dx=0;dy=-1;d=1}const px=dx/d,py=dy/d,pen=r-d;b.x+=px*pen;b.y+=py*pen;const vn=b.vx*px+b.vy*py;if(vn<0){const k=1+(bounce||0);b.vx-=px*vn*k;b.vy-=py*vn*k}hit=true}}
 return hit}
function moveBody(b,dt,damp,bounce){const n=Math.ceil(Math.hypot(b.vx,b.vy)*dt/10)||1,s=dt/n;let hit=false;for(let i=0;i<n;i++){b.x+=b.vx*s;b.y+=b.vy*s;if(collide(b,bounce))hit=true}return hit}
function los(x1,y1,x2,y2){const d=Math.hypot(x2-x1,y2-y1),n=Math.ceil(d/14);for(let i=1;i<n;i++){const t=i/n;if(solidT(Math.floor((x1+(x2-x1)*t)/T),Math.floor((y1+(y2-y1)*t)/T)))return false}return true}
/* ====================== héroe ====================== */
function skinPal(){const s=(typeof skinOf==='function'&&typeof P!=='undefined'&&P)?SKINS.find(q=>q.id===pref.sk)||SKINS[0]:SKINS[0],hue=(D.t/14)%360,col=c=>c==='team'?'#4f86e6':c==='rb'?'hsl('+hue+',85%,58%)':c;
 return{body:col(s.ar),helm:s.sh==='#9aa6b5'?'#aab6c6':col(s.sh),cape:col(s.cp),crest:col(s.cr),skin:s.sc||(s.skull?'#efe9d0':'#f1c79c'),cs:s.cs,gem:s.gem,glow:s.glow||s.aura}}
function mkHero(x,y,old){const h={x,y,vx:0,vy:0,r:11,m:1,hp:100,max:100,sh:3,shMax:3,shT:0,face:1,aim:0,ph:0,sq:0,sqv:0,lean:0,hx:0,hy:0,hvx:0,hvy:0,inv:0,flash:0,dashT:0,dashCd:0,dashAng:0,wps:[winst('sword',0,null),null],wi:0,cd:0,atk:null,combo:0,comboT:0,sdir:1,pull:0,wo:0,wa:0,wv:0,coins:0,kills:0,dmgM:1,spdM:1,vamp:0,rateM:1,dashM:1,blink:0,cape:[],trail:[],stepT:0,hurtT:0,dead:false,crit:.05,multi:0,pierce:0,bounce:0,wave:0,burn:0,frost:0,shock:0,poison:0,explode:0,goldM:1,regenH:0,regT:0,waveT:0,picks:{},gear:{helm:null,armor:null,amulet:null,boots:null}};
 for(let i=0;i<7;i++)h.cape.push({x,y:y-24+i*5,px:x,py:y-24+i*5});if(old){['hp','max','sh','shMax','wps','wi','coins','kills','dmgM','spdM','vamp','rateM','dashM','crit','multi','pierce','bounce','wave','burn','frost','shock','poison','explode','goldM','regenH','gear','picks'].forEach(k=>h[k]=Array.isArray(old[k])?old[k].slice():old[k])}return h}
const curW=()=>wFull(hero.wps[hero.wi]||hero.wps[0]||hero.wps[1]);
function nearestEnemy(rg){let b=null,bd=rg*rg;for(const e of E){if(e.dead||e.spawn>D.t)continue;const d=(e.x-hero.x)**2+(e.y-hero.y)**2;if(d<bd&&los(hero.x,hero.y,e.x,e.y)){bd=d;b=e}}return b}
function hurtHero(d,fx,fy,kb){const h=hero;if(h.dead||D.t<h.inv||h.dashT>0||D.god)return false;
 h.inv=D.t+800;h.flash=D.t+140;h.shT=D.t+3200;h.hurtT=D.t;
 let rest=d;if(h.sh>0){const a=Math.min(h.sh,Math.ceil(rest/8));h.sh-=a;rest-=a*8;sfx('click')}if(rest>0)h.hp-=rest;
 const a=Math.atan2(h.y-fy,h.x-fx);h.vx+=Math.cos(a)*(kb||6);h.vy+=Math.sin(a)*(kb||6);h.sqv+=.5;h.hvx-=Math.cos(a)*4;if(!D.co||h===D.co.me){shake(6);freeze(70)}sfx('hurtP');sparks(h.x,h.y-16,'#ff6a6a',8,4);if(D.co&&D.co.role==='host'&&h!==D.co.me)coEv(['hu',h._id]);num(h.x,h.y-44,'-'+Math.round(d),'#ff7a7a');
 h.atk=null;if(h.hp<=0){h.hp=0;h.dead=true;D.dying=D.t;h.dyT=D.t;h.rv=0}return true}
function healHero(n){hero.hp=Math.min(hero.max,hero.hp+n);num(hero.x,hero.y-46,'+'+Math.round(n),'#7be07b');sparks(hero.x,hero.y-16,'#7be07b',8,2.5)}
function startAttack(){const h=hero,w=curW();if(D.t<h.cd||h.atk||h.dashT>0)return;
 const tg=nearestEnemy(isR(w)?420:200);if(tg)h.aim=Math.atan2(tg.y-h.y,tg.x-h.x);else if(Math.hypot(h.vx,h.vy)>.6)h.aim=Math.atan2(h.vy,h.vx);
 const rm=h.rateM;h.cd=D.t+w.cd/rm;
 if(D.t-h.comboT>720)h.combo=0;h.combo++;h.comboT=D.t;
 h.atk={t:D.t,k:w.k,dir:h.sdir,hit:false,fired:0,big:w.k==='melee'&&(h.combo%3===0),rm,crit:Math.random()<h.crit};if(w.k==='melee'||w.k==='thrust')h.sdir*=-1;sfx('swing')}
function attackDamage(w,big){return w.dm*hero.dmgM*(big?1.6:1)}
function updAttack(dt){const h=hero,a=h.atk;if(!a)return;const w=curW(),el=(D.t-a.t)*a.rm;if(w.k!==a.k){h.atk=null;h.wo=0;h.pull=0;return}
 if(a.k==='melee'||a.k==='thrust'){const W=a.k==='thrust'?110:85,S=a.k==='thrust'?90:115,R=150,arc=w.arc*(a.big?1.25:1);
  if(el<W){const p=eo(el/W);h.wo=-a.dir*arc/2*1.2*p;h.pull=p;h.lean=-.5*p}
  else if(el<W+S){const p=eo((el-W)/S);h.wo=lerp(-a.dir*arc/2*1.2,a.dir*arc/2,p);h.pull=1-p;
   if(!a.hit&&p>.15){a.hit=true;const kick=a.k==='thrust'?6.5:4.2;h.vx+=Math.cos(h.aim)*kick;h.vy+=Math.sin(h.aim)*kick;h.sqv-=.25;shake(a.big?6:3);meleeHit(w,a)}
   h.trail.push({x:h.x,y:h.y,a:h.aim+h.wo,t:D.t,k:a.k,rg:w.rg*(a.big?1.15:1)})}
  else if(el<W+S+R){const p=eio((el-W-S)/R);h.wo=lerp(a.dir*arc/2,0,p);h.pull=0}
  else{h.atk=null;h.wo=0}}
 else if(a.k==='bow'){const C=130,R=140;if(el<C){h.pull=eo(el/C);h.wo=0}else{if(!a.fired){a.fired=1;shootH(w,h.aim,1);h.vx-=Math.cos(h.aim)*1.8;h.vy-=Math.sin(h.aim)*1.8;h.sqv+=.15;sfx('pick')}h.pull=Math.max(0,1-(el-C)/R);if(el>C+R){h.atk=null;h.pull=0}}}
 else if(a.k==='gun'){const C=w.ch||70,R=130;if(el<C){h.pull=eo(el/C)}else{if(!a.fired){a.fired=1;shootH(w,h.aim,0);const kk=w.pellets?2.6:1.2;h.vx-=Math.cos(h.aim)*kk;h.vy-=Math.sin(h.aim)*kk;h.sqv+=.2;shake(w.pellets?4:1.5);sfx('hit')}h.pull=Math.max(0,1-(el-C)/R);if(el>C+R){h.atk=null;h.pull=0}}}
 else{const C=w.ch||170;if(el<C){h.pull=eo(el/C)}else{const n=Math.min(w.burst,1+Math.floor((el-C)/95));while(a.fired<n){a.fired++;shootH(w,h.aim+rnd(-.07,.07),0);h.vx-=Math.cos(h.aim)*.8;h.vy-=Math.sin(h.aim)*.8;sfx('gem')}if(a.fired>=w.burst&&el>C+95*w.burst+80){h.atk=null;h.pull=0}}}}
function shootH(w,ang,arrow){const h=hero,sp=w.sp,gun=w.k==='gun',nn=w.pellets?w.pellets+2*h.multi:1+h.multi,spr=w.spread||.2,crit=Math.random()<h.crit,el=w.inst&&w.inst.el;
 for(let i=0;i<nn;i++){const a=ang+(nn>1?(w.pellets?rnd(-spr/2,spr/2):(i-(nn-1)/2)*Math.max(.14,spr/Math.max(1,nn-1))):0),s2=sp*(w.pellets?rnd(.85,1.1):1);
  PR.push({x:h.x+Math.cos(a)*18,y:h.y-18+Math.sin(a)*18,vx:Math.cos(a)*s2,vy:Math.sin(a)*s2,r:gun?4:5,dm:w.dm*h.dmgM*(crit?2:1),crit,kb:w.kb,from:'h',oi:HI(),arrow,bullet:gun,life:w.life||1100,pierce:(w.pierce||0)+h.pierce,bounce:(w.inst&&w.inst.fx==='bounce')?2:0,homing:w.homing,hit:new Set(),col:arrow?'#e8e0c0':el?ELS[el].c:DGART.accent(),a,el,elq:w.inst&&w.inst.elq,fx:w.inst&&w.inst.fx})}}
function meleeHit(w,a){const h=hero,rg=w.rg*(a.big?1.15:1),arc=w.arc*(a.big?1.25:1);let any=false;const hs=new Set();
 for(const e of E){if(e.dead||e.spawn>D.t)continue;const dx=e.x-h.x,dy=e.y-h.y,d=Math.hypot(dx,dy);if(d>rg+e.r)continue;if(Math.abs(ad(h.aim,Math.atan2(dy,dx)))>arc/2+Math.atan2(e.r,Math.max(d,1)))continue;
  hitEnemy(e,attackDamage(w,a.big)*(a.crit?2:1),Math.atan2(dy,dx),w.kb*(a.big?1.5:1),a.big||a.crit,false,w.inst.el,w.inst.elq,w.inst.fx);hs.add(e);any=true}
 if(w.slam)slamHit(w,a,hs);if(h.wave>0&&D.t>(h.waveT||0)){h.waveT=D.t+280;spawnWv(w,h.aim)}
 for(const p of PR){if(p.from==='e'&&Math.hypot(p.x-h.x,p.y-h.y)<rg&&Math.abs(ad(h.aim,Math.atan2(p.y-h.y,p.x-h.x)))<arc/2){p.life=0;sparks(p.x,p.y,'#fff',6,3)}}
 if(any){freeze(a.big?90:50);shake(a.big?9:4);sfx('hit')}}
/* ====================== enemigos ====================== */
function mkEnemy(t,x,y,fl,elite){const d=EN[t],sc=hpScale(fl),hp=d.hp*sc*(elite?2.2:1);
 return{t,x,y,vx:0,vy:0,r:d.r*(elite?1.2:1),m:d.m,hp,max:hp,col:d.col,elite,face:1,ph:rnd(0,6),sq:0,sqv:0,flash:0,st:'idle',stT:D.t+rnd(500,1100),spawn:0,stun:0,dead:false,aim:0,wa:0,raise:0,crouch:0,cd:D.t+rnd(500,1500),fl,dm:(DMB[t]??8)*dmScale(fl),z:0,nofr:!!(EN[t].boss&&t!=='ogre')}}
function hitEnemy(e,dmg,ang,kb,big,noel,el,elq,fx){if(e.dead)return;if(e.shield){if(D.t>(e.imT||0)){e.imT=D.t+350;num(e.x,e.y-e.r-40,'¡Inmune!','#7fe8ff');sparks(e.x,e.y-e.r,'#7fe8ff',6,4);sfx('click')}return}e.hp-=dmg;e.lastFx=fx||null;if(!noel)applyElems(e,dmg,el,elq);e.flash=D.t+120;const bo=EN[e.t].boss,k=kb/e.m*(bo?.25:1);e.vx+=Math.cos(ang)*k;e.vy+=Math.sin(ang)*k;e.sqv+=big?.5:.3;e.stun=Math.max(e.stun,D.t+(bo?0:big?380:200));
 if(e.st==='tele'&&!bo){e.st='idle';e.stT=D.t+500;e.raise=0;e.crouch=0}
 num(e.x+rnd(-8,8),e.y-e.r-18,Math.round(dmg),big?'#ffd84a':'#fff',big);sparks(e.x,e.y-e.r,'#fff',big?9:5,4);if(!bo)part(e.x,e.y,0,0,200,'#fff',e.r*1.4,0);
 if(e.hp<=0)killEnemy(e)}
function killEnemy(e){if(e.t==='egg'){e.dead=true;eggPop(e);return}e.dead=true;DGART.death(e,part);const R=hero,d=EN[e.t];R.kills++;D.kills++;if(R.vamp&&R.hp<R.max)healHero(R.vamp);if(e.lastFx==='explode'&&!D.exp)boom(e);if(e.elite&&Math.random()<.18){const r=grantRune(.05);toast(ELS[r.k].i+' Runa de '+ELS[r.k].n+' ('+RAR[r.t].n+')')}
 for(let i=0;i<(e.boss||d.boss?26:10);i++){const a=rnd(0,TAU),s=rnd(1,5);part(e.x,e.y-e.r*.5,Math.cos(a)*s,Math.sin(a)*s-1,rnd(300,700),e.col,rnd(2,5),.012)}
 shake(d.boss?14:3);const nc=ri(d.coin[0],d.coin[1])+(e.elite?3:0);for(let i=0;i<nc;i++)dropCoin(e.x,e.y);
 if(e.elite&&Math.random()<.05)dropVale(e.x,e.y);
 if(Math.random()<(e.elite?.5:.07))PK.push({t:'heart',x:e.x,y:e.y,vx:rnd(-2,2),vy:rnd(-2,2),z:0,vz:3,l:D.t});
 if(e.t==='slime'){for(let i=0;i<2;i++){const m=mkEnemy('mini',e.x+rnd(-8,8),e.y+rnd(-8,8),e.fl);m.vx=rnd(-3,3);m.vy=rnd(-3,3);E.push(m)}}
 if(d.boss){D.bossSpot={x:e.x,y:e.y};D.boss=null;freeze(220);for(let i=0;i<30;i++)dropCoin(e.x,e.y);bossDeath(e);rewardBoss();dropGem(e.x,e.y,2);if(Math.random()<.4)dropVale(e.x,e.y)}}
function dropPk(t,x,y,v,extra){const a=rnd(0,TAU),s=rnd(1.5,4);PK.push(Object.assign({t,x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,z:0,vz:rnd(3,5),l:D.t,v:v||1},extra||{}))}
function dropGem(x,y,n){if(D.co||D.cheated||D.hub)return;for(let i=0;i<n;i++)dropPk('gem',x,y,1)}
function dropVale(x,y){if(D.co||D.cheated||D.hub)return;const w=[0,0,0,0,1,1,2],t=['g','x','d','r'][Math.floor(Math.random()*4)];dropPk('vale',x,y,1,{vt:t,vi:t==='r'?0:w[Math.floor(Math.random()*w.length)]})}
function dropCoin(x,y){const a=rnd(0,TAU),s=rnd(1,3.5);PK.push({t:'coin',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,z:0,vz:rnd(2,4),l:D.t,v:1+Math.floor((D.floor-1)/2)})}
function shootE(e,ang,sp,dm,col,r,type){PR.push({x:e.x,y:e.y-14,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,r:r||5,dm,kb:5,from:'e',life:2200,col:col||'#e8e0c0',a:ang,arrow:type!=='rock',rock:type==='rock',hit:new Set()})}
function updEnemy(e,dt){const h=hero,dx=h.x-e.x,dy=h.y-e.y,dist=Math.hypot(dx,dy),ang=Math.atan2(dy,dx),now=D.t;if(e.spawn>now)return;statusTick(e,now);if(e.dead)return;
 const stunned=now<e.stun;if(Math.abs(dx)>6)e.face=dx>0?1:-1;
 e.sqv+=(-e.sq*.3)*dt;e.sqv*=Math.pow(.72,dt);e.sq+=e.sqv*dt;e.sq=clamp(e.sq,-.5,.6);
 const spd=Math.hypot(e.vx,e.vy);e.ph+=spd*.17*dt;
 let tvx=0,tvy=0,acc=.12;
 const walk=(sp,a)=>{tvx=Math.cos(a)*sp;tvy=Math.sin(a)*sp};
 if(!stunned)switch(e.t){
 case'slime':case'mini':{const big=e.t==='slime';
  if(e.st==='idle'&&now>e.stT){e.st='tele';e.stT=now+(big?420:300);e.crouch=1}
  else if(e.st==='tele'){e.crouch=eo(1-(e.stT-now)/(big?420:300));e.sqv=Math.max(e.sqv,.02);if(now>e.stT){e.st='hop';e.stT=now+380;e.crouch=0;const sp=big?6.4:7.2;e.vx=Math.cos(ang+rnd(-.25,.25))*sp;e.vy=Math.sin(ang+rnd(-.25,.25))*sp;e.sqv-=.45;e.hopA=Math.atan2(e.vy,e.vx);dust(e.x,e.y,5,'#7fd47f')}}
  else if(e.st==='hop'){e.z=Math.sin(clamp((e.stT-now)/380,0,1)*Math.PI)*16;if(dist<e.r+h.r+2)hurtHero(e.dm,e.x,e.y,5);if(now>e.stT){e.st='idle';e.stT=now+rnd(700,1200);e.z=0;e.sqv+=.5;dust(e.x,e.y,6,'#7fd47f');shake(1.5)}}
  acc=.02;break}
 case'bat':{if(e.st==='idle'){const a=ang+Math.sin(now/260+e.ph)*1.1;walk(2.3,a);if(now>e.stT&&dist<260){e.st='tele';e.stT=now+380;e.lockA=ang}}
  else if(e.st==='tele'){tvx=tvy=0;e.crouch=1;if(now>e.stT){e.st='swoop';e.stT=now+420;e.crouch=0;e.vx=Math.cos(ang)*8.6;e.vy=Math.sin(ang)*8.6}}
  else if(e.st==='swoop'){if(dist<e.r+h.r+3&&!e.hitT)hurtHero(e.dm,e.x,e.y,5);if(now>e.stT){e.st='idle';e.stT=now+rnd(1400,2200)}}
  acc=.08;e.z=14+Math.sin(now/120+e.ph)*3;break}
 case'gob':{if(e.st==='idle'){if(dist>130)walk(2.1,ang+Math.sin(now/500+e.ph)*.3);else{walk(1.1,ang+Math.PI/2*Math.sign(Math.sin(e.ph)));}if(now>e.stT&&dist<200){e.st='tele';e.stT=now+520;e.lockA=ang}}
  else if(e.st==='tele'){e.crouch=eo(1-(e.stT-now)/520);e.raise=e.crouch;e.lockA=ang;if(now>e.stT){e.st='dash';e.stT=now+260;e.crouch=0;e.vx=Math.cos(e.lockA)*11;e.vy=Math.sin(e.lockA)*11;e.sqv-=.4;dust(e.x,e.y,6)}}
  else if(e.st==='dash'){e.raise=0;if(dist<e.r+h.r+8)hurtHero(e.dm,e.x,e.y,7);if(now>e.stT){e.st='rest';e.stT=now+700}}
  else if(e.st==='rest'){if(now>e.stT){e.st='idle';e.stT=now+rnd(900,1500)}}acc=e.st==='dash'?.02:.13;break}
 case'skel':{if(e.st==='idle'){if(dist<140)walk(2,ang+Math.PI);else if(dist>270||!los(e.x,e.y,h.x,h.y))walk(1.9,ang);else walk(1.1,ang+Math.PI/2*Math.sign(Math.sin(e.ph*.3)));
   if(now>e.stT&&dist<340&&los(e.x,e.y,h.x,h.y)){e.st='tele';e.stT=now+620}}
  else if(e.st==='tele'){e.aim=ang;e.raise=eo(1-(e.stT-now)/620);if(now>e.stT){e.st='idle';e.stT=now+rnd(1300,2000);e.raise=0;shootE(e,ang,6.2,e.dm);e.vx-=Math.cos(ang)*1.5;e.vy-=Math.sin(ang)*1.5;sfx('pick')}}break}
 case'ogre':updOgre(e,dt,dist,ang);break;
 case'wolf':updWolf(e,dt,dist,ang);break;case'slimeking':updSlimeK(e,dt,dist,ang);break;case'golem':updGolem(e,dt,dist,ang);break;case'spider':updSpider(e,dt,dist,ang);break;case'lich':updLich(e,dt,dist,ang);break;case'arch':updArch(e,dt,dist,ang);break;case'coil':updCoil(e,dt,dist,ang);break;
 case'spiderling':{walk(2.9,ang+Math.sin(now/260+e.ph)*.5);if(dist<e.r+h.r+3&&now>(e.biteT||0)){e.biteT=now+800;hurtHero(e.dm,e.x,e.y,4)}acc=.14;break}
 case'egg':{tvx=tvy=0;if(now>e.hatch){e.dead=true;eggHatch(e)}break}}
 if(e.nofr){}else if(e.t!=='ogre'||e.st==='chase'){e.vx+=(tvx-e.vx)*acc*dt;e.vy+=(tvy-e.vy)*acc*dt}
 else{e.vx*=Math.pow(.9,dt);e.vy*=Math.pow(.9,dt)}
 const fric=e.st==='hop'||e.st==='dash'||e.st==='swoop'||e.st==='rush'||e.nofr?1:Math.pow(.86,dt);e.vx*=Math.pow(fric,1);e.vy*=Math.pow(fric,1);
 const hit=moveBody(e,dt*(e.frzT>now?.5:1),0,e.st==='rush'?.2:.45);e.hitW=hit;if(hit&&(e.st==='rush')){e.st='stunw';e.stT=now+900;shake(10);dust(e.x,e.y,12);e.sqv+=.5}
 if(e.flash<now&&e.z===0)e.hitT=0}
function updOgre(e,dt,dist,ang){const now=D.t,h=hero;e.boss=true;
 if(!e.enr&&e.hp<e.max*.5){e.enr=1;e.st='roar';e.stT=now+900;shake(8);for(let i=0;i<3;i++){const m=mkEnemy('slime',e.x+rnd(-90,90),e.y+rnd(-90,90),e.fl);m.spawn=now+500;E.push(m);part(m.x,m.y,0,0,600,'#7fd47f',24,0)}}
 const sp=e.enr?1.9:1.5;
 if(e.st==='idle'||e.st==='chase'){e.st='chase';const a=ang;e.vx+=(Math.cos(a)*sp-e.vx)*.06*dt;e.vy+=(Math.sin(a)*sp-e.vy)*.06*dt;
  if(now>e.stT){const r=Math.random();e.st='tele';e.kind=dist>250?(r<.5?'rush':'throw'):(r<.6?'slam':'rush');e.stT=now+(e.kind==='slam'?800:e.kind==='rush'?750:650);e.lockA=ang;e.tx=h.x;e.ty=h.y;e.raise=0}}
 else if(e.st==='tele'){const p=eo(1-(e.stT-now)/(e.kind==='slam'?800:e.kind==='rush'?750:650));e.raise=p;e.crouch=e.kind==='slam'?p:p*.5;if(e.kind!=='slam')e.lockA=ang;else{e.tx=lerp(e.tx,h.x,.04);e.ty=lerp(e.ty,h.y,.04)}
  e.vx*=Math.pow(.8,dt);e.vy*=Math.pow(.8,dt);
  if(now>e.stT){e.crouch=0;
   if(e.kind==='slam'){e.st='air';e.stT=now+420;e.sx=e.x;e.sy=e.y}
   else if(e.kind==='rush'){e.st='rush';e.stT=now+720;e.vx=Math.cos(e.lockA)*(e.enr?9.5:8);e.vy=Math.sin(e.lockA)*(e.enr?9.5:8);e.sqv-=.3}
   else{e.st='cast';e.stT=now+500;const n=e.enr?5:3;for(let i=0;i<n;i++)shootE(e,e.lockA+(i-(n-1)/2)*.28,4.4,e.dm*.7,'#8a7a5a',9,'rock');sfx('swing');e.raise=0}}}
 else if(e.st==='air'){const p=1-(e.stT-now)/420;e.z=Math.sin(clamp(p,0,1)*Math.PI)*60;e.x=lerp(e.sx,e.tx,eio(p));e.y=lerp(e.sy,e.ty,eio(p));
  if(now>e.stT){e.z=0;e.st='land';e.stT=now+700;e.ring=now;e.rx=e.x;e.ry=e.y;shake(14);freeze(60);sfx('crumble');dust(e.x,e.y,18,'#b8a888');e.sqv+=.6}}
 else if(e.st==='land'){e.raise=0;if(e.ring){const p=(now-e.ring)/520,R=p*190;if(p<1&&Math.abs(Math.hypot(hero.x-e.rx,hero.y-e.ry)-R)<22&&hero.hp>0)hurtHero(e.dm,e.rx,e.ry,9);if(p>=1)e.ring=0}if(now>e.stT){e.st='chase';e.stT=now+rnd(900,1500)}}
 else if(e.st==='rush'){if(Math.hypot(h.x-e.x,h.y-e.y)<e.r+h.r+6)hurtHero(e.dm,e.x,e.y,10);if(now>e.stT){e.st='chase';e.stT=now+rnd(800,1300)}}
 else if(e.st==='stunw'||e.st==='cast'||e.st==='roar'){e.raise=0;if(now>e.stT){e.st='chase';e.stT=now+rnd(900,1400)}}}
/* ====================== proyectiles, recogibles ====================== */
function updProj(dt){for(const p of PR){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*16.67;if(p.arrow||p.rock)p.a=Math.atan2(p.vy,p.vx);
  if(p.homing&&p.from==='h'){const tg=nearestTo(p.x,p.y,240);if(tg){const sp=Math.hypot(p.vx,p.vy),cur=Math.atan2(p.vy,p.vx),da=ad(cur,Math.atan2(tg.y-14-p.y,tg.x-p.x)),na=cur+clamp(da,-.09*dt,.09*dt);p.vx=Math.cos(na)*sp;p.vy=Math.sin(na)*sp;p.a=na}}
  if(solidT(Math.floor(p.x/T),Math.floor(p.y/T))){if(p.bounce>0){p.bounce--;p.x-=p.vx*dt;p.y-=p.vy*dt;if(solidT(Math.floor((p.x+p.vx*dt)/T),Math.floor(p.y/T)))p.vx*=-1;else if(solidT(Math.floor(p.x/T),Math.floor((p.y+p.vy*dt)/T)))p.vy*=-1;else{p.vx*=-1;p.vy*=-1}p.a=Math.atan2(p.vy,p.vx);p.hit.clear();sparks(p.x,p.y,p.col,4,2)}else{p.life=0;sparks(p.x,p.y,p.col,5,3)}}
  if(p.from==='h'){for(const e of E){if(e.dead||e.spawn>D.t||p.hit.has(e))continue;if(Math.hypot(e.x-p.x,e.y-e.z*.3-(p.y+14))<e.r+p.r+4){p.hit.add(e);coAs(p.oi,()=>hitEnemy(e,p.dm,Math.atan2(p.vy,p.vx),p.kb,!!p.crit,p.noel,p.el,p.elq,p.fx));sfx('hit');if(p.pierce>0)p.pierce--;else{p.life=0}if(!p.arrow)for(let i=0;i<5;i++)part(p.x,p.y,rnd(-2,2),rnd(-2,2),260,p.col||'#c46cff',3,0);break}}}
  else if(D.co){for(const hh of D.co.hs){if(hh.gone||hh.dashT>0||hh.dead||Math.hypot(hh.x-p.x,hh.y-18-p.y)>=hh.r+p.r+3)continue;if(coAsH(hh,()=>hurtHero(p.dm,p.x-p.vx*3,p.y-p.vy*3,p.kb))){p.life=0;p.hitH=1;p.hi=hh._id;break}}}
  else if(hero.dashT<=0&&!hero.dead&&Math.hypot(hero.x-p.x,hero.y-18-p.y)<hero.r+p.r+3){if(hurtHero(p.dm,p.x-p.vx*3,p.y-p.vy*3,p.kb)){p.life=0;p.hitH=1}}
  if(p.from==='e')for(const q of D.pets)if(p.life>0&&!q.down&&Math.hypot(q.x-p.x,q.y-14-p.y)<q.r+p.r+2){petHurt(q,p.dm,p.x,p.y);p.life=0}}
 for(const p of PR)if(p.life<=0&&p.from==='e'){
  if(p.pool&&!p.pd){p.pd=1;addPool(p.x,p.y+18,p.pr||34,6000,p.dm*.4);dust(p.x,p.y+18,5,'#7fd47f')}
  if(p.web&&!p.wd){p.wd=1;addWeb(p.x,p.y+18,p.hitH?46:38,p.hitH?3200:7000);if(p.hitH){(D.co&&coById(p.hi)||hero).rootT=D.t+1400;if(D.t>(D.webToast||0)){D.webToast=D.t+8000;toast('🕸️ ¡Atrapado! Esquiva para liberarte')}}}
  if(p.frag&&!p.fg){p.fg=1;const bx=p.x-p.vx*2,by=p.y-p.vy*2;for(let i=0;i<p.frag;i++){const a=rnd(0,TAU),s=rnd(3,6);PR.push({x:bx,y:by,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:5,dm:p.dm*.45,kb:3,from:'e',life:rnd(420,720),col:'#8a7a5a',a,rock:true,shard:1,hit:new Set()})}dust(bx,by+10,8,'#b8a888');shake(4);sfx('crumble')}}
 PR=PR.filter(p=>p.life>0)}
function updPick(dt){const h=hero;for(const k of PK){if(k.t==='portal')continue;k.vz-=.22*dt;k.z+=k.vz*dt;if(k.z<0){k.z=0;k.vz*=-.5;if(Math.abs(k.vz)<.4)k.vz=0}
  let tg=D.co?coNear(k.x,k.y):h;if(k.t==='heart'&&!D.co)tg=heartTarget(k);const d=Math.hypot(tg.x-k.x,tg.y-k.y),mag=k.t==='coin'?95:(k.t==='gem'||k.t==='fgem'||k.t==='fsoul'||k.t==='vale')?170:60;if(D.t-k.l>350&&d<mag){const a=Math.atan2(tg.y-k.y,tg.x-k.x),s=Math.min(9,2+(mag-d)*.12);k.vx+=(Math.cos(a)*s-k.vx)*.25;k.vy+=(Math.sin(a)*s-k.vy)*.25}else{k.vx*=Math.pow(.93,dt);k.vy*=Math.pow(.93,dt)}
  k.x+=k.vx*dt;k.y+=k.vy*dt;const b={x:k.x,y:k.y,r:5,vx:k.vx,vy:k.vy};collide(b,.5);k.x=b.x;k.y=b.y;k.vx=b.vx;k.vy=b.vy;
  if(d<tg.r+8&&D.t-k.l>200){k.got=1;if(k.t==='coin'){const v=Math.max(1,Math.round((k.v||1)*(1+((D.bs&&D.bs.g)||0)/100)*(D.co?tg:h).goldM));(D.co?tg:h).coins+=v;D.coinsT+=v;sfx('coin')}else if(k.t==='heart'){if(D.co)coAsH(tg,()=>healHero(22));else if(tg===h)healHero(22);else petHeal(tg);sfx('gem')}else if(k.t==='gem'){D.gemsC=(D.gemsC|0)+(k.v||1);num(k.x,k.y-24,'+'+(k.v||1)+' 💎','#7fe8ff',true);sfx('gem')}else if(k.t==='fgem'){try{gain(k.v||1,1)}catch(e){}num(k.x,k.y-24,'+'+(k.v||1)+' 💎 (Fundador)','#7fe8ff',true);sfx('gem')}else if(k.t==='fsoul'){try{DG.addSouls(k.v||1)}catch(e){}num(k.x,k.y-24,'+'+(k.v||1)+' ✨ (Fundador)','#c9b8ff',true);sfx('gem')}else if(k.t==='vale'){try{giveV(k.vt,k.vi);savePref();const V=VK[k.vt];toast('🎟️ ¡Vale encontrado! '+V.i+' '+V.n+(k.vt==='r'?'':' (rareza '+(k.vi+1)+')')+' — guardado en tu inventario')}catch(e){}num(k.x,k.y-24,'🎟️ ¡Vale!','#ffd84a',true);sfx('gem')}sparks(k.x,k.y-6,k.t==='coin'?'#ffd84a':k.t==='heart'?'#ff7a8a':k.t==='fsoul'?'#c9b8ff':k.t==='vale'?'#ffd84a':'#7fe8ff',5,2)}}
 PK=PK.filter(k=>!k.got)}
/* ====================== salas, barreras, oleadas ====================== */
function roomAt(x,y){const tx=x/T,ty=y/T;for(const R of rooms)if(tx>R.x0+.8&&tx<R.x0+R.w-.8&&ty>R.y0+.8&&ty<R.y0+R.h-.8)return R;return null}
function lockRoom(R){R.state='fight';R.wave=0;R.next=D.t+650;setDoors(R,true);D.banner=R.type==='boss'?null:{t:D.t,txt:'¡Sala bloqueada!'};shake(5);sfx('land')}
function spawnWave(R){const fl=D.floor;R.wave++;const pool=fl===1?['slime','slime','bat','gob','skel']:['slime','bat','gob','gob','skel','skel'];
 if(R.type==='boss'){const e=mkBoss(bossFor(fl),R.px,R.py-40,fl);e.room=R;part(e.x,e.y,0,0,900,'#ffcf6a',50,0);shake(6);return}
 const n=Math.min(8,ri(3,4)+Math.floor(fl/2)+(R.wave-1));for(let i=0;i<n;i++){let x,y,tries=0;do{x=(R.x0+1.5+Math.random()*(R.w-3))*T;y=(R.y0+1.5+Math.random()*(R.h-3))*T;tries++}while((Math.hypot(x-hero.x,y-hero.y)<190||solidT(Math.floor(x/T),Math.floor(y/T)))&&tries<30);
  const e=mkEnemy(pick(pool),x,y,fl,fl>=2&&Math.random()<.12);e.spawn=D.t+700+i*90;e.room=R;E.push(e)}}
function clearRoom(R){R.state='done';setDoors(R,false);D.cleared++;if(D.cleared%2===0)dropGem(R.px,R.py,1);D.banner={t:D.t,txt:R.type==='boss'?'¡Piso superado!':'¡Sala limpia!'};sfx('win');for(const p of D.pets)if(p.down)petRevive(p,.5);
 for(let i=0;i<R.doors.length;i++)R.doors[i].tiles.forEach(([x,y])=>sparks((x+.5)*T,(y+.5)*T,th.acc,8,3));
 if(R.type==='boss')bossExit(R);
 else{if(Math.random()<.5)PK.push({t:'heart',x:R.px,y:R.py,vx:0,vy:0,z:0,vz:4,l:D.t});if(Math.random()<.3+Math.min(.15,D.floor*.03))dropChest(R,0,false)}}
function bossExit(R){const cxT=R.x0+(R.w>>1);let ex=null;
 for(const o of[5,-5,7,-7,3,-3,0]){const x=cxT+o;if(x>R.x0+1&&x<R.x0+R.w-2&&tile(x,R.y0-1)===0&&tile(x-1,R.y0-1)===0&&tile(x+1,R.y0-1)===0&&tile(x,R.y0)===1){ex=x;break}}
 let px=R.px,py=R.py;if(ex!==null){px=(ex+.5)*T;py=(R.y0+1.15)*T;PK.push({t:'portal',x:px,y:py,wy:R.y0*T,door:1,vx:0,vy:0,z:0,vz:0,l:D.t,permanent:1})}else PK.push({t:'portal',x:px,y:py,vx:0,vy:0,z:0,vz:0,l:D.t,permanent:1});
 const bs=D.bossSpot;let pos=null;if(bs&&bs.x>=R.x0*T&&bs.x<(R.x0+R.w)*T&&bs.y>=R.y0*T&&bs.y<(R.y0+R.h)*T){const s=safePt({x:R.px,y:R.py,r:14},bs.x,bs.y);pos={x:s[0],y:s[1]};if(Math.hypot(pos.x-px,pos.y-py)<80)pos.y+=90}
 dropChest(R,2,true,pos);D.bossSpot=null}
function freeAt(x,y,r){r=(r||10)*.9;return!solidT(Math.floor((x-r)/T),Math.floor((y-r)/T))&&!solidT(Math.floor((x+r)/T),Math.floor((y-r)/T))&&!solidT(Math.floor((x-r)/T),Math.floor((y+r)/T))&&!solidT(Math.floor((x+r)/T),Math.floor((y+r)/T))}
/* mientras una sala está cerrada, todo enemigo que quede fuera de ella (o dentro de una pared) se teletransporta adentro */
function fightRoom(){const f=rooms.filter(r=>r.state==='fight');if(!f.length)return null;const inb=r=>HS().some(hh=>!hh.dead&&hh.x>=r.x0*T&&hh.x<=(r.x0+r.w)*T&&hh.y>=r.y0*T&&hh.y<=(r.y0+r.h)*T);
 let R=f.find(inb);if(R)return R;if(D.room&&D.room.state==='fight')return D.room;
 return f.slice().sort((p,q)=>Math.hypot(p.px-hero.x,p.py-hero.y)-Math.hypot(q.px-hero.x,q.py-hero.y))[0]}
function containEnemies(){const R=fightRoom();if(!R)return;const x0=R.x0*T,x1=(R.x0+R.w)*T,y0=R.y0*T,y1=(R.y0+R.h)*T;
 // las puertas de una sala en combate nunca deben quedar abiertas
 if(R.doors.some(d=>d.tiles.some(([x,y])=>map[y*MW+x]!==3)))setDoors(R,true);
 // si el héroe quedó fuera de la sala cerrada (dash, empujón, etc.), vuelve adentro
 for(const hh of HS()){if(hh.dead||hh.gone||D.fade||!(hh.x<x0-T*.5||hh.x>x1+T*.5||hh.y<y0-T*.5||hh.y>y1+T*.5))continue;if(D.co&&(hh.x<x0-T*3||hh.x>x1+T*3||hh.y<y0-T*3||hh.y>y1+T*3))continue;const p=safePt(hh,R.px,R.py);hh.x=p[0];hh.y=p[1];hh.vx=hh.vy=0;if(hh===hero)cam={x:hh.x,y:hh.y}}
 for(const e of E){if(e.dead)continue;const out=e.x<x0+2||e.x>x1-2||e.y<y0+2||e.y>y1-2||solidT(Math.floor(e.x/T),Math.floor(e.y/T))||e.room!==R;if(!out)continue;
  const inside=!(e.x<x0+2||e.x>x1-2||e.y<y0+2||e.y>y1-2||solidT(Math.floor(e.x/T),Math.floor(e.y/T)));
  if(inside){e.room=R;continue}
  let px=R.px,py=R.py;for(let i=0;i<40;i++){const x=(R.x0+1.5+Math.random()*(R.w-3))*T,y=(R.y0+1.5+Math.random()*(R.h-3))*T;if(freeAt(x,y,e.r)&&Math.hypot(x-hero.x,y-hero.y)>(i<25?150:60)){px=x;py=y;break}}
  sparks(e.x,e.y-10,'#c9b6ff',8,3);e.x=px;e.y=py;e.vx=e.vy=0;e.z=0;e.room=R;if(e.sx!==undefined){e.sx=px;e.sy=py}if(e.cx!==undefined&&e.t==='coil'){e.cx=px;e.cy=py}sparks(px,py-10,'#c9b6ff',10,3)}}
function updRooms(){const hs=HS().filter(q=>!q.dead&&!q.gone),ld=hs[0]||hero;let R=roomAt(ld.x,ld.y);if(D.co)for(const q of hs){const r=roomAt(q.x,q.y);if(r&&r.state==='idle'){R=r;break}}
 if(R&&R!==D.room){D.room=R;R.visited=1;if(R.state==='idle')lockRoom(R)}
 containEnemies();
 for(const r of rooms)if(r.state==='fight'){if(D.t>=r.next&&!r.spawned){r.spawned=1;spawnWave(r)}
  if(r.spawned){const alive=E.some(e=>!e.dead&&e.room===r);if(!alive&&D.t>r.lastCheck){if(r.wave<r.waves){r.spawned=0;r.next=D.t+700}else clearRoom(r)}}
  if(r.spawned&&r.lastCheck===undefined)r.lastCheck=D.t+100}
 containEnemies()}
/* ✨ Esencia de alma: moneda especial de la mazmorra (solo jefes y cofres del tesoro/jefe). Se guardan al terminar la partida; sin comandos. */
const SOUL_PET=5000;
function soulGain(n){if(D.cheated||D.hub||!D.on)return;n=Math.max(1,Math.round(n*dfx().rw));D.souls=(D.souls|0)+n;try{num(hero.x,hero.y-70,'+'+n+' ✨','#b9a6ff',true)}catch(e){}}
function rewardBoss(){D.bosses++;if(D.cheated||D.co)return;soulGain(6+D.floor);
 let msg='';const roll=Math.random();if(roll<.6){const t='rgxd'[Math.floor(Math.random()*4)];let i=[0,0,0,1,1,2,3,4][Math.floor(Math.random()*8)]+Math.min(D.floor-1,2);if(i>6)i=6;if(Math.random()<.003)i=8;try{const c=giveV(t,i);savePref();D.loot.push(c)}catch(e){}}}
/* ====================== bucle de actualización ====================== */
function stepHero(dt){const h=hero;if(h.dead)return;
 let ix=joy.x,iy=joy.y;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;if(keys.w||keys.arrowup)iy-=1;if(keys.s||keys.arrowdown)iy+=1;const il=Math.hypot(ix,iy);if(il>1){ix/=il;iy/=il}
 const atkK=inp.atk||keys[' ']||keys.j;
 if(h.dashT>0){h.dashT-=dt*16.67;h.vx=Math.cos(h.dashAng)*13;h.vy=Math.sin(h.dashAng)*13;if(Math.floor(D.t/16)%2===0)PT.push({x:h.x,y:h.y,vx:0,vy:0,l:260,m:260,c:'ghost',s:1,g:0,face:h.face,gh:1});if(h.dashT<=0){h.vx*=.35;h.vy*=.35;h.sqv+=.3}}
 else{const sp=3.05*h.spdM*(h.atk?.55:1)*(h.rootT>D.t||h.paraT>D.t?0:1)*(h.slowT>D.t?(h.slowK||1):1);h.vx+=(ix*sp-h.vx)*.2*dt;h.vy+=(iy*sp-h.vy)*.2*dt}
 if(h.paraT>D.t){h.atk=null;h.wo=0;if(Math.random()<.6)sparks(h.x+rnd(-10,10),h.y-rnd(4,34),'#7fe8ff',2,2.5)}else if(!h.atk&&atkK)startAttack();
 updAttack(dt);
 const hit=moveBody(h,dt,0,.2);
 const spd=Math.hypot(h.vx,h.vy);h.ph+=spd*.15*dt;
 if(spd>1&&h.dashT<=0){h.stepT-=spd*dt;if(h.stepT<=0){h.stepT=26;dust(h.x+rnd(-3,3),h.y,2);}}
 if(Math.abs(h.vx)>.5&&!h.atk)h.face=h.vx>0?1:-1;if(h.atk||nearestEnemy(380))h.face=Math.cos(h.aim)>=0?1:-1;
 if(!h.atk&&!nearestEnemy(380)&&spd>.8)h.aim=Math.atan2(h.vy,h.vx);
 // resortes: squash, inclinación, cabeza, arma
 h.sqv+=(-h.sq*.28)*dt;h.sqv*=Math.pow(.7,dt);h.sq=clamp(h.sq+h.sqv*dt,-.5,.6);
 const tl=clamp(h.vx*.09,-.5,.5);h.lean+=(tl-h.lean)*.25*dt;
 h.hvx+=(-h.hx*.22-h.vx*.05)*dt;h.hvy+=(-h.hy*.22+(-spd*.01))*dt;h.hvx*=Math.pow(.78,dt);h.hvy*=Math.pow(.78,dt);h.hx=clamp(h.hx+h.hvx*dt,-5,5);h.hy=clamp(h.hy+h.hvy*dt,-4,4);
 const al=Math.atan2(Math.sin(h.aim),Math.cos(h.aim)*h.face);h.wv+=ad(h.wa,al)*.22*dt;h.wv*=Math.pow(.62,dt);h.wa+=h.wv*dt;
 if(D.t>h.shT&&h.sh<h.shMax&&D.t-h.regen>900){h.sh++;h.regen=D.t}if(h.regen===undefined)h.regen=0;
 if(h.dashCd>0)h.dashCd-=dt*16.67;
 // capa verlet
 const anc={x:h.x-h.face*3,y:h.y-25};const c=h.cape;c[0].x=anc.x;c[0].y=anc.y;
 for(let i=1;i<c.length;i++){const p=c[i],vx=(p.x-p.px)*.9,vy=(p.y-p.py)*.9;p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+.38*dt}
 for(let it=0;it<3;it++){for(let i=1;i<c.length;i++){const a=c[i-1],b=c[i];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const df=(d-5.5)/d;if(i===1){b.x-=dx*df;b.y-=dy*df}else{a.x+=dx*df*.5;b.x-=dx*df*.5;a.y+=dy*df*.5;b.y-=dy*df*.5}}c[0].x=anc.x;c[0].y=anc.y}
 // arrastre de la capa por movimiento (la hace ondear)
 for(let i=1;i<c.length;i++){c[i].x-=h.vx*.12*i*.3;c[i].y-=h.vy*.05*i*.3}
 // recogibles interactivos
 for(const k of PK){if(k.t==='portal'&&Math.hypot(h.x-k.x,h.y-k.y)<34&&!D.fade){if(D.hub){if(!D.paused)hubExit()}else D.fade={t:D.t,to:'next'}}}
 for(const c2 of D.chests){if(!c2.open&&Math.hypot(h.x-c2.x,h.y-c2.y)<30){c2.open=D.t;openChest(c2)}}
 for(const o of D.props){const d=Math.hypot(h.x-o.x,h.y-o.y);if(d>74)o.armed=true;else if(o.armed&&d<(o.act==='hook'?30:38)&&!D.paused){o.armed=false;if(o.k==='table')tableMenu(o);else if(o.k==='forge')forgeMenu(o);else if(o.k==='st')stationMenu(o);else shopMenu(o)}}
 if(h.regenH>0){h.regT+=dt*16.67;if(h.regT>3000/h.regenH){h.regT=0;if(h.hp<h.max)healHero(1)}}
 h.trail=h.trail.filter(t=>D.t-t.t<200)}
function dash(){if(D.co&&D.co.role==='client'){coSend({t:'dgdash'});return}const h=hero;if(h.dead||h.dashCd>0||h.dashT>0||D.paused||h.paraT>D.t)return;let ix=joy.x,iy=joy.y;if(keys.a)ix-=1;if(keys.d)ix+=1;if(keys.w)iy-=1;if(keys.s)iy+=1;
 h.dashAng=Math.hypot(ix,iy)>.2?Math.atan2(iy,ix):(Math.hypot(h.vx,h.vy)>.8?Math.atan2(h.vy,h.vx):h.aim);h.dashT=190;h.rootT=0;h.dashCd=950*Math.max(.25,h.dashM);h.inv=D.t+330;h.atk=null;h.wo=0;h.sqv-=.4;dust(h.x,h.y,8);sfx('swing')}
function swapWeapon(){if(D.co&&D.co.role==='client'){coSend({t:'dgswap'});return}const h=hero;if(!h.wps[0]||!h.wps[1]||h.dead)return;h.atk=null;h.wo=0;h.pull=0;h.wi=1-h.wi;h.cd=D.t+160;const f=curW();num(h.x,h.y-48,f.i+' '+wName(f.inst),'#fff');sfx('pick');h.sqv+=.2}
function update(dt){
 D.t+=dt*16.67;const now=D.t;
 if(D.co)coStepHeroes(dt);else{stepHero(dt);if(!hero.dead)DGART.heroFx(hero,part,dt)}
 for(const e of E){if(D.co)hero=coTgt(e);try{updEnemy(e,dt)}catch(err){const m='IA '+e.t+': '+(err&&err.message);if(DGART.errs.length<30&&!DGART.errs.includes(m)){DGART.errs.push(m);try{console.error('[logica] '+m,err&&err.stack)}catch(_){}}e.st='idle';e.stT=D.t+800;e.raise=0}}
 if(D.co)hero=D.co.me;
 // separación suave entre cuerpos (masa)
 const B=[...HS().filter(q=>!q.dead),...E.filter(e=>!e.dead&&e.spawn<=now&&e.z<20)];for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],b=B[j],dx=b.x-a.x,dy=b.y-a.y,r=a.r+b.r,d2=dx*dx+dy*dy;if(d2<r*r&&d2>.01){const d=Math.sqrt(d2),pen=(r-d)*.5,nx=dx/d,ny=dy/d,ma=a.m||1,mb=b.m||1,tm=ma+mb;a.x-=nx*pen*(mb/tm)*2*.5;a.y-=ny*pen*(mb/tm)*2*.5;b.x+=nx*pen*(ma/tm)*2*.5;b.y+=ny*pen*(ma/tm)*2*.5}}
 E=E.filter(e=>!e.dead);
 for(const e of E)if(!e.room)e.room=fightRoom();
 updProj(dt);updHaz(dt);updArchEnv(dt);updBossIntro();updPick(dt);updRooms();updPets(dt);D.bolts=D.bolts.filter(q=>now-q.t<260);D.rings=D.rings.filter(q=>now-q.t<650);
 for(const p of PT){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*16*dt;p.l-=dt*16.67}PT=PT.filter(p=>p.l>0);
 NUM=NUM.filter(n=>now-n.t<900);for(const n of NUM)n.y+=n.vy*dt*.6;
 if(D.fade){const p=(now-D.fade.t)/450;if(p>=1&&D.fade.to==='next'){gate();}}
 camStep(dt);
 if(!D.co&&hero.dead&&now-D.dying>1000&&!D.deadShown){D.deadShown=true;onDeath()}
 if(D.co&&D.co.role==='host')coNet()}
function camStep(dt){const now=D.t,ch=D.co?coCam():hero;let tx=ch.x+Math.cos(ch.aim)*26,ty=ch.y-14+Math.sin(ch.aim)*16,k=.1;const B=D.boss;if(B&&B.intro&&!B.intro.done&&!B.dead){const p=(now-B.intro.t0)/B.intro.dur,w=eio(clamp(p/.16,0,1))*(1-eio(clamp((p-.85)/.15,0,1)));tx+=(B.x-tx)*w;ty+=(B.y-24-ty)*w;k=.1+.06*w}cam.x+=(tx-cam.x)*k*dt;cam.y+=(ty-cam.y)*k*dt}

/* ====================== dibujo ====================== */
const shadeC=(c,f)=>typeof shade==='function'?shade(c,f):c;
function limb(x1,y1,x2,y2,w,c,fl){g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.lineWidth=w+2.6;g.strokeStyle=OLC;g.stroke();g.lineWidth=w;g.strokeStyle=fl?'#fff':c;g.stroke()}
function ball(x,y,r,c,fl){const gr=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);const cc=fl?'#fff':c;gr.addColorStop(0,fl?'#fff':shadeC(cc,.4));gr.addColorStop(.6,cc);gr.addColorStop(1,fl?'#fff':shadeC(cc,-.35));g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=gr;g.fill();g.lineWidth=2.2;g.strokeStyle=OLC;g.stroke()}
function ell(x,y,rx,ry,c,fl,rot){const cc=fl?'#fff':c,gr=g.createLinearGradient(x-rx,y-ry,x+rx,y+ry);gr.addColorStop(0,fl?'#fff':shadeC(cc,.3));gr.addColorStop(1,fl?'#fff':shadeC(cc,-.3));g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,TAU);g.fillStyle=gr;g.fill();g.lineWidth=2.2;g.strokeStyle=OLC;g.stroke()}
function poly(p,c,lw){g.beginPath();p.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1]));g.closePath();g.fillStyle=c;g.fill();g.lineWidth=lw||2;g.strokeStyle=OLC;g.lineJoin='round';g.stroke()}
function shadowAt(x,y,rx,ry,a){g.save();g.globalAlpha=a||.32;g.fillStyle='#000';g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();g.restore()}
/* dibuja un arma local: origen en la mano, apunta hacia +x */
function weaponArt(k,w,pull,t,col){g.save();
 if(k==='club'){poly([[-6,-3],[24,-6],[34,-11],[38,0],[34,11],[24,6],[-6,3]],'#8a5a2b',2.4);g.fillStyle='#d8d2b8';[[26,-8],[32,-4],[32,5],[26,8]].forEach(q=>{poly([[q[0]-2,q[1]],[q[0]+3,q[1]+(q[1]<0?-5:5)],[q[0]+3,q[1]]],'#d8d2b8',1.4)})}
 else if(k==='sword'||k==='axe'||k==='spear'){const L=w.len;
  if(k==='spear'){g.fillStyle='#8a5a2b';g.fillRect(-14,-1.6,L+14,3.2);g.strokeStyle=OLC;g.lineWidth=1.6;g.strokeRect(-14,-1.6,L+14,3.2);poly([[L,-5],[L+20,0],[L,5]],'#e8eef2',1.8)}
  else if(k==='axe'){g.fillStyle='#8a5a2b';g.fillRect(-8,-1.8,L,3.6);g.strokeStyle=OLC;g.lineWidth=1.6;g.strokeRect(-8,-1.8,L,3.6);poly([[L-14,-1],[L-8,-17],[L+9,-12],[L+11,0],[L+9,12],[L-8,17],[L-14,1]],'#c9d1d6',2.2);g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1.4;g.beginPath();g.moveTo(L+4,-9);g.lineTo(L+8,-1);g.stroke()}
  else{g.fillStyle='#6a4a22';g.fillRect(-7,-2,9,4);g.strokeStyle=OLC;g.lineWidth=1.5;g.strokeRect(-7,-2,9,4);poly([[2,-7],[2,7],[6,5],[6,-5]],'#e0a020',1.6);const gl=pull>0?1:0;poly([[6,-3.2],[L,-3.2],[L+8,0],[L,3.2],[6,3.2]],'#e6eef4',2);g.strokeStyle='rgba(120,150,180,.8)';g.lineWidth=1;g.beginPath();g.moveTo(8,0);g.lineTo(L,0);g.stroke();g.strokeStyle='rgba(255,255,255,.9)';g.beginPath();g.moveTo(10,-1.6);g.lineTo(L-2,-1.6);g.stroke()}}
 else if(k==='bow'){const a=.5+pull*.18,R=17;g.lineCap='round';g.beginPath();g.arc(6-R*.4,0,R,-1.15,1.15);g.lineWidth=5.6;g.strokeStyle=OLC;g.stroke();g.lineWidth=3;g.strokeStyle='#a8743a';g.stroke();const ex=6-R*.4+Math.cos(1.15)*R,ey=Math.sin(1.15)*R,px=-pull*14;g.beginPath();g.moveTo(ex,-ey);g.lineTo(px,0);g.lineTo(ex,ey);g.lineWidth=1.3;g.strokeStyle='#f4f4f0';g.stroke();if(pull>.02||true){g.beginPath();g.moveTo(px,0);g.lineTo(px+26,0);g.lineWidth=2.4;g.strokeStyle=OLC;g.stroke();g.lineWidth=1.3;g.strokeStyle='#e8e0c0';g.stroke();poly([[px+26,-2.6],[px+32,0],[px+26,2.6]],'#e8eef2',1.2)}}
 else{g.fillStyle='#6a3fb0';g.fillRect(-12,-1.8,40,3.6);g.strokeStyle=OLC;g.lineWidth=1.6;g.strokeRect(-12,-1.8,40,3.6);const gl=.6+pull*.8+Math.sin(t/150)*.12,r=5.5+pull*3;const gr=g.createRadialGradient(31,0,1,31,0,r*3);gr.addColorStop(0,'rgba(255,255,255,'+Math.min(1,gl)+')');gr.addColorStop(.35,'rgba(196,108,255,'+gl*.8+')');gr.addColorStop(1,'rgba(150,60,255,0)');g.fillStyle=gr;g.beginPath();g.arc(31,0,r*3,0,TAU);g.fill();ball(31,0,r,'#c46cff')}
 g.restore()}
/* muñeco genérico "vivo": piernas que caminan, torso que respira, cabeza con retraso, brazos con resorte */
function chibi(o,P,wp){const t=D.t,s=P.sc||1,mv=Math.min(1,Math.hypot(o.vx,o.vy)/2.4),fl=o.flash>t,cr=(o.crouch||0)*6;
 const b=Math.abs(Math.sin(o.ph))*2.3*mv+Math.sin(t/380+o.x*.05)*.8*(1-mv);
 g.save();g.translate(o.x,o.y-(o.z||0));
 shadowAt(0,2+(o.z||0),12*s*(1-(o.z||0)/90),5.5*s,.34);
 g.scale(s,s);if(o.dashA!==undefined){g.rotate(o.dashA);g.scale(1.3,.8);g.rotate(-o.dashA)}
 g.rotate((o.lean||0)*.14);g.scale(o.face*(1+(o.sq||0)*.6),1-(o.sq||0)*.8);
 const sh=-23-b+cr,hy=-34-b+cr+(o.hy||0),hxo=(o.hx||0)-(o.lean||0)*2;
 // brazo trasero
 const sw=Math.sin(o.ph)*5*mv;limb(-6,sh+1,-8-(wp&&wp.k==='bow'?-8:0)+sw*.4,sh+11-(wp&&wp.k==='bow'?9:0)+(1-mv)*1,4,P.arm||P.body,fl);ball(-8+sw*.4,sh+12,3,P.skin,fl);
 // piernas
 for(let i=0;i<2;i++){const ph=o.ph+i*Math.PI,fx=Math.sin(ph)*6.5*mv+(i?-2:2),fy=-Math.max(0,Math.cos(ph))*4.5*mv;limb(i?-3:3,-11+cr*.4,fx,fy-2,5,P.leg||P.body,fl);ell(fx+1.5,fy,5.4,3,P.boot||'#4a3a2a',fl)}
 // torso
 ell(0,-18-b+cr,8.6,9.2,P.body,fl);g.fillStyle=fl?'#fff':shadeC(P.body,-.45);g.fillRect(-8,-13-b+cr,16,3);if(P.gem&&!fl){ball(0,-19-b+cr,2.4,P.gem)}
 // cabeza
 if(P.head==='skull'){ball(hxo,hy,9,P.skin,fl);if(!fl){g.fillStyle='#1a1a22';g.beginPath();g.arc(hxo+3,hy-1,2.6,0,TAU);g.arc(hxo-3,hy-1,2.3,0,TAU);g.fill();g.fillRect(hxo-3,hy+4,6,2)}}
 else{ball(hxo,hy,9.2,P.helm||P.skin,fl);
  if(P.visor&&!fl){g.fillStyle='#1c1c2a';g.beginPath();g.roundRect(hxo+1,hy-3,9,6,2);g.fill()}
  else if(!fl){g.fillStyle=P.skin;g.beginPath();g.ellipse(hxo+2.5,hy+1.5,6.4,5.2,0,0,TAU);g.fill()}
  if(!fl){const bl=(t%3300)<130,al=Math.atan2(Math.sin(o.aim||0),Math.cos(o.aim||0)*o.face),px=Math.cos(al)*1.3,py=Math.sin(al)*1;for(const ex of[2,7]){const X=hxo+ex+(P.visor?1.2:0);g.fillStyle='#fff';g.beginPath();g.ellipse(X,hy+(P.visor?0:.5),2.2,bl?.5:2.2,0,0,TAU);g.fill();if(!bl){g.fillStyle=P.eye||'#222';g.beginPath();g.arc(X+px,hy+(P.visor?0:.5)+py,1.1,0,TAU);g.fill()}}}
  if(P.ears&&!fl){poly([[hxo-6,hy-3],[hxo-17,hy-7],[hxo-7,hy+3]],P.skin,1.8);poly([[hxo+3,hy-6],[hxo-3,hy-14],[hxo+7,hy-7]],P.skin,1.8)}
  if(P.cs&&!fl){const cc=P.crest,cy=hy-8;if(P.cs==='horn'){poly([[hxo-5,cy+2],[hxo-9,cy-10],[hxo-2,cy]],cc,1.6);poly([[hxo+5,cy+2],[hxo+9,cy-10],[hxo+2,cy]],cc,1.6)}else if(P.cs==='leaf'||P.cs==='flame'){poly([[hxo-5,cy+2],[hxo-3,cy-11],[hxo,cy]],cc,1.5);poly([[hxo-1,cy+1],[hxo+2,cy-14],[hxo+5,cy+1]],cc,1.5)}else{for(let i=-1;i<=1;i++)poly([[hxo+i*5-2.5,cy+2],[hxo+i*5,cy-7-(i?0:3)],[hxo+i*5+2.5,cy+2]],cc,1.5)}}}
 // arma y brazo delantero
 if(wp){const wa=(o.wa||0)+(o.wo||0)*o.face*(o.wmir!==undefined?o.wmir:1),R=wp.k==='bow'||wp.k==='magic'||wp.k==='staff'?8:9,hx=5+Math.cos(wa)*R,hy2=sh+3+Math.sin(wa)*R;
  g.save();g.translate(hx,hy2);g.rotate(wa);weaponArt(wp.k,wp,o.pull||0,t);g.restore();limb(6,sh+1,hx,hy2,4.2,P.arm||P.body,fl);ball(hx,hy2,3.2,P.skin,fl)}
 g.restore()}
function fdHeroFx(h,cw){if(h.dead||(D.co&&h!==D.co.me)||typeof fdOn!=='function')return;const t=D.t;
 if(fdOn('aura')){const p=.5+.5*Math.sin(t/260);g.save();g.translate(h.x,h.y+4);g.scale(1,.42);const gr=g.createRadialGradient(0,0,6,0,0,38+p*4);gr.addColorStop(0,'rgba(255,233,168,0)');gr.addColorStop(.7,'rgba(255,216,74,'+(.28+p*.18)+')');gr.addColorStop(1,'rgba(255,216,74,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,38+p*4,0,6.2832);g.fill();g.lineWidth=2.2;g.strokeStyle='rgba(255,240,180,'+(.55+p*.3)+')';g.beginPath();g.arc(0,0,26+p*2,0,6.2832);g.stroke();for(let i=0;i<5;i++){const a=t/700+i*1.2566;g.fillStyle='rgba(255,246,200,.9)';g.beginPath();g.arc(Math.cos(a)*(30+p*3),Math.sin(a)*(30+p*3),1.8,0,6.2832);g.fill()}g.restore()}
 if(fdOn('cape')){const f=h.face||1,sw=Math.sin(t/180+(h.ph||0)*.5)*3+Math.max(-8,Math.min(8,-(h.vx||0)*2.2)),x=h.x,y=h.y;g.save();const gr=g.createLinearGradient(x-f*4,y-40,x-f*26,y);gr.addColorStop(0,'#2a2f7a');gr.addColorStop(1,'#14224a');g.beginPath();g.moveTo(x-f*5,y-37);g.quadraticCurveTo(x-f*(18+sw*.4),y-24,x-f*(24+sw),y-2+Math.sin(t/200)*1.5);g.quadraticCurveTo(x-f*(12+sw*.5),y+4,x-f*3,y-8);g.closePath();g.fillStyle=gr;g.fill();g.lineWidth=2;g.strokeStyle='#0b1030';g.stroke();for(let i=0;i<4;i++){const u=(t/900+i*.25)%1;g.fillStyle='rgba(255,240,180,'+(.4+.5*Math.sin(t/200+i*2))+')';g.beginPath();g.arc(x-f*(8+u*14+sw*u),y-30+u*26,1.3+((i+1)%2),0,6.2832);g.fill()}g.restore()}
 if(fdOn('trail')&&h.atk){const R=((cw&&cw.rg)||60)*.8;for(let i=0;i<2;i++){const a=(h.aim||0)+rnd(-.5,.5),d=R*rnd(.5,1);part(h.x+Math.cos(a)*d,h.y-16+Math.sin(a)*d,rnd(-.3,.3),rnd(-.5,0),rnd(260,420),Math.random()<.5?'#ffd84a':'#fff3b0',rnd(1.6,2.8),0)}}}
function drawHero(h0){const h=h0||hero;if(D.co&&h.dead){coDown(h);return}if(h.dead&&D.t-D.dying>350)return;const cw=wFull(h.wps[h.wi]||h.wps[0]||h.wps[1]);try{fdHeroFx(h,cw)}catch(e){}DGART.skOv=D.co?(h.sk||null):null;try{DGART.setEl(cw.inst.el,cw.inst.q);DGART.hero(h,cw,cw.id)}finally{DGART.skOv=null}if(pref.bt&&!h.dead&&(!D.co||h===D.co.me))heroTag(h)}
function heroTag(h){try{g.save();g.font='bold 12px Trebuchet MS,sans-serif';rgbName(g,String(pref.name||'Rey').slice(0,12),h.x,h.y-66,D.t,3.5,OLC);g.font='bold 9px Trebuchet MS,sans-serif';g.textAlign='center';g.textBaseline='bottom';g.lineWidth=3;g.strokeStyle=OLC;g.fillStyle='#cfe6ff';g.strokeText('✦ BETATESTER ✦',h.x,h.y-79);g.fillText('✦ BETATESTER ✦',h.x,h.y-79);g.restore()}catch(e){}}
function drawEnemy(e){DGART.enemy(e,hero)}
function drawWorld(sw,sh){
 const x0=Math.floor((cam.x-sw/2/zoom)/T)-1,x1=Math.ceil((cam.x+sw/2/zoom)/T)+1,y0=Math.floor((cam.y-sh/2/zoom)/T)-1,y1=Math.ceil((cam.y+sh/2/zoom)/T)+1,t=D.t;
 const G=(f,tag)=>DGART.guard(f,tag);
 G(()=>DGART.ground(x0,x1,y0,y1,tile,T,WH,th),'suelo');G(()=>{const cw=curW();DGART.setEl(cw.inst.el,cw.inst.q)},'elem');
 // ondas del jefe
 G(()=>DGART.teles(E,hero),'ondas');G(()=>DGART.hazards(D,hero),'trampas');
 // estelas de arma
 G(()=>{for(const hh of HS())if(hh.trail)DGART.trail(hh.trail)},'estela');
 // cosas del suelo + entidades ordenadas por y
 const L=[];for(const k of PK)L.push([k.y,()=>drawPick(k)]);for(const c of D.chests)L.push([c.y,()=>drawChest(c)]);for(const o of D.props)L.push([o.y,()=>o.k==='st'?drawStation(o):DGART[o.k](o)]);for(const p of D.pets)L.push([p.y,()=>DGART.pet(p,hero)]);for(const e of E)L.push([e.y,()=>drawEnemy(e)]);for(const w of D.bw||[])L.push([(w.ty+w.h)*T,()=>DGART.bwall(w,D)]);for(const hh of HS())if(!hh.gone)L.push([hh.y,()=>drawHero(hh)]);L.sort((a,b)=>a[0]-b[0]);L.forEach(l=>G(l[1],'entidad'));
 for(const p of PR)G(()=>DGART.proj(p),'proyectil');
 G(()=>DGART.beams(D.beams||[],D),'rayos');
 G(()=>DGART.bolts(D.bolts),'rayos2');G(()=>DGART.rings(D.rings),'ondas2');
 G(()=>DGART.particles(PT),'particulas');
 G(()=>DGART.lights(cam,sw/zoom,sh/zoom,hero),'luces');
 if(D.co)G(coTags,'nombres');
 for(const n of NUM){const a=1-(t-n.t)/900;g.save();g.globalAlpha=clamp(a*1.6,0,1);g.font='900 '+(n.big?20:15)+'px Georgia,serif';g.textAlign='center';g.lineWidth=4;g.strokeStyle='#000';g.strokeText(n.txt,n.x,n.y);g.fillStyle=n.c;g.fillText(n.txt,n.x,n.y);g.restore()}}
function drawPick(k){DGART.pick(k)}
function drawChest(c){DGART.chest(c)}
function drawMinimap(){const m=$('dgmm');if(!m)return;const x=m.getContext('2d'),S=m.width;x.clearRect(0,0,S,S);let mnx=1e9,mny=1e9,mxx=-1e9,mxy=-1e9;for(const R of rooms){mnx=Math.min(mnx,R.x0);mny=Math.min(mny,R.y0);mxx=Math.max(mxx,R.x0+R.w);mxy=Math.max(mxy,R.y0+R.h)}
 const sc=Math.min((S-8)/(mxx-mnx),(S-8)/(mxy-mny)),ox=(S-(mxx-mnx)*sc)/2,oy=(S-(mxy-mny)*sc)/2,X=v=>ox+(v-mnx)*sc,Y=v=>oy+(v-mny)*sc;
 x.lineWidth=2;x.strokeStyle='rgba(255,255,255,.25)';for(let i=0;i<rooms.length-1;i++){const a=rooms[i],b=rooms[i+1];if(!(a.visited||b.visited))continue;x.beginPath();x.moveTo(X(a.x0+a.w/2),Y(a.y0+a.h/2));x.lineTo(X(b.x0+b.w/2),Y(b.y0+b.h/2));x.stroke()}
 for(const R of rooms){const nb=R.visited||(rooms[R.i-1]&&rooms[R.i-1].visited)||(rooms[R.i+1]&&rooms[R.i+1].visited);if(!nb)continue;x.fillStyle=!R.visited?'rgba(255,255,255,.12)':R.state==='fight'?'rgba(255,80,80,.7)':R.type==='boss'?'rgba(255,120,60,.55)':R.type==='treasure'?'rgba(255,216,74,.55)':'rgba(120,200,255,.35)';x.fillRect(X(R.x0),Y(R.y0),R.w*sc,R.h*sc);x.strokeStyle=R===D.room?'#fff':'rgba(255,255,255,.4)';x.lineWidth=R===D.room?2:1;x.strokeRect(X(R.x0),Y(R.y0),R.w*sc,R.h*sc);if(R.type==='boss'&&R.visited){x.fillStyle='#fff';x.font='bold 9px sans-serif';x.textAlign='center';x.fillText('☠',X(R.x0+R.w/2),Y(R.y0+R.h/2)+3)}if(R.type==='treasure'){x.fillStyle='#fff';x.font='9px sans-serif';x.textAlign='center';x.fillText('★',X(R.x0+R.w/2),Y(R.y0+R.h/2)+3)}}
 x.fillStyle='#4cf0ff';x.beginPath();x.arc(X(hero.x/T),Y(hero.y/T),3,0,TAU);x.fill()}
let hudC={};
function hud(){const h=hero,set=(id,v)=>{if(hudC[id]!==v){hudC[id]=v;const e=$(id);if(e)e.innerHTML=v}};
 let hp='';const hs=Math.ceil(h.max/20);for(let i=0;i<hs;i++){const f=clamp((h.hp-i*20)/20,0,1);hp+='<i class="dgh"><b style="width:'+Math.round(f*100)+'%"></b></i>'}set('dghp',hp);
 let sh='';for(let i=0;i<h.shMax;i++)sh+='<i class="dgs'+(i<h.sh?' on':'')+'"></i>';set('dgsh',sh);
 set('dgco','🪙 '+h.coins);set('dgfl',D.hub?'🏠 Sala del héroe':th.n+' · Piso '+D.floor+' · Sala '+(Math.max(0,rooms.indexOf(D.room||rooms[0]))+1)+'/'+rooms.length+(D.co?' · 👥 '+HS().filter(q=>!q.gone).length+' (+'+Math.round((coMul()-1)*100)+'%)':' · 🎒 '+D.pouch.length+'/'+POUCH_CAP));
 const w=curW(),ci=h.wps[h.wi]||h.wps[0]||h.wps[1];set('dgatk',ci?wImg(ci,44):w.i);const sw=$('dgsw');if(sw)sw.style.display=(h.wps[0]&&h.wps[1])?'':'none';
 let ws='';for(let q=0;q<2;q++){const i=h.wps[q];ws+='<span class="dgws'+(q===h.wi?' on':'')+'"'+(i?' style="border-color:'+rc(i.q)+'"':'')+'>'+(i?wImg(i,26)+(i.el?'<u>'+ELS[i.el].i+'</u>':''):'·')+'</span>'}set('dgws',ws);
 let eq='';for(const k in h.gear){const g2=h.gear[k];eq+='<span class="dgeqs"'+(g2?' style="border-color:'+rc(g2.q)+'"':'')+'>'+(g2?g2.i:'·')+'</span>'}for(const p of D.pets)eq+='<span class="dgeqs dgpet'+(p.down?' dn':'')+'">'+PET[p.k].i+'<b style="width:'+Math.round(clamp(p.hp/p.max,0,1)*100)+'%"></b></span>';set('dgeq',eq);
 const dd=$('dgdash');if(dd){const p=h.dashCd>0?Math.round(h.dashCd/(950*Math.max(.25,h.dashM))*100):0;dd.style.setProperty('--cd',p+'%')}
 const bb=$('dgboss');if(bb){if(D.boss&&!D.boss.dead){bb.style.display='block';bb.firstChild.style.width=Math.max(0,D.boss.hp/D.boss.max*100)+'%';const bn=bb.querySelector('b');if(bn&&bn.dataset.t!==D.boss.t){bn.dataset.t=D.boss.t;bn.textContent=EN[D.boss.t].n}}else bb.style.display='none'}}
D.ctx=()=>{const b=D.boss&&!D.boss.dead?D.boss.t+'/'+D.boss.st+(D.boss.kind?'/'+D.boss.kind:''):'-';return'p'+D.floor+' '+b+' e'+E.length+' pt'+PT.length};
function frame(n){const _f0=performance.now();try{frame0(n)}finally{const ms=performance.now()-_f0;D.lastMs=ms;if(ms>180&&D.on&&!document.hidden){const b=D.boss&&!D.boss.dead?D.boss.t+'/'+D.boss.st+'/'+(D.boss.kind||''):'-';D.logDiag('LENTO '+Math.round(ms)+'ms piso '+D.floor+' jefe '+b+' enem '+E.length+' part '+PT.length+' proy '+PR.length)}}}
function frame0(n){const cv0=cv;if(!D.on)return;const stg=$('stage');if(stg&&!stg.classList.contains('dgm'))stg.classList.add('dgm');const dtRaw=Math.min(50,n-(lastN||n));lastN=n;
 let dt=dtRaw/16.67;
 if(D.co&&D.co.role==='client'&&!D.co.ready){g=cv0.getContext('2d');g.setTransform(1,0,0,1,0,0);g.fillStyle='#0a0c15';g.fillRect(0,0,cv0.width,cv0.height);g.fillStyle='#cfe6ff';g.font='bold '+Math.round(16*dp)+'px Trebuchet MS,sans-serif';g.textAlign='center';g.fillText('🌐 Entrando a la mazmorra…',cv0.width/2,cv0.height/2);return}
 if(!D.paused&&!D.over&&!document.hidden){if(D.co&&D.co.role==='client')coCUpdate(dt);else if(D.frz>0){D.frz-=dtRaw;dt=0}else{const st=dt>1.4?2:1;for(let i=0;i<st;i++)update(dt/st)}}
 if(D.headless)return;
 g=cv0.getContext('2d');DGART.begin(g,D.t,th,(D.floor-1)%THEMES.length);const sw=cv0.width/dp,sh=cv0.height/dp;zoom=clamp(Math.min(sw,sh)/250,1.2,2.2);
 g.setTransform(1,0,0,1,0,0);g.fillStyle=th.bg;g.fillRect(0,0,cv0.width,cv0.height);
 const sk=(D.shk||0);D.shk=sk*.88<.3?0:sk*.88;const sx=sk?rnd(-sk,sk):0,sy=sk?rnd(-sk,sk):0;
 g.setTransform(dp*zoom,0,0,dp*zoom,dp*(sw/2-cam.x*zoom+sx),dp*(sh/2-cam.y*zoom+sy));
 drawWorld(sw,sh);
 // viñeta y luz
 g.setTransform(dp,0,0,dp,0,0);const vg=g.createRadialGradient(sw/2,sh/2,Math.min(sw,sh)*.28,sw/2,sh/2,Math.max(sw,sh)*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.62)');g.fillStyle=vg;g.fillRect(0,0,sw,sh);
 if(hero.hp<hero.max*.3&&!hero.dead){g.fillStyle='rgba(255,0,0,'+(.08+.06*Math.sin(D.t/160))+')';g.fillRect(0,0,sw,sh)}
 if(D.bossCard){const C=D.bossCard,a=(D.t-C.t0)/C.dur;if(a<1&&a>=0){const fi=Math.min(1,a/.14),fo=a>.84?1-(a-.84)/.16:1,al=fi*fo,bar=Math.round(sh*.085)*eo(Math.min(1,a*7))*(a>.9?1-(a-.9)/.1:1);g.save();g.fillStyle='rgba(0,0,0,.85)';g.fillRect(0,0,sw,bar);g.fillRect(0,sh-bar,sw,bar);
  g.globalAlpha=al;g.textAlign='center';const fs=Math.round(Math.min(48,sw/11)),y=sh*.30,sc=1.25-.25*eo(Math.min(1,a/.2));g.translate(sw/2,y);g.scale(sc,sc);
  g.font='900 '+fs+'px Georgia,serif';g.lineWidth=7;g.strokeStyle='#000';g.shadowColor=C.col;g.shadowBlur=24;g.strokeText(C.name,0,0);g.fillStyle='#fff';g.fillText(C.name,0,0);g.shadowBlur=0;g.fillStyle=C.col;g.globalAlpha=al*.55;g.fillText(C.name,0,0);g.globalAlpha=al;
  const lw=Math.min(sw*.36,260)*eo(Math.min(1,a/.3));g.fillStyle=C.col;g.fillRect(-lw,fs*.28,lw*2,3);
  g.font='italic 700 '+Math.round(fs*.38)+'px Georgia,serif';g.lineWidth=4;g.strokeStyle='#000';g.strokeText(C.sub,0,fs*.28+Math.round(fs*.48));g.fillStyle='#ffe9b0';g.fillText(C.sub,0,fs*.28+Math.round(fs*.48));g.restore()}else if(a>=1)D.bossCard=null}
 if(D.banner){const a=(D.t-D.banner.t)/1600;if(a<1){g.save();g.globalAlpha=Math.sin(Math.min(1,a)*Math.PI)*1.2;g.font='italic 900 '+Math.round(Math.min(34,sw/18))+'px Georgia,serif';g.textAlign='center';g.lineWidth=6;g.strokeStyle='#000';g.strokeText(D.banner.txt,sw/2,sh*.28);g.fillStyle='#ffe27a';g.fillText(D.banner.txt,sw/2,sh*.28);g.restore()}}
 if(D.fade){const p=clamp((D.t-D.fade.t)/450,0,1);g.fillStyle='rgba(0,0,0,'+p+')';g.fillRect(0,0,sw,sh)}
 else if(D.born!=null&&D.t>=D.born&&D.t-D.born<500){g.fillStyle='rgba(0,0,0,'+(1-(D.t-D.born)/500)+')';g.fillRect(0,0,sw,sh)}
 hud();if(D.co)coHud();drawMinimap();}
/* ====================== partida: inicio, piso siguiente, fin ====================== */
function buildFloor(keep){const fl=D.floor;th=THEMES[(fl-1)%THEMES.length];gen(fl);DGART.prep(rooms,tile,MW,MH,(fl-1)%THEMES.length,th);const R=rooms[0];E=[];PR=[];PT=[];PK=[];NUM=[];D.chests=[];D.pools=[];D.webs=[];D.fall=[];D.bw=[];D.beams=[];D.bossCard=null;D.room=null;D.boss=null;D.fade=null;placeTraps(fl);hero=mkHero(R.px,R.py,keep);if(D.co&&D.co.role==='host')coFloorHeroes(keep,R);cam={x:R.px,y:R.py};
 D.props=[];D.bolts=[];D.rings=[];D.pets=D.pets||[];
 rooms.forEach(r=>{if(r.type==='treasure'){D.chests.push({x:r.px,y:r.py-8,open:0,q:1,cards:true});const want=[];if(fl>=2&&Math.random()<.33)want.push('table');if(Math.random()<.42||D.noShop>=2){want.push('shop');D.noShop=0}else D.noShop=(D.noShop||0)+1;if(Math.random()<.3)want.push('forge');
  const cxT=r.x0+(r.w>>1),topOk=x=>tile(x,r.y0-1)===0&&tile(x-1,r.y0-1)===0&&tile(x+1,r.y0-1)===0,sl=[[(r.x0+1.8)*T,(r.y0+.95)*T],[(r.x0+r.w-1.8)*T,(r.y0+.95)*T],topOk(cxT)?[r.px,(r.y0+.95)*T]:[(r.x0+2.2)*T,(r.y0+r.h-.95)*T]].sort(()=>Math.random()-.5);
  want.forEach((k,i)=>{const px=sl[i][0],py=sl[i][1];D.props.push(k==='shop'?mkShop(px,py):{k,x:px,y:py,armed:true})})}});
 D.pets.forEach((p,i)=>{p.x=R.px+rnd(-26,26);p.y=R.py+22+i*10;p.vx=p.vy=0;if(keep)petLvl(p);if(p.down)petRevive(p,.5)});
 if(D.co)D.props=[];D.born=D.t;D.banner={t:D.t,txt:th.n+' · Piso '+fl};D.room=R;if(D.co&&D.co.role==='host')coFloorSend()}
function nextFloor(){D.floor++;D.floors=Math.max(D.floors,D.floor-1);const h=hero;buildFloor(h);hero.hp=Math.min(hero.max,hero.hp+hero.max*.3);hero.sh=hero.shMax;shake(0);if(!D.co&&!D.cheated){dropGem(hero.x,hero.y-20,2);(D.pend||[]).forEach(q=>{for(let i=0;i<q.n;i++)dropPk(q.t,hero.x,hero.y-20,q.v)});D.pend=[]}}
function dgBoost(){const b={g:0,x:0,d:0};try{['g','x','d'].forEach(t=>{const c=pref.eq[t];if(c&&pref.vc[c]>0){pref.vc[c]--;if(!pref.vc[c])delete pref.vc[c];b[t]=VK[t].v[+c.slice(1)-1]}pref.eq[t]=''});savePref()}catch(e){}return b}
function start(){if(D.on)return;try{if(!pref.dg||typeof pref.dg!=='object')pref.dg={best:0,runs:0,kills:0}}catch(e){}
 const sf0=chosenStart();Object.assign(D,{on:true,t:0,born:-1e9,fade:null,paused:false,over:false,floor:sf0,startFl:sf0,floors:sf0-1,cleared:0,kills:0,bosses:0,coinsT:0,souls:0,gemsC:0,pend:[],loot:[],deadShown:false,frz:0,shk:0,bs:dgBoost(),dying:0,noShop:0,pets:[],props:[],bolts:[],rings:[],god:false,cheated:false,pouch:[],rep:[],forfeit:false,diff:(pref.dg&&pref.dg.diff!=null)?pref.dg.diff:1});
 try{fdSync()}catch(e){}buildFloor(null);applyLoadout();try{if(pref.fd&&pref.fd.pet&&!pref.fd.petOff)addPet('phoenix')}catch(e){}try{if(fdOn('pet'))addPet('firefly')}catch(e){}try{const L=DI();if(L.petSel&&L.pets.includes(L.petSel)&&PET[L.petSel])addPet(L.petSel)}catch(e){}lastN=performance.now();
 $('menu').style.display='none';$('stage').classList.add('dgm');$('dgui').style.display='block';hudC={};
 const first=!pref.dg.runs;pref.dg.runs++;savePref();if(sf0>1)setTimeout(()=>{if(D.on)toast('🏁 Empiezas en el piso '+sf0)},500);
 const tips=['🕹️ Mueve con el joystick · ⚔️ ataca (apunta solo) · 🌀 esquiva','🚪 Las puertas se cierran hasta limpiar la sala','🎁 Busca el cofre ★ y derrota al jefe ☠','🛒 A veces hay tienda o mesa 🔮 en la sala ★','🏁 Cada 10 pisos hay un punto de salida: sal con tu botín o arriesga todo','⚠️ Hay trampas en pasillos y salas: míralas antes de pisar'];tips.forEach((tx,i)=>setTimeout(()=>{if(D.on)toast(tx)},900+i*2100));
 if(D.bs.g||D.bs.x||D.bs.d)setTimeout(()=>toast('🎟️ Vales activos: '+(D.bs.g?'🪙+'+D.bs.g+'% ':'')+(D.bs.x?'⭐+'+D.bs.x+'% ':'')+(D.bs.d?'💎+'+D.bs.d+'%':'')),600)}
function results(title,dead){D.over=true;restoreFx();try{D.pets.forEach(p=>{if(!p.tmp&&p.k!=='phoenix'&&p.k!=='firefly')unlockPet(p.k)})}catch(e){}if(dead&&DG_LOSE&&!D.cheated)deathLoss();else saveLoadout();try{fdSync()}catch(e){}const sc=Math.round((D.kills*10+D.cleared*50+D.coinsT)*(1+(D.bs.x||0)/100));let dm=D.co?Math.floor(D.cleared/2)+D.bosses*2+Math.max(0,D.floor-(D.startFl||1))*2:(D.gemsC|0);dm=Math.round(dm*(1+(D.bs.d||0)/100)*dfx().rw);
 let so=0;if(!D.cheated&&D.souls>0){so=D.souls;try{DI().souls+=so;savePref()}catch(e){}}
 if(D.cheated)dm=0;else try{pref.dg.best=Math.max(pref.dg.best||0,D.floor);pref.dg.kills=(pref.dg.kills||0)+D.kills;savePref();if(dm>0)gain(dm,1)}catch(e){}
 const box=$('dgp');let loot='';D.loot.forEach(c=>{loot+='<div>🎟️ '+vname(c)+'</div>'});
 box.innerHTML='<div class="tpb dgc"><h3>'+title+'</h3><div class="dgr"><div>🏰 Piso alcanzado: <b>'+D.floor+'</b> (récord '+pref.dg.best+')</div><div>🚪 Salas limpias: <b>'+D.cleared+'</b></div><div>☠️ Enemigos: <b>'+D.kills+'</b></div><div>🪙 Monedas: <b>'+D.coinsT+'</b></div><div>⭐ Puntos: <b>'+sc+'</b></div>'+(D.rep||[]).map(x=>'<div>'+x+'</div>').join('')+(D.cheated?'<div>🔐 Partida con comandos: sin recompensas</div>':'<div class="dgm2">💎 +'+dm+'</div>')+(so?'<div class="dgm2" style="color:#c9b8ff">✨ +'+so+' Esencia de alma (total '+DI().souls+')</div>':'')+loot+'</div><button class="b" id="dgagain">⚔️ Otra vez</button><button class="b" id="dgmenu">🏠 Menú</button></div>';box.style.display='flex';try{fdResultsHook(box)}catch(e){}
 $('dgagain').onclick=()=>{box.style.display='none';leave(true)};$('dgmenu').onclick=()=>{box.style.display='none';leave(false)}}
function leave(again){D.hub=false;window.TKLIFE=false;D.on=false;D.paused=false;$('stage').classList.remove('dgm');$('dgui').style.display='none';$('rev').style.display='none';try{last=performance.now()}catch(e){}$('menu').style.display='flex';try{setMenu()}catch(e){}if(again)setTimeout(openLoadout,50)}
function onDeath(){window.TKLIFE=true;let L=[];try{L=revList()}catch(e){}
 if(!L.length){results('💀 Has caído',1);return}
 D.over=true;const b=$('revb');b.innerHTML='';const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x)e.textContent=x;return e};
 b.append(mk('div','','Un vale de revivir te devuelve vida (el % indicado) y escudo completo.'));rvc.length=0;const row=mk('div','vg');
 L.forEach(c=>{const i=+c.slice(1)-1,d=mk('div','vt'+(i===8?' sec':''));d.style.borderColor=TIERS[i][1];d.append(tkCard('r',i,rvc),mk('div','vf',(i===8?'Secreto · vida 100%':TIERS[i][0]+' · vida '+VK.r.v[i]+'%')+' · x'+pref.vc[c]));
  d.onclick=()=>{window.TKLIFE=false;pref.vc[c]--;if(!pref.vc[c])delete pref.vc[c];savePref();const h=hero;h.dead=false;h.hp=Math.max(10,h.max*VK.r.v[i]/100);h.sh=h.shMax;h.inv=D.t+2500;h.vx=h.vy=0;D.over=false;D.deadShown=false;$('rev').style.display='none';
   for(const e of E){const a=Math.atan2(e.y-h.y,e.x-h.x);e.vx+=Math.cos(a)*9/e.m;e.vy+=Math.sin(a)*9/e.m}shake(10);sparks(h.x,h.y-16,'#ffd84a',24,6);dust(h.x,h.y,14,'#ffe27a');if(i===8){healHero(h.max);for(let k=0;k<3;k++)dropCoin(h.x,h.y)}toast('🎫 ¡Reviviste!');D.lastT=performance.now();lastN=performance.now()};row.append(d)});
 b.append(row);const no=mk('button','b','Terminar partida');no.style.cssText='display:block;width:100%;margin-top:10px;background:#6a2a2a';no.onclick=()=>{window.TKLIFE=false;$('rev').style.display='none';results('💀 Has caído',1)};b.append(no);$('rev').style.display='flex';requestAnimationFrame(rvLoop)}
function pause(){if(D.co&&D.on&&!D.over){coPause();return}if(!D.on||D.over||hero.dead)return;if(D.hub){pauseHub();return}D.paused=true;const box=$('dgp');box.innerHTML='<div class="tpb dgc"><h3>⏸️ Pausa</h3>'+eqPanel()+'<button class="b" id="dgres">▶ Continuar</button><button class="b" id="dgcmd" style="background:#2a3a5a">🔐 Comandos</button><button class="b" id="dgquit" style="background:#6a2a2a">🚪 Salir de la mazmorra</button></div>';box.style.display='flex';
 $('dgres').onclick=resume;$('dgcmd').onclick=()=>{try{openCmd()}catch(e){}};$('dgquit').onclick=()=>{if(D.cheated||!DG_LOSE){box.style.display='none';results('🚪 Saliste de la mazmorra');return}
  box.innerHTML='<div class="tpb dgc"><h3>⚠️ ¿Abandonar la mazmorra?</h3><p class="dgq">Solo puedes salir con todo en los <b>puntos de salida</b> (cada 10 pisos). Si abandonas ahora perderás tu equipo y tu botín, igual que si murieras. Las armas de Fundador no se pierden: se sellan 10 min.</p><button class="b" id="dgab" style="background:#6a2a2a">🚪 Abandonar</button><button class="b" id="dgbk">↩️ Volver</button></div>';
  $('dgab').onclick=()=>{box.style.display='none';results('🏃 Abandonaste la mazmorra',1)};$('dgbk').onclick=()=>{D.paused=false;pause()}}}
function resume(){$('dgp').style.display='none';D.paused=false;lastN=performance.now()}
/* ====================== entrada y HUD ====================== */
function buildUI(){const st=$('stage');if($('dgui'))return;
 const css=document.createElement('style');css.textContent=`
 .dgm #ui,.dgm #tut,.dgm #invw,.dgm #inv{display:none!important}
 #dgui{position:absolute;inset:0;display:none;pointer-events:none;z-index:12;font-family:'Trebuchet MS',sans-serif;color:#fff;user-select:none;-webkit-user-select:none;touch-action:none}
 #dgui button{pointer-events:auto;touch-action:none}
 #dgtl{position:absolute;left:calc(10px + env(safe-area-inset-left,0px));top:calc(8px + env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:5px;text-shadow:0 2px 0 #000}
 #dghp{display:flex;gap:3px}.dgh{display:block;width:20px;height:18px;background:#3a1a22;border:2px solid #161622;border-radius:6px;overflow:hidden}.dgh b{display:block;height:100%;background:linear-gradient(#ff7a8a,#d8274a)}
 #dgsh{display:flex;gap:3px}.dgs{display:block;width:20px;height:9px;background:#1c2a3a;border:2px solid #161622;border-radius:5px}.dgs.on{background:linear-gradient(#bff0ff,#3a9aff)}
 #dgco,#dgfl{font:900 13px 'Trebuchet MS',sans-serif}#dgfl{color:#cfe;font-size:11px}
 #dgtr{position:absolute;right:calc(10px + env(safe-area-inset-right,0px));top:calc(8px + env(safe-area-inset-top,0px));display:flex;gap:8px;align-items:flex-start}
 #dgmm{width:96px;height:96px;background:rgba(0,0,0,.45);border:2px solid #161622;border-radius:10px}
 #dgpb{width:40px;height:40px;border-radius:12px;background:#2c2c44;border:3px solid #161622;color:#fff;font-size:18px}
 #dgboss{display:none;position:absolute;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(320px,46vw);height:14px;background:#2a1010;border:3px solid #161622;border-radius:9px;overflow:hidden}#dgboss i{display:block;height:100%;background:linear-gradient(#ff9a5a,#d8321a);transition:width .12s}
 #dgjz{position:absolute;left:0;bottom:0;width:52%;height:78%;pointer-events:auto;touch-action:none}
 #dgjb{position:absolute;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;background:rgba(255,255,255,.1);border:3px solid rgba(255,255,255,.35);display:none;pointer-events:none}#dgjk{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid rgba(0,0,0,.4)}
 #dgjh{position:absolute;left:calc(26px + env(safe-area-inset-left,0px));bottom:calc(34px + env(safe-area-inset-bottom,0px));width:96px;height:96px;border-radius:50%;border:3px dashed rgba(255,255,255,.22);pointer-events:none}
 .dgbt{position:absolute;border-radius:50%;border:4px solid #161622;border-bottom-width:7px;color:#fff;font-size:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px #0007}
 #dgatk{right:calc(20px + env(safe-area-inset-right,0px));bottom:calc(26px + env(safe-area-inset-bottom,0px));width:92px;height:92px;background:radial-gradient(#ff8a5a,#c8321a);font-size:40px}
 #dgdash{right:calc(124px + env(safe-area-inset-right,0px));bottom:calc(30px + env(safe-area-inset-bottom,0px));width:64px;height:64px;background:linear-gradient(to top,#2a3a5a var(--cd,0%),#4a7ad8 var(--cd,0%));font-size:26px}
 #dgsw{right:calc(36px + env(safe-area-inset-right,0px));bottom:calc(132px + env(safe-area-inset-bottom,0px));width:54px;height:54px;background:#5a4a8a;font-size:22px}
 #dgp{position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.66);display:none;align-items:center;justify-content:center;padding:12px}
 .dgc{width:min(440px,100%)!important}.dgc .b{display:block;width:100%;margin-top:8px;padding:10px;font-size:15px}
 .dgcg{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px;margin-top:6px}.dgcard{background:linear-gradient(#34542a,#223a1c);border:3px solid #e0a020;border-radius:12px;padding:8px 5px;color:#fff;text-align:center;font-family:'Trebuchet MS',sans-serif;cursor:pointer;display:flex;flex-direction:column;gap:3px;align-items:center}.dgcard i{font-style:normal;font-size:34px}.dgcard b{font-size:13px}.dgcard small{font-size:10px;color:#ffe48a;line-height:1.25}.dgcard em{font-style:normal;font-size:9px;background:#e0a020;color:#222;font-weight:bold;border-radius:6px;padding:0 6px}.dgcard:active{transform:scale(.96)}
 .dgr{display:flex;flex-direction:column;gap:3px;font-size:14px;margin:6px 0}.dgm2{font:900 24px Georgia,serif;color:#7be0ff;text-align:center;margin-top:6px}
 .dgc{max-height:92vh;overflow:auto}.dgeqp{max-height:44vh;overflow:auto;margin-bottom:4px}
 .dgi{display:flex;gap:10px;align-items:center;text-align:left}.dgi>i{font-style:normal;font-size:34px;flex:none}.dgi>div{display:flex;flex-direction:column;gap:1px}.dgi b{font-size:14px}.dgi small{font-size:11px;color:#cfe0f0;line-height:1.25}
 .dgit{background:rgba(0,0,0,.35);border:3px solid #cfd8dc;border-radius:12px;padding:7px 10px;margin:6px 0}.dgold{opacity:.8;filter:saturate(.7)}
 .dgq{font-size:13px;margin:8px 0 4px;text-align:center;line-height:1.35}.dgg{font:900 20px Georgia,serif;color:#ffd84a;text-align:center}
 .dgsl{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dgslb{background:linear-gradient(#34406a,#232c4a);border:3px solid #7a8ad8;border-radius:12px;color:#fff;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:inherit;cursor:pointer}.dgslb i{font-style:normal;font-size:30px}.dgslb b{font-size:12px}.dgslb small{font-size:10px;color:#aab}.dgslb:active{transform:scale(.97)}
 .dgar{text-align:center;font-size:22px}.dgel{text-align:left}
 #dgws{position:absolute;right:calc(96px + env(safe-area-inset-right,0px));bottom:calc(142px + env(safe-area-inset-bottom,0px));display:flex;gap:5px}.dgws{width:34px;height:34px;border:3px solid #161622;border-radius:9px;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-size:18px;position:relative;opacity:.6}.dgws.on{opacity:1;box-shadow:0 0 0 2px #fff8}.dgws u{position:absolute;right:-4px;bottom:-5px;font-size:11px;text-decoration:none}
 #dgeq{display:flex;gap:3px;flex-wrap:wrap;max-width:150px}.dgeqs{width:24px;height:24px;border:2px solid #161622;border-radius:7px;background:rgba(0,0,0,.45);font-size:14px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}.dgpet b{position:absolute;left:0;bottom:0;height:3px;background:#7be07b}.dgpet.dn{opacity:.4}
 .dgsg{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:6px;max-height:54vh;overflow:auto}.dgsi{background:linear-gradient(#3a3050,#262036);border:3px solid #cfd8dc;border-radius:12px;color:#fff;padding:7px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;text-align:center;font-family:inherit;cursor:pointer}.dgsi i{font-style:normal;font-size:30px}.dgsi b{font-size:12px}.dgsi small{font-size:10px;color:#cfe0f0;line-height:1.2}.dgsi em{font-style:normal;font:900 13px Georgia,serif;color:#ffd84a}.dgsi.no{opacity:.55}.dgsi.sold{opacity:.3;pointer-events:none}.dgsi:active{transform:scale(.97)}
 #dgl{position:absolute;inset:0;z-index:60;display:none;flex-direction:column;background:radial-gradient(ellipse at 30% 15%,#2a2f55,#0d0f20);color:#fff;font-family:'Trebuchet MS',sans-serif;padding:calc(6px + env(safe-area-inset-top,0px)) 10px calc(8px + env(safe-area-inset-bottom,0px));box-sizing:border-box;gap:6px}
 .ldh{display:flex;justify-content:space-between;align-items:center;font:900 16px Georgia,serif}.ldx{background:#6a2a2a;border:2px solid #161622;color:#fff;border-radius:10px;padding:4px 12px;font-weight:900;font-family:inherit}
 .ldb{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}.ldb.one{grid-template-columns:minmax(0,640px);justify-content:center;overflow:auto;align-content:start}.ldeqs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:4px}
 @media (max-aspect-ratio:1/1){.ldb{grid-template-columns:1fr;grid-auto-rows:min-content;overflow:auto}}
 .ldl,.ldr{background:rgba(0,0,0,.28);border:2px solid #3a4272;border-radius:14px;padding:8px;display:flex;flex-direction:column;gap:6px;min-height:0;overflow:auto}
 .ldeq{display:grid;grid-template-columns:62px 1fr 62px;grid-template-rows:repeat(3,64px);gap:6px;align-items:center;justify-items:center}
 #ldc{width:150px;height:200px;grid-column:2;grid-row:1/4}
 .lds{width:60px;height:60px;border:3px solid #4a5280;border-radius:12px;background:linear-gradient(#2c3258,#1a1e38);color:#fff;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0}.lds small{font-size:8px;color:#9aa4d8;position:absolute;top:1px}.lds i{font-style:normal;font-size:26px;margin-top:8px}.lds u{position:absolute;right:1px;bottom:0;text-decoration:none;font-size:12px}.lds.sel,.ldc.sel{box-shadow:0 0 0 3px #fff,0 0 12px #fff8}
 .ldhd{display:flex;justify-content:space-between;font-size:13px}.ldbg{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.ldc{aspect-ratio:1;border:3px solid #4a5280;border-radius:10px;background:linear-gradient(#262b4c,#171a30);color:#fff;font-size:19px;position:relative;padding:0;display:flex;align-items:center;justify-content:center}.ldc.e{border-style:dashed;border-color:#2f3560;background:rgba(0,0,0,.2)}.ldc u{position:absolute;right:1px;bottom:-1px;font-size:11px;text-decoration:none}
 .ldrw{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.ldrn{display:inline-flex;align-items:center;gap:2px;border:2px solid;border-radius:8px;padding:0 5px;font-size:13px;background:rgba(0,0,0,.4)}.ldrn b{font-size:11px}
 .ldbt{display:grid;grid-template-columns:1fr 1fr;gap:6px}#dgl .ldbt .b{margin:0;padding:8px;font-size:13px}.ldhint{color:#9aa4d8}.lddt .dgit{margin:2px 0 6px}.ldgo{width:100%;padding:11px;font-size:16px}
 .dgres{text-align:center;font:900 17px Georgia,serif;margin:6px 0;padding:8px;border-radius:10px}.dgres.ok{background:rgba(80,200,90,.25);color:#b8ffb8}.dgres.no{background:rgba(220,80,60,.22);color:#ffb0a0}
 .wic{display:inline-block;vertical-align:middle;object-fit:contain;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.65))}.lds i,.dgi>i,.ldc,.dgws,#dgatk{line-height:0}.ldc .wic{width:92%;height:92%}.dgws .wic{vertical-align:top}
 .ldtabs{display:flex;gap:4px}.ldtab{flex:1;padding:6px 2px;border:2px solid #3a4272;border-radius:10px;background:rgba(0,0,0,.3);color:#cfd6ff;font:bold 12px sans-serif}.ldtab.on{background:#3a4a9a;border-color:#8ea0ff;color:#fff}
 .ldbg{max-height:max(150px,30vh);overflow-y:auto;align-content:start;padding:2px}
 .rnr{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin:3px 0}.rne{width:74px;font-size:12px;display:flex;align-items:center;gap:4px}.rne small{color:#cfd6ff}.rnr .ldrn{min-width:42px;justify-content:center}.rnr .ldrn.z{opacity:.3}
 .fdg{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}.fds{border:3px solid #ffe27a;border-radius:10px;background:linear-gradient(#3a3320,#1d1a10);color:#fff;padding:2px 1px 3px;display:flex;flex-direction:column;align-items:center;gap:0;font-size:9px;line-height:1.15;min-height:64px}.fds.off{filter:grayscale(.8);opacity:.6;border-color:#6a6048}.fds.sel{box-shadow:0 0 0 3px #fff,0 0 12px #fff8}.fds em{font-style:normal;color:#ffe27a;font-size:9px}
  #dgboss b{position:absolute;inset:0;text-align:center;font:900 10px/14px Georgia,serif;color:#fff;text-shadow:0 1px 2px #000;pointer-events:none}
 #dgdf .tpb{max-height:96%;overflow:auto}.dgsf{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:4px 0 8px;max-height:74px;overflow:auto}.dgsfb{padding:5px 10px;border:2px solid #5a6a9a;border-radius:9px;background:rgba(0,0,0,.35);color:#fff;font:bold 12px Trebuchet MS,sans-serif}.dgsfb.on{background:#3a4a9a;border-color:#ffd84a}
 #dgdf{position:absolute;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.62)}
 .ptg{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin:4px 0}.ptc{border:3px solid #4a5280;border-radius:10px;background:linear-gradient(#262b4c,#171a30);color:#fff;padding:6px;text-align:center;display:flex;flex-direction:column;gap:2px;font:12px Trebuchet MS,sans-serif}.ptc.on{border-color:#7be07b}.ptc i{font-style:normal;font-size:26px;line-height:0;height:64px;display:flex;align-items:center;justify-content:center}.ptc small{color:#cfd6ff;font-size:10px}.ptc em{font-style:normal;color:#ffe27a;font-size:11px}
 .mcb.dun{background:#d9d0f0}`;document.head.append(css);
 const ui=document.createElement('div');ui.id='dgui';ui.innerHTML=`<div id="dgjz"></div><div id="dgjh"></div><div id="dgjb"><div id="dgjk"></div></div>
 <div id="dgtl"><div id="dghp"></div><div id="dgsh"></div><div id="dgco"></div><div id="dgfl"></div><div id="dgeq"></div></div>
 <div id="dgtr"><canvas id="dgmm" width="96" height="96"></canvas><button id="dgpb">☰</button></div><div id="dgboss"><i></i><b></b></div>
 <div id="dgws"></div><button class="dgbt" id="dgsw">🔄</button><button class="dgbt" id="dgdash">🌀</button><button class="dgbt" id="dgatk">🗡️</button>`;st.append(ui);
 const pb=document.createElement('div');pb.id='dgp';st.append(pb);
 // joystick flotante
 const jz=$('dgjz'),jb=$('dgjb'),jk=$('dgjk');
 jz.addEventListener('pointerdown',e=>{e.preventDefault();joy.id=e.pointerId;jz.setPointerCapture(e.pointerId);const r=st.getBoundingClientRect();joy.bx=e.clientX;joy.by=e.clientY;jb.style.display='block';jb.style.left=(e.clientX-r.left)+'px';jb.style.top=(e.clientY-r.top)+'px';jk.style.transform='';joy.x=joy.y=0;$('dgjh').style.display='none'});
 jz.addEventListener('pointermove',e=>{if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.bx,dy=e.clientY-joy.by;const d=Math.hypot(dx,dy),m=48;if(d>m){dx*=m/d;dy*=m/d}joy.x=dx/m;joy.y=dy/m;if(Math.hypot(joy.x,joy.y)<.12){joy.x=joy.y=0}jk.style.transform='translate('+dx+'px,'+dy+'px)'});
 const jend=e=>{if(e.pointerId!==joy.id)return;joy.id=null;joy.x=joy.y=0;jb.style.display='none';$('dgjh').style.display=''};jz.addEventListener('pointerup',jend);jz.addEventListener('pointercancel',jend);
 const a=$('dgatk');a.addEventListener('pointerdown',e=>{e.preventDefault();inp.atk=1;a.setPointerCapture(e.pointerId)});['pointerup','pointercancel'].forEach(v=>a.addEventListener(v,()=>{inp.atk=0}));
 $('dgdash').addEventListener('pointerdown',e=>{e.preventDefault();dash()});$('dgsw').addEventListener('pointerdown',e=>{e.preventDefault();swapWeapon()});$('dgpb').addEventListener('pointerdown',e=>{e.preventDefault();pause()});
 window.addEventListener('keydown',e=>{if(!D.on)return;const k=e.key.toLowerCase();if(e.target&&e.target.matches&&e.target.matches('input'))return;if(D.fg){e.preventDefault();e.stopImmediatePropagation();if(k===' '||k==='enter')D.fg.tap();return}keys[k]=true;if(k==='shift'||k==='k')dash();if(k==='q')swapWeapon();if(k==='escape'||k==='p'){D.paused?resume():pause()}if([' ','arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','j','k','q','shift'].includes(k)){e.preventDefault();e.stopImmediatePropagation()}},true);
 window.addEventListener('keyup',e=>{if(!D.on)return;keys[e.key.toLowerCase()]=false},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&D.on&&!D.over&&!D.paused&&!(hero&&hero.dead))pause()})}
/* ====================== integración con el menú y el botón Atrás ====================== */
function mountMenu(){const m=$('modes');if(!m||$('mc-dun'))return;const d=document.createElement('div');d.className='mc';d.id='mc-dun';d.innerHTML='<button class="mcb dun" id="dgbtn"><span class="mci">🗝️</span><b>Mazmorra</b><small>Salas con barreras, jefes y cofres. ¡Esquiva y ataca!</small><em id="mn-dun"></em></button><a id="dgmode" style="display:block;text-align:center;font-size:12px;color:#fff;text-decoration:underline;margin-top:4px;cursor:pointer"></a>';m.insertBefore(d,$('mc-lan'));$('dgbtn').onclick=()=>dgEnter();const mt=$('dgmode');if(mt)mt.onclick=()=>{if(!pref.dg||typeof pref.dg!=='object')pref.dg={best:0,runs:0,kills:0};pref.dg.hub=pref.dg.hub===false;try{savePref()}catch(e){}dgModeTxt()};dgModeTxt()}
const sm0=window.setMenu;window.setMenu=function(){sm0.apply(this,arguments);const d=$('mc-dun');if(d){d.style.display=paused()?'none':'';const e=$('mn-dun');if(e)e.textContent=pref.dg&&pref.dg.best?'Récord: piso '+pref.dg.best:'';dgModeTxt()}};
const ob0=window.onBack;window.onBack=function(){const ps=$('dgps');if(D.on&&ps&&ps.style.display==='flex'){closePetShop();return true}const cm=$('cmd');if(D.on&&cm&&cm.style.display==='flex'){closeCmd();return true}const lo=$('dgl');if(lo&&lo.style.display==='flex'){closeLoadout();return true}if(D.on){if($('rev').style.display==='flex'||(D.over&&!D.paused))return true;if(D.paused){if($('dgp').querySelector('#dgres'))resume();return true}pause();return true}return ob0?ob0.apply(this,arguments):false};
buildUI();mountMenu();try{setMenu()}catch(e){}
/* ====================== sala del héroe (antes de la mazmorra) ====================== */
const STORE_CAP=60,ICIMG={};
function unlockPet(k){const L=DI();if(PET[k]&&!PET[k].fd&&!L.pets.includes(k))L.pets.push(k)}
function dgEnter(){if(pref.dg&&pref.dg.hub===false)openLoadout();else enterHub()}
function dgModeTxt(){const e=$('dgmode');if(e)e.textContent='Entrada: '+((pref.dg&&pref.dg.hub===false)?'📋 Menú clásico':'🏠 Sala previa')+' · cambiar'}
function enterHub(){if(D.on)return;try{fdSync()}catch(e){}if(!pref.dg||typeof pref.dg!=='object')pref.dg={best:0,runs:0,kills:0};
 Object.assign(D,{on:true,hub:true,t:0,born:-1e9,fade:null,paused:false,over:false,floor:1,floors:0,cleared:0,kills:0,bosses:0,coinsT:0,loot:[],deadShown:false,frz:0,shk:0,bs:{g:0,x:0,d:0},dying:0,noShop:0,pets:[],props:[],bolts:[],rings:[],god:false,cheated:false,pouch:[],rep:[],forfeit:false,diff:(pref.dg.diff!=null)?pref.dg.diff:1});
 buildHub();lastN=performance.now();$('menu').style.display='none';$('stage').classList.add('dgm');$('dgui').style.display='block';hudC={};
 setTimeout(()=>{if(D.on&&D.hub)toast('🏠 Acércate a una estación de la pared para abrirla y cruza la puerta del fondo para entrar')},700)}
function buildHub(){MW=48;MH=48;map=new Uint8Array(MW*MH);doors=[];const X0=16,Y0=26,W=17,H=11,HX=22,HW=3,HY0=12;
 for(let y=Y0;y<Y0+H;y++)for(let x=X0;x<X0+W;x++)map[y*MW+x]=1;
 for(let y=HY0;y<Y0;y++)for(let x=HX;x<HX+HW;x++)map[y*MW+x]=1;
 const R={x0:X0,y0:Y0,w:W,h:H,cx:X0+(W>>1),cy:Y0+(H>>1),px:(X0+W/2)*T,py:(Y0+H/2)*T,type:'hub',state:'done',visited:1,doors:[],wave:0,waves:0};
 rooms=[R];th=THEMES[0];DGART.prep(rooms,tile,MW,MH,0,th);
 E=[];PR=[];PT=[];PK=[];NUM=[];D.chests=[];D.pools=[];D.webs=[];D.fall=[];D.bw=[];D.beams=[];D.bossCard=null;D.traps=[];D.boss=null;D.fade=null;D.props=[];D.bolts=[];D.rings=[];D.pets=[];
 hero=mkHero(R.px,(Y0+H-2.2)*T,null);applyLoadout();cam={x:hero.x,y:hero.y};
 const st=(act,tx,ic,lb,col)=>D.props.push({k:'st',act,x:(X0+tx)*T,y:(Y0+.95)*T,ic,lb,col,armed:true});
 st('weapons',2.2,'⚔️','Armería','#7a5a3a');st('armor',4.4,'🛡️','Armadura','#4a5f8a');st('petshop',6.6,'🔮','Cristal de invocación','#5a3aa8');st('pets',10.8,'🐾','Mascotas','#5a7a4a');st('store',13,'📦','Almacén','#7a6a3a');st('menu',15.2,'📋','Menú','#5a4a7a');
 PK.push({t:'portal',x:(HX+HW/2)*T,y:(HY0+1.15)*T,wy:HY0*T,door:1,hub:1,vx:0,vy:0,z:0,vz:0,l:0,permanent:1});
 D.banner={t:D.t,txt:'Sala del héroe'};D.room=R;try{hubPets()}catch(e){}}
function hubPets(){const L=DI(),want=[];if(pref.fd&&pref.fd.pet&&!pref.fd.petOff)want.push('phoenix');if(fdOn('pet'))want.push('firefly');if(L.petSel&&L.pets.includes(L.petSel)&&PET[L.petSel])want.push(L.petSel);D.pets=D.pets.filter(p=>p.tmp||want.includes(p.k));want.forEach(k=>{if(!D.pets.some(p=>p.k===k))addPet(k)})}
/* ---- 🔮 Cristal de invocación (sala del héroe): invoca una mascota nueva con ✨ Esencia de alma ---- */
let PSRAF=0;
function closePetShop(){cancelAnimationFrame(PSRAF);PSRAF=0;const o=$('dgps');if(o)o.style.display='none';if(D.hub&&D.on){D.paused=false;lastN=performance.now()}}
function openPetShop(){let o=$('dgps');if(!o){o=document.createElement('div');o.id='dgps';o.style.cssText='position:absolute;inset:0;z-index:85;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.72)';$('stage').append(o)}
 cancelAnimationFrame(PSRAF);const L=DI(),left=Object.keys(PET).filter(k=>!PET[k].fd&&!L.pets.includes(k)),tot=Object.keys(PET).filter(k=>!PET[k].fd).length,ok=L.souls>=SOUL_PET&&left.length>0;
 let h='<div class="tpb" style="max-height:94%;overflow:auto;width:min(94%,440px);text-align:center"><h3>🔮 Cristal de invocación</h3><div style="font-size:64px;line-height:1.1;filter:drop-shadow(0 0 14px #b9a6ff)">🔮</div><p class="dgq">Ofrece <b>'+SOUL_PET+' ✨ Esencia de alma</b> al cristal para invocar una mascota que aún no tengas. La esencia solo cae en la mazmorra: de los jefes y de los cofres del tesoro y del jefe.</p><div class="dgm2" style="color:#c9b8ff;margin:4px 0">✨ '+L.souls+' Esencia de alma</div><small class="ldhint">Mascotas: '+(tot-left.length)+' / '+tot+'</small>';
 h+=left.length?'<button class="b" id="dgpsi" style="width:100%;margin-top:8px;'+(ok?'background:#5a3aa8':'opacity:.55')+'">'+(ok?'✨ Invocar · '+SOUL_PET+' ✨':'Faltan '+(SOUL_PET-L.souls)+' ✨')+'</button>':'<p class="dgq">🎉 ¡Ya tienes todas las mascotas!</p>';
 h+='<button class="b" id="dgpsx" style="width:100%;margin-top:8px">Cerrar</button></div>';o.innerHTML=h;o.style.display='flex';
 $('dgpsx').onclick=closePetShop;
 const bi=$('dgpsi');if(bi)bi.onclick=()=>{const L2=DI(),lf=Object.keys(PET).filter(k=>!PET[k].fd&&!L2.pets.includes(k));if(!lf.length||L2.souls<SOUL_PET){toast('✨ Faltan '+Math.max(0,SOUL_PET-L2.souls)+' Esencia de alma');return}
  const k=lf[Math.floor(Math.random()*lf.length)];L2.souls-=SOUL_PET;unlockPet(k);try{savePref()}catch(e){}summonAnim(o,k)}}
function summonAnim(o,k){cancelAnimationFrame(PSRAF);sfx('upgrade');
 o.innerHTML='<canvas id="dgpsc" style="position:absolute;inset:0;width:100%;height:100%"></canvas><button class="b" id="dgpsok" style="position:absolute;left:50%;bottom:7%;transform:translateX(-50%);display:none;min-width:170px">✅ Aceptar</button><div id="dgpsh" style="position:absolute;left:0;right:0;top:3%;text-align:center;color:#c9b8ff;font:12px Trebuchet MS,sans-serif;opacity:.8">Toca para saltar la animación</div>';
 const cv=$('dgpsc'),dpr=Math.min(2,window.devicePixelRatio||1),W=Math.max(2,o.clientWidth),H=Math.max(2,o.clientHeight);cv.width=W*dpr;cv.height=H*dpr;const c=cv.getContext('2d'),d=PET[k],U=Math.min(W,H)/520;
 let img=null;try{const u=DGART.petIcon(k,200,1.5);if(u){img=new Image();img.src=u}}catch(e){}
 const rnd2=(a,b)=>a+Math.random()*(b-a),ease=x=>x<0?0:x>1?1:x*x*(3-2*x),back=x=>{x=Math.max(0,Math.min(1,x));const s=1.7;return 1+(s+1)*Math.pow(x-1,3)+s*Math.pow(x-1,2)};
 const orb=[];for(let i=0;i<70;i++)orb.push({a:rnd2(0,6.28),r:rnd2(150,330),s:rnd2(.8,2),z:rnd2(1.5,4),ph:rnd2(0,1)});
 const shards=[];for(let i=0;i<40;i++){const a=rnd2(0,6.28),v=rnd2(120,420);shards.push({a,v,z:rnd2(2,7),rot:rnd2(0,6.28)})}
 const RU='ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ';let t0=performance.now(),skip=0,shown=0,revealed=0,done=0;
 const FL=3.1,REV=3.35;
 const pal={a:'#b9a6ff',b:'#7fe9ff'};
 function frame(now){if(done)return;PSRAF=requestAnimationFrame(frame);let el=(now-t0)/1000+skip;
  if(el>REV&&!revealed){revealed=1;sfx('win');const h=$('dgpsh');if(h)h.style.display='none'}
  if(el>REV+1.1&&!shown){shown=1;$('dgpsok').style.display='block'}
  let zoom;if(el<1.2)zoom=1+.6*ease(el/1.2);else if(el<FL-.3)zoom=1.6+.9*ease((el-1.2)/(FL-1.5));else if(el<REV)zoom=2.5+.9*ease((el-(FL-.3))/(REV-FL+.3));else zoom=3.4-2.1*ease((el-REV)/1.0);
  const ch=ease((el-1.2)/(FL-1.2));let sx=0,sy=0;if(el>1.2&&el<REV){const m=ch*7;sx=rnd2(-m,m);sy=rnd2(-m,m)}
  c.setTransform(dpr,0,0,dpr,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=1;
  const bg=c.createRadialGradient(W/2,H/2,10,W/2,H/2,Math.max(W,H)*.75);bg.addColorStop(0,revealed?'#3b2a6e':'#2a1b54');bg.addColorStop(1,'#07040f');c.fillStyle=bg;c.fillRect(0,0,W,H);
  c.save();c.translate(W/2+sx,H*.48+sy);const sc=zoom*U;c.scale(sc,sc);
  const fade=Math.min(1,el/.6),post=el>REV?1-ease((el-REV)/.5):1;
  /* círculo mágico */
  c.save();c.globalAlpha=.85*fade;c.lineWidth=2.2;c.strokeStyle=pal.a;
  for(const[R,dir,n]of[[210,1,12],[160,-1,8]]){c.save();c.rotate(el*.5*dir*(1+ch*2));c.beginPath();c.arc(0,0,R,0,6.283);c.stroke();c.beginPath();c.arc(0,0,R-14,0,6.283);c.stroke();c.fillStyle=pal.b;c.font='bold 22px serif';c.textAlign='center';c.textBaseline='middle';for(let i=0;i<n;i++){c.save();c.rotate(i/n*6.283);c.translate(0,-R+7);c.fillText(RU[i%RU.length],0,0);c.restore()}c.restore()}
  c.restore();
  /* partículas en espiral hacia el cristal */
  c.save();c.globalCompositeOperation='lighter';
  if(el<REV)for(const p of orb){const prog=((el*.45+p.ph)%1),r=p.r*(1-prog*(.55+ch*.4)),a=p.a+el*(1.4+ch*3)+prog*3;c.globalAlpha=Math.min(1,fade)*(1-prog)*.9;c.fillStyle=p.ph>.5?pal.a:pal.b;c.beginPath();c.arc(Math.cos(a)*r,Math.sin(a)*r*.8,p.z*(1+ch),0,6.283);c.fill()}
  c.restore();
  if(el<REV){ /* cristal */
   const bob=Math.sin(el*2.2)*8,pul=1+Math.sin(el*(4+ch*14))*(.03+ch*.06),gl=c.createRadialGradient(0,bob,10,0,bob,170*(1+ch*.6));gl.addColorStop(0,'rgba(185,166,255,'+(.55+ch*.4)+')');gl.addColorStop(1,'rgba(185,166,255,0)');c.fillStyle=gl;c.fillRect(-260,-260,520,520);
   c.save();c.translate(0,bob);c.scale(pul,pul);c.rotate(Math.sin(el)*.04);
   const P=[[0,-110],[56,-34],[36,84],[-36,84],[-56,-34]];c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();
   const cg=c.createLinearGradient(-56,-110,56,84);cg.addColorStop(0,'#e9e2ff');cg.addColorStop(.45,'#9a7cff');cg.addColorStop(1,'#4a2fb0');c.fillStyle=cg;c.fill();c.lineWidth=3;c.strokeStyle='#1b0f40';c.lineJoin='round';c.stroke();
   c.lineWidth=1.6;c.strokeStyle='rgba(255,255,255,.6)';c.beginPath();c.moveTo(0,-110);c.lineTo(-14,84);c.moveTo(0,-110);c.lineTo(22,84);c.moveTo(-56,-34);c.lineTo(56,-34);c.stroke();
   c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.moveTo(-18,-70);c.lineTo(-34,-34);c.lineTo(-22,-30);c.lineTo(-8,-62);c.closePath();c.fill();
   if(ch>.45){c.strokeStyle='rgba(255,255,255,'+Math.min(1,(ch-.45)*2)+')';c.lineWidth=2;for(let i=0;i<7;i++){const a=i*.9+.3,L=30+ch*60;c.beginPath();c.moveTo(0,-20);c.lineTo(Math.cos(a)*L*.5+rnd2(-4,4),-20+Math.sin(a)*L*.5);c.lineTo(Math.cos(a)*L,-20+Math.sin(a)*L);c.stroke()}}
   c.restore()}
  else{ /* revelación */
   const r=el-REV;c.save();c.globalCompositeOperation='lighter';c.rotate(el*.25);
   for(let i=0;i<14;i++){c.rotate(6.283/14);const gr=c.createLinearGradient(0,0,0,-300);gr.addColorStop(0,'rgba(255,240,170,.55)');gr.addColorStop(1,'rgba(255,240,170,0)');c.fillStyle=gr;c.beginPath();c.moveTo(-9,0);c.lineTo(9,0);c.lineTo(0,-300);c.closePath();c.fill()}
   c.restore();
   c.save();c.globalCompositeOperation='lighter';for(const s of shards){const dd=Math.min(1,r/1.2),x=Math.cos(s.a)*s.v*dd,y=Math.sin(s.a)*s.v*dd;c.globalAlpha=Math.max(0,1-r/1.3);c.fillStyle=pal.a;c.save();c.translate(x,y);c.rotate(s.rot+r*4);c.fillRect(-s.z,-s.z*.5,s.z*2,s.z);c.restore()}c.restore();
   const pp=back(r/.7),gl=c.createRadialGradient(0,0,10,0,0,150);gl.addColorStop(0,'rgba(255,240,180,.7)');gl.addColorStop(1,'rgba(255,240,180,0)');c.fillStyle=gl;c.fillRect(-170,-170,340,340);
   c.save();c.scale(pp,pp);if(img&&img.complete&&img.naturalWidth)c.drawImage(img,-125,-150,250,250);else{c.font='110px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(d.i,0,-10)}c.restore();
   c.globalAlpha=ease((r-.4)/.4);c.textAlign='center';c.lineJoin='round';c.fillStyle='#ffe27a';c.strokeStyle='#1b0f40';c.lineWidth=5;c.font='bold 20px Trebuchet MS,sans-serif';c.strokeText('¡Nueva mascota!',0,-140);c.fillText('¡Nueva mascota!',0,-140);
   c.font='bold 28px Trebuchet MS,sans-serif';c.fillStyle='#fff';c.strokeText(d.n,0,115);c.fillText(d.n,0,115);c.font='14px Trebuchet MS,sans-serif';c.lineWidth=4;c.strokeText(d.d,0,140);c.fillStyle='#d6dcff';c.fillText(d.d,0,140)}
  c.restore();
  /* destello */
  if(el>FL-.4&&el<REV+.6){const a=el<FL?ease((el-(FL-.4))/.4):1-ease((el-FL)/(REV+.6-FL));c.globalAlpha=a;c.fillStyle='#fff';c.fillRect(0,0,W,H);c.globalAlpha=1}}
 cv.onclick=()=>{const el=(performance.now()-t0)/1000+skip;if(el<REV)skip+=REV-el+.02};
 $('dgpsok').onclick=()=>{done=1;cancelAnimationFrame(PSRAF);PSRAF=0;openPetShop()};
 PSRAF=requestAnimationFrame(frame)}
function stationMenu(o){D.paused=true;
 if(o.act==='petshop'){openPetShop();return}
 if(o.act==='menu')openLoadoutX('bag',null);else openLoadoutX({weapons:'bag',armor:'bag',pets:'pets',store:'store'}[o.act],null,o.act)}
function drawStation(o){DGART.st(o)}
/* ---- piso de inicio: se desbloquea un punto cada 10 pisos alcanzados (10, 20, 30…) ---- */
function startOptions(){const b=(pref.dg&&pref.dg.best)|0,a=[1];for(let f=10;f<=b;f+=10)a.push(f);return a}
function chosenStart(){const s=(pref.dg&&pref.dg.startFl)|0;return startOptions().includes(s)?s:1}
function diffMenu(onPick,onCancel){let o=$('dgdf');if(!o){o=document.createElement('div');o.id='dgdf';$('stage').append(o)}
 const cur=(pref.dg&&pref.dg.diff!=null)?pref.dg.diff:1;
 const so=startOptions(),sf=chosenStart();
 o.innerHTML='<div class="tpb dgc"><h3>🎚️ Elige la dificultad</h3>'+(so.length>1?'<p class="dgq">🏁 Piso de inicio · récord: piso '+((pref.dg&&pref.dg.best)|0)+'</p><div class="dgsf">'+so.map(f=>'<button class="dgsfb'+(f===sf?' on':'')+'" data-f="'+f+'">'+(f===1?'Inicio':'Piso '+f)+'</button>').join('')+'</div>':'')+'<div class="dgsg">'+DIFFS.map((x,i)=>'<button class="dgsi" data-i="'+i+'" style="border-color:'+(i===cur?'#ffd84a':'#5a6a9a')+'"><i>'+x.i+'</i><b>'+x.n+(i===cur?' ✓':'')+'</b><small>'+x.d+'</small></button>').join('')+'</div><button class="b dgno">↩️ Volver</button></div>';o.style.display='flex';
 o.querySelectorAll('.dgsfb').forEach(bt=>bt.onclick=()=>{if(!pref.dg||typeof pref.dg!=='object')pref.dg={best:0,runs:0,kills:0};pref.dg.startFl=+bt.dataset.f;try{savePref()}catch(e){}diffMenu(onPick,onCancel)});
 o.querySelectorAll('.dgsi').forEach(bt=>bt.onclick=()=>{const i=+bt.dataset.i;if(!pref.dg||typeof pref.dg!=='object')pref.dg={best:0,runs:0,kills:0};pref.dg.diff=i;try{savePref()}catch(e){}o.style.display='none';onPick(i)});
 o.querySelector('.dgno').onclick=()=>{o.style.display='none';if(onCancel)onCancel()}}
function hubExit(){D.paused=true;diffMenu(()=>{D.hub=false;D.on=false;D.paused=false;D.fade=null;start()},()=>{hero.y+=80;D.paused=false;lastN=performance.now()})}
function pauseHub(){D.paused=true;const box=$('dgp'),cl=!(pref.dg&&pref.dg.hub===false);
 box.innerHTML='<div class="tpb dgc"><h3>⏸️ Sala del héroe</h3><button class="b" id="dgres">▶ Continuar</button><button class="b" id="hbm" style="background:#2a3a5a">📋 Menú clásico</button><button class="b" id="hbt">⚙️ Al jugar abrir: '+(cl?'Sala (cambiar a Menú)':'Menú (cambiar a Sala)')+'</button><button class="b" id="hbq" style="background:#6a2a2a">🚪 Volver al menú principal</button></div>';box.style.display='flex';
 $('dgres').onclick=resume;$('hbm').onclick=()=>{box.style.display='none';openLoadoutX('bag',null)};$('hbt').onclick=()=>{if(!pref.dg||typeof pref.dg!=='object')pref.dg={best:0,runs:0,kills:0};pref.dg.hub=!cl?true:false;try{savePref()}catch(e){}pauseHub()};
 $('hbq').onclick=()=>{box.style.display='none';leave()}}
/* ====================== riesgo y recompensa: botín, puntos de salida y XP ====================== */
const POUCH_CAP=12,DG_LOSE=true,XP_DAY_CAP=150,XPQ=[3,6,12,24,48,72,100],EXIT_EVERY=10;
const pouchFree=()=>POUCH_CAP-D.pouch.length;
function pouchAdd(it){if(D.pouch.length>=POUCH_CAP)return false;D.pouch.push(it);return true}
function xpState(){if(!pref.dg||typeof pref.dg!=='object')pref.dg={best:0,runs:0,kills:0};const g=pref.dg,t=new Date().toLocaleDateString('en-CA');if(!g.xd||g.xd.d!==t)g.xd={d:t,n:0};g.xp=g.xp|0;return g}
const xpLevel=xp=>Math.floor(Math.sqrt(xp/40))+1;
function xpTxt(){const g=xpState();return'⭐ Nivel '+xpLevel(g.xp)+' · '+g.xp+' XP'}
function xpGain(items){const g=xpState();let raw=0;items.forEach(it=>raw+=XPQ[Math.min(XPQ.length-1,itQ(it))]);const gain=Math.max(0,Math.min(raw,XP_DAY_CAP-g.xd.n));g.xp+=gain;g.xd.n+=gain;return{gain,raw}}
/* al morir o abandonar: se pierde el equipo que llevabas y el botín; las armas de Fundador se sellan 10 min */
function deathLoss(){const L=DI(),h=hero;let nw=0,ng=0,fdl=0;const np=D.pouch.length;
 h.wps.forEach(w=>{if(!w)return;if(w.fd){fdSeal(w.id,w);fdl++}else nw++});
 for(const k in h.gear)if(h.gear[k])ng++;
 L.eq.w=[null,null];for(const k in GSLOT)L.eq.g[k]=null;D.pouch=[];D.forfeit=true;
 D.rep.push('💀 Perdiste '+nw+' arma'+(nw===1?'':'s')+', '+ng+' pieza'+(ng===1?'':'s')+' de equipo y '+np+' objeto'+(np===1?'':'s')+' del botín');
 if(fdl)D.rep.push('🏺 Tus armas de Fundador regresan en 10 min');
 try{savePref()}catch(e){}}
function gate(){D.fade=null;try{fdMile(D.floor)}catch(e){}if(D.floor%EXIT_EVERY===0&&!D.co)checkpoint();else nextFloor()}
function checkpoint(){D.paused=true;sfx('win');const b=boxEl(),n=D.pouch.length;
 b.innerHTML='<div class="tpb dgc"><h3>🏁 Punto de salida</h3><p class="dgq">¡Piso '+D.floor+' superado! Puedes <b>salir con todo</b> o <b>seguir</b>. Si sigues y mueres, pierdes tu equipo y tu botín.</p><div class="dgit"><div class="dgi"><i>🎒</i><div><b>Botín: '+n+' objeto'+(n===1?'':'s')+'</b><small>Espacio libre en tu mochila: '+bagFree()+'</small></div></div></div><button class="b" id="dgex" style="background:#2a6a3a">🚪 Salir con todo</button><button class="b" id="dgcont" style="background:#6a2a2a">⚔️ Seguir al piso '+(D.floor+1)+'</button></div>';b.style.display='flex';try{fdConfetti()}catch(e){}
 $('dgex').onclick=extract;$('dgcont').onclick=()=>{closeMenu();nextFloor()}}
function finishExtract(){const b=boxEl();b.style.display='none';D.paused=false;results('🚪 Saliste con tu botín')}
function extract(){const L=DI(),pl=D.pouch.slice();
 if(D.cheated){D.rep.push('🔐 Con comandos: el botín no se conserva');finishExtract();return}
 if(!pl.length){D.rep.push('🎒 Saliste sin botín');finishExtract();return}
 const free=bagFree();
 if(pl.length<=free){pl.forEach(it=>L.bag.push(it));D.pouch=[];D.rep.push('🎒 Salvaste '+pl.length+' objeto'+(pl.length===1?'':'s')+' del botín');try{savePref()}catch(e){}finishExtract();return}
 keepMenu(pl,free)}
function keepMenu(pl,free){const L=DI(),order=pl.map((_,i)=>i).sort((a,c)=>itQ(pl[c])-itQ(pl[a])),sel=new Set(order.slice(0,free));
 const draw=()=>{const g=xpState(),left=XP_DAY_CAP-g.xd.n,disc=pl.filter((_,i)=>!sel.has(i)),raw=disc.reduce((a,it)=>a+XPQ[Math.min(XPQ.length-1,itQ(it))],0),gain=Math.max(0,Math.min(raw,left)),b=boxEl();
  let h='<div class="tpb dgc"><h3>🎒 Tu mochila no alcanza</h3><p class="dgq">Tienes <b>'+free+'</b> espacio'+(free===1?'':'s')+' y <b>'+pl.length+'</b> objetos. Toca cada uno para conservarlo o desecharlo; lo que deseches se convierte en un poco de XP.</p><div class="dgsg">';
  pl.forEach((it,i)=>{const on=sel.has(i),q=itQ(it),nm=it.k==='w'?wName(it.w):it.g.n;h+='<button class="dgsi" data-i="'+i+'" style="border-color:'+(on?'#7be07b':'#7a3a3a')+'"><i>'+itIcon(it)+'</i><b style="color:'+rc(q)+'">'+nm+'</b><small>'+RAR[q].n+'</small><em>'+(on?'✅ Conservar':'🗑️ Desechar')+'</em></button>'});
  h+='</div><p class="dgq">Conservas <b>'+sel.size+'/'+free+'</b> · Desechas <b>'+disc.length+'</b> → ⭐ +'+gain+' XP'+(raw>gain?' (límite diario)':'')+'<br><small>XP por desechos hoy: '+g.xd.n+'/'+XP_DAY_CAP+'</small></p><button class="b" id="dgok">✅ Confirmar</button></div>';
  b.innerHTML=h;b.style.display='flex';
  b.querySelectorAll('.dgsi').forEach(bt=>bt.onclick=()=>{const i=+bt.dataset.i;if(sel.has(i))sel.delete(i);else{if(sel.size>=free){toast('🎒 No hay más espacio: desecha otro primero');return}sel.add(i)}draw()});
  $('dgok').onclick=()=>{const keep=pl.filter((_,i)=>sel.has(i)),out=pl.filter((_,i)=>!sel.has(i));keep.forEach(it=>L.bag.push(it));const r=xpGain(out);D.pouch=[];
   D.rep.push('🎒 Salvaste '+keep.length+' objeto'+(keep.length===1?'':'s'));if(out.length)D.rep.push('🗑️ Desechaste '+out.length+' → ⭐ +'+r.gain+' XP'+(r.raw>r.gain?' (límite diario alcanzado)':''));try{savePref()}catch(e){}finishExtract()}};
 draw()}
D.checkpoint=checkpoint;
/* ====================== objetos de Fundador (betatesters) ====================== */
const FD_MS=10*60*1000,FDEL={sword:'fire',axe:'poison',spear:'ice',bow:'shock',staff:'fire',dagger:'poison',hammer:'shock',pistol:'ice',shotgun:'fire',wand:'ice'};
const fdWeapon=id=>{const w=winst(id,6,FDEL[id],5);w.fd=1;const k=pref.fd&&pref.fd.keep&&pref.fd.keep[id];if(k){w.lv=k.lv|0;if(k.el){w.el=k.el;w.elq=k.elq}}return w};
function fdHas(id){const L=DI(),m=w=>w&&w.fd&&w.id===id;if(m(L.fdw[id]))return true;if(L.bag.some(it=>it&&it.k==='w'&&m(it.w)))return true;if(L.eq.w.some(m))return true;if(D.on&&!D.forfeit&&hero&&hero.wps&&hero.wps.some(m))return true;return false}
function fdSeal(id,w){const F=pref.fd;if(!F||!F.own||!F.own[id]||F.seal[id]!==undefined)return;if(w){F.keep=F.keep||{};F.keep[id]={lv:w.lv|0,el:w.el,elq:w.elq}}F.seal[id]=Date.now()+FD_MS;try{savePref()}catch(e){}try{toast('🏺 '+WP[id].n+' del Fundador: regresa en 10 min')}catch(e){}}
/* reparte armas pendientes y sella las perdidas; devuelve true si algo cambió */
function fdSync(){const F=pref.fd;if(!F||!F.own)return false;if(!F.seal)F.seal={};let ch=false;const now=Date.now(),L=DI();
 for(let n=L.bag.length-1;n>=0;n--){const it=L.bag[n];if(it&&it.k==='w'&&it.w.fd&&!L.fdw[it.w.id]){L.fdw[it.w.id]=it.w;L.bag.splice(n,1);ch=true}}
 for(const id of Object.keys(F.own)){if(!F.own[id]||!WP[id])continue;
  if(fdHas(id)){if(F.seal[id]!==undefined){delete F.seal[id];ch=true}continue}
  if(F.seal[id]===undefined){F.seal[id]=now+FD_MS;ch=true;continue}
  if(F.seal[id]<=now){L.fdw[id]=fdWeapon(id);delete F.seal[id];ch=true;try{toast('🏺 '+WP[id].n+' del Fundador volvió a tu Armería')}catch(e){}}}
 if(ch)try{savePref()}catch(e){}return ch}
function fdText(){const F=pref.fd;if(!F||!F.own)return'';const ids=Object.keys(F.own).filter(id=>F.own[id]&&WP[id]),now=Date.now(),wait=[];let have=0;
 ids.forEach(id=>{const s=F.seal&&F.seal[id];if(s===undefined)have++;else if(s<=now)wait.push(WP[id].i+' lista');else{const r=Math.ceil((s-now)/1000);wait.push(WP[id].i+' '+Math.floor(r/60)+':'+String(r%60).padStart(2,'0'))}});
 return'🏺 Armería del Fundador: '+have+'/'+ids.length+' disponibles'+(wait.length?' · ⏳ '+wait.join(' · '):'')}
let fdT=0;function fdTick(){const n=performance.now();if(n-fdT<1000)return;fdT=n;let ch=false;try{ch=fdSync()}catch(e){}if(ch){ldRender();return}const e=$('fdt');if(e)e.textContent=fdText();document.querySelectorAll('[data-fdt]').forEach(x=>{const s=F0()&&pref.fd.seal[x.dataset.fdt];if(s&&s>Date.now()){const r=Math.ceil((s-Date.now())/1000);x.textContent='⏳ '+Math.floor(r/60)+':'+String(r%60).padStart(2,'0')}})}
const F0=()=>pref.fd&&pref.fd.seal;
const DMB={ogre:18,skel:9,bat:6,gob:9,mini:5,wolf:15,slimeking:13,golem:19,spider:12,lich:17,arch:22,coil:10,spiderling:5,egg:0};
/* ====================== jefes nuevos, peligros del suelo y trampas ====================== */
const BOSSN={ogro:'ogre',ogre:'ogre',lobo:'wolf',wolf:'wolf',slime:'slimeking',limo:'slimeking',golem:'golem',arana:'spider',spider:'spider',lich:'lich',rey:'lich',arch:'arch',arquitecto:'arch'},
 BOSSES=['ogre','wolf','slimeking','golem','spider'],BH={ogre:[520,180],wolf:[440,150],slimeking:[640,210],golem:[780,230],spider:[480,160],lich:[850,200],arch:[1200,260]};
/* cada LICH_EVERY pisos (10, 20, 30…) el jefe es el Rey Lich en vez de la rotación normal */
const LICH_EVERY=10;
/* El Arquitecto: pisos 15, 25, 35… (cada 10 pisos desde el 15) */
const ARCH_FIRST=15,isArch=fl=>fl>=ARCH_FIRST&&(fl-ARCH_FIRST)%10===0;
/* entrada de jefes: pilar de luz + círculo rúnico + caída + onda de impacto + cartel con el nombre */
const BOSS_INTRO=2400;
const BTITLE={ogre:['OGRO','Brutal guardián de las cavernas'],wolf:['HOMBRE LOBO','La bestia de luna llena'],slimeking:['SLIME GIGANTE','Rey de las babas'],golem:['GÓLEM DE PIEDRA','El guardián inamovible'],spider:['ARAÑA REINA','Tejedora de pesadillas'],lich:['REY LICH','Señor de los muertos'],arch:['EL ARQUITECTO','Quien reescribe el mapa']};
const BCOL={ogre:'#ff8a4a',wolf:'#bcd0ff',slimeking:'#7bff7b',golem:'#ffb060',spider:'#c07aff',lich:'#b05aff',arch:'#5ae0ff'};
function updBossIntro(){const now=D.t,h=hero;for(const e of E){const I=e.intro;if(!I||I.done||e.dead)continue;const p=clamp((now-I.t0)/I.dur,0,1),c=BCOL[e.t]||'#ffcf6a';
 if(!I.s0){I.s0=1;sfx('land');shake(4)}
 if(p<.78&&Math.random()<.7){const a=rnd(0,TAU),R=e.r*3,x=e.x+Math.cos(a)*R,y=e.y+Math.sin(a)*R*.5;part(x,y,(e.x-x)*.03,(e.y-y)*.03-1.2,rnd(300,520),c,rnd(2,4),-.002)}
 if(p>=.5&&!I.s1){I.s1=1;sfx('swing')}
 if(p>=.78&&!I.s2){I.s2=1;shake(16);freeze(90);sfx('crumble');dust(e.x,e.y,22,c);D.rings.push({x:e.x,y:e.y,t:now,R:e.r*5,c});for(let i=0;i<36;i++){const a=rnd(0,TAU),s=rnd(2,7);part(e.x,e.y-e.r*.5,Math.cos(a)*s,Math.sin(a)*s-1.5,rnd(400,900),i%3?c:'#ffffff',rnd(2,5),.012)}
  for(const hh of HS()){const d=Math.hypot(hh.x-e.x,hh.y-e.y);if(d<e.r*5+40&&!hh.dead){const a=Math.atan2(hh.y-e.y,hh.x-e.x);hh.vx+=Math.cos(a)*8;hh.vy+=Math.sin(a)*8}}}
 if(p>=1)I.done=1}}
const bossFor=fl=>fl%LICH_EVERY===0?'lich':isArch(fl)?'arch':BOSSES[(fl-1)%BOSSES.length];
function mkBoss(t,x,y,fl){const e=mkEnemy(t,x,y,fl),b=BH[t];e.hp=e.max=b[0]*(1+(fl-1)*.34+(fl-1)*(fl-1)*.014)*dfx().hp;const bi=BOSS_INTRO,ti=BTITLE[t]||[EN[t].n,''];e.spawn=D.t+bi;e.intro={t0:D.t,dur:bi};e.st='idle';e.stT=D.t+bi+1000;D.bossCard={t0:D.t,dur:bi+300,name:ti[0],sub:ti[1],col:BCOL[t]||'#ffcf6a'};E.push(e);D.boss=e;return e}
function safePt(e,x,y){const r=(e.r||10)*.9,ok=(px,py)=>!solidT(Math.floor((px-r)/T),Math.floor((py-r)/T))&&!solidT(Math.floor((px+r)/T),Math.floor((py-r)/T))&&!solidT(Math.floor((px-r)/T),Math.floor((py+r)/T))&&!solidT(Math.floor((px+r)/T),Math.floor((py+r)/T));
 for(let i=10;i>=0;i--){const k=i/10,px=e.x+(x-e.x)*k,py=e.y+(y-e.y)*k;if(ok(px,py))return[px,py]}return[e.x,e.y]}
function ringCheck(e){const now=D.t;if(e.ring){const p=(now-e.ring)/520,R=p*(e.ringR||190);if(p<1&&Math.abs(Math.hypot(hero.x-e.rx,hero.y-e.ry)-R)<22&&hero.hp>0)hurtHero(e.dm,e.rx,e.ry,9);if(p>=1)e.ring=0}}
function addPool(x,y,r,life,dm){if(solidT(Math.floor(x/T),Math.floor(y/T)))return;D.pools.push({x,y,r,t0:D.t,life,dm:dm||6});if(D.pools.length>22)D.pools.shift()}
function addWeb(x,y,r,life){if(solidT(Math.floor(x/T),Math.floor(y/T)))return;D.webs.push({x,y,r,t0:D.t,life});if(D.webs.length>16)D.webs.shift()}
function eggPop(e){for(let i=0;i<8;i++){const a=rnd(0,TAU),s=rnd(1,3);part(e.x,e.y-6,Math.cos(a)*s,Math.sin(a)*s-1,rnd(260,520),i%2?'#efe6c8':'#cfe08a',rnd(2,4),.012)}}
function eggHatch(e){eggPop(e);if(E.filter(q=>!q.dead&&q.t==='spiderling').length>9)return;for(let i=0;i<2;i++){const m=mkEnemy('spiderling',e.x+rnd(-8,8),e.y+rnd(-8,8),e.fl);m.vx=rnd(-3,3);m.vy=rnd(-3,3);m.room=e.room;E.push(m)}sfx('pick')}
function layEggs(e,n){let al=E.filter(q=>!q.dead&&q.t==='egg').length;for(let i=0;i<n&&al<8;i++){const a=rnd(0,TAU),d=rnd(55,120),[x,y]=safePt(e,e.x+Math.cos(a)*d,e.y+Math.sin(a)*d),g2=mkEnemy('egg',x,y,e.fl);g2.hatch=D.t+4200;g2.room=e.room;E.push(g2);eggPop(g2);al++}}
function bossDeath(e){if(e.t==='ogre')return;for(const q of E)if(!q.dead&&q!==e&&(q.t==='egg'||q.t==='spiderling'||q.t==='slime'||q.t==='mini'||q.mn||q.t==='coil')){q.dead=true;eggPop(q)}
 if(e.t==='slimeking'){addPool(e.x,e.y,70,9000,e.dm*.3);for(let i=0;i<8;i++)part(e.x,e.y-10,rnd(-4,4),rnd(-4,1),rnd(500,900),'#7be07b',rnd(3,6),.012)}
 if(e.t==='arch'){archClear();shake(18);for(let i=0;i<30;i++){const a=rnd(0,TAU),s=rnd(2,7);part(e.x,e.y-30,Math.cos(a)*s,Math.sin(a)*s-1.5,rnd(600,1300),i%2?'#5ae0ff':'#c8d4ee',rnd(3,6),.012,i%2?'ember':'dust')}}
 if(e.t==='lich'){shake(16);for(let i=0;i<24;i++){const a=rnd(0,TAU),s=rnd(2,6);part(e.x,e.y-20,Math.cos(a)*s,Math.sin(a)*s-1.5,rnd(600,1200),i%2?'#b05aff':'#e6e0c8',rnd(3,6),.012,i%2?'ember':'dust')}}
 if(e.t==='golem'){for(let i=0;i<14;i++){const a=rnd(0,TAU),s=rnd(2,6);part(e.x,e.y-14,Math.cos(a)*s,Math.sin(a)*s-1.5,rnd(500,1000),i%3?'#8a8f9a':'#5a5f6c',rnd(3,7),.014,'dust')}}}
/* ---- hombre lobo ---- */
function pickFrenzy(e){const R=rooms.find(r=>r.type==='boss')||rooms[rooms.length-1];let f={x:hero.x,y:hero.y};if(Math.random()>=.4)for(let i=0;i<10;i++){const x=(R.x0+1.5+Math.random()*(R.w-3))*T,y=(R.y0+1.5+Math.random()*(R.h-3))*T;if(!solidT(Math.floor(x/T),Math.floor(y/T))){f={x,y};break}}e.fp=f;e.fT=D.t+900}
function updWolf(e,dt,dist,ang){const now=D.t,h=hero;e.boss=true;
 if(!e.enr&&e.hp<e.max*.5){e.enr=1;e.st='howl';e.stT=now+900;shake(8);dust(e.x,e.y,14,'#c8c0b0');sfx('crumble')}
 const sp=e.enr?4.7:3.8,dmp=Math.pow(.84,dt),steer=(a,s,k)=>{e.vx+=(Math.cos(a)*s-e.vx)*k*dt;e.vy+=(Math.sin(a)*s-e.vy)*k*dt};
 if(e.st==='idle'||e.st==='chase'){e.st='chase';const side=Math.sign(Math.sin(e.ph*.2))||1,want=dist>230?ang:dist<120?ang+Math.PI:ang+side*1.25;steer(want,sp,.1);
  if(now>e.stT){const r=Math.random(),k=dist>260?(r<.5?'pounce':'frenzy'):r<.45?'combo':r<.8?'pounce':'frenzy';e.st='tele';e.kind=k;e.tl=k==='combo'?520:k==='pounce'?650:700;e.stT=now+e.tl;e.lockA=ang;e.tx=h.x;e.ty=h.y;e.raise=0;e.cn=0}}
 else if(e.st==='tele'){const p=eo(1-(e.stT-now)/e.tl);e.raise=p;e.crouch=p;e.vx*=dmp;e.vy*=dmp;e.lockA=ang;if(e.kind==='pounce'){e.tx=lerp(e.tx,h.x,.08);e.ty=lerp(e.ty,h.y,.08)}
  if(now>e.stT){e.crouch=0;e.raise=0;
   if(e.kind==='combo'){e.st='lunge';e.cn=e.enr?4:3;e.stT=now+240;e.vx=Math.cos(ang)*12;e.vy=Math.sin(ang)*12;e.hitD=0;dust(e.x,e.y,5);sfx('swing')}
   else if(e.kind==='pounce'){e.st='leap';e.stT=now+520;e.sx=e.x;e.sy=e.y;const s2=safePt(e,e.tx,e.ty);e.tx=s2[0];e.ty=s2[1]}
   else{e.st='frenzy';e.stT=now+(e.enr?3200:2600);pickFrenzy(e)}}}
 else if(e.st==='lunge'){if(!e.hitD&&dist<e.r+h.r+12){hurtHero(e.dm*.8,e.x,e.y,8);e.hitD=1}e.vx*=Math.pow(.9,dt);e.vy*=Math.pow(.9,dt);
  if(now>e.stT){e.cn--;if(e.cn>0){e.stT=now+240;e.vx=Math.cos(ang)*12;e.vy=Math.sin(ang)*12;e.hitD=0;sfx('swing');dust(e.x,e.y,4)}else{e.st='rest';e.stT=now+(e.enr?500:850)}}}
 else if(e.st==='leap'){const p=clamp(1-(e.stT-now)/520,0,1);e.z=Math.sin(p*Math.PI)*70;e.x=lerp(e.sx,e.tx,eio(p));e.y=lerp(e.sy,e.ty,eio(p));e.vx=e.vy=0;
  if(now>e.stT){e.z=0;e.st='land';e.stT=now+500;shake(8);dust(e.x,e.y,12,'#b8a888');sfx('crumble');if(Math.hypot(h.x-e.x,h.y-e.y)<70+h.r)hurtHero(e.dm,e.x,e.y,9)}}
 else if(e.st==='frenzy'){if(!e.fp||Math.hypot(e.x-e.fp.x,e.y-e.fp.y)<34||now>e.fT)pickFrenzy(e);steer(Math.atan2(e.fp.y-e.y,e.fp.x-e.x),8.6,.22);if(Math.random()<.4)dust(e.x,e.y,1,'#b8a888');
  if(dist<e.r+h.r+4&&now>(e.hitC||0)){hurtHero(e.dm*.7,e.x,e.y,8);e.hitC=now+520}if(e.hitW)pickFrenzy(e);if(now>e.stT){e.st='rest';e.stT=now+900}}
 else if(e.st==='land'||e.st==='rest'||e.st==='howl'){e.vx*=dmp;e.vy*=dmp;if(now>e.stT){e.st='chase';e.stT=now+rnd(700,1200)}}}
/* ---- slime gigante ---- */
function landSlime(e,R){addPool(e.x,e.y,R*.8,6500,e.dm*.3);dust(e.x,e.y,8,'#7fd47f');shake(4);if(Math.hypot(hero.x-e.x,hero.y-e.y)<R+hero.r)hurtHero(e.dm*.8,e.x,e.y,8)}
function updSlimeK(e,dt,dist,ang){const now=D.t,h=hero;e.boss=true;
 const stg=e.hp<e.max*.34?2:e.hp<e.max*.67?1:0;
 if((e.split||0)<stg){e.split=stg;e.st='roar';e.stT=now+800;shake(8);for(let i=0;i<3;i++){const m=mkEnemy('slime',e.x+rnd(-70,70),e.y+rnd(-70,70),e.fl);m.spawn=now+500;E.push(m)}addPool(e.x,e.y,60,9000,e.dm*.3)}
 if(e.st==='idle'||e.st==='chase'){e.st='chase';e.vx*=Math.pow(.85,dt);e.vy*=Math.pow(.85,dt);
  if(now>e.stT){const r=Math.random(),k=dist>240?(r<.5?'hop':'spit'):r<.4?'hop':r<.75?'spit':'slam';e.st='tele';e.kind=k;e.tl=k==='hop'?450:k==='spit'?700:850;e.stT=now+e.tl;e.lockA=ang;e.tx=h.x;e.ty=h.y;e.cn=k==='hop'?(e.split>=1?3:2):1}}
 else if(e.st==='tele'){const p=eo(1-(e.stT-now)/e.tl);e.crouch=p*.9;e.raise=p;e.vx*=Math.pow(.8,dt);e.vy*=Math.pow(.8,dt);if(e.kind==='slam'){e.tx=lerp(e.tx,h.x,.05);e.ty=lerp(e.ty,h.y,.05)}else e.lockA=ang;
  if(now>e.stT){e.crouch=0;e.raise=0;
   if(e.kind==='hop'){e.st='hopj';e.stT=now+520;e.sx=e.x;e.sy=e.y;const d2=Math.min(190,dist+20),s2=safePt(e,e.x+Math.cos(ang)*d2,e.y+Math.sin(ang)*d2);e.hx2=s2[0];e.hy2=s2[1]}
   else if(e.kind==='spit'){e.st='cast';e.stT=now+600;const n=e.split>=1?5:3;for(let i=0;i<n;i++){const a=e.lockA+(i-(n-1)/2)*.3,dd=clamp(dist+rnd(-30,50),120,340),sp2=clamp(dd/42,3,8);PR.push({x:e.x,y:e.y-20,vx:Math.cos(a)*sp2,vy:Math.sin(a)*sp2,r:9,dm:e.dm*.6,kb:3,from:'e',life:dd/sp2*16.67+30,col:'#7be07b',a,glob:1,pool:1,pr:36,hit:new Set()})}sfx('swing')}
   else{e.st='air';e.stT=now+560;e.sx=e.x;e.sy=e.y;const s2=safePt(e,e.tx,e.ty);e.tx=s2[0];e.ty=s2[1]}}}
 else if(e.st==='hopj'){const p=clamp(1-(e.stT-now)/520,0,1);e.z=Math.sin(p*Math.PI)*34;e.x=lerp(e.sx,e.hx2,eio(p));e.y=lerp(e.sy,e.hy2,eio(p));e.vx=e.vy=0;
  if(now>e.stT){e.z=0;landSlime(e,60);e.cn--;if(e.cn>0){e.st='tele';e.kind='hop';e.tl=260;e.stT=now+260;e.lockA=ang}else{e.st='chase';e.stT=now+rnd(700,1100)}}}
 else if(e.st==='air'){const p=clamp(1-(e.stT-now)/560,0,1);e.z=Math.sin(p*Math.PI)*90;e.x=lerp(e.sx,e.tx,eio(p));e.y=lerp(e.sy,e.ty,eio(p));e.vx=e.vy=0;
  if(now>e.stT){e.z=0;e.st='land';e.stT=now+700;e.ring=now;e.rx=e.x;e.ry=e.y;e.ringR=200;shake(14);freeze(50);sfx('crumble');dust(e.x,e.y,16,'#7fd47f');addPool(e.x,e.y,78,7500,e.dm*.3);for(let i=0;i<2;i++){const m=mkEnemy('mini',e.x+rnd(-20,20),e.y+rnd(-20,20),e.fl);m.vx=rnd(-4,4);m.vy=rnd(-4,4);E.push(m)}}}
 else if(e.st==='land'){ringCheck(e);if(now>e.stT){e.st='chase';e.stT=now+rnd(800,1300)}}
 else if(e.st==='cast'||e.st==='roar'){e.vx*=Math.pow(.85,dt);e.vy*=Math.pow(.85,dt);if(now>e.stT){e.st='chase';e.stT=now+rnd(800,1200)}}}
/* ---- golem de piedra ---- */
function updGolem(e,dt,dist,ang){const now=D.t,h=hero;e.boss=true;
 if(!e.enr&&e.hp<e.max*.5){e.enr=1;e.st='roar';e.stT=now+900;shake(10);sfx('crumble');dust(e.x,e.y,16,'#b8a888')}
 const sp=e.enr?1.5:1.15,steer=(a,s,k)=>{e.vx+=(Math.cos(a)*s-e.vx)*k*dt;e.vy+=(Math.sin(a)*s-e.vy)*k*dt};
 if(e.st==='idle'||e.st==='chase'){e.st='chase';if(dist>105)steer(ang,sp,.07);else{e.vx*=Math.pow(.85,dt);e.vy*=Math.pow(.85,dt)}
  if(now>e.stT){const r=Math.random(),k=dist<140?(r<.45?'sweep':r<.75?'pound':'boulder'):dist<300?(r<.35?'boulder':r<.65?'rain':'pound'):(r<.5?'boulder':'rain');e.st='tele';e.kind=k;e.tl={pound:900,boulder:750,rain:700,sweep:650}[k];e.stT=now+e.tl;e.lockA=ang;e.tx=h.x;e.ty=h.y;e.raise=0}}
 else if(e.st==='tele'){const p=eo(1-(e.stT-now)/e.tl);e.raise=p;e.vx*=Math.pow(.8,dt);e.vy*=Math.pow(.8,dt);if(e.kind==='boulder'||e.kind==='sweep')e.lockA=ang;
  if(now>e.stT){e.raise=0;
   if(e.kind==='pound'){e.st='land';e.stT=now+750;e.ring=now;e.rx=e.x;e.ry=e.y;e.ringR=e.enr?250:210;shake(14);freeze(60);sfx('crumble');dust(e.x,e.y,18,'#b8a888')}
   else if(e.kind==='boulder'){const n=e.enr?3:1;for(let i=0;i<n;i++){const a=e.lockA+(i-(n-1)/2)*.32;PR.push({x:e.x,y:e.y-26,vx:Math.cos(a)*4.1,vy:Math.sin(a)*4.1,r:15,dm:e.dm,kb:8,from:'e',life:1900,col:'#8a7a5a',a,rock:true,frag:7,hit:new Set()})}e.st='cast';e.stT=now+650;sfx('swing')}
   else if(e.kind==='rain'){e.st='cast';e.stT=now+1700;const n=e.enr?9:6;for(let i=0;i<n;i++){const near=i<3,[fx,fy]=safePt(h,h.x+(near&&!i?0:near?rnd(-60,60):rnd(-170,170)),h.y+(near&&!i?0:near?rnd(-60,60):rnd(-170,170)));D.fall.push({x:fx,y:fy,t:now+900+i*190,d:900,r:46,dm:e.dm*.9})}shake(6);dust(e.x,e.y,10,'#b8a888');sfx('crumble')}
   else{e.st='sweepA';e.stT=now+260;e.sw=now;e.hitD=0}}}
 else if(e.st==='sweepA'){if(!e.hitD&&(now-e.sw)>65&&dist<150+h.r&&Math.abs(ad(e.lockA,ang))<1.3){hurtHero(e.dm*1.1,e.x,e.y,11);e.hitD=1;shake(8)}if(now>e.stT){e.st='rest';e.stT=now+600}}
 else if(e.st==='land'){ringCheck(e);if(now>e.stT){e.st='chase';e.stT=now+rnd(900,1400)}}
 else if(e.st==='cast'||e.st==='roar'||e.st==='rest'){e.vx*=Math.pow(.85,dt);e.vy*=Math.pow(.85,dt);if(now>e.stT){e.st='chase';e.stT=now+rnd(800,1300)}}}
/* ---- rey lich (jefe de cada 10 pisos) ---- */
function lichOrbs(e,n,sp,a){const v=e.enr?5.2:4.5;for(let i=0;i<n;i++){const q=a+(i-(n-1)/2)*sp;PR.push({x:e.x,y:e.y-26,vx:Math.cos(q)*v,vy:Math.sin(q)*v,r:11,dm:e.dm*.8,kb:4,from:'e',life:2300,col:'#b05aff',a:q,orb:1,hit:new Set()})}sfx('swing')}
function lichSummon(e,n){let al=E.filter(q=>!q.dead&&q.mn).length;for(let i=0;i<n&&al<4;i++){const a=rnd(0,TAU),[x,y]=safePt(e,e.x+Math.cos(a)*85,e.y+Math.sin(a)*85),m=mkEnemy('skel',x,y,e.fl);m.mn=1;m.room=e.room;m.spawn=D.t+700;E.push(m);part(x,y-10,0,0,700,'#b05aff',30,0);al++}}
function lichSpot(e){const R=rooms.find(r=>r.type==='boss')||rooms[rooms.length-1];e.bx=e.x;e.by=e.y;for(let i=0;i<30;i++){const x=(R.x0+2+Math.random()*(R.w-4))*T,y=(R.y0+2+Math.random()*(R.h-4))*T,d=Math.hypot(x-hero.x,y-hero.y);if(freeAt(x,y,e.r)&&d>200&&d<340){e.bx=x;e.by=y;break}}}
function updLich(e,dt,dist,ang){const now=D.t,h=hero;e.boss=true;
 if(!e.enr&&e.hp<e.max*.5){e.enr=1;e.st='roar';e.stT=now+1000;shake(10);sfx('crumble');dust(e.x,e.y,14,'#b05aff');lichSummon(e,2)}
 const sp=e.enr?2.1:1.6,steer=(a,s,k)=>{e.vx+=(Math.cos(a)*s-e.vx)*k*dt;e.vy+=(Math.sin(a)*s-e.vy)*k*dt},damp=()=>{e.vx*=Math.pow(.82,dt);e.vy*=Math.pow(.82,dt)};
 if(e.st==='idle'||e.st==='chase'){e.st='chase';const side=Math.sign(Math.sin(e.ph*.1))||1,want=dist<210?ang+Math.PI:dist>330?ang:ang+side*1.4;steer(want,sp,.08);
  if(now>e.stT){const pool=['orbs','orbs','spikes','blink'];if(E.filter(q=>!q.dead&&q.mn).length<3)pool.push('summon');if(e.enr)pool.push('nova','spikes');let k=pick(pool);if(k===e.last)k=pick(pool);e.last=k;
   e.st='tele';e.kind=k;e.tl={orbs:650,spikes:750,summon:900,blink:550,nova:950}[k];e.stT=now+e.tl;e.lockA=ang;e.raise=0;if(k==='blink')lichSpot(e)}}
 else if(e.st==='tele'){e.raise=eo(1-(e.stT-now)/e.tl);damp();if(e.kind==='orbs'||e.kind==='spikes')e.lockA=ang;
  if(now>e.stT){e.raise=0;
   if(e.kind==='orbs'){lichOrbs(e,e.enr?5:3,.3,e.lockA);e.st='cast';e.stT=now+550}
   else if(e.kind==='spikes'){const n=e.enr?7:5;for(let i=0;i<n;i++){const[fx,fy]=safePt(e,e.x+Math.cos(e.lockA)*(80+i*55),e.y+Math.sin(e.lockA)*(80+i*55));D.fall.push({x:fx,y:fy,t:now+550+i*110,d:550,r:40,dm:e.dm*.9})}shake(5);sfx('crumble');e.st='cast';e.stT=now+700}
   else if(e.kind==='summon'){lichSummon(e,e.enr?3:2);sfx('pick');e.st='cast';e.stT=now+700}
   else if(e.kind==='blink'){part(e.x,e.y-20,0,0,500,'#b05aff',40,0);dust(e.x,e.y,8,'#b05aff');e.x=e.bx;e.y=e.by;e.vx=e.vy=0;part(e.x,e.y-20,0,0,500,'#b05aff',40,0);dust(e.x,e.y,10,'#b05aff');shake(4);
    if(Math.hypot(h.x-e.x,h.y-e.y)<60+h.r)hurtHero(e.dm*.7,e.x,e.y,8);lichOrbs(e,3,.3,Math.atan2(h.y-e.y,h.x-e.x));e.st='cast';e.stT=now+600}
   else{e.st='land';e.stT=now+800;e.ring=now;e.rx=e.x;e.ry=e.y;e.ringR=250;shake(12);freeze(50);sfx('crumble');dust(e.x,e.y,16,'#b05aff')}}}
 else if(e.st==='land'){damp();ringCheck(e);if(now>e.stT){e.st='chase';e.stT=now+rnd(650,1000)}}
 else if(e.st==='cast'||e.st==='roar'||e.st==='rest'){damp();if(now>e.stT){e.st='chase';e.stT=now+rnd(650,1000)*(e.enr?.75:1)}}}
/* ---- el arquitecto (jefe de los pisos 15, 25, 35…): láser, paredes, esferas que rebotan, parálisis y bobinas ---- */
const rayLen=(x,y,a,mx)=>{const c=Math.cos(a),s=Math.sin(a);for(let d=0;d<mx;d+=8)if(solidT(Math.floor((x+c*d)/T),Math.floor((y+s*d)/T)))return d;return mx};
const segDist=(px,py,x1,y1,x2,y2)=>{const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy||1,t=clamp(((px-x1)*dx+(py-y1)*dy)/l,0,1);return Math.hypot(px-(x1+dx*t),py-(y1+dy*t))};
function paralyze(){const h=hero;h.paraT=D.t+1000;h.inv=Math.max(h.inv||0,D.t+1500);h.atk=null;h.wo=0;shake(6);sfx('crumble');if(D.t>(D.paraToast||0)){D.paraToast=D.t+9000;toast('⚡ ¡Paralizado! Esquiva los círculos azules')}}
function archSpheres(src,n,sp,a){if(PR.filter(p=>p.en).length>16)return;for(let i=0;i<n;i++){const q=a+(i-(n-1)/2)*sp;PR.push({x:src.x,y:src.y-20,vx:Math.cos(q)*4.3,vy:Math.sin(q)*4.3,r:10,dm:src.dm*.7,kb:5,from:'e',life:7000,col:'#5ae0ff',a:q,en:1,bounce:5,hit:new Set()})}sfx('swing')}
function archBeam(o){D.beams.push(Object.assign({a:0,off:0,trk:0,t0:D.t,tl:900,dur:450,w:15,dm:10,len:0},o))}
function archWalls(e,n){const R=rooms.find(r=>r.type==='boss')||rooms[rooms.length-1];D.bw=D.bw||[];
 for(let i=0;i<n;i++){for(let k=0;k<40;k++){const tx=ri(R.x0+3,R.x0+R.w-5),ty=ri(R.y0+3,R.y0+R.h-5);let ok=true;
   for(let yy=ty-1;yy<=ty+2&&ok;yy++)for(let xx=tx-1;xx<=tx+2;xx++)if(tile(xx,yy)!==1){ok=false;break}
   if(!ok)continue;const cx=(tx+1)*T,cy=(ty+1)*T;
   if(Math.hypot(cx-hero.x,cy-hero.y)<120||E.some(q=>!q.dead&&Math.hypot(cx-q.x,cy-q.y)<100)||D.bw.some(w=>Math.hypot((w.tx-tx)*T,(w.ty-ty)*T)<4*T))continue;
   while(D.bw.length>=8)archDrop(D.bw.shift());
   D.bw.push({tx,ty,w:2,h:2,t0:D.t,act:D.t+800,life:16000,nx:D.t+800+rnd(3000,5000),dm:e.dm*.9,on:0,enr:!!e.enr});break}}
 sfx('crumble');shake(4)}
function archDrop(w){if(w.on)for(let y=0;y<w.h;y++)for(let x=0;x<w.w;x++)if(map[(w.ty+y)*MW+w.tx+x]===0)map[(w.ty+y)*MW+w.tx+x]=1;w.dead=1;if(w.on)dust((w.tx+w.w/2)*T,(w.ty+w.h/2)*T,12,'#8aa0c8')}
function archClear(){for(const w of D.bw||[])archDrop(w);D.bw=[];D.beams=[]}
function archPhase2(e){e.enr=1;e.shield=true;e.st='roar';e.stT=D.t+1300;shake(12);sfx('crumble');e.cl=[];
 const R=e.room||rooms.find(r=>r.type==='boss')||rooms[rooms.length-1];
 for(const[cx,cy]of[[R.x0+2,R.y0+2],[R.x0+R.w-3,R.y0+2],[R.x0+2,R.y0+R.h-3],[R.x0+R.w-3,R.y0+R.h-3]]){let px=(cx+.5)*T,py=(cy+.5)*T,found=false;
  for(let r=0;r<5&&!found;r++)for(let dy=-r;dy<=r&&!found;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=(cx+dx+.5)*T,y=(cy+dy+.5)*T;if(freeAt(x,y,16)&&tile(cx+dx,cy+dy)===1&&x>R.x0*T&&x<(R.x0+R.w)*T&&y>R.y0*T&&y<(R.y0+R.h)*T){px=x;py=y;found=true;break}}
  const c=mkEnemy('coil',px,py,e.fl);c.cx=px;c.cy=py;c.room=R;c.spawn=D.t+700;c.stT=D.t+rnd(3000,4500);E.push(c);e.cl.push(c);part(px,py-10,0,0,800,'#5ae0ff',44,0)}
 toast('🔋 ¡Escudo activo! Destruye las 4 bobinas')}
function updCoil(e,dt,dist,ang){const now=D.t;if(e.cx!==undefined){e.x=e.cx;e.y=e.cy}e.vx=e.vy=0;
 if(e.st==='idle'&&now>e.stT&&dist<720){e.st='tele';e.stT=now+800;e.lockA=ang}
 else if(e.st==='tele'){e.lockA=ang;if(now>e.stT){archSpheres(e,1,0,e.lockA);e.st='idle';e.stT=now+rnd(4200,6500)}}}
function updArch(e,dt,dist,ang){const now=D.t,h=hero;e.boss=true;
 if(!e.enr&&e.hp<e.max*.5)archPhase2(e);
 if(e.shield&&e.cl&&!e.cl.some(c=>!c.dead)){e.shield=false;e.st='rest';e.stT=now+2200;shake(14);sfx('crumble');dust(e.x,e.y,16,'#7fe8ff');for(let i=0;i<24;i++){const a=rnd(0,TAU);part(e.x,e.y-30,Math.cos(a)*4,Math.sin(a)*4,700,'#7fe8ff',4,.01,'ember')}toast('💥 ¡Escudo roto! ¡Ataca!')}
 const sp=e.enr?1.7:1.3,steer=(a,s,k)=>{e.vx+=(Math.cos(a)*s-e.vx)*k*dt;e.vy+=(Math.sin(a)*s-e.vy)*k*dt},damp=()=>{e.vx*=Math.pow(.82,dt);e.vy*=Math.pow(.82,dt)};
 if(e.st==='idle'||e.st==='chase'){e.st='chase';const side=Math.sign(Math.sin(e.ph*.1))||1,want=dist<200?ang+Math.PI:dist>330?ang:ang+side*1.4;steer(want,sp,.07);
  if(now>e.stT){const pool=['laser','orbs','walls','shock'];if(e.enr)pool.push('laser','orbs','shock');if((D.bw||[]).length>=6)pool.splice(pool.indexOf('walls'),1);let k=pick(pool);if(k===e.last)k=pick(pool);e.last=k;
   e.st='tele';e.kind=k;e.tl={laser:1000,orbs:650,walls:800,shock:650}[k];e.stT=now+e.tl;e.lockA=ang;e.raise=0;
   if(k==='laser'){const fan=e.enr&&Math.random()<.5,sw=e.enr&&!fan?(Math.random()<.5?-1:1)*.0009:0;e.lv=fan?3:1;for(const o of(fan?[-.5,0,.5]:[0]))archBeam({src:'e',e,a:ang+o,off:o,trk:1,t0:now,tl:e.tl,dur:800,w:15,dm:e.dm*1.25,sw:sw&&o===0?sw:0})}}}
 else if(e.st==='tele'){e.raise=eo(1-(e.stT-now)/e.tl);damp();if(e.kind!=='walls')e.lockA=ang;
  if(now>e.stT){e.raise=0;
   if(e.kind==='laser'){e.st='cast';e.stT=now+1050}
   else if(e.kind==='orbs'){archSpheres(e,e.enr?5:3,.32,e.lockA);e.st='cast';e.stT=now+600}
   else if(e.kind==='walls'){archWalls(e,e.enr?4:3);e.st='cast';e.stT=now+700}
   else{const n=e.enr?3:1;for(let i=0;i<n;i++){const v=i?{x:h.vx*30+rnd(-70,70),y:h.vy*30+rnd(-70,70)}:{x:0,y:0},[fx,fy]=safePt(h,h.x+v.x,h.y+v.y);D.fall.push({x:fx,y:fy,t:now+800+i*180,d:800,r:66,dm:e.dm*.6,para:1})}sfx('swing');e.st='cast';e.stT=now+700}}}
 else if(e.st==='cast'||e.st==='roar'||e.st==='rest'){damp();if(now>e.stT){e.st='chase';e.stT=now+rnd(900,1400)*(e.enr?.78:1)}}}
function updArchEnv(dt){const now=D.t,h=hero;
 if(D.bw&&D.bw.length){for(const w of D.bw){const x0=w.tx*T,y0=w.ty*T,x1=(w.tx+w.w)*T,y1=(w.ty+w.h)*T,cx=(x0+x1)/2,cy=(y0+y1)/2;
  if(!w.on){if(now>=w.act){const inside=q=>q.x>x0-q.r-4&&q.x<x1+q.r+4&&q.y>y0-q.r-4&&q.y<y1+q.r+4;
    if(HS().some(q=>!q.dead&&inside(q))||E.some(q=>!q.dead&&inside(q)))w.act=now+250;
    else{w.on=1;w.act=now;for(let y=0;y<w.h;y++)for(let x=0;x<w.w;x++)map[(w.ty+y)*MW+w.tx+x]=0;dust(cx,cy,12,'#8aa0c8');shake(3);sfx('crumble')}}}
  else{if(now-w.act>w.life){archDrop(w);continue}
   if(now>w.nx&&now>w.act+1500){w.nx=now+rnd(w.enr?3500:5000,w.enr?6000:8000);
    if(HS().some(q=>!q.dead&&Math.hypot(q.x-cx,q.y-cy)<560)&&D.beams.filter(b=>b.src==='w').length<2){const hn=coNear(cx,cy),a=Math.round(Math.atan2(hn.y-cy,hn.x-cx)/(Math.PI/2))*(Math.PI/2);w.chg=now+900;archBeam({src:'w',a,x:cx+Math.cos(a)*(T+6),y:cy+Math.sin(a)*(T+6),t0:now,tl:900,dur:450,w:14,dm:w.dm})}}}}
  D.bw=D.bw.filter(w=>!w.dead)}
 if(D.beams&&D.beams.length){for(const b of D.beams){const age=now-b.t0;if(b.src==='e'){if(!b.e||b.e.dead){b.done=1;continue}b.x=b.e.x;b.y=b.e.y-8}
   if(b.trk&&age<b.tl-300){const hn=coNear(b.x,b.y);b.a=Math.atan2(hn.y-b.y,hn.x-b.x)+b.off}
   if(age>=b.tl&&age<b.tl+b.dur&&b.sw)b.a+=b.sw*dt*16.67;
   b.len=rayLen(b.x,b.y,b.a,1000);
   if(age>=b.tl&&age<b.tl+b.dur){if(!b.fx){b.fx=1;shake(5);sfx('crumble')}
    for(const hh of HS()){if(!hh.dead&&!hh.gone&&segDist(hh.x,hh.y,b.x,b.y,b.x+Math.cos(b.a)*b.len,b.y+Math.sin(b.a)*b.len)<b.w+hh.r*.5)coAsH(hh,()=>hurtHero(b.dm,b.x,b.y,10))}
    if(Math.random()<.6){const d=rnd(0,b.len);sparks(b.x+Math.cos(b.a)*d,b.y-14+Math.sin(b.a)*d,'#9ff0ff',1,2)}}
   else if(age>=b.tl+b.dur)b.done=1}
  D.beams=D.beams.filter(b=>!b.done)}}
/* ---- araña reina ---- */
function updSpider(e,dt,dist,ang){const now=D.t,h=hero;e.boss=true;
 if(!e.enr&&e.hp<e.max*.5){e.enr=1;e.st='roar';e.stT=now+800;shake(6);layEggs(e,3);sfx('crumble')}
 const sp=e.enr?3.9:3.2,steer=(a,s,k)=>{e.vx+=(Math.cos(a)*s-e.vx)*k*dt;e.vy+=(Math.sin(a)*s-e.vy)*k*dt};
 if(e.st==='idle'||e.st==='chase'){e.st='chase';const side=Math.sign(Math.sin(e.ph*.13))||1,want=dist>260?ang:dist<150?ang+Math.PI*.9:ang+side*1.3;steer(want+Math.sin(now/300)*.35,sp,.09);
  if(now>e.stT){const r=Math.random(),k=r<.38?'web':r<.7?'eggs':'bite';e.st='tele';e.kind=k;e.tl=k==='web'?560:k==='eggs'?800:520;e.stT=now+e.tl;e.lockA=ang;e.tx=h.x;e.ty=h.y;e.crouch=0;e.raise=0}}
 else if(e.st==='tele'){const p=eo(1-(e.stT-now)/e.tl);e.raise=p;e.crouch=p;e.vx*=Math.pow(.8,dt);e.vy*=Math.pow(.8,dt);if(e.kind!=='eggs')e.lockA=ang;if(e.kind==='bite'){e.tx=lerp(e.tx,h.x,.1);e.ty=lerp(e.ty,h.y,.1)}
  if(now>e.stT){e.crouch=0;e.raise=0;
   if(e.kind==='web'){const n=e.enr?3:1;for(let i=0;i<n;i++){const a=e.lockA+(i-(n-1)/2)*.3;PR.push({x:e.x,y:e.y-14,vx:Math.cos(a)*5.4,vy:Math.sin(a)*5.4,r:11,dm:e.dm*.3,kb:2,from:'e',life:1700,col:'#f2f2f2',a,web:1,hit:new Set()})}e.st='cast';e.stT=now+500;sfx('swing')}
   else if(e.kind==='eggs'){layEggs(e,e.enr?4:3);e.st='cast';e.stT=now+700}
   else{e.st='leap';e.stT=now+430;e.sx=e.x;e.sy=e.y;const s2=safePt(e,e.tx,e.ty);e.tx=s2[0];e.ty=s2[1]}}}
 else if(e.st==='leap'){const p=clamp(1-(e.stT-now)/430,0,1);e.z=Math.sin(p*Math.PI)*42;e.x=lerp(e.sx,e.tx,eio(p));e.y=lerp(e.sy,e.ty,eio(p));e.vx=e.vy=0;
  if(now>e.stT){e.z=0;e.st='rest';e.stT=now+650;dust(e.x,e.y,8,'#8a7aa8');if(Math.hypot(h.x-e.x,h.y-e.y)<e.r+h.r+14)hurtHero(e.dm,e.x,e.y,8)}}
 else if(e.st==='cast'||e.st==='roar'||e.st==='rest'){e.vx*=Math.pow(.85,dt);e.vy*=Math.pow(.85,dt);if(now>e.stT){e.st='chase';e.stT=now+rnd(700,1200)}}}
/* ---- peligros del suelo: charcos, telarañas, rocas que caen y trampas ---- */
function placeTraps(fl){D.traps=[];const CW=30,CH=22,cap=Math.min(14,1+Math.floor(fl*1.5)),td=8*(1+(fl-1)*.18),add=o=>{if(D.traps.length>=cap)return false;o.ph=rnd(0,3000);o.dm=td;o.nx=D.t+rnd(900,2200);D.traps.push(o);return true};
 for(let i=0;i<rooms.length-1;i++){const A=rooms[i],B=rooms[i+1],dx=B.cx-A.cx,dy=B.cy-A.cy,tl=[];
  if(dx){const cr=A.cy*CH+(CH>>1),xa=dx>0?A.x0+A.w:A.x0-1,xb=dx>0?B.x0-1:B.x0+B.w,lo=Math.min(xa,xb),hi=Math.max(xa,xb);for(let x=lo+2;x<=hi-2;x++)tl.push({x:(x+.5)*T,y:cr*T,w:T,h:2*T,hz:1})}
  else{const cc=A.cx*CW+(CW>>1),ya=dy>0?A.y0+A.h:A.y0-1,yb=dy>0?B.y0-1:B.y0+B.h,lo=Math.min(ya,yb),hi=Math.max(ya,yb);for(let y=lo+2;y<=hi-2;y++)tl.push({x:cc*T,y:(y+.5)*T,w:2*T,h:T,hz:0})}
  if(!tl.length||Math.random()>.4+fl*.08)continue;
  const c=pick(tl);if(Math.random()<.6)add({k:'spike',x:c.x,y:c.y,w:c.w,h:c.h});else add({k:'vent',x:c.hz?c.x:c.x+(Math.random()<.5?-1:1)*T/2,y:c.hz?c.y+(Math.random()<.5?-1:1)*T/2:c.y,w:T,h:T})}
 rooms.forEach(R=>{if(R.type==='start')return;const n=R.type==='boss'?(fl>=2?2:1):R.type==='treasure'?1:Math.min(3,Math.floor((fl+1)/2));
  for(let k=0;k<n;k++){const x=(R.x0+2+Math.random()*(R.w-4))*T,y=(R.y0+2+Math.random()*(R.h-4))*T;if(Math.abs(x-R.px)<T*3.4&&Math.abs(y-R.py)<T*2.6)continue;if(![[0,0],[T/2,T/2],[-T/2,T/2],[T/2,-T/2],[-T/2,-T/2]].every(([ox,oy])=>tile(Math.floor((x+ox)/T),Math.floor((y+oy)/T))===1))continue;add(Math.random()<.5?{k:'spike',x,y,w:T,h:T}:{k:'vent',x,y,w:T,h:T})}
  if(R.type==='combat'&&fl>=2&&Math.random()<.55){const side=ri(0,3),horiz=side<2,ry=Math.floor(R.y0+1+Math.random()*(R.h-2)),rx=Math.floor(R.x0+1+Math.random()*(R.w-2));
   const wx=side===0?R.x0-1:side===1?R.x0+R.w:rx,wy=side===2?R.y0-1:side===3?R.y0+R.h:ry;if(tile(wx,wy)===0)add({k:'dart',x:(wx+.5)*T,y:(wy+.5)*T,w:T,h:T,dir:side===0?0:side===1?Math.PI:side===2?Math.PI/2:-Math.PI/2})}})}
function updHaz(dt){if(!D.co){updHaz1(dt);return}const o=hero;for(const h of D.co.hs){if(h.gone)continue;hero=h;updHaz1(dt)}hero=o}
function updHaz1(dt){const now=D.t,h=hero;D.pools=D.pools.filter(o=>now-o.t0<o.life);D.webs=D.webs.filter(o=>now-o.t0<o.life);let sk=1;
 if(!h.dead){for(const o of D.pools)if(Math.hypot(h.x-o.x,(h.y-o.y)/.7)<o.r*.92){sk=Math.min(sk,.72);if(now>(h.poiT||0)){h.poiT=now+650;if(hurtHero(o.dm,o.x,o.y,0))sparks(h.x,h.y-10,'#7bff5a',6,3)}}
  for(const o of D.webs)if(Math.hypot(h.x-o.x,(h.y-o.y)/.7)<o.r)sk=Math.min(sk,.45)}
 if(sk<1){h.slowT=now+140;h.slowK=sk}
 for(const f of D.fall)if(now>=f.t&&!f.done){f.done=1;dust(f.x,f.y,12,'#b8a888');shake(5);sfx('crumble');for(const hh of HS()){if(hh.dead||hh.gone||Math.hypot(hh.x-f.x,(hh.y-f.y)/.8)>=f.r+hh.r*.6)continue;coAsH(hh,()=>{if(hurtHero(f.dm,f.x,f.y,7)&&f.para)paralyze()})}for(let i=0;i<3;i++){const a=rnd(0,TAU),s=rnd(2,5);part(f.x,f.y-6,Math.cos(a)*s,Math.sin(a)*s-1,rnd(300,600),'#8a8f9a',rnd(2,4),.014,'dust')}}
 D.fall=D.fall.filter(f=>!f.done);
 for(const o of D.traps){const per=o.k==='spike'?2800:o.k==='vent'?3600:2500,p=((now+o.ph)%per)/per;
  if(o.k==='spike'){o.s=p<.5?0:p<.66?1:p<.86?2:0;if(o.s===2&&!h.dead&&Math.abs(h.x-o.x)<o.w/2+h.r*.5&&Math.abs(h.y-o.y)<o.h/2+h.r*.5)hurtHero(o.dm,o.x,o.y,6)}
  else if(o.k==='vent'){o.s=p<.58?0:p<.74?1:p<.94?2:0;if(o.s===2&&!h.dead&&Math.hypot(h.x-o.x,(h.y-o.y)*1.3)<30)hurtHero(o.dm*1.15,o.x,o.y,0)}
  else{const a=Math.atan2(h.y-o.y,h.x-o.x),d=Math.hypot(h.x-o.x,h.y-o.y);if(!h.dead&&now>o.nx&&d<430&&Math.abs(ad(o.dir,a))<.5&&los(o.x+Math.cos(o.dir)*T*.6,o.y+Math.sin(o.dir)*T*.6,h.x,h.y)){o.nx=now+2400;o.fl=now;PR.push({x:o.x+Math.cos(o.dir)*T*.6,y:o.y+Math.sin(o.dir)*T*.6-14,vx:Math.cos(o.dir)*5.6,vy:Math.sin(o.dir)*5.6,r:5,dm:o.dm*.9,kb:4,from:'e',life:1900,col:'#e8e0c0',a:o.dir,arrow:true,hit:new Set()});sfx('pick')}}}}

D.fdSync=fdSync;D.tune={HPC,DMC,DIFFS};
/* ====================== comandos de mazmorra (zona de comandos, solo desarrollo) ====================== */
const MZW={espada:'sword',hacha:'axe',lanza:'spear',arco:'bow',baston:'staff',daga:'dagger',martillo:'hammer',pistola:'pistol',escopeta:'shotgun',varita:'wand'},
 MZR={comun:0,rara:1,epica:2,legendaria:3,mitica:4,divina:5},MZE={fuego:'fire',hielo:'ice',rayo:'shock',veneno:'poison'},
 MZP={nutria:'otter',golemfuego:'gfire',golemhielo:'gice',golemrayo:'gshock',golemveneno:'gpoison',golemagua:'gwater',lobo:'wolf',caballero:'knight',mago:'mage',dragon:'dragon',fenix:'phoenix'},MZS={casco:'helm',armadura:'armor',amuleto:'amulet',botas:'boots'},
 ENM={limo:'slime',slime:'slime',limito:'mini',mini:'mini',murcielago:'bat',bat:'bat',goblin:'gob',gob:'gob',esqueleto:'skel',skel:'skel',ogro:'ogre',ogre:'ogre',lobo:'wolf',golem:'golem',lich:'lich',arquitecto:'arch',arch:'arch',bobina:'coil',coil:'coil',rey:'lich',arana:'spider',huevo:'egg',egg:'egg',aranita:'spiderling',spiderling:'spiderling'},
 MZC={jugador:'vida · dios · oro N · vidamax N · escudo · inmune S · velocidad X · dano X · curarmascotas',
  mazmorra:'piso N · saltar · reiniciar · salida · mapa · abrir · ir inicio|jefe|cofre|salida|tienda|mesa|forja|sala N',
  combate:'limpiar · matar · congelar S · jefe [ogro|lobo|slime|golem|arana|lich|arquitecto] · enemigo TIPO [N] · elite TIPO',
  objetos:'cofre [0-4] · botin [N] · arma NOMBRE [calidad 0-5] [elemento] · equipo PIEZA [calidad 0-5] · mejora NOMBRE · mascota lobo|caballero|mago|dragon|fenix · runas ELEMENTO CALIDAD N · xp N',
  extras:'tienda · mesa · forja · trampa pinchos|fuego|dardos · limpiartrampas · estado · errores · esencia N · fps1 (monitor FPS) · fps2 · salir (cierra sesión de comandos)'},
 MZH='🗝️ Comandos de mazmorra (con o sin "mz" delante). Escribe ayuda CATEGORÍA para ver solo una: jugador, mazmorra, combate, objetos, extras.\n'+Object.entries(MZC).map(([k,v])=>'• '+k.toUpperCase()+': '+v).join('\n')+'\nUsar comandos desactiva las recompensas de esa partida.',
 nrm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
function rarArg(v){const x=nrm(v);if(x in MZR)return MZR[x];const n=Math.floor(+x);return isFinite(n)&&x!==''?clamp(n,0,5):null}
function mkGearOf(slot,q){const T=pick(GT.filter(x=>x.t===slot)),m={};for(const k in T.m){const v=T.m[k]*RAR[q].m;m[k]=Number.isInteger(T.m[k])?Math.max(1,Math.round(v)):Math.round(v*100)/100}
 if(q>=2&&Math.random()<.75){const x=pick(GXT),k=Object.keys(x)[0];m[k]=(m[k]||0)+x[k]}return{t:T.t,n:T.n,i:T.i,q,m}}
function freeSpot(r){for(let i=0;i<24;i++){const a=rnd(0,TAU),x=hero.x+Math.cos(a)*r,y=hero.y+Math.sin(a)*r;if(!solidT(Math.floor(x/T),Math.floor(y/T)))return[x,y]}return[hero.x,hero.y]}
D.cmd=function(a){const c=nrm(a[0]),arg=a.slice(1),v0=arg[0],nv=+String(v0).replace(',','.'),has=v0!==undefined&&isFinite(nv),N=(df,mn,mx)=>has?clamp(nv,mn,mx):df;
 if(c==='almas'||c==='esencia'){const L=DI(),n=Math.floor(N(SOUL_PET,1,1e6));L.souls+=n;try{savePref()}catch(e){}if(D.on&&!D.hub)D.cheated=1;return'✨ +'+n+' Esencia de alma (total '+L.souls+')'}
 if(c===''||c==='ayuda'||c==='help'){const cat=nrm(v0);return MZC[cat]?'• '+cat.toUpperCase()+': '+MZC[cat]:MZH}
 if(D.co)return'🗝️ Sin comandos en el modo cooperativo';if(!D.on||!hero||D.hub)return'🗝️ No hay una mazmorra activa (en la sala previa no se usan comandos de mazmorra)';
 const h=hero;let r;
 switch(c){
  case'vida':case'curar':h.hp=h.max;h.sh=h.shMax;sparks(h.x,h.y-16,'#7be07b',14,3);r='❤️ Vida y escudo al máximo';break;
  case'dios':D.god=!D.god;r=D.god?'🛡️ Modo dios ACTIVADO':'🛡️ Modo dios desactivado';break;
  case'oro':{const n=Math.floor(N(500,1,1e6));h.coins+=n;r='🪙 +'+n+' (total '+h.coins+')';break}
  case'piso':{const f=Math.floor(N(D.floor+1,1,99));D.floor=f-1;nextFloor();r='🏰 Piso '+f;break}
  case'saltar':case'siguiente':nextFloor();r='⏭️ Piso '+D.floor;break;
  case'limpiar':{const R=D.room;if(!R||R.state!=='fight'){r='🚪 No hay combate en esta sala';break}for(let p=0;p<4;p++)for(const e of E.slice())if(!e.dead&&(e.room===R||!e.room))killEnemy(e);clearRoom(R);r='🧹 Sala despejada';break}
  case'matar':{let n=0;for(const e of E.slice())if(!e.dead){killEnemy(e);n++}r='☠️ '+n+' enemigos eliminados';break}
  case'jefe':{const[x,y]=freeSpot(150),fl=D.floor,e=mkBoss(BOSSN[nrm(v0)]||bossFor(fl),x,y,fl);part(x,y,0,0,900,'#ffcf6a',50,0);shake(6);r='👹 '+EN[e.t].n+' invocado (piso '+fl+')';break}
  case'enemigo':case'elite':{const map=ENM[nrm(v0)];if(!map){r='❓ Tipos: limo, limito, murcielago, goblin, esqueleto, ogro, lobo, golem, lich, arquitecto, bobina, arana, huevo, aranita';break}
   const n=Math.floor(clamp(+arg[1]||1,1,20));for(let i=0;i<n;i++){const[x,y]=freeSpot(140+i*6),e=mkEnemy(map,x,y,D.floor,c==='elite');e.spawn=D.t+300+i*80;E.push(e);if(map==='ogre')D.boss=e}r='👾 '+n+' × '+EN[map].n;break}
  case'cofre':{const q=Math.floor(N(1,0,4));dropChest({px:h.x,py:h.y},q,q>=1);r='🎁 Cofre '+RAR[q].n;break}
  case'tienda':D.props.push(mkShop(h.x+80,h.y+10));r='🛒 Tienda colocada';break;
  case'mesa':D.props.push({k:'table',x:h.x+80,y:h.y+10,armed:true});r='🔮 Mesa de encantamiento colocada';break;
  case'forja':D.props.push({k:'forge',x:h.x-80,y:h.y+10,armed:true});r='⚒️ Forja colocada';break;
  case'arma':{const id=MZW[nrm(v0)]||(WP[nrm(v0)]?nrm(v0):null);if(!id){r='❓ Armas: '+Object.keys(MZW).join(', ');break}
   let q=0,el=null;for(const x of arg.slice(1)){const q2=rarArg(x);if(q2!==null)q=q2;else if(MZE[nrm(x)])el=MZE[nrm(x)];else if(ELS[nrm(x)])el=nrm(x)}
   D.cheated=1;const w=winst(id,q,el);equipW(h.wi,w);r='⚔️ '+wName(w)+' ('+RAR[q].n+') equipada';break}
  case'equipo':{const slot=MZS[nrm(v0)];if(!slot){r='❓ Piezas: casco, armadura, amuleto, botas';break}const q=rarArg(arg[1]);const g2=mkGearOf(slot,q===null?1:q);equipG(g2);r='🛡️ '+g2.n+' ('+RAR[g2.q].n+') equipado';break}
  case'mejora':{const x=nrm(a.slice(1).join(' ')),b=BUFFS.find(q=>q.id===x||nrm(q.n)===x);if(!b){r='❓ Mejoras: '+BUFFS.map(q=>q.id).join(', ');break}applyBuff(b);sparks(h.x,h.y-16,'#ffd84a',14,4);r=b.i+' '+b.n+': '+b.d;break}
  case'mascota':{const k=MZP[nrm(v0)]||(PET[nrm(v0)]?nrm(v0):null);if(!k){r='❓ Mascotas: lobo, caballero, mago, dragon, nutria, golemfuego/hielo/rayo/veneno/agua';break}addPet(k);r=PET[k].i+' '+PET[k].n+' se une a ti';break}
  case'velocidad':h.spdM=N(1,.5,3);r='⚡ Velocidad x'+h.spdM;break;
  case'dano':case'daño':h.dmgM=N(1,.1,50);r='💪 Daño x'+h.dmgM;break;
  case'trampa':{const k=({pinchos:'spike',fuego:'vent',dardos:'dart'})[nrm(v0)]||'spike',x=h.x+Math.cos(h.aim)*100,y=h.y+Math.sin(h.aim)*100;D.traps.push(k==='dart'?{k,x,y,w:T,h:T,dir:h.aim+Math.PI,ph:0,dm:8,nx:D.t}:{k,x,y,w:T,h:T,ph:0,dm:8,nx:D.t});r='⚠️ Trampa colocada';break}
  case'vidamax':{const n=Math.floor(N(300,10,100000));h.max=n;h.hp=n;r='❤️ Vida máxima '+n}break;
  case'escudo':h.sh=h.shMax;r='🔰 Escudo al máximo ('+h.shMax+')';break;
  case'inmune':{const s=N(10,1,600);h.inv=D.t+s*1000;r='⏳ Inmune durante '+s+' s'}break;
  case'curarmascotas':D.pets.forEach(p=>{if(p.down)petRevive(p,1);p.hp=p.max});r='🐾 Mascotas curadas';break;
  case'congelar':{const s=N(8,1,120);let n=0;for(const e of E)if(!e.dead&&!EN[e.t].boss){e.stun=D.t+s*1000;e.frzT=D.t+s*1000;n++}r='🧊 '+n+' enemigos congelados '+s+' s'}break;
  case'abrir':rooms.forEach(q=>setDoors(q,false));r='🚪 Puertas abiertas';break;
  case'mapa':rooms.forEach(q=>q.visited=1);r='🧭 Mapa revelado';break;
  case'reiniciar':{const kp=hero;buildFloor(kp);r='🔁 Piso '+D.floor+' regenerado'}break;
  case'limpiartrampas':D.traps=[];r='🧯 Trampas eliminadas';break;
  case'xp':{const g=xpState(),n=Math.floor(N(100,1,1e6));g.xp+=n;try{savePref()}catch(e){}r='⭐ +'+n+' XP (total '+g.xp+')'}break;
  case'runas':{const k=MZE[nrm(v0)],t=rarArg(arg[1]);if(!k||t===null){r='❓ Uso: runas fuego|hielo|rayo|veneno CALIDAD(0-5) [N]';break}const n=Math.floor(clamp(+arg[2]||1,1,99));DI().runes[k][t]+=n;try{savePref()}catch(e){}r=ELS[k].i+' +'+n+' runa '+RAR[t].n+' de '+ELS[k].n}break;
  case'ir':{const w=nrm(v0),B=rooms.find(q=>q.type==='boss')||rooms[rooms.length-1];let x,y;
   if(w==='inicio'){x=rooms[0].px;y=rooms[0].py}
   else if(w==='jefe'){x=B.px;y=B.py+60}
   else if(w==='cofre'){const c=D.chests.find(q=>!q.open);if(!c){r='🎁 No hay cofres cerrados en el piso';break}x=c.x;y=c.y+36}
   else if(w==='salida'){const p=PK.find(q=>q.t==='portal');if(!p){r='🚪 La salida aparece al vencer al jefe';break}x=p.x;y=p.y+14}
   else if(w==='tienda'||w==='mesa'||w==='forja'){const kk={tienda:'shop',mesa:'table',forja:'forge'}[w],o=D.props.find(q=>q.k===kk);if(!o){r='❓ No hay '+w+' en este piso';break}x=o.x;y=o.y+36}
   else if(w==='sala'){const R=rooms[Math.floor(+arg[1])-1];if(!R){r='❓ Salas: 1 a '+rooms.length;break}x=R.px;y=R.py}
   else{r='❓ Destinos: inicio, jefe, cofre, salida, tienda, mesa, forja, sala N';break}
   h.x=x;h.y=y;cam={x,y};r='📍 Teletransportado ('+w+')'}break;
  case'errores':{const a=DGART.errs.concat(D.diag);r=a.length?'🐞 '+a.join(' | '):'✅ Sin errores ni fotogramas lentos registrados';if(arg[0]==='borrar'){D.diag.length=0;DGART.errs.length=0;try{localStorage.removeItem('lithos-diag')}catch(e){}r='🧹 Registro borrado'}break}
  case'estado':{const al=E.filter(q=>!q.dead).length;r='Piso '+D.floor+' · Sala '+(Math.max(0,rooms.indexOf(D.room||rooms[0]))+1)+'/'+rooms.length+' · ❤️ '+Math.round(h.hp)+'/'+h.max+' · 🔰 '+h.sh+' · 🪙 '+h.coins+' · 👾 '+al+' · ⚠️ '+D.traps.length+' trampas · 🎒 '+D.pouch.length+'/'+POUCH_CAP+' · dios '+(D.god?'sí':'no');D.cheated=D.cheated;return r}
  case'salida':checkpoint();r='🏁 Punto de salida abierto';break;
  case'botin':{const n=Math.floor(N(3,1,12));for(let i=0;i<n&&pouchFree()>0;i++)pouchAdd(Math.random()<.6?{k:'w',w:rollWeapon(D.floor,.1)}:{k:'g',g:rollGear(D.floor,.1)});r='🎒 Botín: '+D.pouch.length+'/'+POUCH_CAP;break}
  default:return'❓ Comando desconocido. Escribe ayuda'}
 D.cheated=1;return r};
/* ====================== COOPERATIVO (v40): hasta 4 jugadores · online por código o red local ======================
   El anfitrión simula TODO (como en el Reino): los demás envían su control (joystick, ataque, esquiva) y reciben instantáneas.
   Técnica: «cambio de héroe». Las funciones de la mazmorra usan la variable global `hero`; en cooperativo se pone
   temporalmente `hero` = el jugador al que afecta cada cosa (coAsH) y al terminar se restaura a D.co.me (el jugador local).
   Dificultad: +25% de vida y daño enemigo por cada jugador conectado extra (CO_PER, ver coMul / dfx). */
const CO_PER=.25,CO_SNAP=66,CO_IN=50,CO_REV=2500,CO_FULL=22;
const CO_SKIP=new Set(['hit','hh','cape','trail','ph','sqv','hvx','hvy','wv','stepT','regT','regen','waveT','offer','oq','offT','room','tg','pdash','pswap']);
const HS=()=>D.co&&D.co.hs&&D.co.hs.length?D.co.hs:[hero];
const coById=id=>D.co?D.co.hs.find(q=>q._id===id):null;
const coAsH=(h,f)=>{if(!h)return f();const o=hero;hero=h;try{return f()}finally{hero=o}};
const coAs=(id,f)=>coAsH(id?coById(id):null,f);
const HI=()=>hero._id|0;
function coNear(x,y){let b=null,bd=1e18;for(const h of HS()){if(h.dead||h.gone)continue;const d=(h.x-x)**2+(h.y-y)**2;if(d<bd){bd=d;b=h}}return b||hero}
const coTgt=e=>coNear(e.x,e.y);
function coMul(){const n=D.co?D.co.hs.filter(h=>!h.gone).length:1;return 1+CO_PER*Math.max(0,n-1)}
function coCam(){return hero.dead?coNear(hero.x,hero.y):hero}
function coEv(e){const c=D.co;if(!c||c.evq.length>=90)return;if(e[0]==='f'&&c.evq.some(x=>x[0]==='f'&&x[1]===e[1]))return;c.evq.push(e)}
const coSend=(o,drop)=>{try{if(NB&&mp&&mp.role==='client')NB.sendHost(JSON.stringify(o),!!drop)}catch(e){}};
const coClean=s=>String(s==null?'':s).replace(/[<>&"'|]/g,'').slice(0,12);
/* ---------- serialización (instantáneas) ---------- */
function coSan(v,d,lim){const t=typeof v;if(v===null||t==='boolean'||t==='string')return v;if(t==='number')return isFinite(v)?Math.round(v*100)/100:0;
 if(t!=='object'||d>3)return undefined;
 if(Array.isArray(v)){if(v.length>(lim||60))return undefined;const a=[];for(const x of v){const s=coSan(x,d+1,lim);a.push(s===undefined?null:s)}return a}
 if(v instanceof Set||v instanceof Map||v.nodeType)return undefined;const pr=Object.getPrototypeOf(v);if(pr!==Object.prototype&&pr!==null)return undefined;
 if(d>0&&typeof v.x==='number'&&typeof v.y==='number'&&('hp' in v))return undefined;
 const o={};for(const k in v){if(k[0]==='_'||CO_SKIP.has(k))continue;const s=coSan(v[k],d+1,lim);if(s!==undefined)o[k]=s}return o}
const CO_CATS=[['E',()=>E],['PR',()=>PR],['PK',()=>PK],['ch',()=>D.chests],['pe',()=>D.pets],['po',()=>D.pools],['we',()=>D.webs],['fa',()=>D.fall],['bw',()=>D.bw],['bm',()=>D.beams],['rg',()=>D.rings],['bo',()=>D.bolts],['tr',()=>D.traps],['hs',()=>D.co.hs]];
const CO_SET={E:a=>{E=a},PR:a=>{PR=a},PK:a=>{PK=a},ch:a=>{D.chests=a},pe:a=>{D.pets=a},po:a=>{D.pools=a},we:a=>{D.webs=a},fa:a=>{D.fall=a},bw:a=>{D.bw=a},bm:a=>{D.beams=a},rg:a=>{D.rings=a},bo:a=>{D.bolts=a},tr:a=>{D.traps=a},hs:a=>{D.co.hs=a}};
const CO_SM={E:1,PK:1,pe:1,hs:1};
const coEq=(a,b)=>a===b||(a!==null&&b!==null&&typeof a==='object'&&typeof b==='object'&&JSON.stringify(a)===JSON.stringify(b));
function coCache(){const c={};for(const[cat,get]of CO_CATS){const arr=get()||[],L=[];for(const o of arr){if(cat==='E'&&o.dead)continue;if(!o._id)o._id=++D.co.nid;const s=coSan(o,0);if(s)L.push([o._id,s])}c[cat]=L}return c}
function coFloorMsg(){let s='';const a=map;for(let i=0;i<a.length;i+=8000)s+=String.fromCharCode.apply(null,a.subarray(i,i+8000));
 return{t:'dgfloor',f:D.floor,ti:(D.floor-1)%THEMES.length,W:MW,H:MH,m:btoa(s),R:coSan(rooms,0,600),diff:D.diff,sf:D.startFl}}
function coFloorSend(p){const co=D.co;if(!co||co.role!=='host')return;const m=coFloorMsg();if(!p)co.mapSent=new Uint8Array(map);else if(!co.mapSent)co.mapSent=new Uint8Array(map);
 for(const q of(p?[p]:[...co.peers.values()])){if(!q.hello)continue;co.ps.delete(q.id);mpTo(q.id,m)}}
/* ---------- anfitrión: red ---------- */
function coNet(){const co=D.co,now=performance.now();if(!co||co.role!=='host'||now-co.snapAt<CO_SNAP)return;co.snapAt=now;co.tick=(co.tick|0)+1;
 const tg=[...co.peers.values()].filter(p=>p.hello&&p.h);if(!tg.length){co.evq.length=0;return}
 if(D.banner!==co.lbn){co.lbn=D.banner;if(D.banner)coEv(['bn',D.banner])}
 if(D.bossCard!==co.lbc){co.lbc=D.bossCard;if(D.bossCard)coEv(['bc',D.bossCard])}
 if(D.fade!==co.lfd){co.lfd=D.fade;coEv(['fd',D.fade?{t:D.fade.t,to:D.fade.to}:null])}
 const cache=coCache(),md=[];if(co.mapSent&&co.mapSent.length===map.length){for(let i=0;i<map.length;i++)if(map[i]!==co.mapSent[i]){md.push(i,map[i]);co.mapSent[i]=map[i]}}
 const rs=rooms.map(r=>r.state+(r.visited?1:0)).join(','),st={k:D.kills,c:D.cleared,g:D.coinsT,b:D.bosses,f:D.floor},bs=D.boss&&!D.boss.dead&&D.boss._id||0,dr=rooms.indexOf(D.room);
 for(const p of tg){let ps=co.ps.get(p.id);if(!ps){ps={last:{}};co.ps.set(p.id,ps)}
  const full=co.tick%CO_FULL===0,u={},r={};
  for(const[cat]of CO_CATS){const L=cache[cat],prev=full?{}:(ps.last[cat]||{}),next={},up=[],rm=[];
   for(const[id,s]of L){const pv=prev[id];next[id]=s;if(!pv){up.push([id,s]);continue}let df=null;for(const k in s)if(!coEq(s[k],pv[k])){(df||(df={}))[k]=s[k]}if(df)up.push([id,df])}
   for(const id in prev)if(!(id in next))rm.push(+id);
   ps.last[cat]=next;if(up.length)u[cat]=up;if(rm.length)r[cat]=rm}
  mpTo(p.id,{t:'dgs',T:Math.round(D.t),me:p.h._id,u,r,md,rs,st,bs,dr,full:full?1:0},true);
  if(co.evq.length)mpTo(p.id,{t:'dgev',e:co.evq})}
 co.evq.length=0}
function coMsg(id,m,p){const co=D.co;if(!co||co.role!=='host')return;const h=p&&p.h;
 switch(m.t){
  case'dgin':if(h&&h._in){const x=+m.x,y=+m.y;h._in.x=isFinite(x)?clamp(x,-1,1):0;h._in.y=isFinite(y)?clamp(y,-1,1):0;h._in.atk=m.a?1:0}break;
  case'dgdash':if(h)h.pdash=1;break;
  case'dgswap':if(h)h.pswap=1;break;
  case'dgpick':if(h&&h.offer)coPick(h,m.i|0);break}}
function coLeft(id){const co=D.co;if(!co)return;const p=co.peers.get(id);co.peers.delete(id);co.ps.delete(id);if(!p||!p.h)return;const h=p.h;h.gone=true;co.hs=co.hs.filter(q=>q!==h);toast('➖ '+h.name+' salió · la dificultad baja');if(co.hs.every(q=>q.dead))coEnd('💀 El equipo ha caído')}
/* ---------- héroes ---------- */
function coLoadout(){try{const L=DI(),cl=w=>w?{id:w.id,q:w.q,el:w.el,elq:w.elq,lv:w.lv,fd:w.fd?1:0}:null,g={};for(const k in GSLOT){const x=L.eq.g[k];g[k]=x?{t:x.t,n:x.n,i:x.i,q:x.q,m:x.m}:null}return{w:[cl(L.eq.w[0]),cl(L.eq.w[1])],g}}catch(e){return null}}
function coW(o){if(!o||!WP[o.id])return null;const w=winst(o.id,clamp(o.q|0,0,6),ELS[o.el]?o.el:null,o.elq|0);w.lv=clamp(o.lv|0,0,30);if(o.fd)w.fd=1;return w}
function coMkRemote(p,R){const co=D.co,h=mkHero(R.px,R.py,null),ld=p.ld||{};h._id=++co.nid;h.pid=p.id;h.name=coClean(p.name)||'Jugador';h.sk=p.sk||'classic';h._in={x:0,y:0,atk:0};h.rv=0;
 h.wps=[coW(ld.w&&ld.w[0]),coW(ld.w&&ld.w[1])];if(!h.wps[0]&&!h.wps[1])h.wps[0]=winst('sword',0,null);h.wi=h.wps[0]?0:1;
 coAsH(h,()=>{for(const k in GSLOT){const g=ld.g&&ld.g[k];if(g&&g.m&&typeof g.m==='object'){const m={};for(const kk in g.m){const v=+g.m[kk];if(isFinite(v))m[kk]=clamp(v,-500,2000)}h.gear[k]={t:String(g.t||k).slice(0,12),n:String(g.n||'').slice(0,28),i:String(g.i||'').slice(0,4),q:clamp(g.q|0,0,6),m};applyMods(m,1)}}});
 h.hp=h.max;h.sh=h.shMax;p.h=h;return h}
function coPlace(){const R=rooms[0],hs=D.co.hs,n=hs.length;hs.forEach((h,i)=>{const a=i/n*TAU+.6,r=n>1?22:0;h.x=R.px+Math.cos(a)*r;h.y=R.py+Math.sin(a)*r*.6;h.vx=h.vy=0;h.cape.forEach((q,j)=>{q.x=q.px=h.x;q.y=q.py=h.y-24+j*5})})}
function coFloorHeroes(keep,R){const co=D.co,nm=hero;
 if(!co.init){co.init=1;nm._id=++co.nid;nm.pid=0;nm.name=coClean(pname());nm.sk=pref.sk;nm._in=null;nm.rv=0;co.hs=[nm];co.me=nm;co.peers.forEach(p=>{if(p.hello)co.hs.push(coMkRemote(p,R))});coPlace();return}
 const out=[];for(const o of co.hs){const n=o===keep?nm:mkHero(R.px,R.py,o);n._id=o._id;n.pid=o.pid;n.name=o.name;n.sk=o.sk;n._in=o._in;n.rv=0;n.dead=false;
  if(o.dead){n.hp=Math.max(10,n.max*.4);n.sh=n.shMax}else{n.hp=Math.min(n.max,n.hp+n.max*.3);n.sh=n.shMax}out.push(n)}
 co.hs=out;co.me=out.find(h=>h===nm)||out[0];hero=co.me;coPlace()}
function coAddPeer(p){const co=D.co;if(!co||co.role!=='host')return;co.peers.set(p.id,p);const l=coNear(hero.x,hero.y),h=coMkRemote(p,{px:l.x,py:l.y});h.x=l.x+rnd(-18,18);h.y=l.y+rnd(-12,12);
 h.cape.forEach((q,j)=>{q.x=q.px=h.x;q.y=q.py=h.y-24+j*5});co.hs.push(h);mpTo(p.id,{t:'dgstart',diff:D.diff});coFloorSend(p);toast('➕ '+h.name+' se unió · +25% de dificultad')}
function coStepHeroes(dt){const co=D.co,o=hero;
 for(const h of co.hs){if(h.gone)continue;hero=h;
  if(h.pid){const sj=joy,si=inp,sk=keys,I=h._in||{x:0,y:0,atk:0};joy={x:I.x,y:I.y,id:null,bx:0,by:0};inp={atk:I.atk};keys={};
   try{if(h.pdash){h.pdash=0;dash()}if(h.pswap){h.pswap=0;swapWeapon()}stepHero(dt)}finally{joy=sj;inp=si;keys=sk}}
  else stepHero(dt);
  if(!h.dead){DGART.skOv=h.sk||null;try{DGART.heroFx(h,part,dt)}finally{DGART.skOv=null}}
  if(h.offer&&D.t>(h.offT||0))coPick(h,0)}
 hero=o;
 const hs=co.hs.filter(h=>!h.gone);
 for(const h of hs){if(!h.dead)continue;const near=hs.some(q=>q!==h&&!q.dead&&Math.hypot(q.x-h.x,q.y-h.y)<46);h.rv=near?(h.rv||0)+dt*16.67:Math.max(0,(h.rv||0)-dt*33);
  if(h.rv>=CO_REV){h.dead=false;h.hp=Math.max(12,h.max*.4);h.sh=h.shMax;h.inv=D.t+2200;h.rv=0;h.vx=h.vy=0;sparks(h.x,h.y-16,'#7be07b',18,5);num(h.x,h.y-50,'¡De vuelta!','#7be07b',true);sfx('upgrade')}}
 if(hs.length&&hs.every(h=>h.dead)&&!D.over)coEnd('💀 El equipo ha caído')}
/* ---------- cofres: cada jugador elige una mejora (sin pausar a los demás) ---------- */
function coChest(c){const q=c.q||0,fl=D.floor;sfx('upgrade');
 for(const h of D.co.hs){if(h.dead||h.gone)continue;const gold=Math.round(ri(10,18)*(1+fl*.5)*(1+q*.7)*h.goldM);h.coins+=gold;D.coinsT+=gold;num(h.x,h.y-52,'+'+gold+' 🪙','#ffd84a',true);
  if(h.offer)h.oq=(h.oq||0)+1;else coOffer(h)}}
function coOffer(h){if(h.dead||h.gone)return;let opts=[];coAsH(h,()=>{const pool=BUFFS.filter(buffOk);while(opts.length<3&&pool.length){let k=Math.floor(Math.random()*pool.length);if(pool[k].q>0&&Math.random()<.4)k=Math.floor(Math.random()*pool.length);opts.push(pool.splice(k,1)[0])}});
 if(!opts.length)return;h.offer=opts.map(o=>o.id);h.offT=D.t+20000;
 if(h===D.co.me)coCardUI(opts);else mpTo(h.pid,{t:'dgcards',o:opts.map(o=>[o.id,o.i,o.n,o.d,o.q])})}
function coPick(h,i){const id=h.offer&&(h.offer[i]||h.offer[0]),b=BUFFS.find(x=>x.id===id);h.offer=null;if(b){coAsH(h,()=>{applyBuff(b);sparks(h.x,h.y-16,'#ffd84a',14,4)});num(h.x,h.y-62,'✨ '+b.n,'#ffe27a');sfx('pick')}
 if(h===D.co.me)coCardClose();else mpTo(h.pid,{t:'dgcards',o:[]});if(h.oq>0){h.oq--;setTimeout(()=>{if(D.co)coOffer(h)},500)}}
function coCardUI(opts){let b=$('cocards');if(!b){b=document.createElement('div');b.id='cocards';b.style.cssText='position:absolute;left:0;right:0;bottom:92px;display:flex;gap:8px;justify-content:center;z-index:9;padding:0 8px;pointer-events:none';$('dgui').appendChild(b)}
 b.innerHTML='';opts.forEach((o,i)=>{const d=document.createElement('button');d.className='dgcard';d.style.cssText='pointer-events:auto;max-width:31%;min-width:0;padding:6px 4px;border-color:'+rc(Math.min(3,o.q+1));d.innerHTML='<i>'+o.i+'</i><b>'+o.n+'</b><small>'+o.d+'</small>';
  d.onclick=()=>{if(D.co.role==='host')coPick(D.co.me,i);else{coSend({t:'dgpick',i});coCardClose()}};b.append(d)});b.style.display='flex'}
function coCardClose(){const b=$('cocards');if(b){b.style.display='none';b.innerHTML=''}}
/* ---------- dibujo ---------- */
function coDown(h){g.save();shadowAt(h.x,h.y+2,12,5,.3);g.globalAlpha=.85;g.font='20px serif';g.textAlign='center';g.fillText('🪦',h.x,h.y-2);const p=clamp((h.rv||0)/CO_REV,0,1);
 g.lineWidth=1.5;g.setLineDash([4,4]);g.strokeStyle='rgba(123,224,123,.55)';g.beginPath();g.arc(h.x,h.y-8,46,0,TAU);g.stroke();g.setLineDash([]);
 if(p>0){g.beginPath();g.arc(h.x,h.y-8,20,-Math.PI/2,-Math.PI/2+TAU*p);g.lineWidth=4;g.strokeStyle='#7be07b';g.stroke()}g.restore()}
function coTags(){if(HS().length<2)return;for(const h of HS()){if(h.gone)continue;g.save();g.font='bold 11px Trebuchet MS,sans-serif';g.textAlign='center';g.lineWidth=3;g.strokeStyle=OLC;g.fillStyle=h===hero?'#ffe27a':'#cfe6ff';const y=h.y-(h.dead?24:64);g.strokeText(h.name||'',h.x,y);g.fillText(h.name||'',h.x,y);g.restore()}}
function coHud(){let el=$('cohud');if(!el){el=document.createElement('div');el.id='cohud';el.style.cssText='position:absolute;left:8px;top:96px;z-index:6;pointer-events:none;font:700 11px Trebuchet MS,sans-serif;color:#fff;text-shadow:0 1px 2px #000';$('dgui').appendChild(el)}
 const hs=HS().filter(h=>!h.gone),key=hs.map(h=>h.name+'|'+Math.ceil(h.hp)+'|'+(h.dead?1:0)+'|'+(h===hero?1:0)).join(';');if(el._k===key)return;el._k=key;
 el.innerHTML=hs.map(h=>'<div style="margin:3px 0;opacity:'+(h.dead?.55:1)+'">'+(h===hero?'⭐ ':'')+coClean(h.name)+(h.dead?' 💀':'')+'<div style="height:5px;background:#0008;border-radius:3px;overflow:hidden;width:84px"><div style="height:100%;width:'+Math.round(clamp(h.hp/h.max,0,1)*100)+'%;background:'+(h.dead?'#777':'#e8554a')+'"></div></div></div>').join('')}
/* ---------- inicio / fin ---------- */
function coBase(role,diff,extra){Object.assign(D,{on:true,t:0,born:-1e9,fade:null,paused:false,over:false,floor:1,startFl:1,floors:0,cleared:0,kills:0,bosses:0,coinsT:0,souls:0,loot:[],deadShown:false,frz:0,shk:0,bs:{g:0,x:0,d:0},dying:0,noShop:0,pets:[],props:[],bolts:[],rings:[],god:false,cheated:false,pouch:[],rep:[],forfeit:false,hub:false,diff:diff!=null?diff:1,banner:null,bossCard:null,boss:null,
  co:Object.assign({role,hs:[],me:null,nid:0,evq:[],tick:0,snapAt:0},extra)})}
function coUi(){lastN=performance.now();$('menu').style.display='none';try{$('lan').style.display='none'}catch(e){}$('stage').classList.add('dgm');$('dgui').style.display='block';$('dgp').style.display='none';hudC={}}
function coHostStart(m){if(D.on)return;coBase('host',m.diff,{peers:new Map(),ps:new Map(),init:0,mapSent:null});
 m.peers.forEach(p=>{if(p.hello){D.co.peers.set(p.id,p);mpTo(p.id,{t:'dgstart',diff:D.diff})}});
 try{fdSync()}catch(e){}buildFloor(null);applyLoadout();
 try{if(pref.fd&&pref.fd.pet&&!pref.fd.petOff)addPet('phoenix')}catch(e){}try{if(fdOn('pet'))addPet('firefly')}catch(e){}try{const L=DI();if(L.petSel&&L.pets.includes(L.petSel)&&PET[L.petSel])addPet(L.petSel)}catch(e){}
 coUi();setTimeout(()=>{if(D.co)toast('👥 Cooperativo: +25% de dificultad por jugador · acércate a un compañero caído para revivirlo')},700)}
function coBegin(m){if(D.on&&D.co)return;coBase('client',m.diff,{reg:{},ready:false,fl:0,inAt:0});Object.assign(D,{chests:[],pools:[],webs:[],fall:[],bw:[],beams:[],traps:[]});E=[];PR=[];PT=[];PK=[];NUM=[];hero=mkHero(0,0,null);coUi()}
function coCFloor(m){const co=D.co;if(!co||co.role!=='client')return;const s=atob(m.m),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);
 th=THEMES[m.ti];MW=m.W;MH=m.H;map=a;rooms=m.R;doors=[];const pf0=D.floor;D.floor=m.f;if(pf0&&m.f===pf0+1)try{fdMile(pf0)}catch(e){}D.startFl=m.sf;D.diff=m.diff;DGART.prep(rooms,tile,MW,MH,m.ti,th);
 E=[];PR=[];PT=[];PK=[];NUM=[];Object.assign(D,{chests:[],pools:[],webs:[],fall:[],bw:[],beams:[],traps:[],props:[],bolts:[],rings:[],pets:[],boss:null,room:rooms[0],fade:null,banner:null,bossCard:null,born:D.t});
 co.reg={};co.hs=[];co.ready=false;co.fl=1;coCardClose()}
function coCSnap(S){const co=D.co;if(!co||!co.fl)return;
 if(Math.abs(D.t-S.T)>150||!co.ready)D.t=S.T;else D.t+=(S.T-D.t)*.35;
 for(const cat in S.u){const reg=co.reg[cat]||(co.reg[cat]=new Map());for(const[id,df]of S.u[cat]){let o=reg.get(id);if(!o){o={_id:id};reg.set(id,o)}
   const had=o.x!==undefined,px=o.x,py=o.y;Object.assign(o,df);if(had&&CO_SM[cat]&&('x' in df||'y' in df)){o._tx=o.x;o._ty=o.y;o.x=px;o.y=py}}}
 for(const cat in S.r){const reg=co.reg[cat];if(!reg)continue;for(const id of S.r[cat]){if(cat==='E'){const o=reg.get(id);if(o&&o.t!=='coil'&&o.t!=='egg'){try{DGART.death(o,part)}catch(e){}}}reg.delete(id)}}
 for(const[cat]of CO_CATS){if(S.u[cat]||S.r[cat]){const reg=co.reg[cat];if(reg){let a=[...reg.values()];if(cat==='hs')a.sort((p,q)=>p._id-q._id);CO_SET[cat](a)}}}
 for(let i=0;i<S.md.length;i+=2)map[S.md[i]]=S.md[i+1];
 const rs=S.rs.split(',');rooms.forEach((r,i)=>{const s=rs[i]||'';r.state=s.slice(0,-1);r.visited=s.slice(-1)==='1'});
 D.room=rooms[S.dr]||D.room;D.kills=S.st.k;D.cleared=S.st.c;D.coinsT=S.st.g;D.bosses=S.st.b;
 const reg=co.reg.E;D.boss=S.bs&&reg?reg.get(S.bs)||null:null;
 const me=co.reg.hs&&co.reg.hs.get(S.me);if(me){co.me=me;hero=me;if(!co.ready){co.ready=true;cam={x:me.x,y:me.y}}}}
function coCEv(L){const co=D.co;if(!co)return;for(const e of L){switch(e[0]){case'n':num(e[1],e[2],e[3],e[4],!!e[5]);break;case'f':sfx(e[1]);break;case'k':shake(e[1]);break;case'p':sparks(e[1],e[2],e[3],e[4],e[5]);break;case'd':dust(e[1],e[2],e[3],e[4]);break;
  case'bn':D.banner=e[1];break;case'bc':D.bossCard=e[1];break;case'fd':D.fade=e[1];break;case'hu':if(co.me&&e[1]===co.me._id){shake(6);sfx('hurtP')}break}}}
function coCUpdate(dt){const co=D.co;if(!co.ready)return;D.t+=dt*16.67;const k=1-Math.pow(.62,dt);
 for(const arr of[E,PK,D.pets,co.hs])for(const o of arr)if(o._tx!==undefined){o.x+=(o._tx-o.x)*k;o.y+=(o._ty-o.y)*k}
 for(const p of PR){p.x+=p.vx*dt;p.y+=p.vy*dt}
 for(const e of E){e.ph=(e.ph||0)+Math.hypot(e.vx||0,e.vy||0)*.17*dt;if(e.sqv===undefined)e.sqv=0}
 for(const h of co.hs){if(!h.cape){h.cape=[];for(let i=0;i<7;i++)h.cape.push({x:h.x,y:h.y-24+i*5,px:h.x,py:h.y-24+i*5})}if(!h.trail)h.trail=[];h.sqv=h.sqv||0;
  const spd=Math.hypot(h.vx||0,h.vy||0);h.ph=(h.ph||0)+spd*.15*dt;
  const anc={x:h.x-(h.face||1)*3,y:h.y-25},c=h.cape;c[0].x=anc.x;c[0].y=anc.y;
  for(let i=1;i<c.length;i++){const p=c[i],vx=(p.x-p.px)*.9,vy=(p.y-p.py)*.9;p.px=p.x;p.py=p.y;p.x+=vx;p.y+=vy+.38*dt}
  for(let it=0;it<3;it++){for(let i=1;i<c.length;i++){const a=c[i-1],b=c[i];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const df=(d-5.5)/d;if(i===1){b.x-=dx*df;b.y-=dy*df}else{a.x+=dx*df*.5;b.x-=dx*df*.5;a.y+=dy*df*.5;b.y-=dy*df*.5}}c[0].x=anc.x;c[0].y=anc.y}
  for(let i=1;i<c.length;i++){c[i].x-=(h.vx||0)*.12*i*.3;c[i].y-=(h.vy||0)*.05*i*.3}
  if(!h.dead){DGART.skOv=h.sk||null;try{DGART.heroFx(h,part,dt)}finally{DGART.skOv=null}}}
 for(const p of PT){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*16*dt;p.l-=dt*16.67}PT=PT.filter(p=>p.l>0);
 NUM=NUM.filter(n=>D.t-n.t<900);for(const n of NUM)n.y+=n.vy*dt*.6;
 camStep(dt);
 const now=performance.now();if(now-co.inAt>CO_IN){co.inAt=now;let ix=joy.x,iy=joy.y;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;if(keys.w||keys.arrowup)iy-=1;if(keys.s||keys.arrowdown)iy+=1;const il=Math.hypot(ix,iy);if(il>1){ix/=il;iy/=il}
  const a=(inp.atk||keys[' ']||keys.j)?1:0,key=ix.toFixed(2)+'|'+iy.toFixed(2)+'|'+a;if(key!==co.lastIn||now-(co.inT||0)>300){co.lastIn=key;co.inT=now;coSend({t:'dgin',x:+ix.toFixed(2),y:+iy.toFixed(2),a},true)}}}
function coEnd(title){const co=D.co;if(!co||D.over)return;D.over=true;for(const h of co.hs)try{coAsH(h,restoreFx)}catch(e){}
 let dm=Math.floor(D.cleared/2)+D.bosses*2+Math.max(0,D.floor-(D.startFl||1))*2;dm=Math.round(dm*dfx().rw);
 const m={t:'dgend',title,fl:D.floor,cl:D.cleared,ki:D.kills,co:D.coinsT,dm,pl:co.hs.map(h=>[h.name,h.kills|0])};co.peers.forEach(p=>{if(p.hello)mpTo(p.id,m)});coResults(m)}
function coResults(m){D.over=true;coCardClose();try{if(!pref.dg||typeof pref.dg!=='object')pref.dg={best:0,runs:0,kills:0};pref.dg.cbest=Math.max(pref.dg.cbest||0,m.fl|0);if(m.dm>0)gain(m.dm,1);savePref()}catch(e){}
 const box=$('dgp');box.innerHTML='<div class="tpb dgc"><h3>'+String(m.title||'').replace(/[<>&]/g,'')+'</h3><div class="dgr"><div>🏰 Piso alcanzado: <b>'+(m.fl|0)+'</b> (récord cooperativo '+(pref.dg.cbest|0)+')</div><div>🚪 Salas limpias: <b>'+(m.cl|0)+'</b></div><div>☠️ Enemigos: <b>'+(m.ki|0)+'</b></div><div>🪙 Monedas: <b>'+(m.co|0)+'</b></div>'+(m.pl||[]).map(x=>'<div>👤 '+coClean(x[0])+': <b>'+(x[1]|0)+'</b> bajas</div>').join('')+'<div class="dgm2">💎 +'+(m.dm|0)+'</div></div><button class="b" id="dgmenu">🏠 Menú</button></div>';box.style.display='flex';try{fdResultsHook(box)}catch(e){}
 $('dgmenu').onclick=()=>{box.style.display='none';if(mp)mpLeave();else coStop()}}
function coStop(){if(!D.co)return;D.co=null;DGART.skOv=null;try{restoreFx()}catch(e){}coCardClose();const a=$('cohud');if(a)a.remove();const b=$('cocards');if(b)b.remove();D.over=false;E=[];PR=[];leave(false)}
function coPause(){const box=$('dgp'),host=D.co.role==='host';box.innerHTML='<div class="tpb dgc"><h3>⏸️ Cooperativo</h3><div class="dgr"><div>La partida sigue para tus compañeros.</div></div><button class="b" id="cop1">▶ Continuar</button><button class="b" id="cop2" style="background:#6a2a2a">'+(host?'🏳️ Terminar para todos':'🚪 Salir de la sala')+'</button></div>';box.style.display='flex';
 $('cop1').onclick=()=>{box.style.display='none'};$('cop2').onclick=()=>{box.style.display='none';if(host)coEnd('🏳️ Partida terminada por el anfitrión');else mpLeave('Saliste de la sala')}}
function coCMsg(m){switch(m.t){case'dgstart':coBegin(m);break;case'dgfloor':coCFloor(m);break;case'dgs':coCSnap(m);break;case'dgev':coCEv(m.e);break;
 case'dgcards':if(m.o&&m.o.length)coCardUI(m.o.map(o=>({id:o[0],i:o[1],n:o[2],d:o[3],q:o[4]})));else coCardClose();break;case'dgend':coResults(m);break}}
Object.assign(D,{coHostStart,coAddPeer,coMsg,coCMsg,coLeft,coStop,coLoadout,coMul});
D.frame=frame;D.start=start;D.dbg=()=>({hero,E,rooms,D,PR,PK,map,MW,MH,T});D.mkShop=(x,y)=>mkShop(x,y);D.addPet=k=>addPet(k);D.dropFd=(t,n,v)=>{if(!D.on||D.hub||D.co||D.cheated||D.over||D.floor%EXIT_EVERY===0)return false;D.pend=D.pend||[];D.pend.push({t:t==='soul'?'fsoul':'fgem',n,v});return true};D.addSouls=n=>{try{DI().souls=(DI().souls||0)+n;savePref()}catch(e){}};D.mk=(t,x,y)=>{const e=mkEnemy(t,x,y,1);E.push(e);return e};
window.dgStart=start;
})();
