import * as T from './vendor/three.js';
import {PILLARS} from './physics.js';
export {T};
export function buildWorld(scene,id){const group=new T.Group();scene.add(group);const animated=[];
 const palettes={abbey:{sky:0x101c2e,fog:0x24394a,stone:0x59686b,edge:0xa4b5a5,accent:0xffbb65,ground:'#39464a'},volcano:{sky:0x251320,fog:0x542d32,stone:0x49323d,edge:0xad7356,accent:0xff733a,ground:'#3e3038'},forest:{sky:0x112b30,fog:0x2a5550,stone:0x33534c,edge:0x7cac83,accent:0x8affb9,ground:'#304d42'},glacier:{sky:0x142740,fog:0x587c99,stone:0x81aabf,edge:0xd4eeef,accent:0x9adcff,ground:'#526c83'}};const p=palettes[id]||palettes.abbey;scene.background=new T.Color(p.sky);scene.fog=new T.FogExp2(p.fog,.027);
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.88,...extra});
 const stone=mat(p.stone),edge=mat(p.edge),dark=mat(0x18252a),wood=mat(0x443b32),lit=mat(p.accent,{emissive:p.accent,emissiveIntensity:1.8}),ice=mat(0x9cdae0,{roughness:.3,metalness:.15});
 function mesh(geometry,material,x,y,z){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 const box=(x,y,z,w,h,d,m=stone)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z);
 const pillar=(x,z,h=4,r=.62,m=stone)=>mesh(new T.CylinderGeometry(r*.85,r,h,8),m,x,h/2,z);
 function crystal(x,y,z,size=1){const c=mesh(new T.OctahedronGeometry(size),ice,x,y,z);c.scale.y=2.4;return c;}
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle=p.ground;ctx.fillRect(0,0,256,256);for(let y=0;y<256;y+=64)for(let x=-32*(y/64%2);x<256;x+=64){ctx.fillStyle='#00000045';ctx.fillRect(x,y,64,3);ctx.fillRect(x,y,3,64);ctx.fillStyle='#ffffff16';ctx.fillRect(x+4,y+4,57,2);for(let j=0;j<28;j++){ctx.fillStyle=j%2?'#ffffff08':'#00000018';ctx.fillRect(x+(j*23%60)+3,y+(j*37%58)+4,3,2);}}
 const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(10,8);texture.colorSpace=T.SRGBColorSpace;const floor=mesh(new T.PlaneGeometry(24,20),mat(0xffffff,{map:texture}),0,0,0);floor.rotation.x=-Math.PI/2;
 const hemi=new T.HemisphereLight(id==='volcano'?0xffbca0:0xc7e6ff,0x182226,1.45);group.add(hemi);const sun=new T.DirectionalLight(id==='volcano'?0xffc68d:0xd1e4ff,2.1);sun.position.set(-8,16,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-16,right:16,top:14,bottom:-14,near:1,far:50});sun.shadow.bias=-.001;group.add(sun);
 for(const z of [-10.3,10.3]){box(0,.55,z,25,1.1,.7);box(0,1.16,z,25,.16,.9,edge);for(let x=-12;x<=12;x+=2)box(x,1.45,z,.65,.6,.75);}
 for(const x of [-12.3,12.3]){box(x,.55,0,.7,1.1,20);box(x,1.16,0,.9,.16,20,edge);for(let z=-9;z<=9;z+=2)box(x,1.45,z,.75,.6,.65);}
 for(const [x,z] of PILLARS){pillar(x,z,id==='forest'?6:4.8);box(x,.14,z,1.65,.28,1.65,edge);box(x,4.65,z,1.6,.3,1.6,edge);if(id==='glacier')crystal(x,5.2,z,.6);else if(id==='forest'){for(let j=0;j<4;j++)mesh(new T.IcosahedronGeometry(2.5,0),mat(j%2?0x32644b:0x234d43),x+Math.sin(j*2)*1.2,6+j*.5,z+Math.cos(j*2));}else{for(let j=1;j<5;j++)mesh(new T.TorusGeometry(.64,.06,4,8),edge,x,j,z).rotation.x=Math.PI/2;}}
 function torch(x,z){pillar(x,z,1.6,.15,wood);mesh(new T.CylinderGeometry(.32,.15,.24,8),edge,x,1.65,z);const fire=mesh(new T.OctahedronGeometry(.28),lit,x,2,z);fire.scale.y=1.8;animated.push({type:'flame',mesh:fire,base:2});const light=new T.PointLight(p.accent,7,6,2);light.position.set(x,2,z);group.add(light);}
 for(const x of [-10,10])for(const z of [-7,7])torch(x,z);
 const rune=mesh(new T.RingGeometry(2.2,2.24,64),new T.MeshBasicMaterial({color:p.accent,transparent:true,opacity:.6,side:T.DoubleSide}),0,.015,0);rune.rotation.x=-Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4;const mark=box(Math.sin(a)*2.5,.015,Math.cos(a)*2.5,.12,.015,.5,lit);mark.rotation.y=a;}
 if(id==='abbey'){
  for(const z of [-13,13])for(let x=-10;x<=10;x+=5){pillar(x-1.7,z,5,.4);pillar(x+1.7,z,5,.4);const arc=mesh(new T.TorusGeometry(1.7,.28,5,12,Math.PI),stone,x,5,z);arc.rotation.z=0;box(x,7.2,z,4.4,.6,.8);}
  mesh(new T.SphereGeometry(3,24,16),new T.MeshBasicMaterial({color:0xe3ecd4}),-18,19,-30);
  for(let i=0;i<7;i++){const x=-22+i*7;box(x,4,-25,3,8+i%3*2,3,dark);mesh(new T.ConeGeometry(2.3,3,4),stone,x,10+i%3*2,-25);}
 }else if(id==='volcano'){
  const lava=mesh(new T.PlaneGeometry(100,100),mat(0xb73519,{emissive:0xff4c12,emissiveIntensity:.7}),0,-1,0);lava.rotation.x=-Math.PI/2;animated.push({type:'lava',mesh:lava});
  for(let i=0;i<12;i++){const a=i*Math.PI/6,r=23+i%3*5,h=7+i%4*3;mesh(new T.ConeGeometry(5+i%2*3,h,5),mat(0x352731),Math.sin(a)*r,h/2-1,Math.cos(a)*r);}
  for(const x of [-9,9]){for(let y=3;y<13;y+=.6){const link=mesh(new T.TorusGeometry(.23,.06,4,8),dark,x,y,-11);link.rotation.y=(Math.round(y/.6)%2)*Math.PI/2;}}
 }else if(id==='forest'){
  for(let i=0;i<24;i++){const a=i*Math.PI/12,r=15+i%3*3,x=Math.sin(a)*r,z=Math.cos(a)*r;pillar(x,z,8+i%4,.6,wood);for(let j=0;j<3;j++)mesh(new T.IcosahedronGeometry(3,0),mat(j%2?0x315c40:0x1d4337),x+Math.sin(j*2),8+j,z+Math.cos(j*2));}
  for(let i=0;i<12;i++){const a=i*Math.PI/6;crystal(Math.sin(a)*13,1,Math.cos(a)*11,.5);}
 }else{
  for(const x of [-17,-10,0,10,17]){const h=5+Math.abs(x%4);box(x,h/2,-17,2.7,h,3,stone);mesh(new T.ConeGeometry(2.6,3,4),ice,x,h+1.5,-17);box(x,h/2,-15.45,.55,h*.7,.05,lit);}
  for(let i=0;i<10;i++){const a=i*Math.PI/5;crystal(Math.sin(a)*14,2,Math.cos(a)*12,1);}
  for(let i=0;i<3;i++){const strip=mesh(new T.PlaneGeometry(60,1.4),new T.MeshBasicMaterial({color:[0x87ffcf,0x9bbcf9,0xc8acff][i],transparent:true,opacity:.17,side:T.DoubleSide}),0,12+i*1.7,-26);strip.rotation.z=.1+i*.06;}
 }
 const vertices=[];for(let i=0;i<120;i++)vertices.push((i*7.13%28)-14,(i*3.71%9)+.5,(i*5.27%24)-12);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));const dust=new T.Points(geo,new T.PointsMaterial({color:p.accent,size:id==='glacier'?.06:.035,transparent:true,opacity:.65}));group.add(dust);
 return {group,accent:p.accent,update(t){dust.rotation.y=t*.008;for(const a of animated){if(a.type==='flame'){a.mesh.position.y=a.base+Math.sin(t*7+a.mesh.position.x)*.07;a.mesh.scale.y=1.7+Math.sin(t*10)*.3;}else a.mesh.material.emissiveIntensity=.6+Math.sin(t)*.12;}},dispose(){scene.remove(group);const geometries=new Set(),materials=new Set(),textures=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());}};
}
