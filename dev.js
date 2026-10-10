/* Development shortcuts. Everything here is behind one flag: set DEV to false (or delete the
   <script src="dev.js"> line) before shipping and the site is exactly as without it.
   A URL can override the flag for one visit: ?dev=1 turns it on, ?dev=0 turns it off.
   Shortcuts use Option (Alt) plus a key, matched by physical key so macOS's Option
   characters do not get in the way. ` (backtick) opens the list with live stats. */
var DEV=false;
(function(){
var q=/[?&]dev=([01])/.exec(location.search);if(q)DEV=q[1]==="1";
if(!DEV)return;
var d=document,speeds=[.25,.5,1,2,4,8],speedAt=2,fps=0,frames=0,lastFps=performance.now();

var badge=d.createElement("button"),panel=d.createElement("div");
badge.type="button";badge.id="devbadge";badge.textContent="DEV";badge.title="Development shortcuts (`)";
panel.id="devpanel";panel.hidden=true;
d.body.appendChild(badge);d.body.appendChild(panel);
var css=d.createElement("style");css.textContent=
  "#devbadge{position:fixed;z-index:9;right:.7rem;bottom:.6rem;background:none;border:0;padding:.2rem .3rem;font:500 .7rem/1 'Instrument Sans',system-ui,sans-serif;letter-spacing:.08em;color:var(--dim);cursor:pointer;opacity:.7}"+
  "#devbadge:hover{opacity:1;color:var(--accent)}"+
  "#devpanel{position:fixed;z-index:9;right:.7rem;bottom:2rem;width:min(21rem,calc(100% - 1.4rem));max-height:calc(100dvh - 3rem);overflow:auto;padding:.9rem 1rem;"+
    "background:var(--bg);border:1px solid color-mix(in srgb,var(--dim) 35%,transparent);font:400 .8rem/1.45 'Instrument Sans',system-ui,sans-serif;color:var(--fg)}"+
  "#devpanel h4{margin:.7rem 0 .25rem;font-weight:500;font-size:.8rem;color:var(--dim)}#devpanel h4:first-child{margin-top:0}"+
  "#devpanel dl{display:grid;grid-template-columns:auto 1fr;gap:.1rem .8rem;margin:0}#devpanel dt{font-variant-numeric:tabular-nums;color:var(--accent);white-space:nowrap}#devpanel dd{margin:0}"+
  "#devpanel .stats{font-variant-numeric:tabular-nums;color:var(--dim)}"+
  "#devtoast{position:fixed;z-index:9;right:3.2rem;bottom:.55rem;font:500 .75rem 'Instrument Sans',system-ui,sans-serif;color:var(--accent);transition:opacity .3s;pointer-events:none}";
d.head.appendChild(css);
var toast=d.createElement("div");toast.id="devtoast";d.body.appendChild(toast);
function say(text){toast.textContent=text;toast.style.opacity=1;clearTimeout(say.t);say.t=setTimeout(function(){toast.style.opacity=0},1600)}

function orbit(){return window.Orbit}
function flight(){return window.Flight&&Flight.active?Flight.debug:null}
function setSpeed(i){speedAt=Math.max(0,Math.min(speeds.length-1,i));var v=speeds[speedAt];
  if(orbit())Orbit.speed(v);if(window.Flight)Flight.debug.speed(v);say("Time ×"+v)}

/* [code, label, action]; actions return nothing or a message for the toast */
var anywhere=[
  ["Backquote","`","Show or hide this panel",function(){panel.hidden=!panel.hidden;if(!panel.hidden)draw()}],
  ["BracketLeft","⌥ [","Slow time down (¼× to 8×)",function(){setSpeed(speedAt-1)}],
  ["BracketRight","⌥ ]","Speed time up",function(){setSpeed(speedAt+1)}],
  ["Digit0","⌥ 0","Reset time speed and the real clock",function(){setSpeed(2);if(orbit())Orbit.hour(null);return"Real time"}]];
var inOrbit=[
  ["Digit1","⌥ 1–5","Land Starship on that page (belly flop, no game)",null],
  ["KeyF","⌥ F","Launch Flight straight into play",function(){if(!orbit())return;Orbit.launch();
    var tries=0,wait=setInterval(function(){if(window.Flight&&Flight.active){Flight.debug.play();clearInterval(wait)}else if(++tries>40)clearInterval(wait)},50);return"Launching"}],
  ["KeyH","⌥ H","Move the sun three hours on (⇧ back to the real clock)",function(e){if(!orbit())return;
    if(e.shiftKey){Orbit.hour(null);return"Real clock"}
    var h=Orbit.clock==null?new Date().getHours()+new Date().getMinutes()/60:Orbit.clock;h=(Math.floor(h/3)*3+3)%24;Orbit.hour(h);return"Sun at "+h+":00"}]];
var inFlight=[
  ["Digit1","⌥ 1–5","Fly toward that world instead",null],
  ["KeyN","⌥ N","Arrive at the current world now",function(){flight().play();flight().arrive();return"Arriving"}],
  ["KeyL","⌥ L","Arrive and land right away",function(){var f=flight();f.play();f.arrive();f.tick(1/60);f.land();return"Landing"}],
  ["KeyG","⌥ G","Invincible on or off",function(){return flight().god()?"Invincible":"Mortal again"}],
  ["KeyR","⌥ R","Rock on a collision course (⇧ big one)",function(e){flight().play();flight().rock(e.shiftKey);return e.shiftKey?"Big rock":"Rock"}],
  ["KeyE","⌥ E","Send a drone",function(){flight().play();flight().drone();return"Drone"}],
  ["KeyI","⌥ I","Ring right ahead",function(){flight().play();flight().ring();return"Ring"}],
  ["KeyU","⌥ U","Refill hull and boost",function(){flight().refill();return"Refilled"}],
  ["KeyX","⌥ X","Lose the ship (game over)",function(){flight().play();flight().lose();return"Hull lost"}]];

addEventListener("keydown",function(e){
  var list=anywhere.concat(flight()?inFlight:inOrbit),digit=/^Digit([1-9])$/.exec(e.code);
  if(e.code==="Backquote"&&!e.altKey&&!e.metaKey&&!e.ctrlKey){anywhere[0][3]();e.preventDefault();e.stopImmediatePropagation();return}
  if(!e.altKey||e.metaKey||e.ctrlKey)return;
  var msg,hit=false;
  if(digit&&digit[1]!=="0"){var n=+digit[1]-1;hit=true;
    if(flight()){var names=flight().worlds();if(n<names.length){flight().play();flight().world(n);msg="To "+names[n]}}
    else if(orbit()&&!Orbit.flying){Orbit.landOn(n);msg="Landing on page "+(n+1)}}
  else list.forEach(function(s){if(s[0]===e.code&&s[3]){hit=true;msg=s[3](e)}});
  if(!hit)return;
  e.preventDefault();e.stopImmediatePropagation();if(msg)say(msg);if(!panel.hidden)draw()},true);
badge.addEventListener("click",function(){anywhere[0][3]()});

function rows(list){return"<dl>"+list.map(function(s){return"<dt>"+s[1]+"</dt><dd>"+s[2]+"</dd>"}).join("")+"</dl>"}
function stats(){var o=orbit(),f=window.Flight&&Flight.active?Flight.debug.state():null,out=[fps+" fps","time ×"+speeds[speedAt]];
  if(o){out.push(o.page<0?"home":"page "+(o.page+1));if(o.landing)out.push("landing: "+o.landing);if(o.clock!=null)out.push("sun "+o.clock+":00")}
  if(f)out.push("flight: "+f.mode,"to "+Flight.debug.here(),"sector "+(f.sector+1),f.god?"invincible":"hull "+f.hull,
    f.rocks.length+" rocks, "+f.aliens.length+" drones");
  return out.join(" · ")}
function draw(){panel.innerHTML="<h4>Anywhere</h4>"+rows(anywhere)+"<h4>Orbit</h4>"+rows(inOrbit)+"<h4>Flight</h4>"+rows(inFlight)+
  "<h4>Now</h4><p class='stats' id='devstats'>"+stats()+"</p><h4>Turn off</h4><p class='stats'>Set DEV to false in dev.js, or open the page with ?dev=0.</p>"}
(function tick(now){frames++;if(now-lastFps>=500){fps=Math.round(frames*1000/(now-lastFps));frames=0;lastFps=now;
    var s=d.getElementById("devstats");if(s&&!panel.hidden)s.textContent=stats()}
  requestAnimationFrame(tick)})(performance.now());
})();
