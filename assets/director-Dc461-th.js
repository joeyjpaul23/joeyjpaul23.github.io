import{t as e}from"./index-Di6MVHWS.js";import{$ as t,A as n,B as r,C as i,D as a,E as o,G as s,I as c,J as l,K as u,L as d,M as f,N as p,O as m,P as h,Q as g,R as _,S as v,T as y,V as b,W as x,X as S,Y as C,_ as w,_t as T,a as E,at as D,b as O,bt as k,ct as A,d as j,dt as M,et as ee,f as N,ft as te,g as ne,gt as P,h as F,it as re,k as ie,lt as I,m as ae,n as oe,nt as se,ot as ce,p as L,pt as le,q as R,r as z,rt as B,s as V,st as H,t as ue,tt as de,u as fe,ut as pe,v as me,vt as he,w as U,x as ge,xt as _e,y as ve,yt as W}from"./sky-CAlbNWCz.js";var ye=`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,be=`
${V}
varying vec3 vDir;
void main(){
  vec3 n=normalize(vDir);
  float c=fbm(n*1.6+vec3(3.1,1.7,.4),7)*.5+.5;
  float ridge=1.-abs(fbm(n*5.+vec3(8.),5));
  float h=c+.06*ridge;
  float land=smoothstep(.505,.515,h);
  float lat=abs(n.y);
  float dry=smoothstep(.15,.45,fbm(n*3.+vec3(17.),4)*.5+.5)*(1.-smoothstep(.15,.42,abs(lat-.3)));
  vec3 forest=vec3(.05,.11,.05),plain=vec3(.16,.17,.09),desert=vec3(.42,.32,.2),rock=vec3(.24,.21,.19);
  vec3 g=mix(forest,plain,smoothstep(.52,.6,h));
  g=mix(g,desert,dry);
  g=mix(g,rock,smoothstep(.62,.7,h+ridge*.05));
  float ice=smoothstep(.78,.86,lat+fbm(n*6.,3)*.06);
  vec3 deep=vec3(.006,.022,.06),shelf=vec3(.02,.09,.14);
  vec3 sea=mix(deep,shelf,smoothstep(.44,.505,h));
  vec3 col=mix(sea,g,land);
  col=mix(col,vec3(.75,.8,.86),ice);
  gl_FragColor=vec4(col,land*(1.-ice));
}`,xe=`
${V}
varying vec3 vDir;
void main(){
  vec3 n=normalize(vDir);
  float c=fbm(n*1.6+vec3(3.1,1.7,.4),7)*.5+.5;
  float land=smoothstep(.505,.515,c);float coast=1.-smoothstep(0.,.05,abs(c-.515));
  float lat=abs(n.y);
  /* Where people live, as a smooth density: clustered, crowding the coasts and rivers. The
     lights themselves are drawn per pixel in GROUND_FRAG, far finer than a cube texel. */
  float clusters=smoothstep(.5,.85,fbm(n*7.+vec3(4.),5)*.5+.5);
  float towns=smoothstep(.55,.8,fbm(n*40.+vec3(9.),4)*.5+.5);
  float city=land*(1.-smoothstep(.5,.72,lat))*clamp(clusters*.9+coast*.8*clusters+towns*.25,0.,1.);
  float cl=fbm(n*3.2+vec3(40.),7)*.5+.5;
  float swirl=fbm(n*9.+vec3(cl*3.),4)*.5+.5;
  float clouds=smoothstep(.48,.72,cl*.75+swirl*.35)*(.75+.25*smoothstep(.1,.6,lat));
  gl_FragColor=vec4(city,clouds,fbm(n*30.,3)*.5+.5,1.);
}`,Se=`
float miePhase(float mu,float g){float g2=g*g;return (1.-g2)/(4.*3.14159*pow(max(1.+g2-2.*g*mu,1e-4),1.5));}
vec3 skyTint(float sunHeight){
  vec3 day=vec3(.28,.52,1.),dusk=vec3(1.,.42,.16);
  return mix(dusk,day,smoothstep(-.05,.35,sunHeight));
}`,Ce=`
uniform mat3 uSpin;
varying vec3 vDir;varying vec3 vWN;varying vec3 vWP;
void main(){vDir=uSpin*position;vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;vWN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;}`,G=`
${V}
${Se}
uniform samplerCube uSurf,uExtra;uniform vec3 uSun,uCenter;uniform float uR,uTime,uCloudSpin;uniform mat3 uCloudRot;
varying vec3 vDir;varying vec3 vWN;varying vec3 vWP;
void main(){
  vec3 d=normalize(vDir);
  vec4 s=textureCube(uSurf,d);vec4 e=textureCube(uExtra,d);
  float dist=length(cameraPosition-vWP);
  float detail=snoise(d*900.)*.5+.5;float detail2=snoise(d*3200.)*.5+.5;
  vec3 alb=s.rgb*(.82+.25*detail*mix(1.,detail2,smoothstep(40.,4.,dist)));
  vec3 N=normalize(vWN);vec3 V=normalize(cameraPosition-vWP);
  float ndl=dot(N,uSun);
  float day=smoothstep(-.08,.3,ndl);
  vec3 sunCol=mix(vec3(1.,.45,.2),vec3(1.,.97,.92),smoothstep(0.,.4,ndl));
  /* cloud shadow: where the clouds above stand between this point and the star */
  vec3 cd=uCloudRot*normalize(d+uSun*.008);
  float shadow=1.-.65*textureCube(uExtra,cd).g;
  vec3 col=alb*sunCol*day*shadow*2.2;
  float ocean=1.-s.a;ocean*=step(dot(s.rgb,vec3(1.)),.6);
  vec3 H=normalize(uSun+V);
  float glint=pow(max(dot(N,H),0.),260.)*12.+pow(max(dot(N,H),0.),30.)*.35;
  col+=sunCol*glint*ocean*smoothstep(-.05,.15,ndl)*shadow;
  float night=1.-smoothstep(-.18,.05,ndl);
  /* City lights: two scales of points scattered by the density map, softened as they shrink
     below a pixel so the distance glitters instead of crawling. */
  float dens=e.r;
  float px=dist*.0009;
  vec3 q1=d*26000.;float s1=step(1.-dens*.45,hash3(floor(q1)))*(1.-smoothstep(.12,.5,length(fract(q1)-.5)));
  vec3 q2=d*7400.;float s2=step(1.-dens*.22,hash3(floor(q2)+7.))*(1.-smoothstep(.18,.5,length(fract(q2)-.5)));
  float fine=mix(s1,dens*.2,smoothstep(.15,.6,px*26000./6.283))*.9+mix(s2,dens*.1,smoothstep(.15,.6,px*7400./6.283))*1.6;
  vec3 lights=vec3(1.,.64,.3)*(fine+dens*.18)*night*2.4*(1.-.75*textureCube(uExtra,uCloudRot*d).g);
  col+=lights;
  col+=alb*vec3(.05,.07,.13)*.5;
  /* haze toward the limb: the ground sinks into the atmosphere */
  float mu=clamp(dot(N,V),0.,1.);
  float haze=pow(1.-mu,9.);
  vec3 air=skyTint(ndl)*(.01+.9*smoothstep(-.12,.3,ndl))+vec3(1.,.55,.3)*miePhase(dot(-V,uSun),.75)*.35*smoothstep(-.15,.12,ndl);
  col=mix(col,air,haze*.7);
  gl_FragColor=vec4(col,1.);
}`,we=Ce,Te=`
${Se}
uniform samplerCube uExtra;uniform vec3 uSun;uniform mat3 uCloudRot;
varying vec3 vDir;varying vec3 vWN;varying vec3 vWP;
void main(){
  vec3 d=uCloudRot*normalize(vDir);
  vec4 e=textureCube(uExtra,d);
  float a=e.g*(.75+.25*e.b);
  vec3 N=normalize(vWN);vec3 V=normalize(cameraPosition-vWP);
  float ndl=dot(N,uSun);
  float day=smoothstep(-.1,.25,ndl);
  vec3 sunCol=mix(vec3(1.,.42,.18),vec3(1.),smoothstep(0.,.35,ndl));
  vec3 col=sunCol*day*1.5*(.75+.25*e.b)+vec3(.05,.07,.12)*.35;
  col+=vec3(1.,.5,.25)*miePhase(dot(-V,uSun),.6)*.5*smoothstep(-.25,.05,ndl)*a;
  float mu=clamp(dot(N,V),0.,1.);
  a*=smoothstep(0.,.08,mu);
  gl_FragColor=vec4(col*a,a);
}`,Ee=`varying vec3 vWP;void main(){vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,De=`
${Se}
uniform vec3 uCenter,uSun;uniform float uR,uRa,uGain;
varying vec3 vWP;
void main(){
  vec3 ray=normalize(vWP-cameraPosition);vec3 oc=uCenter-cameraPosition;
  float t=dot(oc,ray);vec3 closest=cameraPosition+ray*t;float b=length(closest-uCenter);
  float hitsGround=step(b,uR)*step(0.,t);
  float alt=clamp((b-uR)/(uRa-uR),0.,1.);
  float density=exp(-alt*4.)*(1.-alt);
  vec3 up=normalize(closest-uCenter);
  float sunH=dot(up,uSun);
  float lit=smoothstep(-.32,.12,sunH);
  float mu=dot(ray,uSun);
  vec3 ray_=skyTint(sunH)*(1.+mu*mu)*.55;
  vec3 mie=mix(vec3(1.,.55,.28),vec3(1.,.9,.8),smoothstep(-.1,.3,sunH))*miePhase(mu,.8)*1.15;
  vec3 col=(ray_+mie)*density*lit*uGain;
  col*=1.-hitsGround*.0;
  gl_FragColor=vec4(col,1.);
}`,K=`varying vec2 vP;void main(){vP=position.xy;vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);mv.xy+=position.xy*vec2(length(modelMatrix[0].xyz));gl_Position=projectionMatrix*mv;}`,q=`
${V}
uniform float uTime;uniform vec3 uTint;
varying vec2 vP;
void main(){
  float r=length(vP)/.08;float a=atan(vP.y,vP.x);
  float disc=smoothstep(1.02,.96,r);
  float rays=clamp(snoise(vec3(cos(a)*2.,sin(a)*2.,uTime*.05))*.5+.5,0.,1.);
  float corona=exp(-max(r-1.,0.)*(2.2-rays*1.2))*.9;
  float glow=.3/(1.+max(r-1.,0.)*max(r-1.,0.)*1.4);
  vec3 col=vec3(1.,.98,.95)*disc*40.+uTint*(corona*2.2+glow*.5);
  gl_FragColor=vec4(col,1.);
}`,Oe=`
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;
void main(){vObj=position;vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;vWN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*wp;}`,ke=`
${V}
uniform vec3 uSoil,uLight,uShadow,uHaze,uWater,uDeep,uAccent,uSun,uAirCol;
uniform float uSeed,uTime,uHot,uIce,uSea,uClouds,uLights,uCraters,uAir;
varying vec3 vObj;varying vec3 vWN;varying vec3 vWP;
void main(){
  vec3 n=normalize(vObj);
  float h=fbm(n*1.15+uSeed,6)*.5+.5;
  float dtl=fbm(n*8.+uSeed*1.7,4)*.5+.5;
  float land=smoothstep(uSea-.015,uSea+.015,h);
  vec3 ground=mix(uShadow,uSoil,smoothstep(uSea,uSea+.16,h));
  ground=mix(ground,uLight,smoothstep(uSea+.16,uSea+.4,h)*.85);
  ground*=.86+.28*dtl;
  if(uCraters>0.){float c=fbm(n*9.+uSeed*3.,4)*.5+.5;float rim=smoothstep(.6,.66,c)-smoothstep(.68,.72,c);
    ground*=1.-uCraters*smoothstep(.66,.74,c)*.5;ground+=uLight*uCraters*rim*.25;}
  vec3 sea=mix(uDeep,uWater,smoothstep(uSea-.3,uSea,h));
  vec3 albedo=mix(sea,ground,land);
  float lat=abs(n.y);
  float ice=uIce>0.?smoothstep(1.-uIce-.05,1.-uIce+.05,lat+(dtl-.5)*.22):0.;
  albedo=mix(albedo,vec3(.9,.94,1.),ice);
  vec3 cn=n;float sp=uTime*.018;cn.xz=mat2(cos(sp),-sin(sp),sin(sp),cos(sp))*cn.xz;
  float cl=smoothstep(.5,.8,fbm(cn*3.+uSeed*.5+vec3(0.,uTime*.006,0.),5)*.5+.5)*uClouds;
  vec3 N=normalize(vWN);vec3 V=normalize(cameraPosition-vWP);vec3 L=uSun;
  float ndl=dot(N,L);
  float day=smoothstep(-.06,.4,ndl);
  vec3 lit=albedo*day*1.25;
  float tq=(ndl-.03)*6.;lit+=uHaze*exp(-tq*tq)*.25;
  vec3 H=normalize(L+V);
  lit+=vec3(1.,.96,.9)*pow(max(dot(N,H),0.),80.)*(1.-land)*(1.-ice)*day*2.;
  lit=mix(lit,vec3(.92,.94,.97)*day*1.1,cl*.8);
  if(uLights>0.){vec3 q=n*70.;float c=hash3(floor(q));float spot=1.-smoothstep(.15,.45,length(fract(q)-.5));
    lit+=vec3(1.,.66,.32)*step(.975,c)*spot*land*(1.-ice)*(1.-cl)*smoothstep(0.,-.25,ndl)*uLights*3.;}
  /* Earthshine: the night side faintly lit by the giant world below, so the surface still reads
     inside the crescent. */
  lit+=albedo*(.012+.06*smoothstep(.2,-.6,ndl)*max(-N.y*.5+.5,0.));
  float fr=pow(1.-max(dot(N,V),0.),2.4);
  lit+=mix(uHaze,uAccent*2.,uHot)*fr*(.06+.9*smoothstep(-.3,.5,ndl));
  lit+=uAccent*uHot*(.04+fr*.6);
  /* Seen through a world's daytime air: washed toward the sky, like the Moon by day. */
  lit=mix(lit,uAirCol,uAir)+uAirCol*uAir*.15*day;
  gl_FragColor=vec4(lit,1.);
}`,Ae=`
uniform vec3 uHaze,uAccent,uCenter,uSun;uniform float uRad,uShell,uHot;
varying vec3 vWP;
void main(){
  vec3 ray=normalize(vWP-cameraPosition);vec3 oc=uCenter-cameraPosition;
  float t=dot(oc,ray);float b=length(oc-ray*t);
  float x=clamp((b-uRad)/(uShell-uRad),0.,1.);
  float glow=pow(1.-x,2.4)*step(uRad*.995,b);
  vec3 limb=normalize(cameraPosition+ray*t-uCenter);
  float sunSide=smoothstep(-.4,.6,dot(limb,uSun));
  float fwd=pow(max(dot(ray,uSun),0.),8.);
  vec3 col=mix(uHaze*1.2,uAccent*2.,uHot*.7)*glow*(.1+.9*sunSide+2.5*fwd);
  gl_FragColor=vec4(col,1.);
}`,je=`
${V}
uniform vec3 uA,uB,uCenter,uSun;uniform float uInner,uOuter,uRad;
varying vec3 vLocal;varying vec3 vWP;varying vec3 vWN;
void main(){
  float r=length(vLocal.xy);float t=(r-uInner)/(uOuter-uInner);
  float bands=.5+.5*sin(r*61.)*sin(r*23.+1.3);
  float grain=snoise(vec3(r*90.,0.,0.))*.5+.5;
  float dens=(.35+.65*bands)*(.6+.4*grain);
  dens*=smoothstep(0.,.06,t)*smoothstep(1.,.85,t);
  dens*=1.-.85*smoothstep(.58,.6,t)*smoothstep(.66,.64,t);
  float lit=.25+.75*abs(dot(normalize(vWN),uSun));
  vec3 oc=uCenter-vWP;float tt=dot(oc,uSun);float miss=length(oc-uSun*tt);
  float shadow=(tt>0.&&miss<uRad)?.1:1.;
  vec3 col=mix(uA,uB,t+grain*.2)*lit*shadow*1.3;
  gl_FragColor=vec4(col,dens*.85);
}`,Me=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,Ne=`
uniform sampler2D tDiffuse;uniform float uTime,uGrain,uExposure,uVeil,uFlare,uAspect,uShake;
uniform vec2 uRes,uSunUv;uniform vec3 uVeilColor,uFlareTint;
varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 rrt(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}
vec3 aces(vec3 c){
  const mat3 I=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));
  const mat3 O=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));
  return clamp(O*rrt(I*(c*uExposure/.6)),0.,1.);}
vec3 srgb(vec3 c){return mix(c*12.92,1.055*pow(max(c,0.),vec3(1./2.4))-.055,step(.0031308,c));}
void main(){
  vec2 c=vUv-.5;float r2=dot(c,c);
  vec2 off=c*r2*.007;
  vec3 col=vec3(texture2D(tDiffuse,vUv+off).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-off).b);
  if(uFlare>0.){
    vec2 d=vUv-uSunUv;d.x*=uAspect;
    float streak=exp(-abs(d.y)*260.)*exp(-abs(d.x)*1.6)*1.2;
    float halo=exp(-length(d)*7.)*.25;
    vec2 axis=vec2(.5)-uSunUv;float ghosts=0.;
    for(int i=1;i<5;i++){float k=float(i)*.42;vec2 g=uSunUv+axis*k*1.6;vec2 q=vUv-g;q.x*=uAspect;float rr=.02+.025*float(i);
      ghosts+=smoothstep(rr,rr*.6,length(q))*(.022/float(i));}
    col+=uFlareTint*(streak+halo+ghosts)*uFlare;
  }
  col=srgb(aces(col));
  col*=1.-smoothstep(.16,.75,r2)*.6;
  col=mix(col,uVeilColor,uVeil);
  col+=(h(vUv*uRes+fract(uTime*61.)*vec2(91.,37.))-.5)*uGrain;
  gl_FragColor=vec4(col,1.);
}`,Pe=[{soil:[144,149,115],light:[236,214,164],shadow:[45,78,84],haze:[158,179,205],water:[58,116,164],deep:[16,44,84],ice:.13,sea:.47,clouds:.55,lights:1,craters:0},{soil:[185,108,72],light:[250,204,145],shadow:[83,61,77],haze:[230,160,130],water:[54,104,140],deep:[22,40,64],ice:0,sea:.3,clouds:.12,lights:0,craters:1},{soil:[88,140,134],light:[198,214,164],shadow:[37,69,89],haze:[139,197,220],water:[52,110,152],deep:[14,46,84],ice:.17,sea:.5,clouds:.45,lights:0,craters:0},{soil:[158,125,151],light:[233,198,171],shadow:[61,65,103],haze:[190,160,230],water:[48,94,148],deep:[21,37,78],ice:.06,sea:.46,clouds:.4,lights:1,craters:0},{soil:[190,200,212],light:[250,251,253],shadow:[64,78,108],haze:[194,214,245],water:[176,202,220],deep:[96,126,164],ice:.34,sea:.4,clouds:.35,lights:1,craters:0}],J=e=>new U().setRGB(...e.map(e=>e/255),H),Y=new W(0,-103.2,0),Fe=Math.acos(100/103.2),Ie=-.155,Le=[[.37,.5,2.1],[.66,.15,1.5],[.9,.44,1.25],[.8,.25,4.6],[.27,.6,1.7]],X=[[.56,.55,2.2],[.28,.45,1.6],[.84,.6,1.3],[.72,.4,4.2],[.2,.62,1.7]];function Re(e,t,n,r){let i=new me(n,{type:r,generateMipmaps:!0,minFilter:x}),a=new A,s=new l(new M(10,64,32),new I({vertexShader:ye,fragmentShader:t,side:1}));return a.add(s),new o(.1,100,i).update(e,a),s.geometry.dispose(),s.material.dispose(),i}function ze(e,t,n,r){let i=new A,a=new W,f=new U(.66,.76,1);i.add(oe(t.cube,900,.9));let p=z(n,850);i.add(p.points);let m=Re(e,be,2048,d),h=Re(e,xe,1536,T),g=new u,v=new u,y=new I({vertexShader:Ce,fragmentShader:G,uniforms:{uSurf:{value:m.texture},uExtra:{value:h.texture},uSun:{value:a},uCenter:{value:Y},uR:{value:100},uTime:{value:0},uSpin:{value:g},uCloudRot:{value:v},uCloudSpin:{value:0}}}),b=new l(new M(100,512,256),y);b.position.copy(Y),i.add(b);let x=new I({vertexShader:we,fragmentShader:Te,transparent:!0,depthWrite:!1,premultipliedAlpha:!0,uniforms:{uExtra:{value:h.texture},uSun:{value:a},uSpin:{value:g},uCloudRot:{value:v}}}),S=new l(new M(100.28,384,192),x);S.position.copy(Y),i.add(S);let C=new I({vertexShader:Ee,fragmentShader:De,side:1,transparent:!0,depthWrite:!1,blending:2,uniforms:{uCenter:{value:Y},uSun:{value:a},uR:{value:100},uRa:{value:102.4},uGain:{value:1}}}),w=new l(new M(102.4,384,192),C);w.position.copy(Y),i.add(w);let D=new I({vertexShader:K,fragmentShader:q,transparent:!0,depthWrite:!1,blending:2,uniforms:{uTime:{value:0},uTint:{value:f}}}),O=new l(new ee(1,1),D);O.scale.setScalar(170),O.frustumCulled=!1,i.add(O);let k=new ie(15134207,3.4);i.add(k,k.target);let N=new ie(16763040,2.2);N.position.set(.3,-.5,1),i.add(N),i.add(new _(725024,1708556,.5));let te=new U(.55,.62,1),P=r.map((e,t)=>{let n=Pe[e.k]??Pe[0],r=new I({vertexShader:Oe,fragmentShader:ke,uniforms:{uSoil:{value:J(n.soil)},uLight:{value:J(n.light)},uShadow:{value:J(n.shadow)},uHaze:{value:J(n.haze)},uWater:{value:J(n.water)},uDeep:{value:J(n.deep)},uAccent:{value:te},uSun:{value:a},uSeed:{value:e.k*3.7+1.3},uTime:{value:0},uHot:{value:0},uIce:{value:n.ice},uSea:{value:n.sea},uClouds:{value:n.clouds},uLights:{value:0},uCraters:{value:n.craters},uAir:{value:0},uAirCol:{value:new U}}}),o=new c,s=new l(new M(1,128,96),r);s.userData.page=t,o.add(s);let u=new I({vertexShader:E,fragmentShader:Ae,side:1,transparent:!0,depthWrite:!1,blending:2,uniforms:{uHaze:{value:J(n.haze)},uAccent:{value:te},uCenter:{value:new W},uSun:{value:a},uRad:{value:1},uShell:{value:1.2},uHot:{value:0}}});if(o.add(new l(new M(1.2,64,48),u)),e.k===2){let e=new l(new ce(1.45,2.4,192,1),new I({vertexShader:fe,fragmentShader:je,side:2,transparent:!0,depthWrite:!1,uniforms:{uA:{value:J([214,205,180])},uB:{value:J([150,175,190])},uCenter:{value:new W},uSun:{value:a},uInner:{value:1.45},uOuter:{value:2.4},uRad:{value:1}}}));e.rotation.set(Math.PI/2-.32,.35,0),e.userData.ring=!0,o.add(e)}return s.rotation.set(0,t*1.3,.25+e.k*.08),i.add(o),{index:t,group:o,body:s,mat:r,atmo:u,radius:1,hot:0}}),F=new me(256,{type:d}),re=new o(.05,1200,F),ae=new ne(e),se=null,L=j(null);L.group.userData.ship=!0,L.group.scale.setScalar(.55),i.add(L.group);function le(e,t){let n=t<1?X:Le,r=new W,i=Math.tan(s.degToRad(e.fov/2));P.forEach((a,o)=>{let[c,l,u]=n[o]??[.5,.3,1.5],d=140+o*22;r.set((c*2-1)*i*t,(1-l*2)*i,-1).normalize().applyQuaternion(e.quaternion),a.group.position.copy(e.position).addScaledVector(r,d),a.radius=Math.tan(s.degToRad(u))*d,a.group.scale.setScalar(a.radius)})}function R(e){let t=-Fe+s.degToRad(e),n=s.degToRad(9);a.set(Math.sin(n)*Math.cos(t),Math.sin(t),-Math.cos(n)*Math.cos(t)).normalize(),O.position.copy(a).multiplyScalar(850),k.position.copy(a).multiplyScalar(50)}R(1);function V(t){L.group.visible=!1,re.position.copy(t).add(new W(0,0,-3)),re.update(e,i),L.group.visible=!0;let n=ae.fromCubemap(F.texture).texture;se?.dispose(),se=n,L.group.traverse(e=>{let t=e.material;t&&`envMap`in t&&t.isMeshStandardMaterial&&(t.envMap=n,t.needsUpdate=!0)})}let H=new W,ue=new B,de=new W;function pe(e,t,n,r,i){R(r);let a=n?0:e*.0032,o=1.12;g.set(Math.cos(o),-Math.sin(o),0,Math.sin(o),Math.cos(o),0,0,0,1).multiply(new u().set(1,0,0,0,Math.cos(a+.4),-Math.sin(a+.4),0,Math.sin(a+.4),Math.cos(a+.4)));let s=n?0:e*9e-4;v.set(Math.cos(s),0,Math.sin(s),0,1,0,-Math.sin(s),0,Math.cos(s)).multiply(g),y.uniforms.uTime.value=e,D.uniforms.uTime.value=e,p.mat.uniforms.uTime.value=e,p.mat.uniforms.uTwinkle.value=+!n,P.forEach(r=>{r.mat.uniforms.uTime.value=e,r.mat.uniforms.uHot.value=r.hot,r.atmo.uniforms.uHot.value=r.hot,r.group.getWorldPosition(H),r.atmo.uniforms.uCenter.value.copy(H),r.atmo.uniforms.uRad.value=r.radius,r.atmo.uniforms.uShell.value=r.radius*1.2,r.group.children.forEach(e=>{if(!e.userData.ring)return;let t=e.material.uniforms;t.uCenter.value.copy(H),t.uRad.value=r.radius}),n||(r.body.rotation.y+=t*.02)});let c=(i*.011%1+1)%1,l=8-c*16;L.group.position.set(l,-.95+Math.sin(c*Math.PI)*.18,-6.4-Math.sin(c*6.28)*.5),de.set(-1,-.02,.04).normalize(),ue.setFromUnitVectors(new W(0,1,0),de),L.group.quaternion.copy(ue).multiply(new B().setFromAxisAngle(new W(0,1,0),2.6+Math.sin(i*.07)*.25)),L.update(e)}return{scene:i,moons:P,ship:L,sunDir:a,layout:le,update:pe,captureEnv:V,get envReady(){return!!se},dispose(){m.dispose(),h.dispose(),F.dispose(),ae.dispose(),L.dispose()}}}var Be=class e extends l{constructor(n,r={}){super(n),this.isReflector=!0,this.type=`Reflector`,this.forceUpdate=!1,this._reflectionCameras=new WeakMap;let i=this,a=r.color===void 0?new U(8355711):new U(r.color),o=r.textureWidth||512,s=r.textureHeight||512,c=r.clipBias||0,l=r.shader||e.ReflectorShader,u=r.multisample===void 0?4:r.multisample,f=new t,p=new W,m=new W,h=new W,g=new R,_=new W(0,0,-1),v=new k,y=new W,b=new W,x=new k,S=new R,C=new _e(o,s,{samples:u,type:d}),w=new I({name:l.name===void 0?`unspecified`:l.name,uniforms:P.clone(l.uniforms),fragmentShader:l.fragmentShader,vertexShader:l.vertexShader});w.uniforms.tDiffuse.value=C.texture,w.uniforms.color.value=a,w.uniforms.textureMatrix.value=S,this.material=w,this.onBeforeRender=function(e,t,n){let r=this.getReflectionCamera(n);if(m.setFromMatrixPosition(i.matrixWorld),h.setFromMatrixPosition(n.matrixWorld),g.extractRotation(i.matrixWorld),p.set(0,0,1),p.applyMatrix4(g),y.subVectors(m,h),y.dot(p)>0&&this.forceUpdate===!1)return;y.reflect(p).negate(),y.add(m),g.extractRotation(n.matrixWorld),_.set(0,0,-1),_.applyMatrix4(g),_.add(h),b.subVectors(m,_),b.reflect(p).negate(),b.add(m),r.position.copy(y),r.up.set(0,1,0),r.up.applyMatrix4(g),r.up.reflect(p),r.lookAt(b),r.far=n.far,r.updateMatrixWorld(),r.projectionMatrix.copy(n.projectionMatrix),S.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),S.multiply(r.projectionMatrix),S.multiply(r.matrixWorldInverse),S.multiply(i.matrixWorld),f.setFromNormalAndCoplanarPoint(p,m),f.applyMatrix4(r.matrixWorldInverse),v.set(f.normal.x,f.normal.y,f.normal.z,f.constant);let a=r.projectionMatrix;r.isOrthographicCamera?(x.x=(Math.sign(v.x)+a.elements[8])/a.elements[0],x.y=(Math.sign(v.y)+a.elements[9])/a.elements[5],x.z=-n.far,x.w=1):(x.x=(Math.sign(v.x)+a.elements[8])/a.elements[0],x.y=(Math.sign(v.y)+a.elements[9])/a.elements[5],x.z=-1,x.w=(1+a.elements[10])/a.elements[14]),v.multiplyScalar(2/v.dot(x)),a.elements[2]=v.x,a.elements[6]=v.y,r.isOrthographicCamera?(a.elements[10]=v.z-c,a.elements[14]=v.w-1):(a.elements[10]=v.z+1-c,a.elements[14]=v.w),i.visible=!1;let o=e.getRenderTarget(),s=e.xr.enabled,l=e.shadowMap.autoUpdate;e.xr.enabled=!1,e.shadowMap.autoUpdate=!1,e.setRenderTarget(C),e.state.buffers.depth.setMask(!0),e.autoClear===!1&&e.clear(),e.render(t,r),e.xr.enabled=s,e.shadowMap.autoUpdate=l,e.setRenderTarget(o);let u=n.viewport;u!==void 0&&e.state.viewport(u),i.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return C},this.dispose=function(){C.dispose(),i.material.dispose()},this.getReflectionCamera=function(e){let t=this._reflectionCameras.get(e);return t===void 0&&(t=e.clone(),this._reflectionCameras.set(e,t)),t}}};Be.ReflectorShader={name:`ReflectorShader`,uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,fragmentShader:`
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			#include <logdepthbuf_fragment>

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};function Ve(e,t=!1){let n=e[0].index!==null,r=new Set(Object.keys(e[0].attributes)),i=new Set(Object.keys(e[0].morphAttributes)),a={},o={},s=e[0].morphTargetsRelative,c=new v,l=0;for(let u=0;u<e.length;++u){let d=e[u],f=0;if(n!==(d.index!==null))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them.`),null;for(let e in d.attributes){if(!r.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. All geometries must have compatible attributes; make sure "`+e+`" attribute exists among all geometries, or in none of them.`),null;a[e]===void 0&&(a[e]=[]),a[e].push(d.attributes[e]),f++}if(f!==r.size)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. Make sure all geometries have the same number of attributes.`),null;if(s!==d.morphTargetsRelative)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. .morphTargetsRelative must be consistent throughout all geometries.`),null;for(let e in d.morphAttributes){if(!i.has(e))return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`.  .morphAttributes must be consistent throughout all geometries.`),null;o[e]===void 0&&(o[e]=[]),o[e].push(d.morphAttributes[e])}if(t){let e;if(n)e=d.index.count;else if(d.attributes.position!==void 0)e=d.attributes.position.count;else return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index `+u+`. The geometry must have either an index or a position attribute`),null;c.addGroup(l,e,u),l+=e}}if(n){let t=0,n=[];for(let r=0;r<e.length;++r){let i=e[r].index;for(let e=0;e<i.count;++e)n.push(i.getX(e)+t);t+=e[r].attributes.position.count}c.setIndex(n)}for(let e in a){let t=He(a[e]);if(!t)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` attribute.`),null;c.setAttribute(e,t)}for(let e in o){let t=o[e][0].length;if(t!==0){c.morphAttributes=c.morphAttributes||{},c.morphAttributes[e]=[];for(let n=0;n<t;++n){let t=[];for(let r=0;r<o[e].length;++r)t.push(o[e][r][n]);let r=He(t);if(!r)return console.error(`THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the `+e+` morphAttribute.`),null;c.morphAttributes[e].push(r)}}}return c}function He(e){let t,n,r,i=-1,a=0;for(let o=0;o<e.length;++o){let s=e[o];if(t===void 0&&(t=s.array.constructor),t!==s.array.constructor)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes.`),null;if(n===void 0&&(n=s.itemSize),n!==s.itemSize)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes.`),null;if(r===void 0&&(r=s.normalized),r!==s.normalized)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes.`),null;if(i===-1&&(i=s.gpuType),i!==s.gpuType)return console.error(`THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes.`),null;a+=s.count*n}let o=new t(a),s=new ge(o,n,r),c=0;for(let t=0;t<e.length;++t){let r=e[t];if(r.isInterleavedBufferAttribute){let e=c/n;for(let t=0,i=r.count;t<i;t++)for(let i=0;i<n;i++){let n=r.getComponent(t,i);s.setComponent(t+e,i,n)}}else o.set(r.array,c);c+=r.count*n}return i!==void 0&&(s.gpuType=i),s}function Ue(e){let t=new Uint8Array(512),n=new Uint8Array(256).map((e,t)=>t),r=e>>>0||1,i=()=>(r=r*1664525+1013904223>>>0)/4294967296;for(let e=255;e>0;e--){let t=Math.floor(i()*(e+1));[n[e],n[t]]=[n[t],n[e]]}for(let e=0;e<512;e++)t[e]=n[e&255];let a=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]],o=.5*(Math.sqrt(3)-1),s=(3-Math.sqrt(3))/6;function c(e,n){let r=(e+n)*o,i=Math.floor(e+r),c=Math.floor(n+r),l=(i+c)*s,u=e-(i-l),d=n-(c-l),f=+(u>d),p=u>d?0:1,m=u-f+s,h=d-p+s,g=u-1+2*s,_=d-1+2*s,v=i&255,y=c&255,b=0,x=(e,t,n)=>{let r=.5-e*e-t*t;if(r<0)return 0;let i=a[n%8];return r*r*r*r*(i[0]*e+i[1]*t)};return b+=x(u,d,t[v+t[y]]),b+=x(m,h,t[v+f+t[y+p]]),b+=x(g,_,t[v+1+t[y+1]]),70*b}function l(e,t,n,r=2.03,i=.5){let a=.5,o=1,s=0;for(let l=0;l<n;l++)s+=a*c(e*o,t*o),o*=r,a*=i;return s}function u(e,t,n){let r=.5,i=1,a=0,o=1;for(let s=0;s<n;s++){let n=1-Math.abs(c(e*i,t*i));n*=n*o,o=Math.min(1,Math.max(0,n*2)),a+=n*r,i*=2.07,r*=.5}return a}return{noise:c,fbm:l,ridged:u,rand:i}}var We=[{sun:[6,24],zenith:[34,62,120],horizon:[250,188,140],sunCol:[255,196,140],fog:[176,160,156],fogDensity:6,fogHeight:130,exposure:1.05,kind:`alpine`,amp:480,snow:185,tree:150,trees:2600,lake:{x:150,z:-170,r:170},cloud:.42,night:0,landmark:`cabin`,weather:`fireflies`,flare:.25},{sun:[9,28],zenith:[86,92,118],horizon:[236,178,128],sunCol:[255,206,150],fog:[204,150,108],fogDensity:4,fogHeight:160,exposure:1,kind:`desert`,amp:420,snow:9999,tree:-1,trees:0,lake:null,craters:!0,cloud:.08,night:0,landmark:`dish`,weather:`dust`,flare:.22},{sun:[11,38],zenith:[26,78,138],horizon:[188,218,228],sunCol:[255,236,210],fog:[146,178,192],fogDensity:3.5,fogHeight:150,exposure:1.05,kind:`alpine`,amp:620,snow:210,tree:170,trees:3200,lake:null,cloud:.5,night:0,ring:!0,landmark:null,weather:`snow`,flare:.22},{sun:[1.5,20],zenith:[38,30,84],horizon:[250,146,132],sunCol:[255,150,110],fog:[146,112,148],fogDensity:6,fogHeight:110,exposure:1.15,kind:`hills`,amp:260,snow:9999,tree:110,trees:1800,lake:{x:120,z:-140,r:230},cloud:.45,night:.35,landmark:`cabin`,weather:`fireflies`,flare:.6},{sun:[-7,14],zenith:[6,12,32],horizon:[52,72,120],sunCol:[150,180,255],fog:[50,64,102],fogDensity:6,fogHeight:120,exposure:1.35,kind:`alpine`,amp:420,snow:-999,tree:160,trees:2200,lake:{x:140,z:-160,r:150},frozen:!0,cloud:.3,night:1,aurora:!0,landmark:`lights`,weather:`snow`,flare:0}],Z=e=>J(e),Ge=!1;function Ke(){Ge||(Ge=!0,w.fog_pars_vertex=`#ifdef USE_FOG
varying float vFogDepth;varying vec3 vFogWorld;
#endif`,w.fog_vertex=`#ifdef USE_FOG
vFogDepth=-mvPosition.z;vFogWorld=(inverse(viewMatrix)*mvPosition).xyz;
#endif`,w.fog_pars_fragment=`#ifdef USE_FOG
uniform vec3 fogColor;varying float vFogDepth;varying vec3 vFogWorld;
#ifdef FOG_EXP2
uniform float fogDensity;
#else
uniform float fogNear;uniform float fogFar;
#endif
#endif`,w.fog_fragment=`#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor=1.0-exp(-fogDensity*fogDensity*vFogDepth*vFogDepth);
  #else
    float dens=fogNear*1e-4;float H=fogFar;
    float h0=cameraPosition.y,h1=vFogWorld.y,dh=h1-h0;
    float dist=length(vFogWorld-cameraPosition);
    float k=abs(dh)>1.?(exp(-max(h0,-50.)/H)-exp(-max(h1,-50.)/H))/(dh/H):exp(-max(h0,-50.)/H);
    float fogFactor=1.0-exp(-dens*dist*k);
  #endif
  gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,clamp(fogFactor,0.,1.));
#endif`)}var qe=`varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,Je=`
${V}
uniform vec3 uSun,uZenith,uHorizon,uSunCol,uGround;uniform float uTime,uCloud,uNight,uAurora,uRing,uSeed;uniform samplerCube uStars;uniform mat3 uSkyRot;
varying vec3 vDir;
float ringDensity(float r){float t=(r-1.45)/(2.4-1.45);if(t<0.||t>1.)return 0.;
  float bands=.5+.5*sin(r*61.)*sin(r*23.+1.3);float d=(.35+.65*bands)*smoothstep(0.,.06,t)*smoothstep(1.,.85,t);
  return d*(1.-.85*smoothstep(.58,.6,t)*smoothstep(.66,.64,t));}
void main(){
  vec3 d=normalize(vDir);float h=d.y;float up=max(h,0.);
  vec3 col=mix(uHorizon,uZenith,pow(up,.42));
  col=mix(col,uGround,smoothstep(.0,-.08,h));
  float mu=dot(d,uSun);float sunUp=smoothstep(-.14,.04,uSun.y);
  col+=uSunCol*(pow(max(mu,0.),5.)*.45+pow(max(mu,0.),80.)*1.4)*sunUp*(1.-up*.6);
  col+=uSunCol*smoothstep(.99962,.99982,mu)*80.*smoothstep(-.02,.01,uSun.y);
  col+=textureCube(uStars,uSkyRot*d).rgb*uNight*smoothstep(0.,.2,h)*5.;
  if(uRing>0.){
    vec3 n=normalize(vec3(.12,.5,.86));vec3 P=vec3(0.,1.002,0.);
    float dn=dot(d,n);float t=-dot(P,n)/dn;
    if(t>0.&&h>-.02){vec3 X=P+t*d;float r=length(X);float dens=ringDensity(r);
      float lit=.35+.65*abs(dot(n,uSun));float shadow=(dot(X,uSun)<0.&&length(X-uSun*dot(X,uSun))<1.)?.12:1.;
      vec3 rc=mix(vec3(.84,.8,.7),vec3(.6,.68,.74),(r-1.45)/.95)*lit*shadow*(.6+.8*sunUp);
      col=mix(col,rc,dens*.78*smoothstep(-.02,.06,h));}
  }
  if(uAurora>0.){
    float a=atan(d.x,-d.z);
    float curtain=0.;
    for(int i=0;i<2;i++){float fi=float(i);float s=snoise(vec3(a*2.2+fi*3.1,fi,uTime*.035))*.5+.5;
      float line=smoothstep(.09,0.,abs(h-(.22+.13*s+fi*.07)));
      float rays=pow(.5+.5*sin(a*90.+s*14.+uTime*.4+fi*2.),2.);
      curtain+=line*(.4+rays)*smoothstep(.0,.15,h);}
    col+=mix(vec3(.12,1.,.55),vec3(.55,.25,1.),smoothstep(.2,.45,h))*curtain*uAurora*.9;
  }
  if(h>0.){
    vec2 p=d.xz/(h+.07)*1.3+vec2(uTime*.003,uTime*.001);
    float c=fbm(vec3(p,uSeed),4)*.5+.5;
    float cov=smoothstep(1.-uCloud,1.-uCloud+.22,c)*smoothstep(0.,.1,h);
    float thick=smoothstep(1.-uCloud,1.,c);
    vec3 base=mix(uZenith*.35+uHorizon*.35,uHorizon*.8,1.-up);
    vec3 lit=mix(base,uSunCol*1.15,(.25+.45*sunUp)*(1.-thick*.6));
    lit+=uSunCol*pow(max(mu,0.),6.)*2.2*sunUp*(1.-thick);
    col=mix(col,lit*(1.-uNight*.7),cov*.9);
  }
  gl_FragColor=vec4(col,1.);
}`,Ye=`
uniform mat4 textureMatrix;varying vec4 vUv;varying vec3 vWP;
void main(){vUv=textureMatrix*vec4(position,1.);vec4 wp=modelMatrix*vec4(position,1.);vWP=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,Xe=`
${V}
uniform vec3 color;uniform sampler2D tDiffuse;uniform float uTime,uFrozen;uniform vec3 uDeep,uSun,uSunCol,uSky;
varying vec4 vUv;varying vec3 vWP;
void main(){
  vec2 p=vWP.xz*.035;
  vec2 w=vec2(snoise(vec3(p,uTime*.25)),snoise(vec3(p+7.,uTime*.25)))*mix(.012,.0025,uFrozen);
  w+=vec2(snoise(vec3(p*4.,uTime*.6)),snoise(vec3(p*4.+3.,uTime*.6)))*mix(.004,.0006,uFrozen);
  vec4 uv=vUv;uv.xy+=w*uv.w*mix(6.,.8,uFrozen);
  vec3 refl=texture2DProj(tDiffuse,uv).rgb;
  vec3 V=normalize(cameraPosition-vWP);
  float fres=.04+.96*pow(1.-max(V.y,0.),5.);
  vec3 N=normalize(vec3(-w.x*30.,1.,-w.y*30.));
  vec3 H=normalize(uSun+V);float glint=pow(max(dot(N,H),0.),400.)*20.*(1.-uFrozen*.7);
  vec3 col=mix(uDeep,refl,mix(fres*.9+.1,.55,uFrozen));
  col=mix(col,uSky*.7+vec3(.6,.68,.78)*.25,uFrozen*.35);
  col+=uSunCol*glint*smoothstep(-.02,.05,uSun.y);
  gl_FragColor=vec4(col,1.);
}`;function Ze(){let e=Ue(91),t=new Uint8Array(262144),n=(t,n)=>e.fbm(t/32,n/32,4)+.5*e.noise(t/6,n/6);for(let e=0;e<256;e++)for(let r=0;r<256;r++){let i=n((r+1)%256,e)-n((r-1+256)%256,e),a=n(r,(e+1)%256)-n(r,(e-1+256)%256),o=new W(-i*2.2,-a*2.2,1).normalize(),s=(e*256+r)*4;t[s]=(o.x*.5+.5)*255,t[s+1]=(o.y*.5+.5)*255,t[s+2]=(o.z*.5+.5)*255,t[s+3]=255}let r=new m(t,256,256);return r.wrapS=r.wrapT=D,r.generateMipmaps=!0,r.minFilter=x,r.needsUpdate=!0,r}var Qe=null;function $e(e,t,n,r){let i=[],o=(e,t)=>{let n=e.attributes.position,r=e.attributes.normal,i=new Float32Array(n.count*3);for(let e=0;e<n.count;e++)t(n.getY(e),r.getY(e)).toArray(i,e*3);return e.setAttribute(`color`,new ge(i,3)),e.toNonIndexed()},c=new a(.03,.045,.26,6);return c.translate(0,.13,0),i.push(o(c,()=>n)),[[.2,.34,.5],[.44,.27,.4],[.66,.18,.36]].forEach(([n,a,c])=>{let l=new y(a,c,8,1);l.translate(0,n+c/2,0),i.push(o(l,(i,a)=>{let o=s.clamp((i-n)/c,0,1),l=e.clone().lerp(t,o*.7);return r&&a>.25&&o>.15?l.lerp(new U(.86,.9,.96),.78):l}))}),Ve(i.map(e=>(e.deleteAttribute(`uv`),e)))}function et(e,t,o,d,m){let g=m[d].k,y=We[g],x=Pe[g],w=Ue(1e3+g*77),T=new A,D=Z(y.fog);Ke(),T.fog=new h(D,y.fogDensity,y.fogHeight),e.shadowMap.enabled=!0,e.shadowMap.type=2;let k=new W,[N,ne]=y.sun,P=s.degToRad(N),F=s.degToRad(ne);k.set(Math.sin(F)*Math.cos(P),Math.sin(P),-Math.cos(F)*Math.cos(P)).normalize();let re=N>0?k.clone():new W(Math.sin(F)*.7,.55,-.6).normalize(),ae=N>0?Z(y.sunCol):new U(.35,.45,.75),oe=5200,ce=-1900,L=y.craters?[[-260,-420,120],[420,-700,180],[-60,-1100,240],[260,-260,70]]:[];function z(e,t){let n=s.smoothstep(-t,250,2400),r=Math.exp(-((e-80)**2+(t-40)**2)/270400),i;if(y.kind===`desert`){let r=w.fbm(e*.0016,t*.0016,3)*2.4,a=e*.94+t*.34,o=(1-Math.abs(Math.sin(a*.0105+r)))**1.7*38+(1-Math.abs(Math.sin(a*.027+r*1.7)))**2*9,c=.55+.45*(w.fbm(e*8e-4,t*8e-4,3)*.5+.5),l=s.smoothstep(w.fbm(e*55e-5+9,t*55e-5,5)+n*.35,.18,.26),u=y.amp*(.75+.25*(w.fbm(e*.002,t*.002,3)*.5+.5));i=o*c+l*u*(.25+.75*n)+w.ridged(e*.0011,t*.0011,5)*40*l}else i=w.fbm(e*.0011,t*.0011,5)*y.amp*(y.kind===`hills`?.5:.28),i+=w.ridged(e*75e-5+3.1,t*75e-5-1.7,8)*y.amp*(y.kind===`hills`?.7:1.9)*(.1+.9*n);if(i=i*(1-.75*r)-14*r,y.terraces){let e=y.terraces,t=i/e,n=Math.floor(t);i=(n+s.smoothstep(t-n,.72,.98))*e}for(let[n,r,a]of L){let o=Math.hypot(e-n,t-r)/a;o<1.6&&(i+=(o<1?-(1-o*o)*a*.32:0)+Math.exp(-(((o-1)/.16)**2))*a*.12)}if(y.lake){let n=y.lake,r=1+.18*w.noise(e*.006,t*.006),a=Math.hypot((e-n.x)/1.35,t-n.z)/(n.r*r),o=s.smoothstep(a,.55,1.3);i=i*o+(-30-22*(1-a))*(1-o)}return i}let V=new ee(oe,oe,430,430);V.rotateX(-Math.PI/2),V.translate(300,0,ce);let H=V.attributes.position,ue=H.count,fe=new Float32Array(ue);for(let e=0;e<ue;e++){let t=z(H.getX(e),H.getZ(e));fe[e]=t,H.setY(e,t)}V.computeVertexNormals();let me=V.attributes.normal,_e=new Float32Array(ue*3),ve=Z(x.soil),ye=Z(x.light),be=Z(x.shadow),xe=new U().setRGB(.11,.1,.1).lerp(be,.4),Se=new U(.82,.87,.95),Ce=ye.clone().lerp(ve,.4),G=new U;for(let e=0;e<ue;e++){let t=fe[e],n=1-me.getY(e),r=H.getX(e),i=H.getZ(e),a=s.clamp((t+40)/(y.amp*1.4),0,1);G.copy(be).lerp(ve,s.smoothstep(a,0,.35)).lerp(ye,s.smoothstep(a,.45,1)*.7),G.multiplyScalar(.85+.3*(w.noise(r*.02,i*.02)*.5+.5)),G.lerp(xe,s.smoothstep(n,.28,.55)*.8),y.lake&&t<5&&t>-4&&G.lerp(Ce,.5),t<-1&&G.lerp(be,.6);let o=y.snow+w.noise(r*.004,i*.004)*40,c=s.smoothstep(t,o-15,o+25)*(1-s.smoothstep(n,.42,.62));G.lerp(Se,c);let l=e%431,u=Math.floor(e/431),d=0,f=0;for(let e=-3;e<=3;e+=3)for(let t=-3;t<=3;t+=3){let n=l+t,r=u+e;n<0||r<0||n>=431||r>=431||(d+=fe[r*431+n],f++)}let p=s.clamp(1+(t-d/f)/70,.5,1.08);G.multiplyScalar(p),G.toArray(_e,e*3)}V.setAttribute(`color`,new ge(_e,3)),Qe??=Ze();let we=Qe;we.repeat.set(420,420);let Te=y.kind===`desert`?1.5:.55,Ee=new S({vertexColors:!0,roughness:.93,metalness:0,normalMap:we,normalScale:new he(Te,Te)}),De=new l(V,Ee);De.castShadow=De.receiveShadow=!0,T.add(De);let K=(e,t)=>z(e,t),q=new ie(ae,N>0?3.8:1.6),je=new W(160,0,-260);q.position.copy(je).addScaledVector(re,1600),q.target.position.copy(je),q.castShadow=!0,q.shadow.mapSize.set(2048,2048);let Me=q.shadow.camera;Me.left=-900,Me.right=900,Me.top=900,Me.bottom=-900,Me.near=100,Me.far=4e3,q.shadow.bias=-4e-4,q.shadow.normalBias=1.2,T.add(q,q.target);let Ne=Z(y.zenith),Y=Z(y.horizon);T.add(new _(Ne.clone().lerp(Y,.4).multiplyScalar(1.3),ve.clone().multiplyScalar(.35),.55));let Fe=new u,Ie=new I({vertexShader:qe,fragmentShader:Je,side:1,depthWrite:!1,fog:!1,uniforms:{uSun:{value:k},uZenith:{value:Ne},uHorizon:{value:Y},uSunCol:{value:Z(y.sunCol)},uGround:{value:D.clone().multiplyScalar(.6)},uTime:{value:0},uCloud:{value:y.cloud},uNight:{value:y.night},uAurora:{value:+!!y.aurora},uRing:{value:+!!y.ring},uSeed:{value:g*5.1},uStars:{value:t.cube},uSkyRot:{value:Fe}}}),Le=new l(new M(2800,64,32),Ie);Le.renderOrder=-10,Le.frustumCulled=!1,T.add(Le);let X=null;if(y.lake){let e=y.lake;X=new Be(new ee(2400,1800),{textureWidth:640,textureHeight:320,clipBias:.003,multisample:0,shader:{name:`LakeShader`,uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null},uTime:{value:0},uFrozen:{value:+!!y.frozen},uDeep:{value:Z(x.deep).multiplyScalar(.6)},uSun:{value:k},uSunCol:{value:Z(y.sunCol)},uSky:{value:Ne.clone().lerp(Y,.5)}},vertexShader:Ye,fragmentShader:Xe}}),X.rotateX(-Math.PI/2),X.position.set(e.x,0,e.z-300),T.add(X)}let Re=null;if(X){let e=new ee(oe,oe,430/4,430/4);e.rotateX(-Math.PI/2),e.translate(300,0,ce);let t=e.attributes.position;for(let e=0;e<t.count;e++)t.setY(e,z(t.getX(e),t.getZ(e)));e.computeVertexNormals();let n=new Float32Array(t.count*3);for(let e=0;e<t.count;e++){let t=e%108.5*4,r=Math.floor(e/108.5)*4,i=Math.min(ue-1,r*431+t);n[e*3]=_e[i*3],n[e*3+1]=_e[i*3+1],n[e*3+2]=_e[i*3+2]}e.setAttribute(`color`,new ge(n,3)),Re=new l(e,new S({vertexColors:!0,roughness:.95})),Re.visible=!1,T.add(Re)}let ze=[[44,92,64],[74,96,66],[92,112,54],[42,84,70],[30,70,58]][g],Ve=[[104,150,88],[126,150,92],[166,172,84],[92,136,96],[74,118,90]][g],He=y.snow<0||g===2,Ge=$e(Z(ze),Z(Ve),Z([82,60,44]),He),et=[];if(y.trees>0){let e=new R,t=new B,n=new W,i=new W,a=new r(Ge,new S({vertexColors:!0,roughness:.9}),y.trees),o=0;for(let r=0;r<y.trees*8&&o<y.trees;r++){let r=-900+w.rand()*2400,s=230-w.rand()*1900,c=K(r,s),l=.5,u=Math.abs(K(r+l*8,s)-c)/8+Math.abs(K(r,s+l*8)-c)/8;if(c<3||c>y.tree+w.noise(r*.01,s*.01)*30||u>.55||w.fbm(r*.004,s*.004,3)<-.12||Math.hypot(r+40,s-250)<70)continue;let d=14+w.rand()*18;i.set(r,c-1,s),t.setFromAxisAngle(new W(0,1,0),w.rand()*6.28),n.set(d*(.8+w.rand()*.3),d,d*(.8+w.rand()*.3)),a.setMatrixAt(o++,e.compose(i,t,n)),et.push(i.clone().setY(c+d))}a.count=o,a.castShadow=a.receiveShadow=!0,T.add(a)}{let e=new n(1,1),t=e.attributes.position,i=Ue(31);for(let e=0;e<t.count;e++){let n=t.getX(e),r=t.getY(e),a=t.getZ(e),o=.82+.3*(i.noise(n*1.7+a*.9,r*1.7-a*.6)*.5+.5);t.setXYZ(e,n*o,r*o*.7,a*o)}e.computeVertexNormals();let a=new r(e,new S({color:xe.clone().lerp(be,.3).multiplyScalar(1.6),roughness:.95,flatShading:!0}),420),o=new R,s=new B,c=new W,l=new W,u=0;for(let e=0;e<4e3&&u<420;e++){let e=-700+w.rand()*2e3,t=230-w.rand()*1500,n=K(e,t);if(n<1)continue;let r=2+w.rand()**3*16;l.set(e,n+r*.2,t),s.setFromEuler(new f(w.rand(),w.rand()*6,w.rand())),c.setScalar(r),a.setMatrixAt(u++,o.compose(l,s,c))}a.count=u,a.castShadow=a.receiveShadow=!0,T.add(a)}let Q=[];T.children.forEach(e=>{e.isInstancedMesh&&e.geometry.type===`DodecahedronGeometry`&&Q.push(e)});let tt=[],nt=null,$=y.lake?new W(y.lake.x-y.lake.r*1.15,0,y.lake.z+y.lake.r*.55):new W(260,0,-330);if($.y=K($.x,$.z),y.landmark===`cabin`){let e=new c,t=new S({color:Z([150,108,74]),roughness:.85}),n=new S({color:Z([70,62,66]),roughness:.7}),r=new l(new O(16,9,11),t);r.position.y=4.5;let i=new pe([new he(-9.5,0),new he(9.5,0),new he(0,7)]),a=new l(new p(i,{depth:13,bevelEnabled:!1}),n);a.position.set(0,9,-6.5);let o=new l(new O(2,6,2),t);o.position.set(4.5,13,0);let s=new l(new ee(3,2.4),new C({color:new U(1,.62,.3).multiplyScalar(6)}));s.position.set(-3,4.6,5.56);let u=s.clone();u.position.x=3.5,e.add(r,a,o,s,u),e.traverse(e=>{e.castShadow=e.receiveShadow=!0}),e.position.copy($),e.rotation.y=-.5,e.scale.setScalar(1.3);let d=new de(16754784,900,140,2);d.position.copy($).add(new W(-2,7,14)),tt.push(d),T.add(e,d)}else if(y.landmark===`dish`){let e=new c,n=new S({color:15263458,roughness:.45,metalness:.3,envMap:t.env}),r=[];for(let e=0;e<=20;e++){let t=e/20*22;r.push(new he(t,t*t/60))}let i=new l(new b(r,48),n);i.material.side=2,i.rotation.x=-.9,i.position.y=22;let o=new l(new a(1.4,2.4,22,12),n);o.position.y=11;let s=new l(new a(.3,.3,18,6),n);s.position.set(0,26,-6),s.rotation.x=-.9,e.add(i,o,s),e.traverse(e=>{e.castShadow=e.receiveShadow=!0}),e.position.copy($),e.rotation.y=.7,T.add(e)}else if(y.landmark===`lights`){let e=et.slice().sort((e,t)=>e.distanceTo($)-t.distanceTo($)).slice(0,9),t=[[236,86,72],[244,196,92],[250,236,200],[120,200,255]];nt=new r(new M(.45,8,6),new C({color:16777215}),e.length*22);let n=new R,i=0;e.forEach(e=>{let r=e.y-K(e.x,e.z);for(let a=0;a<22;a++){let o=a/22,s=o*6.28*3.2,c=(1-o)*r*.3+.6;n.makeTranslation(e.x+Math.cos(s)*c,e.y-r*.85+o*r*.8,e.z+Math.sin(s)*c),nt.setMatrixAt(i,n),nt.setColorAt(i,Z(t[(a+i)%4]).multiplyScalar(5)),i++}}),nt.count=i,T.add(nt)}let rt=null,it={w:900,h:260,d:900};if(y.weather){let e=y.weather===`snow`?1700:y.weather===`dust`?900:350,t=new Float32Array(e*3),n=new Float32Array(e);for(let r=0;r<e;r++)t[r*3]=(Math.random()-.5)*it.w,t[r*3+1]=Math.random()*it.h,t[r*3+2]=-Math.random()*it.d,n[r]=Math.random();let r=new v;r.setAttribute(`position`,new ge(t,3)),r.setAttribute(`aSeed`,new ge(n,1));let i=y.weather===`snow`?new U(.9,.94,1):y.weather===`dust`?new U(1,.8,.55).multiplyScalar(1.4):new U(1,.9,.4).multiplyScalar(5);rt=new se(r,new I({transparent:!0,depthWrite:!1,blending:y.weather===`snow`?1:2,fog:!1,uniforms:{uTime:{value:0},uCol:{value:i},uPR:{value:o},uFall:{value:y.weather===`snow`?9:y.weather===`dust`?-1:0},uBox:{value:new W(it.w,it.h,it.d)},uSize:{value:y.weather===`snow`?5:y.weather===`dust`?3:5}},vertexShader:`
        attribute float aSeed;uniform float uTime,uPR,uFall,uSize;uniform vec3 uBox;varying float vA;
        void main(){vec3 p=position;float t=uTime*(.6+aSeed*.8);
          p.y=mod(p.y-t*uFall+uBox.y*4.,uBox.y);p.x+=sin(t*.6+aSeed*40.)*6.;p.z+=cos(t*.5+aSeed*30.)*6.;
          vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
          gl_PointSize=min(uSize*uPR*(160./-mv.z)*(.6+aSeed*.8),14.*uPR);vA=(.5+.5*sin(uTime*2.+aSeed*50.))*smoothstep(20.,60.,-mv.z+30.);}`,fragmentShader:`uniform vec3 uCol;varying float vA;void main(){float r=length(gl_PointCoord-.5);float a=smoothstep(.5,.1,r)*(.5+.5*vA);if(a<.01)discard;gl_FragColor=vec4(uCol,a);}`})),rt.frustumCulled=!1,T.add(rt)}if(X&&Re){let e=X.onBeforeRender.bind(X),t=Re;rt&&Q.push(rt);let n=0;X.onBeforeRender=(...r)=>{n++%2||(De.visible=!1,t.visible=!0,Q.forEach(e=>e.visible=!1),e(...r),De.visible=!0,t.visible=!1,Q.forEach(e=>e.visible=!0))}}let at=[];{let e=(()=>{let e=document.createElement(`canvas`);e.width=256,e.height=128;let t=e.getContext(`2d`),n=Ue(7),r=t.createImageData(256,128);for(let e=0;e<128;e++)for(let t=0;t<256;t++){let i=(n.fbm(t/60,e/40,5)*.5+.5)*Math.sin(e/128*Math.PI)*Math.sin(t/256*Math.PI),a=(e*256+t)*4;r.data[a]=r.data[a+1]=r.data[a+2]=255,r.data[a+3]=Math.max(0,Math.min(255,(i*1.6-.25)*255))}return t.putImageData(r,0,0),new i(e)})(),t=new le({map:e,color:D.clone().lerp(new U(1,1,1),.25),transparent:!0,depthWrite:!1,opacity:.22,fog:!0});for(let e=0;e<9;e++){let n=new te(t),r=-500+e*230+(Math.random()-.5)*120,i=-500-Math.random()*1300;n.position.set(r,Math.max(0,K(r,i))+30+Math.random()*40,i),n.scale.set(700+Math.random()*500,120+Math.random()*80,1),n.userData.drift=(Math.random()-.5)*6,at.push(n),T.add(n)}}let ot=new U(.55,.62,1),st=m.map((e,t)=>({p:e,i:t})).filter(e=>e.i!==d).map(({p:e,i:t})=>{let n=Pe[e.k],r=new I({vertexShader:Oe,fragmentShader:ke,fog:!1,uniforms:{uSoil:{value:J(n.soil)},uLight:{value:J(n.light)},uShadow:{value:J(n.shadow)},uHaze:{value:J(n.haze)},uWater:{value:J(n.water)},uDeep:{value:J(n.deep)},uAccent:{value:ot},uSun:{value:N>0?k:re},uSeed:{value:e.k*3.7+1.3},uTime:{value:0},uHot:{value:0},uIce:{value:n.ice},uSea:{value:n.sea},uClouds:{value:n.clouds},uLights:{value:y.night>.5?n.lights:0},uCraters:{value:n.craters},uAir:{value:(1-y.night)*.22},uAirCol:{value:Ne.clone().lerp(Y,.55)}}}),i=new c,a=new l(new M(1,64,48),r);a.userData.page=t,i.add(a),i.traverse(e=>e.layers.set(1));let o=new I({vertexShader:E,fragmentShader:Ae,side:1,transparent:!0,depthWrite:!1,blending:2,fog:!1,uniforms:{uHaze:{value:J(n.haze)},uAccent:{value:ot},uCenter:{value:new W},uSun:{value:N>0?k:re},uRad:{value:1},uShell:{value:1.2},uHot:{value:0}}}),s=new l(new M(1.2,48,32),o);return s.layers.set(1),i.add(s),T.add(i),{i:t,group:i,mat:r,atmo:o,r:1,hot:0}}),ct=j(t.env);ct.group.scale.setScalar(13),ct.group.userData.ship=!0,T.add(ct.group);let lt=new W(-60,0,250);lt.y=Math.max(K(lt.x,lt.z),0)+24;let ut=new W(200,lt.y+40,-1400),dt=new B;{let e=new R().lookAt(lt,ut,new W(0,1,0));dt.setFromRotationMatrix(e)}let ft=0,pt=new f,mt=new B;function ht(e,t,n,r){let i=document.documentElement.classList.contains(`reading`);ft+=(+!!i-ft)*.06,e.position.copy(lt).add(new W(Math.sin(r*.045)*22-ft*30,Math.sin(r*.06)*4+ft*18,Math.cos(r*.035)*14+ft*40)),pt.set(n+ft*.2,t,0,`YXZ`),e.quaternion.copy(dt).multiply(mt.setFromEuler(pt)),e.updateMatrixWorld()}function gt(e){e.position.copy(lt),e.quaternion.copy(dt),e.updateMatrixWorld()}let _t=[[.86,.13],[.62,.09],[.95,.31],[.73,.25]],vt=[2.3,1.4,1.05,.85].map((e,t)=>[..._t[(t+d)%4],e]),yt=[[.8,.4,2.2],[.3,.38,1.4],[.6,.42,1.1],[.9,.48,.9]];function bt(e,t){let n=t<1?yt:vt,r=Math.tan(s.degToRad(e.fov/2)),i=new W;st.forEach((e,a)=>{let[o,c,l]=n[a],u=2300;i.set((o*2-1)*r*t,(1-c*2)*r,-1).normalize().applyQuaternion(dt),e.group.position.copy(lt).addScaledVector(i,u),e.r=Math.tan(s.degToRad(l))*u,e.group.scale.setScalar(e.r)})}let xt=new W,St=new W(0,1,0),Ct=0;function wt(t,n,r,i){e.shadowMap.autoUpdate=!1,Ct++<2&&(e.shadowMap.needsUpdate=!0),Ie.uniforms.uTime.value=r?0:t,X&&(X.material.uniforms.uTime.value=r?0:t),rt&&(rt.material.uniforms.uTime.value=r?0:t),at.forEach(e=>{r||(e.position.x+=e.userData.drift*n)}),nt&&!r&&nt.material.color.setScalar(.85+.15*Math.sin(t*3)),st.forEach(e=>{e.hot+=(+(e.i===i)-e.hot)*Math.min(1,n*14),e.mat.uniforms.uHot.value=e.hot,e.atmo.uniforms.uHot.value=e.hot,e.mat.uniforms.uTime.value=t,e.group.getWorldPosition(xt),e.atmo.uniforms.uCenter.value.copy(xt),e.atmo.uniforms.uRad.value=e.r,e.atmo.uniforms.uShell.value=e.r*1.2});let a=t*.05;ct.group.position.set(260+Math.sin(a)*220,Math.max(0,K(260,-620))+150+Math.sin(a*2)*14,-620+Math.sin(a*2)*90),ct.group.quaternion.setFromAxisAngle(St,-a).multiply(mt.setFromEuler(pt.set(Math.cos(a)*.05,0,Math.sin(a)*.06))),ct.setBurn(.32),ct.update(t),tt.forEach(e=>e.intensity=900*(.92+.08*Math.sin(t*9)*Math.sin(t*5.3)))}return{scene:T,sunDir:N>0?k:re,flare:y.flare,haze:D,exposure:y.exposure,pose:ht,rest:gt,layout:bt,update:wt,skyBodies:()=>st.map(e=>({pos:e.group.getWorldPosition(new W),r:e.r,i:e.i})),dispose(){T.traverse(e=>{let t=e;t.geometry?.dispose();let n=t.material;(Array.isArray(n)?n:n?[n]:[]).forEach(e=>e.dispose())}),X?.dispose(),ct.dispose()}}}var Q=e=>(e=Math.min(1,Math.max(0,e)),e*e*(3-2*e)),tt=e=>(e=Math.min(1,Math.max(0,e)),e*e*e),nt=e=>(e=Math.min(1,Math.max(0,e)),1-(1-e)**3),$=new U(.004,.006,.014);function rt(e,t,n,r,i,a){let o=i.position.clone(),s=i.quaternion.clone(),c=new R;new B;let l=new W,u=new W(0,1,0),d=e<0?1.25:.95,f=t<0?1.7:1.65,p=0,m=e<0?(()=>{let e=n.moons[t],a=e.group.getWorldPosition(new W),l=a.clone().sub(o).normalize(),d=a.distanceTo(o),f=e.radius*1.15;c.lookAt(o,a,u);let p=new B().setFromRotationMatrix(c),m=t>=0?r(t).haze:$;return e=>{i.quaternion.slerpQuaternions(s,p,Q(e*1.7));let t=d*(f/d)**(tt(e)*.85+Q(e)*.15);return i.position.copy(a).addScaledVector(l,-t),{scene:n.scene,veil:Q((e-.7)/.3),color:m}}})():(()=>{let n=r(e),a=(t>=0?n.skyBodies().find(e=>e.i===t)?.pos:void 0)??o.clone().add(new W(0,1,-1.2).multiplyScalar(1e3));c.lookAt(o,a,u);let d=new B().setFromRotationMatrix(c),f=t>=0?n.haze.clone().lerp(new U(1,1,1),.35):$;return e=>(i.quaternion.slerpQuaternions(s,d,Q(e*1.4)),l.copy(a).sub(o).normalize(),i.position.copy(o).addScaledVector(l,tt(e)*520).add(u.clone().multiplyScalar(tt(e)*260)),{scene:n.scene,veil:Q((e-.45)/.55),color:f})})(),h=t>=0?(()=>{let e=r(t);e.rest(i);let n=i.position.clone();i.quaternion.clone();let a=n.clone().add(new W(-120,620,520));c.lookAt(a,n.clone().add(new W(140,-260,-900)),u);let o=new B().setFromRotationMatrix(c),s=e.haze.clone().lerp(new U(1,1,1),.35),l=new W,d=new B;return(t,n)=>(e.pose(i,0,0,n),l.copy(i.position),d.copy(i.quaternion),i.position.lerpVectors(a,l,nt(t)),i.position.x+=Math.sin(t*Math.PI)*60,i.quaternion.slerpQuaternions(o,d,Q(t*1.15)),{scene:e.scene,veil:1-Q(t/.42),color:s})})():(()=>{let t=n.moons[e],r=t.group.getWorldPosition(new W),a=new g;a.position.set(0,0,0),a.rotation.set(-.155,0,0,`YXZ`),a.updateMatrixWorld();let o=a.quaternion.clone(),s=r.clone().normalize(),l=t.radius*1.3,d=r.length();c.lookAt(new W,r,u);let f=new B().setFromRotationMatrix(c);return e=>{let t=l*(d/l)**+nt(e);return i.position.copy(r).addScaledVector(s,-t),e>=1&&i.position.set(0,0,0),i.quaternion.slerpQuaternions(f,o,Q((e-.15)/.85)),{scene:n.scene,veil:1-Q(e/.35),color:$}}})();return{to:t,step(e,t,n){if(p+=e,p<d){let e=m(p/d);return{scene:e.scene,veil:e.veil,veilColor:e.color,done:!1}}let r=Math.min(1,(p-d)/f),i=h(r,n);return{scene:i.scene,veil:i.veil,veilColor:i.color,done:r>=1}}}}var it=e=>(e=Math.min(1,Math.max(0,e)),e*e*(3-2*e)),at=(e,t,n,r)=>e+(t-e)*(1-Math.exp(-n*r));function ot(t,n,r){let i=window.Site,a=i.pages,o=window.matchMedia(`(prefers-reduced-motion: reduce)`),c=Math.min(window.devicePixelRatio||1,1.5),l=new ve({canvas:t,antialias:!1,powerPreference:`high-performance`});l.setPixelRatio(c),l.setClearColor(0,1);let u=ue(l),f=new g(46,1,.05,3e3);f.layers.enable(1);let p=ze(l,u,c,a),m=new _e(1,1,{type:d,samples:4}),h=new ae(l,m),_=new L(p.scene,f);h.addPass(_);let v=new N(new he(1,1),.18,.3,1.35);h.addPass(v);let y=new F({vertexShader:Me,fragmentShader:Ne,uniforms:{tDiffuse:{value:null},uTime:{value:0},uGrain:{value:.008},uExposure:{value:0},uVeil:{value:0},uVeilColor:{value:new U(0,0,0)},uFlare:{value:0},uFlareTint:{value:new U(.55,.65,1)},uSunUv:{value:new he},uAspect:{value:1},uRes:{value:new he},uShake:{value:0}}});h.addPass(y);let b=y.uniforms,x=new Map;function S(e){let t=x.get(e);return t||(t=et(l,u,c,e,a),x.set(e,t),T&&t.layout(f,T/E)),t}let C=a.map((e,t)=>{let r=document.createElement(`button`);return r.type=`button`,r.className=`wl`,r.textContent=e.name,r.setAttribute(`aria-label`,`Travel to ${e.name}`),r.addEventListener(`click`,()=>i.go(t)),r.addEventListener(`pointerenter`,()=>D=t),r.addEventListener(`pointerleave`,()=>{D===t&&(D=-1)}),r.addEventListener(`focus`,()=>D=t),r.addEventListener(`blur`,()=>{D===t&&(D=-1)}),n.appendChild(r),r}),w=document.createElement(`button`);w.type=`button`,w.className=`wl ship`,w.textContent=`Fly`,w.setAttribute(`aria-label`,`Fly Starship (a game)`),w.addEventListener(`click`,()=>be()),n.appendChild(w);let T=0,E=0,D=-1,O=i.page(),k=null,A={x:0,y:0,vx:0,vy:0},j=null,M={x:.5,y:.5},ee=O<0,te=0,ne=0,P=performance.now(),ie=P,I=0,oe=-2.2,se=0,ce=!1,le=!1,R=-1,z=new W,B=new W,V=new W,H=new W,de=new re,fe=new he;function pe(){let e=innerWidth,t=innerHeight;(e!==T||t!==E)&&(T=e,E=t,l.setSize(T,E,!1),h.setSize(T,E),v.resolution.set(T,E),b.uRes.value.set(T*c,E*c),b.uAspect.value=T/E,f.aspect=T/E,f.fov=T/E<1?62:46,f.updateProjectionMatrix(),me(f,0,0),p.layout(f,T/E),x.forEach(e=>e.layout(f,T/E)))}function me(e,t,n){e.position.set(0,0,0),e.rotation.set(Ie+n,t,0,`YXZ`),e.updateMatrixWorld()}function ge(e,t){fe.set(e/T*2-1,-(t/E)*2+1),de.setFromCamera(fe,f);let n=O<0?p.scene:S(O).scene,r=de.intersectObjects(n.children,!0);for(let e of r){let t=e.object;for(;t;){if(t.userData.page!=null)return{page:t.userData.page};if(t.userData.ship)return{ship:!0};t=t.parent}}return null}t.addEventListener(`pointerdown`,e=>{j={x:e.clientX,y:e.clientY,moved:!1},t.setPointerCapture(e.pointerId)}),t.addEventListener(`pointermove`,e=>{if(M.x=e.clientX/T,M.y=e.clientY/E,j){let t=e.clientX-j.x,n=e.clientY-j.y;Math.abs(t)+Math.abs(n)>4&&(j.moved=!0),A.vx-=t*.0022,A.vy-=n*.0016,j.x=e.clientX,j.y=e.clientY;return}if(e.pointerType===`touch`)return;let n=ge(e.clientX,e.clientY);D=n?.page??-1,t.style.cursor=n?`pointer`:`grab`}),t.addEventListener(`pointerup`,e=>{let t=j;if(j=null,t&&!t.moved){let t=ge(e.clientX,e.clientY);t?.page==null?t?.ship&&be():i.go(t.page)}}),t.addEventListener(`pointerleave`,()=>{j||(D=-1)});function ye(e){let t=e.detail;if(t===O&&!k)return;let n=k?k.to:O;t>=0&&S(t),k=o.matches?null:rt(n,t,p,e=>S(e),f,T/E),O=t}addEventListener(`orbit:page`,ye);function be(){if(le)return;let e=window.Flight3D??window.Flight;if(!e)return;le=!0,document.documentElement.classList.add(`flying`),b.uVeil.value=0;let t=O;e.start({heading:null,from:t,onExit(e){le=!1,document.documentElement.classList.remove(`flying`),ie=performance.now(),e>=0&&i.go(e)}})}function xe(n){if(se=requestAnimationFrame(xe),le||document.hidden){ie=n;return}pe();let a=o.matches,u=Math.min(.05,(n-ie)/1e3);ie=n,!k&&n-P>4e3&&(te++,u>.0115&&ne++,te>=240&&(ne/te>.04&&c>1.01&&(c=Math.max(1,c-.125),l.setPixelRatio(c),h.setPixelRatio(c),T=0,pe()),te=0,ne=0)),a||(I+=u),j||(A.vx*=Math.exp(-u*6),A.vy*=Math.exp(-u*6)),A.x=Math.max(-.45,Math.min(.45,A.x+A.vx*(j?1:u*8))),A.y=Math.max(-.16,Math.min(.2,A.y+A.vy*(j?1:u*8))),j?(A.vx=0,A.vy=0):(A.x=at(A.x,0,.6,u),A.y=at(A.y,0,.6,u));let d=a?0:(M.x-.5)*-.03,m=a?0:(M.y-.5)*-.018,g=a?0:Math.sin(I*.23)*.006,v=(n-P)/1e3;oe=a?1.1:-2.4+3.5*it(v/7.5),b.uExposure.value=a?1:.2+.85*it(v/3.2),(O<0||k)&&p.moons,p.moons.forEach(e=>e.hot=at(e.hot,+(e.index===D),14,u));let y;if(k){let e=k.step(u,f,I);y=e.scene,b.uVeil.value=e.veil,b.uVeilColor.value.copy(e.veilColor),e.done&&(k=null)}else if(O<0)me(f,A.x+d,A.y+m+g),y=p.scene,b.uVeil.value=0;else{let e=S(O);e.pose(f,A.x+d,A.y+m+g,I),y=e.scene,b.uVeil.value=0}_.scene=y;let N=y===p.scene;if(N!==ee&&(ee=N,document.documentElement.classList.toggle(`space`,N)),N){l.shadowMap.autoUpdate=!0,p.update(I,u,a,oe,I+18),(R<0||R<1&&v>8)&&(p.captureEnv(f.position),R=+(v>8)),p.sunDir&&z.copy(p.sunDir).multiplyScalar(850).project(f);let e=s.clamp((oe+.4)/1.2,0,1)*+(z.z<1);b.uFlare.value=e*.55,b.uSunUv.value.set(z.x*.5+.5,z.y*.5+.5)}else{let e=[...x.values()].find(e=>e.scene===y);e?.update(I,u,a,D),e&&(z.copy(e.sunDir).multiplyScalar(800).add(f.position).project(f),b.uFlare.value=z.z<1&&Math.abs(z.x)<1.3&&Math.abs(z.y)<1.3?e.flare:0,b.uSunUv.value.set(z.x*.5+.5,z.y*.5+.5))}b.uTime.value=a?0:I;let F=!k,re=N?p.moons.map(e=>({pos:e.group.getWorldPosition(B).clone(),r:e.radius,i:e.index})):[...x.values()].find(e=>e.scene===y)?.skyBodies()??[],ae=!N&&T<820;if(C.forEach((e,t)=>{let n=re.find(e=>e.i===t);if(!F||!n||ae){e.style.opacity=`0`,e.tabIndex=-1;return}z.copy(n.pos).project(f);let r=z.z<1&&Math.abs(z.x)<1.05&&Math.abs(z.y)<1.05;if(r&&N){H.copy(n.pos).sub(f.position).normalize();let e=V.copy(Y).sub(f.position),t=e.dot(H);t>0&&e.lengthSq()-t*t<1e4&&t<n.pos.distanceTo(f.position)&&(r=!1)}let i=(B.copy(n.pos).add(new W().setFromMatrixColumn(f.matrixWorld,0).multiplyScalar(n.r)).project(f).x*.5+.5)*T+10,a=(-z.y*.5+.5)*E;e.style.transform=`translate3d(${i.toFixed(1)}px,${(a-11).toFixed(1)}px,0)`,e.style.opacity=r?`1`:`0`,e.tabIndex=r?0:-1,e.classList.toggle(`hot`,D===t)}),N&&F){p.ship.group.getWorldPosition(B),z.copy(B).project(f);let e=z.z<1&&Math.abs(z.x)<.98&&Math.abs(z.y)<.98;w.style.transform=`translate3d(${((z.x*.5+.5)*T+26).toFixed(1)}px,${((-z.y*.5+.5)*E-30).toFixed(1)}px,0)`,w.style.opacity=e?`1`:`0`,w.tabIndex=e?0:-1}else w.style.opacity=`0`,w.tabIndex=-1;h.render(),e(t),i.drawProjects?.(),ce||(ce=!0,r())}return se=requestAnimationFrame(xe),window.Scene3D={launch:be},()=>{cancelAnimationFrame(se),removeEventListener(`orbit:page`,ye),C.forEach(e=>e.remove()),w.remove(),h.dispose(),p.dispose(),x.forEach(e=>e.dispose()),u.dispose(),l.dispose()}}export{ot as createDirector};