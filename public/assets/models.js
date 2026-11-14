import * as T from '../vendor/three.js';

// Procedural weapons and the first-person hands. Characters live in rig.js. Units are metres.
const TAU=Math.PI*2;
const mat=(color,metalness=0,roughness=.72)=>new T.MeshStandardMaterial({color,metalness,roughness});
const glow=color=>new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.8,roughness:.3});
function node(parent,name,x=0,y=0,z=0){const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
function mesh(parent,geo,material,x=0,y=0,z=0){const m=new T.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function oval(p,m,x,y,z,sx,sy,sz){const o=mesh(p,new T.SphereGeometry(1,12,10),m,x,y,z);o.scale.set(sx,sy,sz);return o;}
function tube(p,m,r1,r2,h,x=0,y=0,z=0,n=10){return mesh(p,new T.CylinderGeometry(r1,r2,h,n),m,x,y,z);}
function shape(p,points,depth,m,x=0,y=0,z=0){const s=new T.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.008,bevelThickness:.006});g.translate(0,0,-depth/2);return mesh(p,g,m,x,y,z);}
function band(p,m,r,y,h=.035){return tube(p,m,r,r,h,0,y,0,12);}
function jewel(p,m,x,y,z,s=.04){const o=mesh(p,new T.OctahedronGeometry(s),m,x,y,z);o.scale.z=.55;return o;}

// Merge static surfaces within each joint, keeping all animation pivots intact.
function compact(root){for(const child of [...root.children])if(child.isGroup)compact(child);const batches=new Map();for(const o of root.children)if(o.isMesh&&!Array.isArray(o.material)){const list=batches.get(o.material)||[];list.push(o);batches.set(o.material,list);}for(const [material,list] of batches){if(list.length<2)continue;const pos=[],norm=[],uv=[];for(const o of list){o.updateMatrix();const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix);pos.push(...g.attributes.position.array);norm.push(...g.attributes.normal.array);if(g.attributes.uv)uv.push(...g.attributes.uv.array);else uv.push(...new Array(g.attributes.position.count*2).fill(0));g.dispose();root.remove(o);o.geometry.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));mesh(root,g,material);}}
export function disposeModel(root){const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);});gs.forEach(g=>g.dispose());ms.forEach(m=>{m.map?.dispose();m.dispose();});root.removeFromParent();}

export function createWeapon(kind='sword'){
 const root=new T.Group();root.name=kind;const steel=mat(0x426c76,.72,.3),edge=mat(0xa8d6dc,.7,.24),dark=mat(0x1c323b,.65,.4),gold=mat(0xd39542,.65,.35),leather=mat(0x60352a),wrap=mat(0x98513c),gem=glow(0x42c9ff);
 if(kind==='sword'||kind==='dagger'){
  const dagger=kind==='dagger';const blade=dagger?[[0,.85],[.12,.53],[.13,.32],[.085,.21],[-.07,.21],[-.075,.5]]:[[0,1.33],[.115,1.02],[.14,.8],[.105,.76],[.14,.73],[.155,.33],[.08,.23],[-.08,.23],[-.15,.35],[-.125,.72],[-.1,1.02]];
  shape(root,blade,.045,steel);shape(root,dagger?[[0,.84],[.12,.52],[.13,.32],[.08,.23],[.075,.48]]:[[0,1.32],[.115,1.02],[.14,.8],[.105,.76],[.14,.73],[.155,.33],[.08,.24],[.1,.38],[.085,.77],[.075,1.02]],.049,edge);
  if(!dagger)shape(root,[[0,1.04],[.065,.65],[.05,.36],[0,.29],[-.05,.36],[-.065,.65]],.052,dark);
  shape(root,dagger?[[-.16,.24],[-.15,.18],[.15,.18],[.17,.24],[.11,.28],[0,.24],[-.11,.28]]:[[-.3,.22],[-.23,.29],[-.19,.25],[-.09,.25],[0,.34],[.09,.25],[.19,.25],[.23,.29],[.3,.22],[.23,.15],[.18,.19],[-.18,.19],[-.23,.15]],.08,gold);
  tube(root,leather,.046,.041,.27,0,.035,0);for(let i=0;i<7;i++){const b=band(root,wrap,.047,-.07+i*.034,.014);b.rotation.z=.15;}
  jewel(root,gold,0,-.13,0,.075);jewel(root,dagger?steel:gem,0,.235,-.055,dagger?.035:.052);
  band(root,gold,.056,.16);band(root,gold,.05,-.1);
  if(dagger){for(let i=0;i<3;i++)shape(root,[[0,0],[.024,.027],[0,.05],[-.024,.027]],.005,edge,0,.33+i*.09,-.028);}
 }else if(kind==='staff'){
  tube(root,leather,.027,.036,1.48,0,.2,0);for(const y of [-.5,-.35,.13,.2,.66,.8])band(root,gold,.043,y,.035);
  for(const side of [-1,1]){const q=shape(root,[[0,.65],[side*.15,.83],[side*.16,1.05],[side*.09,.97],[side*.075,.83]],.045,gold);}
  const crystal=mesh(root,new T.OctahedronGeometry(.125),gem,0,.91,0);crystal.scale.y=1.55;
  const ring=mesh(root,new T.TorusGeometry(.16,.012,5,24),gold,0,.92,0);ring.rotation.x=.35;
  jewel(root,gem,0,-.53,0,.05);
 }else if(kind==='shield'){
  shape(root,[[-.25,.28],[0,.35],[.25,.28],[.23,-.1],[0,-.36],[-.23,-.1]],.08,gold);
  shape(root,[[-.21,.25],[0,.3],[.21,.25],[.19,-.08],[0,-.3],[-.19,-.08]],.085,dark);
  shape(root,[[0,.25],[.07,.02],[0,-.24],[-.07,.02]],.09,steel);jewel(root,gem,0,.04,-.06,.06);
 }
 compact(root);return root;
}

export function createViewWeapon(classId,bodyType){const root=new T.Group();root.name='view_'+classId;const glove=mat(bodyType==='female'?0xd7dedb:0x273b48),trim=mat(0xbd9257,.5);for(const side of classId==='mage'?[1]:[-1,1]){const hand=node(root,'view_hand_'+side,side*.4,-.24,-.72);oval(hand,glove,0,-.025,.04,.065,.09,.13);band(hand,trim,.067,-.03);const kind=side<0?(classId==='knight'?'shield':'dagger'):(classId==='mage'?'staff':classId==='knight'?'sword':'dagger'),w=createWeapon(kind);w.scale.setScalar(kind==='staff'?.72:kind==='sword'?.7:.85);w.position.set(0,0,-.08);w.rotation.z=side*(kind==='dagger'?-.3:-.12);hand.add(w);}compact(root);return root;}
