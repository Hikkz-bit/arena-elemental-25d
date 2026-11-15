import * as T from './vendor/three.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {PILLARS} from './physics.js';
export {T};

// Four arenas built in code. The playable space never changes (24 x 20 m floor, four pillars, low walls);
// everything else is scenery: a shader sky, painted floor, backdrop, lights, particles and drifting mist.
const THEMES={
 abbey:{top:0x070d1f,horizon:0x2a3c5c,below:0x0b1220,glow:0x6f86b8,fog:0x1c2c40,density:.022,stars:1,moon:[-.45,.5,-.74],moonColor:0xe9efd8,cloud:.5,cloudColor:0x33455f,aurora:0,ember:0,
  stone:0x7b868a,trim:0xb4c0b0,dark:0x232f36,accent:0xffb85c,floor:['#414e53','#4d5b60','#333e43'],outer:['#1b2428','#222d31'],hemi:[0xbfd6ff,0x141c22,1.25],sun:[0xcfe0ff,2,[-8,16,-7]],rim:0x7fa2ff,particles:'motes',mist:0x8fa6c4,tint:[1,1.03,1.1]},
 volcano:{top:0x150a12,horizon:0x5a1f1a,below:0x2a0b08,glow:0xff5a1e,fog:0x3b1a1c,density:.023,stars:.3,moon:null,moonColor:0xffffff,cloud:.62,cloudColor:0x2a1418,aurora:0,ember:1,
  stone:0x5a3f4a,trim:0xb8795a,dark:0x1c1216,accent:0xff6a2c,floor:['#3f3038','#4a373f','#30252c'],outer:['#1a0f10','#241416'],hemi:[0xffb090,0x5a1c10,1.25],sun:[0xffc08a,1.9,[6,14,8]],rim:0xff5a2a,particles:'embers',mist:0x6b2a1c,tint:[1.12,1,.92]},
 forest:{top:0x06181c,horizon:0x1d4a45,below:0x071512,glow:0x4fd6a0,fog:0x16332f,density:.025,stars:.6,moon:[.5,.6,-.62],moonColor:0xd8ffe6,cloud:.45,cloudColor:0x18403a,aurora:0,ember:0,
  stone:0x4b6c60,trim:0x8fbd95,dark:0x12211c,accent:0x8affb9,floor:['#33503f','#3d5a49','#283d35'],outer:['#16291f','#1d3527'],hemi:[0xbff5dc,0x0f1c16,1.25],sun:[0xd6ffe6,1.8,[-6,15,6]],rim:0x66ffb0,particles:'fireflies',mist:0x6fd0a8,tint:[1,1.09,1.02]},
 glacier:{top:0x081530,horizon:0x4d7ba6,below:0x1a2c44,glow:0x9fd8ff,fog:0x4a6c8c,density:.019,stars:.9,moon:[.3,.42,-.86],moonColor:0xf2fbff,cloud:.35,cloudColor:0x6b8fb0,aurora:1,ember:0,
  stone:0x93b5c8,trim:0xe2f5f7,dark:0x2b4156,accent:0x9adcff,floor:['#5b7890','#6a889f','#4d687f'],outer:['#6f8fa8','#86a6bd'],hemi:[0xd6ecff,0x24384c,1.45],sun:[0xe2f0ff,2,[-8,16,7]],rim:0x9fe0ff,particles:'snow',mist:0xcfe6f5,tint:[1.02,1.06,1.12]}
};

const SKY_VERTEX=`varying vec3 vDir;void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_Position=p.xyww;}`;
// Hash is an integer PCG (stable across GPUs); noise is value noise summed in four octaves.
const SKY_FRAGMENT=`uniform float uTime,uStars,uMoon,uCloud,uAurora,uEmber;uniform vec3 uTop,uHorizon,uBelow,uGlow,uMoonColor,uCloudColor,uMoonDir;varying vec3 vDir;
uint pcg(uint v){uint s=v*747796405u+2891336453u;uint w=((s>>((s>>28u)+4u))^s)*277803737u;return (w>>22u)^w;}
float hash12(vec2 p){uvec2 q=uvec2(ivec2(floor(p)));return float(pcg(q.x+pcg(q.y)))*(1.0/4294967296.0);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);return mix(mix(hash12(i),hash12(i+vec2(1.0,0.0)),u.x),mix(hash12(i+vec2(0.0,1.0)),hash12(i+vec2(1.0,1.0)),u.x),u.y);}
float fbm(vec2 p){float a=0.5,s=0.0;for(int i=0;i<4;i++){s+=a*vnoise(p);p=p*2.03+vec2(17.3,9.1);a*=0.5;}return s;}
void main(){
 vec3 d=normalize(vDir);float h=d.y,up=smoothstep(0.02,0.3,h);
 vec3 col=mix(uHorizon,uTop,smoothstep(0.0,0.7,h));col=mix(col,uBelow,smoothstep(0.0,-0.2,h));col+=uGlow*pow(1.0-min(abs(h),1.0),7.0)*0.35;
 vec2 sp=d.xz/(abs(h)+0.4)*38.0,cell=floor(sp);float rnd=hash12(cell);vec2 off=vec2(hash12(cell+31.0),hash12(cell+57.0))-0.5;
 float star=smoothstep(0.07,0.0,length(fract(sp)-0.5-off*0.6))*step(0.82,rnd)*(0.55+0.45*sin(uTime*1.7+rnd*60.0));col+=vec3(0.9,0.95,1.0)*star*uStars*up;
 float m=max(dot(d,uMoonDir),0.0);col+=uMoonColor*uMoon*(smoothstep(0.9989,0.9993,m)+pow(m,220.0)*0.3+pow(m,14.0)*0.1);
 vec2 cp=d.xz/(max(h,0.0)+0.22)*1.3+vec2(uTime*0.012,uTime*0.004);float c=smoothstep(1.0-uCloud,1.4-uCloud,fbm(cp))*smoothstep(0.0,0.22,h);col=mix(col,uCloudColor+uGlow*0.12,c*0.8);
 vec2 ap=d.xz/(max(h,0.0)+0.35);float wave=sin(ap.x*3.0+fbm(ap*1.2+uTime*0.03)*5.0+uTime*0.1)*0.5+0.5,rays=0.6+0.4*vnoise(vec2(ap.x*30.0,uTime*0.3));
 float curtain=pow(wave,3.0)*rays*smoothstep(0.06,0.28,h)*smoothstep(0.8,0.3,h);col+=mix(vec3(0.15,1.0,0.65),vec3(0.55,0.45,1.0),clamp(h*1.8,0.0,1.0))*curtain*uAurora*0.55;
 float haze=fbm(vec2(d.x*4.0+d.z*3.0,h*6.0-uTime*0.08));col+=uGlow*uEmber*haze*pow(1.0-min(abs(h),1.0),4.0)*0.6;
 gl_FragColor=vec4(col,1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

function mulberry(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function canvasTexture(w,h,draw,{repeat=null,srgb=true}={}){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const tex=new T.CanvasTexture(cv);if(srgb)tex.colorSpace=T.SRGBColorSpace;if(repeat){tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(...repeat);}tex.anisotropy=4;return tex;}
function blobs(c,rand,w,h,count,r0,r1,color){for(let i=0;i<count;i++){const x=rand()*w,y=rand()*h,r=r0+rand()*(r1-r0),g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}}

// Light grey masonry; the material colour tints it.
function stoneTexture(rand){return canvasTexture(256,256,(c,w,h)=>{c.fillStyle='#c4c4c4';c.fillRect(0,0,w,h);blobs(c,rand,w,h,26,18,60,'rgba(0,0,0,.16)');blobs(c,rand,w,h,18,12,44,'rgba(255,255,255,.14)');
 for(let y=0;y<h;y+=64)for(let x=-(y/64%2)*64;x<w;x+=128){c.fillStyle='rgba(0,0,0,.28)';c.fillRect(x,y,128,3);c.fillRect(x,y,3,64);c.fillStyle='rgba(255,255,255,.12)';c.fillRect(x+3,y+3,125,2);}
 for(let i=0;i<260;i++){c.fillStyle=rand()<.5?'rgba(0,0,0,.14)':'rgba(255,255,255,.1)';c.fillRect(rand()*w,rand()*h,1+rand()*3,1+rand()*2);}},{repeat:[1,1]});}

function floorTextures(id,p,rand){
 const W=1024,H=Math.round(W*20.6/24.6),ppm=W/24.6;
 const map=canvasTexture(W,H,(c)=>{
  c.fillStyle=p.floor[2];c.fillRect(0,0,W,H);const rowH=1.03*ppm;
  for(let y=0;y<H;y+=rowH){let x=-rand()*1.2*ppm;while(x<W){const w=(.9+rand()*.9)*ppm;c.fillStyle=p.floor[rand()<.5?0:1];c.fillRect(x+2,y+2,w-4,rowH-4);c.fillStyle=`rgba(0,0,0,${(rand()*.18).toFixed(3)})`;c.fillRect(x+2,y+2,w-4,rowH-4);c.fillStyle='rgba(255,255,255,.07)';c.fillRect(x+2,y+2,w-4,3);c.fillRect(x+2,y+2,3,rowH-4);c.fillStyle='rgba(0,0,0,.24)';c.fillRect(x+2,y+rowH-5,w-4,3);
    for(let k=0;k<9;k++){c.fillStyle=rand()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.12)';c.fillRect(x+4+rand()*(w-10),y+4+rand()*(rowH-10),2+rand()*4,2+rand()*3);}
    if(rand()<.2){c.strokeStyle='rgba(0,0,0,.38)';c.lineWidth=1.5;c.beginPath();let cx=x+rand()*w,cy=y+4;c.moveTo(cx,cy);for(let s=0;s<4;s++){cx+=(rand()-.5)*14;cy+=rowH/4;c.lineTo(cx,cy);}c.stroke();}
    x+=w;}}
  if(id==='abbey')blobs(c,rand,W,H,26,30,110,'rgba(74,104,72,.2)');
  if(id==='forest'){blobs(c,rand,W,H,60,30,120,'rgba(70,140,82,.28)');for(let i=0;i<220;i++){c.fillStyle=['rgba(150,190,90,.5)','rgba(96,150,84,.5)','rgba(190,160,80,.45)'][i%3];c.beginPath();c.ellipse(rand()*W,rand()*H,3+rand()*4,1.5+rand()*2,rand()*3,0,7);c.fill();}}
  if(id==='glacier'){blobs(c,rand,W,H,50,40,140,'rgba(235,246,255,.3)');c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=1;for(let i=0;i<90;i++){const x=rand()*W,y=rand()*H,a=rand()*7;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*40,y+Math.sin(a)*40);c.stroke();}}
  if(id==='volcano')blobs(c,rand,W,H,40,30,120,'rgba(0,0,0,.3)');
  // Central dais.
  c.fillStyle='rgba(0,0,0,.2)';c.beginPath();c.arc(W/2,H/2,3.3*ppm,0,7);c.fill();c.strokeStyle='rgba(255,255,255,.12)';c.lineWidth=5;for(const r of [3.3,2.05])c.beginPath(),c.arc(W/2,H/2,r*ppm,0,7),c.stroke();
 });
 const glow=canvasTexture(W,H,(c)=>{
  c.fillStyle='#000';c.fillRect(0,0,W,H);c.translate(W/2,H/2);c.strokeStyle='#fff';c.fillStyle='#fff';c.shadowColor='#fff';c.shadowBlur=14;c.lineCap='round';
  c.lineWidth=5;for(const r of [2.3,2.8])c.beginPath(),c.arc(0,0,r*ppm,0,7),c.stroke();c.lineWidth=3;c.beginPath();for(let i=0;i<=8;i++){const a=i*Math.PI*3/4;c[i?'lineTo':'moveTo'](Math.sin(a)*1.6*ppm,Math.cos(a)*1.6*ppm);}c.stroke();
  for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.translate(0,-2.55*ppm);c.beginPath();c.moveTo(0,-8);c.lineTo(7,0);c.lineTo(0,8);c.lineTo(-7,0);c.closePath();c.fill();c.restore();}
  if(id==='volcano'){c.lineWidth=3;c.globalAlpha=.85;for(let i=0;i<26;i++){let x=(rand()-.5)*W,y=(rand()-.5)*H;if(Math.hypot(x,y)<3.4*ppm)continue;c.beginPath();c.moveTo(x,y);for(let s=0;s<5;s++){x+=(rand()-.5)*70;y+=(rand()-.5)*70;c.lineTo(x,y);}c.stroke();}}
  if(id==='forest'){c.globalAlpha=.7;for(let i=0;i<70;i++){const x=(rand()-.5)*W,y=(rand()-.5)*H;c.beginPath();c.arc(x,y,1.5+rand()*2,0,7);c.fill();}}
 });
 return {map,glow};
}
function groundTexture(p,rand,lava){return canvasTexture(256,256,(c,w,h)=>{c.fillStyle=lava?'#ff7a1e':p.outer[0];c.fillRect(0,0,w,h);if(lava){blobs(c,rand,w,h,34,14,46,'rgba(255,214,90,.7)');blobs(c,rand,w,h,70,14,40,'rgba(30,8,6,.95)');}else{blobs(c,rand,w,h,40,16,60,p.outer[1]);for(let i=0;i<300;i++){c.fillStyle=rand()<.5?'rgba(255,255,255,.05)':'rgba(0,0,0,.14)';c.fillRect(rand()*w,rand()*h,2,2);}}},{repeat:lava?[9,9]:[16,16]});}
let glowShared=null;
function glowTexture(){return glowShared??=canvasTexture(64,64,(c)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.2,'rgba(255,255,255,.75)');g.addColorStop(.5,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});}

export function buildWorld(scene,id){
 const p=THEMES[id]||THEMES.abbey,rand=mulberry(Object.keys(THEMES).indexOf(id)*977+11),group=new T.Group(),animated=[],batches=new Map();scene.add(group);
 scene.background=new T.Color(p.horizon);scene.fog=new T.FogExp2(p.fog,p.density);
 const stoneMap=stoneTexture(rand),mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.9,...extra});
 const M={stone:mat(p.stone,{map:stoneMap}),trim:mat(p.trim,{map:stoneMap}),dark:mat(p.dark,{map:stoneMap}),rock:mat(p.dark,{flatShading:true}),wood:mat(0x4a3d32),iron:mat(0x2a2f36,{metalness:.6,roughness:.5}),
  lit:new T.MeshBasicMaterial({color:new T.Color(p.accent).multiplyScalar(1.6)}),core:new T.MeshBasicMaterial({color:0xfff4d0}),ice:mat(0xa9e2ee,{roughness:.18,metalness:.1,transparent:true,opacity:.88,emissive:0x2a6f9a,emissiveIntensity:.35,flatShading:true}),
  leafA:mat(0x2f6a4b,{flatShading:true}),leafB:mat(0x1f4d3d,{flatShading:true}),leafC:mat(0x3f8455,{flatShading:true}),snow:mat(0xeef6fb,{roughness:1}),cloth:mat(0x7a1f26,{side:T.DoubleSide})};
 // Static pieces are baked into one mesh per material at the end; `live` is for things that move.
 const dummy=new T.Object3D();
 function put(geometry,material,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1){dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();const g=(geometry.index?geometry.toNonIndexed():geometry.clone()).applyMatrix4(dummy.matrix);geometry.dispose();for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);let list=batches.get(material);if(!list)batches.set(material,list=[]);list.push(g);}
 function live(object,x=0,y=0,z=0){object.position.set(x,y,z);group.add(object);return object;}
 // Boxes and cylinders get their UVs in metres so the masonry does not stretch.
 function boxGeometry(w,h,d){const g=new T.BoxGeometry(w,h,d),uv=g.attributes.uv,sizes=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let v=0;v<4;v++){const i=f*4+v;uv.setXY(i,uv.getX(i)*sizes[f][0]/2,uv.getY(i)*sizes[f][1]/2);}return g;}
 function cylinderGeometry(r1,r2,h,n=10){const g=new T.CylinderGeometry(r1,r2,h,n),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*Math.max(1,Math.round(Math.PI*(r1+r2)/2)),uv.getY(i)*h/2);return g;}
 const box=(x,y,z,w,h,d,m=M.stone,ry=0)=>put(boxGeometry(w,h,d),m,x,y,z,0,ry,0);
 const column=(x,z,h,r,m=M.stone,y=0,n=10,top=.86)=>put(cylinderGeometry(r*top,r,h,n),m,x,y+h/2,z);
 const cone=(x,y,z,r,h,n,m,rx=0,ry=0,rz=0)=>put(new T.ConeGeometry(r,h,n),m,x,y,z,rx,ry,rz);
 const rockAt=(x,y,z,s,m=M.rock,sy=1)=>put(new T.IcosahedronGeometry(s,0),m,x,y,z,rand()*3,rand()*3,rand()*3,1,sy,1);
 const glowAt=(x,y,z,color,scale,opacity=.5)=>{const s=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),color,transparent:true,opacity,blending:T.AdditiveBlending,depthWrite:false,fog:false}));s.scale.setScalar(scale);return live(s,x,y,z);};
 const windowAt=(x,y,z,w,h,ry=0)=>{put(new T.PlaneGeometry(w,h),M.lit,x,y,z,0,ry,0);put(new T.CircleGeometry(w/2,10,0,Math.PI),M.lit,x,y+h/2,z,0,ry,0);};

 // Sky, lights, floor.
 const sky=new T.Mesh(new T.SphereGeometry(95,32,20),new T.ShaderMaterial({vertexShader:SKY_VERTEX,fragmentShader:SKY_FRAGMENT,side:T.BackSide,depthWrite:false,fog:false,uniforms:{uTime:{value:0},uTop:{value:new T.Color(p.top)},uHorizon:{value:new T.Color(p.horizon)},uBelow:{value:new T.Color(p.below)},uGlow:{value:new T.Color(p.glow)},uMoonColor:{value:new T.Color(p.moonColor)},uCloudColor:{value:new T.Color(p.cloudColor)},uMoonDir:{value:new T.Vector3(...(p.moon||[0,-1,0])).normalize()},uStars:{value:p.stars},uMoon:{value:p.moon?1:0},uCloud:{value:p.cloud},uAurora:{value:p.aurora},uEmber:{value:p.ember}}}));sky.renderOrder=-10;sky.frustumCulled=false;live(sky);
 group.add(new T.HemisphereLight(p.hemi[0],p.hemi[1],p.hemi[2]));
 const sun=new T.DirectionalLight(p.sun[0],p.sun[1]);sun.position.set(...p.sun[2]);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:14,bottom:-14,near:1,far:50});sun.shadow.bias=-.0012;sun.shadow.normalBias=.03;group.add(sun);
 const rim=new T.DirectionalLight(p.rim,.75);rim.position.set(-p.sun[2][0],6,-p.sun[2][2]);group.add(rim);
 const floorMaps=floorTextures(id,p,rand),floorMaterial=mat(0xffffff,{map:floorMaps.map,emissiveMap:floorMaps.glow,emissive:p.accent,emissiveIntensity:1.1,roughness:id==='glacier'?.5:.92,metalness:id==='glacier'?.15:0});
 const floor=live(new T.Mesh(new T.PlaneGeometry(24.6,20.6),floorMaterial));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;animated.push(t=>{floorMaterial.emissiveIntensity=1+Math.sin(t*1.4)*.3;});
 const lava=id==='volcano',groundMap=groundTexture(p,rand,lava),groundMaterial=lava?mat(0xffffff,{map:groundMap,emissiveMap:groundMap,emissive:0xff5a1a,emissiveIntensity:1.1,roughness:.6}):mat(0xffffff,{map:groundMap,roughness:id==='glacier'?.4:1});
 const ground=live(new T.Mesh(new T.PlaneGeometry(190,190),groundMaterial),0,lava?-1.3:-.06,0);ground.rotation.x=-Math.PI/2;ground.receiveShadow=!lava;
 if(lava){animated.push(t=>{groundMap.offset.set(t*.006,t*.004);groundMaterial.emissiveIntensity=1+Math.sin(t*.9)*.2;});box(0,-1.3,0,26.2,2.5,22.2,M.dark);for(let i=0;i<34;i++){const a=i/34*Math.PI*2,r=1+rand()*.9;rockAt(Math.sin(a)*(13.6+rand()),-.9,Math.cos(a)*(11.6+rand()),r);}}

 // Walls with merlons, buttresses and corner towers.
 for(const z of [-10.3,10.3]){box(0,.55,z,25.3,1.1,.7);box(0,1.16,z,25.3,.16,.92,M.trim);for(let x=-12;x<=12;x+=2)box(x,1.5,z,.7,.55,.78);for(let x=-10;x<=10;x+=5)box(x,.5,z+Math.sign(z)*.55,.9,1,.5,M.dark);}
 for(const x of [-12.3,12.3]){box(x,.55,0,.7,1.1,20);box(x,1.16,0,.92,.16,20,M.trim);for(let z=-9;z<=9;z+=2)box(x,1.5,z,.78,.55,.7);for(let z=-5;z<=5;z+=5)box(x+Math.sign(x)*.55,.5,z,.5,1,.9,M.dark);}
 for(const x of [-12.3,12.3])for(const z of [-10.3,10.3]){column(x,z,3.3,1.15,M.stone,0,10,.92);put(cylinderGeometry(1.3,1.3,.22,10),M.trim,x,3.4,z);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(x+Math.sin(a)*1.05,3.75,z+Math.cos(a)*1.05,.5,.5,.4,M.stone,a);}cone(x,5,z,1,2.2,8,M.dark);}

 // Pillars.
 for(const [x,z] of PILLARS){
  const tree=id==='forest',shaft=tree?M.wood:id==='glacier'?M.trim:M.stone,h=tree?6:4.6;
  box(x,.15,z,1.7,.3,1.7,M.trim);put(cylinderGeometry(.74,.8,.26,12),M.dark,x,.43,z);column(x,z,h-.9,.62,shaft,.56,12,.88);put(cylinderGeometry(.8,.62,.28,12),M.dark,x,h-.2,z);box(x,h+.08,z,1.62,.3,1.62,M.trim);
  if(tree){for(let j=0;j<5;j++)put(new T.IcosahedronGeometry(2+rand()*.9,0),[M.leafA,M.leafB,M.leafC][j%3],x+Math.sin(j*2.1)*1.3,6.6+j*.45,z+Math.cos(j*2.1)*1.1,rand()*3,rand()*3,0);for(let j=0;j<5;j++){const a=j*1.26;cone(x+Math.sin(a)*.7,.45,z+Math.cos(a)*.7,.3,1.1,5,M.wood,Math.cos(a)*.7,0,-Math.sin(a)*.7);}}
  else{for(const y of [1.5,2.6,3.7])put(new T.TorusGeometry(.6,.05,5,14),M.trim,x,y,z,Math.PI/2);
   if(id==='glacier'){put(new T.OctahedronGeometry(.6),M.ice,x,5.6,z,0,rand()*3,0,1,2.2,1);glowAt(x,5.6,z,p.accent,3,.35);}
   if(id==='volcano'){for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;box(x+Math.sin(a)*.58,2.4,z+Math.cos(a)*.58,.07,3,.07,M.lit,a);}}
   if(id==='abbey'){const s=Math.sign(-x);put(new T.PlaneGeometry(.8,1.9),M.cloth,x+s*.66,3.2,z,0,s*Math.PI/2,0);put(new T.PlaneGeometry(.5,.12),M.lit,x+s*.67,3.6,z,0,s*Math.PI/2,0);}}
 }

 // Braziers: the four lights that actually shade the arena.
 for(const x of [-10,10])for(const z of [-7,7]){
  column(x,z,1.45,.13,M.iron,0,6);put(cylinderGeometry(.36,.2,.26,8),M.iron,x,1.56,z);for(let i=0;i<3;i++){const a=i*2.1;box(x+Math.sin(a)*.22,.4,z+Math.cos(a)*.22,.06,.8,.06,M.iron);}
  const flame=new T.Group();for(let i=0;i<3;i++){const tongue=new T.Mesh(new T.ConeGeometry(.16-i*.03,.55-i*.08,6),i===2?M.core:M.lit);tongue.position.set(Math.sin(i*2.1)*.07,.25,Math.cos(i*2.1)*.07);flame.add(tongue);}live(flame,x,1.72,z);
  const halo=glowAt(x,2,z,p.accent,2.6,.55),light=new T.PointLight(p.accent,8,7,2);light.position.set(x,2.1,z);group.add(light);
  animated.push(t=>{const f=Math.sin(t*9+x)*.5+Math.sin(t*14.3+z)*.5;flame.scale.set(1+f*.08,1.15+f*.25,1+f*.08);flame.rotation.y=t*2;light.intensity=8+f*1.6;halo.material.opacity=.5+f*.1;});
 }

 // Backdrop per arena.
 if(id==='abbey'){
  for(const z of [-13.6,13.6])for(let x=-10;x<=10;x+=5){const broken=rand()<.28;column(x-1.7,z,broken?2.5+rand()*2:5,.42);column(x+1.7,z,5,.42);if(!broken){put(new T.TorusGeometry(1.7,.26,5,12,Math.PI),M.stone,x,5,z);box(x,7.15,z,4.5,.5,.8,M.trim);}}
  // Cathedral front.
  box(0,7,-27,16,14,3,M.dark);put(new T.CylinderGeometry(0,9.4,6,4,1),M.dark,0,17,-27,0,Math.PI/4,0,1,1,.32);for(const x of [-11,11]){box(x,11,-27,5,22,5,M.dark);cone(x,26,-27,3.9,8,4,M.stone,0,Math.PI/4);windowAt(x,13,-24.45,1,3.2);windowAt(x,6,-24.45,1,3.2);}
  for(const x of [-5,-2.5,0,2.5,5])windowAt(x,5.2,-25.45,1.1,4.6);put(new T.RingGeometry(1.5,2.1,24),M.lit,0,11.5,-25.45);for(let i=0;i<8;i++)put(new T.PlaneGeometry(.12,1.5),M.lit,0+Math.sin(i*Math.PI/4)*.75,11.5+Math.cos(i*Math.PI/4)*.75,-25.44,0,0,-i*Math.PI/4);glowAt(0,10,-25,0xffc77a,16,.22);
  for(const s of [-1,1])for(let i=0;i<6;i++){const z=-20+i*7.5;box(s*(21+i%2*2),2.5+i%3*1.6,z,1.4,5+i%3*3.2,3.5,M.dark);}
  for(let i=0;i<46;i++){const a=rand()*Math.PI*2,r=15.5+rand()*12,x=Math.sin(a)*r*1.15,z=Math.cos(a)*r;if(Math.abs(x)<13.6&&Math.abs(z)<11.6)continue;if(rand()<.7){box(x,.45,z,.6,.9,.16,M.stone,rand()*.6-.3);put(cylinderGeometry(.3,.3,.16,10),M.stone,x,.9,z,Math.PI/2,0,0);}else{box(x,.7,z,.14,1.4,.14,M.stone);box(x,1,z,.6,.14,.14,M.stone);}}
  for(let i=0;i<7;i++){const a=i*.9+.4,x=Math.sin(a)*19,z=Math.cos(a)*16;column(x,z,4.2,.32,M.wood,0,6,.5);for(let b=0;b<4;b++)put(cylinderGeometry(.04,.1,2,5),M.wood,x+Math.sin(b*1.7)*.6,3.6+b*.35,z+Math.cos(b*1.7)*.6,Math.cos(b*1.7)*.9,0,-Math.sin(b*1.7)*.9);}
 }else if(id==='volcano'){
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2+rand()*.2,r=20+rand()*14,h=6+rand()*10;cone(Math.sin(a)*r,h/2-1.3,Math.cos(a)*r,2.5+rand()*3,h,5,M.rock,rand()*.25-.12,rand()*3,rand()*.25-.12);}
  // The mountain, its crater and three rivers of lava.
  cone(0,11,-52,26,28,9,M.rock,0,.3);put(new T.CylinderGeometry(4.6,5.4,1,9),M.lit,0,24.6,-52);glowAt(0,27,-52,0xff6a1e,44,.5);glowAt(0,34,-52,0xff9a3a,26,.3);
  for(const [x,w] of [[-5,1.5],[1.5,2.1],[7,1.2]]){const stream=new T.Mesh(new T.PlaneGeometry(w,30),M.lit);live(stream,x,10.2,-36.6+Math.abs(x)*.25);stream.rotation.x=-.76;stream.rotation.z=x*.035;}
  for(const x of [-9,9])for(let y=3;y<12;y+=.62)put(new T.TorusGeometry(.24,.06,4,8),M.iron,x,y,-11.2,0,Math.round(y/.62)%2*Math.PI/2,0);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;put(new T.OctahedronGeometry(.9+rand()),M.rock,Math.sin(a)*16.5,.2,Math.cos(a)*14.5,0,rand()*3,0,1,2.4,1);}
 }else if(id==='forest'){
  for(let i=0;i<22;i++){const a=i/22*Math.PI*2+rand()*.15,r=15.5+rand()*8,x=Math.sin(a)*r,z=Math.cos(a)*r,h=8+rand()*5,w=.55+rand()*.35;column(x,z,h,w,M.wood,0,8,.6);for(let j=0;j<4;j++){const b=j*1.57+rand();cone(x+Math.sin(b)*w,.5,z+Math.cos(b)*w,.34,1.4,5,M.wood,Math.cos(b)*.8,0,-Math.sin(b)*.8);}for(let j=0;j<5;j++)put(new T.IcosahedronGeometry(2.4+rand()*1.3,0),[M.leafA,M.leafB,M.leafC][(i+j)%3],x+Math.sin(j*2)*1.6,h-1+j*.7,z+Math.cos(j*2)*1.6,rand()*3,rand()*3,0);}
  for(let i=0;i<26;i++){const a=rand()*Math.PI*2,x=Math.sin(a)*(14+rand()*4),z=Math.cos(a)*(12+rand()*4);put(new T.IcosahedronGeometry(.6+rand()*.7,0),[M.leafA,M.leafC][i%2],x,.4,z,rand()*3,rand()*3,0,1,.7,1);}
  // Glowing mushrooms, rune stones, crystals and hanging lanterns.
  for(let i=0;i<16;i++){const a=rand()*Math.PI*2,x=Math.sin(a)*(13.6+rand()*2.5),z=Math.cos(a)*(11.6+rand()*2.5),s=.5+rand()*.6;column(x,z,.5*s,.07*s,M.snow,0,6);put(new T.SphereGeometry(.3*s,8,5,0,Math.PI*2,0,Math.PI/2),M.lit,x,.48*s,z);if(i%3===0)glowAt(x,.6,z,p.accent,1.6,.35);}
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.5,x=Math.sin(a)*15.2,z=Math.cos(a)*13;box(x,1.3,z,.9,2.6,.5,M.stone,-a);box(x-Math.sin(a)*.27,1.5,z-Math.cos(a)*.27,.12,1.3,.04,M.lit,-a);}
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2+.2;put(new T.OctahedronGeometry(.45),M.ice,Math.sin(a)*13.4,.9,Math.cos(a)*11.5,0,rand()*3,0,1,2.4,1);}
  for(let i=0;i<9;i++){const a=i/9*Math.PI*2,x=Math.sin(a)*(9+i%2*3.5),z=Math.cos(a)*(7.5+i%2*3),y=4.2+i%3*.9,lamp=new T.Mesh(new T.SphereGeometry(.14,8,6),M.core);live(lamp,x,y,z);const halo=glowAt(x,y,z,p.accent,1.9,.5);put(cylinderGeometry(.012,.012,4,4),M.iron,x,y+2.05,z);animated.push(t=>{const dy=Math.sin(t*.9+i)*.1;lamp.position.y=y+dy;halo.position.y=y+dy;halo.material.opacity=.42+Math.sin(t*2.3+i*2)*.1;});}
 }else{
  // Ice citadel behind the arena.
  box(0,3,-20,34,6,2.5,M.stone);for(let x=-16;x<=16;x+=2)box(x,6.4,-20,.9,.8,2.6,M.trim);put(new T.TorusGeometry(2.4,.4,6,14,Math.PI),M.trim,0,3.6,-18.7);put(new T.PlaneGeometry(4,3.6),M.dark,0,1.8,-18.72);
  for(const [x,h,r] of [[-17,15,2.4],[-9,11,2],[0,19,2.8],[9,12,2],[17,16,2.4]]){put(cylinderGeometry(r*.85,r,h,6),M.stone,x,h/2,-21.5);put(cylinderGeometry(r*1.05,r*1.05,.4,6),M.trim,x,h,-21.5);cone(x,h+2.6,-21.5,r*.95,5.2,6,M.ice);for(let y=3;y<h-1;y+=2.6)box(x,y,-21.5+r*.82,.4,1,.06,M.lit);glowAt(x,h*.55,-19.4,p.accent,7,.16);}
  for(let i=0;i<26;i++){const a=i/26*Math.PI*2+rand()*.2,r=13.8+rand()*10,s=.5+rand()*1.3;if(Math.cos(a)*r<-16)continue;put(new T.OctahedronGeometry(s),M.ice,Math.sin(a)*r*1.1,s*1.6,Math.cos(a)*r,rand()*.3,rand()*3,rand()*.3,1,2.6,1);}
  for(let i=0;i<22;i++){const a=rand()*Math.PI*2,r=14+rand()*12;put(new T.SphereGeometry(1.6+rand()*2,10,6),M.snow,Math.sin(a)*r*1.1,-.1,Math.cos(a)*r,0,0,0,1,.32,1);}
  for(const s of [-1,1])for(let i=0;i<5;i++)cone(s*(30+i*5),6+i*2,-34-i*6,9,14+i*4,6,M.snow,0,rand()*3);
 }

 // Bake the static scenery.
 for(const [material,list] of batches){const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,material);mesh.castShadow=!material.isMeshBasicMaterial&&!material.transparent;mesh.receiveShadow=!material.isMeshBasicMaterial;group.add(mesh);}

 // Air: drifting particles and low mist.
 const kind=p.particles,count=kind==='snow'?420:kind==='embers'?260:kind==='fireflies'?150:190,seeds=[],positions=new Float32Array(count*3);
 for(let i=0;i<count;i++)seeds.push({x:(rand()-.5)*34,y:rand()*10,z:(rand()-.5)*30,phase:rand()*6.28,speed:.5+rand()});
 const points=new T.Points(new T.BufferGeometry(),new T.PointsMaterial({map:glowTexture(),color:kind==='snow'?0xffffff:kind==='motes'?0xbfd0e8:p.accent,size:kind==='snow'?.1:kind==='fireflies'?.2:.13,transparent:true,opacity:kind==='motes'?.5:.9,depthWrite:false,blending:kind==='snow'?T.NormalBlending:T.AdditiveBlending}));points.geometry.setAttribute('position',new T.BufferAttribute(positions,3));points.frustumCulled=false;live(points);
 animated.push(t=>{for(let i=0;i<count;i++){const s=seeds[i];let x=s.x,y=s.y,z=s.z;
   if(kind==='embers'){y=(s.y+t*s.speed*.9)%10;x+=Math.sin(t*.7+s.phase)*.7;z+=Math.cos(t*.5+s.phase)*.5;}
   else if(kind==='snow'){y=10-(s.y+t*s.speed*.8)%10;x+=Math.sin(t*.5+s.phase)*.9;}
   else if(kind==='fireflies'){x+=Math.sin(t*.3*s.speed+s.phase)*1.6;y=.6+s.y*.35+Math.sin(t*.6+s.phase*2)*.5;z+=Math.cos(t*.27*s.speed+s.phase)*1.6;}
   else{y=(s.y+t*.06*s.speed)%8;x+=Math.sin(t*.2+s.phase)*.5;}
   positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;}points.geometry.attributes.position.needsUpdate=true;});
 for(let i=0;i<9;i++){const a=i/9*Math.PI*2,r=11+rand()*7,wisp=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),color:p.mist,transparent:true,opacity:.07+rand()*.05,depthWrite:false}));wisp.scale.set(11+rand()*6,3+rand()*1.5,1);live(wisp,Math.sin(a)*r,.5+rand()*.9,Math.cos(a)*r);animated.push(t=>{const b=a+t*.02*(i%2?1:-1);wisp.position.x=Math.sin(b)*r;wisp.position.z=Math.cos(b)*r;});}

 return {group,accent:p.accent,sun:p.sun[2],tint:p.tint,update(t){sky.material.uniforms.uTime.value=t;for(const step of animated)step(t);},
  dispose(){scene.remove(group);const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const key of ['map','emissiveMap'])if(m[key]&&m[key]!==glowShared)textures.add(m[key]);}});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());}};
}
