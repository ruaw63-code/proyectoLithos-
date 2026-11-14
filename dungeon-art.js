/* ============================================================================
   ARTE DE LA MAZMORRA (v24) — dibujo detallado y animado de todo el modo Mazmorra
   Se carga ANTES de dungeon.js. Expone window.DGART. No toca la lógica: solo dibuja y emite partículas.
   Contenido: utilidades de dibujo · héroe con las 21 skins del Rey (alas, halos, colmillos, sombreros, armas,
   efectos) · armas con estilo por skin · enemigos por tema de piso · jefe Ogro · proyectiles · objetos ·
   escenario (suelo, muros con ladrillos, antorchas, decoración, puertas de energía, partículas ambientales).
   ============================================================================ */
(()=>{'use strict';
const TAU=Math.PI*2,PI=Math.PI,OL='#161622';
const clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a);
let g=null,t=0,th=null,ti=0,FL=false;
const A=window.DGART={};
/* v39: contador de save/restore y guarda de dibujo: si UNA cosa lanza un error al dibujarse, se deshace su estado
   (clip, alpha, modo 'lighter', transformaciones) y el resto del fotograma se sigue dibujando. */
A.errs=[];
function trackCtx(c){if(c.__d!==undefined)return;c.__d=0;const s=c.save.bind(c),r=c.restore.bind(c);c.save=()=>{c.__d++;s()};c.restore=()=>{if(c.__d>0){c.__d--;r()}}}
A.begin=(ctx,time,theme,idx)=>{trackCtx(ctx);while(ctx.__d>0)ctx.restore();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';try{ctx.setLineDash([])}catch(e){}g=ctx;t=time;th=theme;ti=idx||0;FL=false};
A.guard=function(fn,tag){const c=g,d=c.__d||0;try{fn()}catch(e){while((c.__d||0)>d)c.restore();c.globalAlpha=1;c.globalCompositeOperation='source-over';FL=false;
  const m=(tag||'')+': '+(e&&e.message);if(A.errs.length<30&&!A.errs.includes(m)){A.errs.push(m);try{console.error('[dibujo] '+m,e&&e.stack)}catch(_){}}}};
/* ---------- color ---------- */
const PC=new Map(),SC=new Map();
const hex2=n=>{n=Math.round(clamp(n,0,255));return(n<16?'0':'')+n.toString(16)};
function hsl2rgb(h,s,l){h=((h%360)+360)%360/360;const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=x=>{x=(x+1)%1;return x<1/6?p+(q-p)*6*x:x<.5?q:x<2/3?p+(q-p)*(2/3-x)*6:p};return[f(h+1/3)*255,f(h)*255,f(h-1/3)*255]}
function parse(c){let r=PC.get(c);if(r)return r;
 if(c[0]==='#'){let s=c.slice(1);if(s.length===3)s=s[0]+s[0]+s[1]+s[1]+s[2]+s[2];r=[parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]}
 else{const m=/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/.exec(c);r=m?hsl2rgb(+m[1],+m[2]/100,+m[3]/100):[128,128,128]}
 if(PC.size>2500)PC.clear();PC.set(c,r);return r}
function shade(c,f){const k=c+'|'+f;let v=SC.get(k);if(v)return v;const[r,gg,b]=parse(c),m=f>0?255:0,a=Math.abs(f);v='#'+hex2(r+(m-r)*a)+hex2(gg+(m-gg)*a)+hex2(b+(m-b)*a);if(SC.size>4000)SC.clear();SC.set(k,v);return v}
function alpha(c,a){const[r,gg,b]=parse(c);return'rgba('+(r|0)+','+(gg|0)+','+(b|0)+','+a+')'}
const K=c=>FL?'#fff':c;
const hsl=(h,s,l)=>'hsl('+(Math.floor(h)%360)+','+s+'%,'+l+'%)';
/* ---------- primitivas ---------- */
function path(p,close){g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);if(close)g.closePath()}
function poly(p,c,lw,st){path(p,1);g.fillStyle=K(c);g.fill();if(lw!==0){g.lineWidth=lw||2;g.strokeStyle=st||OL;g.lineJoin='round';g.stroke()}}
function lg(x0,y0,x1,y1,a,b,m){const r=g.createLinearGradient(x0,y0,x1,y1);r.addColorStop(0,K(a));if(m)r.addColorStop(.5,K(m));r.addColorStop(1,K(b));return r}
function rg(x,y,r0,r1,a,b,m){const r=g.createRadialGradient(x,y,r0,x,y,r1);r.addColorStop(0,K(a));if(m)r.addColorStop(.55,K(m));r.addColorStop(1,K(b));return r}
function ball(x,y,r,c,lw){const gr=g.createRadialGradient(x-r*.38,y-r*.42,r*.08,x,y,r*1.02);gr.addColorStop(0,K(shade(c,.5)));gr.addColorStop(.55,K(c));gr.addColorStop(1,K(shade(c,-.42)));g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=gr;g.fill();if(lw!==0){g.lineWidth=lw||2.2;g.strokeStyle=OL;g.stroke()}}
function ell(x,y,rx,ry,c,rot,lw){const gr=g.createLinearGradient(x-rx,y-ry,x+rx,y+ry);gr.addColorStop(0,K(shade(c,.32)));gr.addColorStop(1,K(shade(c,-.34)));g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,TAU);g.fillStyle=gr;g.fill();if(lw!==0){g.lineWidth=lw||2.2;g.strokeStyle=OL;g.stroke()}}
function limb(x1,y1,x2,y2,w,c){g.lineCap='round';g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.lineWidth=w+2.8;g.strokeStyle=OL;g.stroke();g.lineWidth=w;g.strokeStyle=K(c);g.stroke();g.lineWidth=Math.max(1,w*.26);g.strokeStyle=K(shade(c,.4));g.beginPath();g.moveTo(x1-.5,y1-.7);g.lineTo(x2-.5,y2-.7);g.stroke()}
function rect(x,y,w,h,c,lw,rad){g.beginPath();if(rad&&g.roundRect)g.roundRect(x,y,w,h,rad);else g.rect(x,y,w,h);g.fillStyle=K(c);g.fill();if(lw!==0){g.lineWidth=lw||1.8;g.strokeStyle=OL;g.lineJoin='round';g.stroke()}}
function dot(x,y,r,c){g.beginPath();g.arc(x,y,r,0,TAU);g.fillStyle=K(c);g.fill()}
function line(x1,y1,x2,y2,w,c){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.lineWidth=w;g.strokeStyle=K(c);g.lineCap='round';g.stroke()}
const GSP=new Map();
function glowSpr(c){let s=GSP.get(c);if(s)return s;if(GSP.size>160)GSP.clear();s=document.createElement('canvas');s.width=s.height=64;const x=s.getContext('2d'),gr=x.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,alpha(c,1));gr.addColorStop(1,alpha(c,0));x.fillStyle=gr;x.fillRect(0,0,64,64);GSP.set(c,s);return s}
function glow(x,y,r,c,a){if(!(r>0)||!(a>0))return;const pa=g.globalAlpha;g.globalAlpha=pa*Math.min(1,a);g.drawImage(glowSpr(c),x-r,y-r,r*2,r*2);g.globalAlpha=pa}
function add(fn){g.save();g.globalCompositeOperation='lighter';fn();g.restore()}
function shadow(x,y,rx,ry,a){g.save();g.globalAlpha*=a||.34;g.fillStyle='#000';g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();g.restore()}
function star(x,y,r,c,rot){g.save();g.translate(x,y);g.rotate(rot||0);g.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU,rr=i%2?r*.28:r;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.closePath();g.fillStyle=c;g.fill();g.restore()}
function flameShape(x,y,w,h,c1,c2,ph){const s=Math.sin(t/60+ph)*w*.25;g.beginPath();g.moveTo(x-w/2,y);g.bezierCurveTo(x-w*.6,y-h*.45,x-w*.15+s,y-h*.7,x+s*1.4,y-h);g.bezierCurveTo(x+w*.2+s,y-h*.65,x+w*.62,y-h*.4,x+w/2,y);g.closePath();const gr=g.createLinearGradient(0,y,0,y-h);gr.addColorStop(0,c1);gr.addColorStop(1,c2);g.fillStyle=gr;g.fill()}
const hash=(x,y)=>((x*73856093)^(y*19349663))>>>0;
const eo=v=>1-Math.pow(1-clamp(v,0,1),3);
/* aim → desplazamiento de las pupilas */
const look=(aim,face)=>{const al=Math.atan2(Math.sin(aim||0),Math.cos(aim||0)*face);return[Math.cos(al)*1.4,Math.sin(al)*1.1]};
/* ====================== paleta del héroe (según la skin de Rey equipada) ====================== */
const curSkin=()=>{try{return SKINS.find(q=>q.id===(A.skOv||pref.sk))||SKINS[0]}catch(e){return{id:'classic',ar:'team',sh:'#9aa6b5',cp:'#d83a3a',cr:'#f2c230',cs:'spike',gem:'#d83a3a',bl:'#c9d1d6',gd:'#e0a020'}}};
function heroPal(S){const hue=Math.floor(t/14)%360,pc=c=>c==='team'?'#4f86e6':c==='rb'?hsl(hue,85,58):c;
 const acc=S.glow||S.aura||(S.fx&&S.fx[0])||S.gem||'#c46cff';
 return{S,id:S.id,body:pc(S.ar),helm:S.sh==='#9aa6b5'?'#aab6c6':pc(S.sh),cape:S.cp==='rb'?hsl(hue+140,70,46):S.cp,crest:pc(S.cr),skin:S.sc||(S.skull?'#efe9d0':'#f1c79c'),gem:S.id==='rainbow'?hsl(hue+60,90,70):S.gem,bl:S.bl,gd:S.gd,acc:A._elc||(S.id==='rainbow'?hsl(hue+90,90,64):acc),hue}}
A.accent=()=>{if(A._elc)return A._elc;try{const S=curSkin();return S.id==='rainbow'?hsl(Date.now()/14+90,90,64):(S.glow||S.aura||(S.fx&&S.fx[0])||S.gem||'#c46cff')}catch(e){return'#c46cff'}};
A.skinId=()=>curSkin().id;
/* ====================== armas (estilo por skin) ====================== */
const BS={classic:'str',gold:'str',shadow:'crys',ice:'crys',fire:'flame',forest:'wood',bone:'bone',samurai:'kat',rainbow:'rb',orc:'str',archer:'str',hunter:'str',vamp:'rap',demon:'serr',ghost:'spec',dragonk:'drag',divine:'rad',mite:'sting',pirate:'cut',ninja:'kat',arena:'str',space:'saber'};
function bpath(st,L){g.beginPath();
 if(st==='kat'||st==='sting'){g.moveTo(0,-2.6);g.quadraticCurveTo(L*.55,-4.4,L+10,-8);g.quadraticCurveTo(L*.7,2.8,0,2.8)}
 else if(st==='cut'){g.moveTo(0,-3);g.quadraticCurveTo(L*.5,-5.5,L+8,-11);g.quadraticCurveTo(L*.8,3,L*.5,5.4);g.lineTo(0,4.4)}
 else if(st==='rap'){g.moveTo(0,-1.8);g.lineTo(L+12,0);g.lineTo(0,1.8)}
 else if(st==='serr'||st==='bone'){g.moveTo(0,-3.6);g.lineTo(L-6,-3.6);g.lineTo(L+9,0);const s=(L-8)/5;for(let i=0;i<5;i++){const x=L-6-i*s;g.lineTo(x-s*.1,6.4);g.lineTo(x-s*.6,2.9)}g.lineTo(0,3.6)}
 else if(st==='crys'){g.moveTo(0,-3.8);g.lineTo(L*.3,-5);g.lineTo(L+11,0);g.lineTo(L*.3,5);g.lineTo(0,3.8)}
 else if(st==='rad'){g.moveTo(0,-4.6);g.lineTo(L-10,-4.6);g.lineTo(L+11,0);g.lineTo(L-10,4.6);g.lineTo(0,4.6)}
 else if(st==='drag'){g.moveTo(0,-4);g.lineTo(L-8,-4);g.lineTo(L+9,0);g.lineTo(L-8,4);g.lineTo(0,4)}
 else{g.moveTo(0,-3.5);g.lineTo(L-8,-3.5);g.lineTo(L+8,0);g.lineTo(L-8,3.5);g.lineTo(0,3.5)}
 g.closePath()}
function grip(P,st){rect(-10,-2.2,10,4.4,st==='bone'?'#d9d3b8':st==='saber'?'#3a4050':'#5a3a22',1.6,1.5);g.strokeStyle='rgba(0,0,0,.38)';g.lineWidth=1.1;for(let i=0;i<4;i++){g.beginPath();g.moveTo(-9+i*2.6,-2.2);g.lineTo(-7+i*2.6,2.2);g.stroke()}ball2(-11.5,0,3,st==='bone'?'#e8e2c8':P.gd,st==='rb'?P.gem:null)}
function ball2(x,y,r,c,gem){ball(x,y,r,c);if(gem)dot(x,y,r*.45,gem)}
function guard(st,P){const gd=P.gd;
 if(st==='kat'){g.beginPath();g.ellipse(1,0,3.2,7.4,0,0,TAU);g.fillStyle=K(gd);g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();dot(1,0,1.5,P.bl);dot(1,-4.6,.9,P.bl);dot(1,4.6,.9,P.bl)}
 else if(st==='cut'){g.beginPath();g.arc(-1,0,8.4,-1.25,1.25);g.lineWidth=4.8;g.strokeStyle=OL;g.stroke();g.lineWidth=2.6;g.strokeStyle=K(gd);g.stroke();rect(-1.4,-8.4,3.4,16.8,gd,1.8,1.5)}
 else if(st==='rap'){g.beginPath();g.ellipse(1.5,0,4,8.6,0,0,TAU);g.fillStyle=K(gd);g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();g.beginPath();g.ellipse(1.5,0,2,5.6,0,0,TAU);g.fillStyle='#1a0610';g.fill();dot(-1,0,2,P.gem)}
 else if(st==='saber'){rect(-2,-5.4,8,10.8,'#2a2f3a',1.8,2);rect(-2,-1.6,8,3.2,'#4cf0ff',0);rect(3,-6,2,2,'#ff5a4a',0);rect(3,4,2,2,'#7be07b',0)}
 else if(st==='rad'){poly([[-1,-3],[3,-9],[1,-14],[8,-6],[6,-3],[6,3],[8,6],[1,14],[3,9],[-1,3]],'#ffe27a',1.8);dot(2,0,2.2,'#fff')}
 else if(st==='serr'||st==='drag'){poly([[-2,-3],[1,-9],[5,-12],[5,-3],[5,3],[5,12],[1,9],[-2,3]],gd,1.8)}
 else if(st==='bone'){rect(-1.4,-8,3.4,16,'#e8e2c8',1.8,1.5);ball(1,-8,2.4,'#e8e2c8');ball(1,8,2.4,'#e8e2c8')}
 else{rect(-1.4,-8.4,4.4,16.8,gd,2,2);ball(.8,-8.4,1.8,gd);ball(.8,8.4,1.8,gd);dot(.8,0,1.2,P.gem)}}
function blade(st,L,P){
 if(st==='saber'){const pu=.85+.15*Math.sin(t/50);add(()=>{glow(L/2+4,0,L*.8,'#4cf0ff',.5*pu)});g.lineCap='round';for(const[w,c]of[[10,'rgba(76,240,255,.28)'],[6,'rgba(150,250,255,.7)'],[3,'#ffffff']]){g.beginPath();g.moveTo(3,0);g.lineTo(L+8,0);g.lineWidth=w;g.strokeStyle=c;g.stroke()}return}
 const bl=st==='spec'?'#bfefff':st==='wood'?'#a8743a':st==='sting'?'#f0b040':st==='drag'?'#ffd84a':st==='bone'?'#e8e2c8':P.bl;
 if(st==='spec'){g.save();g.globalAlpha*=.72;add(()=>glow(L/2,0,L*.7,'#9be7ff',.4))}
 bpath(st,L);let fill;
 if(st==='rb'){fill=g.createLinearGradient(0,0,L,0);for(let i=0;i<=4;i++)fill.addColorStop(i/4,K(hsl(P.hue+i*40,90,66)))}
 else if(st==='flame')fill=lg(0,-4,0,4,'#ffd8a0','#b8441a','#ff8a30');
 else fill=lg(0,-4.8,0,4.8,shade(bl,.6),shade(bl,-.34),bl);
 g.fillStyle=fill;g.fill();g.lineWidth=2;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
 g.save();bpath(st,L);g.clip();
 g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=1.1;g.beginPath();g.moveTo(4,-1.9);g.lineTo(L+4,-1.3);g.stroke();
 g.strokeStyle='rgba(40,60,90,.42)';g.lineWidth=1;g.beginPath();g.moveTo(3,1);g.lineTo(L-2,1);g.stroke();
 const gx=((t/4.5)%(L*3))-L*.5;if(gx>0&&gx<L-4){g.fillStyle='rgba(255,255,255,.65)';g.save();g.translate(gx,0);g.rotate(.4);g.fillRect(0,-8,2.4,16);g.restore()}
 if(st==='kat'){g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1;g.beginPath();for(let i=0;i<=10;i++){const x=6+i*(L-6)/10;i?g.lineTo(x,.6+Math.sin(i*1.7)*.8):g.moveTo(x,.6)}g.stroke()}
 if(st==='crys'||st==='rad'){g.strokeStyle=alpha(P.acc,.7);g.lineWidth=1.2;g.beginPath();g.moveTo(3,0);g.lineTo(L+4,0);g.stroke();g.fillStyle='rgba(255,255,255,.3)';g.beginPath();g.moveTo(L*.3,-5);g.lineTo(L+11,0);g.lineTo(L*.3,0);g.fill()}
 if(st==='serr'){g.strokeStyle='rgba(255,60,40,.75)';g.lineWidth=1.4;g.beginPath();g.moveTo(3,0);g.lineTo(L+4,0);g.stroke()}
 if(st==='drag'){g.strokeStyle='#d6282c';g.lineWidth=1.6;g.beginPath();g.moveTo(4,0);g.lineTo(L,0);g.stroke()}
 if(st==='wood'){g.strokeStyle='rgba(60,30,10,.5)';g.lineWidth=.9;for(let i=0;i<5;i++){g.beginPath();g.moveTo(5+i*6,-3);g.lineTo(8+i*6,3);g.stroke()}}
 g.restore();
 if(st==='crys'){poly([[L*.3,-4.6],[L*.3-3,-10],[L*.3+5,-5]],shade(bl,.35),1.4);poly([[L*.55,4.6],[L*.55-2,10],[L*.55+5,4.8]],shade(bl,.1),1.4);add(()=>glow(L*.6,0,16,P.acc,.35+.15*Math.sin(t/120)))}
 if(st==='drag'){for(let i=0;i<3;i++)poly([[8+i*8,-4],[10+i*8,-9],[13+i*8,-4]],'#d6282c',1.4)}
 if(st==='flame'){add(()=>{glow(L*.55,-2,20,'#ff7a1a',.45)});for(let i=0;i<7;i++){const x=5+i*(L-4)/6,hh=7+Math.sin(t/70+i*1.7)*3.5+(i%2)*2;flameShape(x,-3.2,6.5,hh,'#ff7a1a','#ffe27a',i)}}
 if(st==='rad'){add(()=>{glow(L*.55,0,24,'#ffe9a0',.5+.15*Math.sin(t/110));for(let i=0;i<3;i++){const a=t/300+i*2.1;star(L*.2+Math.cos(a)*L*.5+L*.3,Math.sin(a*1.3)*5,3.2,'rgba(255,255,255,.9)',a)}})}
 if(st==='sting'){ball(L+8,-6.4,2.6,'#ffd27a');add(()=>glow(L+8,-6.4,9,'#ffd27a',.5))}
 if(st==='bone'){ball(2,-4,2.2,'#e8e2c8');ball(2,4,2.2,'#e8e2c8')}
 if(st==='spec'){g.restore()}}
function axe(wd,P){const L=wd.len,bl=P.bl;rect(-10,-2,L+2,4,'#7a4a22',1.8,1.5);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.1;for(let i=0;i<5;i++){g.beginPath();g.moveTo(-7+i*7,-2);g.lineTo(-4+i*7,2);g.stroke()}rect(-13,-3.4,4.4,6.8,P.gd,1.6,2);
 poly([[L-14,-2],[L-26,0],[L-14,2]],bl,1.6);
 g.beginPath();g.moveTo(L-13,-2);g.bezierCurveTo(L-10,-12,L-6,-22,L+8,-20);g.bezierCurveTo(L+15,-12,L+18,-5,L+17,0);g.bezierCurveTo(L+18,5,L+15,12,L+8,20);g.bezierCurveTo(L-6,22,L-10,12,L-13,2);g.closePath();
 g.fillStyle=lg(L-12,-18,L+16,18,shade(bl,.55),shade(bl,-.4),bl);g.fill();g.lineWidth=2.2;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
 g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=1.6;g.beginPath();g.moveTo(L+8,-17.4);g.bezierCurveTo(L+13,-11,L+15.4,-5,L+14.8,0);g.bezierCurveTo(L+15.4,5,L+13,11,L+8,17.4);g.stroke();
 g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1.2;g.beginPath();g.moveTo(L-6,-10);g.quadraticCurveTo(L+2,-6,L+4,0);g.quadraticCurveTo(L+2,6,L-6,10);g.stroke();
 rect(L-9,-4.4,8,8.8,P.gd,1.6,2);const pu=.7+.3*Math.sin(t/160);add(()=>glow(L+3,0,12,P.acc,.55*pu));dot(L+3,0,2.4,P.acc);
 if(P.id==='orc'||P.id==='demon')for(const s of[-1,1])poly([[L+10,s*18],[L+16,s*25],[L+13,s*16]],P.id==='orc'?'#e8e2c8':'#2a0a0a',1.4)}
function spear(wd,P){const L=wd.len;rect(-16,-1.8,L+16,3.6,'#7a4a22',1.8,1.5);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.1;for(let i=0;i<7;i++){g.beginPath();g.moveTo(-12+i*7,-1.8);g.lineTo(-9+i*7,1.8);g.stroke()}
 const wv=Math.sin(t/110)*3;g.beginPath();g.moveTo(L-5,0);g.quadraticCurveTo(L-14,-6+wv,L-26,-3+wv*1.4);g.quadraticCurveTo(L-16,1,L-26,6+wv*1.2);g.quadraticCurveTo(L-13,4,L-5,0);g.fillStyle=K(P.cape);g.fill();g.lineWidth=1.6;g.strokeStyle=OL;g.stroke();
 rect(L-4,-3.6,6,7.2,P.gd,1.6,2);
 if(P.id==='hunter'){g.beginPath();g.moveTo(L+2,-3.4);g.quadraticCurveTo(L+16,-8,L+30,-2);g.quadraticCurveTo(L+16,1,L+14,4);g.quadraticCurveTo(L+8,3,L+2,3.4);g.closePath()}
 else{g.beginPath();g.moveTo(L+2,-3.8);g.quadraticCurveTo(L+12,-7.5,L+24,0);g.quadraticCurveTo(L+12,7.5,L+2,3.8);g.closePath()}
 g.fillStyle=lg(0,-7,0,7,shade(P.bl,.6),shade(P.bl,-.3),P.bl);g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1.1;g.beginPath();g.moveTo(L+4,-1.6);g.lineTo(L+20,-.4);g.stroke();
 if(P.id==='fire'||P.id==='dragonk'||P.id==='hunter')add(()=>glow(L+20,0,13,P.acc,.5))}
function bow(pull,P){const R=18,cx=-1.2,wood=P.id==='archer'?'#a8743a':P.id==='bone'?'#e8e2c8':P.id==='ghost'?'#bfefff':shade(P.gd,.25),px=-pull*14;g.lineCap='round';
 g.beginPath();g.arc(cx,0,R,-1.18,1.18);g.lineWidth=6.4;g.strokeStyle=OL;g.stroke();g.lineWidth=3.6;g.strokeStyle=K(wood);g.stroke();g.lineWidth=1.1;g.strokeStyle=K(shade(wood,.55));g.beginPath();g.arc(cx-.6,-.6,R,-1.1,1.1);g.stroke();
 const ex=cx+Math.cos(1.18)*R,ey=Math.sin(1.18)*R;ball(ex,-ey,2.2,P.gd);ball(ex,ey,2.2,P.gd);rect(cx+R-2.4,-4,5,8,'#5a3a22',1.6,2);
 if(P.id==='archer')for(const s of[-1,1])poly([[cx+R*.7,s*R*.55],[cx+R*.7+8,s*(R*.55+4)],[cx+R*.7+2,s*(R*.55+1)]],'#5ad05a',1.2);
 g.beginPath();g.moveTo(ex,-ey);g.lineTo(px,0);g.lineTo(ex,ey);g.lineWidth=1.3;g.strokeStyle='#f4f4f0';g.stroke();
 g.beginPath();g.moveTo(px,0);g.lineTo(px+30,0);g.lineWidth=3;g.strokeStyle=OL;g.stroke();g.lineWidth=1.5;g.strokeStyle=K('#e8e0c0');g.stroke();
 poly([[px+30,-3.4],[px+38,0],[px+30,3.4]],'#e8eef2',1.4);for(const s of[-1,1])poly([[px+2,0],[px+9,s*4.4],[px+11,s*2]],s<0?P.crest:shade(P.crest,-.3),1.2);
 if(pull>.4)add(()=>glow(px+34,0,10+pull*6,P.acc,.5*pull))}
function staff(pull,P){const ac=P.acc,gl=.6+pull*.8+Math.sin(t/150)*.12,r=5.8+pull*3.2;
 rect(-14,-1.8,42,3.6,shade(P.gd,-.2),1.8,1.5);for(let i=0;i<3;i++)rect(-4+i*11,-2.6,3,5.2,P.gd,1.2,1);
 for(const s of[-1,1]){g.beginPath();g.moveTo(26,s*1.5);g.quadraticCurveTo(32,s*9,40,s*6);g.lineWidth=4.4;g.strokeStyle=OL;g.stroke();g.lineWidth=2.4;g.strokeStyle=K(P.gd);g.stroke()}
 add(()=>{glow(33,0,r*3.6,ac,Math.min(1,gl)*.8)});
 ball(33,0,r,ac);g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.ellipse(31.4,-r*.35,r*.3,r*.16,-.5,0,TAU);g.fill();
 for(let i=0;i<3;i++){const a=t/(260+i*60)+i*2.1,rr=r+6+pull*3;star(33+Math.cos(a)*rr,Math.sin(a)*rr*.7,2.2,alpha(ac,.95),a)}}
function weapon(k,wid,wd,pull,P){const st=BS[P.id]||'str';g.save();
 if(k==='bow')bow(pull,P);else if(wid==='wand')wand(pull,P);else if(k==='magic'||k==='staff')staff(pull,P);else if(k==='gun')pistol(wd,pull,P);else if(wid==='hammer')hammer(wd,P);else if(wid==='axe')axe(wd,P);else if(wid==='spear')spear(wd,P);else{grip(P,st);guard(st,P);blade(st,wd.len+2,P)}
 elemFx(k,wid,wd,P);qualFx(k,wid,wd);g.restore()}
/* ====================== iconos de armas para el inventario (imagen real del arma) ====================== */
const ICN=new Map(),IEXT={sword:[-15,52,9],axe:[-14,58,22],spear:[-17,72,10],bow:[-8,24,21],staff:[-15,46,13],dagger:[-15,38,8],hammer:[-14,62,19],pistol:[-16,26,9],shotgun:[-16,40,9],wand:[-15,38,9]};
A.wIcon=function(id,wd,q,el,col){const key=id+'|'+(q|0)+'|'+(el||'');let u=ICN.get(key);if(u)return u;
 const S=96,cv=document.createElement('canvas');cv.width=cv.height=S;const c=cv.getContext('2d');
 const sg=g,st=t,sth=th,sti=ti,sfl=FL,sel=A._el,selc=A._elc,swq=A._wq;
 try{g=c;t=1300;FL=false;A._el=el||null;A._elc=el?ELC[el]:null;A._wq=0;
  const sk=(typeof SKINS!=='undefined'&&SKINS.find(s=>s.id==='classic'))||{id:'classic',ar:'team',sh:'#9aa6b5',cp:'#d83a3a',cr:'#f2c230',cs:'spike',gem:'#d83a3a',bl:'#c9d1d6',gd:'#e0a020'},P=heroPal(sk);
  const gr=c.createRadialGradient(S/2,S/2,4,S/2,S/2,46);gr.addColorStop(0,alpha(col||'#ffffff',.5));gr.addColorStop(1,alpha(col||'#ffffff',0));c.fillStyle=gr;c.fillRect(0,0,S,S);
  const e=IEXT[id]||[-15,40,10],isG=wd.k==='gun',isB=wd.k==='bow',ang=isB?-.3:isG?-.4:-Math.PI/4,span=e[1]-e[0],cs=Math.abs(Math.cos(ang)),sn=Math.abs(Math.sin(ang));
  const sc=Math.min(46/(span/2*cs+e[2]*sn),46/(span/2*sn+e[2]*cs));
  g.save();g.beginPath();g.arc(S/2,S/2,47,0,TAU);g.clip();g.translate(S/2,S/2);g.rotate(ang);g.scale(sc,sc);g.translate(-(e[0]+e[1])/2,0);
  weapon(wd.k,id,wd,0,P);g.restore();
  u=cv.toDataURL('image/png')}catch(err){u=''}
 g=sg;t=st;th=sth;ti=sti;FL=sfl;A._el=sel;A._elc=selc;A._wq=swq;
 if(u)ICN.set(key,u);return u};
/* ====================== coronas y crestas ====================== */
const CREST={
 spike(P,hx,hy,c){c=c||P.crest;const R=9.8,cx=hx-.3,cy=hy-.8,an=[-2.5,-2.04,-1.57,-1.1,-.64];
  an.forEach((a,i)=>{const len=i===2?10:i%2?6.5:8,w=.2;poly([[cx+Math.cos(a-w)*R,cy+Math.sin(a-w)*R],[cx+Math.cos(a)*(R+len),cy+Math.sin(a)*(R+len)],[cx+Math.cos(a+w)*R,cy+Math.sin(a+w)*R]],c,1.6)});
  g.beginPath();g.arc(cx,cy,R,-2.72,-.42);g.lineWidth=4.4;g.strokeStyle=OL;g.stroke();g.lineWidth=2.6;g.strokeStyle=K(c);g.stroke();g.lineWidth=.9;g.strokeStyle=K(shade(c,.6));g.beginPath();g.arc(cx,cy-.7,R,-2.6,-.6);g.stroke();
  an.forEach((a,i)=>{if(i%2===0){const d=R+(i===2?9:7);dot(cx+Math.cos(a)*d,cy+Math.sin(a)*d,1.6,i===2?P.gem:'#fff')}});dot(cx,cy-R,1.9,P.gem)},
 crystal(P,hx,hy){const c=P.crest,pu=.8+.2*Math.sin(t/200);add(()=>glow(hx,hy-13,15,c,.38*pu));
  [[-6,8,-.55,10],[-2,10,-.14,15],[3,9.6,.22,12.5],[7,7.6,.6,8.5]].forEach(([ox,by,an,L])=>{g.save();g.translate(hx+ox,hy-by);g.rotate(an);poly([[-2.6,0],[-1.7,-L*.7],[0,-L],[0,0]],shade(c,.35),1.5);poly([[0,0],[0,-L],[1.9,-L*.7],[2.7,0]],shade(c,-.25),1.5);g.restore()});
  if(!FL){g.fillStyle='rgba(255,255,255,.8)';g.fillRect(hx-3,hy-20,1.2,5)}},
 flame(P,hx,hy){const c=P.crest;add(()=>glow(hx+1,hy-13,18,'#ff7a1a',.5));[[-5,10,.3],[-1.5,15,1.2],[2.5,13,2.1],[6,9,3]].forEach(([ox,h,ph])=>{flameShape(hx+ox,hy-8,7.4,h+Math.sin(t/55+ph)*2.6,'#ff5a1a',c,ph);flameShape(hx+ox,hy-8,3.8,h*.6,'#ffe27a','#fff6c8',ph+1)})},
 leaf(P,hx,hy){const c=P.crest;for(let i=0;i<7;i++){const a=-2.75+i*.38,x=hx+Math.cos(a)*9.2,y=hy-.6+Math.sin(a)*9.2;g.save();g.translate(x,y);g.rotate(a+PI/2+Math.sin(t/500+i)*.08);g.beginPath();g.moveTo(0,1);g.quadraticCurveTo(-5.2,-5,0,-10.5);g.quadraticCurveTo(5.2,-5,0,1);g.fillStyle=K(i%2?c:shade(c,-.2));g.fill();g.lineWidth=1.6;g.strokeStyle=OL;g.stroke();g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=.9;g.beginPath();g.moveTo(0,0);g.lineTo(0,-8);g.stroke();g.restore()}
  dot(hx+2,hy-10.4,2,'#ffffff');dot(hx+2,hy-10.4,.9,'#ffd84a');dot(hx-4.6,hy-8.6,1.7,'#ff9ac0')},
 horn(P,hx,hy,c){c=c||P.crest;for(const s of[-1,1]){g.beginPath();g.moveTo(hx+s*4,hy-6.4);g.bezierCurveTo(hx+s*11.6,hy-7.6,hx+s*14.6,hy-14,hx+s*9.6,hy-21);g.bezierCurveTo(hx+s*10,hy-14,hx+s*8,hy-10,hx+s*2,hy-4.4);g.closePath();g.fillStyle=lg(hx,hy-5,hx+s*11,hy-20,shade(c,-.25),shade(c,.5),c);g.fill();g.lineWidth=2;g.strokeStyle=OL;g.lineJoin='round';g.stroke();g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=.9;g.beginPath();g.moveTo(hx+s*6,hy-8);g.quadraticCurveTo(hx+s*11,hy-10,hx+s*9.4,hy-17);g.stroke()}}};
/* ====================== cabezas ====================== */
let E={lk:[0,0],bl:false,talk:0,mv:0};
function visor(P,hx,hy,c){g.beginPath();g.roundRect?g.roundRect(hx+.5,hy-3.8,10.6,7.8,3):g.rect(hx+.5,hy-3.8,10.6,7.8);g.fillStyle=K('#12121c');g.fill();g.lineWidth=1.6;g.strokeStyle=OL;g.stroke();
 const pu=.75+.25*Math.sin(t/260);add(()=>{glow(hx+4.2,hy-.4,6.4,c,.55*pu);glow(hx+8.8,hy-.4,6.4,c,.55*pu)});rect(hx+2.2,hy-1.7,4,2.8,c,0,1);rect(hx+7,hy-1.7,3.4,2.8,c,0,1);if(E.bl){rect(hx+1.4,hy-3,9,3.6,'#12121c',0)}}
function helm(P,hx,hy,col,cr){ball(hx,hy,10.4,col||P.helm);g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1.6;g.beginPath();g.arc(hx-.6,hy-1,8.6,3.5,5);g.stroke();
 g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=1.3;g.beginPath();g.moveTo(hx-9.4,hy+1);g.lineTo(hx+.4,hy-9.8);g.moveTo(hx-3,hy+4);g.lineTo(hx+1.4,hy+10);g.stroke();
 visor(P,hx,hy,P.gem);dot(hx-6.6,hy+4,1.1,shade(col||P.helm,.55));dot(hx-4,hy+7,1.1,shade(col||P.helm,.55));
 if(cr!==false)CREST[P.S.cs||'spike'](P,hx,hy)}
function eyeW(x,y,r,c){g.fillStyle=K('#fff');g.beginPath();g.ellipse(x,y,r,E.bl?.5:r*1.08,0,0,TAU);g.fill();g.lineWidth=1.1;g.strokeStyle=OL;g.stroke();if(!E.bl){dot(x+E.lk[0]*.7,y+E.lk[1]*.6,r*.55,c||'#222');dot(x+E.lk[0]*.7-.4,y+E.lk[1]*.6-.6,.55,'#fff')}}
function brow(x,y,a,len,c){line(x-len*Math.cos(a),y-len*Math.sin(a),x+len*Math.cos(a),y+len*Math.sin(a),1.9,c||'#2a1a14')}
function earP(hx,hy,c,L){poly([[hx-7,hy-1.4],[hx-7-L,hy-5],[hx-6,hy+3.6]],c,1.6)}
function head(P,hx,hy){const id=P.id,pu=.75+.25*Math.sin(t/260),lk=E.lk;
 switch(id){
 case'bone':{const jw=E.talk*1.8;ell(hx+2.6,hy+7.4+jw,5.2,3.2,'#d9d3b8');g.strokeStyle='#6a6450';g.lineWidth=1;for(let i=0;i<4;i++){g.beginPath();g.moveTo(hx+.4+i*1.9,hy+6.2+jw);g.lineTo(hx+.4+i*1.9,hy+9+jw);g.stroke()}
  ball(hx,hy,9.8,'#efe9d0');add(()=>{glow(hx+3.2,hy-.8,6.4,'#5ad05a',.65*pu);glow(hx+8,hy-.8,6.4,'#5ad05a',.65*pu)});
  for(const x of[hx+3.2,hx+8]){g.beginPath();g.ellipse(x,hy-.8,2.5,3,0,0,TAU);g.fillStyle=K('#10140f');g.fill();if(!E.bl)dot(x+lk[0]*.5,hy-.6+lk[1]*.4,1.1,'#7bff7b')}
  poly([[hx+10,hy+2.4],[hx+8.4,hy+5.2],[hx+11.6,hy+5.2]],'#10140f',1);g.strokeStyle='rgba(80,70,50,.75)';g.lineWidth=1;g.beginPath();g.moveTo(hx-4,hy-8);g.lineTo(hx-2,hy-4);g.lineTo(hx-4.6,hy-1);g.moveTo(hx+6,hy-9);g.lineTo(hx+5,hy-6);g.stroke();CREST.spike(P,hx,hy,'#a89c70');break}
 case'samurai':{poly([[hx-10,hy-2],[hx-14.6,hy+11],[hx-2,hy+12],[hx-.5,hy+2]],'#a02024',1.8);poly([[hx-9,hy+3],[hx-13,hy+10],[hx-3,hy+11]],'#7a1418',1.4);g.strokeStyle='#e0b020';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(hx-12.4+i*3,hy+9.6);g.lineTo(hx-8.4+i*3,hy+1.4);g.stroke()}
  ball(hx,hy,10.4,'#2a2a2e');g.strokeStyle='#a02024';g.lineWidth=1.8;g.beginPath();g.moveTo(hx-8,hy-6);g.quadraticCurveTo(hx,hy-12,hx+8,hy-5);g.stroke();for(let i=-2;i<=2;i++){g.strokeStyle='rgba(224,176,32,.7)';g.lineWidth=1;g.beginPath();g.moveTo(hx+i*3.2,hy-9.6);g.lineTo(hx+i*2,hy-3);g.stroke()}
  g.beginPath();g.ellipse(hx+4.4,hy+3.4,7.4,6,0,0,TAU);g.fillStyle=lg(hx,hy,hx+10,hy+8,'#c8333a','#7a1418');g.fill();g.lineWidth=1.8;g.strokeStyle=OL;g.stroke();
  poly([[hx+1.6,hy+.4],[hx+7.4,hy-1.4],[hx+8,hy+.6],[hx+2.4,hy+1.8]],'#1a1a1a',1.2);add(()=>{glow(hx+4.6,hy,5,'#ffcf3a',.5)});poly([[hx+3,hy+.2],[hx+6.4,hy-.5],[hx+6.6,hy+.3]],'#ffe27a',0);
  g.strokeStyle='#e8eef2';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(hx+4+i*2.4,hy+6.4);g.lineTo(hx+4.6+i*2.4,hy+8.4);g.stroke()}CREST.horn(P,hx,hy);break}
 case'orc':{ball(hx,hy,10.4,P.skin);poly([[hx-7,hy-1.4],[hx-14,hy-4],[hx-6,hy+3]],P.skin,1.6);
  g.beginPath();g.arc(hx-.3,hy-1.6,10.8,PI+.1,TAU-.05);g.closePath();g.fillStyle=lg(hx-10,hy-12,hx+8,hy-1,'#a8703a','#5a3416','#7a4a22');g.fill();g.lineWidth=2.2;g.strokeStyle=OL;g.stroke();g.fillStyle='rgba(0,0,0,.25)';g.fillRect(hx-10,hy-3.4,21,2);dot(hx-5,hy-6,1,'#d8d0b0');dot(hx+2,hy-8,1,'#d8d0b0');dot(hx+7,hy-5,1,'#d8d0b0');
  eyeW(hx+3.4,hy+1.4,1.9,'#ffcf3a');eyeW(hx+8.4,hy+1.4,1.7,'#ffcf3a');brow(hx+3.4,hy-.8,.4,3.2,'#1a1008');brow(hx+8.4,hy-.8,-.4,3,'#1a1008');
  g.fillStyle=K(shade(P.skin,-.3));g.beginPath();g.ellipse(hx+6,hy+4.6,5.6,3.2,0,0,TAU);g.fill();dot(hx+10.4,hy+3.2,1.2,shade(P.skin,-.4));
  for(const x of[hx+2.6,hx+8.6])poly([[x-1.6,hy+5.4],[x,hy-.8],[x+1.6,hy+5.4]],'#f4efd8',1.3);line(hx+1,hy+2.6,hx+3,hy+5,1.6,'#b02a20');line(hx+9,hy+4,hx+11,hy+6.4,1.6,'#b02a20');
  CREST.horn(P,hx,hy,'#a8a8a8');break}
 case'archer':{poly([[hx-10,hy+2],[hx-14,hy+12],[hx-2,hy+9]],P.cape,1.6);ball(hx,hy,10.6,P.cape);ball(hx+3.6,hy+1.4,7.2,P.skin);g.fillStyle=K(shade(P.cape,-.15));g.beginPath();g.ellipse(hx+5.4,hy+5.6,6.4,3.4,0,0,TAU);g.fill();g.lineWidth=1.4;g.strokeStyle=OL;g.stroke();
  eyeW(hx+4.4,hy+.4,1.9,'#3a8a2a');eyeW(hx+8.6,hy+.4,1.7,'#3a8a2a');brow(hx+4.4,hy-2,-.1,2.6,'#5a3a1c');brow(hx+8.6,hy-2,.1,2.4,'#5a3a1c');
  poly([[hx-3,hy-9],[hx-7,hy-18],[hx+1,hy-11]],'#f4efd8',1.4);poly([[hx-1,hy-10],[hx-3,hy-16],[hx+2,hy-11]],'#ffffff',0);CREST.leaf(P,hx,hy);break}
 case'hunter':{CREST.horn(P,hx,hy,'#e8e0c0');helm(P,hx,hy,P.helm,false);poly([[hx+3,hy-9],[hx+5,hy-14],[hx+7,hy-9]],'#f4efd8',1.4);
  g.strokeStyle='#d8d0b0';g.lineWidth=2;g.beginPath();g.moveTo(hx-8,hy-3);g.quadraticCurveTo(hx-12,hy+2,hx-9,hy+8);g.stroke();break}
 case'vamp':{poly([[hx-12,hy+12],[hx-18,hy-3],[hx-4,hy+6]],'#6a0f2a',1.6);poly([[hx+1,hy+12],[hx+6,hy-1],[hx+9,hy+10]],'#8a0f2a',1.6);
  ball(hx,hy,10.2,P.skin);poly([[hx-7.6,hy-.4],[hx-14,hy-4],[hx-6.4,hy+3.4]],P.skin,1.6);
  g.beginPath();g.arc(hx,hy,10.6,3.3,TAU-.2);g.lineTo(hx+7,hy-3.4);g.lineTo(hx+4.6,hy-.8);g.lineTo(hx+1.8,hy-4.6);g.lineTo(hx-4,hy-3.2);g.lineTo(hx-8.6,hy+3.6);g.closePath();g.fillStyle=K('#1a0a14');g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  add(()=>{glow(hx+4,hy+.8,5,'#ff3a5a',.55*pu);glow(hx+8.6,hy+.8,5,'#ff3a5a',.55*pu)});eyeW(hx+4,hy+.8,1.9,'#e8203a');eyeW(hx+8.6,hy+.8,1.7,'#e8203a');brow(hx+4,hy-1.4,.35,3,'#0a0408');brow(hx+8.6,hy-1.4,-.35,2.8,'#0a0408');
  g.strokeStyle='#5a1030';g.lineWidth=1.3;g.beginPath();g.moveTo(hx+3.6,hy+5.8);g.quadraticCurveTo(hx+6.6,hy+7.4,hx+9.4,hy+5.4);g.stroke();for(const x of[hx+4.8,hx+8])poly([[x-.9,hy+5.8],[x,hy+9],[x+.9,hy+5.8]],'#fff',1);
  CREST.spike(P,hx,hy,'#b8b8c4');break}
 case'demon':{ball(hx,hy,10.4,P.skin);poly([[hx-7.4,hy-1],[hx-16,hy-6],[hx-6.4,hy+3.6]],P.skin,1.6);CREST.horn(P,hx,hy,'#3a1010');
  add(()=>{glow(hx+4,hy,6,'#ffdd33',.6*pu);glow(hx+8.8,hy,6,'#ffdd33',.6*pu)});g.fillStyle=K('#ffdd33');for(const x of[hx+3.6,hx+8.6]){g.beginPath();g.ellipse(x,hy,2.3,E.bl?.5:1.9,0,0,TAU);g.fill();if(!E.bl)rect(x-.4+lk[0]*.4,hy-1.5,.9,3,'#1a0a0a',0)}
  brow(hx+3.6,hy-2.4,.5,3.4,'#2a0a0a');brow(hx+8.8,hy-2.4,-.5,3.2,'#2a0a0a');g.fillStyle=K('#2a0a0a');g.beginPath();g.moveTo(hx+2.4,hy+5.4);g.quadraticCurveTo(hx+6.4,hy+9.4,hx+10.4,hy+5);g.quadraticCurveTo(hx+6.4,hy+6.8,hx+2.4,hy+5.4);g.fill();for(const x of[hx+4,hx+9])poly([[x-1,hy+5.8],[x,hy+8],[x+1,hy+5.8]],'#fff',.9);break}
 case'ghost':{add(()=>glow(hx,hy,20,'#9be7ff',.38));ball(hx,hy,10,'#e8fbff');for(let i=0;i<5;i++){const a=-2.5+i*.55;flameShape(hx+Math.cos(a)*7,hy+Math.sin(a)*8-1,5,8+Math.sin(t/90+i)*2.4,'#9be7ff','#ffffff',i)}
  for(const x of[hx+3.6,hx+8.6]){g.beginPath();g.ellipse(x,hy+.4,2.4,3.2,0,0,TAU);g.fillStyle='#0a2a3a';g.fill();add(()=>glow(x,hy+.4,5,'#4cf0ff',.9));dot(x+lk[0]*.4,hy+.6,1,'#e8fbff')}
  g.beginPath();g.ellipse(hx+6.4,hy+6.4,1.8,2.6+Math.sin(t/200)*.5,0,0,TAU);g.fillStyle='#0a2a3a';g.fill();CREST.crystal(P,hx,hy-1);break}
 case'dragonk':{for(let i=0;i<5;i++){const a=-2.9+i*.62;g.save();g.translate(hx+Math.cos(a)*7,hy+Math.sin(a)*7.6);g.rotate(a+PI/2);g.beginPath();g.moveTo(-3,0);g.quadraticCurveTo(-1,-8-Math.sin(t/120+i)*1.6,2,-12);g.quadraticCurveTo(3,-5,3,0);g.closePath();g.fillStyle=K(i%2?'#d6282c':'#ff7a1a');g.fill();g.lineWidth=1.4;g.strokeStyle=OL;g.stroke();g.restore()}
  ball(hx,hy,10.2,P.skin);poly([[hx-7.4,hy-1],[hx-14,hy-4],[hx-6.4,hy+3]],P.skin,1.6);g.fillStyle='rgba(214,40,44,.5)';for(let i=0;i<3;i++){g.beginPath();g.arc(hx+8.6,hy+4+i*1.4,1.1,0,TAU);g.fill()}
  add(()=>{glow(hx+4,hy+.4,5,'#ffd84a',.5);glow(hx+8.6,hy+.4,5,'#ffd84a',.5)});for(const x of[hx+3.8,hx+8.6]){g.fillStyle=K('#ffd84a');g.beginPath();g.ellipse(x,hy+.4,2.2,E.bl?.5:2,0,0,TAU);g.fill();if(!E.bl)rect(x-.4,hy-1.5,.9,3.8,'#7a0a0a',0)}
  brow(hx+3.8,hy-2,.3,3,'#5a1010');brow(hx+8.6,hy-2,-.3,2.8,'#5a1010');g.strokeStyle='#7a2a1a';g.lineWidth=1.3;g.beginPath();g.moveTo(hx+4,hy+5.8);g.quadraticCurveTo(hx+7,hy+7,hx+9.6,hy+5.2);g.stroke();CREST.horn(P,hx,hy,'#ffd84a');
  g.beginPath();g.arc(hx-.3,hy-.8,9.8,-2.72,-.42);g.lineWidth=2.4;g.strokeStyle=K('#ffd84a');g.stroke();break}
 case'divine':{helm(P,hx,hy,'#fff1b8',false);g.strokeStyle='#ffd84a';g.lineWidth=1.4;g.beginPath();g.arc(hx,hy,8,-2.6,-.5);g.stroke();CREST.spike(P,hx,hy,'#ffe27a');
  const hp=1+Math.sin(t/300)*.06;g.save();g.translate(hx-1,hy-21+Math.sin(t/400)*1.2);g.scale(1,.34);add(()=>{glow(0,0,18,'#fff0a0',.6)});g.beginPath();g.arc(0,0,9*hp,0,TAU);g.lineWidth=4.6;g.strokeStyle='rgba(60,40,0,.65)';g.stroke();g.lineWidth=2.8;g.strokeStyle=K('#ffe27a');g.stroke();g.lineWidth=1;g.strokeStyle='#fff';g.stroke();g.restore();break}
 case'mite':{g.strokeStyle=OL;g.lineWidth=2.6;g.lineCap='round';for(const s of[0,1]){const x0=hx+1+s*6,sw=Math.sin(t/200+s)*2;g.beginPath();g.moveTo(x0,hy-8);g.quadraticCurveTo(x0-3+sw,hy-17,x0+3+sw,hy-21);g.stroke();g.strokeStyle=K('#8a4a1a');g.lineWidth=1.2;g.stroke();g.strokeStyle=OL;g.lineWidth=2.6;ball(x0+3+sw,hy-21,2,'#ffd84a',1.6)}
  ball(hx,hy,10.4,P.skin);g.beginPath();g.arc(hx-.4,hy-1,10.6,3.3,TAU-.2);g.lineTo(hx+7,hy-4);g.quadraticCurveTo(hx,hy-6,hx-8,hy+2);g.closePath();g.fillStyle=lg(hx-10,hy-10,hx+8,hy,'#e0902c','#8a4a1a');g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();g.strokeStyle='rgba(255,230,160,.5)';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.arc(hx-.4,hy-1,9.4-i*.1,3.6+i*.6,4.3+i*.6);g.stroke()}
  add(()=>{for(const[x,y]of[[hx+3.4,hy+.8],[hx+8.4,hy+.8],[hx+5.6,hy-3.8],[hx+9.4,hy-3.2]])glow(x,y,5,'#ffd84a',.5*pu)});for(const[x,y,r]of[[hx+3.4,hy+.8,2.2],[hx+8.4,hy+.8,2],[hx+5.6,hy-3.8,1.3],[hx+9.4,hy-3.2,1.2]]){dot(x,y,r+.9,OL);dot(x,y,r,'#ffd84a');if(!E.bl)dot(x+lk[0]*.3,y+lk[1]*.3,r*.45,'#3a1a08')}
  poly([[hx+9.4,hy+5],[hx+12.4,hy+8.4],[hx+8,hy+7.4]],'#5a2a0a',1.2);CREST.spike(P,hx,hy,'#f2b64a');break}
 case'pirate':{ball(hx,hy,10.2,P.skin);poly([[hx-7.4,hy-.4],[hx-9.6,hy+1],[hx-6.4,hy+3]],P.skin,1.4);
  g.beginPath();g.moveTo(hx+1,hy+5.4);g.quadraticCurveTo(hx+6,hy+16,hx+11,hy+6);g.quadraticCurveTo(hx+7,hy+9,hx+1,hy+5.4);g.fillStyle=K('#1a1210');g.fill();g.lineWidth=1.4;g.strokeStyle=OL;g.stroke();
  eyeW(hx+8.8,hy+1,1.8,'#2a5a8a');ball(hx+3.8,hy+1,2.8,'#1a1a1e',1.4);g.strokeStyle='#1a1a1e';g.lineWidth=1.2;g.beginPath();g.moveTo(hx-8,hy-3);g.lineTo(hx+2,hy-1.4);g.stroke();brow(hx+8.8,hy-1.6,-.2,2.6,'#1a1210');
  g.strokeStyle='#8a3a2a';g.lineWidth=1.3;g.beginPath();g.moveTo(hx+5,hy+5);g.quadraticCurveTo(hx+8,hy+7.4,hx+10.6,hy+4.6);g.stroke();poly([[hx+6.4,hy+5.6],[hx+7.2,hy+7.4],[hx+8.2,hy+5.8]],'#fff',.8);
  poly([[hx-13,hy-3],[hx-6,hy-16],[hx+3,hy-18],[hx+14,hy-14],[hx+16,hy-6],[hx+4,hy-7],[hx-7,hy-5]],'#1a1a22',1.8);g.strokeStyle=K('#e0a020');g.lineWidth=1.6;g.beginPath();g.moveTo(hx-12.4,hy-3.6);g.quadraticCurveTo(hx+2,hy-9,hx+15.6,hy-6.6);g.stroke();
  dot(hx+1,hy-12.4,2.4,'#f4f0e0');rect(hx-.2,hy-10.6,2.4,1.6,'#f4f0e0',0);dot(hx+.2,hy-12.6,.7,'#1a1a22');dot(hx+2,hy-12.6,.7,'#1a1a22');line(hx-4,hy-9.6,hx+6,hy-14.4,1,'#f4f0e0');line(hx-4,hy-14.4,hx+6,hy-9.6,1,'#f4f0e0');break}
 case'ninja':{const fl=Math.sin(t/110);for(let i=0;i<2;i++){g.beginPath();g.moveTo(hx-8,hy-3+i*3);g.bezierCurveTo(hx-16,hy-4+i*3+fl*2,hx-22,hy-1+i*5-fl*3,hx-30,hy-3+i*7+fl*4);g.lineTo(hx-29,hy+1+i*7+fl*4);g.bezierCurveTo(hx-22,hy+3+i*5-fl*3,hx-16,hy+1+i*3+fl*2,hx-8,hy);g.closePath();g.fillStyle=K('#d8332f');g.fill();g.lineWidth=1.6;g.strokeStyle=OL;g.stroke()}
  ball(hx,hy,10.2,'#23283a');g.fillStyle=K('#f1c79c');g.beginPath();g.ellipse(hx+6.6,hy-.4,4.6,3.2,0,0,TAU);g.fill();g.lineWidth=1.3;g.strokeStyle=OL;g.stroke();eyeW(hx+5.2,hy-.6,1.6,'#222');eyeW(hx+9,hy-.6,1.4,'#222');brow(hx+5.2,hy-2.4,.3,2.4,'#111');brow(hx+9,hy-2.4,-.3,2.2,'#111');
  g.fillStyle=K('#2f3550');g.beginPath();g.ellipse(hx+4.4,hy+5.4,6,3.6,0,0,TAU);g.fill();rect(hx-9,hy-6,20,4.2,'#d8332f',1.6,1.5);rect(hx+.6,hy-6.6,8,5,'#b9c3d0',1.5,1.5);g.strokeStyle='#23283a';g.lineWidth=1.2;g.beginPath();g.moveTo(hx+2.6,hy-4);g.lineTo(hx+6.6,hy-4);g.stroke();dot(hx-8.6,hy-4,2.6,'#d8332f');break}
 case'space':{dot(hx-1,hy-12,1.6,OL);line(hx-1,hy-9,hx-1,hy-14,1.6,'#aab6c6');add(()=>{glow(hx-1,hy-15,6,'#ff3a3a',(Math.sin(t/200)>0?.9:.2))});dot(hx-1,hy-15,1.8,Math.sin(t/200)>0?'#ff5a5a':'#6a1a1a');
  ball(hx,hy,10.8,P.helm);g.beginPath();g.ellipse(hx+3.8,hy+.6,7.8,6.6,0,0,TAU);g.fillStyle=lg(hx-2,hy-6,hx+10,hy+8,'#1a3a48','#06121a','#0a2230');g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  g.save();g.beginPath();g.ellipse(hx+3.8,hy+.6,7.8,6.6,0,0,TAU);g.clip();add(()=>{eyeW0(hx+3.2,hy+.8);eyeW0(hx+8,hy+.8)});g.fillStyle='rgba(255,255,255,.28)';g.beginPath();g.moveTo(hx-1,hy-5);g.lineTo(hx+3,hy-6.6);g.lineTo(hx-1.4,hy+4);g.lineTo(hx-3.6,hy+4);g.fill();g.fillStyle='rgba(255,255,255,.16)';g.fillRect(hx+4,hy-6,1.6,13);g.restore();
  g.strokeStyle='rgba(255,255,255,.4)';g.lineWidth=1.4;g.beginPath();g.arc(hx-.6,hy-1,9,3.6,5);g.stroke();rect(hx-9.4,hy-1,4,8,'#aab6c6',1.5,2);dot(hx-7.4,hy+3,1,'#4cf0ff');rect(hx+4,hy+7.6,8,2.4,'#aab6c6',1.2,1);break}
 default:helm(P,hx,hy,P.helm,true)}}
function eyeW0(x,y){g.beginPath();g.arc(x,y,3.2,0,TAU);g.fillStyle='rgba(76,240,255,.35)';g.fill();g.beginPath();g.ellipse(x,y,1.6,E.bl?.4:2.2,0,0,TAU);g.fillStyle='#bff8ff';g.fill()}
/* ====================== torso, hombreras, piernas, alas, capa ====================== */
function plate(P,o){o=o||{};const c=o.col||P.body,pu=.75+.25*Math.sin(t/240);
 if(o.skirt!==false)for(let i=-1;i<=1;i++)poly([[i*5.4-3.4,-13.4],[i*5.4+3.4,-13.4],[i*5.4+2.8+i*.7,-5],[i*5.4-2.8+i*.7,-5.6]],shade(c,-.2),1.5);
 g.beginPath();g.moveTo(-8,-27.6);g.quadraticCurveTo(0,-30.6,8,-27.6);g.lineTo(9.8,-14.6);g.quadraticCurveTo(0,-10.4,-9.8,-14.6);g.closePath();g.fillStyle=lg(-9,-28,9,-12,shade(c,.36),shade(c,-.42),c);g.fill();g.lineWidth=2.3;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
 g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.moveTo(-6.4,-26);g.quadraticCurveTo(-1,-28.4,2,-26.6);g.lineTo(1,-17);g.quadraticCurveTo(-4,-18,-7.4,-15.6);g.closePath();g.fill();
 if(o.seam!==false)line(0,-26,0,-15,1.2,'rgba(0,0,0,.28)');
 if(o.belt!==false){rect(-9.8,-15.4,19.6,3.8,o.beltc||'#3a2a1c',1.6,1);rect(-2.8,-15.8,5.6,4.6,P.gd,1.5,1.2);dot(0,-13.5,1,shade(P.gd,.6))}
 if(o.gem!==false){add(()=>glow(0,-21,8,P.gem,.5*pu));ball(0,-21,2.7,P.gem,1.6)}}
function pauld(P,x,front){const id=P.id,c=P.S.sc?shade(P.body,.05):P.helm;
 switch(id){
 case'samurai':{for(let i=0;i<3;i++)poly([[x-6.4+i*.3,-30+i*3.4],[x+6.4-i*.3,-30+i*3.4],[x+7-i*.3,-26.6+i*3.4],[x-7+i*.3,-26.6+i*3.4]],i%2?'#8a1c20':'#b8272a',1.5);g.strokeStyle='#e0b020';g.lineWidth=1;g.beginPath();g.moveTo(x-6,-29.8);g.lineTo(x+6,-29.8);g.stroke();break}
 case'orc':{ball(x,-26,5.8,'#7a4a22');for(let i=0;i<4;i++){g.save();g.translate(x,-26);g.rotate(-1.2+i*.6);poly([[2,-3],[7,0],[2,3]],'#4a3a2a',1);g.restore()}poly([[x-1,-31],[x+1.6,-37],[x+3,-30.6]],'#e8e2c8',1.4);break}
 case'demon':case'hunter':case'dragonk':{ball(x,-26,5.6,id==='dragonk'?'#ffd84a':id==='demon'?'#5a0f14':c);poly([[x-2.4,-30],[x+.4,-38],[x+2.6,-29.6]],id==='dragonk'?'#d6282c':'#2a0a0a',1.5);dot(x,-25.6,1.2,P.gd);break}
 case'divine':{ball(x,-26,5.4,'#fff6d8');for(let i=0;i<3;i++){g.save();g.translate(x,-28);g.rotate(-.6+i*.5-(x<0?.4:0));poly([[0,0],[-2.6,-9],[2.6,-9]],'#ffffff',1.2);g.restore()}break}
 case'bone':{ball(x,-26,4.8,'#e8e2c8');dot(x-1.4,-27,1.1,'#10140f');dot(x+1.4,-27,1.1,'#10140f');break}
 case'mite':{ball(x,-26,5.6,'#c9762a');g.strokeStyle='rgba(255,230,160,.6)';g.lineWidth=1;g.beginPath();g.arc(x,-26,3.2,.4,3);g.stroke();break}
 case'ice':{ball(x,-26,5.4,'#bfe9ff');poly([[x-2,-30],[x,-37],[x+2.6,-29.6]],'#e8f8ff',1.4);break}
 case'space':{ball(x,-26,5.6,P.body);rect(x-4,-27.4,8,2.6,'#ffcf3a',1.2,1);dot(x,-23.4,1.2,'#4cf0ff');break}
 case'ghost':{add(()=>glow(x,-26,9,'#9be7ff',.4));ball(x,-26,5,'#e8fbff');break}
 case'ninja':{ball(x,-26,5,'#2f3550');break}
 default:{ball(x,-26,5.6,c);g.strokeStyle=K(P.gd);g.lineWidth=1.5;g.beginPath();g.arc(x,-26,4.2,.5,2.7);g.stroke();dot(x-2,-27.6,.9,'#fff');dot(x+2.2,-24.8,.9,shade(c,.6))}}}
function torso(P){const id=P.id,pu=.75+.25*Math.sin(t/240),c=P.body;
 switch(id){
 case'bone':{g.beginPath();g.ellipse(0,-20,7.6,7.4,0,0,TAU);g.fillStyle=K('#14141a');g.fill();add(()=>glow(0,-20,7,'#5ad05a',.6*pu));
  limb(0,-27,0,-13,2.4,'#e8e2c8');for(let i=0;i<4;i++){const y=-26+i*3.4;for(const s of[-1,1]){g.beginPath();g.moveTo(0,y);g.quadraticCurveTo(s*9.4,y-1.6,s*7.8,y+2.8);g.lineWidth=3.6;g.strokeStyle=OL;g.stroke();g.lineWidth=2;g.strokeStyle=K('#e8e2c8');g.stroke()}}
  rect(-8.6,-14.8,17.2,3.6,'#3a3a40',1.5,1);poly([[-6,-12],[6,-12],[4,-6],[-4,-6]],'#d9d3b8',1.5);dot(0,-21,2,'#7bff7b');break}
 case'samurai':{plate(P,{col:'#b8272a',gem:false,beltc:'#e0b020'});g.save();g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-27);g.lineTo(9.6,-15);g.lineTo(-9.6,-15);g.clip();for(let i=0;i<4;i++){const y=-26+i*3.2;g.fillStyle=i%2?'rgba(0,0,0,.22)':'rgba(255,255,255,.14)';g.fillRect(-10,y,20,3.2);g.strokeStyle='rgba(224,176,32,.8)';g.lineWidth=.9;g.beginPath();g.moveTo(-10,y);g.lineTo(10,y);g.stroke()}for(let i=-3;i<=3;i++){g.strokeStyle='rgba(30,10,10,.5)';g.lineWidth=.9;g.beginPath();g.moveTo(i*2.8,-27);g.lineTo(i*2.8,-15);g.stroke()}g.restore();ball(0,-21,2.6,'#e0b020',1.6);break}
 case'rainbow':{plate(P,{gem:false});g.save();g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-27);g.lineTo(9.6,-15);g.lineTo(-9.6,-15);g.clip();for(let i=0;i<6;i++){g.fillStyle=K(hsl(P.hue+i*60,90,60));g.globalAlpha=.55;g.beginPath();g.moveTo(-14+i*5,-30);g.lineTo(-9+i*5,-30);g.lineTo(-3+i*5,-12);g.lineTo(-8+i*5,-12);g.fill()}g.restore();g.globalAlpha=1;add(()=>glow(0,-21,8,P.gem,.6));ball(0,-21,2.8,P.gem,1.6);break}
 case'fire':{plate(P,{col:'#4a1a10',gem:false});g.save();g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-27);g.lineTo(9.6,-15);g.lineTo(-9.6,-15);g.clip();add(()=>{glow(0,-20,12,'#ff6a1a',.35+.25*pu)});g.strokeStyle=K('#ff9a30');g.lineWidth=1.5;g.lineCap='round';[[-7,-25,-3,-21,-5,-17],[6,-26,2,-22,5,-16],[-1,-25,1,-21,-1,-16]].forEach(([a,b,c2,d,e,f])=>{g.beginPath();g.moveTo(a,b);g.lineTo(c2,d);g.lineTo(e,f);g.stroke()});g.restore();add(()=>glow(0,-21,8,'#fff2a0',.6*pu));ball(0,-21,2.8,'#fff2a0',1.6);break}
 case'ice':{plate(P);g.save();g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-27);g.lineTo(9.6,-15);g.lineTo(-9.6,-15);g.clip();g.fillStyle='rgba(255,255,255,.35)';[[[-8,-27],[0,-27],[-4,-17]],[[0,-27],[8,-27],[4,-17]],[[-4,-17],[4,-17],[0,-12]]].forEach(tr=>{path(tr,1);g.fill()});g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=.9;g.beginPath();g.moveTo(-8,-27);g.lineTo(-4,-17);g.lineTo(0,-27);g.lineTo(4,-17);g.lineTo(8,-27);g.stroke();g.restore();break}
 case'shadow':{plate(P,{gem:false});g.save();g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-27);g.lineTo(9.6,-15);g.lineTo(-9.6,-15);g.clip();g.strokeStyle=alpha('#c4a5ff',.5+.4*pu);g.lineWidth=1.2;[[-6,-25,-6,-18],[-3,-26,-1,-19],[6,-25,5,-18],[3,-26,2,-20]].forEach(([a,b,c2,d])=>{g.beginPath();g.moveTo(a,b);g.lineTo(a+1.6,(b+d)/2);g.lineTo(c2,d);g.stroke()});g.restore();add(()=>glow(0,-21,9,'#a78bfa',.6*pu));ball(0,-21,2.8,P.gem,1.6);break}
 case'forest':{plate(P,{col:'#3f8f35',beltc:'#5a3a1c'});for(let r=0;r<2;r++)for(let i=-2;i<=2;i++){g.save();g.translate(i*3.4+(r?1.7:0),-25+r*4.4);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-3,2,0,5);g.quadraticCurveTo(3,2,0,0);g.fillStyle=K(r?'#5ad05a':'#74e06a');g.fill();g.lineWidth=1;g.strokeStyle=OL;g.stroke();g.restore()}g.strokeStyle='#2a5a22';g.lineWidth=1.6;g.beginPath();g.moveTo(-8,-26);g.quadraticCurveTo(0,-20,8,-15);g.stroke();dot(-2,-21,1.6,'#ff9ac0');break}
 case'orc':{plate(P,{col:'#6a7a4a',beltc:'#4a3018',gem:false});g.strokeStyle='#4a3018';g.lineWidth=2.6;g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-15);g.stroke();dot(-4,-23,1,'#d8c060');dot(0,-20,1,'#d8c060');dot(4,-17,1,'#d8c060');for(let i=0;i<5;i++){g.save();g.translate(-5+i*2.5,-26.4+Math.abs(i-2)*.8);poly([[-1.3,0],[0,3.6],[1.3,0]],'#f4efd8',1);g.restore()}break}
 case'archer':{plate(P,{col:'#3f6f35',beltc:'#5a3a1c',gem:false});g.strokeStyle='#5a3a1c';g.lineWidth=2.6;g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-15);g.stroke();for(let i=0;i<3;i++)dot(-5+i*4,-23+i*3.4,.9,'#d8c87a');ball(0,-21,2.2,'#5ad05a',1.4);break}
 case'hunter':{plate(P);g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;for(let r=0;r<4;r++)for(let i=-2;i<=2;i++){g.beginPath();g.arc(i*3.6+(r%2?1.8:0),-25+r*3,2.2,0,PI);g.stroke()}poly([[-1.6,-24],[0,-18],[1.6,-24]],'#f4efd8',1.3);break}
 case'vamp':{plate(P,{col:'#2a1220',gem:false,beltc:'#5a1030'});for(let i=0;i<4;i++){g.save();g.translate(-4.5+i*3,-26);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(-2.6,2.6,0,5.6);g.quadraticCurveTo(2.6,2.6,0,0);g.fillStyle=K('#f4eef0');g.fill();g.lineWidth=1;g.strokeStyle=OL;g.stroke();g.restore()}for(let i=0;i<3;i++)dot(0,-18+i*2.2,.8,'#a01030');add(()=>glow(0,-23,6,'#ff3a5a',.7*pu));ball(0,-23,2.2,'#ff3a5a',1.4);break}
 case'demon':{plate(P,{col:'#8a1a20',gem:false,beltc:'#2a0a0a'});g.save();g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-27);g.lineTo(9.6,-15);g.lineTo(-9.6,-15);g.clip();g.strokeStyle=alpha('#ffdd33',.55+.4*pu);g.lineWidth=1.3;g.beginPath();g.moveTo(-6,-26);g.lineTo(-3,-22);g.lineTo(-5,-18);g.moveTo(6,-26);g.lineTo(3,-21);g.lineTo(5,-17);g.moveTo(0,-26);g.lineTo(0,-16);g.stroke();g.restore();g.strokeStyle='#8a8a92';g.lineWidth=2;g.setLineDash([2.4,1.6]);g.beginPath();g.moveTo(-8,-26);g.lineTo(8,-16);g.stroke();g.setLineDash([]);break}
 case'ghost':{g.globalAlpha*=.85;plate(P,{col:'#8fd0e8',skirt:false,belt:false,gem:false});add(()=>glow(0,-20,10,'#9be7ff',.55));ball(0,-20,3.2,P.gem,1.4);break}
 case'dragonk':{plate(P,{col:'#b8272a',beltc:'#ffd84a',gem:false});g.strokeStyle='rgba(60,0,0,.5)';g.lineWidth=1;for(let r=0;r<4;r++)for(let i=-2;i<=2;i++){g.beginPath();g.arc(i*3.6+(r%2?1.8:0),-26+r*3,2.2,0,PI);g.stroke()}poly([[-6,-26],[0,-24],[6,-26],[4,-18],[0,-16],[-4,-18]],'#ffd84a',1.4);add(()=>glow(0,-21,6,'#ff9a30',.7));ball(0,-21,2,'#ff7a1a',1.2);break}
 case'divine':{plate(P,{col:'#fff6d8',beltc:'#ffd84a',gem:false});g.strokeStyle='#ffd84a';g.lineWidth=1.3;g.beginPath();g.moveTo(-8,-27);g.lineTo(-9.6,-15);g.moveTo(8,-27);g.lineTo(9.6,-15);g.stroke();add(()=>glow(0,-21,12,'#fff0a0',.75*pu));g.save();g.translate(0,-21);g.rotate(t/900);for(let i=0;i<8;i++){g.rotate(TAU/8);line(2.6,0,5.6,0,1.2,'#ffd84a')}g.restore();ball(0,-21,2.4,'#fff',1.2);break}
 case'mite':{plate(P,{col:'#c9762a',gem:false,beltc:'#6a3014'});g.save();g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-27);g.lineTo(9.6,-15);g.lineTo(-9.6,-15);g.clip();g.strokeStyle='rgba(100,50,10,.55)';g.lineWidth=1.1;for(let i=0;i<4;i++){g.beginPath();g.moveTo(-10,-26+i*3.2);g.quadraticCurveTo(0,-23+i*3.2,10,-26+i*3.2);g.stroke()}g.fillStyle='rgba(255,235,170,.45)';g.beginPath();g.ellipse(-3,-23,3,5,-.4,0,TAU);g.fill();g.restore();ball(0,-21,2.4,'#ffd84a',1.4);break}
 case'pirate':{plate(P,{col:'#9c2a2a',beltc:'#1a1210',gem:false});poly([[-3.4,-27.6],[3.4,-27.6],[0,-17]],'#f0e4c8',1.4);g.strokeStyle='#8a7a5a';g.lineWidth=.9;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-1.4+i*0,-26+i*3);g.lineTo(1.4,-25+i*3);g.stroke()}for(const x of[-6,6])for(let i=0;i<3;i++)dot(x,-25+i*3.2,1,'#e0a020');g.strokeStyle='#4a2a14';g.lineWidth=2.4;g.beginPath();g.moveTo(8,-27);g.lineTo(-8,-15);g.stroke();break}
 case'ninja':{plate(P,{col:'#23283a',beltc:'#d8332f',gem:false});g.strokeStyle='#454b5e';g.lineWidth=2;g.beginPath();g.moveTo(-8,-27);g.lineTo(8,-15);g.moveTo(8,-27);g.lineTo(-8,-15);g.stroke();const fl=Math.sin(t/130);g.beginPath();g.moveTo(5,-14);g.quadraticCurveTo(9,-8+fl,8+fl*2,-3);g.lineTo(5.6+fl*2,-3);g.quadraticCurveTo(5,-8,3,-13);g.fillStyle=K('#d8332f');g.fill();g.lineWidth=1.4;g.strokeStyle=OL;g.stroke();break}
 case'arena':{plate(P,{col:'#4f86e6',beltc:'#ffd84a',gem:false});poly([[-4,-27],[4,-27],[3,-14],[-3,-14]],'#2f5fc0',1.4);g.strokeStyle='#ffd84a';g.lineWidth=1.2;g.beginPath();g.moveTo(-4,-27);g.lineTo(-3,-14);g.moveTo(4,-27);g.lineTo(3,-14);g.stroke();star(0,-21,4.4,'#ffd84a',0);dot(0,-21,1.1,'#2f5fc0');break}
 case'space':{plate(P,{col:'#4a6b3a',beltc:'#2a3a24',gem:false});rect(-8.4,-19,16.8,2.6,'#ffcf3a',1.2,1);for(let i=0;i<5;i++)poly([[-7.4+i*3.4,-19],[-5.6+i*3.4,-19],[-7.2+i*3.4,-16.4],[-9+i*3.4,-16.4]],'#2a2f3a',0);add(()=>glow(0,-23.4,8,'#4cf0ff',.6*pu));ball(0,-23.4,2.6,'#4cf0ff',1.4);break}
 case'gold':{plate(P,{col:'#e3ac1e',beltc:'#7d2bb0'});g.strokeStyle='rgba(255,246,200,.7)';g.lineWidth=1;g.beginPath();g.moveTo(-6,-26);g.quadraticCurveTo(-8,-20,-6,-16);g.moveTo(6,-26);g.quadraticCurveTo(8,-20,6,-16);g.stroke();break}
 case'classic':{plate(P);poly([[-3.6,-27.4],[3.6,-27.4],[2.6,-15],[-2.6,-15]],'#d83a3a',1.4);g.strokeStyle='#f2c230';g.lineWidth=1.2;g.beginPath();g.moveTo(-3.6,-27.4);g.lineTo(-2.6,-15);g.moveTo(3.6,-27.4);g.lineTo(2.6,-15);g.stroke();ball(0,-21,2.6,'#f2c230',1.6);break}
 default:plate(P)}}
function backItems(P,mv){const id=P.id;
 if(id==='archer'){g.save();g.translate(-8,-22);g.rotate(-.5);rect(-3,-9,6,18,'#6a4a22',1.6,2);rect(-3.4,-9,6.8,3,'#3a2a14',1.2,1);for(let i=0;i<3;i++){line(-1.6+i*1.6,-9,-1.6+i*1.6,-15-i%2*2,1.2,'#e8e0c0');poly([[-2.6+i*1.6,-15-i%2*2],[-1.6+i*1.6,-18-i%2*2],[-.6+i*1.6,-15-i%2*2]],i===1?'#5ad05a':'#d8c87a',.8)}g.restore()}
 else if(id==='ninja'||id==='samurai'){g.save();g.translate(-3,-22);g.rotate(id==='ninja'?-.95:-.7);rect(-4,-1.6,28,3.2,'#1a1a22',1.4,1.4);rect(-5,-2,5,4,'#d8332f',1.2,1);g.restore()}
 else if(id==='space'){rect(-13,-29,7,14,'#aab6c6',1.6,2);for(const y of[-27,-20])rect(-12,y,5,4,'#2a3a24',0,1);const f=.7+.3*Math.sin(t/50);add(()=>{glow(-9.4,-14,9*f,'#4cf0ff',.6);glow(-9.4,-11,6*f,'#fff',.4)});rect(-11.6,-15,4.4,2,'#4cf0ff',0)}
 else if(id==='demon'){const w=Math.sin(t/200)*3;g.beginPath();g.moveTo(-6,-14);g.bezierCurveTo(-16,-12+w,-20,-4-w,-17,-1);g.lineWidth=3.6;g.strokeStyle=OL;g.stroke();g.lineWidth=1.8;g.strokeStyle=K('#a02a20');g.stroke();poly([[-17,-1],[-22,-4-w],[-19,2],[-14,2]].map(p=>[p[0],p[1]]),'#2a0a0a',1.4)}
 else if(id==='mite'){g.beginPath();g.ellipse(-8,-18,10,11,0,0,TAU);g.fillStyle=lg(-18,-28,2,-8,'#e8a040','#6a3014','#c9762a');g.fill();g.lineWidth=2.4;g.strokeStyle=OL;g.stroke();g.strokeStyle='rgba(255,230,160,.55)';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.arc(-8,-18,3+i*3,2,4.6);g.stroke()}g.fillStyle='rgba(255,240,190,.5)';g.beginPath();g.ellipse(-12,-23,3,5,-.5,0,TAU);g.fill()}
 else if(id==='dragonk'){const w=Math.sin(t/220)*3;g.beginPath();g.moveTo(-6,-14);g.bezierCurveTo(-18,-10+w,-22,-3-w,-20,0);g.lineWidth=5;g.strokeStyle=OL;g.stroke();g.lineWidth=3;g.strokeStyle=K('#d6282c');g.stroke();poly([[-20,0],[-26,-3-w],[-22,3]],'#ffd84a',1.4)}}
function legs(P,ph,mv){const id=P.id;
 if(id==='ghost'){for(let i=0;i<5;i++){const w=Math.sin(t/160+i)*2;g.beginPath();g.moveTo(-7+i*3.5,-12);g.quadraticCurveTo(-8+i*3.5+w,-6,-5+i*3.5-w,1+Math.sin(t/120+i*2)*1.6);g.quadraticCurveTo(-4+i*3.5,-6,-3.5+i*3.5,-12);g.fillStyle=K('rgba(190,235,250,.75)');g.fill()}add(()=>glow(0,-4,12,'#9be7ff',.3));return}
 if(id==='mite'){g.lineCap='round';g.lineJoin='round';for(const s of[-1,1])for(let i=0;i<3;i++){const sw=Math.sin(t/(70+mv*-20)+i*2.1+(s>0?1.6:0))*3*(.4+mv),x0=-6+i*6,x1=x0+(i-1)*5+sw,y1=-4+s*0,x2=x1+(i-1)*3,hy=s<0?-14:-12;g.beginPath();g.moveTo(x0,hy);g.lineTo(x1,hy+s*5+8);g.lineTo(x2+sw*.4,0);g.lineWidth=5.4;g.strokeStyle=OL;g.stroke();g.lineWidth=3;g.strokeStyle=K('#8a4a1a');g.stroke();g.lineWidth=1;g.strokeStyle=K('#e8b070');g.stroke()}return}
 const LG={classic:['#3a4a78','#3a2f2a'],gold:['#c8951a','#8a5a14'],shadow:['#1c1c28','#0e0e16'],ice:['#6fb8e0','#d8f4ff'],fire:['#5a1a0a','#2a0e08'],forest:['#3a6a2c','#6a4a22'],samurai:['#2a2a2e','#8a6a3a'],orc:['#4a3a2a','#2a2018'],archer:['#3a5a2c','#5a3a1c'],hunter:['#44505c','#2a2a30'],vamp:['#1a0a14','#0e0610'],demon:['#a02a20','#1a0808'],dragonk:['#8a1a1e','#ffd84a'],divine:['#fff6d8','#ffe27a'],pirate:['#2a1a12','#3a2418'],ninja:['#1a1e2c','#2a2f3a'],arena:['#2f5fc0','#a07a14'],space:['#3b5a2e','#2a3a24'],bone:['#e8e2c8','#d9d3b8']};
 const rb=id==='rainbow',lc=rb?hsl(P.hue+120,80,48):(LG[id]||[shade(P.body,-.25),'#3a2f2a'])[0],bc=rb?hsl(P.hue+200,80,42):(LG[id]||[0,'#3a2f2a'])[1];
 for(let k=1;k>=0;k--){const i=k,p=ph+i*PI,fx=Math.sin(p)*7*mv+(i?-2.6:2.6),fy=-Math.max(0,Math.cos(p))*5*mv,hl=i?-3.4:3.4,hy=-12.4,mx=(hl+fx)/2+2.4,my=(hy+fy)/2;
  const peg=id==='pirate'&&i===1;
  if(id==='bone'){limb(hl,hy,mx,my,2.8,lc);limb(mx,my,fx,fy-2,2.6,lc);ball(mx,my,2.4,lc,1.4)}
  else if(peg){limb(hl,hy,mx-1,my,5,'#2a1a12');limb(mx-1,my,fx,fy-2,4,'#7a4a22');rect(fx-2.4,fy-3,4.8,3,'#e0a020',1.2,1);ell(fx,fy+.4,2.8,1.8,'#5a3a1c')}
  else{limb(hl,hy,mx,my,5.4,lc);limb(mx,my,fx,fy-2.4,4.8,lc);if(id==='fire'||id==='demon'||id==='dragonk')dot(mx+1,my,1.1,'#ffb040');else dot(mx+1.6,my-.4,1.5,shade(lc,.35))}
  if(!peg){if(id==='demon'){ell(fx+1.4,fy-.4,5.2,3,bc);poly([[fx-2,fy-2],[fx+5,fy-2],[fx+4,fy+1.4],[fx-2,fy+1.4]],bc,0)}
   else if(id==='dragonk'){ell(fx+1.6,fy-.4,5.4,3,'#3a0a0a');for(let q=0;q<3;q++)poly([[fx+4+q*1.4,fy-1.6+q*1.4],[fx+7.6,fy-.6+q*1.2],[fx+4.4+q*1.4,fy+.2+q*1.2]],bc,.9)}
   else if(id==='bone'){ell(fx+1.8,fy-.4,5,2.6,bc);for(let q=0;q<3;q++)line(fx+2+q*1.6,fy-1.4,fx+2.6+q*1.6,fy+1,.9,'#6a6450')}
   else{ell(fx+1.8,fy-.4,5,2.7,bc,0,1.8);g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=1;g.beginPath();g.moveTo(fx-1,fy-1.8);g.lineTo(fx+4.4,fy-1.4);g.stroke();if(id==='pirate'||id==='hunter'||id==='archer')rect(fx-2.8,fy-4.6,5.6,2.6,shade(bc,.25),1.2,1);if(id==='space'){rect(fx-2.4,fy-3.4,5,1.8,'#4cf0ff',0)}if(id==='ninja')line(fx-2.4,fy-3.6,fx+2,fy-2.4,1.4,'#d8332f')}}}}
function wings(P,mv){const w=P.S.wg;if(!w)return;const fa=mv>.3?Math.sin(t/80)*.3:Math.sin(t/200)*.16;
 for(let s=0;s<2;s++){g.save();g.translate(-4,-25-(s?0:3));g.rotate(PI+(s?.32:.95)+fa*(s?1.1:1));g.scale(1,-1);const sc=w.t==='dragon'?1.35:1.05;g.scale(sc,sc);
  if(w.t==='feather'){add(()=>glow(18,6,26,'#fff0a0',.35));for(let i=0;i<7;i++){g.save();g.rotate(i*.24-.1+Math.sin(t/260+i)*.03);const L=36-i*2.6;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(L*.4,-5.6,L,-1.6);g.quadraticCurveTo(L*.55,4.4,0,0);g.fillStyle=lg(0,0,L,0,'#ffffff','#ffe9a0','#fff6d8');g.fill();g.lineWidth=2;g.strokeStyle='rgba(120,100,40,.8)';g.stroke();g.strokeStyle='rgba(255,200,80,.7)';g.lineWidth=.9;g.beginPath();g.moveTo(3,0);g.lineTo(L-2,-1.4);g.stroke();g.restore()}}
  else{const c=w.c,dr=w.t==='dragon',tips=dr?[[44,-8],[46,6],[38,18],[24,24],[12,22]]:[[40,-5],[38,8],[29,17],[16,19]];
   g.beginPath();g.moveTo(0,0);g.lineTo(14,-8);g.lineTo(tips[0][0],tips[0][1]);for(let i=1;i<tips.length;i++){const a=tips[i-1],b=tips[i];g.quadraticCurveTo((a[0]+b[0])/2-5,(a[1]+b[1])/2-3,b[0],b[1])}g.quadraticCurveTo(6,tips[tips.length-1][1]*.4,2,7);g.closePath();
   g.fillStyle=lg(0,0,tips[0][0],tips[2][1],shade(c,.25),shade(c,-.5),c);g.fill();g.lineWidth=2.6;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
   if(dr){g.strokeStyle='rgba(255,200,80,.35)';g.lineWidth=1;g.beginPath();for(let i=1;i<tips.length;i++){g.moveTo(14,-8);g.lineTo(tips[i][0]*.85,tips[i][1]*.85)}g.stroke()}
   g.lineCap='round';g.beginPath();g.moveTo(0,0);g.lineTo(14,-8);g.lineTo(tips[0][0],tips[0][1]);g.lineWidth=4.6;g.strokeStyle=OL;g.stroke();g.lineWidth=2.4;g.strokeStyle=K(shade(c,-.1));g.stroke();
   for(let i=1;i<tips.length;i++){g.beginPath();g.moveTo(14,-8);g.lineTo(tips[i][0],tips[i][1]);g.lineWidth=3.6;g.strokeStyle=OL;g.stroke();g.lineWidth=1.8;g.strokeStyle=K(shade(c,.1));g.stroke()}
   if(dr){poly([[14,-8],[12,-16],[18,-9]],'#ffd84a',1.4);for(const tp of tips)poly([[tp[0]-1,tp[1]-1],[tp[0]+4,tp[1]],[tp[0]-1,tp[1]+2]],'#ffd84a',1)}}
  g.restore()}}
function cape(h,P){const c=h.cape,n=c.length;if(n<3)return;const L=[],R=[];
 for(let i=0;i<n;i++){const a=c[Math.max(0,i-1)],b=c[Math.min(n-1,i+1)];let dx=b.x-a.x,dy=b.y-a.y;const d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d,w=3.8+i*1.3;L.push([c[i].x+nx*w,c[i].y+ny*w]);R.push([c[i].x-nx*w,c[i].y-ny*w])}
 const la=c[n-1],lb=c[n-2];let ex=la.x-lb.x,ey=la.y-lb.y;const ed=Math.hypot(ex,ey)||1;ex/=ed;ey/=ed;
 const tat=P.S.tat,ghost=P.id==='ghost';g.save();if(ghost)g.globalAlpha*=.8;
 g.beginPath();g.moveTo(L[0][0],L[0][1]);for(let i=1;i<n;i++)g.lineTo(L[i][0],L[i][1]);
 const bl=L[n-1],br=R[n-1],segs=tat?5:3;for(let k=1;k<=segs;k++){const f=k/segs,fm=(k-.5)/segs,mx=lerp(bl[0],br[0],fm),my=lerp(bl[1],br[1],fm),px=lerp(bl[0],br[0],f),py=lerp(bl[1],br[1],f),dep=tat?(k%2?7:3):3.6;g.quadraticCurveTo(mx+ex*dep*2,my+ey*dep*2,px,py)}
 for(let i=n-2;i>=0;i--)g.lineTo(R[i][0],R[i][1]);g.closePath();
 g.fillStyle=lg(c[0].x,c[0].y,la.x,la.y,shade(P.cape,.18),shade(P.cape,-.55),P.cape);g.fill();g.lineWidth=2.4;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
 g.save();g.clip();g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=1.4;for(const f of[-.55,-.15,.25,.6]){g.beginPath();for(let i=0;i<n;i++){const x=lerp(L[i][0],R[i][0],.5+f*.5),y=lerp(L[i][1],R[i][1],.5+f*.5);i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}
 g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=1.8;g.beginPath();for(let i=0;i<n;i++){const x=lerp(L[i][0],R[i][0],.22),y=lerp(L[i][1],R[i][1],.22);i?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();g.restore();
 if(!tat&&!ghost){g.strokeStyle=alpha(P.gd,.85);g.lineWidth=1.8;g.beginPath();g.moveTo(bl[0],bl[1]);for(let k=1;k<=segs;k++){const f=k/segs,fm=(k-.5)/segs;g.quadraticCurveTo(lerp(bl[0],br[0],fm)+ex*7.2,lerp(bl[1],br[1],fm)+ey*7.2,lerp(bl[0],br[0],f),lerp(bl[1],br[1],f))}g.stroke()}
 if(P.id==='ninja'||P.id==='samurai')ball(c[0].x,c[0].y,2.2,P.gd,1.2);
 g.restore()}
/* ====================== el héroe completo ====================== */
const HS=1.08;
function xf(h){g.translate(h.x,h.y-(h.z||0));g.scale(HS,HS);if(h.dashT>0){g.rotate(h.dashAng);g.scale(1.3,.8);g.rotate(-h.dashAng)}g.rotate((h.lean||0)*.14);g.scale(h.face*(1+(h.sq||0)*.6),1-(h.sq||0)*.8)}
function ground(h,P){g.save();g.translate(h.x,h.y);shadow(0,2,13,5.6,.38);
 if(P.S.aura||P.S.glow){const pu=.8+.2*Math.sin(t/300);add(()=>{g.scale(1,.46);glow(0,0,34*pu,P.S.aura||P.S.glow,.42)})}
 if(h.sh>0){g.save();g.scale(1,.42);g.strokeStyle='rgba(127,216,255,.5)';g.lineWidth=2.4;g.setLineDash([7,6]);g.lineDashOffset=-t/50;g.beginPath();g.arc(0,0,19,0,TAU);g.stroke();g.restore()}
 g.restore()}
A.hero=function(h,wd,wid){const S=curSkin(),P=heroPal(S),id=P.id,mv=Math.min(1,Math.hypot(h.vx,h.vy)/2.4);FL=h.flash>t;
 const inv=h.inv>t&&h.dashT<=0&&Math.floor(t/80)%2;E={lk:look(h.aim,h.face),bl:(t%3300)<130,talk:h.atk?Math.abs(Math.sin(t/55)):0,mv};
 g.save();g.globalAlpha=(inv?.5:1)*(id==='ghost'?.7:1);
 ground(h,P);
 g.save();xf(h);wings(P,mv);backItems(P,mv);g.restore();
 cape(h,P);
 g.save();xf(h);const ph=h.ph,b=Math.abs(Math.sin(ph))*2.4*mv+Math.sin(t/380+h.x*.05)*.8*(1-mv);
 legs(P,ph,mv);g.save();g.translate(0,-b);
 const sw=Math.sin(ph)*5*mv,face=P.S.sc||P.S.skull?P.skin:P.helm,glove=P.S.sc?P.skin:id==='bone'?'#e8e2c8':id==='ghost'?'#e8fbff':shade(P.body,.15);
 const bw=wd.k==='bow'||wd.k==='magic'||wd.k==='gun';limb(-6,-25,bw?4:-8+sw*.4,bw?-18:-14,4.6,P.body);ball(bw?4:-8+sw*.4,bw?-17:-13.4,3.2,glove);pauld(P,-7.6);
 torso(P);pauld(P,7.6);
 head(P,(h.hx||0)-(h.lean||0)*2,-35+(h.hy||0));
 const wa=(h.wa||0)+(h.wo||0)*h.face,R=bw?8:9,hx=5+Math.cos(wa)*R,hy=-22+Math.sin(wa)*R;
 limb(6,-25,hx,hy,4.8,P.body);
 g.save();g.translate(hx,hy);g.rotate(wa);weapon(wd.k,wid,wd,h.pull||0,P);g.restore();ball(hx,hy,2.9,glove);
 g.restore();g.restore();g.restore()};
/* ====================== efectos de partículas del héroe ====================== */
A.heroFx=function(h,emit,dt){if(h.dead)return;const S=curSkin(),id=S.id,r=Math.random,mv=Math.min(1,Math.hypot(h.vx,h.vy)/2.4),R=p=>r()<p*dt,x=h.x,y=h.y;
 const fxc=S.fx||[S.glow||S.aura||'#ffffff'],pc=()=>fxc[Math.floor(r()*fxc.length)];
 const up=(c,sz,sh,ox,oy)=>emit(x+(ox!==undefined?ox:(r()-.5)*20),y+(oy!==undefined?oy:-4-r()*18),(r()-.5)*.5,-.4-r()*.6,rnd(500,900),c,sz,-.003,sh);
 switch(id){
 case'fire':if(R(.3))up(r()<.6?'#ff9a30':'#ffd84a',rnd(1.6,3),'ember');if(R(.08))emit(x+rnd(-5,5),y-40,0,-.8,500,'#444',3.4,-.002,'smoke');break;
 case'demon':if(R(.25))up(r()<.5?'#ff4a2a':'#ffb020',rnd(1.6,2.8),'ember');if(R(.1))emit(x+rnd(-8,8),y-6,0,-.5,700,'rgba(80,10,10,.6)',4,-.002,'smoke');break;
 case'dragonk':if(R(.3))up(r()<.5?'#ff9a30':'#ffd84a',rnd(1.6,3),'ember');break;
 case'ice':if(R(.35))emit(x+rnd(-14,14),y-rnd(10,40),rnd(-.2,.2),rnd(.1,.4),rnd(700,1200),r()<.5?'#ffffff':'#bff0ff',rnd(2,3.6),.0006,'flake');if(mv>.3&&R(.3))emit(x+rnd(-5,5),y,0,-.05,600,'rgba(220,245,255,.7)',rnd(3,5),-.001,'smoke');break;
 case'shadow':if(R(.22))up(r()<.5?'#a78bfa':'#6a3fb0',rnd(2,3.4),'smoke',undefined,undefined);if(R(.2))up('#c4a5ff',1.8,'spark');break;
 case'forest':if(R(.25))emit(x+rnd(-16,16),y-rnd(10,40),rnd(-.3,.3),rnd(.1,.4),rnd(900,1400),r()<.5?'#5ad05a':'#a8e870',rnd(2.4,3.6),.0004,'leaf');break;
 case'bone':if(R(.3))up('#5ad05a',rnd(1.6,3),'wisp');break;
 case'rainbow':if(R(.7))up(hsl(Date.now()/10+r()*120,90,62),rnd(1.6,3),'star');break;
 case'vamp':if(R(.2))up('#a01030',rnd(1.6,2.6),'spark');if(R(.05))emit(x+rnd(-10,10),y-rnd(20,40),rnd(-.8,.8),rnd(-.6,-.2),600,'#2a0a14',3,0,'bat');break;
 case'ghost':if(R(.5))up(r()<.5?'#9be7ff':'#ffffff',rnd(1.6,3),'wisp');break;
 case'divine':if(R(.6))up(pc(),rnd(1.6,3),'star');if(R(.08))emit(x+rnd(-14,14),y-rnd(10,36),rnd(-.2,.2),.3,1100,'#ffffff',3,.0004,'feather');break;
 case'mite':if(mv>.25&&R(.7))emit(x+rnd(-8,8),y-2,rnd(-.2,.2),-.1,700,r()<.5?'#f2d49a':'#d9a050',rnd(2,3.6),-.0008,'dust');else if(R(.15))up('#ffd27a',1.8,'spark');break;
 case'pirate':if(R(.12))up('#ffd84a',1.8,'star');break;
 case'ninja':if(mv>.4&&R(.5))emit(x+rnd(-5,5),y-rnd(2,14),0,-.1,520,'rgba(190,200,215,.55)',rnd(3,5),-.001,'smoke');break;
 case'space':if(R(.4))emit(x-h.face*8+rnd(-2,2),y-12,-h.face*rnd(.1,.5),rnd(.2,.8),420,r()<.5?'#4cf0ff':'#ffffff',rnd(1.6,2.8),.0006,'spark');break;
 case'gold':case'arena':if(R(.2))up(pc(),1.8,'star');break;
 case'archer':if(R(.1))emit(x+rnd(-14,14),y-rnd(10,38),rnd(-.2,.2),rnd(.1,.3),1000,'#a8e870',2.6,.0004,'leaf');break;
 case'samurai':if(R(.08))emit(x+rnd(-14,14),y-rnd(18,40),rnd(.3,.8),rnd(.1,.4),1100,'#ffb0c0',2.6,.0004,'petal');break;
 case'hunter':if(R(.15))up('#ff9a30',rnd(1.4,2.2),'ember');break;
 case'orc':if(mv>.5&&R(.3))emit(x+rnd(-6,6),y,rnd(-.3,.3),-.1,420,'#9a8a6a',rnd(2,3.4),-.001,'dust');break;
 case'classic':if(R(.06))up('#f2c230',1.6,'star');break}}
/* ====================== partículas, estelas, proyectiles ====================== */
A.particles=function(PT){for(const p of PT){const a=clamp(p.l/p.m,0,1);
 if(p.c==='ghost'){g.save();g.globalAlpha=a*.42;g.translate(p.x,p.y);g.scale(p.face,1);const ac=A.accent();g.fillStyle=alpha(ac,.9);g.beginPath();g.ellipse(0,-17,8.4,15,0,0,TAU);g.fill();g.beginPath();g.arc(2,-34,8.6,0,TAU);g.fill();g.restore();continue}
 const s=p.s,sh=p.sh;g.globalAlpha=Math.min(1,a*1.4);
 switch(sh){
 case'ember':case'spark':case'wisp':case'star':g.globalCompositeOperation='lighter';
  if(sh==='star'){star(p.x,p.y,s*(.5+a*.8),p.c,t/200+p.x)}else if(sh==='wisp'){g.fillStyle=alpha(p.c,.8);g.beginPath();g.ellipse(p.x,p.y,s*.7,s*1.7*(.5+a*.5),0,0,TAU);g.fill()}else{g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,s*(.4+a*.6),0,TAU);g.fill();if(sh==='ember'){g.fillStyle=alpha(p.c,.16);g.beginPath();g.arc(p.x,p.y,s*1.5*a,0,TAU);g.fill()}}
  g.globalCompositeOperation='source-over';break;
 case'smoke':g.fillStyle=p.c;g.globalAlpha=a*.5;g.beginPath();g.arc(p.x,p.y,s*(1.6-a*.6),0,TAU);g.fill();break;
 case'dust':g.fillStyle=p.c;g.globalAlpha=a*.6;g.beginPath();g.arc(p.x,p.y,s*(1.4-a*.5),0,TAU);g.fill();break;
 case'flake':g.save();g.translate(p.x,p.y);g.rotate(t/400+p.x);g.strokeStyle=p.c;g.lineWidth=1;for(let i=0;i<3;i++){g.rotate(PI/3);g.beginPath();g.moveTo(-s,0);g.lineTo(s,0);g.stroke()}g.restore();break;
 case'leaf':case'petal':case'feather':g.save();g.translate(p.x,p.y);g.rotate(t/300+p.x*.1);g.fillStyle=p.c;g.beginPath();g.ellipse(0,0,s*(sh==='feather'?1.8:1.3),s*.6,0,0,TAU);g.fill();g.lineWidth=.8;g.strokeStyle='rgba(0,0,0,.5)';g.stroke();g.restore();break;
 case'bat':g.save();g.translate(p.x,p.y);g.fillStyle=p.c;const fw=Math.sin(t/40+p.x)*3;g.beginPath();g.moveTo(0,0);g.lineTo(-6,-3+fw);g.lineTo(-3,1);g.lineTo(0,3);g.lineTo(3,1);g.lineTo(6,-3+fw);g.closePath();g.fill();g.restore();break;
 default:g.fillStyle=p.c;g.beginPath();g.arc(p.x,p.y,s*(.4+a*.6),0,TAU);g.fill()}}
 g.globalAlpha=1;g.globalCompositeOperation='source-over'};
A.trail=function(list){const ac=A.accent();for(const s of list){const age=(t-s.t)/200;if(age>=1)continue;g.save();g.globalAlpha=(1-age)*.85;g.translate(s.x,s.y-16);g.rotate(s.a);g.globalCompositeOperation='lighter';
  if(s.k==='thrust'){const L=s.rg;g.beginPath();g.moveTo(12,0);g.lineTo(L*.55,-6);g.lineTo(L+10,0);g.lineTo(L*.55,6);g.closePath();g.fillStyle=lg(12,0,L+10,0,alpha(ac,0),'#ffffff',alpha(ac,.8));g.fill();g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=1.6;g.beginPath();g.moveTo(14,0);g.lineTo(L+8,0);g.stroke()}
  else{const R=s.rg*.98,r2=R*.5;g.beginPath();g.arc(0,0,R,-.66,.66);g.arc(0,0,r2,.66,-.66,true);g.closePath();const gr=g.createRadialGradient(0,0,r2,0,0,R);gr.addColorStop(0,alpha(ac,0));gr.addColorStop(.6,alpha(ac,.75));gr.addColorStop(1,'rgba(255,255,255,.95)');g.fillStyle=gr;g.fill();g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=2;g.beginPath();g.arc(0,0,R,-.62,.62);g.stroke();for(let i=0;i<3;i++){const a=-.5+i*.5;star(Math.cos(a)*R,Math.sin(a)*R,3,'rgba(255,255,255,.9)',a)}}
  g.restore()}};
const SKA=['#7bff7b','#ff9a30','#9be7ff'];
A.proj=function(p){g.save();g.translate(p.x,p.y);const sp=Math.hypot(p.vx,p.vy)||1,ac=p.from==='h'?(p.col&&!p.arrow?p.col:A.accent()):SKA[ti];
 if(p.wave){const a=p.a||0,R=p.r*1.7,age=1-clamp(p.life/(380+130*3),0,1);g.rotate(a);g.globalCompositeOperation='lighter';
  for(let k=3;k>=0;k--){g.save();g.translate(-k*9,0);g.globalAlpha=(1-k*.25)*.8;g.beginPath();g.arc(-R*.45,0,R,-1.05,1.05);g.arc(-R*.45+R*.34,0,R*.9,1.05,-1.05,true);g.closePath();g.fillStyle=k?alpha(ac,.5):lg(-R*.3,0,R*.6,0,alpha(ac,.7),'#ffffff');g.fill();g.restore()}
  g.globalAlpha=.95;g.strokeStyle='#fff';g.lineWidth=2;g.beginPath();g.arc(-R*.45,0,R,-.95,.95);g.stroke();glow(R*.4,0,R*.9,ac,.45);for(let i=0;i<3;i++)star(-R*.2-i*8,(i-1)*R*.5,2.4,'#fff',t/70+i)}
 else if(p.bullet){g.rotate(p.a||0);g.globalCompositeOperation='lighter';g.fillStyle=lg(-22,0,2,0,alpha(ac,0),alpha(ac,.85));g.beginPath();g.moveTo(-22,0);g.lineTo(0,-2.6);g.lineTo(0,2.6);g.closePath();g.fill();glow(0,0,9,ac,.8);g.fillStyle='#fff';g.beginPath();g.ellipse(-1,0,5,1.9,0,0,TAU);g.fill()}
 else if(p.en){g.rotate(t/100);add(()=>glow(0,0,p.r*2.6,'#5ae0ff',.6));ball(0,0,p.r,'#1f7fb8');dot(0,0,p.r*.5,'#eaffff');g.strokeStyle='rgba(200,255,255,.9)';g.lineWidth=1.4;for(let i=0;i<3;i++){const a=i*2.09+t/60;g.beginPath();g.moveTo(Math.cos(a)*p.r*.6,Math.sin(a)*p.r*.6);g.lineTo(Math.cos(a+.4)*p.r*1.5,Math.sin(a+.4)*p.r*1.5);g.stroke()}}
 else if(p.orb){g.rotate(t/140);add(()=>glow(0,0,p.r*2.4,'#b05aff',.55));ball(0,0,p.r,'#7a2ad0');dot(0,0,p.r*.45,'#f0d8ff');for(let i=0;i<3;i++){const a=t/90+i*2.1;dot(Math.cos(a)*p.r*1.25,Math.sin(a)*p.r*1.25,1.6,'#d8a8ff')}}
 else if(p.glob){g.rotate(t/160);ball(0,0,p.r,'#6adf4a');add(()=>glow(0,0,p.r*1.8,'#9aff6a',.5));dot(-p.r*.3,-p.r*.35,p.r*.22,'rgba(255,255,255,.6)')}
 else if(p.web){g.rotate(t/120);ball(0,0,p.r*.8,'#f4f4fa',1.4);g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1;for(let i=0;i<6;i++){const q=i/6*TAU;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(q)*p.r*1.5,Math.sin(q)*p.r*1.5);g.stroke()}}
 else if(p.rock){g.rotate(t/90+p.x);shadow(0,10,p.r*.9,p.r*.4,.3);ball(0,0,p.r,'#8a7a5a');g.strokeStyle='rgba(0,0,0,.45)';g.lineWidth=1.2;g.beginPath();g.moveTo(-p.r*.5,-p.r*.3);g.lineTo(0,0);g.lineTo(p.r*.3,p.r*.5);g.moveTo(0,0);g.lineTo(p.r*.6,-p.r*.2);g.stroke();dot(-p.r*.35,-p.r*.4,p.r*.18,'rgba(255,255,255,.5)')}
 else if(p.arrow){g.rotate(p.a||0);g.globalCompositeOperation='lighter';g.fillStyle=lg(-30,0,0,0,alpha(ac,0),alpha(ac,.6));g.beginPath();g.moveTo(-30,0);g.lineTo(-2,-3);g.lineTo(-2,3);g.closePath();g.fill();g.globalCompositeOperation='source-over';
  g.strokeStyle=OL;g.lineWidth=4;g.beginPath();g.moveTo(-11,0);g.lineTo(8,0);g.stroke();g.strokeStyle=p.from==='h'?'#e8e0c0':'#d8d2b8';g.lineWidth=2;g.stroke();poly([[8,-3.4],[15,0],[8,3.4]],p.from==='h'?'#e8eef2':'#4a4a52',1.2);
  poly([[-11,0],[-15,-4],[-8,-1.2]],p.from==='h'?'#ffffff':ac,1);poly([[-11,0],[-15,4],[-8,1.2]],p.from==='h'?'#d8d0b0':shade(ac,-.4),1);
  if(p.from==='e'){g.globalCompositeOperation='lighter';glow(10,0,9,ac,.7);g.globalCompositeOperation='source-over'}}
 else{g.rotate(p.a||0);g.globalCompositeOperation='lighter';g.fillStyle=lg(-26,0,0,0,alpha(ac,0),alpha(ac,.55));g.beginPath();g.moveTo(-26,0);g.lineTo(0,-6);g.lineTo(0,6);g.closePath();g.fill();glow(0,0,16,ac,.8);glow(0,0,7,'#ffffff',.9);for(let i=0;i<3;i++){const a=t/90+i*2.1;star(Math.cos(a)*8,Math.sin(a)*8,2.4,'#ffffff',a)}g.globalCompositeOperation='source-over'}
 g.restore()};
/* ====================== objetos: moneda, corazón, portal, cofre ====================== */
A.pick=function(k){const tt=t;
 if(k.t==='coin'){g.save();g.translate(k.x,k.y-k.z-5);shadow(0,k.z+5,4.6,2.2,.3);const sx=Math.abs(Math.cos(tt/200+k.x)),w=Math.max(.14,sx)*5.6;
  g.beginPath();g.ellipse(0,0,w+1.2,5.8,0,0,TAU);g.fillStyle='#a8741a';g.fill();g.beginPath();g.ellipse(0,0,w,5.4,0,0,TAU);g.fillStyle=lg(-w,-5,w,5,'#fff0a0','#d89a18','#ffd84a');g.fill();g.lineWidth=1.8;g.strokeStyle=OL;g.stroke();
  if(sx>.35){g.beginPath();g.ellipse(0,0,w*.64,3.4,0,0,TAU);g.strokeStyle='rgba(150,90,10,.6)';g.lineWidth=1;g.stroke();star(0,0,2.6*sx,'rgba(190,120,20,.8)',0)}
  if(Math.floor(tt/260+k.x)%5===0)star(w*.5,-3,3,'#ffffff',tt/100);g.restore()}
 else if(k.t==='heart'){g.save();const bob=-8-Math.sin(tt/260+k.x)*2.4,pu=1+Math.sin(tt/150)*.07;g.translate(k.x,k.y-k.z+bob);shadow(0,-bob+k.z,6.4,2.6,.3);add(()=>glow(0,0,18,'#ff4a6a',.5));g.scale(pu,pu);
  g.beginPath();g.moveTo(0,8);g.bezierCurveTo(-17,-3,-9,-14,0,-6);g.bezierCurveTo(9,-14,17,-3,0,8);g.fillStyle=rg(-3,-4,1,12,'#ff9aaa','#c81a3a','#ff4a6a');g.fill();g.lineWidth=2.2;g.strokeStyle=OL;g.stroke();g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(-5,-6,2.6,1.4,-.7,0,TAU);g.fill();if(Math.floor(tt/300+k.x)%4===0)star(7,-8,3,'#fff',tt/120);g.restore()}
 else if(k.t==='gem'||k.t==='fgem'){g.save();const bob=-9-Math.sin(tt/240+k.x)*2.4;g.translate(k.x,k.y-k.z+bob);shadow(0,-bob+k.z,6,2.4,.3);add(()=>glow(0,0,20,'#5ae6ff',.6));g.beginPath();g.moveTo(0,-10);g.lineTo(9,-3);g.lineTo(0,10);g.lineTo(-9,-3);g.closePath();g.fillStyle=lg(-9,-10,9,10,'#e8ffff','#1fa6e0','#7fe8ff');g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=1;g.beginPath();g.moveTo(-9,-3);g.lineTo(9,-3);g.moveTo(-3,-3);g.lineTo(0,10);g.moveTo(3,-3);g.lineTo(0,10);g.stroke();if(Math.floor(tt/280+k.x)%3===0)star(6,-8,3.4,'#fff',tt/110);g.restore()}
 else if(k.t==='fsoul'){g.save();const bob=-9-Math.sin(tt/260+k.x)*2.4;g.translate(k.x,k.y-k.z+bob);shadow(0,-bob+k.z,6,2.4,.3);add(()=>glow(0,0,22,'#b9a6ff',.7));g.beginPath();g.arc(0,0,7,0,TAU);g.fillStyle=rg(-2,-2,1,9,'#ffffff','#7a5ae0','#c9b8ff');g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();star(0,0,5,'#fff',tt/200);g.restore()}
 else if(k.t==='vale'){g.save();const bob=-10-Math.sin(tt/250+k.x)*2.6;g.translate(k.x,k.y-k.z+bob);shadow(0,-bob+k.z,8,3,.3);add(()=>glow(0,0,24,'#ffd84a',.6));g.rotate(Math.sin(tt/400+k.x)*.12);g.beginPath();g.rect(-11,-7,22,14);g.fillStyle=lg(-11,-7,11,7,'#fff0a0','#d89a18','#ffd84a');g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();g.strokeStyle='rgba(150,90,10,.7)';g.setLineDash([2,2]);g.beginPath();g.moveTo(5,-7);g.lineTo(5,7);g.stroke();g.setLineDash([]);star(-3,0,4,'rgba(150,90,10,.9)',0);if(Math.floor(tt/300+k.x)%3===0)star(9,-8,3.4,'#fff',tt/110);g.restore()}
 else if(k.t==='portal'){g.save();g.translate(k.x,k.y);const pu=.85+.15*Math.sin(tt/200);
  if(k.door){const ay=(k.wy||k.y-46)-k.y;g.save();const arch=()=>{g.beginPath();g.moveTo(-27,ay+6);g.lineTo(-27,ay-36);g.arc(0,ay-36,27,Math.PI,0);g.lineTo(27,ay+6)};
   arch();g.closePath();const gi=g.createRadialGradient(0,ay-8,2,0,ay-8,44);gi.addColorStop(0,'rgba(190,225,255,.95)');gi.addColorStop(.55,'rgba(90,120,220,.9)');gi.addColorStop(1,'rgba(25,35,100,.95)');g.fillStyle=gi;g.fill();
   add(()=>glow(0,ay-14,46*pu,'#8fc4ff',.45));
   arch();g.lineWidth=13;g.strokeStyle=OL;g.lineJoin='round';g.stroke();arch();g.lineWidth=8;g.strokeStyle='#8e99b2';g.stroke();arch();g.lineWidth=2;g.strokeStyle='rgba(255,255,255,.35)';g.stroke();
   rect(-9,ay-68,18,12,'#a7b2c8',2,2);for(const s of[-1,1]){rect(s*27-8,ay-6,16,14,'#6d7893',2,2)}g.restore()}
  const gr=g.createLinearGradient(0,-120,0,0);gr.addColorStop(0,'rgba(150,200,255,0)');gr.addColorStop(1,'rgba(180,220,255,.35)');g.fillStyle=gr;g.beginPath();g.moveTo(-30,0);g.lineTo(-18,-120);g.lineTo(18,-120);g.lineTo(30,0);g.fill();
  shadow(0,6,38,13,.3);add(()=>{g.scale(1,.55);glow(0,0,60*pu,'#7fb8ff',.7)});
  for(let i=0;i<5;i++){const r=38-i*6.5,a=tt/(280+i*70)*(i%2?-1:1);g.save();g.scale(1,.56);g.rotate(a);g.strokeStyle=['#7fe8ff','#b48aff','#ffffff','#5aa8ff','#c8f4ff'][i];g.lineWidth=4.4-i*.5;g.globalAlpha=.95;g.beginPath();g.arc(0,0,r,0,TAU*.72);g.stroke();g.restore()}
  g.save();g.scale(1,.56);g.fillStyle=rg(0,0,2,30,'rgba(255,255,255,.95)','rgba(120,80,255,.15)','rgba(160,210,255,.7)');g.beginPath();g.arc(0,0,30,0,TAU);g.fill();for(let i=0;i<10;i++){const a=tt/500+i*.628,d=(1-((tt/700+i*.17)%1))*34;star(Math.cos(a)*d,Math.sin(a)*d,2.2,'#ffffff',a)}g.restore();
  g.font='900 11px Trebuchet MS,sans-serif';g.textAlign='center';g.lineWidth=3.4;g.strokeStyle='#000';g.strokeText((k.hub?'Entrar a la mazmorra ▲':'Siguiente piso ▼'),0,-40);g.fillStyle='#e8f6ff';g.fillText((k.hub?'Entrar a la mazmorra ▲':'Siguiente piso ▼'),0,-40);g.restore()}};
A.chest=function(c){const tt=t,op=c.open?clamp((tt-c.open)/300,0,1):0,age=c.open?tt-c.open:0;g.save();g.translate(c.x,c.y);shadow(0,5,20,7.5,.38);
 if(!c.open){const pu=.7+.3*Math.sin(tt/260);add(()=>{glow(0,-12,50,'#ffd84a',.32*pu)});for(let i=0;i<4;i++){const a=tt/700+i*1.57,r=22+Math.sin(tt/300+i)*3;star(Math.cos(a)*r,-12+Math.sin(a)*r*.5,2.6,'#fff0a0',a)}}
 const bob=c.open?0:Math.sin(tt/300)*1;g.translate(0,bob);
 g.beginPath();g.rect(-17,-15,34,19);g.fillStyle=lg(0,-15,0,4,'#b07a3a','#5a3a1a','#8a5a2b');g.fill();g.lineWidth=2.6;g.strokeStyle=OL;g.stroke();g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;for(const x of[-9,0,9]){g.beginPath();g.moveTo(x,-14);g.lineTo(x,3);g.stroke()}
 if(c.open){g.beginPath();g.rect(-14,-14,28,5);g.fillStyle='#2a1a0a';g.fill();add(()=>{glow(0,-12,26,'#ffe27a',.9*(1-op*.4))})}
 rect(-17,-9,34,3.4,'#7a7a86',1.6,0);rect(-17,-2,34,3,'#7a7a86',1.6,0);for(const x of[-14,14])for(const y of[-8,-1])dot(x,y,1,'#d0d0dc');
 rect(-4.4,-11,8.8,9,'#e0a020',1.8,2);g.fillStyle=K('#2a1a0a');g.beginPath();g.arc(0,-7.6,1.5,0,TAU);g.fill();g.fillRect(-.6,-7.6,1.2,3.6);
 g.save();g.translate(0,-14);g.rotate(-op*1.45);g.translate(0,14);
 g.beginPath();g.moveTo(-17,-14);g.lineTo(17,-14);g.lineTo(15,-25);g.quadraticCurveTo(0,-30,-15,-25);g.closePath();g.fillStyle=lg(0,-28,0,-14,'#c48a42','#7a4a22','#a0702f');g.fill();g.lineWidth=2.6;g.strokeStyle=OL;g.stroke();rect(-17,-18,34,3.2,'#7a7a86',1.6,0);rect(-16,-23.4,32,2.6,'#7a7a86',1.4,0);g.fillStyle='rgba(255,255,255,.2)';g.beginPath();g.ellipse(-7,-22,7,2,0,0,TAU);g.fill();g.restore();
 if(c.open&&age<900){for(let i=0;i<8;i++){const a=-1.57+(i-3.5)*.3,d=eo(age/700)*40,fa=1-age/900;g.globalAlpha=fa;star(Math.cos(a)*d,-14+Math.sin(a)*d*1.2,3.4,i%2?'#fff0a0':'#ffd84a',age/90+i)}g.globalAlpha=1;add(()=>{g.fillStyle='rgba(255,240,170,'+(.5*(1-age/900))+')';g.fillRect(-9,-120*eo(age/500),18,120*eo(age/500))})}
 g.restore()};
/* ====================== enemigos (variantes por tema de piso) ====================== */
const EP=[ // 0 catacumbas, 1 lava, 2 glaciar
 {slime:'#5ad05a',slime2:'#2f8a3a',bat:'#8a5ad0',batw:'#5a3a90',eye:'#ffdf6a',gob:'#7cbd45',gobc:'#4a7a2a',skel:'#e8e2c8',sk2:'#10140f',skeye:'#7bff7b',ogre:'#a4b660',ogc:'#7a8a3c',glow:'#7bff7b'},
 {slime:'#ff7a2a',slime2:'#8a2a0a',bat:'#d8402a',batw:'#7a1a10',eye:'#ffe27a',gob:'#d8603a',gobc:'#7a2a1a',skel:'#4a3a36',sk2:'#2a100a',skeye:'#ff9a30',ogre:'#c8584a',ogc:'#7a2a22',glow:'#ff9a30'},
 {slime:'#7fd8ff',slime2:'#2a78b8',bat:'#c8e8ff',batw:'#6a9ad0',eye:'#4cf0ff',gob:'#8ab0c8',gobc:'#4a6a8a',skel:'#cfe8f4',sk2:'#0a1a2a',skeye:'#4cf0ff',ogre:'#9ab8d0',ogc:'#5a7a98',glow:'#9be7ff'}];
function fig(e,s,fn){g.save();g.translate(e.x,e.y-(e.z||0));shadow(0,2+(e.z||0),12*s*Math.max(.05,1-(e.z||0)/90),5.4*s,.34);g.scale(s,s);
 if(e.dashA!==undefined){g.rotate(e.dashA);g.scale(1.3,.8);g.rotate(-e.dashA)}g.rotate(clamp(e.vx*.09,-.5,.5)*.14);g.scale(e.face*(1+(e.sq||0)*.6),1-(e.sq||0)*.8);fn();g.restore()}
function slime(e,H){const T=EP[ti],big=e.t==='slime',R=e.r*1.05,tele=e.st==='tele',hop=e.st==='hop',cr=(e.crouch||0)*.28,wob=Math.sin(t/180+e.ph)*.06,sx=1+e.sq*.7+cr*.7+wob,sy=1-e.sq*.8-cr-wob,fl=FL;
 g.save();g.translate(e.x,e.y-(e.z||0));g.save();g.globalAlpha*=.3;g.fillStyle=T.slime2;g.beginPath();g.ellipse(0,(e.z||0)+1,R*1.05*Math.max(.05,1-(e.z||0)/70),R*.42,0,0,TAU);g.fill();g.restore();shadow(0,2+(e.z||0),R*.95*Math.max(.05,1-(e.z||0)/60),R*.4,.3);g.scale(sx,sy);
 g.beginPath();const n=22;for(let i=0;i<=n;i++){const a=i/n*TAU,r=R*(1+Math.sin(a*3+t/200+e.ph)*.05+Math.sin(a*5-t/150)*.025),px=Math.cos(a)*r,py=-R*.75+Math.sin(a)*r*.85*(Math.sin(a)>0?.75:1);i?g.lineTo(px,py):g.moveTo(px,py)}g.closePath();
 g.globalAlpha*=.93;g.fillStyle=rg(-R*.3,-R*1.1,2,R*1.4,shade(T.slime,.6),shade(T.slime2,-.2),T.slime);g.fill();g.globalAlpha=1;g.lineWidth=2.4;g.strokeStyle=OL;g.stroke();
 if(!fl){g.save();g.clip();g.fillStyle=alpha(T.slime2,.35);g.beginPath();g.ellipse(0,-R*.2,R*1.1,R*.4,0,0,TAU);g.fill();
  if(ti===1){g.strokeStyle='#ffd84a';g.lineWidth=1.6;g.beginPath();g.moveTo(-R*.6,-R*.5);g.lineTo(-R*.2,-R*.8);g.lineTo(-R*.3,-R*1.1);g.moveTo(R*.5,-R*.4);g.lineTo(R*.2,-R*.7);g.lineTo(R*.45,-R*1);g.stroke();add(()=>glow(0,-R*.7,R*1.1,'#ff9a30',.45))}
  if(ti===2){g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.moveTo(-R*.8,-R*.3);g.lineTo(-R*.3,-R*1.2);g.lineTo(0,-R*.3);g.fill();g.beginPath();g.moveTo(R*.1,-R*.3);g.lineTo(R*.5,-R*1.1);g.lineTo(R*.9,-R*.3);g.fill()}
  for(let i=0;i<4;i++){const bx=Math.sin(t/700+i*1.9+e.ph)*R*.55,by=-R*.5-((t/40+i*13+e.ph*9)%(R*.9));g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1;g.beginPath();g.arc(bx,by,1.2+i%2,0,TAU);g.stroke()}
  add(()=>glow(0,-R*.65,R*.55,shade(T.slime,.5),.5));ball(R*.05,-R*.6,R*.22,shade(T.slime2,-.1),0);g.restore();
  g.fillStyle='rgba(255,255,255,.65)';g.beginPath();g.ellipse(-R*.38,-R*1.06,R*.3,R*.14,-.5,0,TAU);g.fill();dot(-R*.05,-R*1.2,R*.08,'rgba(255,255,255,.7)');
  const dxp=clamp((H.x-e.x)/60,-1,1),dyp=clamp((H.y-e.y)/60,-1,1);for(const ex of[-.34,.34]){g.fillStyle='#fff';g.beginPath();g.ellipse(ex*R*1.2,-R*.8,R*.21,tele?R*.1:R*.27,0,0,TAU);g.fill();g.lineWidth=1.2;g.strokeStyle=OL;g.stroke();dot(ex*R*1.2+dxp*2,-R*.8+dyp*1.5,R*.11,'#1a1a22')}
  g.strokeStyle=OL;g.lineWidth=1.8;g.beginPath();if(tele||hop){g.ellipse(0,-R*.42,R*.2,R*.12+Math.sin(t/50)*1,0,0,TAU);g.fillStyle='#3a0a14';g.fill();g.stroke()}else{g.arc(0,-R*.55,R*.22,.2,PI-.2);g.stroke()}
  if(tele){g.strokeStyle='#ff4a4a';g.lineWidth=2;g.beginPath();g.ellipse(0,-R*.6,R*1.15,R*.9,0,0,TAU);g.stroke();for(const s of[-1,1]){g.strokeStyle='#1a1a22';g.lineWidth=2;g.beginPath();g.moveTo(s*R*.62,-R*1.15);g.lineTo(s*R*.14,-R*.98);g.stroke()}}}
 g.restore();
 if(e.elite){g.save();g.translate(e.x,e.y-(e.z||0)-R*1.9);poly([[-6,0],[-6,-6],[-3,-3],[0,-8],[3,-3],[6,-6],[6,0]],'#ffd84a',1.5);dot(0,-3,1.3,'#ff4a4a');g.restore()}}
function bat(e,H){const T=EP[ti],fl=FL,tele=e.st==='tele',sw=e.st==='swoop',f=sw?.25:Math.sin(t/(tele?30:52)+e.ph),z=e.z||12;
 g.save();g.translate(e.x,e.y);shadow(0,4,9,3.6,.3);g.translate(0,-z);if(sw)g.rotate(Math.atan2(e.vy,e.vx)*.25);g.scale(1+e.sq*.5,1-e.sq*.5);
 if(sw){g.globalAlpha*=.35;for(let i=1;i<4;i++){dot(-e.vx*i*1.6,-e.vy*i*1.6,8-i,T.bat)}g.globalAlpha=1}
 if(ti===1)add(()=>glow(0,0,24,'#ff6a1a',.35));
 for(const s of[-1,1]){g.save();g.scale(s,1);g.rotate(f*.55-.15+(sw?.8:0));const wc=T.batw;
  g.beginPath();g.moveTo(3,-1);g.lineTo(11,-9+f*3);g.lineTo(26,-12+f*5);g.quadraticCurveTo(24,-4,28,2+f*3);g.quadraticCurveTo(21,0,22,8+f*2);g.quadraticCurveTo(15,4,12,10);g.quadraticCurveTo(8,6,4,7);g.closePath();g.fillStyle=lg(3,0,28,0,shade(wc,.3),shade(wc,-.4),wc);g.fill();g.lineWidth=2;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
  if(!fl){g.strokeStyle=shade(wc,-.55);g.lineWidth=1.4;g.beginPath();g.moveTo(11,-9+f*3);g.lineTo(28,2+f*3);g.moveTo(11,-9+f*3);g.lineTo(22,8+f*2);g.moveTo(11,-9+f*3);g.lineTo(12,10);g.stroke();if(ti===1){g.strokeStyle='rgba(255,200,80,.7)';g.stroke()}}g.restore()}
 ball(0,0,7.8,fl?'#fff':shade(T.bat,-.1));if(!fl){g.fillStyle=shade(T.bat,.45);g.beginPath();g.ellipse(0,2.6,4,3.6,0,0,TAU);g.fill();g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-3+i*3,1);g.lineTo(-2+i*3,5);g.stroke()}
  poly([[-6,-4],[-8,-14],[-1.6,-7]],T.batw,1.6);poly([[6,-4],[8,-14],[1.6,-7]],T.batw,1.6);poly([[-5.4,-5],[-6.4,-11],[-2.4,-7]],'#e8a0b8',0);poly([[5.4,-5],[6.4,-11],[2.4,-7]],'#e8a0b8',0);
  const ec=tele||sw?'#ff3a3a':T.eye;add(()=>{glow(-2.8,-1.4,4.6,ec,.8);glow(2.8,-1.4,4.6,ec,.8)});dot(-2.8,-1.4,1.8,ec);dot(2.8,-1.4,1.8,ec);dot(0,1,1,'#2a1a30');
  if(tele||sw||Math.sin(t/900+e.ph)>.7){poly([[-2.4,2.6],[-1.6,5.6],[-.6,2.8]],'#fff',.8);poly([[2.4,2.6],[1.6,5.6],[.6,2.8]],'#fff',.8)}
  for(const s of[-1,1]){line(s*2.4,7,s*3,10+Math.sin(t/120+e.ph)*1.2,1.6,'#2a1a30')}}
 if(tele){g.strokeStyle='rgba(255,90,90,'+(.7*(1-((t/400)%1)))+')';g.lineWidth=2;g.beginPath();g.arc(0,-2,10+((t/400)%1)*16,0,TAU);g.stroke()}
 g.restore()}
function gob(e,H){const T=EP[ti],tele=e.st==='tele',dash=e.st==='dash',rest=e.st==='rest',mv=Math.min(1,Math.hypot(e.vx,e.vy)/2.2),aim=Math.atan2(H.y-e.y,H.x-e.x);const ra=e.raise||0,cr=(e.crouch||0)*5,bl=(t%3000)<120;
 const o={x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,face:e.face,sq:e.sq,dashA:dash?Math.atan2(e.vy,e.vx):undefined};
 fig(o,1.12,()=>{const ph=e.ph,b=Math.abs(Math.sin(ph))*2*mv+Math.sin(t/300+e.ph)*.7*(1-mv)-cr*.2,sh=tele?Math.sin(t/25)*.8:0,sk=T.gob,cl=T.gobc;
  for(let k=1;k>=0;k--){const p=ph+k*PI,fx=Math.sin(p)*5.4*mv+(k?-2:2),fy=-Math.max(0,Math.cos(p))*3.6*mv;limb(k?-2.8:2.8,-10+cr*.5,fx,fy-1.6,4,shade(sk,-.25));ell(fx+1.4,fy-.4,4.6,2.5,'#3a2a1a',0,1.8)}
  g.save();g.translate(sh,-b+cr);
  g.beginPath();g.moveTo(-6,-10);g.lineTo(-3,-4);g.lineTo(0,-8);g.lineTo(3,-4);g.lineTo(6,-10);g.closePath();g.fillStyle=K('#6a4a2a');g.fill();g.lineWidth=1.6;g.strokeStyle=OL;g.stroke();
  limb(-5,-21,-7+Math.sin(ph)*3*mv,-13,3.6,sk);ball(-7+Math.sin(ph)*3*mv,-12.4,2.4,sk);
  g.beginPath();g.moveTo(-6.6,-24);g.quadraticCurveTo(0,-26.6,6.6,-24);g.lineTo(7.4,-12);g.lineTo(-7.4,-12);g.closePath();g.fillStyle=lg(-7,-24,7,-12,shade(cl,.35),shade(cl,-.4),cl);g.fill();g.lineWidth=2.2;g.strokeStyle=OL;g.stroke();
  rect(-7.6,-14,15.2,3,'#4a2a14',1.4,1);dot(0,-12.6,1.4,'#e0a020');for(let i=0;i<3;i++)dot(-3.6+i*3.6,-20,.9,'#c8c8d0');
  for(let i=0;i<4;i++)poly([[-4+i*2.8-1.1,-24.6],[-4+i*2.8,-21],[-4+i*2.8+1.1,-24.6]],'#f4efd8',.8);
  ball(-6,-24.4,3.6,'#5a4a3a');for(let i=0;i<3;i++)poly([[-8+i*2.6,-27],[-7+i*2.6,-31],[-5.6+i*2.6,-27]],'#c8c8d0',1);
  const hx=1,hy=-31.4;poly([[hx-5.6,hy-1],[hx-16,hy-5+Math.sin(t/200)*1.4],[hx-5,hy+3.4]],sk,1.6);poly([[hx+4,hy-4],[hx+14,hy-7],[hx+5,hy+1]],sk,1.6);
  ball(hx,hy,9.4,sk);g.fillStyle=K('#5a3a22');g.beginPath();g.arc(hx,hy-1.6,9.6,PI+.15,TAU-.15);g.lineTo(hx+7,hy-4.4);g.lineTo(hx-7,hy-4.4);g.closePath();g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  for(const x of[hx+1.4,hx+6.8]){g.fillStyle=K(tele||dash?'#ff4a2a':T===EP[0]?'#ffe27a':'#ffd84a');g.beginPath();g.ellipse(x,hy+.4,2.2,bl?.5:2.1,0,0,TAU);g.fill();g.lineWidth=1.1;g.strokeStyle=OL;g.stroke();if(!bl)rect(x-.4,hy-1.4,.9,3.4,'#1a0a0a',0)}
  brow(hx+1.6,hy-2.4,tele||dash?.5:.25,3,'#1a1008');brow(hx+7,hy-2.4,tele||dash?-.5:-.25,2.8,'#1a1008');
  ball(hx+10.2,hy+2.2,2.2,shade(sk,-.1),1.4);g.beginPath();g.moveTo(hx+1,hy+5.6);g.quadraticCurveTo(hx+5,hy+8.6,hx+9.6,hy+5.4);g.lineTo(hx+9,hy+7.6);g.quadraticCurveTo(hx+5,hy+10,hx+1.4,hy+7.4);g.closePath();g.fillStyle=K('#2a0a0a');g.fill();for(let i=0;i<3;i++)poly([[hx+2.4+i*2.6,hy+6],[hx+3.4+i*2.6,hy+8.2],[hx+4.4+i*2.6,hy+6.2]],'#f4efd8',.7);
  if(ti===1){CREST.horn({crest:'#d8d0b0'},hx,hy-2,'#d8d0b0')}else if(ti===2){ball(hx,hy-7,6.4,'#e8f0f6');ball(hx-1,hy-10,3,'#ffffff')}else{rect(hx-9,hy-6,18,3.2,'#b0302a',1.3,1);poly([[hx-9,hy-5],[hx-15,hy-2+Math.sin(t/150)*1.4],[hx-9,hy-2.4]],'#b0302a',1.2)}
  const wa=lerp(.35,-2.1,ra)+(dash?1.9:0),hx2=6+Math.cos(wa)*8,hy2=-19+Math.sin(wa)*8;limb(6,-21,hx2,hy2,3.8,sk);
  g.save();g.translate(hx2,hy2);g.rotate(wa);rect(-5,-1.6,6,3.2,'#4a2a14',1.4,1);rect(.4,-4,2.6,8,'#8a6a2a',1.4,1);poly([[2.6,-2.4],[14,-3],[22,0],[14,3.6],[10,2],[2.6,2.6]],'#c8d0d6',1.8);g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1;g.beginPath();g.moveTo(4,-1.6);g.lineTo(20,-.4);g.stroke();for(let i=0;i<3;i++)poly([[8+i*4,3],[9+i*4,5.6],[11+i*4,3.2]],'#c8d0d6',.9);if(tele)add(()=>glow(14,0,12,'#ff4a2a',.5));g.restore();ball(hx2,hy2,2.6,sk);
  g.restore()});
 if(e.elite)crownE(e,34)}
function crownE(e,hgt){g.save();g.translate(e.x,e.y-(e.z||0)-hgt);add(()=>glow(0,-4,16,'#ffd84a',.4));poly([[-5,0],[-5,-5],[-2.4,-2.6],[0,-7],[2.4,-2.6],[5,-5],[5,0]],'#ffd84a',1.4);dot(0,-2.6,1.1,'#ff4a4a');g.restore()}
function skel(e,H){const T=EP[ti],tele=e.st==='tele',mv=Math.min(1,Math.hypot(e.vx,e.vy)/2.2),aim=Math.atan2(H.y-e.y,H.x-e.x),ra=e.raise||0,bl=(t%2600)<110,rat=(Math.sin(t/37+e.ph)*.5)*(tele?1.8:.7);
 const o={x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,face:e.face,sq:e.sq};const bone=T.skel;
 fig(o,1.1,()=>{const ph=e.ph,b=Math.abs(Math.sin(ph))*2*mv+Math.sin(t/340+e.ph)*.6*(1-mv);
  for(let k=1;k>=0;k--){const p=ph+k*PI,fx=Math.sin(p)*5.6*mv+(k?-2:2),fy=-Math.max(0,Math.cos(p))*3.6*mv,hl=k?-2.8:2.8,mx=(hl+fx)/2+1.6,my=-5.6+fy/2;limb(hl,-10,mx,my,2.2,bone);limb(mx,my,fx,fy-1.4,2,bone);ball(mx,my,1.8,bone,1.2);ell(fx+1.8,fy-.4,4.2,2,shade(bone,-.15),0,1.6)}
  g.save();g.translate(rat*.4,-b);
  if(e.t==='skel'){g.save();g.translate(-6,-17);g.rotate(-.6);rect(-2.6,-8,5,16,'#5a3a1c',1.4,2);for(let i=0;i<3;i++){line(-1.6+i*1.6,-8,-1.6+i*1.6,-12-i%2*2,1,'#e8e0c0');poly([[-2.4+i*1.6,-12-i%2*2],[-1.6+i*1.6,-15-i%2*2],[-.8+i*1.6,-12-i%2*2]],T.glow,.7)}g.restore()}
  g.beginPath();g.moveTo(-7,-23);g.lineTo(-9,-6);g.lineTo(-3,-9);g.lineTo(-2,-3);g.lineTo(3,-8);g.lineTo(8,-4);g.lineTo(7,-23);g.closePath();g.fillStyle=K(ti===1?'#2a1410':ti===2?'#2a3a54':'#34343e');g.globalAlpha=.001;g.fill();g.globalAlpha=1;
  rect(-3,-13,6,4,shade(bone,-.2),1.4,1);g.beginPath();g.ellipse(0,-18,6.4,6.4,0,0,TAU);g.fillStyle=K(T.sk2);g.fill();g.lineWidth=1.8;g.strokeStyle=OL;g.stroke();
  limb(0,-24,0,-12,1.8,bone);for(let i=0;i<4;i++){const y=-22.4+i*2.8;for(const s of[-1,1]){g.beginPath();g.moveTo(0,y);g.quadraticCurveTo(s*7.6,y-1.4,s*6.4,y+2.4);g.lineWidth=3;g.strokeStyle=OL;g.stroke();g.lineWidth=1.6;g.strokeStyle=K(bone);g.stroke()}}
  if(ti!==2)add(()=>glow(0,-18,6,T.glow,.35+.2*Math.sin(t/200)));else add(()=>glow(0,-18,6,'#9be7ff',.3));
  g.beginPath();g.moveTo(-9,-25);g.quadraticCurveTo(-2,-29,8,-25);g.lineTo(5,-21);g.lineTo(2,-23);g.lineTo(-2,-20.6);g.lineTo(-5,-23);g.lineTo(-9,-21);g.closePath();g.fillStyle=K(ti===1?'#4a1a10':ti===2?'#3a5a88':'#3a3a48');g.fill();g.lineWidth=1.8;g.strokeStyle=OL;g.stroke();
  limb(-5,-23,-7+Math.sin(ph)*3*mv,-14,2,bone);ball(-7+Math.sin(ph)*3*mv,-13.4,1.8,bone);
  const hx=1,hy=-30,jw=tele?3:Math.abs(rat)*1.4;ell(hx+2,hy+7+jw,4.6,2.6,shade(bone,-.08));g.strokeStyle=shade(bone,-.5);g.lineWidth=.9;for(let i=0;i<4;i++){g.beginPath();g.moveTo(hx-.4+i*1.8,hy+6+jw);g.lineTo(hx-.4+i*1.8,hy+8.6+jw);g.stroke()}
  ball(hx,hy,8.6,bone);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.beginPath();g.moveTo(hx-5,hy-7);g.lineTo(hx-3,hy-3.4);g.lineTo(hx-5.4,hy-.8);g.stroke();
  const ec=tele?'#ff3a3a':T.skeye;add(()=>{glow(hx+2.6,hy-.6,6,ec,.7);glow(hx+7,hy-.6,6,ec,.7)});for(const x of[hx+2.6,hx+7]){g.beginPath();g.ellipse(x,hy-.6,2.1,2.6,0,0,TAU);g.fillStyle=K(T.sk2);g.fill();if(!bl)dot(x,hy-.4,1,ec)}poly([[hx+8.6,hy+2.4],[hx+7.2,hy+4.6],[hx+10,hy+4.6]],T.sk2,.8);
  if(ti===1){for(let i=-1;i<=1;i++)flameShape(hx+i*3.6,hy-7,4.8,8+Math.sin(t/60+i)*2.4,'#ff5a1a','#ffe27a',i)}else if(ti===2){for(let i=-1;i<=1;i++)poly([[hx+i*3.6-1.6,hy-7],[hx+i*3.6,hy-13-(i?0:3)],[hx+i*3.6+1.6,hy-7]],'#e8f8ff',1.2)}
  const ta=Math.atan2(Math.sin(aim),Math.cos(aim)*e.face),R=8,hx2=5+Math.cos(ta)*R,hy2=-19+Math.sin(ta)*R;limb(5,-22,hx2,hy2,2,bone);g.save();g.translate(hx2,hy2);g.rotate(ta);
  const pull=ra,px=-pull*10;g.beginPath();g.arc(-1,0,16,-1.15,1.15);g.lineWidth=5.6;g.strokeStyle=OL;g.stroke();g.lineWidth=3;g.strokeStyle=K('#d8d2b8');g.stroke();for(const s of[-1,1])ball(Math.cos(1.15)*16-1,s*Math.sin(1.15)*16,1.6,'#b8b09a');
  g.beginPath();g.moveTo(Math.cos(1.15)*16-1,-Math.sin(1.15)*16);g.lineTo(px,0);g.lineTo(Math.cos(1.15)*16-1,Math.sin(1.15)*16);g.lineWidth=1.2;g.strokeStyle='#e8e0d0';g.stroke();
  g.beginPath();g.moveTo(px,0);g.lineTo(px+24,0);g.lineWidth=2.8;g.strokeStyle=OL;g.stroke();g.lineWidth=1.4;g.strokeStyle='#d8d2b8';g.stroke();poly([[px+24,-3],[px+31,0],[px+24,3]],'#4a4a52',1.2);poly([[px+1,0],[px+6,-3.4],[px+7,0]],T.glow,.8);
  if(pull>.3)add(()=>glow(px+28,0,10,T.glow,.8*pull));g.restore();ball(hx2,hy2,2,bone);
  g.restore()});
 if(e.elite)crownE(e,40)}
function ogre(e,H){const T=EP[ti],enr=!!e.enr,st=e.st,mv=Math.min(1,Math.hypot(e.vx,e.vy)/2),ra=e.raise||0,cr=(e.crouch||0)*7,aim=Math.atan2(H.y-e.y,H.x-e.x);
 const roar=st==='roar'||(st==='tele'&&e.kind==='throw'),stun=st==='stunw',air=st==='air',rush=st==='rush',land=st==='land';
 const o={x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,face:e.face,sq:e.sq,dashA:rush?Math.atan2(e.vy,e.vx):undefined};const sk=T.ogre,cl=T.ogc;
 if(enr){g.save();g.translate(e.x,e.y);add(()=>{g.scale(1,.6);glow(0,-30,70+Math.sin(t/100)*6,'#ff2a1a',.35)});g.restore()}
 fig(o,2.05,()=>{const ph=e.ph,br=Math.sin(t/(enr?160:300))*1.1,b=Math.abs(Math.sin(ph))*1.6*mv-cr*.15;
  for(let k=1;k>=0;k--){const p=ph+k*PI,fx=Math.sin(p)*4.6*mv+(k?-4.4:4.4),fy=-Math.max(0,Math.cos(p))*3.4*mv;limb(k?-4.4:4.4,-11+cr*.4,fx,fy-1.6,6.8,shade(sk,-.28));ell(fx+1.8,fy-.6,6,3.2,'#3a2a1a',0,2);rect(fx-3,fy-5,8,2.4,'#5a4a3a',1.2,1)}
  g.save();g.translate(0,-b+cr);
  g.beginPath();g.moveTo(-9,-12);g.lineTo(-7,-3);g.lineTo(-2.4,-6);g.lineTo(0,-1);g.lineTo(2.4,-6);g.lineTo(7,-3);g.lineTo(9,-12);g.closePath();g.fillStyle=K('#7a5a3a');g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  limb(-9,-25,-12+Math.sin(ph)*2*mv,-14,6,sk);rect(-15,-18,6.4,3.4,'#8a8a96',1.4,1);ball(-12.4+Math.sin(ph)*2*mv,-12,3.8,sk);
  g.beginPath();g.moveTo(-9.6,-29);g.quadraticCurveTo(0,-32+br*.3,9.6,-29);g.lineTo(11.6,-17);g.quadraticCurveTo(12.6,-10,0,-9);g.quadraticCurveTo(-12.6,-10,-11.6,-17);g.closePath();g.fillStyle=lg(-10,-30,10,-9,shade(sk,.34),shade(sk,-.45),sk);g.fill();g.lineWidth=2.6;g.strokeStyle=OL;g.stroke();
  if(!FL){g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.2;g.beginPath();g.moveTo(0,-29);g.lineTo(0,-19);g.moveTo(-8,-26);g.quadraticCurveTo(-3,-22,0,-23);g.quadraticCurveTo(3,-22,8,-26);g.stroke();g.beginPath();g.moveTo(3,-20);g.quadraticCurveTo(6,-17,4,-12);g.stroke();g.strokeStyle='rgba(255,255,255,.18)';g.beginPath();g.moveTo(-3,-27);g.lineTo(-7,-20);g.stroke();
   g.strokeStyle='#d8c8b0';g.lineWidth=1;g.beginPath();g.moveTo(-6,-16);g.lineTo(-3,-14.4);g.moveTo(-4.6,-14.6);g.lineTo(-5.8,-17.4);g.stroke();
   if(enr){g.strokeStyle='rgba(255,70,40,.85)';g.lineWidth=1.3;g.beginPath();g.moveTo(-8,-24);g.lineTo(-5,-21);g.lineTo(-7,-17);g.moveTo(8,-23);g.lineTo(5,-20);g.lineTo(7,-16);g.stroke();add(()=>glow(0,-20,12,'#ff3a1a',.35))}}
  rect(-11.4,-14.4,22.8,4.2,'#4a2a14',1.6,1.2);ball(0,-12.3,2.8,'#e8e2c8',1.4);dot(-1,-12.8,.7,OL);dot(1,-12.8,.7,OL);
  for(const s of[-1,1]){const x=s*9.6;ball(x,-28,5.4,'#7a7a88');g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();g.arc(x,-28,3.6,.5,2.6);g.stroke();for(let i=0;i<3;i++){g.save();g.translate(x,-28);g.rotate(-1.57+(i-1)*.7);poly([[3,-1.8],[9,0],[3,1.8]],'#c8c8d4',1.2);g.restore()}}
  const hx=1.4,hy=-35+(roar?-1:0);
  poly([[hx-7.6,hy-1.4],[hx-11.6,hy-4.4],[hx-7.4,hy+2.4]],sk,1.5);
  ball(hx,hy,8,sk);
  g.beginPath();g.arc(hx,hy-2,8.2,PI+.1,TAU-.1);g.lineTo(hx+7,hy-4);g.lineTo(hx-7,hy-4);g.closePath();g.fillStyle=lg(hx-8,hy-10,hx+8,hy-3,'#9a9aa8','#4a4a58','#7a7a88');g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  CREST.horn({crest:'#e8e2c8'},hx,hy+1,'#e8e2c8');for(let i=0;i<3;i++)dot(hx-4+i*4,hy-6.4,.9,'#c8c8d4');
  const ec=enr?'#ff3a1a':T.glow==='#7bff7b'?'#ffcf3a':'#ffe27a';add(()=>{glow(hx+3,hy-.4,5,ec,enr?.9:.5);glow(hx+7.6,hy-.4,5,ec,enr?.9:.5)});for(const x of[hx+3,hx+7.6]){g.fillStyle=K(ec);g.beginPath();g.ellipse(x,hy-.4,1.9,1.5,0,0,TAU);g.fill();g.lineWidth=1;g.strokeStyle=OL;g.stroke()}
  brow(hx+3,hy-2.6,.5,3.4,'#1a1008');brow(hx+7.6,hy-2.6,-.5,3.2,'#1a1008');line(hx+1,hy-4.4,hx+3,hy+1,1,'#8a1a1a');
  const mo=roar?4.6+Math.sin(t/40):1.4;g.beginPath();g.ellipse(hx+5.2,hy+4.6+mo*.4,4.2,1.6+mo,0,0,TAU);g.fillStyle=K('#3a0a14');g.fill();g.lineWidth=1.6;g.strokeStyle=OL;g.stroke();
  for(const x of[hx+2.2,hx+8.2])poly([[x-1.4,hy+5.6+mo*.5],[x,hy-1.2],[x+1.4,hy+5.6+mo*.5]],'#f4efd8',1.3);
  if(roar||enr)for(let i=0;i<3;i++){const ph2=((t/500+i*.33)%1);g.fillStyle='rgba(255,255,255,'+(.4*(1-ph2))+')';g.beginPath();g.arc(hx+10+ph2*10,hy+2-ph2*8,2+ph2*5,0,TAU);g.fill()}
  const wa=stun?.9:lerp(.5,-2.3,ra)+(land?.95:0)+(rush?.4:0),R=11,hx2=9.6+Math.cos(wa)*R,hy2=-24+Math.sin(wa)*R;
  limb(9.6,-26,hx2,hy2,6.4,sk);rect(hx2-4,hy2-4,8,4,'#8a8a96',1.4,1);
  g.save();g.translate(hx2,hy2);g.rotate(wa);
  g.beginPath();g.moveTo(-6,-3);g.lineTo(22,-5);g.quadraticCurveTo(38,-12,42,-1);g.quadraticCurveTo(44,0,42,1);g.quadraticCurveTo(38,12,22,5);g.lineTo(-6,3);g.closePath();g.fillStyle=lg(0,-10,0,10,'#b07a42','#5a3a1c','#8a5a2b');g.fill();g.lineWidth=2.6;g.strokeStyle=OL;g.stroke();
  g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;for(let i=0;i<5;i++){g.beginPath();g.moveTo(26+i*3,-8+i);g.lineTo(28+i*3,8-i);g.stroke()}
  for(const x of[18,30]){rect(x,-8,4,16,'#6a6a78',1.4,1)}
  for(const[sx,sy,r]of[[26,-9,0],[36,-9,.3],[26,9,0],[36,9,-.3],[43,0,0]]){g.save();g.translate(sx,sy);g.rotate(r+(sy>0?PI/2:sy<0?-PI/2:0));poly([[-2,-2.2],[5.4,0],[-2,2.2]],'#d8d8e4',1.2);g.restore()}
  if(enr){const pu=.6+.4*Math.sin(t/110);add(()=>glow(32,0,22,'#ff3a1a',.55*pu));g.strokeStyle=alpha('#ff6a2a',.9);g.lineWidth=1.6;g.beginPath();g.moveTo(24,-3);g.lineTo(30,0);g.lineTo(26,3);g.moveTo(34,-3);g.lineTo(38,2);g.stroke()}
  g.restore();ball(hx2,hy2,4.4,sk);
  if(stun)for(let i=0;i<3;i++){const a=t/200+i*2.1;star(hx+Math.cos(a)*12,hy-14+Math.sin(a)*3.6,3.4,'#ffe27a',a)}
  g.restore()})}
/* ====================== avisos de ataque (suelo) y ondas ====================== */
/* ---- sala del héroe: estaciones y ganchos ---- */
A.st=function(o){g.save();g.translate(o.x,o.y);
 if(o.act==='hook'){rect(-22,-62,44,56,'#5a3e22',2.2,4);rect(-18,-58,36,48,'#2c2116',1.4,3);dot(-15,-54,1.7,'#c9b27a');dot(15,-54,1.7,'#c9b27a');dot(-15,-14,1.7,'#c9b27a');dot(15,-14,1.7,'#c9b27a');g.restore();return}
 if(o.act==='petshop'){shadow(0,2,30,8,.3);rect(-22,-14,44,16,'#3a2f5a',2.2,4);rect(-16,-22,32,10,'#4b3f78',1.8,3);const bob=Math.sin(t/420)*4,px=[[0,-70],[16,-52],[10,-26],[-10,-26],[-16,-52]];
  add(()=>glow(0,-48+bob,52,'#b9a6ff',.35+.15*Math.sin(t/250)));
  g.save();g.translate(0,bob);g.beginPath();px.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();const cg=g.createLinearGradient(-16,-70,16,-26);cg.addColorStop(0,'#e9e2ff');cg.addColorStop(.5,'#9a7cff');cg.addColorStop(1,'#4a2fb0');g.fillStyle=cg;g.fill();g.lineWidth=2;g.strokeStyle=OL;g.lineJoin='round';g.stroke();g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1;g.beginPath();g.moveTo(0,-70);g.lineTo(-3,-26);g.moveTo(-16,-52);g.lineTo(16,-52);g.stroke();g.restore();
  g.font='bold 12px Trebuchet MS,sans-serif';g.textAlign='center';g.textBaseline='alphabetic';g.lineWidth=3;g.strokeStyle=OL;g.strokeText(o.lb||'',0,-82);g.fillStyle='#fff';g.fillText(o.lb||'',0,-82);g.restore();return}
 shadow(0,2,30,8,.3);const c=o.col||'#7a5a3a';
 rect(-27,-38,54,40,c,2.4,5);rect(-22,-33,44,15,shade(c,.25),1.6,3);rect(-22,-16,44,11,shade(c,-.25),1.4,3);
 add(()=>glow(0,-26,36,'#ffe27a',.12+.06*Math.sin(t/300)));
 g.font='22px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText(o.ic||'?',0,-25);
 g.font='bold 12px Trebuchet MS,sans-serif';g.textBaseline='alphabetic';g.lineWidth=3;g.strokeStyle=OL;g.strokeText(o.lb||'',0,-45);g.fillStyle='#fff';g.fillText(o.lb||'',0,-45);g.restore()};
/* ====================== jefes nuevos: arte ====================== */
const BOSST={ogre:1,wolf:1,slimeking:1,golem:1,spider:1,lich:1,arch:1},BOSSX={wolf:1,slimeking:1,golem:1,spider:1,lich:1,arch:1};
function wolf(e,H){const enr=!!e.enr,st=e.st,mv=Math.min(1,Math.hypot(e.vx,e.vy)/4),ra=e.raise||0,cr=(e.crouch||0)*6,fur='#8a7a68',fd='#5a4c40',fl='#b8a890',run=st==='frenzy'||st==='lunge';
 const o={x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,face:e.face,sq:e.sq,dashA:run?Math.atan2(e.vy,e.vx):undefined};
 if(enr){g.save();g.translate(e.x,e.y);add(()=>{g.scale(1,.6);glow(0,-26,56+Math.sin(t/90)*5,'#ff3a2a',.3)});g.restore()}
 fig(o,1.9,()=>{const ph=e.ph,b=Math.abs(Math.sin(ph))*2*mv-cr*.2,tw=Math.sin(t/120)*3;
  limb(-8,-14,-17,-9+tw,4,fd);limb(-17,-9+tw,-22,-12+tw,3,fur);
  for(let k=1;k>=0;k--){const p=ph+k*PI,fx=Math.sin(p)*5*mv+(k?-3.5:3.5),fy=-Math.max(0,Math.cos(p))*3*mv;limb(k?-3.5:3.5,-11+cr*.4,fx,fy-1.4,5,fd);ell(fx+1.6,fy-.4,4.4,2.4,'#2a2018',0,1.6);for(let c=0;c<3;c++)line(fx+4+c*1.2,fy-1.2+c*.6,fx+6+c*1.2,fy-.8+c*.6,1.1,'#e8e0d0')}
  g.save();g.translate(0,-b+cr);
  g.beginPath();g.moveTo(-9,-22);g.quadraticCurveTo(0,-29,9,-24);g.lineTo(8,-11);g.quadraticCurveTo(0,-8,-8,-11);g.closePath();g.fillStyle=lg(-9,-28,9,-9,shade(fur,.3),shade(fd,-.2),fur);g.fill();g.lineWidth=2.4;g.strokeStyle=OL;g.stroke();
  ell(3,-17,4.2,5.4,fl,0,0);g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=1;for(let i=0;i<4;i++){g.beginPath();g.moveTo(-6+i*3,-26+i*.6);g.lineTo(-7+i*3,-22+i*.6);g.stroke()}
  const wa=lerp(.6,-2.2,ra)+(st==='lunge'?-.4+Math.sin(t/55)*.6:0);
  for(const s of[-1,1]){const sh=s>0?[6,-24]:[-6,-23],an=s>0?wa:wa+.5+Math.sin(ph)*.2*mv,L=12,hx=sh[0]+Math.cos(an)*L,hy=sh[1]+Math.sin(an)*L;limb(sh[0],sh[1],hx,hy,4.6,s>0?fur:fd);ball(hx,hy,3.2,fur);for(let c=-1;c<=1;c++){const a2=an+c*.38;line(hx+Math.cos(a2)*2,hy+Math.sin(a2)*2,hx+Math.cos(a2)*8,hy+Math.sin(a2)*8,1.8,'#f4efdc')}}
  const howl=st==='howl'||(st==='tele'&&e.kind==='frenzy'),hx=4,hy=-31+(howl?-3:0);
  poly([[hx-5,hy-5],[hx-7,hy-13],[hx-1,hy-8]],fd,1.5);poly([[hx+1,hy-7],[hx+3,hy-14],[hx+6,hy-7]],fur,1.5);
  ball(hx,hy,6.8,fur);ell(hx+6.4,hy+2.2,5.6,3,fl,0,1.6);ell(hx+10.2,hy+1.2,2,1.6,'#1a1410',0,1);
  const mo=howl?4:(run||st==='tele'||st==='leap')?2.4:.8;g.beginPath();g.moveTo(hx+3,hy+4.6);g.lineTo(hx+11,hy+4.2+mo);g.lineTo(hx+3,hy+5.2+mo*1.4);g.closePath();g.fillStyle=K('#3a0a10');g.fill();for(let i=0;i<3;i++)poly([[hx+5+i*2,hy+4.4],[hx+5.8+i*2,hy+4.4+1.8+mo*.4],[hx+6.6+i*2,hy+4.4]],'#f4efdc',.6);
  const ec=enr||st==='tele'?'#ff3a2a':'#ffd84a';add(()=>{glow(hx+3.6,hy-1.6,5,ec,.8);glow(hx+7.6,hy-1.4,4,ec,.6)});dot(hx+3.6,hy-1.6,1.6,ec);dot(hx+7.4,hy-1.4,1.3,ec);brow(hx+3.6,hy-3.6,.5,2.6,'#1a1410');
  if(howl)for(let i=0;i<3;i++){const p2=((t/420+i*.33)%1);g.strokeStyle='rgba(255,255,255,'+(.5*(1-p2))+')';g.lineWidth=1.6;g.beginPath();g.arc(hx+8,hy-6,6+p2*16,-1.4,-.2);g.stroke()}
  g.restore()})}
function lichB(e,H){const enr=!!e.enr,st=e.st,k=e.kind,ra=e.raise||0,bone='#e6e0c8',robe='#4a2a6a',rd='#2a1440',gc=enr?'#ff4a3a':'#8aff7a';
 const o={x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,face:e.face,sq:e.sq};
 g.save();g.translate(e.x,e.y);add(()=>{g.scale(1,.6);glow(0,-34,(enr?74:58)+Math.sin(t/110)*5,enr?'#ff3aa0':'#9a4aff',enr?.28:.18)});g.restore();
 fig(o,2,()=>{const fl=-10+Math.sin(t/260+e.ph)*3,sw=Math.sin(t/200)*1.6;g.save();g.translate(0,fl);
  g.beginPath();g.moveTo(-11,-30);g.lineTo(-15,-4);g.lineTo(-11+sw,-1);g.lineTo(-7,-5);g.lineTo(-3+sw,0);g.lineTo(1,-5);g.lineTo(5-sw,-1);g.lineTo(9,-5);g.lineTo(14,-3);g.lineTo(11,-30);g.quadraticCurveTo(0,-36,-11,-30);g.closePath();
  g.fillStyle=lg(-12,-34,12,0,shade(robe,.25),rd,robe);g.fill();g.lineWidth=2.4;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
  for(let i=0;i<3;i++)line(-4,-27+i*4,4,-27+i*4,1.4,gc);add(()=>{glow(0,-23,10,gc,.4+.15*Math.sin(t/150))});
  let wa=1.2,la=1.5;
  if(st==='tele'){if(k==='orbs'||k==='blink')wa=lerp(1.2,-1.7,ra);else if(k==='spikes')wa=lerp(1.2,-.2,ra);else if(k==='summon'||k==='nova'){wa=lerp(1.2,-1.9,ra);la=lerp(1.5,-1.2,ra)}}
  else if(st==='roar'){wa=-1.9;la=-1.2}else if(st==='land'){wa=1.7;la=1.6}
  const arm=(sx,an,c)=>{const hx=sx+Math.cos(an)*12,hy=-26+Math.sin(an)*12;limb(sx,-27,hx,hy,4,c);ball(hx,hy,3.2,bone);return[hx,hy]};
  arm(-10,la,rd);const[hx2,hy2]=arm(10,wa,robe);
  if(st==='tele'&&(k==='orbs'||k==='blink')&&ra>.2){add(()=>glow(hx2,hy2-8,16*ra,'#b05aff',.7));ball(hx2,hy2-8,7*Math.min(1,ra*1.3),'#7a2ad0')}
  ball(0,-38,7,bone);ell(0,-32.4,4.4,2.4,bone,0,1.6);
  for(const x of[-2.8,2.8]){rect(x-1.7,-40,3.4,3.8,'#1a0a24',0);add(()=>glow(x,-38,5,gc,.9));dot(x,-38,1.2,gc)}
  for(let i=-1;i<=1;i++)line(i*1.8,-33.4,i*1.8,-31.2,1,'#2a2030');
  poly([[-6,-43],[-6,-50],[-3,-46],[0,-52],[3,-46],[6,-50],[6,-43]],'#ffd84a',1.6);dot(0,-47.5,1.3,enr?'#ff4a3a':'#b05aff');
  if(enr)for(let i=0;i<3;i++){const a=t/400+i*2.09,x=Math.cos(a)*24,y=-24+Math.sin(a)*8;add(()=>glow(x,y,7,'#ff4a3a',.5));ball(x,y,3.4,bone)}
  g.restore()})}
const BIC={ogre:'#ff8a4a',wolf:'#bcd0ff',slimeking:'#7bff7b',golem:'#ffb060',spider:'#c07aff',lich:'#b05aff',arch:'#5ae0ff'};
const BIX={
 ogre:(e,pr,R,c)=>{g.save();g.globalCompositeOperation='lighter';for(let i=0;i<12;i++){const q=(t/1100+i/12)%1,x=Math.sin(i*7.3)*R*.55,y=-q*160;g.globalAlpha=1-q;dot(x,y*.9,2.4,'#ffb060')}g.restore();
  if(pr>=.78){const q=clamp((pr-.78)/.22,0,1);g.save();g.globalAlpha=1-q*.6;g.strokeStyle='#ff6a2a';g.lineWidth=3;for(let i=0;i<8;i++){const a=i*.785+.3;g.beginPath();g.moveTo(0,0);let x=0,y=0;for(let k=1;k<5;k++){x=Math.cos(a+(k%2?.1:-.1))*k*e.r*1.1*eo(q);y=Math.sin(a+(k%2?.1:-.1))*k*e.r*.55*eo(q);g.lineTo(x,y)}g.stroke()}g.restore()}},
 wolf:(e,pr,R,c)=>{if(pr>=.7){const q=clamp((pr-.7)/.3,0,1);g.save();g.globalCompositeOperation='lighter';g.globalAlpha=Math.sin(q*Math.PI);g.strokeStyle='#fff';g.lineWidth=5;g.lineCap='round';for(let i=0;i<3;i++){const ox=(i-1)*26,p2=clamp(q*2-i*.25,0,1);g.beginPath();g.moveTo(ox-40,-110+i*4);g.lineTo(ox-40+80*p2,-110+i*4+110*p2);g.stroke()}g.restore()}
  g.save();g.globalCompositeOperation='lighter';glow(0,-300,120,'#cfe0ff',.35*(pr<.8?1:0));g.restore()},
 slimeking:(e,pr,R,c)=>{g.save();for(let i=0;i<10;i++){const q=(t/900+i/10)%1,x=Math.sin(i*5.1)*R*.6,y=-q*120;g.globalAlpha=(1-q)*.8;g.strokeStyle='#cfffcf';g.lineWidth=1.6;g.fillStyle='rgba(123,255,123,.25)';g.beginPath();g.arc(x,y*.9,4+q*5,0,TAU);g.fill();g.stroke()}g.restore()},
 golem:(e,pr,R,c)=>{if(pr<.78){g.save();for(let i=0;i<9;i++){const q=(t/700+i/9)%1,x=Math.sin(i*4.3)*R*.7,y=-300+q*300;g.fillStyle='#8a8f9a';g.strokeStyle='#14141c';g.lineWidth=1.6;g.save();g.translate(x,y*.9);g.rotate(q*6+i);g.fillRect(-5,-4,10,8);g.strokeRect(-5,-4,10,8);g.restore()}g.restore()}},
 spider:(e,pr,R,c)=>{g.save();g.scale(1,.5);g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.4;const rr=R*eo(Math.min(1,pr/.35));for(let i=0;i<10;i++){const a=i/10*TAU;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);g.stroke()}for(let k=1;k<=3;k++){g.beginPath();g.arc(0,0,rr*k/3.4,0,TAU);g.stroke()}g.restore()},
 lich:(e,pr,R,c)=>{g.save();g.globalCompositeOperation='lighter';for(let i=0;i<8;i++){const q=(t/1500+i/8)%1,a=i/8*TAU+t/900,x=Math.cos(a)*R*.55,y=Math.sin(a)*R*.27-q*170;g.globalAlpha=Math.sin(q*Math.PI)*.8;glow(x,y,12,'#9aff8a',.7);dot(x,y,3,'#e8ffe0')}g.restore()},
 arch:(e,pr,R,c)=>{if(pr<.8){g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(170,245,255,.9)';g.lineWidth=2;for(let n=0;n<2;n++){g.beginPath();let x=rnd(-R,R)*.8,y=-420;g.moveTo(x,y);for(let k=1;k<9;k++){y=-420+k*52;x=x+(0-x)*.18+rnd(-26,26);g.lineTo(x,y)}g.lineTo(rnd(-10,10),0);g.stroke()}g.restore()}}};
A.introFx=function(e,pr){const c=BIC[e.t]||'#ffcf6a',R=e.r*3.4,gr=eo(Math.min(1,pr/.35)),fade=pr>.88?1-(pr-.88)/.12:1;
 g.save();g.translate(e.x,e.y);
 g.save();g.scale(1,.5);g.globalAlpha=fade;g.fillStyle=alpha(c,.14+.08*Math.sin(t/70));g.beginPath();g.arc(0,0,R*gr,0,TAU);g.fill();g.strokeStyle=alpha(c,.95);g.lineWidth=3;g.beginPath();g.arc(0,0,R*gr,0,TAU);g.stroke();
 g.save();g.rotate(t/500);g.setLineDash([14,10]);g.lineWidth=2;g.beginPath();g.arc(0,0,R*gr*.72,0,TAU);g.stroke();g.restore();
 g.save();g.rotate(-t/380);g.lineWidth=2.4;for(let i=0;i<6;i++){const a=i/6*TAU,b=a+2.094,rr=R*gr*.62;g.beginPath();g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);g.lineTo(Math.cos(b)*rr,Math.sin(b)*rr);g.stroke()}g.restore();g.restore();
 if(pr<.8){const k=pr<.1?pr/.1:pr>.7?(.8-pr)/.1:1,w=R*.38*(.6+.4*Math.sin(t/60))*k;g.save();g.globalCompositeOperation='lighter';const gg=g.createLinearGradient(0,-520,0,0);gg.addColorStop(0,alpha(c,0));gg.addColorStop(1,alpha(c,.7*k));g.fillStyle=gg;g.fillRect(-w,-520,w*2,520);g.fillStyle=alpha('#ffffff',.45*k);g.fillRect(-w*.3,-520,w*.6,520);glow(0,-4,R*.9*k,c,.6*k);g.restore()}
 if(pr<.8){g.save();g.globalCompositeOperation='lighter';for(let i=0;i<16;i++){const u=(t/900+i/16)%1,a=i*2.4+Math.floor(t/900+i/16)*1.7,d=R*(1.25-u*1.2);g.globalAlpha=u;dot(Math.cos(a)*d,Math.sin(a)*d*.5-u*30,2.6,c)}g.restore()}
 if(BIX[e.t])BIX[e.t](e,pr,R,c);
 if(pr>=.78){const q=clamp((pr-.78)/.22,0,1);g.save();g.globalCompositeOperation='lighter';g.save();g.scale(1,.55);g.globalAlpha=1-q;g.strokeStyle='#fff';g.lineWidth=10*(1-q)+2;g.beginPath();g.arc(0,0,e.r*5*eo(q),0,TAU);g.stroke();g.strokeStyle=alpha(c,1);g.lineWidth=18*(1-q);g.beginPath();g.arc(0,0,e.r*4*eo(q),0,TAU);g.stroke();g.restore();glow(0,-e.r,e.r*(3-q*2),'#ffffff',.7*(1-q));g.restore()}
 g.restore()};
function coilB(e,H){const tele=e.st==='tele',pu=.5+.5*Math.sin(t/(tele?50:200)+e.ph);g.save();g.translate(e.x,e.y);shadow(0,2,18,7,.36);
 rect(-11,-9,22,9,'#3a4660',2,2);rect(-7,-14,14,6,'#566684',1.6,2);
 for(let i=0;i<4;i++)ell(0,-17-i*7,10-i*1.6,3.6,i%2?'#c08a4a':'#e0a860',0,1.6);
 rect(-2.2,-46,4.4,30,'rgba(40,50,70,.0)',0);
 add(()=>glow(0,-47,(tele?30:20)+pu*5,'#5ae0ff',.55+(tele?.3:0)));ball(0,-47,6+(tele?2:0),'#5ae0ff');dot(0,-47,2.4,'#fff');
 if(tele){g.strokeStyle='rgba(180,250,255,.9)';g.lineWidth=1.6;g.beginPath();g.moveTo(0,-47);for(let i=1;i<5;i++)g.lineTo(rnd(-9,9),-47-i*3.2);g.stroke()}
 g.restore()}
function archB(e,H){const enr=!!e.enr,st=e.st,k=e.kind,ra=e.raise||0,col=enr?'#ff8a3a':'#5ae0ff',o={x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,face:e.face,sq:e.sq};
 if(e.cl)for(const c of e.cl){if(c.dead||c.spawn>t)continue;g.save();g.globalCompositeOperation='lighter';g.strokeStyle=e.shield?'rgba(120,235,255,.85)':'rgba(120,235,255,.25)';g.lineWidth=e.shield?2.4:1;g.beginPath();let x=c.x,y=c.y-47;const tx=e.x,ty=e.y-40;g.moveTo(x,y);for(let i=1;i<8;i++){const q=i/8;g.lineTo(c.x+(tx-c.x)*q+rnd(-9,9),c.y-47+(ty-c.y+47)*q+rnd(-9,9))}g.lineTo(tx,ty);g.stroke();g.restore()}
 g.save();g.translate(e.x,e.y);add(()=>{g.scale(1,.6);glow(0,-34,(enr?80:62)+Math.sin(t/110)*5,col,enr?.26:.18)});g.restore();
 fig(o,2.2,()=>{const fl=-8+Math.sin(t/300+e.ph)*3,ang=Math.atan2(H.y-e.y,H.x-e.x);g.save();g.translate(0,fl);
  const plates=(front)=>{for(let i=0;i<6;i++){const a=t/700+i*1.047,sn=Math.sin(a);if((sn>0)!==front)continue;const x=Math.cos(a)*24,y=-34+sn*8;poly([[x-4,y-9],[x+4,y-9],[x+5,y+9],[x-5,y+9]],front?'#7f90b4':'#4a5a7c',1.6);dot(x,y,1.6,col)}};
  plates(false);
  poly([[0,-8],[7,-18],[0,-3],[-7,-18]],'#3a4660',1.6);
  g.beginPath();g.moveTo(0,-62);g.lineTo(18,-38);g.lineTo(0,-14);g.lineTo(-18,-38);g.closePath();g.fillStyle=lg(-18,-62,18,-14,'#9aa8c8','#222c44','#4a5a78');g.fill();g.lineWidth=2.4;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
  g.strokeStyle='rgba(255,255,255,.22)';g.lineWidth=1;g.beginPath();g.moveTo(0,-62);g.lineTo(-6,-38);g.lineTo(0,-14);g.moveTo(0,-62);g.lineTo(6,-38);g.lineTo(0,-14);g.stroke();
  ell(0,-38,9,5.4,'#0a1220',0,1.6);const ex=Math.cos(ang)*3,ey=Math.sin(ang)*1.6;add(()=>glow(ex,-38+ey,12+ra*10,col,.7+ra*.3));dot(ex,-38+ey,3.4+ra*1.4,col);dot(ex,-38+ey,1.4,'#fff');
  if(st==='tele'&&(k==='laser'||k==='shock'))add(()=>glow(0,-38,26*ra,col,.8));
  plates(true);
  if(e.shield){g.save();g.globalAlpha=.5+.15*Math.sin(t/120);g.fillStyle='rgba(90,220,255,.14)';g.beginPath();g.arc(0,-36,36,0,TAU);g.fill();g.strokeStyle='#7fe8ff';g.lineWidth=2.2;g.setLineDash([6,5]);g.lineDashOffset=-t/40;g.stroke();g.setLineDash([]);g.globalCompositeOperation='lighter';glow(0,-36,40,'#5ae0ff',.35);g.restore()}
  g.restore()})}
A.bwall=function(w,D){const T=40,x0=w.tx*T,y0=w.ty*T,wp=w.w*T,hp=w.h*T,age=D.t-w.t0;
 if(!w.on){const p=clamp((D.t-w.t0)/(w.act-w.t0),0,1),pu=.5+.5*Math.sin(t/60);g.save();g.fillStyle='rgba(255,70,50,'+(.12+pu*.12)+')';g.fillRect(x0,y0,wp,hp);g.strokeStyle='rgba(255,100,70,.9)';g.lineWidth=2.4;g.setLineDash([8,6]);g.lineDashOffset=-t/30;g.strokeRect(x0+2,y0+2,wp-4,hp-4);g.setLineDash([]);g.fillStyle='rgba(255,70,50,.3)';g.fillRect(x0,y0+hp*(1-p),wp,hp*p);g.restore();return}
 const rise=clamp((D.t-w.act)/320,0,1),H=44*eo(rise),left=w.life-(D.t-w.act),blink=left<2000&&Math.floor(t/110)%2===0;
 g.save();if(blink)g.globalAlpha=.45;
 g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x0-4,y0+hp-6,wp+8,12);
 g.beginPath();g.rect(x0,y0+hp-H,wp,H);g.fillStyle=lg(x0,y0+hp-H,x0,y0+hp,'#4a587a','#1c2438');g.fill();g.lineWidth=2.4;g.strokeStyle=OL;g.stroke();
 g.strokeStyle='rgba(120,235,255,.35)';g.lineWidth=1.4;for(let i=1;i<4;i++){const xx=x0+wp*i/4;g.beginPath();g.moveTo(xx,y0+hp-H+4);g.lineTo(xx,y0+hp-4);g.stroke()}
 g.beginPath();g.rect(x0,y0-H,wp,hp);g.fillStyle=lg(x0,y0-H,x0+wp,y0-H+hp,'#7f90b4','#3a4660');g.fill();g.lineWidth=2.4;g.strokeStyle=OL;g.stroke();
 const cx=x0+wp/2,cy=y0-H+hp/2,chg=w.chg&&D.t<w.chg?1-(w.chg-D.t)/900:0;rect(cx-14,cy-14,28,28,'#232c44',1.8,4);
 add(()=>glow(cx,cy,24+chg*22,chg>0?'#ff7a4a':'#5ae0ff',.45+chg*.4));dot(cx,cy,5+chg*3,chg>0?'#ffb08a':'#9ff0ff');
 g.restore()};
A.beams=function(list,D){for(const b of list){const age=D.t-b.t0,x=b.x,y=b.y-18,ex=x+Math.cos(b.a)*b.len,ey=y+Math.sin(b.a)*b.len;g.save();
  if(age<b.tl){const p=clamp(age/b.tl,0,1),pu=.5+.5*Math.sin(t/45);g.strokeStyle='rgba(255,'+(110-p*40|0)+',70,'+(.35+pu*.3)+')';g.lineWidth=2+p*5;g.setLineDash([10,8]);g.lineDashOffset=-t/20;g.beginPath();g.moveTo(x,y);g.lineTo(ex,ey);g.stroke();g.setLineDash([]);g.fillStyle='rgba(255,90,60,.9)';g.beginPath();g.arc(ex,ey,4+p*4,0,TAU);g.fill()}
  else{const fade=1-clamp((age-b.tl)/b.dur,0,1)*.4,j=Math.sin(t/25)*2;g.globalCompositeOperation='lighter';
   g.strokeStyle='rgba(60,200,255,'+.55*fade+')';g.lineWidth=34+j;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.lineTo(ex,ey);g.stroke();
   g.strokeStyle='rgba(170,245,255,'+.9*fade+')';g.lineWidth=16+j;g.beginPath();g.moveTo(x,y);g.lineTo(ex,ey);g.stroke();
   g.strokeStyle='rgba(255,255,255,'+fade+')';g.lineWidth=7;g.beginPath();g.moveTo(x,y);g.lineTo(ex,ey);g.stroke();
   glow(x,y,34,'#9ff0ff',.7);glow(ex,ey,30,'#9ff0ff',.7)}
  g.restore()}};
function slimeK(e,H){slime(Object.assign({},e,{t:'slime'}),H);const R=e.r*1.05,z=e.z||0,cr=(e.crouch||0)*.28,sy=1-e.sq*.8-cr;
 if(e.split>=1)add(()=>glow(e.x,e.y-z-R*.7,R*1.25,'#7bff7b',.22+.1*Math.sin(t/120)));
 g.save();g.translate(e.x,e.y-z-R*1.62*sy);g.rotate(Math.sin(t/260+e.ph)*.04);poly([[-15,3],[-15,-9],[-7.5,-3],[0,-13],[7.5,-3],[15,-9],[15,3]],'#ffd84a',1.8);for(const x of[-15,0,15])dot(x,x?-9:-13,2.3,'#ff5a5a');g.restore()}
function golemB(e,H){const T=EP[ti],enr=!!e.enr,st=e.st,mv=Math.min(1,Math.hypot(e.vx,e.vy)/1.6),ra=e.raise||0,stone='#8a8f9a',sd='#5a5f6c',sl='#b4b9c4',glc=enr?'#ff5a2a':T.glow,k=e.kind;
 const o={x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,face:e.face,sq:e.sq};
 if(enr){g.save();g.translate(e.x,e.y);add(()=>{g.scale(1,.6);glow(0,-34,76+Math.sin(t/110)*6,'#ff3a1a',.28)});g.restore()}
 fig(o,2.1,()=>{const ph=e.ph,br=Math.sin(t/340)*.9,b=Math.abs(Math.sin(ph))*1.2*mv;
  for(let q=1;q>=0;q--){const p=ph+q*PI,fx=Math.sin(p)*3.6*mv+(q?-5:5),fy=-Math.max(0,Math.cos(p))*2.6*mv;rect(fx-4.4,fy-12,8.8,12,q?sd:stone,1.8,1.6);rect(fx-5.4,fy-3.4,10.8,3.6,sd,1.6,1)}
  g.save();g.translate(0,-b);
  g.beginPath();g.moveTo(-11,-14);g.lineTo(-13,-31);g.lineTo(-6,-35+br*.3);g.lineTo(6,-35+br*.3);g.lineTo(13,-31);g.lineTo(11,-14);g.lineTo(5,-10);g.lineTo(-5,-10);g.closePath();g.fillStyle=lg(-12,-35,12,-10,sl,sd,stone);g.fill();g.lineWidth=2.4;g.strokeStyle=OL;g.stroke();
  const crack=()=>{g.beginPath();g.moveTo(-4,-33);g.lineTo(-1,-27);g.lineTo(-5,-22);g.lineTo(-2,-16);g.moveTo(5,-31);g.lineTo(2,-26);g.lineTo(6,-21);g.stroke()};
  g.lineJoin='round';g.strokeStyle=glc;g.lineWidth=1.5;crack();add(()=>{g.strokeStyle=alpha(glc,.8);g.lineWidth=2.6;crack();glow(0,-24,9,glc,.5+.2*Math.sin(t/150))});dot(0,-24,2.6,glc);
  for(const s of[-1,1])ball(s*13,-32,6,s>0?stone:sd);
  let wa=1.1+Math.sin(ph)*.25*mv,la=2.0-Math.sin(ph)*.25*mv;
  if(st==='tele'){if(k==='pound'){wa=lerp(1.1,-2.3,ra);la=lerp(2.0,-.8,ra)}else if(k==='boulder'||k==='rain')wa=lerp(1.1,-1.9,ra);else if(k==='sweep')wa=lerp(1.1,-2.4,ra)}
  else if(st==='sweepA')wa=lerp(-2.4,1.5,clamp((t-(e.sw||t))/220,0,1));else if(st==='land'){wa=1.6;la=1.5}
  const arm=(sx,an,c)=>{const hx=sx+Math.cos(an)*13,hy=-27+Math.sin(an)*13;limb(sx,-28,hx,hy,7.5,c);ball(hx,hy,5.6,c);return[hx,hy]};
  arm(-11,la,sd);const[hx2,hy2]=arm(11,wa,stone);
  if(st==='tele'&&(k==='boulder')&&ra>.2){ball(hx2,hy2-11,11*Math.min(1,ra*1.4),'#8a7a5a');g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1.2;g.beginPath();g.moveTo(hx2-5,hy2-14);g.lineTo(hx2,hy2-10);g.lineTo(hx2+4,hy2-6);g.stroke()}
  rect(-6,-46+br*.2,12,11,stone,2,2);rect(-7,-47+br*.2,14,3,sl,1.6,1);rect(-4.2,-42,3,2,glc,0);rect(1.2,-42,3,2,glc,0);add(()=>{glow(-2.7,-41,5,glc,.8);glow(2.7,-41,5,glc,.8)});
  if(st==='roar'||(enr&&Math.random()<.04))for(let i=0;i<3;i++)part(e.x+rnd(-14,14),e.y-60,rnd(-1,1),rnd(-1.4,0),400,'#b8a888',rnd(2,4),.01);
  g.restore()})}
function spiderB(e,H){const enr=!!e.enr,st=e.st,mv=Math.min(1,Math.hypot(e.vx,e.vy)/3.2),ra=e.raise||0,body='#4a3a5a',dk='#2a2038',mk=enr?'#ff3a3a':'#d8ff4a';
 const o={x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,face:e.face,sq:e.sq};
 fig(o,1.8,()=>{const ph=e.ph*1.4,cr=(e.crouch||0)*4,rise=st==='tele'&&e.kind==='eggs'?Math.sin(t/60)*1.2:0;
  for(let i=0;i<4;i++)for(const s of[-1,1]){const w=Math.sin(ph+i*1.3+(s>0?0:PI))*3*mv,hx=s*4,hy=-12,kx=s*(13+i*1.8),ky=-24-(i%2)*3+w*.4,fx=s*(21+i*2.4),fy=-2+Math.max(0,-w)*1.4-i*.6;limb(hx,hy,kx,ky,2.4,dk);limb(kx,ky,fx,fy,2,s>0?body:dk)}
  g.save();g.translate(0,cr*.3);
  ell(-9,-13+rise,11,9+ra*2,body,0,2.2);g.save();g.translate(-9,-13+rise);poly([[-3,-3],[3,-3],[1.5,0],[3,3],[-3,3],[-1.5,0]],mk,.8);g.restore();
  for(let i=0;i<3;i++)dot(-14+i*4,-18+rise,1.1,shade(body,.4));
  ell(4,-13,7,6,shade(body,.12),0,2);
  for(const[x,y,r]of[[7,-16,1.7],[10,-15,1.5],[8,-12.6,1.2],[10.6,-12,1.1]]){add(()=>glow(x,y,4,mk,.7));dot(x,y,r,mk)}
  const fo=st==='tele'&&e.kind==='bite'?3:1;poly([[10,-10],[11.4,-6-fo],[12,-10]],'#efe6c8',1);poly([[12.4,-10.4],[13.8,-6.4-fo],[14.4,-10.4]],'#efe6c8',1);
  g.restore();
  if(st==='tele'&&e.kind==='web'&&ra>.3)add(()=>{glow(12,-12,10*ra,'#ffffff',.7)})
 })}
function spiderling(e,H){const o={x:e.x,y:e.y,z:e.z,vx:e.vx,vy:e.vy,face:e.face,sq:e.sq},mv=Math.min(1,Math.hypot(e.vx,e.vy)/2.6);
 fig(o,1,()=>{const ph=e.ph*1.6;for(let i=0;i<3;i++)for(const s of[-1,1]){const w=Math.sin(ph+i*1.4+(s>0?0:PI))*2*mv;limb(s*2,-5,s*(7+i),-9+w*.3,1.4,'#2a2038');limb(s*(7+i),-9+w*.3,s*(10+i*1.4),-1+Math.max(0,-w),1.2,'#2a2038')}
  ell(-3,-5.4,4.4,3.8,'#6a4a7a',0,1.6);ell(2.4,-5.4,3,2.8,'#7a5a8a',0,1.6);dot(4,-6.4,.9,'#d8ff4a');dot(5.2,-5.2,.8,'#d8ff4a')})}
function egg(e,H){const hat=e.hatch||t,near=clamp(1-(hat-t)/1200,0,1),wob=Math.sin(t/(130-near*80))*near*.12;
 g.save();g.translate(e.x,e.y);shadow(0,2,9,4,.3);g.rotate(wob);
 for(let i=0;i<3;i++){g.strokeStyle='rgba(240,240,240,.55)';g.lineWidth=1;g.beginPath();g.moveTo(-10,-1);g.lineTo(-3+i*3,-14);g.lineTo(10,-1);g.stroke()}
 ell(0,-9,7.6,10,'#efe6c8',0,2);g.fillStyle='rgba(120,160,60,.5)';for(const[x,y,r]of[[-2,-12,1.6],[2.4,-7,1.3],[-3,-5,1.1]]){g.beginPath();g.arc(x,y,r,0,TAU);g.fill()}
 if(near>.2)add(()=>glow(0,-9,16,'#d8ff4a',.35*near));g.restore()}
/* ---- charcos, telarañas, rocas que caen y trampas ---- */
A.hazards=function(D,H){
 for(const o of D.pools){const age=t-o.t0,k=clamp((o.life-age)/900,0,1)*clamp(age/250,0,1);if(k<=0)continue;g.save();g.globalAlpha=.88*k;g.translate(o.x,o.y);g.scale(1,.62);const gr=g.createRadialGradient(0,0,2,0,0,o.r);gr.addColorStop(0,'#a8ff5a');gr.addColorStop(.6,'#3f9a2a');gr.addColorStop(1,'rgba(30,90,30,.25)');g.fillStyle=gr;g.beginPath();for(let i=0;i<=20;i++){const a=i/20*TAU,r=o.r*(1+Math.sin(a*4+o.t0)*.08),px=Math.cos(a)*r,py=Math.sin(a)*r;i?g.lineTo(px,py):g.moveTo(px,py)}g.closePath();g.fill();g.strokeStyle='rgba(20,70,20,.85)';g.lineWidth=2;g.stroke();
  for(let i=0;i<5;i++){const bx=Math.sin(t/500+i*2.1+o.t0)*o.r*.5,by=Math.cos(t/430+i*1.7)*o.r*.4,br=2+((t/90+i*7)%6)*.5;g.strokeStyle='rgba(225,255,170,.75)';g.lineWidth=1.2;g.beginPath();g.arc(bx,by,br,0,TAU);g.stroke()}g.restore()}
 for(const o of D.webs){const age=t-o.t0,k=clamp((o.life-age)/800,0,1);if(k<=0)continue;g.save();g.globalAlpha=.8*k;g.translate(o.x,o.y);g.scale(1,.66);g.strokeStyle='rgba(245,245,255,.85)';g.lineWidth=1.3;for(let i=0;i<9;i++){const a=i/9*TAU;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*o.r,Math.sin(a)*o.r);g.stroke()}for(let r=1;r<=3;r++){g.beginPath();for(let i=0;i<=9;i++){const a=i/9*TAU,rr=o.r*r/3*(i%2?.88:1);i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}g.stroke()}g.restore()}
 for(const f of D.fall){const p=clamp(1-(f.t-t)/f.d,0,1);g.save();g.translate(f.x,f.y);g.scale(1,.62);g.fillStyle=(f.para?'rgba(60,200,255,':'rgba(255,60,40,')+(.14+.18*p)+')';g.beginPath();g.arc(0,0,f.r,0,TAU);g.fill();g.strokeStyle=(f.para?'rgba(140,235,255,.95)':'rgba(255,90,60,.9)');g.lineWidth=2.4;g.stroke();g.fillStyle=f.para?'rgba(60,200,255,.35)':'rgba(255,60,40,.3)';g.beginPath();g.arc(0,0,f.r*p,0,TAU);g.fill();g.restore();
  if(p>.1){const y=f.y-Math.pow(1-p,2)*190;shadow(f.x,f.y,10*p,4*p,.3);ball(f.x,y-10,11,'#8a8f9a');g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1.2;g.beginPath();g.moveTo(f.x-5,y-14);g.lineTo(f.x,y-9);g.lineTo(f.x+4,y-4);g.stroke()}}
 for(const o of D.traps){g.save();g.translate(o.x,o.y);const s=o.s|0;
  if(o.k==='spike'){const w=o.w,h=o.h;rect(-w/2+3,-h/2+3,w-6,h-6,'#3a3f52',1.6,3);const nx=Math.max(2,Math.round(w/14)),ny=Math.max(2,Math.round(h/14)),sh=s===2?15:s===1?5:0;
   if(s===1){g.fillStyle='rgba(255,60,40,'+(.18+.14*Math.sin(t/50))+')';g.fillRect(-w/2+3,-h/2+3,w-6,h-6)}
   for(let ix=0;ix<nx;ix++)for(let iy=0;iy<ny;iy++){const x=-w/2+(ix+.5)*w/nx,y=-h/2+(iy+.5)*h/ny;if(!sh){g.fillStyle='#14141c';g.beginPath();g.arc(x,y,2.2,0,TAU);g.fill()}else{g.fillStyle='#14141c';g.beginPath();g.arc(x,y,2.4,0,TAU);g.fill();poly([[x-3,y],[x,y-sh],[x+3,y]],s===2?'#d8dce6':'#8a8f9a',1.1)}}}
  else if(o.k==='vent'){g.save();g.scale(1,.8);ell(0,0,13,13,'#2e3040',0,2);g.restore();g.strokeStyle='#14141c';g.lineWidth=1.8;for(let i=-1;i<=1;i++){g.beginPath();g.moveTo(-9,i*4);g.lineTo(9,i*4);g.stroke()}
   if(s===0)for(let i=0;i<2;i++)dot(Math.sin(t/300+i*3)*4,Math.cos(t/360+i)*3,1,'#ff9a30');
   if(s===1)add(()=>glow(0,0,18+Math.sin(t/45)*3,'#ff7a1a',.55));
   if(s===2){add(()=>glow(0,-10,34,'#ff7a1a',.55));for(let i=-1;i<=1;i++)flameShape(i*7,0,11,40+Math.sin(t/55+i)*6,'#ff5a1a','#ffe27a',i)}}
  else{g.rotate(o.dir);rect(-14,-14,28,28,'#4a4e62',2,4);rect(-9,-9,18,18,'#3a3e50',1.4,3);rect(6,-5,9,10,'#14141c',1.4,2);dot(-2,-3,1.6,'#6a6e82');dot(-2,3,1.6,'#6a6e82');if(t-(o.fl||-1e9)<160)add(()=>glow(14,0,12,'#ffe27a',.8))}
  g.restore()}};

A.teles=function(list,H){for(const e of list){
  if(e.ring){const p=(t-e.ring)/520;if(p<1){g.save();g.globalCompositeOperation='lighter';for(let k=0;k<3;k++){const pp=clamp(p-k*.08,0,1);g.strokeStyle='rgba(255,'+(200-k*40)+','+(120-k*30)+','+(1-pp)*(.9-k*.25)+')';g.lineWidth=(12-k*3)*(1-pp)+2;g.beginPath();g.ellipse(e.rx,e.ry,pp*(e.ringR||190),pp*(e.ringR||190)*.7,0,0,TAU);g.stroke()}g.restore()}}
  if(e.dead||e.spawn>t||e.st!=='tele')continue;const pu=.5+.5*Math.sin(t/50);
  if(e.t==='ogre'){const pr=eo(1-(e.stT-t)/(e.kind==='slam'?800:e.kind==='rush'?750:650));g.save();
   if(e.kind==='slam'){g.translate(e.tx,e.ty);g.scale(1,.46);g.fillStyle='rgba(255,60,40,'+(.18+pu*.14)+')';g.beginPath();g.arc(0,0,76,0,TAU);g.fill();g.strokeStyle='rgba(255,90,60,.9)';g.lineWidth=3;g.stroke();g.fillStyle='rgba(255,60,40,.35)';g.beginPath();g.arc(0,0,76*pr,0,TAU);g.fill();g.strokeStyle='rgba(255,200,160,.6)';g.lineWidth=1.6;g.setLineDash([8,8]);g.lineDashOffset=-t/30;g.beginPath();g.arc(0,0,50,0,TAU);g.stroke();g.setLineDash([]);for(let i=0;i<8;i++){const a=i*.785+t/400;g.fillStyle='rgba(255,230,200,.8)';g.fillRect(Math.cos(a)*76-2,Math.sin(a)*76-2,4,4)}}
   else if(e.kind==='rush'){g.translate(e.x,e.y);g.rotate(e.lockA);g.fillStyle='rgba(255,60,40,'+(.14+pu*.1)+')';g.fillRect(0,-24,240,48);g.strokeStyle='rgba(255,90,60,.8)';g.lineWidth=2;g.strokeRect(0,-24,240,48);g.fillStyle='rgba(255,90,60,.4)';g.fillRect(0,-24,240*pr,48);for(let i=0;i<6;i++){const x=((t/6+i*40)%240);g.strokeStyle='rgba(255,220,200,.7)';g.lineWidth=3;g.beginPath();g.moveTo(x-8,-10);g.lineTo(x,0);g.lineTo(x-8,10);g.stroke()}}
   else{g.translate(e.x,e.y);g.rotate(e.lockA);const n=e.enr?5:3;g.strokeStyle='rgba(255,90,60,'+(.35+pu*.3)+')';g.lineWidth=2;g.setLineDash([6,6]);for(let i=0;i<n;i++){const a=(i-(n-1)/2)*.28;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*260,Math.sin(a)*260);g.stroke()}}
   g.restore();continue}
  if(BOSSX[e.t]){const pr=eo(1-(e.stT-t)/(e.tl||700));g.save();
   const circ=(x,y,R)=>{g.save();g.translate(x,y);g.scale(1,.5);g.fillStyle='rgba(255,60,40,'+(.16+pu*.12)+')';g.beginPath();g.arc(0,0,R,0,TAU);g.fill();g.strokeStyle='rgba(255,90,60,.9)';g.lineWidth=3;g.stroke();g.fillStyle='rgba(255,60,40,.33)';g.beginPath();g.arc(0,0,R*pr,0,TAU);g.fill();g.restore()},
    lane=(len,w)=>{g.save();g.translate(e.x,e.y);g.rotate(e.lockA);g.fillStyle='rgba(255,60,40,'+(.14+pu*.1)+')';g.fillRect(0,-w/2,len,w);g.strokeStyle='rgba(255,90,60,.8)';g.lineWidth=2;g.strokeRect(0,-w/2,len,w);g.fillStyle='rgba(255,90,60,.4)';g.fillRect(0,-w/2,len*pr,w);g.restore()},
    fan=(n,sp,len)=>{g.save();g.translate(e.x,e.y);g.rotate(e.lockA);g.strokeStyle='rgba(255,90,60,'+(.35+pu*.3)+')';g.lineWidth=2;g.setLineDash([6,6]);for(let i=0;i<n;i++){const a=(i-(n-1)/2)*sp;g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(a)*len,Math.sin(a)*len);g.stroke()}g.restore()},
    cone=(R,half)=>{g.save();g.translate(e.x,e.y);g.rotate(e.lockA);g.fillStyle='rgba(255,60,40,'+(.14+pu*.1)+')';g.beginPath();g.moveTo(0,0);g.arc(0,0,R,-half,half);g.closePath();g.fill();g.strokeStyle='rgba(255,90,60,.85)';g.lineWidth=2;g.stroke();g.fillStyle='rgba(255,60,40,.35)';g.beginPath();g.moveTo(0,0);g.arc(0,0,R*pr,-half,half);g.closePath();g.fill();g.restore()};
   if(e.t==='wolf'){if(e.kind==='combo')lane(190,52);else if(e.kind==='pounce')circ(e.tx,e.ty,70);else circ(e.x,e.y,64)}
   else if(e.t==='slimeking'){if(e.kind==='hop')lane(200,70);else if(e.kind==='spit')fan(e.split>=1?5:3,.3,300);else circ(e.tx,e.ty,110)}
   else if(e.t==='golem'){if(e.kind==='pound')circ(e.x,e.y,e.enr?250:210);else if(e.kind==='boulder')fan(e.enr?3:1,.32,300);else if(e.kind==='sweep')cone(150,1.3);else circ(H.x,H.y,64)}
   else if(e.t==='arch'){if(e.kind==='orbs')fan(e.enr?5:3,.32,330);else if(e.kind==='shock')circ(H.x,H.y,66)}
   else if(e.t==='lich'){if(e.kind==='orbs')fan(e.enr?5:3,.3,330);else if(e.kind==='spikes')lane(80+(e.enr?6:4)*55+40,70);else if(e.kind==='blink')circ(e.bx,e.by,60);else if(e.kind==='nova')circ(e.x,e.y,250);else circ(e.x,e.y,90)}
   else if(e.t==='spider'){if(e.kind==='web')fan(e.enr?3:1,.3,320);else if(e.kind==='bite')circ(e.tx,e.ty,46);else circ(e.x,e.y,90)}
   g.restore();continue}
  if(e.t==='coil'){g.save();g.globalAlpha=.4+.4*pu;g.strokeStyle='#7fe8ff';g.lineWidth=2;g.setLineDash([6,6]);g.lineDashOffset=-t/20;g.beginPath();g.moveTo(e.x,e.y-47);g.lineTo(e.x+Math.cos(e.lockA||0)*320,e.y-47+Math.sin(e.lockA||0)*320);g.stroke();g.restore()}
  if(e.t==='skel'){g.save();g.globalAlpha=.4+.3*pu;g.strokeStyle='#ff4a4a';g.lineWidth=2;g.setLineDash([6,6]);g.lineDashOffset=-t/20;g.beginPath();g.moveTo(e.x,e.y-14);g.lineTo(e.x+Math.cos(e.aim)*300,e.y-14+Math.sin(e.aim)*300);g.stroke();g.restore()}
  if(e.t==='gob'){g.save();g.translate(e.x,e.y);g.rotate(e.lockA);g.globalAlpha=.4+.3*pu;g.fillStyle='rgba(255,70,50,.5)';g.beginPath();g.moveTo(10,-9);g.lineTo(88,-9);g.lineTo(88,-16);g.lineTo(106,0);g.lineTo(88,16);g.lineTo(88,9);g.lineTo(10,9);g.closePath();g.fill();g.restore()}
  if(e.t==='bat'){g.save();g.globalAlpha=.35+.25*pu;g.strokeStyle='#ff4a4a';g.lineWidth=2;g.setLineDash([4,6]);g.beginPath();g.moveTo(e.x,e.y);g.lineTo(e.x+Math.cos(e.lockA||0)*150,e.y+Math.sin(e.lockA||0)*150);g.stroke();g.restore()}}};
A.enemy=function(e,H){FL=e.flash>t;const bg=!!BOSST[e.t];
 let _ii=0,_iz=0;if(e.spawn>t&&e.intro){const pr=clamp(1-(e.spawn-t)/e.intro.dur,0,1);A.introFx(e,pr);if(pr<.5)return;const k=clamp((pr-.5)/.28,0,1);_ii=1;_iz=e.z||0;e.z=_iz+(1-k*k)*300;g.save();g.globalAlpha=clamp(k*3,0,1)}
 else if(e.spawn>t){const p=1-(e.spawn-t)/700,ac=th?th.acc:'#6ac6ff',R=e.r*(1.8-p*.6);g.save();g.translate(e.x,e.y);g.scale(1,.5);g.globalAlpha=.85;g.strokeStyle=ac;g.lineWidth=2.4;g.beginPath();g.arc(0,0,R,0,TAU);g.stroke();g.save();g.rotate(t/200);g.lineWidth=1.4;g.setLineDash([5,5]);g.beginPath();g.arc(0,0,R*.7,0,TAU);g.stroke();g.restore();g.globalAlpha=.3*p;g.fillStyle=ac;g.beginPath();g.arc(0,0,R,0,TAU);g.fill();g.restore();
  g.save();g.globalCompositeOperation='lighter';g.fillStyle=lg(0,e.y-60,0,e.y,alpha(ac,0),alpha(ac,.45*p));g.fillRect(e.x-R*.5,e.y-60,R,60);g.restore();return}
 if(e.t==='slime'||e.t==='mini')slime(e,H);else if(e.t==='bat')bat(e,H);else if(e.t==='gob')gob(e,H);else if(e.t==='skel')skel(e,H);else if(e.t==='wolf')wolf(e,H);else if(e.t==='slimeking')slimeK(e,H);else if(e.t==='golem')golemB(e,H);else if(e.t==='spider')spiderB(e,H);else if(e.t==='lich')lichB(e,H);else if(e.t==='arch')archB(e,H);else if(e.t==='coil')coilB(e,H);else if(e.t==='spiderling')spiderling(e,H);else if(e.t==='egg')egg(e,H);else if(bg)ogre(e,H);
 if(_ii){g.restore();e.z=_iz}
 if(e.st==='tele'||e.st==='air'){const y=e.y-(bg?118:e.t==='bat'?42:52)-(e.z||0)-Math.sin(t/60)*2,pu=1+Math.sin(t/55)*.1;g.save();g.translate(e.x,y);g.scale(pu,pu);if(bg)g.scale(1.6,1.6);g.beginPath();g.arc(0,0,8.5,0,TAU);g.fillStyle='#e8281e';g.fill();g.lineWidth=2.2;g.strokeStyle='#fff';g.stroke();g.fillStyle='#fff';g.fillRect(-1.4,-5,2.8,6.4);g.fillRect(-1.4,3,2.8,2.6);g.restore()}
 if(e.hp<e.max&&!bg){const w=e.elite?32:26,x=e.x-w/2,y=e.y-e.r-(e.t==='gob'||e.t==='skel'?36:e.t==='bat'?30:e.r*1.5+8)-(e.z||0);e.lag=e.lag===undefined?e.hp:Math.max(e.hp,e.lag-e.max*.02);g.save();g.beginPath();g.roundRect?g.roundRect(x-1.5,y-1.5,w+3,7,3.5):g.rect(x-1.5,y-1.5,w+3,7);g.fillStyle='rgba(10,10,20,.85)';g.fill();g.lineWidth=1.2;g.strokeStyle=e.elite?'#ffd84a':OL;g.stroke();g.fillStyle='#fff';g.fillRect(x,y,w*clamp(e.lag/e.max,0,1),4);g.fillStyle=lg(0,y,0,y+4,e.elite?'#ffe27a':'#ff8a8a',e.elite?'#d89a18':'#d8274a');g.fillRect(x,y,w*clamp(e.hp/e.max,0,1),4);g.restore()}
 if(e.elite&&!bg){g.save();g.globalAlpha=.5+.2*Math.sin(t/150);g.translate(e.x,e.y);g.scale(1,.42);g.strokeStyle='#ffd84a';g.lineWidth=2.4;g.beginPath();g.arc(0,0,e.r*1.6,0,TAU);g.stroke();g.restore()}};
/* ====================== muerte: restos por tipo ====================== */
A.death=function(e,part){const n=BOSST[e.t]?36:14,T=EP[(e.fl-1)%3|0];
 for(let i=0;i<n;i++){const a=rnd(0,TAU),s=rnd(1,BOSST[e.t]?6:4.4);let c,sh,sz=rnd(2,4.4);
  if(e.t==='slime'||e.t==='mini'){c=T.slime;sh=null;sz=rnd(2,5)}else if(e.t==='bat'){c=i%2?T.bat:T.batw;sh='feather'}else if(e.t==='skel'){c=T.skel;sh=null;sz=rnd(2,3.6)}else if(e.t==='gob'){c=i%3?T.gob:'#ffd84a';sh=i%3?null:'star'}else{const bc=e.t==='wolf'?'#8a7a68':e.t==='slimeking'?T.slime:e.t==='golem'?'#8a8f9a':e.t==='spider'?'#4a3a5a':e.t==='lich'?'#b05aff':e.t==='arch'||e.t==='coil'?'#5ae0ff':e.t==='spiderling'?'#6a4a7a':e.t==='egg'?'#efe6c8':T.ogre;c=i%3?bc:'#ffd84a';sh=i%3?'dust':'star';sz=rnd(3,6)}
  part(e.x,e.y-e.r*.5,Math.cos(a)*s,Math.sin(a)*s-1.4,rnd(380,860),c,sz,.012,sh)}
 part(e.x,e.y,0,0,260,'#ffffff',e.r*1.7,0,'ember')};
/* ====================== escenario: suelo, muros, antorchas, decoración, puertas ====================== */
const ATL=[],TCOL=['#ffb860','#ff7a30','#9fe0ff'];let DEC={torch:[],decal:[]},ROOMS=[],TW=40,WHH=12;
const lcg=s=>()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
const mkc=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
function onCanvas(c,fn){const og=g;g=c.getContext('2d');try{fn(g)}finally{g=og}}
function floorTile(v,th,i){const S=80,r=lcg(v*977+i*131+7);g.fillStyle=(v&1)?th.f1:th.f2;g.fillRect(0,0,S,S);
 for(let k=0;k<46;k++){g.fillStyle=r()<.5?'rgba(0,0,0,.09)':'rgba(255,255,255,.05)';g.fillRect(r()*S,r()*S,1+r()*3,1+r()*2)}
 g.fillStyle='rgba(255,255,255,.07)';g.fillRect(0,0,S,3);g.fillRect(0,0,3,S);g.fillStyle='rgba(0,0,0,.26)';g.fillRect(0,S-3,S,3);g.fillRect(S-3,0,3,S);
 if(v===2||v===6){g.strokeStyle='rgba(0,0,0,.38)';g.lineWidth=2;g.beginPath();let x=10+r()*20,y=0;g.moveTo(x,y);for(let k=0;k<5;k++){x+=r()*16-6;y+=14+r()*8;g.lineTo(x,y);if(k===2){g.moveTo(x,y);g.lineTo(x+14,y+8)}}g.stroke();g.strokeStyle='rgba(255,255,255,.08)';g.lineWidth=1;g.beginPath();g.moveTo(12,0);g.lineTo(18,40);g.stroke()}
 if(v===3){for(let k=0;k<5;k++){g.fillStyle='rgba(0,0,0,.2)';g.beginPath();g.ellipse(10+r()*60,10+r()*60,2+r()*4,1.4+r()*2.4,r(),0,TAU);g.fill();g.fillStyle='rgba(255,255,255,.1)';g.fillRect(8+r()*60,8+r()*60,2,1)}}
 if(v===4){if(i===0){for(let k=0;k<4;k++){g.fillStyle='rgba(70,140,60,.35)';g.beginPath();g.ellipse(r()*80,r()*80,6+r()*8,3+r()*5,r(),0,TAU);g.fill()}}
  else if(i===1){g.save();g.shadowColor='#ff7a1a';g.shadowBlur=8;g.strokeStyle='#ff9a30';g.lineWidth=2;g.beginPath();g.moveTo(8,70);g.lineTo(26,50);g.lineTo(34,56);g.lineTo(54,30);g.lineTo(70,36);g.stroke();g.restore()}
  else{g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.2;for(let k=0;k<3;k++){const cx=15+r()*50,cy=15+r()*50;for(let q=0;q<3;q++){const a=q*PI/3;g.beginPath();g.moveTo(cx-Math.cos(a)*8,cy-Math.sin(a)*8);g.lineTo(cx+Math.cos(a)*8,cy+Math.sin(a)*8);g.stroke()}}}}
 if(v===5){g.strokeStyle=alpha(th.acc,.22);g.lineWidth=2;g.strokeRect(14,14,52,52);g.beginPath();g.moveTo(40,22);g.lineTo(58,40);g.lineTo(40,58);g.lineTo(22,40);g.closePath();g.stroke();g.fillStyle='rgba(0,0,0,.12)';g.fillRect(14,14,52,52)}
 if(v===7){g.fillStyle='rgba(0,0,0,.14)';g.beginPath();g.ellipse(30+r()*20,40,16,10,.3,0,TAU);g.fill()}}
function wallTop(v,th,i){const S=80,r=lcg(v*313+i*53);g.fillStyle=th.w;g.fillRect(0,0,S,S);
 for(let row=0;row<4;row++){const off=(row+v)%2?0:20;for(let col=-1;col<3;col++){const x=col*40+off,y=row*20;g.fillStyle=r()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.06)';g.fillRect(x+1,y+1,38,18)}}
 g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=2;for(let row=1;row<4;row++){g.beginPath();g.moveTo(0,row*20);g.lineTo(S,row*20);g.stroke()}
 for(let row=0;row<4;row++){const off=(row+v)%2?0:20;for(let col=0;col<3;col++){g.beginPath();g.moveTo(col*40+off,row*20);g.lineTo(col*40+off,row*20+20);g.stroke()}}
 g.fillStyle=th.wt;g.fillRect(0,0,S,10);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(0,0,S,3);g.fillStyle='rgba(0,0,0,.2)';g.fillRect(0,10,S,2)}
function wallFace(v,th,i){const W=80,H=WHH*2,r=lcg(v*701+i*17);g.fillStyle=th.wf;g.fillRect(0,0,W,H);
 g.strokeStyle='rgba(0,0,0,.34)';g.lineWidth=2;g.beginPath();g.moveTo(0,H/2);g.lineTo(W,H/2);for(let row=0;row<2;row++){const off=(row+v)%2?0:20;for(let col=0;col<3;col++){g.moveTo(col*40+off,row*H/2);g.lineTo(col*40+off,row*H/2+H/2)}}g.stroke();
 for(let k=0;k<8;k++){g.fillStyle=r()<.5?'rgba(255,255,255,.06)':'rgba(0,0,0,.08)';g.fillRect(r()*W,r()*H,8+r()*14,5)}
 const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(255,255,255,.1)');gr.addColorStop(.35,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=gr;g.fillRect(0,0,W,H);
 if(i===0&&v%2){g.fillStyle='rgba(70,140,60,.55)';for(let k=0;k<3;k++){const x=8+k*26+r()*8;g.beginPath();g.moveTo(x,0);g.lineTo(x+8,0);g.lineTo(x+5,6+r()*10);g.closePath();g.fill()}}
 if(i===1){g.save();g.shadowColor='#ff7a1a';g.shadowBlur=6;g.strokeStyle='rgba(255,140,50,.85)';g.lineWidth=2;g.beginPath();g.moveTo(6+r()*10,H);g.lineTo(18,H*.55);g.lineTo(30,H*.7);g.lineTo(46,H*.3);g.stroke();g.restore()}
 if(i===2){g.fillStyle='rgba(230,248,255,.85)';for(let k=0;k<4;k++){const x=6+k*20+r()*6;g.beginPath();g.moveTo(x,0);g.lineTo(x+8,0);g.lineTo(x+4,8+r()*12);g.closePath();g.fill()}}}
const AOC={};
function aoCanvas(){if(AOC.t)return;for(const[k,w,h,x0,y0,x1,y1]of[['t',40,14,0,0,0,14],['l',10,40,0,0,10,0],['r',10,40,10,0,0,0]]){const c=mkc(w,h),x=c.getContext('2d'),gr=x.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,'rgba(0,0,0,.42)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.fillRect(0,0,w,h);AOC[k]=c}}
function atlas(i,th){if(ATL[i])return ATL[i];aoCanvas();const a={f:[],wt:[],wf:[]};for(let v=0;v<8;v++){const c=mkc(80,80);onCanvas(c,()=>floorTile(v,th,i));a.f.push(c)}for(let v=0;v<3;v++){const c=mkc(80,80);onCanvas(c,()=>wallTop(v,th,i));a.wt.push(c);const d=mkc(80,WHH*2);onCanvas(d,()=>wallFace(v,th,i));a.wf.push(d)}return ATL[i]=a}
A.prep=function(rooms,tile,MW,MH,idx,theme){ROOMS=rooms;DEC={torch:[],decal:[]};atlas(idx,theme);
 for(const R of rooms){const yw=R.y0-1;for(let x=R.x0+2;x<R.x0+R.w-1;x+=(R.type==='boss'?3:5)){if(tile(x,yw)===0&&tile(x+1,yw)===0&&tile(x-1,yw)===0)DEC.torch.push({x:(x+.5)*TW,y:yw*TW+TW-WHH*.5,ph:Math.random()*6,R})}
  if(R.type==='start')continue;const n=Math.floor(R.w*R.h/26);for(let k=0;k<n;k++){const x=(R.x0+1+Math.random()*(R.w-2))*TW,y=(R.y0+1+Math.random()*(R.h-2))*TW,kind=['crack','bones','rubble','stain','patch','patch'][Math.floor(Math.random()*6)];DEC.decal.push({x,y,k:kind,s:.7+Math.random()*.8,r:Math.random()*TAU,i:Math.floor(Math.random()*3)})}}};
function decal(d,th){g.save();g.translate(d.x,d.y);g.rotate(d.r);g.scale(d.s,d.s);
 if(d.k==='bones'){g.strokeStyle=OL;g.lineWidth=4;g.lineCap='round';g.beginPath();g.moveTo(-8,-2);g.lineTo(8,3);g.moveTo(-6,5);g.lineTo(7,-5);g.stroke();g.strokeStyle='#d8d2b8';g.lineWidth=2;g.stroke();ball(-1,-9,4.4,'#e8e2c8');dot(-2.6,-9.6,1,OL);dot(.6,-9.6,1,OL)}
 else if(d.k==='rubble'){for(const[x,y,r]of[[-6,2,3.4],[2,-3,4.4],[7,4,2.6],[-1,6,2.2]])ball(x,y,r,shade(th.w,-.1),0)}
 else if(d.k==='stain'){g.globalAlpha=.4;g.fillStyle=ti===1?'#2a0a06':ti===2?'#8ac0e0':'#1a2a14';g.beginPath();g.ellipse(0,0,14,8,0,0,TAU);g.fill();g.beginPath();g.ellipse(7,5,6,4,0,0,TAU);g.fill()}
 else if(d.k==='patch'){if(ti===0){const pu=.6+.4*Math.sin(t/500+d.x);for(const[x,y]of[[-5,0],[1,-4],[5,3]]){g.fillStyle='#d8d2b8';g.fillRect(x-.8,y,1.6,5);g.beginPath();g.arc(x,y,3.4,PI,TAU);g.fillStyle=K(['#6ae09a','#8a7ae0','#e08ad0'][d.i]);g.fill();g.lineWidth=1.2;g.strokeStyle=OL;g.stroke()}}
  else if(ti===1){add(()=>glow(0,0,16,'#ff6a1a',.35+.15*Math.sin(t/200+d.x)));g.strokeStyle='#ffb040';g.lineWidth=1.6;g.beginPath();g.moveTo(-8,2);g.lineTo(-2,-2);g.lineTo(2,3);g.lineTo(8,-1);g.stroke()}
  else{poly([[-5,3],[-2,-9],[1,3]],'#bff0ff',1.2);poly([[0,4],[4,-6],[7,4]],'#e8f8ff',1.2);add(()=>glow(0,-2,14,'#9fe0ff',.25))}}
 else{g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=2;g.beginPath();g.moveTo(-14,-2);g.lineTo(-4,1);g.lineTo(2,-4);g.lineTo(10,2);g.moveTo(-4,1);g.lineTo(-2,8);g.stroke()}
 g.restore()}
function torch(o,th){const f=Math.sin(t/70+o.ph)*.5+Math.sin(t/37+o.ph*2)*.3;g.save();g.translate(o.x,o.y);
 rect(-2.4,-1,4.8,10,'#4a4a56',1.4,1);g.beginPath();g.moveTo(-6,-3);g.lineTo(6,-3);g.lineTo(4,3);g.lineTo(-4,3);g.closePath();g.fillStyle='#6a6a78';g.fill();g.lineWidth=1.6;g.strokeStyle=OL;g.stroke();
 const c=TCOL[ti];flameShape(0,-3,11,18+f*4,'#ff5a1a',c,o.ph);flameShape(0,-3,6.4,11+f*3,'#ffe27a','#ffffff',o.ph+1);if(Math.random()<.04)A._tp&&A._tp(o.x+rnd(-3,3),o.y-16,c);g.restore()}
const RC=['#6ac6ff','#ff8a3a','#bff0ff'];
function roomMark(R,th){const t0=t/1000;g.save();g.translate(R.px,R.py);
 if(R.type==='boss'){const ac='#ff5a3a',pu=.6+.4*Math.sin(t0*2.4);g.globalAlpha=.55+.15*pu;g.strokeStyle=ac;g.lineWidth=3;g.beginPath();g.arc(0,0,118,0,TAU);g.stroke();g.lineWidth=1.6;g.beginPath();g.arc(0,0,104,0,TAU);g.stroke();g.save();g.rotate(t0*.3);g.setLineDash([10,8]);g.beginPath();g.arc(0,0,92,0,TAU);g.stroke();g.restore();g.rotate(-t0*.2);g.lineWidth=2;g.beginPath();for(let i=0;i<=5;i++){const a=i*TAU*2/5-PI/2;i?g.lineTo(Math.cos(a)*86,Math.sin(a)*86):g.moveTo(Math.cos(a)*86,Math.sin(a)*86)}g.stroke();for(let i=0;i<10;i++){const a=i*TAU/10;dot(Math.cos(a)*111,Math.sin(a)*111,2.4,'#ffb090')}add(()=>glow(0,0,150,'#ff4a2a',.16+.06*pu))}
 else if(R.type==='treasure'){const pu=.6+.4*Math.sin(t0*2);g.globalAlpha=.7;g.strokeStyle='#ffd84a';g.lineWidth=2.4;g.beginPath();g.arc(0,0,56,0,TAU);g.stroke();g.save();g.rotate(t0*.4);for(let i=0;i<8;i++){g.rotate(TAU/8);poly([[52,0],[58,-3],[64,0],[58,3]],'#ffd84a',1.2)}g.restore();star(0,0,22,'rgba(255,216,74,.22)',t0*.2);add(()=>glow(0,0,110,'#ffd84a',.2+.06*pu))}
 else if(R.type==='start'){g.globalAlpha=.4;g.strokeStyle=th.acc;g.lineWidth=2;g.beginPath();g.arc(0,0,60,0,TAU);g.stroke();g.save();g.rotate(-t0*.3);g.setLineDash([6,10]);g.beginPath();g.arc(0,0,48,0,TAU);g.stroke();g.restore()}
 g.restore()}
A.ground=function(x0,x1,y0,y1,tile,T,WH,theme){TW=T;WHH=WH;const a=atlas(ti,theme);g.imageSmoothingEnabled=true;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const v=tile(x,y);if(v!==1&&v!==3)continue;const hs=hash(x,y),idx=hs%11<5?(hs&1):2+hs%6;g.drawImage(a.f[idx],x*T,y*T,T+.5,T+.5);
  if(tile(x,y-1)===0)g.drawImage(AOC.t,x*T,y*T,T,14);if(tile(x-1,y)===0)g.drawImage(AOC.l,x*T,y*T,10,T);if(tile(x+1,y)===0)g.drawImage(AOC.r,x*T+T-10,y*T,10,T)}
 const vx0=x0*T,vx1=x1*T,vy0=y0*T,vy1=y1*T;for(const d of DEC.decal)if(d.x>vx0&&d.x<vx1&&d.y>vy0&&d.y<vy1)decal(d,theme);
 for(const R of ROOMS)if(R.px>vx0-150&&R.px<vx1+150&&R.py>vy0-150&&R.py<vy1+150)roomMark(R,theme);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(tile(x,y)!==0)continue;let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){const v=tile(x+dx,y+dy);if(v===1||v===3){near=true;break}}if(!near)continue;
  const hs=hash(x,y)%3;g.drawImage(a.wt[hs],x*T,y*T-WH,T+.5,T+.5);if(tile(x,y+1)!==0)g.drawImage(a.wf[hs],x*T,y*T+T-WH,T+.5,WH+.5);else{g.fillStyle='rgba(0,0,0,.12)';g.fillRect(x*T,y*T-WH+5,T,T-5)}}
 for(const o of DEC.torch)if(o.x>vx0&&o.x<vx1&&o.y>vy0&&o.y<vy1)torch(o,theme);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(tile(x,y)!==3)continue;door(x,y,tile,T,WH,theme)}};
function door(x,y,tile,T,WH,th){const vert=tile(x,y-1)===3||tile(x,y+1)===3,f=.6+.3*Math.sin(t/80+x*2+y),px=x*T,py=y*T;g.save();
 const ac='#ff6a6a';g.fillStyle='rgba(30,10,20,.55)';g.fillRect(px,py-WH,T,T+WH);
 const gr=vert?g.createLinearGradient(px,0,px+T,0):g.createLinearGradient(0,py,0,py+T);gr.addColorStop(0,'rgba(255,60,60,0)');gr.addColorStop(.5,'rgba(255,130,130,'+f+')');gr.addColorStop(1,'rgba(255,60,60,0)');g.fillStyle=gr;g.fillRect(px,py-WH,T,T+WH);
 g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,200,200,'+f*.7+')';g.lineWidth=1.4;for(let i=0;i<5;i++){const yy=py-WH+((t/16+i*17)%(T+WH));g.beginPath();g.moveTo(px+3,yy);for(let k=1;k<=4;k++)g.lineTo(px+3+k*(T-6)/4,yy+Math.sin(t/60+k+i)*2.4);g.stroke()}
 g.strokeStyle='rgba(255,230,230,.28)';g.lineWidth=1;for(let hx=0;hx<3;hx++)for(let hy=0;hy<3;hy++){const cx=px+6+hx*14+(hy%2)*7,cy=py-WH+6+hy*17;g.beginPath();for(let k=0;k<6;k++){const a=k*PI/3;g.lineTo(cx+Math.cos(a)*6,cy+Math.sin(a)*6)}g.closePath();g.stroke()}
 g.restore();
 const endA=vert?!(tile(x,y-1)===3):!(tile(x-1,y)===3),endB=vert?!(tile(x,y+1)===3):!(tile(x+1,y)===3);
 for(const[on,ex,ey]of[[endA,vert?px+T/2:px-2,vert?py-WH-4:py+T/2],[endB,vert?px+T/2:px+T+2,vert?py+T+2:py+T/2]]){if(!on)continue;g.save();g.translate(ex,ey);add(()=>glow(0,0,16,ac,.6));poly([[-5,6],[-7,-2],[0,-10],[7,-2],[5,6]],'#4a3a58',1.6);poly([[-2.4,3],[-3.4,-2],[0,-7],[3.4,-2],[2.4,3]],ac,0);dot(-1,-3,1.1,'#fff');g.restore()}}
/* luces (antorchas, héroe) y partículas ambientales: se dibujan en coordenadas de mundo tras las entidades */
let TPE=null;A.setTorchEmit=f=>{A._tp=f};
A.lights=function(cam,w,h,H){const vx0=cam.x-w/2-120,vx1=cam.x+w/2+120,vy0=cam.y-h/2-120,vy1=cam.y+h/2+120;g.save();g.globalCompositeOperation='lighter';
 for(const o of DEC.torch){if(o.x<vx0||o.x>vx1||o.y<vy0||o.y>vy1)continue;const f=.85+Math.sin(t/70+o.ph)*.1+Math.sin(t/37+o.ph*2)*.05;glow(o.x,o.y+34,96*f,TCOL[ti],.2);glow(o.x,o.y-6,26*f,TCOL[ti],.32)}
 const ac=A.accent();glow(H.x,H.y-14,110,ac,.07);
 const N=34,W=w+240,Hh=h+240;for(let i=0;i<N;i++){const sd=hash(i*7+3,i*13+1),bx=(sd%1000)/1000,by=((sd>>10)%1000)/1000,sp=.2+((sd>>4)%100)/260;let x,y,c,r;
  if(ti===1){x=((bx*W+Math.sin(t/900+i)*14)+cam.x*0)%W;y=Hh-(((by*Hh)+t*sp*.05)%Hh);c='#ff9a30';r=1.6}else if(ti===2){x=(bx*W+t*sp*.012+Math.sin(t/700+i)*10)%W;y=((by*Hh)+t*sp*.04)%Hh;c='#e8f8ff';r=1.8}else{x=(bx*W+Math.sin(t/1300+i)*20)%W;y=(by*Hh+Math.cos(t/1700+i)*10)%Hh;c='#c8d4ff';r=1.3}
  const wx=cam.x-w/2-120+((x%W)+W)%W,wy=cam.y-h/2-120+((y%Hh)+Hh)%Hh;g.fillStyle=alpha(c,.55);g.beginPath();g.arc(wx,wy,r,0,TAU);g.fill()}
 g.restore()};
/* ====================== v26: armas nuevas, elementos, cofres por rareza, mesa, tienda, mascotas ====================== */
const ELC={fire:'#ff8a2a',ice:'#7fdcff',shock:'#ffe45a',poison:'#7be07b'};
A.setEl=(el,q)=>{A._el=el||null;A._elc=el?ELC[el]:null;A._wq=q||0};
const QC=['','#4cc9f0','#c46cff','#ffb020','#ff5a7a','#b8fff0'];
function qualFx(k,wid,wd){const q=A._wq;if(q<2)return;const c=q>=6?hsl(46+Math.sin(t/260)*6,100,74):q===5?hsl(t/8,90,70):QC[q],L=k==='bow'?18:k==='gun'?26:k==='magic'||k==='staff'?33:(wd.len||34)+8;add(()=>{glow(L*.5,0,16+q*3,c,.14+.07*q)});if(q>=3)for(let i=0;i<q-1;i++){const a=t/(300+i*70)+i*2,x=L*(.2+((i*.23+t/1600)%1)*.7);star(x,Math.sin(a)*6,1.6+q*.25,alpha(c,.95),a)}}
function pistol(wd,pull,P){const sh=wd.id==='shotgun',kick=pull*3;g.save();g.translate(-kick,0);
 if(sh){rect(-14,-3,12,6,'#6a4a2a',1.8,2);g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-12+i*3.4,-3);g.lineTo(-10+i*3.4,3);g.stroke()}
  rect(-3,-3.6,16,7.2,'#4a4e5a',1.8,1.5);rect(8,-3.4,18,2.8,'#8a909c',1.5,1);rect(8,.6,18,2.8,'#767c88',1.5,1);rect(22,2.6,12,4.4,'#6a4a2a',1.6,2);g.fillStyle='rgba(255,255,255,.45)';g.fillRect(10,-3,15,.9);
  rect(-1,3.4,4,5.4,P.gd,1.5,1.5);dot(31,-2,1.3,'#14141c');dot(31,2,1.3,'#14141c')}
 else{rect(-6,-2.6,8,10,'#3a3a46',1.8,2);rect(-4,-3.8,22,6.6,'#5a6072',1.8,2);rect(15,-2.6,9,4,'#8a909c',1.6,1.2);g.fillStyle='rgba(255,255,255,.5)';g.fillRect(-2,-3.2,18,1);rect(1,2,5,4,P.gd,1.4,1.2);rect(4,-5,3,1.8,P.acc,1,.8);ball(12,-.8,1.6,P.acc,1);dot(23.6,-.6,1.3,'#14141c')}
 g.restore();
 if(pull>.82){const mx=sh?34:24;add(()=>{glow(mx+4,0,sh?24:16,'#ffd070',.95);g.fillStyle='rgba(255,246,200,.95)';g.beginPath();g.moveTo(mx,0);g.lineTo(mx+9,-3.4);g.lineTo(mx+16,0);g.lineTo(mx+9,3.4);g.closePath();g.fill();star(mx+6,0,sh?9:6,'#ffffff',t/40)})}}
function wand(pull,P){const ac=P.acc,gl=.6+pull*.9+Math.sin(t/120)*.15;rect(-10,-1.4,30,2.8,'#7a4a22',1.6,1.4);for(let i=0;i<4;i++)rect(-6+i*7,-2,2.6,4,P.gd,1,1);
 add(()=>glow(23,0,14+pull*8,ac,Math.min(1,gl)*.85));star(23,0,6+pull*3,ac,t/260);star(23,0,3.4,'#ffffff',-t/200);
 for(let i=0;i<3;i++){const a=t/180+i*2.1;star(23+Math.cos(a)*10,Math.sin(a)*7,1.8,alpha(ac,.95),a)}}
function hammer(wd,P){const L=wd.len;rect(-10,-2,L+2,4.4,'#7a4a22',1.8,1.5);g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.1;for(let i=0;i<5;i++){g.beginPath();g.moveTo(-7+i*7,-2);g.lineTo(-4+i*7,2.4);g.stroke()}rect(-13,-3.4,4.4,7.2,P.gd,1.6,2);
 const hx=L-8;g.beginPath();g.rect(hx,-15,26,30);g.fillStyle=lg(hx,-15,hx+26,15,shade(P.bl,.5),shade(P.bl,-.4),P.bl);g.fill();g.lineWidth=2.4;g.strokeStyle=OL;g.stroke();
 rect(hx-2,-15,5,30,P.gd,1.6,1.5);rect(hx+23,-15,5,30,P.gd,1.6,1.5);for(const y of[-11,11])for(const x of[hx+1,hx+25])dot(x,y,1.5,'#f4f4f0');
 g.fillStyle='rgba(255,255,255,.5)';g.fillRect(hx+6,-13,3,26);const pu=.7+.3*Math.sin(t/160);add(()=>glow(hx+13,0,16,P.acc,.55*pu));star(hx+13,0,5,P.acc,t/300);g.strokeStyle=alpha(P.acc,.9);g.lineWidth=1.3;g.strokeRect(hx+6,-9,14,18)}
function elemFx(k,wid,wd,P){const el=A._el;if(!el)return;const c=ELC[el],L=k==='bow'?18:k==='gun'?(wid==='shotgun'?34:24):k==='magic'||k==='staff'?33:(wd.len||34)+8;
 if(el==='fire'){add(()=>{glow(L*.55,0,22,c,.5)});for(let i=0;i<4;i++){const x=L*(.25+i*.2);flameShape(x,-1,7,9+Math.sin(t/60+i*1.9)*3.5,'#ff7a1a','#ffe27a',i)}}
 else if(el==='ice'){add(()=>{glow(L*.55,0,22,c,.4)});for(let i=0;i<3;i++){const x=L*(.3+i*.25);poly([[x-2,-3],[x,-9-(i%2)*3],[x+2.4,-3]],'#cdf4ff',1.1);poly([[x-2,3],[x+1,8+(i%2)*3],[x+2.4,3]],'#a8e6ff',1.1)}star(L*.5+Math.sin(t/200)*L*.3,-1,2.8,'#ffffff',t/150)}
 else if(el==='shock'){add(()=>{glow(L*.55,0,18,c,.45)});if(Math.floor(t/55)%2){g.save();g.strokeStyle='#fff6a0';g.lineWidth=1.6;g.lineCap='round';for(let j=0;j<2;j++){g.beginPath();let x=4;g.moveTo(x,0);while(x<L+4){x+=6;g.lineTo(x,(Math.random()-.5)*(j?14:8))}g.stroke()}g.restore()}}
 else{add(()=>{glow(L*.55,0,20,c,.4)});for(let i=0;i<3;i++){const ph=((t/700)+i*.33)%1,x=L*(.3+i*.28);dot(x,3+ph*10,1.8*(1-ph*.5),alpha(c,1-ph))}if(Math.floor(t/260)%2)dot(L*.4,-4,2,'#b8f0b0')}}
/* ====================== cofres por rareza ====================== */
const CP=[{a:'#b07a3a',b:'#5a3a1a',c:'#8a5a2b',l1:'#c48a42',l2:'#7a4a22',l3:'#a0702f',band:'#7a7a86',lock:'#e0a020',glow:'#ffd84a'},
 {a:'#9ab4e0',b:'#44566e',c:'#7a92b8',l1:'#b8d0f4',l2:'#566a8a',l3:'#8aa4cc',band:'#c8d8f0',lock:'#4cc9f0',glow:'#4cc9f0'},
 {a:'#ffe27a',b:'#9a6a10',c:'#e0b030',l1:'#fff0a0',l2:'#a8741a',l3:'#e8c040',band:'#fff3c0',lock:'#c46cff',glow:'#ffcf3a'}];
A.chest=function(c){const tt=t,q=Math.min(2,c.q||0),C=CP[q],op=c.open?clamp((tt-c.open)/300,0,1):0,age=c.open?tt-c.open:0;
 let dz=0;if(c.drop){const da=tt-c.drop;if(da<500){const p=da/500;dz=Math.abs(Math.cos(p*PI*1.5))*(1-p)*46}}
 g.save();g.translate(c.x,c.y-dz);shadow(0,5+dz,20-dz*.2,7.5,.38);
 if(!c.open){const pu=.7+.3*Math.sin(tt/260);add(()=>{glow(0,-12,50+q*10,C.glow,.32*pu)});for(let i=0;i<4+q*2;i++){const a=tt/700+i*(TAU/(4+q*2)),r=22+Math.sin(tt/300+i)*3;star(Math.cos(a)*r,-12+Math.sin(a)*r*.5,2.6,q===2?'#fff0a0':q===1?'#d8f4ff':'#fff0a0',a)}
  if(q===2)add(()=>{g.fillStyle=lg(0,-90,0,-10,alpha(C.glow,0),alpha(C.glow,.35));g.fillRect(-12,-90,24,80)})}
 g.translate(0,c.open?0:Math.sin(tt/300)*1);
 g.beginPath();g.rect(-17,-15,34,19);g.fillStyle=lg(0,-15,0,4,C.a,C.b,C.c);g.fill();g.lineWidth=2.6;g.strokeStyle=OL;g.stroke();g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;for(const x of[-9,0,9]){g.beginPath();g.moveTo(x,-14);g.lineTo(x,3);g.stroke()}
 if(c.open){g.beginPath();g.rect(-14,-14,28,5);g.fillStyle='#2a1a0a';g.fill();add(()=>{glow(0,-12,26,'#ffe27a',.9*(1-op*.4))})}
 rect(-17,-9,34,3.4,C.band,1.6,0);rect(-17,-2,34,3,C.band,1.6,0);for(const x of[-14,14])for(const y of[-8,-1])dot(x,y,1,'#f0f0fa');
 rect(-4.4,-11,8.8,9,C.lock,1.8,2);g.fillStyle=K('#2a1a0a');g.beginPath();g.arc(0,-7.6,1.5,0,TAU);g.fill();g.fillRect(-.6,-7.6,1.2,3.6);
 g.save();g.translate(0,-14);g.rotate(-op*1.45);g.translate(0,14);
 g.beginPath();g.moveTo(-17,-14);g.lineTo(17,-14);g.lineTo(15,-25);g.quadraticCurveTo(0,-30,-15,-25);g.closePath();g.fillStyle=lg(0,-28,0,-14,C.l1,C.l2,C.l3);g.fill();g.lineWidth=2.6;g.strokeStyle=OL;g.stroke();rect(-17,-18,34,3.2,C.band,1.6,0);rect(-16,-23.4,32,2.6,C.band,1.4,0);g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(-7,-22,7,2,0,0,TAU);g.fill();
 if(q>=1){ball(0,-25.5,3.6,q===2?'#ff5a7a':'#4cc9f0',1.6);add(()=>glow(0,-25.5,9,q===2?'#ff5a7a':'#4cc9f0',.6))}
 if(q===2){for(const s of[-1,1])poly([[s*14,-26],[s*17,-33],[s*10,-27.5]],'#fff0a0',1.4);poly([[-4,-28],[0,-35],[4,-28]],'#fff0a0',1.4)}
 g.restore();
 if(c.open&&age<900){for(let i=0;i<8;i++){const a=-1.57+(i-3.5)*.3,d=eo(age/700)*40,fa=1-age/900;g.globalAlpha=fa;star(Math.cos(a)*d,-14+Math.sin(a)*d*1.2,3.4,i%2?'#fff0a0':'#ffd84a',age/90+i)}g.globalAlpha=1;add(()=>{g.fillStyle='rgba(255,240,170,'+(.5*(1-age/900))+')';g.fillRect(-9,-120*eo(age/500),18,120*eo(age/500))})}
 g.restore()};
/* ====================== mesa de encantamiento ====================== */
A.table=function(o){const tt=t,cols=['#ff8a2a','#7fdcff','#ffe45a','#7be07b'],ci=Math.floor(tt/1400)%4,c=cols[ci],c2=cols[(ci+1)%4],mix=(tt%1400)/1400,pu=.75+.25*Math.sin(tt/240);
 g.save();g.translate(o.x,o.y);
 g.save();g.scale(1,.5);add(()=>{glow(0,0,58,c,.28*pu)});g.rotate(tt/1800);g.strokeStyle=alpha(c,.9);g.lineWidth=2.4;g.beginPath();g.arc(0,0,40,0,TAU);g.stroke();g.lineWidth=1.4;g.beginPath();g.arc(0,0,31,0,TAU);g.stroke();
 for(let i=0;i<8;i++){const a=i*PI/4;g.save();g.rotate(a);g.translate(36,0);g.fillStyle=alpha(c,.85);g.fillRect(-1.6,-4,3.2,8);g.fillRect(-4,-1,8,2);g.restore()}
 g.beginPath();for(let i=0;i<5;i++){const a=i*TAU*2/5-PI/2;g.lineTo(Math.cos(a)*29,Math.sin(a)*29)}g.closePath();g.strokeStyle=alpha(c2,.7);g.lineWidth=1.4;g.stroke();g.restore();
 shadow(0,6,22,8,.4);
 poly([[-20,4],[20,4],[16,-4],[-16,-4]],'#6a6e84',2);rect(-16,-14,32,10,'#7c8098',2,1.5);rect(-12,-22,24,9,'#8c90a8',2,1.5);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(-11,-21,22,2);
 g.fillStyle=alpha(c,.9);for(const x of[-9,0,9])g.fillRect(x-1,-12,2,5);
 const fy=-38+Math.sin(tt/320)*3.5;add(()=>{glow(0,fy,26,c,.55*pu);g.fillStyle=lg(0,fy,0,-22,alpha(c,.5),alpha(c,0));g.beginPath();g.moveTo(-6,-22);g.lineTo(0,fy);g.lineTo(6,-22);g.fill()});
 g.save();g.translate(0,fy);g.scale(Math.abs(Math.cos(tt/500))*.7+.3,1);poly([[0,-12],[8,0],[0,12],[-8,0]],mix<.5?c:c2,1.8);g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.moveTo(0,-12);g.lineTo(4,-2);g.lineTo(0,0);g.closePath();g.fill();g.restore();
 for(let i=0;i<5;i++){const a=tt/420+i*1.256,r=16+Math.sin(tt/260+i)*3;star(Math.cos(a)*r,fy+Math.sin(a)*r*.5,2.2,alpha(i%2?c:c2,.95),a)}
 g.font='900 11px Trebuchet MS,sans-serif';g.textAlign='center';g.lineWidth=3.4;g.strokeStyle='#000';g.strokeText('Mesa de encantamiento',0,-62+Math.sin(tt/400)*1.5);g.fillStyle='#f0e0ff';g.fillText('Mesa de encantamiento',0,-62+Math.sin(tt/400)*1.5);g.restore()};
/* ====================== tienda del mercader ====================== */
A.shop=function(o){const tt=t,bob=Math.sin(tt/420)*1.6,bl=(tt%3000)<120;g.save();g.translate(o.x,o.y);shadow(0,6,44,11,.4);
 // mercader (detrás del mostrador)
 g.save();g.translate(0,-4+bob*.5);ell(0,-34,15,18,'#5a3a7a',0,2);g.beginPath();g.arc(0,-46,12,PI,0);g.lineTo(12,-40);g.lineTo(-12,-40);g.closePath();g.fillStyle='#3e2858';g.fill();g.lineWidth=2.2;g.strokeStyle=OL;g.stroke();
 ell(0,-41,8.4,7.4,'#2a1a3a',0,1.6);const ey=bl?.4:2.2;dot(-3,-41,ey,'#ffe27a');dot(3,-41,ey,'#ffe27a');add(()=>{glow(-3,-41,5,'#ffe27a',.6);glow(3,-41,5,'#ffe27a',.6)});
 g.beginPath();g.moveTo(-5,-36);g.quadraticCurveTo(0,-32.4,5,-36);g.strokeStyle='#e8d8b8';g.lineWidth=1.4;g.stroke();
 const w=Math.sin(tt/380)*.35;limb(-11,-30,-22,-24+w*10,4.6,'#5a3a7a');ball(-22.6,-23.6+w*10,3,'#e0b890',1.6);limb(11,-30,20,-22,4.6,'#5a3a7a');ball(21,-21.6,3,'#e0b890',1.6);
 g.restore();
 // mostrador
 rect(-30,-18,60,20,'#8a5a2b',2.4,2);g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(i*12,-17);g.lineTo(i*12,1);g.stroke()}rect(-32,-21,64,5,'#b07a3a',2,1.5);
 // mercancía
 poly([[-24,-21],[-24,-30],[-21,-30],[-21,-21]],'#cfd8dc',1.2);poly([[-26,-27],[-19,-27],[-19,-25],[-26,-25]],'#e0a020',1);ball(-8,-26,4.6,'#d83a5a',1.6);rect(-10.6,-33,5.2,3.4,'#8a6a40',1.2,1);add(()=>glow(-8,-27,10,'#ff5a7a',.4));
 g.save();g.translate(6,-22);ell(0,-4,6.6,5.6,'#caa86a',0,1.6);g.fillStyle=K('#ffd84a');g.font='900 8px Georgia,serif';g.textAlign='center';g.fillText('$',0,-1.2);g.restore();
 for(let i=0;i<3;i++)ball(19+i*0,-23-i*2.4,3.2,'#ffd84a',1.4);
 // toldo a rayas
 for(let i=0;i<6;i++){const x=-34+i*11.4;poly([[x,-62],[x+11.4,-62],[x+11.4,-50],[x+5.7,-46],[x,-50]],i%2?'#f4f0e4':'#d83a3a',1.6)}
 rect(-36,-66,72,5,'#8a5a2b',2,1.5);for(const s of[-1,1])rect(s*33-1.5,-62,3,44,'#7a4a22',1.6,1);
 // farol
 g.beginPath();g.moveTo(24,-46);g.lineTo(24,-40);g.strokeStyle='#14141c';g.lineWidth=1.4;g.stroke();const fl=.75+.25*Math.sin(tt/90);add(()=>glow(24,-37,22,'#ffb040',.5*fl));ell(24,-37,3.4,4.2,'#ffcf6a',0,1.4);
 g.font='900 11px Trebuchet MS,sans-serif';g.textAlign='center';g.lineWidth=3.4;g.strokeStyle='#000';const ty=-74+Math.sin(tt/380)*1.6;g.strokeText('🛒 Tienda',0,ty);g.fillStyle='#fff0c0';g.fillText('🛒 Tienda',0,ty);
 if(Math.floor(tt/500)%7===0)star(-24,-52,3,'#fff',tt/90);g.restore()};
/* ====================== mascotas aliadas ====================== */
const PPAL={wolf:['#8a94a8','#4a5264','#e8c040'],knight:['#aab6c6','#4f86e6','#ffd84a'],mage:['#7a4ab8','#4a2a80','#c46cff'],dragon:['#5ad05a','#2f8a3a','#ff9a30'],otter:['#8a6444','#5a3f2a','#4fc3ff'],gfire:['#6a5450','#2e2322','#ff7a1a'],gice:['#bfe6f6','#6aa8cc','#f0fcff'],gshock:['#66647a','#2f2d40','#ffe45a'],gpoison:['#66784a','#2f3b22','#8aff5a'],gwater:['#4f8cb8','#264f74','#6fe0ff'],phoenix:['#ff8a2a','#c8321a','#ffe27a'],firefly:['#7be0a0','#2a6a52','#ffe27a']};
function petBar(p,y){const w=26,x=-w/2,fr=clamp(p.hp/p.max,0,1);g.save();g.beginPath();g.roundRect?g.roundRect(x-1.5,y-1.5,w+3,7,3.5):g.rect(x-1.5,y-1.5,w+3,7);g.fillStyle='rgba(10,10,20,.85)';g.fill();g.lineWidth=1.2;g.strokeStyle='#7be07b';g.stroke();g.fillStyle=lg(0,y,0,y+4,fr<.35?'#ffb0a0':'#b8ffb8',fr<.35?'#d8402a':'#2fb84a');g.fillRect(x,y,w*fr,4);
 g.font='900 8px Trebuchet MS,sans-serif';g.textAlign='center';g.lineWidth=2.4;g.strokeStyle='#000';g.strokeText('Nv.'+p.lv,0,y-3);g.fillStyle='#dfffe0';g.fillText('Nv.'+p.lv,0,y-3);g.restore()}
/* ---- texturas para mascotas: pelaje, escamas, plumas ---- */
function clipE(x,y,rx,ry,rot){g.beginPath();g.ellipse(x,y,rx,ry,rot||0,0,TAU);g.clip()}
function furTex(x,y,rx,ry,c,n,len){if(FL)return;g.save();clipE(x,y,rx,ry);g.lineCap='round';g.lineWidth=.7;for(let i=0;i<n;i++){const a=i*2.399,r=Math.sqrt((i+.5)/n),px=x+Math.cos(a)*r*rx,py=y+Math.sin(a)*r*ry;g.strokeStyle=alpha(i%3?shade(c,-.4):shade(c,.5),i%3?.45:.55);g.beginPath();g.moveTo(px,py);g.lineTo(px-len*.6,py+len);g.stroke()}g.restore()}
function scaleTex(x,y,rx,ry,c,sz,hi){if(FL)return;g.save();clipE(x,y,rx,ry);g.lineWidth=.8;const rh=sz*.75;let row=0;for(let r=y-ry;r<y+ry+sz;r+=rh,row++){const off=row%2?sz/2:0;for(let q=x-rx-sz;q<x+rx+sz;q+=sz){g.strokeStyle=alpha(shade(c,-.5),.6);g.beginPath();g.arc(q+off,r,sz/2,.15,PI-.15);g.stroke();if(hi){g.strokeStyle=alpha(shade(c,.55),.4);g.beginPath();g.arc(q+off,r-.9,sz/2-.6,PI+.5,TAU-.5);g.stroke()}}}g.restore()}
function feather(x,y,len,w,ang,c1,c2){g.save();g.translate(x,y);g.rotate(ang);g.beginPath();g.moveTo(0,0);g.bezierCurveTo(len*.3,-w,len*.8,-w*.8,len,0);g.bezierCurveTo(len*.8,w*.8,len*.3,w,0,0);g.closePath();g.fillStyle=lg(0,0,len,0,c1,c2);g.fill();g.lineWidth=1.3;g.strokeStyle=OL;g.lineJoin='round';g.stroke();if(!FL){g.strokeStyle=alpha('#ffffff',.38);g.lineWidth=.6;g.beginPath();g.moveTo(1,0);g.lineTo(len*.9,0);g.stroke()}g.restore()}
function sheen(x,y,rx,ry,a){if(FL)return;g.save();clipE(x,y,rx,ry);const gr=g.createLinearGradient(x-rx,y-ry,x+rx*.2,y+ry);gr.addColorStop(0,'rgba(255,255,255,'+(a||.35)+')');gr.addColorStop(.5,'rgba(255,255,255,0)');gr.addColorStop(1,'rgba(0,0,0,.25)');g.fillStyle=gr;g.fillRect(x-rx,y-ry,rx*2,ry*2);g.restore()}
function eye(x,y,r,iris,look){dot(x,y,r,'#fff8e0');dot(x+r*.18,y+r*.1,r*.72,iris);dot(x+r*.3,y+r*.1,r*.4,'#14141c');dot(x-r*.15,y-r*.35,r*.28,'#fff')}
function tailChain(x0,y0,dx,dy,bend,n,r0,r1,c,tip){for(let i=0;i<=n;i++){const u=i/n,px=x0+dx*u,py=y0+dy*u+bend*u*u,r=r0+(r1-r0)*Math.sin(u*PI*.9)+(1-u)*.2;ell(px,py,r*1.15,r,i===n&&tip?tip:shade(c,-.04+u*.1),Math.atan2(dy+bend*2*u,dx),1.6)}}
const GOL={gfire:'fire',gice:'ice',gshock:'shock',gpoison:'poison',gwater:'water'};
function golem(p,el,b,atk,mv,c1,c2,c3){const pu=.7+.3*Math.sin(t/260+p.ph),ice=el==='ice',wat=el==='water';
 for(let i=0;i<2;i++){const ph=p.ph+i*PI,fx=Math.sin(ph)*3.2*mv+(i?-4.4:4.4);rect(fx-3.6,-11,7.2,10,i?shade(c2,-.12):c2,1.8,2.4);ell(fx+.8,-.8,5.4,2.8,shade(c2,-.28),0,1.6);if(!FL){g.strokeStyle=alpha('#000',.3);g.lineWidth=.7;g.beginPath();g.moveTo(fx-3,-7);g.lineTo(fx+3,-6);g.stroke()}}
 g.save();g.translate(0,-b);add(()=>glow(0,-18,26,c3,.2*pu));
 const arm=(sx,fx,fy,dk)=>{limb(sx,-22,fx,fy,5.4,dk?shade(c2,-.1):c2);ball(fx,fy,5,dk?shade(c1,-.18):c1,1.8);if(!FL){g.strokeStyle=alpha('#000',.35);g.lineWidth=.7;g.beginPath();g.moveTo(fx-1.6,fy-3.6);g.lineTo(fx-.6,fy+3.4);g.stroke()}dot(fx+1.4,fy-.4,1.7,c3);add(()=>glow(fx,fy,9+atk*9,c3,.4+atk*.5))};
 arm(-10.4,-13.6,-10+Math.sin(p.ph)*2.4*mv,1);
 const T=[[-10.4,-9.6],[-12.6,-19],[-8,-27.6],[1,-29.6],[9.4,-27],[12.8,-18],[10.6,-9.6]];
 poly(T,c1,2.2);g.beginPath();g.moveTo(T[0][0],T[0][1]);for(let i=1;i<T.length;i++)g.lineTo(T[i][0],T[i][1]);g.closePath();g.fillStyle=lg(-10,-29,10,-9,shade(c1,.3),shade(c1,-.35),c1);g.fill();g.lineWidth=2.2;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
 if(!FL){g.save();g.beginPath();g.moveTo(T[0][0],T[0][1]);for(let i=1;i<T.length;i++)g.lineTo(T[i][0],T[i][1]);g.closePath();g.clip();
  g.fillStyle=alpha(shade(c1,.55),.4);g.beginPath();g.moveTo(-8,-27.6);g.lineTo(1,-29.6);g.lineTo(-2,-20);g.lineTo(-11,-18);g.fill();g.fillStyle=alpha(shade(c2,-.4),.35);g.beginPath();g.moveTo(12.8,-18);g.lineTo(10.6,-9.6);g.lineTo(2,-10);g.lineTo(5,-19);g.fill();
  g.strokeStyle=alpha(shade(c2,-.5),.6);g.lineWidth=.8;g.beginPath();g.moveTo(-12,-19);g.lineTo(-2,-20);g.lineTo(5,-19);g.lineTo(12.8,-18);g.moveTo(-2,-20);g.lineTo(1,-29.6);g.moveTo(-3,-10);g.lineTo(-2,-20);g.stroke();
  for(let i=0;i<14;i++){g.fillStyle=alpha(i%2?shade(c1,-.5):shade(c1,.6),.5);g.beginPath();g.arc(-10+(i*7.3%21),-27+(i*5.1%17),.5+(i%3)*.25,0,TAU);g.fill()}
  g.restore();
  g.lineCap='round';g.lineJoin='round';
  if(el==='fire'){add(()=>{g.strokeStyle=alpha('#ff7a1a',.95);g.lineWidth=1.6;g.beginPath();g.moveTo(-6,-26);g.lineTo(-4,-21);g.lineTo(-8,-17);g.lineTo(-5,-12);g.moveTo(6,-25);g.lineTo(4,-20);g.lineTo(8,-16);g.lineTo(6,-11);g.stroke();g.strokeStyle=alpha('#ffe27a',.9);g.lineWidth=.6;g.beginPath();g.moveTo(-6,-26);g.lineTo(-4,-21);g.lineTo(-8,-17);g.moveTo(6,-25);g.lineTo(4,-20);g.lineTo(8,-16);g.stroke()})}
  else if(el==='ice'){g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=.9;g.beginPath();g.moveTo(-9,-25);g.lineTo(-4,-17);g.lineTo(-8,-12);g.moveTo(8,-24);g.lineTo(3,-19);g.lineTo(9,-13);g.stroke();for(let i=0;i<4;i++)star(-7+i*5,-14-(i%2)*8,1.6,'rgba(255,255,255,.9)',t/900+i)}
  else if(el==='shock'){add(()=>{g.strokeStyle=alpha('#ffe45a',.95);g.lineWidth=1.5;g.beginPath();g.moveTo(-8,-26);g.lineTo(-3,-22);g.lineTo(-7,-19);g.lineTo(-2,-14);g.moveTo(9,-25);g.lineTo(4,-21);g.lineTo(8,-17);g.lineTo(3,-12);g.stroke()})}
  else if(el==='poison'){g.strokeStyle=alpha('#8aff5a',.9);g.lineWidth=1.6;g.beginPath();g.moveTo(-8,-26);g.quadraticCurveTo(-6,-20,-8,-14);g.moveTo(6,-26);g.quadraticCurveTo(8,-19,5,-13);g.stroke();for(let i=0;i<3;i++){const u=((t/900+i/3)%1);dot(-8+i*7,-14+u*8,1.5*(1-u)+.4,alpha('#9aff6a',.9))}}
  else{g.strokeStyle=alpha('#d8f8ff',.8);g.lineWidth=1;for(let k=0;k<3;k++){g.beginPath();for(let x=-10;x<=11;x+=2)g.lineTo(x,-24+k*5+Math.sin(x*.5+t/260+k)*1.4);g.stroke()}}}
 ball(0,-17.4,3.6,c3,1.4);add(()=>{glow(0,-17.4,12*pu,c3,.95)});dot(-.8,-18.2,1,'#fff');
 // cabeza
 ball(2,-31.4,6.4,shade(c1,.05),2);if(!FL){g.fillStyle=alpha(shade(c1,.6),.45);g.beginPath();g.ellipse(-.4,-34,3.4,2,-.4,0,TAU);g.fill()}
 rect(1.4,-34,9,3.4,'#14141c',1.2,1.2);add(()=>{glow(4.4,-32.4,5,c3,.9);glow(8.4,-32.6,5,c3,.9)});dot(4.4,-32.4,1.2,'#fff');dot(8.4,-32.6,1.2,'#fff');
 if(el==='fire'){for(let i=0;i<3;i++)flameShape(-1+i*3.6,-36.4,5,9+i%2*3,'#ff5a1a','#ffe27a',i)}
 else if(el==='ice'){poly([[-2,-36],[-.6,-44],[1.4,-36]],'#e8fbff',1.2);poly([[1.2,-36.6],[3.4,-46],[5.4,-36.4]],'#bfe6f6',1.2);poly([[5,-36],[7.4,-42],[8.4,-35]],'#e8fbff',1.2)}
 else if(el==='shock'){for(const x of[0,5.6]){line(x,-36.6,x-1,-42,1.4,'#6a6880');add(()=>glow(x-1,-43,5+Math.sin(t/70+x)*1.6,'#ffe45a',.95));star(x-1,-43,2.2,'#fff7b0',t/90)}}
 else if(el==='poison'){for(const[x,r]of[[-.4,2.6],[4.6,3.2],[9,2]]){ball(x,-37.4,r,'#9aff6a',1.2);dot(x-.6,-38,r*.3,'#e8ffd8')}}
 else{g.beginPath();g.moveTo(1,-36);g.quadraticCurveTo(3,-45,5,-36);g.fillStyle=K(alpha('#8fe0ff',.8));g.fill();g.lineWidth=1.2;g.strokeStyle=OL;g.stroke();for(let i=0;i<3;i++){const u=((t/700+i/3)%1);dot(3+Math.sin(u*6+i)*4,-39-u*8,1.4*(1-u)+.4,alpha('#bff0ff',.9*(1-u)))}}
 const fx=13.4+atk*10,fy=-12-atk*7+Math.sin(p.ph+PI)*2.4*mv;arm(10.4,fx,fy,0);
 g.restore()}
A.pet=function(p,H){FL=p.flash>t;const [c1,c2,c3]=PPAL[p.k],S=1.18,mv=Math.min(1,Math.hypot(p.vx,p.vy)/2.2),atk=p.atk&&t-p.atk<240?1-(t-p.atk)/240:0,heal=p.healT&&t-p.healT<500?1-(t-p.healT)/500:0,fly=(p.k==='dragon'||p.k==='phoenix'||p.k==='firefly')?10+Math.sin(t/200+p.ph)*3:0;
 g.save();g.translate(p.x,p.y);
 if(p.down){g.globalAlpha=.55;shadow(0,3,10,4,.3);g.translate(0,-4);g.rotate(.5*p.face);ell(0,-6,10,6,c1,0,2);furTex(0,-6,9,5,c1,14,1.6);g.rotate(-.5*p.face);g.globalAlpha=1;g.font='900 14px sans-serif';g.textAlign='center';for(let i=0;i<3;i++){const a=t/300+i*2.1;g.fillStyle='#ffe27a';g.fillText('✦',Math.cos(a)*10,-18+Math.sin(a)*4)}
  const pr=clamp(p.rst/14000,0,1);g.fillStyle='rgba(10,10,20,.7)';g.fillRect(-12,-34,24,4);g.fillStyle='#7be07b';g.fillRect(-12,-34,24*pr,4);g.restore();return}
 if(p.inv>t&&Math.floor(t/90)%2)g.globalAlpha=.55;
 if(heal)add(()=>glow(0,-10,26,'#7be07b',.6*heal));
 shadow(0,3,(p.k==='knight'?9:11)*S*(1-fly*.012),4.2,.34);g.translate(0,-fly);g.scale(p.face*(1+(p.sq||0)*.5)*S,S*(1-(p.sq||0)*.6));
 const b=Math.abs(Math.sin(p.ph))*1.8*mv+Math.sin(t/300+p.ph)*.6;
 if(p.k==='wolf'){const lung=atk*7,c4=shade(c1,.5),tw=Math.sin(t/110)*3;g.translate(lung,0);
  tailChain(-9,-9-b,-9,-9,-1+tw,5,2.6,3.6,c1,'#eef1f6');furTex(-13,-14-b,5,6,c1,12,2);for(let q=0;q<3;q++)poly([[-15-q*.6,-16.6-b+q*2.4+tw*.3],[-19.4,-19-b+q*2.8+tw*.4],[-15.4,-13.8-b+q*2.4]],c1,.9);
  for(let i=0;i<4;i++){const ph=p.ph+(i%2)*PI+(i>1?.6:0),x=(i>1?7:-7),fx=x+Math.sin(ph)*4*mv,fy=-Math.max(0,Math.cos(ph))*3*mv,lc=i%2?shade(c1,-.28):c1;limb(x,-6,fx,fy-1,3.6,lc);ell(fx+.8,fy-.3,3,1.9,c4,0,1.3);if(!FL){g.strokeStyle=alpha('#14141c',.7);g.lineWidth=.6;for(let q=-1;q<=1;q++){g.beginPath();g.moveTo(fx+2.2+q*.2,fy-.2+q*.7);g.lineTo(fx+3.4,fy+q*.7);g.stroke()}}}
  ell(0,-9-b,11.5,7,c1,0,2);clipE(0,-9-b,11.5,7);g.fillStyle=K(alpha(c2,.6));g.beginPath();g.ellipse(-1,-14-b,13,4.4,0,0,TAU);g.fill();g.fillStyle=K(c4);g.beginPath();g.ellipse(1,-4.6-b,9,3.2,0,0,TAU);g.fill();g.restore();
  furTex(0,-9-b,11,6.6,c1,46,2.4);sheen(0,-9-b,11.5,7,.3);
  for(let i=0;i<6;i++){const x=-9+i*3.2;poly([[x,-14.6-b],[x+1.7,-19.2-b-(i%2)*1.2],[x+3.2,-14.4-b]],i%2?c2:shade(c1,-.2),1)}
  poly([[6,-9.5-b],[10,-7-b],[7.6,-4.2-b],[5.6,-6.4-b]],c4,1);
  ell(11,-14-b,6.4,5.8,c1,0,2);furTex(11,-14-b,6,5.4,c1,16,1.7);
  poly([[6.8,-12-b],[4,-8.6-b],[9,-10.4-b]],c4,1);poly([[8,-17-b],[8.6,-22-b],[12,-18-b]],c2,1);
  poly([[13,-18.4-b],[16.2,-25.6-b],[18.2,-17.4-b]],c1,1.5);poly([[14.4,-18-b],[16.2,-23.2-b],[17.2,-18-b]],'#e89aa8',0);poly([[8,-18-b],[7.6,-25-b],[12,-18.2-b]],shade(c1,-.25),1.5);poly([[8.8,-18.4-b],[8.4,-23-b],[11,-18.4-b]],'#c47a88',0);
  ell(16.5,-12.4-b,3.9,2.8,c4,0,1.6);ell(20,-13.4-b,1.6,1.2,'#14141c',0,.8);dot(19.6,-13.9-b,.45,'#fff');
  if(!FL){g.strokeStyle='#14141c';g.lineWidth=.8;g.beginPath();g.moveTo(15,-10.7-b);g.quadraticCurveTo(17.4,-9.6-b,19.2,-10.8-b);g.stroke()}
  line(10.4,-17.6-b,13.8,-16.6-b,1.1,c2);eye(12.6,-15-b,1.8,'#ffc83a');
  rect(5,-12-b,4.2,3.2,'#d83a3a',1.2,1);ball(7.3,-8.4-b,1.5,c3,1);
  if(atk){g.fillStyle='#fff';g.beginPath();g.moveTo(15,-10.4-b);g.lineTo(16.2,-7-b);g.lineTo(17.6,-10.4-b);g.fill();g.beginPath();g.moveTo(18,-10.6-b);g.lineTo(19,-8-b);g.lineTo(20,-10.6-b);g.fill()}}
 else if(p.k==='knight'){const sw=Math.sin(p.ph)*3*mv,steel=c1,dk=shade(c1,-.35);
  for(let i=0;i<2;i++){const ph=p.ph+i*PI,fx=Math.sin(ph)*4*mv+(i?-2:2);limb(i?-2.6:2.6,-9,fx,-1,4.2,i?dk:steel);ell(fx+1.4,-.4,5,2.7,'#3a3a4a',0,1.6);dot(fx+3,-1,.7,'#9aa4b8')}
  g.save();g.translate(0,-b);
  g.beginPath();g.moveTo(-8,-9);g.lineTo(8,-9);g.lineTo(6,-1.4);g.quadraticCurveTo(0,0,-6,-1.4);g.closePath();g.fillStyle=K(c2);g.fill();g.lineWidth=1.8;g.strokeStyle=OL;g.stroke();
  if(!FL){g.save();g.beginPath();g.moveTo(-8,-9);g.lineTo(8,-9);g.lineTo(6,-1.4);g.quadraticCurveTo(0,0,-6,-1.4);g.closePath();g.clip();g.strokeStyle=alpha(shade(c2,-.5),.55);g.lineWidth=.7;for(let r=0;r<4;r++)for(let q=-9;q<10;q+=2.6){g.beginPath();g.arc(q+(r%2?1.3:0),-8+r*2.2,1.3,.1,PI-.1);g.stroke()}g.restore()}
  ell(0,-15,8.6,8.8,steel,0,2);sheen(0,-15,8.4,8.6,.45);rect(-8.4,-13,16.8,2.7,'#6a5a30',1.4,1);for(const rx of[-6,-2,2,6])dot(rx,-11.7,.7,c3);
  g.fillStyle=K(c2);g.fillRect(-1,-21,2,9);g.fillRect(-4.4,-18.2,8.8,2);g.strokeStyle=OL;g.lineWidth=.8;g.strokeRect(-1,-21,2,9);
  for(const sx of[-8.4,8.4]){ball(sx,-20,3.8,steel,1.6);dot(sx-.6,-21,1,'#e9eef5')}
  ball(0,-26.5,7.8,steel,2);sheen(0,-26.5,7.6,7.6,.5);rect(-4.6,-28.4,11,4,'#14141c',1.2,1);if(!FL){g.strokeStyle=alpha('#8899bb',.55);g.lineWidth=.6;for(let q=0;q<4;q++){g.beginPath();g.moveTo(-3.4+q*2.8,-28);g.lineTo(-3.4+q*2.8,-25);g.stroke()}}add(()=>glow(2.4,-26.3,5,'#7bd8ff',.7));dot(2.2,-26.4,1.2,'#bdf0ff');
  g.beginPath();g.moveTo(0,-34);g.lineTo(0,-30);g.lineWidth=2;g.strokeStyle=K(dk);g.stroke();poly([[-1.6,-34],[0,-38.4],[1.6,-34]],c3,1.1);
  const pw=Math.sin(t/180+p.ph);for(let k=0;k<3;k++){g.beginPath();g.moveTo(-1,-34);g.quadraticCurveTo(-7-k*1.2,-39+pw*1.4,-10-k*1.7+pw*1.4,-33+k*2.4);g.lineWidth=2.6-k*.5;g.lineCap='round';g.strokeStyle=K(k%2?'#a82426':'#e03a3a');g.stroke()}
  g.save();g.translate(-6.4,-14);poly([[-5.6,-7],[5.6,-7],[5.6,.5],[0,8],[-5.6,.5]],c2,1.9);if(!FL){g.strokeStyle=alpha(c3,.9);g.lineWidth=1;g.beginPath();g.moveTo(-4.2,-5.6);g.lineTo(4.2,-5.6);g.lineTo(4.2,.2);g.lineTo(0,6);g.lineTo(-4.2,.2);g.closePath();g.stroke()}star(0,-1,3.2,K(c3),0);ball(0,-1,1,'#d83a3a',.6);g.restore();
  const wa=-.3+atk*1.5-.2*Math.sin(t/300);limb(6,-18,9+Math.cos(wa)*4,-14+Math.sin(wa)*4,3.8,steel);ball(9+Math.cos(wa)*4,-14+Math.sin(wa)*4,2,dk,1.2);g.save();g.translate(9+Math.cos(wa)*4,-14+Math.sin(wa)*4);g.rotate(wa-1.2);rect(-1.4,-1.5,17,3,'#dfe8ee',1.4,.8);if(!FL){g.strokeStyle='rgba(120,140,170,.7)';g.lineWidth=.6;g.beginPath();g.moveTo(1,0);g.lineTo(15,0);g.stroke();g.strokeStyle='rgba(255,255,255,.8)';g.beginPath();g.moveTo(1,-.9);g.lineTo(15,-.9);g.stroke()}rect(-1,-4.2,2.6,8.4,c3,1.2,.8);ball(-2.4,0,1.5,c3,1);g.restore();g.restore()}
 else if(p.k==='mage'){g.translate(0,-3+Math.sin(t/260+p.ph)*1.6);
  const sx=10,sy=-14;g.save();g.translate(sx,sy);g.rotate(-.1-atk*.4);rect(-1.5,-18,3,31,'#7a4a22',1.4,1);if(!FL){g.strokeStyle='rgba(40,20,8,.55)';g.lineWidth=.6;for(let q=0;q<5;q++){g.beginPath();g.moveTo(-.6,-15+q*5.6);g.lineTo(.8,-13+q*5.6);g.stroke()}}
  add(()=>glow(0,-21,13+atk*10,c3,.7));ball(0,-21,3.8+atk*1.4,c3,1.4);for(let i=0;i<3;i++){const a=t/300+i*2.1;star(Math.cos(a)*7,-21+Math.sin(a)*3,1.6,alpha('#ffffff',.9),a)}g.restore();
  g.beginPath();g.moveTo(-11,0);g.lineTo(-6.4,-22);g.lineTo(6.4,-22);g.lineTo(11,0);g.quadraticCurveTo(0,3.4,-11,0);g.fillStyle=lg(-10,-20,10,0,shade(c1,.18),shade(c1,-.3));g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  if(!FL){g.save();g.beginPath();g.moveTo(-11,0);g.lineTo(-6.4,-22);g.lineTo(6.4,-22);g.lineTo(11,0);g.quadraticCurveTo(0,3.4,-11,0);g.clip();g.strokeStyle=alpha(shade(c1,-.5),.55);g.lineWidth=.9;for(const fx of[-6,-2,2,6]){g.beginPath();g.moveTo(fx*.55,-20);g.quadraticCurveTo(fx*1.2,-9,fx*1.5,1);g.stroke()}[[-6,-12],[4,-15],[-2,-5],[7,-6],[-8,-4]].forEach(([qx,qy],i)=>star(qx,qy,1.5+(i%2)*.5,alpha(c3,.8),t/700+i));g.restore();
   g.strokeStyle=alpha(c3,.95);g.lineWidth=1.3;g.beginPath();g.moveTo(-10.6,-1.2);for(let q=0;q<7;q++){g.lineTo(-10.6+q*3.55+1.7,q%2?-1.4:.8)}g.stroke()}
  g.fillStyle=K(c3);g.fillRect(-8,-9.4,16,2.2);ball(0,-8.3,1.5,'#ffe9a0',.8);
  limb(-6,-19,-9,-12,3.2,shade(c1,-.15));ball(-9,-12,2,'#f1c79c',1.1);
  ell(0,-23.4,6.8,6.3,'#f1c79c',0,1.8);if(!FL){dot(-3.2,-22,1.5,alpha('#ff8a7a',.35));dot(4,-22,1.5,alpha('#ff8a7a',.35))}ell(3.2,-22.3,1.4,1.1,'#e8a888',0,.8);
  g.beginPath();g.moveTo(-5.4,-21);g.quadraticCurveTo(-6,-13,-1.2,-12.4);g.quadraticCurveTo(1,-10.6,3,-13);g.quadraticCurveTo(6.2,-14,5.8,-21);g.quadraticCurveTo(1,-17.6,-5.4,-21);g.fillStyle=lg(0,-21,0,-11,'#ffffff','#c9ccd8');g.fill();g.lineWidth=1.4;g.strokeStyle=OL;g.stroke();
  line(-1,-17.6,2.4,-17.6,.8,'#aab');dot(.9,-24.4,1.2,'#14141c');dot(.5,-24.8,.4,'#fff');line(-.6,-26.4,3.2,-26,1.3,'#fff');
  g.beginPath();g.moveTo(-9.6,-25);g.quadraticCurveTo(-4,-44,6,-45);g.quadraticCurveTo(12,-44.4,13,-38+Math.sin(t/260)*1.5);g.quadraticCurveTo(7,-37,9,-25);g.closePath();g.fillStyle=lg(-8,-44,9,-25,shade(c2,.25),shade(c2,-.25));g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  g.beginPath();g.ellipse(0,-25.6,11,3,0,0,TAU);g.fillStyle=lg(-10,-26,10,-24,shade(c2,.2),shade(c2,-.3));g.fill();g.stroke();rect(-8,-28.4,16,2.6,c3,1,1);ball(0,-27.1,1.4,'#fff4c0',.8);
  star(3.4,-35,2.6,c3,t/500);dot(-2,-33.5,2,c3);dot(-1.2,-34,1.7,shade(c2,.1));star(13,-37.6+Math.sin(t/260)*1.5,2,'#ffe27a',t/300)}
 else if(GOL[p.k])golem(p,GOL[p.k],b,atk,mv,c1,c2,c3);
 else if(p.k==='otter'){const c4='#f3e2bf',dk='#4a3322',wv=Math.sin(t/140+p.ph)*2,bw=Math.sin(t/420+p.ph);
  if(!FL)add(()=>{for(let i=0;i<2;i++){const u=((t/1000+i*.5)%1);g.strokeStyle=alpha(c3,.55*(1-u));g.lineWidth=1.2;g.beginPath();g.ellipse(0,2,8+u*11,2.6+u*3.4,0,0,TAU);g.stroke()}});
  // cola gruesa, lisa y aplanada (como de nutria)
  g.beginPath();g.moveTo(-9,-11-b);g.bezierCurveTo(-17,-12.6-b,-24,-9+wv*.4,-28,-3.6+wv);g.bezierCurveTo(-24,-3.4+wv*.6,-17,-3.2-b,-9,-4.2-b);g.closePath();g.fillStyle=lg(-9,-8,-28,-4,c1,dk);g.fill();g.lineWidth=2;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
  if(!FL){g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=.9;g.lineCap='round';g.beginPath();g.moveTo(-11,-10-b);g.bezierCurveTo(-16,-11.2-b,-21,-8.6+wv*.4,-25,-4.6+wv);g.stroke();g.strokeStyle=alpha(dk,.5);g.lineWidth=.7;g.beginPath();g.moveTo(-11,-6.4-b);g.bezierCurveTo(-16,-6.6-b,-21,-5+wv*.5,-25,-3.8+wv);g.stroke()}
  for(let i=0;i<4;i++){const ph=p.ph+(i%2)*PI+(i>1?.6:0),x=(i>1?6.4:-6),fx=x+Math.sin(ph)*3.2*mv,fy=-Math.max(0,Math.cos(ph))*2.4*mv;limb(x,-4.6,fx,fy-.6,4,i%2?shade(c1,-.25):c1);ell(fx+1.2,fy-.2,3.5,1.9,dk,0,1.3);if(!FL){g.strokeStyle=alpha('#e8d8c0',.9);g.lineWidth=.6;for(let q=-1;q<=1;q++){g.beginPath();g.moveTo(fx+3,fy-.2+q*.55);g.lineTo(fx+4.2,fy+q*.8);g.stroke()}}}
  // cuerpo largo y aerodinámico
  g.beginPath();g.moveTo(-11,-6.8-b);g.bezierCurveTo(-11,-13-b,-2,-14.6-b,5,-13.4-b);g.bezierCurveTo(12,-12.4-b,13,-5.6-b,7,-3.4-b);g.bezierCurveTo(0,-1.6-b,-11,-1.8-b,-11,-6.8-b);g.closePath();g.fillStyle=lg(0,-14,0,-2,shade(c1,.22),shade(c1,-.3),c1);g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  g.save();g.beginPath();g.moveTo(-11,-6.8-b);g.bezierCurveTo(-11,-13-b,-2,-14.6-b,5,-13.4-b);g.bezierCurveTo(12,-12.4-b,13,-5.6-b,7,-3.4-b);g.bezierCurveTo(0,-1.6-b,-11,-1.8-b,-11,-6.8-b);g.closePath();g.clip();g.fillStyle=K(c4);g.beginPath();g.ellipse(3,-3.6-b,10,3.2,0,0,TAU);g.fill();
  if(!FL){g.strokeStyle=alpha(dk,.35);g.lineWidth=.6;g.lineCap='round';for(let q=0;q<14;q++){const fx=-9+q*1.55,fy=-11+(q*37%7)*.5-b;g.beginPath();g.moveTo(fx,fy);g.lineTo(fx-1.2,fy+1.8);g.stroke()}g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=.9;g.beginPath();g.moveTo(-7,-11.4-b);g.quadraticCurveTo(-2,-13.4-b,4,-12.4-b);g.stroke()}g.restore();
  // cabeza ancha y redondeada
  ell(10.6,-9.6-b,6.8,5.6,c1,0,2);
  ell(7,-14.8-b,2,1.8,c1,0,1.4);ell(7,-14.6-b,.9,.8,'#d89a8a',0,0);ell(12.6,-15.2-b,2,1.8,shade(c1,.05),0,1.4);ell(12.6,-15-b,.9,.8,'#d89a8a',0,0);
  g.save();g.beginPath();g.ellipse(10.6,-9.6-b,6.8,5.6,0,0,TAU);g.clip();g.fillStyle=K(c4);g.beginPath();g.ellipse(14.8,-6.4-b,7,4.2,0,0,TAU);g.fill();g.fillStyle=K(alpha(c4,.8));g.beginPath();g.ellipse(11,-6.8-b,4.8,2.4,0,0,TAU);g.fill();g.restore();
  ell(15.8,-8.2-b,4.3,3.2,c4,0,1.5);
  g.beginPath();g.moveTo(17,-11.2-b);g.quadraticCurveTo(21.2,-11.4-b,20.8,-9.6-b);g.quadraticCurveTo(19.4,-8.2-b,17,-9.2-b);g.closePath();g.fillStyle=K('#1a1210');g.fill();g.lineWidth=.9;g.strokeStyle=OL;g.stroke();dot(18.2,-10.7-b,.55,'#fff');
  if(!FL){g.strokeStyle='#2a1a10';g.lineWidth=.8;g.lineCap='round';g.beginPath();g.moveTo(18.4,-8.6-b);g.lineTo(18.4,-7.6-b);g.moveTo(15.4,-6.4-b);g.quadraticCurveTo(17,-5.2-b,18.4,-7.6-b);g.stroke();
   g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=.6;for(let q=-1;q<=1;q++){g.beginPath();g.moveTo(17.6,-8-b);g.lineTo(23.4,-8.6+q*2.2-b);g.stroke();g.beginPath();g.moveTo(14.4,-7.6-b);g.lineTo(9.6,-5.2+q*1.8-b);g.stroke()}dot(11.6,-7.6-b,1.2,alpha('#ff9a8a',.35))}
  ell(12.6,-11.8-b,1.9,1.9,'#14100c',0,0);dot(13.2,-12.4-b,.7,'#fff');dot(12,-11.2-b,.3,'#fff');line(10.4,-13.8-b,14.2,-13.4-b,.9,dk);
  poly([[5.6,-5.4-b],[2.6,-7.4-b],[2.6,-3.4-b]],'#2f7bd8',1);poly([[7.6,-5.4-b],[10.6,-7.4-b],[10.6,-3.4-b]],'#3d95f0',1);ball(6.6,-5.4-b,1.1,'#1d5fb0',.9);
  const bx=13+bw*1.4,by=-25-b+Math.sin(t/300+p.ph)*1.6;
  if(atk<.1&&!FL){g.save();g.beginPath();g.arc(bx,by,4.2,0,TAU);g.fillStyle=alpha(c3,.3);g.fill();g.lineWidth=1.1;g.strokeStyle=alpha('#e6f8ff',.95);g.stroke();g.beginPath();g.arc(bx-1.3,by-1.4,1.1,0,TAU);g.fillStyle='rgba(255,255,255,.9)';g.fill();g.restore()}
  if(!FL)add(()=>{for(let i=0;i<4;i++){const u=((t/700+i/4+p.ph*.1)%1);glow(-9+i*6+Math.sin(i*3)*2,-9-b+u*10,1.8*(1-u)+.4,'#8fe0ff',.9*(1-u))}});
  if(atk>.1){const f=atk;add(()=>{glow(23,-9-b,16*f,c3,.8)});if(!FL){g.beginPath();g.arc(24,-9-b,2+5*(1-f)+2,0,TAU);g.fillStyle=alpha(c3,.4);g.fill();g.lineWidth=1.2;g.strokeStyle='#e6f8ff';g.stroke();g.beginPath();g.arc(22.6,-11-b,1.2,0,TAU);g.fillStyle='#fff';g.fill()}}}
  else if(p.k==='firefly'){ // luciérnaga del fundador
  const wf=Math.sin(t/45+p.ph)*.9,pu=.5+.5*Math.sin(t/260+p.ph);add(()=>{glow(0,-12-b,30,'#ffe27a',.35+pu*.25);glow(0,-12-b,14,'#fff6c8',.5)});
  for(const s of[-1,1]){g.save();g.translate(0,-14-b);g.rotate(s*(.9+wf*.35));g.beginPath();g.ellipse(s*7,-5,8,3.4,s*.5,0,TAU);g.fillStyle='rgba(220,250,255,.65)';g.fill();g.lineWidth=1.2;g.strokeStyle='rgba(60,90,100,.8)';g.stroke();g.restore()}
  g.beginPath();g.ellipse(0,-10-b,6.5,5,0,0,TAU);g.fillStyle=c1;g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  g.beginPath();g.ellipse(-5.5,-10-b,3.6,3.2,0,0,TAU);g.fillStyle=c2;g.fill();g.stroke();
  g.beginPath();g.arc(-9.4,-10.5-b,2.1,0,TAU);g.fillStyle=c2;g.fill();
  g.beginPath();g.arc(7.2,-10-b,3.1,0,TAU);g.fillStyle=c3;g.fill();
  add(()=>{glow(7.2,-10-b,13,'#ffe27a',.9)})}
  else if(p.k==='phoenix'){ // fénix del fundador
  const wf=Math.sin(t/60+p.ph)*.8,tl=Math.sin(t/190+p.ph)*.18;add(()=>{glow(0,-12-b,28,'#ffb04a',.4);glow(-6,-10-b,18,'#ff5a1a',.3)});
  for(let i=0;i<3;i++)feather(-8,-9-b,22-i*3,4.2-i*.4,PI+.55-i*.55+tl*(i+1)*.6,c2,i===1?c3:'#ffcf5a');
  for(const s of[-1,1]){g.save();g.translate(-1,-13-b);g.rotate(-.7-wf*s*.5+(s>0?0:.3));g.scale(1,s>0?1:.9);for(let i=0;i<6;i++){const a=PI*1.02+i*.2,ln=15+Math.min(i,3)*2.2-(i>3?(i-3)*3:0);feather(0,0,ln,3.2,a+(s>0?0:.05),s>0?shade(c2,-.1):shade(c2,-.4),i%2?c3:'#ff9a30')}g.restore()}
  g.beginPath();g.ellipse(0,-10-b,9.4,7.6,0,0,TAU);g.fillStyle=lg(-9,-17,9,-3,c3,c2,c1);g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
  scaleTex(0,-10-b,9,7.2,c1,3.4,1);g.fillStyle=K(alpha('#fff2b8',.9));g.beginPath();g.ellipse(2.4,-7.2-b,5.6,3.6,0,0,TAU);g.fill();scaleTex(2.4,-7.2-b,5.2,3.2,'#ffe27a',2.6,1);
  for(let i=0;i<4;i++)feather(1+i*1.6,-5.6-b,5.4,1.7,1.2+i*.2,'#ff9a30',c3);
  for(let i=0;i<4;i++){poly([[3+i*1.6,-15.6-b],[4.4+i*1.6,-19-b],[6+i*1.6,-15-b]],c1,.9)}
  ell(8.8,-16-b,5.7,5.2,c3,0,2);scaleTex(8.6,-16-b,5.2,4.6,c3,2.4,0);
  feather(6.2,-19.6-b,10,2,-2.1+tl,c2,c3);feather(8,-20.4-b,12,2.2,-1.6+tl*.6,c1,'#ffd84a');feather(10,-20.6-b,9,1.8,-1.1,c2,c3);
  poly([[12.8,-17.4-b],[19.6,-15.2-b],[12.6,-13.4-b]],'#ffd84a',1.3);poly([[12.8,-15.6-b],[18,-15-b],[12.6,-13.4-b]],'#e8901a',.8);
  eye(10,-17.2-b,1.9,'#e8641a');dot(6.6,-14-b,1.7,alpha('#ff7a3a',.4));
  for(let i=0;i<2;i++){limb(-2+i*3,-4-b,-2.6+i*3+Math.sin(t/200)*.8,.4+i*.6,1.8,'#c8581a');for(let q=-1;q<=1;q++)line(-2.6+i*3,.4+i*.6,-2.6+i*3+q*1.4+1,2.6+i*.6,.8,'#ffd84a')}
  add(()=>{for(let i=0;i<5;i++){const u=((t/800+i/5+p.ph*.1)%1);glow(-8-u*18+Math.sin(u*7+i)*3,-8-b-u*14+i%2*3,2.4*(1-u)+.4,i%2?'#ffd27a':'#ff7a2a',.9*(1-u))}});
  if(atk>.3){const fl=atk;add(()=>{glow(22,-14-b,16*fl,'#ff9a30',.9);flameShape(24,-14-b,9,16*fl,'#ff7a1a','#ffe27a',1)})}}
 else{ // dragoncito
  const wf=Math.sin(t/70+p.ph)*.75,mem='#e6832a',memd='#9a3d12',bel='#ffe8a0';
  for(const s of[-1,1]){g.save();g.translate(-2,-13-b);g.rotate(-.5-wf*s*.5+(s>0?0:.3));
   g.beginPath();g.moveTo(0,0);g.lineTo(-8,-19);g.quadraticCurveTo(-11,-12,-14,-14.4);g.quadraticCurveTo(-14,-8.4,-17,-4.6);g.quadraticCurveTo(-9,-4,0,0);g.closePath();g.fillStyle=lg(0,0,-16,-14,s>0?mem:shade(mem,-.3),s>0?memd:shade(memd,-.3));g.fill();g.lineWidth=1.8;g.strokeStyle=OL;g.lineJoin='round';g.stroke();
   if(!FL){g.strokeStyle=K(s>0?c2:shade(c2,-.3));g.lineWidth=1.4;g.lineCap='round';[[-8,-19],[-14,-14.4],[-17,-4.6]].forEach(([qx,qy])=>{g.beginPath();g.moveTo(0,0);g.lineTo(qx,qy);g.stroke()});g.strokeStyle=alpha('#ffe0a0',.35);g.lineWidth=.6;g.beginPath();g.moveTo(-3,-8);g.lineTo(-11,-9);g.stroke()}
   poly([[-8,-19],[-9.4,-23],[-6.4,-20.4]],'#f4efe0',.9);g.restore()}
  tailChain(-9,-9-b,-11,-4,-2+Math.sin(t/160)*3,5,2.5,3.5,c1);poly([[-21,-12.6],[-27,-17],[-21.6,-17.6],[-22.4,-8.2]],c3,1.3);
  for(let i=0;i<5;i++)poly([[-6+i*3.6,-16-b],[-4.2+i*3.6,-21.4-b+(i===0?1:0)],[-2.4+i*3.6,-15.6-b]],i%2?c3:shade(c3,.15),1);
  for(const lx of[-3,4]){limb(lx,-5-b,lx+(lx>0?1.6:-1),0,3.2,shade(c1,-.18));for(let q=0;q<3;q++)line(lx+(lx>0?1.6:-1)+1,-.2+q*.7-1,lx+(lx>0?1.6:-1)+3.6,.8+q*.5-1,.9,'#f4efe0')}
  ell(0,-10-b,9.8,8,c1,0,2);scaleTex(0,-10-b,9.4,7.6,c1,3.3,1);
  g.save();clipE(0,-10-b,9.6,7.8);g.fillStyle=K(bel);g.beginPath();g.ellipse(2.4,-6.2-b,6.4,4.2,0,0,TAU);g.fill();if(!FL){g.strokeStyle=alpha('#a8742a',.7);g.lineWidth=.8;for(let q=0;q<4;q++){g.beginPath();g.moveTo(-3,-9.6-b+q*2);g.quadraticCurveTo(2,-8-b+q*2,8,-9.6-b+q*2);g.stroke()}}g.restore();sheen(0,-10-b,9.6,7.8,.3);
  ell(9,-16-b,6.1,5.5,c1,0,2);scaleTex(8.6,-16-b,5.6,5,c1,2.7,1);ell(14.2,-14.6-b,3.9,3,shade(c1,.22),0,1.6);dot(15.6,-15.6-b,.55,'#1a3a14');dot(16.8,-15-b,.55,'#1a3a14');
  g.beginPath();g.moveTo(5.8,-20.4-b);g.quadraticCurveTo(2,-28-b,-1.6,-26.4-b);g.quadraticCurveTo(4,-24.6-b,7.6,-19.6-b);g.fillStyle=K(bel);g.fill();g.lineWidth=1.3;g.strokeStyle=OL;g.stroke();
  g.beginPath();g.moveTo(9,-20.8-b);g.quadraticCurveTo(8,-28-b,12.6,-28.6-b);g.quadraticCurveTo(10.6,-24.6-b,11.6,-20.4-b);g.fillStyle=K(bel);g.fill();g.stroke();
  poly([[5,-13.4-b],[2,-11-b],[6.6,-10.8-b]],c3,.9);
  eye(10.8,-17.4-b,1.9,'#ffd24a');if(!FL){g.strokeStyle='#14141c';g.lineWidth=.9;g.beginPath();g.moveTo(11.2,-18.9-b);g.lineTo(11.2,-16-b);g.stroke();g.lineWidth=1.2;g.beginPath();g.moveTo(8.4,-19.8-b);g.lineTo(13.2,-19-b);g.stroke()}
  if(!FL){g.fillStyle='#fff';for(let q=0;q<3;q++){g.beginPath();g.moveTo(14+q*1.5,-12.6-b);g.lineTo(14.7+q*1.5,-11.2-b);g.lineTo(15.4+q*1.5,-12.6-b);g.fill()}}
  if(atk>.3){const fl=atk;add(()=>{glow(22,-14-b,16*fl,'#ff9a30',.9);flameShape(24,-14-b,9,16*fl,'#ff7a1a','#ffe27a',1)})}
  else add(()=>{const u=(t/900+p.ph)%1;glow(18+u*6,-15-b-u*7,2.2+u*2,'#ffb070',.35*(1-u))})}
 g.restore();if(!p._icon){g.save();g.translate(p.x,p.y-((p.k==='mage'?52:p.k==='knight'?50:GOL[p.k]?54:(p.k==='dragon'||p.k==='phoenix'||p.k==='firefly')?46:36)*S+fly));petBar(p,0);g.restore()}};
const PIC=new Map();
A.petIcon=function(k,px,pad){px=px||44;pad=pad||1;const key=k+'|'+px+(pad!==1?'|'+pad:'');let u=PIC.get(key);if(u)return u;const sz=Math.round(px*2),cv=document.createElement('canvas');cv.width=cv.height=sz;const c=cv.getContext('2d');
 const sg=g,st=t,sth=th,sti=ti,sfl=FL;try{g=c;FL=false;t=900;const sc=sz/(GOL[k]?66:54)/pad;c.translate(sz/2,sz*.94);c.scale(sc,sc);const fly=(k==='dragon'||k==='phoenix'||k==='firefly')?12:0;
  const gr=c.createRadialGradient(0,-30,2,0,-30,34);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gr;c.fillRect(-40,-70,80,80);
  A.pet({k,x:0,y:fly?-fly+6:0,vx:0,vy:0,ph:0,face:1,sq:0,hp:1,max:1,lv:1,flash:0,atk:0,healT:0,inv:0,down:0,rst:0,_icon:1},null);u=cv.toDataURL()}catch(e){u=''}finally{g=sg;t=st;th=sth;ti=sti;FL=sfl}
 if(u)PIC.set(key,u);return u};
/* ====================== estados sobre enemigos ====================== */
const enemy0=A.enemy;
A.enemy=function(e,H){enemy0(e,H);if(e.spawn>t||e.dead)return;const cx=e.x,cy=e.y-(e.z||0),R=e.r;
 if(e.frzT>t){g.save();g.translate(cx,cy-R*.6);const k=clamp((e.frzT-t)/400,0,1);g.globalAlpha=.55*k+.2;ell(0,0,R*1.15,R*1.25,'#bff0ff',0,1.6);g.globalAlpha=.9;for(let i=0;i<4;i++){const a=i*1.57+.5;poly([[Math.cos(a)*R*.9,Math.sin(a)*R],[Math.cos(a)*R*1.3,Math.sin(a)*R*1.5-4],[Math.cos(a+.4)*R*.9,Math.sin(a+.4)*R]],'#e8fbff',1)}g.restore()}
 if(e.poiT>t){g.save();g.translate(cx,cy-R*.6);add(()=>glow(0,0,R*1.7,'#7be07b',.28));for(let i=0;i<4;i++){const ph=((t/800)+i*.25)%1;g.globalAlpha=1-ph;ball(Math.sin(i*2.3)*R*.7,-ph*R*1.6,2.4,'#9af09a',1)}g.restore()}
 if(e.burnT>t){g.save();g.translate(cx,cy);add(()=>glow(0,-R*.6,R*1.9,'#ff8a2a',.4));for(let i=0;i<3;i++)flameShape((i-1)*R*.6,-R*.3,R*.7,R*(1.1+Math.sin(t/70+i*2)*.3),'#ff7a1a','#ffe27a',i);g.restore()}
 if(e.shkT>t){g.save();g.translate(cx,cy-R*.6);g.strokeStyle='#fff6a0';g.lineWidth=1.8;g.lineCap='round';add(()=>glow(0,0,R*1.5,'#ffe45a',.35));for(let j=0;j<3;j++){g.beginPath();let a=Math.random()*TAU,x=Math.cos(a)*R*.4,y=Math.sin(a)*R*.4;g.moveTo(x,y);for(let k=0;k<4;k++){a+=(Math.random()-.5)*1.8;x+=Math.cos(a)*R*.5;y+=Math.sin(a)*R*.5;g.lineTo(x,y)}g.stroke()}g.restore()}};
/* ====================== rayos encadenados y ondas de impacto ====================== */
A.bolts=function(list){for(const b of list){const age=(t-b.t)/260;if(age>=1)continue;g.save();g.globalCompositeOperation='lighter';g.globalAlpha=1-age;g.lineCap='round';g.lineJoin='round';const dx=b.x2-b.x1,dy=b.y2-b.y1,d=Math.hypot(dx,dy)||1,n=7,nx=-dy/d,ny=dx/d,sd=Math.floor(t/45);
 g.beginPath();g.moveTo(b.x1,b.y1);for(let i=1;i<n;i++){const k=i/n,o=(hash(sd+i,i*7)%1000/1000-.5)*18;g.lineTo(b.x1+dx*k+nx*o,b.y1+dy*k+ny*o)}g.lineTo(b.x2,b.y2);
 g.strokeStyle='rgba(255,230,90,.55)';g.lineWidth=7;g.stroke();g.strokeStyle='#ffffff';g.lineWidth=2.2;g.stroke();glow(b.x2,b.y2,14,'#ffe45a',.9);g.restore()}};
A.rings=function(list){for(const r of list){const age=(t-r.t)/600;if(age>=1)continue;const R=r.R*eo(age);g.save();g.translate(r.x,r.y);g.scale(1,.55);g.globalAlpha=1-age;g.fillStyle=rg(0,0,R*.2,R,alpha(r.c,0),alpha(r.c,.5),alpha(r.c,.15));g.beginPath();g.arc(0,0,R,0,TAU);g.fill();g.strokeStyle='#ffffff';g.lineWidth=3*(1-age)+1;g.beginPath();g.arc(0,0,R,0,TAU);g.stroke();g.strokeStyle=r.c;g.lineWidth=6*(1-age);g.globalAlpha=(1-age)*.6;g.beginPath();g.arc(0,0,R*.82,0,TAU);g.stroke();g.restore()}};
/* ====================== forja del herrero ====================== */
A.forge=function(o){const tt=t,fl=.8+.2*Math.sin(tt/80);g.save();g.translate(o.x,o.y);shadow(0,6,40,10,.4);
 poly([[-32,-2],[32,-2],[27,-46],[-27,-46]],'#6a5a52',2);for(let i=0;i<3;i++)for(let j=0;j<4;j++)rect(-26+j*13+(i%2)*6,-42+i*13,12,11,i%2?'#7a6a62':'#5e4e48',1,1);
 rect(-20,-36,40,26,'#241010',2,3);add(()=>{glow(0,-22,46,'#ff7a1a',.6*fl)});for(let i=0;i<5;i++)flameShape(-14+i*7,-12,9,15+Math.sin(tt/70+i*2)*5,'#ff7a1a','#ffe27a',i);
 rect(-9,-66,18,22,'#564640',2,1);for(let i=0;i<3;i++){const ph=((tt/900)+i*.33)%1;g.globalAlpha=(1-ph)*.5;ball(Math.sin(tt/400+i)*4,-70-ph*26,4+ph*5,'#8a8a94',0);g.globalAlpha=1}
 // yunque
 poly([[-16,6],[16,6],[12,-2],[-12,-2]],'#444a5c',2);rect(-7,-12,14,11,'#565d72',2,1);
 g.beginPath();g.moveTo(-26,-14);g.lineTo(-16,-20);g.lineTo(18,-20);g.lineTo(15,-12);g.lineTo(8,-12);g.lineTo(-16,-13);g.closePath();g.fillStyle=lg(0,-20,0,-12,'#aab2c8','#565d72');g.fill();g.lineWidth=2;g.strokeStyle=OL;g.stroke();
 const hot=.5+.5*Math.sin(tt/500);add(()=>{glow(0,-21,16,'#ff8a2a',.35+.25*hot)});
 // martillo apoyado
 g.save();g.translate(24,2);g.rotate(-.35);rect(-2,-30,4,32,'#8a5a2b',1.6,1);rect(-8,-36,16,9,'#aab2c8',1.8,1.5);g.restore();
 if(Math.floor(tt/420)%3===0)for(let i=0;i<3;i++){const ph=(tt%420)/420;star(-4+i*6+ph*8,-24-ph*16,2.2*(1-ph),'#ffd070',tt/60+i)}
 g.font='900 11px Trebuchet MS,sans-serif';g.textAlign='center';g.lineWidth=3.4;g.strokeStyle='#000';const ty=-82+Math.sin(tt/380)*1.6;g.strokeText('🔨 Forja',0,ty);g.fillStyle='#ffe0b0';g.fillText('🔨 Forja',0,ty);g.restore()};
})();
