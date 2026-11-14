import * as T from '../vendor/three.js';

// Original articulated game assets. Units are metres; characters face -Z.
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
function profile(p,m,rings){const vs=[],idx=[],n=16;for(const [y,w,d] of rings)for(let i=0;i<n;i++){const a=i/n*TAU;vs.push(Math.cos(a)*w,y,Math.sin(a)*d);}for(let j=0;j<rings.length-1;j++)for(let i=0;i<n;i++){const a=j*n+i,b=j*n+(i+1)%n,c=a+n,d=b+n;idx.push(a,c,b,b,c,d);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vs,3));g.setIndex(idx);g.computeVertexNormals();return mesh(p,g,m);}

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

export function createCharacter(classId='mage',bodyType='male'){
 const female=bodyType==='female',knight=classId==='knight',rogue=classId==='rogue';
 const root=new T.Group();root.name=classId+'_'+bodyType;root.userData.asset={classId,bodyType,style:'Original stylized fantasy',version:1};
 const skin=mat(female?0xe3b5a2:0xb98f79),hair=mat(0x131b24,.1,.55),cloth=mat(rogue?0x132b29:knight?0x202d3c:0x252641),armor=mat(knight?0x374d60:0x303a48,.6,.42),silver=mat(0xb4cbd0,.65,.3),gold=mat(0xc99b58,.65,.38),white=mat(0xe1e4db),belt=mat(0x4c302b),accent=glow(rogue?0x60e6ae:knight?0x65caff:0x97a9ff),iris=mat(0x218c80,.2,.35),pupil=mat(0x0b1016),lips=mat(0x9b5c57);
 const hips=node(root,'hips',0,.94,0),spine=node(hips,'spine',0,.08,0);
 profile(spine,cloth,[[0,female?.18:.22,.12],[.14,female?.145:.205,.105],[.3,female?.2:.29,.15],[.43,female?.23:.31,.14],[.47,female?.16:.22,.12]]);
 if(knight){for(const side of [-1,1]){shape(spine,[[side*.02,.44],[side*(female?.2:.27),.42],[side*(female?.19:.25),.25],[side*.03,.21]],.055,armor,0,0,-.14);shape(spine,[[side*.02,.43],[side*(female?.2:.27),.41],[side*(female?.19:.25),.38],[side*.03,.4]],.06,gold,0,0,-.14);}shape(spine,[[-.14,.19],[0,.1],[.14,.19],[.11,.26],[-.11,.26]],.045,silver,0,0,-.12);}
 else{shape(spine,[[-.055,.44],[.055,.44],[.065,.03],[0,-.03],[-.065,.03]],.018,knight?gold:white,0,0,-.143);for(const side of [-1,1]){const sash=mesh(spine,new T.BoxGeometry(.036,.4,.025),gold,side*.09,.23,-.153);sash.rotation.z=side*.22;}}
 jewel(spine,accent,0,.35,-.19,.055);tube(spine,armor,.086,.12,.11,0,.49,0);
 profile(hips,belt,[[-.02,female?.19:.23,.135],[.055,female?.18:.23,.13]]);jewel(hips,gold,0,.018,-.15,.065);
 // Split coat panels keep leg movement visible and avoid a rigid cone skirt.
 const tails=[];for(const side of [-1,1]){const tail=node(hips,'coat_'+side,side*.12,-.04,.03);shape(tail,[[side*-.04,0],[side*.09,.01],[side*.15,-.45],[side*.02,-.52],[side*-.09,-.39]],.022,cloth);shape(tail,[[side*.09,0],[side*.11,-.36],[side*.02,-.5],[side*.04,-.42]],.025,gold);tail.rotation.x=-.13;tails.push(tail);}
 if(!rogue){const back=node(spine,'cape',0,.43,.13);shape(back,[[-.18,0],[.18,0],[.26,-.72],[.12,-.79],[0,-.72],[-.17,-.79],[-.26,-.72]],.018,cloth);back.rotation.x=-.13;tails.push(back);}
 const neck=node(spine,'neck',0,.51,0);tube(neck,skin,.065,.075,.12);
 const head=node(neck,'head',0,.18,-.005);oval(head,skin,0,0,0,female?.135:.15,.18,.13);oval(head,skin,0,-.08,-.018,.1,.1,.105);
 for(const s of [-1,1]){oval(head,skin,s*.137,-.005,0,.028,.048,.025);oval(head,white,s*.057,.012,-.118,.033,.013,.01);oval(head,iris,s*.055,.012,-.128,.012,.012,.004);oval(head,pupil,s*.055,.012,-.132,.005,.009,.003);oval(head,white,s*.052,.017,-.135,.003,.003,.002);const brow=mesh(head,new T.BoxGeometry(.055,.009,.01),hair,s*.058,.042,-.12);brow.rotation.z=s*.1;}
 oval(head,skin,0,-.025,-.135,.018,.036,.022);oval(head,lips,0,-.082,-.117,.035,.009,.006);
 if(female){
  const cap=mesh(head,new T.SphereGeometry(1,16,10,0,TAU,0,Math.PI*.57),hair,0,.035,.012);cap.scale.set(.153,.165,.144);
  for(let i=-3;i<=3;i++){const bang=shape(head,[[-.022,.035],[0,.055],[.022,.035],[.022,-.025],[0,-.04],[-.022,-.03]],.018,hair,i*.035,.085,-.128+Math.abs(i)*.007);bang.rotation.z=-i*.045;}
  for(const s of [-1,1]){oval(head,hair,s*.132,-.07,.025,.04,.19,.08);jewel(head,accent,s*.15,-.11,-.007,.035);}
  const pony=node(head,'ponytail',0,.04,.13);oval(pony,hair,0,-.12,.045,.085,.19,.07);const ponyTip=node(pony,'ponytail_tip',0,-.25,.05);oval(ponyTip,hair,0,-.15,0,.065,.2,.055);pony.rotation.x=-.35;band(pony,gold,.08,-.02,.035);
  // Small pale flower and jade clasp echo the reference without copying the outfit.
  for(let i=0;i<5;i++){const a=i*TAU/5;oval(spine,white,.14+Math.cos(a)*.027,.3+Math.sin(a)*.027,-.18,.018,.026,.009);}jewel(spine,gold,.14,.3,-.195,.021);
 }else{
  const cap=mesh(head,new T.SphereGeometry(1,12,8,0,TAU,0,Math.PI*.56),knight?armor:hair,0,.025,.018);cap.scale.set(.161,.185,.145);
  if(knight||rogue){for(const s of [-1,1]){shape(head,[[s*.035,.12],[s*.15,.17],[s*.15,-.07],[s*.098,-.04],[s*.086,.034],[s*.025,.044]],.025,armor,0,0,-.125);shape(head,[[s*.11,.13],[s*.13,.25],[s*.16,.13]],.04,armor,0,0,.025);}shape(head,[[-.018,.11],[.018,.11],[.025,-.025],[0,-.055],[-.025,-.025]],.04,silver,0,0,-.147);}
  else for(let i=-2;i<=2;i++)shape(head,[[-.025,.1],[.025,.1],[0,-.025]],.03,hair,i*.045,.08,-.13);
 }
 const joints={hips,spine,head};
 for(const [side,s] of [['L',-1],['R',1]]){
  const leg=node(hips,'leg'+side,s*(female?.105:.13),-.055,0);tube(leg,cloth,female?.085:.105,female?.065:.078,.38,0,-.18,0);const knee=node(leg,'knee'+side,0,-.38,0);oval(knee,armor,0,0,-.018,.078,.085,.075);tube(knee,armor,.073,.055,.36,0,-.18,0);band(knee,gold,.075,-.12,.025);oval(knee,armor,0,-.4,-.055,.076,.065,.14);shape(knee,[[-.045,.05],[.045,.05],[.03,-.22],[0,-.28],[-.03,-.22]],.02,silver,0,-.05,-.067);
  const arm=node(spine,'arm'+side,s*(female?.25:.335),.405,0);oval(arm,knight?armor:cloth,s*.012,-.025,0,female?.095:.125,.115,.115);if(knight)oval(arm,gold,s*.018,.02,0,.13,.05,.12);
  tube(arm,female?skin:cloth,female?.063:.09,female?.047:.065,.25,0,-.16,0);const elbow=node(arm,'elbow'+side,0,-.3,0);oval(elbow,cloth,0,0,0,.059,.065,.06);tube(elbow,armor,.061,.047,.23,0,-.115,0);band(elbow,gold,.063,-.05,.026);band(elbow,silver,.05,-.22,.025);const hand=node(elbow,'hand'+side,0,-.27,0);oval(hand,female?white:cloth,0,-.025,-.005,.049,.069,.042);
  for(let i=0;i<3;i++)oval(hand,female?white:cloth,(i-1)*.024,-.04,-.037,.011,.035,.015);
  if(side==='R'){const w=createWeapon(classId==='mage'?'staff':knight?'sword':'dagger');w.position.set(.015,-.04,-.035);hand.add(w);}else if(knight){const w=createWeapon('shield');w.position.set(-.045,-.02,-.06);w.rotation.y=-.3;hand.add(w);}else if(rogue){const w=createWeapon('dagger');w.position.set(-.015,-.04,-.035);w.rotation.z=-.15;hand.add(w);}else jewel(hand,accent,0,-.06,-.07,.065);
  Object.assign(joints,{['arm'+side]:arm,['elbow'+side]:elbow,['hand'+side]:hand,['leg'+side]:leg,['knee'+side]:knee});
 }
 compact(root);const base=new Map();root.traverse(o=>{if(o.isGroup&&o!==root)base.set(o,{position:o.position.clone(),rotation:o.rotation.clone()});});
 return {root,joints,classId,bodyType,base,tails,walk:0,action:0,hit:0,dispose(){disposeModel(root);}};
}

export function animateCharacter(a,p,time,dt=1/60){
 const j=a.joints;for(const [o,b] of a.base){o.position.copy(b.position);o.rotation.copy(b.rotation);}const blend=1-Math.exp(-dt*12);a.walk+=((p.moving?1:0)-a.walk)*blend;const stride=Math.sin(time*(a.classId==='rogue'?13:10));const run=a.walk;
 j.hips.position.y+=Math.abs(Math.cos(time*10))*.025*run+Math.sin(time*2.4)*.008;
 j.spine.rotation.y=stride*.055*run;j.spine.rotation.x=.035+run*.07;j.head.rotation.y=-j.spine.rotation.y*.7;j.head.rotation.x=Math.sin(time*1.7)*.025;
 for(const [s,sign] of [['L',-1],['R',1]]){j['leg'+s].rotation.x=stride*sign*.62*run;j['knee'+s].rotation.x=-Math.max(0,-stride*sign)*.78*run;j['arm'+s].rotation.x=.16-stride*sign*.34*run;j['arm'+s].rotation.z=-sign*.1;j['elbow'+s].rotation.x=.13+run*.2;}
 if(p.y>.1){j.legL.rotation.x=.35;j.legR.rotation.x=-.25;j.kneeL.rotation.x=-.7;j.kneeR.rotation.x=-.45;}
 const casting=Math.max(0,Math.min(1,(p.cast||0)/.42));const t=1-casting,attack=casting>0?Math.sin(Math.PI*t):0;
 if(a.classId==='mage'){j.armL.rotation.x+=attack*(p.element===2?2.6:1.35);j.armL.rotation.z-=attack*.35;j.elbowL.rotation.x+=attack*.65;j.armR.rotation.x+=attack*.75;j.spine.rotation.y+=attack*.18;}
 else if(a.classId==='knight'){j.spine.rotation.y+=attack*(p.element===2?-.25:1.05);j.armR.rotation.x+=attack*(p.element===2?2.55:1.8);j.armR.rotation.z-=attack*.85;j.elbowR.rotation.x+=attack*.45;}
 else{j.spine.rotation.y-=attack*.65;j.armR.rotation.x+=attack*1.8;j.armL.rotation.x+=attack*(p.element===2?1.5:.4);j.elbowR.rotation.x+=attack*.55;}
 if(p.burst){j.spine.rotation.x=.4;j.armL.rotation.x=1.15;j.armR.rotation.x=a.classId==='knight'?1.4:-.5;j.legL.rotation.x=stride*.9;j.legR.rotation.x=-stride*.9;}
 const guard=p.parry>0?1:p.parryFlash>0?.65:0;a.action+=(guard-a.action)*(1-Math.exp(-dt*22));j.armL.rotation.x+=a.action*1.55;j.elbowL.rotation.x+=a.action*.9;j.armR.rotation.x+=a.action*1.15;j.elbowR.rotation.x+=a.action*.6;j.spine.rotation.x-=a.action*.13;
 a.hit=Math.max(0,a.hit-dt*4);j.spine.rotation.x-=a.hit*.3;j.head.rotation.x-=a.hit*.18;
 for(const tail of a.tails){tail.rotation.x-=run*.15+Math.sin(time*6+tail.position.x)*(.035+run*.08);tail.rotation.z=Math.sin(time*4)*.025;}
 const pony=a.root.getObjectByName('ponytail'),tip=a.root.getObjectByName('ponytail_tip');if(pony){pony.rotation.x=-.25-run*.35+Math.sin(time*5)*.07;pony.rotation.z=Math.sin(time*6)*(.03+run*.1);tip.rotation.x=Math.sin(time*6-1)*.12;}
}

export function createViewWeapon(classId,bodyType){const root=new T.Group();root.name='view_'+classId;const glove=mat(bodyType==='female'?0xd7dedb:0x273b48),trim=mat(0xbd9257,.5);for(const side of classId==='mage'?[1]:[-1,1]){const hand=node(root,'view_hand_'+side,side*.4,-.24,-.72);oval(hand,glove,0,-.025,.04,.065,.09,.13);band(hand,trim,.067,-.03);const kind=side<0?(classId==='knight'?'shield':'dagger'):(classId==='mage'?'staff':classId==='knight'?'sword':'dagger'),w=createWeapon(kind);w.scale.setScalar(kind==='staff'?.72:kind==='sword'?.7:.85);w.position.set(0,0,-.08);w.rotation.z=side*(kind==='dagger'?-.3:-.12);hand.add(w);}compact(root);return root;}
