(function(){
var d=document,root=d.documentElement,rm=matchMedia("(prefers-reduced-motion: reduce)").matches;
var cv=d.getElementById("sky"),x=cv.getContext("2d"),W,H,dpr=Math.min(devicePixelRatio||1,2),C={};
var secs=[].slice.call(d.querySelectorAll("#panel section")),intro=d.getElementById("intro"),top_=d.getElementById("top");
var page=-1,tip=d.getElementById("tip");
/* Text that changes runs inside a View Transition where the browser has one. The block that is
   leaving is captured where it stood and fades, lifts and blurs away, while the arriving block
   rises in on its own .r stagger. The page's own snapshot is not cross-faded, so the canvas keeps
   running live underneath with nothing ghosting. Without the API, or with reduced motion, the
   swap is instant. vt() marks the root for the matching CSS (style.css, View Transitions). */
var vtCount={};
function vt(kind,update){
  if(rm||typeof d.startViewTransition!=="function"){update();return null}
  vtCount[kind]=(vtCount[kind]||0)+1;root.classList.add(kind);
  function done(){if(--vtCount[kind]<=0){vtCount[kind]=0;root.classList.remove(kind)}}
  var t=d.startViewTransition(update);t.finished.then(done,done);return t}
/* While a swap runs, vt-arrive holds the incoming stagger back a beat so the old block is mostly
   gone before the new one rises. It stays on until well after the last entrance has finished, so
   no running animation ever has its delay changed under it. */
var arriveTimer=0;
function swap(out,update){
  if(!out||!out.style||out.hidden){update();return}
  out.style.viewTransitionName="vt-out";
  if(!vt("vt-swap",function(){out.style.viewTransitionName="";root.classList.add("vt-arrive");
    clearTimeout(arriveTimer);arriveTimer=setTimeout(function(){root.classList.remove("vt-arrive")},2600);update()}))out.style.viewTransitionName=""}
function shown(){var on=secs.filter(function(s){return s.classList.contains&&s.classList.contains("on")})[0];
  if(on&&page===2&&roleList){var open=roles.filter(function(r){return!r.hidden})[0];return open||roleList}return on}
/* Each page has its own address, so Back, Forward, the trackpad's swipe back and a shared link
   all work. Arriving from history does not add another entry. */
var fromHistory=false;
function slugOf(n){return n>=0&&M[n]?"#"+M[n].n.toLowerCase():""}
function pageOfHash(){if(typeof location==="undefined")return-1;var h=(location.hash||"").toLowerCase();
  for(var i=0;i<M.length;i++)if(slugOf(i)===h)return i;return-1}
function remember(n){if(fromHistory||typeof history==="undefined"||!history.pushState||typeof location==="undefined")return;
  var want=slugOf(n);if((location.hash||"")===want)return;
  try{history.pushState({page:n},"",want||location.pathname+location.search)}catch(e){}}
if(typeof history!=="undefined")addEventListener("popstate",function(){if(flying)return;fromHistory=true;try{go(pageOfHash())}finally{fromHistory=false}});
function go(n){var out=n!==page?shown():null;if(n!==page){
    view.target=n<0?0:1;
    /* World to world: the destination's dot in the sky opens over the current landscape, which
       stays put underneath until it is covered. No trip back out to the orbit. */
    if(n>=0&&page>=0&&view.amount>.5&&!rm){
      openings.push({planet:n,t:0,v:0,from:dotPose(n)});
      if(M[view.planet])M[view.planet].alpha=0;view.planet=n}
    else if(n>=0){view.planet=view.base=n;openings=[]}
    else{if(openings.length)view.base=view.planet;openings=[]}
    /* Paint the destination now, inside the click, while nothing is moving yet; every frame of
       the move that follows only places finished pictures. */
    if(n>=0&&lastArea&&!rm)paintWorld(n,lastArea);
    resetRole();
    liftOff(n);
    if(ship.position){ship.from=ship.position.slice();ship.departed=tt;ship.routeAngle=null;ship.screenFrom=ship.screen&&ship.screen.slice()}
  }page=n;remember(n);
  swap(out,function(){
    if(roleDirty)showRole(null,null,true);
    secs.forEach(function(s,i){s.classList.toggle("on",i===n)});
    intro.classList.toggle("hide",n>=0);top_.classList.toggle("hide",n<0);
    tip.classList.toggle("hide",n<0);setReading()});
  if(typeof dispatchEvent==="function"&&typeof CustomEvent!=="undefined")dispatchEvent(new CustomEvent("orbit:page",{detail:n}));
  if(rm)frame(1)}
/* About (index 0) is a two-column spread, so it folds the landscape away exactly as a sub-page
   does. Both states share `reading`; `spread` is what tells the CSS and the globe which one. */
var SPREAD=0,SPREAD_MIN=1000;
function setReading(){if(!root.classList||!root.classList.toggle)return;
  /* Two columns and the corner globe need the room; under SPREAD_MIN About is an ordinary
     panel page instead, with the Ask panel below the summary and the landscape left alone. */
  var sub=!!role,spread=page===SPREAD&&!sub&&innerWidth>=SPREAD_MIN;
  root.classList.toggle("reading",sub||spread);
  root.classList.toggle("spread",spread)}
top_.addEventListener("click",function(){go(-1)});
/* Experience sub-pages. Each role is an article inside the Experience section; opening one swaps
   it in for the list without leaving the landscape. Showing it restarts the .r entrance. */
var roleList=d.getElementById("xp-list"),roles=[].slice.call(d.querySelectorAll(".sub")),role=null,roleDirty=false;
/* Leaving Experience forgets the open role. The state clears now; the DOM follows inside go's swap. */
function resetRole(){if(role){role=null;roleDirty=true}}
function showRole(id,from,instant){
  if(!roleList)return;
  var open=roles.filter(function(r){return r.id==="xp-"+id})[0]||null,out=null;
  if(!instant&&page===2){out=roles.filter(function(r){return!r.hidden})[0]||roleList;if(out===open||(!open&&out===roleList))out=null}
  role=open?id:null;roleDirty=false;
  function apply(){roleList.hidden=!!open;
    /* Reading a role sends the landscape back and centers the text (see .reading in style.css). */
    setReading();
    roles.forEach(function(r){r.hidden=r!==open});
    var section=roleList.parentNode;if(section)section.scrollTop=0;
    if(open){var heading=open.querySelector("h2");if(heading&&heading.focus)heading.focus({preventScroll:true})}
    else if(from){var back=roleList.querySelector('[data-role="'+from+'"]');if(back&&back.focus)back.focus({preventScroll:true})}}
  if(out)swap(out,apply);else apply()}
if(roleList&&roleList.parentNode)roleList.parentNode.addEventListener("click",function(e){
  var target=e.target.closest&&e.target.closest("[data-role]");if(!target)return;
  var next=target.getAttribute("data-role"),from=role;showRole(next||null,from)});
/* Shortcuts never fire while typing (the Ask box) or with a modifier held (browser and dev keys).
   The arrows step through the worlds in page order; left from the first goes home. */
addEventListener("keydown",function(e){if(flying||e.metaKey||e.ctrlKey||e.altKey)return;
  var t=e.target,tag=t&&t.tagName;if(tag==="INPUT"||tag==="TEXTAREA"||(t&&t.isContentEditable))return;
  if(e.key==="Escape"&&role){showRole(null,role);return}
  if(e.key==="Escape"||e.key==="0")go(-1);else if(/^[1-9]$/.test(e.key)&&+e.key<=M.length)go(+e.key-1);else if(e.key==="f"||e.key==="F")launch();
  else if(e.key==="ArrowRight"&&page<M.length-1)go(page+1);else if(e.key==="ArrowLeft"&&page>=0)go(page-1)});
/* Catching Starship opens Flight (game.js). The orbit zooms into the ship and stops drawing
   while the game runs; coming back zooms out and, after "Land here", approaches that page. */
var flying=false,paused=false,looping=false,zoomIn=null,shipHit=null,shipHov=false;
function hitShip(a,b){return!!shipHit&&Math.hypot(a-shipHit[0],b-shipHit[1])<shipHit[2]}
function launch(){if(flying||typeof Flight==="undefined"||!ship.screen)return;landing={state:null};
  flying=true;hov=-1;shipHov=false;drag=false;root.classList.add("flying");
  cv.style.transformOrigin=Math.round(ship.screen[0]*W)+"px "+Math.round(ship.screen[1]*H)+"px";
  zoomIn=cv.animate([{transform:"scale(1)",opacity:1},{transform:"scale(6)",opacity:0}],{duration:rm?1:800,easing:"cubic-bezier(.55,0,.8,.2)",fill:"forwards"});
  paused=true;
  setTimeout(function(){Flight.start({heading:ship.heading,from:page,onExit:function(n){
    flying=false;paused=false;root.classList.remove("flying");if(zoomIn)zoomIn.cancel();zoomIn=null;
    cv.animate([{transform:"scale(6)",opacity:0},{transform:"scale(1)",opacity:1}],{duration:rm?1:900,easing:"cubic-bezier(.2,.7,.2,1)"});
    last=performance.now();if(n>=0)landOn(n);if(rm)frame(1);else if(!looping)frame(0)}})},rm?0:420)}
/* cycling line */
var cyc=d.getElementById("cyc"),ph=["a student of computer science and math.","a portfolio manager at Sinn Fund.","building collision avoidance for spacecraft.","into machine learning and quantitative research."],pi=0;
if(!rm)setInterval(function(){if(page>=0)return;
  cyc.animate([{opacity:1,transform:"translateY(0)"},{opacity:0,transform:"translateY(-14px)"}],{duration:280,fill:"forwards"}).finished.then(function(){
    pi=(pi+1)%ph.length;cyc.textContent=ph[pi];
    cyc.animate([{opacity:0,transform:"translateY(14px)"},{opacity:1,transform:"translateY(0)"}],{duration:380,fill:"forwards"})})},3200);
/* colors */
function colors(){var s=getComputedStyle(root);["bg","fg","dim","accent","ship-body","ship-shield","ship-edge"].forEach(function(k){C[k]=s.getPropertyValue("--"+k).trim()})}
colors();matchMedia("(prefers-color-scheme: dark)").addEventListener("change",function(){colors();if(rm)frame(1)});
/* The data-theme override has to reach the canvas too, not just the CSS. */
if(typeof MutationObserver!=="undefined")new MutationObserver(function(){colors();if(rm)frame(1)})
  .observe(root,{attributes:true,attributeFilter:["data-theme"]});
/* Theme toggle. Setting data-theme is enough: the observer above carries it to the canvas. */
var themeBtn=d.getElementById("theme"),darkQuery=matchMedia("(prefers-color-scheme: dark)");
function themeIsDark(){return root.dataset.theme?root.dataset.theme==="dark":darkQuery.matches}
function showTheme(){var isDark=themeIsDark();
  themeBtn.setAttribute("aria-pressed",isDark?"true":"false");
  themeBtn.setAttribute("aria-label",isDark?"Switch to light mode":"Switch to dark mode")}
try{var saved=localStorage.getItem("theme");if(saved==="dark"||saved==="light")root.dataset.theme=saved}catch(e){}
colors();showTheme();darkQuery.addEventListener("change",showTheme);
/* The new theme is revealed as a circle growing out of the button, over a still image of the
   old one. Transitions are held off meanwhile so the revealed page is already in its colors. */
themeBtn.addEventListener("click",function(){
  var next=themeIsDark()?"light":"dark";
  function apply(){root.dataset.theme=next;try{localStorage.setItem("theme",next)}catch(e){}showTheme()}
  if(rm||typeof d.startViewTransition!=="function"){apply();return}
  var b=themeBtn.getBoundingClientRect(),bx=b.left+b.width/2,by=b.top+b.height/2;
  root.style.setProperty("--vt-x",bx+"px");root.style.setProperty("--vt-y",by+"px");
  root.style.setProperty("--vt-r",Math.ceil(Math.hypot(Math.max(bx,innerWidth-bx),Math.max(by,innerHeight-by)))+"px");
  vt("vt-theme",apply)});
function rs(){W=innerWidth;H=innerHeight;setReading();cv.width=W*dpr;cv.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);if(rm)frame(1)}
addEventListener("resize",rs);
/* 3D scene */
/* Page order: About, Projects, Experience, Skills, Contact. k is each planet's art id: the index of
   its terrain palette, nature palette and climate, and the seed of its terrain noise. It stays fixed
   when pages are reordered, so every landscape keeps exactly the shape it was authored with.
   Experience's orbit is second from the sun, so the rings read About, Experience, Projects, Skills, Contact. */
var M=[{n:"About",k:0,r:.55,i:.35,o:0,s:.45,a:0},{n:"Projects",k:1,r:1.01,i:-.5,o:1,s:.34,a:2.1},
  {n:"Experience",k:4,r:.78,i:-.12,o:4.6,s:.39,a:1.0},
  {n:"Skills",k:2,r:1.23,i:.75,o:2.2,s:.27,a:4.2},{n:"Contact",k:3,r:1.45,i:-.25,o:3.4,s:.21,a:5.4}];
function artOf(planet){return M[planet]&&M[planet].k!=null?M[planet].k:planet}
var belt=[],k;for(k=0;k<110;k++)belt.push({a:Math.random()*6.283,r:1.6+Math.random()*.22,y:(Math.random()-.5)*.14});
var yaw=.6,pit=.45,vy=0,vp=0,zoom=1,tz=1,drag=false,moved=false,dx0=0,dy0=0,lx=0,ly=0,mx=-999,my=-999,hov=-1,ts=1,last=performance.now(),tt=0;
var sc=1,ga=1,cxp=null,cyp=null,sceneRadius=0;
var ship={position:null,from:null,departed:0,heading:null,routeAngle:null};
var view={amount:0,av:0,target:0,planet:0,base:0,pan:0,read:0,rv:0};
var frameCount=0,shipHot=0,meteor=null,nextMeteor=9+Math.random()*8;
var mini=d.getElementById("mini"),mg=mini.getContext("2d"),read=d.getElementById("read");
function world(px,py,pz,inc,nod){
  var y1=py*Math.cos(inc)-pz*Math.sin(inc),z1=py*Math.sin(inc)+pz*Math.cos(inc),
      x2=px*Math.cos(nod)+z1*Math.sin(nod),z2=-px*Math.sin(nod)+z1*Math.cos(nod);
  return[x2,y1,z2]}
function P(px,py,pz,inc,nod,R,cx,cy){
  var v=world(px,py,pz,inc,nod),x2=v[0],y1=v[1],z2=v[2],
      x3=x2*Math.cos(yaw)+z2*Math.sin(yaw),z3=-x2*Math.sin(yaw)+z2*Math.cos(yaw),
      y4=y1*Math.cos(pit)-z3*Math.sin(pit),z4=y1*Math.sin(pit)+z3*Math.cos(pit),s=4.2/(4.2+z4);
  return[cx+x3*R*s,cy+y4*R*s,z4,s]}
function ball(X,Y,r,col,a){x.globalAlpha=a==null?1:a;x.fillStyle=col;x.beginPath();x.arc(X,Y,r,0,6.2832);x.fill()}
function mix(a,b,t){return a+(b-a)*t}
function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)}
/* Motion runs on elapsed time, not on frames, so it eases the same at 60 Hz, at 120 Hz and
   across a dropped frame. rate is per second; a step of Infinity lands on the target. */
function damp(value,target,rate,step){return value+(target-value)*(1-Math.exp(-rate*step))}
var fitStep=1/60;
/* Hover and selection fade colors rather than switching them. */
var rgbCache={};
function rgbOf(c){var v=rgbCache[c];if(!v)v=rgbCache[c]=hexRGB(c)||[128,128,128];return v}
function tint(a,b,t){if(t<=.001)return a;if(t>=.999)return b;var p=rgbOf(a),q=rgbOf(b);
  return"rgb("+Math.round(mix(p[0],q[0],t))+","+Math.round(mix(p[1],q[1],t))+","+Math.round(mix(p[2],q[2],t))+")"}
/* The same selected planet grows into a low horizon while the camera approaches. */
function surfaceArea(wide){
  var left=wide?d.getElementById("panel").getBoundingClientRect().right+28:0;
  var top=wide?70:d.getElementById("panel").getBoundingClientRect().bottom+12;
  var width=W-left,height=H-top;
  return{left:left,top:top,width:width,height:height,cx:left+width*.53,horizon:top+height*.64,radius:Math.max(W*1.55,width*1.8)}}
function skyPlanet(index,area){
  var order=M.map(function(_,i){return i}).filter(function(i){return i!==view.planet}),slot=order.indexOf(index);
  var spots=[[.12,.16],[.70,.32],[.38,.58],[.90,.06]],index_=Math.max(0,slot);
  /* Authored spots first; extra destinations get a spread position rather than undefined. */
  var spot=spots[index_]||[.10+(index_%4)*.27,.14+(index_%3)*.21];
  var sway=(rm?0:Math.sin(tt*.08+index)*4)+Math.sin(yaw)*5;
  return[area.left+48+spot[0]*Math.max(1,area.width-150)+sway,
    area.top+28+spot[1]*Math.max(1,area.height*.43-38)+Math.sin(pit)*4,0,1]}
function surfaceShip(time,area){
  var a=time*.18,position=[area.left+area.width*(.5+.23*Math.sin(a)),area.horizon-Math.min(195,area.height*.35)+Math.cos(a)*Math.min(10,area.height*.025)];
  if(ship.from&&ship.screenFrom&&!rm){var u=Math.min(1,(time-ship.departed)/2.6),e=ease(u);
    position=[mix(ship.screenFrom[0]*W,position[0],e),mix(ship.screenFrom[1]*H,position[1],e)-Math.sin(Math.PI*u)**2*Math.min(70,area.height*.14)]}
  position[0]=Math.max(area.left+52,Math.min(W-52,position[0]));
  position[1]=Math.max(area.top+32,Math.min(area.horizon-Math.min(180,area.height*.32),position[1]));return position}
/* Landing. "Land here" in Flight belly-flops Starship onto that page's world: it falls flat,
   flips upright with the engines lit and settles on the pad paintSurface picks. Leaving the
   page lifts it straight off, then eases it back into the usual transfer. Poses are in screen
   space; frame() blends them over the normal flight path by their weight. */
var landing={state:null},landingSite=null;
function lerpAngle(a,b,t){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t}
/* The pad is found while the terrain paints, after the ship is placed, so a still frame needs one more draw. */
function landOn(n){landing={state:"pending",page:n,site:null};go(n);if(rm){frame(1);frame(1)}}
function liftOff(n){var L=landing;if(!L.state||n===L.page)return;
  if(L.state==="pending"||!L.pose||!L.site||rm){landing={state:null};return}
  if(L.state==="takeoff"||L.state==="leaving")return;
  L.state="takeoff";L.start=tt;L.offset=[L.pose.x-L.site[0],L.pose.y-L.site[1]];L.heading=L.pose.heading}
var LAND_TIME=4.4;
function landingPose(normal,heading,length){
  var L=landing,up=-Math.PI/2,stand=length*.5;if(!L.state)return null;
  if(landingSite&&landingSite.planet===L.page&&view.planet===L.page&&L.state!=="leaving")L.site=landingSite.at.slice();
  if(L.state==="pending"){if(page!==L.page||view.amount<.999||!L.site)return null;
    L.state=rm?"landed":"descent";L.start=tt;L.touch=tt;L.from=normal.slice();L.heading=heading}
  var site=L.site,top=Math.max(40,site[1]-stand-length*5);
  /* One continuous path, so nothing hitches: a cubic Bezier that carries on the way the ship was
     coasting, swings over the pad and comes straight down, walked with a Hermite curve that starts
     at a coasting pace and eases to rest at touchdown. The belly flop lives in the heading and the
     burn, which blend: fall flat, rock a little, flip upright as the engines relight, settle. */
  if(L.state==="descent"){var u=(tt-L.start)/LAND_TIME;
    if(u>=1){L.state="landed";L.touch=tt}
    else{var dir=site[0]>=L.from[0]?1:-1,flat=dir>0?0:Math.PI,
        p0=L.from,p1=[L.from[0]+Math.cos(L.heading)*length*2.2,L.from[1]+Math.sin(L.heading)*length*2.2],
        p2=[site[0],Math.max(top,site[1]-stand-length*3.6)],p3=[site[0],site[1]-stand];
      var k=(u*u*u-2*u*u+u)*.5+(3*u*u-2*u*u*u),q=1-k,
          px=q*q*q*p0[0]+3*q*q*k*p1[0]+3*q*k*k*p2[0]+k*k*k*p3[0],py=q*q*q*p0[1]+3*q*q*k*p1[1]+3*q*k*k*p2[1]+k*k*k*p3[1];
      var h=u<.55?lerpAngle(L.heading,flat,ease(u/.3))+Math.sin(u*14)*.05*ease((u-.2)/.2):lerpAngle(flat,up,ease((u-.55)/.25));
      h+=Math.sin(tt*7)*.035*ease((u-.75)/.08)*(1-ease((u-.83)/.17));
      var burn=ease((u-.5)/.1)*(1-.75*ease((u-.86)/.14));
      return{x:px,y:py,heading:h,burn:u>.98?burn*(1-u)*50:burn}}}
  if(L.state==="landed")return{x:site[0],y:site[1]-stand,heading:up,burn:0};
  if(L.state==="takeoff"){var t=(tt-L.start)/1.3;
    if(t>=1){L.state="leaving";L.start=tt;L.from=[L.pose.x,L.pose.y]}
    else return{x:site[0]+L.offset[0],y:site[1]+L.offset[1]-Math.min(H*.3,length*9)*t*t,heading:lerpAngle(L.heading,up,ease(t/.3)),burn:1}}
  var v=(tt-L.start)/.9;if(v>=1){landing={state:null};return null}
  return{x:L.from[0],y:L.from[1]-Math.min(H*.3,length*9)*2*v*.7,heading:up,burn:1,weight:1-ease(v)}}
/* A contact shadow near the ground and dust kicked up by the landing and takeoff burns. */
function drawPadDust(site,shipBottom,length,burn){
  var alt=Math.max(0,site[1]-shipBottom),near=Math.max(0,1-alt/(length*3));if(near<=0)return;
  x.save();x.fillStyle="#000";x.globalAlpha=.2*near;x.beginPath();x.ellipse(site[0],site[1],length*.42,length*.09,0,0,Math.PI*2);x.fill();
  var since=tt-(landing.touch||0),settling=landing.state==="landed"?Math.max(0,1-since/1.4):1;
  if(!rm&&(burn>0||settling>0)){x.fillStyle=C.dim;
    for(var i=0;i<8;i++){var u=(tt*1.3+i/8)%1,side=i%2?1:-1;
      x.globalAlpha=(1-u)*.34*near*(burn>0?1:settling);
      x.beginPath();x.arc(site[0]+side*u*length*(1.1+(i%3)*.3),site[1]-u*length*(.2+(i%4)*.05),length*(.06+u*.16),0,Math.PI*2);x.fill()}}
  x.restore()}
function drawSky(area){
  x.save();x.beginPath();x.rect(area.left,area.top,area.width,area.height);x.clip();
  belt.forEach(function(b,i){
    var u=((i*73+17)%109)/109,v=((i*41+23)%107)/107;
    x.globalAlpha=view.amount*(.18+(i%4)*.1);x.fillStyle=C.dim;
    var size=i%11===0?1.7:1;x.fillRect(area.left+u*area.width+Math.sin(yaw)*3,area.top+v*area.height*.73+Math.sin(pit)*2,size,size)});
  x.restore()}
/* A lit height field supplies real facets, perspective and occluding ridges.
   Climates, like the palettes, are indexed by art id (M[i].k): About, Projects, Skills, Contact, Experience. */
var terrainMeshes={};
/* Water shimmer and chimney smoke have to keep moving, so they are drawn live on top of
   the cached terrain rather than baked into it. paintSurface leaves them this plan. */
var waterSurface=null,chimneys=[],lights=[],stars=[],snowfall=null,fires=[],sleigh=null;
var terrainPalettes=[
  {soil:[144,149,115],light:[236,214,164],shadow:[45,78,84],haze:[158,179,185]},
  {soil:[185,108,72],light:[250,204,145],shadow:[83,61,77],haze:[181,165,182]},
  {soil:[88,140,134],light:[198,214,164],shadow:[37,69,89],haze:[139,177,190]},
  {soil:[158,125,151],light:[233,198,171],shadow:[61,65,103],haze:[168,166,198]},
  {soil:[190,200,212],light:[250,251,253],shadow:[64,78,108],haze:[194,204,220]}
];
/* Terrain keeps the page's palette. Water and props keep real-world color, so a lake
   reads as water and a pine reads as a pine on every page. */
var naturePalettes=[
  {water:[58,116,164],deep:[26,62,104],glint:[198,228,244],
   foliage:[44,92,64],foliageLit:[104,150,88],trunk:[82,60,44],
   wall:[146,104,70],roof:[78,70,74],rock:[128,126,124],snow:[242,246,250]},
  {water:[54,104,140],deep:[22,52,82],glint:[168,206,226],
   foliage:[74,96,66],foliageLit:[126,150,92],trunk:[88,62,46],
   wall:[150,108,74],roof:[84,74,76],rock:[136,116,104],snow:[238,240,246]},
  {water:[52,110,152],deep:[24,58,94],glint:[190,222,240],
   foliage:[92,112,54],foliageLit:[166,172,84],trunk:[96,72,48],
   wall:[148,106,72],roof:[80,72,76],rock:[126,128,130],snow:[240,244,250]},
  {water:[48,94,148],deep:[21,47,88],glint:[176,206,236],
   foliage:[42,84,70],foliageLit:[92,136,96],trunk:[78,58,46],
   wall:[140,100,68],roof:[74,66,72],rock:[124,120,124],snow:[238,242,250]},
  {water:[176,202,220],deep:[126,156,184],glint:[250,252,255],
   foliage:[30,70,58],foliageLit:[74,118,90],trunk:[80,60,48],
   wall:[140,96,64],roof:[84,74,76],rock:[124,128,138],snow:[246,248,252],
   bulbs:[[236,86,72],[244,196,92],[250,236,200]],star:[248,206,100],
   log:[112,78,52],logEnd:[204,168,118],sleigh:[176,42,40],trim:[214,172,80],deer:[126,88,58],antler:[206,184,146]}
];
/* u and depth are in the height field. Trees are [u, depth, scale]. Features stay right of the text. */
var climates=[
  {lake:{u:.72,d:.26,ru:.13,rd:.085,wobble:1,basin:1.2},knoll:{u:.85,d:.33},snow:.56,
    trees:[[.55,.30,.9],[.62,.14,.8],[.88,.155,1.1],[.93,.315,.95],[.66,.40,1.05],[.79,.41,.85],
      [.675,.16,1.15],[.745,.15,.95],[.80,.165,1.3]],
    cabin:{u:.85,d:.33},rocks:4},
  {ridges:true,lake:{u:.75,d:.235,ru:.085,rd:.07,wobble:.7,dark:true,basin:1.7},
    dish:{u:.90,d:.34},craters:[[.57,.22],[.95,.19],[.65,.42]],rocks:6},
  {snow:.62,
    trees:[[.61,.20,1.05],[.68,.29,1.4],[.74,.17,.85],[.79,.33,1.25],[.85,.22,1.15],[.89,.31,1.45],[.94,.24,.95],[.70,.36,1.15],[.64,.31,.9],[.91,.15,.75]],
    rocks:3},
  {lake:{u:.70,d:.26,ru:.16,rd:.085,wobble:.9,basin:1.2},knoll:{u:.90,d:.33},
    trees:[[.82,.40,1],[.95,.30,1.05],[.645,.165,1.2],[.72,.155,.95],[.775,.17,1.25]],
    cabin:{u:.90,d:.33,light:true},rocks:2},
  /* Experience: a snowed-in valley at Christmas. Snow down to the valley floor, a frozen lake,
     snow-capped pines, a cabin with a white roof, one pine strung with lights, and falling snow. */
  {lake:{u:.75,d:.235,ru:.16,rd:.07,wobble:.8,basin:1.5,frozen:true},relief:.9,snow:.1,snowy:true,snowfall:true,
    trees:[[.63,.15,1],[.685,.145,.85],[.735,.15,1.1],[.79,.14,.9],[.845,.15,1.05],[.895,.155,1.15],
      [.56,.36,1.2],[.605,.47,.95],[.845,.40,1.7,"lit"],[.945,.34,1]],
    cabin:{u:.76,d:.37},campfire:{u:.675,d:.415},sleigh:{u:.66,d:.07,lift:.55},rocks:3}
];
/* One sun for the whole site, placed by the visitor's local clock. Held fixed per render
   so the cached terrain and its baked face lighting stay valid between refreshes. */
var sun={};
function computeSun(now){
  var hour=now.getHours()+now.getMinutes()/60,angle=(hour-6)/12*Math.PI;
  /* One continuous arc: +1 overhead at noon, 0 at 6 and 18, -1 at midnight. A hard
     day/night branch made 17:59 golden and 18:00 midnight-blue. */
  var elevation=Math.sin(angle),horizon=Math.cos(angle);
  var daylight=ease((elevation+.2)/.34);              /* eases through twilight */
  var height=Math.abs(elevation);                     /* the moon arcs like the sun */
  var vector=[-.85*horizon,.28+.72*height,-.4],length=Math.hypot.apply(Math,vector);
  vector=vector.map(function(v){return v/length});
  var golden=daylight*Math.max(0,1-height/.45);       /* warm only when the sun is low */
  var warm=terrainColor([255,216,172],[255,146,92],golden*.55);
  return{vector:vector,elevation:elevation,hour:hour,daylight:daylight,golden:golden,
    progress:(1-horizon)/2,                           /* 0 east, 1 west */
    arc:height,
    tint:terrainColor([122,152,212],warm,daylight),
    amount:mix(.36,.05+golden*.3,daylight),
    exposure:mix(.7,.9+Math.max(0,elevation)*.2,daylight),
    shadowX:vector[0]<0?1:-1,
    shadowLen:1+(1-height)*1.5}}
sun=computeSun(new Date());
/* Per-page art lives in three arrays indexed by destination. A page added to M without
   entries here wraps to an existing one instead of throwing: one throw inside the animation
   callback kills the loop permanently and blanks the canvas. */
function perPage(list,planet){return list[((planet%list.length)+list.length)%list.length]}
function terrainNoise(x_,z_,seed){
  function hash(a,b){var n=Math.sin(a*127.1+b*311.7+seed*53.3)*43758.5453;return n-Math.floor(n)}
  var a=Math.floor(x_),b=Math.floor(z_),u=ease(x_-a),v=ease(z_-b);
  return mix(mix(hash(a,b),hash(a+1,b),u),mix(hash(a,b+1),hash(a+1,b+1),u),v)}
function ridgeHeight(u,depth,planet,climate){
  var n=0;
  for(var octave=0;octave<4;octave++)n+=terrainNoise(u*7*2**octave,depth*4*2**octave,planet+1)*(.53/2**octave);
  var ridge=Math.pow(n,1.45)*(1.1*Math.exp(-Math.pow((depth-.12)/.28,2))+.32);
  if(climate.relief)ridge*=climate.relief;
  if(climate.ridges){
    var left=Math.exp(-Math.pow((u-.64)/.09,2)),right=Math.exp(-Math.pow((u-.86)/.08,2));
    var pass=Math.exp(-Math.pow((u-.74)/.05,2))*Math.exp(-Math.pow((depth-.24)/.16,2));
    ridge*=(.55+left*.8+right*1.05)*(1-pass*.62)}
  /* Sink a bowl around the lake. Without it the water plane sits on a slope and reads
     as a sticker; with it the ground falls toward the shore on every side. */
  if(climate.lake){
    var spread=climate.lake.basin||1;
    var bu=(u-climate.lake.u)/(climate.lake.ru*spread),bd=(depth-climate.lake.d)/(climate.lake.rd*spread);
    var bowl=Math.exp(-(bu*bu+bd*bd)/2.3);
    ridge=Math.max(0,ridge*(1-bowl*.66)-bowl*.055)}
  return ridge}
/* Positive inside the shoreline. Lobes around the angle keep it off a plain ellipse. */
function lakeField(lake,planet,u,depth){
  var du=(u-lake.u)/lake.ru,dd=(depth-lake.d)/lake.rd,angle=Math.atan2(dd,du);
  var lobe=Math.sin(angle*2+planet*1.7)*.13+Math.sin(angle*3+planet*2.3)*.17+Math.sin(angle*5+planet*.8)*.08;
  return 1-du*du-dd*dd+lobe*lake.wobble}
/* Walk rays out from the middle to trace the shoreline, so the loop always closes. */
function lakeOutline(lake,planet){
  var points=[];
  for(var i=0;i<72;i++){
    var a=i/72*Math.PI*2,cu=Math.cos(a),cd=Math.sin(a),low=0,high=1.9;
    for(var step=0;step<18;step++){var mid=(low+high)/2;
      if(lakeField(lake,planet,lake.u+cu*lake.ru*mid,lake.d+cd*lake.rd*mid)>0)low=mid;else high=mid}
    points.push([lake.u+cu*lake.ru*low,lake.d+cd*lake.rd*low])}
  return points}
function terrainMesh(planet){
  if(terrainMeshes[planet])return terrainMeshes[planet];
  var cols=48,rows=22,climate=perPage(climates,planet),lake=climate.lake,vertices=[],faces=[],water=null;
  if(lake){
    var outline=lakeOutline(lake,planet),sum=0;
    outline.forEach(function(point){sum+=ridgeHeight(point[0],point[1],planet,climate)});
    water={outline:outline,level:sum/outline.length}}
  for(var row=0;row<=rows;row++)for(var col=0;col<=cols;col++){
    var u=col/cols,depth=Math.pow(row/rows,1.6),height=ridgeHeight(u,depth,planet,climate),flooded=false;
    /* Flood a little inside the traced shore so no grid step pokes out past the water polygon. */
    if(water&&lakeField(lake,planet,u,depth)>.1){flooded=true;height=water.level}
    else{
      if(water){
        var field=lakeField(lake,planet,u,depth),band=1.4;
        if(field>-band){var out=Math.min(1,-field/band),rim=water.level+.075*out;
          if(height<rim)height=mix(height,rim,1-out*out*.55)}}
      if(climate.knoll){
        var dist=Math.hypot((u-climate.knoll.u)/.055,(depth-climate.knoll.d)/.045);
        height+=Math.exp(-dist*dist)*.2}}
    vertices.push({u:u,depth:depth,height:height,water:flooded})}
  function face(a,b,c){
    var va=vertices[a],vb=vertices[b],vc=vertices[c];
    var ab=[(vb.u-va.u)*12,(vb.height-va.height)*2,(vb.depth-va.depth)*8];
    var ac=[(vc.u-va.u)*12,(vc.height-va.height)*2,(vc.depth-va.depth)*8];
    var normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    if(normal[1]<0)normal=normal.map(function(value){return-value});
    var length=Math.hypot.apply(Math,normal)||1;
    var light=Math.max(0,(normal[0]*sun.vector[0]+normal[1]*sun.vector[1]+normal[2]*sun.vector[2])/length);
    var water=[a,b,c].every(function(i){return vertices[i].water});
    faces.push({indices:[a,b,c],light:light,depth:(va.depth+vb.depth+vc.depth)/3,height:(va.height+vb.height+vc.height)/3,water:water})}
  for(var row=0;row<rows;row++)for(var col=0;col<cols;col++){
    var a=row*(cols+1)+col,b=a+1,c=a+cols+1,d=c+1;
    if((col+row)%2){face(a,c,b);face(b,c,d)}else{face(a,c,d);face(a,d,b)}}
  return terrainMeshes[planet]={vertices:vertices,faces:faces,cols:cols,rows:rows,lake:water}}
function sampleTerrain(mesh,u,depth){
  var col=Math.max(0,Math.min(mesh.cols-.001,u*mesh.cols)),row=Math.max(0,Math.min(mesh.rows-.001,mesh.rows*Math.pow(Math.max(depth,0),1/1.6)));
  var c0=Math.floor(col),r0=Math.floor(row),cu=col-c0,rv=row-r0;
  function at(r,c){return mesh.vertices[r*(mesh.cols+1)+c]}
  var h00=at(r0,c0),h10=at(r0,c0+1),h01=at(r0+1,c0),h11=at(r0+1,c0+1);
  return{height:mix(mix(h00.height,h10.height,cu),mix(h01.height,h11.height,cu),rv),water:[h00,h10,h01,h11].filter(function(v){return v.water}).length>=2}}
function terrainColor(a,b,t){return a.map(function(value,i){return mix(value,b[i],t)})}
function terrainRGB(color){return "rgb("+color.map(function(v){return Math.max(0,Math.min(255,Math.round(v)))}).join(",")+")"}
/* Null for anything that is not a hex color, so the caller can fall back to the raw value. */
function hexRGB(value){
  var h=String(value).replace(/[^0-9a-f]/gi,"");
  if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  if(h.length!==6)return null;
  var n=parseInt(h,16);
  return isFinite(n)?[n>>16&255,n>>8&255,n&255]:null}
function paintSurface(ctx,p,r,area){
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
  var distant=ease((view.amount-.22)/.46),reveal=ease((view.amount-.32)/.48),
      detail=ease((view.amount-.48)/.42),settle=ease(Math.min(1,view.amount/.58));
  var art=artOf(view.planet),palette=perPage(terrainPalettes,art);
  var nature=perPage(naturePalettes,art);
  var dark=/^#[0-3]/i.test(C.bg),brightness=dark?.5:1,alphaScale=1,mirrored=false;
  waterSurface=null;chimneys=[];lights=[];stars=[];snowfall=null;fires=[];sleigh=null;
  /* Night drains warmth as well as light. Turning down one dial alone left the land
     looking like daytime pasted on a black sky. */
  function lit(color){
    var out=terrainColor(color,sun.tint,sun.amount).map(function(v){return v*brightness*sun.exposure});
    return dark?terrainColor(out,[28,38,60],.26):out}
  /* Distant props wash toward the same haze the terrain uses, so they sit in the air. */
  function aerial(color,depth){return terrainColor(color,palette.haze,Math.max(0,.34-depth*.7))}
  function ring(points){ctx.beginPath();points.forEach(function(q,i){if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1])});ctx.closePath()}
  /* The approaching planet fades from the accent to the color of its own ground, so the
     terrain resolves out of a matching silhouette rather than crossfading over blue. */
  var accent=hexRGB(C.accent),ground=lit(terrainColor(palette.shadow,palette.soil,.5));
  var discTone=accent?terrainColor(accent,ground,settle):ground;
  ctx.globalAlpha=1;ctx.fillStyle=terrainRGB(discTone);
  ctx.beginPath();ctx.arc(p[0],p[1],r,0,Math.PI*2);ctx.fill();
  if(distant>0){
    var amplitude=Math.min(230,area.height*.39)*reveal,pan=Math.sin(view.pan)*18;
    var farAmplitude=Math.min(230,area.height*.39)*distant;
    function rim(px){var dx=px-p[0];return p[1]-Math.sqrt(Math.max(0,r*r-dx*dx))}
    function side(u){return .22+.78*ease((u-.12)/.5)}
    /* Softer distant ranges disappear into atmospheric color. No panel-shaped clipping. */
    for(var range=0;range<3;range++){
      var tint=terrainColor(palette.haze,palette.shadow,.08+range*.18);
      if(dark)tint=terrainColor(tint,[15,22,34],.52);
      if(distant<1)tint=terrainColor(discTone,tint,distant);
      ctx.globalAlpha=1;ctx.fillStyle=terrainRGB(tint);ctx.beginPath();ctx.moveTo(-W*.2,H+50);
      for(var step=0;step<=90;step++){
        var u=-.2+step/90*1.4,px=u*W+pan*(.1+range*.1);
        var n=terrainNoise(u*12+range*2,.35,art+range+3)*.65+terrainNoise(u*29,range,art+4)*.35;
        ctx.lineTo(px,rim(px)-farAmplitude*(.22+range*.09)*n*side(u)+range*12)}
      ctx.lineTo(W*1.2,H+50);ctx.closePath();ctx.fill()}
    var mesh=terrainMesh(art),climate=perPage(climates,art);
    function project(u,depth,height){
      var px=W*.5+(u*W-W*.5)*(1+depth*.22)+pan*(.3+depth);
      return[px,rim(px)+(H-rim(px)+130)*depth-height*amplitude*(1-depth*.25)*side(u)]}
    var projected=mesh.vertices.map(function(v){return project(v.u,v.depth,v.height)});
    var unit=Math.max(.5,Math.min(1.45,W/1280));
    var lakeTone=lit(nature.water),lakeDeep=lit(nature.deep);
    if(climate.lake&&climate.lake.dark)lakeTone=terrainColor(lakeTone,lakeDeep,.28);
    ctx.globalAlpha=1;
    mesh.faces.forEach(function(face){
      var color;
      if(face.water)color=lakeTone;
      else{
        color=terrainColor(palette.shadow,palette.soil,.3+face.light*.7);
        color=terrainColor(color,palette.light,Math.max(0,face.light-.45)*.7);
        /* Snow settles on the high faces and catches more light than the rock under it. */
        if(climate.snow){
          var cap=Math.min(1,Math.max(0,(face.height-climate.snow)/.2));
          if(cap>0)color=terrainColor(color,terrainColor(nature.snow,palette.haze,.14),cap*(.3+face.light*.62))}
        color=terrainColor(color,palette.haze,Math.pow(1-face.depth,3)*.28);
        color=lit(color)}
      /* Resolve each facet out of the disc's own color. Fading the mesh with alpha let every
         shared edge blend twice, so the triangulation showed through as a wireframe. */
      if(reveal<1)color=terrainColor(discTone,color,reveal);
      ctx.fillStyle=terrainRGB(color);ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.9;
      ctx.beginPath();face.indices.forEach(function(index,i){var q=projected[index];if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1])});
      ctx.closePath();ctx.fill();ctx.stroke()});
    /* Water is one flat plane on the traced shoreline, so the edge is not a staircase of facets. */
    if(mesh.lake){
      var level=mesh.lake.level;
      var shore=mesh.lake.outline.map(function(point){return project(point[0],point[1],level)});
      var lakeTop=Infinity,lakeBottom=-Infinity,lakeLeft=Infinity,lakeRight=-Infinity;
      shore.forEach(function(q){lakeTop=Math.min(lakeTop,q[1]);lakeBottom=Math.max(lakeBottom,q[1]);
        lakeLeft=Math.min(lakeLeft,q[0]);lakeRight=Math.max(lakeRight,q[0])});
      /* Far water is deep and dark, near water picks up the sky. One gradient along the
         view direction, not a concentric ring. */
      var fill=ctx.createLinearGradient(0,lakeTop,0,lakeBottom);
      fill.addColorStop(0,terrainRGB(reveal<1?terrainColor(discTone,lakeDeep,reveal):lakeDeep));
      fill.addColorStop(1,terrainRGB(reveal<1?terrainColor(discTone,lakeTone,reveal):lakeTone));
      ctx.globalAlpha=1;ctx.fillStyle=fill;ring(shore);ctx.fill();
      ctx.globalAlpha=reveal*.55;ctx.lineWidth=1.3;
      ctx.strokeStyle=terrainRGB(terrainColor(lakeDeep,[0,0,0],.3));ring(shore);ctx.stroke();
      waterSurface={shore:shore,top:lakeTop,bottom:lakeBottom,left:lakeLeft,right:lakeRight,
        glint:terrainRGB(lit(nature.glint)),reveal:reveal,planet:art}}
    function propScale(depth){return unit*(.6+depth*1.25)}
    function ground(u,depth){
      var sample=sampleTerrain(mesh,u,depth),wet=sample.water;
      /* Keep props off the water and off the bank that rings it. */
      if(climate.lake&&lakeField(climate.lake,art,u,depth)>-.1)wet=true;
      return{at:project(u,depth,sample.height),water:wet,depth:depth}}
    function occupied(u,depth){
      var spots=(climate.trees||[]).map(function(tree){return[tree[0],tree[1]]});
      if(climate.cabin)spots.push([climate.cabin.u,climate.cabin.d]);
      if(climate.dish)spots.push([climate.dish.u,climate.dish.d]);
      if(climate.campfire)spots.push([climate.campfire.u,climate.campfire.d]);
      return spots.some(function(spot){return Math.hypot((u-spot[0])/.05,(depth-spot[1])/.05)<1.15})}
    /* Rocks sit on the mesh. Craters stay on the worked planet. Light comes from the left. */
    var drawn=0;
    for(var rock=0;drawn<(climate.rocks||0)&&rock<28;rock++){
      var u=.55+((rock*37)%41)/100,depth=.34+(rock%5)*.05;
      if(occupied(u,depth))continue;
      var spot=ground(u,depth);if(spot.water)continue;drawn++;
      var px=spot.at[0],py=spot.at[1],size=(4+rock%5*2)*propScale(depth);
      contactShadow(px,py,size*1.6,size*.4,-.15);
      ctx.globalAlpha=detail*alphaScale;ctx.fillStyle=terrainRGB(lit(aerial(terrainColor(nature.rock,[236,238,240],.3),depth)));
      ctx.beginPath();ctx.moveTo(px-size,py);ctx.lineTo(px-size*.3,py-size);ctx.lineTo(px+size*.55,py-size*.65);ctx.lineTo(px+size,py);ctx.closePath();ctx.fill();
      ctx.fillStyle=terrainRGB(lit(aerial(terrainColor(nature.rock,[26,28,34],.34),depth)));
      ctx.beginPath();ctx.moveTo(px,py-size*.8);ctx.lineTo(px+size*.55,py-size*.65);ctx.lineTo(px+size,py);ctx.lineTo(px,py+1);ctx.closePath();ctx.fill()}
    (climate.craters||[]).forEach(function(crater,index){
      var spot=ground(crater[0],crater[1]);if(spot.water)return;
      var px=spot.at[0],py=spot.at[1],rx=Math.max(7,W*(.009+index*.0035))*unit;
      ctx.globalAlpha=detail*.5;
      ctx.fillStyle=terrainRGB(lit(terrainColor(palette.shadow,palette.soil,.32)));
      ctx.beginPath();ctx.ellipse(px,py,rx,rx*.26,-.08,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=detail*.45;
      ctx.strokeStyle=terrainRGB(lit(terrainColor(palette.soil,palette.light,.5)));
      ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(px,py,rx+1,rx*.28,-.08,Math.PI,Math.PI*2);ctx.stroke()});
    /* Shadows fall away from the sun and stretch as it drops. A reflection casts none. */
    function contactShadow(x0,y0,width,height,tilt){
      if(mirrored)return;
      ctx.globalAlpha=detail*.2*alphaScale;ctx.fillStyle=terrainRGB(palette.shadow);
      ctx.beginPath();ctx.ellipse(x0+width*sun.shadowX*sun.shadowLen*.55,y0+1.5,
        width*(.7+sun.shadowLen*.45),height,tilt*sun.shadowX,0,Math.PI*2);ctx.fill()}
    function facet(points,color){
      ctx.fillStyle=terrainRGB(color);ctx.beginPath();
      points.forEach(function(q,i){if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1])});
      ctx.closePath();ctx.fill()}
    function drawTree(origin,scale,depth,lean,strung){
      var x0=origin[0],y0=origin[1],h=Math.max(13,(18+scale*17)*propScale(depth)),w=Math.max(4.5,h*.3);
      var tip=x0+lean*w*.45;
      contactShadow(x0,y0,w*1.25,w*.3,-.18);
      ctx.globalAlpha=detail*alphaScale;
      facet([[x0-w*.12,y0],[x0-w*.07,y0-h*.3],[x0+w*.11,y0-h*.3],[x0+w*.16,y0]],
        lit(aerial(nature.trunk,depth)));
      [[.30,.72,1],[.54,.90,.72],[.76,1,.44]].forEach(function(tier,i){
        if(scale<.8&&i===2)return;
        var yb=y0-h*tier[0],yt=y0-h*tier[1],hw=w*tier[2];
        /* Upper tiers catch more sun. Left faces are lit, right faces fall into shade. */
        var base=terrainColor(nature.foliage,nature.foliageLit,i*.2);
        facet([[x0-hw,yb],[tip,yt],[tip,yb]],lit(aerial(terrainColor(base,nature.foliageLit,.34),depth)));
        facet([[tip,yb],[tip,yt],[x0+hw,yb]],lit(aerial(terrainColor(base,[16,28,22],.36),depth)));
        /* Snow sits on the upper half of each tier, bright on the lit side, blue-gray in shade. */
        if(climate.snowy){var mid=yt+(yb-yt)*.5,reach=hw*.5;
          facet([[tip-reach,mid],[tip,yt],[tip,mid+(yb-yt)*.08]],lit(aerial(nature.snow,depth)));
          facet([[tip,mid+(yb-yt)*.08],[tip,yt],[tip+reach,mid]],lit(aerial(terrainColor(nature.snow,palette.shadow,.3),depth)))}
        /* A strung tree leaves its bulbs to the live layer so they can twinkle. */
        if(strung&&!mirrored)for(var b=0;b<5-i;b++){var f=(b+.5)/(5-i),along=yb-(yb-yt)*.18;
          lights.push({at:[mix(x0-hw*.82,x0+hw*.82,f),along+Math.sin(f*Math.PI)*hw*.12],size:Math.max(1.5,w*.1),
            color:terrainRGB(nature.bulbs[(b+i)%nature.bulbs.length]),seed:b*3.1+i*1.7,reveal:detail})}});
      if(strung&&!mirrored)stars.push({at:[tip,y0-h*1.04],size:Math.max(3,w*.28),color:terrainRGB(nature.star),reveal:detail})}
    /* A fire ring of stones, two crossed logs in it, and three seat logs around it with snow on
       top. The flames themselves are live (drawLiveSurface) so they can flicker and throw sparks. */
    function drawCampfire(origin,depth){
      var x0=origin[0],y0=origin[1],s=propScale(depth),ring=9*s;
      contactShadow(x0,y0,ring*1.4,ring*.3,0);
      ctx.globalAlpha=detail*alphaScale;
      function seat(cx,cy,len,tilt){
        var th=3.4*s,dx=Math.cos(tilt)*len/2,dy=Math.sin(tilt)*len/2;
        contactShadow(cx,cy+th*.5,len*.55,th*.45,tilt);ctx.globalAlpha=detail*alphaScale;
        facet([[cx-dx,cy-dy-th],[cx+dx,cy+dy-th],[cx+dx,cy+dy],[cx-dx,cy-dy]],lit(aerial(nature.log,depth)));
        facet([[cx-dx,cy-dy],[cx+dx,cy+dy],[cx+dx,cy+dy+th*.35],[cx-dx,cy-dy+th*.35]],lit(aerial(terrainColor(nature.log,[20,14,12],.45),depth)));
        facet([[cx-dx,cy-dy-th],[cx+dx,cy+dy-th],[cx+dx,cy+dy-th*1.35],[cx-dx,cy-dy-th*1.35]],lit(aerial(nature.snow,depth)));
        ctx.fillStyle=terrainRGB(lit(aerial(nature.logEnd,depth)));ctx.beginPath();
        ctx.ellipse(cx-dx,cy-dy-th*.5,th*.32,th*.55,0,0,Math.PI*2);ctx.fill()}
      /* Seats behind the fire first, then the ring, then the seat in front. */
      seat(x0-ring*2.1,y0-ring*.55,ring*1.7,.18);seat(x0+ring*2.2,y0-ring*.35,ring*1.6,-.22);
      for(var k=0;k<9;k++){var a=k/9*Math.PI*2,sx=x0+Math.cos(a)*ring,sy=y0+Math.sin(a)*ring*.34;
        ctx.fillStyle=terrainRGB(lit(aerial(terrainColor(nature.rock,k%2?[236,238,240]:[30,32,36],.28),depth)));
        ctx.beginPath();ctx.ellipse(sx,sy,s*2.2,s*1.4,0,0,Math.PI*2);ctx.fill()}
      facet([[x0-ring*.7,y0+s],[x0+ring*.55,y0-s*2.6],[x0+ring*.7,y0-s*1.2],[x0-ring*.55,y0+s*2.2]],lit(aerial(terrainColor(nature.log,[20,14,12],.3),depth)));
      facet([[x0+ring*.7,y0+s],[x0-ring*.55,y0-s*2.6],[x0-ring*.7,y0-s*1.2],[x0+ring*.55,y0+s*2.2]],lit(aerial(nature.log,depth)));
      seat(x0+ring*.4,y0+ring*1.35,ring*1.8,.06);
      if(!mirrored)fires.push({at:[x0,y0-s*.8],size:ring*1.15,reveal:detail})}
    function drawCabin(origin,depth,lamp){
      var x0=origin[0],y0=origin[1],s=propScale(depth);
      var w=Math.max(26,44*s),h=w*.4,roof=w*.34,eave=w*.11;
      contactShadow(x0,y0,w*.62,w*.14,0);
      ctx.globalAlpha=detail*alphaScale;
      facet([[x0-w*.4,y0],[x0+w*.4,y0],[x0+w*.4,y0-h],[x0-w*.4,y0-h]],
        lit(aerial(terrainColor(nature.wall,[252,238,214],.22),depth)));
      facet([[x0+w*.16,y0],[x0+w*.4,y0],[x0+w*.4,y0-h],[x0+w*.16,y0-h]],
        lit(aerial(terrainColor(nature.wall,[28,22,24],.38),depth)));
      facet([[x0-w*.4-eave,y0-h],[x0+w*.4+eave,y0-h],[x0+w*.12,y0-h-roof],[x0-w*.2,y0-h-roof]],
        lit(aerial(climate.snowy?nature.snow:terrainColor(nature.roof,[236,238,244],.26),depth)));
      facet([[x0+w*.4+eave,y0-h],[x0+w*.12,y0-h-roof],[x0+w*.3,y0-h-roof*.45]],
        lit(aerial(climate.snowy?terrainColor(nature.snow,palette.shadow,.32):terrainColor(nature.roof,[20,18,22],.35),depth)));
      facet([[x0-w*.13,y0-h-roof*.9],[x0-w*.03,y0-h-roof*.9],[x0-w*.03,y0-h-roof*1.42],[x0-w*.13,y0-h-roof*1.42]],
        lit(aerial(terrainColor(nature.rock,[30,26,28],.3),depth)));
      facet([[x0-w*.3,y0],[x0-w*.15,y0],[x0-w*.15,y0-h*.58],[x0-w*.3,y0-h*.58]],lit(terrainColor(nature.trunk,[16,14,18],.5)));
      if(!mirrored)chimneys.push({at:[x0-w*.08,y0-h-roof*1.45],size:Math.max(3,w*.08),reveal:detail,
        color:terrainRGB(dark?[128,134,150]:[228,231,238])});
      var glow=lamp?[232,168,80]:lit(terrainColor(nature.roof,[12,14,18],.4));
      if(lamp&&dark)glow=glow.map(function(v){return v*.9});
      facet([[x0-w*.04,y0-h*.74],[x0+w*.1,y0-h*.74],[x0+w*.1,y0-h*.44],[x0-w*.04,y0-h*.44]],glow)}
    function drawDish(origin,depth){
      var x0=origin[0],y0=origin[1],s=Math.max(20,36*propScale(depth));
      contactShadow(x0,y0,s*.5,s*.13,0);
      ctx.globalAlpha=detail*alphaScale;
      facet([[x0-s*.1,y0],[x0+s*.1,y0],[x0+s*.05,y0-s*.62],[x0-s*.05,y0-s*.62]],
        lit(aerial(terrainColor(nature.rock,[24,26,30],.34),depth)));
      ctx.save();ctx.translate(x0,y0-s*.72);ctx.rotate(-.5);
      ctx.fillStyle=terrainRGB(lit(aerial(terrainColor(nature.rock,[248,250,252],.5),depth)));
      ctx.beginPath();ctx.ellipse(0,0,s*.62,s*.24,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=terrainRGB(lit(aerial(terrainColor(nature.rock,[30,32,38],.3),depth)));
      ctx.lineWidth=Math.max(1.2,s*.05);ctx.beginPath();ctx.ellipse(0,0,s*.62,s*.24,0,0,Math.PI);ctx.stroke();
      ctx.fillStyle=terrainRGB(lit(aerial(terrainColor(nature.rock,[22,24,28],.45),depth)));
      ctx.beginPath();ctx.ellipse(0,0,s*.1,s*.1,0,0,Math.PI*2);ctx.fill();
      ctx.restore()}
    var props=[];
    (climate.trees||[]).forEach(function(tree,i){var spot=ground(tree[0],tree[1]);
      if(!spot.water)props.push({depth:tree[1],origin:spot.at,draw:function(){
        drawTree(spot.at,tree[2],tree[1],((i*7)%5-2)*.3,tree[3]==="lit")}})});
    if(climate.cabin){var cabinSpot=ground(climate.cabin.u,climate.cabin.d);
      if(!cabinSpot.water)props.push({depth:climate.cabin.d,origin:cabinSpot.at,draw:function(){drawCabin(cabinSpot.at,climate.cabin.d,!!climate.cabin.light)}})}
    if(climate.campfire){var fireSpot=ground(climate.campfire.u,climate.campfire.d);
      if(!fireSpot.water)props.push({depth:climate.campfire.d,origin:fireSpot.at,draw:function(){drawCampfire(fireSpot.at,climate.campfire.d)}})}
    /* The sleigh flies in front of the far range: placed over the mountain face, drawn live. */
    if(climate.sleigh){var sl=climate.sleigh,under=sampleTerrain(mesh,sl.u,sl.d).height;
      sleigh={at:project(sl.u,sl.d,under*sl.lift),size:Math.max(32,60*unit),reveal:detail,
        body:terrainRGB(lit(nature.sleigh)),shade:terrainRGB(lit(terrainColor(nature.sleigh,[20,10,10],.4))),
        trim:terrainRGB(lit(nature.trim)),deer:terrainRGB(lit(nature.deer)),
        deerShade:terrainRGB(lit(terrainColor(nature.deer,[20,14,10],.35))),antler:terrainRGB(lit(nature.antler))}}
    if(climate.dish){var dishSpot=ground(climate.dish.u,climate.dish.d);
      if(!dishSpot.water)props.push({depth:climate.dish.d,origin:dishSpot.at,draw:function(){drawDish(dishSpot.at,climate.dish.d)}})}
    props.sort(function(a,b){return a.depth-b.depth});
    /* Mirror whatever stands behind the lake into it, squashed and dimmed, clipped to the
       shoreline. Flip about the waterline under each prop rather than the prop's own base:
       a tree set back from the shore still has to break the surface at the shore. */
    if(waterSurface){
      var shorePoints=waterSurface.shore,reach=(waterSurface.right-waterSurface.left)*.14;
      var shoreTopAt=function(px){
        var best=Infinity;
        shorePoints.forEach(function(q){if(Math.abs(q[0]-px)<reach)best=Math.min(best,q[1])});
        return best===Infinity?waterSurface.top:best};
      ctx.save();ring(shorePoints);ctx.clip();
      mirrored=true;alphaScale=climate.lake.frozen?.22:.46;
      props.forEach(function(prop){
        var px=prop.origin[0],axis=shoreTopAt(px);
        if(px<waterSurface.left-reach||px>waterSurface.right+reach)return;
        if(prop.origin[1]>axis)return;                    /* standing in front of the water */
        ctx.save();ctx.translate(0,axis);ctx.scale(1,-.62);ctx.translate(0,-axis);
        prop.draw();ctx.restore()});
      mirrored=false;alphaScale=1;ctx.restore()}
    props.forEach(function(prop){prop.draw()});
    /* Starship's landing site: the flattest dry patch right of the text. It prefers the open middle foreground,
       not a far ridge. The first pass wants it well back from the painted shoreline and clear of every prop the upright ship would stand in
       front of; each later pass drops one wish, so a crowded world still gets a pad. */
    var pad=null;
    for(var strict=2;!pad&&strict>=0;strict--)for(var pu=.6;pu<=.94;pu+=.02)for(var pd=.2;pd<=.47;pd+=.03){
      if(occupied(pu,pd)||(climate.lake&&lakeField(climate.lake,art,pu,pd)>(strict?-.45:-.1)))continue;var spotted=ground(pu,pd);if(spotted.water)continue;
      if(strict>1&&waterSurface&&waterSurface.shore.some(function(q){return Math.hypot((q[0]-spotted.at[0])*.6,q[1]-spotted.at[1])<30*unit}))continue;
      if(strict>0&&props.some(function(prop){return Math.abs(prop.origin[0]-spotted.at[0])<42*unit&&Math.abs(prop.origin[1]-spotted.at[1])<70*unit}))continue;
      var slope=Math.abs(sampleTerrain(mesh,pu+.02,pd).height-sampleTerrain(mesh,pu-.02,pd).height)+
        Math.abs(sampleTerrain(mesh,pu,pd+.03).height-sampleTerrain(mesh,pu,pd-.03).height),rank=slope+Math.abs(pu-.74)*.04+Math.abs(pd-.39)*.3;
      if(!pad||rank<pad.rank)pad={rank:rank,at:spotted.at}}
    if(pad)landingSite={at:pad.at,planet:view.planet};
    if(climate.snowfall)snowfall={left:area.left,top:area.top,width:W-area.left,height:H-area.top,reveal:distant};
  }ctx.restore()}
/* Shimmer and smoke ride on top of the cached terrain, so the scene keeps breathing
   without repainting thousands of facets. Reduced motion freezes both at t=0. */
function dark_(){return/^#[0-3]/i.test(C.bg)}
function drawLiveSurface(ctx){
  var time=rm?0:tt;
  /* Same viewport clip the cached layer gets. Mid-approach the terrain is projected well
     below the fold, and smoke drawn from it would otherwise escape the frame. */
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
  if(waterSurface&&waterSurface.reveal>0){
    var w=waterSurface,span=w.right-w.left,drop=w.bottom-w.top;
    ctx.save();ctx.beginPath();
    w.shore.forEach(function(q,i){if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1])});
    ctx.closePath();ctx.clip();ctx.fillStyle=w.glint;
    for(var g=0;g<4;g++){
      var jitter=terrainNoise(g*3.7+1.3,w.planet*2.1,w.planet+9);
      var breathe=Math.sin(time*.5+g*1.9)*.5+.5;
      var gy=w.top+drop*(.34+g*.16+jitter*.05);
      var gw=span*(.16+jitter*.24)*(.72+breathe*.46);
      var gx=w.left+span*(.14+jitter*.46)+Math.sin(time*.28+g*2.3)*span*.025;
      ctx.globalAlpha=w.reveal*(.15-g*.026)*(.5+breathe*.5);
      ctx.beginPath();ctx.ellipse(gx+gw/2,gy,Math.max(2,gw/2),Math.max(.6,drop*.012),0,0,Math.PI*2);ctx.fill()}
    ctx.restore()}
  /* Bulbs breathe out of step with each other; the star holds steady. They keep their own
     warm color in the dark, like the Contact lamp. */
  lights.forEach(function(l){
    ctx.globalAlpha=l.reveal*(.55+.45*Math.sin(time*2.2+l.seed*2.4));ctx.fillStyle=l.color;
    ctx.beginPath();ctx.arc(l.at[0],l.at[1],l.size,0,Math.PI*2);ctx.fill()});
  stars.forEach(function(st){
    ctx.globalAlpha=st.reveal;ctx.fillStyle=st.color;ctx.beginPath();
    for(var k=0;k<10;k++){var a=-Math.PI/2+k*Math.PI/5,r=k%2?st.size*.45:st.size;
      ctx.lineTo(st.at[0]+Math.cos(a)*r,st.at[1]+Math.sin(a)*r)}
    ctx.closePath();ctx.fill()});
  /* Falling snow, over the scene side only so it never crosses the text. Flakes are pale with a
     faint dim rim, so they still read against the light-mode sky. */
  if(snowfall&&snowfall.reveal>0){var sf=snowfall;
    for(var f=0;f<90;f++){
      var fx=terrainNoise(f*1.37,.5,21),fy=terrainNoise(f*2.11,1.5,22),near=f%3===0;
      var fall=(fy+time*(near?.07:.04)*(.8+fx*.4))%1;
      var px=sf.left+((fx*1.3+Math.sin(time*.5+f)*.012+fall*.05)%1)*sf.width,py=sf.top+fall*sf.height;
      ctx.globalAlpha=sf.reveal*(near?.9:.6)*Math.min(1,fall*10,(1-fall)*10);
      ctx.beginPath();ctx.arc(px,py,near?1.9:1.2,0,Math.PI*2);
      ctx.fillStyle="#fff";ctx.fill();
      if(!dark_()){ctx.globalAlpha*=.35;ctx.strokeStyle=C.dim;ctx.lineWidth=.6;ctx.stroke()}}}
  /* The fire keeps its own warm color at any hour. Flames are three tongues whose height comes
     from fast noise, so they jump rather than breathe; sparks pop off in short bursts and rise. */
  fires.forEach(function(fire){
    var bx=fire.at[0],by=fire.at[1],S=fire.size,a=fire.reveal;
    var flick=terrainNoise(time*7,.3,40);
    ctx.globalAlpha=a*(.14+.08*flick);ctx.fillStyle="rgb(255,168,80)";
    ctx.beginPath();ctx.ellipse(bx,by+S*.25,S*2.4,S*.8,0,0,Math.PI*2);ctx.fill();
    function tongue(ox,h,w,sway,color,alpha){
      ctx.globalAlpha=a*alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(bx+ox-w,by);
      ctx.quadraticCurveTo(bx+ox-w*.9,by-h*.55,bx+ox+sway,by-h);
      ctx.quadraticCurveTo(bx+ox+w*.9,by-h*.55,bx+ox+w,by);ctx.closePath();ctx.fill()}
    for(var k=0;k<3;k++){
      var n=terrainNoise(time*9+k*3.1,k,31),h=S*(1.5-Math.abs(k-1)*.5)*(.7+n*.55),sway=Math.sin(time*7+k*2)*S*.14;
      tongue((k-1)*S*.3,h,S*.3,sway,"rgb(232,98,38)",.95);
      tongue((k-1)*S*.24,h*.62,S*.19,sway*.7,"rgb(250,180,70)",1);
      if(k===1)tongue(0,h*.32,S*.1,sway*.4,"rgb(255,238,180)",1)}
    var burst=Math.floor(time*1.6),since=time*1.6-burst;
    for(var sp=0;sp<12;sp++){
      var hx=terrainNoise(sp*1.7,burst*.37,41)-.5,life=(time*(.55+sp%4*.12)+sp*.29)%1;
      var popping=sp<4&&since<.35,u=popping?since/.35:life;
      var px=bx+hx*S*(popping?2.2:.8)+Math.sin(u*7+sp)*S*.25,py=by-S*.7-u*S*(popping?1.6:3.4);
      ctx.globalAlpha=a*(1-u)*(popping?1:.7);ctx.fillStyle=sp%3?"rgb(255,196,96)":"rgb(255,236,190)";
      ctx.beginPath();ctx.arc(px,py,popping?1.3:.9,0,Math.PI*2);ctx.fill()}});
  /* Sleigh and two reindeer, small, gliding in front of the mountain. Legs gallop, the whole
     team bobs, and it drifts slowly back and forth along the range. */
  if(sleigh&&sleigh.reveal>0){var sg=sleigh,L=sg.size;
    var sx=sg.at[0]+Math.sin(time*.11)*L*1.6,sy=sg.at[1]+Math.sin(time*.55)*L*.09;
    ctx.save();ctx.translate(sx,sy);ctx.rotate(-.07+Math.cos(time*.55)*.03);ctx.scale(L,L);ctx.globalAlpha=sg.reveal;
    function poly(points,color){ctx.fillStyle=color;ctx.beginPath();
      points.forEach(function(q,i){if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1])});ctx.closePath();ctx.fill()}
    function line(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";ctx.beginPath();
      points.forEach(function(q,i){if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1])});ctx.stroke()}
    line([[-.19,-.07],[.02,-.11]],sg.antler,.008);line([[.12,-.1],[.3,-.12]],sg.antler,.008);
    ctx.fillStyle=sg.shade;ctx.beginPath();ctx.arc(-.43,-.2,.055,Math.PI,0);ctx.fill();
    poly([[-.52,-.02],[-.5,-.24],[-.44,-.25],[-.4,-.14],[-.2,-.12],[-.16,-.03]],sg.body);
    poly([[-.52,-.02],[-.16,-.03],[-.17,-.07],[-.51,-.07]],sg.shade);
    line([[-.52,-.05],[-.17,-.06]],sg.trim,.012);
    line([[-.46,-.02],[-.46,.03]],sg.trim,.01);line([[-.24,-.03],[-.24,.03]],sg.trim,.01);
    line([[-.55,.03],[-.2,.035],[-.15,.02],[-.14,-.02]],sg.trim,.016);
    [[.08,0],[.36,1]].forEach(function(r){
      var cx=r[0],swing=Math.sin(time*7+r[1]*1.3)*.035;
      line([[cx-.06,-.08],[cx-.08-swing,-.01]],sg.deerShade,.013);line([[cx+.05,-.08],[cx+.09+swing,-.02]],sg.deerShade,.013);
      ctx.fillStyle=sg.deer;ctx.beginPath();ctx.ellipse(cx,-.1,.08,.032,-.05,0,Math.PI*2);ctx.fill();
      poly([[cx+.05,-.12],[cx+.09,-.17],[cx+.11,-.16],[cx+.08,-.1]],sg.deer);
      ctx.beginPath();ctx.ellipse(cx+.115,-.172,.028,.016,-.2,0,Math.PI*2);ctx.fill();
      line([[cx-.03,-.08],[cx-.05+swing,-.01]],sg.deer,.013);line([[cx+.03,-.08],[cx+.06-swing,-.01]],sg.deer,.013);
      line([[cx+.1,-.185],[cx+.08,-.23],[cx+.06,-.24]],sg.antler,.008);line([[cx+.085,-.215],[cx+.11,-.235]],sg.antler,.007);
      if(r[1]){ctx.fillStyle="rgb(222,52,44)";ctx.beginPath();ctx.arc(cx+.142,-.175,.009,0,Math.PI*2);ctx.fill()}});
    ctx.restore()}
  chimneys.forEach(function(c){
    ctx.save();ctx.fillStyle=c.color;
    for(var i=0;i<8;i++){
      var u=(time*.13+i/8)%1,rise=u*c.size*4.4;
      var sway=Math.sin(u*3.4+i)*c.size*.55+u*c.size*1.3;
      ctx.globalAlpha=c.reveal*.24*(1-u)*Math.min(1,u*8);
      ctx.beginPath();ctx.arc(c.at[0]+sway,c.at[1]-rise,c.size*(.25+u*.85),0,Math.PI*2);ctx.fill()}
    ctx.restore()});
  ctx.restore()}
/* While a sub-page is read, the landscape folds into a globe that peeks out of the bottom-right
   corner: the clip circle shrinks from the whole screen onto it while the land scales toward it. */
/* The About spread is much wider than #panel, which is what the scene measures. Ask the
   visible section itself where it ends, so the sky planets can be kept clear of the text. */
function spreadOn(){return!!(root.classList&&root.classList.contains&&root.classList.contains("spread"))}
function spreadEdge(){
  if(!spreadOn()||!d.querySelector)return 0;
  var s=d.querySelector("#panel section.on");
  if(!s||!s.getBoundingClientRect)return 0;
  return s.getBoundingClientRect().right+18}
function readingGlobe(){
  var wide=W>=820||(W>=650&&H<=550),spread=spreadOn(),
    radius=wide?(spread?Math.min(W*.22,H*.34):Math.min(W,H)*.36):Math.min(W*.3,125);
  return{x:W-radius*.5,y:H-radius*.5,r:radius,ring:radius+(wide?60:42)}}
/* ── Worlds as windows ──────────────────────────────────────────────────────────────
   Every landscape is a circular window onto its own painted world, and every navigation is
   one continuous move of that window: out of the clicked planet's dot to the whole screen,
   down into the reading globe, or back into its dot in the orbit. The terrain is painted once
   per world into its own bitmap (paintWorld), so transitions move finished pictures instead of
   repainting thousands of facets a frame, and the world is recognisable the whole way in.
   All of it runs on critically damped springs, so any move can be interrupted mid-flight and
   carries its velocity into the next. */
var openings=[],worldCache={},worldOrder=[],WORLDS_KEPT=3,worldEpoch=0,lastArea=null;
/* A critically damped spring, stepped exactly for any dt: no overshoot from rest, no frame-rate
   dependence. omega sets the pace; about 6.6/omega seconds to settle. */
function spring(o,key,vel,target,omega,dt){
  if(!(dt<1e6)){o[key]=target;o[vel]=0;return}
  var x0=o[key]-target,v0=o[vel]||0,c=v0+omega*x0,e=Math.exp(-omega*dt);
  o[key]=target+(x0+c*dt)*e;o[vel]=(v0-omega*c*dt)*e;
  if(Math.abs(o[key]-target)<1e-4&&Math.abs(o[vel])<1e-3){o[key]=target;o[vel]=0}}
function paintWorld(planet,area){
  var key=[W,H,dpr,planet,C.bg,Math.round(view.pan*50),worldEpoch,Math.round(area.left),Math.round(area.top)].join(":"),w=worldCache[planet];
  if(w&&w.key===key){touchWorld(planet);return w}
  if(!w){var canvas=null;
    if(worldOrder.length>=WORLDS_KEPT){var gone=worldOrder.shift();canvas=worldCache[gone].canvas;delete worldCache[gone]}
    w=worldCache[planet]={canvas:canvas||d.createElement("canvas")}}
  touchWorld(planet);
  /* paintSurface draws the current planet and leaves its live plan in globals; paint this one
     as if it were current and settled, keep its plan with its bitmap, then put everything back. */
  var keep={planet:view.planet,amount:view.amount,water:waterSurface,chimneys:chimneys,lights:lights,stars:stars,
    snow:snowfall,fires:fires,sleigh:sleigh,site:landingSite};
  view.planet=planet;view.amount=1;landingSite=null;
  w.canvas.width=W*dpr;w.canvas.height=H*dpr;
  var ctx=w.canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
  paintSurface(ctx,[area.cx,area.horizon+area.radius],area.radius,area);
  w.live={water:waterSurface,chimneys:chimneys,lights:lights,stars:stars,snow:snowfall,fires:fires,sleigh:sleigh};
  w.site=landingSite;w.key=key;
  view.planet=keep.planet;view.amount=keep.amount;waterSurface=keep.water;chimneys=keep.chimneys;lights=keep.lights;
  stars=keep.stars;snowfall=keep.snow;fires=keep.fires;sleigh=keep.sleigh;landingSite=keep.site;
  return w}
function touchWorld(planet){var i=worldOrder.indexOf(planet);if(i>=0)worldOrder.splice(i,1);worldOrder.push(planet)}
function useWorld(w){var l=w.live;waterSurface=l.water;chimneys=l.chimneys;lights=l.lights;stars=l.stars;
  snowfall=l.snow;fires=l.fires;sleigh=l.sleigh;if(w.site)landingSite=w.site}
/* Hovering a destination paints its world while the browser is idle, so the click opens at once. */
function prewarm(planet){if(planet<0||!lastArea||worldCache[planet]||typeof requestIdleCallback!=="function")return;
  requestIdleCallback(function(){if(lastArea&&!worldCache[planet])paintWorld(planet,lastArea)},{timeout:400})}
/* A pose places a world's window: a clip circle (x,y,r) and the content transform that puts
   content point (fx,fy) at screen point (ax,ay), scaled by k. */
function fullPose(w){var f=focusOf(w),r=Math.hypot(W,H)/2+4;return{x:W/2,y:H/2,r:r,k:1,fx:f[0],fy:f[1],ax:f[0],ay:f[1]}}
/* While a sub-page is read, the window settles into a globe that peeks out of the bottom-right
   corner, its valley centered in the visible part, never so far that the scaled land stops
   short of the screen's right or bottom edge inside the circle. */
function globePose(w){var g=readingGlobe(),f=focusOf(w),viewX=g.x-g.r*.28,viewY=g.y-g.r*.2;
  return{x:g.x,y:g.y,r:g.r,k:.8,fx:f[0],fy:f[1],ax:viewX,ay:viewY}}
function focusOf(w){var g=readingGlobe(),viewX=g.x-g.r*.28,viewY=g.y-g.r*.2,lake=w&&w.live.water;
  var aimX=lake?(lake.left+lake.right)/2:W*.74,aimY=lake?(lake.top+lake.bottom)/2:H*.68;
  return[Math.min(aimX,W-(W-viewX)/.8),Math.min(aimY,H-(H-viewY)/.8)]}
function restPose(w){return view.read<=0?fullPose(w):view.read>=1?globePose(w):mixPose(fullPose(w),globePose(w),ease(view.read))}
/* A planet's dot: an iris onto its world, centered where the dot is. The world inside sits in
   its real place, a touch magnified, and settles to true scale as the iris opens; it is never
   shrunk, so no edge of the painted world can ever show. */
function dotPose(planet){var p=pos[planet];if(!p)return null;
  var r=Math.max(2,p.radius||((.06+.015*(M[planet].hot||0))*sceneRadius*p[3]+2));
  return{x:p[0],y:p[1],r:r,k:1.12,fx:p[0],fy:p[1],ax:p[0],ay:p[1]}}
/* Size and scale interpolate geometrically, so the zoom reads as one even move. */
function mixPose(a,b,t){t=Math.max(0,Math.min(1,t));function g(u,v){return u*Math.pow(v/u,t)}
  return{x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),r:g(a.r,b.r),k:g(a.k,b.k),fx:mix(a.fx,b.fx,t),fy:mix(a.fy,b.fy,t),ax:mix(a.ax,b.ax,t),ay:mix(a.ay,b.ay,t)}}
/* Draw one world through its window. open is how far it has opened out of its dot: the dot's
   own color covers it at first and clears as it grows, so the planet you clicked visibly
   becomes the place. */
function drawWorld(w,p,open,dotColor,over,area,fade){
  var full=Math.hypot(W,H)/2+4,lens=Math.max(0,Math.min(1,(full-p.r)/(full*.3)));
  x.save();x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);
  /* A world opening over another brings its own sky, so nothing of the old one shows through.
     Only the reading globe is tinted, so an opening iris never reads as a flat disc. */
  if(over||lens>0){x.globalAlpha=over?1:lens;x.fillStyle=C.bg;x.fill()}
  if(view.read>0&&lens>0){x.globalAlpha=.07*lens*ease(view.read);x.fillStyle=C.dim;x.fill()}
  x.globalAlpha=1;x.clip();
  if(over&&area)drawSky(area);
  x.translate(p.ax,p.ay);x.scale(p.k,p.k);x.translate(-p.fx,-p.fy);
  x.globalAlpha=fade==null?1:fade;x.drawImage(w.canvas,0,0,W,H);x.globalAlpha=1;
  var live=ease((open-.55)/.45);
  if(live>0){useWorld(w);x.globalAlpha=live;drawLiveSurface(x);x.globalAlpha=1}
  x.restore();
  var cap=1-ease(open/.42);
  if(cap>0&&dotColor){x.globalAlpha=cap;x.fillStyle=dotColor;x.beginPath();x.arc(p.x,p.y,p.r+.5,0,Math.PI*2);x.fill();x.globalAlpha=1}
  if(lens>0){x.save();x.globalAlpha=.24*lens*(1-cap*.6);x.strokeStyle=C.dim;x.lineWidth=1;x.beginPath();x.arc(p.x,p.y,p.r,0,Math.PI*2);x.stroke();x.restore()}}
function drawWorlds(area){
  lastArea=area;if(view.amount<=0&&!openings.length)return;
  x.save();x.beginPath();x.rect(0,0,W,H);x.clip();
  var base=paintWorld(view.base,area),m=M[view.base],dot=view.amount<1?dotPose(view.base):null;
  var rest=restPose(base),newest=openings.length?openings[openings.length-1].t:0;
  /* The world being left recedes a little as the next one opens over it. */
  drawWorld(base,dot?mixPose(dot,rest,view.amount):rest,view.amount,tint(C.fg,C.accent,m?m.hot||0:0),false,area,1-.35*ease(newest));
  openings.forEach(function(o){var w=paintWorld(o.planet,area),from=o.from||restPose(w);
    drawWorld(w,mixPose(from,restPose(w),o.t),o.t,C.accent,true,area)});
  /* The live plan (water, smoke, the landing pad) belongs to the world being arrived at. */
  var top=openings.length?worldCache[openings[openings.length-1].planet]:base;if(top)useWorld(top);x.restore()}
/* Starship travels in scene coordinates, so dragging and zooming keep it in the solar system. */
function shipDestination(time){
  if(page<0){var a=3.6+time*.16;return world(Math.cos(a)*1.48,0,Math.sin(a)*1.48,.2,.5)}
  var m=M[page],a=m.a+(time-tt)*m.s*ts,local=time*.7+2.4,r=.28;
  return world(Math.cos(a)*m.r+Math.cos(local)*r,0,Math.sin(a)*m.r+Math.sin(local)*r,m.i,m.o)}
function shipPosition(time){
  var target=shipDestination(time);
  if(!ship.from||rm)return target;
  var u=Math.min(1,Math.max(0,(time-ship.departed)/2.6)),e=u*u*(3-2*u),a=ship.from;
  /* A curved transfer around the sun, with a small lift out of the orbital plane. */
  var start=Math.atan2(a[2],a[0]),end=Math.atan2(target[2],target[0]),reference=ship.routeAngle===null?start:ship.routeAngle;
  end=reference+Math.atan2(Math.sin(end-reference),Math.cos(end-reference));ship.routeAngle=end;
  var angle=start+(end-start)*e;
  var lift=Math.pow(Math.sin(Math.PI*u),2);
  var radius=Math.hypot(a[0],a[2])*(1-e)+Math.hypot(target[0],target[2])*e+.16*lift;
  return[Math.cos(angle)*radius,a[1]*(1-e)+target[1]*e+.12*lift,Math.sin(angle)*radius]}
function drawShip(p,length,heading,burn){
  x.save();x.globalAlpha=1;x.translate(p[0],p[1]);x.rotate(heading+Math.PI/2);x.scale(length/40,length/40);
  function shape(points,color){x.fillStyle=color;x.beginPath();points.forEach(function(v,i){if(i)x.lineTo(v[0],v[1]);else x.moveTo(v[0],v[1])});x.closePath();x.fill()}
  if(burn>0){var flame=burn*(29+Math.sin(tt*28)*2+(rm?0:Math.random()*2)),sway=rm?0:Math.sin(tt*21)*1.2;
    shape([[-4,18],[-3.4+sway*.4,24],[-2+sway,20+flame*.7],[sway*.6,20+flame],[2+sway,20+flame*.72],[3.4+sway*.4,24],[4,18]],C.accent);
    shape([[-2,18],[sway*.4,20+flame*.6],[2,18]],C["ship-edge"])}
  /* Seen from the side like the real ship: steel on the left, black heat-shield tiles on the
     right with their stepped edge, a tiled nose tip, and flaps on the shield line. Flaps stay a
     touch oversized so they read at this scale. */
  function hull(){x.beginPath();x.moveTo(0,-22);x.bezierCurveTo(-2.4,-21.4,-4,-17,-4,-10);x.lineTo(-4,17);x.lineTo(4,17);
    x.lineTo(4,-10);x.bezierCurveTo(4,-17,2.4,-21.4,0,-22);x.closePath()}
  shape([[-4,15.5],[-7.4,14],[-7.9,10],[-6.9,7],[-4,5.5]],C["ship-body"]);
  shape([[4,15.5],[7.4,14],[7.9,10],[6.9,7],[4,5.5]],C["ship-shield"]);
  shape([[-3.2,-12],[-6,-13],[-6.3,-16],[-2.4,-18.2]],C["ship-body"]);
  shape([[3.2,-12],[6,-13],[6.3,-16],[2.4,-18.2]],C["ship-shield"]);
  x.fillStyle=C["ship-shield"];hull();x.fill();
  /* steel up the left side and over the nose; the tiles' stepped edge runs just right of center
     and the tip above it stays black */
  x.fillStyle=C["ship-body"];x.beginPath();x.moveTo(-4,17);x.lineTo(-4,-10);x.bezierCurveTo(-4,-14.34,-3.38,-17.68,-2.35,-19.74);
  x.quadraticCurveTo(.2,-16,.3,-11);for(var n=0,y=-11;y<17;y+=1.5,n++)x.lineTo(n%2?.9:.3,y);x.lineTo(.9,17);x.closePath();x.fill();
  /* barrel weld lines on the steel, then a round-body shade: lit on the left, falling off at the edges */
  x.globalAlpha=.3;x.strokeStyle=C["ship-shield"];x.lineWidth=.3;x.beginPath();
  for(y=13.6;y>-10;y-=3.4){x.moveTo(-4,y);x.lineTo(.6,y)}x.stroke();x.globalAlpha=1;
  var g=x.createLinearGradient(-4,0,4,0);
  g.addColorStop(0,"rgba(0,0,0,.22)");g.addColorStop(.28,"rgba(255,255,255,.28)");g.addColorStop(.42,"rgba(255,255,255,0)");
  g.addColorStop(.8,"rgba(0,0,0,.08)");g.addColorStop(1,"rgba(0,0,0,.35)");
  x.fillStyle=g;hull();x.fill();
  shape([[-3.4,17],[-2.4,19],[2.4,19],[3.4,17]],C["ship-shield"]);x.restore()}
function shootingStar(){
  if(rm)return;
  if(!meteor&&tt>=nextMeteor){var reverse=Math.random()<.5;
    meteor={start:tt,x:reverse?1.1:-.1,y:.08+Math.random()*.25,dx:reverse?-1.2:1.2,dy:.25+Math.random()*.25};
    nextMeteor=tt+18+Math.random()*16}
  if(!meteor)return;
  var u=(tt-meteor.start)/1.35;if(u>1){meteor=null;return}
  var px=(meteor.x+meteor.dx*u)*W,py=(meteor.y+meteor.dy*u)*H;
  var distance=Math.hypot(meteor.dx*W,meteor.dy*H),tail=Math.min(110,W*.16),fade=Math.min(1,u*7,(1-u)*7);
  x.save();x.strokeStyle=C.dim;x.lineWidth=1.2;x.lineCap="round";
  for(var i=0;i<12;i++){var a=tail*i/12,b=tail*(i+1)/12;x.globalAlpha=fade*.55*(1-i/12);
    x.beginPath();x.moveTo(px-meteor.dx*W/distance*a,py-meteor.dy*H/distance*a);
    x.lineTo(px-meteor.dx*W/distance*b,py-meteor.dy*H/distance*b);x.stroke()}
  x.globalAlpha=fade*.8;x.fillStyle=C.fg;x.beginPath();x.arc(px,py,1.2,0,Math.PI*2);x.fill();x.restore()}
function hit(mx_,my_){var label=labels.find(function(l){return mx_>=l.x-4&&mx_<=l.x+l.w+4&&my_>=l.y-14&&my_<=l.y+5});if(label)return label.i;
  var b=-1,bz=1e9;pos.forEach(function(p,i){if(p.world&&view.amount>.5)return;if(Math.hypot(mx_-p[0],my_-p[1])<14*p[3]+14&&p[2]<bz){bz=p[2];b=i}});return b}
var pos=[],labels=[];
/* Fit projected geometry before drawing. Pixel padding includes labels and the full engine plume. */
function fitScene(desired,home,wide){
  var left=16,right=W-16,top=16,bottom=H-16;
  if(home){
    if(wide&&H<550)left=Math.min(W*.47,intro.getBoundingClientRect().right+20);
    else top=Math.min(H*.48,intro.getBoundingClientRect().bottom+18);
  }else if(wide){left=d.getElementById("panel").getBoundingClientRect().right+20;top=60;bottom=H-64}
  else top=d.getElementById("panel").getBoundingClientRect().bottom+12;
  var bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity},objects=[];
  function include(p,r){r=r||0;bounds.left=Math.min(bounds.left,p[0]-r);bounds.right=Math.max(bounds.right,p[0]+r);
    bounds.top=Math.min(bounds.top,p[1]-r);bounds.bottom=Math.max(bounds.bottom,p[1]+r)}
  include([0,0],.25);
  M.forEach(function(m){for(var i=0;i<90;i++){var a=i/90*Math.PI*2;include(P(Math.cos(a)*m.r,0,Math.sin(a)*m.r,m.i,m.o,1,0,0))}
    var p=P(Math.cos(m.a)*m.r,0,Math.sin(m.a)*m.r,m.i,m.o,1,0,0),r=.075*p[3];include(p,r);
    objects.push({left:p[0]-r,right:p[0]+r,top:p[1]-r,bottom:p[1]+r,l:2,r:76,t:18,b:18})});
  belt.forEach(function(b){var a=b.a+tt*.05;include(P(Math.cos(a)*b.r,b.y,Math.sin(a)*b.r,.2,.5,1,0,0))});
  var sp=P(ship.position[0],ship.position[1],ship.position[2],0,0,1,0,0),pad=ship.from&&!rm?60:26;
  objects.push({left:sp[0],right:sp[0],top:sp[1],bottom:sp[1],l:pad,r:pad,t:pad,b:pad});
  objects.push({left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom,l:3,r:3,t:3,b:3});
  function measure(R){var b={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
    objects.forEach(function(o){b.left=Math.min(b.left,o.left*R-o.l);b.right=Math.max(b.right,o.right*R+o.r);
      b.top=Math.min(b.top,o.top*R-o.t);b.bottom=Math.max(b.bottom,o.bottom*R+o.b)});return b}
  var low=0,high=desired;
  for(var attempt=0;attempt<14;attempt++){var trial=(low+high)/2,b=measure(trial);
    if(b.right-b.left<=right-left&&b.bottom-b.top<=bottom-top)low=trial;else high=trial}
  var target=Math.max(1,low);
  sceneRadius=sceneRadius?Math.min(target,damp(sceneRadius,target,4.35,fitStep)):target;
  var R=sceneRadius,b=measure(R),minX=left-b.left,maxX=right-b.right;
  var minY=top-b.top,maxY=bottom-b.bottom;
  var targetX=(minX+maxX)/2,targetY=(minY+maxY)/2;
  cxp=cxp===null?targetX:damp(cxp,targetX,4.35,fitStep);cyp=cyp===null?targetY:damp(cyp,targetY,4.35,fitStep);
  cxp=Math.max(minX,Math.min(maxX,cxp));cyp=Math.max(minY,Math.min(maxY,cyp));
  return[R,cxp,cyp]}
function drawLabels(R,home){
  labels=[];
  var placed=pos.map(function(p,i){return{p:p,i:i}}).filter(function(entry){return view.amount<.1||!entry.p.world}).sort(function(a,b){return a.p[1]-b.p[1]}).map(function(entry){
    var p=entry.p,i=entry.i,m=p[4],hot=m.hot||0,r=p.radius||((.06+.015*hot)*R*p[3]*(home?1:.8)+2);
    var width=x.measureText(m.n).width,right=Math.max(12,Math.min(W-width-12,p[0]+r+8));
    /* Around the reading globe the label sits outside the arc, to the left of its dot — except
       in the About spread, where left is the text column, so it reads outwards instead. It
       slides across rather than jumping when the globe forms. */
    var left=spreadOn()?Math.max(spreadEdge(),right):Math.max(12,p[0]-r-8-width);
    m.side=rm?(view.read>.5?1:0):damp(m.side||0,view.read>.5?1:0,10,fitStep);
    var l={i:i,w:width,x:mix(right,left,ease(m.side)),y:p[1]+5};
    settle(l,labels);labels.push(l);return{p:p,m:m,hot:hot,r:r,l:l}});
  /* Labels that bump to clear a neighbour glide to their new line instead of snapping. If the
     glide would make two overlap, this frame uses the settled layout above. */
  var glide=[],clear=!rm;
  placed.forEach(function(e){var target=e.l.y-e.p[1]-5,nudge=e.m.nudge==null?target:damp(e.m.nudge,target,14,fitStep);
    var l={i:e.l.i,w:e.l.w,x:e.l.x,y:Math.max(24,Math.min(H-16,e.p[1]+5+nudge))};
    glide.forEach(function(o){if(overlaps(l,o))clear=false});glide.push(l)});
  if(clear)labels=glide;
  placed.forEach(function(e,n){var l=labels[n],p=e.p;e.m.nudge=l.y-p[1]-5;
    var lead=Math.max(0,Math.min(1,(Math.abs(e.m.nudge)-5)/6));
    if(lead>0){x.globalAlpha=.4*lead;x.strokeStyle=C.dim;x.beginPath();x.moveTo(p[0]+e.r+3,p[1]);x.lineTo(l.x-3,l.y-5);x.stroke()}
    x.globalAlpha=(.8+.2*e.hot)*(e.m.alpha==null?1:e.m.alpha);x.fillStyle=tint(C.fg,C.accent,e.hot);x.fillText(e.m.n,l.x,l.y)});
  x.globalAlpha=1}
function overlaps(a,b){return a.x<b.x+b.w+8&&a.x+a.w+8>b.x&&Math.abs(a.y-b.y)<21}
function settle(l,others){others.forEach(function(o){if(overlaps(l,o))l.y=o.y+21});l.y=Math.max(24,Math.min(H-16,l.y))}
function reading(){return!!(root.classList&&root.classList.contains&&root.classList.contains("reading"))}
function frame(snap){
  if(paused){looping=false;return}
  var now=performance.now(),dt=Math.min((now-last)/1000,.05)*devSpeed;last=now;
  var wide=W>=820||(W>=650&&H<=550),home=page<0,step=snap?Infinity:dt;fitStep=snap?1/60:dt;
  /* Orbit to world (and back) is one spring; so is the fold into the reading globe; each
     world opening out of its dot is another. See "Worlds as windows". */
  spring(view,"amount","av",view.target,rm?0:5.2,rm?Infinity:step);
  var readTarget=reading()&&view.amount>.5?1:0;
  spring(view,"read","rv",readTarget,6.5,rm?Infinity:step);
  openings.forEach(function(o){spring(o,"t","v",1,6.2,rm?Infinity:step)});
  for(var oi=openings.length-1;oi>=0;oi--)if(openings[oi].t>=1){view.base=openings[oi].planet;openings=openings.slice(oi+1);break}
  M.forEach(function(m){m.alpha=rm?1:damp(m.alpha==null?1:m.alpha,1,5,step)});
  var Rb=wide?Math.min(W,H)*.3:Math.min(W*.26,H*.2);
  var tsc=home?1:.62,tga=home?1:.6;
  sc=damp(sc,tsc,4.35,step);ga=damp(ga,tga,4.35,step);zoom=damp(zoom,tz,7.7,step);
  /* A released drag coasts on its measured velocity (radians per second) and settles. */
  if(!rm){if(!drag){var coast=Math.exp(-3.7*dt);yaw+=vy*dt;pit+=vp*dt;vy*=coast;vp*=coast;yaw+=.1*dt*(home?1:1.6)}
    ts=damp(ts,hov>=0||shipHov?.2:1,5,dt);tt+=dt;M.forEach(function(m){m.a+=m.s*dt*ts})}
  M.forEach(function(m,i){m.hot=rm?(i===hov||i===page?1:0):damp(m.hot||0,i===hov||i===page?1:0,16,step)});
  shipHot=rm?(shipHov?1:0):damp(shipHot,shipHov?1:0,14,step);
  pit=Math.max(-1.25,Math.min(1.25,pit));
  ship.position=shipPosition(tt);
  var fitted=fitScene(Rb*sc*zoom,home,wide),R=fitted[0],cx=fitted[1],cy=fitted[2];
  x.clearRect(0,0,W,H);x.lineWidth=1;x.font='500 15px "Instrument Sans",system-ui,sans-serif';
  shootingStar();
  var area=surfaceArea(wide);frameCount++;if(view.amount>0)drawSky(area);
  var items=[];
  if(!drag&&mx>-900&&pos.length){var h2=hit(mx,my),s2=h2<0&&hitShip(mx,my);if(h2!==hov||s2!==shipHov){hov=h2;shipHov=s2;cv.style.cursor=h2>=0||s2?"pointer":"grab"}}
  /* moon positions */
  pos=M.map(function(m,i){var t=m.a,q=P(Math.cos(t)*m.r,0,Math.sin(t)*m.r,m.i,m.o,R,cx,cy);
    var radius=(.06+.015*(m.hot||0))*R*q[3]*(home?1:.8)+2;
    if(i===view.base&&view.amount>0){q.world=true;q.radius=radius}
    else if(view.amount>0){
      /* Sky dots glide to their new places when the arrangement changes, never jump. */
      var destination=skyPlanet(i,area);
      if(!m.sky||m.skyFrame!==frameCount-1)m.sky=[destination[0],destination[1]];
      else{m.sky[0]=damp(m.sky[0],destination[0],8,step);m.sky[1]=damp(m.sky[1],destination[1],8,step)}
      m.skyFrame=frameCount;
      q[0]=mix(q[0],m.sky[0],view.amount);q[1]=mix(q[1],m.sky[1],view.amount);
      q.radius=mix(radius,Math.max(4,Math.min(8,area.width*.012)),view.amount)}
    if(openings.some(function(o){return o.planet===i}))q.world=true;
    /* Reading: the other pages line up in an even arc around the globe, in page order. */
    if(view.read>.001&&i!==view.planet&&!q.world){
      var globe=readingGlobe(),others=M.map(function(_,j){return j}).filter(function(j){return j!==view.planet}),slot=others.indexOf(i);
      var spread=spreadOn(),span=spread?.30:.42,from=spread?1.20:1.04;
      var angle=Math.PI*(from+span*slot/Math.max(1,others.length-1)),e=ease(view.read);
      var edge=spreadEdge();
      q[0]=mix(q[0],Math.max(edge+14,globe.x+Math.cos(angle)*globe.ring),e);
      q[1]=mix(q[1],globe.y+Math.sin(angle)*globe.ring,e);
      q.radius=mix(q.radius||radius,wide?7:6,e)}
    q.push(m);return q});
  drawWorlds(area);
  /* Draw all scene elements from farthest to nearest so solid bodies occlude them. */
  function segment(a,b){var z=(a[2]+b[2])/2;items.push({z:z,draw:function(){
    x.strokeStyle=C.dim;x.globalAlpha=(1-view.amount)*ga*Math.max(.06,Math.min(.5,.3-z*.16));
    x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke()}})}
    M.forEach(function(m){var prev=null,N=90,t;
      for(t=0;t<=N;t++){var a=t/N*6.2832,q=P(Math.cos(a)*m.r,0,Math.sin(a)*m.r,m.i,m.o,R,cx,cy);
        if(prev)segment(prev,q);
        prev=q}});
    belt.forEach(function(b){var a=b.a+tt*.05,q=P(Math.cos(a)*b.r,b.y,Math.sin(a)*b.r,.2,.5,R,cx,cy);
      items.push({z:q[2],draw:function(){x.fillStyle=C.dim;x.globalAlpha=(1-view.amount)*ga*Math.max(.1,Math.min(.8,.5-q[2]*.2));x.fillRect(q[0],q[1],1.4,1.4)}})});
  pos.forEach(function(p){items.push({z:p[2],draw:function(){
    var hot=p[4].hot||0,r=p.radius||((.06+.015*hot)*R*p[3]*(home?1:.8)+2);
    if(p.world)return;ball(p[0],p[1],r,tint(C.fg,C.accent,hot),p[4].alpha==null?1:p[4].alpha);x.globalAlpha=1}})});
  /* The sun fades out as a page folds into the reading globe and back in as it unfolds. */
  var sunShown=1-ease(view.read/.5);
  items.push({z:0,draw:function(){if(sunShown<=.001)return;
    var skyX=area.left+area.width*(.13+.74*sun.progress),skyY=area.top+area.height*(.46-.34*sun.arc);
    var sunX=mix(cx,skyX,view.amount),sunY=mix(cy,skyY,view.amount),sunR=mix(R*.2,Math.min(14,area.height*.045),view.amount);
    ball(sunX,sunY,sunR,C.accent,sunShown);
    x.globalAlpha=(1-view.amount)*ga*.35*sunShown;x.strokeStyle=C.accent;x.beginPath();x.arc(sunX,sunY,sunR*1.18+Math.sin(tt*1.6)*2,0,6.2832);x.stroke()}});
  var sp=P(ship.position[0],ship.position[1],ship.position[2],0,0,R,cx,cy),future=shipPosition(tt+.025);
  var ahead=P(future[0],future[1],future[2],0,0,R,cx,cy);
  if(view.amount>0){var coast=surfaceShip(tt,area),nextCoast=surfaceShip(tt+.025,area);
    sp[0]=mix(sp[0],coast[0],view.amount);sp[1]=mix(sp[1],coast[1],view.amount);
    ahead[0]=mix(ahead[0],nextCoast[0],view.amount);ahead[1]=mix(ahead[1],nextCoast[1],view.amount)}
  ship.screen=[sp[0]/W,sp[1]/H];
  var heading=Math.atan2(ahead[1]-sp[1],ahead[0]-sp[0]);
  if(ship.heading===null||rm)ship.heading=heading;
  else ship.heading+=Math.atan2(Math.sin(heading-ship.heading),Math.cos(heading-ship.heading))*(1-Math.exp(-dt*9));
  var elapsed=tt-ship.departed,burn=ship.from&&!rm&&elapsed<2.6?1:0;
  var shipLength=Math.max(20,Math.min(36,R*.2))*Math.max(.8,Math.min(1.2,sp[3]));
  var pose=landingPose([sp[0],sp[1]],ship.heading,shipLength);
  if(pose){var weight=pose.weight==null?1:pose.weight;
    sp[0]=mix(sp[0],pose.x,weight);sp[1]=mix(sp[1],pose.y,weight);ship.heading=lerpAngle(ship.heading,pose.heading,weight);
    burn=Math.max(burn*(1-weight),pose.burn*weight);if(weight>.5)sp[2]=-200;
    ship.screen=[sp[0]/W,sp[1]/H]}
  landing.pose=pose&&{x:sp[0],y:sp[1],heading:ship.heading};
  if(pose&&landing.site&&view.planet===landing.page&&view.amount>.5){var site=landing.site,bottom=sp[1]+shipLength*.5,dustBurn=burn;
    items.push({z:-150,draw:function(){drawPadDust(site,bottom,shipLength,dustBurn)}})}
  if(view.read<.3){items.push({z:sp[2],draw:function(){drawShip(sp,shipLength,ship.heading,burn)}});
    shipHit=[sp[0],sp[1],Math.max(22,shipLength*.8)]}else{shipHit=null;shipHov=false}
  if(elapsed>=2.6||rm)ship.from=null;
  items.sort(function(a,b){return b.z-a.z}).forEach(function(item){item.draw()});x.globalAlpha=1;
  drawLabels(R,home);
  /* hovering the ship names what it does, in the accent like a hovered label */
  if(shipHot>.01&&shipHit){x.globalAlpha=shipHot;x.fillStyle=C.accent;
    x.fillText("Fly",Math.max(12,Math.min(W-40,sp[0]+shipLength*.7+(1-shipHot)*-6)),Math.max(24,Math.min(H-16,sp[1]-shipLength*.45)));x.globalAlpha=1}
  /* mini demo */
  if(page===1){var w=mini.clientWidth,h=mini.clientHeight;if(w&&mini.width!==Math.round(w*dpr)){mini.width=w*dpr;mini.height=h*dpr;mg.setTransform(dpr,0,0,dpr,0,0)}
    if(w){var mcx=w/2,mcy=h/2,A=[.36*w,.3*h,.25,0,.6],B=[.27*w,.42*h,-.9,1.1,.82],pp=[A,B].map(function(o){var t=o[3]+tt*o[4],c=Math.cos(t)*o[0],s=Math.sin(t)*o[1];return[mcx+c*Math.cos(o[2])-s*Math.sin(o[2]),mcy+c*Math.sin(o[2])+s*Math.cos(o[2])]});
      mg.clearRect(0,0,w,h);mg.strokeStyle=C.dim;mg.globalAlpha=.4;[A,B].forEach(function(o){mg.beginPath();mg.ellipse(mcx,mcy,o[0],o[1],o[2],0,6.2832);mg.stroke()});
      var q=Math.hypot(pp[0][0]-pp[1][0],pp[0][1]-pp[1][1]),hot=q<16;mg.globalAlpha=1;
      if(hot){mg.strokeStyle=C.accent;mg.beginPath();mg.moveTo(pp[0][0],pp[0][1]);mg.lineTo(pp[1][0],pp[1][1]);mg.stroke();mg.beginPath();mg.arc((pp[0][0]+pp[1][0])/2,(pp[0][1]+pp[1][1])/2,10,0,6.2832);mg.stroke()}
      mg.fillStyle=C.dim;mg.beginPath();mg.arc(mcx,mcy,4,0,6.2832);mg.fill();
      mg.fillStyle=C.fg;mg.beginPath();mg.arc(pp[0][0],pp[0][1],3.5,0,6.2832);mg.fill();mg.fillStyle=C.accent;mg.beginPath();mg.arc(pp[1][0],pp[1][1],3.5,0,6.2832);mg.fill();
      read.textContent="Separation "+Math.round(q)+(hot?" · close approach flagged":" · clear");read.className=hot?"hot":""}}
  if(!rm){looping=true;requestAnimationFrame(function(){frame(0)})}else looping=false
}
/* Reduced motion is followed live: turning it on parks the scene, turning it off restarts it. */
matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",function(e){rm=e.matches;
  if(!rm&&!looping&&!paused){last=performance.now();frame(0)}else if(rm)frame(1)});
/* interaction */
function pt(e){var b=cv.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top]}
/* The fling is fitted over the last 100 ms of pointer samples, not taken from the last event
   pair: a fast throw coasts, a pause before letting go does not, and a 120 Hz mouse throws as
   far as a 60 Hz one. While the pointer is down the scene follows it 1:1. */
var trail=[],FLING=.004,FLING_MAX=6,FLING_WINDOW=100;
function sample(px,py){var at=performance.now();trail.push([at,px,py]);while(trail.length>2&&at-trail[0][0]>FLING_WINDOW)trail.shift()}
function fling(){var at=performance.now();while(trail.length&&at-trail[0][0]>FLING_WINDOW)trail.shift();
  if(trail.length<2){vy=vp=0;return}var a=trail[0],b=trail[trail.length-1],span=Math.max(.008,(b[0]-a[0])/1000);
  vy=Math.max(-FLING_MAX,Math.min(FLING_MAX,(b[1]-a[1])*FLING/span));vp=Math.max(-FLING_MAX,Math.min(FLING_MAX,(b[2]-a[2])*FLING/span))}
cv.addEventListener("pointerdown",function(e){drag=true;moved=false;var p=pt(e);dx0=lx=p[0];dy0=ly=p[1];vy=vp=0;trail=[];sample(p[0],p[1]);cv.setPointerCapture(e.pointerId);cv.style.cursor="grabbing"});
cv.addEventListener("pointermove",function(e){var p=pt(e);mx=p[0];my=p[1];
  if(drag){if(view.amount>.8)view.pan+=(mx-lx)*.003;if(Math.hypot(mx-dx0,my-dy0)>6)moved=true;
    sample(mx,my);yaw+=(mx-lx)*.006;pit+=(my-ly)*.006;lx=mx;ly=my}
  else{hov=hit(mx,my);shipHov=hov<0&&hitShip(mx,my);cv.style.cursor=hov>=0||shipHov?"pointer":"grab";prewarm(hov)}
  if(rm)frame(1)});
cv.addEventListener("pointerup",function(e){if(!drag)return;drag=false;fling();var p=pt(e),h=hit(p[0],p[1]);cv.style.cursor=h>=0?"pointer":"grab";if(!moved&&h>=0&&h!==page){hov=-1;go(h)}else if(!moved&&h<0&&hitShip(p[0],p[1]))launch()});
cv.addEventListener("pointerleave",function(){if(!drag){hov=-1;shipHov=false;mx=-999}});
/* Wheel and trackpad both feed a zoom target the frame eases toward. Line and page deltas
   (some mice, Firefox) are turned into pixels first so every device zooms at the same rate. */
cv.addEventListener("wheel",function(e){e.preventDefault();var dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?H:1);
  tz=Math.max(.7,Math.min(1.6,tz*Math.exp(-dy*.0012)));if(rm)frame(1)},{passive:false});
setInterval(function(){if(devHour!=null)return;
  var next=computeSun(new Date());
  if(Math.abs(next.vector[0]-sun.vector[0])>.02||Math.abs(next.daylight-sun.daylight)>.015){
    sun=next;terrainMeshes={};worldEpoch++;if(rm)frame(1)}},600000);
/* Hooks for dev.js. They do nothing until it drives them, so with the dev flag off the site
   behaves exactly as without them. */
var devSpeed=1,devHour=null;
function devSetHour(h){devHour=h;var at=new Date();if(h!=null)at.setHours(Math.floor(h),Math.round((h%1)*60),0,0);
  sun=computeSun(at);terrainMeshes={};worldEpoch++;if(rm)frame(1)}
if(typeof window!=="undefined")window.Orbit={go:go,landOn:landOn,launch:launch,
  get page(){return page},get landing(){return landing.state},get flying(){return flying},get clock(){return devHour},
  speed:function(v){devSpeed=v},hour:devSetHour};
/* The Ask panel turns "[the Experience planet](#page:4)" in an answer into a real jump. */
if(typeof window!=="undefined")window.Orbit={go:go,pages:function(){return M.map(function(m){return m.n})}};
/* A shared link opens straight onto its page, already settled. */
(function(){var n=pageOfHash();if(n>=0){fromHistory=true;try{go(n)}finally{fromHistory=false}}})();
rs();frame(1);
})();
