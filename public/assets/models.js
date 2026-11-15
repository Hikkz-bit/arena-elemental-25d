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
 }else if(kind==='spear'){
  tube(root,leather,.024,.028,2,0,.3,0);for(const y of [-.55,-.1,.35,1.22])band(root,gold,.034,y,.04);
  shape(root,[[0,1.92],[.095,1.56],[.05,1.3],[-.05,1.3],[-.095,1.56]],.03,steel);shape(root,[[0,1.9],[.095,1.56],[.05,1.32],[.02,1.56]],.034,edge);
  for(const side of [-1,1])shape(root,[[side*.03,1.3],[side*.13,1.22],[side*.05,1.16]],.03,gold);jewel(root,gem,0,1.26,-.03,.04);mesh(root,new T.ConeGeometry(.03,.16,6),steel,0,-.78,0).rotation.x=Math.PI;
 }else if(kind==='shield'){
  shape(root,[[-.25,.28],[0,.35],[.25,.28],[.23,-.1],[0,-.36],[-.23,-.1]],.08,gold);
  shape(root,[[-.21,.25],[0,.3],[.21,.25],[.19,-.08],[0,-.3],[-.19,-.08]],.085,dark);
  shape(root,[[0,.25],[.07,.02],[0,-.24],[-.07,.02]],.09,steel);jewel(root,gem,0,.04,-.06,.06);
 }
 compact(root);return root;
}

// First-person arms. Each hand is its own group so it can swing on its own; weapons stay separate children so they can be hidden.
const VIEW_COLORS={knight:{male:[0x23262e,0x8f1f2a],female:[0xc9d2dc,0xd9b25f]},mage:{male:[0xf1f0ea,0x6fb6ff],female:[0x6a2c8f,0xe0b25c]},rogue:{male:[0xe8e2d2,0x2a8f86],female:[0x1f2226,0x2e7a5f]},elf:{male:[0x1b1b20,0xd9a441],female:[0x1b1b20,0xd9a441]}};
export function createViewWeapon(classId,bodyType){
 const root=new T.Group();root.name='view_'+classId;const [sleeveColor,trimColor]=(VIEW_COLORS[classId]||VIEW_COLORS.mage)[bodyType==='female'?'female':'male'],sleeve=mat(sleeveColor),trim=mat(trimColor,.4,.5),hands={};
 for(const side of [-1,1]){
  const hand=node(root,'view_hand_'+side,side*.4,-.24,-.72);oval(hand,sleeve,0,-.025,.04,.065,.09,.13);band(hand,trim,.067,-.03);
  const arm=tube(hand,sleeve,.058,.085,.7,0,-.27,.335,10);arm.rotation.x=Math.PI/2-.75;const cuff=tube(hand,trim,.068,.068,.05,0,-.07,.12,10);cuff.rotation.x=Math.PI/2-.75;
  const kind=classId==='knight'?(side<0?'shield':'sword'):classId==='mage'?(side>0?'staff':null):classId==='elf'?(side>0?'spear':null):(side>0?'dagger':null);let weapon=null;
  if(kind){weapon=createWeapon(kind);weapon.scale.setScalar(kind==='staff'?.72:kind==='sword'?.7:kind==='spear'?.6:.8);weapon.position.set(0,0,-.08);weapon.rotation.z=side*(kind==='dagger'?-.3:-.12);hand.add(weapon);}
  else if(classId==='mage')jewel(hand,glow(0x97a9ff),0,.09,-.06,.05);
  hands[side]={hand,weapon,rest:hand.position.clone(),offset:new T.Vector3(),turn:new T.Vector3()};
 }
 compact(root);
 // The assassin throws with an empty hand: the dagger only shows for the stab.
 if(classId==='rogue')hands[1].weapon.visible=false;
 root.userData.view={classId,hands,guard:0,drop:0};return root;
}

const ramp=(t,a,b)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
// [wind-up, strike] for each hand as [x,y,z, rotX,rotY,rotZ]; x is mirrored for the left hand.
const SWINGS={
 rogue0:{R:[[.05,.2,.22,1,0,0],[-.12,.06,-.42,-.9,0,.3]],L:[[0,0,0,0,0,0],[.03,-.03,.05,0,0,0]]},
 rogue2:{R:[[.04,.02,.2,.2,0,0],[-.2,.08,-.5,-.25,.2,.25]],L:[[0,0,0,0,0,0],[.05,0,.08,0,0,0]]},
 knight0:{R:[[.15,.28,.1,.5,0,-.9],[-.45,-.1,-.25,-.6,0,1.1]],L:[[0,0,0,0,0,0],[.06,-.04,.06,0,0,0]]},
 knight1:{R:[[.05,.05,.15,-.4,0,0],[-.2,.1,-.4,-1.2,0,.1]],L:[[0,0,0,0,0,0],[.12,.1,-.1,0,.3,0]]},
 knight2:{R:[[0,.4,.1,1.2,0,0],[-.15,-.25,-.2,-1.4,0,0]],L:[[0,.1,0,0,0,0],[.1,-.15,-.05,0,0,0]]},
 mage0:{R:[[.05,0,.15,.2,0,0],[-.1,.1,-.35,-.5,0,0]],L:[[0,0,.1,0,0,0],[.15,.12,-.3,-.3,0,0]]},
 mage1:{R:[[.2,.1,0,0,0,-.5],[-.3,.05,-.25,-.2,0,.6]],L:[[0,0,0,0,0,0],[.1,.05,-.15,0,0,0]]},
 mage2:{R:[[0,.1,.05,.2,0,0],[0,.3,-.05,.6,0,0]],L:[[0,.05,0,0,0,0],[.08,.3,-.1,.5,0,0]]},
 elf0:{R:[[.05,.05,.2,-.5,0,0],[-.18,.1,-.45,-1.25,0,.1]],L:[[0,0,0,0,0,0],[.1,.05,-.1,0,.2,0]]},
 elf1:{R:[[.05,.1,.2,-.6,0,0],[-.2,.12,-.5,-1.3,0,.1]],L:[[0,0,0,0,0,0],[.12,.1,-.15,0,.3,0]]},
 elf2:{R:[[0,.05,.1,.1,0,0],[-.05,.2,-.1,.3,0,0]],L:[[0,0,.1,0,0,0],[.2,.15,-.35,-.3,0,0]]},
 // Duel swings from the left, from above and from the right, and the guard-break shove.
 duel0:{R:[[-.45,.15,.1,.2,0,.9],[.2,-.05,-.3,-.5,0,-.8]],L:[[0,0,0,0,0,0],[.05,-.03,.06,0,0,0]]},
 duel1:{R:[[0,.35,.1,1.1,0,0],[-.1,-.2,-.3,-1.3,0,0]],L:[[0,.05,0,0,0,0],[.06,-.06,.05,0,0,0]]},
 duel2:{R:[[.25,.2,.1,.4,0,-.9],[-.5,-.05,-.3,-.6,0,1]],L:[[0,0,0,0,0,0],[.05,-.03,.06,0,0,0]]},
 shove:{R:[[.05,0,.15,0,0,0],[-.15,.05,-.4,-.3,0,0]],L:[[.05,0,.15,0,0,0],[-.15,.05,-.4,-.3,0,0]]}
};
// s: {t: attack progress 0..1 or -1, element (ability slot, or 'duel0'..'duel2'/'shove' for melee), hitAt: when the blow lands (0..1),
// power, stance, parry, burst, moving}
export function animateViewWeapon(root,s,time,dt=1/60){
 const v=root?.userData.view;if(!v)return;const melee=typeof s.element==='string',hit=s.hitAt??.34,power=s.power??1,k=1-Math.exp(-dt*18),swing=s.t>=0?SWINGS[melee?s.element:v.classId+s.element]:null,wind=swing?ramp(s.t,0,hit*.5)*(1-ramp(s.t,hit*.5,hit))*power:0,strike=swing?ramp(s.t,hit*.5,hit)*(1-ramp(s.t,Math.min(.95,hit+.2),1))*power:0;
 v.side=(v.side??0)+(((s.stance??1)-1)-(v.side??0))*k;v.top=(v.top??0)+(((s.stance??1)===1?1:0)-(v.top??0))*k;
 v.guard+=((s.parry?1:0)-v.guard)*k;v.drop+=((s.burst?1:0)-v.drop)*k;
 for(const side of [-1,1]){
  const h=v.hands[side],pose=swing?swing[side>0?'R':'L']:null,p=[0,0,0,0,0,0];
  if(pose)for(let i=0;i<6;i++)p[i]=pose[0][i]*wind+pose[1][i]*strike;
  // Guard: the knight brings the shield across; the others cross their forearms.
  if(v.classId==='knight'&&side<0){p[0]-=.3*v.guard;p[1]+=.2*v.guard;p[2]-=.1*v.guard;p[4]-=.4*v.guard;}else{p[0]-=.15*v.guard;p[1]+=.22*v.guard;p[2]-=.05*v.guard;p[5]+=.8*v.guard;}
  p[1]-=.25*v.drop;p[2]+=.1*v.drop;p[0]+=.1*v.drop;
  // Guard side: both hands drift toward the guarded side, or rise for the top guard.
  if(!swing){p[0]+=side*v.side*.11;p[1]+=v.top*.07;p[5]+=-v.side*.25;}
  const bob=s.moving?Math.sin(time*11+(side>0?0:Math.PI))*.012:Math.sin(time*1.7+side)*.004;
  h.hand.position.set(h.rest.x+side*p[0],h.rest.y+p[1]+bob,h.rest.z+p[2]);h.hand.rotation.set(p[3],side*p[4],side*p[5]);
 }
 if(v.classId==='rogue')v.hands[1].weapon.visible=s.t>=0&&(s.element===2||(melee&&s.element!=='shove'));
}
