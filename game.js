/* Flight: catch Starship in the orbit and ride it out through the belt.
   The same hand-rolled 3D as the orbit scene: flat-shaded meshes lit from the left, a
   painter's sort, no libraries. The ship holds z=0 and the world streams toward it,
   so every speed below is relative to the ship. */
(function(){
var d=document,root=d.documentElement,rmQuery=matchMedia("(prefers-reduced-motion: reduce)"),rm=rmQuery.matches,
    coarse=matchMedia("(pointer: coarse)").matches;
function $(id){return d.getElementById(id)}
if(rmQuery.addEventListener)rmQuery.addEventListener("change",function(e){rm=e.matches});
var layer=$("flight"),cv=$("fcv"),x=cv.getContext("2d"),card=$("fcard"),
    scoreEl=$("fscore"),bestEl=$("fbest"),nameEl=$("fname"),barEl=$("fbar"),hullEl=$("fhull"),
    boostEl=$("fboostbar"),boostBtn=$("fboost");
var W=0,H=0,F=1,CX=0,CY=0,dpr=Math.min(devicePixelRatio||1,2),C={},K={},dark=false;
var on=false,raf=0,last=0,onExit=null,best=0,S=null,keys={},aim=null,firing=false,boostHeld=false,touchFrom=null,shown={};
try{best=+localStorage.getItem("flight-best")||0}catch(e){}

/* The destinations are the site's own pages, in page order, with their terrain colors. */
var worlds=[
  {n:"About",line:"A high lake, a few pines, and one cabin.",soil:[144,149,115],shade:[45,78,84],side:.14},
  {n:"Projects",line:"Two ridges, a dark basin, and a listening dish.",soil:[185,108,72],shade:[83,61,77],side:-.16},
  {n:"Experience",line:"A snowed-in valley, a frozen lake, and one lit tree.",soil:[190,200,212],shade:[64,78,108],side:.12},
  {n:"Skills",line:"A dry stand of uneven trees.",soil:[88,140,134],shade:[37,69,89],side:-.1},
  {n:"Contact",line:"One warm window. Come say hello.",soil:[158,125,151],shade:[61,65,103],side:.12,lamp:true}];
/* A run starts at the page after the one Starship left from (About from the home orbit), then
   keeps going in page order. S.first is that page; S.sector counts worlds reached. */
function here(){return(S.first+S.sector)%worlds.length}
function sectorLength(s){return 520+Math.min(s,10)*80}
function cruise(s){return 13+Math.min(s,8)*1.4}

/* helpers */
function mix(a,b,t){return a+(b-a)*t}
function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
/* Vectors, lit faces and the per-mesh face lists are scratch: nothing from them
   outlives the function that fills them. update() and render() each rewind the
   pools first, so a frame reuses the same arrays instead of allocating thousands
   of short ones for the garbage collector. A value that must survive (the light
   vector, a shard's color) is copied into its own array. */
var vecs=[],veci=0,facePool=[],facei=0,listPool=[],listi=0,worldBuf=[],screenBuf=[];
function v3(x,y,z){var v=vecs[veci];if(v){v[0]=x;v[1]=y;v[2]=z}else v=vecs[veci]=[x,y,z];veci++;return v}
function resetFrame(){veci=facei=listi=0}
function takeList(){var a=listPool[listi];if(!a)a=listPool[listi]=[];a.length=0;listi++;return a}
function takeFace(z,src,idx,col,i){var f=facePool[facei];if(!f)f=facePool[facei]={p:[]};
  var p=f.p,n=idx.length,k;p.length=n;for(k=0;k<n;k++)p[k]=src[idx[k]];
  f.z=z;f.c=col;f.i=i;facei++;return f}
function mixc(a,b,t){return v3(mix(a[0],b[0],t),mix(a[1],b[1],t),mix(a[2],b[2],t))}
function rgb(c){return "rgb("+clamp(c[0]|0,0,255)+","+clamp(c[1]|0,0,255)+","+clamp(c[2]|0,0,255)+")"}
function hexRGB(v){var h=String(v).replace(/[^0-9a-f]/gi,"");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return h.length===6?[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4),16)]:[128,128,128]}
function sub(a,b){return v3(a[0]-b[0],a[1]-b[1],a[2]-b[2])}
function cross(a,b){return v3(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function norm(a){var l=Math.hypot(a[0],a[1],a[2])||1;return v3(a[0]/l,a[1]/l,a[2]/l)}
function rand(a,b){return a+Math.random()*(b-a)}
function fmt(n){return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,",")}

function colors(){var s=getComputedStyle(root);
  ["bg","fg","dim","accent","hostile","ship-body","ship-shield","ship-edge"].forEach(function(k){C[k]=(s.getPropertyValue("--"+k)||"").trim()||"#888";K[k]=hexRGB(C[k])});
  C.flame=rgb(mixc(K.accent,[255,255,255],.55));
  dark=root.dataset.theme?root.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches}
if(typeof MutationObserver!=="undefined")new MutationObserver(function(){if(on)colors()}).observe(root,{attributes:true,attributeFilter:["data-theme"]});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){if(on)colors()});
/* Natural colors dim and cool at night, like the landscapes; the site's own tokens already switch. */
function lit(c){return dark?mixc(v3(c[0]*.62,c[1]*.62,c[2]*.62),[28,38,60],.22):c}
/* Distant things wash toward the page background, so they arrive out of the haze. */
function haze(c,z){return mixc(c,K.bg,clamp((z-34)/36,0,1))}

/* camera: fixed behind and above, far back with a long lens. The ship flies across a still
   world and can reach the edges of the page while the view stays on top of it; a close camera
   saw it side-on as soon as it left the middle. FOLLOW adds a touch of drift for life. */
var FOLLOW=.08,CAMY=2.2,CAMZ=-6,PITCH=.18;
var cam={x:0,y:CAMY,z:CAMZ,p:PITCH},cp=Math.cos(PITCH),spn=Math.sin(PITCH);
function chase(sx,sy){cam.x=sx*FOLLOW;cam.y=sy*FOLLOW+CAMY;cam.z=CAMZ;cam.p=PITCH;cp=Math.cos(PITCH);spn=Math.sin(PITCH)}
var OX=0,OY=0;
function project(X,Y,Z){var dx=X-cam.x,dy=Y-cam.y,dz=Z-cam.z,y=dy*cp+dz*spn,z=-dy*spn+dz*cp;
  return z<.12?null:v3(CX+OX+dx/z*F,CY+OY-y/z*F,z)}
/* The ship is drawn through its own camera, parked where the chase camera rests relative to it,
   then slid to where the ship really is. It keeps the same top-down look anywhere on the page;
   seen through the world camera it turned side-on near the edges. */
function shipView(fn){if(S.mode==="intro")return fn();
  var real=project(S.ship.x,S.ship.y,1),keep=[cam.x,cam.y];if(!real)return fn();
  cam.x=S.ship.x;cam.y=S.ship.y+CAMY;var seen=project(S.ship.x,S.ship.y,1);OX=real[0]-seen[0];OY=real[1]-seen[1];
  try{return fn()}finally{cam.x=keep[0];cam.y=keep[1];OX=OY=0}}
/* The intro runs in two calm steps instead of all at once. Still looking straight down, the
   view turns the short way from the orbit's heading until the nose points up; then the camera
   swings back into the chase view. INTRO is the whole of it. */
var INTRO=1.9,TURN_END=.8,SWING_START=.55;
function introTurn(){if(S.mode!=="intro"||rm)return 0;var a=S.heading+Math.PI/2;
  return Math.atan2(Math.sin(a),Math.cos(a))*(1-ease(S.modeT/TURN_END))}
function introSwing(){return S.mode==="intro"?ease((S.modeT-SWING_START)/(INTRO-SWING_START)):1}
function horizon(){return CY-F*Math.tan(cam.p)}
/* The lane the ship may fly in is measured from the screen: the middle of the ship can reach
   most of the page, clear of the score above and the route line below. B.kx and B.ky are
   how far the ship moves on screen per unit, which also turns the pointer into a lane position. */
var B={x0:-1.5,x1:1.5,y0:-.85,y1:.85,sx:0,sy:0,kx:1,ky:-1};
function measure(){
  function at(a,b){chase(a,b);return project(a,b,1)}
  var side=Math.max(80,W*.09),top=Math.max(110,H*.2),bottom=H-Math.max(130,H*.17);
  /* Tilt the camera until the resting ship sits about seven tenths down the page. */
  var lo=0,hi=.7;for(var i=0;i<24;i++){PITCH=(lo+hi)/2;if(at(0,0)[1]>H*.7)lo=PITCH;else hi=PITCH}
  var o=at(0,0);B.sx=o[0];B.sy=o[1];B.kx=at(1,0)[0]-o[0];B.ky=at(0,1)[1]-o[1];
  B.x1=clamp((W/2-side)/B.kx,.8,6);B.x0=-B.x1;
  B.y1=clamp((top-B.sy)/B.ky,.3,6);B.y0=-clamp((bottom-B.sy)/-B.ky,.2,3);
  chase(0,0)}
/* Wider screens get more rock, so the belt is as dense on a phone as on a monitor. */
function spread(){return clamp(Math.pow((B.x1-B.x0)*(B.y1-B.y0)/5.1,.6),.6,2)}

/* meshes: {v:vertices, f:faces}, faces wound so their normal points out */
function orient(m,ref){m.f=m.f.map(function(f){var a=m.v[f[0]],n=cross(sub(m.v[f[1]],a),sub(m.v[f[2]],a)),c=[0,0,0];
  f.forEach(function(k){c[0]+=m.v[k][0]/f.length;c[1]+=m.v[k][1]/f.length;c[2]+=m.v[k][2]/f.length});
  return dot(n,sub(c,ref(c)))<0?f.slice().reverse():f});return m}
function icosa(seed){var t=(1+Math.sqrt(5))/2,n=0;
  var v=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]];
  var f=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  v=v.map(function(p){var h=Math.sin(seed*91.7+(n++)*47.3)*43758.5,k=(.74+(h-Math.floor(h))*.46)/Math.hypot(p[0],p[1],p[2]);
    return[p[0]*k,p[1]*k*.86,p[2]*k]});
  return orient({v:v,f:f},function(){return[0,0,0]})}
var rockMeshes=[1,2,3,4,5,6].map(icosa);
/* Starship: a 40-sided stainless hull in eight barrel sections, a tangent-ogive nose, and four
   flaps on short chines. The windward side is covered in black hexagonal heat-shield tiles,
   like the real ship: the belly, past the flap hinge line on both sides, and the whole nose
   tip. The steel under them is the seam color, so the hex pattern shows between tiles.
   Proportions follow the real ship, about 6:1. Local axes: +z toward the nose, +y up, +x right. */
var SHIP_R=.16,NOSE=1.4,TIP=.62,SHIP_ROLL=-1.2;
function noseRadius(z){var t=clamp((z-NOSE)/TIP,0,1);return SHIP_R*Math.pow(1-Math.pow(t,1.8),.6)}
/* Tiles cover everything below this height on the hull (as sin of the angle), and the tip. */
var SHIELD_LINE=.24,TILED_TIP=NOSE+TIP*.82;
function windward(a,z){return Math.sin(a)<SHIELD_LINE||z>TILED_TIP}
function hullPoint(a,z,lift){var r=noseRadius(z)*(lift||1);return[Math.cos(a)*r,Math.sin(a)*r,z]}
function seeded(n){var h=Math.sin(n*127.1+311.7)*43758.5453;return h-Math.floor(h)}
var shipM=(function(){var v=[],f=[],tag=[],sec=[],N=40,i,k;
  var rings=[];for(k=0;k<8;k++)rings.push(NOSE*k/8);rings.push(NOSE);
  [.1,.2,.3,.4,.5,.6,.69,.77,.84,.9,.95,.985].forEach(function(t){rings.push(NOSE+t*TIP)});
  rings.forEach(function(z){for(i=0;i<N;i++)v.push(hullPoint((i+.5)/N*Math.PI*2,z))});
  var tip=v.length;v.push([0,0,NOSE+TIP]);
  for(k=0;k<rings.length-1;k++)for(i=0;i<N;i++){var j=(i+1)%N,mid=(i+1)/N*Math.PI*2;
    f.push([k*N+i,k*N+j,(k+1)*N+j,(k+1)*N+i]);tag.push(windward(mid,(rings[k]+rings[k+1])/2)?"under":"hull");sec.push(Math.min(k,8))}
  var end=(rings.length-1)*N;for(i=0;i<N;i++){f.push([end+i,end+(i+1)%N,tip]);tag.push("under");sec.push(8)}
  var cap=[];for(i=0;i<N;i++)cap.push(i);f.push(cap);tag.push("cap");sec.push(0);
  var m=orient({v:v,f:f},function(c){return[0,0,clamp(c[2],.3,1.6)]});
  m.tag=tag;m.sec=sec;return m}());
/* One hex tile per face, pointy along the ship, laid in staggered rings and lifted just off the
   hull. Each is shrunk a little so the seams read; a few run lighter, like replaced tiles. */
var tileM=(function(){var v=[],f=[],tone=[],rho=.021,inset=.84,row=0,z,c;
  for(z=rho;z<NOSE+TIP*.94;z+=rho*1.5,row++){var r=noseRadius(z);if(r<.02)break;
    var cols=Math.max(6,Math.round(Math.PI*2*r/(Math.sqrt(3)*rho))),da=Math.PI*2/cols;
    for(c=0;c<cols;c++){var a=(c+(row%2)*.5)*da;if(!windward(a,z))continue;
      var b=v.length,n=seeded(row*97+c);
      for(var k=0;k<6;k++){var th=Math.PI/2+k*Math.PI/3,dz=Math.sin(th)*rho*inset,zz=z+dz,rr=noseRadius(zz)||r;
        v.push(hullPoint(a+Math.cos(th)*rho*inset/rr,zz,1.012))}
      f.push([b,b+1,b+2,b+3,b+4,b+5]);tone.push(n<.03?1.45:.9+seeded(n*53)*.2)}}
  var m=orient({v:v,f:f},function(c){return[0,0,clamp(c[2],.3,1.6)]});m.tone=tone;return m}());
/* Flaps hinge on the shield line with a slight droop: two large aft, two small forward on the
   nose. Chines, thin strakes, run between them. Steel on top, tiled underneath. */
var flapM=(function(){var v=[],f=[],hinge=Math.asin(SHIELD_LINE)-.04;
  function fin(s,outline,droop){var b=v.length;
    outline.forEach(function(q){var r=noseRadius(q[1])*.985,x0=Math.cos(hinge)*r,y0=Math.sin(hinge)*r;
      v.push([s*(x0+q[0]),y0-q[0]*droop,q[1]])});
    f.push(outline.map(function(_,n){return b+n}))}
  [-1,1].forEach(function(s){
    fin(s,[[0,.02],[.1,.03],[.15,.08],[.16,.17],[.14,.28],[.09,.36],[0,.42]],.12);
    fin(s,[[0,.42],[.016,.44],[.016,1.24],[0,1.27]],.12);
    fin(s,[[0,NOSE+.04],[.06,NOSE+.07],[.09,NOSE+.13],[.085,NOSE+.21],[.05,NOSE+.27],[0,NOSE+.3]],.06)});
  var m=orient({v:v,f:f},function(c){return[0,c[1],c[2]]});m.two=m.f.map(function(){return true});return m}());
/* Six Raptors seen from behind: three sea-level engines in the middle, three wider vacuum
   bells around them. [angle, distance from the axis, bell radius, vacuum] */
var engines=[0,1,2].map(function(k){return[Math.PI/2+k*2.094,.047,.03,false]})
  .concat([0,1,2].map(function(k){return[Math.PI/6+k*2.094,.104,.047,true]}));
/* A lathed saucer: a tall glass canopy over a thin rim, big enough to seat a pilot. */
var saucerM=(function(){var N=20,prof=[[.2,.22],[.34,.1],[.66,.03],[.72,-.02],[.44,-.11]],v=[[0,.28,0]],f=[],tag=[],i,k;
  prof.forEach(function(q){for(i=0;i<N;i++){var a=i/N*Math.PI*2;v.push([Math.cos(a)*q[0],q[1],Math.sin(a)*q[0]])}});
  var bottom=v.length;v.push([0,-.14,0]);
  for(i=0;i<N;i++){f.push([0,1+i,1+(i+1)%N]);tag.push("glass")}
  for(k=0;k<prof.length-1;k++)for(i=0;i<N;i++){var a=1+k*N,b=a+N,j=(i+1)%N;f.push([a+i,a+j,b+j,b+i]);tag.push(k<1?"glass":"hull")}
  var lastRing=1+(prof.length-1)*N;for(i=0;i<N;i++)f.push([lastRing+i,lastRing+(i+1)%N,bottom]),tag.push("hull");
  var m=orient({v:v,f:f},function(){return[0,0,0]});m.tag=tag;return m}());
var cellM=orient({v:[[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]],
  f:[[0,2,4],[0,4,3],[0,3,5],[0,5,2],[1,4,2],[1,3,4],[1,5,3],[1,2,5]]},function(){return[0,0,0]});

var light=norm(v3(-.6,.72,-.36));light=[light[0],light[1],light[2]];
function placer(o){var a=Math.cos(o.rz||0),b=Math.sin(o.rz||0),c=Math.cos(o.rx||0),e=Math.sin(o.rx||0),
    g=Math.cos(o.ry||0),h=Math.sin(o.ry||0),s=o.s||1;
  return function(p){var X=p[0]*a-p[1]*b,Y=p[0]*b+p[1]*a,Z=p[2],t=Y*c-Z*e;Z=Y*e+Z*c;Y=t;t=X*g+Z*h;Z=-X*h+Z*g;X=t;
    return v3(X*s+o.x,Y*s+o.y,Z*s+o.z)}}
/* Project, cull, light and fog one mesh; returns its faces for a local depth sort.
   shine adds a soft specular band, which is what makes brushed steel read as steel. */
function faces(m,o,paint,shine){
  var put=placer(o),n=m.v.length,w=worldBuf,s=screenBuf,i;
  w.length=n;s.length=n;
  for(i=0;i<n;i++){w[i]=put(m.v[i]);s[i]=project(w[i][0],w[i][1],w[i][2])}
  var out=takeList();
  for(i=0;i<m.f.length;i++){var f=m.f[i],k,ok=true;for(k=0;k<f.length;k++)if(!s[f[k]]){ok=false;break}if(!ok)continue;
    var A=w[f[0]],fn=norm(cross(sub(w[f[1]],A),sub(w[f[2]],A))),c=v3(0,0,0),z=0;
    for(k=0;k<f.length;k++){c[0]+=w[f[k]][0];c[1]+=w[f[k]][1];c[2]+=w[f[k]][2];z+=s[f[k]][2]}
    var inv=1/f.length;c[0]*=inv;c[1]*=inv;c[2]*=inv;
    var eye=v3(cam.x-c[0],cam.y-c[1],cam.z-c[2]);
    if(dot(fn,eye)<=0){if(!m.two||!m.two[i])continue;fn[0]=-fn[0];fn[1]=-fn[1];fn[2]=-fn[2]}
    var base=paint(i,fn),shade=.38+.72*Math.max(0,dot(fn,light)),col=v3(base[0]*shade,base[1]*shade,base[2]*shade);
    if(shine){var el=Math.hypot(eye[0],eye[1],eye[2]),half=norm(v3(light[0]+eye[0]/el,light[1]+eye[1]/el,light[2]+eye[2]/el));
      col=mixc(col,[255,255,255],shine*Math.pow(Math.max(0,dot(fn,half)),18))}
    out.push(takeFace(z*inv,s,f,rgb(haze(col,c[2])),i))}
  return out}
function path(pts){x.beginPath();pts.forEach(function(q,i){if(i)x.lineTo(q[0],q[1]);else x.moveTo(q[0],q[1])});x.closePath()}
/* bare skips the hairline stroke that hides seams between faces, so tile gaps stay open */
function fill(list,alpha,bare){list.sort(function(a,b){return b.z-a.z});x.globalAlpha=alpha==null?1:alpha;x.lineWidth=.6;x.lineJoin="round";
  list.forEach(function(f){x.fillStyle=x.strokeStyle=f.c;path(f.p);x.fill();if(!bare)x.stroke()});x.globalAlpha=1}

/* state */
function fresh(){return{mode:"intro",t:0,modeT:0,score:0,hull:3,boost:1,boosting:false,sector:0,first:0,dist:0,speed:4,heading:-Math.PI/2,
  ship:{x:0,y:0,vx:0,vy:0,alive:true},rocks:[],aliens:[],shots:[],bolts:[],rings:[],cells:[],shards:[],bursts:[],embers:[],
  gap:{rock:30,alien:60,ring:70,cell:260},cool:0,hurt:0,shake:0,hitstop:0,flyby:null,toured:false,landed:-1}}
var stars=[];for(var i=0;i<(coarse?140:210);i++)stars.push({x:rand(-34,34),y:rand(-22,22),z:rand(2,92)});

function rock(big,px,py,pz){var r=big?rand(.55,.82):rand(.24,.38);
  return{x:px,y:py,z:pz,r:r,big:big,hp:big?3:1,m:rockMeshes[Math.random()*6|0],rx:rand(0,6),ry:rand(0,6),rz:rand(0,6),
    wx:rand(-1.4,1.4),wy:rand(-1.4,1.4),wz:rand(-.8,.8),vx:rand(-.12,.12),vy:rand(-.08,.08),tint:rand(-10,10),flash:0}}
function spawn(dt){
  var g=S.gap,s=S.sector,v=S.speed*dt,area=spread();
  if((g.rock-=v)<=0){g.rock=Math.max(4,11-s*1.1)*rand(.6,1.4)/area;
    var aimed=Math.random()<.35,px=aimed?S.ship.x+rand(-.4,.4):rand(B.x0*1.15,B.x1*1.15),py=aimed?S.ship.y+rand(-.3,.3):rand(B.y0*1.15,B.y1*1.15);
    if(S.rocks.length<22+area*8)S.rocks.push(rock(Math.random()<.3+Math.min(s,5)*.04,px,py,rand(66,76)))}
  if(s>=1&&(g.alien-=v)<=0){g.alien=Math.max(55,120-s*12)*rand(.7,1.3);
    if(S.aliens.length<2+Math.floor(s/2))S.aliens.push({x:rand(B.x0*.8,B.x1*.8),y:rand(B.y0*.4,B.y1*.8),z:74,bx:0,by:0,hold:rand(11,17),
      state:"in",t:0,ph:rand(0,6),spin:0,fire:rand(1.4,2.4),hp:s>=3?2:1,flash:0,r:.7,s:1.1,blink:rand(1,4)})}
  if((g.ring-=v)<=0){g.ring=rand(70,120);S.rings.push({x:rand(B.x0*.75,B.x1*.75),y:rand(B.y0*.7,B.y1*.7),z:74,r:.62,hit:-1,missed:false})}
  if(S.hull<3&&(g.cell-=v)<=0){g.cell=rand(240,340);S.cells.push({x:rand(B.x0*.6,B.x1*.6),y:rand(B.y0*.5,B.y1*.5),z:74,ry:0,s:.16})}}
/* Short-lived entities go back to a free list instead of becoming garbage.
   Colors are copied off the scratch pool, which rewinds at the next frame. */
var spare={shard:[],bolt:[],shot:[],ember:[],burst:[]};
function take(kind){return spare[kind].pop()||{}}
function retain(list,keep,bin){var n=0,i,o;for(i=0;i<list.length;i++){o=list[i];if(keep(o))list[n++]=o;else if(bin)bin.push(o)}list.length=n}
function rockLive(o){return!o.dead&&o.z>-o.r}
function boltLive(b){return b.z<80&&!b.done}
function alienLive(a){return!a.dead&&a.z<82}
function shotLive(o){return!o.dead&&o.z>-1}
function aheadLive(o){return o.z>-1}
function cellLive(o){return!o.dead&&o.z>-1}
function shardLive(p){return p.life<p.max}
function burstLive(b){return b.t<.45}
function emberLive(p){return p.life<p.max&&p.z>cam.z+.4}
function puff(p,r,accent){var b=take("burst");b.x=p.x;b.y=p.y;b.z=p.z;b.t=0;b.r=r;b.accent=!!accent;S.bursts.push(b)}
function burst(p,count,col,power){var c0=col[0],c1=col[1],c2=col[2];
  for(var i=0;i<count;i++){var a=rand(0,6.283),b=rand(-1,1),sp=rand(.6,1.6)*power,rad=Math.sqrt(1-b*b),sh=take("shard");
    sh.x=p.x;sh.y=p.y;sh.z=p.z;sh.vx=Math.cos(a)*rad*sp;sh.vy=b*sp;sh.vz=Math.sin(a)*rad*sp;
    sh.life=0;sh.max=rand(.5,1.1);sh.s=rand(.05,.13)*(power>2?1.3:1);sh.rot=rand(0,6);
    if(!sh.c)sh.c=[0,0,0];sh.c[0]=c0;sh.c[1]=c1;sh.c[2]=c2;S.shards.push(sh)}
  puff(p,power*.35,false)}
/* A hull hit holds four drawn frames; breaking a rock holds two. Rendering
   still runs, so the shake stays on the impact. Reduced motion skips it. */
var HIT_HULL=4,HIT_BREAK=2;
function hitstop(frames){if(rm)return;S.hitstop=Math.max(S.hitstop,frames)}
/* The ship is a capsule along its own length; things hit it inside that radius. */
var SHIP_REACH=.15;
function touches(o,r){var z=clamp(o.z,.1,1.9);return Math.hypot(o.x-S.ship.x,o.y-S.ship.y,o.z-z)<r+SHIP_REACH}
/* Anything whose path crosses the ship's own is marked, so depth is never a guess. */
function threat(o){return o.z>3&&o.z<46&&Math.hypot(o.x-S.ship.x,o.y-S.ship.y)<o.r*.82+SHIP_REACH+.1}
function saveBest(){if(S.score>best){best=Math.round(S.score);try{localStorage.setItem("flight-best",best)}catch(e){}}}
function hurt(){if(S.hurt>0||S.mode!=="play"||S.god)return;
  S.hull--;S.hurt=1.4;S.shake=rm?0:.35;hitstop(HIT_HULL);burst({x:S.ship.x,y:S.ship.y,z:.6},8,K["ship-body"],1.4);
  if(S.hull<=0){S.ship.alive=false;burst({x:S.ship.x,y:S.ship.y,z:1},26,K["ship-body"],3);burst({x:S.ship.x,y:S.ship.y,z:.4},14,K["ship-shield"],2.4);
    saveBest();setMode("over")}}

function setMode(m){S.mode=m;S.modeT=0;firing=false;if(m!=="play")showCard();else hideCard()}
function launch(){if(S.mode==="ready"){setMode("play")}else if(S.mode==="over"){var keep=S.heading,first=S.first;S=fresh();S.heading=keep;S.first=first;S.mode="play";S.speed=8;hideCard();hud(true)}}
function next(){if(S.mode!=="arrive")return;
  S.flyby={w:worlds[here()],t:0};if(S.sector===worlds.length-1)S.toured=true;S.sector++;S.dist=0;S.landed=-1;setMode("play")}
function land(){if(S.mode==="arrive")close(here())}

function steer(dt){
  var sh=S.ship,tvx=0,tvy=0,reach=Math.max(B.x1,B.y1);
  var ax=(keys.arrowright||keys.d?1:0)-(keys.arrowleft||keys.a?1:0),ay=(keys.arrowup||keys.w?1:0)-(keys.arrowdown||keys.s?1:0);
  /* Keys cross the lane in about a second and a half whatever its size. */
  if(ax||ay){aim=null;tvx=ax*Math.max(2.5,B.x1*1.35);tvy=ay*Math.max(2,B.y1*1.5)}
  else if(aim){var top=Math.max(3.2,reach*2);tvx=clamp((aim[0]-sh.x)*6,-top,top);tvy=clamp((aim[1]-sh.y)*6,-top,top)}
  var k=1-Math.exp(-dt*7);sh.vx+=(tvx-sh.vx)*k;sh.vy+=(tvy-sh.vy)*k;
  sh.x=clamp(sh.x+sh.vx*dt,B.x0,B.x1);sh.y=clamp(sh.y+sh.vy*dt,B.y0,B.y1);
  if(sh.x<=B.x0||sh.x>=B.x1)sh.vx*=.5;if(sh.y<=B.y0||sh.y>=B.y1)sh.vy*=.5}

function update(dt){
  resetFrame();
  S.t+=dt;S.modeT+=dt;
  var play=S.mode==="play";
  if(S.mode==="intro"&&S.modeT>=INTRO)setMode("ready");
  S.boosting=play&&(keys.shift||boostHeld)&&S.boost>.02;
  S.boost=S.boosting?Math.max(0,S.boost-dt*.32):Math.min(1,S.boost+dt*.06);
  var target=S.mode==="play"?cruise(S.sector)*(S.boosting?1.75:1):S.mode==="arrive"?cruise(S.sector)*.55:S.mode==="over"?5:4;
  S.speed+=(target-S.speed)*(1-Math.exp(-dt*2.4));
  var v=S.speed;
  if(S.ship.alive&&S.mode!=="intro")steer(dt);
  /* camera: a top-down drop onto the ship, as if the orbit zoomed in, then a swing to the chase view */
  var sh=S.ship,e=introSwing();
  chase(sh.x,sh.y);
  if(e<1){cam.x=mix(sh.x,cam.x,e);cam.y=mix(sh.y+4.6,cam.y,e);cam.z=mix(1,CAMZ,e);cam.p=mix(Math.PI/2-.001,PITCH,Math.pow(e,.8));
    cp=Math.cos(cam.p);spn=Math.sin(cam.p)}
  stars.forEach(function(s){s.z-=v*dt;if(s.z<1){s.z+=90;s.x=rand(-34,34);s.y=rand(-22,22)}});
  if(play){S.dist+=v*dt;S.score+=v*dt*(S.boosting?1.5:1);spawn(dt);
    if(S.dist>=sectorLength(S.sector)){var bonus=500+S.hull*150+S.sector*100;S.score+=bonus;S.bonus=bonus;setMode("arrive")}}
  if(S.flyby&&(S.flyby.t+=dt)>1.6)S.flyby=null;
  S.hurt=Math.max(0,S.hurt-dt);S.shake=Math.max(0,S.shake-dt);
  /* lasers */
  S.cool-=dt;
  if(play&&firing&&S.ship.alive&&S.cool<=0){S.cool=.13;S.side=-(S.side||1);var b=take("bolt");
    b.x=sh.x+S.side*.08;b.y=sh.y+.03;b.z=2.05;b.pz=2.05;b.done=false;S.bolts.push(b)}
  S.bolts.forEach(function(b){b.pz=b.z;b.z+=70*dt});
  retain(S.bolts,boltLive,spare.bolt);
  function struck(o,r){for(var i=0;i<S.bolts.length;i++){var b=S.bolts[i];
    if(!b.done&&Math.hypot(b.x-o.x,b.y-o.y)<r&&o.z+r>b.pz&&o.z-r<b.z+v*dt){b.done=true;return true}}return false}
  /* rocks */
  S.rocks.forEach(function(o){o.z-=v*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.rx+=o.wx*dt;o.ry+=o.wy*dt;o.rz+=o.wz*dt;o.flash=Math.max(0,o.flash-dt);
    if(struck(o,o.r*1.1)){o.hp--;o.flash=.09;
      if(o.hp<=0){o.dead=true;S.score+=o.big?80:40;hitstop(HIT_BREAK);burst(o,o.big?14:8,v3(128+o.tint,126+o.tint,124),o.big?2.2:1.4);
        if(o.big)[-1,1].forEach(function(s){var c=rock(false,o.x+s*.2,o.y,o.z);c.vx=s*rand(.5,.9);c.vy=rand(-.3,.3);S.rocks.push(c)})}}
    if(!o.dead&&S.ship.alive&&touches(o,o.r*.82)){hurt();if(S.mode==="play"||S.mode==="over"){o.dead=true;burst(o,10,[128,126,124],1.8)}}});
  retain(S.rocks,rockLive);
  /* drones: fly in, hold station ahead, weave and fire, then peel away */
  S.aliens.forEach(function(a){a.t+=dt;a.spin+=dt*1.6;a.flash=Math.max(0,a.flash-dt);if((a.blink-=dt)<-.14)a.blink=rand(1.5,4.5);
    if(a.state==="in"){a.z=Math.max(a.hold,a.z-(v+10)*dt);if(!a.bx){a.bx=a.x;a.by=a.y}if(a.z<=a.hold){a.state="hold";a.t=0}}
    else if(a.state==="hold"){a.x=clamp(a.bx+Math.sin(a.t*1.2+a.ph)*.8,B.x0*1.2,B.x1*1.2);a.y=a.by+Math.sin(a.t*.8+a.ph)*.3;
      if(S.mode==="play"&&(a.fire-=dt)<=0){a.fire=Math.max(.9,2.2-S.sector*.15)*rand(.8,1.3);
        var to=norm(v3(sh.x-a.x,sh.y-a.y,1-a.z)),speed=15+S.sector,s=take("shot");
        s.x=a.x;s.y=a.y-.05;s.z=a.z;s.vx=to[0]*speed;s.vy=to[1]*speed;s.vz=to[2]*speed;s.dead=false;S.shots.push(s)}
      if(a.t>9||S.mode!=="play")a.state="out"}
    else{a.z+=18*dt;a.y+=dt*.4}
    if(struck(a,a.r)){a.hp--;a.flash=.1;if(a.hp<=0){a.dead=true;S.score+=150;burst(a,16,lit([112,122,134]),2.4)}}
    if(!a.dead&&S.ship.alive&&touches(a,a.r*.75))hurt()});
  retain(S.aliens,alienLive);
  S.shots.forEach(function(o){o.x+=o.vx*dt;o.y+=o.vy*dt;o.z+=o.vz*dt;if(S.ship.alive&&touches(o,.1)){o.dead=true;hurt()}});
  retain(S.shots,shotLive,spare.shot);
  /* rings refill boost; cells repair the hull */
  S.rings.forEach(function(o){var pz=o.z;o.z-=v*dt;
    if(pz>1&&o.z<=1&&o.hit<0&&S.ship.alive){if(Math.hypot(sh.x-o.x,sh.y-o.y)<o.r-.08){o.hit=S.t;S.score+=50;S.boost=Math.min(1,S.boost+.4)}else o.missed=true}});
  retain(S.rings,aheadLive);
  S.cells.forEach(function(o){o.z-=v*dt;o.ry+=dt*2.2;if(S.ship.alive&&touches(o,.28)){o.dead=true;if(S.hull<3)S.hull++;else S.score+=100;puff(o,.5,true)}});
  retain(S.cells,cellLive);
  S.shards.forEach(function(p){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=(p.vz-v*.6)*dt;p.rot+=dt*6});
  retain(S.shards,shardLive,spare.shard);
  S.bursts.forEach(function(b){b.t+=dt;b.z-=v*.6*dt});
  retain(S.bursts,burstLive,spare.burst);
  /* sparks shed from the plume while boosting */
  if(!rm&&S.boosting&&S.ship.alive)for(var n=0;n<2;n++){var en=engines[Math.random()*6|0],p=take("ember");
    p.x=sh.x+Math.cos(en[0])*en[1];p.y=sh.y+Math.sin(en[0])*en[1];p.z=-.3;p.vx=rand(-.6,.6);p.vy=rand(-.6,.3);p.vz=-rand(2,4);p.life=0;p.max=rand(.25,.5);S.embers.push(p)}
  S.embers.forEach(function(p){p.life+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt});
  retain(S.embers,emberLive,spare.ember);
  hud()}

/* drawing */
function drawStars(){x.fillStyle=x.strokeStyle=C.dim;x.lineWidth=1;
  var streak=!rm&&S.speed>9?(S.speed-9)*.012:0;
  stars.forEach(function(s){var p=project(s.x,s.y,s.z);if(!p)return;
    x.globalAlpha=clamp((92-s.z)/22,0,1)*(s.z<25?.9:.55);
    if(streak){var q=project(s.x,s.y,s.z+S.speed*streak);if(q){x.beginPath();x.moveTo(p[0],p[1]);x.lineTo(q[0],q[1]);x.stroke()}}
    var size=s.z<18?1.8:1.1;x.fillRect(p[0]-size/2,p[1]-size/2,size,size)});x.globalAlpha=1}
function planet(w,px,py,r){if(r<.5)return;var lo=lit(w.soil),sh=lit(w.shade);
  x.save();x.beginPath();x.arc(px,py,r,0,6.2832);x.fillStyle=rgb(sh);x.fill();x.clip();
  x.fillStyle=rgb(lo);x.beginPath();x.arc(px-r*.34,py-r*.26,r*1.02,0,6.2832);x.fill();
  if(r>16){x.fillStyle=rgb(mixc(lo,sh,.35));[[-.45,-.2,.16],[.05,.28,.11],[-.15,-.55,.08],[.35,-.1,.12]].forEach(function(c){
      x.beginPath();x.ellipse(px+c[0]*r,py+c[1]*r,c[2]*r,c[2]*r*.7,0,0,6.2832);x.fill()})}
  if(w.lamp&&r>34){x.fillStyle="rgb(255,196,122)";x.beginPath();x.arc(px+r*.46,py+r*.38,Math.max(1.4,r*.018),0,6.2832);x.fill()}
  x.restore()}
function drawBackdrop(){var hz=horizon(),m=Math.min(W,H),e=introSwing();
  x.globalAlpha=e;
  /* the site's accent sun, far off to the left where the light comes from */
  x.fillStyle=C.accent;x.beginPath();x.arc(CX-W*.3-cam.x*4,hz+m*.04,Math.max(5,m*.011),0,6.2832);x.fill();
  var w=worlds[here()],prog=clamp(S.dist/sectorLength(S.sector),0,1),r=mix(m*.018,m*.15,Math.pow(prog,2.2));
  if(S.mode==="arrive")r=mix(m*.15,m*.34,ease(S.modeT/1.8));
  var drift=S.flyby?ease(S.flyby.t/1.4):1;
  planet(w,CX+w.side*W-cam.x*6,hz-m*.05-r*.25,r*drift);
  if(S.flyby){var f=S.flyby,u=ease(f.t/1.5),rr=m*.34*(1+u*2.2);planet(f.w,CX+f.w.side*W,hz-m*.05-m*.085+u*H*1.1+rr*.2,rr)}
  x.globalAlpha=1}
/* The lane: two faint rails on the ship's own altitude, with ticks that stream past. Every rock
   and drone drops a stem to this plane, so anything level with you has almost no stem. */
function drawLane(){if(!S.ship.alive||S.mode==="intro")return;var sh=S.ship,y=sh.y,hw=.42,far=46;
  x.lineWidth=1;x.strokeStyle=C.dim;
  for(var z=2.4;z<far;z+=3.6){var z2=Math.min(far,z+3.6),a=project(sh.x-hw,y,z),b=project(sh.x-hw,y,z2),c=project(sh.x+hw,y,z),d_=project(sh.x+hw,y,z2);
    if(!a||!b||!c||!d_)continue;x.globalAlpha=.3*(1-z/far);
    x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.moveTo(c[0],c[1]);x.lineTo(d_[0],d_[1]);x.stroke()}
  var step=6,offset=S.dist%step;
  for(var t=step-offset;t<far;t+=step){if(t<2.4)continue;var l=project(sh.x-hw,y,t),r=project(sh.x+hw,y,t);if(!l||!r)continue;
    x.globalAlpha=.22*(1-t/far);x.beginPath();x.moveTo(l[0],l[1]);x.lineTo(r[0],r[1]);x.stroke()}
  x.globalAlpha=1}
function stem(items,o,c,danger){if(o.z>46||o.z<4||S.mode==="intro"||!S.ship.alive)return;
  var foot=project(o.x,S.ship.y,o.z),edge=project(o.x+o.r,S.ship.y,o.z);if(!foot||!edge)return;
  var fade=clamp((46-o.z)/14,0,1)*clamp((o.z-4)/4,0,1),rx=Math.min(60,Math.abs(edge[0]-foot[0])*.8);
  items.push({z:c[2]+.02,draw:function(){x.globalAlpha=fade*(danger?.85:.4);x.strokeStyle=danger?C.hostile:C.dim;x.lineWidth=danger?1.4:1;
    x.beginPath();x.moveTo(c[0],c[1]);x.lineTo(foot[0],foot[1]);x.stroke();
    x.beginPath();x.ellipse(foot[0],foot[1],Math.max(2,rx),Math.max(1,rx*.28),0,0,6.2832);x.stroke();x.globalAlpha=1}})}
/* Red corner brackets around anything on a collision course; they pulse as it closes. */
function brackets(c,r){var k=clamp(r*1.25,8,90),a=k*.45;
  x.strokeStyle=C.hostile;x.lineWidth=1.6;x.globalAlpha=.65+.35*Math.sin(S.t*14);x.beginPath();
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(function(s){x.moveTo(c[0]+s[0]*k,c[1]+s[1]*(k-a));x.lineTo(c[0]+s[0]*k,c[1]+s[1]*k);x.lineTo(c[0]+s[0]*(k-a),c[1]+s[1]*k)});
  x.stroke();x.globalAlpha=1}

/* Wavy, flickering plumes: each engine's flame is sampled along its axis, bent by a travelling
   wave and a little noise, and drawn in three layers so the six merge into one fire. */
function plumes(o,power){var put=placer(o),out=[],T=S.t;if(power<=0)return out;
  engines.forEach(function(e,n){var seed=n*1.7,len=(e[3]?.6:.5)*power*(rm?1:1+(Math.random()-.5)*.14+Math.sin(T*23+seed)*.05),pts=[];
    for(var i=0;i<=8;i++){var t=i/8,spreadOut=1+t*.35,r=e[2]*(e[3]?.78:.7)*(1+t*(e[3]?.7:.35))*(1-Math.pow(t,2.2));
      var p=put([Math.cos(e[0])*e[1]*spreadOut,Math.sin(e[0])*e[1]*spreadOut,-.035-t*len]),q=project(p[0],p[1],p[2]);if(!q)return;
      q.push(r/q[2]*F,t);pts.push(q)}
    for(i=0;i<pts.length;i++){var a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;
      pts[i].nx=-dy/l;pts[i].ny=dx/l;
      var t_=pts[i][4],wave=rm?0:Math.sin(t_*5.5-T*17+seed)*pts[i][3]*.3*t_,wob=rm?1:1+.1*Math.sin(t_*9-T*31+seed*3)+(Math.random()-.5)*.1*t_;
      pts[i][0]+=pts[i].nx*wave;pts[i][1]+=pts[i].ny*wave;pts[i][3]*=wob}
    out.push({pts:pts,vac:e[3]})});
  return out}
function flameLayer(p,width,length,color){var n=Math.max(2,Math.round((p.pts.length-1)*length)),L=[],R=[];
  for(var i=0;i<=n;i++){var q=p.pts[i],w=q[3]*width*(i===n?0:1);L.push([q[0]+q.nx*w,q[1]+q.ny*w]);R.push([q[0]-q.nx*w,q[1]-q.ny*w])}
  var ring=L.concat(R.reverse());x.fillStyle=color;x.beginPath();x.moveTo(ring[0][0],ring[0][1]);
  for(i=1;i<ring.length;i++){var m0=ring[i],m1=ring[(i+1)%ring.length];x.quadraticCurveTo(m0[0],m0[1],(m0[0]+m1[0])/2,(m0[1]+m1[1])/2)}
  x.closePath();x.fill()}
function drawEngines(o){var put=placer(o);
  /* skirt rim, then each bell: a lit metal lip, a dark throat, and a glow when it burns */
  var rim=[];for(var i=0;i<40;i++){var a=i/40*6.2832,p=put([Math.cos(a)*SHIP_R,Math.sin(a)*SHIP_R,0]),q=project(p[0],p[1],p[2]);if(!q)return;rim.push(q)}
  x.strokeStyle=C["ship-edge"];x.globalAlpha=.55;x.lineWidth=1;path(rim);x.stroke();x.globalAlpha=1;
  engines.forEach(function(e){function circle(r,z){var pts=[];for(var k=0;k<16;k++){var a=k/16*6.2832,
      p=put([Math.cos(e[0])*e[1]+Math.cos(a)*r,Math.sin(e[0])*e[1]+Math.sin(a)*r,z]),q=project(p[0],p[1],p[2]);if(!q)return null;pts.push(q)}return pts}
    var lip=circle(e[2],-.035),bell=circle(e[2]*.78,-.03),throat=circle(e[2]*.34,0);if(!lip||!bell||!throat)return;
    x.fillStyle=rgb(mixc(K["ship-body"],K["ship-shield"],.35));path(lip);x.fill();
    x.fillStyle=rgb(mixc(K["ship-shield"],[0,0,0],.45));path(bell);x.fill();
    x.fillStyle=S.mode==="intro"?C["ship-shield"]:C.flame;path(throat);x.fill()})}
function drawShip(items){var sh=S.ship;if(!sh.alive)return;
  /* Starship flies rolled onto its side, belly and heat shield turned toward the camera, the way
     it shows its black-and-steel profile. It banks further into a turn and yaws the nose slightly. */
  var turn=rm?0:sh.vx/Math.max(1,B.x1),o={x:sh.x,y:sh.y,z:0,rz:SHIP_ROLL-clamp(turn*.45,-.5,.5),ry:turn*.08};
  var body=K["ship-body"],tile=mixc(K["ship-shield"],[8,9,11],.62),seam=mixc(tile,body,.32),aft=mixc(K["ship-shield"],[0,0,0],.25);
  tile=[tile[0],tile[1],tile[2]];seam=[seam[0],seam[1],seam[2]];
  /* barrel sections differ a touch in tone, as the real rings of steel do */
  var rings=[0,.05,-.02,.04,.01,-.03,.03,0,.02].map(function(t){var c=mixc(body,t>0?[255,255,255]:[40,44,50],Math.abs(t));return[c[0],c[1],c[2]]});
  var list=shipView(function(){return[
    faces(shipM,o,function(i){var t=shipM.tag[i];return t==="cap"?aft:t==="under"?seam:rings[shipM.sec[i]]},.5),
    faces(tileM,o,function(i){var k=tileM.tone[i];return v3(tile[0]*k,tile[1]*k,tile[2]*k)},.06),
    faces(flapM,o,function(i,n){return n[1]>0?rings[1]:tile},.35)]});
  var power=S.mode==="intro"?.35:S.boosting?1.35:S.mode==="play"?.85:.55,flames=shipView(function(){return plumes(o,power)});
  var tail=project(o.x,o.y,0),blink=S.hurt>0&&!rm&&Math.floor(S.hurt*12)%2===0;
  items.push({z:tail?tail[2]+1:3,draw:function(){shipView(function(){drawShipNow(list,flames,blink,power,o)})}});
  S.embers.forEach(function(p){var c=project(p.x,p.y,p.z);if(!c)return;
    items.push({z:c[2],draw:function(){x.globalAlpha=1-p.life/p.max;x.fillStyle=p.life<p.max*.4?C.flame:C.accent;var s=Math.max(1.2,.03/c[2]*F);x.fillRect(c[0]-s/2,c[1]-s/2,s,s);x.globalAlpha=1}})})}
function drawShipNow(list,flames,blink,power,o){list.forEach(function(l,n){fill(l,blink?.35:1,n===1)});drawEngines(o);
    x.globalAlpha=.92;flames.forEach(function(p){flameLayer(p,1,1,C.accent)});
    x.globalAlpha=1;flames.forEach(function(p){flameLayer(p,.58,.78,C.flame)});
    flames.forEach(function(p){flameLayer(p,.26,.5,C["ship-edge"])});
    /* shock diamonds in the sea-level cores */
    if(!rm&&power>.8){x.fillStyle="#fff";flames.forEach(function(p){if(p.vac)return;[2,3].forEach(function(i){var q=p.pts[i],w=q[3]*.3,h=q[3]*.55;
      x.beginPath();x.moveTo(q[0]-q.ny*h,q[1]+q.nx*h);x.lineTo(q[0]+q.nx*w,q[1]+q.ny*w);x.lineTo(q[0]+q.ny*h,q[1]-q.nx*h);x.lineTo(q[0]-q.nx*w,q[1]-q.ny*w);x.closePath();x.fill()})})}
  x.globalAlpha=1}
/* The pilot: a small green alien in the canopy, facing you, who blinks. */
function drawPilot(c,size,a){var g=lit([104,196,92]),gd=lit([54,128,60]),h=size;
  x.fillStyle=rgb(gd);x.beginPath();x.ellipse(c[0],c[1]+h*.95,h*.62,h*.4,0,0,6.2832);x.fill();
  x.strokeStyle=rgb(g);x.lineWidth=Math.max(1,h*.07);x.beginPath();
  x.moveTo(c[0]-h*.16,c[1]-h*.42);x.quadraticCurveTo(c[0]-h*.3,c[1]-h*.8,c[0]-h*.42,c[1]-h*.86);
  x.moveTo(c[0]+h*.16,c[1]-h*.42);x.quadraticCurveTo(c[0]+h*.3,c[1]-h*.8,c[0]+h*.42,c[1]-h*.86);x.stroke();
  x.fillStyle=rgb(g);[-1,1].forEach(function(s){x.beginPath();x.arc(c[0]+s*h*.42,c[1]-h*.86,h*.08,0,6.2832);x.fill()});
  x.beginPath();x.ellipse(c[0],c[1],h*.42,h*.5,0,0,6.2832);x.fill();
  x.fillStyle=rgb(gd);x.beginPath();x.ellipse(c[0]+h*.12,c[1]+h*.08,h*.3,h*.4,0,0,6.2832);x.globalAlpha=.25;x.fill();x.globalAlpha=1;
  var shut=a.blink<0?.12:1;x.fillStyle="#0b0d10";
  [-1,1].forEach(function(s){x.beginPath();x.ellipse(c[0]+s*h*.19,c[1]-h*.04,h*.16,h*.085*shut,s*.5,0,6.2832);x.fill()});
  if(shut===1){x.fillStyle="#fff";[-1,1].forEach(function(s){x.beginPath();x.arc(c[0]+s*h*.19-h*.04,c[1]-h*.07,Math.max(.6,h*.03),0,6.2832);x.fill()})}}
function render(){
  resetFrame();
  x.setTransform(dpr,0,0,dpr,0,0);x.globalAlpha=1;x.fillStyle=C.bg;x.fillRect(0,0,W,H);
  x.save();
  var roll=introTurn();
  var jolt=S.shake>0?S.shake*18:0;
  x.translate(W/2+rand(-jolt,jolt),H/2+rand(-jolt,jolt));x.rotate(roll);x.translate(-W/2,-H/2);
  drawStars();drawBackdrop();drawLane();
  var items=[];
  S.rings.forEach(function(o){var pts=[],c=project(o.x,o.y,o.z);if(!c)return;
    for(var i=0;i<=28;i++){var a=i/28*6.2832,p=project(o.x+Math.cos(a)*o.r,o.y+Math.sin(a)*o.r,o.z);if(!p)return;pts.push(p)}
    items.push({z:c[2],draw:function(){var passed=o.hit>=0,fade=passed?clamp(1-(S.t-o.hit)*2.5,0,1):1;
      x.globalAlpha=fade*clamp((74-o.z)/16,0,1)*(o.missed?.35:.85);x.strokeStyle=passed?C.accent:C.dim;x.lineWidth=Math.max(1,.045/c[2]*F);
      x.beginPath();pts.forEach(function(p,i){if(i)x.lineTo(p[0],p[1]);else x.moveTo(p[0],p[1])});x.stroke();x.globalAlpha=1}})});
  S.rocks.forEach(function(o){var c=project(o.x,o.y,o.z);if(!c)return;
    var base=lit(o.flash>0?v3(220,222,226):v3(128+o.tint,126+o.tint,124)),list=faces(o.m,{x:o.x,y:o.y,z:o.z,rx:o.rx,ry:o.ry,rz:o.rz,s:o.r},function(){return base});
    var danger=S.mode==="play"&&S.ship.alive&&threat(o),r=o.r/c[2]*F;stem(items,o,c,danger);
    items.push({z:c[2],draw:function(){fill(list);if(danger)brackets(c,r)}})});
  S.aliens.forEach(function(a){var c=project(a.x,a.y,a.z);if(!c)return;
    var hull=lit(a.flash>0?v3(230,232,236):v3(112,122,134)),glass=lit(v3(176,206,218)),o={x:a.x,y:a.y,z:a.z,ry:a.spin,rx:-.22,s:a.s};
    var all=faces(saucerM,o,function(i){return saucerM.tag[i]==="glass"?glass:hull},.35);
    var shell=all.filter(function(f){return saucerM.tag[f.i]!=="glass"}),canopy=all.filter(function(f){return saucerM.tag[f.i]==="glass"});
    var seat=placer(o)([0,.1,0]),head=project(seat[0],seat[1],seat[2]);
    /* three rim lights turn red just before a drone fires: the tell */
    var tell=a.state==="hold"&&a.fire<.5,lights=[0,1,2].map(function(k){var an=a.spin+k*2.094;return project(a.x+Math.cos(an)*.68*a.s,a.y+.01,a.z+Math.sin(an)*.68*a.s)});
    stem(items,a,c,false);
    items.push({z:c[2],draw:function(){fill(shell);
      if(head&&canopy.length){x.save();x.beginPath();canopy.forEach(function(f){f.p.forEach(function(q,i){if(i)x.lineTo(q[0],q[1]);else x.moveTo(q[0],q[1])});x.closePath()});x.clip();
        drawPilot([head[0],head[1]],.15*a.s/head[2]*F,a);x.restore()}
      fill(canopy,.3);
      if(head){var hr=.3*a.s/head[2]*F;x.strokeStyle="#fff";x.globalAlpha=.5;x.lineWidth=Math.max(1,hr*.06);x.beginPath();x.arc(head[0],head[1]+hr*.1,hr*.8,3.5,4.4);x.stroke();x.globalAlpha=1}
      x.fillStyle=tell?C.hostile:C.fg;x.globalAlpha=tell?1:.45;
      lights.forEach(function(p){if(p){x.beginPath();x.arc(p[0],p[1],Math.max(1.2,.05/p[2]*F),0,6.2832);x.fill()}});x.globalAlpha=1}})});
  S.cells.forEach(function(o){var c=project(o.x,o.y,o.z);if(!c)return;
    var col=hexRGB(C.accent),list=faces(cellM,{x:o.x,y:o.y,z:o.z,ry:o.ry,rx:.4,s:o.s},function(){return col});
    items.push({z:c[2],draw:function(){fill(list)}})});
  /* drone fire: red bolts with a pale core, trailing back toward the drone */
  S.shots.forEach(function(o){var c=project(o.x,o.y,o.z),tail=project(o.x-o.vx*.05,o.y-o.vy*.05,o.z-o.vz*.05);if(!c||!tail)return;
    items.push({z:c[2],draw:function(){var w=Math.max(2,.07/c[2]*F);x.lineCap="round";
      x.strokeStyle=C.hostile;x.lineWidth=w;x.beginPath();x.moveTo(tail[0],tail[1]);x.lineTo(c[0],c[1]);x.stroke();
      x.strokeStyle="#fff";x.globalAlpha=.85;x.lineWidth=w*.35;x.beginPath();x.moveTo(mix(tail[0],c[0],.4),mix(tail[1],c[1],.4));x.lineTo(c[0],c[1]);x.stroke();
      x.globalAlpha=1;x.lineCap="butt"}})});
  S.bolts.forEach(function(b){var a=project(b.x,b.y,b.z),e=project(b.x,b.y,b.z+1.6);if(!a||!e)return;
    items.push({z:a[2],draw:function(){x.strokeStyle=C.accent;x.lineCap="round";x.lineWidth=Math.max(1.4,.035/a[2]*F);
      x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(e[0],e[1]);x.stroke();x.lineCap="butt"}})});
  S.shards.forEach(function(p){var c=project(p.x,p.y,p.z);if(!c)return;
    items.push({z:c[2],draw:function(){var r=Math.min(14,p.s/c[2]*F),a=p.rot;x.globalAlpha=clamp(1-p.life/p.max,0,1);x.fillStyle=rgb(haze(p.c,p.z));
      x.beginPath();x.moveTo(c[0]+Math.cos(a)*r,c[1]+Math.sin(a)*r);x.lineTo(c[0]+Math.cos(a+2.3)*r*.7,c[1]+Math.sin(a+2.3)*r*.7);
      x.lineTo(c[0]+Math.cos(a+4)*r*.8,c[1]+Math.sin(a+4)*r*.8);x.closePath();x.fill();x.globalAlpha=1}})});
  S.bursts.forEach(function(b){var c=project(b.x,b.y,b.z);if(!c)return;
    items.push({z:c[2]-.01,draw:function(){var u=b.t/.45;x.strokeStyle=b.accent?C.accent:C.dim;x.globalAlpha=(1-u)*.8;x.lineWidth=1.2;
      x.beginPath();x.arc(c[0],c[1],(.2+u)*b.r/c[2]*F,0,6.2832);x.stroke();x.globalAlpha=1}})});
  drawShip(items);
  items.sort(function(a,b){return b.z-a.z}).forEach(function(it){it.draw()});
  /* the reticle marks where the lasers will be, a little way ahead */
  if(S.ship.alive&&(S.mode==="play"||S.mode==="ready")){var r=project(S.ship.x,S.ship.y+.03,22);
    if(r){var k=Math.max(7,F*.012);x.strokeStyle=C.accent;x.globalAlpha=S.mode==="play"?.75:.35;x.lineWidth=1.2;
      x.beginPath();x.moveTo(r[0]-k,r[1]-k*.5);x.lineTo(r[0]-k,r[1]-k);x.lineTo(r[0]-k*.5,r[1]-k);
      x.moveTo(r[0]+k*.5,r[1]-k);x.lineTo(r[0]+k,r[1]-k);x.lineTo(r[0]+k,r[1]-k*.5);
      x.moveTo(r[0]+k,r[1]+k*.5);x.lineTo(r[0]+k,r[1]+k);x.lineTo(r[0]+k*.5,r[1]+k);
      x.moveTo(r[0]-k*.5,r[1]+k);x.lineTo(r[0]-k,r[1]+k);x.lineTo(r[0]-k,r[1]+k*.5);x.stroke();x.globalAlpha=1}}
  x.restore()}

/* HUD and cards: DOM text, so it uses the site's type */
function hud(force){
  var score=fmt(S.score),w=worlds[here()],prog=clamp(S.dist/sectorLength(S.sector),0,1);
  if(force||shown.score!==score){scoreEl.textContent=score;shown.score=score}
  var b="Best "+fmt(Math.max(best,S.score));if(force||shown.best!==b){bestEl.textContent=b;shown.best=b}
  var name=(S.mode==="arrive"?"Arrived at ":"To ")+w.n;if(force||shown.name!==name){nameEl.textContent=name;shown.name=name}
  barEl.style.transform="scaleX("+(S.mode==="arrive"?1:prog).toFixed(3)+")";
  boostEl.style.transform="scaleX("+S.boost.toFixed(3)+")";
  if(force||shown.hull!==S.hull){shown.hull=S.hull;hullEl.setAttribute("aria-label","Hull "+S.hull+" of 3");
    [].forEach.call(hullEl.children,function(dot,i){dot.className=i<S.hull?"on":""})}
  var quiet=S.mode==="intro";if(shown.quiet!==quiet){shown.quiet=quiet;layer.classList.toggle("quiet",quiet)}}
var steerCopy=coarse?"Drag anywhere to steer; holding fires. Hold Boost to go fast.":"Arrows, WASD or the mouse to steer. Space or click to fire. Shift to boost.";
function showCard(){var m=S.mode,html="";
  if(m==="ready")html='<h2 class="r">Flight</h2>'+
    '<p class="r" style="--i:1">Ride Starship out through the belt. Reach each world, dodge the rock, and clear the drones that come to meet you.</p>'+
    '<p class="r dim gap" style="--i:2">'+steerCopy+' Anything on a collision course is marked in red. Fly through rings to refill the boost.</p>'+
    '<p class="r gap acts" style="--i:3"><button type="button" data-act="launch">Launch</button><span class="dim">'+(coarse?"":"or press Space")+'</span></p>';
  else if(m==="arrive"){var w=worlds[here()],tour=S.sector===worlds.length-1&&!S.toured;
    html='<p class="r dim">Sector '+(S.sector+1)+'</p><h2 class="r" style="--i:1">'+w.n+'</h2>'+
    '<p class="r" style="--i:2">'+(tour?"Grand tour complete. The belt keeps going, and so can you.":w.line)+'</p>'+
    '<p class="r dim gap" style="--i:3">+'+fmt(S.bonus)+' for arriving with '+S.hull+' of 3 hull.</p>'+
    '<p class="r gap acts" style="--i:4"><button type="button" data-act="next">Keep flying</button><button type="button" data-act="land">Land here</button></p>'}
  else if(m==="over"){var reached=S.sector>0?"You made it "+S.sector+(S.sector===1?" world":" worlds")+" out.":"The belt won this one.";
    html='<h2 class="r">Hull lost.</h2><p class="r" style="--i:1">'+reached+'</p>'+
    '<p class="r dim gap" style="--i:2">Score '+fmt(S.score)+'. Best '+fmt(best)+'.</p>'+
    '<p class="r gap acts" style="--i:3"><button type="button" data-act="launch">Fly again</button><button type="button" data-act="exit">Back to orbit</button></p>'}
  else if(m==="paused")html='<h2 class="r">Paused</h2>'+
    '<p class="r dim" style="--i:1">'+steerCopy+'</p>'+
    '<p class="r gap acts" style="--i:2"><button type="button" data-act="resume">Resume</button><button type="button" data-act="exit">Back to orbit</button></p>';
  if(!html){hideCard();return}
  /* Arrival and game over wait a beat, so the planet and the debris get their moment. */
  var wait=rm?0:m==="over"?1100:m==="arrive"?900:0;
  card.innerHTML=html;card.classList.add("hide");clearTimeout(card.timer);
  card.timer=setTimeout(function(){if(S&&S.mode===m){card.classList.remove("hide");var b=card.querySelector("button");if(b&&!coarse)b.focus({preventScroll:true})}},wait)}
function hideCard(){clearTimeout(card.timer);card.classList.add("hide");if(card.contains(d.activeElement))layer.focus({preventScroll:true})}
function pause(){if(S.mode==="play"){S.mode="paused";firing=false;keys={};showCard()}}
function resume(){if(S.mode==="paused"){S.mode="play";hideCard();last=performance.now()}}
card.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("button");if(!b)return;
  var a=b.getAttribute("data-act");
  if(a==="launch")launch();else if(a==="next")next();else if(a==="land")land();else if(a==="resume")resume();else if(a==="exit")close(-1)});
$("fback").addEventListener("click",function(){close(-1)});

/* input */
addEventListener("keydown",function(e){if(!on)return;var k=e.key.toLowerCase(),m=S.mode;
  if(/^(arrow(up|down|left|right)|[wasd]|shift)$/.test(k)){keys[k]=true;e.preventDefault();return}
  if(k==="escape"){e.preventDefault();if(m==="play")pause();else if(m==="paused")resume();else close(-1);return}
  if(k==="p"){if(m==="play")pause();else resume();return}
  if(e.target&&e.target.tagName==="BUTTON"&&(k===" "||k==="enter"))return;
  if(k===" "||k==="enter"){e.preventDefault();if(m==="play")firing=true;else if(m==="ready"||m==="over")launch();else if(m==="arrive")next();else if(m==="paused")resume()}
  if(k==="l"&&m==="arrive")land()});
addEventListener("keyup",function(e){if(!on)return;var k=e.key.toLowerCase();delete keys[k];if(k===" "||k==="enter")firing=false});
addEventListener("blur",function(){keys={};firing=false;boostHeld=false});
d.addEventListener("visibilitychange",function(){if(on&&d.hidden)pause()});
/* The mouse points where the ship should go; touch drags relative to where the finger landed. */
function toWorld(px,py){return[clamp((px-B.sx)/B.kx,B.x0,B.x1),clamp((py-B.sy)/B.ky,B.y0,B.y1)]}
function pt(e){var b=cv.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top]}
cv.addEventListener("pointerdown",function(e){if(!on)return;var p=pt(e);
  if(e.pointerType==="mouse"){if(e.button===0)firing=S.mode==="play";aim=toWorld(p[0],p[1])}
  else{touchFrom={p:p,x:S.ship.x,y:S.ship.y};firing=S.mode==="play";try{cv.setPointerCapture(e.pointerId)}catch(err){}}});
cv.addEventListener("pointermove",function(e){if(!on)return;var p=pt(e);
  if(e.pointerType==="mouse")aim=toWorld(p[0],p[1]);
  else if(touchFrom)aim=[clamp(touchFrom.x+(p[0]-touchFrom.p[0])/B.kx*1.3,B.x0,B.x1),clamp(touchFrom.y+(p[1]-touchFrom.p[1])/B.ky*1.3,B.y0,B.y1)]});
function release(e){if(e.pointerType!=="mouse"){touchFrom=null;aim=null}firing=false}
cv.addEventListener("pointerup",release);cv.addEventListener("pointercancel",release);
cv.addEventListener("pointerleave",function(e){if(e.pointerType==="mouse")aim=null});
boostBtn.addEventListener("pointerdown",function(e){e.preventDefault();boostHeld=true});
["pointerup","pointerleave","pointercancel"].forEach(function(n){boostBtn.addEventListener(n,function(){boostHeld=false})});
cv.addEventListener("contextmenu",function(e){e.preventDefault()});

function resize(){W=innerWidth;H=innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  CX=W/2;CY=H/2;F=Math.min(W*1.1,H*1.65);measure();
  if(S){S.ship.x=clamp(S.ship.x,B.x0,B.x1);S.ship.y=clamp(S.ship.y,B.y0,B.y1)}}
addEventListener("resize",function(){if(on){resize();if(S.mode==="paused")render()}});
var timeScale=1;
/* Hitstop spends its frames on render only, so the hit stays on screen while
   the world holds still. */
function present(dt){if(S.hitstop>0){S.hitstop--;render()}else{update(dt);render()}}
function loop(now){if(!on)return;var dt=Math.min(.05,Math.max(0,(now-last)/1000))*timeScale;last=now;
  if(S.mode!=="paused")present(dt);raf=requestAnimationFrame(loop)}

function start(o){if(on)return;o=o||{};on=true;onExit=o.onExit||null;colors();S=fresh();keys={};aim=null;firing=false;shown={};
  if(typeof o.heading==="number")S.heading=o.heading;
  if(typeof o.from==="number"&&o.from>=0)S.first=(o.from+1)%worlds.length;
  layer.hidden=false;resize();hud(true);hideCard();
  if(rm)setMode("ready");
  requestAnimationFrame(function(){layer.classList.add("on")});layer.focus({preventScroll:true});
  last=performance.now();update(0);render();raf=requestAnimationFrame(loop)}
function close(page){if(!on)return;on=false;cancelAnimationFrame(raf);hideCard();keys={};firing=false;boostHeld=false;
  saveBest();
  layer.classList.remove("on");setTimeout(function(){if(!on)layer.hidden=true},rm?0:500);
  var done=onExit;onExit=null;if(done)done(page)}
window.Flight={start:start,close:close,get active(){return on},
  debug:{state:function(){return S},tick:function(dt){update(dt);render()},
    /* The real loop spends hitstop frames drawing only. Tests and dev shortcuts
       step through update() directly, so a freeze cannot eat scripted time. */
    frame:function(dt){present(dt)},bounds:function(){return B},threat:function(o){return threat(o)},
    key:function(k,v){if(v)keys[k]=true;else delete keys[k]},fire:function(v){firing=v},next:next,land:land,launch:launch,
    /* dev.js shortcuts */
    play:function(){if(S&&(S.mode==="intro"||S.mode==="ready")){chase(S.ship.x,S.ship.y);setMode("play")}},
    speed:function(v){timeScale=v},god:function(v){S.god=v==null?!S.god:v;return S.god},
    arrive:function(){if(S.mode==="play")S.dist=sectorLength(S.sector)},
    world:function(n){S.first=((n-S.sector)%worlds.length+worlds.length)%worlds.length;S.dist=0;S.flyby=null;if(S.mode==="arrive")setMode("play");hud(true)},
    rock:function(big){var o=rock(!!big,S.ship.x,S.ship.y,40);S.rocks.push(o)},
    drone:function(){S.aliens.push({x:S.ship.x+rand(-.6,.6),y:S.ship.y+rand(0,.6),z:60,bx:0,by:0,hold:14,state:"in",t:0,ph:rand(0,6),spin:0,fire:1.2,hp:1,flash:0,r:.7,s:1.1,blink:2})},
    ring:function(){S.rings.push({x:S.ship.x,y:S.ship.y,z:40,r:.62,hit:-1,missed:false})},
    refill:function(){S.hull=3;S.boost=1;hud(true)},
    lose:function(){S.god=false;S.hurt=0;S.hull=1;hurt()},
    worlds:function(){return worlds.map(function(w){return w.n})},here:function(){return worlds[here()].n}}};
})();
